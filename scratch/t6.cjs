const fs=require('fs');const f='docs/assets/portfolio.css';let c=fs.readFileSync(f,'utf8');
const a=c.indexOf('\n.subsea-header-cta {');if(a<0) throw new Error('cta');
const e=c.indexOf('\n}\n',a)+3;
c=c.slice(0,e)+`.subsea-header-cta .cta-short { display: none; }
.subsea-navbar-main > * { min-width: 0; }
.subsea-header { max-width: 100vw; overflow-x: clip; }
`+c.slice(e);
c=c.replace(/\n*$/,'\n')+`
/* ==========================================================================
   MOBILE OVERFLOW FIX (spec section 1)
   ========================================================================== */
@media (max-width: 760px) {
  .subsea-navbar-main { padding: 8px 12px; gap: 8px; }
  .subsea-brand { min-width: 0; gap: 10px; flex: 1 1 auto; }
  .brand-role { display: none; }
  .subsea-header-cta { flex: 0 0 auto; gap: 6px; }
  .subsea-header-cta .cta-label { display: none; }
  .subsea-header-cta .cta-short { display: inline; }
  .btn-ocean-glow { padding: 8px 12px; font-size: 0.78rem; }
}
@media (max-width: 520px) {
  .brand-callsign { font-size: 1rem; }
  .brand-callsign span { display: none; }
}
`;
fs.writeFileSync(f,c);console.log('ok');
