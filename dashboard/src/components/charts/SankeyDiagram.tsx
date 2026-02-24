'use client';

import { useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';

interface SankeyNode {
  id: string;
  label: string;
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

interface SankeyDiagramProps {
  title: string;
  description?: string;
  nodes: SankeyNode[];
  links: SankeyLink[];
}

export function SankeyDiagram({ title, description, nodes, links }: SankeyDiagramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = rect.width;
    const height = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate node positions
    const nodeMap = new Map<string, { x: number; y: number; height: number }>();
    const layers = new Map<number, string[]>();

    // Group nodes into layers based on their connections
    nodes.forEach((node, idx) => {
      const layer = Math.floor((idx / nodes.length) * 3); // Simple 3-column layout
      if (!layers.has(layer)) layers.set(layer, []);
      layers.get(layer)!.push(node.id);
    });

    // Position nodes
    const layerWidth = width / (layers.size + 1);
    layers.forEach((nodeIds, layer) => {
      const layerHeight = height / (nodeIds.length + 1);
      nodeIds.forEach((nodeId, idx) => {
        // Calculate total value for node height
        const incomingValue = links
          .filter(l => l.target === nodeId)
          .reduce((sum, l) => sum + l.value, 0);
        const outgoingValue = links
          .filter(l => l.source === nodeId)
          .reduce((sum, l) => sum + l.value, 0);
        const totalValue = Math.max(incomingValue, outgoingValue, 10);

        nodeMap.set(nodeId, {
          x: layerWidth * (layer + 1),
          y: layerHeight * (idx + 1),
          height: Math.min(totalValue * 2, height / nodeIds.length * 0.8),
        });
      });
    });

    // Draw links
    links.forEach(link => {
      const source = nodeMap.get(link.source);
      const target = nodeMap.get(link.target);
      if (!source || !target) return;

      const linkHeight = link.value * 2;
      
      // Create gradient
      const gradient = ctx.createLinearGradient(source.x, 0, target.x, 0);
      gradient.addColorStop(0, 'rgba(0, 255, 159, 0.3)');
      gradient.addColorStop(1, 'rgba(0, 212, 255, 0.3)');

      ctx.fillStyle = gradient;
      ctx.strokeStyle = 'rgba(0, 255, 159, 0.5)';
      ctx.lineWidth = 1;

      // Draw curved path
      ctx.beginPath();
      ctx.moveTo(source.x + 40, source.y - linkHeight / 2);
      
      const cp1x = source.x + (target.x - source.x) / 2;
      const cp1y = source.y;
      const cp2x = source.x + (target.x - source.x) / 2;
      const cp2y = target.y;
      
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, target.x - 40, target.y - linkHeight / 2);
      ctx.lineTo(target.x - 40, target.y + linkHeight / 2);
      ctx.bezierCurveTo(cp2x, cp2y, cp1x, cp1y, source.x + 40, source.y + linkHeight / 2);
      ctx.closePath();
      
      ctx.fill();
      ctx.stroke();
    });

    // Draw nodes
    nodeMap.forEach((pos, nodeId) => {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;

      // Draw node rectangle
      const nodeWidth = 80;
      const x = pos.x - nodeWidth / 2;
      const y = pos.y - pos.height / 2;

      // Gradient background
      const gradient = ctx.createLinearGradient(x, y, x, y + pos.height);
      gradient.addColorStop(0, 'rgba(0, 255, 159, 0.8)');
      gradient.addColorStop(1, 'rgba(0, 212, 255, 0.8)');

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, nodeWidth, pos.height);

      // Border
      ctx.strokeStyle = '#00ff9f';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, nodeWidth, pos.height);

      // Label
      ctx.fillStyle = '#0a0e27';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.label, pos.x, pos.y);

      // Value label below
      const totalValue = links
        .filter(l => l.source === nodeId || l.target === nodeId)
        .reduce((sum, l) => sum + l.value, 0);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px monospace';
      ctx.fillText(totalValue.toString(), pos.x, pos.y + pos.height / 2 + 15);
    });
  }, [nodes, links]);

  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="relative w-full" style={{ height: '400px' }}>
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{ background: 'transparent' }}
          />
        </div>
        
        {/* Legend */}
        <div className="mt-4 flex items-center justify-center space-x-6 text-xs text-text-muted">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded" style={{ background: 'linear-gradient(to right, rgba(0, 255, 159, 0.8), rgba(0, 212, 255, 0.8))' }} />
            <span>Data Flow</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 border-2 border-accent-primary" />
            <span>Nodes</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Example usage data
export const EXAMPLE_SANKEY_DATA = {
  nodes: [
    { id: 'bots', label: 'Bots' },
    { id: 'proxy', label: 'Proxy' },
    { id: 'target1', label: 'Target 1' },
    { id: 'target2', label: 'Target 2' },
    { id: 'cdn', label: 'CDN' },
    { id: 'origin', label: 'Origin' },
  ],
  links: [
    { source: 'bots', target: 'proxy', value: 100 },
    { source: 'proxy', target: 'target1', value: 60 },
    { source: 'proxy', target: 'target2', value: 40 },
    { source: 'target1', target: 'cdn', value: 50 },
    { source: 'target2', target: 'cdn', value: 30 },
    { source: 'cdn', target: 'origin', value: 80 },
  ],
};
