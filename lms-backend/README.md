# LuminaLMS Backend

Backend cua LuminaLMS duoc xay dung bang FastAPI, SQLAlchemy async, PostgreSQL, Redis, MinIO va Alembic. Ung dung cung cap REST API cho frontend Next.js, bao gom xac thuc, quan ly khoa hoc, gio hang, thanh toan, tien do hoc tap, quiz, chung chi, giang vien va quan tri vien.

## 1. Vai tro cua backend

Backend chiu trach nhiem:

- Xac thuc va phan quyen nguoi dung.
- Xu ly logic hoc vien, giang vien va quan tri vien.
- Quan ly khoa hoc, chuong hoc, bai hoc va noi dung bai hoc.
- Quan ly gio hang, don hang, ma giam gia va thanh toan.
- Theo doi tien do hoc tap.
- Xu ly bai kiem tra.
- Tao va xac thuc chung chi.
- Upload va quan ly file qua MinIO.
- Cache va blacklist token bang Redis.
- Quan ly schema database bang Alembic.

## 2. Cong nghe chinh

- Python 3.11.
- FastAPI 0.111.0.
- Uvicorn.
- SQLAlchemy 2.0.30.
- Asyncpg.
- PostgreSQL.
- Alembic 1.13.1.
- Pydantic 2.7.2.
- Pydantic Settings.
- PyJWT.
- Bcrypt.
- Redis.
- MinIO qua boto3.
- ReportLab de tao chung chi PDF.

## 3. Cau truc thu muc

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

Y nghia:

- `app/main.py`: diem khoi tao FastAPI app, CORS, GZip, lifespan va router.
- `app/api`: tang API, nhan request va tra response.
- `app/api/deps.py`: dependency dung chung cho database session va xac thuc.
- `app/api/v1/router.py`: gom tat ca endpoint cua API v1.
- `app/api/v1/dynamic_crud.py`: ham tao CRUD router tong quat cho admin.
- `app/api/v1/endpoints`: cac endpoint theo tung nghiep vu.
- `app/core`: cau hinh loi, database, Redis, JWT, bao mat.
- `app/models`: SQLAlchemy model anh xa bang PostgreSQL.
- `app/schemas`: Pydantic schema cho request va response.
- `app/services`: logic nghiep vu.
- `app/assets/fonts`: font Roboto de tao PDF chung chi co tieng Viet.
- `alembic`: migration database.
- `scripts`: script ho tro kiem thu va van hanh.

## 4. Bien moi truong

Tao file `.env`:

```powershell
Copy-Item .env.example .env
```

Tren macOS/Linux:

```bash
cp .env.example .env
```

Nhung bien quan trong:

```env
APP_ENV=development
PORT=8000
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/lms_db
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=CHANGE_ME_TO_A_LONG_RANDOM_SECRET_KEY
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
MINIO_ENDPOINT_URL=http://localhost:9000
MINIO_PUBLIC_URL=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadminpassword
MINIO_BUCKET_NAME=lms-storage
```

Khong commit `.env` len Git.

## 5. Chay phu thuoc ha tang

File `docker-compose.yml` hien co Redis, MinIO va backend app. PostgreSQL can duoc chay rieng hoac cau hinh bang mot database co san.

Chay Redis va MinIO:

```powershell
docker compose up -d redis minio
```

MinIO:

```text
API:      http://localhost:9000
Console:  http://localhost:9001
User:     minioadmin
Password: minioadminpassword
```

## 6. Chay backend local

Windows PowerShell:

```powershell
cd lms-backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

macOS/Linux:

```bash
cd lms-backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Mo tai lieu API:

```text
http://localhost:8000/docs
```

## 7. Chay backend bang Docker

Them cac bien sau vao `.env` neu muon chay service `web` trong Docker:

```env
DOCKER_DATABASE_URL=postgresql+asyncpg://postgres:postgres@host.docker.internal:5432/lms_db
DOCKER_REDIS_URL=redis://redis:6379/0
APP_ENV=production
SECRET_KEY=CHANGE_ME_TO_A_LONG_RANDOM_SECRET_KEY
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
MINIO_PUBLIC_URL=http://localhost:9000
```

Chay:

```powershell
docker compose up -d --build
```

Dockerfile se tu chay:

```bash
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## 8. Alembic migration

Tao migration sau khi thay doi model:

```powershell
alembic revision --autogenerate -m "noi dung thay doi"
```

Ap dung migration:

```powershell
alembic upgrade head
```

Lui mot migration:

```powershell
alembic downgrade -1
```

Alembic doc `Base.metadata` tu SQLAlchemy model de so sanh voi schema hien tai trong database.

## 9. API documentation

Khi `APP_ENV=development`, FastAPI bat:

```text
Swagger: http://localhost:8000/docs
ReDoc:   http://localhost:8000/redoc
```

Khi `APP_ENV=production` hoac `prod`, `main.py` tat `/docs` va `/redoc`.

## 10. Cac nhom API chinh

- `auth.py`: dang ky, dang nhap, dang xuat, quen mat khau, profile.
- `courses.py`: danh muc, khoa hoc, chi tiet khoa hoc.
- `cart.py`: gio hang.
- `orders.py`: don hang, thanh toan, ma giam gia.
- `progress.py`: tien do hoc tap.
- `quizzes.py`: bai kiem tra, cau hoi, lich su lam bai.
- `certificates.py`: tao va xac thuc chung chi.
- `banners.py`: banner public.
- `notifications.py`: thong bao.
- `instructors.py`: thong tin giang vien.
- `instructor_studio.py`: khu quan ly cua giang vien.
- `admin.py`: nghiep vu quan tri.
- `dynamic_admin.py`: CRUD admin tong quat.

## 11. Redis trong backend

Redis duoc dung cho:

- Cache danh muc khoa hoc.
- Xoa cache khi danh muc thay doi.
- Blacklist token sau khi dang xuat.

Redis khong thay the PostgreSQL. Du lieu nghiep vu chinh van luu trong PostgreSQL.

## 12. MinIO va upload file

MinIO duoc dung de luu anh khoa hoc, anh dai dien, banner, PDF, video va tai lieu bai hoc. Backend su dung `storage_service.py` de lam viec voi MinIO.

## 13. Chung chi PDF

Chung chi duoc tao bang ReportLab. Font Roboto nam tai:

```text
app/assets/fonts/Roboto-Regular.ttf
app/assets/fonts/Roboto-Bold.ttf
```

Khong nen xoa folder font vi co the lam loi dau tieng Viet trong PDF.

## 14. Bao mat

Backend co cac co che:

- Bam mat khau bang bcrypt.
- Tao access token bang JWT.
- Xac thuc token trong `api/deps.py`.
- Phan quyen hoc vien, giang vien, admin.
- Blacklist token bang Redis khi logout.
- Kiem tra upload file theo role va MIME type.
- Tat docs trong production.
- Chan secret mac dinh khi chay production.

## 15. Kiem tra nhanh

Kiem tra cu phap Python:

```powershell
python -m compileall app
```

Kiem tra OpenAPI:

```powershell
python -c "from app.main import app; print(len(app.openapi()['paths']))"
```

Kiem tra frontend o thu muc goc:

```powershell
cd ..\lms-frontend
npm run build
```

## 16. Script ho tro

```text
scripts/api_smoke_test.py
scripts/check_modular_boundaries.py
scripts/download_fonts.py
```

Chay kiem tra import boundary:

```powershell
python scripts/check_modular_boundaries.py
```

## 17. Loi thuong gap

### Backend khong ket noi duoc database

Kiem tra PostgreSQL da chay, database da tao, `DATABASE_URL` dung va user/password dung.

### Redis connection refused

```powershell
docker compose up -d redis
```

### MinIO upload loi

Kiem tra MinIO dang chay, bucket dung, access key va secret key dung, `MINIO_ENDPOINT_URL` dung voi moi truong chay backend.

### Swagger khong hien

Neu `APP_ENV=production`, Swagger bi tat theo thiet ke. Doi ve:

```env
APP_ENV=development
```

roi khoi dong lai backend.

## 18. Ghi chu ban giao

Nen gui:

```text
app/
alembic/
scripts/
requirements.txt
Dockerfile
docker-compose.yml
alembic.ini
.env.example
README.md
```

Khong gui:

```text
.env
.venv
__pycache__
*.pyc
```
