# Zalo → Nhật ký Ban Điện

Extension miễn phí chạy trên Windows: bôi đen tin giao việc tại `chat.zalo.me`, dùng Ollama trên máy để phân tích, kiểm tra biểu mẫu rồi tạo trực tiếp vào [Nhật ký Ban Điện](https://bandien.github.io/scan/nhatky/).

## Luồng hoạt động

1. Bôi đen nội dung tin nhắn trên Zalo Web và bấm **Tạo việc**.
2. AI local điền Nội dung, người thực hiện, ngày, tổ, khu vực, thiết bị và ưu tiên.
3. Đăng nhập bằng Username + PIN của Nhật ký; extension chỉ lưu token phiên, không lưu PIN.
4. Kiểm tra biểu mẫu và bấm **Tạo việc trên Nhật ký**.
5. Công việc được ghi thẳng vào Google Sheet `11_BanDien_DB` và có thể mở ngay màn chi tiết.

Không còn Kanban, `tasks.json` hoặc dữ liệu công việc local. Dịch vụ tại `127.0.0.1:4317` chỉ làm cầu nối Ollama và API Nhật ký.

## Yêu cầu

- Windows 10/11.
- Chrome hoặc Edge.
- Ollama và model `qwen3:1.7b`.
- Node.js 18 trở lên.
- Tài khoản Username + PIN trong tab `Users` của Nhật ký Ban Điện.

## Cài đặt máy mới — một lệnh

Mở PowerShell và chạy:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm 'https://raw.githubusercontent.com/trucdienhapulico-ai/zalo/main/install.ps1' | iex"
```

Bộ cài sẽ cài Git, Node.js, Ollama nếu thiếu; tải model; cập nhật mã nguồn; tạo shortcut và mở thư mục extension.

Lần đầu cần:

1. Mở `chrome://extensions` hoặc `edge://extensions`.
2. Bật **Developer mode**.
3. Chọn **Load unpacked**.
4. Chọn `%LOCALAPPDATA%\ZaloLocalTask\extension`.
5. Tải lại `https://chat.zalo.me/`.

Sau mỗi lần cập nhật mã extension, vào trang quản lý extension và bấm **Reload** cho extension này.

## Chạy thủ công

```powershell
ollama pull qwen3:1.7b
npm start
```

Trang trạng thái cầu nối: <http://127.0.0.1:4317>.

## An toàn dữ liệu

- Nội dung Zalo chỉ được gửi tới Ollama trên `127.0.0.1:11434` và API Nhật ký Ban Điện khi người dùng bấm tạo.
- PIN chỉ được dùng lúc đăng nhập và không được lưu.
- Token phiên được giữ trong `chrome.storage.local`.
- API local chỉ chấp nhận request từ extension đã ghép nối bằng khóa sinh riêng trên máy.
