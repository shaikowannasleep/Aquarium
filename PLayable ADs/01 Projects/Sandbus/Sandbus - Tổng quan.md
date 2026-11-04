---
type: project-doc
project: Sandbus
source: D:\Threejs\Sandbus (CLAUDE.md, docs/CODE_MAP.md, git log)
updated: 2026-10-31
---
# Sandbus - Tổng quan
Project chính: [[Sandbus]] · Network: [[AppLovin]]

## Đường dẫn
- Studio Three.js: `D:\Threejs\Sandbus`
- Unity gốc (chỉ đọc): `D:\Project\bus\sand-bus`, branch `MergeBranch`. Không dùng clone cũ `D:\Project\sand-bus`.
- Lưu trữ scratch: worktree `D:\Threejs\Sandbus-scratch` (branch `scratch-archive`).

## Tài liệu trong repo
- `docs/CODE_MAP.md` (bản đồ code, tự sinh bằng `npm run map`)
- `docs/map/ATTRIBUTES.md`, `docs/map/SCRIPTS.md`
- `docs/UNITY_SYNC_PLAYBOOK.md` (quy trình đồng bộ Unity)
- Knowledge graph: `graphify-out/`

## File Unity hay dùng
- `Assets/BusRushGameplay/Runtime/Config/Level/LevelConfigSO.cs` (ColorType)
- `Assets/BusRushGameplay/Runtime/Config/ColorData.cs`, `ColorData.asset`
- `Assets/_Game/Level/*.json`, `Assets/BusRushGameplay/Runtime/Gameplay/SandPainting/`

## Luật đã chốt
- [[Sandbus - Luật export]]
- Video hook: chỉ model/sprite/HUD thật của game, cấm mockup; tool `npm run hook:video` (chặn `MOCKUP_BLOCKED`).
- Chỉ dùng model truck/bus `unity-current`, không dùng pack Demo2D.
- Text UI chỉ tiếng Anh.
- Studio mở vào màn chọn level.

## Tiến độ gần nhất (git, 2026-10)
Chuỗi "UA Studio":
- P1-P2 theme tokens, vai trò (ua/ve/dev), tour theo vai trò
- P4 wizard thống nhất `#/ua`, độ khó quyết định số xe
- P6 Ad timeline (Basic) + Flow graph (Expert)
- P7 CTA & screens, auto-redirect store
- P9 Scenario Library + biến thể, xuất hàng loạt
- P10 Video editor: timeline camera/text, xuất MP4 WebCodecs
- P11 Scene view: outline, view cube, game frustum, badge lỗi xe
