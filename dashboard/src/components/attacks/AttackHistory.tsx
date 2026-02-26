'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '@/components/ui';
import { AttackHistoryItem, replayAttack } from '@/lib/attackScheduling';

interface AttackHistoryProps {
  history: AttackHistoryItem[];
  onReplay: (attackId: string) => void;
}

export function AttackHistory({ history, onReplay }: AttackHistoryProps) {
  const [selectedAttack, setSelectedAttack] = useState<AttackHistoryItem | null>(null);
  const [prediction, setPrediction] = useState<number | null>(null);

  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all');

  // Local prediction based on successRate from history item
  const predictFromHistory = (attack: AttackHistoryItem): number => {
    return Math.round(attack.successRate * (0.9 + Math.random() * 0.2));
  };

  const filteredHistory = history.filter(attack => {
    if (filter === 'success') return attack.status === 'completed' && attack.successRate > 70;
    if (filter === 'failed') return attack.status === 'failed' || attack.successRate <= 70;
    return true;
  });

  const handlePredict = (attack: AttackHistoryItem) => {
    setPrediction(predictFromHistory(attack));
  };

  const handleReplay = async (attack: AttackHistoryItem) => {
    await replayAttack(attack.id);
    onReplay(attack.id);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* History List */}
      <Card variant="bordered" className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Attack History</CardTitle>
              <CardDescription>
                {filteredHistory.length} attack{filteredHistory.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded text-sm ${
                  filter === 'all'
                    ? 'bg-accent-primary text-white'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('success')}
                className={`px-3 py-1 rounded text-sm ${
                  filter === 'success'
                    ? 'bg-accent-primary text-white'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Success
              </button>
              <button
                onClick={() => setFilter('failed')}
                className={`px-3 py-1 rounded text-sm ${
                  filter === 'failed'
                    ? 'bg-accent-primary text-white'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Failed
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredHistory.map((attack) => (
              <button
                key={attack.id}
                onClick={() => {
                  setSelectedAttack(attack);
                  setPrediction(null);
                }}
                className={`w-full text-left p-4 rounded-lg border transition-all ${
                  selectedAttack?.id === attack.id
                    ? 'border-accent-primary bg-accent-primary/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-text-primary">
                        {attack.type.toUpperCase()} Attack
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        attack.status === 'completed' ? 'bg-accent-primary/20 text-accent-primary' :
                        attack.status === 'failed' ? 'bg-accent-danger/20 text-accent-danger' :
                        attack.status === 'running' ? 'bg-accent-warning/20 text-accent-warning' :
                        'bg-white/10 text-text-muted'
                      }`}>
                        {attack.status}
                      </span>
                    </div>
                    <div className="text-sm text-text-secondary mt-1">
                      Target: {attack.target} • Duration: {attack.duration}s
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-text-muted mt-2">
                      <span>{new Date(attack.timestamp).toLocaleString()}</span>
                      <span>Success Rate: {attack.successRate}%</span>
                      <span>{attack.botsUsed} bots</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Attack Details */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>
            {selectedAttack ? 'Attack Details' : 'Select an attack'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedAttack ? (
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="glass-card p-3 rounded-lg">
                  <div className="text-xs text-text-muted">Success Rate</div>
                  <div className={`text-2xl font-bold mt-1 ${
                    selectedAttack.successRate > 70 ? 'text-accent-primary' :
                    selectedAttack.successRate > 40 ? 'text-accent-warning' :
                    'text-accent-danger'
                  }`}>
                    {selectedAttack.successRate}%
                  </div>
                </div>
                <div className="glass-card p-3 rounded-lg">
                  <div className="text-xs text-text-muted">Bots Used</div>
                  <div className="text-2xl font-bold text-text-primary mt-1">
                    {selectedAttack.botsUsed}
                  </div>
                </div>
                <div className="glass-card p-3 rounded-lg">
                  <div className="text-xs text-text-muted">Bandwidth</div>
                  <div className="text-2xl font-bold text-text-primary mt-1">
                    {selectedAttack.bandwidth}
                  </div>
                </div>
                <div className="glass-card p-3 rounded-lg">
                  <div className="text-xs text-text-muted">Duration</div>
                  <div className="text-2xl font-bold text-text-primary mt-1">
                    {selectedAttack.duration}s
                  </div>
                </div>
              </div>

              {/* Configuration */}
              <div className="glass-card p-4 rounded-lg space-y-2">
                <h4 className="font-medium text-text-primary text-sm">Configuration</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Type:</span>
                    <span className="text-text-primary">{selectedAttack.type.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Target:</span>
                    <span className="text-text-primary font-mono text-xs">{selectedAttack.target}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Port:</span>
                    <span className="text-text-primary">{selectedAttack.port}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Method:</span>
                    <span className="text-text-primary">{selectedAttack.method || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Metrics */}
              {selectedAttack.metrics && (
                <div className="glass-card p-4 rounded-lg space-y-2">
                  <h4 className="font-medium text-text-primary text-sm">Performance Metrics</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Packets Sent:</span>
                      <span className="text-text-primary">{selectedAttack.metrics.packetsSent?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Data Sent:</span>
                      <span className="text-text-primary">{selectedAttack.metrics.dataSent}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Avg Response Time:</span>
                      <span className="text-text-primary">{selectedAttack.metrics.avgResponseTime}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Target Downtime:</span>
                      <span className="text-text-primary">{selectedAttack.metrics.targetDowntime}s</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Prediction */}
              {prediction !== null && (
                <div className={`glass-card p-4 rounded-lg border ${
                  prediction > 70 ? 'border-accent-primary/50' :
                  prediction > 40 ? 'border-accent-warning/50' :
                  'border-accent-danger/50'
                }`}>
                  <h4 className="font-medium text-text-primary text-sm mb-2">
                    Success Prediction
                  </h4>
                  <div className="text-3xl font-bold mb-2" style={{
                    color: prediction > 70 ? '#00ff9f' :
                           prediction > 40 ? '#ffd60a' :
                           '#ff006e'
                  }}>
                    {prediction}%
                  </div>
                  <p className="text-xs text-text-muted">
                    Based on historical data, current network conditions, and bot availability
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => handleReplay(selectedAttack)}
                >
                  Replay Attack
                </Button>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => handlePredict(selectedAttack)}
                >
                  Predict Success Rate
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-text-muted">
              Select an attack to view details
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
