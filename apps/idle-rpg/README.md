# Gà Rán & Bơ Già Dừa Non / Boss Armory Idle (Phaser 3 & Three.js Playable)

Dự án playable thử nghiệm cơ chế tương tác đa dạng bao gồm:
1. **Phaser 3 Live-Mukbang:** Gameplay phong cách livestream phục vụ món ăn cho đầu bếp; kéo thả đồ ăn/thức uống vào miệng, hoạt họa nhai nuốt 8 trạng thái, tương tác người xem, tặng quà và minigame giải cứu khỏi trạng thái ngộ độc đồ ăn (Food Coma).
2. **Boss Armory Idle (Three.js 3D WebGL):** Bản build đồ họa 3D hiển thị trang bị và phòng thử đồ vũ khí chạy mượt trên Canvas/WebGL.

---

## 1. Đầu ra (Project Outputs)

| Đầu ra | Đường dẫn | Tiêu chuẩn kỹ thuật |
|---|---|---|
| **Standalone HTML Build** | `apps/idle-rpg/dist/index.html` | Bản build độc lập tự chứa toàn bộ tài nguyên hình ảnh, logic và thư viện runtime. |
| **Published Hub Route** | `docs/apps/idle-rpg/index.html` | Phục vụ trực tiếp trên GitHub Pages và nạp vào Interactive Device Simulator. |

---

## 2. Các lệnh thực thi (Commands)

```bash
# Xử lý cắt sprite sheet và xuất atlas trong suốt
npm run assets:process

# Kiểm tra cú pháp và tính toàn vẹn của atlas
npm run test

# Đóng gói sản phẩm hoàn chỉnh ra dist/ và docs/
npm run build

# Chạy server xem thử nghiệm
npm run serve
```

---

## 3. Chi tiết các hàm và lớp trong từng module

### 3.1 `src/game.js` (Phaser 3 Mukbang Scene)
Xây dựng vòng lặp gameplay tương tác kéo thả món ăn và hoạt họa biểu cảm.

- **Hằng số & Cấu hình:**
  - `PHASE`: Máy trạng thái hữu hạn bao gồm: `MUKBANG` (ăn uống), `FOOD_COMA` (no quá ngất xỉu), `ALARM` (chuông báo thức), `WORKOUT` (tập thể dục tiêu hao calo), `RESET` (làm mới).
  - `CHEF_FLOW`: Mảng cấu hình 8 bước nhai nuốt liên hoàn:
    1. `frame: 1, label: 'Mở miệng'` (220ms)
    2. `frame: 2, label: 'Đưa vào'` (220ms)
    3. `frame: 3, label: 'Cắn miếng'` (200ms, cờ cắn `bite: true`)
    4. `frame: 4, label: 'Nhai 1'` (180ms)
    5. `frame: 5, label: 'Nhai 2'` (200ms)
    6. `frame: 6, label: 'Nuốt'` (220ms)
    7. `frame: 7, label: 'Thỏa mãn'` (380ms, cờ cảm xúc `reaction: true`)
    8. `frame: 0, label: 'Sẵn sàng'` (200ms)
  - `LIBRARY`: Thực đơn các món ăn chia theo danh mục: Gà rán (Đùi gà, Cánh gà, Gà cay), Món phụ (Khoai tây, Bơ tươi), Tráng miệng (Sinh tố bơ, Kem bơ), Đồ uống (Nước dừa).
  - `COMMENTS`: Danh sách bình luận ngẫu nhiên cổ vũ của người xem livestream.

- **Lớp `Mukbang extends Phaser.Scene`:**
  - `constructor()`: Khởi tạo scene key `mukbang`, danh mục món ăn ban đầu, điểm calo tích lũy `progress`, số tiền xu `coin`.
  - `preload()`: Tải các atlas và sprite sheet: `people` (khán giả), `chef` (đầu bếp), `coma` (hoạt họa ngất xỉu), `workout` (hoạt họa tập gym), `food` (khay thức ăn).
  - `create()`:
    - Thiết lập camera 540×960px tỉ lệ chuẩn điện thoại dọc (9:16).
    - Tạo phông nền livestream, khung chat hiển thị comment người xem.
    - Vẽ khay chọn món (My Menu Tray) hỗ trợ chuyển đổi danh mục.
    - Đăng ký hệ thống tương tác kéo thả (`pointerdown`, `drag`, `dragend`).
  - `setupChefFlow()`: Quản lý bộ đếm thời gian (timer) để phát lần lượt 8 khung hình biểu cảm của đầu bếp khi nhận món.
  - `handleFeed(item)`:
    - Kiểm tra khoảng cách va chạm giữa tọa độ thả món ăn và miệng của đầu bếp.
    - Nếu hợp lệ: kích hoạt chuỗi nhai nuốt `CHEF_FLOW`, cộng điểm calo, phát âm thanh nhai, tạo hiệu ứng chữ bay `+120 CALORIES` và rung nhẹ camera.
    - Nếu thả trượt ngoài miệng: tween đưa món ăn trở lại vị trí cũ trên khay.
  - `spawnComment()`: Định kỳ tạo bong bóng bình luận ngẫu nhiên bay lên từ khán giả xem stream.
  - `triggerFoodComa()`: Khi thanh calo đạt mức tối đa (`MAX_CALORIES = 600`), chuyển scene sang trạng thái hôn mê vì no (`FOOD_COMA`), yêu cầu người chơi chạm liên tục vào chuông báo thức để đánh thức đầu bếp sang giai đoạn tập luyện (`WORKOUT`).
  - `finish()`: Hiển thị bảng tổng kết phần thưởng (Reward Panel) và nút tải game / xem tiếp (CTA).

---

### 3.2 `tools/process-sprites.js` (Image Processing Pipeline)
Công cụ dòng lệnh sử dụng thư viện `sharp` để xử lý ảnh tự động:
- Đọc `generated_image.png`, `1.png`, `12.png`.
- Tách màu nền (chroma keying / alpha mask) để loại bỏ nền baked không mong muốn.
- Cắt ảnh thành các lưới ô vuông chính xác (grid slicing).
- Ghép và xuất các atlas PNG trong suốt vào thư mục `runtime/`.

---

### 3.3 `tools/validate-atlases.js` (Kiểm tra Asset)
Kiểm tra tính hợp lệ của các file atlas trong `runtime/`:
- Xác nhận kích thước ảnh chia hết cho kích thước frame.
- Đảm bảo kênh màu alpha không bị lỗi biến dạng.

---

### 3.4 `build.js` (Bộ Đồng Bộ & Đóng Gói)
- Đồng bộ bản build từ `dist/index.html` sang thư mục phát hành `docs/apps/idle-rpg/index.html`.
- Thiết lập đường dẫn chuyển hướng tương thích ngược (fallback redirect) từ đường dẫn cũ `ga-ran-bo-gia-dua-non` sang `idle-rpg`.
- Đảm bảo tệp tin sẵn sàng chạy offline từ giao thức `file://` với 0 request mạng ngoài.
