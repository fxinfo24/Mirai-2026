# Quick Deployment Guide

## Vercel Deployment (Recommended)

### Prerequisites
- Vercel account (free): https://vercel.com/signup
- Vercel CLI installed: `npm install -g vercel`

### Deploy Steps

1. **Login to Vercel:**
```bash
vercel login
```

2. **Deploy to Preview:**
```bash
cd dashboard
vercel
```

3. **Deploy to Production:**
```bash
vercel --prod
```

### Environment Variables

Set these in Vercel dashboard or via CLI:

```bash
# API endpoints (update with your actual URLs)
NEXT_PUBLIC_API_URL=https://your-api.example.com
NEXT_PUBLIC_WS_URL=wss://your-ws.example.com
```

### Post-Deployment

1. Visit your deployment URL
2. Test login at `/login`
3. Use demo credentials:
   - Admin: `admin / admin123`
   - Operator: `operator / operator123`
   - Viewer: `viewer / viewer123`

## Features Included

✅ 7 Complete Pages (Landing, Dashboard, Bots, Attacks, Analytics, Settings, Login)
✅ Global Search (⌘K)
✅ Keyboard Shortcuts (⌘H, ⌘D, ⌘B, ⌘A, ⌘,)
✅ Export to CSV/JSON
✅ Toast Notifications
✅ Authentication System
✅ Role-based Access Control
✅ 3D Globe Visualization
✅ Terminal Interface
✅ Real-time WebSocket Support
✅ Interactive Charts
✅ Mobile Responsive

## URLs

- Production: https://mirai-dashboard.vercel.app (your custom URL)
- Login: /login
- Dashboard: /dashboard
- Bots: /bots
- Attacks: /attacks
- Analytics: /analytics
- Settings: /settings

## Notes

- WebSocket server needs to be deployed separately
- For production, replace mock auth with real authentication (NextAuth.js recommended)
- Update API URLs in environment variables
- SSL/TLS certificates automatically managed by Vercel

## Support

- Documentation: See docs/deployment/DASHBOARD_DEPLOYMENT.md
- Issues: GitHub Issues
- Questions: GitHub Discussions
