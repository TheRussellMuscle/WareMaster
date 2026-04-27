// Bake bundled placeholder portraits to src-tauri/resources/portraits/.
// Each portrait is a 512x512 PNG: parchment background + tint patch + monogram.
// Re-run after editing the MANIFEST below or the SVG template.
//
// Usage:
//   node scripts/bake-portraits.mjs

import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const outRoot = resolve(repoRoot, 'src-tauri/resources/portraits');

const PARCHMENT = '#f1e6c8';
const PARCHMENT_BORDER = '#a89878';
const INK = '#2a2317';
const INK_SOFT = '#5a4a30';

const TINTS = {
  warrior: '#a04a2a',
  'word-caster': '#b88a2a',
  spiritualist: '#3a8a72',
  tradesfolk: '#7a6a4a',
  'rank-A': '#8a2a2a',
  'rank-B': '#a04a2a',
  'rank-C': '#b07a3a',
  'rank-D': '#7a8a4a',
  'rank-E': '#5a7a8a',
  unknown: '#7a7a7a',
  tusktooth: '#6a4a2a',
  'old-fang': '#7a3a3a',
  'metal-chimaera': '#5a5a7a',
  footman: '#5a6a8a',
  courser: '#3a8a72',
  maledictor: '#7a3a8a',
  'az-cude': '#5a8aaa',
  merchant: '#b88a2a',
  courtier: '#a07ab8',
  bystander: '#7a7a7a',
  envoy: '#8a8aaa',
  retainer: '#7a8a5a',
  laborer: '#8a6a4a',
  beast: '#7a5a3a',
  'full-character': '#5a7a3a',
};

const MANIFEST = {
  classes: ['warrior', 'word-caster', 'spiritualist', 'tradesfolk'],
  monsters: [
    'rank-A',
    'rank-B',
    'rank-C',
    'rank-D',
    'rank-E',
    'unknown',
    'tusktooth',
    'old-fang',
    'metal-chimaera',
  ],
  ryude: ['footman', 'courser', 'maledictor', 'unknown', 'az-cude'],
  npc: [
    'merchant',
    'courtier',
    'bystander',
    'envoy',
    'retainer',
    'laborer',
    'beast',
    'full-character',
    'unknown',
  ],
};

function monogram(key) {
  // Take initials from the key (split by hyphen)
  const parts = key.split('-');
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function labelFor(key) {
  return key
    .split('-')
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join(' ');
}

function svgFor(kind, key) {
  const tint = TINTS[key] ?? INK_SOFT;
  const mon = monogram(key);
  const label = labelFor(key);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="vignette" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="${PARCHMENT}" stop-opacity="1"/>
      <stop offset="100%" stop-color="${PARCHMENT}" stop-opacity="0.6"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" fill="${PARCHMENT}"/>
  <rect width="512" height="512" fill="url(#vignette)"/>
  <rect x="8" y="8" width="496" height="496" fill="none" stroke="${PARCHMENT_BORDER}" stroke-width="4"/>
  <rect x="20" y="20" width="472" height="472" fill="none" stroke="${PARCHMENT_BORDER}" stroke-width="1"/>
  <circle cx="256" cy="240" r="120" fill="${tint}" opacity="0.18"/>
  <circle cx="256" cy="240" r="120" fill="none" stroke="${tint}" stroke-width="3" opacity="0.55"/>
  <text x="256" y="280" font-family="Georgia, 'Times New Roman', serif"
        font-size="140" font-weight="700" text-anchor="middle"
        fill="${tint}" opacity="0.92">${mon}</text>
  <text x="256" y="430" font-family="Georgia, 'Times New Roman', serif"
        font-size="28" font-style="italic" text-anchor="middle"
        fill="${INK_SOFT}">${label}</text>
  <text x="256" y="466" font-family="Georgia, 'Times New Roman', serif"
        font-size="14" letter-spacing="3" text-anchor="middle"
        fill="${INK_SOFT}" opacity="0.7">${kind.toUpperCase()}</text>
</svg>`;
}

async function bake(kind, key) {
  const svg = svgFor(kind, key);
  const outDir = resolve(outRoot, kind);
  await mkdir(outDir, { recursive: true });
  const outPath = resolve(outDir, `${key}.png`);
  // Smaller files: indexed PNG with up to 32 colours fits the flat illustration.
  const png = await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9, palette: true, colours: 32 })
    .toBuffer();
  await writeFile(outPath, png);
  return { outPath, bytes: png.length };
}

async function main() {
  await mkdir(outRoot, { recursive: true });
  // Manifest (JSON, for the Rust side or future tooling).
  const manifestPath = resolve(outRoot, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify(MANIFEST, null, 2) + '\n');
  console.log(`Wrote ${manifestPath}`);
  let total = 0;
  for (const [kind, keys] of Object.entries(MANIFEST)) {
    for (const key of keys) {
      const { outPath, bytes } = await bake(kind, key);
      console.log(`  ${outPath}  (${bytes.toLocaleString()} bytes)`);
      total += bytes;
    }
  }
  console.log(`\nDone. ${Object.values(MANIFEST).flat().length} portraits, ${total.toLocaleString()} total bytes.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
