#!/usr/bin/env node
// Lightweight mock Authorization Server for local AT Protocol OAuth testing
// No dependencies required. Run with: `node server.js`
const http = require('http');
const url = require('url');
const fs = require('fs');
const crypto = require('crypto');
const querystring = require('querystring');

const PORT = process.env.PORT ? Number(process.env.PORT) : 2583;
const CLIENT_METADATA_PATH = __dirname + '/../client-metadata.json';

// parStore maps request_uri -> { clientId, createdAt, expiresAt, params }
const parStore = new Map();

// Configurable limits
const PAR_TTL_MS = 5 * 60 * 1000; // 5 minutes
const PAR_ID_BYTES = 16; // entropy for request_uri id
const MAX_BODY_BYTES = 8 * 1024; // 8 KiB

// Periodic cleanup of expired PAR entries
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of parStore.entries()) {
    if (v && v.expiresAt && now > v.expiresAt) parStore.delete(k);
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

const server = http.createServer((req, res) => {
  const u = url.parse(req.url, true);
  console.log(new Date().toISOString(), req.method, u.pathname);

  // Protected resource metadata (PDS -> AS resolver expects this)
  if (u.pathname === '/.well-known/oauth-protected-resource') {
    // Return our local server as the AS issuer
    return sendJSON(res, { authorization_servers: [ `http://localhost:${PORT}` ] });
  }

  // Authorization Server metadata
  if (u.pathname === '/.well-known/oauth-authorization-server') {
    const issuer = `http://localhost:${PORT}`;
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
      // validate allowed keys
      for (const k of Object.keys(params)) {
        if (!allowed.has(k)) {
          return sendJSON(res, { error: 'invalid_request', error_description: `unexpected_parameter:${k}` }, 400);
        }
      }

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
  <button type="submit">Authorize</button>
</form>
</body></html>`;
    res.writeHead(200, {'Content-Type':'text/html'});
    res.end(html);
    return;
  }

  // Approve (form submit) -> redirect back with code
  if (u.pathname === '/oauth/authorize/approve' && req.method === 'POST') {
    // form submit - limit to expected keys
    const allowed = new Set(['request_uri','client_id','redirect_uri','state']);
    readBody(req, res, (body) => {
      const params = querystring.parse(body.toString());
      for (const k of Object.keys(params)) {
        if (!allowed.has(k)) return sendJSON(res, { error: 'invalid_request', error_description: `unexpected_parameter:${k}` }, 400);
      }
      const code = crypto.randomBytes(8).toString('base64url');
      const redirect = params.redirect_uri;
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
      for (const k of Object.keys(params)) {
        if (!allowed.has(k)) return sendJSON(res, { error: 'invalid_request', error_description: `unexpected_parameter:${k}` }, 400);
      }
      // Very permissive mock: accept authorization_code grant and return tokens
      if (params.grant_type === 'authorization_code' && params.code) {
        const access_token = crypto.randomBytes(18).toString('base64url');
        const refresh_token = crypto.randomBytes(18).toString('base64url');
        const sub = 'did:plc:example';
        // determine granted scope: prefer incoming scope, else default to 'openid'
        const grantedScope = normalizeScope(params.scope || (params.scope === '' ? '' : undefined));
        sendJSON(res, { access_token, refresh_token, token_type: 'DPoP', expires_in: 3600, sub, scope: grantedScope });
      } else {
        sendJSON(res, { error: 'unsupported_grant_type' }, 400);
      }
    });
    return;
  }

  // Fallback: 404
  res.writeHead(404, {'Content-Type':'text/plain'});
  res.end('Not Found');
});

server.listen(PORT, () => console.log(`Mock AS listening at http://localhost:${PORT}`));
