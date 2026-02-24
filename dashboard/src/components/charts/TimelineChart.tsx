'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';

interface TimelineEvent {
  id: string;
  timestamp: Date;
  type: 'attack' | 'bot' | 'system';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface TimelineChartProps {
  events: TimelineEvent[];
  title?: string;
  description?: string;
}

export function TimelineChart({ 
  events, 
  title = 'Event Timeline',
  description = 'Recent system events'
}: TimelineChartProps) {
  const sortedEvents = [...events].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const getTypeIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'attack':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case 'bot':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
        );
      case 'system':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
    }
  };

  const getSeverityColor = (severity: TimelineEvent['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-accent-danger text-accent-danger';
      case 'high': return 'bg-accent-warning text-accent-warning';
      case 'medium': return 'bg-accent-secondary text-accent-secondary';
      case 'low': return 'bg-accent-primary text-accent-primary';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-accent-primary via-accent-secondary to-transparent" />
          
          <div className="space-y-6">
            {sortedEvents.map((event, index) => (
              <div key={event.id} className="relative pl-16">
                {/* Timeline dot */}
                <div
                  className={`absolute left-6 top-1.5 w-5 h-5 rounded-full border-2 border-primary-bg flex items-center justify-center ${getSeverityColor(event.severity).split(' ')[0]}/20`}
                >
                  <div className={`w-3 h-3 rounded-full ${getSeverityColor(event.severity).split(' ')[0]}`} />
                </div>

                {/* Event card */}
                <div className="glass-card p-4 rounded-lg hover:bg-white/10 transition-all group">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className={getSeverityColor(event.severity).split(' ')[1]}>
                        {getTypeIcon(event.type)}
                      </div>
                      <h4 className="text-sm font-medium text-text-primary">
                        {event.title}
                      </h4>
                    </div>
                    <span className="text-xs text-text-muted font-mono">
                      {formatTime(event.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary">
                    {event.description}
                  </p>
                  <div className="flex items-center space-x-2 mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${getSeverityColor(event.severity).split(' ')[0]}/20 ${getSeverityColor(event.severity).split(' ')[1]} capitalize`}>
                      {event.severity}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-text-muted capitalize">
                      {event.type}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
