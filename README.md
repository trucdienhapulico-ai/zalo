# Zalo Local Task
̣(Tạo việc từ Bôi đen nội dung tin nhắn trang chat.zalo.me)
Tiện ích miễn phí, chạy hoàn toàn trên máy: chọn nội dung tại `chat.zalo.me`, phân loại giao việc bằng Ollama và lưu vào bảng Kanban local.

## Tính năng
̣̣
- Nút **Tạo việc** xuất hiện ngay khi bôi đen tin nhắn trên Zalo Web.
- Mở [Nhật ký Ban Điện](https://bandien.github.io/scan/nhatky/) trong tab mới.
- Tải các lựa chọn biểu mẫu hiện tại từ trang Nhật ký Ban Điện.
- Hiển thị trên Zalo các trường: **Việc, Tổ thực hiện, Kết quả, Ghi chú, Ngày, Ca, Từ giờ, Đến giờ, Còn tồn, Làm tiếp**.
- Đồng bộ lựa chọn **Teams** được phép theo tài khoản từ trang Nhật ký, hiện gồm **Tổ cơ điện** và **Tổ điện nước**.
- Tự chuyển tới màn **Ghi nhật ký nhanh** và điền toàn bộ dữ liệu vào đúng trường.
- Nếu chưa đăng nhập, extension chờ đăng nhập xong rồi mới tự điền.
- Kanban gồm `Cần làm`, `Đang làm`, `Hoàn thành`.
- Không gửi nội dung tin nhắn tới dịch vụ AI bên ngoài.
- Không cần npm package hoặc cơ sở dữ liệu.

## Yêu cầu

- Windows 10/11.
- Chrome hoặc Edge.
- [Ollama](https://ollama.com/) và model `qwen3:1.7b`.
- Node.js 18 trở lên.

## Cài đặt

### Máy Windows mới — một lệnh duy nhất

Trên máy mới, mở **PowerShell** và dán đúng một lệnh:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm 'https://raw.githubusercontent.com/trucdienhapulico-ai/zalo/main/install.ps1' | iex"
```

Bộ cài sẽ:

- Cài Git, Node.js LTS và Ollama bằng `winget` nếu thiếu; không cần đăng nhập GitHub.
- Clone/cập nhật repo vào `%LOCALAPPDATA%\ZaloLocalTask`.
- Tải model `qwen3:1.7b`.
- Tạo shortcut **Zalo Local Task** trên Desktop.
- Khởi chạy dashboard và mở thư mục extension.

Do giới hạn bảo mật của Chrome/Edge, lần đầu vẫn cần mở `chrome://extensions` hoặc `edge://extensions`, bật **Developer mode**, chọn **Load unpacked** và chọn `%LOCALAPPDATA%\ZaloLocalTask\extension`.

### Cài thủ công

```powershell
ollama pull qwen3:1.7b
npm start
```

Dashboard chạy tại <http://127.0.0.1:4317>.

Để cài extension:

1. Mở `chrome://extensions` hoặc `edge://extensions`.
2. Bật **Developer mode**.
3. Chọn **Load unpacked** và trỏ tới thư mục `extension`.
4. Tải lại `https://chat.zalo.me/`.
5. Bôi đen nội dung tin nhắn và bấm nút nổi **Tạo việc**.

Trên máy đã dùng Codex runtime, có thể nhấp đúp `start.cmd`. Nếu Node nằm ở vị trí khác, dùng `npm start`.

## Dữ liệu và riêng tư

Dữ liệu công việc nằm trong `data/tasks.json`. Tệp này đã được `.gitignore` loại trừ và không nên commit lên GitHub.

Ollama được gọi tại `http://127.0.0.1:11434`; API và dashboard chỉ lắng nghe tại `127.0.0.1:4317`.
