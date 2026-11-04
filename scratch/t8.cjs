const fs=require('fs');const f='docs/assets/portfolio.js';let c=fs.readFileSync(f,'utf8');
const b3=c.indexOf('// 3. HIGH-PERFORMANCE CANVAS');if(b3<0) throw new Error('b3');
const a=c.lastIndexOf('  // ====',b3);
const b4=c.indexOf('// 4. INTERACTIVE ABYSS TANK');if(b4<0) throw new Error('b4');
const b4banner=c.lastIndexOf('  // ====',b4);
if(!(a>0&&b4banner>a)) throw new Error('order');
c=c.slice(0,a)+c.slice(b4banner);
c=c.replace(/^ \* - 60 FPS Particle Canvas.*\n/m,'');
fs.writeFileSync(f,c);console.log('removed',b4banner-a);
