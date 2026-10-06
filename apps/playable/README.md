# DinDun Playable Ads Hub (Interactive Device Simulator)

Hub trình diễn và giả lập thiết bị di động (Interactive Device Simulator) chuyên dụng cho các sản phẩm Playable Ads (HTML5 / WebGL / Unity Luna). 
Hệ thống cho phép nhà phát triển và nhà tuyển dụng xem thử nghiệm các phiên bản playable ad trên khung mô phỏng các thiết bị di động thực tế (iPhone, iPad, Android Phone), hỗ trợ chuyển đổi xoay ngang/dọc, đo lường kích thước, và tích hợp cơ chế bảo vệ mã nguồn độc quyền (Security Shield / Anti-Ripping).

---

## 1. Đầu ra (Project Outputs)

| Tệp đầu ra | Đường dẫn | Chức năng |
|---|---|---|
| **Hub Viewer Page** | `apps/playable/index.html` | Trang web giả lập khung thiết bị tương tác hoàn chỉnh, tải iframe các bản build playable trực tiếp từ thư mục danh mục. |
| **Catalog Data** | `apps/playable/config.js` | Cơ sở dữ liệu danh mục trò chơi, danh sách phiên bản, và cấu hình hiển thị. |
| **Controller Logic** | `apps/playable/script.js` | Điều khiển tìm kiếm, lọc danh mục, nạp game vào iframe, và kích hoạt lá chắn bảo mật. |

---

## 2. Cấu trúc thư mục

```text
apps/playable/
├── config.js              # Cấu hình danh mục game, tiêu đề hub, đường dẫn build
├── script.js              # Logic GameListManager, UI controls, và Security Shield
├── style.css              # Giao diện responsive, dark mode, thiết kế khung điện thoại
├── index.html             # Khung trang chính và modal lộ trình (Roadmap Modal)
├── device/                # Thành phần khung viền giả lập thiết bị (bezel, notch, controls)
└── playable/category/     # Thư mục lưu trữ các bản build HTML độc lập theo danh mục
```

---

## 3. Chi tiết các tệp, lớp và hàm

### 3.1 `config.js` (`APP_CONFIG`)
Định nghĩa cấu hình trung tâm của Hub:
- `title`: Tiêu đề chính hiển thị ở thanh đầu trang (`'DinDun Playable Ads Hub'`).
- `subtitle`: Phụ đề mô tả công nghệ (`'Interactive Device Simulator · Unity Luna & HTML5 WebGL'`).
- `credit`: Ghi nhận nguồn cảm hứng kiến trúc previewer (`minhtq.dev`).
- `stats`: Cấu hình thanh thống kê số lượng trò chơi và số lượng phiên bản build (`gamesLabel`, `versionsLabel`).
- `paths.directPrefix`: Tiền tố đường dẫn tới thư mục lưu trữ build (`'./playable/category'`).
- `defaultCategory`: Thẻ phân loại mặc định khi mở hub (`'all'`).
- `categories`: Mảng các danh mục lọc: `all` (Tất cả), `playable` (Playable Ads), `casual` (Casual Games), `puzzle` (Câu đố), `action` (Hành động), `simulation` (Mô phỏng).
- `games`: Danh mục các tựa game với cấu trúc:
  - `folder`: Tên thư mục chứa bản build.
  - `name`: Tên hiển thị của trò chơi.
  - `category`: Khóa danh mục.
  - `versions`: Mảng các phiên bản có sẵn (ví dụ: `['v1', 'v2']`).

---

### 3.2 `script.js` (`GameListManager`)
Lớp điều khiển chính của toàn bộ Hub.

- **Khởi tạo & Giao diện:**
  - `constructor(config)`: Nhận cấu hình `APP_CONFIG`, sao chép danh sách trò chơi, khởi tạo trạng thái lọc và ánh xạ các phần tử DOM.
  - `init()`: Kích hoạt lần lượt: `renderHeader()`, `renderStats()`, `renderCategoryFilters()`, `setupEventListeners()`, `setupSecurityShield()`, `applyFilters()`, và tự động nạp trò chơi đầu tiên trên giao diện máy tính để bàn (Desktop).
  - `renderHeader()`: Điền tiêu đề, phụ đề vào thanh header và cập nhật thẻ `document.title`.
  - `getTotals(games)`: Tính tổng số trò chơi và tổng số phiên bản build hiện có.
  - `renderStats()`: Kết xuất các huy hiệu thống kê (stat-chips) số lượng game và build lên giao diện.

- **Bộ lọc & Tìm kiếm:**
  - `countByCategory(key)`: Đếm số lượng trò chơi thuộc danh mục `key`.
  - `getCategory(key)`: Lấy đối tượng định nghĩa danh mục từ cấu hình.
  - `getCategoryLabel(key)`: Lấy nhãn hiển thị thân thiện của danh mục.
  - `renderCategoryFilters()`: Tạo động danh sách các nút chuyển tab danh mục kèm bộ đếm số lượng game trên mỗi tab.
  - `applyFilters()`: Lọc danh sách trò chơi theo cả hai tiêu chí: danh mục được chọn (`currentCategory`) và từ khóa tìm kiếm (`currentSearch`).
  - `renderResultCount()`: Cập nhật dòng chữ hiển thị kết quả (ví dụ: `5/5 games · 5 builds`).
  - `renderGames()`: Kết xuất danh sách các thẻ bài trò chơi (game cards) ra lưới hiển thị (`gamesGrid`).
  - `createGameCard(game)`: Sinh mã HTML cho từng thẻ game, bao gồm tên trò chơi, nhãn phân loại và các nút bấm tương ứng với từng phiên bản build (`v1`, `v2`).

- **Bộ nạp game & Tương tác:**
  - `isMobile()`: Nhận diện xem người dùng đang truy cập bằng trình duyệt di động hay không (thông qua `max-width: 900px` và Regex User-Agent).
  - `playVersion(path, key)`: 
    - Nếu là thiết bị di động: Mở bản build trực tiếp trong tab mới (`window.open`).
    - Nếu là máy tính: Gọi `window.deviceApi.load(path)` để nạp tệp HTML vào khung iframe mô phỏng thiết bị, ẩn màn hình chờ (`stageEmpty`).
  - `markActiveVersion()`: Tô sáng nút phiên bản và thẻ game đang được phát trong simulator.

- **Lá chắn bảo mật (`setupSecurityShield`):**
  - Vô hiệu hóa menu chuột phải (`contextmenu` event).
  - Chặn phím tắt mở DevTools của trình duyệt: `F12`, `Ctrl+Shift+I`, `Ctrl+Shift+J`, `Ctrl+Shift+C`.
  - Chặn phím tắt xem mã nguồn hoặc lưu trang: `Ctrl+U`, `Ctrl+S`.
