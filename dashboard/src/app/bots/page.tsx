'use client';

import { useState } from 'react';
import { Navbar } from '@/components/shared';
import { Terminal } from '@/components/terminal';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, useToast } from '@/components/ui';
import { exportToCSV, exportToJSON, copyToClipboard } from '@/lib/export';

interface Bot {
  id: string;
  ip: string;
  type: string;
  location: string;
  status: 'online' | 'offline' | 'idle';
  uptime: string;
  bandwidth: string;
}

export default function BotsPage() {
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const { showToast } = useToast();

  const bots: Bot[] = [
    { id: 'bot-001', ip: '192.168.1.100', type: 'Router', location: 'USA', status: 'online', uptime: '2h 15m', bandwidth: '1.2 Mbps' },
    { id: 'bot-002', ip: '10.0.0.50', type: 'Camera', location: 'UK', status: 'online', uptime: '5h 42m', bandwidth: '800 Kbps' },
    { id: 'bot-003', ip: '172.16.0.20', type: 'DVR', location: 'Japan', status: 'idle', uptime: '1h 08m', bandwidth: '500 Kbps' },
    { id: 'bot-004', ip: '192.168.0.45', type: 'IoT Device', location: 'Germany', status: 'online', uptime: '12h 30m', bandwidth: '2.1 Mbps' },
    { id: 'bot-005', ip: '10.10.10.10', type: 'Router', location: 'Brazil', status: 'offline', uptime: '0m', bandwidth: '0 Kbps' },
    { id: 'bot-006', ip: '203.0.113.45', type: 'Camera', location: 'Australia', status: 'online', uptime: '8h 22m', bandwidth: '1.5 Mbps' },
    { id: 'bot-007', ip: '198.51.100.20', type: 'Router', location: 'India', status: 'online', uptime: '4h 55m', bandwidth: '3.2 Mbps' },
    { id: 'bot-008', ip: '192.0.2.100', type: 'DVR', location: 'Singapore', status: 'idle', uptime: '15m', bandwidth: '600 Kbps' },
  ];

  const getStatusColor = (status: Bot['status']) => {
    switch (status) {
      case 'online': return 'bg-accent-primary';
      case 'idle': return 'bg-accent-warning';
      case 'offline': return 'bg-accent-danger';
    }
  };

  return (
    <div className="min-h-screen bg-primary-bg">
      <Navbar />
      
      <main className="pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-display font-bold neon-text mb-2">
            Bot Management
          </h1>
          <p className="text-text-secondary">
            Monitor and control active bots in the network
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-accent-primary">
                {bots.filter(b => b.status === 'online').length}
              </div>
              <div className="text-sm text-text-secondary">Online</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-accent-warning">
                {bots.filter(b => b.status === 'idle').length}
              </div>
              <div className="text-sm text-text-secondary">Idle</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-accent-danger">
                {bots.filter(b => b.status === 'offline').length}
              </div>
              <div className="text-sm text-text-secondary">Offline</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-text-primary">
                {bots.length}
              </div>
              <div className="text-sm text-text-secondary">Total</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Bots Table */}
          <Card variant="elevated">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Active Bots</CardTitle>
                  <CardDescription>Click a bot to view details</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      exportToCSV(bots, 'bots-export');
                      showToast('Exported bots to CSV', 'success');
                    }}
                    title="Export to CSV"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </Button>
                  <Button variant="primary" size="sm">
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {bots.map((bot) => (
                  <button
                    key={bot.id}
                    onClick={() => setSelectedBot(bot)}
                    className={`w-full text-left glass-card p-4 rounded-lg transition-all hover:bg-white/10 ${
                      selectedBot?.id === bot.id ? 'border-2 border-accent-primary' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(bot.status)} animate-pulse`} />
                        <div>
                          <div className="font-mono text-sm text-text-primary">{bot.ip}</div>
                          <div className="text-xs text-text-muted">{bot.id}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-accent-secondary">{bot.location}</div>
                        <div className="text-xs text-text-muted">{bot.type}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-text-secondary">
                      <span>Uptime: {bot.uptime}</span>
                      <span>{bot.bandwidth}</span>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Terminal / Bot Details */}
          <div className="space-y-6">
            {selectedBot && (
              <Card variant="bordered" glow>
                <CardHeader>
                  <CardTitle>Bot Details</CardTitle>
                  <CardDescription>{selectedBot.id}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-text-secondary">IP Address</div>
                      <div className="font-mono text-text-primary">{selectedBot.ip}</div>
                    </div>
                    <div>
                      <div className="text-sm text-text-secondary">Type</div>
                      <div className="text-text-primary">{selectedBot.type}</div>
                    </div>
                    <div>
                      <div className="text-sm text-text-secondary">Location</div>
                      <div className="text-text-primary">{selectedBot.location}</div>
                    </div>
                    <div>
                      <div className="text-sm text-text-secondary">Status</div>
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(selectedBot.status)}`} />
                        <span className="text-text-primary capitalize">{selectedBot.status}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-text-secondary">Uptime</div>
                      <div className="text-text-primary">{selectedBot.uptime}</div>
                    </div>
                    <div>
                      <div className="text-sm text-text-secondary">Bandwidth</div>
                      <div className="text-text-primary">{selectedBot.bandwidth}</div>
                    </div>
                  </div>
                  <div className="mt-4 flex space-x-2">
                    <Button variant="primary" size="sm">Execute Command</Button>
                    <Button variant="secondary" size="sm">Disconnect</Button>
                    <Button variant="danger" size="sm">Remove</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Terminal */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Bot Control Terminal</CardTitle>
                <CardDescription>
                  {selectedBot 
                    ? `Connected to ${selectedBot.ip}` 
                    : 'Select a bot to control'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[400px]">
                  <Terminal
                    prompt={selectedBot ? `${selectedBot.ip}:~$` : 'mirai@c2:~$'}
                    initialLines={
                      selectedBot 
                        ? [{ type: 'success', content: `Connected to bot ${selectedBot.id} (${selectedBot.ip})` }]
                        : []
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-8 text-text-muted text-sm">
          <p>Bot Management - Mirai 2026</p>
        </div>
      </main>
    </div>
  );
}
