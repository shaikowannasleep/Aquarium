# Abyssal Dive

One lamp. Two jobs. You cannot do both at once.

You are a diver with a single light. The school follows it. The hunter is
dazzled by it. Every second the lamp spends blinding the predator is a
second it is not leading anyone to safety — and the crevices only hold so
many.

**Saving all 64 is possible.** It is not the default outcome.

---

## The design problem

The brief was specific:

- the whole school *can* be saved, but only by someone who plans
- the layout must not be so random that it is unlearnable, nor so fixed
  that one memorised route always works
- the school must be able to reach shelter **without any fish knowing
  where shelter is** — real fish do not carry a map

That last one is the interesting one.

## Where the knowledge lives

Not in the fish. In the water.

A Dijkstra wavefront expands once from every open crevice across a coarse
grid, producing a cost-to-nearest-refuge per cell. The gradient of that
field is a direction baked into the world. A fish never pathfinds. It
reads the one cell it is sitting in — a single array lookup — and drifts
with it when calm, runs with it when frightened.

So the school finds the gap the way a real one would: by following the
flow of the water and each other. When a crevice fills, it closes, the
field is rebuilt in **0.64 ms**, and the water quietly starts pointing
somewhere else. Nothing is told. Everything re-routes.

This is the flow-field trick from RTS pathfinding — one wavefront serves
any number of agents, instead of one A\* per agent per frame.

## Boids on top

The three Reynolds rules (separation, alignment, cohesion) run underneath,
with a uniform grid and counting sort for neighbour search, topological
neighbour capping at 7 per Ballerini et al. 2008, and structure-of-arrays
state with O(1) swap-remove. The flow field is just one more steering
force added to the mix — which is the whole reason this composes so
cleanly.

## The reef

Fixed skeleton, jittered joints. Three bands of rock always form a
corridor; what changes per seed is gap width, which gap is the generous
one, refuge count and capacity, and where the hunter enters. Recognisable
in a second, never the same twice.

Generation can occasionally seal a pocket, so every level runs a repair
pass: find the boulder responsible for a stranded spawn, remove it,
re-check. Across 400 seeds, **zero strand a fish** and the repair never
has to touch more than a handful of rocks.

---

## Verified by a bot that plays it

The design promise is not a claim in a readme, it is a test. A scripted
shepherd — no foresight, never splits the school on purpose, never banks
a dazzle — plays 60 seeds:

```
=== 1. a plain strategy can save everyone ===
        perfect runs      1/60  (2%)
        mean saved        47.1/64
  PASS  a no-loss run is reachable by a plain strategy
  PASS  but perfect is not the default outcome
  PASS  most runs save the majority
  PASS  few runs leave fish swimming at the bell   0/60 timeouts

=== 2. the dazzle actually matters ===
        per-seed          26 better, 19 worse, 5 level
  PASS  spending the lamp on the hunter wins more often than it loses

=== 3. outcomes vary across seeds ===
        saved range       25 .. 63
  PASS  one memorised line does not fit every reef
```

The bot is a **floor, not a ceiling**. If a strategy this plain already
rescues 47 of 64 and can occasionally take all of them, the headroom above
it belongs to the player.

### Three bugs this harness caught

**The lamp was pushing fish out of the crevice.** The lure carries a
repulsive core so a held finger cannot collapse the school into a
singularity. That core was 34px. Refuge mouths were 32px. With the hunter
removed entirely and the lamp parked directly on a refuge, only 10 of 64
ever got in. The core now sits at 15px, well inside any mouth.

**The school only moved when it was scared.** The flow hint was gated on
stress, so a calm school ignored the water completely and shepherding was
impossible. Calm fish now drift with the current; frightened ones run with
it.

**`SAME SEED` never worked.** `makeLevel` is seeded, but `spawn()` draws
heading and tail phase from `Math.random`, so the same seed produced a
different school every time. This also made the harness report 0 or 1
perfect runs at random. `Math.random` is now pinned across setup — two
consecutive full runs return byte-identical statistics.

---

## Project Outputs (Đầu ra sản phẩm)

| Đầu ra | Đường dẫn | Dung lượng & Đặc tính kỹ thuật |
|---|---|---|
| **Standalone Distribution** | `apps/abyssal-dive/dist/index.html` | ~133 KB (gzip 70 KB). Single-file HTML tự cung cấp, nhúng Base64 sprites, 0 network request, chạy offline trực tiếp từ `file://`. |
| **Published Hub Route** | `docs/apps/abyssal-dive/index.html` | Bản build phát hành đồng bộ cho GitHub Pages. |

---

## Chi tiết các hàm và API trong từng Module

### 1. `src/flowfield.js` (Lưới Vector Dòng Chảy RTS)
Quản lý lưới trường chi phí và gradient chỉ đường cứu sinh cho bầy cá.

- **Hằng số:**
  - `UNREACHABLE = 1e9`: Giá trị quy ước vô cực cho ô không thể tiếp cận.
- **Lớp `FlowField`:**
  - `constructor(width, height, cellSize)`: Thiết lập kích thước ô mặc định (26px) và khởi tạo lưới.
  - `resize(width, height)`: Khởi tạo mảng định kiểu không cấp phát động:
    - `cost`: `Float32Array` trọng số di chuyển của từng ô.
    - `dist`: `Float32Array` khoảng cách ngắn nhất tới nơi trú ẩn mở gần nhất.
    - `dirX`, `dirY`: `Float32Array` vector gradient đơn vị hướng về nơi trú ẩn.
    - `blocked`: `Uint8Array` đánh dấu ô bị đá bịt kín ($1$ là chặn, $0$ là thông).
    - `queue`: `Int32Array` hàng đợi vòng (ring buffer) cho thuật toán sóng Dijkstra.
  - `idx(cx, cy)`: Chuyển đổi tọa độ lưới 2D $(cx, cy)$ sang chỉ số 1D trong mảng phẳng.
  - `cellAt(x, y)`: Tìm chỉ số ô chứa điểm tọa độ thực $(x, y)$.
  - `rasterise(obstacles)`: Số hóa các chướng ngại vật lên lưới:
    - Đá cứng (`passable: false`): Đánh dấu `blocked = 1` trong bán kính $r + 6$. Tạo vùng chuyển tiếp tăng chi phí di chuyển (từ 1 đến 6) trong biên $r + 34$ để cá không bơi cọ tường.
    - Tảo mềm (`passable: true`): Cho phép đi qua hoàn toàn, chi phí bằng $1$.
  - `build(refuges)`: Mở rộng sóng Dijkstra đa nguồn (Multi-source Dijkstra Wavefront):
    - Khởi tạo `dist = UNREACHABLE`. Đưa tất cả cửa hang đang mở (`closed !== true`) vào hàng đợi với `dist = 0`.
    - Lan truyền BFS theo 4 hướng chính (trên, dưới, trái, phải).
    - Tính toán trường vector hướng $\vec{D} = (\text{dirX}, \text{dirY})$ bằng đạo hàm trung tâm (central differences) từ độ dốc khoảng cách `dist`. Chuẩn hóa thành vector đơn vị.
  - `sample(x, y, out)`: Đọc vector hướng dòng chảy tại $(x, y)$ và ghi kết quả vào object `out = {x, y}` trong $O(1)$.
  - `distanceAt(x, y)`: Trả về khoảng cách từ tọa độ $(x, y)$ tới hang trú ẩn gần nhất.
  - `isBlocked(x, y)`: Kiểm tra nhanh xem điểm $(x, y)$ có nằm trong chướng ngại vật cứng hay không.

---

### 2. `src/level.js` (Tạo Màn Thủ Tục & Sửa Lỗi Tắc Đường)
Sinh bản đồ rạn san hô theo hạt giống số và kiểm soát tính khả thi (solvability).

- `mulberry32(seed)`: Trình sinh số ngẫu nhiên giả 32-bit xác định (Deterministic PRNG).
- `makeLevel(seed, W, H, depth)`:
  - Sinh 3 dải đá ngầm (rock bands) chạy dọc theo màn hình với 1 hoặc 2 khe hở (gaps).
  - Chọn ngẫu nhiên một khe rộng (hào phóng) và các khe hẹp.
  - Sinh rèm rong biển cheo leo giữa các khe hở làm đường thoát hiểm cho cá nhỏ.
  - Đặt các hang trú ẩn (refuges) với dung lượng giới hạn (tổng dung lượng $\ge 64$ cá).
  - **Reachable Repair Pass:** Chạy thuật toán tìm đường kiểm tra xem vị trí xuất hiện ban đầu của đàn cá có bị đá phong tỏa kín hay không. Nếu có, tìm tảng đá gây tắc nghẽn và loại bỏ ngay lập tức.

---

### 3. `src/oceanography.js` (Mô Hình Hải Dương Học)
Tính toán các chỉ số môi trường theo độ sâu thực tế để hiển thị bảng thông tin (Readout Panel).

- `pressureBar(depth)`: Tính áp suất thủy tĩnh theo độ sâu $P = 1 + \frac{\text{depth}}{9.95}\text{ bar}$.
- `temperatureC(depth)`: Mô hình hóa nhiệt độ đại dương (vùng nước ấm bề mặt, vùng biến nhiệt dốc thermocline từ 200m - 1000m, và vùng sâu lạnh $0^\circ\text{C} - 4^\circ\text{C}$).
- `lightFraction(depth)`: Tỉ lệ ánh sáng mặt trời còn sót lại theo hàm suy giảm mũ $\exp(-\frac{\text{depth}}{32.5})$.
- `lightLabel(depth)`: Trả về nhãn mô tả mức độ ánh sáng con người nhìn thấy.
- `LAYERS`: Mảng 5 tầng biển: Epipelagic (0-200m), Mesopelagic (200-1000m), Bathypelagic (1000-4000m), Abyssopelagic (4000-6000m), Hadal (6000m+).
- `layerAt(depth)`: Trả về dữ liệu tầng biển, hệ sinh thái và sự thật khoa học tương ứng.

---

### 4. `src/engine.js` (Boids Engine Chuyên Biệt)
Mở rộng từ `SwarmEngine` chuẩn:
- Tích hợp thêm lực đẩy từ luồng nước `FlowField.sample(x, y)`:
  - Khi cá bình tĩnh (`stress < 0.15`): trôi dạt nhẹ theo dòng chảy.
  - Khi cá hoảng sợ (`stress \ge 0.15`): bơi bứt tốc hết cỡ theo vector gradient hướng về hang.
- Tích hợp lực xua đuổi của kẻ săn mồi (Hunter Flee).
- Tích hợp lực hút của đèn lặn từ `SoftLureController`.

---

### 5. `src/game.js` (Game Loop, Vũ Khí Đèn Lặn & Kẻ Săn Mồi)
Điều khiển toàn bộ vòng lặp trò chơi, trạng thái kẻ săn mồi, đèn lặn, và giao diện.

- **Hệ thống đèn lặn (Diver Lamp):**
  - Quản lý 5 vạch năng lượng (`LAMP_CHARGES = 5`).
  - Hồi phục sau khi cạn kiệt (`LAMP_REFILL_TIME = 4.2s`).
  - Làm choáng kẻ săn mồi (`DAZZLE_AIM_TIME = 0.4s`, `DAZZLE_DURATION = 2.6s`, `DAZZLE_SLOW = 0.26`).
- **AI Kẻ Săn Mồi (Hunter Behavior):**
  - Trạng thái săn đuổi thường: bơi bám theo trọng tâm đàn cá.
  - Trạng thái cuồng nộ (`FRENZY`): Kích hoạt sau 3 lần bị làm choáng (`FRENZY_TRIGGER = 3`), miễn nhiễm đèn lặn và tăng tốc $1.55\times$ trong 3 giây.
  - Trạng thái kiệt sức (`EXHAUST`): Sau cơn cuồng nộ, bơi chậm $0.5\times$ trong 3 giây tạo cơ hội vàng cho người chơi.
- **Hệ thống âm thanh tổng hợp (`Sfx`):**
  - `tone(freq, dur, type, vol)`: Sử dụng Web Audio API tạo âm thanh tức thì không cần nạp file wav/mp3 ngoài.

---

### 6. `build.js` (Bộ Đóng Gói Single-File)
- `squeeze(js)`: Minifier loại bỏ comment an toàn.
- Đọc file HTML mẫu, inlined tất cả sprite thành chuỗi `data:image/png;base64,...`.
- Ghép `soft-lure.js`, `oceanography.js`, `flowfield.js`, `level.js`, `engine.js`, `game.js`.
- Kiểm tra tính hợp lệ bằng `vm.Script` và chặn đứng mọi thẻ `<script src>` hoặc `fetch()` còn sót lại.
- Xuất file ra cả `apps/abyssal-dive/dist/index.html` và `docs/apps/abyssal-dive/index.html`.
