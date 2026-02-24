'use client';

import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui';

interface SearchResult {
  type: 'page' | 'bot' | 'attack' | 'command';
  title: string;
  description: string;
  url: string;
}

export const GlobalSearch = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);

  // Sample search data - memoized to prevent re-creation
  const searchableItems = useMemo(() => [
    { type: 'page', title: 'Dashboard', description: 'Main dashboard with 3D globe', url: '/dashboard' },
    { type: 'page', title: 'Bots', description: 'Bot management and control', url: '/bots' },
    { type: 'page', title: 'Attacks', description: 'Attack configuration and monitoring', url: '/attacks' },
    { type: 'page', title: 'Analytics', description: 'Analytics and insights', url: '/analytics' },
    { type: 'page', title: 'Settings', description: 'Configuration and preferences', url: '/settings' },
    { type: 'command', title: 'help', description: 'Show terminal help', url: '/test-terminal' },
    { type: 'command', title: 'status', description: 'Show system status', url: '/test-terminal' },
    { type: 'command', title: 'bots', description: 'List active bots', url: '/test-terminal' },
  ], []);

  // Keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Search functionality
  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    const filtered = searchableItems.filter(item =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase())
    );
    setResults(filtered);
  }, [query, searchableItems]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="glass-card px-3 py-2 rounded-lg flex items-center space-x-2 hover:bg-white/10 transition-all"
      >
        <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="text-sm text-text-muted">Search</span>
        <kbd className="px-2 py-0.5 text-xs bg-white/5 rounded border border-white/10">⌘K</kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50 backdrop-blur-sm">
      <div className="glass-card w-full max-w-2xl rounded-lg border border-white/20 shadow-2xl neon-glow">
        <div className="p-4 border-b border-white/10">
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, bots, attacks..."
            className="border-none bg-transparent"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          />
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {results.length === 0 && query && (
            <div className="p-8 text-center text-text-muted">
              No results found for &quot;{query}&quot;
            </div>
          )}
          
          {results.length === 0 && !query && (
            <div className="p-8 text-center text-text-muted">
              <p className="mb-2">Start typing to search...</p>
              <p className="text-xs">Try: dashboard, bots, attacks, settings</p>
            </div>
          )}

          {results.map((result, i) => (
            <a
              key={i}
              href={result.url}
              onClick={() => setIsOpen(false)}
              className="block p-3 rounded-lg hover:bg-white/5 transition-all group"
            >
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded flex items-center justify-center ${
                  result.type === 'page' ? 'bg-accent-primary/20' : 'bg-accent-secondary/20'
                }`}>
                  {result.type === 'page' ? (
                    <svg className="w-4 h-4 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-accent-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text-primary group-hover:text-accent-primary transition-colors">
                    {result.title}
                  </div>
                  <div className="text-xs text-text-muted truncate">
                    {result.description}
                  </div>
                </div>
                <div className="text-xs text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                  →
                </div>
              </div>
            </a>
          ))}
        </div>

        <div className="p-3 border-t border-white/10 flex items-center justify-between text-xs text-text-muted">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <kbd className="px-2 py-0.5 bg-white/5 rounded border border-white/10">↑</kbd>
              <kbd className="px-2 py-0.5 bg-white/5 rounded border border-white/10">↓</kbd>
              <span>Navigate</span>
            </div>
            <div className="flex items-center space-x-1">
              <kbd className="px-2 py-0.5 bg-white/5 rounded border border-white/10">Enter</kbd>
              <span>Select</span>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="flex items-center space-x-1 hover:text-text-primary transition-colors"
          >
            <kbd className="px-2 py-0.5 bg-white/5 rounded border border-white/10">Esc</kbd>
            <span>Close</span>
          </button>
        </div>
      </div>
    </div>
  );
};
