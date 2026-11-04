---
type: project-doc
project: Sandbus
source: D:\Threejs\Sandbus\CLAUDE.md
---
# Sandbus - Luật export
Liên quan: [[Sandbus - Tổng quan]] · [[AppLovin]]

- HTML inline thuần, không AES/gzip loader (vỡ preview iOS).
- Config trong HTML dựng từ `shippedProject()` (`src/export/painting-payload.js`), whitelist `SHIPPED_PROJECT_KEYS`. Cấm spread nguyên `project`.
- Key mới mặc định KHÔNG ship; chỉ thêm whitelist khi runtime player đọc key đó.
- Lý do: `editorState` (0.7-1.5 MB) từng lọt vào export. Test: `npm run test:export-no-editor-state`.
- Thêm field mới vào project/level: so dung lượng export trước/sau.
- Option bật trong editor phải có trong HTML export (từng thiếu BGM).
