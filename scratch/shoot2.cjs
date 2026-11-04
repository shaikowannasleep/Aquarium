const { chromium } = require('D:/Threejs/Sandbus/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const [w, h, name] of [[375, 812, 'proj375'], [1440, 900, 'proj1440']]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.goto('http://localhost:8090/', { waitUntil: 'load' });
    await page.waitForTimeout(1000);
    const info = await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = 'auto';
      const g = document.getElementById('project-grid');
      g.scrollIntoView({ block: 'start' });
      window.scrollBy(0, -90);
      const c = document.getElementById('ocean-bg');
      const gl = c ? !!(c.getContext('webgl2') || c.getContext('webgl')) : null;
      return { cards: document.querySelectorAll('.project').length, canvas: !!c, cls: document.documentElement.className, bgBox: c ? c.getBoundingClientRect().width + 'x' + c.getBoundingClientRect().height : null };
    });
    console.log(name, JSON.stringify(info));
    await page.waitForTimeout(800);
    await page.screenshot({ path: `D:/Dungvd/Aquarium/scratch/shots/${name}.png`, timeout: 60000 });
    await page.close();
  }
  await browser.close();
  console.log('DONE');
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
