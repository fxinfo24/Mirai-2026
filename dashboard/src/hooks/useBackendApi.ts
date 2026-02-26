/**
 * React hooks for backend API integration
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';

export function useBots() {
  const [bots, setBots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBots = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const response = await apiClient.getBots();
    
    if (response.success) {
      setBots((response.data as any[]) || []);
    } else {
      setError(response.error || 'Failed to fetch bots');
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBots();
    
    // Poll every 5 seconds
    const interval = setInterval(fetchBots, 5000);
    
    return () => clearInterval(interval);
  }, [fetchBots]);

  return { bots, loading, error, refetch: fetchBots };
}

export function useBotGroups() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const response = await apiClient.getGroups();
    
    if (response.success) {
      setGroups((response.data as any[]) || []);
    } else {
      setError(response.error || 'Failed to fetch groups');
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  return { groups, loading, error, refetch: fetchGroups };
}

export function useAttacks() {
  const [attacks, setAttacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAttacks = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const response = await apiClient.getAttacks();
    
    if (response.success) {
      setAttacks((response.data as any[]) || []);
    } else {
      setError(response.error || 'Failed to fetch attacks');
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAttacks();
    
    // Poll every 3 seconds for active attacks
    const interval = setInterval(fetchAttacks, 3000);
    
    return () => clearInterval(interval);
  }, [fetchAttacks]);

  return { attacks, loading, error, refetch: fetchAttacks };
}

export function useAttackHistory() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const response = await apiClient.getAttackHistory();
    
    if (response.success) {
      setHistory((response.data as any[]) || []);
    } else {
      setError(response.error || 'Failed to fetch attack history');
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { history, loading, error, refetch: fetchHistory };
}

export function useWebhooks() {
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWebhooks = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const response = await apiClient.getWebhooks();
    
    if (response.success) {
      setWebhooks((response.data as any[]) || []);
    } else {
      setError(response.error || 'Failed to fetch webhooks');
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  return { webhooks, loading, error, refetch: fetchWebhooks };
}

export function useHealthCheck() {
  const [health, setHealth] = useState<{ ai: boolean; cnc: boolean }>({
    ai: false,
    cnc: false,
  });
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      setChecking(true);
      const result = await apiClient.healthCheck();
      setHealth(result);
      setChecking(false);
    };

    checkHealth();
    
    // Check every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return { health, checking };
}
