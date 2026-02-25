'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';

interface AttackEvent {
  id: string;
  timestamp: number;
  type: 'start' | 'packet' | 'response' | 'end' | 'error';
  data: any;
}

interface AttackPlaybackData {
  id: string;
  target: string;
  attack_type: string;
  start_time: number;
  end_time: number;
  events: AttackEvent[];
  metadata: {
    total_packets: number;
    duration_seconds: number;
    success_rate: number;
    bots_involved: number;
  };
}

export function AttackPlayback() {
  const [selectedAttack, setSelectedAttack] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [attackHistory, setAttackHistory] = useState<AttackPlaybackData[]>([]);

  // Mock data - replace with actual API call
  useEffect(() => {
    const mockAttacks: AttackPlaybackData[] = [
      {
        id: 'attack_001',
        target: '192.168.1.100:80',
        attack_type: 'UDP Flood',
        start_time: Date.now() - 3600000,
        end_time: Date.now() - 3000000,
        metadata: {
          total_packets: 1500000,
          duration_seconds: 600,
          success_rate: 87.5,
          bots_involved: 450,
        },
        events: generateMockEvents(100),
      },
      {
        id: 'attack_002',
        target: '10.0.0.50:443',
        attack_type: 'TCP SYN Flood',
        start_time: Date.now() - 7200000,
        end_time: Date.now() - 6000000,
        metadata: {
          total_packets: 2300000,
          duration_seconds: 1200,
          success_rate: 92.3,
          bots_involved: 680,
        },
        events: generateMockEvents(150),
      },
      {
        id: 'attack_003',
        target: '172.16.0.200:8080',
        attack_type: 'HTTP Flood',
        start_time: Date.now() - 10800000,
        end_time: Date.now() - 9000000,
        metadata: {
          total_packets: 850000,
          duration_seconds: 1800,
          success_rate: 78.9,
          bots_involved: 320,
        },
        events: generateMockEvents(80),
      },
    ];
    setAttackHistory(mockAttacks);
  }, []);

  function generateMockEvents(count: number): AttackEvent[] {
    const events: AttackEvent[] = [];
    const startTime = Date.now() - 3600000;
    
    events.push({
      id: 'evt_start',
      timestamp: startTime,
      type: 'start',
      data: { message: 'Attack initiated' },
    });

    for (let i = 0; i < count; i++) {
      const eventTime = startTime + (i * 36000);
      events.push({
        id: `evt_${i}`,
        timestamp: eventTime,
        type: i % 20 === 0 ? 'response' : 'packet',
        data: {
          packet_count: i * 1000,
          bandwidth: Math.random() * 100,
          response_time: Math.random() * 500,
        },
      });
    }

    events.push({
      id: 'evt_end',
      timestamp: startTime + (count * 36000),
      type: 'end',
      data: { message: 'Attack completed' },
    });

    return events;
  }

  const currentAttack = attackHistory.find(a => a.id === selectedAttack);

  useEffect(() => {
    if (!isPlaying || !currentAttack) return;

    const interval = setInterval(() => {
      setCurrentEventIndex(prev => {
        if (prev >= currentAttack.events.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 100 / playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, currentAttack, playbackSpeed]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setCurrentEventIndex(0);
    setIsPlaying(false);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Attack Playback</h1>
        <p className="text-text-secondary mt-1">Review and analyze attack execution timeline</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attack List */}
        <Card variant="bordered" className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Attack History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {attackHistory.map((attack) => (
              <button
                key={attack.id}
                onClick={() => {
                  setSelectedAttack(attack.id);
                  setCurrentEventIndex(0);
                  setIsPlaying(false);
                }}
                className={`w-full p-4 rounded-lg text-left transition-all ${
                  selectedAttack === attack.id
                    ? 'bg-accent-primary/20 border-2 border-accent-primary'
                    : 'glass-card hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-text-primary">
                    {attack.attack_type}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    attack.metadata.success_rate >= 85
                      ? 'bg-green-500/20 text-green-400'
                      : attack.metadata.success_rate >= 70
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {attack.metadata.success_rate.toFixed(1)}%
                  </span>
                </div>
                <div className="text-xs text-text-muted">{attack.target}</div>
                <div className="text-xs text-text-muted mt-1">
                  {formatTimestamp(attack.start_time)}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Playback Viewer */}
        <div className="lg:col-span-2 space-y-4">
          {currentAttack ? (
            <>
              {/* Attack Info */}
              <Card variant="elevated">
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs text-text-muted">Target</div>
                      <div className="text-sm font-mono text-accent-primary">
                        {currentAttack.target}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-text-muted">Type</div>
                      <div className="text-sm font-medium text-text-primary">
                        {currentAttack.attack_type}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-text-muted">Duration</div>
                      <div className="text-sm font-medium text-text-primary">
                        {formatDuration(currentAttack.metadata.duration_seconds)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-text-muted">Bots</div>
                      <div className="text-sm font-medium text-text-primary">
                        {currentAttack.metadata.bots_involved}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Playback Controls */}
              <Card variant="bordered">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Progress Bar */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-text-muted">
                          Event {currentEventIndex + 1} of {currentAttack.events.length}
                        </span>
                        <span className="text-xs text-text-muted">
                          {((currentEventIndex / currentAttack.events.length) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary transition-all duration-300"
                          style={{
                            width: `${(currentEventIndex / currentAttack.events.length) * 100}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handlePlayPause}
                        >
                          {isPlaying ? '⏸ Pause' : '▶ Play'}
                        </Button>
                        <Button variant="secondary" size="sm" onClick={handleReset}>
                          ⏹ Reset
                        </Button>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-text-muted">Speed:</span>
                        {[0.5, 1, 2, 5, 10].map((speed) => (
                          <button
                            key={speed}
                            onClick={() => handleSpeedChange(speed)}
                            className={`px-2 py-1 rounded text-xs transition-colors ${
                              playbackSpeed === speed
                                ? 'bg-accent-primary text-white'
                                : 'bg-white/10 text-text-muted hover:bg-white/20'
                            }`}
                          >
                            {speed}x
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Event Timeline */}
              <Card variant="bordered">
                <CardHeader>
                  <CardTitle>Event Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-96 overflow-y-auto space-y-2">
                    {currentAttack.events.slice(0, currentEventIndex + 1).reverse().map((event, idx) => (
                      <div
                        key={event.id}
                        className={`p-3 rounded-lg glass-card ${
                          idx === 0 ? 'border-l-4 border-accent-primary' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-mono ${
                                event.type === 'start' ? 'bg-green-500/20 text-green-400' :
                                event.type === 'end' ? 'bg-red-500/20 text-red-400' :
                                event.type === 'error' ? 'bg-red-500/20 text-red-400' :
                                event.type === 'response' ? 'bg-blue-500/20 text-blue-400' :
                                'bg-white/10 text-text-muted'
                              }`}>
                                {event.type.toUpperCase()}
                              </span>
                              <span className="text-xs text-text-muted">
                                {formatTimestamp(event.timestamp)}
                              </span>
                            </div>
                            {event.data.message && (
                              <div className="text-sm text-text-primary mt-2">
                                {event.data.message}
                              </div>
                            )}
                            {event.data.packet_count !== undefined && (
                              <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                                <div>
                                  <span className="text-text-muted">Packets: </span>
                                  <span className="text-accent-primary font-mono">
                                    {event.data.packet_count.toLocaleString()}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-text-muted">Bandwidth: </span>
                                  <span className="text-accent-primary font-mono">
                                    {event.data.bandwidth.toFixed(2)} Mbps
                                  </span>
                                </div>
                                <div>
                                  <span className="text-text-muted">Response: </span>
                                  <span className="text-accent-primary font-mono">
                                    {event.data.response_time.toFixed(0)} ms
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Statistics */}
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle>Attack Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center p-4 glass-card rounded-lg">
                      <div className="text-2xl font-bold text-accent-primary">
                        {currentAttack.metadata.total_packets.toLocaleString()}
                      </div>
                      <div className="text-xs text-text-muted mt-1">Total Packets</div>
                    </div>
                    <div className="text-center p-4 glass-card rounded-lg">
                      <div className="text-2xl font-bold text-accent-primary">
                        {currentAttack.metadata.success_rate.toFixed(1)}%
                      </div>
                      <div className="text-xs text-text-muted mt-1">Success Rate</div>
                    </div>
                    <div className="text-center p-4 glass-card rounded-lg">
                      <div className="text-2xl font-bold text-accent-primary">
                        {currentAttack.metadata.bots_involved}
                      </div>
                      <div className="text-xs text-text-muted mt-1">Bots Involved</div>
                    </div>
                    <div className="text-center p-4 glass-card rounded-lg">
                      <div className="text-2xl font-bold text-accent-primary">
                        {(currentAttack.metadata.total_packets / currentAttack.metadata.duration_seconds).toFixed(0)}
                      </div>
                      <div className="text-xs text-text-muted mt-1">Packets/Second</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card variant="bordered">
              <CardContent className="py-20 text-center">
                <div className="text-6xl mb-4">📊</div>
                <div className="text-text-muted">Select an attack from the list to view playback</div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
