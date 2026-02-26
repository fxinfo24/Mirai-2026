/**
 * Production authentication utilities with JWT
 * Integrates with backend API at /api/auth/*
 */

export interface User {
  id: number;
  username: string;
  role: 'admin' | 'operator' | 'viewer';
  email: string;
  permissions?: string[];
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface LoginResponse extends AuthTokens {
  user: User;
}

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
const AUTH_ENDPOINTS = {
  login: `${API_BASE_URL}/api/auth/login`,
  logout: `${API_BASE_URL}/api/auth/logout`,
  refresh: `${API_BASE_URL}/api/auth/refresh`,
  me: `${API_BASE_URL}/api/auth/me`,
  verify: `${API_BASE_URL}/api/auth/verify`,
};

// Fix #1: Token storage strategy
// Access tokens are stored in memory only (not localStorage) to prevent XSS theft.
// Refresh tokens are stored in a secure httpOnly cookie set by the backend /api/auth/login.
// The user profile (non-sensitive) is kept in sessionStorage so it survives page refresh
// but is cleared when the tab closes.
//
// Cookie flow:
//   login()  → backend sets "mirai_refresh" httpOnly cookie + returns access_token in body
//   refresh() → sends cookie automatically (credentials:'include') → backend returns new access_token
//   logout() → backend clears the httpOnly cookie
//
// This means:
//   - Access token lives only in JS memory (gone on reload → refresh() called on mount)
//   - Refresh token is never accessible to JS at all (httpOnly)
//   - User object is non-sensitive so sessionStorage is fine
let _memoryAccessToken: string | null = null;

function setMemoryToken(token: string | null): void {
  _memoryAccessToken = token;
}

function getMemoryToken(): string | null {
  return _memoryAccessToken;
}

const STORAGE_KEYS = {
  user: 'mirai_user', // sessionStorage — non-sensitive profile only
};

/**
 * Login with username and password
 * Returns user object on success, null on failure
 */
export async function login(username: string, password: string): Promise<User | null> {
  try {
    const response = await fetch(AUTH_ENDPOINTS.login, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      console.error('Login failed:', response.status, response.statusText);
      return null;
    }

    const data: LoginResponse = await response.json();

    // Fix #1: Store access token in memory only; refresh token arrives as
    // httpOnly cookie from the backend (credentials:'include' sends it back
    // on every subsequent request — no JS access needed or possible).
    setMemoryToken(data.access_token);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEYS.user, JSON.stringify(data.user));
    }

    return data.user;
  } catch (error) {
    console.error('Login error:', error);
    return null;
  }
}

/**
 * Logout and invalidate tokens
 */
export async function logout(): Promise<void> {
  try {
    // Tell backend to clear the httpOnly refresh cookie and invalidate server-side.
    // credentials:'include' sends the httpOnly cookie automatically.
    const accessToken = getAccessToken();
    await fetch(AUTH_ENDPOINTS.logout, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
      },
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Clear in-memory token and sessionStorage user profile.
    setMemoryToken(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEYS.user);
    }
  }
}

/**
 * Get in-memory access token (never touches localStorage).
 */
export function getAccessToken(): string | null {
  return getMemoryToken();
}

/**
 * Get current authenticated user from sessionStorage (non-sensitive profile).
 */
export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;

  const userStr = sessionStorage.getItem(STORAGE_KEYS.user);
  if (!userStr) return null;

  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

/**
 * Store user profile in sessionStorage (called after login or profile refresh).
 */
export function setCurrentUser(user: User): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
}

/**
 * Check if user is authenticated.
 * On page reload the memory token will be null — refreshAccessToken() is
 * called by AuthGuard on mount to restore it via the httpOnly cookie.
 */
export function isAuthenticated(): boolean {
  return getMemoryToken() !== null && getCurrentUser() !== null;
}

/**
 * Check if user has specific role or higher
 */
export function hasRole(role: User['role']): boolean {
  const user = getCurrentUser();
  if (!user) return false;
  
  const roleHierarchy = { viewer: 1, operator: 2, admin: 3 };
  return roleHierarchy[user.role] >= roleHierarchy[role];
}

/**
 * Check if user has specific permission
 */
export function hasPermission(permission: string): boolean {
  const user = getCurrentUser();
  if (!user || !user.permissions) return false;
  return user.permissions.includes(permission);
}

/**
 * Refresh access token using refresh token
 * Returns new access token on success, null on failure
 */
/**
 * Refresh the in-memory access token using the httpOnly refresh cookie.
 * credentials:'include' sends the cookie automatically — no JS token needed.
 * Returns new access token on success, null if refresh cookie is expired/missing.
 */
export async function refreshAccessToken(): Promise<string | null> {
  try {
    const response = await fetch(AUTH_ENDPOINTS.refresh, {
      method: 'POST',
      credentials: 'include', // sends httpOnly refresh cookie automatically
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      // Refresh cookie expired or invalid — clear everything and force re-login.
      setMemoryToken(null);
      if (typeof window !== 'undefined') sessionStorage.removeItem(STORAGE_KEYS.user);
      return null;
    }

    const data: { access_token: string; expires_in: number } = await response.json();

    // Store new access token in memory only — never in localStorage.
    setMemoryToken(data.access_token);
    return data.access_token;
  } catch (error) {
    console.error('Token refresh error:', error);
    setMemoryToken(null);
    return null;
  }
}

/**
 * Fetch with automatic token refresh on 401
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const accessToken = getAccessToken();

  if (!accessToken) {
    throw new Error('No access token available');
  }

  // Add authorization header
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${accessToken}`,
  };

  let response = await fetch(url, { ...options, headers });

  // If unauthorized, try refreshing token and retry
  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    
    if (newToken) {
      // Retry with new token
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(url, { ...options, headers });
    }
  }

  return response;
}

/**
 * Verify current token is valid
 */
export async function verifyToken(): Promise<boolean> {
  const accessToken = getAccessToken();
  if (!accessToken) return false;

  try {
    const response = await fetch(AUTH_ENDPOINTS.verify, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: accessToken }),
    });

    if (!response.ok) return false;

    const data: { valid: boolean } = await response.json();
    return data.valid;
  } catch (error) {
    console.error('Token verification error:', error);
    return false;
  }
}

/**
 * Fetch current user from API
 */
export async function fetchCurrentUser(): Promise<User | null> {
  try {
    const response = await authenticatedFetch(AUTH_ENDPOINTS.me);

    if (!response.ok) {
      return null;
    }

    const user: User = await response.json();

    // Update local storage
    setCurrentUser(user);

    return user;
  } catch (error) {
    console.error('Fetch user error:', error);
    return null;
  }
}
