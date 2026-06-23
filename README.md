# LuminaLMS - Hệ thống đăng ký khóa học trực tuyến

LuminaLMS là hệ thống đăng ký khóa học trực tuyến được xây dựng theo mô hình Client-Server. Hệ thống hỗ trợ học viên tìm kiếm, mua và học khóa học; giảng viên xây dựng nội dung đào tạo; quản trị viên kiểm duyệt nội dung, quản lý người dùng, đơn hàng, mã giảm giá, banner và cấu hình hệ thống.

Dự án gồm hai phần chính. Phần backend nằm trong thư mục `lms-backend`, được xây dựng bằng FastAPI, PostgreSQL, Redis, MinIO và Alembic. Phần frontend nằm trong thư mục `lms-frontend`, được xây dựng bằng Next.js, React, TypeScript và Tailwind CSS.

## 1. Mục tiêu của hệ thống

LuminaLMS được xây dựng nhằm mô phỏng một nền tảng học trực tuyến có đầy đủ các nghiệp vụ cơ bản của hệ thống LMS thương mại. Người học có thể khám phá khóa học, thêm vào giỏ hàng, thanh toán, học bài, làm bài kiểm tra và nhận chứng chỉ. Giảng viên có thể tạo khóa học, thêm chương học, thêm bài học, upload nội dung đa phương tiện và theo dõi doanh thu. Quản trị viên có thể quản lý toàn bộ hệ thống, kiểm duyệt nội dung, xử lý đơn hàng và cấu hình dữ liệu vận hành.

## 2. Cấu trúc tổng thể

```text
LMS/
├── lms-backend
├── lms-frontend
├── README.md
└── BAO_CAO_CAU_TRUC_DU_AN.md
```

Thư mục `lms-backend` chứa mã nguồn backend, migration cơ sở dữ liệu, cấu hình Docker, cấu hình Alembic và các script hỗ trợ. Thư mục `lms-frontend` chứa mã nguồn giao diện, route Next.js, component, hook, context, service gọi API và cấu hình TypeScript. File `README.md` ở cấp gốc dùng để hướng dẫn chạy backend bằng Docker và chạy frontend bằng các lệnh `npm run`.

## 3. Kiến trúc hệ thống

Hệ thống sử dụng kiến trúc Client-Server. Frontend hoạt động như client chạy trên trình duyệt, chịu trách nhiệm hiển thị giao diện và gửi request. Backend hoạt động như server, chịu trách nhiệm xác thực, phân quyền, xử lý nghiệp vụ, truy vấn cơ sở dữ liệu và trả dữ liệu về frontend thông qua REST API.

```text
Trình duyệt người dùng
        ↓
Frontend Next.js
        ↓ HTTP/REST API
Backend FastAPI
        ↓
PostgreSQL / Redis / MinIO
```

PostgreSQL là cơ sở dữ liệu quan hệ chính, lưu dữ liệu nghiệp vụ như người dùng, khóa học, bài học, đơn hàng, tiến độ, quiz và chứng chỉ. Redis là hệ thống lưu trữ key-value dùng cho cache danh mục và blacklist token sau khi đăng xuất. MinIO là object storage dùng để lưu file upload như ảnh, PDF, video và tài liệu bài học.

## 4. Công nghệ sử dụng

| Thành phần | Công nghệ |
| --- | --- |
| Backend framework | FastAPI |
| Ngôn ngữ backend | Python 3.11 |
| ORM | SQLAlchemy 2.0 async |
| Driver PostgreSQL | asyncpg |
| Migration | Alembic |
| Validation backend | Pydantic v2 |
| Cơ sở dữ liệu chính | PostgreSQL |
| Cache và token blacklist | Redis |
| Lưu trữ file | MinIO |
| Sinh chứng chỉ PDF | ReportLab |
| Xác thực | JWT, HttpOnly cookie, bcrypt |
| Frontend framework | Next.js 16 |
| Thư viện giao diện | React 19 |
| Ngôn ngữ frontend | TypeScript |
| Styling | Tailwind CSS 4 |
| Biểu tượng | Lucide React |
| Rich text editor | CKEditor 5 |
| Biểu đồ | Recharts |
| Kéo thả | @hello-pangea/dnd |
| Đóng gói và chạy dịch vụ | Docker, Docker Compose |

## 5. Chức năng chính

Đối với học viên, hệ thống cung cấp các chức năng đăng ký, đăng nhập, xem danh sách khóa học, tìm kiếm khóa học, xem chi tiết khóa học, thêm khóa học vào giỏ hàng, áp dụng mã giảm giá, thanh toán, xem khóa học đã mua, học bài, theo dõi tiến độ, làm bài kiểm tra, xem chứng chỉ, xem thông báo và quản lý hồ sơ cá nhân.

Đối với giảng viên, hệ thống cung cấp khu vực quản lý riêng để tạo khóa học, chỉnh sửa khóa học, tạo chương học, tạo bài học, upload nội dung bài học, xem trạng thái phê duyệt, xem danh sách học viên, xem doanh thu và gửi yêu cầu rút tiền.

Đối với quản trị viên, hệ thống cung cấp trang quản trị để xem dashboard, quản lý người dùng, danh mục, banner, khóa học, đăng ký học, đơn hàng, mã giảm giá, cấu hình hệ thống, nhật ký hệ thống và kiểm duyệt nội dung đào tạo.

## 6. Cấu trúc backend

```text
lms-backend/
├── alembic
│   ├── env.py
│   └── versions
├── app
│   ├── api
│   │   ├── deps.py
│   │   └── v1
│   │       ├── router.py
│   │       ├── dynamic_crud.py
│   │       └── endpoints
│   ├── assets
│   │   └── fonts
│   ├── core
│   ├── models
│   ├── schemas
│   ├── services
│   └── main.py
├── scripts
├── Dockerfile
├── docker-compose.yml
├── alembic.ini
├── requirements.txt
├── .env.example
└── README.md
```

Thư mục `app/api` là tầng tiếp nhận HTTP request và định nghĩa endpoint. File `app/api/deps.py` chứa các dependency dùng chung như session cơ sở dữ liệu, người dùng hiện tại và kiểm tra quyền admin. File `app/api/v1/router.py` gom các endpoint của phiên bản API v1. File `app/api/v1/dynamic_crud.py` tạo các router CRUD động cho trang quản trị. Thư mục `app/core` chứa cấu hình lõi như biến môi trường, database engine, Redis client, JWT và kiểm tra bảo mật. Thư mục `app/models` chứa SQLAlchemy model ánh xạ bảng cơ sở dữ liệu. Thư mục `app/schemas` chứa Pydantic schema cho request và response. Thư mục `app/services` chứa logic nghiệp vụ. Thư mục `app/assets/fonts` chứa font Roboto dùng khi tạo chứng chỉ PDF. Thư mục `alembic` chứa migration quản lý phiên bản cấu trúc cơ sở dữ liệu.

## 7. Cấu trúc frontend

```text
lms-frontend/
├── public
├── src
│   ├── app
│   ├── components
│   ├── contexts
│   ├── hooks
│   ├── services
│   └── utils
├── middleware.ts
├── next.config.ts
├── package.json
├── package-lock.json
├── tsconfig.json
└── eslint.config.mjs
```

Thư mục `src/app` tổ chức route theo Next.js App Router. Thư mục `src/components` chứa component giao diện tái sử dụng. Thư mục `src/contexts` chứa React Context để chia sẻ trạng thái toàn cục. Thư mục `src/hooks` chứa custom hook. Thư mục `src/services` chứa logic gọi API backend, trong đó `api.ts` là file quan trọng nhất. Thư mục `src/utils` chứa các hàm tiện ích. File `middleware.ts` hỗ trợ kiểm tra quyền truy cập trước khi render một số route. File `next.config.ts` chứa cấu hình Next.js.

## 8. Yêu cầu môi trường

| Công cụ | Mục đích |
| --- | --- |
| Docker Desktop | Build và chạy các container của hệ thống |
| Docker Compose | Điều phối backend, Redis và MinIO |
| PostgreSQL | Cơ sở dữ liệu chính, có thể chạy ngoài Docker hoặc được cấu hình riêng |
| Node.js và npm | Cài dependency, chạy development server và build frontend Next.js |

Các cổng mặc định của dự án là `3000` cho frontend, `8000` cho backend, `6379` cho Redis, `9000` cho MinIO API và `9001` cho MinIO Console.

## 9. Cấu hình backend

Tạo file môi trường cho backend bằng cách sao chép file mẫu.

```powershell
cd lms-backend
Copy-Item .env.example .env
```

Trên macOS hoặc Linux, sử dụng lệnh sau.

```bash
cd lms-backend
cp .env.example .env
```

Nội dung quan trọng trong file `.env` khi chạy bằng Docker nên có dạng sau.

```env
APP_ENV=production
SECRET_KEY=CHANGE_ME_TO_A_LONG_RANDOM_SECRET_KEY
DOCKER_DATABASE_URL=postgresql+asyncpg://postgres:postgres@host.docker.internal:5432/lms_db
DOCKER_REDIS_URL=redis://redis:6379/0
REDIS_URL=redis://localhost:6379/0
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
MINIO_ENDPOINT_URL=http://localhost:9000
MINIO_PUBLIC_URL=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadminpassword
MINIO_BUCKET_NAME=lms-storage
```

File `.env` chứa thông tin nhạy cảm, vì vậy không nên đưa file này lên Git hoặc gửi công khai. Nếu PostgreSQL chạy ở vị trí khác, cần thay đổi `DOCKER_DATABASE_URL` cho phù hợp với môi trường thực tế.

## 10. Cấu hình frontend

Frontend cần biết địa chỉ backend thông qua biến `NEXT_PUBLIC_API_URL`. Khi chạy local, file `lms-frontend/.env` nên có nội dung như sau.

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

Nếu backend được triển khai trên domain thật, giá trị này cần đổi thành URL API thật. Sau khi thay đổi `.env`, cần khởi động lại frontend để Next.js nạp lại biến môi trường.

## 11. Chạy hệ thống bằng Docker và npm run

Phần triển khai của dự án sử dụng Docker Compose. File `lms-backend/docker-compose.yml` dùng để build và chạy ba container chính là backend FastAPI, Redis và MinIO. Trước khi chạy lệnh Docker, cần đảm bảo file `lms-backend/.env` đã có `DOCKER_DATABASE_URL`, `DOCKER_REDIS_URL`, `SECRET_KEY`, `CORS_ORIGINS` và cấu hình MinIO.

```powershell
cd lms-backend
docker compose build
docker compose up -d
```

Có thể thay hai lệnh trên bằng một lệnh duy nhất.

```powershell
cd lms-backend
docker compose up -d --build
```

Sau khi chạy thành công, Docker Compose sẽ khởi động container backend, container Redis và container MinIO. Backend sẽ chạy Alembic migration trước khi khởi động API. Redis chạy ở cổng `6379`. MinIO chạy API ở cổng `9000` và giao diện quản trị ở cổng `9001`. Backend chạy ở cổng `8000`.

Frontend được chạy từ thư mục `lms-frontend` bằng npm. Trước khi chạy frontend, cần đảm bảo file `lms-frontend/.env` đã có `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1` để giao diện gọi đúng backend.

```powershell
cd lms-frontend
npm install
npm run dev
```

Sau khi chạy lệnh trên, frontend sẽ hoạt động tại `http://localhost:3000`. Nếu cần chạy frontend theo chế độ production, cần build trước rồi khởi động bằng `npm run start`.

```powershell
cd lms-frontend
npm run build
npm run start
```

## 12. Alembic và quản lý cơ sở dữ liệu

Alembic được dùng để quản lý lịch sử thay đổi cấu trúc cơ sở dữ liệu. Khi backend chạy bằng Dockerfile, lệnh `alembic upgrade head` được thực thi trước khi Uvicorn khởi động. Điều này giúp các migration mới nhất được áp dụng vào cơ sở dữ liệu trước khi API nhận request.

Khi thay đổi SQLAlchemy model trong quá trình phát triển, cần tạo migration mới bằng lệnh `alembic revision --autogenerate`. Sau đó migration sẽ được áp dụng khi chạy `alembic upgrade head` hoặc khi container backend khởi động theo Dockerfile.

## 13. Tài liệu API

Trong môi trường development, FastAPI cung cấp Swagger UI tại `http://localhost:8000/docs` và ReDoc tại `http://localhost:8000/redoc`. Trong môi trường production, hai đường dẫn này được tắt để hạn chế lộ tài liệu API công khai. Nếu muốn xem tài liệu API khi kiểm thử local, có thể đặt `APP_ENV=development` trong file `.env` rồi khởi động lại container backend.

## 14. Bảo mật

Hệ thống sử dụng JWT access token, HttpOnly cookie, bcrypt để băm mật khẩu, phân quyền theo vai trò, Redis blacklist token sau khi đăng xuất, kiểm tra quyền upload file theo vai trò và HMAC signature cho webhook thanh toán. Khi chạy production, hệ thống kiểm tra secret mặc định và không cho phép sử dụng các giá trị không an toàn.

## 15. Lưu trữ file

MinIO được dùng để lưu ảnh khóa học, ảnh banner, ảnh đại diện, PDF, video và tài liệu bài học. Backend giao tiếp với MinIO thông qua service lưu trữ. Khi đổi domain MinIO, cần cập nhật cấu hình backend và cấu hình ảnh trong frontend nếu có sử dụng Next Image.

## 16. Kiểm tra trạng thái container

Sau khi chạy Docker Compose, có thể kiểm tra trạng thái container bằng lệnh sau.

```powershell
cd lms-backend
docker compose ps
```

Có thể xem log backend bằng lệnh sau.

```powershell
cd lms-backend
docker compose logs -f web
```

Có thể dừng toàn bộ container bằng lệnh sau.

```powershell
cd lms-backend
docker compose down
```

## 17. Lỗi thường gặp

Nếu backend không kết nối được PostgreSQL, cần kiểm tra PostgreSQL đã chạy chưa, database đã được tạo chưa và biến `DOCKER_DATABASE_URL` có đúng với môi trường Docker không. Nếu Redis báo connection refused, cần kiểm tra container Redis bằng `docker compose ps`. Nếu upload file lỗi, cần kiểm tra container MinIO, bucket, access key, secret key và endpoint. Nếu frontend gọi sai API, cần kiểm tra `NEXT_PUBLIC_API_URL` và khởi động lại frontend. Nếu Swagger không hiển thị, cần kiểm tra `APP_ENV`, vì production sẽ tắt tài liệu API theo thiết kế.

## 18. Tóm tắt lệnh chạy dự án

Lệnh build image và chạy toàn bộ container trong Docker Compose là:

```powershell
cd lms-backend
docker compose build
docker compose up -d
```

Lệnh build và chạy gộp trong một bước là:

```powershell
cd lms-backend
docker compose up -d --build
```

Lệnh xem container đang chạy là:

```powershell
cd lms-backend
docker compose ps
```

Lệnh xem log backend là:

```powershell
cd lms-backend
docker compose logs -f web
```

Lệnh dừng hệ thống backend là:

```powershell
cd lms-backend
docker compose down
```

Lệnh cài dependency và chạy frontend ở chế độ phát triển là:

```powershell
cd lms-frontend
npm install
npm run dev
```

Lệnh build và chạy frontend ở chế độ production là:

```powershell
cd lms-frontend
npm run build
npm run start
```
