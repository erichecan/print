## Backend production Dockerfile [2025-11-10 13:45:00]
## [2025-01-29 17:30:00] 回退到运行时生成 Prisma Client（方案 1：回到昨天之前的工作配置）
FROM node:20-bullseye-slim AS base
WORKDIR /app
# [2025-11-14 06:22:30] 使用 Debian 基础镜像并安装 openssl 以满足 Prisma 依赖
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

## Install dependencies with cleaning [2025-11-10 23:55:03]
COPY backend/package*.json ./
# [2025-11-14 06:12:00] 为生成 Prisma Client，安装完整依赖
RUN npm install

## Copy source and build assets [2025-11-10 23:55:03]
COPY backend/src ./src
COPY backend/scripts ./scripts
COPY prisma ./prisma
# [2025-11-15 23:07:58] Include server entrypoint for production container
COPY backend/server.js ./server.js

## [2025-01-29 17:30:00] 跳过构建时的 Prisma generate（回到运行时生成方式）
## Prisma Client 将在运行时由 server.js 生成（使用真实的 DATABASE_URL）
## 这样可以避免占位符 URL 触发 DataProxy 检测，确保生成正确的引擎
# RUN npx prisma generate --schema=./prisma/schema.prisma

## Expose server port [2025-11-10 13:45:00]
## [2025-01-27] Cloud Run uses PORT environment variable, default to 8080
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

## Launch application [2025-11-10 13:45:00]
# [2025-11-15 23:07:58] Use server bootstrap to bind HTTP listener
CMD ["node", "server.js"]

