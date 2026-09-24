# Gà Rán & Bơ Già Dừa Non

Playable Phaser 3 phong cách live-mukbang, chạy trên Canvas với mục tiêu 60 FPS.

## Commands

```bash
npm run build # tạo dist/index.html độc lập, không request asset ngoài
npm run serve # xem bản source ở http://localhost:8090
npm run test  # build + kiểm tra cú pháp bundle
```

`dist/index.html` được GitHub Pages workflow chép sang
`docs/apps/ga-ran-bo-gia-dua-non/index.html`.

## Gameplay loop

`Vào live → chạm món / giữ đồ uống → EXP + food progress → comment + gift → reward → finished panel`

`generated_image.png` được cắt thành sprite sheet 11×11, inline cùng Phaser
vào bản build. Ông đầu bếp và khách dùng pose-switch/tween để có idle, ăn,
chug, vui và reaction mà không cần Spine runtime. Các manifest atlas và Spine
trong source vẫn là tài liệu/scaffold, chưa phải asset runtime.
