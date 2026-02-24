'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';

export function DebugPanel() {
  const [debugMode, setDebugMode] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [networkLogs, setNetworkLogs] = useState<any[]>([]);

  const toggleDebug = () => {
    setDebugMode(!debugMode);
    if (!debugMode) {
      // Start capturing logs
      captureConsoleLogs();
      captureNetworkRequests();
    }
  };

  const captureConsoleLogs = () => {
    const originalConsole = { ...console };
    console.log = (...args) => {
      setLogs(prev => [...prev, `[LOG] ${args.join(' ')}`].slice(-50));
      originalConsole.log(...args);
    };
    console.error = (...args) => {
      setLogs(prev => [...prev, `[ERROR] ${args.join(' ')}`].slice(-50));
      originalConsole.error(...args);
    };
  };

  const captureNetworkRequests = () => {
    // Mock network capture
    setNetworkLogs([
      { method: 'GET', url: '/api/bots', status: 200, time: 45 },
      { method: 'POST', url: '/api/attacks', status: 201, time: 123 },
      { method: 'WS', url: 'ws://localhost:3001', status: 101, time: 0 },
    ]);
  };

  return (
    <div className="space-y-6">
      <Card variant="bordered">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Developer Debug Panel</CardTitle>
            <Button
              variant={debugMode ? 'danger' : 'primary'}
              size="sm"
              onClick={toggleDebug}
            >
              {debugMode ? 'Disable Debug' : 'Enable Debug'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {debugMode ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Console Logs */}
              <div className="glass-card p-4 rounded-lg">
                <h3 className="text-sm font-medium text-text-primary mb-2">Console Logs</h3>
                <div className="bg-black/40 rounded p-2 h-64 overflow-y-auto font-mono text-xs">
                  {logs.map((log, idx) => (
                    <div key={idx} className={`${log.includes('ERROR') ? 'text-accent-danger' : 'text-text-muted'}`}>
                      {log}
                    </div>
                  ))}
                </div>
              </div>

              {/* Network Inspector */}
              <div className="glass-card p-4 rounded-lg">
                <h3 className="text-sm font-medium text-text-primary mb-2">Network Requests</h3>
                <div className="space-y-2">
                  {networkLogs.map((req, idx) => (
                    <div key={idx} className="bg-black/40 rounded p-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className={`font-mono ${
                          req.method === 'GET' ? 'text-accent-primary' :
                          req.method === 'POST' ? 'text-accent-warning' :
                          'text-accent-info'
                        }`}>
                          {req.method}
                        </span>
                        <span className={`${
                          req.status < 300 ? 'text-accent-primary' :
                          req.status < 400 ? 'text-accent-warning' :
                          'text-accent-danger'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                      <div className="text-text-muted mt-1">{req.url}</div>
                      <div className="text-text-muted">{req.time}ms</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* State Inspector */}
              <div className="glass-card p-4 rounded-lg">
                <h3 className="text-sm font-medium text-text-primary mb-2">Redux State</h3>
                <Button variant="secondary" size="sm" className="w-full">
                  Open Redux DevTools
                </Button>
              </div>

              {/* Performance Metrics */}
              <div className="glass-card p-4 rounded-lg">
                <h3 className="text-sm font-medium text-text-primary mb-2">Performance</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-text-muted">FPS:</span>
                    <span className="text-accent-primary font-mono">60</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Memory:</span>
                    <span className="text-text-primary font-mono">45 MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Bundle Size:</span>
                    <span className="text-text-primary font-mono">1.2 MB</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-text-muted">
              Enable debug mode to view developer tools
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
