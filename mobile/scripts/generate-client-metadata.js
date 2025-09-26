const fs = require('fs');
const path = require('path');

const outPath = path.join(__dirname, '..', 'client-metadata.json');

const envUrl = process.env.CLIENT_METADATA_URL || process.env.CLIENT_ID || process.env.CLIENT_ID_URL;
const defaultUrl = 'http://localhost:2584/client-metadata.json';
const clientId = envUrl || defaultUrl;

const template = {
  client_id: clientId,
  client_name: 'LangApp Dev',
  application_type: 'native',
  dpop_bound_access_tokens: true,
  redirect_uris: [
    'blueskylearning://auth',
    'http://127.0.0.1:8000/callback'
  ],
  grant_types: ['authorization_code', 'refresh_token'],
  response_types: ['code'],
  scope: ['offline_access', 'profile', 'email'],
  token_endpoint_auth_method: 'none'
};

fs.writeFileSync(outPath, JSON.stringify(template, null, 2));
console.log('Wrote client metadata to', outPath);
