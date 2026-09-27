import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Point-in-triangle test using barycentric coordinates
function pointInTriangle(px, py, x1, y1, x2, y2, x3, y3) {
  const d1 = (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
  const d2 = (px - x3) * (y2 - y3) - (x2 - x3) * (py - y3);
  const d3 = (px - x1) * (y3 - y1) - (x3 - x1) * (py - y1);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

// Evaluate DriveWise logo at normalized coordinates (0..100, 0..100)
// Returns 1 if part of the white monogram, 0 if background
function isDriveWiseWhite(nx, ny) {
  // Outer triangle: (50,14), (86,78), (14,78)
  const inOuter = pointInTriangle(nx, ny, 50, 14, 86, 78, 14, 78);
  if (!inOuter) return false;

  // Lower cutout triangle between legs: (50,44), (68,78), (32,78)
  const inLowerCutout = pointInTriangle(nx, ny, 50, 44, 68, 78, 32, 78);
  if (inLowerCutout) return false;

  // Center highway dash cutout: x in [47, 53], y in [56, 78]
  if (nx >= 47 && nx <= 53 && ny >= 56 && ny <= 78) return false;

  // Upper middle cutout triangle: (50,28), (62,50), (38,50)
  const inUpperCutout = pointInTriangle(nx, ny, 50, 28, 62, 50, 38, 50);
  if (inUpperCutout) {
    // Inner white apex triangle: (50,34), (57,48), (43,48)
    const inInnerApex = pointInTriangle(nx, ny, 50, 34, 57, 48, 43, 48);
    return inInnerApex;
  }

  return true;
}

// CRC32 implementation for PNG chunks
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const combined = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(combined), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createPng(width, height, getPixelRGBA) {
  const rawData = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 4);
    rawData[rowStart] = 0; // filter type 0
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixelRGBA(x, y, width, height);
      const idx = rowStart + 1 + x * 4;
      rawData[idx] = r;
      rawData[idx + 1] = g;
      rawData[idx + 2] = b;
      rawData[idx + 3] = a;
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = zlib.deflateSync(rawData, { level: 9 });
  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idat),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

// 4x4 Super-sampled anti-aliasing renderer
function renderIcon(size, mode) {
  return createPng(size, size, (x, y, w, h) => {
    let rSum = 0;
    let gSum = 0;
    let bSum = 0;
    let aSum = 0;
    const samples = 4;

    for (let sy = 0; sy < samples; sy++) {
      for (let sx = 0; sx < samples; sx++) {
        const px = (x + (sx + 0.5) / samples) / w;
        const py = (y + (sy + 0.5) / samples) / h;

        if (mode === 'round') {
          const dx = px - 0.5;
          const dy = py - 0.5;
          if (dx * dx + dy * dy > 0.25) {
            continue;
          }
        } else if (mode === 'square') {
          // Rounded square mask (radius 20%)
          const rx = Math.max(0, Math.abs(px - 0.5) - 0.3);
          const ry = Math.max(0, Math.abs(py - 0.5) - 0.3);
          if (rx * rx + ry * ry > 0.2 * 0.2) {
            continue;
          }
        }

        // Map px, py into 0..100 coordinate space of DriveWiseLogo
        let nx, ny;
        if (mode === 'foreground') {
          // Adaptive icon foreground has 108dp canvas with 54dp safe center
          nx = ((px - 0.25) / 0.5) * 100;
          ny = ((py - 0.25) / 0.5) * 100;
          if (nx >= 0 && nx <= 100 && ny >= 0 && ny <= 100 && isDriveWiseWhite(nx, ny)) {
            rSum += 255;
            gSum += 255;
            bSum += 255;
            aSum += 255;
          }
        } else {
          // Full launcher icon (black background + white DriveWise monogram)
          nx = ((px - 0.14) / 0.72) * 100;
          ny = ((py - 0.14) / 0.72) * 100;
          const white =
            nx >= 0 && nx <= 100 && ny >= 0 && ny <= 100 && isDriveWiseWhite(nx, ny);
          if (white) {
            rSum += 255;
            gSum += 255;
            bSum += 255;
            aSum += 255;
          } else {
            rSum += 8;
            gSum += 10;
            bSum += 14;
            aSum += 255;
          }
        }
      }
    }

    const total = samples * samples;
    const a = Math.round(aSum / total);
    if (a === 0) return [0, 0, 0, 0];
    return [
      Math.round(rSum / (aSum / 255)),
      Math.round(gSum / (aSum / 255)),
      Math.round(bSum / (aSum / 255)),
      a,
    ];
  });
}

const densities = [
  { folder: 'mipmap-mdpi', launcher: 48, fg: 108 },
  { folder: 'mipmap-hdpi', launcher: 72, fg: 162 },
  { folder: 'mipmap-xhdpi', launcher: 96, fg: 216 },
  { folder: 'mipmap-xxhdpi', launcher: 144, fg: 324 },
  { folder: 'mipmap-xxxhdpi', launcher: 192, fg: 432 },
];

const resBase = path.resolve('android/app/src/main/res');

for (const d of densities) {
  const dir = path.join(resBase, d.folder);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'ic_launcher.png'), renderIcon(d.launcher, 'square'));
  fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), renderIcon(d.launcher, 'round'));
  fs.writeFileSync(path.join(dir, 'ic_launcher_foreground.png'), renderIcon(d.fg, 'foreground'));
  console.log(`Generated DriveWise icons in ${d.folder}`);
}
