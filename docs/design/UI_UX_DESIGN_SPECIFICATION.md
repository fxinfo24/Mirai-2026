# Mirai 2026 - C&C Dashboard UI/UX Design Specification
# Award-Submission Quality Interface Design

**Version:** 1.0  
**Created:** February 24, 2026  
**Target:** Awwwards-worthy, production-ready dashboard  
**Timeline:** 2-4 weeks  

---

## 🎯 Design Philosophy

**"Ethical Hacker's Command Center"**

A sophisticated, immersive interface that combines:
- Cyberpunk aesthetics with professional polish
- Real-time data visualization with 3D elements
- Terminal-inspired interfaces with modern UX
- Dark mode by default with high contrast
- Glassmorphism and neon accents
- Smooth animations and micro-interactions

### Core Principles

1. **Clarity Over Complexity** - Information hierarchy is paramount
2. **Performance First** - 60fps animations, optimized 3D
3. **Accessibility** - WCAG 2.1 AA compliant
4. **Responsive** - Desktop primary, mobile-optimized
5. **Ethical Focus** - Clear "security research" positioning

---

## 🎨 Visual Design System

### Color Palette

**Primary Colors:**
```css
--primary-bg: #0a0e1a        /* Deep space blue */
--secondary-bg: #131824      /* Card background */
--accent-primary: #00ff9f    /* Neon green */
--accent-secondary: #00d4ff  /* Cyber blue */
--accent-warning: #ff6b35    /* Alert orange */
--accent-danger: #ff006e     /* Critical red */
```

**Gradients:**
```css
--gradient-primary: linear-gradient(135deg, #00ff9f 0%, #00d4ff 100%)
--gradient-danger: linear-gradient(135deg, #ff006e 0%, #ff6b35 100%)
--gradient-glass: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)
```

**Text Colors:**
```css
--text-primary: #ffffff      /* Main text */
--text-secondary: #a0a8b9    /* Secondary text */
--text-muted: #6b7280        /* Muted text */
--text-accent: #00ff9f       /* Highlighted */
```

### Typography

**Font Stack:**
```css
--font-primary: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif
--font-mono: 'JetBrains Mono', 'Fira Code', monospace
--font-display: 'Orbitron', 'Inter', sans-serif
```

**Scale:**
```css
--text-xs: 0.75rem    /* 12px */
--text-sm: 0.875rem   /* 14px */
--text-base: 1rem     /* 16px */
--text-lg: 1.125rem   /* 18px */
--text-xl: 1.25rem    /* 20px */
--text-2xl: 1.5rem    /* 24px */
--text-3xl: 1.875rem  /* 30px */
--text-4xl: 2.25rem   /* 36px */
```

### Spacing System

```css
--space-1: 0.25rem   /* 4px */
--space-2: 0.5rem    /* 8px */
--space-3: 0.75rem   /* 12px */
--space-4: 1rem      /* 16px */
--space-6: 1.5rem    /* 24px */
--space-8: 2rem      /* 32px */
--space-12: 3rem     /* 48px */
--space-16: 4rem     /* 64px */
```

### Border Radius

```css
--radius-sm: 0.375rem   /* 6px */
--radius-md: 0.5rem     /* 8px */
--radius-lg: 0.75rem    /* 12px */
--radius-xl: 1rem       /* 16px */
--radius-full: 9999px   /* Circular */
```

### Shadows & Effects

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.5)
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.6)
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.7)
--shadow-glow: 0 0 20px rgba(0, 255, 159, 0.3)
--blur-glass: blur(20px)
```

---

## 📐 Layout Architecture

### Dashboard Layout (Main Screen)

```
┌─────────────────────────────────────────────────────────┐
│  HEADER (60px)                                          │
│  [Logo] [Nav] [Search] [Notifications] [Profile]       │
├──────────┬──────────────────────────────────────────────┤
│          │                                              │
│  SIDEBAR │         MAIN CONTENT AREA                    │
│  (240px) │                                              │
│          │  ┌────────────────────────────────────┐      │
│  [Globe] │  │   3D Network Visualization         │      │
│  [Bots]  │  │   (Interactive Globe)              │      │
│  [Attack]│  │                                    │      │
│  [Logs]  │  └────────────────────────────────────┘      │
│  [Config]│                                              │
│  [API]   │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐            │
│          │  │Stats│ │Stats│ │Stats│ │Stats│            │
│  [AI]    │  └─────┘ └─────┘ └─────┘ └─────┘            │
│  [Docs]  │                                              │
│          │  ┌──────────────┐  ┌──────────────┐          │
│          │  │ Live Activity│  │ Attack Queue │          │
│          │  │              │  │              │          │
│          │  └──────────────┘  └──────────────┘          │
│          │                                              │
└──────────┴──────────────────────────────────────────────┘
```

### Key Screens

**1. Dashboard (Home)**
- 3D Globe with bot locations
- Real-time metrics cards
- Activity feed
- Quick actions

**2. Bot Management**
- Bot grid/list view
- Health indicators
- Geo-map view
- Filter/search

**3. Attack Control**
- Attack queue management
- Protocol selector
- Target configuration
- Real-time execution view

**4. Terminal Interface**
- Command input with autocomplete
- Output stream
- Command history
- Syntax highlighting

**5. Analytics**
- Time-series graphs
- Success rate metrics
- Grafana integration
- Custom dashboards

**6. AI Models**
- Pattern evolution controls
- Model training status
- Credential generator
- Evasion tester

**7. Logs & Events**
- Real-time log stream
- Filtering and search
- Export functionality
- Loki integration

**8. Settings**
- Configuration management
- API key management
- User preferences
- System health

---

## 🎭 Component Library

### Core Components

**1. Glass Card**
```jsx
<GlassCard>
  - Frosted glass effect with backdrop blur
  - Border glow on hover
  - Smooth shadow transitions
  - Padding: var(--space-6)
</GlassCard>
```

**2. Neon Button**
```jsx
<NeonButton variant="primary|secondary|danger">
  - Glow effect on hover
  - Ripple animation on click
  - Loading state with spinner
  - Icon support
</NeonButton>
```

**3. Terminal**
```jsx
<Terminal>
  - Monospace font
  - Auto-scrolling output
  - Command autocomplete
  - Syntax highlighting
  - Command history (↑↓)
</Terminal>
```

**4. Network Globe**
```jsx
<NetworkGlobe>
  - Three.js 3D sphere
  - Interactive camera controls
  - Bot location markers
  - Connection lines
  - Pulse animations
</NetworkGlobe>
```

**5. Metric Card**
```jsx
<MetricCard
  value={number}
  label={string}
  trend={up|down|neutral}
  sparkline={data}
/>
```

**6. Activity Feed**
```jsx
<ActivityFeed>
  - Real-time updates
  - Color-coded by type
  - Timestamps
  - Infinite scroll
</ActivityFeed>
```

**7. Status Indicator**
```jsx
<StatusIndicator status="online|offline|warning">
  - Pulsing dot animation
  - Color-coded
  - Tooltip on hover
</StatusIndicator>
```

**8. Progress Bar**
```jsx
<ProgressBar
  value={percent}
  variant="primary|danger"
  animated={true}
/>
```

---

## 🎬 Animations & Interactions

### Micro-Interactions

**Page Load:**
```
1. Logo fade-in (0.3s)
2. Sidebar slide-in from left (0.4s, delay 0.1s)
3. Cards stagger-in (0.3s each, delay 0.1s between)
4. Globe spin-up (0.6s, delay 0.3s)
```

**Hover States:**
- Cards: Lift (translateY(-4px)) + glow
- Buttons: Glow intensify + scale(1.02)
- Links: Underline slide-in
- Icons: Rotate or bounce

**Click/Tap:**
- Ripple effect from click point
- Button press (scale 0.98)
- Haptic feedback (mobile)

**Transitions:**
- Page changes: Crossfade (0.3s)
- Modal open: Scale + fade (0.4s)
- Toast notifications: Slide from top

### Loading States

**Skeleton Screens:**
- Animated gradient shimmer
- Maintain layout structure
- Smooth transition to real content

**Spinners:**
- Neon circle spinner for primary actions
- Dots for inline loading
- Progress bars for long operations

---

## 📱 Responsive Design

### Breakpoints

```css
--breakpoint-sm: 640px    /* Mobile */
--breakpoint-md: 768px    /* Tablet */
--breakpoint-lg: 1024px   /* Desktop */
--breakpoint-xl: 1280px   /* Large desktop */
--breakpoint-2xl: 1536px  /* Ultra-wide */
```

### Mobile Adaptations

**Layout:**
- Sidebar becomes bottom navigation
- Globe becomes 2D map on small screens
- Cards stack vertically
- Reduced spacing

**Interactions:**
- Swipe gestures for navigation
- Touch-optimized buttons (min 44px)
- Pull-to-refresh
- Bottom sheet modals

---

## ♿ Accessibility

**Standards:**
- WCAG 2.1 Level AA compliance
- Keyboard navigation throughout
- Screen reader optimized
- Focus indicators visible
- Color contrast ≥ 4.5:1

**Features:**
- Skip to main content link
- ARIA labels on interactive elements
- Alt text on images/icons
- Reduced motion mode
- High contrast mode toggle

---

## 🎯 Key User Flows

### 1. Login & Authentication

```
1. Landing page with animated background
2. Login form (email + password or API key)
3. 2FA verification (if enabled)
4. Dashboard load with welcome animation
```

### 2. Deploy Attack

```
1. Navigate to Attack Control
2. Select attack type from visual grid
3. Configure target (IP, duration, etc.)
4. Review in modal with preview
5. Confirm → Real-time execution view
6. Success notification + analytics update
```

### 3. Monitor Bots

```
1. Open Bot Management
2. View 3D globe or grid
3. Click bot → Detail panel slides in
4. View stats, logs, health
5. Quick actions (restart, remove, etc.)
```

### 4. AI Model Training

```
1. Navigate to AI Models
2. Select model type
3. Upload training data or configure params
4. Start training → Progress bar + metrics
5. View results + download model
```

---

## 🔧 Technical Specifications

### Performance Targets

- **First Contentful Paint:** < 1.5s
- **Time to Interactive:** < 3.5s
- **Lighthouse Score:** > 90
- **Animation FPS:** 60fps consistent
- **Bundle Size:** < 500KB gzipped

### Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile: iOS 14+, Android 10+

### Data Update Frequency

- Metrics: 5 seconds
- Bot status: 10 seconds
- Logs: Real-time (WebSocket)
- Globe: 30 seconds
- Analytics: 1 minute

---

## 🎨 Design Assets Needed

**Icons:**
- Custom icon set (200+ icons)
- SVG format, mono-color
- 24x24px base size

**Illustrations:**
- Empty states (8 unique)
- Error pages (404, 500, etc.)
- Onboarding graphics

**3D Assets:**
- Globe texture (2048x1024)
- Bot marker models
- Particle system textures

**Animations:**
- Lottie files for key interactions
- Sprite sheets for effects

---

## 📐 Component Specifications

### Network Globe (3D)

**Technology:** Three.js + React Three Fiber

**Features:**
- Earth texture with city lights
- Animated rotation (slow)
- Bot markers (pulsing spheres)
- Connection lines between bots
- Click bot → Camera zoom + detail panel
- Orbit controls (drag to rotate, scroll to zoom)

**Performance:**
- Max 1000 bot markers
- LOD for distant bots
- Frustum culling
- Texture compression

### Terminal Component

**Features:**
- Command input with history (↑/↓)
- Autocomplete (TAB)
- Syntax highlighting
- Output formatting (JSON, tables)
- Copy to clipboard
- Clear/reset
- Keyboard shortcuts

**Commands:**
- `help` - Show available commands
- `status` - System status
- `bots list` - List all bots
- `attack start <type>` - Start attack
- `logs tail` - Follow logs
- `clear` - Clear screen

---

## 🚀 Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Set up Next.js project
- [ ] Configure Tailwind CSS
- [ ] Create design system (tokens, components)
- [ ] Build component library
- [ ] Set up Storybook

### Phase 2: Core Features (Week 2)
- [ ] Dashboard layout
- [ ] 3D Network Globe
- [ ] Bot management interface
- [ ] Terminal component
- [ ] API integration layer

### Phase 3: Advanced Features (Week 3)
- [ ] Attack control interface
- [ ] Real-time data updates (WebSocket)
- [ ] Analytics dashboards
- [ ] AI model controls
- [ ] Logs viewer

### Phase 4: Polish & Testing (Week 4)
- [ ] Animations and transitions
- [ ] Performance optimization
- [ ] Accessibility audit
- [ ] Cross-browser testing
- [ ] Mobile optimization
- [ ] Documentation

---

## 📝 Notes

**Inspiration Sources:**
- Awwwards: Cyberpunk dashboards
- Dribbble: Sci-fi UI concepts
- Behance: Dark mode interfaces
- Real-world: Grafana, Datadog, New Relic

**Differentiators:**
- Unique 3D globe visualization
- Ethical hacker aesthetic
- Research-focused UX
- High-performance animations
- Award-submission quality

**Future Enhancements:**
- VR/AR interface
- Voice commands
- AI-powered insights
- Collaborative features
- Mobile app (React Native)

---

**Last Updated:** February 24, 2026  
**Version:** 1.0 - Initial Design Specification
