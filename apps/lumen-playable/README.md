# LUMEN — a playable ad where Boids *is* the gameplay

> **Design thesis:** in almost every shipped game, flocking is decoration.
> Here the three Reynolds rules are the three levels. The player never
> controls a fish. They control a light, and the emergent behaviour does
> the rest.

---

## 1. Why this is a portfolio piece and not a boids demo

Most "boids showcases" are a screen full of triangles with sliders. A
recruiter has seen forty of them. What is scarce is someone who can show:

| Signal | How this build proves it |
|---|---|
| Understands the algorithm | Topological neighbours (7), FOV blind spot, inverse-square separation |
| Understands *shipping* it | SoA typed arrays, counting-sort spatial hash, zero per-frame allocation |
| Understands game design | Each rule is turned into a distinct, teachable player verb |
| Understands the ad format | Single file, 0 requests, 3 beats, sub-20s to CTA, no engine |
| Can prove the claims | Headless test harness with real measured numbers |

The **TECH** button in the corner is the flex: it draws the live
separation / alignment / cohesion vectors on a tracked agent and streams
real counters. It proves the swarm is simulated, not animated.

---

## 2. The three beats

| Beat | Rule taught | Player verb | Failure pressure |
|---|---|---|---|
| **01 Cohesion** | centre-of-mass attraction | hold light, gather 9 scattered pods into the sanctuary | none — this beat teaches |
| **02 Separation** | inverse-square crowding | lead the school through a rock corridor | agents crushed on geometry are lost |
| **03 Alignment** | velocity matching | keep order parameter **φ > 0.72** for 7s while a hunter charges | stragglers get eaten |

The light is an attractor with a **repulsive core** (inside 34px the sign
flips). Without that, holding the finger still collapses the whole school
into one pixel and the illusion dies instantly. That single line is the
difference between a demo and a game.

---

## 3. Engineering notes

### Neighbour search
Uniform grid + **counting sort**, rebuilt each frame:

```
count occupancies -> prefix sum -> scatter -> restore cellStart
```

`counts[]` doubles as the write cursor during scatter and is then shifted
back, so the whole grid build is allocation-free. Only the 3×3 cell
neighbourhood is scanned, and the scan aborts at 7 accepted neighbours
(`break outer`) — this is *topological*, matching Ballerini et al. 2008
on starlings, and it also caps the worst case in dense clumps.

Measured at 1000 agents: **20,352 pair tests/frame vs 1,000,000 naive → 98.0% reduction**.

### Stability
- Fixed 1/60 timestep with an accumulator and a 5-step guard, so physics
  does not change with refresh rate.
- `maxForce` clamp before integration, then a `[minSpeed, maxSpeed]` clamp
  after. Dropping `minSpeed` is the single most common cause of a flock
  freezing into a blob.
- Soft bounds that push inward. Wrap-around reads to a player as a bug.
- Verified over 1800 steps: no NaN, no escapes, speeds inside envelope.

### Art direction driven by simulation
Each agent carries a `stress` channel raised by predator proximity and
decayed over time. Hue lerps cyan → amber and `maxSpeed` gains a 1.55×
panic boost. The flash-expansion you see when the hunter hits the school
is not authored — it falls out of separation spiking while stress raises
the speed ceiling.

---

## 4. Verified numbers

```
counting sort integrity ........ PASS (5/5 invariants)
1800-step stability ............ PASS (0 NaN, 700/700 contained)
emergence (φ 0.061 -> 0.345) ... PASS
pair-test reduction ............ 98.0%
step cost @1000 agents ......... 1.71 ms  (60fps budget 16.6ms)
O(1) swap-remove ............... PASS
```

Reproduce: `node test/headless.js`

---

## 5. Project Outputs & Deliverables

| Artifact | Đường dẫn | Tiêu chuẩn kỹ thuật |
|---|---|---|
| **Playable Ad Distribution** | `apps/lumen-playable/dist/index.html` | ~103 KB (gzip ~60 KB), 0 requests, tương thích mạng quảng cáo: Unity, Mintegral, AppLovin, IronSource, Meta Playable Ads. |
| **Published Hub Route** | `docs/apps/lumen-playable/index.html` | Được đồng bộ để chạy trên GitHub Pages và Device Simulator. |

---

## 6. Chi tiết các hàm và lớp trong từng module

### 6.1 `src/engine.js` (SwarmEngine)
Lõi mô phỏng boids Reynolds thu nhỏ cho môi trường Playable Ad.

- `clamp(v, a, b)`: Hàm kẹp giá trị số.
- `lerp(a, b, t)`: Hàm nội suy tuyến tính.
- `rand(a, b)`: Hàm sinh số thực ngẫu nhiên.
- `defaultParams()`: Thiết lập các thông số động học của đàn cá:
  - Bán kính cảm nhận: `rSep: 18`, `rAli: 42`, `rCoh: 52`.
  - Giới hạn góc nhìn: `fov: -0.35` (tạo vùng điểm mù phía sau đuôi cá $\sim 110^\circ$).
  - Trọng số lực: `wSep: 2.10`, `wAli: 1.05`, `wCoh: 0.95`, `wFlee: 4.60`, `wAvoid: 5.20`, `wLure: 2.40`, `wBounds: 3.40`.
  - Tốc độ: `minSpeed: 46`, `maxSpeed: 132`, `maxForce: 260`, `panicSpeedBoost: 1.55`.
  - Số lân cận tối đa: `maxNeighbours: 7` (Ballerini et al. 2008).
- **Lớp `SwarmEngine`:**
  - `constructor(capacity, width, height)`: Khởi tạo các mảng TypedArrays SoA (`px`, `py`, `vx`, `vy`, `ax`, `ay`, `tx`, `ty`, `stress`, `phase`, `speedScale`, `species`, `alive`).
  - `resize(w, h)`: Cập nhật số hàng, cột của lưới không gian.
  - `spawn(x, y, speed, speciesId)`: Sinh cá thể mới, gán vận tốc ngẫu nhiên và pha dao động đuôi.
  - `removeAt(i)`: Loại bỏ phần tử `i` trong $O(1)$ bằng kỹ thuật swap-remove.
  - `buildGrid()`: Sắp xếp các cá thể vào lưới ô vuông thông qua Counting Sort hoàn toàn không cấp phát bộ nhớ.
  - `step(dt, world)`: Cập nhật 1 bước mô phỏng: tính toán va chạm, tìm kiếm lân cận trong 9 ô xung quanh, tổng hợp các lực Reynolds, kẹp lực gia tốc `maxForce`, kẹp vận tốc `minSpeed` - `maxSpeed`, đẩy lùi khi chạm biên mềm.
  - `polarisation()`: Tính toán chỉ số căn chỉnh hướng toàn bầy cá.
  - `each(fn)`: Hàm tiện ích duyệt qua các cá thể đang sống.

### 6.2 `src/game.js` (Playable Scene & State Machine)
Quản lý chuỗi 3 màn chơi (3 beats), giao diện, hiệu ứng âm thanh và Call to Action (CTA).

- **Module `Sprites`:**
  - `draw(g, name, x, y, width, angle, alpha)`: Vẽ sprite xoay góc từ chuỗi Base64.
  - `drawSideSprite(g, name, x, y, width, vx, vy, facing, alpha)`: Vẽ sprite góc nhìn nghiêng (side-view), tự động lật mặt trái/phải (`facing`) và tính góc nghiêng dốc (`pitch`) theo vận tốc dọc.
- **Module `Sfx`:**
  - `ctx()`: Khởi tạo hoặc tiếp tục `AudioContext` khi có tương tác đầu tiên của người dùng.
  - `tone(freq, dur, type, vol)`: Bộ tổng hợp sóng âm đơn (oscillator) không cần nạp file âm thanh bên ngoài.
  - `unlock()`: Đánh thức AudioContext.
  - `pickup(n)`: Âm thanh thu nạp cá.
  - `win()`: Hợp âm chúc mừng chiến thắng 4 nốt.
  - `hit()`: Âm thanh va chạm hoặc mất cá (sawtooth wave).
  - `swell()`: Âm thanh rền vang khi cá mập xuất hiện.
- **Lớp `Game`:**
  - `constructor(root)`: Khởi tạo DOM, Canvas 2D context, gắn các event listener (touch/mouse).
  - `resize()`: Đồng bộ kích thước màn hình điện thoại (portrait & landscape).
  - `initBeat1()`: Khởi tạo Beat 1 (Cohesion) - gom 9 đàn cá rải rác.
  - `initBeat2()`: Khởi tạo Beat 2 (Separation) - dắt đàn cá qua hẻm núi đá san hô.
  - `initBeat3()`: Khởi tạo Beat 3 (Alignment) - duy trì độ trật tự $\phi > 0.72$ khi cá mập đầu búa tấn công.
  - `onWin()`: Kích hoạt màn hình End Card / CTA dẫn người chơi tới App Store / Google Play.
  - `renderTechOverlay()`: Vẽ biểu đồ vector phân tích lực tách, căn chỉnh và hút bầy trực tiếp trên cá thể đang theo dõi.

### 6.3 `build.js` (Bộ Đóng Gói Playable Single-File)
- `squeeze(js)`: Minifier bảo thủ, giữ lại các ký tự ngắt dòng kết thúc câu lệnh để ngăn ngừa lỗi ASI.
- Đọc `style.css` và nhúng vào thẻ `<style>`.
- Inlined các ảnh sprite (`cyan_fish.png`, `hammerhead_shark.png`, `sea_anemone.png`) thành base64 data URIs.
- Gộp mã nguồn `soft-lure.js`, `engine.js`, `game.js`.
- Sử dụng Node.js `vm.Script` để kiểm tra lỗi cú pháp của bundle trước khi ghi ra file `dist/index.html`.
- Kiểm tra nghiêm ngặt không cho phép bất kỳ thẻ `<script src>` hoặc `<link href>` nào sống sót.
