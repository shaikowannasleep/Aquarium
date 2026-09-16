'use strict';
/* Original arcade-style encounter director. It stages large-creature escorts
 * above the ambient boid tank; it never replaces the flock simulation. */
(function (global) {
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);

  class EncounterWaveDirector {
    constructor() {
      this.clock = 0;
      this.nextWave = 60;
      this.wave = null;
      this.sweep = 0;
      this.seed = 0;
    }
    start(width, height) {
      const types = [
        { leader: 'whale_shark', escorts: ['blue_tang_v2', 'yellow_tang_v2', 'damselfish'], count: 8, scale: 1.35, depth: 0.46 },
        { leader: 'blue_dolphin', escorts: ['cyan_fish', 'blue_tang', 'damselfish'], count: 9, scale: 1.02, depth: 0.28 },
        { leader: 'blue_shark', escorts: ['cyan_fish', 'butterflyfish_v2', 'yellow_tang'], count: 6, scale: 1.10, depth: 0.42 }
      ];
      const type = types[this.seed++ % types.length];
      const direction = this.seed % 2 ? 1 : -1;
      this.wave = { type, direction, t: 0, duration: 11.5, width, height };
      this.sweep = 1;
    }
    update(dt, width, height) {
      this.clock += dt;
      if (!this.wave && this.clock >= this.nextWave) {
        this.start(width, height);
        this.nextWave = this.clock + 60;
      }
      if (!this.wave) return;
      this.wave.t += dt;
      this.sweep = Math.max(0, this.sweep - dt * 1.45);
      if (this.wave.t >= this.wave.duration) this.wave = null;
    }
    secondsUntilWave() {
      if (this.wave) return 0;
      return Math.max(0, Math.ceil(this.nextWave - this.clock));
    }
    render(g, t, drawSprite) {
      const w = this.wave;
      if (!w) return;
      const p = clamp(w.t / w.duration, 0, 1);
      const ease = p * p * (3 - 2 * p);
      const x = w.direction > 0 ? -120 + ease * (w.width + 240) : w.width + 120 - ease * (w.width + 240);
      const y = w.height * w.type.depth + Math.sin(w.t * 1.6) * 18;
      // Current sweep: translucent and short, signals a new encounter.
      if (this.sweep > 0) {
        const sx = w.direction > 0 ? ease * w.width : (1 - ease) * w.width;
        const grad = g.createLinearGradient(sx - 90, 0, sx + 90, 0);
        grad.addColorStop(0, 'rgba(90,225,255,0)');
        grad.addColorStop(0.5, 'rgba(140,245,255,' + (this.sweep * 0.16) + ')');
        grad.addColorStop(1, 'rgba(90,225,255,0)');
        g.fillStyle = grad; g.fillRect(sx - 110, 0, 220, w.height);
      }
      // Escort fish use stable formation offsets, with tiny local sinusoidal life.
      for (let i = 0; i < w.type.count; i++) {
        const row = i % 2;
        const behind = 42 + Math.floor(i / 2) * 27;
        const ox = -w.direction * behind;
        const oy = (row ? 1 : -1) * (20 + (i % 3) * 7) + Math.sin(t * 2.4 + i) * 4;
        drawSprite(w.type.escorts[i % w.type.escorts.length], x + ox, y + oy, 18, w.direction, 0.86);
      }
      drawSprite(w.type.leader, x, y, 54 * w.type.scale, w.direction, 1);
    }
  }
  global.EncounterWaveDirector = EncounterWaveDirector;
})(typeof window !== 'undefined' ? window : globalThis);
