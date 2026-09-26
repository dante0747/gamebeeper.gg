/** Rebuild the brand exports from the SVG master and generated signal artwork. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'public');
const brand = path.join(output, 'brand');
const logo = await fs.readFile(path.join(brand, 'logo.svg'), 'utf8');
const mark = logo.replace(/<svg[^>]*>|<\/svg>|<title>.*?<\/title>/g, '');
const svg = (width, height, content) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${content}</svg>`);
const icon = (x, y, size) => `<g transform="translate(${x} ${y}) scale(${size / 64})">${mark}</g>`;
const text = (x, y, size, copy, color = '#F6F6F8', weight = 700, extra = '') => `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}" ${extra}>${copy}</text>`;

await fs.mkdir(brand, { recursive: true });
await fs.writeFile(path.join(root, 'favicon.svg'), logo);
await fs.writeFile(path.join(output, 'favicon.svg'), logo);
for (const [filename, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180], ['favicon-32.png', 32], ['favicon-16.png', 16]]) {
  // Apple supplies its own rounded mask; keep the canvas opaque.
  const source = filename.startsWith('apple')
    ? svg(size, size, `<rect width="${size}" height="${size}" fill="#09090C"/>${icon(size * .12, size * .12, size * .76)}`)
    : Buffer.from(logo);
  await sharp(source).resize(size, size).png().toFile(path.join(output, filename));
}
await sharp(svg(512, 512, `<rect width="512" height="512" fill="#09090C"/>${icon(96, 96, 320)}`)).png().toFile(path.join(output, 'icon-maskable-512.png'));
await sharp(Buffer.from(logo)).resize(1024, 1024).png().toFile(path.join(brand, 'avatar.png'));

for (const [filename, ink] of [['wordmark.svg', '#F6F6F8'], ['wordmark-light.svg', '#09090C']]) {
  await fs.writeFile(path.join(brand, filename), svg(565, 100, `${icon(0, 6, 88)}${text(108, 70, 58, 'GAME', ink, 900)}${text(291, 70, 58, 'BEEPER', ink === '#09090C' ? '#09090C' : '#C8FF3D', 900)}`));
}

const artwork = await fs.readFile(path.join(brand, 'signal-background.png'));
async function card(filename, width, height, format) {
  const bg = await sharp(artwork).resize(width, height, { fit: 'cover' }).png().toBuffer();
  const square = format === 'square';
  const banner = format === 'banner';
  const left = square ? 84 : 72;
  const logoY = square ? 112 : banner ? 65 : 62;
  const titleY = square ? 408 : banner ? 236 : 266;
  const titleSize = square ? 88 : banner ? 70 : 76;
  const detailsY = square ? 662 : banner ? 380 : 456;
  const footerY = height - (square ? 100 : 55);
  const overlay = svg(width, height, `
    <defs><linearGradient id="shade"><stop stop-color="#09090C" stop-opacity=".98"/><stop offset=".62" stop-color="#09090C" stop-opacity=".83"/><stop offset="1" stop-color="#09090C" stop-opacity=".12"/></linearGradient></defs>
    <rect width="${width}" height="${height}" fill="url(#shade)"/>
    <path d="M${width - 190} 34H${width - 34}V122M34 ${height - 120}V${height - 34}H190" fill="none" stroke="#C8FF3D" stroke-width="2" opacity=".6"/>
    ${icon(left, logoY, 60)}
    ${text(left + 80, logoY + 42, 32, 'GAME', '#F6F6F8', 900)}
    ${text(left + 178, logoY + 42, 32, 'BEEPER', '#C8FF3D', 900)}
    ${text(left, titleY, titleSize, 'Gaming news,', '#F6F6F8', 900, 'letter-spacing="-3"')}
    ${text(left, titleY + titleSize * 1.16, titleSize, 'minus the noise.', '#C8FF3D', 900, 'letter-spacing="-3"')}
    ${text(left, detailsY, square ? 28 : 24, 'News. Reviews. Reveals. Trailers.', '#BDBDCB', 400)}
    ${text(left, detailsY + 40, square ? 28 : 24, 'One feed. Straight from the source.', '#BDBDCB', 400)}
    ${text(left, footerY, 22, 'gamebeeper.gg', '#F6F6F8', 700)}
    <circle cx="${left + 256}" cy="${footerY - 8}" r="4" fill="#C8FF3D"/>
    ${text(left + 272, footerY, 16, 'FREE · AD-FREE · OPEN SOURCE', '#BDBDCB', 700, 'letter-spacing="1"')}
  `);
  await sharp(bg).composite([{ input: overlay }]).png().toFile(path.join(output, filename));
}
await card('og-image-v2.png', 1200, 630, 'wide');
await card('brand/social-square.png', 1080, 1080, 'square');
await card('brand/social-banner.png', 1500, 500, 'banner');
console.log('Brand assets generated: logo, wordmarks, icons, social preview, square post and banner.');
