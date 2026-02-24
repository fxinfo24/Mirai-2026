'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';

interface HeatmapData {
  hour: number;
  day: string;
  value: number;
}

interface HeatmapChartProps {
  data: HeatmapData[];
  title?: string;
  description?: string;
}

export function HeatmapChart({ data, title = 'Attack Pattern Heatmap', description = 'Hourly attack patterns by day' }: HeatmapChartProps) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  const maxValue = Math.max(...data.map(d => d.value));
  
  const getColor = (value: number) => {
    if (value === 0) return 'bg-primary-bg-secondary';
    const intensity = value / maxValue;
    if (intensity > 0.8) return 'bg-accent-danger';
    if (intensity > 0.6) return 'bg-accent-warning';
    if (intensity > 0.4) return 'bg-accent-secondary';
    return 'bg-accent-primary/40';
  };

  const getValue = (day: string, hour: number) => {
    const item = data.find(d => d.day === day && d.hour === hour);
    return item?.value || 0;
  };

  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <div className="flex space-x-1 mb-2">
              <div className="w-12" /> {/* Spacer for day labels */}
              {hours.map(hour => (
                <div key={hour} className="w-8 text-center text-xs text-text-muted">
                  {hour}
                </div>
              ))}
            </div>
            {days.map(day => (
              <div key={day} className="flex space-x-1 mb-1">
                <div className="w-12 text-xs text-text-secondary flex items-center">
                  {day}
                </div>
                {hours.map(hour => {
                  const value = getValue(day, hour);
                  return (
                    <div
                      key={hour}
                      className={`w-8 h-8 ${getColor(value)} rounded transition-all hover:scale-110 cursor-pointer relative group`}
                      title={`${day} ${hour}:00 - ${value} attacks`}
                    >
                      <div className="absolute hidden group-hover:block bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-primary-bg border border-white/20 rounded text-xs whitespace-nowrap z-10">
                        {day} {hour}:00<br />
                        {value} attacks
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            {/* Legend */}
            <div className="flex items-center space-x-2 mt-4 text-xs text-text-muted">
              <span>Less</span>
              <div className="flex space-x-1">
                <div className="w-4 h-4 bg-primary-bg-secondary rounded" />
                <div className="w-4 h-4 bg-accent-primary/40 rounded" />
                <div className="w-4 h-4 bg-accent-secondary rounded" />
                <div className="w-4 h-4 bg-accent-warning rounded" />
                <div className="w-4 h-4 bg-accent-danger rounded" />
              </div>
              <span>More</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
