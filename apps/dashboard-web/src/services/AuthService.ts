
import { apiClient } from '../api/client';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // timestamp
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  roles: string[];
  tenantIds?: string[]; // Accessible tenant IDs from JWT
  tenantId?: string; // Currently selected tenant (if single)
}

export interface AuthError {
  code: string;
  message: string;
  requestId?: string;
}

const TOKEN_STORAGE_KEY = 'farmiq_auth_token';
const USER_STORAGE_KEY = 'farmiq_user_profile';
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // Refresh 5 min before expiry
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 min inactivity timeout

class AuthService {
  private tokenPair: TokenPair | null = null;
  private userProfile: UserProfile | null = null;
  private refreshPromise: Promise<TokenPair> | null = null;
  private lastActivityTime: number = Date.now();
  private sessionTimeoutTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.loadFromStorage();
    this.startSessionTimeout();
    this.setupActivityTracking();
  }

  // Load from memory-first storage (fallback to localStorage for persistence across tabs)
  private loadFromStorage(): void {
    try {
      const tokenStr = sessionStorage.getItem(TOKEN_STORAGE_KEY) || localStorage.getItem(TOKEN_STORAGE_KEY);
      const userStr = sessionStorage.getItem(USER_STORAGE_KEY) || localStorage.getItem(USER_STORAGE_KEY);

      if (tokenStr) {
        this.tokenPair = JSON.parse(tokenStr);
      }
      if (userStr) {
        this.userProfile = JSON.parse(userStr);
      }
    } catch (error) {
      console.warn('Failed to load auth from storage', error);
      this.clearAuth();
    }
  }

  private saveToStorage(): void {
    try {
      // Use sessionStorage for security (cleared on tab close)
      // Fallback to localStorage for cross-tab persistence
      if (this.tokenPair) {
        sessionStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(this.tokenPair));
        localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(this.tokenPair));
      }
      if (this.userProfile) {
        sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(this.userProfile));
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(this.userProfile));
      }
    } catch (error) {
      console.warn('Failed to save auth to storage', error);
    }
  }

  private clearStorage(): void {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  }

  // Activity tracking for session timeout
  private setupActivityTracking(): void {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((event) => {
      document.addEventListener(event, () => {
        this.lastActivityTime = Date.now();
        this.resetSessionTimeout();
      }, { passive: true });
    });
  }

  private startSessionTimeout(): void {
    this.resetSessionTimeout();
  }

  private resetSessionTimeout(): void {
    if (this.sessionTimeoutTimer) {
      clearTimeout(this.sessionTimeoutTimer);
    }

    this.sessionTimeoutTimer = setTimeout(() => {
      const inactiveTime = Date.now() - this.lastActivityTime;
      if (inactiveTime >= SESSION_TIMEOUT_MS) {
        this.logout('Session timeout due to inactivity');
      }
    }, SESSION_TIMEOUT_MS);
  }

  async login(email: string, password: string): Promise<{ user: UserProfile; tokenPair: TokenPair }> {
    // Mock admin login (dev only)
    const normalizedEmail = email === 'admin' ? 'admin@farmiq.com' : email;
    const isMockEmail = ['admin@farmiq.com', 'admin@farmiq.com'].includes(normalizedEmail);
    const isMockPassword = password === 'password' || password === 'password123';
    if (import.meta.env.VITE_MOCK_MODE === 'true' && isMockEmail && isMockPassword) {
      const mockUser: UserProfile = {
        id: '1',
        email: normalizedEmail,
        name: 'Platform Admin',
        roles: ['platform_admin'],
      };

      // Create a dummy token structure that won't crash the decoder
      // header.payload.signature
      // payload = {} base64 encoded is e30=
      const mockAccessToken = 'header.e30=.signature';

      this.tokenPair = {
        accessToken: mockAccessToken,
        refreshToken: 'mock-refresh-token',
        expiresAt: Date.now() + 3600 * 1000,
      };
      this.userProfile = mockUser;

      this.saveToStorage();
      this.resetSessionTimeout();

      return { user: mockUser, tokenPair: this.tokenPair };
    }

    try {
      const response = await apiClient.post<{
        access_token: string;
        refresh_token: string;
      }>('/api/v1/auth/login', {
        email,
        password,
      });

      const { access_token: accessToken, refresh_token: refreshToken } = response.data;

      // Decode token to get expiry
      const expiresAt = this.decodeTokenExpiry(accessToken);

      this.tokenPair = {
        accessToken,
        refreshToken,
        expiresAt,
      };
      this.userProfile = null;

      this.saveToStorage();
      this.resetSessionTimeout();

      const meResponse = await apiClient.get<UserProfile>('/api/v1/auth/me');
      const normalizedRoles = Array.isArray((meResponse.data as any).roles)
        ? (meResponse.data as any).roles
            .map((role: any) => (typeof role === 'string' ? role : role?.name))
            .filter(Boolean)
        : [];
      this.userProfile = {
        ...meResponse.data,
        roles: normalizedRoles,
      };
      this.saveToStorage();

      return { user: this.userProfile, tokenPair: this.tokenPair };
    } catch (error: any) {
      const authError: AuthError = {
        code: error.response?.data?.error?.code || 'LOGIN_FAILED',
        message: error.response?.data?.error?.message || 'Login failed',
        requestId: error.response?.headers?.['x-request-id'],
      };
      throw authError;
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    if (this.userProfile?.email === 'admin@farmiq.com') {
      if (currentPassword !== 'password') {
        throw { code: 'INVALID_PASSWORD', message: 'Current password is incorrect.' };
      }
      if (!newPassword) {
        throw { code: 'INVALID_PASSWORD', message: 'New password is required.' };
      }
      return;
    }

    try {
      await apiClient.post('/api/v1/auth/change-password', {
        currentPassword,
        newPassword,
      });
    } catch (error: any) {
      throw {
        code: error.response?.data?.error?.code || 'CHANGE_PASSWORD_FAILED',
        message: error.response?.data?.error?.message || 'Failed to change password',
      };
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    if (email === 'admin' || email === 'admin@farmiq.com') {
      return;
    }

    try {
      await apiClient.post('/api/v1/auth/reset-password', {
        email,
      });
    } catch (error: any) {
      throw {
        code: error.response?.data?.error?.code || 'RESET_PASSWORD_FAILED',
        message: error.response?.data?.error?.message || 'Failed to request password reset',
      };
    }
  }

  async logout(reason?: string): Promise<void> {
    try {
      // TODO: Call logout endpoint if available
      // POST /api/v1/auth/logout
      if (this.tokenPair?.accessToken) {
        await apiClient.post('/api/v1/auth/logout', {}, {
          headers: {
            Authorization: `Bearer ${this.tokenPair.accessToken}`,
          },
        }).catch(() => {
          // Ignore errors on logout
        });
      }
    } catch {
      // Ignore errors
    } finally {
      this.clearAuth();
      if (reason) {
        console.log('Logout reason:', reason);
      }
    }
  }

  getAccessToken(): string | null {
    if (!this.tokenPair) return null;

    // Check if token is expired
    if (Date.now() >= this.tokenPair.expiresAt) {
      return null;
    }

    return this.tokenPair.accessToken;
  }

  getUserProfile(): UserProfile | null {
    return this.userProfile;
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken() && !!this.userProfile;
  }

  // Silent refresh - attempts refresh without user interaction
  async refreshToken(): Promise<TokenPair> {
    // Prevent concurrent refresh calls
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    if (!this.tokenPair?.refreshToken) {
      throw new Error('No refresh token available');
    }

    this.refreshPromise = (async () => {
      try {
        const response = await apiClient.post<{
          access_token: string;
        }>('/api/v1/auth/refresh', {
          refresh_token: this.tokenPair!.refreshToken,
        });

        const accessToken = response.data.access_token;
        const refreshToken = this.tokenPair!.refreshToken;
        const expiresAt = this.decodeTokenExpiry(accessToken);

        this.tokenPair = {
          accessToken,
          refreshToken,
          expiresAt,
        };

        this.saveToStorage();
        this.resetSessionTimeout();

        return this.tokenPair;
      } catch (error: any) {
        // Refresh failed - logout user
        this.clearAuth();
        throw new Error('Token refresh failed');
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  // Check if token needs refresh (within threshold)
  shouldRefresh(): boolean {
    if (!this.tokenPair) return false;
    const timeUntilExpiry = this.tokenPair.expiresAt - Date.now();
    return timeUntilExpiry < REFRESH_THRESHOLD_MS;
  }

  // Auto-refresh if needed (called before API requests)
  async ensureValidToken(): Promise<string> {
    const token = this.getAccessToken();

    if (!token) {
      // Try to refresh
      if (this.tokenPair?.refreshToken) {
        const refreshed = await this.refreshToken();
        return refreshed.accessToken;
      }
      throw new Error('No valid token available');
    }

    // Proactive refresh if close to expiry
    if (this.shouldRefresh()) {
      try {
        const refreshed = await this.refreshToken();
        return refreshed.accessToken;
      } catch {
        // If refresh fails, use current token (will fail on next request)
        return token;
      }
    }

    return token;
  }

  private decodeTokenExpiry(token: string): number {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return (payload.exp || 0) * 1000; // Convert to milliseconds
    } catch {
      // Fallback: assume 1 hour expiry
      return Date.now() + 60 * 60 * 1000;
    }
  }

  private clearAuth(): void {
    this.tokenPair = null;
    this.userProfile = null;
    this.clearStorage();
    if (this.sessionTimeoutTimer) {
      clearTimeout(this.sessionTimeoutTimer);
      this.sessionTimeoutTimer = null;
    }
  }
}

// Singleton instance
export const authService = new AuthService();

