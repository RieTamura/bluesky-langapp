import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { api } from '../services/api';
// (no placeholder comments)

interface AuthState {
  sessionId: string | null;
  identifier: string | null;
  loading: boolean;
}

// Shape of the `/api/auth/me` payload (the API wraps this in ApiSuccess<T>)
interface AuthMePayload {
  authenticated?: boolean;
  user?: { identifier?: string } | null;
  [k: string]: any;
}

// Single timeout constant used for auth/me lookups during startup and mount.
const AUTH_ME_TIMEOUT_MS = 3000;

// Module-scope guard to dedupe concurrent /api/auth/me calls across the app
let authMeInProgress = false;

/**
 * Fetch /api/auth/me with a short timeout and dedupe concurrent calls.
 * Returns the parsed payload or null on failure/timeout.
 */
export async function refreshAuthCache(timeoutMs = AUTH_ME_TIMEOUT_MS, qc?: ReturnType<typeof useQueryClient>): Promise<AuthMePayload | null> {
  if (authMeInProgress) {
    // If another caller is already refreshing, wait a short time for it to complete and then return null.
    // This avoids multiple parallel /api/auth/me requests during app startup.
    if (typeof Promise === 'function') {
      // Poll for in-progress flag to clear (max wait = timeoutMs)
      const start = Date.now();
      while (authMeInProgress && Date.now() - start < timeoutMs) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 50));
      }
    }
    return null;
  }

  authMeInProgress = true;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const me = await api.get<AuthMePayload>('/api/auth/me', { signal: ctrl.signal });
      const payload = me?.data ?? (me as unknown as AuthMePayload);
      // Update react-query caches if a QueryClient was passed in from the caller
      if (qc) {
        try { qc.setQueryData(['auth','me'], payload); } catch (_) { /* ignore */ }
        const user = payload?.user ?? payload;
        try { qc.setQueryData(['profile','me'], user); } catch (_) { /* ignore */ }
      }
      return payload;
    } catch (e) {
      return null;
    } finally {
      clearTimeout(timer);
    }
  } finally {
    authMeInProgress = false;
  }
}

// -----------------------------
// Global singleton auth store
// -----------------------------
let authState: AuthState = { sessionId: null, identifier: null, loading: true };
const subscribers = new Set<(s: AuthState) => void>();
let initialized = false;

function emit() { subscribers.forEach(fn => fn(authState)); }

async function bootstrap() {
  if (initialized) return; // ensure one-time init
  initialized = true;
  // Watchdog: ensure UI doesn't stay in loading state too long if async ops hang
  try {
    // Ensure the watchdog is at least as long as the AUTH_ME timeout to avoid
    // clearing the loading state before auth/me has a chance to complete.
    const watchdogMs = Math.max(1000, AUTH_ME_TIMEOUT_MS);
    const w = setTimeout(() => {
      if (authState.loading) {
        authState = { ...authState, loading: false };
        // best-effort emit so UI can render quickly
        emit();
        // eslint-disable-next-line no-console
        console.log('[useAuth] bootstrap watchdog triggered; clearing loading state');
      }
    }, watchdogMs);
    // Ensure watchdog cleared when bootstrap finishes by running the bootstrap
    // logic inside this IIFE and clearing the timeout in finally.
    await (async () => {
      try {
        const sessionId = await SecureStore.getItemAsync('auth.sessionId');
        if (sessionId) {
          try {
            // Use the centralized refreshAuthCache helper which dedupes /api/auth/me calls
            const payload = await refreshAuthCache(AUTH_ME_TIMEOUT_MS);
            if (payload?.authenticated) {
              authState = { sessionId, identifier: payload.user?.identifier ?? null, loading: false };
              emit();
              return;
            }
          } catch {/* ignore */}
          await SecureStore.deleteItemAsync('auth.sessionId');
        }
      } finally {
        authState = { ...authState, loading: false };
        emit();
      }
    })();
    clearTimeout(w);
  } catch (e) { /* ignore watchdog setup errors */ }
}

async function setSession(sessionId: string, identifier: string) {
  await SecureStore.setItemAsync('auth.sessionId', sessionId);
  authState = { sessionId, identifier, loading: false };
  emit();
}

async function clearSession() {
  await SecureStore.deleteItemAsync('auth.sessionId');
  authState = { sessionId: null, identifier: null, loading: false };
  emit();
}

export function useAuth() {
  const qc = useQueryClient();
  const [local, setLocal] = useState<AuthState>(authState);

  // Subscribe to global auth state
  useEffect(() => {
    subscribers.add(setLocal);
    if (!initialized) bootstrap();
    // Ensure react-query cache has the latest /api/auth/me and profile info so
    // components that read from cache (FooterNav) can show avatar immediately.
    (async () => {
      // Use refreshAuthCache which dedupes calls and accepts qc for cache population
      try {
        await refreshAuthCache(AUTH_ME_TIMEOUT_MS, qc);
      } catch (_) { /* ignore */ }
    })();
    return () => { subscribers.delete(setLocal); };
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const res: any = await api.post<any>('/api/auth/login', { identifier, password });
    const sessionId = res.sessionId || res.data?.sessionId || res.data?.data?.sessionId;
    if (sessionId) {
      await setSession(sessionId, identifier);
      // After login, fetch /api/auth/me and populate react-query cache so components
      // that read from cache (FooterNav) can immediately show profile/avatar.
      try {
        const me = await api.get<any>('/api/auth/me');
        const payload = (me as any).data ?? me;
        try { qc.setQueryData(['auth','me'], payload); } catch (_) { /* ignore */ }
        const user = payload?.user ?? payload;
        try { qc.setQueryData(['profile','me'], user); } catch (_) { /* ignore */ }
      } catch (e) {
        // ignore
      }
    }
    return res;
  }, [qc]);

  const logout = useCallback(async () => {
    try { await api.post('/api/auth/logout', {}); } catch {/* ignore */}
    await clearSession();
  }, []);

  return { ...local, login, logout, isAuthenticated: !!local.sessionId && !!local.identifier };
}
