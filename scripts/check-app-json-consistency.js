const fs = require('fs');
const path = require('path');

function readJSON(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    return null;
  }
}

const repoRoot = path.resolve(__dirname, '..');
const mobileAppJson = path.join(repoRoot, 'mobile', 'app.json');
const rootPackage = path.join(repoRoot, 'package.json');

const suspects = [
  'https://auth.expo.io/@rietamura/bluesky-langapp',
  'https://rietamura.github.io/bluelang-oauth/.well-known/atproto_client_metadata.json',
  'exp://localhost:8081'
];

function grepFiles(dir, exts) {
  const out = [];
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const f of files) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) {
      out.push(...grepFiles(p, exts));
    } else {
      const ext = path.extname(f.name).toLowerCase();
      if (exts.includes(ext) || exts.includes('*')) out.push(p);
    }
  }
  return out;
}

function searchRepo() {
  const files = grepFiles(repoRoot, ['.js', '.ts', '.tsx', '.json']);
  const hits = [];
  for (const f of files) {
    // skip node_modules
    if (f.includes('node_modules')) continue;
    let content;
    try { content = fs.readFileSync(f, 'utf8'); } catch { continue; }
    for (const s of suspects) {
      if (content.includes(s)) hits.push({ file: f, match: s });
    }
  }
  return hits;
}

const hits = searchRepo();
if (hits.length === 0) {
  console.log('OK: no direct hardcoded app.json values found among suspects');
  process.exit(0);
}

console.log('Found potential hardcoded values:');
for (const h of hits) {
  console.log('-', h.match, 'in', h.file);
}
console.log('\nYou may want to prefer values from mobile/app.json (expo.extra) or environment variables.');
process.exit(1);
