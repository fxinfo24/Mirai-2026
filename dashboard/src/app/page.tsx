'use client';

import Link from 'next/link';
import { Button } from '@/components/ui';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/5 via-transparent to-accent-secondary/5" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,159,0.1),transparent_50%)]" />
      
      <div className="relative z-10 text-center space-y-8 max-w-4xl">
        <h1 className="text-7xl font-display font-bold neon-text animate-pulse-slow">
          Mirai 2026
        </h1>
        <p className="text-3xl text-text-secondary font-medium">
          Next-Generation C&C Dashboard
        </p>
        
        <div className="glass-card p-8 max-w-2xl mx-auto neon-glow">
          <h2 className="text-2xl font-semibold mb-4 text-accent-secondary">
            🎨 Award-Winning Interface
          </h2>
          <p className="text-text-secondary mb-6 text-lg">
            A modern, cutting-edge command and control dashboard featuring 3D visualizations,
            real-time metrics, and an immersive cyberpunk aesthetic.
          </p>
          
          <div className="grid grid-cols-2 gap-4 text-sm mb-6">
            <div className="glass-card p-4 hover:border-accent-primary/30 transition-all">
              <div className="text-accent-primary font-mono text-lg">Next.js 14</div>
              <div className="text-text-muted">Framework</div>
            </div>
            <div className="glass-card p-4 hover:border-accent-primary/30 transition-all">
              <div className="text-accent-primary font-mono text-lg">Three.js</div>
              <div className="text-text-muted">3D Graphics</div>
            </div>
            <div className="glass-card p-4 hover:border-accent-primary/30 transition-all">
              <div className="text-accent-primary font-mono text-lg">TypeScript</div>
              <div className="text-text-muted">Type Safety</div>
            </div>
            <div className="glass-card p-4 hover:border-accent-primary/30 transition-all">
              <div className="text-accent-primary font-mono text-lg">Tailwind CSS</div>
              <div className="text-text-muted">Styling</div>
            </div>
          </div>

          <Link href="/dashboard">
            <Button variant="primary" size="lg" className="w-full">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              Enter Dashboard
            </Button>
          </Link>
        </div>
        
        <div className="flex items-center justify-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-accent-primary rounded-full animate-pulse" />
            <span className="text-text-secondary">All Systems Operational</span>
          </div>
          <div className="text-text-muted">•</div>
          <div className="text-text-secondary">
            <span className="text-accent-primary font-mono">1,234</span> Active Bots
          </div>
        </div>
        
        <p className="text-text-muted text-sm pt-4">
          For ethical security research and education only
        </p>
      </div>
    </main>
  );
}
