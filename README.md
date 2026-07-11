# Zalo Local Task

Tiện ích miễn phí, chạy hoàn toàn trên máy: chọn nội dung tại `chat.zalo.me`, phân loại giao việc bằng Ollama và lưu vào bảng Kanban local.

## Tính năng

- Nút **Tạo việc** xuất hiện ngay khi bôi đen tin nhắn trên Zalo Web.
- AI trích tiêu đề, người phụ trách, hạn, ưu tiên và nhóm công việc.
- Màn hình xác nhận trước khi lưu để tránh tạo nhầm.
- Kanban gồm `Cần làm`, `Đang làm`, `Hoàn thành`.
- Không gửi nội dung tin nhắn tới dịch vụ AI bên ngoài.
- Không cần npm package hoặc cơ sở dữ liệu.

## Yêu cầu

- Windows 10/11.
- Chrome hoặc Edge.
- [Ollama](https://ollama.com/) và model `qwen3:1.7b`.
- Node.js 18 trở lên.

## Cài đặt

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
