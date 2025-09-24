import React, { useState, useRef } from 'react';
import { View, Text, Button, ActivityIndicator, StyleSheet, Alert, Linking, TextInput, TouchableOpacity } from 'react-native';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import * as Clipboard from 'expo-clipboard';
import { api, API_BASE_URL } from '../services/api';
import { t } from '../i18n';
import { useThemeColors } from '../stores/theme';
import { useAuth } from '../hooks/useAuth';
import appJson from '../../app.json';

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function secureRandomBytes(length: number) {
  // Prefer Web Crypto API if available (also polyfilled by react-native-get-random-values)
  if (typeof globalThis?.crypto?.getRandomValues === 'function') {
    const arr = new Uint8Array(length);
    globalThis.crypto.getRandomValues(arr);
    return arr;
  }

  // Try expo-random if it's installed (returns Uint8Array via getRandomBytesAsync)
  try {
    // dynamic require to avoid bundling/import-time errors when the package isn't installed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const expoRandom = require('expo-random');
    if (expoRandom && typeof expoRandom.getRandomBytesAsync === 'function') {
      const maybeArr = await expoRandom.getRandomBytesAsync(length);
      // ensure Uint8Array
      if (maybeArr instanceof Uint8Array) return maybeArr;
      return new Uint8Array(maybeArr);
    }
  } catch (_err) {
    // fall through to throwing below
  }

  // If we reach here, no secure RNG is available. Do NOT silently fall back to Math.random().
  throw new Error([
    'Secure random number generator is not available in this environment.',
    'A cryptographically secure RNG is required for PKCE and other crypto operations.',
    'Install and configure a secure polyfill, for example:',
    '  - For Expo managed projects: `expo install expo-random` and import/use `getRandomBytesAsync`',
    '  - For bare React Native: `yarn add react-native-get-random-values` and import it at app entry to polyfill `global.crypto`',
    'After installing, re-run the app. Do NOT rely on Math.random() for crypto purposes.'
  ].join(' '));
}

async function sha256Base64Url(input: string) {
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input, { encoding: Crypto.CryptoEncoding.BASE64 });
  return digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generatePKCE() {
  const bytes = await secureRandomBytes(32);
  const verifier = bytesToHex(bytes);
  const challenge = await sha256Base64Url(verifier);
  return { verifier, challenge };
}

type LoginScreenProps = {
  oauthTimeoutMs?: number;
};

// Default OAuth safety timeout: 5 minutes (ms). Can be overridden via
// - component prop `oauthTimeoutMs`
// - expo config `extra.oauthTimeoutMs`
// - env var `EXPO_OAUTH_TIMEOUT_MS`
const DEFAULT_OAUTH_TIMEOUT_MS = 5 * 60 * 1000;

const LoginScreen: React.FC<LoginScreenProps> = ({ oauthTimeoutMs }) => {
  const colors = useThemeColors();
  const { loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualAuthEndpoint, setManualAuthEndpoint] = useState('');
  const [manualClientId, setManualClientId] = useState('');
  const [lastBackendResponse, setLastBackendResponse] = useState<string | null>(null);
  const [redirectUrlInput, setRedirectUrlInput] = useState('');
  const codeVerifierRef = useRef<string | null>(null);

  const resolvedClientId = (Constants as any)?.expoConfig?.extra?.blueskyClientId
    || (Constants as any)?.manifest?.extra?.blueskyClientId
    || (appJson as any)?.expo?.extra?.blueskyClientId
    || '';

  // Determine whether to use Expo auth proxy and explicit proxy URL from config.
  // Sources (in order): Constants.expoConfig?.extra, Constants.manifest?.extra, process.env, appJson.extra
  const _extra = (Constants as any)?.expoConfig?.extra || (Constants as any)?.manifest?.extra || (appJson as any)?.expo?.extra || {};

  function parseBooleanCandidate(v: any, def: boolean) {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'string') {
      const low = v.trim().toLowerCase();
      if (low === 'true' || low === '1' || low === 'yes') return true;
      if (low === 'false' || low === '0' || low === 'no') return false;
    }
    return def;
  }

  const useProxy = parseBooleanCandidate(_extra?.useAuthProxy ?? process.env.EXPO_USE_AUTH_PROXY, true);
  const explicitProxyUrl = (_extra?.authProxyUrl ?? process.env.EXPO_AUTH_PROXY_URL ?? 'https://auth.expo.io/@rietamura/bluesky-langapp');
  let redirectUri = explicitProxyUrl;

  // Determine OAuth safety timeout (ms) using precedence: prop -> expo.extra -> env -> default
  const resolvedOauthTimeoutMs = oauthTimeoutMs ?? (Number(_extra?.oauthTimeoutMs ?? process.env.EXPO_OAUTH_TIMEOUT_MS ?? DEFAULT_OAUTH_TIMEOUT_MS) || DEFAULT_OAUTH_TIMEOUT_MS);

  if (typeof explicitProxyUrl !== 'string' || !/^https?:\/\//i.test(explicitProxyUrl)) {
    // invalid proxy URL — fallback to previous literal but warn
    // eslint-disable-next-line no-console
    console.warn('[LoginScreen] authProxyUrl is missing or invalid, falling back to default explicit proxy URL');
  }
  try {
    const made = (AuthSession as any).makeRedirectUri({ scheme: 'blueskylearning', useProxy });
    // If makeRedirectUri returns an https proxy URL, prefer it; otherwise keep explicitProxyUrl
    // log what makeRedirectUri returns so we can debug why exp:// is still shown
    if (__DEV__) {
      console.log('[LoginScreen] makeRedirectUri returned:', made, 'explicitProxyUrl:', explicitProxyUrl);
    }
    if (typeof made === 'string' && /^https:\/\/auth\.expo\.io\//i.test(made)) redirectUri = made;
  } catch (_err) {
    // ignore and use explicitProxyUrl
  }

  const clientMetadataRef = useRef<any | null>(null);

  // Redact obvious sensitive fields from a JSON string for debug display.
  function redactBackendResponse(raw: string) {
    try {
      const obj = JSON.parse(raw);
      const redact = (v: any) => {
        if (v && typeof v === 'object') {
          for (const k of Object.keys(v)) {
            if (/token|session|password|secret|auth/i.test(k)) {
              v[k] = 'REDACTED';
            } else {
              v[k] = redact(v[k]);
            }
          }
          return v;
        }
        return v;
      };
      const safe = redact(obj);
      return JSON.stringify(safe, null, 2);
    } catch (e) {
      // not JSON, do a simple redact by masking long continuous strings that look like tokens
      return raw.replace(/([A-Za-z0-9_-]{8,})/g, (m) => m.length > 12 ? m.slice(0,6) + '...' + m.slice(-4) : m);
    }
  }
  async function loadClientMetadataIfNeeded() {
    if (clientMetadataRef.current) return clientMetadataRef.current;
    try {
      if (/^https?:\/\//i.test(resolvedClientId)) {
        const r = await fetch(resolvedClientId, { method: 'GET' });
        if (!r.ok) throw new Error(`client_metadata fetch failed: ${r.status}`);
        const j = await r.json();
        clientMetadataRef.current = j;
        return j;
      }
    } catch (e) {
      clientMetadataRef.current = null;
    }
    return null;
  }

  // Helper: exchange authorization code for session via backend
  const exchangeCodeForSession = async (
    code: string,
    verifier: string | null | undefined,
    redirect_uri: string,
    clientId: string | undefined,
    setLastBackendResponse: React.Dispatch<React.SetStateAction<string | null>>,
    setError: React.Dispatch<React.SetStateAction<string | null>>
  ): Promise<boolean> => {
    try {
      const res = await api.post('/api/atprotocol/init', { oauth: { code, code_verifier: verifier, redirect_uri, client_id: clientId } });
      try { setLastBackendResponse(JSON.stringify(res?.data || res || {}, null, 2)); } catch { setLastBackendResponse(String(res)); }
      const sessionId = (res as any)?.data?.sessionId || (res as any)?.sessionId || (res as any)?.data?.data?.sessionId;
      if (sessionId) {
        try { await SecureStore.setItemAsync('auth.sessionId', sessionId); } catch (_) { /* ignore */ }
        try { await api.get('/api/auth/me'); } catch (_) { /* ignore */ }
        // Clear stored PKCE verifier now that exchange succeeded
        try { await SecureStore.deleteItemAsync('pkce.verifier'); } catch (_) { /* ignore */ }
        codeVerifierRef.current = null;
  Alert.alert(t('auth.success.title'), t('auth.success.message'));
        setError(null);
        return true;
      }
  Alert.alert(t('auth.serverResponse.title'), t('auth.serverResponse.message'));
      return false;
    } catch (e: any) {
      setLastBackendResponse(e?.message || String(e));
      setError(e?.message || 'トークン交換に失敗しました');
      return false;
    }
  };

  const onStartOAuth = async () => {
    setError(null);
    if (!resolvedClientId && !manualClientId) {
  Alert.alert(t('config.required'), t('config.clientIdMessage'));
      return;
    }
    setBusy(true);
    try {
      const { verifier, challenge } = await generatePKCE();
      codeVerifierRef.current = verifier;
      try { await SecureStore.setItemAsync('pkce.verifier', verifier); } catch (_) { /* ignore */ }

      const state = Math.random().toString(36).slice(2);
      const meta = await loadClientMetadataIfNeeded();
      const authEndpoint = manualAuthEndpoint || (meta?.authorization_endpoint) || 'https://bsky.social/oauth/authorize';
      const effectiveClient = manualClientId || resolvedClientId;

      // Determine scope: prefer metadata, but ensure 'atproto' is present
      let scopeVal = 'atproto';
      try {
        const metaScope = meta?.scope;
        if (Array.isArray(metaScope)) scopeVal = metaScope.join(' ');
        else if (typeof metaScope === 'string' && metaScope.trim().length > 0) scopeVal = metaScope.trim();
      } catch (_) { /* ignore */ }
      if (!/\batproto\b/.test(scopeVal)) scopeVal = (scopeVal + ' atproto').trim();

      if (__DEV__) {
        console.log('[LoginScreen DEBUG] effectiveClient (raw)=', effectiveClient);
        console.log('[LoginScreen DEBUG] effectiveClient (encoded)=', encodeURIComponent(effectiveClient));
      }

      const authUrl = `${authEndpoint}?response_type=code&client_id=${encodeURIComponent(effectiveClient)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopeVal)}&state=${state}&code_challenge=${encodeURIComponent(challenge)}&code_challenge_method=S256`;

      if (__DEV__) {
        console.log('[LoginScreen] authUrl=', authUrl);
        try { Alert.alert('Auth URL', authUrl); } catch (_) { /* ignore */ }
      }

      // Try platform helper first
      let result: any = null;
      const startAsync = (AuthSession as any)?.startAsync || (AuthSession as any)?.openAuthSessionAsync;
      try {
        if (typeof startAsync === 'function') {
          result = await startAsync({ authUrl });
        } else {
          throw new Error('startAsync unavailable');
        }
      } catch (_e) {
        // Fallback to Linking + listener
        result = await new Promise<any>((resolve) => {
          let handled = false;
          let subscription: any = null;

          // safety timeout: configurable (default 5 minutes)
          const timer = setTimeout(() => {
            if (!handled) {
              handled = true;
              try { subscription?.remove?.(); } catch (_) { /* ignore */ }
              resolve({ type: 'dismiss' });
            }
          }, resolvedOauthTimeoutMs);

          const cleanup = () => {
            try { subscription?.remove?.(); } catch (_) { /* ignore */ }
            try { clearTimeout(timer); } catch (_) { /* ignore */ }
          };

          const handler = (event: any) => {
            if (handled) return;
            handled = true;
            cleanup();
            try {
              const urlStr = event?.url || event;
              const parsed = new URL(urlStr);
              const params: Record<string, string> = {};
              parsed.searchParams.forEach((v, k) => { params[k] = v; });
              if (__DEV__) console.log('[LoginScreen] Linking event url:', urlStr, 'params:', params);
              resolve({ type: 'success', params });
            } catch (err) {
              resolve({ type: 'error' });
            }
          };

          try {
            if ((Linking as any).addEventListener) subscription = (Linking as any).addEventListener('url', handler);
            else subscription = (Linking as any).addListener('url', handler);
          } catch (_) {
            try { subscription = (Linking as any).addEventListener?.('url', handler); } catch (_) { /* ignore */ }
          }

          // open browser after listener attached
          try { Linking.openURL(authUrl); } catch (_) { /* ignore */ }
        });
      }

      if (__DEV__) console.log('[LoginScreen] auth result=', result);

      // Handle result
      if (result && (result as any).type === 'success' && (result as any).params && (result as any).params.code) {
        const code = (result as any).params.code;
        const client_id_for_exchange = manualClientId || resolvedClientId || undefined;
        const ok = await exchangeCodeForSession(code, verifier, redirectUri, client_id_for_exchange, setLastBackendResponse, setError);
        if (ok) return;
      } else if (result && ((result as any).type === 'dismiss' || (result as any).type === 'cancel')) {
        setError('OAuth がキャンセルされました');
      } else {
        setError('OAuth フローでエラーが発生しました');
      }
    } catch (e: any) {
      setError(e?.message || 'OAuth の準備でエラー');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator /></View>;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>ログイン</Text>
      <Text style={{ color: colors.secondaryText, marginBottom: 8 }}>OAuth client: {resolvedClientId || '(未設定)'}</Text>

      <TextInput
        placeholder="authorization_endpoint (手動デバッグ用)"
        value={manualAuthEndpoint}
        onChangeText={setManualAuthEndpoint}
        style={[styles.input, { borderColor: colors.border, color: colors.text, marginBottom: 8 }]}
        autoCapitalize="none"
      />
      <TextInput
        placeholder="client_id (手動)"
        value={manualClientId}
        onChangeText={setManualClientId}
        style={[styles.input, { borderColor: colors.border, color: colors.text, marginBottom: 8 }]}
        autoCapitalize="none"
      />

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ fontSize: 12, color: colors.secondaryText, flex: 1 }}>redirectUri: {redirectUri}</Text>
        <View style={{ width: 8 }} />
        <Button title="Copy" onPress={async () => {
          try {
            await Clipboard.setStringAsync(redirectUri);
            Alert.alert('Copied', 'redirectUri をクリップボードにコピーしました');
          } catch (e:any) {
            Alert.alert('コピー失敗', e?.message || 'failed to copy');
          }
        }} />
      </View>

      {!!error && <Text style={{ color: colors.error, marginBottom: 8 }}>{error}</Text>}

      <TouchableOpacity
        onPress={onStartOAuth}
        disabled={busy}
        style={[
          styles.primaryButton,
          { backgroundColor: (colors as any).primary || '#0a84ff' },
          busy ? { opacity: 0.7 } : {}
        ]}
      >
        <Text style={styles.primaryButtonText}>{busy ? '処理中...' : 'Sign in with Bluesky (PKCE)'}</Text>
      </TouchableOpacity>
      <View style={{ height: 8 }} />
      <Button title="Open auth URL in browser (debug)" onPress={async () => {
        setError(null);
        try {
          const { verifier, challenge } = await generatePKCE();
          const state = Math.random().toString(36).slice(2);
          const meta = await loadClientMetadataIfNeeded();
          const authEndpoint = manualAuthEndpoint || (meta?.authorization_endpoint) || 'https://bsky.social/oauth/authorize';
          const effectiveClient = manualClientId || resolvedClientId;
          const authUrl = `${authEndpoint}?response_type=code&client_id=${encodeURIComponent(effectiveClient)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=all&state=${state}&code_challenge=${encodeURIComponent(challenge)}&code_challenge_method=S256`;
          codeVerifierRef.current = verifier;
          if (__DEV__) {
            console.log('[LoginScreen DEBUG] authUrl=', authUrl, 'redirectUri=', redirectUri, 'verifier=', verifier);
            Alert.alert('Auth URL', authUrl);
          }
          await Linking.openURL(authUrl);
        } catch (e: any) {
          Alert.alert('デバッグ起動エラー', e?.message || 'error');
        }
      }} />

      <View style={{ height: 12 }} />
      <View style={{ marginTop: 8 }}>
        <Text style={{ fontSize: 12, color: colors.secondaryText, marginBottom: 6 }}>If the flow ends on a white page, paste the final redirect URL here and press "Process"</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <TextInput
            placeholder="Paste final redirect URL"
            value={redirectUrlInput}
            onChangeText={setRedirectUrlInput}
            style={[styles.input, { borderColor: colors.border, color: colors.text, flex: 1 }]}
            autoCapitalize="none"
          />
          <View style={{ width: 8 }} />
          <Button title="Paste" onPress={async () => {
            try {
              // dynamic require to avoid build issues
              // eslint-disable-next-line @typescript-eslint/no-var-requires
              const mod: any = require('expo-clipboard');
              if (mod && typeof mod.getStringAsync === 'function') {
                const txt = await mod.getStringAsync();
                setRedirectUrlInput(txt || '');
              } else {
                throw new Error('clipboard module missing');
              }
            } catch (e:any) {
              Alert.alert('Paste failed', e?.message || 'failed to paste');
            }
          }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button title="Process" onPress={async () => {
            if (!redirectUrlInput) { Alert.alert('No URL', 'Please paste the redirect URL first'); return; }
            try {
              const parsed = new URL(redirectUrlInput);
              const params: Record<string,string> = {};
              parsed.searchParams.forEach((v,k)=>{ params[k]=v; });
              if (!params.code) { Alert.alert('No code', 'The provided URL does not contain an authorization code'); return; }
                  const code = params.code;
                  let verifier = codeVerifierRef.current;
                  if (!verifier) {
                    try {
                      verifier = await SecureStore.getItemAsync('pkce.verifier');
                      if (verifier) codeVerifierRef.current = verifier;
                    } catch (_) { /* ignore */ }
                  }
                  if (!verifier) { Alert.alert('Missing verifier', 'PKCE verifier is missing; restart the flow and try again'); return; }
              setBusy(true);
              try {
                const client_id_for_exchange = manualClientId || resolvedClientId || undefined;
                const ok = await exchangeCodeForSession(code, verifier, redirectUri, client_id_for_exchange, setLastBackendResponse, setError);
                if (ok) return;
              } catch (e:any) {
                // exchangeCodeForSession handles errors and sets state; keep catch to mirror existing control flow
              }
            } catch (e:any) {
              Alert.alert('処理エラー', e?.message || String(e));
            } finally {
              setBusy(false);
              codeVerifierRef.current = null;
            }
          }} />
        </View>
      </View>
      <Text style={{ fontSize: 12, color: colors.secondaryText, marginBottom: 6 }}>API: {API_BASE_URL}</Text>
      <Button title="接続テスト" onPress={async () => {
        try {
          await api.get('/health');
          Alert.alert('接続OK', `API: ${API_BASE_URL}`);
        } catch (e:any) {
          // If it's our ApiErrorShape, display its message and status
          const msg = e?.message || e?.error || String(e);
          const status = e?.status ? ` (status: ${e.status})` : '';
          Alert.alert('接続失敗', `${msg}${status}\n\nAPI: ${API_BASE_URL}`);
          setLastBackendResponse(JSON.stringify(e, null, 2));
        }
      }} />

      {__DEV__ && lastBackendResponse ? (
        <View style={{ marginTop: 12, padding: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 6 }}>
          <Text style={{ fontSize: 12, color: colors.secondaryText, marginBottom: 6 }}>Last backend response:</Text>
          <Text style={{ fontSize: 11, color: colors.text }}>{redactBackendResponse(lastBackendResponse)}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  input: { borderWidth: 1, padding: 12, borderRadius: 8 },
  primaryButton: { paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default LoginScreen;
