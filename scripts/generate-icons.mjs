// Genera los íconos PNG de la PWA (emblema de barras sobre el gris de la app)
// sin dependencias nativas. Uso: node scripts/generate-icons.mjs
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '../public/icons');

// Barras en coordenadas normalizadas 0..1, mismas proporciones que el SVG de la marca.
const BARS = [
  { x: 0.15, top: 0.5625, color: [255, 135, 135] }, // rojo
  { x: 0.34167, top: 0.41667, color: [255, 212, 59] }, // amarillo
  { x: 0.53333, top: 0.27083, color: [77, 171, 247] }, // azul
  { x: 0.725, top: 0.125, color: [81, 207, 102] }, // verde
];
const BAR_W = 0.125;
const BASE = 0.8125;

const BG = [60, 60, 60]; // #3c3c3c gris de la app

function renderRGBA(size, markScale) {
  const data = Buffer.alloc(size * size * 4);
  const s = (v) => (v - 0.5) * markScale + 0.5; // escala alrededor del centro
  const bars = BARS.map((b) => ({
    x0: s(b.x),
    x1: s(b.x + BAR_W),
    y0: s(b.top),
    y1: s(BASE),
    color: b.color,
  }));

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const nx = x / Math.max(1, size - 1);
      const ny = y / Math.max(1, size - 1);
      const bar = bars.find((b) => nx >= b.x0 && nx <= b.x1 && ny >= b.y0 && ny <= b.y1);
      const color = bar ? bar.color : BG;
      data[idx] = color[0];
      data[idx + 1] = color[1];
      data[idx + 2] = color[2];
      data[idx + 3] = 255; // full-bleed: sin transparencia (iOS lo enmascara)
    }
  }
  return data;
}

// Codificador PNG mínimo (RGBA, color type 6)
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePNG(size, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Cada scanline lleva un byte de filtro (0 = none) al inicio.
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });

  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

const targets = [
  { file: 'icon-192.png', size: 192, scale: 0.72 },
  { file: 'icon-512.png', size: 512, scale: 0.72 },
  { file: 'maskable-512.png', size: 512, scale: 0.55 }, // más padding por la zona segura
  { file: 'apple-touch-icon-180.png', size: 180, scale: 0.72 },
  { file: 'favicon-32.png', size: 32, scale: 0.78 },
];

mkdirSync(OUT_DIR, { recursive: true });
for (const { file, size, scale } of targets) {
  const png = encodePNG(size, renderRGBA(size, scale));
  writeFileSync(resolve(OUT_DIR, file), png);
  console.log(`  ✓ ${file} (${size}×${size}, ${png.length} bytes)`);
}
console.log('Íconos generados en public/icons/');
