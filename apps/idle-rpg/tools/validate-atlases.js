const path = require('path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');

async function validateAtlas(name, frameWidth, frameHeight, frameCount, minimumPadding) {
  const { data, info } = await sharp(path.join(root, 'runtime', name))
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const columns = info.width / frameWidth;
  if (!Number.isInteger(columns) || info.height % frameHeight !== 0) {
    throw new Error(`${name}: dimensions do not match ${frameWidth}x${frameHeight} frames`);
  }

  for (let frame = 0; frame < frameCount; frame++) {
    const originX = (frame % columns) * frameWidth;
    const originY = Math.floor(frame / columns) * frameHeight;
    let minX = frameWidth, minY = frameHeight, maxX = -1, maxY = -1;
    for (let y = 0; y < frameHeight; y++) for (let x = 0; x < frameWidth; x++) {
      const alpha = data[((originY + y) * info.width + originX + x) * 4 + 3];
      if (alpha <= 16) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    if (maxX < 0) throw new Error(`${name}: frame ${frame} is empty`);
    const padding = [minX, minY, frameWidth - 1 - maxX, frameHeight - 1 - maxY];
    if (Math.min(...padding) < minimumPadding) {
      throw new Error(`${name}: frame ${frame} padding is unsafe (${padding.join(', ')})`);
    }
  }
  console.log(`PASS ${name}: ${frameCount} frames have >=${minimumPadding}px transparent padding`);
}

Promise.all([
  validateAtlas('chef-atlas.png', 240, 220, 8, 6),
  validateAtlas('food-atlas.png', 240, 220, 15, 12),
  validateAtlas('coma-atlas.png', 360, 300, 12, 6),
  validateAtlas('workout-atlas.png', 400, 360, 6, 10)
]).catch(error => {
  console.error(error.message);
  process.exit(1);
});
