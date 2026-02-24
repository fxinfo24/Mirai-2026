export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center space-y-8">
        <h1 className="text-6xl font-display font-bold neon-text animate-pulse-slow">
          Mirai 2026
        </h1>
        <p className="text-2xl text-text-secondary">
          C&C Dashboard - Coming Soon
        </p>
        <div className="glass-card p-8 max-w-2xl mx-auto">
          <h2 className="text-xl font-semibold mb-4 text-accent-secondary">
            🎨 Award-Submission Quality Interface
          </h2>
          <p className="text-text-secondary mb-6">
            A modern, cutting-edge command and control dashboard featuring 3D visualizations,
            real-time metrics, and an immersive cyberpunk aesthetic.
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="glass-card p-4">
              <div className="text-accent-primary font-mono">Next.js 14</div>
              <div className="text-text-muted">Framework</div>
            </div>
            <div className="glass-card p-4">
              <div className="text-accent-primary font-mono">Three.js</div>
              <div className="text-text-muted">3D Graphics</div>
            </div>
            <div className="glass-card p-4">
              <div className="text-accent-primary font-mono">TypeScript</div>
              <div className="text-text-muted">Type Safety</div>
            </div>
            <div className="glass-card p-4">
              <div className="text-accent-primary font-mono">Tailwind CSS</div>
              <div className="text-text-muted">Styling</div>
            </div>
          </div>
        </div>
        <p className="text-text-muted text-sm">
          For ethical security research and education only
        </p>
      </div>
    </main>
  );
}
