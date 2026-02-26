/**
 * Advanced Bot Management Utilities
 */

export interface BotTag {
  id: string;
  name: string;
  color: string;
}

export interface BotHealth {
  cpu: number;
  memory: number;
  network: number;
  uptime: number;
  lastSeen: Date;
  status: 'healthy' | 'warning' | 'critical' | 'offline';
}

export interface BotWithHealth {
  id: string;
  ip: string;
  type: string;
  location: string;
  status: 'online' | 'offline' | 'idle';
  uptime: string;
  bandwidth: string;
  tags: BotTag[];
  health: BotHealth;
  commandHistory?: CommandHistoryItem[];
  // Optional fields used by VirtualBotList for display
  arch?: string;
  lastSeen?: string;
}

export interface CommandHistoryItem {
  command: string;
  executedAt: Date;
  status: 'success' | 'failed' | 'pending';
  output?: string;
}

// Bot Tags Management
export const DEFAULT_TAGS: BotTag[] = [
  { id: 'high-performance', name: 'High Performance', color: '#00ff9f' },
  { id: 'router', name: 'Router', color: '#00d4ff' },
  { id: 'camera', name: 'Camera', color: '#ff006e' },
  { id: 'critical', name: 'Critical', color: '#ffd60a' },
  { id: 'testing', name: 'Testing', color: '#9ca3af' },
];

export function addTagToBot(botId: string, tag: BotTag): void {
  // In production, this would call an API
  console.log(`Adding tag ${tag.name} to bot ${botId}`);
}

export function removeTagFromBot(botId: string, tagId: string): void {
  console.log(`Removing tag ${tagId} from bot ${botId}`);
}

export function createCustomTag(name: string, color: string): BotTag {
  return {
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    color,
  };
}

// Bulk Operations
export interface BulkOperation {
  type: 'start' | 'stop' | 'restart' | 'update' | 'delete' | 'tag' | 'untag';
  botIds: string[];
  metadata?: Record<string, any>;
}

export async function executeBulkOperation(operation: BulkOperation): Promise<{
  success: number;
  failed: number;
  errors: string[];
}> {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const success = Math.floor(operation.botIds.length * 0.9);
  const failed = operation.botIds.length - success;
  
  return {
    success,
    failed,
    errors: failed > 0 ? [`${failed} bots failed to ${operation.type}`] : [],
  };
}

// Bot Health Monitoring
export function calculateHealthStatus(health: BotHealth): 'healthy' | 'warning' | 'critical' | 'offline' {
  const timeSinceLastSeen = Date.now() - health.lastSeen.getTime();
  
  if (timeSinceLastSeen > 300000) return 'offline'; // 5 minutes
  if (health.cpu > 90 || health.memory > 90) return 'critical';
  if (health.cpu > 70 || health.memory > 70) return 'warning';
  
  return 'healthy';
}

export function generateHealthReport(bots: BotWithHealth[]): {
  healthy: number;
  warning: number;
  critical: number;
  offline: number;
  avgCpu: number;
  avgMemory: number;
} {
  const report = {
    healthy: 0,
    warning: 0,
    critical: 0,
    offline: 0,
    avgCpu: 0,
    avgMemory: 0,
  };

  bots.forEach(bot => {
    report[bot.health.status]++;
    report.avgCpu += bot.health.cpu;
    report.avgMemory += bot.health.memory;
  });

  if (bots.length > 0) {
    report.avgCpu /= bots.length;
    report.avgMemory /= bots.length;
  }

  return report;
}

// Automated Recovery
export interface RecoveryPolicy {
  enabled: boolean;
  maxRetries: number;
  retryDelay: number; // milliseconds
  conditions: {
    cpuThreshold: number;
    memoryThreshold: number;
    offlineThreshold: number; // milliseconds
  };
}

export async function attemptBotRecovery(botId: string, policy: RecoveryPolicy): Promise<boolean> {
  console.log(`Attempting recovery for bot ${botId}`);
  
  for (let i = 0; i < policy.maxRetries; i++) {
    await new Promise(resolve => setTimeout(resolve, policy.retryDelay));
    
    // Simulate recovery attempt
    const success = Math.random() > 0.3;
    if (success) {
      console.log(`Bot ${botId} recovered on attempt ${i + 1}`);
      return true;
    }
  }
  
  console.log(`Bot ${botId} recovery failed after ${policy.maxRetries} attempts`);
  return false;
}

// Custom Commands
export interface CustomCommand {
  id: string;
  name: string;
  command: string;
  description: string;
  requiresConfirmation: boolean;
}

export const DEFAULT_COMMANDS: CustomCommand[] = [
  {
    id: 'reboot',
    name: 'Reboot',
    command: 'sudo reboot',
    description: 'Reboot the bot system',
    requiresConfirmation: true,
  },
  {
    id: 'update',
    name: 'Update',
    command: 'update.sh',
    description: 'Update bot to latest version',
    requiresConfirmation: false,
  },
  {
    id: 'scan',
    name: 'Network Scan',
    command: 'scan_network.sh',
    description: 'Scan local network',
    requiresConfirmation: false,
  },
];

export async function executeCustomCommand(
  botId: string,
  command: CustomCommand
): Promise<{ success: boolean; output: string }> {
  console.log(`Executing ${command.name} on bot ${botId}`);
  
  // Simulate command execution
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return {
    success: Math.random() > 0.1,
    output: `Command "${command.command}" executed successfully`,
  };
}
