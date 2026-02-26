// Native WebSocket adapter for the Mirai 2026 CNC server.
//
// WHY NOT socket.io?
// The CNC (cnc_modern.go / nhooyr.io/websocket) speaks plain RFC 6455 WebSocket
// and broadcasts JSON envelopes: { "type": "kill:all", "payload": {...} }
// socket.io uses its own framing protocol (prefix bytes + event names) and
// cannot connect to a plain WebSocket server — every message would be dropped.
//
// This adapter preserves the exact same .on()/.off()/.emit()/.isConnected() API
// used by all hooks in useWebSocket.ts, so no hook changes are needed.
// Messages from the CNC are dispatched as events matching the "type" field, e.g.:
//   { "type": "kill:all",      "payload": {...} }  → fires "kill:all" listeners
//   { "type": "bot:connected", "payload": {...} }  → fires "bot:connected" listeners
//   { "type": "metrics:update","payload": {...} }  → fires "metrics:update" listeners

type EventCallback = (...args: any[]) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private url: string = '';
  private _connected = false;

  connect(
    url: string = (process.env.NEXT_PUBLIC_WS_URL
      ? process.env.NEXT_PUBLIC_WS_URL.replace(/^http/, 'ws')
      : 'ws://localhost:8080') + '/ws'
  ): this {
    // Already connected or connecting to same URL — no-op
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return this;
    }

    // Guard: WebSocket is browser/Node 18+ only — skip during SSR
    if (typeof WebSocket === 'undefined') {
      return this;
    }

    this.url = url;

    try {
      this.ws = new WebSocket(url);
    } catch (err) {
      console.log('⚠️ WebSocket connection failed:', err);
      this._scheduleReconnect();
      return this;
    }

    this.ws.onopen = () => {
      console.log('✅ WebSocket connected to CNC:', url);
      this._connected = true;
      this.reconnectAttempts = 0;
      this._emit('connect', {});
    };

    this.ws.onclose = (ev) => {
      console.log('❌ WebSocket disconnected:', ev.code, ev.reason);
      this._connected = false;
      this.ws = null;
      this._emit('disconnect', { code: ev.code, reason: ev.reason });
      this._scheduleReconnect();
    };

    this.ws.onerror = (ev) => {
      // onclose fires immediately after onerror — just log here
      console.log('⚠️ WebSocket error (will reconnect)');
    };

    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as { type: string; payload?: any };
        if (msg && typeof msg.type === 'string') {
          // Dispatch to listeners registered for this message type
          this._emit(msg.type, msg.payload ?? msg);
        }
      } catch {
        // Non-JSON frame — ignore
      }
    };

    return this;
  }

  private _scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log(`🚫 Max reconnect attempts (${this.maxReconnectAttempts}) reached`);
      return;
    }
    if (this.reconnectTimer) return; // already scheduled
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts); // exponential back-off
    this.reconnectAttempts++;
    console.log(`🔄 Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(this.url);
    }, delay);
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts; // prevent auto-reconnect
    if (this.ws) {
      this.ws.close(1000, 'client disconnect');
      this.ws = null;
    }
    this._connected = false;
  }

  // Register a listener for a CNC message type (e.g. "kill:all", "bot:connected")
  on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  // Remove a specific listener (or all listeners for the event if callback omitted)
  off(event: string, callback?: EventCallback) {
    if (!callback) {
      this.listeners.delete(event);
      return;
    }
    this.listeners.get(event)?.delete(callback);
  }

  // Send a JSON message to the CNC (used for future bidirectional commands)
  emit(event: string, data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: event, payload: data }));
    }
  }

  isConnected(): boolean {
    return this._connected;
  }

  // Internal dispatch — calls all listeners registered for an event type
  private _emit(event: string, data: any) {
    this.listeners.get(event)?.forEach((cb) => {
      try {
        cb(data);
      } catch (err) {
        console.error(`[wsService] listener error for "${event}":`, err);
      }
    });
  }
}

export const wsService = new WebSocketService();

// Event types
export interface BotEvent {
  type: 'connected' | 'disconnected' | 'update';
  bot: {
    id: string;
    ip: string;
    type: string;
    location: string;
    status: 'online' | 'offline' | 'idle';
  };
  timestamp: string;
}

export interface AttackEvent {
  type: 'started' | 'completed' | 'failed' | 'update';
  attack: {
    id: string;
    type: string;
    target: string;
    status: string;
    bandwidth: string;
  };
  timestamp: string;
}

export interface MetricsEvent {
  activeBots: number;
  activeAttacks: number;
  totalBandwidth: string;
  successRate: number;
  timestamp: string;
}
