const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const runtime = path.join(root, 'runtime');
fs.mkdirSync(runtime, { recursive: true });

function colourDistance(data, offset, bg) {
  return Math.hypot(data[offset] - bg[0], data[offset + 1] - bg[1], data[offset + 2] - bg[2]);
}

function modalBackground(data, width, height) {
  const histogram = new Map();
  for (let y = 0; y < height; y += 3) for (let x = 0; x < width; x += 3) {
    const p = (y * width + x) * 4;
    if (data[p + 3] < 80 || data[p] + data[p + 1] + data[p + 2] < 500) continue;
    const key = `${data[p] >> 3},${data[p + 1] >> 3},${data[p + 2] >> 3}`;
    histogram.set(key, (histogram.get(key) || 0) + 1);
  }
  return [...histogram].sort((a, b) => b[1] - a[1])[0]?.[0].split(',').map(v => Number(v) * 8 + 4) || [246, 238, 220];
}

async function cutout(input, rect, threshold = 72) {
  const { data, info } = await sharp(path.join(root, input))
    .extract(rect).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data), { width, height } = info, bg = modalBackground(data, width, height);
  const seen = new Uint8Array(width * height), queue = [];
  for (let x = 0; x < width; x++) queue.push(x, (height - 1) * width + x);
  for (let y = 1; y < height - 1; y++) queue.push(y * width, y * width + width - 1);
  for (let head = 0; head < queue.length; head++) {
    const index = queue[head];
    if (seen[index]) continue;
    seen[index] = 1;
    const p = index * 4;
    if (colourDistance(data, p, bg) > threshold) continue;
    out[p + 3] = 0;
    const x = index % width, y = Math.floor(index / width);
    if (x) queue.push(index - 1);
    if (x < width - 1) queue.push(index + 1);
    if (y) queue.push(index - width);
    if (y < height - 1) queue.push(index + width);
  }
  const edge = 12;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (x < edge || x >= width - edge || y < edge || y >= height - edge) out[(y * width + x) * 4 + 3] = 0;
  }
  return sharp(out, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

async function normalizeSprite(buffer, width, height, padding = 5) {
  return sharp(buffer).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize(width - padding * 2, height - padding * 2, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({ top: padding, bottom: padding, left: padding, right: padding, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toBuffer();
}

async function buildPeopleAtlas() {
  const meta = await sharp(path.join(root, 'generated_image.png')).metadata();
  const rowBounds = [[27,225],[225,411],[411,574],[574,737],[737,899],[899,1062],[1062,1222]];
  const frameW = 128, frameH = 160, columns = 11;
  const frames = [];
  for (const [top, bottom] of rowBounds) for (let col = 0; col < columns; col++) {
    const left = Math.round(col * meta.width / columns) + 8;
    const right = Math.round((col + 1) * meta.width / columns) - 8;
    const raw = await cutout('generated_image.png', { left, top: top + 5, width: right - left, height: bottom - top - 10 }, 76);
    frames.push(await normalizeSprite(raw, frameW, frameH));
  }
  await sharp({ create: { width: columns * frameW, height: rowBounds.length * frameH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(frames.map((input, i) => ({ input, left: (i % columns) * frameW, top: Math.floor(i / columns) * frameH })))
    .png({ compressionLevel: 9, palette: true, colours: 256, dither: 0.7 })
    .toFile(path.join(runtime, 'people-atlas.png'));
  console.log(`runtime/people-atlas.png ${columns * frameW}x${rowBounds.length * frameH}`);
}

async function buildFoodAtlas() {
  const meta = await sharp(path.join(root, '1.png')).metadata();
  const frameW = 240, frameH = 220, frames = [];
  for (let row = 0; row < 3; row++) for (let col = 0; col < 5; col++) {
    const left = Math.round(col * meta.width / 5) + 35;
    const right = Math.round((col + 1) * meta.width / 5) - 35;
    const top = Math.round(row * meta.height / 3) + 35;
    const bottom = Math.round((row + 1) * meta.height / 3) - 35;
    const raw = await cutout('1.png', { left, top, width: right - left, height: bottom - top }, 76);
    frames.push(await normalizeSprite(raw, frameW, frameH, 8));
  }
  await sharp({ create: { width: 5 * frameW, height: 3 * frameH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(frames.map((input, i) => ({ input, left: (i % 5) * frameW, top: Math.floor(i / 5) * frameH })))
    .png({ compressionLevel: 9, palette: true, colours: 256, dither: 0.7 })
    .toFile(path.join(runtime, 'food-atlas.png'));
  console.log(`runtime/food-atlas.png ${5 * frameW}x${3 * frameH}`);
}

async function buildChefAtlas() {
  const crops = [
    { left: 507, top: 82, width: 238, height: 166 }, { left: 766, top: 82, width: 238, height: 166 },
    { left: 507, top: 320, width: 238, height: 168 }, { left: 766, top: 320, width: 238, height: 168 },
    { left: 507, top: 537, width: 238, height: 192 }, { left: 766, top: 537, width: 238, height: 192 },
    { left: 507, top: 779, width: 238, height: 198 }, { left: 766, top: 779, width: 238, height: 198 }
  ];
  const frameW = 240, frameH = 220, frames = [];
  for (const crop of crops) frames.push(await normalizeSprite(await cutout('12.png', crop, 70), frameW, frameH, 4));
  await sharp({ create: { width: frames.length * frameW, height: frameH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(frames.map((input, i) => ({ input, left: i * frameW, top: 0 })))
    .png({ compressionLevel: 9, palette: true, colours: 256, dither: 0.7 })
    .toFile(path.join(runtime, 'chef-atlas.png'));
  console.log(`runtime/chef-atlas.png ${frames.length * frameW}x${frameH}`);
}

Promise.all([buildPeopleAtlas(), buildFoodAtlas(), buildChefAtlas()])
  .catch(error => { console.error(error); process.exit(1); });
