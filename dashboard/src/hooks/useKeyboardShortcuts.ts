'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts() {
  const router = useRouter();

  const shortcuts: Shortcut[] = [
    {
      key: 'h',
      ctrl: true,
      action: () => router.push('/'),
      description: 'Go to Home'
    },
    {
      key: 'd',
      ctrl: true,
      action: () => router.push('/dashboard'),
      description: 'Go to Dashboard'
    },
    {
      key: 'b',
      ctrl: true,
      action: () => router.push('/bots'),
      description: 'Go to Bots'
    },
    {
      key: 'a',
      ctrl: true,
      action: () => router.push('/attacks'),
      description: 'Go to Attacks'
    },
    {
      key: ',',
      ctrl: true,
      action: () => router.push('/settings'),
      description: 'Go to Settings'
    },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const shortcut = shortcuts.find(s => {
        const keyMatch = s.key.toLowerCase() === e.key.toLowerCase();
        const ctrlMatch = s.ctrl ? (e.ctrlKey || e.metaKey) : !e.ctrlKey && !e.metaKey;
        const shiftMatch = s.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = s.alt ? e.altKey : !e.altKey;

        return keyMatch && ctrlMatch && shiftMatch && altMatch;
      });

      if (shortcut && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        shortcut.action();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  return shortcuts;
}

export function KeyboardShortcutsHelp() {
  const shortcuts = useKeyboardShortcuts();

  return (
    <div className="glass-card p-4 rounded-lg">
      <h3 className="text-lg font-semibold text-text-primary mb-3">Keyboard Shortcuts</h3>
      <div className="space-y-2">
        {shortcuts.map((shortcut, i) => {
          return (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">{shortcut.description}</span>
              <div className="flex items-center space-x-1">
                {shortcut.ctrl && (
                  <kbd className="px-2 py-1 bg-white/5 rounded border border-white/10 text-xs">
                    ⌘
                  </kbd>
                )}
                <kbd className="px-2 py-1 bg-white/5 rounded border border-white/10 text-xs">
                  {shortcut.key.toUpperCase()}
                </kbd>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
