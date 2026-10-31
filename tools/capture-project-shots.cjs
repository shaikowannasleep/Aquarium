// Capture project card previews for the portfolio (1200x750 PNG).
// Usage: node tools/capture-project-shots.cjs
// Needs playwright; resolved from PLAYWRIGHT_DIR or D:\Threejs\Sandbus\node_modules.
const path = require('path');
const pwDir = process.env.PLAYWRIGHT_DIR || 'D:/Threejs/Sandbus/node_modules/playwright';
const { chromium } = require(pwDir);

const SHOTS = [
  { url: 'https://shaikowannasleep.github.io/sticker-room/', out: 'sticker-room.png', wait: 30000 },
  { url: 'https://tgsh-wiki.vercel.app/', out: 'webwiki.png', wait: 5000 },
];

(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const only = process.argv[2];
  for (const s of SHOTS.filter((x) => !only || x.out.startsWith(only))) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 750 } });
    await page.goto(s.url, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(s.wait);
    const file = path.join(__dirname, '..', 'docs', 'assets', 'projects', s.out);
    await page.screenshot({ path: file });
    console.log('saved', file);
    await page.close();
  }
  await browser.close();
})();
