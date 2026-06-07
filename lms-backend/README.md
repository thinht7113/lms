# LMS Online Course API - Python Backend (FastAPI)

Hệ thống RESTful API bất đồng bộ (async) hiệu năng cao chuyên biệt cho nền tảng quản lý và đăng ký khóa học trực tuyến. 

Dự án được phát triển dựa trên **FastAPI** kết hợp với **SQLAlchemy 2.0 (Async)** và **PostgreSQL** mang lại khả năng tải lớn, xử lý đồng thời cực tốt cho phát trực tuyến video bài học và xử lý giao dịch.

---

## 📁 Cấu trúc Thư mục Chuẩn Enterprise (Clean Architecture)

```text
lms-backend/
├── app/
│   ├── api/                  # Tầng API (Routers & Endpoints)
│   │   ├── deps.py           # Dependency Injection (DB Session, Auth, Role checks)
│   │   └── v1/
│   │       ├── endpoints/    # Routers xử lý logic theo từng Module nghiệp vụ
│   │       │   ├── auth.py
│   │       │   ├── courses.py
│   │       │   ├── cart.py
│   │       │   ├── orders.py
│   │       │   ├── progress.py
│   │       │   ├── quizzes.py
│   │       │   └── certificates.py
│   │       └── router.py     # Router v1 chính (gộp tất cả các module endpoints)
│   │
│   ├── core/                 # Cấu hình cốt lõi của hệ thống
│   │   ├── config.py         # Quản lý biến môi trường (.env) qua Pydantic Settings
│   │   ├── database.py       # Thiết lập Async Engine & Session Factory của SQLAlchemy
│   │   ├── security.py       # Xử lý băm mật khẩu (bcrypt) và tạo/xác thực JWT Token
│   │   └── exceptions.py     # Lắng nghe và quản lý lỗi tập trung toàn hệ thống
│   │
│   ├── models/               # Database Models (SQLAlchemy ORM) đại diện các bảng DB
│   │   ├── base.py           # Base model chứa các cột dùng chung (id, created_at, updated_at)
│   │   ├── user.py
│   │   ├── course.py
│   │   ├── order.py
│   │   ├── quiz.py
│   │   └── certificate.py
│   │
│   ├── schemas/              # Pydantic Schemas (Định dạng & Xác thực dữ liệu API Request/Response)
│   │   ├── user.py
│   │   ├── course.py
│   │   ├── order.py
│   │   ├── quiz.py
│   │   └── certificate.py
│   │
│   ├── services/             # Tầng Nghiệp vụ (Business Logic & CRUD Services)
│   │   ├── base.py
│   │   ├── auth_service.py
│   │   ├── course_service.py
│   │   ├── order_service.py
│   │   ├── quiz_service.py
│   │   └── cert_service.py   # Xử lý sinh PDF chứng chỉ số
│   │
│   └── main.py               # Điểm khởi chạy chính của hệ thống FastAPI
│
├── .env.example              # File biến mẫu hướng dẫn cấu hình
├── .env                      # File biến môi trường thực tế (Không được commit lên Git)
├── requirements.txt          # Danh sách thư viện cần thiết
└── README.md
```

---

## 🛠️ Hướng dẫn Khởi chạy & Cài đặt cục bộ (Local Development)

### Bước 1: Khởi tạo và kích hoạt Môi trường ảo (Virtual Environment)
Mở terminal trong thư mục `lms-backend` và chạy các câu lệnh sau:

* **Trên Windows (Powershell / Command Prompt)**:
  ```powershell
  python -m venv venv
  .\venv\Scripts\Activate.ps1
  ```
* **Trên macOS / Linux**:
  ```bash
  python3 -m venv venv
  source venv/bin/activate
  ```

### Bước 2: Cài đặt các thư viện cần thiết
```bash
pip install -r requirements.txt
```

### Bước 3: Cấu hình biến môi trường
Sao chép tệp cấu hình mẫu và chỉnh sửa thông tin kết nối Cơ sở dữ liệu:
```bash
cp .env.example .env
```
*(Chỉnh sửa thông số `DATABASE_URL` trong file `.env` khớp với Database PostgreSQL của bạn).*

### Bước 4: Khởi chạy ứng dụng phát triển (Development Server)
```bash
python app/main.py
```
Hoặc chạy trực tiếp qua Uvicorn:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 📖 Trình kiểm thử API tự động (Interactive API Docs)

FastAPI tự động sinh tài liệu Swagger trực quan giúp bạn kiểm thử trực tiếp 33 Endpoints mà không cần cài Postman:
* **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **ReDoc (Dạng đọc sách)**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## ⚡ Các thư viện cốt lõi được sử dụng:
1. **FastAPI**: Lập trình API tốc độ cao, hỗ trợ AsyncIO bất đồng bộ hoàn chỉnh.
2. **SQLAlchemy 2.0 & Asyncpg**: ORM quản lý cơ sở dữ liệu nâng cấp kết hợp driver PostgreSQL async siêu nhanh.
3. **Pydantic v2**: Xác thực và làm sạch dữ liệu đầu vào tự động.
4. **PyJWT & Passlib**: Mã hóa bảo mật thông tin tài khoản người dùng chuẩn JWT.
