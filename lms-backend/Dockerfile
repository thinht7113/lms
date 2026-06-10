# 1. Sử dụng ảnh Python chính thức phiên bản slim
FROM python:3.11-slim

# 2. Thiết lập thư mục làm việc
WORKDIR /app

# 3. Tối ưu hóa Python trong Container
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 4. Cài đặt thư viện hệ thống cần thiết
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    wget \
    ca-certificates \
    procps \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 5. Sao chép và cài đặt dependencies (tận dụng Docker cache layer)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# 5b. Tải font Roboto hỗ trợ tiếng Việt
RUN mkdir -p app/assets/fonts && \
    wget -O app/assets/fonts/Roboto-Regular.ttf https://raw.githubusercontent.com/googlefonts/roboto/main/src/hinted/Roboto-Regular.ttf && \
    wget -O app/assets/fonts/Roboto-Bold.ttf https://raw.githubusercontent.com/googlefonts/roboto/main/src/hinted/Roboto-Bold.ttf

# 6. Sao chép toàn bộ mã nguồn
COPY . .

# 7. Mở cổng 8000
EXPOSE 8000

# 8. Đồng bộ schema trước khi khởi chạy API production
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4"]
