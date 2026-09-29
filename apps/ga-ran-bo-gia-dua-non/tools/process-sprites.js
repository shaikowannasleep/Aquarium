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

function colourDistanceRgb(data, offset, colour) {
  const dr = data[offset] - colour[0];
  const dg = data[offset + 1] - colour[1];
  const db = data[offset + 2] - colour[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

// Remove only background that is connected to the crop boundary. This keeps
// white details (chef coat, cream, plate highlights) intact instead of treating
// every pale pixel as background.
function edgeCutout(data, width, height, background, tolerance = 58, seedBottom = true) {
  const out = Buffer.from(data);
  const seen = new Uint8Array(width * height);
  const queue = [];
  const enqueue = index => {
    if (seen[index]) return;
    const distance = colourDistanceRgb(data, index * 4, background);
    if (distance > tolerance) return;
    seen[index] = 1;
    queue.push(index);
  };

  for (let x = 0; x < width; x++) {
    enqueue(x);
    if (seedBottom) enqueue((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y++) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  for (let head = 0; head < queue.length; head++) {
    const index = queue[head];
    const p = index * 4;
    const distance = colourDistanceRgb(data, p, background);
    // A short feather preserves anti-aliased outlines without a pale halo.
    out[p + 3] = distance <= 18 ? 0 : Math.round(255 * (distance - 18) / (tolerance - 18));
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) enqueue(index - 1);
    if (x < width - 1) enqueue(index + 1);
    if (y > 0) enqueue(index - width);
    if (y < height - 1) enqueue(index + width);
  }

  return out;
}

function keepMainComponents(data, width, height) {
  const visited = new Uint8Array(width * height);
  const components = [];
  for (let start = 0; start < width * height; start++) {
    if (visited[start] || data[start * 4 + 3] < 40) continue;
    visited[start] = 1;
    const pixels = [start];
    for (let head = 0; head < pixels.length; head++) {
      const index = pixels[head];
      const x = index % width;
      const y = Math.floor(index / width);
      const neighbours = [];
      if (x > 0) neighbours.push(index - 1);
      if (x < width - 1) neighbours.push(index + 1);
      if (y > 0) neighbours.push(index - width);
      if (y < height - 1) neighbours.push(index + width);
      for (const next of neighbours) {
        if (!visited[next] && data[next * 4 + 3] >= 40) {
          visited[next] = 1;
          pixels.push(next);
        }
      }
    }
    components.push(pixels);
  }

  components.sort((a, b) => b.length - a.length);
  const minimum = Math.max(20, (components[0]?.length || 0) * 0.08);
  const keep = new Uint8Array(width * height);
  for (const component of components) {
    if (component.length < minimum) continue;
    component.forEach(index => { keep[index] = 1; });
  }
  for (let index = 0; index < width * height; index++) {
    if (!keep[index]) data[index * 4 + 3] = 0;
  }
  return data;
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
      // Crop inside the decorative card border before keying the warm paper.
      const cellLeft = Math.round(col * colW);
      const cellRight = Math.round((col + 1) * colW);
      const cellTop = Math.round(row * rowH);
      const cellBottom = Math.round((row + 1) * rowH);
      const topInset = 30;
      const bottomInset = 25;
      const rect = {
        left: cellLeft + 34,
        top: cellTop + topInset,
        width: cellRight - cellLeft - 68,
        height: cellBottom - cellTop - topInset - bottomInset
      };
      const { data, info } = await sharp(path.join(root, '1.png')).extract(rect).ensureAlpha().raw()
        .toBuffer({ resolveWithObject: true });
      const keyed = edgeCutout(data, info.width, info.height, modalBackground(data, info.width, info.height), 64);
      // Remove the rounded card stroke, which lives only in this guard band.
      for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
        if (x < 12 || x >= info.width - 12 || y < 28 || y >= info.height - 28) keyed[(y * info.width + x) * 4 + 3] = 0;
      }
      keepMainComponents(keyed, info.width, info.height);
      const raw = await sharp(keyed, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
      frames.push(await normalizeFoodSprite(raw, frameW, frameH, 14));
    }
  }

  await sharp({ create: { width: 5 * frameW, height: 3 * frameH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(frames.map((input, i) => ({ input, left: (i % 5) * frameW, top: Math.floor(i / 5) * frameH })))
    .png({ compressionLevel: 9 })
    .toFile(path.join(runtime, 'food-atlas.png'));
  console.log(`runtime/food-atlas.png ${5 * frameW}x${3 * frameH}`);
}

async function buildChefAtlas() {
  const sourcePath = path.join(root, 'assets/chef_spritesheet_4x2.png');

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
      .extract({ left: box.left + 3, top: box.top + 3, width: box.width - 6, height: box.height - 6 })
      .ensureAlpha().raw().toBuffer({ resolveWithObject: true });

    const { width, height } = info;
    const out = Buffer.from(data);
    const seen = new Uint8Array(width * height);
    const queue = [];
    const isChecker = index => {
      const p = index * 4;
      const r = data[p], g = data[p + 1], b = data[p + 2];
      const grayscale = Math.max(r, g, b) - Math.min(r, g, b) <= 7;
      return grayscale && r >= 125 && r <= 238;
    };
    for (let x = 0; x < width; x++) {
      queue.push(x, (height - 1) * width + x);
    }
    for (let y = 1; y < height - 1; y++) queue.push(y * width, y * width + width - 1);
    for (let head = 0; head < queue.length; head++) {
      const index = queue[head];
      if (seen[index]) continue;
      seen[index] = 1;
      const p = index * 4;
      const r = data[p], g = data[p + 1], b = data[p + 2];
      const boundaryDark = r < 65 && g < 65 && b < 65;
      if (!isChecker(index) && !boundaryDark) continue;
      out[p + 3] = 0;
      const x = index % width, y = Math.floor(index / width);
      if (x > 0) queue.push(index - 1);
      if (x < width - 1) queue.push(index + 1);
      if (y > 0) queue.push(index - width);
      if (y < height - 1) queue.push(index + width);
    }
    // Checker tiles are separated by the sprite-sheet guide, so clear their
    // remaining neutral pixels after the boundary flood.
    for (let index = 0; index < width * height; index++) {
      if (isChecker(index)) out[index * 4 + 3] = 0;
    }
    // The reference grid has a dark guide directly under each torso.
    for (let y = height - 7; y < height; y++) for (let x = 0; x < width; x++) {
      out[(y * width + x) * 4 + 3] = 0;
    }

    const pngBuf = await sharp(out, { raw: { width, height, channels: 4 } }).png().toBuffer();
    const trimmed = await sharp(pngBuf).trim().png().toBuffer({ resolveWithObject: true });

    const targetH = 202;
    const scale = Math.min(targetH / trimmed.info.height, (frameW - 16) / trimmed.info.width);
    const scaledW = Math.round(trimmed.info.width * scale);
    const scaledH = Math.round(trimmed.info.height * scale);
    const scaledBuf = await sharp(trimmed.data)
      .resize(scaledW, scaledH)
      .png().toBuffer();

    const leftPad = Math.floor((frameW - scaledW) / 2);
    const rightPad = frameW - scaledW - leftPad;
    const topPad = frameH - scaledH - 8;
    const bottomPad = 8;

    const frameBuf = await sharp(scaledBuf)
      .extend({ top: topPad, bottom: bottomPad, left: leftPad, right: rightPad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png().toBuffer();

    frames.push(frameBuf);
  }

  await sharp({ create: { width: frames.length * frameW, height: frameH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(frames.map((input, i) => ({ input, left: i * frameW, top: 0 })))
    .png({ compressionLevel: 9 })
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
