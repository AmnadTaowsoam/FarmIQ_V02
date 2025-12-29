import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authService } from '../AuthService';

describe('AuthService', () => {
  beforeEach(() => {
    // Clear storage before each test
    sessionStorage.clear();
    localStorage.clear();
  });

  describe('Token validation', () => {
    it('should detect expired token', () => {
      const expiredToken = createMockToken(Date.now() / 1000 - 100); // Expired 100s ago
      authService['tokenPair'] = {
        accessToken: expiredToken,
        refreshToken: 'refresh',
        expiresAt: Date.now() - 1000,
      };

      expect(authService.getAccessToken()).toBeNull();
    });

    it('should return valid token when not expired', () => {
      const validToken = createMockToken(Date.now() / 1000 + 3600); // Valid for 1 hour
      authService['tokenPair'] = {
        accessToken: validToken,
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
      };

      expect(authService.getAccessToken()).toBe(validToken);
    });
  });

  describe('shouldRefresh', () => {
    it('should return true when token expires soon', () => {
      authService['tokenPair'] = {
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 4 * 60 * 1000, // 4 minutes (less than 5 min threshold)
      };

      expect(authService.shouldRefresh()).toBe(true);
    });

    it('should return false when token has plenty of time', () => {
      authService['tokenPair'] = {
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      };

      expect(authService.shouldRefresh()).toBe(false);
    });
  });
});

// Helper to create mock JWT token
function createMockToken(exp: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ exp, iat: exp - 3600 }));
  return `${header}.${payload}.signature`;
}

