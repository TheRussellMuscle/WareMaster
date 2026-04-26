// Render src-tauri/icons/source.svg to a 1024x1024 PNG that
// `tauri icon` can chew on. One-shot: edit the SVG and re-run when the
// design changes.
//
// Usage:
//   pnpm install -D sharp     (one-time)
//   node scripts/build-icon.mjs
//   pnpm tauri icon src-tauri/icons/source.png
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const svgPath = resolve(repoRoot, 'src-tauri/icons/source.svg');
const pngPath = resolve(repoRoot, 'src-tauri/icons/source.png');

const svg = await readFile(svgPath);
const png = await sharp(svg, { density: 384 })
  .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9 })
  .toBuffer();

await writeFile(pngPath, png);
console.log(`Wrote ${pngPath} (${png.length.toLocaleString()} bytes)`);
console.log('Next: pnpm tauri icon src-tauri/icons/source.png');
