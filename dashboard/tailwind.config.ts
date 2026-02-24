import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          bg: '#0a0e1a',
          'bg-secondary': '#131824',
        },
        accent: {
          primary: '#00ff9f',
          secondary: '#00d4ff',
          warning: '#ff6b35',
          danger: '#ff006e',
        },
        text: {
          primary: '#ffffff',
          secondary: '#a0a8b9',
          muted: '#6b7280',
          accent: '#00ff9f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Orbitron', 'Inter', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #00ff9f 0%, #00d4ff 100%)',
        'gradient-danger': 'linear-gradient(135deg, #ff006e 0%, #ff6b35 100%)',
        'gradient-glass': 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
      },
      boxShadow: {
        glow: '0 0 20px rgba(0, 255, 159, 0.3)',
        'glow-blue': '0 0 20px rgba(0, 212, 255, 0.3)',
      },
      backdropBlur: {
        glass: '20px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 8s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
