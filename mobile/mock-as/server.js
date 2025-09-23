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

const parStore = new Map(); // request_uri -> params

function readBody(req, cb) {
  let body = '';
  req.on('data', (chunk) => body += chunk);
  req.on('end', () => cb(body));
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
    readBody(req, (body) => {
      const params = querystring.parse(body.toString());
      const id = crypto.randomBytes(9).toString('base64url');
      const request_uri = `urn:ietf:params:oauth:request_uri:${id}`;
      parStore.set(request_uri, params);
      console.log('PAR stored', request_uri, params);
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
      params = parStore.get(request_uri);
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
    readBody(req, (body) => {
      const params = querystring.parse(body.toString());
      const code = crypto.randomBytes(8).toString('base64url');
      const redirect = params.redirect_uri;
      const state = params.state ? `&state=${encodeURIComponent(params.state)}` : '';
      if (!redirect) {
        res.writeHead(400, {'Content-Type':'text/plain'});
        res.end('missing redirect_uri');
        return;
      }
      console.log('Approving, redirecting to', redirect);
      res.writeHead(302, { Location: `${redirect}?code=${code}${state}` });
      res.end();
    });
    return;
  }

  // Token endpoint
  if (u.pathname === '/oauth/token' && req.method === 'POST') {
    readBody(req, (body) => {
      const params = querystring.parse(body.toString());
      // Very permissive mock: accept authorization_code grant and return tokens
      if (params.grant_type === 'authorization_code' && params.code) {
        const access_token = crypto.randomBytes(18).toString('base64url');
        const refresh_token = crypto.randomBytes(18).toString('base64url');
        const sub = 'did:plc:example';
        sendJSON(res, { access_token, refresh_token, token_type: 'DPoP', expires_in: 3600, sub });
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
