/**
 * Attack Scheduling & Templates
 */

export interface AttackTemplate {
  id: string;
  name: string;
  type: 'UDP Flood' | 'TCP SYN' | 'HTTP Flood' | 'DNS Amplification';
  description: string;
  defaultDuration: number; // seconds
  defaultBandwidth: number; // Mbps
  defaultPort: number;
  tags: string[];
}

export interface ScheduledAttack {
  id: string;
  templateId: string;
  target: string;
  cronExpression: string;
  enabled: boolean;
  nextRun: Date;
  lastRun?: Date;
  executionCount: number;
  successCount: number;
  failCount: number;
}

export interface AttackHistory {
  id: string;
  attackId: string;
  templateName: string;
  target: string;
  startTime: Date;
  endTime: Date;
  status: 'success' | 'failed' | 'aborted';
  bandwidth: string;
  packets: string;
  duration: string;
  successRate: number;
}

// Attack Templates
export const DEFAULT_TEMPLATES: AttackTemplate[] = [
  {
    id: 'udp-standard',
    name: 'UDP Flood - Standard',
    type: 'UDP Flood',
    description: 'Standard UDP flood attack',
    defaultDuration: 300,
    defaultBandwidth: 1000,
    defaultPort: 80,
    tags: ['standard', 'udp'],
  },
  {
    id: 'tcp-syn-heavy',
    name: 'TCP SYN - Heavy',
    type: 'TCP SYN',
    description: 'Heavy TCP SYN flood',
    defaultDuration: 600,
    defaultBandwidth: 2000,
    defaultPort: 443,
    tags: ['heavy', 'tcp'],
  },
  {
    id: 'http-distributed',
    name: 'HTTP Flood - Distributed',
    type: 'HTTP Flood',
    description: 'Distributed HTTP flood',
    defaultDuration: 900,
    defaultBandwidth: 500,
    defaultPort: 80,
    tags: ['distributed', 'http'],
  },
];

// Cron Expression Parser
export function parseCronExpression(cron: string): string {
  // Simple parser for common patterns
  const patterns: Record<string, string> = {
    '* * * * *': 'Every minute',
    '0 * * * *': 'Every hour',
    '0 0 * * *': 'Daily at midnight',
    '0 0 * * 0': 'Weekly on Sunday',
    '0 0 1 * *': 'Monthly on the 1st',
  };
  
  return patterns[cron] || `Custom: ${cron}`;
}

export function calculateNextRun(cronExpression: string): Date {
  // Simplified calculation - in production use a library like node-cron
  const now = new Date();
  
  if (cronExpression === '* * * * *') {
    // Every minute
    return new Date(now.getTime() + 60000);
  } else if (cronExpression === '0 * * * *') {
    // Every hour
    const next = new Date(now);
    next.setHours(next.getHours() + 1, 0, 0, 0);
    return next;
  } else if (cronExpression === '0 0 * * *') {
    // Daily at midnight
    const next = new Date(now);
    next.setDate(next.getDate() + 1);
    next.setHours(0, 0, 0, 0);
    return next;
  }
  
  // Default: 1 hour from now
  return new Date(now.getTime() + 3600000);
}

// Success Rate Prediction
export function predictAttackSuccess(
  template: AttackTemplate,
  target: string,
  historicalData: AttackHistory[]
): {
  probability: number;
  confidence: number;
  factors: string[];
} {
  // Filter relevant historical data
  const relevant = historicalData.filter(
    h => h.templateName === template.name
  );
  
  if (relevant.length === 0) {
    return {
      probability: 0.5,
      confidence: 0.3,
      factors: ['No historical data available'],
    };
  }
  
  const successRate = relevant.filter(h => h.status === 'success').length / relevant.length;
  const confidence = Math.min(relevant.length / 10, 1);
  
  const factors: string[] = [];
  if (successRate > 0.8) factors.push('High historical success rate');
  if (relevant.length > 20) factors.push('Sufficient historical data');
  if (successRate < 0.5) factors.push('Low success rate - may need adjustments');
  
  return {
    probability: successRate,
    confidence,
    factors,
  };
}

// Resource Optimization
export interface ResourceOptimization {
  recommendedBots: number;
  recommendedBandwidth: number;
  estimatedCost: number;
  efficiency: number;
  suggestions: string[];
}

export function optimizeAttackResources(
  template: AttackTemplate,
  target: string,
  availableBots: number
): ResourceOptimization {
  const targetBandwidth = template.defaultBandwidth;
  const bandwidthPerBot = 100; // Mbps per bot
  const recommendedBots = Math.min(
    Math.ceil(targetBandwidth / bandwidthPerBot),
    availableBots
  );
  
  const actualBandwidth = recommendedBots * bandwidthPerBot;
  const efficiency = Math.min(actualBandwidth / targetBandwidth, 1);
  
  const suggestions: string[] = [];
  if (recommendedBots === availableBots && efficiency < 1) {
    suggestions.push('Need more bots to reach target bandwidth');
  }
  if (efficiency > 1.2) {
    suggestions.push('Consider reducing bot count to save resources');
  }
  if (template.type === 'HTTP Flood') {
    suggestions.push('HTTP floods are more effective with distributed bots');
  }
  
  return {
    recommendedBots,
    recommendedBandwidth: actualBandwidth,
    estimatedCost: recommendedBots * 0.01, // $0.01 per bot
    efficiency,
    suggestions,
  };
}

// Attack Playback
export async function replayAttack(historyId: string): Promise<boolean> {
  console.log(`Replaying attack ${historyId}`);
  // Simulate replay
  await new Promise(resolve => setTimeout(resolve, 1000));
  return Math.random() > 0.1;
}

// Attack History Items
export interface AttackHistoryItem {
  id: string;
  type: string;
  target: string;
  port: number;
  duration: number;
  bandwidth: string;
  botsUsed: number;
  status: 'completed' | 'failed' | 'running' | 'scheduled';
  successRate: number;
  timestamp: Date;
  method?: string;
  metrics?: {
    packetsSent: number;
    dataSent: string;
    avgResponseTime: number;
    targetDowntime: number;
  };
}
