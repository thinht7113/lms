# BÁO CÁO PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG LMS

## 1. Thông tin tổng quan

### 1.1. Tên đề tài

**Hệ thống đăng ký khóa học trực tuyến - Lumina LMS**

### 1.2. Mục tiêu hệ thống

Hệ thống Lumina LMS được xây dựng nhằm hỗ trợ hoạt động đào tạo trực tuyến với đầy đủ các nghiệp vụ chính:

- Học viên tìm kiếm, lọc, xem chi tiết và mua khóa học.
- Học viên thêm khóa học vào giỏ hàng, áp dụng mã giảm giá, thanh toán và truy cập nội dung học.
- Giảng viên tạo khóa học, xây dựng chương học, bài học, nội dung multimedia như video, PDF, hình ảnh, bài đọc và code.
- Admin quản lý người dùng, khóa học, banner, danh mục, đơn hàng, mã giảm giá, kiểm duyệt khóa học/bài học và theo dõi thống kê hệ thống.
- Hệ thống theo dõi tiến độ học tập, làm bài kiểm tra, cấp chứng chỉ tự động và cho phép xác minh chứng chỉ.

### 1.3. Các tác nhân chính

| Tác nhân | Vai trò |
|---|---|
| Học viên | Tìm kiếm khóa học, mua khóa học, học bài, làm quiz, nhận chứng chỉ |
| Giảng viên | Tạo khóa học, thêm chương/bài học/nội dung, theo dõi học viên, doanh thu |
| Admin | Quản trị hệ thống, kiểm duyệt, quản lý dữ liệu, cấu hình, theo dõi thống kê |

---

## 2. Kiến trúc tổng thể hệ thống

### 2.1. Mô hình kiến trúc

Hệ thống được xây dựng theo mô hình **Client - Server - Database - Object Storage**.

```text
Người dùng
   |
   | HTTP/HTTPS
   v
Frontend Next.js
   |
   | REST API / JSON / Cookie Authentication
   v
Backend FastAPI
   |
   | SQLAlchemy Async ORM
   v
PostgreSQL

Backend FastAPI
   |
   | S3-compatible API
   v
MinIO Object Storage
```

### 2.2. Các thành phần chính

| Thành phần | Công nghệ | Chức năng |
|---|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind CSS | Giao diện người dùng |
| Backend | FastAPI, Python, SQLAlchemy Async | API, xử lý nghiệp vụ |
| Database | PostgreSQL | Lưu dữ liệu người dùng, khóa học, đơn hàng, tiến độ |
| Object Storage | MinIO | Lưu ảnh, video, PDF, file học liệu |
| Migration | Alembic | Quản lý thay đổi cấu trúc CSDL |
| Authentication | JWT + HttpOnly Cookie | Xác thực phiên đăng nhập |
| API Protocol | HTTP REST + JSON | Giao tiếp frontend/backend |
| File Upload | Multipart/Form-Data | Upload ảnh, PDF, video |
| Cache/Service phụ | Redis | Chuẩn bị cho cache/session tạm thời |

---

## 3. Lý thuyết và công nghệ sử dụng

### 3.1. Ngôn ngữ lập trình

| Ngôn ngữ | Vị trí sử dụng | Mục đích |
|---|---|---|
| TypeScript | Frontend | Tăng an toàn kiểu dữ liệu, giảm lỗi runtime |
| JavaScript/TSX | Frontend | Xây dựng component React |
| Python | Backend | Xử lý API và nghiệp vụ |
| SQL | Database | Truy vấn dữ liệu thông qua ORM/migration |

### 3.2. Framework frontend

#### Next.js 16

Next.js được sử dụng để xây dựng giao diện web hiện đại dựa trên React. Trong hệ thống này, Next.js đảm nhiệm:

- Routing theo thư mục trong `src/app`.
- Xây dựng các trang như `/`, `/courses`, `/courses/[id]`, `/my-courses`, `/learn/[courseId]`, `/admin`, `/instructor`.
- Build production và tối ưu hiệu năng.
- Hỗ trợ cấu hình ảnh remote qua `next.config.ts`.

#### React 19

React được dùng để xây dựng giao diện theo component:

- `Navbar`
- `Footer`
- `CourseCard`
- Các trang quản trị admin
- Trang học tập
- Trang giảng viên

Các hook được dùng nhiều:

- `useState`: quản lý trạng thái giao diện.
- `useEffect`: tải dữ liệu từ API.
- `useMemo`: tính toán dữ liệu dẫn xuất như tiến độ, thống kê.
- `useRef`: điều khiển video player.

#### Tailwind CSS

Tailwind CSS được dùng để thiết kế giao diện nhanh, nhất quán:

- Responsive layout.
- Card, grid, spacing, color.
- Sidebar, navigation, form.
- Trạng thái hover, disabled, loading.

### 3.3. Thư viện frontend

| Thư viện | Mục đích |
|---|---|
| `lucide-react` | Icon giao diện |
| `ckeditor5`, `@ckeditor/ckeditor5-react` | Soạn thảo nội dung bài học |
| `@hello-pangea/dnd` | Kéo thả, sắp xếp nội dung nếu cần |
| `eslint` | Kiểm tra chất lượng mã frontend |
| `typescript` | Kiểm tra kiểu dữ liệu |

### 3.4. Framework backend

#### FastAPI

FastAPI là framework Python dùng để xây dựng REST API. Ưu điểm:

- Hiệu năng cao.
- Hỗ trợ async/await.
- Tự động sinh tài liệu Swagger/OpenAPI.
- Tích hợp tốt với Pydantic để validate dữ liệu.
- Dễ tổ chức router theo module.

Trong hệ thống, toàn bộ API được đăng ký dưới prefix:

```text
/api/v1
```

Ví dụ:

```text
/api/v1/auth/login
/api/v1/courses
/api/v1/cart
/api/v1/checkout
/api/v1/learn/courses/{course_id}/progress
```

#### Uvicorn

Uvicorn là ASGI server dùng để chạy FastAPI:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 3.5. ORM và database

#### SQLAlchemy Async

SQLAlchemy Async được sử dụng để thao tác PostgreSQL theo mô hình ORM:

- Khai báo model Python ánh xạ với bảng CSDL.
- Truy vấn async thông qua `AsyncSession`.
- Dùng relationship để biểu diễn liên kết giữa các bảng.

#### PostgreSQL

PostgreSQL là hệ quản trị CSDL quan hệ chính của hệ thống. PostgreSQL phù hợp vì:

- Hỗ trợ quan hệ khóa ngoại chặt chẽ.
- Hỗ trợ transaction tốt cho nghiệp vụ thanh toán.
- Hỗ trợ JSONB cho một số dữ liệu phức tạp.
- Tương thích tốt với SQLAlchemy và Alembic.

#### Alembic

Alembic dùng để quản lý migration:

- Tạo bảng ban đầu.
- Thêm cột mới.
- Thêm bảng yêu cầu rút tiền.
- Thêm trường reset password.

Một số migration hiện có:

| Migration | Ý nghĩa |
|---|---|
| `20260605_0001_initial.py` | Khởi tạo CSDL |
| `e3f21f59d72f_add_thumbnail_to_course.py` | Thêm ảnh đại diện khóa học |
| `0a06901bf194_add_payoutrequest_table.py` | Thêm bảng yêu cầu rút tiền |
| `08907a397b36_add_password_reset_fields.py` | Thêm trường khôi phục mật khẩu |

### 3.6. Xác thực và phân quyền

Hệ thống sử dụng:

- JWT để đại diện phiên đăng nhập.
- HttpOnly Cookie tên `lms_session`.
- Phân quyền theo vai trò:
  - `student`
  - `instructor`
  - `admin`

Ưu điểm của HttpOnly Cookie:

- JavaScript frontend không đọc trực tiếp được token.
- Giảm rủi ro đánh cắp token khi có XSS.

Các guard backend kiểm tra:

- Người dùng đã đăng nhập hay chưa.
- Người dùng có đúng vai trò không.
- Giảng viên có sở hữu khóa học/bài học không.
- Admin có quyền quản trị không.

### 3.7. Giao thức và phương thức giao tiếp

| Thành phần | Giao thức/phương thức |
|---|---|
| Frontend gọi backend | HTTP REST |
| Dữ liệu API | JSON |
| Upload file | Multipart/Form-Data |
| Xác thực | JWT trong HttpOnly Cookie |
| Backend tới PostgreSQL | TCP qua asyncpg |
| Backend tới MinIO | S3-compatible HTTP API |
| CORS | Cho phép frontend localhost gọi backend |

### 3.8. MinIO Object Storage

MinIO được sử dụng làm hệ thống lưu trữ file tương thích S3.

Các loại file được lưu:

- Ảnh khóa học.
- Avatar người dùng.
- Banner.
- Video bài học.
- PDF tài liệu.
- Ảnh nội dung bài học.

Backend dùng `boto3` để kết nối MinIO:

```text
MINIO_ENDPOINT_URL=http://minio:9000
MINIO_BUCKET_NAME=lms-storage
MINIO_PUBLIC_URL=http://localhost:9000
```

Chính sách truy cập:

- Ảnh `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp` có thể public-read.
- Video/PDF dùng signed URL khi học viên truy cập nội dung học.
- File học liệu trả phí không nên public hoàn toàn.

---

## 4. Cấu trúc thư mục dự án

```text
D:\BT\LMS
├── lms-backend
│   ├── app
│   │   ├── api
│   │   ├── core
│   │   ├── models
│   │   ├── schemas
│   │   └── services
│   ├── alembic
│   ├── requirements.txt
│   └── docker-compose.yml
│
├── lms-frontend
│   ├── src
│   │   ├── app
│   │   ├── components
│   │   ├── contexts
│   │   └── services
│   ├── package.json
│   └── next.config.ts
│
└── baocao.md
```

---

## 5. Thiết kế cơ sở dữ liệu

### 5.1. Danh sách bảng chính

| Bảng | Model | Chức năng |
|---|---|---|
| `nguoi_dung` | `User` | Lưu tài khoản người dùng |
| `danh_muc` | `Category` | Danh mục khóa học |
| `khoa_hoc` | `Course` | Thông tin khóa học |
| `chuong_hoc` | `Section` | Chương/phần của khóa học |
| `bai_hoc` | `Lesson` | Bài học trong chương |
| `noi_dung_bai_hoc` | `LessonContent` | Nội dung bài học: video, PDF, text, code, image |
| `dang_ky_hoc` | `Enrollment` | Quyền sở hữu khóa học của học viên |
| `tien_do_hoc_tap` | `Progress` | Tiến độ từng bài học |
| `chi_tiet_gio_hang` | `CartItem` | Giỏ hàng |
| `ma_giam_gia` | `Coupon` | Mã giảm giá |
| `don_hang` | `Order` | Đơn hàng |
| `chi_tiet_don_hang` | `OrderItem` | Các khóa học trong đơn hàng |
| `bai_kiem_tra` | `Quiz` | Bài kiểm tra |
| `cau_hoi` | `Question` | Câu hỏi quiz |
| `lua_chon_cau_hoi` | `QuestionOption` | Đáp án lựa chọn |
| `lich_su_lam_bai` | `QuizAttempt` | Lượt làm bài |
| `chi_tiet_bai_lam` | `QuizAttemptAnswer` | Chi tiết đáp án của lượt làm |
| `chung_chi` | `Certificate` | Chứng chỉ |
| `danh_gia_khoa_hoc` | `CourseReview` | Đánh giá khóa học |
| `danh_sach_yeu_thich` | `Wishlist` | Danh sách yêu thích |
| `banners` | `Banner` | Banner trang chủ |
| `yeu_cau_rut_tien` | `PayoutRequest` | Yêu cầu rút tiền của giảng viên |
| `cau_hinh_he_thong` | `Setting` | Cấu hình hệ thống |
| `nhat_ky_quan_tri` | `AdminLog` | Nhật ký thao tác admin |

### 5.2. Bảng `nguoi_dung`

| Cột | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | Integer | Khóa chính |
| `ho_ten` | String | Họ tên |
| `email` | String | Email duy nhất |
| `mat_khau` | String nullable | Mật khẩu đã hash |
| `vai_tro` | String | `student`, `instructor`, `admin` |
| `trang_thai_hoat_dong` | Boolean | Trạng thái tài khoản |
| `ngay_tao` | DateTime | Ngày tạo |
| `so_dien_thoai` | String nullable | Số điện thoại |
| `google_id`, `facebook_id` | String nullable | Tài khoản mạng xã hội |
| `avatar_url` | String nullable | Ảnh đại diện |
| `reset_token`, `reset_token_expires` | String/DateTime | Khôi phục mật khẩu |

Ràng buộc:

- Email duy nhất.
- Vai trò chỉ thuộc `student`, `instructor`, `admin`.

### 5.3. Bảng `khoa_hoc`

| Cột | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | Integer | Khóa chính |
| `ma_giang_vien` | FK | Giảng viên tạo khóa học |
| `ma_danh_muc` | FK | Danh mục |
| `tieu_de` | String | Tên khóa học |
| `mo_ta` | Text | Mô tả |
| `gia_tien` | Numeric | Giá |
| `trinh_do` | String | `beginner`, `intermediate`, `advanced` |
| `anh_dai_dien` | String | Ảnh khóa học |
| `da_xuat_ban` | Boolean | Đã công khai hay chưa |
| `trang_thai_phe_duyet` | String | `draft`, `pending`, `approved`, `rejected` |
| `danh_gia_trung_binh` | Numeric | Rating trung bình |
| `ngay_tao` | DateTime | Ngày tạo |

Quan hệ:

- Một khóa học thuộc một giảng viên.
- Một khóa học thuộc một danh mục.
- Một khóa học có nhiều chương học.
- Một khóa học có nhiều bài kiểm tra.
- Một khóa học có nhiều đăng ký học.
- Một khóa học có nhiều đánh giá.

### 5.4. Bảng `chuong_hoc`, `bai_hoc`, `noi_dung_bai_hoc`

Khóa học có nhiều chương, chương có nhiều bài học, bài học có nhiều khối nội dung.

`chuong_hoc`:

| Cột | Ý nghĩa |
|---|---|
| `id` | Khóa chính |
| `ma_khoa_hoc` | Khóa học chứa chương |
| `tieu_de` | Tiêu đề chương |
| `thu_tu` | Thứ tự hiển thị |

`bai_hoc`:

| Cột | Ý nghĩa |
|---|---|
| `id` | Khóa chính |
| `ma_chuong_hoc` | Chương chứa bài |
| `tieu_de` | Tiêu đề bài học |
| `thoi_luong` | Thời lượng giây |
| `thu_tu` | Thứ tự |
| `xem_truoc` | Cho phép học thử |
| `da_xuat_ban` | Đã xuất bản |
| `trang_thai_phe_duyet` | Trạng thái kiểm duyệt |

`noi_dung_bai_hoc`:

| Cột | Ý nghĩa |
|---|---|
| `id` | Khóa chính |
| `ma_bai_hoc` | Bài học |
| `loai_noi_dung` | `video`, `pdf`, `text`, `code`, `image` |
| `noi_dung_text` | Nội dung dạng văn bản/code |
| `duong_dan_file` | URL file trên MinIO |
| `thu_tu` | Thứ tự |

Ràng buộc:

- Loại nội dung chỉ được thuộc danh sách hợp lệ.

### 5.5. Bảng giỏ hàng và đơn hàng

`chi_tiet_gio_hang`:

- Lưu khóa học đang nằm trong giỏ hàng của từng học viên.
- Có unique constraint `ma_nguoi_dung`, `ma_khoa_hoc` để tránh thêm trùng.

`don_hang`:

| Cột | Ý nghĩa |
|---|---|
| `id` | Mã đơn hàng |
| `ma_nguoi_dung` | Người mua |
| `ma_giam_gia_id` | Mã giảm giá áp dụng |
| `tong_tien` | Tổng tiền |
| `trang_thai` | `pending`, `success`, `fail` |
| `phuong_thuc_thanh_toan` | Visa/Momo/VNPay/mock |
| `ma_giao_dich` | Mã giao dịch |
| `ngay_thanh_toan` | Thời điểm thanh toán |

`chi_tiet_don_hang`:

- Lưu từng khóa học trong đơn.
- Lưu giá tại thời điểm mua bằng `gia_luc_mua`.

### 5.6. Bảng tiến độ và chứng chỉ

`dang_ky_hoc`:

- Tạo khi đơn hàng thanh toán thành công.
- Đại diện quyền học viên sở hữu khóa học.

`tien_do_hoc_tap`:

- Lưu bài học đã hoàn thành hay chưa.
- Lưu `video_resume_seconds` để tiếp tục video từ vị trí cũ.

`chung_chi`:

- Cấp khi học viên hoàn thành khóa học.
- Có `uuid` để xác minh công khai.
- Mỗi học viên chỉ có một chứng chỉ cho một khóa học.

### 5.7. Bảng quiz

| Bảng | Ý nghĩa |
|---|---|
| `bai_kiem_tra` | Bài kiểm tra thuộc khóa học |
| `cau_hoi` | Câu hỏi trong bài kiểm tra |
| `lua_chon_cau_hoi` | Các lựa chọn đáp án |
| `lich_su_lam_bai` | Lượt làm bài của học viên |
| `chi_tiet_bai_lam` | Câu trả lời chi tiết |

Logic:

- Quiz có điểm đạt.
- Có giới hạn số lượt làm.
- Khi nộp bài, hệ thống chấm điểm tự động.
- Nếu đạt điểm tối thiểu, `da_qua_mon = True`.

---

## 6. API sử dụng trong hệ thống

Tất cả API backend được đặt dưới prefix:

```text
/api/v1
```

### 6.1. Authentication API

Prefix:

```text
/api/v1/auth
```

| Method | Endpoint | Chức năng |
|---|---|---|
| POST | `/register` | Đăng ký tài khoản |
| POST | `/login` | Đăng nhập |
| POST | `/logout` | Đăng xuất |
| GET | `/profile` | Lấy hồ sơ người dùng hiện tại |
| PUT | `/profile` | Cập nhật hồ sơ |
| POST | `/change-password` | Đổi mật khẩu |
| POST | `/forgot-password` | Yêu cầu khôi phục mật khẩu |
| POST | `/reset-password` | Đặt lại mật khẩu |

### 6.2. Course & Content API

| Method | Endpoint | Chức năng |
|---|---|---|
| GET | `/categories` | Lấy danh mục |
| POST | `/categories` | Tạo danh mục |
| GET | `/courses` | Danh sách khóa học, hỗ trợ tìm kiếm/lọc/sắp xếp |
| GET | `/courses/{course_id}` | Chi tiết khóa học |
| POST | `/instructor/courses` | Giảng viên tạo khóa học |
| GET | `/instructor/courses` | Giảng viên xem khóa học của mình |
| PUT | `/courses/{course_id}` | Cập nhật khóa học |
| POST | `/courses/{course_id}/sections` | Tạo chương |
| PUT | `/sections/{section_id}` | Cập nhật chương |
| DELETE | `/sections/{section_id}` | Xóa chương |
| POST | `/sections/{section_id}/lessons` | Tạo bài học |
| PUT | `/lessons/{lesson_id}` | Cập nhật bài học |
| DELETE | `/lessons/{lesson_id}` | Xóa bài học |
| POST | `/lessons/{lesson_id}/contents` | Tạo nội dung bài học |
| PUT | `/lesson-contents/{content_id}` | Cập nhật nội dung |
| DELETE | `/lesson-contents/{content_id}` | Xóa nội dung |
| POST | `/courses/{course_id}/reviews` | Gửi đánh giá |
| GET | `/courses/{course_id}/reviews` | Lấy đánh giá |
| POST | `/courses/{course_id}/wishlist` | Thêm/bỏ yêu thích |
| GET | `/wishlist` | Danh sách yêu thích |

### 6.3. Cart API

Prefix:

```text
/api/v1/cart
```

| Method | Endpoint | Chức năng |
|---|---|---|
| GET | `/` | Lấy giỏ hàng |
| POST | `/items` | Thêm khóa học vào giỏ |
| DELETE | `/items/{course_id}` | Xóa khóa học khỏi giỏ |

### 6.4. Checkout & Payment API

| Method | Endpoint | Chức năng |
|---|---|---|
| POST | `/coupons/apply` | Áp dụng mã giảm giá |
| POST | `/checkout` | Tạo đơn hàng từ giỏ |
| GET | `/my-orders` | Lịch sử đơn hàng |
| POST | `/payments/mock` | Thanh toán giả lập |
| POST | `/payments/webhook` | Webhook thanh toán |
| POST | `/orders/{order_id}/refund` | Yêu cầu hoàn tiền |

### 6.5. Learning & Progress API

| Method | Endpoint | Chức năng |
|---|---|---|
| GET | `/enrollments/my-courses` | Khóa học đã sở hữu |
| GET | `/learn/courses/{course_id}/lessons/{lesson_id}` | Mở nội dung bài học |
| GET | `/progress/lessons/{lesson_id}` | Lấy tiến độ bài học |
| PUT | `/progress/lessons/{lesson_id}` | Cập nhật tiến độ bài học |
| GET | `/learn/courses/{course_id}/progress` | Lấy phần trăm tiến độ khóa học |

### 6.6. Quiz API

| Method | Endpoint | Chức năng |
|---|---|---|
| POST | `/courses/{course_id}/quizzes` | Tạo quiz |
| DELETE | `/quizzes/{quiz_id}` | Xóa quiz |
| POST | `/quizzes/{quiz_id}/questions` | Thêm câu hỏi |
| DELETE | `/questions/{question_id}` | Xóa câu hỏi |
| GET | `/courses/{course_id}/quizzes` | Lấy quiz của khóa học |
| GET | `/quizzes/{quiz_id}` | Lấy chi tiết quiz |
| POST | `/quizzes/{quiz_id}/attempts` | Bắt đầu làm bài |
| POST | `/quizzes/attempts/{attempt_id}/submit` | Nộp bài |
| GET | `/quizzes/attempts/{attempt_id}/result` | Xem kết quả |
| GET | `/quizzes/attempts/{attempt_id}/review` | Xem lại bài làm |

### 6.7. Certificate API

Prefix:

```text
/api/v1/certificates
```

| Method | Endpoint | Chức năng |
|---|---|---|
| GET | `/my` | Chứng chỉ của tôi |
| GET | `/{certificate_id}` | Chi tiết chứng chỉ |
| GET | `/verify/{uuid}` | Xác minh chứng chỉ công khai |
| GET | `/course/{course_id}` | Lấy chứng chỉ theo khóa học |

### 6.8. Upload API

Prefix:

```text
/api/v1/upload
```

| Method | Endpoint | Chức năng |
|---|---|---|
| POST | `/` | Upload file lên MinIO |

Các loại upload:

| Asset type | Định dạng |
|---|---|
| `image` | PNG, JPG, JPEG, GIF, WEBP |
| `lesson-image` | PNG, JPG, JPEG, GIF, WEBP |
| `avatar` | PNG, JPG, JPEG, GIF, WEBP |
| `pdf` | PDF |
| `video` | MP4, WEBM, MOV, MPEG |

Ràng buộc bảo mật upload:

- Kiểm tra MIME type.
- Kiểm tra phần mở rộng.
- Kiểm tra magic bytes.
- Kiểm tra kích thước file.
- Kiểm tra quyền upload theo vai trò.

### 6.9. Instructor Studio API

Prefix:

```text
/api/v1/instructor-studio
```

| Method | Endpoint | Chức năng |
|---|---|---|
| GET | `/stats` | Thống kê giảng viên |
| GET | `/students` | Danh sách học viên |
| GET | `/reviews` | Đánh giá khóa học của giảng viên |
| GET | `/transactions` | Giao dịch/doanh thu |
| POST | `/payouts` | Tạo yêu cầu rút tiền |
| GET | `/payouts` | Danh sách yêu cầu rút tiền |

### 6.10. Admin API

Prefix:

```text
/api/v1/admin
```

| Method | Endpoint | Chức năng |
|---|---|---|
| GET | `/stats` | Thống kê hệ thống |
| GET | `/users` | Quản lý người dùng |
| PUT | `/users/{user_id}/role` | Đổi vai trò |
| PUT | `/users/{user_id}/status` | Khóa/mở tài khoản |
| DELETE | `/users/{user_id}` | Xóa tài khoản |
| POST | `/users/{user_id}/reset-password` | Reset mật khẩu |
| GET | `/courses` | Quản lý khóa học |
| PUT | `/courses/{course_id}/approve` | Duyệt khóa học |
| PUT | `/courses/{course_id}/reject` | Từ chối khóa học |
| DELETE | `/courses/{course_id}` | Xóa khóa học |
| PUT | `/lessons/{lesson_id}/approve` | Duyệt bài học |
| PUT | `/lessons/{lesson_id}/reject` | Từ chối bài học |
| GET | `/coupons` | Quản lý mã giảm giá |
| PUT | `/coupons/{coupon_id}` | Cập nhật mã giảm giá |
| DELETE | `/coupons/{coupon_id}` | Xóa mã giảm giá |
| GET | `/reviews` | Quản lý đánh giá |
| DELETE | `/reviews/{review_id}` | Xóa đánh giá |
| GET | `/orders` | Quản lý đơn hàng |
| GET | `/logs` | Nhật ký quản trị |
| GET | `/settings` | Cấu hình hệ thống |
| PUT | `/settings` | Cập nhật cấu hình |

### 6.11. Banner API

Prefix:

```text
/api/v1/banners
```

| Method | Endpoint | Chức năng |
|---|---|---|
| GET | `/` | Lấy banner đang hiển thị |
| GET | `/admin` | Admin lấy tất cả banner |
| POST | `/` | Admin tạo banner |
| PUT | `/{banner_id}` | Admin cập nhật banner |
| DELETE | `/{banner_id}` | Admin xóa banner |

---

## 7. Logic nghiệp vụ chính

### 7.1. Nghiệp vụ học viên

#### 7.1.1. Tìm kiếm và lọc khóa học

Học viên có thể:

- Xem danh sách khóa học.
- Tìm kiếm theo từ khóa.
- Lọc theo danh mục.
- Lọc theo trình độ.
- Lọc theo giá.
- Sắp xếp theo tiêu chí.

Dữ liệu lấy từ API:

```text
GET /api/v1/courses
```

#### 7.1.2. Xem chi tiết khóa học

Trang chi tiết khóa học hiển thị:

- Ảnh đại diện.
- Tiêu đề.
- Mô tả.
- Giá.
- Trình độ.
- Số chương.
- Số bài học.
- Thời lượng.
- Giảng viên.
- Nội dung khóa học.
- Đánh giá.
- Khóa học liên quan.

API:

```text
GET /api/v1/courses/{course_id}
```

#### 7.1.3. Thêm vào giỏ hàng

Khi học viên bấm thêm giỏ hàng:

1. Frontend gọi API thêm khóa học vào giỏ.
2. Backend kiểm tra đăng nhập.
3. Backend kiểm tra khóa học có tồn tại không.
4. Backend kiểm tra đã thêm trùng chưa.
5. Backend lưu bản ghi vào `chi_tiet_gio_hang`.

API:

```text
POST /api/v1/cart/items
```

#### 7.1.4. Áp dụng mã giảm giá

Khi nhập mã giảm giá:

1. Backend kiểm tra mã có tồn tại không.
2. Kiểm tra hết hạn chưa.
3. Kiểm tra số lượt dùng tối đa.
4. Kiểm tra giá trị đơn tối thiểu.
5. Tính số tiền giảm theo `PERCENTAGE` hoặc `FIXED_AMOUNT`.

API:

```text
POST /api/v1/coupons/apply
```

#### 7.1.5. Thanh toán

Luồng thanh toán:

1. Học viên kiểm tra giỏ hàng.
2. Học viên chọn phương thức thanh toán.
3. Frontend gọi checkout.
4. Backend tạo `don_hang` và `chi_tiet_don_hang`.
5. Frontend chuyển sang trang kết quả thanh toán.
6. Frontend gọi payment mock.
7. Backend cập nhật đơn hàng thành `success`.
8. Backend tạo `dang_ky_hoc` cho từng khóa học trong đơn.
9. Giỏ hàng được làm sạch.

API:

```text
POST /api/v1/checkout
POST /api/v1/payments/mock
```

#### 7.1.6. Học bài

Luồng học bài:

1. Học viên vào `/learn/{courseId}`.
2. Frontend tải chi tiết khóa học.
3. Khi mở bài học, backend kiểm tra:
   - Bài học có thuộc khóa học không.
   - Bài học đã xuất bản chưa.
   - Nếu không phải preview thì học viên phải sở hữu khóa học.
   - Nếu học tuần tự thì phải hoàn thành bài trước.
4. Backend trả nội dung bài học.
5. Nếu nội dung là file MinIO trả phí, backend sinh signed URL.

API:

```text
GET /api/v1/learn/courses/{course_id}/lessons/{lesson_id}
```

#### 7.1.7. Theo dõi tiến độ

Tiến độ từng bài học được lưu ở bảng `tien_do_hoc_tap`.

Các trạng thái:

- `da_hoan_thanh = false`: chưa hoàn thành.
- `da_hoan_thanh = true`: đã hoàn thành.
- `video_resume_seconds`: vị trí xem video gần nhất.

API:

```text
GET /api/v1/progress/lessons/{lesson_id}
PUT /api/v1/progress/lessons/{lesson_id}
GET /api/v1/learn/courses/{course_id}/progress
```

Phần trăm tiến độ được tính:

```text
(số bài học hoàn thành + số quiz đạt) / (tổng bài học + tổng quiz) * 100
```

#### 7.1.8. Làm bài kiểm tra

Luồng làm quiz:

1. Học viên mở quiz.
2. Hệ thống kiểm tra quyền học.
3. Học viên bắt đầu lượt làm bài.
4. Học viên chọn đáp án.
5. Hệ thống chấm điểm tự động.
6. Nếu điểm đạt >= `diem_dat`, lượt làm được đánh dấu qua môn.

API:

```text
POST /api/v1/quizzes/{quiz_id}/attempts
POST /api/v1/quizzes/attempts/{attempt_id}/submit
GET /api/v1/quizzes/attempts/{attempt_id}/result
```

#### 7.1.9. Nhận chứng chỉ

Khi học viên hoàn thành toàn bộ khóa học:

1. Backend kiểm tra tiến độ.
2. Nếu đủ điều kiện, tạo chứng chỉ.
3. Chứng chỉ có UUID để xác minh công khai.

API:

```text
GET /api/v1/certificates/my
GET /api/v1/certificates/verify/{uuid}
```

### 7.2. Nghiệp vụ giảng viên

#### 7.2.1. Đăng ký/trở thành giảng viên

Người dùng có thể xem trang trở thành giảng viên để hiểu:

- Quyền lợi.
- Quy trình triển khai khóa học.
- Tiềm năng tăng thu nhập.
- Giá trị chia sẻ cộng đồng.

Admin có thể cấp vai trò `instructor`.

#### 7.2.2. Tạo khóa học

Giảng viên tạo khóa học với các thông tin:

- Tiêu đề.
- Mô tả.
- Danh mục.
- Trình độ.
- Giá tiền.
- Ảnh đại diện.

Ban đầu khóa học có thể ở trạng thái:

- `draft`: bản nháp.
- `pending`: chờ admin duyệt.
- `approved`: được duyệt.
- `rejected`: bị từ chối.

#### 7.2.3. Quản lý chương và bài học

Giảng viên có thể:

- Tạo chương học.
- Cập nhật chương.
- Xóa chương.
- Tạo bài học.
- Thêm nội dung bài học.
- Upload video/PDF/hình ảnh.
- Sắp xếp nội dung.

Mỗi bài học có thể chứa nhiều loại nội dung:

- Video.
- PDF.
- Text.
- Code.
- Image.

#### 7.2.4. Theo dõi học viên

Giảng viên có thể xem:

- Số lượng học viên.
- Danh sách học viên.
- Đánh giá khóa học.
- Giao dịch liên quan.

API:

```text
GET /api/v1/instructor-studio/students
GET /api/v1/instructor-studio/reviews
GET /api/v1/instructor-studio/transactions
```

#### 7.2.5. Doanh thu và rút tiền

Giảng viên có thể:

- Xem doanh thu.
- Gửi yêu cầu rút tiền.
- Theo dõi trạng thái yêu cầu rút tiền.

Trạng thái payout:

- `pending`
- `success`
- `rejected`

### 7.3. Nghiệp vụ admin

#### 7.3.1. Quản lý người dùng

Admin có thể:

- Xem danh sách người dùng.
- Đổi vai trò.
- Khóa/mở tài khoản.
- Reset mật khẩu.
- Xóa tài khoản.

#### 7.3.2. Kiểm duyệt khóa học và bài học

Admin kiểm duyệt:

- Khóa học do giảng viên gửi.
- Bài học mới.
- Nội dung học liệu.

Nếu duyệt:

- `trang_thai_phe_duyet = approved`
- `da_xuat_ban = true`

Nếu từ chối:

- `trang_thai_phe_duyet = rejected`

#### 7.3.3. Quản lý banner

Admin quản lý banner trang chủ:

- Tạo banner.
- Cập nhật ảnh, tiêu đề, đường dẫn.
- Bật/tắt trạng thái.
- Sắp xếp thứ tự.

#### 7.3.4. Quản lý mã giảm giá

Admin quản lý coupon:

- Mã code.
- Loại giảm giá.
- Giá trị giảm.
- Giá trị đơn tối thiểu.
- Số lượt dùng tối đa.
- Ngày hết hạn.

#### 7.3.5. Quản lý đơn hàng

Admin xem:

- Danh sách đơn hàng.
- Trạng thái đơn.
- Tổng tiền.
- Người mua.
- Chi tiết khóa học trong đơn.

#### 7.3.6. Nhật ký quản trị

Mỗi thao tác quan trọng của admin được lưu vào `nhat_ky_quan_tri`:

- Duyệt khóa học.
- Từ chối khóa học.
- Xóa khóa học.
- Reset mật khẩu.
- Cấp quyền học.

---

## 8. Bảo mật hệ thống

### 8.1. Bảo mật xác thực

- Mật khẩu được hash bằng `passlib[bcrypt]`.
- JWT ký bằng `SECRET_KEY`.
- Token lưu bằng HttpOnly Cookie.
- Backend kiểm tra role cho API nhạy cảm.

### 8.2. Bảo mật phân quyền

| Vai trò | Quyền |
|---|---|
| Student | Học, mua khóa học, làm quiz, đánh giá |
| Instructor | Tạo và quản lý khóa học của mình |
| Admin | Quản trị toàn hệ thống |

Một số rule quan trọng:

- Học viên không thể xem bài học trả phí nếu chưa mua.
- Giảng viên chỉ sửa khóa học do mình tạo.
- Admin mới có quyền duyệt/xóa dữ liệu hệ thống.
- Student không được upload video/PDF học liệu.

### 8.3. Bảo mật upload file

Upload API kiểm tra nhiều lớp:

- `asset_type` phải hợp lệ.
- MIME type phải khớp.
- Extension phải khớp.
- Magic bytes phải khớp nội dung thật.
- Kích thước file bị giới hạn.
- Quyền upload phụ thuộc vai trò.

Giới hạn:

| Loại file | Giới hạn |
|---|---|
| Image/avatar | 5MB |
| PDF | 25MB |
| Video | 200MB |

### 8.4. Bảo mật học liệu MinIO

Hình ảnh có thể public-read để hiển thị giao diện.

Video/PDF học liệu được bảo vệ bằng signed URL:

- Chỉ sinh URL khi học viên có quyền học.
- URL có thời hạn.
- Người không mua khóa học không lấy được nội dung qua API học.

### 8.5. CORS

Backend cấu hình CORS cho phép frontend gọi API:

```text
http://localhost:3000
http://127.0.0.1:3000
```

---

## 9. Luồng dữ liệu nghiệp vụ quan trọng

### 9.1. Luồng mua khóa học

```text
Học viên chọn khóa học
  -> Thêm vào giỏ hàng
  -> Kiểm tra giỏ hàng
  -> Áp dụng coupon nếu có
  -> Checkout tạo đơn hàng
  -> Thanh toán mock/webhook
  -> Đơn hàng success
  -> Tạo enrollment
  -> Học viên vào khóa học
```

### 9.2. Luồng học bài

```text
Học viên vào /learn/{courseId}
  -> Tải chi tiết khóa học
  -> Chọn bài học
  -> Backend kiểm tra quyền sở hữu
  -> Backend kiểm tra học tuần tự
  -> Sinh signed URL nếu có file riêng tư
  -> Frontend hiển thị video/PDF/text/code/image
  -> Học viên bấm hoàn thành
  -> Cập nhật Progress
  -> Tính lại phần trăm khóa học
```

### 9.3. Luồng cấp chứng chỉ

```text
Học viên hoàn thành toàn bộ bài học
  -> Làm quiz đạt yêu cầu nếu có
  -> Backend kiểm tra tiến độ
  -> Tạo Certificate
  -> Sinh UUID xác minh
  -> Học viên xem/chia sẻ chứng chỉ
```

### 9.4. Luồng tạo khóa học của giảng viên

```text
Giảng viên tạo khóa học
  -> Thêm chương học
  -> Thêm bài học
  -> Upload nội dung video/PDF/text/code/image
  -> Gửi duyệt
  -> Admin kiểm duyệt
  -> Khóa học được xuất bản
  -> Học viên có thể mua/học
```

---

## 10. Giao diện frontend chính

### 10.1. Trang công khai

| Route | Chức năng |
|---|---|
| `/` | Trang chủ, banner, danh mục, khóa học nổi bật |
| `/courses` | Danh sách khóa học |
| `/courses/[id]` | Chi tiết khóa học |
| `/about` | Giới thiệu |
| `/instructors` | Danh sách giảng viên |
| `/become-instructor` | Trang trở thành giảng viên |

### 10.2. Trang học viên

| Route | Chức năng |
|---|---|
| `/cart` | Giỏ hàng |
| `/checkout` | Thanh toán |
| `/payment-result` | Kết quả thanh toán |
| `/my-courses` | Khóa học của tôi |
| `/learn/[courseId]` | Không gian học tập |
| `/quiz/[quizId]` | Làm bài kiểm tra |
| `/quiz/[quizId]/review` | Xem lại bài làm |
| `/certificates` | Chứng chỉ |
| `/wishlist` | Danh sách yêu thích |
| `/orders` | Đơn hàng |
| `/notifications` | Thông báo |
| `/profile` | Hồ sơ |
| `/settings` | Cài đặt |

### 10.3. Trang giảng viên

| Route | Chức năng |
|---|---|
| `/instructor/dashboard` | Dashboard giảng viên |
| `/instructor/courses` | Quản lý khóa học |
| `/instructor/courses/create` | Tạo khóa học |
| `/instructor/courses/[id]/edit` | Sửa khóa học |
| `/instructor/courses/[id]/sections` | Quản lý chương |
| `/instructor/courses/[id]/sections/[sectionId]/lessons` | Quản lý bài học |
| `/instructor/courses/[id]/sections/[sectionId]/lessons/create` | Tạo bài học |
| `/instructor/courses/[id]/quizzes` | Quản lý quiz |
| `/instructor/courses/[id]/students` | Học viên của khóa học |
| `/instructor/revenue` | Doanh thu |
| `/instructor/revenue/withdraw` | Rút tiền |
| `/instructor/reviews` | Đánh giá |
| `/instructor/students` | Học viên |

### 10.4. Trang admin

| Route | Chức năng |
|---|---|
| `/admin` | Dashboard admin |
| `/admin/users` | Quản lý người dùng |
| `/admin/courses` | Quản lý khóa học |
| `/admin/categories` | Quản lý danh mục |
| `/admin/banners` | Quản lý banner |
| `/admin/coupons` | Quản lý mã giảm giá |
| `/admin/orders` | Quản lý đơn hàng |
| `/admin/enrollments` | Quản lý quyền học |
| `/admin/moderation` | Kiểm duyệt |
| `/admin/logs` | Nhật ký |
| `/admin/settings` | Cấu hình |

---

## 11. Kiểm thử và xác nhận hoạt động

### 11.1. Kiểm tra frontend

Các lệnh sử dụng:

```bash
cd lms-frontend
npx tsc --noEmit
npm run build
```

Ý nghĩa:

- `tsc --noEmit`: kiểm tra TypeScript.
- `npm run build`: build production bằng Next.js.

### 11.2. Kiểm tra backend

Các kiểm tra chính:

- Backend khởi động được bằng Uvicorn.
- Kết nối PostgreSQL thông qua `DATABASE_URL`.
- API docs hoạt động tại `/docs` trong môi trường development.
- MinIO hoạt động tại cổng `9000`, console tại `9001`.
- Upload file đúng loại.
- API học bài chặn người chưa mua.
- API admin yêu cầu quyền admin.

### 11.3. Kiểm thử nghiệp vụ

| Nghiệp vụ | Kết quả mong đợi |
|---|---|
| Đăng ký/đăng nhập | Người dùng có session |
| Thêm giỏ hàng | Khóa học xuất hiện trong giỏ |
| Checkout | Tạo đơn hàng pending |
| Thanh toán mock | Đơn hàng success và tạo enrollment |
| Vào học | Học viên xem được bài đã mua |
| Chưa mua khóa học | Không xem được bài trả phí |
| Hoàn thành bài | Tiến độ tăng đúng |
| Làm quiz | Có điểm và trạng thái qua/chưa qua |
| Hoàn thành khóa | Cấp chứng chỉ |
| Admin duyệt khóa | Khóa học được xuất bản |

---

## 12. Môi trường triển khai

### 12.1. Backend

Backend sử dụng:

```text
FastAPI + Uvicorn + PostgreSQL + MinIO + Redis
```

Biến môi trường quan trọng:

| Biến | Ý nghĩa |
|---|---|
| `DATABASE_URL` | Chuỗi kết nối PostgreSQL |
| `SECRET_KEY` | Khóa ký JWT |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Thời gian sống token |
| `CORS_ORIGINS` | Frontend được phép gọi API |
| `MINIO_ENDPOINT_URL` | Endpoint nội bộ MinIO |
| `MINIO_PUBLIC_URL` | URL public của MinIO |
| `MINIO_BUCKET_NAME` | Tên bucket |
| `PAYMENT_WEBHOOK_SECRET` | Secret xác minh webhook |

### 12.2. Frontend

Frontend dùng biến:

```text
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

Next config cho phép load ảnh từ:

- `picsum.photos`
- `localhost:9000`
- `api.dicebear.com`

Do MinIO local resolve về private IP, cấu hình Next có:

```ts
dangerouslyAllowLocalIP: true
```

Thiết lập này phù hợp cho local/demo. Khi triển khai thật nên dùng domain public/CDN cho MinIO.

### 12.3. Docker Compose backend

File `lms-backend/docker-compose.yml` có các service:

| Service | Cổng | Chức năng |
|---|---|---|
| Redis | `6379` | Cache/session tạm |
| MinIO | `9000`, `9001` | Object storage |
| Web/FastAPI | `8000` | Backend API |

---

## 13. Đánh giá ưu điểm

- Có đủ 3 tác nhân: học viên, giảng viên, admin.
- Backend có nghiệp vụ rõ ràng, không chỉ CRUD.
- CSDL có quan hệ đầy đủ cho LMS.
- Có kiểm duyệt khóa học/bài học.
- Có giỏ hàng, coupon, checkout, thanh toán mock.
- Có theo dõi tiến độ học tập.
- Có quiz và chứng chỉ.
- Có upload file an toàn.
- Có MinIO để lưu học liệu.
- Có phân quyền theo vai trò.
- Có dashboard riêng cho admin và giảng viên.

---

## 14. Hạn chế và hướng phát triển

### 14.1. Hạn chế hiện tại

- Thanh toán thật với Momo/VNPay mới ở mức cấu hình/sandbox, chưa tích hợp production hoàn chỉnh.
- Redis chưa được khai thác sâu cho cache.
- Q&A và ghi chú lớp học hiện chủ yếu là frontend state, có thể mở rộng lưu CSDL.
- Chưa có hệ thống thông báo realtime.
- Chưa có DRM bảo vệ video nâng cao.

### 14.2. Hướng phát triển

- Tích hợp thanh toán thật Momo/VNPay.
- Thêm thông báo realtime bằng WebSocket.
- Lưu ghi chú và hỏi đáp vào database.
- Thêm tìm kiếm nâng cao bằng full-text search.
- Thêm báo cáo doanh thu chi tiết cho giảng viên.
- Thêm hệ thống bài tập tự luận.
- Tối ưu bảo vệ video bằng signed URL ngắn hạn hoặc streaming proxy.
- Triển khai production với HTTPS, domain MinIO/CDN riêng.

---

## 15. Kết luận

Lumina LMS là một hệ thống đăng ký khóa học trực tuyến có đầy đủ các phân hệ quan trọng của một nền tảng học trực tuyến:

- Quản lý người dùng.
- Quản lý khóa học và nội dung multimedia.
- Tìm kiếm, lọc, mua khóa học.
- Giỏ hàng, mã giảm giá, thanh toán.
- Theo dõi tiến độ học.
- Làm bài kiểm tra.
- Cấp chứng chỉ.
- Quản trị admin.
- Quản lý giảng viên.
- Lưu trữ học liệu bằng MinIO.

Hệ thống sử dụng kiến trúc hiện đại với Next.js ở frontend, FastAPI ở backend, PostgreSQL cho dữ liệu quan hệ và MinIO cho lưu trữ file. Việc tách rõ frontend, backend, database và object storage giúp hệ thống dễ mở rộng, dễ bảo trì và phù hợp với yêu cầu của đề tài hệ thống đăng ký khóa học trực tuyến.
