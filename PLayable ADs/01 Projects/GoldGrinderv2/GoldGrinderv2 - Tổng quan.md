---
type: project-doc
project: GoldGrinderv2
source: D:\Threejs\GoldGrinderv2 (CLAUDE.md, README.md, git log)
updated: 2026-10-31
---
# GoldGrinderv2 - Tổng quan
Project chính: [[GoldGrinderv2]]

- Game: Gold Grinder (Collect Master) của Horus. Unity gốc (chỉ đọc): `D:\Project\coin-collector`.
- Studio: `D:\Threejs\GoldGrinderv2` (Gold Grinder Studio), một file HTML `GoldGrinderStudio.html` chạy offline trên Chrome/Edge. Bàn giao 2026-10-05.
- Hướng dẫn đầy đủ: `README.md` trong repo.

## Tính năng (theo README)
- Sắp xếp stage: 75 stage gốc (lưới 11 cột × 23-46 hàng), 564 máy đặt sẵn, 20 loại máy, ống thả chip, máy nghiền. Schema stage Unity v23 (đọc v18/v22/v23).
- Chơi thử: chip vật rắn 3D bằng Rapier 3D (wasm), thuật toán máy đọc từ C#.
- Phân tích: bot chơi nhiều lần, thời gian, tiền/phút, chip kẹt, heatmap, độ khó.
- Sinh stage: 6 ứng viên từ thông số + seed, tự kiểm hợp lệ.
- Xuất playable: 15 mạng quảng cáo, preflight, bảng dung lượng. File tool khoảng 9 MB (giới hạn 10 MB).

## Giới hạn đã ghi trong README
- Chưa có mạng quảng cáo thật nào chấp nhận file; mới test bằng mock.
- Mô phỏng không phải PhysX, chưa khớp từng byte với game.
- Stage sửa không ghi ngược vào Unity.

## Luật UI (CLAUDE.md)
- Người dùng là game designer / video editor: nhãn dễ hiểu, ít thao tác, mọi thao tác hoàn tác được.
- Đã bỏ hẳn layout docking kiểu Unity, không thêm lại.
- Tra code: `.codemap/` (`npm run cm:find`), graphify.
