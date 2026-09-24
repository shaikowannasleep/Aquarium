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
  return [...histogram].sort((a, b) => b[1] - a[1])[0]?.[0].split(',').map(v => Number(v) * 8 + 4) || [254, 248, 238];
}

async function cutoutFood(input, rect) {
  const { data, info } = await sharp(path.join(root, input))
    .extract(rect).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data), { width, height } = info, bg = modalBackground(data, width, height);
  const seen = new Uint8Array(width * height), queue = [];
  
  for (let x = 0; x < width; x++) {
    queue.push(x, (height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y++) {
    queue.push(y * width, y * width + width - 1);
  }
  
  for (let head = 0; head < queue.length; head++) {
    const index = queue[head];
    if (seen[index]) continue;
    seen[index] = 1;
    const p = index * 4;
    if (colourDistance(data, p, bg) > 28) continue;
    out[p + 3] = 0;
    const x = index % width, y = Math.floor(index / width);
    if (x > 0) queue.push(index - 1);
    if (x < width - 1) queue.push(index + 1);
    if (y > 0) queue.push(index - width);
    if (y < height - 1) queue.push(index + width);
  }
  
  return sharp(out, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

async function normalizeFoodSprite(buffer, width, height, padding = 8) {
  const trimmed = await sharp(buffer).trim().png().toBuffer();
  return sharp(trimmed)
    .resize(width - padding * 2, height - padding * 2, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({ top: padding, bottom: padding, left: padding, right: padding, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toBuffer();
}

async function buildFoodAtlas() {
  const meta = await sharp(path.join(root, '1.png')).metadata();
  const frameW = 240, frameH = 220, frames = [];
  const colW = meta.width / 5;
  const rowH = meta.height / 3;

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 5; col++) {
      const left = Math.round(col * colW);
      const right = Math.round((col + 1) * colW);
      const top = Math.round(row * rowH);
      const bottom = Math.round((row + 1) * rowH);
      const raw = await cutoutFood('1.png', { left, top, width: right - left, height: bottom - top });
      frames.push(await normalizeFoodSprite(raw, frameW, frameH, 8));
    }
  }

  await sharp({ create: { width: 5 * frameW, height: 3 * frameH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(frames.map((input, i) => ({ input, left: (i % 5) * frameW, top: Math.floor(i / 5) * frameH })))
    .png({ compressionLevel: 9, palette: true, colours: 256, dither: 0.7 })
    .toFile(path.join(runtime, 'food-atlas.png'));
  console.log(`runtime/food-atlas.png ${5 * frameW}x${3 * frameH}`);
}

async function buildChefAtlas() {
  // Use the 4x2 grid of 8 frames with empty hands in frames 3 & 4
  const sourcePath = fs.existsSync(path.join(root, 'assets/chef_spritesheet_4x2.png'))
    ? path.join(root, 'assets/chef_spritesheet_4x2.png')
    : path.join(root, '12.png');

  const boxes = [
    { left: 45, top: 84, width: 187, height: 193 },
    { left: 292, top: 84, width: 192, height: 193 },
    { left: 540, top: 84, width: 191, height: 193 },
    { left: 794, top: 84, width: 185, height: 193 },
    { left: 45, top: 335, width: 187, height: 183 },
    { left: 292, top: 335, width: 192, height: 183 },
    { left: 540, top: 335, width: 191, height: 183 },
    { left: 794, top: 335, width: 185, height: 183 },
  ];

  const frameW = 240, frameH = 220;
  const frames = [];

  for (let i = 0; i < boxes.length; i++) {
    const box = boxes[i];
    const { data, info } = await sharp(sourcePath)
      .extract({ left: box.left + 2, top: box.top + 2, width: box.width - 4, height: box.height - 4 })
      .ensureAlpha().raw().toBuffer({ resolveWithObject: true });

    const { width, height } = info;
    const out = Buffer.from(data);
    const seen = new Uint8Array(width * height);
    const queue = [];

    function isBg(idx) {
      const p = idx * 4;
      const r = data[p], g = data[p+1], b = data[p+2];
      if (Math.abs(r - g) <= 6 && Math.abs(g - b) <= 6 && Math.abs(r - b) <= 6 && r >= 140 && r <= 235) return true;
      const x = idx % width, y = Math.floor(idx / width);
      if ((x <= 2 || x >= width - 3 || y <= 2 || y >= height - 3) && r < 60 && g < 60 && b < 60) return true;
      return false;
    }

    for (let x = 0; x < width; x++) {
      if (isBg(x)) { queue.push(x); seen[x] = 1; }
      const bottomIdx = (height - 1) * width + x;
      if (isBg(bottomIdx)) { queue.push(bottomIdx); seen[bottomIdx] = 1; }
    }
    for (let y = 1; y < height - 1; y++) {
      const leftIdx = y * width;
      if (isBg(leftIdx)) { queue.push(leftIdx); seen[leftIdx] = 1; }
      const rightIdx = y * width + width - 1;
      if (isBg(rightIdx)) { queue.push(rightIdx); seen[rightIdx] = 1; }
    }

    for (let head = 0; head < queue.length; head++) {
      const idx = queue[head];
      const p = idx * 4;
      out[p + 3] = 0;
      const x = idx % width, y = Math.floor(idx / width);
      if (x > 0 && !seen[idx - 1] && isBg(idx - 1)) { seen[idx - 1] = 1; queue.push(idx - 1); }
      if (x < width - 1 && !seen[idx + 1] && isBg(idx + 1)) { seen[idx + 1] = 1; queue.push(idx + 1); }
      if (y > 0 && !seen[idx - width] && isBg(idx - width)) { seen[idx - width] = 1; queue.push(idx - width); }
      if (y < height - 1 && !seen[idx + width] && isBg(idx + width)) { seen[idx + width] = 1; queue.push(idx + width); }
    }

    // Clear enclosed gray loop pixels
    for (let idx = 0; idx < width * height; idx++) {
      const p = idx * 4;
      if (out[p + 3] > 0) {
        const r = out[p], g = out[p+1], b = out[p+2];
        if (Math.abs(r - g) <= 4 && Math.abs(g - b) <= 4 && Math.abs(r - b) <= 4 && r >= 140 && r <= 235) {
          out[p + 3] = 0;
        }
      }
    }

    const pngBuf = await sharp(out, { raw: { width, height, channels: 4 } }).png().toBuffer();
    const trimmed = await sharp(pngBuf).trim().png().toBuffer({ resolveWithObject: true });

    const targetH = 212;
    const scale = targetH / trimmed.info.height;
    const scaledW = Math.round(trimmed.info.width * scale);
    const scaledBuf = await sharp(trimmed.data)
      .resize(scaledW, targetH)
      .png().toBuffer();

    const leftPad = Math.floor((frameW - scaledW) / 2);
    const rightPad = frameW - scaledW - leftPad;
    const topPad = frameH - targetH - 4; // 4px padding at bottom
    const bottomPad = 4;

    const frameBuf = await sharp(scaledBuf)
      .extend({ top: topPad, bottom: bottomPad, left: leftPad, right: rightPad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png().toBuffer();

    frames.push(frameBuf);
  }

  await sharp({ create: { width: frames.length * frameW, height: frameH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(frames.map((input, i) => ({ input, left: i * frameW, top: 0 })))
    .png({ compressionLevel: 9, palette: true, colours: 256, dither: 0.7 })
    .toFile(path.join(runtime, 'chef-atlas.png'));
  console.log(`runtime/chef-atlas.png ${frames.length * frameW}x${frameH}`);
}

async function buildPeopleAtlas() {
  const meta = await sharp(path.join(root, 'generated_image.png')).metadata();
  const rowBounds = [[27,225],[225,411],[411,574],[574,737],[737,899],[899,1062],[1062,1222]];
  const frameW = 128, frameH = 160, columns = 11;
  const frames = [];

  for (const [top, bottom] of rowBounds) {
    for (let col = 0; col < columns; col++) {
      const left = Math.round(col * meta.width / columns);
      const right = Math.round((col + 1) * meta.width / columns);
      const raw = await cutoutFood('generated_image.png', { left, top, width: right - left, height: bottom - top });
      frames.push(await normalizeFoodSprite(raw, frameW, frameH, 4));
    }
  }

  await sharp({ create: { width: columns * frameW, height: rowBounds.length * frameH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(frames.map((input, i) => ({ input, left: (i % columns) * frameW, top: Math.floor(i / columns) * frameH })))
    .png({ compressionLevel: 9, palette: true, colours: 256, dither: 0.7 })
    .toFile(path.join(runtime, 'people-atlas.png'));
  console.log(`runtime/people-atlas.png ${columns * frameW}x${rowBounds.length * frameH}`);
}

Promise.all([buildFoodAtlas(), buildChefAtlas(), buildPeopleAtlas()])
  .catch(error => { console.error(error); process.exit(1); });
