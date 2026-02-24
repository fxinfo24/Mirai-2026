'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';

interface TopologyNode {
  id: string;
  type: 'bot' | 'proxy' | 'target' | 'cnc';
  label: string;
  status: 'active' | 'idle' | 'offline';
}

interface TopologyLink {
  source: string;
  target: string;
  strength: number;
}

interface NetworkTopologyProps {
  nodes: TopologyNode[];
  links: TopologyLink[];
}

export function NetworkTopology({ nodes, links }: NetworkTopologyProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = rect.width;
    const height = rect.height;

    // Simple force-directed layout simulation
    const nodePositions = new Map<string, { x: number; y: number }>();
    
    // Initialize positions
    nodes.forEach((node, idx) => {
      const angle = (idx / nodes.length) * Math.PI * 2;
      const radius = Math.min(width, height) / 3;
      nodePositions.set(node.id, {
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
      });
    });

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw links
    links.forEach(link => {
      const source = nodePositions.get(link.source);
      const target = nodePositions.get(link.target);
      if (!source || !target) return;

      ctx.strokeStyle = `rgba(0, 255, 159, ${link.strength / 100})`;
      ctx.lineWidth = Math.max(link.strength / 20, 1);
      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
    });

    // Draw nodes
    nodes.forEach(node => {
      const pos = nodePositions.get(node.id);
      if (!pos) return;

      const isHovered = hoveredNode === node.id;
      const radius = isHovered ? 25 : 20;

      // Node color based on type
      const colors = {
        bot: '#00ff9f',
        proxy: '#00d4ff',
        target: '#ff006e',
        cnc: '#ffd60a',
      };

      // Status indicator
      const statusColors = {
        active: colors[node.type],
        idle: '#9ca3af',
        offline: '#4b5563',
      };

      // Outer glow
      if (node.status === 'active') {
        const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius * 2);
        gradient.addColorStop(0, `${colors[node.type]}40`);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fillRect(pos.x - radius * 2, pos.y - radius * 2, radius * 4, radius * 4);
      }

      // Node circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = statusColors[node.status];
      ctx.fill();
      ctx.strokeStyle = isHovered ? '#ffffff' : colors[node.type];
      ctx.lineWidth = isHovered ? 3 : 2;
      ctx.stroke();

      // Label
      ctx.fillStyle = '#ffffff';
      ctx.font = isHovered ? 'bold 12px monospace' : '10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.label, pos.x, pos.y + radius + 15);
    });
  }, [nodes, links, hoveredNode]);

  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle>Network Topology</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative w-full" style={{ height: '500px' }}>
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-pointer"
          />
        </div>

        {/* Legend */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-accent-primary" />
            <span className="text-text-muted">Bot</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#00d4ff' }} />
            <span className="text-text-muted">Proxy</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#ff006e' }} />
            <span className="text-text-muted">Target</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#ffd60a' }} />
            <span className="text-text-muted">C&C</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
