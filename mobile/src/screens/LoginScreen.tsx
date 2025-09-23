import React, { useState, useRef } from 'react';
import { View, Text, Button, ActivityIndicator, StyleSheet, Alert, Linking, TextInput, TouchableOpacity } from 'react-native';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import { api, API_BASE_URL } from '../services/api';
import { useThemeColors } from '../stores/theme';
import { useAuth } from '../hooks/useAuth';
import appJson from '../../app.json';

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function secureRandomBytes(length: number) {
  if (typeof globalThis?.crypto?.getRandomValues === 'function') {
    const arr = new Uint8Array(length);
    globalThis.crypto.getRandomValues(arr);
    return arr;
  }
  const arr = new Uint8Array(length);
  for (let i = 0; i < length; i++) arr[i] = Math.floor(Math.random() * 256);
  return arr;
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

const LoginScreen: React.FC = () => {
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

  // Force Expo auth proxy so the redirectUri is https://auth.expo.io/...,
  // which many AS (including bsky.social) require instead of custom schemes like exp://
  // Some environments still return an exp:// URI from makeRedirectUri; to be certain
  // we use an explicit proxy URL in development.
  const useProxy = true;
  // Explicit Expo auth proxy URL — must match the exact value you will add to
  // your published client metadata's redirect_uris. Replace owner/slug if needed.
  const explicitProxyUrl = 'https://auth.expo.io/@rietamura/bluesky-langapp';
  let redirectUri = explicitProxyUrl;
  try {
    const made = (AuthSession as any).makeRedirectUri({ scheme: 'blueskylearning', useProxy });
    // If makeRedirectUri returns an https proxy URL, prefer it; otherwise keep explicitProxyUrl
    // log what makeRedirectUri returns so we can debug why exp:// is still shown
    // eslint-disable-next-line no-console
    console.log('[LoginScreen] makeRedirectUri returned:', made, 'explicitProxyUrl:', explicitProxyUrl);
    if (typeof made === 'string' && /^https:\/\/auth\.expo\.io\//i.test(made)) redirectUri = made;
  } catch (_err) {
    // ignore and use explicitProxyUrl
  }

  const clientMetadataRef = useRef<any | null>(null);
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

  const onStartOAuth = async () => {
    setError(null);
    if (!resolvedClientId && !manualClientId) {
      Alert.alert('設定が必要', 'app.json の extra.blueskyClientId を設定するか、手動で client_id を入力してください。');
      return;
    }
    setBusy(true);
    try {
      const { verifier, challenge } = await generatePKCE();
      codeVerifierRef.current = verifier;
      try {
        await SecureStore.setItemAsync('pkce.verifier', verifier);
      } catch (_) { /* ignore */ }
      const state = Math.random().toString(36).slice(2);
      const meta = await loadClientMetadataIfNeeded();
  const authEndpoint = manualAuthEndpoint || (meta?.authorization_endpoint) || 'https://bsky.social/oauth/authorize';
      const effectiveClient = manualClientId || resolvedClientId;
      // Determine scope: prefer metadata, but ensure 'atproto' is present (required by some AS)
      let scopeVal = 'atproto';
      try {
        const metaScope = meta?.scope;
        if (Array.isArray(metaScope)) scopeVal = metaScope.join(' ');
        else if (typeof metaScope === 'string' && metaScope.trim().length > 0) scopeVal = metaScope.trim();
      } catch (_) { /* ignore */ }
      if (!/\batproto\b/.test(scopeVal)) scopeVal = (scopeVal + ' atproto').trim();

    // Debug: log raw and encoded client_id to detect double-encoding / missing value issues
    // eslint-disable-next-line no-console
    console.log('[LoginScreen DEBUG] effectiveClient (raw)=', effectiveClient);
    // eslint-disable-next-line no-console
    console.log('[LoginScreen DEBUG] effectiveClient (encoded)=', encodeURIComponent(effectiveClient));
    const authUrl = `${authEndpoint}?response_type=code&client_id=${encodeURIComponent(effectiveClient)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopeVal)}&state=${state}&code_challenge=${encodeURIComponent(challenge)}&code_challenge_method=S256`;

    // Debug: show the full auth URL so we can inspect provider errors if the flow fails
    // eslint-disable-next-line no-console
    console.log('[LoginScreen] authUrl=', authUrl);
  try { Alert.alert('Auth URL', authUrl); } catch (_) { /* ignore */ }

      // Try to open via AuthSession.startAsync if available, otherwise
      // fall back to opening the URL and listening for the redirect via Linking.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let result: any;
      try {
        const startAsync = (AuthSession as any)?.startAsync || (AuthSession as any)?.openAuthSessionAsync;
        if (typeof startAsync === 'function') {
          result = await startAsync({ authUrl });
        } else {
          throw new Error('startAsync unavailable');
        }
      } catch (e) {
        // Fallback: listen to Linking events and open the URL in the browser
        result = await new Promise<any>((resolve) => {
          let handled = false;
          let subscription: any = null;
          const handler = (event: any) => {
            if (handled) return;
            handled = true;
            try {
              const urlStr = event?.url || event;
              const parsed = new URL(urlStr);
              const params: Record<string, string> = {};
              parsed.searchParams.forEach((v, k) => { params[k] = v; });
              // log linking event
              // eslint-disable-next-line no-console
              console.log('[LoginScreen] Linking event url:', urlStr, 'params:', params);
              resolve({ type: 'success', params });
            } catch (err) {
              resolve({ type: 'error' });
            } finally {
              try { subscription?.remove?.(); } catch (_) { /* ignore */ }
            }
          };

          try {
            // addEventListener is deprecated on some RN versions, use addListener if available
            if ((Linking as any).addEventListener) subscription = (Linking as any).addEventListener('url', handler);
            else subscription = (Linking as any).addListener('url', handler);
          } catch (_) {
            try { subscription = (Linking as any).addEventListener?.('url', handler); } catch (_) { /* ignore */ }
          }

          // safety timeout: 2 minutes
          setTimeout(() => {
            if (!handled) {
              handled = true;
              try { subscription?.remove?.(); } catch (_) { /* ignore */ }
              resolve({ type: 'dismiss' });
            }
          }, 2 * 60 * 1000);
        });

        // open browser (after listener attached)
        try { Linking.openURL(authUrl); } catch (_) { /* ignore */ }
      }
      // Log the final result from AuthSession or Linking
      // eslint-disable-next-line no-console
      console.log('[LoginScreen] auth result=', result);
      // result handling
        if (result && (result as any).type === 'success' && (result as any).params && (result as any).params.code) {
        const code = (result as any).params.code;
        try {
          const client_id_for_exchange = manualClientId || resolvedClientId || undefined;
          const res = await api.post('/api/atprotocol/init', { oauth: { code, code_verifier: verifier, redirect_uri: redirectUri, client_id: client_id_for_exchange } });
          // store full backend response for debugging
          try { setLastBackendResponse(JSON.stringify(res?.data || res || {}, null, 2)); } catch { setLastBackendResponse(String(res)); }
          const sessionId = (res as any)?.data?.sessionId || (res as any)?.sessionId || (res as any)?.data?.data?.sessionId;
          if (sessionId) {
              await SecureStore.setItemAsync('auth.sessionId', sessionId);
              try { await api.get('/api/auth/me'); } catch (_) { /* ignore */ }
              // Clear stored PKCE verifier now that exchange succeeded
              try { await SecureStore.deleteItemAsync('pkce.verifier'); } catch (_) { /* ignore */ }
              codeVerifierRef.current = null;
              Alert.alert('認証成功', 'ログイン情報を受け取りました。');
              setError(null);
              return;
            }
          Alert.alert('認証: サーバ応答', 'サーバが sessionId を返しませんでした。バックエンドの実装を確認してください。');
        } catch (e: any) {
          setLastBackendResponse(e?.message || String(e));
          setError(e?.message || 'トークン交換に失敗しました');
        }
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
              // require is used to avoid TS module resolution failures in some setups
              // eslint-disable-next-line @typescript-eslint/no-var-requires
              const mod: any = require('expo-clipboard');
              if (mod && typeof mod.setStringAsync === 'function') {
                await mod.setStringAsync(redirectUri);
                Alert.alert('Copied', 'redirectUri をクリップボードにコピーしました');
              } else {
                throw new Error('clipboard module missing');
              }
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
          // eslint-disable-next-line no-console
          console.log('[LoginScreen DEBUG] authUrl=', authUrl, 'redirectUri=', redirectUri, 'verifier=', verifier);
          Alert.alert('Auth URL', authUrl);
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
                const res = await api.post('/api/atprotocol/init', { oauth: { code, code_verifier: verifier, redirect_uri: redirectUri, client_id: client_id_for_exchange } });
                try { setLastBackendResponse(JSON.stringify(res?.data || res || {}, null, 2)); } catch { setLastBackendResponse(String(res)); }
                const sessionId = (res as any)?.data?.sessionId || (res as any)?.sessionId || (res as any)?.data?.data?.sessionId;
                if (sessionId) {
                  await SecureStore.setItemAsync('auth.sessionId', sessionId);
                  try { await api.get('/api/auth/me'); } catch (_) { /* ignore */ }
                  // Clear stored PKCE verifier
                  try { await SecureStore.deleteItemAsync('pkce.verifier'); } catch (_) { /* ignore */ }
                  codeVerifierRef.current = null;
                  Alert.alert('認証成功', 'ログイン情報を受け取りました。');
                  setError(null);
                  return;
                }
                Alert.alert('認証: サーバ応答', 'サーバが sessionId を返しませんでした。バックエンドの実装を確認してください。');
              } catch (e:any) {
                setLastBackendResponse(e?.message || String(e));
                setError(e?.message || 'トークン交換に失敗しました');
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

      {lastBackendResponse ? (
        <View style={{ marginTop: 12, padding: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 6 }}>
          <Text style={{ fontSize: 12, color: colors.secondaryText, marginBottom: 6 }}>Last backend response:</Text>
          <Text style={{ fontSize: 11, color: colors.text }}>{lastBackendResponse}</Text>
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
