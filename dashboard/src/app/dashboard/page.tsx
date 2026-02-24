'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/shared';
import { StatCard } from '@/components/dashboard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '@/components/ui';
import { Globe3D } from '@/components/globe';
import { Terminal } from '@/components/terminal';
import { useWebSocket, useMetricsUpdates } from '@/hooks';

export default function DashboardPage() {
  const { isConnected, lastUpdate } = useWebSocket();
  const [metrics, setMetrics] = useState({
    activeBots: 1234,
    activeAttacks: 42,
    totalBandwidth: '2.5 TB/s',
    successRate: 94.2,
  });

  // Listen for real-time metric updates
  useMetricsUpdates((data) => {
    setMetrics(data);
  });

  // Simulate live updates if WebSocket not available
  useEffect(() => {
    if (isConnected) return;

    const interval = setInterval(() => {
      setMetrics(prev => ({
        activeBots: prev.activeBots + Math.floor(Math.random() * 10 - 5),
        activeAttacks: Math.max(0, prev.activeAttacks + Math.floor(Math.random() * 3 - 1)),
        totalBandwidth: prev.totalBandwidth,
        successRate: Math.min(100, Math.max(90, prev.successRate + (Math.random() * 2 - 1))),
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, [isConnected]);

  return (
    <div className="min-h-screen bg-primary-bg">
      <Navbar />
      
      {/* Main Content */}
      <main className="pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-display font-bold neon-text mb-2">
            Command & Control Dashboard
          </h1>
          <p className="text-text-secondary">
            Real-time monitoring and control interface
          </p>
        </div>

        {/* Connection Status */}
        {isConnected && (
          <div className="mb-4 glass-card px-4 py-2 rounded-lg inline-flex items-center space-x-2">
            <div className="w-2 h-2 bg-accent-primary rounded-full animate-pulse" />
            <span className="text-xs text-text-secondary">Live updates active</span>
            {lastUpdate && (
              <span className="text-xs text-text-muted">• Last: {lastUpdate.toLocaleTimeString()}</span>
            )}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Active Bots"
            value={metrics.activeBots.toLocaleString()}
            change={{ value: 12.5, trend: 'up' }}
            color="primary"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                />
              </svg>
            }
          />
          
          <StatCard
            title="Active Attacks"
            value={metrics.activeAttacks.toString()}
            change={{ value: 8.3, trend: 'up' }}
            color="warning"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            }
          />
          
          <StatCard
            title="Total Bandwidth"
            value={metrics.totalBandwidth}
            change={{ value: 5.2, trend: 'down' }}
            color="secondary"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            }
          />
          
          <StatCard
            title="Success Rate"
            value={`${metrics.successRate.toFixed(1)}%`}
            change={{ value: 2.1, trend: 'up' }}
            color="primary"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            }
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* 3D Globe Visualization */}
          <Card variant="elevated" className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Global Bot Network</CardTitle>
              <CardDescription>Real-time geographic distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <Globe3D
                  autoRotate
                  bots={[
                    { lat: 40.7128, lon: -74.0060, count: 150, country: 'USA' },
                    { lat: 51.5074, lon: -0.1278, count: 80, country: 'UK' },
                    { lat: 35.6762, lon: 139.6503, count: 120, country: 'Japan' },
                    { lat: -33.8688, lon: 151.2093, count: 45, country: 'Australia' },
                    { lat: 55.7558, lon: 37.6173, count: 90, country: 'Russia' },
                    { lat: 39.9042, lon: 116.4074, count: 200, country: 'China' },
                    { lat: 52.5200, lon: 13.4050, count: 65, country: 'Germany' },
                    { lat: -23.5505, lon: -46.6333, count: 75, country: 'Brazil' },
                    { lat: 19.0760, lon: 72.8777, count: 110, country: 'India' },
                    { lat: 1.3521, lon: 103.8198, count: 50, country: 'Singapore' },
                  ]}
                />
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Last 24 hours</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { action: 'New bot connected', time: '2m ago', type: 'success' },
                  { action: 'Attack completed', time: '15m ago', type: 'info' },
                  { action: 'Bot disconnected', time: '1h ago', type: 'warning' },
                  { action: 'Scan initiated', time: '2h ago', type: 'info' },
                  { action: 'Target acquired', time: '3h ago', type: 'success' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start space-x-3">
                    <div
                      className={`w-2 h-2 rounded-full mt-2 ${
                        item.type === 'success'
                          ? 'bg-accent-primary'
                          : item.type === 'warning'
                          ? 'bg-accent-warning'
                          : 'bg-accent-secondary'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary">{item.action}</p>
                      <p className="text-xs text-text-muted font-mono">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Quick Actions */}
          <Card variant="bordered" glow>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common operations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Button variant="primary" className="h-24 flex-col">
                  <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  Launch Attack
                </Button>
                <Button variant="secondary" className="h-24 flex-col">
                  <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  Scan Network
                </Button>
                <Button variant="ghost" className="h-24 flex-col">
                  <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  View Analytics
                </Button>
                <Button variant="ghost" className="h-24 flex-col">
                  <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* System Status */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>Service health monitoring</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { service: 'C&C Server', status: 'operational', uptime: '99.9%' },
                  { service: 'Database', status: 'operational', uptime: '99.8%' },
                  { service: 'AI Service', status: 'operational', uptime: '98.5%' },
                  { service: 'Metrics Server', status: 'degraded', uptime: '95.2%' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between glass-card p-3 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          item.status === 'operational' ? 'bg-accent-primary' : 'bg-accent-warning'
                        } animate-pulse`}
                      />
                      <span className="text-sm text-text-primary font-medium">{item.service}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-text-muted font-mono">{item.uptime}</span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          item.status === 'operational'
                            ? 'bg-accent-primary/20 text-accent-primary'
                            : 'bg-accent-warning/20 text-accent-warning'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center py-8 text-text-muted text-sm">
          <p>Mirai 2026 - For ethical security research and education only</p>
        </div>
      </main>
    </div>
  );
}
