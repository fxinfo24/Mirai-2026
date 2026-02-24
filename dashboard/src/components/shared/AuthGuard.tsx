'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, getCurrentUser } from '@/lib/auth';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
    } else {
      setIsChecking(false);
    }
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
