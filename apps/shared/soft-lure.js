'use strict';
/* Shared input smoothing. One instance per scene, never a global game singleton. */
(function (global) {
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  class SoftLureController {
    constructor(x, y) {
      this.x = x; this.y = y; this.tx = x; this.ty = y;
      this.power = 0; this.down = false;
      this.velocityX = 0; this.velocityY = 0;
    }
    setTarget(x, y, down) { this.tx = x; this.ty = y; if (down !== undefined) this.down = down; }
    update(dt) {
      const follow = 1 - Math.exp(-8 * dt);
      const oldX = this.x, oldY = this.y;
      this.x += (this.tx - this.x) * follow;
      this.y += (this.ty - this.y) * follow;
      this.velocityX = (this.x - oldX) / Math.max(dt, 1 / 120);
      this.velocityY = (this.y - oldY) / Math.max(dt, 1 / 120);
      const targetPower = this.down ? 1 : 0;
      const rate = this.down ? 7.5 : 3.8;
      this.power += (targetPower - this.power) * (1 - Math.exp(-rate * dt));
      return { x: this.x, y: this.y, power: this.power, active: this.power > 0.025 };
    }
    influence() { return { x: this.x, y: this.y, power: this.power, active: this.power > 0.025 }; }
  }
  global.SoftLureController = SoftLureController;
})(typeof window !== 'undefined' ? window : globalThis);
