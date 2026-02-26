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

// Token storage keys
const STORAGE_KEYS = {
  accessToken: 'mirai_access_token',
  refreshToken: 'mirai_refresh_token',
  user: 'mirai_user',
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

    // Store tokens and user
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.accessToken, data.access_token);
      localStorage.setItem(STORAGE_KEYS.refreshToken, data.refresh_token);
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(data.user));
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
  const refreshToken = getRefreshToken();

  try {
    // Call logout endpoint to invalidate refresh token
    if (refreshToken) {
      const accessToken = getAccessToken();
      await fetch(AUTH_ENDPOINTS.logout, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    }
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Clear local storage regardless of API call result
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.accessToken);
      localStorage.removeItem(STORAGE_KEYS.refreshToken);
      localStorage.removeItem(STORAGE_KEYS.user);
    }
  }
}

/**
 * Get stored access token
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.accessToken);
}

/**
 * Get stored refresh token
 */
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.refreshToken);
}

/**
 * Get current authenticated user from local storage
 */
export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  
  const userStr = localStorage.getItem(STORAGE_KEYS.user);
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

/**
 * Store user in local storage (called after login)
 */
export function setCurrentUser(user: User): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
}

/**
 * Check if user is authenticated (has valid token)
 */
export function isAuthenticated(): boolean {
  return getAccessToken() !== null && getCurrentUser() !== null;
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
export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch(AUTH_ENDPOINTS.refresh, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      // Refresh token expired or invalid, logout user
      await logout();
      return null;
    }

    const data: { access_token: string; expires_in: number } = await response.json();

    // Store new access token
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.accessToken, data.access_token);
    }

    return data.access_token;
  } catch (error) {
    console.error('Token refresh error:', error);
    await logout();
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
