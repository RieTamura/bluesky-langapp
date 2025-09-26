#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires, global-require */
// Lightweight mock Authorization Server for local AT Protocol OAuth testing
// No dependencies required. Run with: `node server.js`
//
// 注意: このモックサーバーは PAR (Pushed Authorization Request) のストアを
// メモリ上 (in-memory) に保持します。サーバーを再起動するとすべてのエントリが
// 失われます。開発やローカル検証用のモックとしては問題ありませんが、本番環境で
// は永続化ストレージ（データベース、ファイル、またはキー・バリューストア等）の
// 使用を検討してください。
const http = require('http');
const url = require('url');
const fs = require('fs');
const https = require('https');
const crypto = require('crypto');
const querystring = require('querystring');

const PORT = process.env.PORT ? Number(process.env.PORT) : 2583;
const CLIENT_METADATA_PATH = __dirname + '/../client-metadata.json';

// parStore maps request_uri -> { clientId, createdAt, expiresAt, params }
// NOTE: This is an in-memory Map. Entries will be lost when the process exits.
const parStore = new Map();

// codeStore maps authorization_code -> { code_challenge, code_challenge_method, createdAt, clientId, redirect_uri }
// Used to verify PKCE at the token endpoint.
const codeStore = new Map();

// Runtime warning to make accidental production usage less likely.
console.warn('Mock AS warning: PAR store is in-memory only and will be cleared on server restart. Do NOT use this for production.')

// Configurable limits
const PAR_TTL_MS = 5 * 60 * 1000; // 5 minutes
const PAR_ID_BYTES = 16; // entropy for request_uri id
const MAX_BODY_BYTES = 8 * 1024; // 8 KiB
// authorization code TTL (10 minutes)
const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Periodic cleanup of expired PAR entries
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of parStore.entries()) {
    if (v && v.expiresAt && now > v.expiresAt) parStore.delete(k);
  }
}, 60 * 1000);

// Periodic cleanup of expired authorization codes
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of codeStore.entries()) {
    if (v && v.createdAt && now > v.createdAt + CODE_TTL_MS) codeStore.delete(k);
  }
}, 60 * 1000);

function readBody(req, res, cb, maxBytes = MAX_BODY_BYTES) {
  let received = 0;
  let chunks = [];
  req.on('data', (chunk) => {
    received += chunk.length;
    if (received > maxBytes) {
      // stop consuming and respond with 413
      try { res.writeHead(413, {'Content-Type':'application/json'}); res.end(JSON.stringify({ error: 'request_entity_too_large' })); } catch (e) { console.error(new Date().toISOString(), 'Failed to write 413 response:', e && e.message); }
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });
  req.on('end', () => cb(Buffer.concat(chunks).toString()));
}

function sendJSON(res, obj, status=200) {
  res.writeHead(status, {'Content-Type': 'application/json'});
  res.end(JSON.stringify(obj, null, 2));
}

function serveClientMetadata(res) {
  fs.readFile(CLIENT_METADATA_PATH, 'utf8', (err, data) => {
    if (err) {
      sendJSON(res, { error: 'not_found' }, 404);
      return;
    }
    res.writeHead(200, {'Content-Type':'application/json'});
    res.end(data);
  });
}

// Normalize and validate a scope string: split on whitespace/comma, dedupe, allow safe tokens only
function normalizeScope(scope) {
  if (!scope) return 'openid';
  // accept string input
  const raw = String(scope || '');
  const parts = raw.replace(/,/g, ' ').split(/\s+/).map(s => s.trim()).filter(Boolean);
  // basic token validation: allow letters, numbers, '.', '_', '-', ':'
  const valid = [];
  const tokenRe = /^[A-Za-z0-9._\-:]+$/;
  for (const p of parts) {
    if (tokenRe.test(p) && !valid.includes(p)) valid.push(p);
  }
  if (valid.length === 0) return 'openid';
  return valid.join(' ');
}

// Determine the scheme for a request: prefer X-Forwarded headers, then connection/socket encrypted flags, then req.protocol, else default to http
function detectScheme(req) {
  const headers = req && req.headers ? req.headers : {};
  const xf = headers['x-forwarded-proto'] || headers['x-forwarded-protocol'];
  if (xf) {
    // may be comma-separated (e.g., "https, http"); take the first
    try {
      const proto = String(xf).split(',')[0].trim().toLowerCase();
      if (proto) return proto;
    } catch (e) {}
  }
  // connection / socket encrypted (Node.js) -> https
  if (req && req.connection && req.connection.encrypted) return 'https';
  if (req && req.socket && req.socket.encrypted) return 'https';
  // express-like req.protocol
  if (req && req.protocol) return String(req.protocol).replace(/:$/,'');
  return 'http';
}

// Build a fully-qualified URL from PUBLIC_HOST (or host header). If PUBLIC_HOST already contains a scheme use it as-is;
// otherwise detect the scheme from the request and prefix it. If no host is available, fall back to localhost:PORT.
function buildUrlFromHost(publicHost, req) {
  // prefer explicit env value when provided
  if (publicHost) {
    // if it already contains a scheme, return as-is
    if (/^https?:\/\//i.test(publicHost)) return publicHost;
    // otherwise prefix with detected scheme
    const scheme = detectScheme(req);
    return `${scheme}://${publicHost}`;
  }
  // no publicHost provided: try Host header
  const hostHeader = req && req.headers ? req.headers.host : null;
  if (hostHeader) {
    const scheme = detectScheme(req);
    return `${scheme}://${hostHeader}`;
  }
  // final fallback
  const scheme = detectScheme(req);
  return `${scheme}://localhost:${PORT}`;
}

// Create a request handler and wire it to either an HTTP or HTTPS server below.
const requestHandler = (req, res) => {
  const u = url.parse(req.url, true);
  // Basic CORS handler: set permissive headers for local testing and
  // respond to OPTIONS preflight requests with 204. Configure via env:
  //  - CORS_ORIGIN (default '*')
  //  - CORS_ALLOW_CREDENTIALS ('true' to include Access-Control-Allow-Credentials)
  const configuredOrigin = process.env.CORS_ORIGIN || '*';
  const allowCredentials = process.env.CORS_ALLOW_CREDENTIALS === 'true';
  // If configuredOrigin is '*' we echo '*' otherwise we echo the incoming Origin header
  const incomingOrigin = req.headers && req.headers.origin;
  const allowOrigin = configuredOrigin === '*' ? '*' : (incomingOrigin || configuredOrigin);

  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  // Include common headers used by the app (Content-Type, Authorization, DPoP) and allow others by request
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,DPoP');
  if (allowCredentials) res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '600');

  console.log(new Date().toISOString(), req.method, u.pathname);

  // Handle preflight requests early
  if (req.method === 'OPTIONS') {
    // No body for preflight
    res.writeHead(204);
    return res.end();
  }

  // Protected resource metadata (PDS -> AS resolver expects this)
  if (u.pathname === '/.well-known/oauth-protected-resource') {
    // Return our local server as the AS issuer. Prefer PUBLIC_HOST env var, then request Host header, then localhost.
    const publicHost = process.env.PUBLIC_HOST || null;
    const asUrl = buildUrlFromHost(publicHost, req);
    return sendJSON(res, { authorization_servers: [ asUrl ] });
  }

  // Authorization Server metadata
  if (u.pathname === '/.well-known/oauth-authorization-server') {
    const publicHost = process.env.PUBLIC_HOST || null;
    const issuer = buildUrlFromHost(publicHost, req);
    return sendJSON(res, {
      issuer,
      authorization_endpoint: `${issuer}/oauth/authorize`,
      pushed_authorization_request_endpoint: `${issuer}/oauth/par`,
      token_endpoint: `${issuer}/oauth/token`,
      require_pushed_authorization_requests: false,
      code_challenge_methods_supported: ['S256'],
      response_types_supported: ['code']
    });
  }

  // Serve client metadata file
  if (u.pathname === '/client-metadata.json') {
    return serveClientMetadata(res);
  }

  // PAR: accept pushed authorization request
  if (u.pathname === '/oauth/par' && req.method === 'POST') {
    // Allowed/par-specific parameters
    const allowed = new Set(['response_type','client_id','redirect_uri','scope','state','code_challenge','code_challenge_method','nonce','response_mode']);
    readBody(req, res, (body) => {
      const params = querystring.parse(body.toString());
      // Keep only allowed keys (be tolerant to extra parameters)
      const filtered = {};
      for (const k of Object.keys(params)) {
        if (allowed.has(k)) filtered[k] = params[k];
      }
      // replace params with filtered set
      for (const k of Object.keys(params)) delete params[k];
      Object.assign(params, filtered);

      // extract client id from either Authorization Basic (username) or body
      let clientId = null;
      const auth = req.headers['authorization'];
      if (auth && typeof auth === 'string' && auth.startsWith('Basic ')) {
        try {
          const decoded = Buffer.from(auth.slice('Basic '.length), 'base64').toString('utf8');
          const parts = decoded.split(':');
          clientId = parts[0] || null;
        } catch (e) {
          // ignore and fall back to params
        }
      }
      if (!clientId && params.client_id) clientId = String(params.client_id);
      if (!clientId) return sendJSON(res, { error: 'invalid_request', error_description: 'missing_client_id' }, 400);

      // create request_uri with higher entropy and base64url encoding
      const id = crypto.randomBytes(PAR_ID_BYTES).toString('base64url');
      const request_uri = `urn:ietf:params:oauth:request_uri:${id}`;

      const now = Date.now();
      const entry = {
        clientId,
        createdAt: now,
        expiresAt: now + PAR_TTL_MS,
        params
      };
      parStore.set(request_uri, entry);
      // Log only safe metadata
      console.log('PAR stored', request_uri, { clientId: entry.clientId, createdAt: new Date(entry.createdAt).toISOString(), expiresAt: new Date(entry.expiresAt).toISOString() });
      res.writeHead(201, {'Content-Type':'application/json'});
      res.end(JSON.stringify({ request_uri }));
    });
    return;
  }

  // Authorization endpoint (browser flow)
  if (u.pathname === '/oauth/authorize' && req.method === 'GET') {
    // Accept either request_uri (PAR) or client_id/redirect_uri directly
    const { request_uri, client_id, redirect_uri, state } = u.query;
    let params = {};
    if (request_uri && parStore.has(request_uri)) {
      const entry = parStore.get(request_uri);
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        parStore.delete(request_uri);
        return sendJSON(res, { error: 'invalid_request', error_description: 'request_uri_expired' }, 400);
      }
      params = entry.params || {};
    } else {
      params = { client_id, redirect_uri, state };
    }

    // Render a simple authorize page
    const html = `<!doctype html>
<html><body>
<h1>Mock AS - Authorize</h1>
<p>Client: ${params.client_id || ''}</p>
<p>Redirect URI: ${params.redirect_uri || ''}</p>
<form method="post" action="/oauth/authorize/approve">
  <input type="hidden" name="request_uri" value="${request_uri || ''}" />
  <input type="hidden" name="client_id" value="${params.client_id || ''}" />
  <input type="hidden" name="redirect_uri" value="${params.redirect_uri || ''}" />
  <input type="hidden" name="state" value="${params.state || ''}" />
  <!-- PKCE fields (if present) are preserved so the authorize server can store them with the code -->
  <input type="hidden" name="code_challenge" value="${params.code_challenge || ''}" />
  <input type="hidden" name="code_challenge_method" value="${params.code_challenge_method || ''}" />
  <button type="submit">Authorize</button>
</form>
</body></html>`;
    res.writeHead(200, {'Content-Type':'text/html'});
    res.end(html);
    return;
  }

  // Approve (form submit) -> redirect back with code
  if (u.pathname === '/oauth/authorize/approve' && req.method === 'POST') {
  // form submit - accept form fields (including PKCE fields)
    readBody(req, res, (body) => {
      // Accept any form fields from the approve form (we only use expected ones below)
      const params = querystring.parse(body.toString());
      const code = crypto.randomBytes(8).toString('base64url');
      const redirect = params.redirect_uri;
      // Persist PKCE metadata with the code so token endpoint can verify code_verifier
      const code_challenge = params.code_challenge || params.code_challenge || '';
      const code_challenge_method = params.code_challenge_method || params.code_challenge_method || '';
      codeStore.set(code, {
        code_challenge: code_challenge || null,
        code_challenge_method: code_challenge_method || null,
        createdAt: Date.now(),
        clientId: params.client_id || null,
        redirect_uri: params.redirect_uri || null
      });
      const state = params.state ? `&state=${encodeURIComponent(params.state)}` : '';
      if (!redirect) {
        res.writeHead(400, {'Content-Type':'text/plain'});
        res.end('missing redirect_uri');
        return;
      }
      console.log('Approving request_uri', params.request_uri || '(direct)');
      res.writeHead(302, { Location: `${redirect}?code=${code}${state}` });
      res.end();
    });
    return;
  }

  // Token endpoint
  if (u.pathname === '/oauth/token' && req.method === 'POST') {
    // Limit/validate token request keys
    const allowed = new Set(['grant_type','code','redirect_uri','client_id','refresh_token','code_verifier']);
    readBody(req, res, (body) => {
      const params = querystring.parse(body.toString());
      // Filter to allowed keys only (do not fail on extra params)
      const filtered = {};
      for (const k of Object.keys(params)) {
        if (allowed.has(k)) filtered[k] = params[k];
      }
      for (const k of Object.keys(params)) delete params[k];
      Object.assign(params, filtered);
      // Very permissive mock: accept authorization_code grant and return tokens
      if (params.grant_type === 'authorization_code' && params.code) {
        // PKCE verification
        const stored = codeStore.get(params.code);
        if (stored) {
          // verify client_id and redirect_uri match the one used when code was issued
          if (stored.clientId && params.client_id && stored.clientId !== params.client_id) {
            return sendJSON(res, { error: 'invalid_grant', error_description: 'client_id_mismatch' }, 400);
          }
          if (stored.redirect_uri && params.redirect_uri && stored.redirect_uri !== params.redirect_uri) {
            return sendJSON(res, { error: 'invalid_grant', error_description: 'redirect_uri_mismatch' }, 400);
          }
          const method = stored.code_challenge_method || 'S256';
          const challenge = stored.code_challenge;
          const verifier = params.code_verifier;
          if (challenge) {
            // PKCE is mandatory when a challenge was stored
            if (!verifier) {
              return sendJSON(res, { error: 'invalid_request', error_description: 'missing_code_verifier' }, 400);
            }
            let matches = false;
            if (method === 'plain') {
              matches = verifier === challenge;
            } else {
              // default to S256
              const hash = crypto.createHash('sha256').update(verifier).digest();
              const b64 = Buffer.from(hash).toString('base64');
              // base64url
              const b64url = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
              matches = b64url === challenge;
            }
            if (!matches) {
              console.error('PKCE verification failed for code', params.code);
              return sendJSON(res, { error: 'invalid_grant', error_description: 'pkce_verification_failed' }, 400);
            }
          } else {
            // No stored challenge: reject rather than silently allow compatibility
            console.error('PKCE required but no challenge stored for code', params.code);
            return sendJSON(res, { error: 'invalid_request', error_description: 'pkce_required' }, 400);
          }
          // Successful verification -> issue tokens and remove used code
          codeStore.delete(params.code);
          const access_token = crypto.randomBytes(18).toString('base64url');
          const refresh_token = crypto.randomBytes(18).toString('base64url');
          const sub = 'did:plc:example';
          const grantedScope = normalizeScope(params.scope || (params.scope === '' ? '' : undefined));
          sendJSON(res, { access_token, refresh_token, token_type: 'DPoP', expires_in: 3600, sub, scope: grantedScope });
          return;
        } else {
          return sendJSON(res, { error: 'invalid_grant', error_description: 'invalid_code' }, 400);
        }
      } else {
        sendJSON(res, { error: 'unsupported_grant_type' }, 400);
      }
    });
    return;
  }

  // Fallback: 404
  res.writeHead(404, {'Content-Type':'text/plain'});
  res.end('Not Found');
};

// Attach the handler to an HTTP server (used as a fallback)
const httpServer = http.createServer(requestHandler);

/*
  TLS / HTTPS startup

  Behavior:
  - If TLS_PFX_PATH is set, the server will attempt to load a PKCS#12 archive
    (PFX) from that path. Optionally set TLS_PFX_PASSPHRASE for the archive passphrase.
  - Else if TLS_KEY_PATH and TLS_CERT_PATH are set, server will load PEM key/cert.
  - If neither is provided, the server falls back to plain HTTP.

  Environment variables:
  - TLS_PFX_PATH       Path to a .pfx/.p12 file (optional)
  - TLS_PFX_PASSPHRASE Passphrase for the PFX (optional)
  - TLS_KEY_PATH       Path to PEM private key (optional)
  - TLS_CERT_PATH      Path to PEM certificate (optional)
  - HTTPS_PORT         Port to use when running HTTPS (defaults to PORT)

  Local development notes:
  - For quick self-signed certs (OpenSSL):
      openssl req -x509 -nodes -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -subj "/CN=localhost"
  - Or use mkcert for trusted local certs (recommended):
      mkcert -install
      mkcert localhost 127.0.0.1 ::1
    This creates certs you can point TLS_KEY_PATH/TLS_CERT_PATH at.

  Security note: self-signed certs are fine for local testing only. For production
  use certificates issued by a trusted CA and run behind proper TLS termination.
*/

const TLS_PFX_PATH = process.env.TLS_PFX_PATH;
const TLS_PFX_PASSPHRASE = process.env.TLS_PFX_PASSPHRASE || process.env.TLS_PASSPHRASE;
const TLS_KEY_PATH = process.env.TLS_KEY_PATH;
const TLS_CERT_PATH = process.env.TLS_CERT_PATH;
const HTTPS_PORT = process.env.HTTPS_PORT ? Number(process.env.HTTPS_PORT) : PORT;

if (TLS_PFX_PATH) {
  // Prefer PFX if provided
  try {
  const pfx = fs.readFileSync(TLS_PFX_PATH);
  const httpsServer = https.createServer({ pfx, passphrase: TLS_PFX_PASSPHRASE }, requestHandler);
    httpsServer.listen(HTTPS_PORT, () => console.log(`Mock AS listening at https://localhost:${HTTPS_PORT} (using PFX)`));
  } catch (err) {
    console.error(new Date().toISOString(), 'Failed to read TLS PFX file:', err && err.message);
    console.error('Set TLS_PFX_PATH to a valid .pfx/.p12 file or remove it to run HTTP instead. Exiting.');
    process.exit(1);
  }
} else if (TLS_KEY_PATH && TLS_CERT_PATH) {
  try {
  const key = fs.readFileSync(TLS_KEY_PATH);
  const cert = fs.readFileSync(TLS_CERT_PATH);
  const httpsServer = https.createServer({ key, cert }, requestHandler);
    httpsServer.listen(HTTPS_PORT, () => console.log(`Mock AS listening at https://localhost:${HTTPS_PORT}`));
  } catch (err) {
    console.error(new Date().toISOString(), 'Failed to read TLS key/cert files:', err && err.message);
    console.error('Ensure TLS_KEY_PATH and TLS_CERT_PATH point to readable files. Exiting.');
    process.exit(1);
  }
} else {
  httpServer.listen(PORT, () => {
    const publicHost = process.env.PUBLIC_HOST || `localhost:${PORT}`;
    const listenMsg = publicHost.startsWith('http') ? publicHost : `http://${publicHost}`;
    console.log(`Mock AS listening at ${listenMsg}`);
  });
}
