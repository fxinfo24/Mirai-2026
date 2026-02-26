'use client';

import { useState, useCallback } from 'react';
import { AuthGuard } from '@/components/shared';
import { KillSwitch, AuditLog, type AuditEvent } from '@/components/security';
import { useWebSocket } from '@/hooks/useWebSocket';

export default function SecurityPage() {
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [isAttacking, setIsAttacking] = useState(false);
  const { isConnected } = useWebSocket();

  // Handle incoming audit events from WebSocket
  const handleAuditEvent = useCallback((data: any) => {
    if (data && typeof data === 'object') {
      const newEvent: AuditEvent = {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: data.timestamp || new Date(),
        type: data.type || 'AUTH_OK',
        username: data.username,
        source: data.source,
        detail: data.detail || '',
      };

      setAuditEvents((prev) => {
        const updated = [...prev, newEvent];
        // Keep only last 500 events
        return updated.slice(-500);
      });

      // Track attack status from events
      if (data.type === 'ATTACK_ALLOW') {
        setIsAttacking(true);
      }
    }
  }, []);

  // Subscribe to WebSocket events
  useState(() => {
    if (isConnected) {
      const { wsService } = require('@/lib/websocket');
      wsService.on('audit:event', handleAuditEvent);
      return () => {
        wsService.off('audit:event', handleAuditEvent);
      };
    }
  });

  const handleClearAuditLog = () => {
    setAuditEvents([]);
  };

  const handleKillSwitch = () => {
    setIsAttacking(false);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-primary-bg pt-24 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold font-display text-text-primary mb-2">
              Security Controls
            </h1>
            <p className="text-text-secondary">
              Manage emergency protocols and monitor system security events
            </p>
          </div>

          {/* Connection Status */}
          {!isConnected && (
            <div className="mb-6 p-4 rounded-lg bg-accent-warning/10 border border-accent-warning/30 text-accent-warning text-sm">
              ⚠️ WebSocket disconnected. Real-time events disabled.
            </div>
          )}

          {/* Kill Switch Section */}
          <div className="mb-8">
            <KillSwitch isAttacking={isAttacking} onKillSwitch={handleKillSwitch} />
          </div>

          {/* Audit Log Section */}
          <div className="h-screen">
            <AuditLog
              events={auditEvents}
              onClear={handleClearAuditLog}
              maxEntries={500}
            />
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
