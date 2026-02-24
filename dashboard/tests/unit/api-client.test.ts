/**
 * Unit tests for API Client
 */

import { apiClient } from '@/lib/api/client';

// Mock fetch globally
global.fetch = jest.fn();

describe('API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AI Service Endpoints', () => {
    it('should fetch bot churn prediction', async () => {
      const mockResponse = {
        rate: 15,
        risk: 'medium',
        factors: ['High detection rate'],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await apiClient.predictBotChurn();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/predict/bot-churn'),
        expect.any(Object)
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await apiClient.predictBotChurn();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should predict attack success', async () => {
      const mockResponse = {
        probability: 0.85,
        confidence: 0.92,
        recommendations: ['Use distributed sources'],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await apiClient.predictAttackSuccess({ type: 'udp' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
    });
  });

  describe('C&C Endpoints', () => {
    it('should fetch bot list', async () => {
      const mockBots = [
        { id: '1', name: 'bot-1', status: 'active' },
        { id: '2', name: 'bot-2', status: 'idle' },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBots,
      });

      const result = await apiClient.getBots();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/bots'),
        expect.any(Object)
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockBots);
    });

    it('should execute bulk operations', async () => {
      const operation = {
        type: 'restart',
        botIds: ['1', '2', '3'],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: 3, failed: 0 }),
      });

      const result = await apiClient.executeBulkOperation(operation);

      expect(result.success).toBe(true);
    });

    it('should create attack schedule', async () => {
      const schedule = {
        type: 'udp',
        target: '192.168.1.1',
        cron: '0 0 * * *',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'attack-1', ...schedule }),
      });

      const result = await apiClient.scheduleAttack(schedule);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id');
    });
  });

  describe('Webhook Management', () => {
    it('should create webhook', async () => {
      const webhook = {
        name: 'Slack Webhook',
        url: 'https://hooks.slack.com/...',
        events: ['bot.offline', 'attack.completed'],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'webhook-1', ...webhook }),
      });

      const result = await apiClient.createWebhook(webhook);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id');
    });

    it('should test webhook', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const result = await apiClient.testWebhook('webhook-1');

      expect(result.success).toBe(true);
    });
  });

  describe('Health Check', () => {
    it('should check all services health', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'healthy' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'healthy' }),
        });

      const result = await apiClient.healthCheck();

      expect(result.ai).toBe(true);
      expect(result.cnc).toBe(true);
    });
  });
});
