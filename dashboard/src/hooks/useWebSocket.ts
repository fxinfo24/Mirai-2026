'use client';

import { useEffect, useState } from 'react';
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

export function useBotUpdates(callback: (data: any) => void) {
  const { isConnected } = useWebSocket();

  useEffect(() => {
    if (!isConnected) return;

    wsService.on('bot:update', callback);
    wsService.on('bot:connected', callback);
    wsService.on('bot:disconnected', callback);

    return () => {
      wsService.off('bot:update', callback);
      wsService.off('bot:connected', callback);
      wsService.off('bot:disconnected', callback);
    };
  }, [isConnected, callback]);

  return { isConnected };
}

export function useAttackUpdates(callback: (data: any) => void) {
  const { isConnected } = useWebSocket();

  useEffect(() => {
    if (!isConnected) return;

    wsService.on('attack:update', callback);
    wsService.on('attack:started', callback);
    wsService.on('attack:completed', callback);
    wsService.on('attack:failed', callback);

    return () => {
      wsService.off('attack:update', callback);
      wsService.off('attack:started', callback);
      wsService.off('attack:completed', callback);
      wsService.off('attack:failed', callback);
    };
  }, [isConnected, callback]);

  return { isConnected };
}

export function useMetricsUpdates(callback: (data: any) => void) {
  const { isConnected } = useWebSocket();

  useEffect(() => {
    if (!isConnected) return;

    wsService.on('metrics:update', callback);

    return () => {
      wsService.off('metrics:update', callback);
    };
  }, [isConnected, callback]);

  return { isConnected };
}
