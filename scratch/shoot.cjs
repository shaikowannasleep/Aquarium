const { chromium } = require('D:/Threejs/Sandbus/node_modules/playwright');
const path = require('path');
const OUT = 'D:/Dungvd/Aquarium/scratch/shots';
(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const sizes = [[375, 812, 'p375x812'], [812, 375, 'l812x375'], [1440, 900, 'd1440x900']];
  for (const [w, h, name] of sizes) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    await page.goto('http://localhost:8090/', { waitUntil: 'load' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUT, name + '.png'), timeout: 60000 });
    await page.evaluate(() => { const el = document.getElementById('work'); if (el) el.scrollIntoView(); window.scrollBy(0, -70); }); await page.waitForTimeout(800); await page.screenshot({ path: path.join(OUT, name + '-work.png'), timeout: 60000 });
    console.log(name, 'errors:', JSON.stringify(errors));
    await page.close();
  }
  const widths = [360, 375, 390, 430, 768, 1280, 1440];
  for (const w of widths) {
    const page = await browser.newPage({ viewport: { width: w, height: 800 } });
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    await page.goto('http://localhost:8090/', { waitUntil: 'load' });
    await page.waitForTimeout(1200);
    const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, vv: window.visualViewport ? window.visualViewport.width : null }));
    console.log('width', w, 'scrollWidth', r.sw, 'innerWidth', r.iw, 'vv', r.vv, 'errors', errors.length, JSON.stringify(errors.slice(0, 3)));
    await page.close();
  }
  await browser.close();
  console.log('DONE');
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
