'use client';

import { useEffect, useRef, useState } from 'react';
import { wsService } from '@/lib/websocket';

export function useWebSocket(autoConnect: boolean = true) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    if (!autoConnect) return;

    // Connect to WebSocket (will gracefully fail if server not available)
    try {
      const socket = wsService.connect();

      const handleConnect = () => {
        setIsConnected(true);
        setLastUpdate(new Date());
      };

      const handleDisconnect = () => {
        setIsConnected(false);
      };

      wsService.on('connect', handleConnect);
      wsService.on('disconnect', handleDisconnect);

      // Check initial connection state
      setIsConnected(wsService.isConnected());

      return () => {
        wsService.off('connect', handleConnect);
        wsService.off('disconnect', handleDisconnect);
      };
    } catch (error) {
      console.log('WebSocket not available, using mock data');
      return;
    }
  }, [autoConnect]);

  return {
    isConnected,
    lastUpdate,
    wsService,
  };
}

// Fix #5: All three update hooks previously listed `callback` in their
// useEffect dependency arrays. Because callers typically pass an inline
// arrow function, the reference changes on every render, causing the
// effect to re-run (unsubscribe + re-subscribe) on every render — a
// classic React infinite-loop footgun.
//
// Solution: store the latest callback in a ref. The ref is always current
// (updated synchronously before the effect runs) but is a stable object,
// so it never triggers the effect to re-run. The wrapper passed to wsService
// reads from the ref at call time, getting the latest version of the callback.

export function useBotUpdates(callback: (data: any) => void) {
  const { isConnected } = useWebSocket();
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!isConnected) return;

    const handler = (data: any) => callbackRef.current(data);
    wsService.on('bot:update', handler);
    wsService.on('bot:connected', handler);
    wsService.on('bot:disconnected', handler);

    return () => {
      wsService.off('bot:update', handler);
      wsService.off('bot:connected', handler);
      wsService.off('bot:disconnected', handler);
    };
  }, [isConnected]); // stable — callbackRef never changes identity

  return { isConnected };
}

export function useAttackUpdates(callback: (data: any) => void) {
  const { isConnected } = useWebSocket();
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!isConnected) return;

    const handler = (data: any) => callbackRef.current(data);
    wsService.on('attack:update', handler);
    wsService.on('attack:started', handler);
    wsService.on('attack:completed', handler);
    wsService.on('attack:failed', handler);

    return () => {
      wsService.off('attack:update', handler);
      wsService.off('attack:started', handler);
      wsService.off('attack:completed', handler);
      wsService.off('attack:failed', handler);
    };
  }, [isConnected]); // stable — callbackRef never changes identity

  return { isConnected };
}

export function useMetricsUpdates(callback: (data: any) => void) {
  const { isConnected } = useWebSocket();
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!isConnected) return;

    const handler = (data: any) => callbackRef.current(data);
    wsService.on('metrics:update', handler);

    return () => {
      wsService.off('metrics:update', handler);
    };
  }, [isConnected]); // stable — callbackRef never changes identity

  return { isConnected };
}

// useKillSignal — subscribes to "kill:all" WebSocket messages broadcast by the
// CNC server when POST /api/attack/stop is triggered. The callback receives the
// full kill:all payload: { all, bot_id, stopped, timestamp }.
//
// Uses the same ref-stabilisation pattern as the other hooks to avoid
// unsubscribe/resubscribe on every render.
export function useKillSignal(callback: (data: any) => void) {
  const { isConnected } = useWebSocket();
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!isConnected) return;

    const handler = (data: any) => callbackRef.current(data);
    wsService.on('kill:all', handler);

    return () => {
      wsService.off('kill:all', handler);
    };
  }, [isConnected]); // stable — callbackRef never changes identity

  return { isConnected };
}
