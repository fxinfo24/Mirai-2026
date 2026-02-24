# Mirai 2026 - C&C Dashboard 🎨

**Award-Submission Quality Web Interface for Security Research**

A modern, cutting-edge command and control dashboard featuring 3D visualizations, real-time metrics, and an immersive cyberpunk aesthetic. Built with Next.js 14, React 18, Three.js, and Tailwind CSS.

---

## ✨ Features

### Core Functionality
- **🌍 3D Network Globe** - Interactive bot visualization with Three.js
- **📊 Real-Time Dashboard** - Live metrics and analytics
- **💻 Terminal Interface** - Command-line interface with autocomplete
- **🤖 Bot Management** - Grid/map views with health indicators
- **⚔️ Attack Control** - Visual attack configuration and execution
- **🧠 AI Integration** - ML-powered pattern evolution and evasion
- **📈 Analytics** - Comprehensive metrics and time-series graphs
- **📝 Live Logs** - Real-time event streaming

### Design & UX
- **Dark Mode First** - Cyberpunk aesthetic with glassmorphism
- **Smooth Animations** - Framer Motion powered micro-interactions
- **Responsive Design** - Desktop-first, mobile-optimized
- **Accessibility** - WCAG 2.1 AA compliant
- **Performance** - 60fps animations, code-split bundles

---

## 🚀 Quick Start

### Prerequisites

```bash
node >= 18.0.0
npm >= 9.0.0
```

### Installation

```bash
# Clone the repository (if not already done)
cd mirai-2026/dashboard

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
dashboard/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── (auth)/         # Authentication pages
│   │   ├── (dashboard)/    # Dashboard pages
│   │   ├── api/            # API routes
│   │   └── layout.tsx      # Root layout
│   ├── components/          # React components
│   │   ├── ui/             # Base UI components
│   │   ├── dashboard/      # Dashboard-specific
│   │   ├── globe/          # 3D Globe
│   │   └── terminal/       # Terminal
│   ├── hooks/               # Custom hooks
│   ├── lib/                 # Utilities & helpers
│   ├── server/              # Backend logic
│   ├── stores/              # Zustand stores
│   └── types/               # TypeScript types
├── public/                  # Static assets
├── tests/                   # Tests (unit + e2e)
└── docs/                    # Documentation
```

---

## 🛠️ Tech Stack

### Core
- **Next.js 14** - React framework with App Router
- **React 18** - UI library
- **TypeScript 5.3** - Type safety
- **Tailwind CSS 3.4** - Utility-first CSS

### 3D & Visualization
- **Three.js** - 3D graphics library
- **React Three Fiber** - React renderer for Three.js
- **Recharts** - Charts and graphs
- **D3.js** - Data visualization

### State & Data
- **tRPC** - End-to-end type-safe APIs
- **Zustand** - State management
- **React Query** - Server state caching
- **Prisma** - Database ORM

### Animations & UX
- **Framer Motion** - Animations
- **Headless UI** - Accessible components
- **React Hook Form** - Forms
- **Zod** - Schema validation

---

## 📜 Available Scripts

```bash
# Development
npm run dev              # Start dev server (http://localhost:3000)
npm run build            # Production build
npm run start            # Start production server
npm run lint             # Lint code
npm run format           # Format code with Prettier

# Testing
npm run test             # Run unit tests
npm run test:e2e         # Run E2E tests
npm run type-check       # TypeScript type checking

# Storybook
npm run storybook        # Start Storybook (http://localhost:6006)
npm run build-storybook  # Build Storybook
```

---

## 🎨 Design System

### Color Palette

```css
/* Primary Colors */
--primary-bg: #0a0e1a        /* Deep space blue */
--secondary-bg: #131824      /* Card background */
--accent-primary: #00ff9f    /* Neon green */
--accent-secondary: #00d4ff  /* Cyber blue */
--accent-warning: #ff6b35    /* Alert orange */
--accent-danger: #ff006e     /* Critical red */
```

### Typography

- **Primary:** Inter (sans-serif)
- **Monospace:** JetBrains Mono / Fira Code
- **Display:** Orbitron

### Spacing

Based on 4px scale: `space-1` (4px) to `space-16` (64px)

---

## 🔌 API Integration

### Existing Backend Services

The dashboard integrates with the existing Mirai 2026 backend:

```typescript
// AI Service (Flask - Port 8001)
- /api/v1/health
- /api/pattern/evolve
- /api/evasion/suggest
- /api/credentials/generate

// C&C Server (Go - Port 23, 101)
- Telnet interface (port 23)
- API (port 101)

// Metrics (Prometheus - Port 9090)
- /api/v1/query
- /api/v1/query_range

// Visualization (Grafana - Port 3002)
- Dashboard embedding
```

### WebSocket Events

```typescript
socket.on('bot:status', (data) => {...});
socket.on('attack:start', (data) => {...});
socket.on('attack:complete', (data) => {...});
socket.on('metrics:update', (data) => {...});
socket.on('logs:new', (data) => {...});
```

---

## 🧩 Component Library

### Core Components

```tsx
// Glass Card
<GlassCard className="p-6">Content</GlassCard>

// Neon Button
<NeonButton variant="primary" onClick={...}>
  Click Me
</NeonButton>

// Terminal
<Terminal
  onCommand={(cmd) => handleCommand(cmd)}
  history={commandHistory}
/>

// Network Globe
<NetworkGlobe
  bots={botData}
  onBotClick={(bot) => showDetails(bot)}
/>

// Metric Card
<MetricCard
  value={1234}
  label="Active Bots"
  trend="up"
  sparkline={data}
/>
```

---

## 🎯 Key Pages

### Dashboard (`/dashboard`)
- 3D globe with bot locations
- Real-time metrics cards
- Activity feed
- Quick actions

### Bot Management (`/dashboard/bots`)
- Bot grid/list view
- Health indicators
- Geo-map visualization
- Filtering and search

### Attack Control (`/dashboard/attacks`)
- Attack queue management
- Protocol selector
- Target configuration
- Real-time execution view

### Terminal (`/dashboard/terminal`)
- Command input with autocomplete
- Output stream
- Command history
- Syntax highlighting

### Analytics (`/dashboard/analytics`)
- Time-series graphs
- Success rate metrics
- Grafana integration
- Custom dashboards

### AI Models (`/dashboard/ai`)
- Pattern evolution controls
- Model training status
- Credential generator
- Evasion tester

---

## 🧪 Testing

### Unit Tests

```bash
npm run test

# Run specific test
npm run test -- src/components/ui/button.test.tsx

# Watch mode
npm run test -- --watch
```

### E2E Tests

```bash
npm run test:e2e

# Run specific test
npm run test:e2e -- tests/e2e/dashboard.spec.ts

# Debug mode
npm run test:e2e -- --debug
```

---

## 📦 Deployment

### Docker

```bash
# Build image
docker build -t mirai-dashboard .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL="..." \
  -e AI_SERVICE_URL="http://ai-service:8001" \
  mirai-dashboard
```

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Environment Variables

Make sure to set all required environment variables in your deployment platform.

---

## 🔐 Security

### Authentication

- JWT-based authentication
- Session management with secure cookies
- 2FA support (optional)

### API Security

- CORS configuration
- Rate limiting
- Input validation (Zod schemas)
- SQL injection protection (Prisma)

### CSP Headers

Content Security Policy configured in `next.config.js`

---

## ♿ Accessibility

- **Keyboard Navigation** - Full keyboard support
- **Screen Readers** - ARIA labels and semantic HTML
- **Focus Indicators** - Visible focus states
- **Color Contrast** - WCAG AA compliant (≥ 4.5:1)
- **Reduced Motion** - Respects prefers-reduced-motion

---

## 🚧 Roadmap

### Phase 1: Foundation (Week 1) ✅
- [x] Project setup
- [x] Design system
- [x] Base components
- [x] Configuration files

### Phase 2: Core Features (Week 2) 🚧
- [ ] Dashboard layout
- [ ] 3D Network Globe
- [ ] Bot management UI
- [ ] Terminal component
- [ ] WebSocket integration

### Phase 3: Advanced Features (Week 3)
- [ ] Attack control interface
- [ ] Real-time data updates
- [ ] Analytics dashboards
- [ ] AI model controls
- [ ] Logs viewer

### Phase 4: Polish & Deploy (Week 4)
- [ ] Animations and transitions
- [ ] Performance optimization
- [ ] Testing (unit + e2e)
- [ ] Accessibility audit
- [ ] Production deployment

---

## 📚 Documentation

- **Design Specification:** `../docs/design/UI_UX_DESIGN_SPECIFICATION.md`
- **Tech Architecture:** `../docs/design/TECH_STACK_ARCHITECTURE.md`
- **API Integration:** `../docs/api/LLM_INTEGRATION.md`
- **Deployment Guide:** `../docs/deployment/DOCKER.md`

---

## 🤝 Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development workflow.

---

## 📄 License

See [LICENSE](../LICENSE) for details.

---

## 🎨 Inspiration

This dashboard draws inspiration from award-winning designs on:
- [Awwwards.com](https://www.awwwards.com/)
- [Dribbble](https://dribbble.com/)
- [Behance](https://www.behance.net/)

---

**Built with ❤️ for the Mirai 2026 Security Research Platform**

*For ethical security research and education only.*
