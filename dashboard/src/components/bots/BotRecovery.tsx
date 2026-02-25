'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, useToast } from '@/components/ui';
import type { BotWithHealth } from '@/lib/botManagement';
import { RecoveryRule, applyRecoveryRule } from '@/lib/botManagement.extended';

interface BotRecoveryProps {
  bots: BotWithHealth[];
  onRecoveryComplete: () => void;
}

export function BotRecovery({ bots, onRecoveryComplete }: BotRecoveryProps) {
  const [rules, setRules] = useState<RecoveryRule[]>([
    {
      id: '1',
      name: 'Auto-restart offline bots',
      condition: 'offline',
      action: 'restart',
      enabled: true,
      cooldown: 300,
    },
    {
      id: '2',
      name: 'Restart on high CPU',
      condition: 'high_cpu',
      threshold: 95,
      action: 'restart',
      enabled: false,
      cooldown: 600,
    },
  ]);
  const [isCreating, setIsCreating] = useState(false);
  const [newRule, setNewRule] = useState<Partial<RecoveryRule>>({
    name: '',
    condition: 'offline',
    action: 'restart',
    enabled: true,
    cooldown: 300,
  });
  const [isApplying, setIsApplying] = useState<string | null>(null);
  const { showToast } = useToast();

  const handleApplyRule = async (rule: RecoveryRule) => {
    setIsApplying(rule.id);
    try {
      const recovered = await applyRecoveryRule(rule, bots);
      showToast(`Recovery complete: ${recovered} bot(s) recovered`, 'success');
      onRecoveryComplete();
    } catch (error) {
      showToast('Recovery failed', 'error');
    } finally {
      setIsApplying(null);
    }
  };

  const handleToggleRule = (ruleId: string) => {
    setRules(rules.map(rule =>
      rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
    ));
  };

  const handleCreateRule = () => {
    if (!newRule.name) {
      showToast('Rule name is required', 'warning');
      return;
    }

    const rule: RecoveryRule = {
      id: `rule_${Date.now()}`,
      name: newRule.name,
      condition: newRule.condition || 'offline',
      action: newRule.action || 'restart',
      threshold: newRule.threshold,
      customCommand: newRule.customCommand,
      enabled: newRule.enabled ?? true,
      cooldown: newRule.cooldown || 300,
    };

    setRules([...rules, rule]);
    setIsCreating(false);
    setNewRule({
      name: '',
      condition: 'offline',
      action: 'restart',
      enabled: true,
      cooldown: 300,
    });
    showToast('Recovery rule created', 'success');
  };

  const handleDeleteRule = (ruleId: string) => {
    setRules(rules.filter(rule => rule.id !== ruleId));
    showToast('Recovery rule deleted', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Active Rules */}
      <Card variant="bordered" glow>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Automated Recovery Rules</CardTitle>
              <CardDescription>
                Automatically recover bots based on health conditions
              </CardDescription>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreating(true)}
            >
              + New Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`glass-card p-4 rounded-lg border ${
                rule.enabled ? 'border-accent-primary/50' : 'border-white/10'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleToggleRule(rule.id)}
                      className={`w-10 h-6 rounded-full transition-colors relative ${
                        rule.enabled ? 'bg-accent-primary' : 'bg-white/10'
                      }`}
                    >
                      <div className={`absolute w-4 h-4 bg-white rounded-full top-1 transition-transform ${
                        rule.enabled ? 'translate-x-5' : 'translate-x-1'
                      }`} />
                    </button>
                    <div>
                      <div className="font-medium text-text-primary">
                        {rule.name}
                      </div>
                      <div className="text-xs text-text-muted mt-1">
                        Condition: <span className="text-accent-primary capitalize">{rule.condition.replace('_', ' ')}</span>
                        {rule.threshold && ` (>${rule.threshold}%)`}
                        {' • '}Action: <span className="text-accent-warning capitalize">{rule.action}</span>
                        {' • '}Cooldown: {rule.cooldown}s
                      </div>
                    </div>
                  </div>

                  {rule.customCommand && (
                    <div className="mt-2 font-mono text-xs text-text-muted bg-black/20 p-2 rounded">
                      {rule.customCommand}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleApplyRule(rule)}
                    isLoading={isApplying === rule.id}
                    disabled={!rule.enabled}
                  >
                    Apply Now
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteRule(rule.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Create New Rule */}
      {isCreating && (
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Create Recovery Rule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Rule Name"
              value={newRule.name || ''}
              onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
              placeholder="Auto-restart unresponsive bots"
            />

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Condition
              </label>
              <select
                value={newRule.condition}
                onChange={(e) => setNewRule({ ...newRule, condition: e.target.value as RecoveryRule['condition'] })}
                className="w-full px-3 py-2 bg-primary-bg-secondary border border-white/10 rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
              >
                <option value="offline">Bot is offline</option>
                <option value="high_cpu">High CPU usage</option>
                <option value="high_memory">High memory usage</option>
                <option value="unresponsive">Unresponsive</option>
              </select>
            </div>

            {(['high_cpu', 'high_memory', 'unresponsive'].includes(newRule.condition || '')) && (
              <Input
                label="Threshold"
                type="number"
                value={newRule.threshold || ''}
                onChange={(e) => setNewRule({ ...newRule, threshold: parseInt(e.target.value) })}
                placeholder={newRule.condition === 'unresponsive' ? '30000 (ms)' : '90 (%)'}
              />
            )}

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Action
              </label>
              <select
                value={newRule.action}
                onChange={(e) => setNewRule({ ...newRule, action: e.target.value as RecoveryRule['action'] })}
                className="w-full px-3 py-2 bg-primary-bg-secondary border border-white/10 rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
              >
                <option value="restart">Restart bot</option>
                <option value="stop">Stop bot</option>
                <option value="notify">Send notification only</option>
                <option value="custom">Execute custom command</option>
              </select>
            </div>

            {newRule.action === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Custom Command
                </label>
                <textarea
                  value={newRule.customCommand || ''}
                  onChange={(e) => setNewRule({ ...newRule, customCommand: e.target.value })}
                  placeholder="/bin/busybox reboot"
                  className="w-full px-3 py-2 bg-primary-bg-secondary border border-white/10 rounded-lg text-text-primary font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary resize-none"
                  rows={3}
                />
              </div>
            )}

            <Input
              label="Cooldown (seconds)"
              type="number"
              value={newRule.cooldown || ''}
              onChange={(e) => setNewRule({ ...newRule, cooldown: parseInt(e.target.value) })}
              placeholder="300"
            />

            <div className="flex gap-2">
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleCreateRule}
              >
                Create Rule
              </Button>
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => {
                  setIsCreating(false);
                  setNewRule({
                    name: '',
                    condition: 'offline',
                    action: 'restart',
                    enabled: true,
                    cooldown: 300,
                  });
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recovery Stats */}
      <Card variant="bordered">
        <CardHeader>
          <CardTitle>Recovery Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-card p-3 rounded-lg">
              <div className="text-xs text-text-muted">Total Recoveries</div>
              <div className="text-2xl font-bold text-text-primary mt-1">127</div>
            </div>
            <div className="glass-card p-3 rounded-lg">
              <div className="text-xs text-text-muted">Success Rate</div>
              <div className="text-2xl font-bold text-accent-primary mt-1">94%</div>
            </div>
            <div className="glass-card p-3 rounded-lg">
              <div className="text-xs text-text-muted">Last 24h</div>
              <div className="text-2xl font-bold text-text-primary mt-1">23</div>
            </div>
            <div className="glass-card p-3 rounded-lg">
              <div className="text-xs text-text-muted">Active Rules</div>
              <div className="text-2xl font-bold text-accent-warning mt-1">
                {rules.filter(r => r.enabled).length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
