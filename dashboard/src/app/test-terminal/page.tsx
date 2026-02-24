'use client';

import { Terminal } from '@/components/terminal';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';

export default function TestTerminalPage() {
  return (
    <div className="min-h-screen bg-primary-bg p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Terminal Component Test Page</CardTitle>
            <CardDescription>
              Interactive testing for the Terminal component
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="h-[600px]">
          <Terminal />
        </div>

        <Card className="p-4">
          <h3 className="text-lg font-semibold text-text-primary mb-2">Test Commands:</h3>
          <ul className="text-sm text-text-secondary space-y-1 font-mono">
            <li>• help - Show available commands</li>
            <li>• status - Display system status</li>
            <li>• bots - List active bots</li>
            <li>• attacks - Show active attacks</li>
            <li>• scan &lt;target&gt; - Scan a target</li>
            <li>• clear - Clear terminal</li>
            <li>• exit - Exit terminal</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
