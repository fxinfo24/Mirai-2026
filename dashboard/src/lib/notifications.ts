/**
 * Notification System Library
 * Handles toast, desktop, and custom notification rules
 */

import { useState, useEffect, useCallback } from 'react';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  priority: 'low' | 'medium' | 'high';
  timestamp: Date;
  read: boolean;
  source?: string;
  action?: {
    label: string;
    handler: () => void;
  };
}

export interface NotificationRule {
  id: string;
  name: string;
  event: 'bot_offline' | 'attack_complete' | 'high_resource' | 'security_alert' | 'custom';
  condition?: string;
  enabled: boolean;
  channels: ('toast' | 'desktop' | 'sound')[];
  priority: 'low' | 'medium' | 'high';
}

const DEFAULT_RULES: NotificationRule[] = [
  {
    id: 'rule_1',
    name: 'Bot Offline Alert',
    event: 'bot_offline',
    enabled: true,
    channels: ['toast', 'desktop', 'sound'],
    priority: 'high',
  },
  {
    id: 'rule_2',
    name: 'Attack Completion',
    event: 'attack_complete',
    enabled: true,
    channels: ['toast'],
    priority: 'medium',
  },
  {
    id: 'rule_3',
    name: 'High Resource Usage',
    event: 'high_resource',
    enabled: true,
    channels: ['toast'],
    priority: 'medium',
  },
  {
    id: 'rule_4',
    name: 'Security Alert',
    event: 'security_alert',
    enabled: true,
    channels: ['toast', 'desktop', 'sound'],
    priority: 'high',
  },
];

/**
 * Hook for managing notifications
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [rules, setRules] = useState<NotificationRule[]>(DEFAULT_RULES);

  // Load notifications from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('notifications');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setNotifications(parsed.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp),
        })));
      } catch (error) {
        console.error('Failed to load notifications:', error);
      }
    }

    const storedRules = localStorage.getItem('notification_rules');
    if (storedRules) {
      try {
        setRules(JSON.parse(storedRules));
      } catch (error) {
        console.error('Failed to load notification rules:', error);
      }
    }
  }, []);

  // Save notifications to localStorage
  useEffect(() => {
    if (notifications.length > 0) {
      localStorage.setItem('notifications', JSON.stringify(notifications.slice(0, 100)));
    }
  }, [notifications]);

  // Save rules to localStorage
  useEffect(() => {
    localStorage.setItem('notification_rules', JSON.stringify(rules));
  }, [rules]);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random()}`,
      timestamp: new Date(),
      read: false,
    };

    setNotifications(prev => [newNotification, ...prev]);
    return newNotification;
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    localStorage.removeItem('notifications');
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const toggleRule = useCallback((id: string) => {
    setRules(prev =>
      prev.map(r => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  }, []);

  const updateRule = useCallback((id: string, updates: Partial<NotificationRule>) => {
    setRules(prev =>
      prev.map(r => (r.id === id ? { ...r, ...updates } : r))
    );
  }, []);

  return {
    notifications,
    rules,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    removeNotification,
    toggleRule,
    updateRule,
  };
}

/**
 * Send a notification (checks rules and sends via appropriate channels)
 */
export function sendNotification(
  notification: Omit<Notification, 'id' | 'timestamp' | 'read'>,
  rules: NotificationRule[]
) {
  // Find matching rules
  const matchingRules = rules.filter(
    rule => rule.enabled && rule.priority === notification.priority
  );

  // Determine channels
  const channels = new Set<string>();
  matchingRules.forEach(rule => {
    rule.channels.forEach(channel => channels.add(channel));
  });

  // Send via channels
  if (channels.has('desktop') && 'Notification' in window && Notification.permission === 'granted') {
    new window.Notification(notification.title, {
      body: notification.message,
      icon: '/logo.png',
    });
  }

  if (channels.has('sound')) {
    const audio = new Audio('/sounds/notification.mp3');
    audio.play().catch(() => {});
  }

  return channels;
}
