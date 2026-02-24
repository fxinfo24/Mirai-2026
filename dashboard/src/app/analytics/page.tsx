'use client';

import { Navbar } from '@/components/shared';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AnalyticsPage() {
  // Sample data for charts
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

  return (
    <div className="min-h-screen bg-primary-bg">
      <Navbar />
      
      <main className="pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-display font-bold neon-text mb-2">
            Analytics & Insights
          </h1>
          <p className="text-text-secondary">
            Performance metrics and traffic analysis
          </p>
        </div>

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
                      <stop offset="5%" stopColor="#00ff9f" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00ff9f" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="time" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0a0e27', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#e5e7eb'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="bandwidth" 
                    stroke="#00ff9f" 
                    fillOpacity={1} 
                    fill="url(#colorBandwidth)"
                    strokeWidth={2}
                  />
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
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {attackTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0a0e27', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#e5e7eb'
                    }}
                  />
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
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0a0e27', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#e5e7eb'
                    }}
                  />
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
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0a0e27', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#e5e7eb'
                    }}
                  />
                  <Bar dataKey="value" fill="#00d4ff" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Stats Table */}
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
                          <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: COLORS[i] }} />
                          <span className="text-text-primary">{type.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-text-primary font-mono">{type.count}</td>
                      <td className="py-3 px-4">
                        <span className="text-accent-primary">{90 + Math.floor(Math.random() * 10)}%</span>
                      </td>
                      <td className="py-3 px-4 text-text-secondary">{15 + Math.floor(Math.random() * 30)}m</td>
                      <td className="py-3 px-4 text-text-secondary">{(Math.random() * 3 + 1).toFixed(1)} Gbps</td>
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

        {/* Footer */}
        <div className="text-center py-8 text-text-muted text-sm">
          <p>Analytics - Mirai 2026</p>
        </div>
      </main>
    </div>
  );
}
