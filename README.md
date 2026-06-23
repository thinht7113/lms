# LuminaLMS - He thong dang ky khoa hoc truc tuyen

LuminaLMS la nen tang quan ly va dang ky khoa hoc truc tuyen, duoc xay dung theo mo hinh Client-Server. He thong cho phep hoc vien tim kiem, mua va hoc khoa hoc; giang vien tao va quan ly noi dung dao tao; quan tri vien kiem duyet, quan ly nguoi dung, don hang, ma giam gia, banner va cau hinh he thong.

Du an gom hai ung dung chinh:

```text
LMS/
├── lms-backend   # FastAPI, PostgreSQL, Redis, MinIO, Alembic
└── lms-frontend  # Next.js, React, TypeScript, Tailwind CSS
```

## 1. Tong quan chuc nang

### 1.1. Hoc vien

- Dang ky, dang nhap, dang xuat.
- Xem danh sach khoa hoc, tim kiem, loc va sap xep khoa hoc.
- Xem chi tiet khoa hoc, noi dung chuong hoc va bai hoc xem truoc.
- Them khoa hoc vao gio hang.
- Ap dung ma giam gia.
- Thanh toan don hang.
- Xem danh sach khoa hoc da mua.
- Hoc bai theo tung khoa hoc.
- Theo doi tien do hoc tap.
- Lam bai kiem tra.
- Nhan chung chi khi hoan thanh dieu kien.
- Xem thong bao, don hang, ho so va chung chi.

### 1.2. Giang vien

- Dang ky tro thanh giang vien.
- Truy cap khu vuc quan ly giang vien.
- Tao khoa hoc, chuong hoc va bai hoc.
- Upload noi dung bai hoc gom van ban, PDF, video, hinh anh va tai lieu dinh kem.
- Quan ly trang thai khoa hoc dang cho duyet.
- Xem hoc vien cua khoa hoc.
- Xem doanh thu va gui yeu cau rut tien.

### 1.3. Quan tri vien

- Xem dashboard tong quan.
- Quan ly nguoi dung, danh muc, khoa hoc, dang ky hoc, don hang, ma giam gia, banner va cau hinh.
- Kiem duyet khoa hoc va bai hoc.
- Quan ly nhat ky he thong.
- Xu ly cac nghiep vu quan tri nhu khoa tai khoan, cap lai mat khau, duyet noi dung.

## 2. Cong nghe su dung

### 2.1. Backend

- Python 3.11.
- FastAPI.
- SQLAlchemy 2.0 async.
- Asyncpg.
- PostgreSQL.
- Alembic.
- Pydantic v2.
- Pydantic Settings.
- PyJWT.
- Bcrypt.
- Redis.
- MinIO.
- ReportLab.
- Uvicorn.
- Docker.

### 2.2. Frontend

- Next.js 16.
- React 19.
- TypeScript.
- Tailwind CSS 4.
- Lucide React.
- CKEditor 5.
- Recharts.
- @hello-pangea/dnd.

### 2.3. Ha tang phu tro

- PostgreSQL: co so du lieu quan he chinh.
- Redis: cache danh muc va blacklist token sau khi dang xuat.
- MinIO: luu file upload nhu anh, PDF, video, tai lieu va anh banner.
- Alembic: quan ly phien ban cau truc co so du lieu.

## 3. Kien truc tong the

He thong su dung kien truc Client-Server.

```text
Trinh duyet nguoi dung
        ↓
Frontend Next.js
        ↓ HTTP/REST API
Backend FastAPI
        ↓
PostgreSQL / Redis / MinIO
```

Frontend chiu trach nhiem hien thi giao dien, dieu huong trang, quan ly state phia client va goi API.

Backend chiu trach nhiem xac thuc, phan quyen, xu ly nghiep vu, truy van co so du lieu, quan ly file va tra du lieu JSON.

## 4. Cau truc thu muc

### 4.1. Thu muc goc

```text
LMS/
├── lms-backend
├── lms-frontend
├── README.md
└── BAO_CAO_CAU_TRUC_DU_AN.md
```

### 4.2. Backend

```text
lms-backend/
├── alembic
│   ├── env.py
│   └── versions
├── app
│   ├── api
│   ├── assets
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

Y nghia cac thanh phan:

- `app/api`: dinh nghia endpoint API.
- `app/api/deps.py`: dependency dung chung nhu database session, current user, current admin.
- `app/api/v1/router.py`: gom tat ca router v1.
- `app/api/v1/dynamic_crud.py`: tao CRUD router dung chung cho admin.
- `app/api/v1/endpoints`: chua cac endpoint theo tung nghiep vu.
- `app/core`: cau hinh nen tang nhu database, Redis, JWT, bao mat, bien moi truong.
- `app/models`: SQLAlchemy model anh xa bang co so du lieu.
- `app/schemas`: Pydantic schema cho request va response.
- `app/services`: logic nghiep vu.
- `app/assets/fonts`: font Roboto dung khi tao chung chi PDF.
- `alembic`: migration co so du lieu.
- `scripts`: script ho tro kiem thu, tai font, kiem tra cau truc.

### 4.3. Frontend

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
├── tsconfig.json
└── eslint.config.mjs
```

Y nghia cac thanh phan:

- `src/app`: cau truc route theo Next.js App Router.
- `src/components`: component giao dien tai su dung.
- `src/components/admin`: component rieng cho trang quan tri.
- `src/contexts`: React Context dung cho state toan cuc.
- `src/hooks`: custom hook tai su dung.
- `src/services/api.ts`: lop goi API backend.
- `src/utils`: ham tien ich.
- `middleware.ts`: kiem tra quyen truy cap mot so route truoc khi render.
- `next.config.ts`: cau hinh Next.js.

## 5. Yeu cau moi truong

Can cai dat:

- Python 3.11 tro len.
- Node.js 20 tro len.
- npm.
- Docker Desktop neu muon chay Redis, MinIO hoac backend bang container.
- PostgreSQL neu chay database tren may local.

Cong mac dinh:

```text
Frontend: http://localhost:3000
Backend:  http://localhost:8000
Swagger:  http://localhost:8000/docs
Redis:    localhost:6379
MinIO:    http://localhost:9000
MinIO UI: http://localhost:9001
```

## 6. Cau hinh bien moi truong

### 6.1. Backend

Tao file `.env` tu file mau:

```powershell
cd lms-backend
Copy-Item .env.example .env
```

Tren macOS/Linux:

```bash
cd lms-backend
cp .env.example .env
```

Nhung bien quan trong:

```env
APP_ENV=development
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/lms_db
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=CHANGE_ME_TO_A_LONG_RANDOM_SECRET_KEY
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
MINIO_ENDPOINT_URL=http://localhost:9000
MINIO_PUBLIC_URL=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadminpassword
MINIO_BUCKET_NAME=lms-storage
```

Khong nen dua file `.env` that len Git.

### 6.2. Frontend

Trong `lms-frontend/.env`, cau hinh API backend:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

Neu backend trien khai tren domain that, thay gia tri nay bang URL API that.

## 7. Chay du an tren may local

### 7.1. Khoi dong Redis va MinIO bang Docker

File `lms-backend/docker-compose.yml` hien co Redis, MinIO va service backend. Neu chi muon chay Redis va MinIO:

```powershell
cd lms-backend
docker compose up -d redis minio
```

Luu y: file compose hien tai khong khai bao service PostgreSQL. Can co PostgreSQL chay rieng tren may local hoac cau hinh `DATABASE_URL` tro den database dang co.

### 7.2. Tao database PostgreSQL

Tao database phu hop voi `DATABASE_URL`, vi du:

```sql
CREATE DATABASE lms_db;
```

Neu dung user/password khac, cap nhat lai `DATABASE_URL` trong `lms-backend/.env`.

### 7.3. Cai dat va chay backend

Tren Windows PowerShell:

```powershell
cd lms-backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Tren macOS/Linux:

```bash
cd lms-backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Sau khi backend chay, mo:

```text
http://localhost:8000/docs
```

### 7.4. Cai dat va chay frontend

```powershell
cd lms-frontend
npm install
npm run dev
```

Mo trinh duyet:

```text
http://localhost:3000
```

## 8. Chay backend bang Docker

Trong `lms-backend/.env`, can co cac bien cho container:

```env
DOCKER_DATABASE_URL=postgresql+asyncpg://postgres:postgres@host.docker.internal:5432/lms_db
DOCKER_REDIS_URL=redis://redis:6379/0
APP_ENV=production
SECRET_KEY=CHANGE_ME_TO_A_LONG_RANDOM_SECRET_KEY
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
MINIO_PUBLIC_URL=http://localhost:9000
```

Sau do chay:

```powershell
cd lms-backend
docker compose up -d --build
```

Dockerfile se tu chay:

```bash
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

Neu PostgreSQL khong chay trong Docker, `DOCKER_DATABASE_URL` phai tro den PostgreSQL that ma container truy cap duoc.

## 9. Migration co so du lieu voi Alembic

Alembic quan ly lich su thay doi cau truc co so du lieu.

Khi thay doi model SQLAlchemy:

```powershell
cd lms-backend
alembic revision --autogenerate -m "noi dung thay doi"
alembic upgrade head
```

Giai thich:

- `alembic revision --autogenerate`: so sanh `Base.metadata` voi database va sinh file migration trong `alembic/versions`.
- `alembic upgrade head`: ap dung migration moi nhat vao database.
- `alembic downgrade -1`: lui lai mot migration gan nhat neu migration co `downgrade()` hop le.

## 10. Tai lieu API

Khi `APP_ENV=development`, FastAPI bat tai lieu API:

```text
Swagger UI: http://localhost:8000/docs
ReDoc:      http://localhost:8000/redoc
```

Khi `APP_ENV=production` hoac `prod`, `main.py` tat `/docs` va `/redoc` de han che lo tai lieu API tren moi truong that.

## 11. Bao mat va luu tru

He thong dang su dung JWT, HttpOnly cookie, bcrypt, RBAC, Redis blacklist token, HMAC webhook signature va kiem tra file upload theo role. MinIO duoc dung de luu anh khoa hoc, banner, PDF, video va tai lieu dinh kem. Redis duoc dung de cache danh muc khoa hoc va blacklist token sau logout.

## 12. Build va kiem tra

Backend:

```powershell
cd lms-backend
python -m compileall app
python -c "from app.main import app; print(len(app.openapi()['paths']))"
```

Frontend:

```powershell
cd lms-frontend
npm run build
```

## 13. Cac loi thuong gap

- Backend khong ket noi duoc PostgreSQL: kiem tra PostgreSQL da chay, database da tao va `DATABASE_URL` dung.
- Redis connection refused: chay `docker compose up -d redis` trong `lms-backend`.
- Upload file loi: kiem tra MinIO, bucket `lms-storage`, access key, secret key va `MINIO_ENDPOINT_URL`.
- Frontend goi sai API: kiem tra `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1` va khoi dong lai frontend.
- Swagger khong hien: neu `APP_ENV=production`, day la hanh vi co chu y.

## 14. Huong dan ban giao source code

Nen gui:

```text
lms-backend/app
lms-backend/alembic
lms-backend/scripts
lms-backend/requirements.txt
lms-backend/Dockerfile
lms-backend/docker-compose.yml
lms-backend/.env.example
lms-frontend/src
lms-frontend/public
lms-frontend/package.json
lms-frontend/package-lock.json
lms-frontend/next.config.ts
lms-frontend/tsconfig.json
README.md
BAO_CAO_CAU_TRUC_DU_AN.md
```

Khong nen gui:

```text
.env
.venv
node_modules
.next
__pycache__
*.pyc
```

## 15. Tom tat lenh chay nhanh

Terminal 1:

```powershell
cd lms-backend
docker compose up -d redis minio
```

Terminal 2:

```powershell
cd lms-backend
.\.venv\Scripts\Activate.ps1
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Terminal 3:

```powershell
cd lms-frontend
npm install
npm run dev
```

Truy cap:

```text
Frontend: http://localhost:3000
Backend:  http://localhost:8000
Swagger:  http://localhost:8000/docs
```
