# LMS Crawler Tool (Standalone Data Ingestion CLI)

Đây là công cụ độc lập (CLI Tool) giúp thu thập toàn bộ dữ liệu khóa học từ các nguồn bên ngoài (ví dụ `hoctapgiare.top`), tự động tải hình ảnh, tài liệu PDF, video `.mp4` lên máy chủ lưu trữ **MinIO** và lưu thông tin bài giảng vào cơ sở dữ liệu **PostgreSQL** của hệ thống LMS.

## TẠI SAO LẠI TÁCH RIÊNG TOOL NÀY?
1. **Tránh ngốn tài nguyên:** Playwright và Chromium tải video nặng sẽ không ảnh hưởng đến RAM/CPU của Backend chính đang phục vụ học viên.
2. **Backend chính nhẹ hơn:** Giảm dung lượng Docker Image của Backend chính từ ~2GB xuống ~200MB.
3. **Chạy linh hoạt theo yêu cầu (On-demand):** Khi nào cần nhập khóa học mới thì gõ lệnh chạy tool, xong việc tool tự tắt giải phóng 100% tài nguyên.

---

## 1. Cài đặt & Chuẩn bị
### Chạy trực tiếp trên máy (Python Virtualenv)
```bash
# Tạo và kích hoạt virtualenv
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Cài đặt thư viện và trình duyệt Chromium
pip install -r requirements.txt
python -m playwright install chromium
```

### Cấu hình biến môi trường
Tạo file `.env` trong thư mục `lms-crawler-tool/` (hoặc sao chép từ cấu hình Backend):
```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/lms_db
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=lms-storage
MINIO_USE_SSL=false
CRAWLER_HOCTAPGIARE_STORAGE_STATE_PATH=./storage_states/hoctapgiare.json
```

---

## 2. Hướng dẫn sử dụng CLI

### Cào và Đăng thẳng vào CSDL (Publish ngay)
```bash
python -m main --url "https://hoctapgiare.top/home/lesson/udemy-lam-video-quang-cao-tiktok-hieucb/314/9294" --publish
```

### Cào và Lưu dạng Nháp (Draft - Không công khai ngay)
```bash
python -m main --url "https://hoctapgiare.top/home/lesson/..." --draft
```

### Đăng nhập và tạo lại Cookie Session (Khi bị mất tài khoản VIP)
```bash
python -m main --login --email "tiki1@gmail.com" --password "123456"
```
