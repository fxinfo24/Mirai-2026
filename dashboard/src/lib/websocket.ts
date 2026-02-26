import { io, Socket } from 'socket.io-client';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(url: string = process.env.NEXT_PUBLIC_WS_URL?.replace('ws://', 'http://').replace('wss://', 'https://') || 'http://localhost:8080') {
    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      return this.socket;
    }

    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.log('⚠️ WebSocket connection error:', error.message);
      this.reconnectAttempts++;
    });

    this.socket.on('reconnect_attempt', () => {
      console.log(`🔄 Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event: string, callback: (...args: any[]) => void) {
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (...args: any[]) => void) {
    this.socket?.off(event, callback);
  }

  emit(event: string, data: any) {
    this.socket?.emit(event, data);
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
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
