# Aquarium (Ecosystem Boids & SVG Baker)

Dự án biến dữ liệu hoạt động kho lưu trữ GitHub thành một hệ sinh thái sinh vật biển sống động. Dự án bao gồm 2 chế độ hiển thị:
1. **Interactive Canvas Aquarium (Web):** Boids simulation thời gian thực chạy trên HTML5 Canvas với 100 loài sinh vật biển, hỗ trợ bầy đàn (schooling) và đạo diễn sự kiện cá lớn bơi qua (Encounter Wave Director).
2. **Baked Declarative SMIL SVG (GitHub Profile README):** Nướng (bake) quỹ đạo bơi của 360 con cá và 16 loài sinh vật rạn san hô thành tệp SVG duy nhất sử dụng SMIL `<animate>`/`<animateTransform>`, hiển thị mượt mà trên GitHub profile mà không cần JavaScript.

---

## 1. Đầu ra (Project Outputs)

| Tệp đầu ra | Đường dẫn | Mục đích & Đặc tả kỹ thuật |
|---|---|---|
| **Baked Animated SVG** | `docs/aquarium.svg`<br>`docs/apps/aquarium/aquarium.svg` | SVG 880×360px nhúng thẳng vào README. Chứa 360 cá con bơi theo 3 tầng nước + 16 sinh vật đáy, 0 dòng JS, 100% SMIL animation. |
| **Interactive Standalone HTML** | `docs/apps/aquarium/index.html`<br>`apps/aquarium/docs/index.html` | Trang web đơn lập (Single-file HTML) nhúng sẵn engine, sprite base64, dữ liệu repo. Chạy mượt 60 FPS từ giao thức `file://`. |

---

## 2. Cấu trúc thư mục & Tệp tin

```text
apps/aquarium/
├── src/
│   ├── engine.js                    # SwarmEngine: Boids SoA, counting sort, spatial hash
│   ├── aquarium.js                  # Canvas renderer, sprite mapping, camera & tooltip HUD
│   └── encounter-wave-director.js   # Đạo diễn xuất hiện cá voi/cá heo/cá mập theo chu kỳ
├── tools/
│   ├── bake-svg.js                  # Bộ biên dịch nướng SVG + SMIL cho GitHub README
│   ├── build-pages.js               # Đóng gói single-file HTML cho GitHub Pages
│   ├── fetch-github.js              # Gọi GitHub REST API ánh xạ repos -> sinh vật
│   └── extract-sprites.py           # Tiện ích bóc tách spritesheet từ ảnh gốc
└── test/
    └── headless.js                  # Bộ kiểm thử boids không cần giao diện (headless)
```

---

## 3. Chi tiết các hàm và lớp trong từng tệp

### 3.1 `src/engine.js` (SwarmEngine)
Lõi mô phỏng bầy đàn phỏng sinh học Reynolds (1987) tối ưu hóa cho web tương tác với Structure-of-Arrays (SoA) và zero per-frame allocation.

- **Hàm tiện ích:**
  - `clamp(v, a, b)`: Giới hạn giá trị `v` trong đoạn $[a, b]$.
  - `lerp(a, b, t)`: Nội suy tuyến tính giữa $a$ và $b$ theo hệ số $t$.
  - `rand(a, b)`: Sinh số thực ngẫu nhiên trong khoảng $[a, b)$.
  - `defaultParams()`: Trả về đối tượng chứa toàn bộ tham số vật lý của bầy đàn (bán kính nhận thức `rSep`, `rAli`, `rCoh`, góc nhìn `fov`, trọng số lực `wSep`, `wAli`, `wCoh`, tốc độ `minSpeed`, `maxSpeed`, giới hạn lân cận topo `maxNeighbours: 7`).

- **Lớp `SwarmEngine`:**
  - `constructor(capacity, width, height)`:
    - Cấp phát các mảng định kiểu tĩnh (TypedArrays) lưu trữ trạng thái dạng SoA: vị trí `px`, `py`, vận tốc `vx`, `vy`, gia tốc `ax`, `ay`, vết đuôi `tx`, `ty`, mức căng thẳng `stress`, pha vẫy đuôi `phase`, tỉ lệ tốc độ `speedScale`, mã loài `species`, trạng thái sống `alive`.
    - Khởi tạo bảng băm không gian (Uniform Spatial Hash) và mảng đếm `counts`, `sorted`, `cellOf`.
  - `resize(w, h)`: Cập nhật kích thước vùng mô phỏng, tính lại số hàng (`rows`) và cột (`cols`) của lưới không gian dựa trên `cell = max(16, rCoh)`.
  - `spawn(x, y, speed, speciesId)`: Khởi tạo một cá thể mới tại toạ độ $(x, y)$, góc bơi ngẫu nhiên, gán nhóm loài `speciesId`. Trả về chỉ số (index) của agent trong mảng hoặc `-1` nếu đầy dung lượng.
  - `removeAt(i)`: Despawn cá thể tại chỉ số `i` với độ phức tạp $O(1)$ bằng kỹ thuật **swap-remove** (hoán đổi phần tử cuối cùng vào vị trí `i` rồi giảm số lượng `n`).
  - `buildGrid()`: Sắp xếp các cá thể vào lưới không gian bằng thuật toán **Counting Sort** trong $O(N)$, không cấp phát thêm bộ nhớ, tính toán mảng tiền tố `counts` để truy xuất lân cận siêu tốc.
  - `step(dt, world)`: Bước tích phân thời gian cố định.
    - Gọi `buildGrid()`.
    - Duyệt qua 9 ô lân cận của từng cá thể, lọc theo góc nhìn hình nón (`fov: -0.35` ~ 250°), giới hạn tối đa 7 hàng xóm theo quy luật sinh học (Ballerini 2008).
    - Tính toán 3 lực Reynolds: **Phân tách (Separation)**, **Căn chỉnh hướng (Alignment)**, **Gắn kết (Cohesion)**.
    - Áp dụng lực né biên mềm (`wBounds`), lực thu hút bởi con trỏ/mồi (`wLure`), lực sợ kẻ săn mồi (`wFlee`), và lực né chướng ngại vật (`wAvoid`).
    - Cập nhật vận tốc, giới hạn tốc độ và dịch chuyển vị trí.
  - `polarisation()`: Tính toán bậc trật tự liên kết (Polarisation order metric) của toàn bầy cá $\frac{1}{N} \|\sum \hat{v}_i\| \in [0, 1]$.
  - `each(fn)`: Hàm lặp an toàn qua tất cả các cá thể đang hoạt động.

---

### 3.2 `src/aquarium.js` (Canvas Interactive Client)
Module điều khiển hiển thị trên canvas, quản lý sprite sheet, tương tác chuột/cảm ứng và HUD.

- `resize()`: Đồng bộ kích thước canvas với màn hình và `devicePixelRatio`, gọi `sw.resize(W, H)`.
- `getSpriteKey(f, index)`: Ánh xạ siêu dữ liệu của repository (ngôn ngữ lập trình, tên) sang khóa sprite trong catalog 100 loài sinh vật biển.
- `setupSheetImage(img, filename)`: Tải an toàn các tấm sprite sheet (`sheet1.png`, `sheet2.png`) với danh sách đường dẫn dự phòng (fallback paths).
- `drawCreature(ctx, key, x, y, size, facing, alpha)`: Vẽ cá lên canvas từ sprite sheet atlas dựa theo tọa độ cắt UV trong `SPRITE_DATA`.
- `updateTooltip(x, y)`: Bắn tia kiểm tra va chạm (raycast/hit-test) giữa con trỏ chuột và tọa độ các chú cá để hiển thị tooltip thông tin kho lưu trữ GitHub (tên repo, ngôn ngữ, số sao, số commit).
- **Vòng lặp Render (`requestAnimationFrame`):**
  - Vẽ nền đại dương gradient hoặc ảnh arcade backdrop.
  - Tính toán chuyển động luồng sáng xuyên qua mặt nước (caustics) và bong bóng khí.
  - Cập nhật `sw.step(dt, world)` và vẽ từng đàn cá.
  - Cập nhật và vẽ đạo diễn đợt chạm trán `EncounterWaveDirector`.
  - Cập nhật chỉ số FPS, độ trật tự bầy đàn (`ordEl`), và đếm ngược đợt sóng (`waveCountdownEl`).

---

### 3.3 `src/encounter-wave-director.js` (EncounterWaveDirector)
Hệ thống dàn dựng sự kiện điện ảnh ngẫu nhiên đưa các loài sinh vật biển khổng lồ (Cá voi xanh, Cá heo, Cá mập voi) bơi ngang màn hình cùng đội hình hộ tống.

- `constructor()`: Khởi tạo đồng hồ `clock`, thời gian kích hoạt đợt sóng kế tiếp `nextWave = 60s`, cờ quét sáng `sweep`, và hạt giống ngẫu nhiên `seed`.
- `start(width, height)`: Lựa chọn ngẫu nhiên một mẫu chạm trán (ví dụ: `whale_shark` dẫn đầu 8 chú `blue_tang_v2` hoặc `blue_dolphin` dẫn đầu 9 `cyan_fish`), hướng bơi từ trái sang phải hoặc ngược lại.
- `update(dt, width, height)`: Đếm thời gian, tự động gọi `start()` mỗi 60 giây, cập nhật tiến độ bơi của đàn cá theo hàm mượt (smooth cubic easing).
- `secondsUntilWave()`: Trả về số giây còn lại cho đến đợt chạm trán kế tiếp để cập nhật lên giao diện người dùng.
- `render(g, t, drawSprite)`: Vẽ hiệu ứng quét sáng đại dương (light sweep gradient) khi xuất hiện sự kiện, vẽ cá đầu đàn với tỉ lệ phóng to và đàn cá hộ tống bơi theo đội hình hình sin đối xứng.

---

### 3.4 `tools/bake-svg.js` (SVG Compiler)
Trình biên dịch ngoại tuyến tạo ra tệp vector SVG tự động động hóa bằng chuẩn SMIL declarative.

- `creatureSpriteDefs()` / `schoolSpriteDefs()`: Nhúng các thẻ `<g id="...">` định nghĩa vector/hình ảnh của từng loài sinh vật vào thẻ `<defs>` để tái sử dụng qua thẻ `<use>`.
- `atlantisBackdrop()`: Tạo các vector lâu đài chìm Atlantis và cột đá cổ dưới đáy biển.
- `angelPalace()`: Tạo hình cung điện san hô lung linh.
- `seaLifeFrame()`: Vẽ khung viền san hô, hải quỳ, hải tinh bám đáy biển.
- `bubbleField()`: Tạo các cụm bong bóng khí bay lên với thẻ `<animate>` chu kỳ ngẫu nhiên.
- `renderSchool(school, index)`: Tạo 120 cá thể thuộc một đàn (school) với độ dạt và độ trễ pha khác nhau, gắn hiệu ứng `<animateTransform type="translate">` lặp vô tận.
- `renderCreature(entry, data, index)`: Tạo chuyển động tuần tra cho cá ngựa (bobbing lên xuống) hoặc cua/tôm (bò qua lại trên rạn san hô).
- `renderSpecialCreatures()`: Tạo chuyển động lượn sóng cho rùa biển, cá đuối manta, và cá mập xanh.
- `buildSvg(data)`: Ráp toàn bộ các phần tử thành một chuỗi XML SVG hoàn chỉnh 880×360px kèm thanh đo "Aquarium Happiness" và hiệu ứng tim đập.
- `getData(user)`: Gọi `fetchProfile` từ `fetch-github.js` hoặc chuyển sang `fallback` nếu lỗi mạng.
- `main()`: Điểm nhập CLI; đọc tên người dùng từ tham số dòng lệnh, xuất file ra `docs/aquarium.svg` và `docs/apps/aquarium/aquarium.svg`.

---

### 3.5 `tools/build-pages.js` (HTML Inliner)
Đóng gói toàn bộ mã nguồn `engine.js`, `aquarium.js`, `soft-lure.js`, `encounter-wave-director.js`, ảnh nền base64 và dữ liệu cá thành một file `index.html` duy nhất.

- `squeeze(js)`: Minifier bảo thủ loại bỏ chú thích khối `/* */`, chú thích dòng `//`, và khoảng trắng thừa cuối dòng mà không làm gãy ngữ nghĩa JavaScript.
- `main()`: Đọc tệp nguồn, nén mã nguồn, định dạng template HTML hoàn chỉnh và ghi ra thư mục đích `docs/apps/aquarium/index.html`.

---

### 3.6 `tools/fetch-github.js` (GitHub Metadata Adapter)
Tương tác với GitHub REST API để trích xuất danh sách repository và ánh xạ sang các thông số sinh vật học.

- `get(path)`: Tạo kết nối HTTPS tới `api.github.com`, tự động đính kèm `GITHUB_TOKEN` nếu có để nâng hạn mức request.
- `speciesFor(language, name)`: Hàm băm xác định (deterministic hash) ghép tên repo và ngôn ngữ để ánh xạ chính xác vào 1 trong 20 loài sinh vật định sẵn.
- `repoToFish(r, now)`: Ánh xạ số sao, số commit, kích thước repo và thời gian cập nhật lần cuối sang thuộc tính cá:
  - Kích thước thân cá: $5.5 + \min(\sqrt[3]{\text{commits}} \times 2.2 + \sqrt{\text{stars}} \times 1.1, 16.5)\text{ px}$.
  - Nhịp bơi `pace`: Giảm còn 0.45 nếu repo đã ngủ đông trên 365 ngày.
  - Độ sâu ưa thích `depth`: Tùy thuộc vào nhóm phân loại sinh vật.
- `fetchProfile(user)`: Lấy thông tin user và danh sách repositories công khai.
- `fallback(user)`: Cung cấp dữ liệu ngoại tuyến ổn định gồm 18 repositories mẫu khi không có kết nối internet hoặc bị chạm rate limit.

---

### 3.7 `test/headless.js` (Validation Harness)
Bộ kiểm thử chạy trong Node.js (sử dụng môi trường `vm.createContext`) để đảm bảo tính đúng đắn của SwarmEngine.

- **Check 1 (Counting Sort Integrity):** Kiểm tra mảng tiền tố `counts` có đơn điệu tăng và mọi phần tử nằm đúng cell không.
- **Check 2 (Numerical Stability):** Chạy 1.800 bước mô phỏng để kiểm tra không bị phát sinh `NaN`, không bị tràn vận tốc, không vượt biên.
- **Check 3 (Emergence Test):** Đo đạc chỉ số trật tự `polarisation()`, đảm bảo bầy cá tự tổ chức định hướng từ hỗn loạn ban đầu ($< 0.05 \to > 0.45$).
- **Check 4 (Spatial Hash Benchmarking):** Đo lường số cặp kiểm tra va chạm, xác nhận giảm $> 95\%$ số phép thử so với thuật toán $O(N^2)$ ngây thơ.
