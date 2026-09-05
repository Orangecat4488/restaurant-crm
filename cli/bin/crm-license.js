#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

// If compiled dist exists, run it, otherwise run via tsx
const distPath = path.join(__dirname, '../dist/index.js');
if (fs.existsSync(distPath)) {
  require(distPath);
} else {
  // Use tsx for direct TypeScript execution
  require('child_process').execSync(`npx tsx ${path.join(__dirname, '../src/index.ts')} ${process.argv.slice(2).join(' ')}`, {
    stdio: 'inherit'
  });
}
