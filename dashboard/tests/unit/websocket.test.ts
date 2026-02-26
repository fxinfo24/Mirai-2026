/**
 * Unit tests for the native WebSocket adapter (dashboard/src/lib/websocket.ts)
 *
 * Tests cover:
 *   1. SSR safety — no crash when WebSocket is undefined (server-side rendering)
 *   2. connect() — creates WebSocket to correct URL, returns this (chainable)
 *   3. Message dispatch — onmessage parses JSON envelope and fires listeners by type
 *   4. on() / off() — listener registration and removal
 *   5. isConnected() — reflects open/close state
 *   6. emit() — sends JSON to the WebSocket when open
 *   7. Exponential back-off reconnect — schedules reconnect on close
 *   8. disconnect() — cancels reconnect timer, closes socket, prevents re-connect
 *   9. kill:all dispatch — the specific event wired to the KillSwitch component
 *  10. Multiple listeners for same event all fire
 */

// ── Mock WebSocket ─────────────────────────────────────────────────────────────
// We replace the global WebSocket with a controllable mock so tests run in Node.

type ReadyState = 0 | 1 | 2 | 3;

class MockWebSocket {
  static CONNECTING: ReadyState = 0;
  static OPEN: ReadyState = 1;
  static CLOSING: ReadyState = 2;
  static CLOSED: ReadyState = 3;

  CONNECTING = MockWebSocket.CONNECTING;
  OPEN = MockWebSocket.OPEN;
  CLOSING = MockWebSocket.CLOSING;
  CLOSED = MockWebSocket.CLOSED;

  readyState: ReadyState = MockWebSocket.CONNECTING;
  url: string;
  sentMessages: string[] = [];
  closeCode?: number;
  closeReason?: string;

  onopen: ((ev: Event) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;

  static instances: MockWebSocket[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  /** Simulate server opening the connection */
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.(new Event('open'));
  }

  /** Simulate a JSON message arriving from the CNC */
  simulateMessage(data: object) {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }));
  }

  /** Simulate a raw (non-JSON) message */
  simulateRawMessage(data: string) {
    this.onmessage?.(new MessageEvent('message', { data }));
  }

  /** Simulate the connection closing */
  simulateClose(code = 1001, reason = 'gone away') {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close', { code, reason }));
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close(code?: number, reason?: string) {
    this.closeCode = code;
    this.closeReason = reason;
    this.readyState = MockWebSocket.CLOSED;
  }

  static reset() {
    MockWebSocket.instances = [];
  }

  static latest(): MockWebSocket {
    return MockWebSocket.instances[MockWebSocket.instances.length - 1];
  }
}

// Polyfill CloseEvent for Node.js test environment (it's browser-only)
if (typeof (global as any).CloseEvent === 'undefined') {
  (global as any).CloseEvent = class CloseEvent extends Event {
    code: number;
    reason: string;
    wasClean: boolean;
    constructor(type: string, init: { code?: number; reason?: string; wasClean?: boolean } = {}) {
      super(type);
      this.code = init.code ?? 0;
      this.reason = init.reason ?? '';
      this.wasClean = init.wasClean ?? false;
    }
  };
}

// Inject mock into global scope before importing wsService
(global as any).WebSocket = MockWebSocket;

// Now import the service — it will see the mocked WebSocket global
// We re-import fresh each test via jest.isolateModules where state matters.
import { wsService } from '@/lib/websocket';

// ── Helpers ────────────────────────────────────────────────────────────────────

function openLatest() {
  MockWebSocket.latest().simulateOpen();
}

// ── Tests ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  MockWebSocket.reset();
  // Disconnect any lingering connection from previous test
  wsService.disconnect();
  // Re-enable reconnect by resetting internal state via a fresh connect cycle
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  wsService.disconnect();
});

describe('WebSocketService — native RFC 6455 adapter', () => {

  // ── 1. SSR safety ────────────────────────────────────────────────────────────
  describe('SSR safety', () => {
    it('does not throw when WebSocket is undefined (server-side)', () => {
      const orig = (global as any).WebSocket;
      delete (global as any).WebSocket;
      expect(() => wsService.connect('ws://localhost:8080/ws')).not.toThrow();
      (global as any).WebSocket = orig;
    });
  });

  // ── 2. connect() ─────────────────────────────────────────────────────────────
  describe('connect()', () => {
    it('creates a WebSocket to the given URL', () => {
      wsService.connect('ws://localhost:8080/ws');
      expect(MockWebSocket.instances).toHaveLength(1);
      expect(MockWebSocket.latest().url).toBe('ws://localhost:8080/ws');
    });

    it('is chainable (returns this)', () => {
      const result = wsService.connect('ws://localhost:8080/ws');
      expect(result).toBe(wsService);
    });

    it('does not create a second socket if already connecting', () => {
      wsService.connect('ws://localhost:8080/ws');
      wsService.connect('ws://localhost:8080/ws');
      expect(MockWebSocket.instances).toHaveLength(1);
    });

    it('does not create a second socket if already open', () => {
      wsService.connect('ws://localhost:8080/ws');
      openLatest();
      wsService.connect('ws://localhost:8080/ws');
      expect(MockWebSocket.instances).toHaveLength(1);
    });
  });

  // ── 3. Message dispatch ───────────────────────────────────────────────────────
  describe('message dispatch', () => {
    it('dispatches to listeners by msg.type', () => {
      wsService.connect('ws://localhost:8080/ws');
      openLatest();
      const handler = jest.fn();
      wsService.on('metrics:update', handler);
      MockWebSocket.latest().simulateMessage({
        type: 'metrics:update',
        payload: { active_bots: 3, total_bots: 5 },
      });
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ active_bots: 3, total_bots: 5 });
    });

    it('does not fire listeners for different event types', () => {
      wsService.connect('ws://localhost:8080/ws');
      openLatest();
      const handler = jest.fn();
      wsService.on('bot:connected', handler);
      MockWebSocket.latest().simulateMessage({ type: 'metrics:update', payload: {} });
      expect(handler).not.toHaveBeenCalled();
    });

    it('silently ignores non-JSON frames', () => {
      wsService.connect('ws://localhost:8080/ws');
      openLatest();
      const handler = jest.fn();
      wsService.on('anything', handler);
      expect(() =>
        MockWebSocket.latest().simulateRawMessage('not json at all')
      ).not.toThrow();
      expect(handler).not.toHaveBeenCalled();
    });

    it('silently ignores JSON without a type field', () => {
      wsService.connect('ws://localhost:8080/ws');
      openLatest();
      const handler = jest.fn();
      wsService.on('anything', handler);
      MockWebSocket.latest().simulateMessage({ foo: 'bar' });
      expect(handler).not.toHaveBeenCalled();
    });
  });

  // ── 4. on() / off() ──────────────────────────────────────────────────────────
  describe('on() / off()', () => {
    it('registers and calls a listener', () => {
      wsService.connect('ws://localhost:8080/ws');
      openLatest();
      const cb = jest.fn();
      wsService.on('bot:disconnected', cb);
      MockWebSocket.latest().simulateMessage({ type: 'bot:disconnected', payload: { id: 'x' } });
      expect(cb).toHaveBeenCalledWith({ id: 'x' });
    });

    it('off() with specific callback removes only that listener', () => {
      wsService.connect('ws://localhost:8080/ws');
      openLatest();
      const cb1 = jest.fn();
      const cb2 = jest.fn();
      wsService.on('test:event', cb1);
      wsService.on('test:event', cb2);
      wsService.off('test:event', cb1);
      MockWebSocket.latest().simulateMessage({ type: 'test:event', payload: 42 });
      expect(cb1).not.toHaveBeenCalled();
      expect(cb2).toHaveBeenCalledWith(42);
    });

    it('off() without callback removes all listeners for that event', () => {
      wsService.connect('ws://localhost:8080/ws');
      openLatest();
      const cb1 = jest.fn();
      const cb2 = jest.fn();
      wsService.on('test:event', cb1);
      wsService.on('test:event', cb2);
      wsService.off('test:event');
      MockWebSocket.latest().simulateMessage({ type: 'test:event', payload: {} });
      expect(cb1).not.toHaveBeenCalled();
      expect(cb2).not.toHaveBeenCalled();
    });
  });

  // ── 5. isConnected() ─────────────────────────────────────────────────────────
  describe('isConnected()', () => {
    it('returns false before connecting', () => {
      expect(wsService.isConnected()).toBe(false);
    });

    it('returns true after open', () => {
      wsService.connect('ws://localhost:8080/ws');
      openLatest();
      expect(wsService.isConnected()).toBe(true);
    });

    it('returns false after close', () => {
      wsService.connect('ws://localhost:8080/ws');
      openLatest();
      MockWebSocket.latest().simulateClose();
      expect(wsService.isConnected()).toBe(false);
    });
  });

  // ── 6. emit() ────────────────────────────────────────────────────────────────
  describe('emit()', () => {
    it('sends JSON {type, payload} when socket is open', () => {
      wsService.connect('ws://localhost:8080/ws');
      openLatest();
      wsService.emit('ping', { seq: 1 });
      const sent = MockWebSocket.latest().sentMessages;
      expect(sent).toHaveLength(1);
      expect(JSON.parse(sent[0])).toEqual({ type: 'ping', payload: { seq: 1 } });
    });

    it('does not throw when socket is not open', () => {
      expect(() => wsService.emit('ping', {})).not.toThrow();
    });
  });

  // ── 7. Exponential back-off reconnect ─────────────────────────────────────────
  describe('reconnect', () => {
    it('schedules reconnect after close', () => {
      wsService.connect('ws://localhost:8080/ws');
      openLatest();
      const countBefore = MockWebSocket.instances.length;
      MockWebSocket.latest().simulateClose(1001, 'gone');
      // First reconnect delay = 1000ms * 2^0 = 1000ms
      jest.advanceTimersByTime(1001);
      expect(MockWebSocket.instances.length).toBeGreaterThan(countBefore);
    });
  });

  // ── 8. disconnect() ───────────────────────────────────────────────────────────
  describe('disconnect()', () => {
    it('closes the socket and prevents reconnect', () => {
      wsService.connect('ws://localhost:8080/ws');
      openLatest();
      wsService.disconnect();
      const countAfterDisconnect = MockWebSocket.instances.length;
      // Even after advancing timers, no new socket should be created
      jest.advanceTimersByTime(10000);
      expect(MockWebSocket.instances.length).toBe(countAfterDisconnect);
      expect(wsService.isConnected()).toBe(false);
    });
  });

  // ── 9. kill:all end-to-end dispatch ──────────────────────────────────────────
  describe('kill:all — CNC kill-switch event', () => {
    it('dispatches kill:all payload to registered handlers', () => {
      wsService.connect('ws://localhost:8080/ws');
      openLatest();
      const handler = jest.fn();
      wsService.on('kill:all', handler);

      const payload = { all: true, bot_id: '', stopped: 3, timestamp: '2026-02-27T00:00:00Z' };
      MockWebSocket.latest().simulateMessage({ type: 'kill:all', payload });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(payload);
    });

    it('fires connect event on open', () => {
      wsService.connect('ws://localhost:8080/ws');
      const connectHandler = jest.fn();
      wsService.on('connect', connectHandler);
      openLatest();
      expect(connectHandler).toHaveBeenCalledTimes(1);
    });

    it('fires disconnect event on close', () => {
      wsService.connect('ws://localhost:8080/ws');
      openLatest();
      const disconnectHandler = jest.fn();
      wsService.on('disconnect', disconnectHandler);
      MockWebSocket.latest().simulateClose(1000, 'normal');
      expect(disconnectHandler).toHaveBeenCalledTimes(1);
      expect(disconnectHandler).toHaveBeenCalledWith({ code: 1000, reason: 'normal' });
    });
  });

  // ── 10. Multiple listeners for same event ─────────────────────────────────────
  describe('multiple listeners', () => {
    it('fires all registered listeners for the same event type', () => {
      wsService.connect('ws://localhost:8080/ws');
      openLatest();
      const cb1 = jest.fn();
      const cb2 = jest.fn();
      const cb3 = jest.fn();
      wsService.on('attack:started', cb1);
      wsService.on('attack:started', cb2);
      wsService.on('attack:started', cb3);
      MockWebSocket.latest().simulateMessage({ type: 'attack:started', payload: { target: '1.2.3.4' } });
      expect(cb1).toHaveBeenCalledTimes(1);
      expect(cb2).toHaveBeenCalledTimes(1);
      expect(cb3).toHaveBeenCalledTimes(1);
    });

    it('does not fire the same listener twice if registered twice (Set deduplication)', () => {
      wsService.connect('ws://localhost:8080/ws');
      openLatest();
      const cb = jest.fn();
      wsService.on('dedup:test', cb);
      wsService.on('dedup:test', cb); // same reference — should deduplicate
      MockWebSocket.latest().simulateMessage({ type: 'dedup:test', payload: {} });
      expect(cb).toHaveBeenCalledTimes(1);
    });
  });
});
