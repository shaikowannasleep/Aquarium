# Khung năng lực Playable Developer — giải thích theo từng cấp độ

> Tài liệu này chuyển nội dung khung năng lực thành bảng tra cứu dễ hiểu: mỗi năng lực có định nghĩa, mô tả riêng cho Level 1–5 và bằng chứng nên dùng khi đánh giá. Mức đánh giá nên căn cứ vào kết quả làm việc lặp lại và bằng chứng thực tế, không chỉ dựa trên tự nhận xét.
>
> **Cách đọc cấp độ:** L1 = làm theo hướng dẫn; L2 = tự thực hiện tác vụ cơ bản; L3 = làm độc lập, giải quyết trọn vẹn phần việc; L4 = xây dựng giải pháp/công cụ dùng chung; L5 = định hướng, chuẩn hóa và dẫn dắt cấp studio. Cấp độ sau bao hàm năng lực cấp trước và có phạm vi ảnh hưởng rộng hơn.

## F1 — Kỹ thuật Game & Lập trình nền tảng

| Mã / năng lực | Định nghĩa | Level 1 — Cơ bản | Level 2 — Tự thực hiện | Level 3 — Thành thạo | Level 4 — Dẫn dắt giải pháp | Level 5 — Định hướng studio | Bằng chứng đánh giá gợi ý |
|---|---|---|---|---|---|---|---|
| **F1.1 Lập trình Unity C# & Core Engine** | Viết C# tinh gọn, sử dụng Unity lifecycle/UI, hiểu giới hạn runtime web và tìm nguyên nhân vấn đề hiệu năng/build. | Nắm cú pháp và Awake/Start/Update; dựng UI, di chuyển vật thể theo mẫu; còn phụ thuộc code mẫu và chưa nhận diện allocation trong loop. | Viết code rõ ràng, dùng Event/Action; tự xử lý Vector/Quaternion và tween cơ bản; tránh Find/GetComponent lặp trong Update và một số anti-pattern WebGL. | Thiết kế module gameplay; dùng Unity Profiler và Chrome DevTools xác định Canvas rebuild, overdraw, GC; dùng pooling và hạn chế LINQ, boxing, reflection. | Tạo controller/UI reusable; hiểu luồng C# sang JS/WASM và loại module Unity thừa; viết Editor Tool validate hierarchy/Raycast Target trước export. | Đặt coding convention và engine setup toàn studio; xử lý bug khác biệt V8/WebKit; chuẩn hóa framework nhẹ, tái sử dụng và hạn chế rủi ro runtime. | Source module sạch; profiler trước/sau; bằng chứng FPS mục tiêu; phân tích bug/memory; Editor Tool và tài liệu chuẩn. |
| **F1.2 Phân tích kịch bản Gameplay & Game Feel** | Chuyển storyboard/creative brief thành gameplay loop và tinh chỉnh nhịp độ, phản hồi, cảm giác tương tác. | Đọc storyboard và làm đúng tương tác được giao; chưa chủ động chỉnh nhịp, độ nảy hoặc lựa chọn tech-stack. | Bóc tách flow/thắng-thua; tự chỉnh animation/tween cơ bản; tiếp cận kỹ thuật tương tác cơ bản. | Tự hoàn thiện loop từ ý tưởng thô; xử lý gesture/touch responsiveness; polish juice, screenshake, particles và micro-interaction, nhất là hook đầu. | Vận dụng UX/tâm lý tương tác, pacing và difficulty curve để tăng khả năng người chơi đi đến end card. | Đặt chuẩn Game Feel/Interactive UX cho studio; tư vấn giải pháp tương tác mới theo xu hướng thị trường. | Tài liệu flow; video trước/sau polish; demo tương tác; phản hồi UA/Creative. |
| **F1.3 Thiết kế kiến trúc Game & State Machine** | Tổ chức Data/Presentation, FSM và component để code dễ mở rộng, bảo trì, tái sử dụng. | Hiểu state cơ bản; làm theo cấu trúc có sẵn nhưng logic dồn file và hardcode nhiều cờ. | Tổ chức component; dùng pattern cơ bản như Singleton/State và Event/Action giảm phụ thuộc UI-gameplay. | Tự thiết kế FSM hoàn chỉnh Intro/Tutorial/Playing/Win/Lose/End-card; module rõ, bảo trì được. | Xây reusable gameplay framework; tách Data/View; kiến trúc data-driven đổi flow mà ít sửa code. | Chuẩn hóa framework/pattern toàn công ty; thiết kế micro-architecture tối ưu cho playable. | Sơ đồ kiến trúc/FSM; source framework mẫu; hướng dẫn áp dụng và ví dụ playable sử dụng. |
| **F1.4 Web Runtime, JavaScript Bridge & WebGL** | Chuyển Unity sang web; giao tiếp JS/browser; tối ưu loader, memory, bundle và runtime trên thiết bị yếu. | Nhận biết cấu trúc HTML/JS/WASM; gọi bridge mẫu hoặc script theo hướng dẫn; chưa sửa template/loader. | Viết jslib truyền primitive một chiều; chỉnh template/loading/resize cơ bản; hiểu nguy cơ heap lớn gây OOM mobile. | Làm bridge hai chiều, quản lý string/pointer và giải phóng bộ nhớ; cấu hình build/compression; xử lý audio unlock và mobile focus. | Tinh gọn loader/glue-code, serialization; phân tích bundle Engine/WASM/asset; tối ưu render và đạt mục tiêu FPS trên thiết bị cũ. | Tự động hóa custom template/post-process/đóng gói theo size target; xử lý context lost và khác biệt WebView; chuẩn hóa bridge/loader studio, chuyển phần phù hợp sang DOM/WebAudio. | Thư viện bridge không leak; template nhẹ; post-process script; số liệu memory/loading trên thiết bị thấp cấu hình; chuẩn bridge dùng chung. |

## F2 — Phân phối Web & Chuẩn Ad Tech

| Mã / năng lực | Định nghĩa | Level 1 — Cơ bản | Level 2 — Tự thực hiện | Level 3 — Thành thạo | Level 4 — Dẫn dắt giải pháp | Level 5 — Định hướng studio | Bằng chứng đánh giá gợi ý |
|---|---|---|---|---|---|---|---|
| **F2.1 MRAID & Tuân thủ kỹ thuật Ad Network** | Tích hợp CTA/store redirect, MRAID và tuân thủ packaging/spec của từng mạng quảng cáo. | Xuất playable bằng template và gọi store cơ bản theo mẫu; chưa hiểu sâu MRAID. | Tích hợp tracker/CTA cho 1–2 network; đóng gói HTML/ZIP theo hướng dẫn. | Làm chủ MRAID ready/viewability/open và single HTML theo spec nhiều network. | Xây wrapper tự chọn network spec/dynamic injection; xử lý iframe sandbox, autoplay và edge case. | Thiết lập pipeline headless/dynamic injection cấp studio; theo dõi thay đổi policy/API ngành. | Kết quả validator/previewer; API wrapper; danh mục network/spec và test case. |
| **F2.2 Unity-to-Playable Exporters & Đóng gói Web** | Vận hành/tùy biến exporter và tối ưu quy trình đóng gói asset/code cho web. | Dùng Luna/plugin mặc định theo hướng dẫn, không tự đổi cấu hình. | Chọn scene/lọc asset; xử lý lỗi exporter cơ bản. | Tùy biến build, bỏ file thừa và đóng gói inline/single-file theo yêu cầu. | Viết post-process inject tracker, minify/nén và đóng package theo từng sàn. | Phát triển/tinh chỉnh sâu exporter/pipeline; cân nhắc renderer web riêng khi cần siêu nhẹ. | Script build; config exporter; hướng dẫn đóng gói và build mẫu đã kiểm chứng. |

## F3 — Hiệu năng & Ép dung lượng

| Mã / năng lực | Định nghĩa | Level 1 — Cơ bản | Level 2 — Tự thực hiện | Level 3 — Thành thạo | Level 4 — Dẫn dắt giải pháp | Level 5 — Định hướng studio | Bằng chứng đánh giá gợi ý |
|---|---|---|---|---|---|---|---|
| **F3.1 Tối ưu Memory, Startup & FPS** | Profiling RAM/heap, startup, draw calls và CPU/GPU để giảm lag, giữ FPS mục tiêu. | Nhận biết tụt FPS và xem FPS cơ bản; chưa dùng profiler chuyên sâu. | Giảm draw calls bằng atlas/layering; đạt mục tiêu FPS trên thiết bị tầm trung. | Dùng Memory Profiler/Chrome Timeline; xử lý hitch đầu quảng cáo và giữ FPS mục tiêu trên thiết bị yếu. | Giảm overhead runtime, reflection/LINQ/GC; shader nhẹ và zero-allocation ở loop chính khi phù hợp. | Đặt performance budget toàn studio và giải quyết bottleneck runtime trên nhiều cấu hình. | Profiler/FPS/draw-call report; heap theo thời gian; checklist phát hành. |
| **F3.2 Nén tài nguyên & Tối ưu Build Size** | Phân tích và nén texture/audio/font/mesh/code stripping để đạt giới hạn dung lượng network. | Xem dung lượng và giảm texture thủ công khi được hướng dẫn. | Chọn compression texture/audio phù hợp; giữ build trong ngưỡng mục tiêu phổ biến. | Đạt size spec theo build thật; tối ưu font/mesh/animation và strip module không dùng. | Xây preset import chuẩn; thay texture nặng bằng asset procedural/vector phù hợp. | Tạo CI phân tích dung lượng theo commit và cảnh báo regression; tối ưu liên tục. | Báo cáo size breakdown; preset; asset procedural/vector; CI report/cảnh báo. |

## F4 — Kiểm thử, Debug & Ổn định Production

| Mã / năng lực | Định nghĩa | Level 1 — Cơ bản | Level 2 — Tự thực hiện | Level 3 — Thành thạo | Level 4 — Dẫn dắt giải pháp | Level 5 — Định hướng studio | Bằng chứng đánh giá gợi ý |
|---|---|---|---|---|---|---|---|
| **F4.1 Debug WebGL, DevTools & lỗi biên** | Dùng DevTools/remote debugging để chẩn đoán lỗi runtime trên browser/WebView. | Đọc stack trace Unity; xem console Chrome desktop. | Remote debug Android/iOS; xử lý lỗi audio unlock cơ bản. | Tự xử lý context lost, OOM iOS/WebKit, safe-area/resolution issues. | Điều tra leak DOM/Canvas và xây local MRAID mock test cho ca khó. | Thiết lập chẩn đoán, hotfix, incident response và post-mortem toàn studio. | Nhật ký sự cố; video remote debug; mock test; post-mortem và hướng dẫn xử lý. |
| **F4.2 QA đa nền tảng & tự động hóa** | Kiểm thử trên thiết bị/WebView, mạng giả lập và tự động hóa end-to-end. | Test thủ công desktop, bấm CTA kiểm tra cơ bản. | Test Android/iOS thật bằng preview; kiểm responsive màn hình phổ biến. | Vận hành ma trận Android WebView/iOS WKWebView/tablet/foldable và throttle mạng. | Tạo debug overlay (FPS, phase, CTA, win/lose), acceptance checklist cho QA/UA. | Xây headless/automated QA giả lập touch, first paint, audio, CTA; quản trị pass criteria. | Device QA matrix; overlay; checklist nghiệm thu; CI/test logs và kết quả lặp lại. |

## F5 — Hợp tác UA & Video Creative

| Mã / năng lực | Định nghĩa | Level 1 — Cơ bản | Level 2 — Tự thực hiện | Level 3 — Thành thạo | Level 4 — Dẫn dắt giải pháp | Level 5 — Định hướng studio | Bằng chứng đánh giá gợi ý |
|---|---|---|---|---|---|---|---|
| **F5.1 Phối hợp UA & tối ưu chuyển đổi** | Dùng chỉ số tiếp thị và thử nghiệm để cải thiện gameplay/funnel/conversion. | Làm theo storyboard; chưa hiểu chỉ số marketing. | Góp ý kịch bản; hiểu CTR/CVR/IPM/drop-off và hỏi mục đích mechanic. | Đọc dashboard, đề xuất thay đổi hook/CTA và dùng dữ liệu giảm drop-off. | Thiết kế tracking sự kiện, phối hợp A/B test và rút insight creative. | Định hình data-driven playable development và concept theo xu hướng/ROI cùng Marketing. | A/B report; funnel; tracking schema; case study cải thiện chỉ số có baseline. |
| **F5.2 Phối hợp hai chiều với Video Creative** | Cùng Creative chuyển winning video/ý tưởng thành trải nghiệm playable khả thi. | Nhận mockup và triển khai đúng mô tả; ít phản hồi feasibility. | Làm rõ storyboard, tư vấn hiệu ứng và tái sử dụng asset. | Đồng sáng tạo interactive storyboard/mechanic phù hợp ngân sách và UX. | Dẫn dắt chuẩn asset handoff/framework chuyển concept video thành playable nhanh. | Định hình mô hình phối hợp Dev-Creative toàn studio, nâng chất lượng và tốc độ chiến dịch. | Biên bản phối hợp; storyboard chung; asset handoff guide; playable/case study thành công. |

## F6 — Ứng dụng AI & Tự động hóa

| Mã / năng lực | Định nghĩa | Level 1 — Cơ bản | Level 2 — Tự thực hiện | Level 3 — Thành thạo | Level 4 — Dẫn dắt giải pháp | Level 5 — Định hướng studio | Bằng chứng đánh giá gợi ý |
|---|---|---|---|---|---|---|---|
| **F6.1 Sử dụng AI tối ưu năng suất** | Dùng AI để tra cứu, sinh/refactor code và giải quyết vấn đề, đồng thời kiểm chứng kết quả. | Dùng AI tra cứu cú pháp, viết hàm đơn giản/comment; quy trình còn thủ công. | Dùng AI chuyển C# sang JS/TS, tạo mock data/regex; tự debug và xác minh kết quả. | Phân định rõ việc AI làm boilerplate/shader/script và Dev kiểm soát kiến trúc, memory, edge cases; viết prompt kỹ thuật tốt. | Xây prompt library/custom assistant cho playable; AI hỗ trợ review/optimization và tăng năng suất team. | Tích hợp AI vào kỹ thuật toàn studio; xây văn hóa, đào tạo và dẫn dắt đội ngũ. | Prompt/instructions; PR hoặc module có lịch sử review; test kết quả; đo thời gian/chất lượng trước-sau. |
| **F6.2 AI trong tự động hóa sản xuất** | Tích hợp AI/automation vào tạo variants, dynamic config, localization và nhân bản playable quy mô lớn. | Dùng script/tool sẵn để export; đổi text/màu thủ công theo hướng dẫn. | Dùng AI/tool tạo variant đơn giản hoặc dịch text; đóng gói theo checklist. | Thiết kế JSON/ScriptableObject dynamic config; tích hợp AI sinh localization và kiểm tra đầu ra. | Xây Editor Tool/CLI sinh nhiều variants không cần rebuild Unity; tự động hóa asset pipeline từ brief. | Tạo production pipeline từ creative brief đến AI assistant, CI build đa network và auto-test ở quy mô studio. | Editor/CLI tạo config; CI logs; localization QA; variants chạy trên network; số liệu sản lượng/chất lượng. |

## Cách đánh giá và sử dụng bảng

1. Chọn một năng lực và thu thập công việc thực tế trong vài dự án gần nhất.
2. Đối chiếu từng Level từ thấp lên cao; chỉ chấm mức cao nhất mà người được đánh giá đã thể hiện độc lập và lặp lại.
3. Ghi ví dụ cụ thể: tên project, vai trò cá nhân, thời điểm, artifact/link và kết quả đo được.
4. Phân biệt **đã làm**, **đã thử một lần**, **được hướng dẫn làm** và **có thể dẫn dắt người khác**.
5. Với cấp L4–L5, yêu cầu bằng chứng tái sử dụng/ảnh hưởng tới team hoặc studio, không chỉ một task cá nhân.
6. Ghi khoảng trống lên cấp kế tiếp và kế hoạch thực hành; không dùng tiêu chí cấp cao làm yêu cầu bắt buộc cho mọi vị trí.

### Mẫu ghi nhận đánh giá

| Năng lực | Level hiện tại | Bằng chứng cụ thể | Điểm còn thiếu để lên level kế | Kế hoạch / thời hạn |
|---|---:|---|---|---|
| F6.1 Sử dụng AI |  |  |  |  |
| F6.2 AI & tự động hóa |  |  |  |  |

> **Lưu ý:** Các mục tiêu FPS, dung lượng và network trong khung là mục tiêu cần đối chiếu spec của từng playable/ad network, thiết bị và build configuration; không nên coi con số đơn lẻ là cam kết phổ quát. Đánh giá dựa trên artifact và kết quả kiểm thử thực tế.
