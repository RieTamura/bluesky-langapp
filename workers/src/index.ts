import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  SignJWT,
  exportJWK,
  generateKeyPair,
  importJWK,
  decodeJwt,
} from "jose";

type Env = {
  // KV namespace for session/state
  SESSIONS: {
    get(key: string): Promise<string | null>;
    put(
      key: string,
      value: string,
      options?: { expirationTtl?: number },
    ): Promise<void>;
    delete(key: string): Promise<void>;
  };

  // OAuth / ATProto related vars
  BSKY_ISSUER: string;
  CLIENT_ID: string;
  DEV_CLIENT_ID?: string;
  REDIRECT_URI: string;
  DEV_REDIRECT_URI?: string;
  SCOPE: string;
};

const app = new Hono<{ Bindings: Env }>();

// CORS (tighten for prod)
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  }),
);

// Health
app.get("/health", (c) => c.json({ ok: true }));

/**
 * Init (PKCE) — supports GET and POST
 * - Query param redirect=dev で DEV_REDIRECT_URI を使用（存在する場合）
 * - client_id は redirect=dev の場合 DEV_CLIENT_ID を優先（存在する場合）
 * - state と code_verifier を KV に保存（TTL 10 分）
 */
async function initHandler(c: any) {
  const {
    BSKY_ISSUER,
    CLIENT_ID,
    DEV_CLIENT_ID,
    REDIRECT_URI,
    DEV_REDIRECT_URI,
    SCOPE,
  } = c.env;

  const useDevRedirect =
    (c.req.query("redirect") || "").toLowerCase() === "dev" &&
    !!DEV_REDIRECT_URI;

  const redirectUri = useDevRedirect ? DEV_REDIRECT_URI! : REDIRECT_URI;
  const clientId = useDevRedirect && DEV_CLIENT_ID ? DEV_CLIENT_ID : CLIENT_ID;

  const state = crypto.randomUUID();

  const code_verifier = generateCodeVerifier();
  const code_challenge = await generateCodeChallenge(code_verifier);

  const authorize = new URL("/oauth/authorize", BSKY_ISSUER);
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("scope", SCOPE);
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("code_challenge", code_challenge);
  authorize.searchParams.set("code_challenge_method", "S256");

  // Save state + PKCE (TTL 10 minutes)
  const record = JSON.stringify({
    createdAt: Date.now(),
    code_verifier,
    redirect_uri: redirectUri,
    client_id: clientId,
  });
  await c.env.SESSIONS.put(`state:${state}`, record, { expirationTtl: 600 });
  await c.env.SESSIONS.put(`pkce:${state}`, record, { expirationTtl: 600 });

  return c.json({
    authorize_url: authorize.toString(),
    state,
    redirect_uri: redirectUri,
    client_id: clientId,
  });
}
app.post("/api/atprotocol/init", initHandler);
app.get("/api/atprotocol/init", initHandler);

/**
 * Token exchange (PKCE + DPoP)
 * body: { code, state }
 * - code のバリデーション（authorize URL を誤って渡していないかを検出）
 * - KV の PKCE 情報を読み出して認証サーバへ交換
 * - 成功したら KV にセッションを作成し、sessionId を返す
 */
app.post("/api/atprotocol/token", async (c) => {
  let body: any = null;
  try {
    body = await c.req.json();
  } catch {
    /* ignore */
  }

  const code = (body?.code as string | undefined)?.trim();
  const state = (body?.state as string | undefined)?.trim();

  // Basic validation
  if (!code || !state) {
    return c.json(
      { error: "VALIDATION_ERROR", message: "code and state are required" },
      400,
    );
  }
  // Common mistake: user passes authorize_url instead of short code
  if (/^https?:\/\//i.test(code) || /oauth\/authorize/i.test(code)) {
    return c.json(
      {
        error: "VALIDATION_ERROR",
        message:
          "code must be the short authorization code, not the authorize URL",
      },
      400,
    );
  }
  if (code.length > 2048) {
    return c.json(
      { error: "VALIDATION_ERROR", message: "code is unexpectedly long" },
      400,
    );
  }

  // Load PKCE/state
  const pkceRaw = await c.env.SESSIONS.get(`pkce:${state}`);
  if (!pkceRaw) {
    return c.json(
      { error: "STATE_EXPIRED", message: "state not found or expired" },
      400,
    );
  }

  const { code_verifier, redirect_uri, client_id } = JSON.parse(pkceRaw) as {
    code_verifier: string;
    redirect_uri?: string;
    client_id?: string;
  };

  // Generate DPoP keypair (ES256) - extractable, with error logging
  let publicKey: CryptoKey, privateKey: CryptoKey, pubJwk: any, privJwk: any;
  try {
    ({ publicKey, privateKey } = await generateKeyPair("ES256", {
      extractable: true,
    }));
    pubJwk = await exportJWK(publicKey);
    privJwk = await exportJWK(privateKey);
    (pubJwk as any).alg = "ES256";
  } catch (e) {
    console.error("DPoP key generation/export failed", {
      error: e instanceof Error ? e.message : String(e),
    });
    return c.json(
      {
        error: "DPOP_KEY_ERROR",
        message: "Failed to generate or export DPoP keys",
      },
      500,
    );
  }

  // DPoP proof for token endpoint
  const tokenUrl = new URL("/oauth/token", c.env.BSKY_ISSUER);
  const dpop = await new SignJWT({
    htu: tokenUrl.toString(),
    htm: "POST",
    jti: crypto.randomUUID(),
    iat: Math.floor(Date.now() / 1000),
  })
    .setProtectedHeader({ alg: "ES256", typ: "dpop+jwt", jwk: pubJwk as any })
    .sign(privateKey);

  // OAuth token request
  const form = new URLSearchParams();
  form.set("grant_type", "authorization_code");
  form.set("code", code);
  form.set("redirect_uri", redirect_uri || c.env.REDIRECT_URI);
  form.set("client_id", client_id || c.env.CLIENT_ID);
  form.set("code_verifier", code_verifier);

  let resp: Response;
  try {
    resp = await fetch(tokenUrl.toString(), {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        DPoP: dpop,
      },
      body: form.toString(),
    });
  } catch (e) {
    console.error("Token exchange fetch failed", {
      error: e instanceof Error ? e.message : String(e),
      tokenUrl: tokenUrl.toString(),
    });
    return c.json(
      {
        error: "TOKEN_EXCHANGE_NETWORK",
        message: "Failed to reach token endpoint",
      },
      502,
    );
  }

  let rawText: string | null = null;
  try {
    rawText = await resp.text();
  } catch (e) {
    console.error("Token exchange read body failed", {
      status: resp.status,
      error: e instanceof Error ? e.message : String(e),
    });
  }

  let json: any = null;
  if (rawText) {
    try {
      json = JSON.parse(rawText);
    } catch {
      // leave json as null
    }
  }

  // Handle DPoP nonce requirement (RFC 9449): retry once with nonce
  if (!resp.ok && resp.status === 400) {
    // Try to get nonce from DPoP-Nonce header or WWW-Authenticate
    let nonce = resp.headers.get("DPoP-Nonce") || undefined;
    if (!nonce) {
      const www = resp.headers.get("WWW-Authenticate") || "";
      const m = www.match(/dpop_nonce="([^"]+)"/i);
      if (m) nonce = m[1];
    }
    const needNonce = (json && json.error === "use_dpop_nonce") || !!nonce;

    if (needNonce) {
      try {
        const dpopWithNonce = await new SignJWT({
          htu: tokenUrl.toString(),
          htm: "POST",
          jti: crypto.randomUUID(),
          iat: Math.floor(Date.now() / 1000),
          ...(nonce ? { nonce } : {}),
        })
          .setProtectedHeader({
            alg: "ES256",
            typ: "dpop+jwt",
            jwk: pubJwk as any,
          })
          .sign(privateKey);

        let resp2: Response;
        try {
          resp2 = await fetch(tokenUrl.toString(), {
            method: "POST",
            headers: {
              "content-type": "application/x-www-form-urlencoded",
              DPoP: dpopWithNonce,
            },
            body: form.toString(),
          });
        } catch (e) {
          console.error("Token exchange fetch (retry with nonce) failed", {
            error: e instanceof Error ? e.message : String(e),
            tokenUrl: tokenUrl.toString(),
          });
          return c.json(
            {
              error: "TOKEN_EXCHANGE_NETWORK",
              message: "Failed to reach token endpoint (retry with nonce)",
            },
            502,
          );
        }

        let rawText2: string | null = null;
        try {
          rawText2 = await resp2.text();
        } catch (e) {
          console.error("Token exchange read body failed (retry)", {
            status: resp2.status,
            error: e instanceof Error ? e.message : String(e),
          });
        }

        let json2: any = null;
        if (rawText2) {
          try {
            json2 = JSON.parse(rawText2);
          } catch {
            // ignore
          }
        }

        if (!resp2.ok) {
          console.error("Token exchange failed (retry with nonce)", {
            status: resp2.status,
            body: rawText2,
            json: json2,
          });

          return c.json(
            {
              error: json2?.error || "TOKEN_EXCHANGE_FAILED",
              message:
                json2?.error_description ||
                rawText2 ||
                "Token exchange failed (retry with nonce)",
              status: resp2.status,
            },
            resp2.status,
          );
        }

        // Replace resp/json with successful retry response
        resp = resp2;
        rawText = rawText2;
        json = json2;
      } catch (e) {
        console.error("DPoP nonce retry failed", {
          error: e instanceof Error ? e.message : String(e),
        });
        return c.json(
          {
            error: "DPOP_NONCE_RETRY_FAILED",
            message: "Retry with DPoP nonce failed",
          },
          400,
        );
      }
    }
  }

  if (!resp.ok) {
    console.error("Token exchange failed", {
      status: resp.status,
      body: rawText,
      json,
    });
    return c.json(
      {
        error: json?.error || "TOKEN_EXCHANGE_FAILED",
        message: json?.error_description || rawText || "Token exchange failed",
        status: resp.status,
      },
      resp.status,
    );
  }

  const access_token = json?.access_token as string | undefined;
  const token_type = (json?.token_type as string | undefined) || "DPoP";
  const expires_in = Number(json?.expires_in) || 3600;

  if (!access_token) {
    return c.json(
      {
        error: "TOKEN_EXCHANGE_FAILED",
        message: "No access_token in response",
      },
      500,
    );
  }

  // Create session (TTL = expires_in, min 60)
  const sessionId = crypto.randomUUID();
  const session = {
    createdAt: Date.now(),
    issuer: c.env.BSKY_ISSUER,
    access_token,
    token_type,
    expires_in,
    dpop_private_jwk: privJwk,
    dpop_public_jwk: pubJwk,
    scope: json?.scope,
  };
  await c.env.SESSIONS.put(`sess:${sessionId}`, JSON.stringify(session), {
    expirationTtl: Math.max(60, expires_in),
  });

  // Cleanup one-time state
  await c.env.SESSIONS.delete(`pkce:${state}`);
  await c.env.SESSIONS.delete(`state:${state}`);

  return c.json({ ok: true, sessionId, expires_in, token_type });
});

// Me
app.get("/api/auth/me", async (c) => {
  const sessionId = getBearerToken(c.req.header("Authorization"));
  if (!sessionId) return c.json({ authenticated: false }, 200);

  const sessionRaw = await c.env.SESSIONS.get(`sess:${sessionId}`);
  if (!sessionRaw) return c.json({ authenticated: false }, 200);

  try {
    const session = JSON.parse(sessionRaw);
    return c.json({ authenticated: true, session }, 200);
  } catch {
    return c.json({ authenticated: false }, 200);
  }
});

// Logout
app.post("/api/auth/logout", async (c) => {
  const sessionId = getBearerToken(c.req.header("Authorization"));
  if (sessionId) {
    await c.env.SESSIONS.delete(`sess:${sessionId}`);
  }
  return c.json({ ok: true });
});

/**
 * Development callback (GET /dev/callback)
 * - DEV_REDIRECT_URI を redirect_uri に設定している場合に使用
 * - code/state を画面に表示する簡易HTMLを返す
 * - ここから直接 token 交換を試せるフォームも提供
 */
app.get("/dev/callback", (c) => {
  const url = new URL(c.req.url);
  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";
  const error = url.searchParams.get("error");
  const error_description = url.searchParams.get("error_description");

  const escaped = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Dev Callback</title>
<style>
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; padding: 16px; line-height: 1.5; }
  code, input, textarea { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
  .box { border: 1px solid #ddd; border-radius: 8px; padding: 12px; margin-bottom: 16px; }
  .err { color: #a00; }
  label { display:block; margin: 8px 0 4px; }
  input[type="text"], textarea { width: 100%; padding: 8px; }
  button { padding: 8px 12px; }
</style>
</head>
<body>
  <h1>Dev Callback</h1>
  ${
    error
      ? `<div class="box err"><strong>Error:</strong> ${escaped(
          error,
        )}<br/>${escaped(error_description || "")}</div>`
      : ""
  }
  <div class="box">
    <div><strong>code:</strong> <code id="code">${escaped(code)}</code></div>
    <div><strong>state:</strong> <code id="state">${escaped(state)}</code></div>
  </div>

  <div class="box">
    <h3>Exchange Token</h3>
    <form id="tokenForm">
      <label>code</label>
      <input type="text" name="code" value="${escaped(code)}" />
      <label>state</label>
      <input type="text" name="state" value="${escaped(state)}" />
      <div style="margin-top:8px;">
        <button type="submit">POST /api/atprotocol/token</button>
      </div>
    </form>
    <pre id="tokenResult"></pre>
  </div>

<script>
  const form = document.getElementById('tokenForm');
  const out = document.getElementById('tokenResult');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const payload = {
      code: fd.get('code'),
      state: fd.get('state'),
    };
    out.textContent = 'Requesting...';
    try {
      const resp = await fetch('/api/atprotocol/token', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const text = await resp.text();
      out.textContent = text;
    } catch (err) {
      out.textContent = 'Error: ' + err;
    }
  });
</script>
</body>
</html>`;

  return c.html(html);
});

/**
 * Debug state endpoint
 * GET /debug/state?state=...
 * - KV に保存された pkce レコードの有無を確認
 */
app.get("/debug/state", async (c) => {
  const state = (c.req.query("state") || "").trim();
  if (!state) {
    return c.json(
      { error: "VALIDATION_ERROR", message: "state is required" },
      400,
    );
  }
  const pkceRaw = await c.env.SESSIONS.get(`pkce:${state}`);
  if (!pkceRaw) {
    return c.json({ ok: true, found: false });
  }
  try {
    const parsed = JSON.parse(pkceRaw);
    return c.json({ ok: true, found: true, data: parsed });
  } catch {
    return c.json({ ok: true, found: true, data: null });
  }
});

// DPoP helper (nonce-aware) for protected resource requests (PDS/App endpoints)
async function dpopFetch(
  url: string,
  method: string,
  accessToken: string,
  pubJwk: any,
  privJwk: any,
): Promise<{ ok: boolean; status: number; json: any; text: string | null }> {
  // Ensure alg is present for header jwk
  if (pubJwk && !pubJwk.alg) pubJwk.alg = "ES256";
  if (privJwk && !privJwk.alg) privJwk.alg = "ES256";

  const privateKey = await importJWK(privJwk as any, "ES256");
  const target = new URL(url);

  const sign = async (nonce?: string) => {
    const payload: Record<string, any> = {
      htu: target.toString(),

      htm: method.toUpperCase(),

      jti: crypto.randomUUID(),

      iat: Math.floor(Date.now() / 1000),
    };

    // Include 'ath' (hash of access token) to satisfy resource server validation
    const ath = await sha256Base64Url(accessToken);
    payload.ath = ath;
    if (nonce) payload.nonce = nonce;

    return new SignJWT(payload)

      .setProtectedHeader({ alg: "ES256", typ: "dpop+jwt", jwk: pubJwk as any })

      .sign(privateKey as any);
  };

  const parseNonce = (
    headers: Headers,
    bodyText?: string | null,
  ): string | undefined => {
    // Prefer response header
    const hdr = headers.get("DPoP-Nonce");
    if (hdr) return hdr;
    const www = headers.get("WWW-Authenticate") || "";
    const m = www.match(/dpop_nonce="([^"]+)"/i);
    if (m) return m[1];
    // Optionally detect body error
    if (bodyText) {
      try {
        const j = JSON.parse(bodyText);
        if (j?.error === "use_dpop_nonce" && typeof j?.nonce === "string") {
          return j.nonce;
        }
      } catch {
        /* ignore */
      }
    }
    return undefined;
  };

  const doFetch = async (nonce?: string) => {
    const dpop = await sign(nonce);
    const resp = await fetch(target.toString(), {
      method,
      headers: {
        Authorization: `DPoP ${accessToken}`,
        DPoP: dpop,
      },
    });
    const text = await resp.text().catch(() => null);
    let json: any = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        /* ignore */
      }
    }
    return { resp, text, json };
  };

  // First attempt
  let { resp, text, json } = await doFetch();

  // Retry once if nonce is required
  if (!resp.ok && (resp.status === 401 || resp.status === 400)) {
    const nonce = parseNonce(resp.headers, text);
    const needNonce =
      (json && json.error === "use_dpop_nonce") || typeof nonce === "string";
    if (needNonce) {
      ({ resp, text, json } = await doFetch(nonce));
    }
  }

  return { ok: resp.ok, status: resp.status, json, text };
}

// Protected API (PDS): get current session info using DPoP-bound access token
app.get("/api/bsky/session", async (c) => {
  const sessionId = getBearerToken(c.req.header("Authorization"));
  if (!sessionId) return c.json({ error: "AUTH_REQUIRED" }, 401);

  const raw = await c.env.SESSIONS.get(`sess:${sessionId}`);
  if (!raw) return c.json({ error: "AUTH_REQUIRED" }, 401);

  let sess: any;
  try {
    sess = JSON.parse(raw);
  } catch {
    return c.json({ error: "SESSION_CORRUPT" }, 401);
  }

  const accessToken: string | undefined = sess?.access_token;
  const pubJwk = sess?.dpop_public_jwk;
  const privJwk = sess?.dpop_private_jwk;
  if (!accessToken || !pubJwk || !privJwk) {
    return c.json({ error: "SESSION_INCOMPLETE" }, 401);
  }

  // Determine PDS base from DID via PLC (fallback to aud/iss/env)
  let pdsBase = c.env.BSKY_ISSUER;

  try {
    const claims: any = decodeJwt(accessToken);

    const sub = typeof claims?.sub === "string" ? claims.sub : undefined;

    // 1) Prefer PLC resolution using DID (did:plc:*)
    if (sub && sub.startsWith("did:plc:")) {
      const plcResp = await fetch(`https://plc.directory/${sub}`);
      if (plcResp.ok) {
        const doc: any = await plcResp.json();
        const services = doc?.service || doc?.services || [];
        const pds = services.find(
          (s: any) =>
            (s?.id === "#atproto_pds" ||
              s?.type === "AtprotoPersonalDataServer") &&
            typeof s?.serviceEndpoint === "string",
        );
        if (pds?.serviceEndpoint) {
          pdsBase = pds.serviceEndpoint;
        }
      }
    }
    // 2) Fallback to aud/iss if PLC did not yield a base URL
    if (pdsBase === c.env.BSKY_ISSUER) {
      const aud = typeof claims?.aud === "string" ? claims.aud : undefined;
      const iss = typeof claims?.iss === "string" ? claims.iss : undefined;

      if (aud && /^https?:\/\//i.test(aud)) pdsBase = aud;
      else if (iss && /^https?:\/\//i.test(iss)) pdsBase = iss;
    }
  } catch {
    // ignore decode errors; fallback to env issuer
  }

  const resourceUrl = new URL(
    "/xrpc/com.atproto.server.getSession",
    pdsBase,
  ).toString();

  const { ok, status, json, text } = await dpopFetch(
    resourceUrl,
    "GET",
    accessToken,
    pubJwk,
    privJwk,
  );

  if (!ok) {
    // surface upstream error as much as possible
    return c.json(
      {
        error: json?.error || "UPSTREAM_ERROR",
        message:
          json?.message ||
          json?.error_description ||
          text ||
          "Upstream request failed",
        status,
      },
      status,
    );
  }

  return c.json({ ok: true, data: json });
});

// PDS: describeRepo via DPoP token (repo param or token subject)
app.get("/api/bsky/repo", async (c) => {
  const sessionId = getBearerToken(c.req.header("Authorization"));
  if (!sessionId) return c.json({ error: "AUTH_REQUIRED" }, 401);

  const raw = await c.env.SESSIONS.get(`sess:${sessionId}`);
  if (!raw) return c.json({ error: "AUTH_REQUIRED" }, 401);

  let sess: any;
  try {
    sess = JSON.parse(raw);
  } catch {
    return c.json({ error: "SESSION_CORRUPT" }, 401);
  }

  const accessToken: string | undefined = sess?.access_token;
  const pubJwk = sess?.dpop_public_jwk;
  const privJwk = sess?.dpop_private_jwk;
  if (!accessToken || !pubJwk || !privJwk) {
    return c.json({ error: "SESSION_INCOMPLETE" }, 401);
  }

  // Determine PDS base from DID via PLC (fallback to aud/iss/env)
  let pdsBase = c.env.BSKY_ISSUER;

  try {
    const claims: any = decodeJwt(accessToken);

    const sub = typeof claims?.sub === "string" ? claims.sub : undefined;

    if (sub && sub.startsWith("did:plc:")) {
      const plcResp = await fetch(`https://plc.directory/${sub}`);
      if (plcResp.ok) {
        const doc: any = await plcResp.json();
        const services = doc?.service || doc?.services || [];
        const pds = services.find(
          (s: any) =>
            (s?.id === "#atproto_pds" ||
              s?.type === "AtprotoPersonalDataServer") &&
            typeof s?.serviceEndpoint === "string",
        );
        if (pds?.serviceEndpoint) {
          pdsBase = pds.serviceEndpoint;
        }
      }
    }
    if (pdsBase === c.env.BSKY_ISSUER) {
      const aud = typeof claims?.aud === "string" ? claims.aud : undefined;
      const iss = typeof claims?.iss === "string" ? claims.iss : undefined;

      if (aud && /^https?:\/\//i.test(aud)) pdsBase = aud;
      else if (iss && /^https?:\/\//i.test(iss)) pdsBase = iss;
    }
  } catch {
    // ignore
  }

  // repo param: explicit ?repo=.. or default to token subject (DID/handle)
  const repoParam = (c.req.query("repo") || "").trim();
  let repo = repoParam;
  if (!repo) {
    try {
      const claims: any = decodeJwt(accessToken);
      if (typeof claims?.sub === "string" && claims.sub.length > 0) {
        repo = claims.sub;
      }
    } catch {
      /* ignore */
    }
  }
  if (!repo) {
    return c.json(
      { error: "VALIDATION_ERROR", message: "repo is required" },
      400,
    );
  }

  const url = new URL("/xrpc/com.atproto.repo.describeRepo", pdsBase);
  url.searchParams.set("repo", repo);

  const { ok, status, json, text } = await dpopFetch(
    url.toString(),
    "GET",
    accessToken,
    pubJwk,
    privJwk,
  );

  if (!ok) {
    return c.json(
      {
        error: json?.error || "UPSTREAM_ERROR",
        message:
          json?.message ||
          json?.error_description ||
          text ||
          "Upstream request failed",
        status,
      },
      status,
    );
  }

  return c.json({ ok: true, data: json });
});

// 404 / 500
app.notFound((c) => c.json({ error: "Not Found" }, 404));
app.onError((err, c) => {
  console.error("Worker error:", err);
  return c.json({ error: "Internal Server Error" }, 500);
});

export default app;

/* --------------- utils --------------- */
function getBearerToken(authorizationHeader?: string | null): string | null {
  if (!authorizationHeader) return null;
  const prefix = "Bearer ";
  if (!authorizationHeader.startsWith(prefix)) return null;
  const token = authorizationHeader.slice(prefix.length).trim();
  return token || null;
}

function base64url(input: ArrayBuffer | Uint8Array): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let binary = "";
  for (let i = 0; i < bytes.length; i++)
    binary += String.fromCharCode(bytes[i]);
  const b64 = btoa(binary);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function generateCodeVerifier(): string {
  const random = new Uint8Array(32);
  crypto.getRandomValues(random);
  return base64url(random);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);

  const digest = await crypto.subtle.digest("SHA-256", data);

  return base64url(digest);
}

async function sha256Base64Url(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64url(digest);
}
