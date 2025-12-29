// TODO: replace with real auth endpoints when backend is ready.
const MOCK_SUCCESS = true;
const MOCK_DELAY_MS = 650;

const TOKEN_STORAGE_KEY = 'farmiq_auth_token';
const USER_STORAGE_KEY = 'farmiq_user_profile';
const CONTEXT_STORAGE_KEY = 'farmiq_active_context';

type StoredTokenPair = {
  accessToken: string;
  refreshToken: string;
  expiresAt?: number;
};

export type AuthResult = { ok: true };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const decodeTokenExpiry = (token: string): number => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return (payload.exp || 0) * 1000;
  } catch {
    return Date.now() + 60 * 60 * 1000;
  }
};

const readTokenPair = (): StoredTokenPair | null => {
  const tokenStr = sessionStorage.getItem(TOKEN_STORAGE_KEY) || localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!tokenStr) return null;
  try {
    return JSON.parse(tokenStr) as StoredTokenPair;
  } catch {
    return null;
  }
};

const writeTokenPair = (pair: StoredTokenPair) => {
  try {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(pair));
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(pair));
  } catch {
    // ignore storage errors
  }
};

export const getAccessToken = (): string | null => {
  const pair = readTokenPair();
  if (!pair?.accessToken) return null;
  if (pair.expiresAt && Date.now() >= pair.expiresAt) return null;
  return pair.accessToken;
};

export const getRefreshToken = (): string | null => {
  const pair = readTokenPair();
  return pair?.refreshToken || null;
};

export const setSession = (accessToken: string, refreshToken: string, user: unknown) => {
  const expiresAt = decodeTokenExpiry(accessToken);
  writeTokenPair({ accessToken, refreshToken, expiresAt });
  try {
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch {
    // ignore storage errors
  }
};

export const clearSession = () => {
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(USER_STORAGE_KEY);
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
};

export const getTenantId = (): string | null => {
  // Primary (dev-friendly) source: URL query params managed by ActiveContextProvider.
  // The app uses `tenant_id` (snake_case) in the browser URL, while APIs expect `tenantId`.
  if (typeof window !== 'undefined') {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlTenantId = params.get('tenant_id') || params.get('tenantId');
      if (urlTenantId) return urlTenantId;
    } catch {
      // ignore URL parsing errors
    }
  }

  try {
    const storedContext = localStorage.getItem(CONTEXT_STORAGE_KEY);
    if (storedContext) {
      const parsed = JSON.parse(storedContext) as { tenantId?: string };
      if (parsed?.tenantId) return parsed.tenantId;
    }
  } catch {
    // ignore parsing errors
  }

  try {
    const userStr = sessionStorage.getItem(USER_STORAGE_KEY) || localStorage.getItem(USER_STORAGE_KEY);
    if (!userStr) return null;
    const user = JSON.parse(userStr) as { tenantId?: string; tenantIds?: string[] };
    if (user?.tenantId) return user.tenantId;
    if (Array.isArray(user?.tenantIds) && user.tenantIds.length > 0) return user.tenantIds[0];
  } catch {
    // ignore parsing errors
  }

  return null;
};

export const requestPasswordReset = async (email: string): Promise<AuthResult> => {
  await sleep(MOCK_DELAY_MS);
  if (!MOCK_SUCCESS) {
    throw new Error('Reset request failed. TODO: wire backend.');
  }
  if (!email) {
    throw new Error('Email is required.');
  }
  return { ok: true };
};

export const resetPassword = async (token: string, password: string): Promise<AuthResult> => {
  await sleep(MOCK_DELAY_MS);
  if (!MOCK_SUCCESS) {
    throw new Error('Reset failed. TODO: wire backend.');
  }
  if (!token) {
    throw new Error('Reset token is missing.');
  }
  if (!password) {
    throw new Error('Password is required.');
  }
  return { ok: true };
};

export const changePassword = async (currentPassword: string, newPassword: string): Promise<AuthResult> => {
  await sleep(MOCK_DELAY_MS);
  if (!MOCK_SUCCESS) {
    throw new Error('Change password failed. TODO: wire backend.');
  }
  if (!currentPassword || !newPassword) {
    throw new Error('Current and new passwords are required.');
  }
  return { ok: true };
};

export { MOCK_SUCCESS };
