// Génère les icônes PNG de la PWA à partir de public/icon.svg (npm run icons).
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

const svg = await readFile(new URL('../public/icon.svg', import.meta.url));
const out = (name) => new URL(`../public/${name}`, import.meta.url).pathname;

await sharp(svg).resize(192, 192).png().toFile(out('pwa-192.png'));
await sharp(svg).resize(512, 512).png().toFile(out('pwa-512.png'));
await sharp(svg).resize(180, 180).png().toFile(out('apple-touch-icon.png'));

// Version « maskable » : motif réduit dans la zone sûre, fond plein.
const inner = await sharp(svg).resize(360, 360).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#b4546a' } })
  .composite([{ input: inner, gravity: 'center' }])
  .png()
  .toFile(out('pwa-512-maskable.png'));

console.log('Icônes générées dans public/');
