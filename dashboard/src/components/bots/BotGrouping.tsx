'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, useToast } from '@/components/ui';
import type { Bot } from '@/lib/botManagement';
import { BotGroup, createGroup, addBotToGroup, removeBotFromGroup } from '@/lib/botManagement.extended';

interface BotGroupingProps {
  bots: Bot[];
  groups: BotGroup[];
  onGroupUpdate: () => void;
}

export function BotGrouping({ bots, groups, onGroupUpdate }: BotGroupingProps) {
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<BotGroup | null>(null);
  const { showToast } = useToast();

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      showToast('Group name is required', 'warning');
      return;
    }

    try {
      await createGroup(newGroupName);
      showToast('Group created successfully', 'success');
      setNewGroupName('');
      setIsCreatingGroup(false);
      onGroupUpdate();
    } catch (error) {
      showToast('Failed to create group', 'error');
    }
  };

  const handleAddBot = async (botId: string, groupId: string) => {
    try {
      await addBotToGroup(botId, groupId);
      showToast('Bot added to group', 'success');
      onGroupUpdate();
    } catch (error) {
      showToast('Failed to add bot to group', 'error');
    }
  };

  const handleRemoveBot = async (botId: string, groupId: string) => {
    try {
      await removeBotFromGroup(botId, groupId);
      showToast('Bot removed from group', 'success');
      onGroupUpdate();
    } catch (error) {
      showToast('Failed to remove bot from group', 'error');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Groups List */}
      <Card variant="bordered" className="lg:col-span-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Bot Groups</CardTitle>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreatingGroup(true)}
            >
              + New Group
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isCreatingGroup && (
            <div className="mb-4 space-y-2">
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Group name"
                onKeyPress={(e) => e.key === 'Enter' && handleCreateGroup()}
              />
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCreateGroup}
                  className="flex-1"
                >
                  Create
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsCreatingGroup(false);
                    setNewGroupName('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => setSelectedGroup(group)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  selectedGroup?.id === group.id
                    ? 'border-accent-primary bg-accent-primary/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-text-primary">{group.name}</div>
                    <div className="text-xs text-text-muted">
                      {group.botIds.length} bot{group.botIds.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {group.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-white/5 rounded text-xs text-text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Group Details */}
      <Card variant="elevated" className="lg:col-span-2">
        <CardHeader>
          <CardTitle>
            {selectedGroup ? selectedGroup.name : 'Select a group'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedGroup ? (
            <div className="space-y-4">
              {/* Group Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="glass-card p-3 rounded-lg">
                  <div className="text-xs text-text-muted">Total Bots</div>
                  <div className="text-2xl font-bold text-text-primary mt-1">
                    {selectedGroup.botIds.length}
                  </div>
                </div>
                <div className="glass-card p-3 rounded-lg">
                  <div className="text-xs text-text-muted">Active</div>
                  <div className="text-2xl font-bold text-accent-primary mt-1">
                    {bots.filter(b => selectedGroup.botIds.includes(b.id) && b.status === 'active').length}
                  </div>
                </div>
                <div className="glass-card p-3 rounded-lg">
                  <div className="text-xs text-text-muted">Offline</div>
                  <div className="text-2xl font-bold text-text-muted mt-1">
                    {bots.filter(b => selectedGroup.botIds.includes(b.id) && b.status === 'offline').length}
                  </div>
                </div>
              </div>

              {/* Bots in Group */}
              <div>
                <h3 className="text-sm font-medium text-text-secondary mb-2">
                  Bots in this group
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {selectedGroup.botIds.map((botId) => {
                    const bot = bots.find(b => b.id === botId);
                    if (!bot) return null;

                    return (
                      <div
                        key={bot.id}
                        className="flex items-center justify-between p-3 glass-card rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full ${
                            bot.status === 'active' ? 'bg-accent-primary' :
                            bot.status === 'idle' ? 'bg-accent-warning' :
                            'bg-text-muted'
                          }`} />
                          <div>
                            <div className="text-sm font-medium text-text-primary">
                              {bot.name}
                            </div>
                            <div className="text-xs text-text-muted">
                              {bot.ip} • {bot.location}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveBot(bot.id, selectedGroup.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Available Bots to Add */}
              <div>
                <h3 className="text-sm font-medium text-text-secondary mb-2">
                  Available bots
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {bots
                    .filter(bot => !selectedGroup.botIds.includes(bot.id))
                    .map((bot) => (
                      <div
                        key={bot.id}
                        className="flex items-center justify-between p-3 glass-card rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full ${
                            bot.status === 'active' ? 'bg-accent-primary' :
                            bot.status === 'idle' ? 'bg-accent-warning' :
                            'bg-text-muted'
                          }`} />
                          <div>
                            <div className="text-sm font-medium text-text-primary">
                              {bot.name}
                            </div>
                            <div className="text-xs text-text-muted">
                              {bot.ip} • {bot.location}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleAddBot(bot.id, selectedGroup.id)}
                        >
                          Add
                        </Button>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-text-muted">
              Select a group to view details
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
