// Builds the app icons from the Finora mark (public/brand/finora-mark.svg).
// Usage: node scripts/generate-icons.mjs
import sharp from "sharp";

const NAVY = "#0B1F3A";
const MARK = `
  <g transform="translate(-3 -3)">
    <path fill="#F6F1E7" d="M30 70V30a4 4 0 0 1 4-4h32a6 6 0 0 1 0 12H42v8h18a6 6 0 0 1 0 12H42v12a6 6 0 0 1-12 0z"/>
    <circle cx="60" cy="70" r="6" fill="#C9A24B"/>
  </g>`;

/** A full-bleed navy square with the mark scaled to `scale` of the side, centered. */
function squareIcon(scale) {
  const offset = (96 - 96 * scale) / 2;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
    <rect width="96" height="96" fill="${NAVY}"/>
    <g transform="translate(${offset} ${offset}) scale(${scale})">${MARK}</g>
  </svg>`);
}

const rounded = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
  <rect width="96" height="96" rx="21.5" fill="${NAVY}"/>${MARK}
</svg>`);

const outputs = [
  // Browsers and Android ("any"): the rounded tile, as in the logo.
  { file: "public/icons/icon-192.png", svg: rounded, size: 192 },
  { file: "public/icons/icon-512.png", svg: rounded, size: 512 },
  // Android adaptive icons crop to a circle or squircle: keep the mark inside the 80% safe zone.
  { file: "public/icons/maskable-512.png", svg: squareIcon(0.72), size: 512 },
  // iOS rounds the corners itself and wants an opaque square.
  { file: "public/icons/apple-touch-icon.png", svg: squareIcon(0.86), size: 180 },
];

for (const { file, svg, size } of outputs) {
  await sharp(svg, { density: 512 }).resize(size, size).png({ compressionLevel: 9 }).toFile(file);
  console.log(`${file} (${size}x${size})`);
}
