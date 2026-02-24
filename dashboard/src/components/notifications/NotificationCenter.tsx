'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';
import { useNotifications, type Notification, type NotificationRule } from '@/lib/notifications';

export function NotificationCenter() {
  const { notifications, rules, markAsRead, clearAll, toggleRule } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications;

  const playNotificationSound = () => {
    if (soundEnabled && typeof Audio !== 'undefined') {
      const audio = new Audio('/sounds/notification.mp3');
      audio.play().catch(() => {});
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  const sendDesktopNotification = (notification: Notification) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new window.Notification(notification.title, {
        body: notification.message,
        icon: '/logo.png',
        tag: notification.id,
      });
    }
  };

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    const latestNotification = notifications[0];
    if (latestNotification && !latestNotification.read) {
      playNotificationSound();
      sendDesktopNotification(latestNotification);
    }
  }, [notifications]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Notifications List */}
      <Card variant="bordered" className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Notifications</CardTitle>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded text-sm ${
                  filter === 'all'
                    ? 'bg-accent-primary text-white'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-1 rounded text-sm ${
                  filter === 'unread'
                    ? 'bg-accent-primary text-white'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Unread ({notifications.filter(n => !n.read).length})
              </button>
              <Button variant="ghost" size="sm" onClick={clearAll}>
                Clear All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-12 text-text-muted">
                No notifications
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border transition-all cursor-pointer ${
                    notification.read
                      ? 'border-white/10 bg-white/5'
                      : 'border-accent-primary/50 bg-accent-primary/10'
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        {!notification.read && (
                          <div className="w-2 h-2 bg-accent-primary rounded-full" />
                        )}
                        <span className={`font-medium ${
                          notification.type === 'error' ? 'text-accent-danger' :
                          notification.type === 'warning' ? 'text-accent-warning' :
                          notification.type === 'success' ? 'text-accent-primary' :
                          'text-text-primary'
                        }`}>
                          {notification.title}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          notification.priority === 'high' ? 'bg-accent-danger/20 text-accent-danger' :
                          notification.priority === 'medium' ? 'bg-accent-warning/20 text-accent-warning' :
                          'bg-white/10 text-text-muted'
                        }`}>
                          {notification.priority}
                        </span>
                      </div>
                      <p className="text-sm text-text-secondary mt-1">
                        {notification.message}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-text-muted">
                        <span>{new Date(notification.timestamp).toLocaleString()}</span>
                        {notification.source && <span>Source: {notification.source}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sound Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-text-primary">Sound Alerts</div>
              <div className="text-xs text-text-muted">Play sound on new notification</div>
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`w-10 h-6 rounded-full transition-colors relative ${
                soundEnabled ? 'bg-accent-primary' : 'bg-white/10'
              }`}
            >
              <div className={`absolute w-4 h-4 bg-white rounded-full top-1 transition-transform ${
                soundEnabled ? 'translate-x-5' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Desktop Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-text-primary">Desktop Notifications</div>
              <div className="text-xs text-text-muted">
                {typeof window !== 'undefined' && 'Notification' in window
                  ? Notification.permission === 'granted'
                    ? 'Enabled'
                    : 'Click to enable'
                  : 'Not supported'}
              </div>
            </div>
            {typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted' && (
              <Button variant="primary" size="sm" onClick={requestNotificationPermission}>
                Enable
              </Button>
            )}
          </div>

          {/* Notification Rules */}
          <div className="pt-4 border-t border-white/10">
            <h4 className="text-sm font-medium text-text-primary mb-3">
              Notification Rules
            </h4>
            <div className="space-y-2">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-2 glass-card rounded"
                >
                  <div>
                    <div className="text-sm text-text-primary">{rule.name}</div>
                    <div className="text-xs text-text-muted capitalize">
                      {rule.event.replace('_', ' ')}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleRule(rule.id)}
                    className={`w-8 h-5 rounded-full transition-colors relative ${
                      rule.enabled ? 'bg-accent-primary' : 'bg-white/10'
                    }`}
                  >
                    <div className={`absolute w-3 h-3 bg-white rounded-full top-1 transition-transform ${
                      rule.enabled ? 'translate-x-4' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="pt-4 border-t border-white/10">
            <div className="grid grid-cols-2 gap-3">
              <div className="glass-card p-3 rounded">
                <div className="text-xs text-text-muted">Today</div>
                <div className="text-lg font-bold text-text-primary">
                  {notifications.filter(n => {
                    const today = new Date();
                    const notifDate = new Date(n.timestamp);
                    return notifDate.toDateString() === today.toDateString();
                  }).length}
                </div>
              </div>
              <div className="glass-card p-3 rounded">
                <div className="text-xs text-text-muted">Unread</div>
                <div className="text-lg font-bold text-accent-primary">
                  {notifications.filter(n => !n.read).length}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
