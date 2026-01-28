import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService, AuthError } from '../services/AuthService';

// --- Types ---
export interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
  tenantIds?: string[];
  tenantId?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: AuthError | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

// --- Context ---
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Provider ---
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<AuthError | null>(null);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        setIsLoading(true);
        setAuthError(null);

        // Check if we have a valid token
        if (authService.isAuthenticated()) {
          const profile = authService.getUserProfile();
          if (profile) {
            setUser(profile);
          } else {
            // Try to refresh if we have a token but no profile
            try {
              await authService.refreshToken();
              const refreshedProfile = authService.getUserProfile();
              if (refreshedProfile) {
                setUser(refreshedProfile);
              }
            } catch {
              // Refresh failed - clear auth
              await authService.logout('Token refresh failed on init');
            }
          }
        }
      } catch (err) {
        console.error('Auth initialization failed', err);
        setAuthError({
          code: 'INIT_FAILED',
          message: 'Failed to initialize authentication',
        });
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setAuthError(null);

      const { user: profile } = await authService.login(email, password);
      setUser(profile);
    } catch (err: any) {
      const error: AuthError = err.code
        ? err
        : {
            code: 'LOGIN_FAILED',
            message: err.message || 'Login failed',
          };
      setAuthError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setAuthError(null);
    window.location.href = '/login';
  };

  const refreshToken = async () => {
    try {
      await authService.refreshToken();
      const profile = authService.getUserProfile();
      if (profile) {
        setUser(profile);
      }
    } catch (err) {
      // Refresh failed - logout
      await logout();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user && authService.isAuthenticated(),
        isLoading,
        authError,
        login,
        logout,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// --- Hook ---
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
