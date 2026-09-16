'use strict';
/* =====================================================================
 * LUMEN :: Playable Ad
 * ---------------------------------------------------------------------
 * Design thesis: the boid rule-set IS the game verb.
 *   Beat 1  COHESION  - gather a scattered school with your light
 *   Beat 2  SEPARATION- thread the swarm through a hazard field
 *   Beat 3  ALIGNMENT - hold polarisation high while a hunter charges
 * ===================================================================== */

/* IIFE for the same reason as engine.js: avoid global lexical collisions. */
(function () {

const SwarmEngine = window.SwarmEngine;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t * t * (3 - 2 * t);

const Sprites = (() => {
  const images = {};
  const sources = window.SPRITE_SOURCES || {};
  Object.keys(sources).forEach(name => {
    const image = new Image();
    image.src = sources[name];
    images[name] = image;
  });
  return {
    draw(g, name, x, y, width, angle, alpha) {
      const image = images[name];
      if (!image || !image.complete || !image.naturalWidth) return false;
      const height = width * image.naturalHeight / image.naturalWidth;
      g.save();
      g.globalAlpha = alpha === undefined ? 1 : alpha;
      g.translate(x, y); g.rotate(angle);
      g.drawImage(image, -width * 0.5, -height * 0.5, width, height);
      g.restore();
      return true;
    },
    drawSideSprite(g, name, x, y, width, vx, vy, facing, alpha) {
      const image = images[name];
      if (!image || !image.complete || !image.naturalWidth) return false;
      const height = width * image.naturalHeight / image.naturalWidth;
      // Side-view PNG sprites face LEFT. Never rotate them through 90/180
      // degrees; keep a horizontal pose and add only a restrained pitch.
      const pitch = clamp(Math.atan2(-vy, Math.max(Math.abs(vx), 28)) * 0.20, -0.32, 0.32);
      g.save();
      g.globalAlpha = alpha === undefined ? 1 : alpha;
      g.translate(x, y);
      g.rotate(pitch);
      g.scale(facing === -1 ? -1 : 1, 1);
      g.drawImage(image, -width * 0.5, -height * 0.5, width, height);
      g.restore();
      return true;
    },
  };
})();

/* ---------------------------------------------------------------- audio */
/* One AudioContext, oscillator-per-shot, no assets => tiny build. */
const Sfx = (() => {
  let ac = null, master = null, muted = false;
  function ctx() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = 0.22;
      master.connect(ac.destination);
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function tone(freq, dur, type, vol) {
    if (muted) return;
    const c = ctx(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, c.currentTime);
    g.gain.setValueAtTime(0, c.currentTime);
    g.gain.linearRampToValueAtTime(vol === undefined ? 0.5 : vol, c.currentTime + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g); g.connect(master);
    o.start(); o.stop(c.currentTime + dur + 0.02);
  }
  return {
    unlock() { ctx(); },
    pickup(n) { tone(520 + (n % 12) * 42, 0.16, 'triangle', 0.34); },
    win() {[0,1,2,3].forEach(i => setTimeout(() => tone(440 * Math.pow(1.26, i), 0.4, 'triangle', 0.4), i * 105)); },
    hit() { tone(90, 0.28, 'sawtooth', 0.35); },
    swell() { tone(180, 0.7, 'sine', 0.22); },
  };
})();

/* ---------------------------------------------------------------- game */
class Game {
  constructor(root) {
    this.stage = root;
    this.cv = document.getElementById('cv');
    this.g = this.cv.getContext('2d');
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.el = {
      beat: document.getElementById('beat'),
      obj: document.getElementById('obj'),
      meterFill: document.getElementById('meterFill'),
      count: document.getElementById('count'),
      toast: document.getElementById('toast'),
      toastT: document.getElementById('toastT'),
      toastS: document.getElementById('toastS'),
      hand: document.getElementById('hand'),
      end: document.getElementById('end'),
      stats: document.getElementById('stats'),
      tech: document.getElementById('tech'),
      techBtn: document.getElementById('techBtn'),
    };

    this.W = 0; this.H = 0;
    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.sw = new SwarmEngine(900, this.W, this.H);

    this.world = {
      predators: [],
      obstacles: [],
      lure: { x: this.W / 2, y: this.H / 2, power: 0, active: false },
    };

    this.pointer = { x: this.W / 2, y: this.H / 2, down: false, everDown: false };
    this.fishFacing = new Float32Array(900);
    this.fishFacing.fill(1);
    this.bindInput();

    this.beat = 0;
    this.beatTime = 0;
    this.progress = 0;
    this.rescued = 0;
    this.target = 0;
    this.state = 'intro';
    this.time = 0;
    this.acc = 0;
    this.last = performance.now();
    this.shake = 0;
    this.flash = 0;
    this.showTech = false;
    this.fps = 60; this.fpsAcc = 0; this.fpsN = 0;
    this.particles = [];
    this.goals = [];
    this.best = { pol: 0, peak: 0 };

    this.bindTech();
    this.startBeat(0);
    requestAnimationFrame(t => this.loop(t));
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.W = w; this.H = h;
    this.cv.width = Math.floor(w * this.dpr);
    this.cv.height = Math.floor(h * this.dpr);
    this.g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this.sw) this.sw.resize(w, h);
  }

  /* ------------------------------------------------------------ input */
  bindInput() {
    const pos = e => {
      const t = e.touches ? e.touches[0] : e;
      const r = this.cv.getBoundingClientRect();
      return { x: t.clientX - r.left, y: t.clientY - r.top };
    };
    const down = e => {
      e.preventDefault();
      Sfx.unlock();
      const p = pos(e);
      this.pointer.x = p.x; this.pointer.y = p.y;
      this.pointer.down = true; this.pointer.everDown = true;
      this.el.hand.classList.remove('on');
      if (this.state === 'intro') this.state = 'play';
    };
    const move = e => {
      e.preventDefault();
      const p = pos(e);
      this.pointer.x = p.x; this.pointer.y = p.y;
    };
    const up = e => { e.preventDefault(); this.pointer.down = false; };

    this.cv.addEventListener('mousedown', down);
    this.cv.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    this.cv.addEventListener('touchstart', down, { passive: false });
    this.cv.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up, { passive: false });
  }

  bindTech() {
    this.el.techBtn.addEventListener('click', () => {
      this.showTech = !this.showTech;
      this.el.tech.classList.toggle('on', this.showTech);
      this.el.techBtn.classList.toggle('on', this.showTech);
    });
    document.querySelectorAll('#tech input[data-p]').forEach(inp => {
      const key = inp.dataset.p;
      inp.value = this.sw.p[key];
      inp.parentElement.querySelector('i').textContent = (+inp.value).toFixed(2);
      inp.addEventListener('input', () => {
        this.sw.p[key] = parseFloat(inp.value);
        inp.parentElement.querySelector('i').textContent = (+inp.value).toFixed(2);
      });
    });
    document.getElementById('replay').addEventListener('click', () => location.reload());
    document.getElementById('cta').addEventListener('click', () => {
      window.open('https://example.com/lumen', '_blank');
    });
  }

  /* ------------------------------------------------------------ beats */
  startBeat(n) {
    this.beat = n;
    this.beatTime = 0;
    this.progress = 0;
    this.world.predators.length = 0;
    this.world.obstacles.length = 0;
    this.goals.length = 0;
    this.sw.n = 0;
    const P = this.sw.p;

    if (n === 0) {
      /* ---- COHESION -------------------------------------------- */
      this.el.beat.textContent = 'RULE 01 — COHESION';
      this.el.obj.textContent = 'Gather the lost school';
      this.target = 60;
      this.rescued = 0;
      P.wCoh = 0.95; P.wAli = 1.05; P.wSep = 2.10;
      // scatter small isolated pods around the edges
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * TAU + 0.4;
        const cx = this.W / 2 + Math.cos(a) * this.W * 0.40;
        const cy = this.H / 2 + Math.sin(a) * this.H * 0.36;
        for (let i = 0; i < 9; i++) {
          this.sw.spawn(cx + (Math.random() - 0.5) * 60, cy + (Math.random() - 0.5) * 60);
        }
      }
      this.sanctuary = { x: this.W / 2, y: this.H / 2, r: 82 };
      this.toast('COHESION', 'Hold to shine. They steer toward the centre of mass.');
      this.hintAt(this.W * 0.5, this.H * 0.72);

    } else if (n === 1) {
      /* ---- SEPARATION ------------------------------------------ */
      this.el.beat.textContent = 'RULE 02 — SEPARATION';
      this.el.obj.textContent = 'Thread the reef — keep them apart';
      this.target = 1;
      P.wSep = 3.2;
      const cx = this.W * 0.16, cy = this.H * 0.5;
      for (let i = 0; i < 80; i++) {
        this.sw.spawn(cx + (Math.random() - 0.5) * 110, cy + (Math.random() - 0.5) * 150);
      }
      const rows = 5;
      for (let r = 0; r < rows; r++) {
        const gx = this.W * (0.34 + r * 0.125);
        const gap = this.H * (0.30 + Math.sin(r * 1.7) * 0.16);
        for (let s = 0; s < 2; s++) {
          const gy = s === 0 ? gap - this.H * 0.30 : gap + this.H * 0.30;
          this.world.obstacles.push({
            x: gx, y: clamp(gy, 40, this.H - 40),
            r: 44 + (r % 2) * 16, spin: r * 0.6,
          });
        }
      }
      this.gate = { x: this.W * 0.90, y: this.H * 0.5, r: 96 };
      this.toast('SEPARATION', 'Inverse-square crowding keeps them off the rocks.');
      this.hintAt(this.W * 0.30, this.H * 0.5);

    } else {
      /* ---- ALIGNMENT ------------------------------------------- */
      this.el.beat.textContent = 'RULE 03 — ALIGNMENT';
      this.el.obj.textContent = 'Stay polarised — outrun the hunter';
      this.target = 1;
      P.wAli = 1.9;
      for (let i = 0; i < 130; i++) {
        this.sw.spawn(this.W * 0.5 + (Math.random() - 0.5) * 240,
                      this.H * 0.5 + (Math.random() - 0.5) * 200);
      }
      this.world.predators.push({
        x: -140, y: this.H * 0.5, vx: 0, vy: 0,
        active: true, scare: 1.5, t: 0,
      });
      this.holdTime = 0;
      this.toast('ALIGNMENT', 'Match your neighbours. Order φ is your shield.');
      this.hintAt(this.W * 0.62, this.H * 0.42);
    }
  }

  toast(t, s) {
    this.el.toastT.textContent = t;
    this.el.toastS.textContent = s;
    this.el.toast.classList.add('on');
    clearTimeout(this._tt);
    this._tt = setTimeout(() => this.el.toast.classList.remove('on'), 2600);
    Sfx.swell();
  }

  hintAt(x, y) {
    if (this.pointer.everDown) return;
    this.el.hand.style.left = x + 'px';
    this.el.hand.style.top = y + 'px';
    this.el.hand.classList.add('on');
  }

  /* ------------------------------------------------------------- loop */
  loop(now) {
    const raw = (now - this.last) / 1000;
    this.last = now;
    const dt = Math.min(raw, 0.05);
    this.time += dt;

    this.fpsAcc += raw; this.fpsN++;
    if (this.fpsAcc > 0.4) { this.fps = this.fpsN / this.fpsAcc; this.fpsAcc = 0; this.fpsN = 0; }

    // fixed timestep accumulator: sim stays stable regardless of refresh rate
    this.acc += dt;
    const H = 1 / 60;
    let guard = 0;
    while (this.acc >= H && guard++ < 5) {
      this.update(H);
      this.acc -= H;
    }
    this.render();
    requestAnimationFrame(t => this.loop(t));
  }

  update(dt) {
    this.beatTime += dt;
    const L = this.world.lure;
    L.x = lerp(L.x, this.pointer.x, 0.28);
    L.y = lerp(L.y, this.pointer.y, 0.28);
    const want = this.pointer.down ? 1 : 0.22;
    L.power = lerp(L.power, want, 0.12);
    L.active = L.power > 0.03;

    if (this.state === 'play' || this.state === 'intro') {
      this.sw.step(dt, this.world);
      this.beatLogic(dt);
    } else {
      this.sw.step(dt, this.world);
    }

    this.shake = Math.max(0, this.shake - dt * 3.2);
    this.flash = Math.max(0, this.flash - dt * 2.4);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.t += dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.94; p.vy *= 0.94;
      if (p.t > p.life) this.particles.splice(i, 1);
    }

    const pol = this.sw.polarisation();
    if (pol > this.best.pol) this.best.pol = pol;
    if (this.sw.n > this.best.peak) this.best.peak = this.sw.n;

    this.el.meterFill.style.width = (this.progress * 100).toFixed(1) + '%';
  }

  burst(x, y, n, hue) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, s = 40 + Math.random() * 180;
      this.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        t: 0, life: 0.5 + Math.random() * 0.5, hue: hue || 185,
      });
    }
  }

  beatLogic(dt) {
    const sw = this.sw;

    if (this.beat === 0) {
      /* count agents inside the sanctuary ring */
      const S = this.sanctuary;
      let inside = 0;
      for (let i = 0; i < sw.n; i++) {
        const dx = sw.px[i] - S.x, dy = sw.py[i] - S.y;
        if (dx * dx + dy * dy < S.r * S.r) inside++;
      }
      if (inside > this.rescued) {
        if (inside - this.rescued >= 1) Sfx.pickup(inside);
        this.burst(S.x, S.y, 4, 165);
      }
      this.rescued = inside;
      this.el.count.textContent = inside + '/' + this.target;
      this.progress = clamp(inside / this.target, 0, 1);
      if (inside >= this.target) this.clearBeat();

    } else if (this.beat === 1) {
      for (const o of this.world.obstacles) o.spin += dt * 0.5;
      const G = this.gate;
      let through = 0;
      for (let i = 0; i < sw.n; i++) {
        if (sw.px[i] > G.x - G.r) through++;
      }
      /* penalty: agents crushed against rock geometry */
      for (let i = sw.n - 1; i >= 0; i--) {
        for (const o of this.world.obstacles) {
          const dx = sw.px[i] - o.x, dy = sw.py[i] - o.y;
          if (dx * dx + dy * dy < (o.r - 4) * (o.r - 4)) {
            this.burst(sw.px[i], sw.py[i], 5, 12);
            this.shake = Math.min(1, this.shake + 0.25);
            Sfx.hit();
            sw.removeAt(i);
            break;
          }
        }
      }
      this.el.count.textContent = through + '/' + Math.max(1, Math.round(sw.n * 0.55));
      this.progress = clamp(through / Math.max(1, sw.n * 0.55), 0, 1);
      if (this.progress >= 1 && sw.n > 12) this.clearBeat();

    } else {
      const P = this.world.predators[0];
      P.t += dt;
      const c = sw.centroid({ x: 0, y: 0 });
      const dx = c.x - P.x, dy = c.y - P.y;
      const d = Math.hypot(dx, dy) || 1;
      const chase = 118 + Math.min(P.t * 9, 70);
      P.vx = lerp(P.vx, (dx / d) * chase, 0.03);
      P.vy = lerp(P.vy, (dy / d) * chase, 0.03);
      P.x += P.vx * dt; P.y += P.vy * dt;

      const pol = sw.polarisation();
      if (pol > 0.72) this.holdTime += dt;
      else this.holdTime = Math.max(0, this.holdTime - dt * 0.7);

      /* predator eats stragglers */
      for (let i = sw.n - 1; i >= 0; i--) {
        const ex = sw.px[i] - P.x, ey = sw.py[i] - P.y;
        if (ex * ex + ey * ey < 26 * 26) {
          this.burst(sw.px[i], sw.py[i], 6, 8);
          this.shake = Math.min(1, this.shake + 0.3);
          Sfx.hit();
          sw.removeAt(i);
        }
      }
      this.el.count.textContent = 'φ ' + pol.toFixed(2);
      this.progress = clamp(this.holdTime / 7, 0, 1);
      if (this.progress >= 1) this.clearBeat();
      if (sw.n < 25) this.clearBeat();
    }
  }

  clearBeat() {
    this.flash = 1;
    Sfx.win();
    this.burst(this.W / 2, this.H / 2, 40, 170);
    if (this.beat < 2) {
      const nx = this.beat + 1;
      this.state = 'wait';
      setTimeout(() => { this.startBeat(nx); this.state = 'play'; }, 900);
    } else {
      this.state = 'end';
      const s = this.sw.stat;
      this.el.stats.innerHTML =
        'PEAK AGENTS <b>' + this.best.peak + '</b> &nbsp;·&nbsp; BEST ORDER φ <b>' +
        this.best.pol.toFixed(2) + '</b><br>' +
        'NEIGHBOUR TESTS/FRAME <b>' + s.neighbourTests.toLocaleString() + '</b><br>' +
        'SIM <b>' + s.simMs.toFixed(2) + ' ms</b> &nbsp;·&nbsp; <b>' +
        this.fps.toFixed(0) + ' FPS</b>';
      setTimeout(() => this.el.end.classList.add('on'), 700);
    }
  }

  /* ----------------------------------------------------------- render */
  render() {
    const g = this.g, W = this.W, H = this.H, sw = this.sw;

    g.save();
    if (this.shake > 0.01) {
      const s = this.shake * 9;
      g.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    }

    /* ---- deep-water gradient ---- */
    const bg = g.createRadialGradient(W * 0.5, H * 0.42, 20, W * 0.5, H * 0.5, Math.max(W, H) * 0.8);
    bg.addColorStop(0, '#0a2144');
    bg.addColorStop(0.55, '#051229');
    bg.addColorStop(1, '#02060f');
    g.fillStyle = bg;
    g.fillRect(-30, -30, W + 60, H + 60);

    /* ---- caustic light shafts ---- */
    g.globalAlpha = 0.05;
    g.fillStyle = '#7fd8ff';
    for (let i = 0; i < 6; i++) {
      const x = ((i * 0.19 + this.time * 0.012) % 1.2 - 0.1) * W;
      g.beginPath();
      g.moveTo(x, -20); g.lineTo(x + 70, -20);
      g.lineTo(x + 190, H + 20); g.lineTo(x + 40, H + 20);
      g.closePath(); g.fill();
    }
    g.globalAlpha = 1;

    if (this.beat === 0) this.drawSanctuary(g);
    if (this.beat === 1) { this.drawGate(g); this.drawObstacles(g); }

    this.drawLure(g);
    this.drawSwarm(g);
    if (this.beat === 2) this.drawPredator(g);
    this.drawParticles(g);
    if (this.showTech) this.drawDebugVectors(g);

    if (this.flash > 0.01) {
      g.globalAlpha = this.flash * 0.35;
      g.fillStyle = '#bff4ff';
      g.fillRect(-30, -30, W + 60, H + 60);
      g.globalAlpha = 1;
    }
    g.restore();

    if (this.showTech) this.updateTechPanel();
  }

  drawSanctuary(g) {
    const S = this.sanctuary;
    const pulse = 1 + Math.sin(this.time * 2) * 0.04;
    const gr = g.createRadialGradient(S.x, S.y, 4, S.x, S.y, S.r * pulse);
    gr.addColorStop(0, 'rgba(90,255,210,0.20)');
    gr.addColorStop(0.7, 'rgba(60,210,190,0.07)');
    gr.addColorStop(1, 'rgba(60,210,190,0)');
    g.fillStyle = gr;
    g.beginPath(); g.arc(S.x, S.y, S.r * pulse, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(120,255,220,0.45)';
    g.lineWidth = 1.5; g.setLineDash([6, 9]);
    g.lineDashOffset = -this.time * 22;
    g.beginPath(); g.arc(S.x, S.y, S.r, 0, TAU); g.stroke();
    g.setLineDash([]);
  }

  drawGate(g) {
    const G = this.gate;
    const gr = g.createRadialGradient(G.x, G.y, 6, G.x, G.y, G.r);
    gr.addColorStop(0, 'rgba(120,255,190,0.22)');
    gr.addColorStop(1, 'rgba(120,255,190,0)');
    g.fillStyle = gr;
    g.beginPath(); g.arc(G.x, G.y, G.r, 0, TAU); g.fill();
  }

  drawObstacles(g) {
    for (const o of this.world.obstacles) {
      if (Sprites.draw(g, 'reef', o.x, o.y, o.r * 2.1, o.spin, 0.88)) continue;
      g.save();
      g.translate(o.x, o.y); g.rotate(o.spin);
      const gr = g.createRadialGradient(0, -o.r * 0.3, 4, 0, 0, o.r);
      gr.addColorStop(0, '#2a4468');
      gr.addColorStop(1, '#0c1a2e');
      g.fillStyle = gr;
      g.beginPath();
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * TAU;
        const rr = o.r * (0.86 + ((k * 37) % 11) / 46);
        const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
        k ? g.lineTo(px, py) : g.moveTo(px, py);
      }
      g.closePath(); g.fill();
      g.strokeStyle = 'rgba(130,200,255,0.22)';
      g.lineWidth = 1.2; g.stroke();
      g.restore();
    }
  }

  drawLure(g) {
    const L = this.world.lure;
    if (L.power < 0.03) return;
    const R = this.sw.p.rLure * L.power;
    const gr = g.createRadialGradient(L.x, L.y, 2, L.x, L.y, R);
    gr.addColorStop(0, 'rgba(200,250,255,' + (0.5 * L.power).toFixed(3) + ')');
    gr.addColorStop(0.25, 'rgba(90,215,255,' + (0.16 * L.power).toFixed(3) + ')');
    gr.addColorStop(1, 'rgba(60,180,255,0)');
    g.fillStyle = gr;
    g.beginPath(); g.arc(L.x, L.y, R, 0, TAU); g.fill();

    g.strokeStyle = 'rgba(190,245,255,' + (0.30 * L.power).toFixed(3) + ')';
    g.lineWidth = 1;
    g.beginPath();
    g.arc(L.x, L.y, 16 + Math.sin(this.time * 4) * 3, 0, TAU);
    g.stroke();
  }

  drawSwarm(g) {
    const sw = this.sw, n = sw.n;
    g.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const x = sw.px[i], y = sw.py[i];
      const st = sw.stress[i];
      const vx = sw.vx[i], vy = sw.vy[i];
      const sp = Math.hypot(vx, vy) || 1;
      const dx = vx / sp, dy = vy / sp;

      // hue shifts from calm cyan to alarmed amber with stress
      const hue = lerp(188, 32, st);
      const lit = lerp(62, 74, st);

      // motion trail
      g.strokeStyle = 'hsla(' + hue + ',95%,' + lit + '%,0.30)';
      g.lineWidth = 2.1;
      g.beginPath();
      g.moveTo(sw.tx[i], sw.ty[i]);
      g.lineTo(x, y);
      g.stroke();

      if (vx > 10) this.fishFacing[i] = -1;
      else if (vx < -10) this.fishFacing[i] = 1;
      if (!Sprites.drawSideSprite(g, 'school', x, y, 26, vx, vy, this.fishFacing[i] === -1 ? -1 : 1, 0.95)) {
        const wig = Math.sin(sw.phase[i]) * 3.1;
        const nx = -dy, ny = dx;
        g.fillStyle = 'hsla(' + hue + ',96%,' + lit + '%,0.95)';
        g.beginPath();
        g.moveTo(x + dx * 7.5, y + dy * 7.5);
        g.lineTo(x + nx * 3.0 - dx * 3.5, y + ny * 3.0 - dy * 3.5);
        g.lineTo(x - dx * 6 + nx * wig, y - dy * 6 + ny * wig);
        g.lineTo(x - nx * 3.0 - dx * 3.5, y - ny * 3.0 - dy * 3.5);
        g.closePath(); g.fill();
      }
    }

    // bloom pass: cheap additive glow over the densest region
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.14;
    for (let i = 0; i < n; i += 3) {
      const hue = lerp(188, 32, sw.stress[i]);
      g.fillStyle = 'hsl(' + hue + ',100%,60%)';
      g.beginPath(); g.arc(sw.px[i], sw.py[i], 7, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }

  drawPredator(g) {
    const P = this.world.predators[0];
    if (!P) return;
    const speed = Math.hypot(P.vx, P.vy) || 1;
    const dx = P.vx / speed;
    if (P.facing === undefined) P.facing = 1;
    if (dx > 0.14) P.facing = -1;
    else if (dx < -0.14) P.facing = 1;
    g.save();
    g.translate(P.x, P.y);

    const gr = g.createRadialGradient(0, 0, 4, 0, 0, 90);
    gr.addColorStop(0, 'rgba(255,80,60,0.24)');
    gr.addColorStop(1, 'rgba(255,60,40,0)');
    g.fillStyle = gr;
    g.beginPath(); g.arc(0, 0, 90, 0, TAU); g.fill();

    if (!Sprites.drawSideSprite(g, 'predator', 0, 0, 86, P.vx, P.vy, P.facing === -1 ? -1 : 1, 1)) {
      g.fillStyle = '#16212f';
      g.beginPath();
      g.moveTo(34, 0); g.lineTo(2, 13); g.lineTo(-26, 6);
      g.lineTo(-34, 17); g.lineTo(-20, 0); g.lineTo(-34, -17);
      g.lineTo(-26, -6); g.lineTo(2, -13);
      g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,120,90,0.65)';
      g.lineWidth = 1.4; g.stroke();
      g.fillStyle = '#ff6a4a';
      g.beginPath(); g.arc(14, -4, 2.6, 0, TAU); g.fill();
    }
    g.restore();
  }

  drawParticles(g) {
    g.globalCompositeOperation = 'lighter';
    for (const p of this.particles) {
      const a = 1 - p.t / p.life;
      g.fillStyle = 'hsla(' + p.hue + ',100%,65%,' + (a * 0.75).toFixed(3) + ')';
      g.beginPath(); g.arc(p.x, p.y, 2.4 * a + 0.6, 0, TAU); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
  }

  /* Draws the three steering vectors for one tracked agent.
   * This is the single most persuasive thing in the whole build:
   * it proves the simulation is real, not a canned animation. */
  drawDebugVectors(g) {
    const sw = this.sw;
    const i = sw.debugIndex;
    if (i >= sw.n) return;
    const x = sw.px[i], y = sw.py[i], d = sw.dbg;
    const K = 0.34;

    g.save();
    g.lineWidth = 2;
    const arrow = (vx, vy, col) => {
      const m = Math.hypot(vx, vy);
      if (m < 1) return;
      const ex = x + vx * K, ey = y + vy * K;
      g.strokeStyle = col;
      g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.stroke();
      const a = Math.atan2(vy, vx);
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(ex, ey);
      g.lineTo(ex - Math.cos(a - 0.4) * 7, ey - Math.sin(a - 0.4) * 7);
      g.lineTo(ex - Math.cos(a + 0.4) * 7, ey - Math.sin(a + 0.4) * 7);
      g.closePath(); g.fill();
    };
    arrow(d.sx, d.sy, '#ff5d7a');   // separation
    arrow(d.ax, d.ay, '#7dff9b');   // alignment
    arrow(d.cx, d.cy, '#69c7ff');   // cohesion

    g.setLineDash([3, 5]);
    g.lineWidth = 1;
    g.strokeStyle = 'rgba(255,93,122,0.5)';
    g.beginPath(); g.arc(x, y, sw.p.rSep, 0, TAU); g.stroke();
    g.strokeStyle = 'rgba(105,199,255,0.4)';
    g.beginPath(); g.arc(x, y, sw.p.rCoh, 0, TAU); g.stroke();
    g.setLineDash([]);
    g.restore();
  }

  updateTechPanel() {
    const s = this.sw.stat, sw = this.sw;
    const naive = sw.n * sw.n;
    const saved = naive > 0 ? (1 - s.neighbourTests / naive) * 100 : 0;
    document.getElementById('tAgents').textContent = sw.n;
    document.getElementById('tFps').textContent = this.fps.toFixed(0);
    document.getElementById('tSim').textContent = s.simMs.toFixed(2) + ' ms';
    document.getElementById('tGrid').textContent = s.gridMs.toFixed(2) + ' ms';
    document.getElementById('tTests').textContent = s.neighbourTests.toLocaleString();
    document.getElementById('tNaive').textContent =
      naive.toLocaleString() + '  (−' + saved.toFixed(1) + '%)';
    document.getElementById('tCells').textContent =
      s.occupied + ' / ' + (sw.cols * sw.rows);
    document.getElementById('tPol').textContent = sw.polarisation().toFixed(3);
    document.getElementById('tNb').textContent = sw.dbg.count;
  }
}

window.addEventListener('load', () => { window.GAME = new Game(document.getElementById('stage')); });

})();
