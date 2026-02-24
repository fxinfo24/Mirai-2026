'use client';

import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    trend: 'up' | 'down';
  };
  icon: React.ReactNode;
  color?: 'primary' | 'secondary' | 'warning' | 'danger';
}

export const StatCard = ({ title, value, change, icon, color = 'primary' }: StatCardProps) => {
  const colorStyles = {
    primary: 'text-accent-primary',
    secondary: 'text-accent-secondary',
    warning: 'text-accent-warning',
    danger: 'text-accent-danger',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -4 }}
    >
      <Card variant="elevated" className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-text-secondary font-medium mb-1">{title}</p>
              <p className="text-3xl font-bold font-display text-text-primary mb-2">
                {value}
              </p>
              {change && (
                <div className="flex items-center space-x-1">
                  <svg
                    className={`w-4 h-4 ${
                      change.trend === 'up' ? 'text-accent-primary rotate-0' : 'text-accent-danger rotate-180'
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 10l7-7m0 0l7 7m-7-7v18"
                    />
                  </svg>
                  <span
                    className={`text-sm font-medium ${
                      change.trend === 'up' ? 'text-accent-primary' : 'text-accent-danger'
                    }`}
                  >
                    {Math.abs(change.value)}%
                  </span>
                </div>
              )}
            </div>
            <div
              className={`p-3 rounded-lg bg-gradient-to-br from-white/10 to-white/5 ${colorStyles[color]}`}
            >
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
