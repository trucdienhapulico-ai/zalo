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

### Máy Windows mới — một lệnh duy nhất

Repo đang ở chế độ private. Mở **PowerShell** và dán toàn bộ lệnh dưới đây. Lệnh tự cài GitHub CLI nếu thiếu, yêu cầu đăng nhập GitHub một lần, lấy bộ cài từ repo rồi thực thi:

```powershell
$ErrorActionPreference='Stop'; if(-not(Test-Path 'C:\Program Files\GitHub CLI\gh.exe')){winget install --id GitHub.cli -e --accept-package-agreements --accept-source-agreements}; $gh='C:\Program Files\GitHub CLI\gh.exe'; & $gh auth status 2>$null; if($LASTEXITCODE -ne 0){& $gh auth login --hostname github.com --git-protocol https --web}; $s=& $gh api repos/trucdienhapulico-ai/zalo/contents/install.ps1 -H 'Accept: application/vnd.github.raw+json'; $f=Join-Path $env:TEMP 'zalo-local-task-install.ps1'; [IO.File]::WriteAllText($f,($s -join "`n"),[Text.UTF8Encoding]::new($false)); & powershell -NoProfile -ExecutionPolicy Bypass -File $f
```

Bộ cài sẽ:

- Cài Git, Node.js LTS và Ollama bằng `winget` nếu thiếu.
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
