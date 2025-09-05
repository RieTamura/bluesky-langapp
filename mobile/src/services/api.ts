// Basic mobile API client with error mapping and retry
import * as SecureStore from 'expo-secure-store';

export type ApiErrorCode =
  | 'AUTH_REQUIRED'
  | 'ACCESS_DENIED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMIT'
  | 'VALIDATION_ERROR'
  | 'DICT_TIMEOUT'
  | 'DICT_UPSTREAM'
  | 'SERVER_ERROR'
  | 'NETWORK_OFFLINE'
  | 'PARSE_ERROR';

export interface ApiErrorShape {
  success?: false;
  error: ApiErrorCode | string;
  message: string;
  data?: any;
  status?: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: any;
  message?: string;
}

const BASE_URL = __DEV__ ? 'http://localhost:3000' : 'https://your-api.example.com';

const RETRY_POLICIES: Record<string, number[]> = {
  RATE_LIMIT: [5000],
  SERVER_ERROR: [1000, 2000],
  DICT_TIMEOUT: [1500],
  DICT_UPSTREAM: [1500]
};

async function getSessionId() {
  return SecureStore.getItemAsync('auth.sessionId');
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function mapStatusToCode(status: number): ApiErrorCode {
  switch (status) {
    case 401: return 'AUTH_REQUIRED';
    case 403: return 'ACCESS_DENIED';
    case 404: return 'NOT_FOUND';
    case 409: return 'CONFLICT';
    case 429: return 'RATE_LIMIT';
    case 400: return 'VALIDATION_ERROR';
    case 502: return 'DICT_UPSTREAM';
    case 504: return 'DICT_TIMEOUT';
    default: return status >= 500 ? 'SERVER_ERROR' : 'SERVER_ERROR';
  }
}

async function request<T>(path: string, init: RequestInit = {}, attempt = 0): Promise<ApiSuccess<T>> {
  const sessionId = await getSessionId();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> || {})
  };
  if (sessionId) headers.Authorization = `Bearer ${sessionId}`;

  let res: Response;
  try {
    res = await fetch(BASE_URL + path, { ...init, headers });
  } catch (e) {
    // network level
    if (!navigator.onLine) {
      throw <ApiErrorShape>{ error: 'NETWORK_OFFLINE', message: 'オフラインです', status: 0 };
    }
    throw <ApiErrorShape>{ error: 'SERVER_ERROR', message: 'ネットワークエラー', status: 0 };
  }

  let json: any;
  try { json = await res.json(); } catch { /* ignore parse here */ }

  if (!res.ok) {
    const code = mapStatusToCode(res.status);
    const shape: ApiErrorShape = {
      error: (json?.error as string) || code,
      message: json?.message || code,
      status: res.status
    };
    const retryPlan = RETRY_POLICIES[code];
    if (retryPlan && attempt < retryPlan.length) {
      await sleep(retryPlan[attempt]);
      return request<T>(path, init, attempt + 1);
    }
    if (code === 'AUTH_REQUIRED') {
      await SecureStore.deleteItemAsync('auth.sessionId');
    }
    throw shape;
  }

  return { success: true, data: json?.data ?? json, meta: json?.meta, message: json?.message };
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: any) => request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: any) => request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' })
};

// Example domain functions
export const wordsApi = {
  list: (params: { status?: string; languageCode?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.set('status', params.status);
    if (params.languageCode) q.set('languageCode', params.languageCode);
    return api.get<any>(`/api/words${q.toString() ? `?${q.toString()}` : ''}`);
  },
  due: (languageCode?: string) => api.get<any>(`/api/learning/due-words${languageCode ? `?languageCode=${languageCode}` : ''}`),
  create: (w: { word: string; definition?: string; exampleSentence?: string; languageCode?: string }) => api.post<any>('/api/words', w),
  update: (id: string, patch: any) => api.put<any>(`/api/words/${id}`, patch),
  remove: (id: string) => api.delete<any>(`/api/words/${id}`)
};

export const quizApi = {
  start: (count = 5) => api.get<any>(`/api/learning/quiz?count=${count}`),
  current: (sessionId: string) => api.get<any>(`/api/learning/quiz?sessionId=${sessionId}`),
  answer: (sessionId: string, answer: string, responseTimeMs?: number) => api.post<any>('/api/learning/quiz/answer', { sessionId, answer, responseTimeMs })
};

export const authApi = {
  login: (identifier: string, password: string) => api.post<any>('/api/auth/login', { identifier, password }),
  me: () => api.get<any>('/api/auth/me'),
  logout: () => api.post<any>('/api/auth/logout', {})
};

export const statsApi = {
  advanced: () => api.get<any>('/api/learning/advanced-stats'),
  progress: () => api.get<any>('/api/learning/progress'),
  schedule: () => api.get<any>('/api/learning/review-schedule')
};
