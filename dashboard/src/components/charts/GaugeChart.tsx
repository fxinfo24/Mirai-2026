'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';

interface GaugeChartProps {
  value: number;
  max?: number;
  label: string;
  unit?: string;
  color?: 'primary' | 'secondary' | 'warning' | 'danger';
}

export function GaugeChart({ 
  value, 
  max = 100, 
  label, 
  unit = '%',
  color = 'primary'
}: GaugeChartProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const rotation = (percentage / 100) * 180 - 90;
  
  const colorClasses = {
    primary: 'text-accent-primary',
    secondary: 'text-accent-secondary',
    warning: 'text-accent-warning',
    danger: 'text-accent-danger',
  };

  const gradientColors = {
    primary: ['#00ff9f', '#00d4ff'],
    secondary: ['#00d4ff', '#9ca3af'],
    warning: ['#ffd60a', '#ff006e'],
    danger: ['#ff006e', '#dc2626'],
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative w-full aspect-square max-w-[200px] mx-auto">
          {/* Background Arc */}
          <svg className="w-full h-full" viewBox="0 0 200 200">
            <defs>
              <linearGradient id={`gradient-${label}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={gradientColors[color][0]} />
                <stop offset="100%" stopColor={gradientColors[color][1]} />
              </linearGradient>
            </defs>
            {/* Background */}
            <path
              d="M 30 170 A 80 80 0 0 1 170 170"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="20"
              strokeLinecap="round"
            />
            {/* Progress */}
            <path
              d="M 30 170 A 80 80 0 0 1 170 170"
              fill="none"
              stroke={`url(#gradient-${label})`}
              strokeWidth="20"
              strokeLinecap="round"
              strokeDasharray={`${(percentage / 100) * 251.2} 251.2`}
              className="transition-all duration-1000"
            />
            {/* Needle */}
            <line
              x1="100"
              y1="100"
              x2="100"
              y2="40"
              stroke={gradientColors[color][0]}
              strokeWidth="3"
              strokeLinecap="round"
              transform={`rotate(${rotation} 100 100)`}
              className="transition-transform duration-1000"
            />
            {/* Center dot */}
            <circle cx="100" cy="100" r="8" fill={gradientColors[color][0]} />
          </svg>
          
          {/* Value Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pt-12">
            <div className={`text-4xl font-bold font-display ${colorClasses[color]}`}>
              {value.toFixed(1)}
            </div>
            <div className="text-sm text-text-muted">{unit}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
