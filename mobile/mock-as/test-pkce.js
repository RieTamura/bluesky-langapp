// Simple PKCE integration test for the mock AS
// Usage: node test-pkce.js
// It POSTs to /oauth/authorize/approve to obtain a code, then exchanges it at /oauth/token

/* eslint-disable @typescript-eslint/no-var-requires, global-require */
const http = require('http');
const querystring = require('querystring');

const HOST = process.env.MOCK_AS_HOST || 'localhost';
const PORT = process.env.MOCK_AS_PORT ? Number(process.env.MOCK_AS_PORT) : 2583;
const BASE = `http://${HOST}:${PORT}`;

function postForm(path, data) {
  const body = querystring.stringify(data);
  const opts = {
    hostname: HOST,
    port: PORT,
    path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body)
    }
  };
  return new Promise((resolve, reject) => {
    const req = http.request(opts, (res) => {
      let chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const out = Buffer.concat(chunks).toString();
        resolve({ statusCode: res.statusCode, headers: res.headers, body: out });
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  try {
    console.log('Starting PKCE test against', BASE);
    const verifier = 'test-verifier-12345';
    // compute S256 challenge
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(verifier).digest();
    const challenge = Buffer.from(hash).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    // Step 1: obtain code by calling approve endpoint (simulate user approving)
    const approveResp = await postForm('/oauth/authorize/approve', {
      client_id: 'test',
      redirect_uri: 'http://localhost:3000/cb',
      state: 'xyz',
      code_challenge: challenge,
      code_challenge_method: 'S256'
    });
    console.log('/oauth/authorize/approve ->', approveResp.statusCode);
    if (![302, 201, 200].includes(approveResp.statusCode)) {
      console.error('Unexpected response from approve:', approveResp.statusCode, approveResp.body);
      process.exit(2);
    }
    // Location header should contain code
    const loc = approveResp.headers['location'];
    if (!loc) {
      console.error('No Location header found in approve response');
      process.exit(2);
    }
    const m = /[?&]code=([^&]+)/.exec(loc);
    if (!m) {
      console.error('No code found in Location header:', loc);
      process.exit(2);
    }
    const code = decodeURIComponent(m[1]);
    console.log('Obtained code:', code);

    // Step 2: exchange code with correct verifier
    const tokenResp = await postForm('/oauth/token', {
      grant_type: 'authorization_code',
      code,
      redirect_uri: 'http://localhost:3000/cb',
      client_id: 'test',
      code_verifier: verifier
    });
    console.log('/oauth/token (valid) ->', tokenResp.statusCode, tokenResp.body);
    if (tokenResp.statusCode !== 200) {
      console.error('Token exchange failed for valid verifier');
      process.exit(3);
    }

    const tokenBody = JSON.parse(tokenResp.body);
    if (!tokenBody.access_token) {
      console.error('No access_token in response');
      process.exit(3);
    }

    // Step 3: attempt reuse / wrong verifier -> should fail
    const tokenRespBad = await postForm('/oauth/token', {
      grant_type: 'authorization_code',
      code,
      redirect_uri: 'http://localhost:3000/cb',
      client_id: 'test',
      code_verifier: 'wrong-verifier'
    });
    console.log('/oauth/token (reuse/wrong) ->', tokenRespBad.statusCode, tokenRespBad.body);
    if (tokenRespBad.statusCode === 200) {
      console.error('Token exchange should not succeed on reuse or wrong verifier');
      process.exit(4);
    }

    console.log('PKCE tests passed');
    process.exit(0);
  } catch (err) {
    console.error('Test error:', err && err.message);
    process.exit(10);
  }
})();
