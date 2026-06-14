const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const width = 1200;
const height = 800;
const bytesPerPixel = 4;
const raw = Buffer.alloc((width * bytesPerPixel + 1) * height);

function crcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
}

const table = crcTable();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = table[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  const crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function setPixel(x, y, r, g, b, a = 255) {
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  const row = y * (width * bytesPerPixel + 1);
  const offset = row + 1 + x * bytesPerPixel;
  raw[offset] = r;
  raw[offset + 1] = g;
  raw[offset + 2] = b;
  raw[offset + 3] = a;
}

function blendPixel(x, y, r, g, b, alpha = 1) {
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  const row = y * (width * bytesPerPixel + 1);
  const offset = row + 1 + x * bytesPerPixel;
  raw[offset] = Math.round(raw[offset] * (1 - alpha) + r * alpha);
  raw[offset + 1] = Math.round(raw[offset + 1] * (1 - alpha) + g * alpha);
  raw[offset + 2] = Math.round(raw[offset + 2] * (1 - alpha) + b * alpha);
  raw[offset + 3] = 255;
}

function roundedRect(x, y, w, h, radius, color, alpha = 1) {
  for (let py = y; py < y + h; py += 1) {
    for (let px = x; px < x + w; px += 1) {
      const dx = Math.max(x - px, 0, px - (x + w - 1));
      const dy = Math.max(y - py, 0, py - (y + h - 1));
      const insideCorner =
        (px >= x + radius && px < x + w - radius) ||
        (py >= y + radius && py < y + h - radius) ||
        Math.hypot(px < x + radius ? px - (x + radius) : px - (x + w - radius - 1), py < y + radius ? py - (y + radius) : py - (y + h - radius - 1)) <= radius;
      if ((dx === 0 && dy === 0 && insideCorner) || (px >= x + radius && px < x + w - radius) || (py >= y + radius && py < y + h - radius)) {
        blendPixel(px, py, color[0], color[1], color[2], alpha);
      }
    }
  }
}

for (let y = 0; y < height; y += 1) {
  raw[y * (width * bytesPerPixel + 1)] = 0;
  for (let x = 0; x < width; x += 1) {
    const gx = x / width;
    const gy = y / height;
    const light = 1 - gy * 0.58 + gx * 0.06;
    setPixel(x, y, Math.round(20 * light), Math.round(92 * light + 28), Math.round(104 * light + 34));
  }
}

for (let i = 0; i < 70; i += 1) {
  const x = Math.floor((Math.sin(i * 19.13) * 0.5 + 0.5) * width);
  const y = Math.floor((Math.cos(i * 11.81) * 0.5 + 0.5) * height);
  const radius = 55 + (i % 8) * 16;
  for (let py = y - radius; py < y + radius; py += 1) {
    for (let px = x - radius; px < x + radius; px += 1) {
      const d = Math.hypot(px - x, py - y) / radius;
      if (d < 1) blendPixel(px, py, 255, 255, 255, (1 - d) * 0.025);
    }
  }
}

roundedRect(90, 130, 460, 500, 20, [246, 251, 252], 0.94);
roundedRect(130, 180, 380, 76, 12, [0, 124, 137], 0.95);
roundedRect(130, 286, 170, 92, 10, [231, 241, 244], 1);
roundedRect(330, 286, 180, 92, 10, [231, 241, 244], 1);
roundedRect(130, 408, 380, 42, 9, [216, 224, 232], 1);
roundedRect(130, 472, 280, 42, 9, [216, 224, 232], 1);
roundedRect(130, 536, 340, 42, 9, [216, 224, 232], 1);

roundedRect(670, 170, 360, 430, 28, [239, 248, 249], 0.9);
for (let y = 235; y < 520; y += 1) {
  for (let x = 765; x < 935; x += 1) {
    const head = Math.hypot((x - 850) / 74, (y - 280) / 74) <= 1;
    const coat = y > 350 && Math.abs(x - 850) < 125 - (y - 350) * 0.18;
    if (head) blendPixel(x, y, 119, 84, 67, 0.95);
    if (coat) blendPixel(x, y, 250, 253, 254, 0.95);
  }
}
roundedRect(748, 365, 205, 190, 18, [250, 253, 254], 0.96);
roundedRect(820, 362, 60, 150, 8, [0, 124, 137], 0.75);
roundedRect(700, 530, 300, 36, 18, [0, 124, 137], 0.86);

for (let x = 185; x < 460; x += 1) {
  const y = Math.round(350 + Math.sin((x - 185) / 22) * 20 + Math.sin((x - 185) / 8) * 6);
  for (let dy = -2; dy <= 2; dy += 1) setPixel(x, y + dy, 214, 107, 45, 255);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(width, 0);
ihdr.writeUInt32BE(height, 4);
ihdr[8] = 8;
ihdr[9] = 6;
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0))
]);

const output = path.join(__dirname, "..", "public", "healthcare-visual.png");
fs.writeFileSync(output, png);
console.log(`Generated ${output}`);
