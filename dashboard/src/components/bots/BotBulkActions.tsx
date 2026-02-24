'use client';

import { useState } from 'react';
import { Button, useToast } from '@/components/ui';
import { executeBulkOperation, BulkOperation } from '@/lib/botManagement';

interface BotBulkActionsProps {
  selectedBots: string[];
  onComplete: () => void;
}

export function BotBulkActions({ selectedBots, onComplete }: BotBulkActionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  const handleBulkOperation = async (type: BulkOperation['type']) => {
    if (selectedBots.length === 0) {
      showToast('No bots selected', 'warning');
      return;
    }

    setIsLoading(true);

    try {
      const result = await executeBulkOperation({
        type,
        botIds: selectedBots,
      });

      if (result.success > 0) {
        showToast(
          `${type} operation completed: ${result.success} succeeded, ${result.failed} failed`,
          result.failed === 0 ? 'success' : 'warning'
        );
      }

      if (result.errors.length > 0) {
        result.errors.forEach(error => showToast(error, 'error'));
      }

      onComplete();
    } catch (error) {
      showToast('Bulk operation failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (selectedBots.length === 0) {
    return null;
  }

  return (
    <div className="glass-card px-4 py-3 rounded-lg flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <span className="text-sm text-text-primary font-medium">
          {selectedBots.length} bot{selectedBots.length > 1 ? 's' : ''} selected
        </span>
      </div>

      <div className="flex items-center space-x-2">
        <Button
          variant="primary"
          size="sm"
          onClick={() => handleBulkOperation('start')}
          isLoading={isLoading}
        >
          Start
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleBulkOperation('stop')}
          isLoading={isLoading}
        >
          Stop
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleBulkOperation('restart')}
          isLoading={isLoading}
        >
          Restart
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={() => handleBulkOperation('delete')}
          isLoading={isLoading}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
