// Integrity check for self-hosted hero .glb assets and src/geo/hero-manifest.js.
import fs from 'node:fs';
import path from 'node:path';
import { HERO_MODELS } from '../src/geo/hero-manifest.js';

const MODELS_DIR = path.resolve(new URL('../public/data/models', import.meta.url).pathname);
const MAX_SINGLE_KB = 500;
const MAX_TOTAL_MB = 15;
const GLB_MAGIC = 0x46546c67; // 'glTF'

const errors = [];
const seenIds = new Set();
const seenFiles = new Set();
let totalBytes = 0;
let largest = { file: '', bytes: 0 };

for (const entry of HERO_MODELS) {
  if (!entry.id || !entry.file) {
    errors.push(`invalid manifest entry: ${JSON.stringify(entry)}`);
    continue;
  }
  if (seenIds.has(entry.id)) errors.push(`duplicate hero id: ${entry.id}`);
  seenIds.add(entry.id);
  seenFiles.add(entry.file);

  const fp = path.join(MODELS_DIR, entry.file);
  if (!fs.existsSync(fp)) {
    errors.push(`missing GLB file for ${entry.id}: ${entry.file}`);
    continue;
  }
  const buf = fs.readFileSync(fp);
  if (buf.length < 20 || buf.readUInt32LE(0) !== GLB_MAGIC) {
    errors.push(`invalid GLB binary header: ${entry.file}`);
    continue;
  }
  totalBytes += buf.length;
  if (buf.length > largest.bytes) largest = { file: entry.file, bytes: buf.length };
  if (buf.length > MAX_SINGLE_KB * 1024) {
    errors.push(`${entry.file} exceeds ${MAX_SINGLE_KB} KB (${(buf.length / 1024).toFixed(1)} KB)`);
  }
}

for (const f of fs.readdirSync(MODELS_DIR)) {
  if (f.endsWith('.glb') && !seenFiles.has(f)) {
    errors.push(`orphan GLB file not in HERO_MODELS: ${f}`);
  }
}

const totalMB = totalBytes / (1024 * 1024);
if (totalMB > MAX_TOTAL_MB) {
  errors.push(`total models size ${totalMB.toFixed(2)} MB exceeds ${MAX_TOTAL_MB} MB budget`);
}

if (errors.length) {
  for (const e of errors) console.error('FAIL:', e);
  process.exit(1);
}
console.log(
  `check:heroes — ${HERO_MODELS.length} hero GLBs verified, total ${totalMB.toFixed(2)} MB (largest: ${largest.file} ${(largest.bytes / 1024).toFixed(1)} KB)`,
);
