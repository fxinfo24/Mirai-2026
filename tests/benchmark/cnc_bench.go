package main

import (
	"flag"
	"fmt"
	"net"
	"sync"
	"sync/atomic"
	"time"
)

var (
	host            = flag.String("host", "localhost", "C&C server host")
	port            = flag.Int("port", 23, "C&C server port")
	connections     = flag.Int("connections", 10000, "Number of concurrent connections")
	duration        = flag.Int("duration", 30, "Test duration in seconds")
	rampUpTime      = flag.Int("ramp", 10, "Ramp-up time in seconds")
	printInterval   = flag.Int("interval", 1, "Stats print interval in seconds")
)

type Stats struct {
	TotalConnections   uint64
	ActiveConnections  uint64
	FailedConnections  uint64
	BytesSent          uint64
	BytesReceived      uint64
	TotalLatencyMs     uint64
	LatencySamples     uint64
}

func main() {
	flag.Parse()
	
	fmt.Printf("=================================\n")
	fmt.Printf("Mirai C&C Benchmark\n")
	fmt.Printf("=================================\n")
	fmt.Printf("Target: %s:%d\n", *host, *port)
	fmt.Printf("Connections: %d\n", *connections)
	fmt.Printf("Duration: %ds\n", *duration)
	fmt.Printf("Ramp-up: %ds\n", *rampUpTime)
	fmt.Printf("=================================\n\n")
	
	stats := &Stats{}
	
	// Start stats printer
	stopPrinter := make(chan bool)
	go statsPrinter(stats, *printInterval, stopPrinter)
	
	// Calculate connections per second during ramp-up
	connsPerSec := *connections / *rampUpTime
	if connsPerSec < 1 {
		connsPerSec = 1
	}
	
	// Start connection workers
	startTime := time.Now()
	var wg sync.WaitGroup
	
	for i := 0; i < *connections; i++ {
		wg.Add(1)
		
		go func(id int) {
			defer wg.Done()
			
			// Ramp-up delay
			delay := time.Duration(id / connsPerSec) * time.Second
			time.Sleep(delay)
			
			// Connect and maintain
			botWorker(id, stats, startTime.Add(time.Duration(*duration)*time.Second))
		}(i)
		
		// Small delay to avoid overwhelming the system during startup
		if i % 100 == 0 {
			time.Sleep(10 * time.Millisecond)
		}
	}
	
	// Wait for test duration
	time.Sleep(time.Duration(*duration) * time.Second)
	
	// Stop printer
	stopPrinter <- true
	
	// Final stats
	fmt.Printf("\n=================================\n")
	fmt.Printf("Final Results\n")
	fmt.Printf("=================================\n")
	printStats(stats, time.Since(startTime).Seconds())
	
	wg.Wait()
}

func botWorker(id int, stats *Stats, endTime time.Time) {
	// Connect
	addr := fmt.Sprintf("%s:%d", *host, *port)
	conn, err := net.DialTimeout("tcp", addr, 5*time.Second)
	if err != nil {
		atomic.AddUint64(&stats.FailedConnections, 1)
		return
	}
	defer conn.Close()
	
	atomic.AddUint64(&stats.TotalConnections, 1)
	atomic.AddUint64(&stats.ActiveConnections, 1)
	defer atomic.AddUint64(&stats.ActiveConnections, ^uint64(0)) // Decrement
	
	// Send bot handshake (like original Mirai)
	handshake := []byte{0x00, 0x00, 0x00, 0x01} // Version 1
	conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
	n, err := conn.Write(handshake)
	if err != nil {
		return
	}
	atomic.AddUint64(&stats.BytesSent, uint64(n))
	
	// Heartbeat loop
	buf := make([]byte, 2)
	for time.Now().Before(endTime) {
		// Send heartbeat
		pingStart := time.Now()
		conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
		n, err := conn.Write([]byte{0xAA, 0xBB})
		if err != nil {
			return
		}
		atomic.AddUint64(&stats.BytesSent, uint64(n))
		
		// Receive response
		conn.SetReadDeadline(time.Now().Add(5 * time.Second))
		n, err = conn.Read(buf)
		if err != nil {
			return
		}
		atomic.AddUint64(&stats.BytesReceived, uint64(n))
		
		// Record latency
		latency := time.Since(pingStart)
		atomic.AddUint64(&stats.TotalLatencyMs, uint64(latency.Milliseconds()))
		atomic.AddUint64(&stats.LatencySamples, 1)
		
		// Sleep before next heartbeat (simulate real bot)
		time.Sleep(1 * time.Second)
	}
}

func statsPrinter(stats *Stats, interval int, stop chan bool) {
	ticker := time.NewTicker(time.Duration(interval) * time.Second)
	defer ticker.Stop()
	
	startTime := time.Now()
	
	for {
		select {
		case <-stop:
			return
		case <-ticker.C:
			elapsed := time.Since(startTime).Seconds()
			printStats(stats, elapsed)
		}
	}
}

func printStats(stats *Stats, elapsed float64) {
	total := atomic.LoadUint64(&stats.TotalConnections)
	active := atomic.LoadUint64(&stats.ActiveConnections)
	failed := atomic.LoadUint64(&stats.FailedConnections)
	sent := atomic.LoadUint64(&stats.BytesSent)
	recv := atomic.LoadUint64(&stats.BytesReceived)
	totalLatency := atomic.LoadUint64(&stats.TotalLatencyMs)
	samples := atomic.LoadUint64(&stats.LatencySamples)
	
	avgLatency := float64(0)
	if samples > 0 {
		avgLatency = float64(totalLatency) / float64(samples)
	}
	
	fmt.Printf("[%.1fs] Connections: %d total, %d active, %d failed | ",
		elapsed, total, active, failed)
	fmt.Printf("Traffic: %.2f MB sent, %.2f MB recv | ",
		float64(sent)/1024/1024, float64(recv)/1024/1024)
	fmt.Printf("Latency: %.2f ms avg\n", avgLatency)
}
