'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, useToast } from '@/components/ui';
import { AttackTemplate, parseCronExpression, calculateNextRun, DEFAULT_TEMPLATES } from '@/lib/attackScheduling';

export function AttackScheduler() {
  const [selectedTemplate, setSelectedTemplate] = useState<AttackTemplate | null>(null);
  const [target, setTarget] = useState('');
  const [cronExpression, setCronExpression] = useState('0 * * * *');
  const { showToast } = useToast();

  const handleSchedule = () => {
    if (!selectedTemplate || !target) {
      showToast('Please select a template and enter a target', 'warning');
      return;
    }

    const nextRun = calculateNextRun(cronExpression);
    showToast(
      `Attack scheduled! Next run: ${nextRun.toLocaleString()}`,
      'success'
    );
  };

  return (
    <Card variant="bordered" glow>
      <CardHeader>
        <CardTitle>Schedule Attack</CardTitle>
        <CardDescription>Create recurring attacks with cron scheduling</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Template Selection */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Select Template
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {DEFAULT_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template)}
                className={`text-left p-3 rounded-lg border-2 transition-all ${
                  selectedTemplate?.id === template.id
                    ? 'border-accent-primary bg-accent-primary/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="font-medium text-text-primary text-sm">
                  {template.name}
                </div>
                <div className="text-xs text-text-muted mt-1">
                  {template.type}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {template.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-white/5 rounded text-xs text-text-muted"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>

        {selectedTemplate && (
          <>
            {/* Target */}
            <Input
              label="Target IP/Domain"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="203.0.113.0"
            />

            {/* Cron Schedule */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Schedule (Cron Expression)
              </label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button
                  onClick={() => setCronExpression('* * * * *')}
                  className={`p-2 rounded text-sm ${
                    cronExpression === '* * * * *'
                      ? 'bg-accent-primary/20 text-accent-primary'
                      : 'bg-white/5 text-text-secondary'
                  }`}
                >
                  Every Minute
                </button>
                <button
                  onClick={() => setCronExpression('0 * * * *')}
                  className={`p-2 rounded text-sm ${
                    cronExpression === '0 * * * *'
                      ? 'bg-accent-primary/20 text-accent-primary'
                      : 'bg-white/5 text-text-secondary'
                  }`}
                >
                  Every Hour
                </button>
                <button
                  onClick={() => setCronExpression('0 0 * * *')}
                  className={`p-2 rounded text-sm ${
                    cronExpression === '0 0 * * *'
                      ? 'bg-accent-primary/20 text-accent-primary'
                      : 'bg-white/5 text-text-secondary'
                  }`}
                >
                  Daily
                </button>
                <button
                  onClick={() => setCronExpression('0 0 * * 0')}
                  className={`p-2 rounded text-sm ${
                    cronExpression === '0 0 * * 0'
                      ? 'bg-accent-primary/20 text-accent-primary'
                      : 'bg-white/5 text-text-secondary'
                  }`}
                >
                  Weekly
                </button>
              </div>
              <Input
                value={cronExpression}
                onChange={(e) => setCronExpression(e.target.value)}
                placeholder="* * * * *"
                className="font-mono"
              />
              <p className="text-xs text-text-muted mt-1">
                {parseCronExpression(cronExpression)}
              </p>
            </div>

            {/* Template Details */}
            <div className="glass-card p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Duration:</span>
                <span className="text-text-primary">{selectedTemplate.defaultDuration}s</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Bandwidth:</span>
                <span className="text-text-primary">{selectedTemplate.defaultBandwidth} Mbps</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Port:</span>
                <span className="text-text-primary">{selectedTemplate.defaultPort}</span>
              </div>
            </div>

            {/* Action */}
            <Button variant="primary" className="w-full" onClick={handleSchedule}>
              Schedule Attack
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
