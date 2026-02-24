'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, useToast } from '@/components/ui';

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  enabled: boolean;
  lastTriggered?: Date;
  successCount: number;
  failCount: number;
}

const AVAILABLE_EVENTS = [
  'bot.online',
  'bot.offline',
  'attack.started',
  'attack.completed',
  'attack.failed',
  'system.alert',
  'threshold.exceeded',
];

export function WebhookManager() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([
    {
      id: '1',
      name: 'Slack Notifications',
      url: 'https://hooks.slack.com/services/...',
      events: ['attack.completed', 'system.alert'],
      enabled: true,
      successCount: 127,
      failCount: 3,
    },
  ]);
  const [isCreating, setIsCreating] = useState(false);
  const [newWebhook, setNewWebhook] = useState({
    name: '',
    url: '',
    events: [] as string[],
  });
  const { showToast } = useToast();

  const handleCreate = () => {
    if (!newWebhook.name || !newWebhook.url || newWebhook.events.length === 0) {
      showToast('Please fill all fields', 'warning');
      return;
    }

    const webhook: Webhook = {
      id: Date.now().toString(),
      ...newWebhook,
      enabled: true,
      successCount: 0,
      failCount: 0,
    };

    setWebhooks([...webhooks, webhook]);
    setNewWebhook({ name: '', url: '', events: [] });
    setIsCreating(false);
    showToast('Webhook created', 'success');
  };

  const toggleWebhook = (id: string) => {
    setWebhooks(webhooks.map(w =>
      w.id === id ? { ...w, enabled: !w.enabled } : w
    ));
  };

  const testWebhook = async (webhook: Webhook) => {
    showToast('Testing webhook...', 'info');
    await new Promise(resolve => setTimeout(resolve, 1000));
    showToast('Webhook test successful', 'success');
  };

  return (
    <div className="space-y-6">
      <Card variant="bordered" glow>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Webhook Integrations</CardTitle>
              <CardDescription>Manage external service notifications</CardDescription>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreating(true)}
            >
              + Add Webhook
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {webhooks.map(webhook => (
            <div key={webhook.id} className="glass-card p-4 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => toggleWebhook(webhook.id)}
                      className={`w-10 h-6 rounded-full transition-colors relative ${
                        webhook.enabled ? 'bg-accent-primary' : 'bg-white/10'
                      }`}
                    >
                      <div className={`absolute w-4 h-4 bg-white rounded-full top-1 transition-transform ${
                        webhook.enabled ? 'translate-x-5' : 'translate-x-1'
                      }`} />
                    </button>
                    <div>
                      <div className="font-medium text-text-primary">{webhook.name}</div>
                      <div className="text-xs text-text-muted font-mono mt-1">{webhook.url}</div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1">
                    {webhook.events.map(event => (
                      <span
                        key={event}
                        className="px-2 py-1 bg-accent-primary/20 text-accent-primary rounded text-xs"
                      >
                        {event}
                      </span>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center space-x-4 text-xs text-text-muted">
                    <span>✓ {webhook.successCount} successful</span>
                    <span>✗ {webhook.failCount} failed</span>
                    {webhook.lastTriggered && (
                      <span>Last: {webhook.lastTriggered.toLocaleString()}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => testWebhook(webhook)}
                  >
                    Test
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setWebhooks(webhooks.filter(w => w.id !== webhook.id))}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {isCreating && (
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Create Webhook</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Name"
              value={newWebhook.name}
              onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
              placeholder="Slack Notifications"
            />

            <Input
              label="Webhook URL"
              value={newWebhook.url}
              onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
              placeholder="https://hooks.slack.com/services/..."
            />

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Events to Monitor
              </label>
              <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_EVENTS.map(event => (
                  <label key={event} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newWebhook.events.includes(event)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewWebhook({
                            ...newWebhook,
                            events: [...newWebhook.events, event],
                          });
                        } else {
                          setNewWebhook({
                            ...newWebhook,
                            events: newWebhook.events.filter(ev => ev !== event),
                          });
                        }
                      }}
                      className="w-4 h-4 accent-accent-primary"
                    />
                    <span className="text-sm text-text-primary">{event}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="primary" className="flex-1" onClick={handleCreate}>
                Create Webhook
              </Button>
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => {
                  setIsCreating(false);
                  setNewWebhook({ name: '', url: '', events: [] });
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
