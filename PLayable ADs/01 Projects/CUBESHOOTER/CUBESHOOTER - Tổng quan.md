---
type: project-doc
project: CUBESHOOTER
source: D:\Threejs\CUBESHOOTER (STUDIO_PROGRESS.md, git log)
updated: 2026-10-31
---
# CUBESHOOTER - Tổng quan
Project chính: [[CUBESHOOTER]]

- Unity gốc (chỉ đọc): `D:\Project\cube-territory`. Studio: `D:\Threejs\CUBESHOOTER`.
- Tiến độ chi tiết: `STUDIO_PROGRESS.md` trong repo.
- Lệnh: build `npm run build:fast` (dist/dev.html) · test `node tools/test_all.mjs --jobs 2` · export `node tools/export_cli.mjs --project <file> --networks all`.

## Game
- Launcher bắn đạn màu phá cube cùng màu; slot; booster; launcher hidden/frozen/lock-key/scissors/tunnel; prelose; win/lose.
- Level data: `data/levels/*.json`. Editor gốc: `Assets/_DongPV/LevelEditor` (map ở `docs/unity/LEVEL_EDITOR_TOOL.md`).
- Chưa xác nhận: champagne → magenta trong material Unity (chờ designer).

## Milestone đã xong (M1-M12b)
- Core sim/render/VFX/audio, 20 kịch bản preset, generator có bot verify.
- Export 18 network profile, AppLovin mặc định.
- Capture: PNG 1080×1920, WebM, storyboard, biến thể CTA, tỉ lệ 9:16/1:1/4:5/16:9.
- Tối ưu asset: ironSource lớn nhất 4.78 → 4.21 MB, zip 3.35 → 2.92 MB.
- Gần nhất (git): frozen cube dùng `M_Frozen_Shooter`, outline launcher, slot/hole theo material Unity.
