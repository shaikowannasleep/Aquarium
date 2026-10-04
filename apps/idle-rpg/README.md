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

`Mukbang Live → mở My Menu → kéo food/drink vào miệng đầu bếp → animation ăn 8 trạng thái → tăng cảm xúc → comment + gift → reward → finished panel`

`generated_image.png` được bóc nền và đóng lại thành sprite sheet 11×7 cho
nhân vật, món ăn và reaction. `1.png` được cắt thành grid 5×3 cho food/drink;
8 pose đầu bếp trong `12.png` được đóng thành atlas animation riêng.
Lệnh `npm run assets:process` loại nền/viền baked bằng alpha và xuất hai atlas
trong suốt dưới `runtime/`. Hai atlas được inline cùng Phaser vào bản build. Ông đầu bếp và khách dùng
pose-switch/tween để có idle, mở miệng, cắn, nhai, nuốt và reaction mà không
cần Spine runtime. Các manifest atlas và Spine trong source vẫn là tài
liệu/scaffold, chưa phải asset runtime.
