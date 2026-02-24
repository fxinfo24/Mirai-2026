'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { BotHealth } from '@/lib/botManagement';

interface BotHealthMonitorProps {
  health: BotHealth;
}

export function BotHealthMonitor({ health }: BotHealthMonitorProps) {
  const getStatusColor = (status: BotHealth['status']) => {
    switch (status) {
      case 'healthy': return 'text-accent-primary';
      case 'warning': return 'text-accent-warning';
      case 'critical': return 'text-accent-danger';
      case 'offline': return 'text-text-muted';
    }
  };

  const getProgressColor = (value: number) => {
    if (value > 90) return 'bg-accent-danger';
    if (value > 70) return 'bg-accent-warning';
    return 'bg-accent-primary';
  };

  return (
    <Card variant="elevated">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Health Monitor</CardTitle>
          <span className={`text-sm font-medium ${getStatusColor(health.status)} capitalize`}>
            {health.status}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* CPU Usage */}
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-text-secondary">CPU Usage</span>
            <span className="text-text-primary font-mono">{health.cpu.toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-primary-bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full ${getProgressColor(health.cpu)} rounded-full transition-all duration-300`}
              style={{ width: `${health.cpu}%` }}
            />
          </div>
        </div>

        {/* Memory Usage */}
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-text-secondary">Memory Usage</span>
            <span className="text-text-primary font-mono">{health.memory.toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-primary-bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full ${getProgressColor(health.memory)} rounded-full transition-all duration-300`}
              style={{ width: `${health.memory}%` }}
            />
          </div>
        </div>

        {/* Network Usage */}
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-text-secondary">Network Usage</span>
            <span className="text-text-primary font-mono">{health.network.toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-primary-bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full ${getProgressColor(health.network)} rounded-full transition-all duration-300`}
              style={{ width: `${health.network}%` }}
            />
          </div>
        </div>

        {/* Uptime */}
        <div className="pt-2 border-t border-white/10">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Uptime</span>
            <span className="text-text-primary">{formatUptime(health.uptime)}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-text-secondary">Last Seen</span>
            <span className="text-text-muted text-xs">
              {formatLastSeen(health.lastSeen)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function formatLastSeen(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}
