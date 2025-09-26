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

  // Read source image once into a Buffer to avoid repeated disk reads
  const buf = await fs.promises.readFile(input);

  // Create resize/write promises in parallel
  const tasks = sizes.map(size => {
    const out = path.join(assetsDir, `preview_${size}.png`);
    return sharp(buf).resize(size, size, { fit: 'cover' }).png().toFile(out).then(() => {
      console.log('wrote', out);
    });
  });

  await Promise.all(tasks);
}

run().catch(err => { console.error(err); process.exit(1); });
