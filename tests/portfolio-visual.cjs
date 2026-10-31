// Visual + layout regression for the portfolio (needs `npm run serve` on :8090).
// Usage: node tests/portfolio-visual.cjs   → shots in scratch/shots/, exits 1 on failure.
const path = require('path');
const fs = require('fs');
const pwDir = process.env.PLAYWRIGHT_DIR || 'D:/Threejs/Sandbus/node_modules/playwright';
const { chromium } = require(pwDir);

const URL = process.env.PORTFOLIO_URL || 'http://localhost:8090/';
const OUT = path.join(__dirname, '..', 'scratch', 'shots');
const SIZES = [[360, 740], [375, 812], [812, 375], [768, 1024], [1280, 800], [1440, 900]];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  let failed = 0;
  for (const [w, h] of SIZES) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(1500);
    // walk down so scroll-reveal sections become visible, then back to top
    await page.evaluate(async () => {
      document.documentElement.style.scrollBehavior = 'auto';
      for (let y = 0; y < document.body.scrollHeight; y += innerHeight * 0.7) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
      scrollTo(0, 0);
    });
    await page.waitForTimeout(800);
    const m = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth, iw: innerWidth,
      canvas: !!document.querySelector('#ocean-bg'), cards: document.querySelectorAll('#project-grid .project').length,
      // inline nav (desktop) must end before the CV button starts
      navOverlap: (() => {
        const nav = document.querySelector('.subsea-nav'), cta = document.querySelector('.subsea-header-cta');
        if (!nav || !cta || getComputedStyle(nav).display === 'none' || getComputedStyle(nav).position === 'absolute') return 0;
        return Math.max(0, Math.round(nav.getBoundingClientRect().right - cta.getBoundingClientRect().left));
      })(),
    }));
    const ok = m.sw <= m.iw && m.canvas && m.cards === 4 && m.navOverlap === 0 && errors.length === 0;
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${w}x${h} scrollWidth=${m.sw} innerWidth=${m.iw} canvas=${m.canvas} cards=${m.cards} navOverlap=${m.navOverlap} errors=${errors.join(' | ') || 0}`);
    await page.screenshot({ path: path.join(OUT, `top-${w}x${h}.png`) });
    await page.evaluate(() => scrollTo(0, document.getElementById('project-grid').getBoundingClientRect().top + scrollY - 70));
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT, `work-${w}x${h}.png`), animations: 'disabled' });
    await page.close();
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
