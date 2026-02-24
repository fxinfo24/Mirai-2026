/**
 * Unit tests for Notification System
 */

import { renderHook, act } from '@testing-library/react';
import { useNotifications, sendNotification } from '@/lib/notifications';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Notification System', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('useNotifications hook', () => {
    it('should initialize with empty notifications', () => {
      const { result } = renderHook(() => useNotifications());

      expect(result.current.notifications).toEqual([]);
    });

    it('should add notification', () => {
      const { result } = renderHook(() => useNotifications());

      act(() => {
        result.current.addNotification({
          title: 'Test',
          message: 'Test message',
          type: 'info',
          priority: 'low',
        });
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].title).toBe('Test');
      expect(result.current.notifications[0].read).toBe(false);
    });

    it('should mark notification as read', () => {
      const { result } = renderHook(() => useNotifications());

      let notifId: string;

      act(() => {
        const notif = result.current.addNotification({
          title: 'Test',
          message: 'Test message',
          type: 'info',
          priority: 'low',
        });
        notifId = notif.id;
      });

      act(() => {
        result.current.markAsRead(notifId!);
      });

      expect(result.current.notifications[0].read).toBe(true);
    });

    it('should mark all as read', () => {
      const { result } = renderHook(() => useNotifications());

      act(() => {
        result.current.addNotification({
          title: 'Test 1',
          message: 'Message 1',
          type: 'info',
          priority: 'low',
        });
        result.current.addNotification({
          title: 'Test 2',
          message: 'Message 2',
          type: 'info',
          priority: 'low',
        });
      });

      act(() => {
        result.current.markAllAsRead();
      });

      expect(result.current.notifications.every(n => n.read)).toBe(true);
    });

    it('should clear all notifications', () => {
      const { result } = renderHook(() => useNotifications());

      act(() => {
        result.current.addNotification({
          title: 'Test',
          message: 'Message',
          type: 'info',
          priority: 'low',
        });
      });

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.notifications).toEqual([]);
    });

    it('should toggle notification rule', () => {
      const { result } = renderHook(() => useNotifications());

      const initialRule = result.current.rules[0];
      const initialState = initialRule.enabled;

      act(() => {
        result.current.toggleRule(initialRule.id);
      });

      const updatedRule = result.current.rules.find(r => r.id === initialRule.id);
      expect(updatedRule?.enabled).toBe(!initialState);
    });

    it('should persist notifications to localStorage', () => {
      const { result } = renderHook(() => useNotifications());

      act(() => {
        result.current.addNotification({
          title: 'Persistent',
          message: 'This should persist',
          type: 'info',
          priority: 'low',
        });
      });

      const stored = localStorageMock.getItem('notifications');
      expect(stored).toBeDefined();
      expect(JSON.parse(stored!)).toHaveLength(1);
    });
  });

  describe('sendNotification function', () => {
    it('should determine correct channels based on rules', () => {
      const rules = [
        {
          id: '1',
          name: 'High Priority',
          event: 'bot_offline' as const,
          enabled: true,
          channels: ['toast' as const, 'desktop' as const, 'sound' as const],
          priority: 'high' as const,
        },
      ];

      const notification = {
        title: 'Bot Offline',
        message: 'Bot-1 is offline',
        type: 'error' as const,
        priority: 'high' as const,
      };

      const channels = sendNotification(notification, rules);

      expect(channels.has('toast')).toBe(true);
      expect(channels.has('desktop')).toBe(true);
      expect(channels.has('sound')).toBe(true);
    });

    it('should not send if rule is disabled', () => {
      const rules = [
        {
          id: '1',
          name: 'Disabled Rule',
          event: 'bot_offline' as const,
          enabled: false,
          channels: ['toast' as const],
          priority: 'high' as const,
        },
      ];

      const notification = {
        title: 'Bot Offline',
        message: 'Bot-1 is offline',
        type: 'error' as const,
        priority: 'high' as const,
      };

      const channels = sendNotification(notification, rules);

      expect(channels.size).toBe(0);
    });
  });
});
