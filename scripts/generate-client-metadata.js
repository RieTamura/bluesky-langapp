// Simple script to generate client-metadata.json with environment-specific redirect URIs.
// Usage: DEV_REDIRECT_URI="exp://192.168.1.2:8081" node scripts/generate-client-metadata.js
const fs = require('fs');
const path = require('path');
const sourceFile = path.resolve(__dirname, '..', 'client-metadata.json');
const raw = fs.readFileSync(sourceFile, 'utf8');
const obj = JSON.parse(raw);
const outFile = path.resolve(__dirname, '..', 'client-metadata.local.json');

const envRedirect = process.env.DEV_REDIRECT_URI;
if (envRedirect) {
  const copy = JSON.parse(JSON.stringify(obj));
  if (Array.isArray(copy.redirect_uris) && copy.redirect_uris.length > 0) {
    copy.redirect_uris[0] = envRedirect;
  } else {
    copy.redirect_uris = [envRedirect];
  }
  fs.writeFileSync(outFile, JSON.stringify(copy, null, 2) + '\n', 'utf8');
  console.log('Wrote', outFile, 'with redirect_uris[0]=', envRedirect);
} else {
  console.log('DEV_REDIRECT_URI not set; no local client metadata generated. To generate, set DEV_REDIRECT_URI and re-run.');
}
