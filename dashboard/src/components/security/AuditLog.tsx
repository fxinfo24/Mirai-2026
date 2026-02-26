'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Button } from '@/components/ui';

export type AuditEventType =
  | 'LOGIN_OK'
  | 'LOGIN_FAIL'
  | 'ATTACK_ALLOW'
  | 'ATTACK_DENY'
  | 'WHITELIST_BLOCK'
  | 'BOT_AUTH_OK'
  | 'BOT_AUTH_FAIL'
  | 'TARGET_REJECTED'
  | 'AUTH_OK'
  | 'AUTH_FAIL';

export interface AuditEvent {
  id: string;
  timestamp: Date | string;
  type: AuditEventType;
  username?: string;
  source?: string;
  detail: string;
}

interface AuditLogProps {
  events: AuditEvent[];
  onClear?: () => void;
  maxEntries?: number;
}

export default function AuditLog({ events, onClear, maxEntries = 500 }: AuditLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [displayedEvents, setDisplayedEvents] = useState<AuditEvent[]>(events);

  useEffect(() => {
    setDisplayedEvents(events.slice(-maxEntries));
  }, [events, maxEntries]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayedEvents]);

  const getEventColor = (type: AuditEventType) => {
    if (type.includes('OK') || type === 'ATTACK_ALLOW') {
      return {
        bg: 'bg-accent-success/10',
        border: 'border-accent-success/30',
        text: 'text-accent-success',
        icon: '✓',
      };
    }
    if (type.includes('FAIL') || type === 'WHITELIST_BLOCK') {
      return {
        bg: 'bg-accent-danger/10',
        border: 'border-accent-danger/30',
        text: 'text-accent-danger',
        icon: '✗',
      };
    }
    if (type === 'ATTACK_DENY' || type === 'TARGET_REJECTED') {
      return {
        bg: 'bg-accent-warning/10',
        border: 'border-accent-warning/30',
        text: 'text-accent-warning',
        icon: '!',
      };
    }
    return {
      bg: 'bg-accent-primary/10',
      border: 'border-accent-primary/30',
      text: 'text-accent-primary',
      icon: 'ℹ',
    };
  };

  const eventCounts = {
    total: displayedEvents.length,
    authFailures: displayedEvents.filter((e) => e.type.includes('FAIL')).length,
    attackDenials: displayedEvents.filter((e) => e.type === 'ATTACK_DENY').length,
    whitelistBlocks: displayedEvents.filter((e) => e.type === 'WHITELIST_BLOCK').length,
  };

  const formatTimestamp = (timestamp: Date | string) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleTimeString();
  };

  return (
    <Card variant="elevated" className="overflow-hidden flex flex-col h-full">
      <CardHeader className="border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <CardTitle>Audit Log</CardTitle>
            <motion.span
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-accent-primary/20 text-accent-primary text-xs font-bold"
            >
              {eventCounts.total}
            </motion.span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-text-secondary hover:text-accent-danger"
          >
            Clear
          </Button>
        </div>
      </CardHeader>

      {/* Stats Bar */}
      <div className="px-6 py-4 border-b border-white/10 grid grid-cols-4 gap-4">
        <div className="text-center">
          <p className="text-xs text-text-muted">Total Events</p>
          <p className="text-lg font-bold text-text-primary">{eventCounts.total}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-text-muted">Auth Failures</p>
          <p className="text-lg font-bold text-accent-danger">{eventCounts.authFailures}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-text-muted">Attack Denials</p>
          <p className="text-lg font-bold text-accent-warning">{eventCounts.attackDenials}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-text-muted">Whitelist Blocks</p>
          <p className="text-lg font-bold text-accent-danger">
            {eventCounts.whitelistBlocks}
          </p>
        </div>
      </div>

      {/* Events List */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-2 p-6 bg-black/20"
      >
        <AnimatePresence mode="popLayout">
          {displayedEvents.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center h-full text-text-muted"
            >
              <p className="text-sm">No audit events yet</p>
            </motion.div>
          ) : (
            displayedEvents.map((event) => {
              const colors = getEventColor(event.type);
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className={`p-3 rounded-lg border ${colors.bg} ${colors.border} transition-all hover:border-opacity-60`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`mt-0.5 text-lg font-bold ${colors.text}`}>
                      {colors.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs font-mono text-text-muted">
                          {formatTimestamp(event.timestamp)}
                        </span>
                        <span className={`text-xs font-bold ${colors.text}`}>
                          {event.type}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 mb-1">
                        {event.username && (
                          <span className="text-sm text-text-primary font-medium">
                            {event.username}
                          </span>
                        )}
                        {event.source && (
                          <span className="text-sm text-text-secondary">
                            ({event.source})
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-text-secondary break-words">
                        {event.detail}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}
