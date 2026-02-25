# Kernel Tuning for High-Performance C&C

**Target:** 100k+ concurrent connections with <2% CPU usage

**System Requirements:**
- Linux kernel 3.9+ (for SO_REUSEPORT)
- 8GB+ RAM
- Multi-core CPU

---

## sysctl Configuration

### Apply Immediately (runtime)
```bash
# TCP connection optimization
sudo sysctl -w net.ipv4.tcp_tw_reuse=1
sudo sysctl -w net.ipv4.tcp_fin_timeout=15
sudo sysctl -w net.ipv4.tcp_keepalive_time=60
sudo sysctl -w net.ipv4.tcp_keepalive_intvl=10
sudo sysctl -w net.ipv4.tcp_keepalive_probes=3

# Increase connection queue
sudo sysctl -w net.core.somaxconn=65535
sudo sysctl -w net.ipv4.tcp_max_syn_backlog=8192

# Increase local port range
sudo sysctl -w net.ipv4.ip_local_port_range="1024 65535"

# Increase file descriptors
sudo sysctl -w fs.file-max=2097152

# TCP Fast Open (kernel 3.7+)
sudo sysctl -w net.ipv4.tcp_fastopen=3

# Disable TCP slow start after idle
sudo sysctl -w net.ipv4.tcp_slow_start_after_idle=0

# Increase TCP buffer sizes
sudo sysctl -w net.core.rmem_max=16777216
sudo sysctl -w net.core.wmem_max=16777216
sudo sysctl -w net.ipv4.tcp_rmem="4096 87380 16777216"
sudo sysctl -w net.ipv4.tcp_wmem="4096 65536 16777216"

# Enable TCP window scaling
sudo sysctl -w net.ipv4.tcp_window_scaling=1

# Increase netdev backlog
sudo sysctl -w net.core.netdev_max_backlog=5000

# TCP congestion control (BBR for better throughput)
sudo sysctl -w net.ipv4.tcp_congestion_control=bbr
```

### Make Permanent

Create `/etc/sysctl.d/99-mirai-tuning.conf`:

```conf
# Mirai 2026 - High-Performance C&C Tuning
# Target: 100k+ concurrent connections

# TCP connection optimization
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 15
net.ipv4.tcp_keepalive_time = 60
net.ipv4.tcp_keepalive_intvl = 10
net.ipv4.tcp_keepalive_probes = 3

# Connection queues
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 8192

# Port range
net.ipv4.ip_local_port_range = 1024 65535

# File descriptors
fs.file-max = 2097152

# TCP Fast Open
net.ipv4.tcp_fastopen = 3

# TCP performance
net.ipv4.tcp_slow_start_after_idle = 0
net.ipv4.tcp_window_scaling = 1

# Buffer sizes
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216

# Network device backlog
net.core.netdev_max_backlog = 5000

# Congestion control (BBR)
net.ipv4.tcp_congestion_control = bbr
net.core.default_qdisc = fq

# Virtual memory tuning
vm.swappiness = 10
vm.dirty_ratio = 60
vm.dirty_background_ratio = 2
```

Apply:
```bash
sudo sysctl -p /etc/sysctl.d/99-mirai-tuning.conf
```

---

## ulimit Configuration

### User Limits

Edit `/etc/security/limits.conf`:

```conf
# Mirai 2026 - File descriptor limits
*  soft  nofile  1048576
*  hard  nofile  1048576
root soft nofile 1048576
root hard nofile 1048576

# Process limits
*  soft  nproc   unlimited
*  hard  nproc   unlimited
```

### systemd Service Limits

For systemd services, create override file:

```bash
sudo mkdir -p /etc/systemd/system/mirai-cnc.service.d
sudo cat > /etc/systemd/system/mirai-cnc.service.d/limits.conf << 'EOF'
[Service]
LimitNOFILE=1048576
LimitNPROC=unlimited
EOF

sudo systemctl daemon-reload
```

### Verify Limits

```bash
# Check current limits
ulimit -n
ulimit -u

# Check system-wide
cat /proc/sys/fs/file-max
cat /proc/sys/fs/file-nr

# Check per-process (replace PID)
cat /proc/PID/limits
```

---

## Transparent Huge Pages (THP)

For better memory performance:

```bash
# Disable THP (can cause latency spikes)
echo never > /sys/kernel/mm/transparent_hugepage/enabled
echo never > /sys/kernel/mm/transparent_hugepage/defrag

# Make permanent (add to /etc/rc.local or systemd service)
```

---

## Network Interface Tuning

### Increase Ring Buffer Size

```bash
# Check current settings
ethtool -g eth0

# Increase RX/TX ring buffers
sudo ethtool -G eth0 rx 4096 tx 4096

# Make permanent (add to /etc/rc.local)
```

### Disable Offloading (if needed for debugging)

```bash
# Sometimes offloading can cause issues
sudo ethtool -K eth0 tso off gso off gro off
```

---

## CPU Governor

For consistent performance:

```bash
# Set to performance mode
sudo cpupower frequency-set -g performance

# Verify
cpupower frequency-info
```

---

## IRQ Affinity

Distribute network interrupts across CPUs:

```bash
# Install irqbalance
sudo apt-get install irqbalance

# Enable and start
sudo systemctl enable irqbalance
sudo systemctl start irqbalance
```

---

## Docker-Specific Tuning

If running in Docker:

```yaml
# docker-compose.yml
services:
  cnc:
    sysctls:
      - net.ipv4.tcp_tw_reuse=1
      - net.ipv4.tcp_fin_timeout=15
      - net.core.somaxconn=65535
      - net.ipv4.ip_local_port_range=1024 65535
    ulimits:
      nofile:
        soft: 1048576
        hard: 1048576
      nproc:
        soft: unlimited
        hard: unlimited
```

---

## Verification

### Test Connection Limits

```bash
# Simple test - create many connections
python3 << 'EOF'
import socket
import time

sockets = []
try:
    for i in range(100000):
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.connect(('localhost', 23))
        sockets.append(s)
        if i % 1000 == 0:
            print(f"Created {i} connections")
except Exception as e:
    print(f"Failed at {len(sockets)} connections: {e}")
finally:
    for s in sockets:
        s.close()
EOF
```

### Monitor Performance

```bash
# Watch active connections
watch -n1 "ss -s"

# Monitor file descriptors
watch -n1 "cat /proc/sys/fs/file-nr"

# CPU usage
top -p $(pgrep -f cnc)

# Network statistics
netstat -s | grep -E "listen|established|time_wait"
```

---

## Benchmarking

### Using wrk (HTTP benchmark)

```bash
# Install wrk
sudo apt-get install wrk

# Benchmark
wrk -t12 -c10000 -d30s http://localhost:23/
```

### Using ab (Apache Bench)

```bash
ab -n 100000 -c 10000 http://localhost:23/
```

### Custom TCP benchmark

See `tests/benchmark/cnc_bench.go` for custom benchmarking tool.

---

## Expected Results

With proper tuning:

- **Connections:** 100k+ concurrent
- **CPU Usage:** <2% (target from original Mirai with 400k bots)
- **Memory:** ~2GB for 100k connections
- **Latency:** <10ms for command propagation
- **Throughput:** 50k+ commands/sec

---

## Troubleshooting

### "Too many open files"

```bash
# Check limits
ulimit -n

# Increase per-shell
ulimit -n 1048576

# Or add to /etc/security/limits.conf
```

### "Cannot assign requested address"

```bash
# Increase local port range
sudo sysctl -w net.ipv4.ip_local_port_range="1024 65535"

# Enable port reuse
sudo sysctl -w net.ipv4.tcp_tw_reuse=1
```

### High TIME_WAIT connections

```bash
# This is normal for high-throughput servers
# Check count
ss -s | grep -i time-wait

# Reduce timeout (already set above)
sudo sysctl -w net.ipv4.tcp_fin_timeout=15
```

### Memory exhaustion

```bash
# Check TCP memory usage
cat /proc/net/sockstat

# Increase if needed
sudo sysctl -w net.ipv4.tcp_mem="786432 1048576 26777216"
```

---

## References

- Linux kernel documentation: https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt
- Original Mirai C&C: 2% CPU with 400k bots
- Google BBR congestion control: https://github.com/google/bbr

---

**Last Updated:** 2026-02-25  
**Tested On:** Ubuntu 22.04 LTS, Kernel 5.15+
