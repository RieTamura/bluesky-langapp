// ESM script to generate client-metadata.local.json with environment-specific redirect URIs.
// Usage: DEV_REDIRECT_URI="exp://192.168.1.2:8081" node --input-type=module scripts/generate-client-metadata.js
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const sourceFile = path.resolve(__dirname, '..', 'client-metadata.json');
  const outFile = path.resolve(__dirname, '..', 'client-metadata.local.json');
  const envRedirect = process.env.DEV_REDIRECT_URI;

  if (!envRedirect) {
    console.log('DEV_REDIRECT_URI not set; no local client metadata generated. To generate, set DEV_REDIRECT_URI and re-run.');
    return;
  }

  let raw;
  try {
    raw = await readFile(sourceFile, 'utf8');
  } catch (err) {
    console.error('Failed to read source client-metadata.json:', err);
    process.exitCode = 2;
    return;
  }

  let obj;
  try {
    obj = JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse client-metadata.json as JSON:', err);
    process.exitCode = 3;
    return;
  }

  if (!obj || typeof obj !== 'object') {
    console.error('Parsed client-metadata.json is not an object');
    process.exitCode = 4;
    return;
  }

  const copy = JSON.parse(JSON.stringify(obj));
  if (Array.isArray(copy.redirect_uris) && copy.redirect_uris.length > 0) {
    copy.redirect_uris[0] = envRedirect;
  } else {
    copy.redirect_uris = [envRedirect];
  }

  try {
    await writeFile(outFile, JSON.stringify(copy, null, 2) + '\n', 'utf8');
    console.log('Wrote', outFile, 'with redirect_uris[0]=', envRedirect);
  } catch (err) {
    console.error('Failed to write client-metadata.local.json:', err);
    process.exitCode = 5;
  }
}

// Run the main flow and catch any unexpected errors
main().catch((err) => {
  console.error('Unexpected error in generate-client-metadata:', err);
  process.exitCode = 1;
});
