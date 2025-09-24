import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { api } from '../services/api';
// ...existing code...

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
    const watchdogMs = 1000;
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
            // Avoid blocking startup for a long time if /api/auth/me is slow/unreachable.
            // Use a short timeout so the app can show the login screen quickly.
            // Use AbortController to cancel the fetch if it exceeds the timeout.
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), AUTH_ME_TIMEOUT_MS);
            try {
              const me = await api.get<AuthMePayload>('/api/auth/me', { signal: ctrl.signal });
              if (me?.data?.authenticated) {
                authState = { sessionId, identifier: me.data.user?.identifier ?? null, loading: false };
                emit();
                return;
              }
            } catch {/* ignore */} finally {
              clearTimeout(timer);
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
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), AUTH_ME_TIMEOUT_MS);
          try {
            const me = await api.get<AuthMePayload>('/api/auth/me', { signal: ctrl.signal });
            const payload = me.data ?? (me as unknown as AuthMePayload);
            // store top-level auth/me response
            try { qc.setQueryData(['auth','me'], payload); } catch (_) { /* ignore */ }
            // prefer payload.user for profile cache, else payload itself
            const user = payload?.user ?? payload;
            try { qc.setQueryData(['profile','me'], user); } catch (_) { /* ignore */ }
          } finally {
            clearTimeout(timer);
          }
        } catch (e) {
          // ignore
        }
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
