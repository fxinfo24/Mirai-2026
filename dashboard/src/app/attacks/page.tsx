'use client';

import { useState } from 'react';
import { Navbar } from '@/components/shared';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input } from '@/components/ui';

interface Attack {
  id: string;
  type: 'UDP Flood' | 'TCP SYN' | 'HTTP Flood' | 'DNS Amplification';
  target: string;
  status: 'active' | 'completed' | 'failed' | 'scheduled';
  duration: string;
  bandwidth: string;
  packets: string;
  started: string;
}

export default function AttacksPage() {
  const [selectedAttack, setSelectedAttack] = useState<Attack | null>(null);
  const [showNewAttack, setShowNewAttack] = useState(false);

  const attacks: Attack[] = [
    { id: 'atk-001', type: 'UDP Flood', target: '203.0.113.0', status: 'active', duration: '15m 30s', bandwidth: '2.5 Gbps', packets: '2.1M', started: '2m ago' },
    { id: 'atk-002', type: 'TCP SYN', target: '198.51.100.0', status: 'active', duration: '8m 15s', bandwidth: '1.8 Gbps', packets: '1.5M', started: '8m ago' },
    { id: 'atk-003', type: 'HTTP Flood', target: 'example.com', status: 'active', duration: '22m 45s', bandwidth: '850 Mbps', packets: '500K', started: '22m ago' },
    { id: 'atk-004', type: 'UDP Flood', target: '192.0.2.0', status: 'completed', duration: '60m 00s', bandwidth: '3.2 Gbps', packets: '5.8M', started: '1h ago' },
    { id: 'atk-005', type: 'DNS Amplification', target: '198.18.0.0', status: 'failed', duration: '5m 20s', bandwidth: '120 Mbps', packets: '80K', started: '3h ago' },
  ];

  const getStatusColor = (status: Attack['status']) => {
    switch (status) {
      case 'active': return 'bg-accent-primary';
      case 'completed': return 'bg-accent-secondary';
      case 'failed': return 'bg-accent-danger';
      case 'scheduled': return 'bg-accent-warning';
    }
  };

  const activeAttacks = attacks.filter(a => a.status === 'active');

  return (
    <div className="min-h-screen bg-primary-bg">
      <Navbar />
      
      <main className="pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-display font-bold neon-text mb-2">
              Attack Management
            </h1>
            <p className="text-text-secondary">
              Configure and monitor DDoS attacks
            </p>
          </div>
          <Button 
            variant="primary" 
            size="lg"
            onClick={() => setShowNewAttack(!showNewAttack)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Attack
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-accent-primary">
                {activeAttacks.length}
              </div>
              <div className="text-sm text-text-secondary">Active</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-text-primary">
                {attacks.filter(a => a.status === 'completed').length}
              </div>
              <div className="text-sm text-text-secondary">Completed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-accent-danger">
                {attacks.filter(a => a.status === 'failed').length}
              </div>
              <div className="text-sm text-text-secondary">Failed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-accent-secondary">
                {activeAttacks.reduce((sum, a) => sum + parseFloat(a.bandwidth), 0).toFixed(1)} Gbps
              </div>
              <div className="text-sm text-text-secondary">Total Bandwidth</div>
            </CardContent>
          </Card>
        </div>

        {/* New Attack Form */}
        {showNewAttack && (
          <Card variant="bordered" glow className="mb-8">
            <CardHeader>
              <CardTitle>Launch New Attack</CardTitle>
              <CardDescription>Configure attack parameters</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Attack Type
                  </label>
                  <select className="w-full px-4 py-2 bg-primary-bg-secondary border border-white/10 rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary">
                    <option>UDP Flood</option>
                    <option>TCP SYN Flood</option>
                    <option>HTTP Flood</option>
                    <option>DNS Amplification</option>
                  </select>
                </div>
                <Input label="Target IP/Domain" placeholder="203.0.113.0" />
                <Input label="Duration (seconds)" placeholder="60" type="number" />
                <Input label="Bandwidth (Mbps)" placeholder="1000" type="number" />
                <Input label="Bots to Use" placeholder="100" type="number" />
                <Input label="Port" placeholder="80" type="number" />
              </div>
              <div className="mt-6 flex space-x-4">
                <Button variant="primary">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Launch Attack
                </Button>
                <Button variant="secondary" onClick={() => setShowNewAttack(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Attacks List */}
          <Card variant="elevated" className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Active & Recent Attacks</CardTitle>
                  <CardDescription>Monitor attack status</CardDescription>
                </div>
                <Button variant="ghost" size="sm">
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {attacks.map((attack) => (
                  <button
                    key={attack.id}
                    onClick={() => setSelectedAttack(attack)}
                    className={`w-full text-left glass-card p-4 rounded-lg transition-all hover:bg-white/10 ${
                      selectedAttack?.id === attack.id ? 'border-2 border-accent-primary' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(attack.status)} ${attack.status === 'active' ? 'animate-pulse' : ''}`} />
                        <div>
                          <div className="font-semibold text-text-primary">{attack.type}</div>
                          <div className="text-xs text-text-muted font-mono">{attack.id}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs px-2 py-1 rounded ${
                          attack.status === 'active' 
                            ? 'bg-accent-primary/20 text-accent-primary'
                            : attack.status === 'completed'
                            ? 'bg-accent-secondary/20 text-accent-secondary'
                            : attack.status === 'failed'
                            ? 'bg-accent-danger/20 text-accent-danger'
                            : 'bg-accent-warning/20 text-accent-warning'
                        }`}>
                          {attack.status}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-text-secondary mb-2">
                      <div>Target: <span className="font-mono text-text-primary">{attack.target}</span></div>
                      <div>Duration: <span className="text-text-primary">{attack.duration}</span></div>
                      <div>Bandwidth: <span className="text-accent-primary">{attack.bandwidth}</span></div>
                      <div>Packets: <span className="text-text-primary">{attack.packets}</span></div>
                    </div>
                    <div className="text-xs text-text-muted">Started {attack.started}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Attack Details / Control */}
          <div className="space-y-6">
            {selectedAttack ? (
              <>
                <Card variant="bordered" glow>
                  <CardHeader>
                    <CardTitle>Attack Details</CardTitle>
                    <CardDescription>{selectedAttack.id}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm text-text-secondary">Type</div>
                        <div className="text-lg font-semibold text-text-primary">{selectedAttack.type}</div>
                      </div>
                      <div>
                        <div className="text-sm text-text-secondary">Target</div>
                        <div className="font-mono text-text-primary">{selectedAttack.target}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-text-secondary">Status</div>
                          <div className="flex items-center space-x-2 mt-1">
                            <div className={`w-2 h-2 rounded-full ${getStatusColor(selectedAttack.status)}`} />
                            <span className="text-text-primary capitalize">{selectedAttack.status}</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-text-secondary">Duration</div>
                          <div className="text-text-primary">{selectedAttack.duration}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-text-secondary">Bandwidth</div>
                          <div className="text-accent-primary font-semibold">{selectedAttack.bandwidth}</div>
                        </div>
                        <div>
                          <div className="text-sm text-text-secondary">Packets Sent</div>
                          <div className="text-text-primary">{selectedAttack.packets}</div>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-text-secondary">Started</div>
                        <div className="text-text-muted text-sm">{selectedAttack.started}</div>
                      </div>
                    </div>
                    <div className="mt-6 space-y-2">
                      {selectedAttack.status === 'active' && (
                        <>
                          <Button variant="danger" size="sm" className="w-full">
                            Stop Attack
                          </Button>
                          <Button variant="secondary" size="sm" className="w-full">
                            Modify Parameters
                          </Button>
                        </>
                      )}
                      {selectedAttack.status === 'completed' && (
                        <Button variant="primary" size="sm" className="w-full">
                          Repeat Attack
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="w-full">
                        View Logs
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Real-time Stats */}
                {selectedAttack.status === 'active' && (
                  <Card variant="elevated">
                    <CardHeader>
                      <CardTitle>Real-time Metrics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-text-secondary">Bandwidth Usage</span>
                            <span className="text-accent-primary font-mono">85%</span>
                          </div>
                          <div className="h-2 bg-primary-bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-primary w-[85%] rounded-full" />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-text-secondary">Bots Active</span>
                            <span className="text-accent-primary font-mono">92/100</span>
                          </div>
                          <div className="h-2 bg-primary-bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-primary w-[92%] rounded-full" />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-text-secondary">Success Rate</span>
                            <span className="text-accent-primary font-mono">94%</span>
                          </div>
                          <div className="h-2 bg-primary-bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-primary w-[94%] rounded-full" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="h-full flex items-center justify-center min-h-[400px]">
                <CardContent>
                  <div className="text-center text-text-muted">
                    <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <p>Select an attack to view details</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-8 text-text-muted text-sm">
          <p>Attack Management - Mirai 2026</p>
        </div>
      </main>
    </div>
  );
}
