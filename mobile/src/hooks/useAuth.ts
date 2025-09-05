import { useEffect, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api } from '../services/api';

interface AuthState {
  sessionId: string | null;
  identifier: string | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ sessionId: null, identifier: null, loading: true });

  useEffect(() => {
    (async () => {
      const sessionId = await SecureStore.getItemAsync('auth.sessionId');
      if (sessionId) {
        try {
          const me = await api.get<{ authenticated: boolean; user: { identifier: string } }>('/api/auth/me');
          if ((me as any).data?.authenticated) {
            setState({ sessionId, identifier: (me as any).data.user.identifier, loading: false });
            return;
          }
        } catch {/* ignore */}
        await SecureStore.deleteItemAsync('auth.sessionId');
      }
  setState((prev: AuthState) => ({ ...prev, loading: false }));
    })();
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
  const res: any = await api.post<any>('/api/auth/login', { identifier, password });
  const sessionId = res.sessionId || res.data?.sessionId || res.data?.data?.sessionId;
    if (sessionId) {
      await SecureStore.setItemAsync('auth.sessionId', sessionId);
      setState({ sessionId, identifier, loading: false });
    }
    return res;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/api/auth/logout', {}); } catch {/* ignore */}
    await SecureStore.deleteItemAsync('auth.sessionId');
    setState({ sessionId: null, identifier: null, loading: false });
  }, []);

  return { ...state, login, logout, isAuthenticated: !!state.sessionId && !!state.identifier };
}
