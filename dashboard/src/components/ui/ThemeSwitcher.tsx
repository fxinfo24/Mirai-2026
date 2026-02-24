'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from './Card';
import { Button } from './Button';

type Theme = 'dark' | 'light' | 'cyberpunk';

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [fontSize, setFontSize] = useState(16);
  const [density, setDensity] = useState<'comfortable' | 'compact' | 'spacious'>('comfortable');

  useEffect(() => {
    const saved = localStorage.getItem('theme') as Theme;
    if (saved) setTheme(saved);
    
    const savedFontSize = localStorage.getItem('fontSize');
    if (savedFontSize) setFontSize(parseInt(savedFontSize));
    
    const savedDensity = localStorage.getItem('density') as typeof density;
    if (savedDensity) setDensity(savedDensity);
  }, []);

  const applyTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const applyFontSize = (size: number) => {
    setFontSize(size);
    localStorage.setItem('fontSize', size.toString());
    document.documentElement.style.fontSize = `${size}px`;
  };

  const applyDensity = (newDensity: typeof density) => {
    setDensity(newDensity);
    localStorage.setItem('density', newDensity);
    document.documentElement.setAttribute('data-density', newDensity);
  };

  return (
    <div className="space-y-6">
      <Card variant="bordered">
        <CardContent className="space-y-6 p-6">
          {/* Theme Selection */}
          <div>
            <h3 className="text-sm font-medium text-text-primary mb-3">Color Theme</h3>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => applyTheme('dark')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  theme === 'dark'
                    ? 'border-accent-primary bg-accent-primary/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="w-full h-16 rounded bg-gradient-to-br from-gray-900 to-gray-800 mb-2" />
                <div className="text-sm text-text-primary">Dark</div>
              </button>
              
              <button
                onClick={() => applyTheme('light')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  theme === 'light'
                    ? 'border-accent-primary bg-accent-primary/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="w-full h-16 rounded bg-gradient-to-br from-gray-100 to-white mb-2" />
                <div className="text-sm text-text-primary">Light</div>
              </button>
              
              <button
                onClick={() => applyTheme('cyberpunk')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  theme === 'cyberpunk'
                    ? 'border-accent-primary bg-accent-primary/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="w-full h-16 rounded bg-gradient-to-br from-purple-900 to-pink-900 mb-2" />
                <div className="text-sm text-text-primary">Cyberpunk</div>
              </button>
            </div>
          </div>

          {/* Font Size */}
          <div>
            <h3 className="text-sm font-medium text-text-primary mb-3">Font Size</h3>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => applyFontSize(Math.max(fontSize - 1, 12))}
              >
                A-
              </Button>
              <div className="flex-1">
                <input
                  type="range"
                  min="12"
                  max="20"
                  value={fontSize}
                  onChange={(e) => applyFontSize(parseInt(e.target.value))}
                  className="w-full accent-accent-primary"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => applyFontSize(Math.min(fontSize + 1, 20))}
              >
                A+
              </Button>
              <span className="text-sm text-text-muted min-w-[3rem]">{fontSize}px</span>
            </div>
          </div>

          {/* Layout Density */}
          <div>
            <h3 className="text-sm font-medium text-text-primary mb-3">Layout Density</h3>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => applyDensity('compact')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  density === 'compact'
                    ? 'border-accent-primary bg-accent-primary/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="text-sm text-text-primary">Compact</div>
              </button>
              
              <button
                onClick={() => applyDensity('comfortable')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  density === 'comfortable'
                    ? 'border-accent-primary bg-accent-primary/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="text-sm text-text-primary">Comfortable</div>
              </button>
              
              <button
                onClick={() => applyDensity('spacious')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  density === 'spacious'
                    ? 'border-accent-primary bg-accent-primary/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="text-sm text-text-primary">Spacious</div>
              </button>
            </div>
          </div>

          {/* Custom Colors */}
          <div>
            <h3 className="text-sm font-medium text-text-primary mb-3">Accent Color</h3>
            <div className="grid grid-cols-6 gap-2">
              {['#00ff9f', '#00d4ff', '#ff006e', '#ffd60a', '#a855f7', '#f97316'].map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    document.documentElement.style.setProperty('--accent-primary', color);
                  }}
                  className="w-full h-10 rounded-lg border-2 border-white/10 hover:border-white/30 transition-all"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
