'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, useToast } from '@/components/ui';
import { BotWithHealth, CustomCommand } from '@/lib/botManagement';
import { CommandTemplate, DEFAULT_COMMAND_TEMPLATES, executeCustomCommand as executeCustomCommandString } from '@/lib/botManagement.extended';

interface BotCustomCommandsProps {
  bot: BotWithHealth;
  onCommandExecuted: () => void;
}

export function BotCustomCommands({ bot, onCommandExecuted }: BotCustomCommandsProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<CommandTemplate | null>(null);
  const [customCommand, setCustomCommand] = useState('');
  const [commandArgs, setCommandArgs] = useState<Record<string, string>>({});
  const [isExecuting, setIsExecuting] = useState(false);
  const { showToast } = useToast();

  const handleExecuteTemplate = async () => {
    if (!selectedTemplate) return;

    setIsExecuting(true);
    try {
      // Replace placeholders with actual values
      let command = selectedTemplate.command;
      Object.entries(commandArgs).forEach(([key, value]) => {
        command = command.replace(`{${key}}`, value);
      });

      // Execute template as string command
      await executeCustomCommandString(bot.id, command);
      showToast(`Command executed: ${selectedTemplate.name}`, 'success');
      onCommandExecuted();
    } catch (error) {
      showToast('Failed to execute command', 'error');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleExecuteCustom = async () => {
    if (!customCommand.trim()) {
      showToast('Please enter a command', 'warning');
      return;
    }

    setIsExecuting(true);
    try {
      await executeCustomCommandString(bot.id, customCommand);
      showToast('Custom command executed', 'success');
      setCustomCommand('');
      onCommandExecuted();
    } catch (error) {
      showToast('Failed to execute command', 'error');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Command Templates */}
      <Card variant="bordered">
        <CardHeader>
          <CardTitle>Command Templates</CardTitle>
          <CardDescription>
            Pre-configured commands for common operations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {DEFAULT_COMMAND_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => {
                  setSelectedTemplate(template);
                  // Initialize args with defaults
                  const args: Record<string, string> = {};
                  template.args.forEach(arg => {
                    args[arg.name] = arg.default || '';
                  });
                  setCommandArgs(args);
                }}
                className={`text-left p-4 rounded-lg border-2 transition-all ${
                  selectedTemplate?.id === template.id
                    ? 'border-accent-primary bg-accent-primary/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-text-primary">
                      {template.name}
                    </div>
                    <div className="text-xs text-text-muted mt-1">
                      {template.description}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${
                    template.riskLevel === 'low' ? 'bg-accent-primary/20 text-accent-primary' :
                    template.riskLevel === 'medium' ? 'bg-accent-warning/20 text-accent-warning' :
                    'bg-accent-danger/20 text-accent-danger'
                  }`}>
                    {template.riskLevel}
                  </span>
                </div>
                <div className="mt-2 font-mono text-xs text-text-muted bg-black/20 p-2 rounded">
                  {template.command}
                </div>
              </button>
            ))}
          </div>

          {selectedTemplate && (
            <div className="glass-card p-4 rounded-lg space-y-3">
              <h4 className="font-medium text-text-primary">
                Configure: {selectedTemplate.name}
              </h4>
              
              {selectedTemplate.args.map((arg) => (
                <Input
                  key={arg.name}
                  label={arg.label}
                  value={commandArgs[arg.name] || ''}
                  onChange={(e) => setCommandArgs({
                    ...commandArgs,
                    [arg.name]: e.target.value
                  })}
                  placeholder={arg.placeholder}
                  type={arg.type}
                />
              ))}

              <Button
                variant="primary"
                className="w-full"
                onClick={handleExecuteTemplate}
                isLoading={isExecuting}
              >
                Execute Template
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custom Command */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Custom Command</CardTitle>
          <CardDescription>
            Execute raw shell commands (use with caution)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">
              Shell Command
            </label>
            <textarea
              value={customCommand}
              onChange={(e) => setCustomCommand(e.target.value)}
              placeholder="/bin/busybox ps"
              className="w-full px-3 py-2 bg-primary-bg-secondary border border-white/10 rounded-lg text-text-primary font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary resize-none"
              rows={4}
            />
          </div>

          <div className="glass-card p-3 rounded-lg">
            <div className="flex items-start space-x-2">
              <svg className="w-4 h-4 text-accent-warning mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="text-xs text-text-muted">
                <strong className="text-accent-warning">Warning:</strong> Custom commands execute with bot privileges. Ensure you understand the impact before executing.
              </div>
            </div>
          </div>

          <Button
            variant="danger"
            className="w-full"
            onClick={handleExecuteCustom}
            isLoading={isExecuting}
          >
            Execute Custom Command
          </Button>
        </CardContent>
      </Card>

      {/* Command History */}
      <Card variant="bordered">
        <CardHeader>
          <CardTitle>Recent Commands</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {bot.commandHistory?.slice(0, 5).map((cmd, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 glass-card rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-mono text-sm text-text-primary">
                    {cmd.command}
                  </div>
                  <div className="text-xs text-text-muted mt-1">
                    {new Date(cmd.executedAt).toLocaleString()}
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${
                  cmd.status === 'success' ? 'bg-accent-primary/20 text-accent-primary' :
                  cmd.status === 'failed' ? 'bg-accent-danger/20 text-accent-danger' :
                  'bg-accent-warning/20 text-accent-warning'
                }`}>
                  {cmd.status}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
