'use client';

import { useState } from 'react';
import { Navbar } from '@/components/shared';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, useToast } from '@/components/ui';
import { AttackScheduler } from '@/components/attacks/AttackScheduler';
import { AttackHistory } from '@/components/attacks/AttackHistory';
import { DEFAULT_TEMPLATES } from '@/lib/attackScheduling';
import type { AttackHistoryItem } from '@/lib/attackScheduling';

// ─── Types ────────────────────────────────────────────────────────────────────

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

type Tab = 'active' | 'schedule' | 'history' | 'templates';

// ─── Mock Data ─────────────────────────────────────────────────────────────────

const MOCK_ATTACKS: Attack[] = [
  { id: 'atk-001', type: 'UDP Flood',        target: '203.0.113.0',  status: 'active',    duration: '15m 30s', bandwidth: '2.5 Gbps', packets: '2.1M', started: '2m ago'  },
  { id: 'atk-002', type: 'TCP SYN',          target: '198.51.100.0', status: 'active',    duration: '8m 15s',  bandwidth: '1.8 Gbps', packets: '1.5M', started: '8m ago'  },
  { id: 'atk-003', type: 'HTTP Flood',       target: 'example.com',  status: 'active',    duration: '22m 45s', bandwidth: '850 Mbps', packets: '500K', started: '22m ago' },
  { id: 'atk-004', type: 'UDP Flood',        target: '192.0.2.0',    status: 'completed', duration: '60m 00s', bandwidth: '3.2 Gbps', packets: '5.8M', started: '1h ago'  },
  { id: 'atk-005', type: 'DNS Amplification',target: '198.18.0.0',   status: 'failed',    duration: '5m 20s',  bandwidth: '120 Mbps', packets: '80K',  started: '3h ago'  },
];

const MOCK_HISTORY: AttackHistoryItem[] = [
  {
    id: 'hist-001', type: 'udp', target: '203.0.113.0', port: 80,
    duration: 900, bandwidth: '2.5 Gbps', botsUsed: 120,
    status: 'completed', successRate: 92,
    timestamp: new Date(Date.now() - 3600000),
    metrics: { packetsSent: 2100000, dataSent: '4.2 GB', avgResponseTime: 12, targetDowntime: 840 },
  },
  {
    id: 'hist-002', type: 'tcp', target: '198.51.100.0', port: 443,
    duration: 600, bandwidth: '1.8 Gbps', botsUsed: 95,
    status: 'completed', successRate: 78,
    timestamp: new Date(Date.now() - 7200000),
    metrics: { packetsSent: 1500000, dataSent: '2.8 GB', avgResponseTime: 18, targetDowntime: 510 },
  },
  {
    id: 'hist-003', type: 'http', target: 'example.com', port: 80,
    duration: 300, bandwidth: '850 Mbps', botsUsed: 60,
    status: 'failed', successRate: 34,
    timestamp: new Date(Date.now() - 10800000),
    method: 'GET',
    metrics: { packetsSent: 500000, dataSent: '1.1 GB', avgResponseTime: 45, targetDowntime: 0 },
  },
  {
    id: 'hist-004', type: 'dns', target: '198.18.0.0', port: 53,
    duration: 450, bandwidth: '3.2 Gbps', botsUsed: 150,
    status: 'completed', successRate: 88,
    timestamp: new Date(Date.now() - 86400000),
    metrics: { packetsSent: 5800000, dataSent: '9.1 GB', avgResponseTime: 8, targetDowntime: 390 },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStatusColor(status: Attack['status']): string {
  switch (status) {
    case 'active':    return 'bg-accent-primary';
    case 'completed': return 'bg-accent-secondary';
    case 'failed':    return 'bg-accent-danger';
    case 'scheduled': return 'bg-accent-warning';
  }
}

function getStatusBadge(status: Attack['status']): string {
  switch (status) {
    case 'active':    return 'bg-accent-primary/20 text-accent-primary';
    case 'completed': return 'bg-accent-secondary/20 text-accent-secondary';
    case 'failed':    return 'bg-accent-danger/20 text-accent-danger';
    case 'scheduled': return 'bg-accent-warning/20 text-accent-warning';
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AttackListPanel({
  attacks,
  selectedAttack,
  onSelect,
}: {
  attacks: Attack[];
  selectedAttack: Attack | null;
  onSelect: (a: Attack) => void;
}) {
  return (
    <Card variant="elevated" className="lg:col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Active &amp; Recent Attacks</CardTitle>
            <CardDescription>Monitor attack status</CardDescription>
          </div>
          <Button variant="ghost" size="sm">Refresh</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {attacks.map((attack) => (
            <button
              key={attack.id}
              onClick={() => onSelect(attack)}
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
                <div className={`text-xs px-2 py-1 rounded ${getStatusBadge(attack.status)}`}>
                  {attack.status}
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
  );
}

function AttackDetailsPanel({ attack }: { attack: Attack | null }) {
  if (!attack) {
    return (
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
    );
  }

  return (
    <div className="space-y-6">
      <Card variant="bordered" glow>
        <CardHeader>
          <CardTitle>Attack Details</CardTitle>
          <CardDescription>{attack.id}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-text-secondary">Type</div>
              <div className="text-lg font-semibold text-text-primary">{attack.type}</div>
            </div>
            <div>
              <div className="text-sm text-text-secondary">Target</div>
              <div className="font-mono text-text-primary">{attack.target}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-text-secondary">Status</div>
                <div className="flex items-center space-x-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(attack.status)}`} />
                  <span className="text-text-primary capitalize">{attack.status}</span>
                </div>
              </div>
              <div>
                <div className="text-sm text-text-secondary">Duration</div>
                <div className="text-text-primary">{attack.duration}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-text-secondary">Bandwidth</div>
                <div className="text-accent-primary font-semibold">{attack.bandwidth}</div>
              </div>
              <div>
                <div className="text-sm text-text-secondary">Packets Sent</div>
                <div className="text-text-primary">{attack.packets}</div>
              </div>
            </div>
            <div>
              <div className="text-sm text-text-secondary">Started</div>
              <div className="text-text-muted text-sm">{attack.started}</div>
            </div>
          </div>
          <div className="mt-6 space-y-2">
            {attack.status === 'active' && (
              <>
                <Button variant="danger" size="sm" className="w-full">Stop Attack</Button>
                <Button variant="secondary" size="sm" className="w-full">Modify Parameters</Button>
              </>
            )}
            {attack.status === 'completed' && (
              <Button variant="primary" size="sm" className="w-full">Repeat Attack</Button>
            )}
            <Button variant="ghost" size="sm" className="w-full">View Logs</Button>
          </div>
        </CardContent>
      </Card>

      {attack.status === 'active' && (
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Real-time Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: 'Bandwidth Usage', value: '85%', pct: 85 },
                { label: 'Bots Active',     value: '92/100', pct: 92 },
                { label: 'Success Rate',    value: '94%',  pct: 94 },
              ].map(({ label, value, pct }) => (
                <div key={label}>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-text-secondary">{label}</span>
                    <span className="text-accent-primary font-mono">{value}</span>
                  </div>
                  <div className="h-2 bg-primary-bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-primary rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function NewAttackForm({ onClose }: { onClose: () => void }) {
  const { showToast } = useToast();

  const handleLaunch = () => {
    showToast('Attack launched successfully!', 'success');
    onClose();
  };

  return (
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
          <Button variant="primary" onClick={handleLaunch}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Launch Attack
          </Button>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TemplatesTab() {
  const typeColors: Record<string, string> = {
    'UDP Flood':        'text-accent-primary',
    'TCP SYN':          'text-accent-warning',
    'HTTP Flood':       'text-accent-secondary',
    'DNS Amplification':'text-accent-danger',
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {DEFAULT_TEMPLATES.map((tpl) => (
        <Card key={tpl.id} variant="bordered" className="flex flex-col">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">{tpl.name}</CardTitle>
                <CardDescription className={`font-semibold mt-1 ${typeColors[tpl.type] ?? 'text-text-secondary'}`}>
                  {tpl.type}
                </CardDescription>
              </div>
              <span className="text-xs px-2 py-1 rounded bg-white/5 text-text-muted font-mono">
                {tpl.id}
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between gap-4">
            <p className="text-sm text-text-secondary">{tpl.description}</p>

            {/* Details grid */}
            <div className="glass-card rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Default Duration</span>
                <span className="text-text-primary font-mono">{tpl.defaultDuration}s</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Default Bandwidth</span>
                <span className="text-accent-primary font-mono">{tpl.defaultBandwidth} Mbps</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Default Port</span>
                <span className="text-text-primary font-mono">{tpl.defaultPort}</span>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {tpl.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-accent-primary/10 border border-accent-primary/20 rounded text-xs text-accent-primary"
                >
                  {tag}
                </span>
              ))}
            </div>

            <Button variant="secondary" size="sm" className="w-full">
              Use Template
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
  { id: 'active',    label: 'Active Attacks' },
  { id: 'schedule',  label: 'Schedule'       },
  { id: 'history',   label: 'History'        },
  { id: 'templates', label: 'Templates'      },
];

export default function AttacksPage() {
  const [selectedAttack, setSelectedAttack] = useState<Attack | null>(null);
  const [showNewAttack, setShowNewAttack]   = useState(false);
  const [activeTab, setActiveTab]           = useState<Tab>('active');

  const attacks       = MOCK_ATTACKS;
  const activeAttacks = attacks.filter((a) => a.status === 'active');

  // Computed stats
  const completedCount = attacks.filter((a) => a.status === 'completed').length;
  const failedCount    = attacks.filter((a) => a.status === 'failed').length;
  const totalBandwidth = activeAttacks
    .reduce((sum, a) => sum + parseFloat(a.bandwidth), 0)
    .toFixed(1);

  const handleNewAttack = () => {
    setActiveTab('active');
    setShowNewAttack(true);
  };

  const handleReplay = (attackId: string) => {
    console.log('Replaying attack', attackId);
  };

  return (
    <div className="min-h-screen bg-primary-bg">
      <Navbar />

      <main className="pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-display font-bold neon-text mb-2">
              Attack Management
            </h1>
            <p className="text-text-secondary">
              Configure, schedule, and monitor DDoS attacks
            </p>
          </div>
          <Button variant="primary" size="lg" onClick={handleNewAttack}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Attack
          </Button>
        </div>

        {/* ── Stats Row ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-accent-primary">{activeAttacks.length}</div>
              <div className="text-sm text-text-secondary">Active</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-text-primary">{completedCount}</div>
              <div className="text-sm text-text-secondary">Completed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-accent-danger">{failedCount}</div>
              <div className="text-sm text-text-secondary">Failed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-accent-secondary">{totalBandwidth} Gbps</div>
              <div className="text-sm text-text-secondary">Total Bandwidth</div>
            </CardContent>
          </Card>
        </div>

        {/* ── Tab Bar ──────────────────────────────────────────────────────── */}
        <div className="flex space-x-1 mb-8 border-b border-white/10">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-5 py-3 text-sm font-medium transition-colors ${
                activeTab === id
                  ? 'bg-accent-primary/20 text-accent-primary border-b-2 border-accent-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {label}
              {id === 'active' && activeAttacks.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-accent-primary/30 text-accent-primary">
                  {activeAttacks.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Active Attacks Tab ───────────────────────────────────────────── */}
        {activeTab === 'active' && (
          <div className="mb-8">
            {showNewAttack && (
              <NewAttackForm onClose={() => setShowNewAttack(false)} />
            )}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <AttackListPanel
                attacks={attacks}
                selectedAttack={selectedAttack}
                onSelect={setSelectedAttack}
              />
              <AttackDetailsPanel attack={selectedAttack} />
            </div>
          </div>
        )}

        {/* ── Schedule Tab ─────────────────────────────────────────────────── */}
        {activeTab === 'schedule' && (
          <div className="mb-8">
            <AttackScheduler />
          </div>
        )}

        {/* ── History Tab ──────────────────────────────────────────────────── */}
        {activeTab === 'history' && (
          <div className="mb-8">
            <AttackHistory history={MOCK_HISTORY} onReplay={handleReplay} />
          </div>
        )}

        {/* ── Templates Tab ────────────────────────────────────────────────── */}
        {activeTab === 'templates' && (
          <div className="mb-8">
            <TemplatesTab />
          </div>
        )}

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div className="text-center py-8 text-text-muted text-sm">
          <p>Attack Management — Mirai 2026</p>
        </div>
      </main>
    </div>
  );
}
