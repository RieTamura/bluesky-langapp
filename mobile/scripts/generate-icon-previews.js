const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const assetsDir = path.join(root, 'assets');
const input = path.join(assetsDir, 'icon.png');
const sizes = [180, 120, 60, 40];

async function run() {
  if (!fs.existsSync(input)) {
    console.error('input icon not found:', input);
    process.exit(1);
  }

  for (const size of sizes) {
    const out = path.join(assetsDir, `preview_${size}.png`);
    await sharp(input).resize(size, size, {fit: 'cover'}).png().toFile(out);
    console.log('wrote', out);
  }
}

run().catch(err => { console.error(err); process.exit(1); });
