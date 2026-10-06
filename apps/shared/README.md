# Shared Modules (`apps/shared`)

Thư mục chứa các module tiện ích dùng chung giữa nhiều ứng dụng tương tác trong hệ thống Aquarium / Dung Lab. 
Nguyên tắc thiết kế: **Module độc lập, không trạng thái toàn cục (no global game singleton), nhẹ và zero dependency**.

---

## 1. Tệp tin `soft-lure.js` (`SoftLureController`)

### 1.1 Mục đích & Vấn đề giải quyết
Trong các trò chơi điều khiển đàn cá bằng con trỏ chuột hoặc ngón tay (như **Abyssal Dive**, **Lumen Playable**, và **Aquarium Web**), nếu đàn cá bám trực tiếp vào tọa độ chuột thô (raw pointer coordinates), chuyển động sẽ bị giật cục do tần số lấy mẫu của chuột/màn hình cảm ứng. 

Hơn nữa, khi người chơi giữ yên ngón tay, một lực hút điểm thuần túy sẽ khiến hàng trăm con cá bị nén sụp đổ vào đúng một pixel (Singularity Collapse).

`SoftLureController` giải quyết triệt để hai vấn đề này bằng mô hình toán học làm mịn chuyển động theo hàm mũ (exponential smoothing) và nội suy công suất bất đối xứng (asymmetric attack/decay power smoothing).

---

### 1.2 Chi tiết Lớp `SoftLureController`

- **`constructor(x, y)`**:
  - Khởi tạo tọa độ hiện tại `this.x = x`, `this.y = y`.
  - Tọa độ mục tiêu đích đến `this.tx = x`, `this.ty = y`.
  - Công suất hút `this.power = 0` (dao động từ 0 đến 1).
  - Trạng thái nhấn ngón tay / chuột: `this.down = false`.
  - Vận tốc di chuyển tức thời của con trỏ: `this.velocityX = 0`, `this.velocityY = 0`.

- **`setTarget(x, y, down)`**:
  - Nhận tọa độ tương tác mới nhất từ sự kiện `mousemove`, `touchmove`, `pointermove`.
  - Cập nhật cờ `down` (người chơi đang chạm màn hình hay đã nhấc tay).

- **`update(dt)`**:
  - Tích phân làm mịn vị trí theo thời gian thực:
    $$\text{follow} = 1 - e^{-8 \cdot dt}$$
    $$\vec{x} \leftarrow \vec{x} + (\vec{x}_{\text{target}} - \vec{x}) \cdot \text{follow}$$
  - Đo đạc vận tốc di chuyển thực tế của mồi câu:
    $$\vec{v} = \frac{\vec{x}_{\text{mới}} - \vec{x}_{\text{cũ}}}{\max(dt, \frac{1}{120})}$$
  - Làm mịn công suất tương tác bất đối xứng (Asymmetric Power Curve):
    - Khi ấn giữ (`down = true`): tốc độ tăng lực nhanh (`rate = 7.5`).
    - Khi buông tay (`down = false`): tốc độ nhả lực chậm (`rate = 3.8`) để đàn cá không bị giật mình tản ra quá đột ngột.
  - Trả về đối tượng trạng thái:
    ```javascript
    {
      x: this.x,
      y: this.y,
      power: this.power,
      active: this.power > 0.025
    }
    ```

- **`influence()`**:
  - Hàm getter trả về trạng thái tác động hiện thời mà không cần bước thêm thời gian tích phân.
