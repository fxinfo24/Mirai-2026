'use client';

import { useState } from 'react';
import { Navbar } from '@/components/shared';
import { Terminal } from '@/components/terminal';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  useToast,
} from '@/components/ui';
import { BotBulkActions } from '@/components/bots/BotBulkActions';
import { BotGrouping } from '@/components/bots/BotGrouping';
import { BotCustomCommands } from '@/components/bots/BotCustomCommands';
import { BotHealthMonitor } from '@/components/bots/BotHealthMonitor';
import { BotRecovery } from '@/components/bots/BotRecovery';
import { exportToCSV } from '@/lib/export';
import type { BotWithHealth, BotHealth } from '@/lib/botManagement';
import type { BotGroup } from '@/lib/botManagement.extended';

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_BOTS: BotWithHealth[] = [
  {
    id: 'bot-001',
    ip: '192.168.1.100',
    type: 'Router',
    location: 'USA',
    status: 'online',
    uptime: '2h 15m',
    bandwidth: '1.2 Mbps',
    tags: [{ id: 'router', name: 'Router', color: '#00d4ff' }],
    health: { cpu: 42, memory: 55, network: 38, uptime: 8100, lastSeen: new Date(), status: 'healthy' },
    commandHistory: [],
  },
  {
    id: 'bot-002',
    ip: '10.0.0.50',
    type: 'Camera',
    location: 'UK',
    status: 'online',
    uptime: '5h 42m',
    bandwidth: '800 Kbps',
    tags: [{ id: 'camera', name: 'Camera', color: '#ff006e' }],
    health: { cpu: 28, memory: 41, network: 62, uptime: 20520, lastSeen: new Date(), status: 'healthy' },
    commandHistory: [],
  },
  {
    id: 'bot-003',
    ip: '172.16.0.20',
    type: 'DVR',
    location: 'Japan',
    status: 'idle',
    uptime: '1h 08m',
    bandwidth: '500 Kbps',
    tags: [],
    health: { cpu: 75, memory: 72, network: 30, uptime: 4080, lastSeen: new Date(), status: 'warning' },
    commandHistory: [],
  },
  {
    id: 'bot-004',
    ip: '192.168.0.45',
    type: 'IoT Device',
    location: 'Germany',
    status: 'online',
    uptime: '12h 30m',
    bandwidth: '2.1 Mbps',
    tags: [{ id: 'high-performance', name: 'High Performance', color: '#00ff9f' }],
    health: { cpu: 60, memory: 68, network: 80, uptime: 45000, lastSeen: new Date(), status: 'healthy' },
    commandHistory: [],
  },
  {
    id: 'bot-005',
    ip: '10.10.10.10',
    type: 'Router',
    location: 'Brazil',
    status: 'offline',
    uptime: '0m',
    bandwidth: '0 Kbps',
    tags: [{ id: 'router', name: 'Router', color: '#00d4ff' }],
    health: { cpu: 0, memory: 0, network: 0, uptime: 0, lastSeen: new Date(Date.now() - 600000), status: 'offline' },
    commandHistory: [],
  },
  {
    id: 'bot-006',
    ip: '203.0.113.45',
    type: 'Camera',
    location: 'Australia',
    status: 'online',
    uptime: '8h 22m',
    bandwidth: '1.5 Mbps',
    tags: [{ id: 'camera', name: 'Camera', color: '#ff006e' }],
    health: { cpu: 33, memory: 47, network: 55, uptime: 30120, lastSeen: new Date(), status: 'healthy' },
    commandHistory: [],
  },
  {
    id: 'bot-007',
    ip: '198.51.100.20',
    type: 'Router',
    location: 'India',
    status: 'online',
    uptime: '4h 55m',
    bandwidth: '3.2 Mbps',
    tags: [
      { id: 'router', name: 'Router', color: '#00d4ff' },
      { id: 'high-performance', name: 'High Performance', color: '#00ff9f' },
    ],
    health: { cpu: 92, memory: 85, network: 91, uptime: 17700, lastSeen: new Date(), status: 'critical' },
    commandHistory: [],
  },
  {
    id: 'bot-008',
    ip: '192.0.2.100',
    type: 'DVR',
    location: 'Singapore',
    status: 'idle',
    uptime: '15m',
    bandwidth: '600 Kbps',
    tags: [],
    health: { cpu: 18, memory: 29, network: 22, uptime: 900, lastSeen: new Date(), status: 'healthy' },
    commandHistory: [],
  },
];

const MOCK_GROUPS: BotGroup[] = [
  {
    id: 'group-routers',
    name: 'Routers',
    botIds: ['bot-001', 'bot-005', 'bot-007'],
    tags: ['router'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'group-cameras',
    name: 'Cameras',
    botIds: ['bot-002', 'bot-006'],
    tags: ['camera'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

type TabId = 'bots' | 'groups' | 'health' | 'recovery';

const TABS: { id: TabId; label: string }[] = [
  { id: 'bots', label: 'Bots List' },
  { id: 'groups', label: 'Groups' },
  { id: 'health', label: 'Health' },
  { id: 'recovery', label: 'Recovery' },
];

function statusDotClass(status: BotWithHealth['status']): string {
  switch (status) {
    case 'online': return 'bg-accent-primary';
    case 'idle':   return 'bg-accent-warning';
    case 'offline': return 'bg-accent-danger';
  }
}

function statusTextClass(status: BotWithHealth['status']): string {
  switch (status) {
    case 'online': return 'text-accent-primary';
    case 'idle':   return 'text-accent-warning';
    case 'offline': return 'text-accent-danger';
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BotsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('bots');
  const [selectedBots, setSelectedBots] = useState<string[]>([]);
  const [selectedBot, setSelectedBot] = useState<BotWithHealth | null>(null);
  const [groups, setGroups] = useState<BotGroup[]>(MOCK_GROUPS);
  const { showToast } = useToast();

  // ── Selection helpers ──────────────────────────────────────────────────────

  const toggleBotSelection = (botId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedBots(prev =>
      prev.includes(botId) ? prev.filter(id => id !== botId) : [...prev, botId]
    );
  };

  const toggleSelectAll = () => {
    setSelectedBots(prev =>
      prev.length === MOCK_BOTS.length ? [] : MOCK_BOTS.map(b => b.id)
    );
  };

  const handleRowClick = (bot: BotWithHealth) => {
    setSelectedBot(prev => (prev?.id === bot.id ? null : bot));
  };

  const handleBulkComplete = () => {
    setSelectedBots([]);
  };

  const handleExport = () => {
    exportToCSV(
      MOCK_BOTS.map(b => ({
        id: b.id,
        ip: b.ip,
        type: b.type,
        location: b.location,
        status: b.status,
        uptime: b.uptime,
        bandwidth: b.bandwidth,
        cpu: b.health.cpu,
        memory: b.health.memory,
        network: b.health.network,
      })),
      'bots-export'
    );
    showToast('Exported bots to CSV', 'success');
  };

  // ── Derived stats ──────────────────────────────────────────────────────────

  const onlineCount  = MOCK_BOTS.filter(b => b.status === 'online').length;
  const idleCount    = MOCK_BOTS.filter(b => b.status === 'idle').length;
  const offlineCount = MOCK_BOTS.filter(b => b.status === 'offline').length;
  const totalCount   = MOCK_BOTS.length;

  // ── Health data keyed by botId ─────────────────────────────────────────────
  const healthByBotId: Record<string, BotHealth & { botId: string }> = {};
  MOCK_BOTS.forEach(b => {
    healthByBotId[b.id] = { ...b.health, botId: b.id };
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-primary-bg">
      <Navbar />

      <main className="pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-12">

        {/* ── Header ── */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-display font-bold neon-text mb-1">
              Bot Management
            </h1>
            <p className="text-text-secondary">
              Monitor and control active bots in the network
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExport}
            className="flex items-center gap-2 self-start sm:self-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </Button>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-accent-primary">{onlineCount}</div>
              <div className="text-sm text-text-secondary">Online</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-accent-warning">{idleCount}</div>
              <div className="text-sm text-text-secondary">Idle</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-accent-danger">{offlineCount}</div>
              <div className="text-sm text-text-secondary">Offline</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-text-primary">{totalCount}</div>
              <div className="text-sm text-text-secondary">Total</div>
            </CardContent>
          </Card>
        </div>

        {/* ── Bulk Actions bar ── */}
        {selectedBots.length > 0 && (
          <div className="mb-4">
            <BotBulkActions
              selectedBots={selectedBots}
              onComplete={handleBulkComplete}
            />
          </div>
        )}

        {/* ── Tab bar ── */}
        <div className="flex space-x-1 mb-6 border-b border-white/10">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium transition-all rounded-t-lg ${
                activeTab === tab.id
                  ? 'bg-accent-primary/20 text-accent-primary border-b-2 border-accent-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB: Bots List                                                    */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'bots' && (
          <div className="space-y-6">
            {/* Table + detail panel */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

              {/* Bot table — takes 3/5 on xl */}
              <div className="xl:col-span-3">
                <Card variant="elevated">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Active Bots</CardTitle>
                        <CardDescription>
                          Click a row to view details · use checkboxes for bulk actions
                        </CardDescription>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => showToast('Bot list refreshed', 'success')}
                      >
                        Refresh
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {/* Table header */}
                    <div className="flex items-center gap-3 px-4 py-2 border-b border-white/10 text-xs text-text-muted uppercase tracking-wider">
                      <div className="w-5">
                        <input
                          type="checkbox"
                          checked={selectedBots.length === MOCK_BOTS.length}
                          onChange={toggleSelectAll}
                          className="accent-accent-primary cursor-pointer"
                          title="Select all"
                        />
                      </div>
                      <div className="w-3" />{/* status dot */}
                      <div className="flex-1">Bot / IP</div>
                      <div className="hidden sm:block w-24">Type</div>
                      <div className="hidden md:block w-24">Location</div>
                      <div className="hidden lg:block w-20">Uptime</div>
                      <div className="hidden lg:block w-24 text-right">Bandwidth</div>
                    </div>

                    {/* Rows */}
                    <div className="divide-y divide-white/5 max-h-[520px] overflow-y-auto">
                      {MOCK_BOTS.map(bot => {
                        const isSelected   = selectedBot?.id === bot.id;
                        const isChecked    = selectedBots.includes(bot.id);
                        return (
                          <div
                            key={bot.id}
                            onClick={() => handleRowClick(bot)}
                            className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all hover:bg-white/5 ${
                              isSelected ? 'bg-accent-primary/10 border-l-2 border-accent-primary' : ''
                            }`}
                          >
                            {/* Checkbox */}
                            <div
                              className="w-5"
                              onClick={e => toggleBotSelection(bot.id, e)}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="accent-accent-primary cursor-pointer"
                              />
                            </div>

                            {/* Status dot */}
                            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusDotClass(bot.status)} ${bot.status !== 'offline' ? 'animate-pulse' : ''}`} />

                            {/* ID + IP */}
                            <div className="flex-1 min-w-0">
                              <div className="font-mono text-sm text-text-primary truncate">{bot.ip}</div>
                              <div className="text-xs text-text-muted">{bot.id}</div>
                            </div>

                            {/* Type */}
                            <div className="hidden sm:block w-24 text-xs text-text-secondary">{bot.type}</div>

                            {/* Location */}
                            <div className="hidden md:block w-24 text-xs text-accent-secondary">{bot.location}</div>

                            {/* Uptime */}
                            <div className="hidden lg:block w-20 text-xs text-text-muted">{bot.uptime}</div>

                            {/* Bandwidth */}
                            <div className="hidden lg:block w-24 text-xs text-text-secondary text-right">{bot.bandwidth}</div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right panel — detail + custom commands, takes 2/5 on xl */}
              <div className="xl:col-span-2 space-y-6">
                {selectedBot ? (
                  <>
                    {/* Bot details card */}
                    <Card variant="bordered" glow>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>Bot Details</CardTitle>
                            <CardDescription>{selectedBot.id}</CardDescription>
                          </div>
                          <span className={`text-xs font-semibold capitalize ${statusTextClass(selectedBot.status)}`}>
                            ● {selectedBot.status}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                          <div>
                            <div className="text-xs text-text-muted mb-0.5">IP Address</div>
                            <div className="font-mono text-sm text-text-primary">{selectedBot.ip}</div>
                          </div>
                          <div>
                            <div className="text-xs text-text-muted mb-0.5">Type</div>
                            <div className="text-sm text-text-primary">{selectedBot.type}</div>
                          </div>
                          <div>
                            <div className="text-xs text-text-muted mb-0.5">Location</div>
                            <div className="text-sm text-accent-secondary">{selectedBot.location}</div>
                          </div>
                          <div>
                            <div className="text-xs text-text-muted mb-0.5">Uptime</div>
                            <div className="text-sm text-text-primary">{selectedBot.uptime}</div>
                          </div>
                          <div>
                            <div className="text-xs text-text-muted mb-0.5">Bandwidth</div>
                            <div className="text-sm text-text-primary">{selectedBot.bandwidth}</div>
                          </div>
                          <div>
                            <div className="text-xs text-text-muted mb-0.5">Health</div>
                            <div className={`text-sm capitalize font-medium ${
                              selectedBot.health.status === 'healthy'  ? 'text-accent-primary' :
                              selectedBot.health.status === 'warning'  ? 'text-accent-warning' :
                              selectedBot.health.status === 'critical' ? 'text-accent-danger'  :
                              'text-text-muted'
                            }`}>
                              {selectedBot.health.status}
                            </div>
                          </div>
                        </div>

                        {/* Tags */}
                        {selectedBot.tags.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {selectedBot.tags.map(tag => (
                              <span
                                key={tag.id}
                                className="px-2 py-0.5 rounded-full text-xs font-medium"
                                style={{ backgroundColor: `${tag.color}20`, color: tag.color, border: `1px solid ${tag.color}40` }}
                              >
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="mt-4 flex gap-2 flex-wrap">
                          <Button variant="primary" size="sm"
                            onClick={() => showToast(`Starting ${selectedBot.id}`, 'success')}>
                            Start
                          </Button>
                          <Button variant="secondary" size="sm"
                            onClick={() => showToast(`Stopping ${selectedBot.id}`, 'warning')}>
                            Stop
                          </Button>
                          <Button variant="ghost" size="sm"
                            onClick={() => showToast(`Restarting ${selectedBot.id}`, 'success')}>
                            Restart
                          </Button>
                          <Button variant="danger" size="sm"
                            onClick={() => { showToast(`Removed ${selectedBot.id}`, 'error'); setSelectedBot(null); }}>
                            Remove
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Custom Commands */}
                    <BotCustomCommands
                      bot={selectedBot}
                      onCommandExecuted={() => showToast('Command executed', 'success')}
                    />
                  </>
                ) : (
                  <Card variant="elevated">
                    <CardContent className="py-16 text-center">
                      <div className="text-text-muted text-sm">
                        Select a bot from the list to view details and send commands
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Terminal — full width below the split */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Bot Control Terminal</CardTitle>
                <CardDescription>
                  {selectedBot ? `Connected to ${selectedBot.ip}` : 'Select a bot to connect'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[360px]">
                  <Terminal
                    prompt={selectedBot ? `${selectedBot.ip}:~$` : 'mirai@c2:~$'}
                    initialLines={
                      selectedBot
                        ? [{ type: 'success', content: `Connected to bot ${selectedBot.id} (${selectedBot.ip})` }]
                        : [{ type: 'output', content: 'Select a bot from the list above to establish a connection.' }]
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB: Groups                                                       */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'groups' && (
          <BotGrouping
            bots={MOCK_BOTS}
            groups={groups}
            onGroupUpdate={() => {
              // In production this would refetch; for mock we just show a toast
              showToast('Groups updated', 'success');
            }}
          />
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB: Health                                                       */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'health' && (
          <div className="space-y-6">
            {/* Summary bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(['healthy', 'warning', 'critical', 'offline'] as const).map(s => {
                const count = MOCK_BOTS.filter(b => b.health.status === s).length;
                const color =
                  s === 'healthy'  ? 'text-accent-primary' :
                  s === 'warning'  ? 'text-accent-warning' :
                  s === 'critical' ? 'text-accent-danger'  :
                  'text-text-muted';
                return (
                  <Card key={s}>
                    <CardContent className="p-4">
                      <div className={`text-2xl font-bold ${color}`}>{count}</div>
                      <div className="text-sm text-text-secondary capitalize">{s}</div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Health monitor grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {MOCK_BOTS.map(bot => (
                <div key={bot.id} className="space-y-1">
                  <div className="text-xs text-text-muted font-mono px-1">
                    {bot.id} — {bot.ip}
                  </div>
                  <BotHealthMonitor health={bot.health} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB: Recovery                                                     */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'recovery' && (
          <BotRecovery
            bots={MOCK_BOTS}
            onRecoveryComplete={() => showToast('Recovery operation completed', 'success')}
          />
        )}

        {/* ── Footer ── */}
        <div className="text-center pt-10 text-text-muted text-xs">
          Bot Management · Mirai 2026
        </div>
      </main>
    </div>
  );
}
