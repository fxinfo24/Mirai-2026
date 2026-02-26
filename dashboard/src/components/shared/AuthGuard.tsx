'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, refreshAccessToken, getCurrentUser } from '@/lib/auth';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Fix #1 (AuthGuard side): on page reload the in-memory access token is
    // gone. Try to silently restore it via the httpOnly refresh cookie before
    // deciding whether the user is logged in or needs to go to /login.
    async function checkAuth() {
      if (isAuthenticated()) {
        // Token already in memory (same tab, no reload) — proceed immediately.
        setIsChecking(false);
        return;
      }

      // Memory token is missing (page reload or new tab). Attempt silent refresh.
      const newToken = await refreshAccessToken();
      if (newToken && getCurrentUser()) {
        // Refresh succeeded — user is still logged in.
        setIsChecking(false);
      } else {
        // No valid session — redirect to login.
        router.push('/login');
      }
    }

    checkAuth();
  }, [router]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-primary-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function UserBadge() {
  const user = getCurrentUser();
  const router = useRouter();

  if (!user) return null;

  const roleColors = {
    admin: 'text-accent-primary',
    operator: 'text-accent-secondary',
    viewer: 'text-text-secondary',
  };

  return (
    <div className="flex items-center space-x-2 glass-card px-3 py-1.5 rounded-lg">
      <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
      <span className="text-sm text-text-primary">{user.username}</span>
      <span className={`text-xs ${roleColors[user.role]}`}>({user.role})</span>
    </div>
  );
}
