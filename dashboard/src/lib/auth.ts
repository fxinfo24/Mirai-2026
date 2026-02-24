/**
 * Simple authentication utilities
 * For production, use NextAuth.js or similar
 */

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'operator' | 'viewer';
  email: string;
}

// Mock user database
const MOCK_USERS: User[] = [
  { id: '1', username: 'admin', role: 'admin', email: 'admin@mirai2026.local' },
  { id: '2', username: 'operator', role: 'operator', email: 'operator@mirai2026.local' },
  { id: '3', username: 'viewer', role: 'viewer', email: 'viewer@mirai2026.local' },
];

// Mock passwords (in production, use bcrypt)
const MOCK_PASSWORDS: Record<string, string> = {
  'admin': 'admin123',
  'operator': 'operator123',
  'viewer': 'viewer123',
};

export async function login(username: string, password: string): Promise<User | null> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const user = MOCK_USERS.find(u => u.username === username);
  if (!user) return null;

  const validPassword = MOCK_PASSWORDS[username] === password;
  if (!validPassword) return null;

  return user;
}

export async function logout(): Promise<void> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  }
}

export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export function setCurrentUser(user: User): void {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem('user', JSON.stringify(user));
  // In production, store a real JWT token
  localStorage.setItem('token', `mock-token-${user.id}`);
}

export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}

export function hasRole(role: User['role']): boolean {
  const user = getCurrentUser();
  if (!user) return false;
  
  const roleHierarchy = { viewer: 1, operator: 2, admin: 3 };
  return roleHierarchy[user.role] >= roleHierarchy[role];
}
