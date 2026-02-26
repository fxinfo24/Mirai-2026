'use client';

import { useState } from 'react';
import { Navbar } from '@/components/shared';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '@/components/ui';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { HeatmapChart } from '@/components/charts/HeatmapChart';
import { NetworkTopology } from '@/components/charts/NetworkTopology';
import { SankeyDiagram } from '@/components/charts/SankeyDiagram';
import { GaugeChart } from '@/components/charts/GaugeChart';
import { TimelineChart } from '@/components/charts/TimelineChart';
import { PredictiveAnalytics } from '@/components/ai/PredictiveAnalytics';
import { ReportBuilder } from '@/components/analytics/ReportBuilder';
import { WebhookManager } from '@/components/integrations/WebhookManager';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';

// ── Static mock data (defined outside component to avoid re-renders) ──────────

const trafficData = [
  { time: '00:00', bandwidth: 2.4, packets: 1200 },
  { time: '04:00', bandwidth: 1.8, packets: 900 },
  { time: '08:00', bandwidth: 3.2, packets: 1600 },
  { time: '12:00', bandwidth: 4.5, packets: 2200 },
  { time: '16:00', bandwidth: 3.8, packets: 1900 },
  { time: '20:00', bandwidth: 5.2, packets: 2600 },
  { time: '23:59', bandwidth: 4.1, packets: 2050 },
];

const attackTypeData = [
  { name: 'UDP Flood', value: 45, count: 234 },
  { name: 'TCP SYN', value: 30, count: 156 },
  { name: 'HTTP Flood', value: 15, count: 78 },
  { name: 'DNS Amplification', value: 10, count: 52 },
];

const botActivityData = [
  { country: 'USA', bots: 150 },
  { country: 'China', bots: 200 },
  { country: 'Russia', bots: 90 },
  { country: 'Germany', bots: 65 },
  { country: 'Japan', bots: 120 },
  { country: 'Brazil', bots: 75 },
  { country: 'India', bots: 110 },
  { country: 'UK', bots: 80 },
];

const performanceData = [
  { metric: 'Success Rate', value: 94 },
  { metric: 'Uptime', value: 99 },
  { metric: 'Efficiency', value: 87 },
  { metric: 'Response Time', value: 92 },
];

const COLORS = ['#00ff9f', '#00d4ff', '#ff006e', '#ffd60a'];

// Attack success rates fixed to avoid random re-renders
const attackStats = [
  { success: 97, duration: 22, bandwidth: 2.3 },
  { success: 93, duration: 18, bandwidth: 1.7 },
  { success: 91, duration: 31, bandwidth: 3.1 },
  { success: 95, duration: 27, bandwidth: 2.8 },
];

// Heatmap: 7 days × 24 hours = 168 points
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const heatmapData = DAYS.flatMap((day, di) =>
  Array.from({ length: 24 }, (_, hour) => ({
    day,
    hour,
    // Deterministic pseudo-random value based on position
    value: Math.round(((di * 24 + hour) * 37 + 13) % 100),
  }))
);

// Network topology
const networkNodes = [
  { id: 'cnc-1', type: 'cnc' as const, label: 'C&C Server', status: 'active' as const },
  { id: 'bot-1', type: 'bot' as const, label: 'Bot-001', status: 'active' as const },
  { id: 'bot-2', type: 'bot' as const, label: 'Bot-002', status: 'active' as const },
  { id: 'bot-3', type: 'bot' as const, label: 'Bot-003', status: 'idle' as const },
  { id: 'proxy-1', type: 'proxy' as const, label: 'Proxy-A', status: 'active' as const },
  { id: 'target-1', type: 'target' as const, label: 'Target-1', status: 'active' as const },
  { id: 'target-2', type: 'target' as const, label: 'Target-2', status: 'offline' as const },
];

const networkLinks = [
  { source: 'cnc-1', target: 'bot-1', strength: 80 },
  { source: 'cnc-1', target: 'bot-2', strength: 80 },
  { source: 'cnc-1', target: 'bot-3', strength: 80 },
  { source: 'bot-1', target: 'proxy-1', strength: 60 },
  { source: 'bot-2', target: 'proxy-1', strength: 60 },
  { source: 'proxy-1', target: 'target-1', strength: 90 },
  { source: 'proxy-1', target: 'target-2', strength: 90 },
];

// Sankey diagram
const sankeyNodes = [
  { id: 'bots', label: 'Bots' },
  { id: 'proxy', label: 'Proxy' },
  { id: 'target1', label: 'Target 1' },
  { id: 'target2', label: 'Target 2' },
  { id: 'cdn', label: 'CDN' },
  { id: 'origin', label: 'Origin' },
];

const sankeyLinks = [
  { source: 'bots', target: 'proxy', value: 100 },
  { source: 'proxy', target: 'target1', value: 60 },
  { source: 'proxy', target: 'target2', value: 40 },
  { source: 'target1', target: 'cdn', value: 50 },
  { source: 'target2', target: 'cdn', value: 30 },
  { source: 'cdn', target: 'origin', value: 80 },
];

// Timeline events (timestamps relative to "now" at module load)
const NOW = new Date('2026-02-24T12:00:00Z');
const timelineEvents = [
  {
    id: 'evt-1',
    timestamp: new Date(NOW.getTime() - 23 * 3600_000),
    type: 'system' as const,
    title: 'System Initialized',
    description: 'C&C server started and all bots checked in.',
    severity: 'low' as const,
  },
  {
    id: 'evt-2',
    timestamp: new Date(NOW.getTime() - 18 * 3600_000),
    type: 'bot' as const,
    title: 'New Bot Registered',
    description: 'Bot-003 joined the network from AS4134.',
    severity: 'low' as const,
  },
  {
    id: 'evt-3',
    timestamp: new Date(NOW.getTime() - 12 * 3600_000),
    type: 'attack' as const,
    title: 'UDP Flood Launched',
    description: 'Attack campaign started against Target-1 at 4.5 Gbps.',
    severity: 'high' as const,
  },
  {
    id: 'evt-4',
    timestamp: new Date(NOW.getTime() - 8 * 3600_000),
    type: 'system' as const,
    title: 'Evasion Module Activated',
    description: 'ML evasion layer engaged due to detection signal.',
    severity: 'medium' as const,
  },
  {
    id: 'evt-5',
    timestamp: new Date(NOW.getTime() - 4 * 3600_000),
    type: 'attack' as const,
    title: 'HTTP Flood Escalated',
    description: 'Layer-7 flood intensity increased to critical levels.',
    severity: 'critical' as const,
  },
  {
    id: 'evt-6',
    timestamp: new Date(NOW.getTime() - 1 * 3600_000),
    type: 'bot' as const,
    title: 'Bot-002 Went Offline',
    description: 'Bot-002 lost connectivity — auto-recovery in progress.',
    severity: 'medium' as const,
  },
];

// ── Tab definitions ───────────────────────────────────────────────────────────

const TABS = ['Overview', 'Charts', 'Network', 'AI & Predictions', 'Reports', 'Integrations', 'Notifications'] as const;
type Tab = typeof TABS[number];

// ── Page component ────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Overview');

  return (
    <div className="min-h-screen bg-primary-bg">
      <Navbar />

      <main className="pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-display font-bold neon-text mb-2">
            Analytics &amp; Insights
          </h1>
          <p className="text-text-secondary">
            Performance metrics, traffic analysis, and operational intelligence
          </p>
        </div>

        {/* Tab Bar */}
        <div className="flex space-x-1 mb-8 border-b border-white/10 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? 'bg-accent-primary/20 text-accent-primary border-b-2 border-accent-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── TAB: Overview ─────────────────────────────────────────────────── */}
        {activeTab === 'Overview' && (
          <div>
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-accent-primary">5.2 Gbps</div>
                  <div className="text-sm text-text-secondary">Peak Traffic</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-accent-secondary">2.6M</div>
                  <div className="text-sm text-text-secondary">Total Packets</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-text-primary">520</div>
                  <div className="text-sm text-text-secondary">Total Attacks</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-accent-primary">94.2%</div>
                  <div className="text-sm text-text-secondary">Success Rate</div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Traffic Over Time */}
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle>Network Traffic (24h)</CardTitle>
                  <CardDescription>Bandwidth and packet flow</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={trafficData}>
                      <defs>
                        <linearGradient id="colorBandwidth" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00ff9f" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#00ff9f" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                      <XAxis dataKey="time" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" />
                      <Tooltip contentStyle={{ backgroundColor: '#0a0e27', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#e5e7eb' }} />
                      <Area type="monotone" dataKey="bandwidth" stroke="#00ff9f" fillOpacity={1} fill="url(#colorBandwidth)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Attack Distribution */}
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle>Attack Type Distribution</CardTitle>
                  <CardDescription>Breakdown by attack method</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={attackTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        dataKey="value"
                      >
                        {attackTypeData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0a0e27', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#e5e7eb' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Bot Distribution by Country */}
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle>Bot Distribution</CardTitle>
                  <CardDescription>Active bots by country</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={botActivityData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                      <XAxis dataKey="country" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" />
                      <Tooltip contentStyle={{ backgroundColor: '#0a0e27', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#e5e7eb' }} />
                      <Bar dataKey="bots" fill="#00ff9f" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Performance Metrics */}
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                  <CardDescription>System efficiency indicators</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={performanceData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                      <XAxis type="number" stroke="#9ca3af" domain={[0, 100]} />
                      <YAxis dataKey="metric" type="category" stroke="#9ca3af" width={120} />
                      <Tooltip contentStyle={{ backgroundColor: '#0a0e27', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#e5e7eb' }} />
                      <Bar dataKey="value" fill="#00d4ff" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Attack Statistics Table */}
            <Card variant="elevated" className="mb-8">
              <CardHeader>
                <CardTitle>Attack Statistics</CardTitle>
                <CardDescription>Detailed breakdown of recent attacks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Type</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Count</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Success</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Avg Duration</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Avg Bandwidth</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attackTypeData.map((type, i) => (
                        <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                              <span className="text-text-primary">{type.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-text-primary font-mono">{type.count}</td>
                          <td className="py-3 px-4">
                            <span className="text-accent-primary">{attackStats[i].success}%</span>
                          </td>
                          <td className="py-3 px-4 text-text-secondary">{attackStats[i].duration}m</td>
                          <td className="py-3 px-4 text-text-secondary">{attackStats[i].bandwidth} Gbps</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Insights Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card variant="bordered" className="border-accent-primary/30">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-accent-primary/20 rounded-lg">
                      <svg className="w-6 h-6 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm text-text-secondary mb-1">Top Performer</div>
                      <div className="text-lg font-semibold text-text-primary">UDP Flood</div>
                      <div className="text-sm text-accent-primary">45% of total attacks</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card variant="bordered" className="border-accent-secondary/30">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-accent-secondary/20 rounded-lg">
                      <svg className="w-6 h-6 text-accent-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm text-text-secondary mb-1">Most Active Region</div>
                      <div className="text-lg font-semibold text-text-primary">China</div>
                      <div className="text-sm text-accent-secondary">200 active bots</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card variant="bordered" className="border-accent-warning/30">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-accent-warning/20 rounded-lg">
                      <svg className="w-6 h-6 text-accent-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm text-text-secondary mb-1">Peak Hours</div>
                      <div className="text-lg font-semibold text-text-primary">8PM - 12AM</div>
                      <div className="text-sm text-accent-warning">Highest traffic period</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ── TAB: Charts ───────────────────────────────────────────────────── */}
        {activeTab === 'Charts' && (
          <div className="space-y-8">
            {/* Heatmap */}
            <HeatmapChart
              data={heatmapData}
              title="Activity Heatmap"
              description="Bot activity intensity by day and hour"
            />

            {/* 4 Gauges */}
            <div>
              <h2 className="text-lg font-semibold text-text-primary mb-4">System Health Gauges</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <GaugeChart value={94} max={100} label="Success Rate" unit="%" color="primary" />
                <GaugeChart value={99} max={100} label="Uptime" unit="%" color="secondary" />
                <GaugeChart value={87} max={100} label="Efficiency" unit="%" color="warning" />
                <GaugeChart value={85} max={100} label="Bandwidth Util" unit="%" color="danger" />
              </div>
            </div>

            {/* Timeline */}
            <TimelineChart
              events={timelineEvents}
              title="Operational Timeline"
              description="Key events over the last 24 hours"
            />
          </div>
        )}

        {/* ── TAB: Network ──────────────────────────────────────────────────── */}
        {activeTab === 'Network' && (
          <div className="space-y-8">
            <NetworkTopology
              nodes={networkNodes}
              links={networkLinks}
            />
            <SankeyDiagram
              title="Traffic Flow"
              description="Data flow from bots through proxy to targets"
              nodes={sankeyNodes}
              links={sankeyLinks}
            />
          </div>
        )}

        {/* ── TAB: AI & Predictions ─────────────────────────────────────────── */}
        {activeTab === 'AI & Predictions' && (
          <PredictiveAnalytics />
        )}

        {/* ── TAB: Reports ──────────────────────────────────────────────────── */}
        {activeTab === 'Reports' && (
          <ReportBuilder />
        )}

        {/* ── TAB: Integrations ─────────────────────────────────────────────── */}
        {activeTab === 'Integrations' && (
          <WebhookManager />
        )}

        {/* ── TAB: Notifications ────────────────────────────────────────────── */}
        {activeTab === 'Notifications' && (
          <NotificationCenter />
        )}

        {/* Footer */}
        <div className="text-center py-8 text-text-muted text-sm">
          <p>Analytics — Mirai 2026</p>
        </div>
      </main>
    </div>
  );
}
