const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Minimal pure-Node PNG builder with CRC32
function createPng(width, height, drawFn) {
  const bytesPerPixel = 4;
  const rawData = Buffer.alloc((width * bytesPerPixel + 1) * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (width * bytesPerPixel + 1);
    rawData[rowOffset] = 0; // Filter type: None

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * bytesPerPixel;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = c ^ buf[i];
      for (let j = 0; j < 8; j++) {
        c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0);
      }
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);

    const typeBuf = Buffer.from(type, 'ascii');
    const body = Buffer.concat([typeBuf, data]);

    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(body), 0);

    return Buffer.concat([len, body, crcBuf]);
  }

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Icon Drawer: WhatsApp Green circle with download arrow / contact symbol
function drawIcon(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const r = w / 2 - 1;
  const dist = Math.hypot(x - cx, y - cy);

  // Background transparent outside circle
  if (dist > r) {
    return [0, 0, 0, 0];
  }

  // Smooth anti-aliased edge
  let alpha = 255;
  if (dist > r - 1) {
    alpha = Math.floor(255 * (r - dist));
  }

  // WhatsApp Emerald Green gradient
  const grad = y / h;
  const red = Math.floor(37 * (1 - grad) + 18 * grad);
  const green = Math.floor(211 * (1 - grad) + 140 * grad);
  const blue = Math.floor(102 * (1 - grad) + 126 * grad);

  // White icon symbol in center (Down Arrow / Tray)
  const nx = (x - cx) / (w / 2);
  const ny = (y - cy) / (h / 2);

  // Arrow stem
  const inStem = Math.abs(nx) <= 0.2 && ny >= -0.5 && ny <= 0.15;
  // Arrow head
  const inHead = ny >= 0.1 && ny <= 0.5 && Math.abs(nx) <= (0.55 - (ny - 0.1) * 0.85);
  // Bottom bar
  const inBar = ny >= 0.55 && ny <= 0.72 && Math.abs(nx) <= 0.6;

  if (inStem || inHead || inBar) {
    return [255, 255, 255, alpha];
  }

  return [red, green, blue, alpha];
}

const sizes = [16, 32, 48, 128];
const iconsDir = path.join(__dirname, '..', 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

sizes.forEach(size => {
  const pngBuf = createPng(size, size, drawIcon);
  const outPath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(outPath, pngBuf);
  console.log(`Generated ${outPath} (${size}x${size}, ${pngBuf.length} bytes)`);
});
