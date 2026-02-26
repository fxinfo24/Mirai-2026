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
      key: 'p',
      ctrl: true,
      action: () => router.push('/performance'),
      description: 'Go to Performance'
    },
    {
      key: 'a',
      ctrl: true,
      shift: true,
      action: () => router.push('/admin'),
      description: 'Go to Admin'
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
