'use strict';
/* =====================================================================
 * ABYSSAL DIVE
 * ---------------------------------------------------------------------
 * One lamp. Two jobs. You cannot do both at once.
 *
 *   - shine on the school   -> they follow the light
 *   - shine on the hunter   -> it is dazzled and slows, then a cooldown
 *
 * The school can always be saved in full. Doing so requires shepherding
 * in waves and spending the dazzle at the right moment, not spamming it.
 * ===================================================================== */
(function () {

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;

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

/* ------------------------------------------------------------- tuning */
/* The lamp holds five charges. Spending one is cheap; running dry is the
 * expensive part, because the recharge only starts once the last charge
 * is gone. That shape rewards rhythm over panic-tapping. */
const LAMP_CHARGES     = 5;
const LAMP_REFILL_TIME = 4.2;  // per charge, once the bank has emptied
const DAZZLE_DURATION  = 2.6;  // hunter stays slowed this long
const DAZZLE_AIM_TIME  = 0.4;  // lamp must stay on target this long
const DAZZLE_SLOW      = 0.26; // hunter speed multiplier while dazzled

/* Three stuns and it stops tolerating the light. */
const FRENZY_TRIGGER   = 3;
const FRENZY_DURATION  = 3.0;  // immune to the lamp, and quick
const FRENZY_SPEED     = 1.55;
const EXHAUST_DURATION = 3.0;  // the opening this buys you
const EXHAUST_SPEED    = 0.5;

/* ------------------------------------------------------------- audio */
const Sfx = (() => {
  let ac = null, master = null;
  function ctx() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = 0.2;
      master.connect(ac.destination);
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function tone(freq, dur, type, vol) {
    const c = ctx(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, c.currentTime);
    g.gain.setValueAtTime(0, c.currentTime);
    g.gain.linearRampToValueAtTime(vol === undefined ? 0.4 : vol, c.currentTime + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g); g.connect(master);
    o.start(); o.stop(c.currentTime + dur + 0.02);
  }
  return {
    unlock() { ctx(); },
    saved(n) { tone(460 + (n % 10) * 36, 0.18, 'triangle', 0.3); },
    lost() { tone(78, 0.34, 'sawtooth', 0.3); },
    dazzle() { tone(880, 0.22, 'square', 0.16); setTimeout(() => tone(1240, 0.16, 'sine', 0.12), 70); },
    ready() { tone(680, 0.12, 'sine', 0.13); },
    frenzy() {
      tone(140, 0.5, 'sawtooth', 0.3);
      setTimeout(() => tone(104, 0.6, 'sawtooth', 0.26), 90);
    },
    win() { [0, 1, 2, 3, 4].forEach(i => setTimeout(() => tone(392 * Math.pow(1.2, i), 0.45, 'triangle', 0.34), i * 120)); },
  };
})();

/* -------------------------------------------------------------- game */
class AbyssalDive {
  constructor() {
    this.cv = document.getElementById('cv');
    this.g = this.cv.getContext('2d');
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.el = {
      saved: document.getElementById('saved'),
      lost: document.getElementById('lost'),
      swimming: document.getElementById('swimming'),
      dazzle: document.getElementById('dazzle'),
      dazzleFill: document.getElementById('dazzleFill'),
      seed: document.getElementById('seed'),
      pips: document.getElementById('pips'),
      end: document.getElementById('end'),
      endTitle: document.getElementById('endTitle'),
      endBody: document.getElementById('endBody'),
      endStats: document.getElementById('endStats'),
      hint: document.getElementById('hint'),
      pDepth: document.getElementById('pDepth'),
      pLayer: document.getElementById('pLayer'),
      pCommon: document.getElementById('pCommon'),
      pBarFill: document.getElementById('pBarFill'),
      pTemp: document.getElementById('pTemp'),
      pPress: document.getElementById('pPress'),
      pLight: document.getElementById('pLight'),
      pCover: document.getElementById('pCover'),
      pFauna: document.getElementById('pFauna'),
      pFacts: document.getElementById('pFacts'),
    };

    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.pointer = { x: this.W / 2, y: this.H / 2, down: false, used: false };
    this.fishFacing = new Float32Array(900);
    this.fishFacing.fill(1);
    this.bindInput();

    this.runIndex = 0;          // how many dives deep the player has gone
    this.seed = (Math.random() * 100000) | 0;
    this.start(this.seed);

    this.last = performance.now();
    this.acc = 0;
    requestAnimationFrame(t => this.loop(t));
  }

  resize() {
    this.W = window.innerWidth;
    this.H = window.innerHeight;
    this.cv.width = Math.floor(this.W * this.dpr);
    this.cv.height = Math.floor(this.H * this.dpr);
    this.g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this.ff) { this.ff.resize(this.W, this.H); this.rebuildField(); }
    if (this.sw) this.sw.resize(this.W, this.H);
  }

  start(seed) {
    this.seed = seed;
    /* Pin Math.random across setup so SAME SEED really does rebuild the
     * same reef AND the same starting school. The level generator is
     * seeded, but spawn() draws heading and tail phase from Math.random,
     * so without this the button only half worked. */
    const origRandom = Math.random;
    Math.random = mulberry32(seed ^ 0x5eed);

    this.depth = OCEAN.depthForRun(this.runIndex);
    this.level = makeLevel(seed, this.W, this.H, this.depth);
    this.lv = this.level;

    this.sw = new SwarmEngine(this.level.schoolSize + 8, this.W, this.H);
    for (const f of this.level.school) this.sw.spawn(f.x, f.y);

    Math.random = origRandom;

    const p = this.sw.p;
    p.rSep = 17; p.rAli = 40; p.rCoh = 50;
    p.wSep = 2.3; p.wAli = 1.15; p.wCoh = 0.9;
    p.wLure = 2.6; p.wAvoid = 5.6; p.wFlee = 4.8; p.wBounds = 3.4;
    p.minSpeed = 40; p.maxSpeed = 124; p.maxForce = 250;
    p.rFlee = 128; p.rLure = 190; p.margin = 40;
    /* Must stay well inside the refuge mouth: see applyFlow. */
    p.lureCore = 15;

    this.ff = new FlowField(this.W, this.H, 24);
    this.rebuildField();

    this.world = {
      predators: [this.level.hunter],
      obstacles: this.level.obstacles,
      lure: { x: this.W / 2, y: this.H / 2, power: 0, active: false },
    };

    this.saved = 0;
    this.lost = 0;
    this.time = 0;
    this.state = 'play';
    this.shake = 0;
    this.particles = [];
    this.dazzleAim = 0;
    this.charges = LAMP_CHARGES;
    this.refillT = 0;
    this.wasEmpty = false;
    this.el.seed.textContent = '#' + seed;
    this.el.end.classList.remove('on');
    this.updatePanel();
    if (!this.pointer.used) this.el.hint.classList.add('on');
  }

  /* The panel is rebuilt once per dive, not per frame: depth is constant
   * within a run, so there is nothing to animate and no reason to touch
   * the DOM sixty times a second. */
  updatePanel() {
    const r = OCEAN.readout(this.depth);
    const L = r.layer;
    const e = this.el;

    e.pDepth.innerHTML = this.depth.toLocaleString() + '<small>m</small>';
    e.pLayer.textContent = L.name;
    e.pLayer.style.color = L.tint;
    e.pCommon.textContent = L.common;
    e.pBarFill.style.width = Math.min(100, (this.depth / 11000) * 100).toFixed(1) + '%';

    e.pTemp.textContent = r.tempC.toFixed(1) + ' C';
    e.pPress.textContent = Math.round(r.pressureBar).toLocaleString() + ' bar';
    e.pLight.textContent = r.light;

    const soft = L.passable;
    const cover = L.solid.concat(soft);
    e.pCover.innerHTML = cover.map(function (k) {
      const isSoft = soft.indexOf(k) >= 0;
      const style = isSoft
        ? ' style="background:rgba(70,200,150,.13);border-color:rgba(70,200,150,.3)"'
        : '';
      return '<i' + style + '>' + (OCEAN.COVER_NAMES[k] || k) +
             (isSoft ? ' - passable' : '') + '</i>';
    }).join('');

    e.pFauna.innerHTML = L.fauna.map(function (f) {
      return '<i>' + f + '</i>';
    }).join('');

    e.pFacts.innerHTML = L.facts.map(function (f) {
      return '<div class="pFact"><b>' + f.tag + '</b><p>' + f.text + '</p></div>';
    }).join('');
  }

  rebuildField() {
    this.ff.rasterise(this.level.obstacles);
    this.ff.build(this.level.refuges);
  }

  bindInput() {
    const pos = e => {
      const t = e.touches ? e.touches[0] : e;
      const r = this.cv.getBoundingClientRect();
      return { x: t.clientX - r.left, y: t.clientY - r.top };
    };
    const down = e => {
      e.preventDefault(); Sfx.unlock();
      const p = pos(e);
      this.pointer.x = p.x; this.pointer.y = p.y;
      this.pointer.down = true; this.pointer.used = true;
      this.el.hint.classList.remove('on');
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

    document.getElementById('again').addEventListener('click', () => {
      // a completed dive earns the next rung of the ladder
      this.runIndex++;
      this.start((Math.random() * 100000) | 0);
    });
    document.getElementById('retry').addEventListener('click', () => {
      this.start(this.seed);
    });
  }

  loop(now) {
    const raw = (now - this.last) / 1000;
    this.last = now;
    this.acc += Math.min(raw, 0.05);
    let guard = 0;
    while (this.acc >= 1 / 60 && guard++ < 5) {
      this.update(1 / 60);
      this.acc -= 1 / 60;
    }
    this.render();
    requestAnimationFrame(t => this.loop(t));
  }

  update(dt) {
    this.time += dt;
    const L = this.world.lure;
    L.x = lerp(L.x, this.pointer.x, 0.3);
    L.y = lerp(L.y, this.pointer.y, 0.3);
    L.power = lerp(L.power, this.pointer.down ? 1 : 0.2, 0.12);
    L.active = L.power > 0.04;

    if (this.state === 'play') {
      this.updateDazzle(dt);
      this.updateHunter(dt);
    }

    this.sw.step(dt, this.world);
    if (this.state === 'play') this.applyFlow(dt);
    if (this.state === 'play') this.resolve(dt);

    this.shake = Math.max(0, this.shake - dt * 3.4);
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.94; p.vy *= 0.94;
      if (p.t > p.life) this.particles.splice(i, 1);
    }
    this.updateHud();
  }

  /* The lamp dazzles only if the player HOLDS it on target: a brush past
   * does nothing, because spending a charge must be a decision.
   *
   * Charges only begin refilling once the bank is completely empty. A
   * trickle-refill would let a player tap forever; an all-or-nothing
   * refill makes the fifth charge feel like a real commitment. */
  updateDazzle(dt) {
    const H = this.level.hunter;
    const L = this.world.lure;

    if (this.charges <= 0) {
      this.wasEmpty = true;
      this.refillT += dt;
      if (this.refillT >= LAMP_REFILL_TIME) {
        this.refillT = 0;
        this.charges = LAMP_CHARGES;
        Sfx.ready();
      }
    }

    const frenzied = this.time < H.frenzyUntil;
    const canSpend = this.charges > 0 && !frenzied && this.time >= H.slowUntil;
    const onTarget = L.active && L.power > 0.6 &&
      Math.hypot(L.x - H.x, L.y - H.y) < 76;

    if (onTarget && canSpend) {
      this.dazzleAim += dt;
      if (this.dazzleAim >= DAZZLE_AIM_TIME) {
        this.charges--;
        this.dazzleAim = 0;
        H.slowUntil = this.time + DAZZLE_DURATION;
        H.stunFlash = 1;
        H.stunCount++;
        Sfx.dazzle();
        this.burst(H.x, H.y, 18, 190);

        /* Third stun: it stops flinching and comes for the school. The
         * lamp is useless for three seconds - then it pays for the
         * sprint and you get a wide opening. */
        if (H.stunCount >= FRENZY_TRIGGER) {
          H.stunCount = 0;
          H.slowUntil = 0;
          H.frenzyUntil = this.time + FRENZY_DURATION;
          H.exhaustUntil = H.frenzyUntil + EXHAUST_DURATION;
          Sfx.frenzy();
          this.shake = 1;
          this.burst(H.x, H.y, 26, 6);
        }
      }
    } else {
      this.dazzleAim = Math.max(0, this.dazzleAim - dt * 1.6);
    }
  }

  updateHunter(dt) {
    const H = this.level.hunter;
    H.t += dt;
    H.stunFlash = Math.max(0, H.stunFlash - dt * 2);

    // hunt the densest cluster rather than the global centroid, so the
    // player cannot trivially bait it with one stray fish
    let tx = 0, ty = 0, best = -1;
    const sw = this.sw;
    for (let i = 0; i < sw.n; i++) {
      let c = 0;
      for (let j = 0; j < sw.n; j += 3) {
        const d = Math.hypot(sw.px[j] - sw.px[i], sw.py[j] - sw.py[i]);
        if (d < 110) c++;
      }
      if (c > best) { best = c; tx = sw.px[i]; ty = sw.py[i]; }
    }
    if (best < 0) { tx = this.W / 2; ty = this.H / 2; }

    /* The hunter ramps up, but its ceiling sits just under the school's
     * top speed. A hunter that simply outruns the flock turns every run
     * into attrition and makes the dazzle irrelevant - which is exactly
     * what the bot harness measured before this was capped. */
    const dazzled = this.time < H.slowUntil;
    const base = 92 + Math.min(H.t * 3.2, 26);
    const speed = base * (dazzled ? DAZZLE_SLOW : 1);

    const dx = tx - H.x, dy = ty - H.y;
    const d = Math.hypot(dx, dy) || 1;
    H.vx = lerp(H.vx, (dx / d) * speed, dazzled ? 0.02 : 0.045);
    H.vy = lerp(H.vy, (dy / d) * speed, dazzled ? 0.02 : 0.045);

    // the hunter is big and does not squeeze through gaps - kelp included,
    // which is exactly what turns a weed bed into a hiding place
    for (const o of this.level.obstacles) {
      const ox = H.x - o.x, oy = H.y - o.y;
      const od = Math.hypot(ox, oy);
      const R = o.r + (o.passable ? 20 : 34);
      if (od < R && od > 1e-4) {
        H.vx += (ox / od) * (1 - od / R) * 190;
        H.vy += (oy / od) * (1 - od / R) * 190;
      }
    }

    H.x += H.vx * dt;
    H.y += H.vy * dt;
    H.y = clamp(H.y, 30, this.H - 30);
    H.scare = dazzled ? 0.55 : 1;
  }

  /* The knowledge lives in the water. A fish reads only the cell it is
   * in, and only listens when it is frightened - which is exactly when a
   * real school tightens and runs for structure. */
  applyFlow(dt) {
    const sw = this.sw, ff = this.ff;
    const out = { x: 0, y: 0 };
    for (let i = 0; i < sw.n; i++) {
      ff.sample(sw.px[i], sw.py[i], out);
      if (!out.x && !out.y) continue;
      /* A calm fish drifts with the water a little; a frightened one runs
       * with it hard. Without the baseline the school only ever moves when
       * something is chasing it, which made shepherding impossible. */
      const w = (22 + sw.stress[i] * 120);
      sw.vx[i] += out.x * w * dt;
      sw.vy[i] += out.y * w * dt;
    }
  }

  resolve() {
    const sw = this.sw, H = this.level.hunter;

    for (let i = sw.n - 1; i >= 0; i--) {
      const x = sw.px[i], y = sw.py[i];

      // reached a crevice with room left
      let entered = false;
      for (const R of this.level.refuges) {
        if (R.closed) continue;
        if (Math.hypot(x - R.x, y - R.y) < R.r * 0.9) {
          R.held++;
          this.saved++;
          Sfx.saved(this.saved);
          this.burst(x, y, 5, 165);
          if (R.held >= R.capacity) {
            R.closed = true;
            this.rebuildField();     // the water re-routes to what is left
          }
          sw.removeAt(i);
          entered = true;
          break;
        }
      }
      if (entered) continue;

      // caught
      if (Math.hypot(x - H.x, y - H.y) < 25) {
        this.lost++;
        Sfx.lost();
        this.burst(x, y, 7, 8);
        this.shake = Math.min(1, this.shake + 0.3);
        sw.removeAt(i);
      }
    }

    if (sw.n === 0) this.finish();
  }

  finish() {
    this.state = 'end';
    const total = this.level.schoolSize;
    const pct = this.saved / total;
    let title, body;
    if (this.lost === 0) {
      title = 'EVERY ONE OF THEM';
      body = 'You read the water instead of fighting it.';
      Sfx.win();
    } else if (pct >= 0.9) {
      title = 'ALMOST ALL';
      body = 'A handful stayed behind so the rest could turn the corner.';
    } else if (pct >= 0.6) {
      title = 'MOST OF THEM';
      body = 'You chose, and the choice cost something.';
    } else if (pct > 0) {
      title = 'A FEW GOT THROUGH';
      body = 'The reef closed faster than the school could read it.';
    } else {
      title = 'NONE';
      body = 'The light was never in two places at once.';
    }
    this.el.endTitle.textContent = title;
    this.el.endBody.textContent = body;
    this.el.endStats.innerHTML =
      '<b>' + this.saved + '</b> saved &nbsp;·&nbsp; <b>' + this.lost + '</b> lost' +
      ' &nbsp;·&nbsp; seed <b>#' + this.seed + '</b>' +
      '<br>' + this.level.refuges.length + ' crevices &nbsp;·&nbsp; ' +
      this.time.toFixed(0) + 's';
    setTimeout(() => this.el.end.classList.add('on'), 600);
  }

  burst(x, y, n, hue) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, s = 40 + Math.random() * 170;
      this.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        t: 0, life: 0.5 + Math.random() * 0.5, hue,
      });
    }
  }

  updateHud() {
    this.el.saved.textContent = this.saved;
    this.el.lost.textContent = this.lost;
    this.el.swimming.textContent = this.sw.n;
    const H = this.level.hunter;

    // pip row: spent charges read as empty sockets
    let pips = '';
    for (let i = 0; i < LAMP_CHARGES; i++) {
      pips += '<i class="' + (i < this.charges ? 'f' : '') + '"></i>';
    }
    this.el.pips.innerHTML = pips;

    if (this.time < H.frenzyUntil) {
      this.el.dazzle.textContent = 'FRENZIED — LAMP USELESS';
      this.el.dazzle.className = 'rage';
      this.el.dazzleFill.style.width =
        ((H.frenzyUntil - this.time) / FRENZY_DURATION * 100).toFixed(0) + '%';
    } else if (this.time < H.exhaustUntil) {
      this.el.dazzle.textContent = 'IT IS SPENT — GO';
      this.el.dazzle.className = 'ready';
      this.el.dazzleFill.style.width =
        ((H.exhaustUntil - this.time) / EXHAUST_DURATION * 100).toFixed(0) + '%';
    } else if (this.time < H.slowUntil) {
      this.el.dazzle.textContent = 'DAZZLED — IT CANNOT FEED';
      this.el.dazzle.className = 'on';
      this.el.dazzleFill.style.width =
        ((H.slowUntil - this.time) / DAZZLE_DURATION * 100).toFixed(0) + '%';
    } else if (this.charges <= 0) {
      this.el.dazzle.textContent = 'LAMP DRY';
      this.el.dazzle.className = '';
      this.el.dazzleFill.style.width =
        (this.refillT / LAMP_REFILL_TIME * 100).toFixed(0) + '%';
    } else {
      this.el.dazzle.textContent = this.dazzleAim > 0 ? 'AIMING' : 'LAMP READY';
      this.el.dazzle.className = 'ready';
      this.el.dazzleFill.style.width =
        (this.dazzleAim / DAZZLE_AIM_TIME * 100).toFixed(0) + '%';
    }
  }

  /* ---------------------------------------------------------- render */
  render() {
    const g = this.g, W = this.W, H = this.H;
    g.save();
    if (this.shake > 0.01) {
      const s = this.shake * 8;
      g.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    }

    /* The water darkens with the layer, so the panel's light reading and
     * what the player sees are the same statement. */
    const tint = this.level.layer ? this.level.layer.tint : '#071d3a';
    const bg = g.createRadialGradient(W * 0.5, H * 0.4, 20, W * 0.5, H * 0.5, Math.max(W, H));
    bg.addColorStop(0, tint);
    bg.addColorStop(0.55, 'rgba(4,16,36,0.35)');
    bg.addColorStop(1, '#01040c');
    g.fillStyle = '#01040c';
    g.fillRect(-20, -20, W + 40, H + 40);
    g.globalAlpha = 0.55;
    g.fillStyle = bg;
    g.fillRect(-20, -20, W + 40, H + 40);
    g.globalAlpha = 1;

    this.drawRefuges(g);
    this.drawObstacles(g);
    this.drawLamp(g);
    this.drawSchool(g);
    this.drawHunter(g);
    this.drawParticles(g);
    g.restore();
  }

  drawRefuges(g) {
    for (const R of this.level.refuges) {
      R.pulse += 0.02;
      const full = R.closed;
      const glow = full ? 0.06 : 0.20;
      const col = full ? '120,140,160' : '110,255,200';
      const gr = g.createRadialGradient(R.x, R.y, 4, R.x, R.y, R.r * 1.5);
      gr.addColorStop(0, 'rgba(' + col + ',' + glow + ')');
      gr.addColorStop(1, 'rgba(' + col + ',0)');
      g.fillStyle = gr;
      g.beginPath(); g.arc(R.x, R.y, R.r * 1.5, 0, TAU); g.fill();

      g.strokeStyle = 'rgba(' + col + ',' + (full ? 0.25 : 0.5) + ')';
      g.lineWidth = 1.5;
      g.setLineDash(full ? [3, 6] : [7, 8]);
      g.lineDashOffset = -this.time * 18;
      g.beginPath(); g.arc(R.x, R.y, R.r, 0, TAU); g.stroke();
      g.setLineDash([]);

      g.fillStyle = 'rgba(' + col + ',' + (full ? 0.4 : 0.8) + ')';
      g.font = '600 11px ui-monospace,Menlo,Consolas,monospace';
      g.textAlign = 'center';
      g.fillText(full ? 'FULL' : R.held + '/' + R.capacity, R.x, R.y + 4);
      g.textAlign = 'left';
    }
  }

  drawObstacles(g) {
    // soft cover first, so solid geometry reads as being in front of it
    for (const o of this.level.obstacles) {
      if (o.passable) this.drawSoft(g, o);
    }
    for (const o of this.level.obstacles) {
      if (o.passable) continue;
      if (o.kind === 'coral' || o.kind === 'deepcoral') this.drawCoral(g, o);
      else if (o.kind === 'nodule') this.drawNodule(g, o);
      else this.drawRock(g, o);
    }
  }

  /* One routine for every passable cover type. They differ in silhouette
   * and colour only - mechanically they are identical, and that honesty
   * is the point: the player learns "soft means I can go there" once. */
  drawSoft(g, o) {
    if (o.kind === 'siphonophore') return this.drawSiphonophore(g, o);
    if (o.kind === 'glasssponge') return this.drawGlassSponge(g, o);
    if (o.kind === 'xenophyophore') return this.drawXeno(g, o);
    return this.drawKelp(g, o);
  }

  /* Manganese nodules: the abyssal plain is scattered with them. */
  drawNodule(g, o) {
    g.save();
    g.translate(o.x, o.y); g.rotate(o.spin);
    const gr = g.createRadialGradient(-o.r * 0.3, -o.r * 0.3, 2, 0, 0, o.r);
    gr.addColorStop(0, '#2a2b33');
    gr.addColorStop(1, '#0a0c14');
    g.fillStyle = gr;
    g.beginPath();
    for (let k = 0; k < 11; k++) {
      const a = (k / 11) * TAU;
      const rr = o.r * (0.9 + ((o.seedShape + k * 23) % 9) / 90);
      const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
      k ? g.lineTo(px, py) : g.moveTo(px, py);
    }
    g.closePath(); g.fill();
    g.strokeStyle = 'rgba(160,170,190,0.12)';
    g.lineWidth = 1; g.stroke();
    g.restore();
  }

  /* A siphonophore is a colony trailing a curtain of stinging threads -
   * some are among the longest animals on Earth. Small fish pass; a big
   * hunter would rather not. */
  drawSiphonophore(g, o) {
    const sway = Math.sin(this.time * 0.8 + (o.sway || 0)) * 0.3;
    g.save();
    g.translate(o.x, o.y);
    g.globalAlpha = 0.42;
    g.strokeStyle = 'rgba(150,210,255,0.5)';
    g.lineWidth = 1.1;
    const n = 5 + (o.seedShape % 4);
    for (let i = 0; i < n; i++) {
      const off = (i - n / 2) * (o.r * 0.3);
      const h = o.r * (1.7 + ((o.seedShape + i * 7) % 6) / 8);
      g.beginPath();
      g.moveTo(off, -o.r * 0.5);
      g.quadraticCurveTo(off + sway * h * 0.5, h * 0.4, off + sway * h, h);
      g.stroke();
    }
    g.fillStyle = 'rgba(180,230,255,0.5)';
    g.beginPath(); g.ellipse(0, -o.r * 0.55, o.r * 0.3, o.r * 0.44, 0, 0, TAU); g.fill();
    g.globalAlpha = 1;
    g.restore();
  }

  /* Glass sponges build silica lattices and can stand for centuries. */
  drawGlassSponge(g, o) {
    g.save();
    g.translate(o.x, o.y);
    g.globalAlpha = 0.38;
    g.strokeStyle = 'rgba(190,235,255,0.6)';
    g.lineWidth = 1;
    const n = 3 + (o.seedShape % 3);
    for (let i = 0; i < n; i++) {
      const off = (i - n / 2) * (o.r * 0.44);
      const h = o.r * (1.1 + ((o.seedShape + i * 11) % 5) / 7);
      g.beginPath();
      g.moveTo(off - o.r * 0.2, o.r * 0.5);
      g.lineTo(off - o.r * 0.1, -h);
      g.lineTo(off + o.r * 0.1, -h);
      g.lineTo(off + o.r * 0.2, o.r * 0.5);
      g.stroke();
      for (let k = 1; k < 4; k++) {
        const y = o.r * 0.5 - (o.r * 0.5 + h) * (k / 4);
        g.beginPath();
        g.moveTo(off - o.r * 0.17, y); g.lineTo(off + o.r * 0.17, y);
        g.stroke();
      }
    }
    g.globalAlpha = 1;
    g.restore();
  }

  /* Xenophyophores: single-celled organisms the size of a fist, carpeting
   * parts of the abyssal plain. */
  drawXeno(g, o) {
    g.save();
    g.translate(o.x, o.y);
    g.globalAlpha = 0.34;
    const gr = g.createRadialGradient(0, 0, 2, 0, 0, o.r);
    gr.addColorStop(0, 'rgba(180,170,140,0.5)');
    gr.addColorStop(1, 'rgba(90,85,70,0.05)');
    g.fillStyle = gr;
    const lobes = 4 + (o.seedShape % 4);
    for (let k = 0; k < lobes; k++) {
      const a = (k / lobes) * TAU + o.seedShape * 0.02;
      g.beginPath();
      g.ellipse(Math.cos(a) * o.r * 0.4, Math.sin(a) * o.r * 0.4,
                o.r * 0.48, o.r * 0.34, a, 0, TAU);
      g.fill();
    }
    g.globalAlpha = 1;
    g.restore();
  }

  drawRock(g, o) {
    g.save();
    g.translate(o.x, o.y); g.rotate(o.spin);
    const gr = g.createRadialGradient(0, -o.r * 0.3, 3, 0, 0, o.r);
    gr.addColorStop(0, '#1b3252');
    gr.addColorStop(1, '#071528');
    g.fillStyle = gr;
    g.beginPath();
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * TAU;
      const rr = o.r * (0.84 + ((o.seedShape + k * 37) % 13) / 52);
      const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
      k ? g.lineTo(px, py) : g.moveTo(px, py);
    }
    g.closePath(); g.fill();
    g.strokeStyle = 'rgba(120,190,255,0.14)';
    g.lineWidth = 1; g.stroke();
    g.restore();
  }

  /* Coral is solid like rock but reads warm, so the player can tell at a
   * glance which cover blocks them and which does not. */
  drawCoral(g, o) {
    g.save();
    g.translate(o.x, o.y); g.rotate(o.spin);
    const hue = o.hue || 330;
    const gr = g.createRadialGradient(0, -o.r * 0.25, 3, 0, 0, o.r);
    gr.addColorStop(0, 'hsl(' + hue + ',42%,30%)');
    gr.addColorStop(1, 'hsl(' + (hue - 16) + ',46%,13%)');
    g.fillStyle = gr;
    const lobes = 5 + (o.seedShape % 3);
    for (let k = 0; k < lobes; k++) {
      const a = (k / lobes) * TAU + o.seedShape * 0.01;
      const rr = o.r * 0.62;
      const cx = Math.cos(a) * o.r * 0.42;
      const cy = Math.sin(a) * o.r * 0.42;
      g.beginPath(); g.arc(cx, cy, rr, 0, TAU); g.fill();
    }
    g.globalAlpha = 0.5;
    g.strokeStyle = 'hsla(' + (hue + 14) + ',78%,62%,0.35)';
    g.lineWidth = 1;
    for (let k = 0; k < lobes; k++) {
      const a = (k / lobes) * TAU + o.seedShape * 0.01;
      g.beginPath();
      g.arc(Math.cos(a) * o.r * 0.42, Math.sin(a) * o.r * 0.42, o.r * 0.62, 0, TAU);
      g.stroke();
    }
    g.globalAlpha = 1;
    g.restore();
  }

  /* Kelp sways and never blocks a fish. It is drawn soft and translucent
   * precisely so it does not read as a wall. */
  drawKelp(g, o) {
    const sway = Math.sin(this.time * 1.1 + (o.sway || 0)) * 0.22;
    g.save();
    g.translate(o.x, o.y);
    g.globalAlpha = 0.5;
    const blades = 3 + (o.seedShape % 3);
    for (let b = 0; b < blades; b++) {
      const off = (b - blades / 2) * (o.r * 0.34);
      const lean = sway + (b - blades / 2) * 0.06;
      const h = o.r * (1.5 + ((o.seedShape + b * 13) % 7) / 10);
      const grd = g.createLinearGradient(off, 0, off + lean * h, -h);
      grd.addColorStop(0, 'rgba(26,92,74,0.85)');
      grd.addColorStop(1, 'rgba(52,170,124,0.10)');
      g.strokeStyle = grd;
      g.lineWidth = o.r * 0.26;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(off, o.r * 0.5);
      g.quadraticCurveTo(off + lean * h * 0.4, -h * 0.35, off + lean * h, -h);
      g.stroke();
    }
    g.globalAlpha = 1;
    g.restore();
  }

  drawLamp(g) {
    const L = this.world.lure;
    if (L.power < 0.04) return;
    const R = this.sw.p.rLure * L.power;
    const gr = g.createRadialGradient(L.x, L.y, 2, L.x, L.y, R);
    const ready = this.time >= this.dazzleReadyAt;
    const tint = ready ? '190,245,255' : '255,220,170';
    gr.addColorStop(0, 'rgba(' + tint + ',' + (0.42 * L.power).toFixed(3) + ')');
    gr.addColorStop(0.3, 'rgba(90,200,255,' + (0.12 * L.power).toFixed(3) + ')');
    gr.addColorStop(1, 'rgba(50,160,255,0)');
    g.fillStyle = gr;
    g.beginPath(); g.arc(L.x, L.y, R, 0, TAU); g.fill();

    if (this.dazzleAim > 0) {
      g.strokeStyle = 'rgba(255,255,255,0.75)';
      g.lineWidth = 2.5;
      g.beginPath();
      g.arc(L.x, L.y, 26, -Math.PI / 2,
            -Math.PI / 2 + TAU * (this.dazzleAim / DAZZLE_AIM_TIME));
      g.stroke();
    }
  }

  drawSchool(g) {
    const sw = this.sw;
    const schoolSprites = ['schoolA', 'schoolB', 'schoolC'];
    for (let i = 0; i < sw.n; i++) {
      const x = sw.px[i], y = sw.py[i];
      const st = sw.stress[i];
      const vx = sw.vx[i], vy = sw.vy[i];
      const sp = Math.hypot(vx, vy) || 1;
      const dx = vx / sp, dy = vy / sp;
      const nx = -dy, ny = dx;
      const hue = lerp(190, 36, st);

      g.strokeStyle = 'hsla(' + hue + ',95%,66%,0.26)';
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(sw.tx[i], sw.ty[i]); g.lineTo(x, y); g.stroke();

      if (vx > 10) this.fishFacing[i] = -1;
      else if (vx < -10) this.fishFacing[i] = 1;
      if (!Sprites.drawSideSprite(g, schoolSprites[i % schoolSprites.length], x, y,
                        25, vx, vy, this.fishFacing[i] === -1 ? -1 : 1, 0.96)) {
        const wig = Math.sin(sw.phase[i]) * 3;
        g.fillStyle = 'hsla(' + hue + ',96%,' + lerp(64, 72, st) + '%,0.96)';
        g.beginPath();
        g.moveTo(x + dx * 7, y + dy * 7);
        g.lineTo(x + nx * 2.9 - dx * 3.2, y + ny * 2.9 - dy * 3.2);
        g.lineTo(x - dx * 5.6 + nx * wig, y - dy * 5.6 + ny * wig);
        g.lineTo(x - nx * 2.9 - dx * 3.2, y - ny * 2.9 - dy * 3.2);
        g.closePath(); g.fill();
      }
    }
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.12;
    for (let i = 0; i < sw.n; i += 2) {
      g.fillStyle = 'hsl(' + lerp(190, 36, sw.stress[i]) + ',100%,60%)';
      g.beginPath(); g.arc(sw.px[i], sw.py[i], 7, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }

  drawHunter(g) {
    const H = this.level.hunter;
    const dazzled = this.time < H.slowUntil;
    const frenzied = this.time < H.frenzyUntil;
    const exhausted = !frenzied && this.time < H.exhaustUntil;
    const speed = Math.hypot(H.vx, H.vy) || 1;
    const dx = H.vx / speed;
    if (H.facing === undefined) H.facing = 1;
    if (dx > 0.14) H.facing = -1;
    else if (dx < -0.14) H.facing = 1;
    g.save();
    g.translate(H.x, H.y);

    let col = '255,86,62';
    if (dazzled) col = '150,220,255';
    else if (frenzied) col = '255,40,30';
    else if (exhausted) col = '150,130,120';

    const halo = frenzied ? 126 : 92;
    const gr = g.createRadialGradient(0, 0, 4, 0, 0, halo);
    gr.addColorStop(0, 'rgba(' + col + ',' + (frenzied ? 0.4 : dazzled ? 0.3 : 0.22) + ')');
    gr.addColorStop(1, 'rgba(' + col + ',0)');
    g.fillStyle = gr;
    g.beginPath(); g.arc(0, 0, halo, 0, TAU); g.fill();

    if (frenzied) {
      // ragged aura: it is not flinching any more
      g.strokeStyle = 'rgba(255,70,50,0.55)';
      g.lineWidth = 2;
      g.beginPath();
      for (let k = 0; k < 14; k++) {
        const ang = (k / 14) * TAU;
        const rr = 48 + Math.sin(this.time * 22 + k) * 9;
        const px = Math.cos(ang) * rr, py = Math.sin(ang) * rr;
        k ? g.lineTo(px, py) : g.moveTo(px, py);
      }
      g.closePath(); g.stroke();
    }

    if (frenzied) g.scale(1.12, 1.12);
    else if (exhausted) g.scale(0.94, 0.94);

    if (!Sprites.drawSideSprite(g, 'hunter', 0, 0, frenzied ? 94 : 84,
                      H.vx, H.vy, H.facing === -1 ? -1 : 1,
                      exhausted ? 0.62 : 1)) {
      g.fillStyle = dazzled ? '#22394f' : (frenzied ? '#2a1014' : '#131e2c');
      g.beginPath();
      g.moveTo(36, 0); g.lineTo(2, 14); g.lineTo(-28, 7);
      g.lineTo(-37, 18); g.lineTo(-22, 0); g.lineTo(-37, -18);
      g.lineTo(-28, -7); g.lineTo(2, -14);
      g.closePath(); g.fill();
      g.strokeStyle = 'rgba(' + col + ',0.7)';
      g.lineWidth = 1.5; g.stroke();
      g.fillStyle = dazzled ? '#bfe8ff' : '#ff6a4a';
      g.beginPath(); g.arc(15, -4, 2.8, 0, TAU); g.fill();
    }
    if (H.stunFlash > 0) {
      g.globalAlpha = H.stunFlash;
      g.fillStyle = '#ffffff';
      g.beginPath(); g.arc(0, 0, 44 * (1 - H.stunFlash) + 12, 0, TAU); g.fill();
      g.globalAlpha = 1;
    }
    g.restore();
  }

  drawParticles(g) {
    g.globalCompositeOperation = 'lighter';
    for (const p of this.particles) {
      const a = 1 - p.t / p.life;
      g.fillStyle = 'hsla(' + p.hue + ',100%,66%,' + (a * 0.72).toFixed(3) + ')';
      g.beginPath(); g.arc(p.x, p.y, 2.4 * a + 0.6, 0, TAU); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
  }
}

window.addEventListener('load', () => { window.GAME = new AbyssalDive(); });

})();
