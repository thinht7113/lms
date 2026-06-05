# ==================== STAGE 1: Dependencies ====================
FROM node:20-alpine AS deps
WORKDIR /app

# Sao chép package files và cài đặt dependencies
COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline

# ==================== STAGE 2: Build ====================
FROM node:20-alpine AS builder
WORKDIR /app

# Sao chép dependencies từ stage trước
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Biến môi trường build-time: URL API Backend
# Mặc định trỏ tới backend qua Docker network
ARG NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Build ứng dụng Next.js ở chế độ standalone
RUN npm run build

# ==================== STAGE 3: Production ====================
FROM node:20-alpine AS runner
WORKDIR /app

# Chạy ở chế độ production
ENV NODE_ENV=production

# Tạo user không phải root để tăng bảo mật
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Sao chép output standalone từ stage build
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Chuyển sang user không phải root
USER nextjs

# Mở cổng 3000
EXPOSE 3000

# Thiết lập hostname để lắng nghe trên mọi interface
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Khởi chạy ứng dụng Next.js standalone
CMD ["node", "server.js"]
