#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

require.extensions['.ts'] = require.extensions['.js'];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

const root = process.cwd();
const testFiles = walk(path.join(root, 'src')).filter((file) => file.endsWith('.test.ts'));
for (const file of testFiles) {
  require(file);
}

const { run } = require('../index.js');
run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
