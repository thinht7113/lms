# 1. Use the official Python slim image
FROM python:3.11-slim

# 2. Set working directory
WORKDIR /app

# 3. Optimize Python runtime in container
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 4. Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    wget \
    ca-certificates \
    procps \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 5. Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt


# 5b. Download Roboto fonts for Vietnamese PDF rendering
RUN mkdir -p app/assets/fonts && \
    wget -O app/assets/fonts/Roboto-Regular.ttf https://raw.githubusercontent.com/googlefonts/roboto/main/src/hinted/Roboto-Regular.ttf && \
    wget -O app/assets/fonts/Roboto-Bold.ttf https://raw.githubusercontent.com/googlefonts/roboto/main/src/hinted/Roboto-Bold.ttf

# 6. Copy source code
COPY . .

# 7. Expose API port
EXPOSE 8000

# 8. Apply migrations before starting the API
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4"]
