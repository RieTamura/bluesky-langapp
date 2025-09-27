const fs = require('fs');
const path = require('path');

const outPath = path.join(__dirname, '..', 'client-metadata.json');

const envUrl = process.env.CLIENT_METADATA_URL || process.env.CLIENT_ID || process.env.CLIENT_ID_URL;

// Prefer mobile/app.json extra values when present
let defaultUrl = 'https://rietamura.github.io/bluelang-oauth/.well-known/atproto_client_metadata.json';
let defaultAuthProxy = 'https://auth.expo.io/@rietamura/bluesky-langapp';
let defaultRedirects = ['blueskylearning://auth', 'exp://localhost:8081'];
try {
  const appJson = require(path.join(__dirname, '..', 'app.json'));
  const extra = (appJson && appJson.expo && appJson.expo.extra) || {};
  if (extra.blueskyClientId) defaultUrl = extra.blueskyClientId;
  if (extra.authProxyUrl) defaultAuthProxy = extra.authProxyUrl;
  if (Array.isArray(extra.redirectUris) && extra.redirectUris.length) defaultRedirects = extra.redirectUris;
} catch (e) {
  // ignore and use hardcoded defaults
}

const clientId = envUrl || defaultUrl;

const template = {
  client_id: clientId,
  client_name: 'Bluesky LangApp Dev',
  client_uri: 'https://rietamura.github.io/bluelang-oauth',
  logo_uri: 'https://rietamura.github.io/bluelang-oauth/logo.png',
  application_type: 'native',
  dpop_bound_access_tokens: true,
  redirect_uris: [
    ...defaultRedirects.slice(0, 2),
    defaultAuthProxy
  ],
  grant_types: ['authorization_code', 'refresh_token'],
  response_types: ['code'],
  scope: ['atproto', 'transition:generic', 'transition:chat.bsky'],
  token_endpoint_auth_method: 'none'
};

fs.writeFileSync(outPath, JSON.stringify(template, null, 2));
console.log('Wrote client metadata to', outPath);
