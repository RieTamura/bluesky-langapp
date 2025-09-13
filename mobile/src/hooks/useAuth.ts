import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { api } from '../services/api';

interface AuthState {
  sessionId: string | null;
  identifier: string | null;
  loading: boolean;
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
  try {
    const sessionId = await SecureStore.getItemAsync('auth.sessionId');
    if (sessionId) {
      try {
        const me = await api.get<{ authenticated: boolean; user: { identifier: string } }>('/api/auth/me');
        if ((me as any).data?.authenticated) {
          authState = { sessionId, identifier: (me as any).data.user.identifier, loading: false };
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
        const me = await api.get<any>('/api/auth/me');
        const payload = (me as any).data ?? me;
        // store top-level auth/me response
        try { qc.setQueryData(['auth','me'], payload); } catch (_) { /* ignore */ }
        // prefer payload.user for profile cache, else payload itself
        const user = payload?.user ?? payload;
        try { qc.setQueryData(['profile','me'], user); } catch (_) { /* ignore */ }
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
