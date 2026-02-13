const fs = require('fs');
const path = require('path');

const root = process.cwd();
const distDir = path.join(root, 'dist');

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

const filesToCopy = [
  'index.html',
  'deck.json',
  'spreads.json',
  'policy.json',
  'events.json',
];

for (const rel of filesToCopy) {
  const src = path.join(root, rel);
  const out = path.join(distDir, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.copyFileSync(src, out);
}

for (const dir of ['src', 'vendor']) {
  const srcDir = path.join(root, dir);
  const outDir = path.join(distDir, dir);
  fs.cpSync(srcDir, outDir, { recursive: true });
}

console.log('Built dist/ (static copy build)');
