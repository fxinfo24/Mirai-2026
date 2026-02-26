'use client';

/**
 * VirtualBotList — high-performance virtualized bot list using react-window.
 * Handles 10,000+ bots without DOM bloat by only rendering visible rows.
 */

import React, { useCallback, useMemo } from 'react';
import { List as _List, type RowComponentProps } from 'react-window';
// Cast to any to avoid react-window v2 type conflicts with TS generics
const List = _List as any; // eslint-disable-line
import { AutoSizer } from 'react-virtualized-auto-sizer';
import type { BotWithHealth } from '@/lib/botManagement';

// ─── Types ────────────────────────────────────────────────────────────────────

interface VirtualBotListProps {
  bots: BotWithHealth[];
  selectedBots: string[];
  onSelectBot: (id: string, checked: boolean) => void;
  onSelectAll: () => void;
  rowHeight?: number;
  listHeight?: number;
}

// ─── Status badge helper ──────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    online:  'bg-green-500/20 text-green-400 border border-green-500/30',
    idle:    'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    offline: 'bg-red-500/20 text-red-400 border border-red-500/30',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-mono ${colors[status] ?? colors.offline}`}>
      {status}
    </span>
  );
}

// ─── Row renderer (memoized to prevent unnecessary re-renders) ────────────────

interface RowData {
  bots: BotWithHealth[];
  selectedBots: string[];
  onSelectBot: (id: string, checked: boolean) => void;
}

const BotRow = React.memo(function BotRow(
  props: RowComponentProps<RowData>
): React.ReactElement | null {
  const { index, style } = props;
  const data = (props as any).rowProps as RowData;
  const { bots, selectedBots, onSelectBot } = data;
  const bot = bots[index];
  const isSelected = selectedBots.includes(bot.id);

  return (
    <div
      style={style}
      className={`flex items-center px-4 border-b border-white/5 transition-colors
        ${isSelected ? 'bg-neon-cyan/5' : 'hover:bg-white/3'}`}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={e => onSelectBot(bot.id, e.target.checked)}
        className="mr-3 accent-neon-cyan"
        aria-label={`Select bot ${bot.id}`}
      />

      {/* Status dot */}
      <span className={`w-2 h-2 rounded-full mr-3 flex-shrink-0 ${
        bot.status === 'online'  ? 'bg-green-400 shadow-[0_0_6px_#4ade80]' :
        bot.status === 'idle'    ? 'bg-yellow-400' : 'bg-red-400'
      }`} />

      {/* IP */}
      <span className="font-mono text-sm text-text-primary w-36 flex-shrink-0">
        {bot.ip}
      </span>

      {/* Status badge */}
      <div className="w-20 flex-shrink-0">
        <StatusBadge status={bot.status} />
      </div>

      {/* Architecture */}
      <span className="text-xs text-text-muted w-16 flex-shrink-0 font-mono">
        {bot.arch ?? '—'}
      </span>

      {/* CPU bar */}
      <div className="flex-1 mx-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-neon-cyan/70 rounded-full transition-all"
              style={{ width: `${bot.health?.cpu ?? 0}%` }}
            />
          </div>
          <span className="text-xs text-text-muted w-8 text-right font-mono">
            {bot.health?.cpu ?? 0}%
          </span>
        </div>
      </div>

      {/* RAM bar */}
      <div className="w-28 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-400/70 rounded-full transition-all"
              style={{ width: `${bot.health?.memory ?? 0}%` }}
            />
          </div>
          <span className="text-xs text-text-muted w-8 text-right font-mono">
            {bot.health?.memory ?? 0}%
          </span>
        </div>
      </div>

      {/* Last seen */}
      <span className="text-xs text-text-muted w-24 text-right flex-shrink-0">
        {bot.lastSeen ?? '—'}
      </span>
    </div>
  );
});

BotRow.displayName = 'BotRow';

// ─── Main component ───────────────────────────────────────────────────────────

export function VirtualBotList({
  bots,
  selectedBots,
  onSelectBot,
  onSelectAll,
  rowHeight = 48,
  listHeight = 520,
}: VirtualBotListProps) {
  const itemData = useMemo<RowData>(
    () => ({ bots, selectedBots, onSelectBot }),
    [bots, selectedBots, onSelectBot]
  );

  const allSelected = bots.length > 0 && selectedBots.length === bots.length;

  return (
    <div className="flex flex-col border border-white/10 rounded-lg overflow-hidden bg-black/20">
      {/* Header */}
      <div className="flex items-center px-4 py-2 bg-white/5 border-b border-white/10 text-xs text-text-muted font-semibold uppercase tracking-wider">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={onSelectAll}
          className="mr-3 accent-neon-cyan"
          aria-label="Select all bots"
        />
        <span className="w-2 h-2 mr-3 flex-shrink-0" />
        <span className="w-36 flex-shrink-0">IP Address</span>
        <span className="w-20 flex-shrink-0">Status</span>
        <span className="w-16 flex-shrink-0">Arch</span>
        <span className="flex-1 mx-4">CPU</span>
        <span className="w-28 flex-shrink-0">RAM</span>
        <span className="w-24 text-right flex-shrink-0">Last Seen</span>
      </div>

      {/* Count bar */}
      <div className="px-4 py-1.5 bg-black/10 border-b border-white/5 text-xs text-text-muted">
        Showing <span className="text-neon-cyan font-mono">{bots.length.toLocaleString()}</span> bots
        {selectedBots.length > 0 && (
          <span className="ml-2 text-yellow-400">
            · {selectedBots.length.toLocaleString()} selected
          </span>
        )}
      </div>

      {/* Virtualized list */}
      {bots.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-text-muted text-sm">
          No bots connected
        </div>
      ) : (
        <AutoSizer
          renderProp={({ width }) => (
            <List
              height={listHeight}
              width={width || 0}
              rowCount={bots.length}
              rowHeight={rowHeight}
              rowComponent={BotRow as any}
              rowProps={itemData}
              overscanCount={5}
            />
          )}
        />
      )}
    </div>
  );
}

export default VirtualBotList;
