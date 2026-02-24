'use client';

import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/Card';

interface TerminalLine {
  type: 'input' | 'output' | 'error' | 'success';
  content: string;
  timestamp?: Date;
}

interface TerminalProps {
  onCommand?: (command: string) => Promise<string>;
  initialLines?: TerminalLine[];
  prompt?: string;
}

export const Terminal = ({ 
  onCommand, 
  initialLines = [], 
  prompt = 'mirai@c2:~$' 
}: TerminalProps) => {
  const [lines, setLines] = useState<TerminalLine[]>([
    { type: 'success', content: 'Mirai C&C Terminal v2.0' },
    { type: 'output', content: 'Type "help" for available commands' },
    { type: 'output', content: '' },
    ...initialLines,
  ]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleCommand = async (cmd: string) => {
    const trimmedCmd = cmd.trim();
    if (!trimmedCmd) return;

    // Add command to history
    setHistory(prev => [...prev, trimmedCmd]);
    setHistoryIndex(-1);

    // Add input line
    setLines(prev => [...prev, { type: 'input', content: trimmedCmd }]);
    setInput('');
    setIsProcessing(true);

    try {
      // Built-in commands
      let response = '';
      
      switch (trimmedCmd.toLowerCase()) {
        case 'help':
          response = `Available commands:
  help           - Show this help message
  status         - Show system status
  bots           - List active bots
  attacks        - Show active attacks
  scan <target>  - Scan a target
  clear          - Clear terminal
  exit           - Close terminal`;
          break;
        
        case 'status':
          response = `System Status:
  Active Bots:    1,234
  Active Attacks: 42
  Uptime:         72h 15m
  Memory:         2.4GB / 8GB
  CPU:            45%`;
          break;
        
        case 'bots':
          response = `Active Bots (Top 5):
  192.168.1.100 - Router    - Online 2h
  10.0.0.50     - Camera    - Online 5h
  172.16.0.20   - DVR       - Online 1h
  192.168.0.45  - IoT       - Online 12h
  10.10.10.10   - Router    - Online 3h`;
          break;
        
        case 'attacks':
          response = `Active Attacks:
  UDP Flood  -> 203.0.113.0   - 2.5 Gbps
  SYN Flood  -> 198.51.100.0  - 1.8 Gbps
  HTTP Flood -> example.com   - 50k req/s`;
          break;
        
        case 'clear':
          setLines([]);
          setIsProcessing(false);
          return;
        
        case 'exit':
          response = 'Goodbye!';
          break;
        
        default:
          if (trimmedCmd.startsWith('scan ')) {
            const target = trimmedCmd.substring(5).trim();
            response = `Scanning ${target}...
  Port 22:  Open (SSH)
  Port 80:  Open (HTTP)
  Port 443: Open (HTTPS)
  Port 23:  Closed
  Scan complete.`;
          } else if (onCommand) {
            response = await onCommand(trimmedCmd);
          } else {
            response = `Unknown command: ${trimmedCmd}. Type "help" for available commands.`;
          }
      }

      // Add response
      setLines(prev => [
        ...prev,
        { type: response.includes('Unknown') || response.includes('Error') ? 'error' : 'output', content: response }
      ]);
    } catch (error) {
      setLines(prev => [
        ...prev,
        { type: 'error', content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCommand(input);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= history.length) {
          setHistoryIndex(-1);
          setInput('');
        } else {
          setHistoryIndex(newIndex);
          setInput(history[newIndex]);
        }
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Auto-complete (basic implementation)
      const commands = ['help', 'status', 'bots', 'attacks', 'scan', 'clear', 'exit'];
      const matches = commands.filter(cmd => cmd.startsWith(input.toLowerCase()));
      if (matches.length === 1) {
        setInput(matches[0]);
      }
    }
  };

  return (
    <Card className="h-full flex flex-col bg-black/80 font-mono text-sm">
      {/* Terminal output */}
      <div
        ref={terminalRef}
        className="flex-1 overflow-y-auto p-4 space-y-1"
        onClick={() => inputRef.current?.focus()}
      >
        {lines.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap break-words">
            {line.type === 'input' && (
              <div className="flex items-start space-x-2">
                <span className="text-accent-primary">{prompt}</span>
                <span className="text-text-primary">{line.content}</span>
              </div>
            )}
            {line.type === 'output' && (
              <div className="text-text-secondary">{line.content}</div>
            )}
            {line.type === 'error' && (
              <div className="text-accent-danger">{line.content}</div>
            )}
            {line.type === 'success' && (
              <div className="text-accent-primary">{line.content}</div>
            )}
          </div>
        ))}
        
        {/* Current input line */}
        <div className="flex items-center space-x-2">
          <span className="text-accent-primary">{prompt}</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isProcessing}
            className="flex-1 bg-transparent text-text-primary outline-none border-none"
            spellCheck={false}
            autoComplete="off"
          />
          {isProcessing && (
            <span className="text-accent-secondary animate-pulse">...</span>
          )}
        </div>
      </div>
    </Card>
  );
};
