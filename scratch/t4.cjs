const fs=require('fs');const f='docs/assets/portfolio.css';let c=fs.readFileSync(f,'utf8');
const a=c.indexOf(':root {');const e=c.indexOf('\n}\n',a)+3;
if(a<0||e<a) throw new Error('root');
const root=`:root {
  /* Ocean Deep Color Palette (low-glare, WCAG AA) */
  --ocean-abyss:        #0b1620;
  --ocean-deep:         #0f1d29;
  --ocean-mid:          #142636;
  --ocean-marine:       #1b3347;
  --ocean-surface:      #234559;

  /* Accents (muted) */
  --cyan-glow:          #7cc4d6;
  --cyan-dim:           rgba(124, 196, 214, 0.10);
  --cyan-subtle:        rgba(124, 196, 214, 0.06);
  --cyan-border:        rgba(124, 196, 214, 0.20);
  --seafoam-neon:       #9fd3b4;
  --seafoam-dim:        rgba(159, 211, 180, 0.10);
  --electric-azure:     #5b9fd0;
  --deep-purple-glow:   #9a8bd0;
  --coral-accent:       #e08a9a;
  --gold-accent:        #e3c27a;

  /* Text */
  --text-pure:          #e8eef2;
  --text-bright:        #dde6ec;
  --text-lum:           #c5d2db;
  --text-muted:         #93a6b4;
  --text-dim:           #6f8494; /* decoration only, never body text */

  /* Glassmorphism Surface Tokens */
  --glass-bg:           rgba(15, 29, 41, 0.78);
  --glass-bg-hover:     rgba(20, 38, 54, 0.86);
  --glass-card:         rgba(15, 29, 41, 0.78);
  --glass-border:       1px solid rgba(124, 196, 214, 0.15);
  --glass-border-hover: 1px solid rgba(124, 196, 214, 0.38);
  --glass-inner-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.05), inset 0 -1px 1px rgba(0, 0, 0, 0.35);
  --panel-shadow:       0 16px 40px -10px rgba(0, 6, 16, 0.6), 0 0 25px rgba(124, 196, 214, 0.04);
  --panel-shadow-hover: 0 22px 50px -8px rgba(0, 6, 16, 0.75), 0 0 35px rgba(124, 196, 214, 0.10);

  /* Radii & Transitions */
  --radius-xs:  4px;
  --radius-sm:  8px;
  --radius-md:  14px;
  --radius-lg:  20px;
  --radius-xl:  28px;
  --radius-full: 9999px;

  --transition-fast: 0.18s cubic-bezier(0.2, 0, 0, 1);
  --transition-med:  0.32s cubic-bezier(0.16, 1, 0.3, 1);
  --transition-slow: 0.6s cubic-bezier(0.16, 1, 0.3, 1);

  /* System fonts only (no Google Fonts request) */
  --font-main:  system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-hud:   system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-mono:  ui-monospace, "Cascadia Code", Consolas, monospace;
}
`;
c=c.slice(0,a)+root+c.slice(e);
fs.writeFileSync(f,c);console.log('ok');
