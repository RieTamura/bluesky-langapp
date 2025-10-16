import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Linking,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from "react-native";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import * as AuthSession from "expo-auth-session";
import Constants from "expo-constants";
import { atpWorkersAuth, ATP_WORKER_BASE_URL, api } from "../services/api";
import { t } from "../i18n";
import { useThemeColors } from "../stores/theme";
import { useAuth, refreshAuthCache } from "../hooks/useAuth";
import appJson from "../../app.json";

// =======================
// Types & Constants
// =======================

const DEFAULT_OAUTH_TIMEOUT_MS = 5 * 60 * 1000;

type LoginScreenProps = { oauthTimeoutMs?: number };

export type LoginConfig = {
  resolvedClientId: string;
  useProxy: boolean;
  explicitProxyUrl: string;
  redirectUri: string;
  resolvedOauthTimeoutMs: number;
  authUseLinkingOnly: boolean;
};

// In-flight exchange dedupe set (authorization code)
const exchangeInFlightSet: Set<string> = new Set();

// =======================
// Utility helpers
// =======================

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function secureRandomBytes(length: number) {
  // Prefer Web Crypto API if polyfilled
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g: any = globalThis as any;
  if (typeof g?.crypto?.getRandomValues === "function") {
    const arr = new Uint8Array(length);
    g.crypto.getRandomValues(arr);
    return arr;
  }

  // expo-crypto fallback
  try {
    if (typeof (Crypto as any)?.getRandomBytesAsync === "function") {
      const arr = await (Crypto as any).getRandomBytesAsync(length);
      return arr instanceof Uint8Array ? arr : new Uint8Array(arr);
    }
  } catch {
    // ignore
  }

  throw new Error(
    "Secure RNG not available. Ensure expo-crypto is installed and configured.",
  );
}

async function sha256Base64Url(input: string) {
  const data = new TextEncoder().encode(input);

  if (typeof (globalThis as any).crypto?.subtle?.digest === "function") {
    const digest = await (globalThis as any).crypto.subtle.digest(
      "SHA-256",
      data,
    );
    const hashArray = Array.from(new Uint8Array(digest));
    const b64 = btoa(
      String.fromCharCode.apply(null, hashArray as unknown as number[]),
    );
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  // expo-crypto fallback
  try {
    const hashHex = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      input,
      { encoding: Crypto.CryptoEncoding.HEX },
    );
    const hashBytes = new Uint8Array(
      hashHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)),
    );
    const b64 = btoa(
      String.fromCharCode.apply(
        null,
        Array.from(hashBytes) as unknown as number[],
      ),
    );
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  } catch (e) {
    throw new Error(`Failed to compute SHA-256: ${String(e)}`);
  }
}

async function generatePKCE() {
  const verifierBytes = await secureRandomBytes(32);
  const verifier = bytesToHex(verifierBytes);
  const challenge = await sha256Base64Url(verifier);
  return { verifier, challenge };
}

// =======================
// Config resolver
// =======================

export function resolveLoginConfig(oauthTimeoutMs?: number): LoginConfig {
  // Read clientId from config
  const resolvedClientId =
    (Constants as any)?.expoConfig?.extra?.blueskyClientId ||
    (Constants as any)?.manifest?.extra?.blueskyClientId ||
    (appJson as any)?.expo?.extra?.blueskyClientId ||
    "";

  const _extra =
    (Constants as any)?.expoConfig?.extra ||
    (Constants as any)?.manifest?.extra ||
    (appJson as any)?.expo?.extra ||
    {};

  function parseBooleanCandidate(v: unknown, def: boolean) {
    if (typeof v === "boolean") return v;
    if (typeof v === "string") {
      const low = v.trim().toLowerCase();
      if (low === "true" || low === "1" || low === "yes") return true;
      if (low === "false" || low === "0" || low === "no") return false;
    }
    return def;
  }

  let useProxy = parseBooleanCandidate(
    (_extra as any)?.useAuthProxy ?? process.env.EXPO_USE_AUTH_PROXY,
    true,
  );
  const explicitProxyUrl =
    (appJson as any)?.expo?.extra?.authProxyUrl ||
    (_extra as any)?.authProxyUrl ||
    process.env.EXPO_AUTH_PROXY_URL ||
    "";

  // Default native redirect
  let redirectUri = "blueskylearning://auth";

  // Allow forcing Linking-only if needed (not recommended here)
  const authUseLinkingOnly = parseBooleanCandidate(
    (_extra as any)?.authUseLinkingOnly ??
      process.env.EXPO_AUTH_USE_LINKING_ONLY,
    false,
  );

  const resolvedOauthTimeoutMs =
    oauthTimeoutMs ??
    (Number(
      (_extra as any)?.oauthTimeoutMs ??
        process.env.EXPO_OAUTH_TIMEOUT_MS ??
        DEFAULT_OAUTH_TIMEOUT_MS,
    ) ||
      DEFAULT_OAUTH_TIMEOUT_MS);

  const hasValidProxyUrl =
    typeof explicitProxyUrl === "string" &&
    /^https?:\/\//i.test(explicitProxyUrl);

  // Prefer proxy redirect if enabled
  if (useProxy && hasValidProxyUrl) {
    redirectUri = explicitProxyUrl;
  }

  try {
    const ownership = (Constants as any)?.appOwnership;
    const isStandalone = ownership === "standalone";
    if (__DEV__) {
      console.log("[LoginScreen] Environment:", {
        ownership,
        isStandalone,
        useProxy,
        explicitProxyUrl,
      });
    }

    if (useProxy && hasValidProxyUrl) {
      // Always use proxy redirect when enabled (Standalone 含む)
      redirectUri = explicitProxyUrl;
    } else {
      // Proxy 未使用時のみ makeRedirectUri を利用
      const made = (AuthSession as any).makeRedirectUri({
        native: "blueskylearning://auth",
        scheme: "blueskylearning",
        path: "auth",
        useProxy, // false の想定
      });

      if (__DEV__) {
        console.log(
          "[LoginScreen] makeRedirectUri:",
          made,
          "useProxy=",
          useProxy,
        );
      }

      if (typeof made === "string" && made.trim().length > 0) {
        let normalized = made;

        // blueskylearning:/auth → blueskylearning://auth
        if (
          normalized.startsWith("blueskylearning:/") &&
          !normalized.startsWith("blueskylearning://")
        ) {
          normalized = normalized.replace(
            "blueskylearning:/",
            "blueskylearning://",
          );
        }
        // /auth が欠けていれば付与
        if (
          normalized.startsWith("blueskylearning://") &&
          !normalized.includes("/auth")
        ) {
          normalized = normalized.replace(/\/+$/, "") + "/auth";
        }

        redirectUri = normalized;
      } else {
        // 最後のフォールバック
        redirectUri = "blueskylearning://auth";
        useProxy = false;
      }
    }
  } catch (e) {
    if (__DEV__) console.log("[LoginScreen] resolveLoginConfig error:", e);
    redirectUri = "blueskylearning://auth";
    useProxy = false;
  }

  if (__DEV__) {
    console.log("[LoginScreen] RESOLVED:", {
      redirectUri,
      useProxy,
      authUseLinkingOnly,
      resolvedClientId,
    });
  }

  return {
    resolvedClientId,
    useProxy,
    explicitProxyUrl,
    redirectUri,
    resolvedOauthTimeoutMs,
    authUseLinkingOnly,
  };
}

// =======================
// Screen Component
// =======================

const LoginScreen: React.FC<LoginScreenProps> = ({ oauthTimeoutMs }) => {
  const colors = useThemeColors();
  const { loading, login } = useAuth();

  const [busy, setBusy] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [lastBackendResponse, setLastBackendResponse] = useState<string | null>(
    null,
  );
  const [identifier, setIdentifier] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const {
    resolvedClientId,
    redirectUri,
    resolvedOauthTimeoutMs,
    authUseLinkingOnly,
  } = resolveLoginConfig(oauthTimeoutMs);

  const codeVerifierRef = useRef<string | null>(null);
  const processedInitialUrlRef = useRef<boolean>(false);

  // 初回起動時の Deep Link 取り込み（blueskylearning://auth?code=...）
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (!mounted) return;
        if (
          initialUrl &&
          typeof initialUrl === "string" &&
          !processedInitialUrlRef.current
        ) {
          processedInitialUrlRef.current = true;

          try {
            await SecureStore.setItemAsync(
              "debug.oauth.lastIncomingUrl",
              initialUrl,
            );
          } catch {
            // ignore
          }

          try {
            const u = new URL(initialUrl);
            if (
              u.protocol &&
              u.protocol.toLowerCase().startsWith("blueskylearning")
            ) {
              const code = u.searchParams.get("code");
              const state = u.searchParams.get("state") || "";
              if (code) {
                await handleAuthResult(
                  { type: "success", params: { code, state } },
                  undefined,
                );
              }
            }
          } catch {
            // ignore parse errors
          }
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Client Metadata (optional) ---
  const clientMetadataRef = useRef<any | null>(null);
  async function loadClientMetadataIfNeeded() {
    if (clientMetadataRef.current) return clientMetadataRef.current;
    try {
      if (/^https?:\/\//i.test(resolvedClientId)) {
        const r = await fetch(resolvedClientId, { method: "GET" });
        if (!r.ok) throw new Error(`client_metadata fetch failed: ${r.status}`);
        const j = await r.json();
        clientMetadataRef.current = j;
        return j;
      }
    } catch {
      clientMetadataRef.current = null;
    }
    return null;
  }

  // --- PKCE ---
  async function preparePKCEAndStore() {
    const { verifier, challenge } = await generatePKCE();
    codeVerifierRef.current = verifier;
    try {
      await SecureStore.setItemAsync("pkce.verifier", verifier);
    } catch {
      // ignore
    }
    return { verifier, challenge };
  }

  // --- Debug helpers ---
  async function persistDebugAuthInfo(
    authUrl: string,
    redirectUriToStore: string,
  ) {
    try {
      await SecureStore.setItemAsync("debug.oauth.authUrl", authUrl);
      await SecureStore.setItemAsync(
        "debug.oauth.redirectUri",
        redirectUriToStore,
      );
    } catch {
      // ignore
    }
  }

  // --- Authorization URL builder ---
  function buildAuthUrl(
    meta: any,
    manualAuthEndpointVal: string,
    manualClientVal: string,
    redirectUriVal: string,
    challenge: string,
    state: string,
  ) {
    const authEndpoint =
      manualAuthEndpointVal ||
      meta?.authorization_endpoint ||
      "https://bsky.social/oauth/authorize";
    const effectiveClient = manualClientVal || resolvedClientId;

    // scope: ensure 'atproto'
    let scopeVal = "atproto";
    try {
      const metaScope = meta?.scope;
      if (Array.isArray(metaScope)) scopeVal = metaScope.join(" ");
      else if (typeof metaScope === "string" && metaScope.trim().length > 0)
        scopeVal = metaScope.trim();
    } catch {
      // ignore
    }
    if (!/\batproto\b/.test(scopeVal))
      scopeVal = (scopeVal + " atproto").trim();

    const authUrl = `${authEndpoint}?response_type=code&client_id=${encodeURIComponent(effectiveClient)}&redirect_uri=${encodeURIComponent(redirectUriVal)}&scope=${encodeURIComponent(scopeVal)}&state=${state}&code_challenge=${encodeURIComponent(challenge)}&code_challenge_method=S256`;

    return authUrl;
  }

  // --- Auth flow (Linking fallback) ---
  async function startAuthFlowWithLinking(authUrl: string) {
    return new Promise<any>((resolve) => {
      let handled = false;
      let subscription: any = null;

      const timer = setTimeout(() => {
        if (!handled) {
          handled = true;
          try {
            subscription?.remove?.();
          } catch {
            // ignore
          }
          resolve({ type: "dismiss" });
        }
      }, resolvedOauthTimeoutMs);

      const cleanup = () => {
        try {
          subscription?.remove?.();
        } catch {
          // ignore
        }
        try {
          clearTimeout(timer);
        } catch {
          // ignore
        }
      };

      const handler = (event: any) => {
        if (handled) return;
        handled = true;
        cleanup();
        try {
          const urlStr = event?.url || event;
          const parsed = new URL(urlStr);
          const params: Record<string, string> = {};
          parsed.searchParams.forEach((v, k) => {
            params[k] = v;
          });
          resolve({ type: "success", params });
        } catch {
          resolve({ type: "error" });
        }
      };

      try {
        if ((Linking as any).addEventListener)
          subscription = (Linking as any).addEventListener("url", handler);
        else subscription = (Linking as any).addListener("url", handler);
      } catch {
        try {
          subscription = (Linking as any).addEventListener?.("url", handler);
        } catch {
          // ignore
        }
      }

      try {
        Linking.openURL(authUrl);
      } catch {
        // ignore
      }
    });
  }

  async function startAuthFlow(authUrl: string) {
    if ((globalThis as any).__authFlowInProgress) {
      if (__DEV__) console.log("[LoginScreen] Flow in progress, skip");
      return { type: "dismiss" };
    }
    (globalThis as any).__authFlowInProgress = true;
    try {
      if (authUseLinkingOnly) {
        if (__DEV__) console.log("[LoginScreen] Using Linking flow");
        return await startAuthFlowWithLinking(authUrl);
      }

      const startAsync =
        (AuthSession as any)?.startAsync ||
        (AuthSession as any)?.openAuthSessionAsync;
      if (typeof startAsync === "function") {
        if (__DEV__) console.log("[LoginScreen] Using AuthSession.startAsync");
        try {
          let result: any;
          if (
            startAsync?.name === "openAuthSessionAsync" ||
            startAsync?.length > 1
          ) {
            result = await startAsync(authUrl, redirectUri);
          } else {
            result = await startAsync({ authUrl, returnUrl: redirectUri });
          }

          try {
            await persistDebugAuthInfo(authUrl, redirectUri);
          } catch {
            // ignore
          }
          return result;
        } catch (authSessionError) {
          if (__DEV__)
            console.log(
              "[LoginScreen] AuthSession failed, fallback to Linking",
              authSessionError,
            );
          return await startAuthFlowWithLinking(authUrl);
        }
      }
      if (__DEV__)
        console.log("[LoginScreen] No AuthSession; fallback to Linking");
      return await startAuthFlowWithLinking(authUrl);
    } finally {
      (globalThis as any).__authFlowInProgress = false;
    }
  }

  // --- Code exchange with backend ---
  const exchangeCodeForSession = async (
    code: string,
    verifier: string | null | undefined,
    redirect_uri: string,
    clientId: string | undefined,
  ): Promise<boolean> => {
    try {
      const res = await api.post("/api/atprotocol/init", {
        oauth: {
          code,
          code_verifier: verifier,
          redirect_uri,
          client_id: clientId,
        },
      });

      try {
        setLastBackendResponse(JSON.stringify(res?.data ?? res, null, 2));
      } catch {
        setLastBackendResponse(String(res));
      }

      const sessionId =
        (res as any)?.data?.sessionId ||
        (res as any)?.sessionId ||
        (res as any)?.data?.data?.sessionId ||
        null;

      if (sessionId) {
        try {
          await SecureStore.setItemAsync("auth.sessionId", String(sessionId));
        } catch {
          // ignore
        }
        // Update caches so UI reflects auth state immediately
        try {
          await refreshAuthCache();
        } catch {
          // ignore
        }
        return true;
      }

      setError(
        t("auth.exchangeFailed") ||
          "セッションの確立に失敗しました（sessionId なし）",
      );
      return false;
    } catch (e: any) {
      setError(
        (e && e.message) ||
          t("auth.exchangeFailed") ||
          "セッションの確立に失敗しました",
      );
      return false;
    }
  };

  // --- Handle auth result ---
  async function handleAuthResult(
    result: any,
    verifier: string | null | undefined,
  ) {
    if (
      result &&
      result.type === "success" &&
      result.params &&
      result.params.code
    ) {
      const code = String(result.params.code);

      const codeKey = `${code}_${Date.now()}`;
      for (const existingKey of exchangeInFlightSet) {
        if (existingKey.startsWith(code + "_")) {
          setError(
            t("auth.duplicateRequest") ||
              "重複したリクエストです。しばらくお待ちください。",
          );
          return false;
        }
      }
      exchangeInFlightSet.add(codeKey);

      try {
        // Fallback to stored PKCE verifier if not supplied
        let effectiveVerifier: string | null | undefined =
          verifier ?? codeVerifierRef.current;
        if (!effectiveVerifier) {
          try {
            const stored = await SecureStore.getItemAsync("pkce.verifier");
            if (stored && typeof stored === "string" && stored.length > 0) {
              effectiveVerifier = stored;
            }
          } catch {
            // ignore
          }
        }

        const client_id_for_exchange = resolvedClientId || undefined;

        const success = await exchangeCodeForSession(
          code,
          effectiveVerifier,
          redirectUri,
          client_id_for_exchange,
        );

        return success;
      } finally {
        exchangeInFlightSet.delete(codeKey);
      }
    } else if (
      result &&
      (result.type === "dismiss" || result.type === "cancel")
    ) {
      setError(t("auth.cancelled") || "キャンセルされました");
      return false;
    } else {
      setError(t("auth.flowError") || "認証フローでエラーが発生しました");
      return false;
    }
  }

  const onPressLogin = useCallback(async () => {
    setBusy(true);

    setError(null);

    setLastBackendResponse(null);

    try {
      if (!identifier || !password) {
        setError("ハンドルまたはDIDとApp Passwordを入力してください");
        return;
      }
      const res: any = await login(identifier.trim(), password);
      try {
        setLastBackendResponse(JSON.stringify(res?.data ?? res, null, 2));
      } catch {
        /* ignore */
      }
    } catch (e: any) {
      setError(e?.message || "ログインに失敗しました");
    } finally {
      setBusy(false);
    }
  }, [identifier, password, login]);

  // --- Render ---
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        Bluesky にログイン
      </Text>

      {!!error && (
        <Text style={[styles.errorText, { color: colors.accent }]}>
          {error}
        </Text>
      )}

      <TextInput
        value={identifier}
        onChangeText={setIdentifier}
        placeholder="ハンドルまたは DID（例: alice.bsky.social または did:plc:...）"
        autoCapitalize="none"
        autoCorrect={false}
        editable={!busy && !loading}
        style={{
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          color: colors.text,
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderRadius: 8,
          marginTop: 12,
        }}
        placeholderTextColor={colors.secondaryText}
      />

      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="App Password（例: abcd-efgh-ijkl-mnop）"
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        textContentType="password"
        editable={!busy && !loading}
        style={{
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          color: colors.text,
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderRadius: 8,
          marginTop: 12,
        }}
        placeholderTextColor={colors.secondaryText}
      />

      <TouchableOpacity
        onPress={onPressLogin}
        disabled={busy || loading}
        style={[
          styles.btn,
          {
            backgroundColor: colors.accent,

            opacity: busy || loading ? 0.6 : 1,
          },
        ]}
      >
        <Text style={styles.btnText}>
          {busy ? "ログイン中..." : "App Password でログイン"}
        </Text>
      </TouchableOpacity>

      {busy && (
        <View style={styles.spinnerRow}>
          <ActivityIndicator />
          <Text style={{ color: colors.secondaryText, marginLeft: 8 }}>
            認可ページを開いています...
          </Text>
        </View>
      )}

      {!!lastBackendResponse && (
        <View style={styles.debugBox}>
          <Text style={[styles.debugTitle, { color: colors.text }]}>
            最終レスポンス（デバッグ）
          </Text>
          <Text style={[styles.debugText, { color: colors.secondaryText }]}>
            {lastBackendResponse}
          </Text>
        </View>
      )}
    </View>
  );
};

export default LoginScreen;

// =======================
// Styles
// =======================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  btn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  btnText: {
    color: "#fff",
    fontWeight: "700",
  },
  spinnerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  errorText: {
    marginBottom: 8,
  },
  debugBox: {
    marginTop: 16,
    padding: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  debugTitle: {
    fontWeight: "700",
    marginBottom: 6,
  },
  debugText: {
    fontSize: 12,
  },
});
