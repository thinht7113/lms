# 1. Sử dụng ảnh Python chính thức phiên bản slim làm base để tối ưu kích thước dung lượng
FROM python:3.11-slim

# 2. Thiết lập thư mục làm việc trong Container
WORKDIR /app

# 3. Thiết lập các biến môi trường để tối ưu hóa hiệu năng Python trong Container
# PYTHONDONTWRITEBYTECODE=1: Ngăn Python tự động ghi các file cache .pyc
# PYTHONUNBUFFERED=1: Ép Python in logs trực tiếp ra terminal ngay lập tức (không lưu cache logs)
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 4. Cài đặt các thư viện hệ thống cần thiết cho việc biên dịch C/C++ và các công cụ mạng/tiến trình (như wget, ca-certificates, procps)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    wget \
    ca-certificates \
    procps \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 5. Sao chép requirements.txt trước để tận dụng khả năng lưu bộ nhớ đệm (Cache Layer) của Docker
COPY requirements.txt .

# 6. Cài đặt các thư viện Python được khai báo
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# 7. Sao chép toàn bộ mã nguồn của ứng dụng vào thư mục làm việc trong Container
COPY . .

# 8. Mở cổng 8000 của Container
EXPOSE 8000

# 9. Lệnh khởi chạy mặc định: Chạy FastAPI bằng Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
