'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';
import { TimelineChart } from '@/components/charts/TimelineChart';
import { GaugeChart } from '@/components/charts/GaugeChart';

interface BenchmarkMetric {
  id: string;
  name: string;
  current: number;
  baseline: number;
  target: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
}

interface PerformanceTest {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'failed';
  duration: number;
  results: {
    throughput: number;
    latency: number;
    errorRate: number;
    resourceUsage: number;
  };
  timestamp: number;
}

interface ResourceMetrics {
  cpu: number[];
  memory: number[];
  network: number[];
  disk: number[];
  timestamps: string[];
}

export function BenchmarkDashboard() {
  const [metrics, setMetrics] = useState<BenchmarkMetric[]>([]);
  const [performanceTests, setPerformanceTests] = useState<PerformanceTest[]>([]);
  const [resourceMetrics, setResourceMetrics] = useState<ResourceMetrics>({
    cpu: [],
    memory: [],
    network: [],
    disk: [],
    timestamps: [],
  });
  const [selectedTab, setSelectedTab] = useState<'overview' | 'tests' | 'resources' | 'comparison'>('overview');
  const [isRunningTest, setIsRunningTest] = useState(false);

  useEffect(() => {
    // Mock data
    const mockMetrics: BenchmarkMetric[] = [
      { id: 'm1', name: 'Attack Throughput', current: 2.3, baseline: 2.0, target: 2.5, unit: 'M packets/sec', trend: 'up' },
      { id: 'm2', name: 'Bot Response Time', current: 45, baseline: 50, target: 40, unit: 'ms', trend: 'up' },
      { id: 'm3', name: 'CPU Efficiency', current: 87, baseline: 80, target: 90, unit: '%', trend: 'up' },
      { id: 'm4', name: 'Memory Usage', current: 62, baseline: 65, target: 60, unit: '%', trend: 'up' },
      { id: 'm5', name: 'Network Bandwidth', current: 8.5, baseline: 8.0, target: 9.0, unit: 'Gbps', trend: 'up' },
      { id: 'm6', name: 'Error Rate', current: 0.8, baseline: 1.2, target: 0.5, unit: '%', trend: 'up' },
    ];

    const mockTests: PerformanceTest[] = [
      {
        id: 'test_1',
        name: 'UDP Flood Stress Test',
        status: 'completed',
        duration: 300,
        results: { throughput: 2.3, latency: 45, errorRate: 0.8, resourceUsage: 75 },
        timestamp: Date.now() - 3600000,
      },
      {
        id: 'test_2',
        name: 'TCP SYN Load Test',
        status: 'completed',
        duration: 600,
        results: { throughput: 1.9, latency: 52, errorRate: 1.2, resourceUsage: 68 },
        timestamp: Date.now() - 7200000,
      },
      {
        id: 'test_3',
        name: 'HTTP Flood Benchmark',
        status: 'running',
        duration: 0,
        results: { throughput: 0, latency: 0, errorRate: 0, resourceUsage: 0 },
        timestamp: Date.now(),
      },
    ];

    const mockResources: ResourceMetrics = {
      cpu: [45, 52, 48, 65, 72, 68, 75, 70, 65, 60],
      memory: [60, 62, 65, 68, 70, 72, 68, 65, 62, 60],
      network: [75, 80, 85, 90, 88, 85, 82, 78, 75, 72],
      disk: [30, 32, 35, 33, 30, 28, 32, 35, 33, 30],
      timestamps: ['10:00', '10:05', '10:10', '10:15', '10:20', '10:25', '10:30', '10:35', '10:40', '10:45'],
    };

    setMetrics(mockMetrics);
    setPerformanceTests(mockTests);
    setResourceMetrics(mockResources);
  }, []);

  const runBenchmark = () => {
    setIsRunningTest(true);
    setTimeout(() => {
      setIsRunningTest(false);
      const newTest: PerformanceTest = {
        id: `test_${Date.now()}`,
        name: 'Custom Benchmark',
        status: 'completed',
        duration: 180,
        results: {
          throughput: 2.1 + Math.random() * 0.5,
          latency: 40 + Math.random() * 20,
          errorRate: Math.random() * 2,
          resourceUsage: 60 + Math.random() * 20,
        },
        timestamp: Date.now(),
      };
      setPerformanceTests(prev => [newTest, ...prev]);
    }, 3000);
  };

  const getMetricPerformance = (metric: BenchmarkMetric) => {
    const performance = ((metric.current - metric.baseline) / metric.baseline) * 100;
    return {
      percentage: Math.abs(performance),
      isPositive: performance > 0,
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-400';
      case 'running': return 'bg-blue-500/20 text-blue-400';
      case 'failed': return 'bg-red-500/20 text-red-400';
      default: return 'bg-white/10 text-text-muted';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Performance Benchmarking</h1>
          <p className="text-text-secondary mt-1">System performance metrics and benchmarks</p>
        </div>
        <Button variant="primary" onClick={runBenchmark} disabled={isRunningTest}>
          {isRunningTest ? '⏳ Running...' : '▶ Run Benchmark'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-white/10">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'tests', label: 'Performance Tests' },
          { id: 'resources', label: 'Resource Monitoring' },
          { id: 'comparison', label: 'Comparison' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id as any)}
            className={`px-4 py-2 transition-colors ${
              selectedTab === tab.id
                ? 'border-b-2 border-accent-primary text-accent-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {selectedTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.map((metric) => {
              const perf = getMetricPerformance(metric);
              return (
                <Card key={metric.id} variant="elevated">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="text-sm text-text-muted">{metric.name}</div>
                        <div className="text-3xl font-bold text-accent-primary mt-1">
                          {metric.current.toFixed(1)}
                          <span className="text-lg text-text-muted ml-1">{metric.unit}</span>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${perf.isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {perf.isPositive ? '+' : '-'}{perf.percentage.toFixed(1)}%
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-muted">Baseline</span>
                        <span className="text-text-secondary">{metric.baseline} {metric.unit}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-muted">Target</span>
                        <span className="text-accent-primary">{metric.target} {metric.unit}</span>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden mt-3">
                        <div
                          className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary transition-all"
                          style={{ width: `${(metric.current / metric.target) * 100}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Performance Score */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card variant="bordered">
              <CardHeader>
                <CardTitle>Overall Performance Score</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center py-8">
                <GaugeChart value={87} max={100} label="87%" size={200} />
              </CardContent>
            </Card>

            <Card variant="bordered">
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { label: 'Throughput', value: 87, change: '+12%', positive: true },
                    { label: 'Latency', value: 78, change: '-5%', positive: false },
                    { label: 'Efficiency', value: 92, change: '+8%', positive: true },
                    { label: 'Reliability', value: 95, change: '+3%', positive: true },
                  ].map((trend) => (
                    <div key={trend.label} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-text-primary">{trend.label}</span>
                        <span className={`text-xs ${trend.positive ? 'text-green-400' : 'text-red-400'}`}>
                          {trend.change}
                        </span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary"
                          style={{ width: `${trend.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Performance Tests Tab */}
      {selectedTab === 'tests' && (
        <Card variant="bordered">
          <CardHeader>
            <CardTitle>Performance Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {performanceTests.map((test) => (
                <div key={test.id} className="glass-card p-6 rounded-lg">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-medium text-text-primary">{test.name}</h4>
                      <div className="text-sm text-text-muted mt-1">
                        {new Date(test.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(test.status)}`}>
                      {test.status.toUpperCase()}
                    </span>
                  </div>

                  {test.status === 'completed' && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-white/5 rounded-lg">
                        <div className="text-xs text-text-muted">Throughput</div>
                        <div className="text-lg font-bold text-accent-primary mt-1">
                          {test.results.throughput.toFixed(2)} M/s
                        </div>
                      </div>
                      <div className="text-center p-3 bg-white/5 rounded-lg">
                        <div className="text-xs text-text-muted">Latency</div>
                        <div className="text-lg font-bold text-accent-primary mt-1">
                          {test.results.latency.toFixed(0)} ms
                        </div>
                      </div>
                      <div className="text-center p-3 bg-white/5 rounded-lg">
                        <div className="text-xs text-text-muted">Error Rate</div>
                        <div className="text-lg font-bold text-accent-primary mt-1">
                          {test.results.errorRate.toFixed(2)}%
                        </div>
                      </div>
                      <div className="text-center p-3 bg-white/5 rounded-lg">
                        <div className="text-xs text-text-muted">Resource Usage</div>
                        <div className="text-lg font-bold text-accent-primary mt-1">
                          {test.results.resourceUsage.toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  )}

                  {test.status === 'running' && (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary"></div>
                      <p className="text-sm text-text-muted mt-2">Test in progress...</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resource Monitoring Tab */}
      {selectedTab === 'resources' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[
            { name: 'CPU Usage', data: resourceMetrics.cpu, color: '#FF6B6B', unit: '%' },
            { name: 'Memory Usage', data: resourceMetrics.memory, color: '#4ECDC4', unit: '%' },
            { name: 'Network I/O', data: resourceMetrics.network, color: '#45B7D1', unit: '%' },
            { name: 'Disk I/O', data: resourceMetrics.disk, color: '#FFA07A', unit: '%' },
          ].map((resource) => (
            <Card key={resource.name} variant="bordered">
              <CardHeader>
                <CardTitle>{resource.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <TimelineChart
                    data={[{
                      name: resource.name,
                      data: resource.data,
                      color: resource.color,
                    }]}
                    categories={resourceMetrics.timestamps}
                    height={192}
                  />
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-text-muted">Current</div>
                    <div className="text-2xl font-bold text-accent-primary">
                      {resource.data[resource.data.length - 1]}{resource.unit}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-text-muted">Average</div>
                    <div className="text-2xl font-bold text-text-primary">
                      {(resource.data.reduce((a, b) => a + b, 0) / resource.data.length).toFixed(0)}{resource.unit}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-text-muted">Peak</div>
                    <div className="text-2xl font-bold text-accent-warning">
                      {Math.max(...resource.data)}{resource.unit}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Comparison Tab */}
      {selectedTab === 'comparison' && (
        <div className="space-y-6">
          <Card variant="bordered">
            <CardHeader>
              <CardTitle>Current vs Baseline Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.map((metric) => (
                  <div key={metric.id} className="glass-card p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-text-primary">{metric.name}</span>
                      <span className="text-xs text-text-muted">{metric.unit}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-xs text-text-muted mb-1">Baseline</div>
                        <div className="text-lg font-mono text-text-secondary">{metric.baseline}</div>
                      </div>
                      <div>
                        <div className="text-xs text-text-muted mb-1">Current</div>
                        <div className="text-lg font-mono text-accent-primary">{metric.current}</div>
                      </div>
                      <div>
                        <div className="text-xs text-text-muted mb-1">Target</div>
                        <div className="text-lg font-mono text-accent-secondary">{metric.target}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
