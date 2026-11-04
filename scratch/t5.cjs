const fs=require('fs');const f='docs/assets/portfolio.css';let c=fs.readFileSync(f,'utf8');
const r3=(n)=>+n.toFixed(3);
c=c.replace(/rgba\(\s*0,\s*229,\s*255,\s*([\d.]+)\s*\)/g,(m,a)=>'rgba(124, 196, 214, '+r3(parseFloat(a)*0.7)+')');
c=c.replace(/rgba\(\s*0,\s*255,\s*163,\s*([\d.]+)\s*\)/g,(m,a)=>'rgba(159, 211, 180, '+r3(parseFloat(a)*0.7)+')');
c=c.replace(/rgba\(\s*255,\s*92,\s*138,\s*([\d.]+)\s*\)/g,(m,a)=>'rgba(224, 138, 154, '+r3(parseFloat(a)*0.7)+')');
c=c.replace(/rgba\(\s*255,\s*209,\s*102,\s*([\d.]+)\s*\)/g,(m,a)=>'rgba(227, 194, 122, '+r3(parseFloat(a)*0.7)+')');
c=c.replace(/rgba\(\s*(?:26,\s*140|0,\s*136),\s*255,\s*([\d.]+)\s*\)/g,(m,a)=>'rgba(91, 159, 208, '+r3(parseFloat(a)*0.7)+')');
c=c.replace(/rgba\(\s*138,\s*63,\s*252,\s*([\d.]+)\s*\)/g,(m,a)=>'rgba(154, 139, 208, '+r3(parseFloat(a)*0.7)+')');
c=c.replace(/^[ \t]*text-shadow:[^;\n]*;[ \t]*\r?\n/gm,'');
c=c.split('\n').map(l=>{
  if(/box-shadow:/.test(l)&&/0 0 \d+px/.test(l)){
    l=l.replace(/rgba\((124, 196, 214|159, 211, 180|224, 138, 154|227, 194, 122|91, 159, 208|154, 139, 208),\s*([\d.]+)\)/g,(m,rgb,a)=>'rgba('+rgb+', '+Math.min(parseFloat(a),0.12)+')');
    l=l.replace(/0 0 (\d+px) var\(--(cyan-glow|seafoam-neon|gold-accent|coral-accent)\)/g,(m,px)=>'0 0 '+px+' rgba(124, 196, 214, 0.12)');
  }return l;}).join('\n');
c=c.replace(/#ffffff/gi,'var(--text-pure)').replace(/#fff(?![0-9a-f])/gi,'var(--text-pure)').replace(/#00e5ff/gi,'var(--cyan-glow)').replace(/#00ffa3/gi,'var(--seafoam-neon)');
fs.writeFileSync(f,c);console.log('ok');
