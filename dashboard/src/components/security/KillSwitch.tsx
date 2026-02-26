'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui';

interface KillSwitchProps {
  isAttacking: boolean;
  onKillSwitch?: () => void;
}

export default function KillSwitch({ isAttacking, onKillSwitch }: KillSwitchProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [lastTriggered, setLastTriggered] = useState<Date | null>(null);

  const handleKillSwitch = async () => {
    const confirmed = window.confirm('Send kill switch signal to ALL bots?');
    if (!confirmed) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/attack/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ all: true }),
      });

      if (response.ok) {
        setLastTriggered(new Date());
        onKillSwitch?.();
      } else {
        console.error('Kill switch failed:', response.statusText);
      }
    } catch (error) {
      console.error('Kill switch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card variant="elevated" className="border-2 border-accent-danger/30 overflow-hidden">
      <CardContent className="p-8">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="relative">
                <div
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    isAttacking ? 'bg-accent-danger animate-pulse' : 'bg-accent-success'
                  }`}
                />
                {isAttacking && (
                  <div className="absolute inset-0 w-3 h-3 rounded-full bg-accent-danger animate-ping opacity-75" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-text-primary">
                {isAttacking ? 'Attacks Active' : 'All Clear'}
              </h3>
            </div>

            <p className="text-sm text-text-secondary mb-6">
              {isAttacking
                ? 'Active attacks detected. Use emergency stop if needed.'
                : 'No active attacks. System is idle.'}
            </p>

            {lastTriggered && (
              <p className="text-xs text-text-muted">
                Last triggered: {lastTriggered.toLocaleTimeString()}
              </p>
            )}
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleKillSwitch}
            disabled={isLoading || !isAttacking}
            className="relative w-24 h-24 rounded-full font-bold text-white transition-all duration-300 flex items-center justify-center flex-col disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: isAttacking
                ? 'linear-gradient(135deg, #ff006e, #ff4081)'
                : 'linear-gradient(135deg, #888, #666)',
            }}
          >
            <svg
              className="w-10 h-10 mb-1"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
            </svg>
            <span className="text-xs">STOP</span>
          </motion.button>
        </div>

        <div className="mt-6 pt-6 border-t border-white/10">
          <p className="text-xs text-text-muted font-mono">
            <span className="block">Signal: SIGUSR1 (Emergency Kill)</span>
            <span className="block text-accent-danger font-semibold">
              {isAttacking ? '⚠️ ATTACKS ACTIVE' : '✓ Status: Idle'}
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
