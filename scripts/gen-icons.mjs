import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import fs from 'node:fs/promises';
import path from 'node:path';

const SVG = await fs.readFile(path.resolve('public/logo.svg'));
const OUT_PNG = path.resolve('electron/icon.png');
const OUT_ICO = path.resolve('electron/icon.ico');
const SIZES = [16, 24, 32, 48, 64, 128, 256];

async function buildPng(size) {
  return sharp(SVG).resize(size, size).png().toBuffer();
}

console.log('Generando icon.png 512x512...');
const big = await sharp(SVG).resize(512, 512).png().toBuffer();
await fs.writeFile(OUT_PNG, big);

console.log('Generando icon.ico multi-resolución...');
const pngs = await Promise.all(SIZES.map(buildPng));
const ico = await pngToIco(pngs);
await fs.writeFile(OUT_ICO, ico);

console.log('✓ electron/icon.png (512x512) y electron/icon.ico (multi-size) generados');
