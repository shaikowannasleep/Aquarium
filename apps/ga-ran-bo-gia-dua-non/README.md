# Gà Rán & Bơ Già Dừa Non

Prototype phục vụ món chạy bằng HTML, CSS và JavaScript thuần.

## Commands

```bash
npm run build # tạo dist/index.html độc lập, không request asset ngoài
npm run serve # xem bản source ở http://localhost:8090
npm run test  # build + kiểm tra cú pháp bundle
```

`dist/index.html` được GitHub Pages workflow chép sang
`docs/apps/ga-ran-bo-gia-dua-non/index.html`.

## Gameplay loop

`WaitingForOrder → SelectingItems → ReadyToServe → CheckingOrder → Feedback → NextOrder`

Asset menu và khách được inline vào build dưới dạng data URI. Các manifest
atlas và Spine trong source là tài liệu/scaffold, chưa phải asset runtime.
