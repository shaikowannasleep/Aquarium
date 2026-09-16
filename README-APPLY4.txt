AQUARIUM — README SVG: 3 DAN CA NHO + CUNG DIEN CARTOON DUOI THUY CUNG
======================================================================

PACKAGE
=======
Project:            Aquarium monorepo
Scope:              README SVG artwork (apps/aquarium) — dan ca nho, background cung dien
Update type:        feature
Version:            v1
Source repository:  https://github.com/shaikowannasleep/Aquarium
Source branch:      main
Base commit:        1af01732bbc9963ad7d5f3f8d0d13bd48af1126c  "Update aquarium.svg"
Affected app:       apps/aquarium only. Lumen va Abyssal Dive KHONG bi dong toi.


YEU CAU GOC
============
1. Giu nguyen phan canh phia duoi (san ho, rong bien, ca ngua, cua, tom).
2. Phia tren la tung dan ca nho, boi cham, boi theo dan, khoang 10 con moi dan.
3. Ba dan, boi tu trai sang phai roi bien mat, sau do lat nguoc chieu boi lai.
4. Khung canh that chill.
5. Doi background SVG sang kieu cung dien duoi thuy cung, do hoa cartoon.


DA LAM GI
==========
KHONG sua truc tiep docs/aquarium.svg. File do la OUTPUT sinh ra tu generator,
va workflow ".github/workflows/aquarium.yml" chay cron moi 6 gio se ghi de mat.
Moi thay doi nam o generator, sau do bake lai ca 3 ban SVG public.

1. Ba dan ca nho (SCHOOLS)
   - Them const SCHOOLS trong apps/aquarium/tools/bake-svg.js:
       blue_tang      "azure school"    y=72   26s
       yellow_tang_v2 "sunbeam school"  y=116  30s
       clownfish_v2   "coral school"    y=158  34s
   - Moi dan dung 10 con, xep doi hinh co dinh (2 hang x 5 cot, so le nhe) nen
     ca di chuyen nhu MOT dan chu khong phai 10 con roi rac.
   - Moi con co animation bob doc rieng, lech pha, de dan khong bi cung nhac.
   - Toc do cham (26-34s cho tron mot chu ky) de giu cam giac chill.

2. Doi chieu khi da ra ngoai khung
   - Moi dan gom 2 "leg": outbound (scale -1 1, trai -> phai) va inbound
     (scale 1 1, phai -> trai).
   - Hai diem dau/cuoi deu nam NGOAI khung 880px (left=-260, right=1040), nen
     khoanh khac quay dau khong bao gio lot vao tam nhin.
   - opacity dung calcMode="discrete" (1;0 va 0;1) => chuyen trang thai dut
     khoat luc dang o ngoai khung, khong con hieu ung mo dan giua khung.

3. Dan ca hien ngay tu FRAME DAU  (quan trong)
   - Van de o ban dau tien: ca 3 dan deu bat dau voi opacity="0" o ngoai khung,
     nen anh tinh render ra KHONG thay con ca nao.
   - Cach xu ly:
       a) "begin" AM (-4.94s / -7.80s / -12.92s) de tua timeline SMIL toi truoc,
          dan ca da dang o giua chang ngay khi SVG duoc ve lan dau.
       b) Dat san thuoc tinh TINH opacity="1" + transform="translate(x 0)" khop
          voi vi tri ma animation se toi o dung thoi diem do. Renderer nao bo
          qua SMIL (vi du anh raster GitHub cache) van thay du 3 dan.
   - Ba dan lech pha nen trai deu ngang khung: x = 234 / 416 / 728.

4. Background cung dien cartoon (cartoonPalace)
   - Ve bang path SVG thuan, khong them file anh moi, khong tang dung luong dang ke.
   - Gom: 2 thap ben, 2 khoi trung gian, sanh trung tam, cong vom, cua so phat
     sang, vien mai, be nen phia truoc.
   - Dat NGAY TRUOC coralAndHabitat() nen da/rong/san ho van phu len phia truoc
     => cung dien nam dung o hau canh duoi day bien.

5. Go bo dan sinh vat lon o tang nuoc tren
   - Bo 2 rua, 2 ca heo, 1 ca map ra khoi ROSTER de nhuong cho cho 3 dan ca nho.
   - ROSTER con 11: 6 ca ngua + 3 cua + 2 tom (toan bo phan canh duoi giu nguyen).
   - Caption duoi goc trai cap nhat theo noi dung moi.

6. Nhung README hien thi anh
   - README.md truoc day KHONG he nhung aquarium.svg. Da them block <img> can
     giua, tro toi docs/aquarium.svg, co link sang trang GitHub Pages.


CHANGED FILES
==============
MODIFIED — generator (nguon that su)
  apps/aquarium/tools/bake-svg.js      (+98 / -9)
  tools/bake-svg.js                    (+248 / -527)  dong bo tu ban tren

MODIFIED — test
  apps/aquarium/test/headless.js       (+30 / -28)
  test/headless.js                     (+30 / -28)

REGENERATED OUTPUT (bake ra, khong sua tay)
  docs/aquarium.svg
  docs/apps/aquarium/aquarium.svg
  apps/aquarium/docs/aquarium.svg

MODIFIED — tai lieu
  README.md                            (+6 / -0)


LUU Y VE tools/bake-svg.js O ROOT
==================================
Truoc package nay, root tools/bake-svg.js va apps/aquarium/tools/bake-svg.js la
HAI generator KHAC NHAU:
  - apps/aquarium/... : ban "directed roster" dang dung, sinh ra SVG hien tai.
  - tools/...         : ban cu chay boids + animateMotion, da khong con khop.
Ca hai deu duoc goi boi workflow (pages.yml dung ban app, aquarium.yml dung ban
root). De tranh tinh trang cron ghi de mat artwork moi, root da duoc dong bo
thanh ban sao cua generator trong app. Day la ly do numstat cua file root lon.


VERIFICATION DA CHAY TRUOC KHI DONG GOI
========================================
Khong chi review bang mat — da render tinh va assert tren chinh output:

  [x] XML hop le:   ET.fromstring() pass tren ca 3 file SVG.
  [x] 3 ban SVG public giong het nhau, byte-for-byte.
  [x] Render tinh frame 0 bang cairosvg: THAY DU 3 DAN CA.
  [x] Vi tri frame 0: x = 234 / 416 / 728, deu nam tron trong khung 880px,
      khong dan nao bi cat mep.
  [x] Khong co <script> trong SVG.
  [x] Kich thuoc SVG 286.8 KB — giam so voi 310 KB cua ban truoc do.
  [x] node --check pass tren moi file .js da cham vao.
  [x] node apps/aquarium/test/headless.js  =>  ALL CHECKS PASSED

Test da duoc sua cho dung muc dich:
  - Check cu hardcode dur="22s"/"28s" nen fail ngay khi doi toc do. Nay doc tu
    SCHOOLS metadata.
  - THEM 2 check moi bam dung yeu cau lan nay:
      "every school is painted at frame 0"
      "no school is clipped by the frame at frame 0"
    Da xac nhan 2 check nay THUC SU bat loi (cho fail trên ban dau tien), khong
    phai check trang tri.


DIEM CAN BIET — 1 TEST DO CO SAN, KHONG PHAI DO PACKAGE NAY
============================================================
  node test/headless.js   (harness o ROOT)
     FAIL  local order rises above 0.6 on every seed   worst 0.489, best 0.705

Da kiem chung: checkout sach commit 1af0173 (chua co bat ky thay doi nao cua
package nay) roi chay lai => RA DUNG CUNG CON SO worst 0.489 / best 0.705.
=> Day la loi CO SAN tu truoc, KHONG phai do thay doi lan nay gay ra.

Nguyen nhan: test/ o root nap src/engine.js o root, trong khi
apps/aquarium/src/engine.js da duoc tune lai tu dot fix boid truoc do (package
"boid declutter + smooth lure") ma ban root chua duoc dong bo theo.

Da CO Y khong dung vao, vi nam ngoai pham vi yeu cau lan nay va viec sua engine
root co the lam thay doi hanh vi canvas. Neu muon xu ly triet de, hay yeu cau
rieng "dong bo engine root theo apps/aquarium".


BACKUP TRUOC KHI APPLY
=======================
$Repo   = "D:\Dungvd\Aquarium"
$Stamp  = Get-Date -Format "yyyyMMdd-HHmmss"
$Backup = "D:\Dungvd\Backups\Aquarium-readme-svg-$Stamp"
New-Item -ItemType Directory -Force -Path $Backup | Out-Null

Copy-Item "$Repo\apps\aquarium\tools\bake-svg.js"  "$Backup\bake-svg.app.js.before"       -ErrorAction SilentlyContinue
Copy-Item "$Repo\tools\bake-svg.js"                "$Backup\bake-svg.root.js.before"      -ErrorAction SilentlyContinue
Copy-Item "$Repo\apps\aquarium\test\headless.js"   "$Backup\headless.app.js.before"       -ErrorAction SilentlyContinue
Copy-Item "$Repo\test\headless.js"                 "$Backup\headless.root.js.before"      -ErrorAction SilentlyContinue
Copy-Item "$Repo\docs\aquarium.svg"                "$Backup\aquarium.svg.before"          -ErrorAction SilentlyContinue
Copy-Item "$Repo\README.md"                        "$Backup\README.md.before"             -ErrorAction SilentlyContinue

Write-Host "Backup created: $Backup"


APPLY
=====
1. Giai nen ZIP nay.
2. Mo thu muc vua giai nen.
3. Copy TOAN BO NOI DUNG ben trong vao thu muc goc repo:
       D:\Dungvd\Aquarium
   (ZIP giu nguyen cau truc relative path, nen chi can ghi de tai root.)
4. Chon "Replace the files in the destination" khi duoc hoi.
5. File README-APPLY.txt nay co the xoa sau khi apply xong, khong can commit.


POWERSHELL SAU KHI GHI DE
==========================
cd D:\Dungvd\Aquarium

git status
git branch --show-current
git log -1 --oneline

node --check apps\aquarium\tools\bake-svg.js
node --check tools\bake-svg.js
node --check apps\aquarium\test\headless.js

node apps\aquarium\test\headless.js

# ZIP da kem san SVG bake ra roi. Chi chay lai neu muon tu xac nhan,
# hoac sau khi ban chinh them SCHOOLS / cartoonPalace:
node apps\aquarium\tools\bake-svg.js shaikowannasleep

git diff --check
git status


LOCAL PREVIEW
==============
python -m http.server 8090 -d docs

Mo:
  http://localhost:8090/aquarium.svg              (xem rieng file SVG)
  http://localhost:8090/apps/aquarium/            (trang playable)

Kiem tra README se hien the nao:
  mo truc tiep README.md bang trinh preview Markdown cua VS Code.


TIEU CHI KIEM TRA
==================
[ ] NGAY KHI MO (chua doi giay nao): thay du 3 dan ca nho o tang nuoc phia tren.
[ ] Khong dan nao bi cat o mep trai/phai luc vua mo.
[ ] Moi dan khoang 10 con, giu doi hinh, boi CHAM.
[ ] Dan boi het sang mot ben, BIEN MAT HAN ngoai khung, roi moi quay dau.
[ ] KHONG thay khoanh khac lat huong xay ra giua khung hinh.
[ ] Ba dan lech pha nhau, khong cung luc bien mat het.
[ ] Cung dien cartoon nam o hau canh, phia sau da va rong bien.
[ ] San ho, rong bien, ca ngua, cua, tom phia duoi GIU NGUYEN nhu cu.
[ ] Khong con rua / ca heo / ca map o tang nuoc tren.
[ ] README.md hien thi duoc anh aquarium.


ROLLBACK
=========
cd D:\Dungvd\Aquarium
git checkout -- README.md apps\aquarium\tools\bake-svg.js tools\bake-svg.js apps\aquarium\test\headless.js test\headless.js docs\aquarium.svg docs\apps\aquarium\aquarium.svg apps\aquarium\docs\aquarium.svg

Hoac khoi phuc tay tu thu muc $Backup o buoc BACKUP ben tren.


KHONG DUOC LAM
===============
- KHONG sua tay docs/aquarium.svg, docs/apps/aquarium/aquarium.svg hay
  apps/aquarium/docs/aquarium.svg. Chung la OUTPUT. Sua o
  apps/aquarium/tools/bake-svg.js roi bake lai.
- KHONG xoa thuoc tinh tinh opacity="1" / transform="translate(...)" tren cac
  <g> cua dan ca. Do chinh la thu giu cho ca hien duoc tren anh tinh cua GitHub.
- KHONG doi start >= 0.5 trong SCHOOLS. Qua 0.5 la dan da sang chang ve, nen
  frame dau se lai khong thay ca.
- KHONG dung animateMotion hay rotate="auto" cho dan ca — cac dot truoc da bo
  chung vi gay xoay/bop meo sprite.
- KHONG dung toi apps/lumen-playable/* va apps/abyssal-dive/*.
- KHONG commit/push ho. Thay doi dang de o working tree cho ban tu review.
