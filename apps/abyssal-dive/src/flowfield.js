'use strict';
/* =====================================================================
 * ABYSSAL DIVE :: FlowField
 * ---------------------------------------------------------------------
 * The design problem: a school should be able to reach a refuge, but no
 * individual fish may "know" where the refuge is. Real fish do not hold
 * a map.
 *
 * The resolution: the KNOWLEDGE lives in the water, not in the fish.
 * A Dijkstra / BFS wavefront is expanded once from every refuge across a
 * coarse grid, producing a cost-to-nearest-refuge for each cell. The
 * gradient of that field is a direction vector baked into the world.
 *
 * A fish never queries it. A fish only reads the water it is currently
 * sitting in, which is exactly one array lookup, and it only obeys that
 * hint when it is already frightened. So the flock finds the crevice the
 * way a real one would: by following the flow of the water and each
 * other, not by pathfinding.
 *
 * This is the classic RTS flow-field trick (Supreme Commander 2 shipped
 * it for exactly this reason): one wavefront serves any number of
 * agents, instead of one A* per agent per frame.
 * ===================================================================== */

const UNREACHABLE = 1e9;

class FlowField {
  constructor(width, height, cellSize) {
    this.cs = cellSize || 26;
    this.resize(width, height);
  }

  resize(width, height) {
    this.w = width;
    this.h = height;
    this.cols = Math.max(2, Math.ceil(width / this.cs));
    this.rows = Math.max(2, Math.ceil(height / this.cs));
    const n = this.cols * this.rows;
    this.cost = new Float32Array(n);      // travel cost per cell
    this.dist = new Float32Array(n);      // cost to nearest refuge
    this.dirX = new Float32Array(n);      // unit gradient, pointing to safety
    this.dirY = new Float32Array(n);
    this.blocked = new Uint8Array(n);
    this.queue = new Int32Array(n);       // ring buffer for the wavefront
    this._n = n;
  }

  idx(cx, cy) { return cy * this.cols + cx; }

  cellAt(x, y) {
    const cx = Math.min(this.cols - 1, Math.max(0, (x / this.cs) | 0));
    const cy = Math.min(this.rows - 1, Math.max(0, (y / this.cs) | 0));
    return cy * this.cols + cx;
  }

  /* Rasterise the static world: rock becomes impassable, the water just
   * outside rock becomes expensive so the school does not hug the walls. */
  rasterise(obstacles) {
    this.blocked.fill(0);
    this.cost.fill(1);
    const cs = this.cs;
    for (let cy = 0; cy < this.rows; cy++) {
      for (let cx = 0; cx < this.cols; cx++) {
        const x = cx * cs + cs * 0.5;
        const y = cy * cs + cs * 0.5;
        const i = cy * this.cols + cx;
        for (let k = 0; k < obstacles.length; k++) {
          const o = obstacles[k];
          /* Kelp is water as far as a fish is concerned: it costs nothing
           * to route through and it is never blocked. Only the hunter is
           * too big to push into it, which is what turns a weed bed into
           * an escape route rather than scenery. */
          if (o.passable) continue;
          const d = Math.hypot(x - o.x, y - o.y);
          if (d < o.r + 6) { this.blocked[i] = 1; break; }
          if (d < o.r + 34) {
            // graded penalty near rock: passable, but not preferred
            const t = 1 - (d - o.r - 6) / 28;
            const c = 1 + t * 5;
            if (c > this.cost[i]) this.cost[i] = c;
          }
        }
      }
    }
  }

  /* Uniform-cost wavefront from every refuge at once.
   * Multi-source Dijkstra with a small bucket queue: costs are in a tight
   * range so a simple ring buffer behaves close to a priority queue while
   * staying allocation-free. */
  build(refuges) {
    const n = this._n;
    this.dist.fill(UNREACHABLE);

    const q = this.queue;
    let head = 0, tail = 0;
    const push = i => { q[tail] = i; tail = (tail + 1) % n; };

    for (let r = 0; r < refuges.length; r++) {
      const R = refuges[r];
      if (R.closed) continue;
      // seed every cell inside the refuge mouth
      const cx0 = Math.max(0, ((R.x - R.r) / this.cs) | 0);
      const cx1 = Math.min(this.cols - 1, ((R.x + R.r) / this.cs) | 0);
      const cy0 = Math.max(0, ((R.y - R.r) / this.cs) | 0);
      const cy1 = Math.min(this.rows - 1, ((R.y + R.r) / this.cs) | 0);
      for (let cy = cy0; cy <= cy1; cy++) {
        for (let cx = cx0; cx <= cx1; cx++) {
          const i = cy * this.cols + cx;
          if (this.blocked[i]) continue;
          const x = cx * this.cs + this.cs * 0.5;
          const y = cy * this.cs + this.cs * 0.5;
          if (Math.hypot(x - R.x, y - R.y) > R.r) continue;
          this.dist[i] = 0;
          push(i);
        }
      }
    }

    /* Relaxation sweep. A cell re-enters the queue whenever a cheaper
     * route to it is discovered, which is what makes this Dijkstra
     * rather than plain BFS and is why the graded rock penalty is
     * respected instead of ignored. */
    let guard = 0;
    const maxIter = n * 8;
    while (head !== tail && guard++ < maxIter) {
      const i = q[head];
      head = (head + 1) % n;
      const cy = (i / this.cols) | 0;
      const cx = i - cy * this.cols;
      const d0 = this.dist[i];

      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          if (!ox && !oy) continue;
          const nx = cx + ox, ny = cy + oy;
          if (nx < 0 || ny < 0 || nx >= this.cols || ny >= this.rows) continue;
          const j = ny * this.cols + nx;
          if (this.blocked[j]) continue;
          // diagonal moves cost sqrt(2); refuse to cut a blocked corner
          const diag = ox && oy;
          if (diag) {
            if (this.blocked[cy * this.cols + nx]) continue;
            if (this.blocked[ny * this.cols + cx]) continue;
          }
          const step = (diag ? 1.41421356 : 1) * this.cost[j];
          const nd = d0 + step;
          if (nd < this.dist[j] - 1e-4) {
            this.dist[j] = nd;
            push(j);
          }
        }
      }
    }

    this.gradient();
    return guard < maxIter;
  }

  /* Central-difference gradient, pointing downhill toward safety. */
  gradient() {
    const { cols, rows } = this;
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        const i = cy * cols + cx;
        if (this.blocked[i] || this.dist[i] >= UNREACHABLE) {
          this.dirX[i] = 0; this.dirY[i] = 0;
          continue;
        }
        const sample = (px, py) => {
          if (px < 0 || py < 0 || px >= cols || py >= rows) return this.dist[i];
          const k = py * cols + px;
          if (this.blocked[k] || this.dist[k] >= UNREACHABLE) return this.dist[i] + 4;
          return this.dist[k];
        };
        const gx = sample(cx - 1, cy) - sample(cx + 1, cy);
        const gy = sample(cx, cy - 1) - sample(cx, cy + 1);
        const m = Math.hypot(gx, gy);
        if (m > 1e-6) { this.dirX[i] = gx / m; this.dirY[i] = gy / m; }
        else { this.dirX[i] = 0; this.dirY[i] = 0; }
      }
    }
  }

  /* Bilinear sample so agents do not visibly snap between cells. */
  sample(x, y, out) {
    const cs = this.cs;
    const fx = x / cs - 0.5, fy = y / cs - 0.5;
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    const tx = fx - x0, ty = fy - y0;
    let sx = 0, sy = 0;
    for (let j = 0; j <= 1; j++) {
      for (let i = 0; i <= 1; i++) {
        const cx = Math.min(this.cols - 1, Math.max(0, x0 + i));
        const cy = Math.min(this.rows - 1, Math.max(0, y0 + j));
        const k = cy * this.cols + cx;
        const w = (i ? tx : 1 - tx) * (j ? ty : 1 - ty);
        sx += this.dirX[k] * w;
        sy += this.dirY[k] * w;
      }
    }
    out.x = sx; out.y = sy;
    return out;
  }

  distanceAt(x, y) { return this.dist[this.cellAt(x, y)]; }
  isBlocked(x, y) { return this.blocked[this.cellAt(x, y)] === 1; }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FlowField, UNREACHABLE };
}
if (typeof window !== 'undefined') {
  window.FlowField = FlowField;
  window.FLOW_UNREACHABLE = UNREACHABLE;
}
