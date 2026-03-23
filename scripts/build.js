/**
 * @file scripts/build.js
 * @description Cross-platform build script for NoteNest.
 * Compiles Tailwind CSS and copies all required src/ files into dist/.
 */

const fs   = require('fs');
const path = require('path');

// ─── Configuration ────────────────────────────────────────────────────────────

const SRC  = path.join(__dirname, '..', 'src');
const DIST = path.join(__dirname, '..', 'dist');

// All files/folders to copy from src/ into dist/, preserving relative paths.
const FILES_TO_COPY = [
  'manifest.json',
  'background/background.js',
  'sidepanel/sidepanel.html',
  'sidepanel/sidepanel.js',
  'assets',                     // entire folder — icons etc.
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`  created  ${path.relative(process.cwd(), dirPath)}/`);
  }
}

function copyFile(srcPath, destPath) {
  ensureDir(path.dirname(destPath));
  fs.copyFileSync(srcPath, destPath);
  console.log(`  copied   ${path.relative(process.cwd(), destPath)}`);
}

function copyFolder(srcFolder, destFolder) {
  ensureDir(destFolder);
  for (const entry of fs.readdirSync(srcFolder, { withFileTypes: true })) {
    const srcEntry  = path.join(srcFolder, entry.name);
    const destEntry = path.join(destFolder, entry.name);
    if (entry.isDirectory()) {
      copyFolder(srcEntry, destEntry);
    } else {
      copyFile(srcEntry, destEntry);
    }
  }
}

function cleanDist() {
  if (fs.existsSync(DIST)) {
    fs.rmSync(DIST, { recursive: true, force: true });
    console.log('  cleaned  dist/');
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log('\n🔨 Building NoteNest...\n');

// 1. Clean previous build
cleanDist();
ensureDir(DIST);

// 2. Copy all source files
console.log('Copying files:');
for (const item of FILES_TO_COPY) {
  const srcPath  = path.join(SRC, item);
  const destPath = path.join(DIST, item);

  if (!fs.existsSync(srcPath)) {
    console.error(`  ✖ missing  ${item} — skipping`);
    continue;
  }

  const stat = fs.statSync(srcPath);
  if (stat.isDirectory()) {
    copyFolder(srcPath, destPath);
  } else {
    copyFile(srcPath, destPath);
  }
}

console.log('\n✔ Files copied. Now run: npm run build:css\n');