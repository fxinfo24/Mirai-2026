'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from '@/components/ui';

interface SystemConfig {
  max_bots: number;
  max_attacks_concurrent: number;
  default_timeout: number;
  log_level: string;
  enable_metrics: boolean;
  enable_distributed_mode: boolean;
}

interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rollout_percentage: number;
}

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'config' | 'features' | 'users' | 'logs'>('config');
  
  const [systemConfig, setSystemConfig] = useState<SystemConfig>({
    max_bots: 10000,
    max_attacks_concurrent: 50,
    default_timeout: 30,
    log_level: 'INFO',
    enable_metrics: true,
    enable_distributed_mode: false,
  });

  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([
    {
      id: 'ai_predictions',
      name: 'AI Predictions',
      description: 'Enable ML-based attack success predictions',
      enabled: true,
      rollout_percentage: 100,
    },
    {
      id: 'advanced_evasion',
      name: 'Advanced Evasion',
      description: 'Use deep learning for pattern evasion',
      enabled: false,
      rollout_percentage: 0,
    },
    {
      id: 'federated_learning',
      name: 'Federated Learning',
      description: 'Distributed learning across bot network',
      enabled: false,
      rollout_percentage: 0,
    },
    {
      id: 'auto_scaling',
      name: 'Auto Scaling',
      description: 'Automatically scale bot deployment',
      enabled: true,
      rollout_percentage: 50,
    },
  ]);

  const updateConfig = (key: keyof SystemConfig, value: any) => {
    setSystemConfig(prev => ({ ...prev, [key]: value }));
  };

  const toggleFeature = (id: string) => {
    setFeatureFlags(prev => 
      prev.map(flag => 
        flag.id === id ? { ...flag, enabled: !flag.enabled } : flag
      )
    );
  };

  const updateRollout = (id: string, percentage: number) => {
    setFeatureFlags(prev =>
      prev.map(flag =>
        flag.id === id ? { ...flag, rollout_percentage: percentage } : flag
      )
    );
  };

  const saveConfiguration = () => {
    console.log('Saving configuration:', systemConfig);
    alert('Configuration saved successfully!');
  };

  const saveFeatureFlags = () => {
    console.log('Saving feature flags:', featureFlags);
    alert('Feature flags updated successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Admin Panel</h1>
          <p className="text-text-secondary mt-1">System configuration and management</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 rounded-full bg-accent-primary/20 text-accent-primary text-sm">
            Admin Access
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-white/10">
        {['config', 'features', 'users', 'logs'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 capitalize transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-accent-primary text-accent-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* System Configuration */}
      {activeTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card variant="bordered">
            <CardHeader>
              <CardTitle>System Limits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Max Bots
                </label>
                <Input
                  type="number"
                  value={systemConfig.max_bots}
                  onChange={(e) => updateConfig('max_bots', parseInt(e.target.value))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Max Concurrent Attacks
                </label>
                <Input
                  type="number"
                  value={systemConfig.max_attacks_concurrent}
                  onChange={(e) => updateConfig('max_attacks_concurrent', parseInt(e.target.value))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Default Timeout (seconds)
                </label>
                <Input
                  type="number"
                  value={systemConfig.default_timeout}
                  onChange={(e) => updateConfig('default_timeout', parseInt(e.target.value))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Log Level
                </label>
                <select
                  value={systemConfig.log_level}
                  onChange={(e) => updateConfig('log_level', e.target.value)}
                  className="w-full px-3 py-2 bg-primary-bg-secondary border border-white/10 rounded-lg text-text-primary"
                >
                  <option value="DEBUG">Debug</option>
                  <option value="INFO">Info</option>
                  <option value="WARNING">Warning</option>
                  <option value="ERROR">Error</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card variant="bordered">
            <CardHeader>
              <CardTitle>System Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-text-primary">Enable Metrics</div>
                  <div className="text-xs text-text-muted">Prometheus metrics collection</div>
                </div>
                <button
                  onClick={() => updateConfig('enable_metrics', !systemConfig.enable_metrics)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    systemConfig.enable_metrics ? 'bg-accent-primary' : 'bg-white/10'
                  }`}
                >
                  <div className={`absolute w-4 h-4 bg-white rounded-full top-1 transition-transform ${
                    systemConfig.enable_metrics ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-text-primary">Distributed Mode</div>
                  <div className="text-xs text-text-muted">Multi-node deployment</div>
                </div>
                <button
                  onClick={() => updateConfig('enable_distributed_mode', !systemConfig.enable_distributed_mode)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    systemConfig.enable_distributed_mode ? 'bg-accent-primary' : 'bg-white/10'
                  }`}
                >
                  <div className={`absolute w-4 h-4 bg-white rounded-full top-1 transition-transform ${
                    systemConfig.enable_distributed_mode ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div className="pt-4">
                <Button variant="primary" className="w-full" onClick={saveConfiguration}>
                  Save Configuration
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated" className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Button variant="secondary" size="sm">
                  Clear Cache
                </Button>
                <Button variant="secondary" size="sm">
                  Restart Services
                </Button>
                <Button variant="secondary" size="sm">
                  Export Logs
                </Button>
                <Button variant="danger" size="sm">
                  Emergency Stop
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Feature Flags */}
      {activeTab === 'features' && (
        <Card variant="bordered">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Feature Flags</CardTitle>
              <Button variant="primary" size="sm" onClick={saveFeatureFlags}>
                Save Changes
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {featureFlags.map((flag) => (
              <div
                key={flag.id}
                className="glass-card p-4 rounded-lg space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="text-sm font-medium text-text-primary">{flag.name}</h4>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        flag.enabled
                          ? 'bg-accent-primary/20 text-accent-primary'
                          : 'bg-white/10 text-text-muted'
                      }`}>
                        {flag.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted mt-1">{flag.description}</p>
                  </div>
                  <button
                    onClick={() => toggleFeature(flag.id)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${
                      flag.enabled ? 'bg-accent-primary' : 'bg-white/10'
                    }`}
                  >
                    <div className={`absolute w-4 h-4 bg-white rounded-full top-1 transition-transform ${
                      flag.enabled ? 'translate-x-7' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {flag.enabled && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs text-text-secondary">Rollout Percentage</label>
                      <span className="text-xs font-mono text-accent-primary">
                        {flag.rollout_percentage}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={flag.rollout_percentage}
                      onChange={(e) => updateRollout(flag.id, parseInt(e.target.value))}
                      className="w-full accent-accent-primary"
                    />
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* User Management */}
      {activeTab === 'users' && (
        <Card variant="bordered">
          <CardHeader>
            <CardTitle>User Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-text-muted">
              <p>User management interface coming soon</p>
              <p className="text-sm mt-2">Will include: Role management, permissions, audit logs</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Logs */}
      {activeTab === 'logs' && (
        <Card variant="bordered">
          <CardHeader>
            <CardTitle>System Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-black/40 rounded-lg p-4 h-96 overflow-y-auto font-mono text-xs">
              <div className="space-y-1">
                <div className="text-text-muted">[2026-02-25 16:30:45] INFO: System initialized</div>
                <div className="text-accent-primary">[2026-02-25 16:30:46] INFO: Database connection established</div>
                <div className="text-text-muted">[2026-02-25 16:30:47] INFO: Redis cache connected</div>
                <div className="text-accent-primary">[2026-02-25 16:30:48] INFO: AI service ready</div>
                <div className="text-accent-warning">[2026-02-25 16:31:00] WARN: High memory usage detected (75%)</div>
                <div className="text-text-muted">[2026-02-25 16:31:15] INFO: Bot deployment successful (1234 bots)</div>
                <div className="text-accent-primary">[2026-02-25 16:32:00] INFO: Attack scheduler started</div>
                <div className="text-text-muted">[2026-02-25 16:32:30] INFO: Metrics collection active</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
