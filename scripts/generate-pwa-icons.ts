import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';

const rootDir = process.cwd();
const iconsDir = path.resolve(rootDir, 'client/public/icons');
const sourceSvgPath = path.resolve(iconsDir, 'icon.svg');

if (!fs.existsSync(sourceSvgPath)) {
  console.error(`Source SVG not found at ${sourceSvgPath}`);
  process.exit(1);
}

const svgContent = fs.readFileSync(sourceSvgPath, 'utf-8');

// 1. Generate 192x192 standard icon
console.log('Rendering icon-192x192.png...');
const resvg192 = new Resvg(svgContent, {
  fitTo: {
    mode: 'width',
    value: 192,
  },
});
const png192 = resvg192.render().asPng();
fs.writeFileSync(path.resolve(iconsDir, 'icon-192x192.png'), png192);

// 2. Generate 512x512 standard icon
console.log('Rendering icon-512x512.png...');
const resvg512 = new Resvg(svgContent, {
  fitTo: {
    mode: 'width',
    value: 512,
  },
});
const png512 = resvg512.render().asPng();
fs.writeFileSync(path.resolve(iconsDir, 'icon-512x512.png'), png512);

// 3. Generate 512x512 maskable icon with safe-zone margin
console.log('Rendering icon-maskable-512x512.png...');
// Maskable icon requires solid background extending to edges and core graphics within safe zone (80%)
const maskableSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#0f172a"/>
  <g transform="translate(51.2, 51.2) scale(0.8)">
    <rect x="32" y="32" width="448" height="448" rx="80" fill="#16a34a"/>
    <circle cx="256" cy="256" r="160" fill="#0f172a" stroke="#ffffff" stroke-width="24"/>
    <polyline points="256,150 256,256 330,256" fill="none" stroke="#4ade80" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="256" cy="256" r="14" fill="#ffffff"/>
    <text x="256" y="445" font-family="system-ui, -apple-system, BlinkMacSystemFont, sans-serif" font-size="44" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="2">MINHAS HORAS</text>
  </g>
</svg>
`;

const resvgMaskable = new Resvg(maskableSvg, {
  fitTo: {
    mode: 'width',
    value: 512,
  },
});
const pngMaskable = resvgMaskable.render().asPng();
fs.writeFileSync(path.resolve(iconsDir, 'icon-maskable-512x512.png'), pngMaskable);

// 4. Generate apple-touch-icon.png (180x180)
console.log('Rendering apple-touch-icon.png (180x180)...');
const resvgApple = new Resvg(svgContent, {
  fitTo: {
    mode: 'width',
    value: 180,
  },
});
const pngApple = resvgApple.render().asPng();
fs.writeFileSync(path.resolve(iconsDir, 'apple-touch-icon.png'), pngApple);

console.log('All PWA icons generated successfully:');
console.log('- icon-192x192.png:', png192.length, 'bytes');
console.log('- icon-512x512.png:', png512.length, 'bytes');
console.log('- icon-maskable-512x512.png:', pngMaskable.length, 'bytes');
console.log('- apple-touch-icon.png:', pngApple.length, 'bytes');
