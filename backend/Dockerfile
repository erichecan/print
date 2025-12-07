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

## [2025-12-07 03:55:00] 在构建时生成 Prisma Client 以加快启动速度
## 使用占位符 DATABASE_URL 生成，运行时使用真实的 DATABASE_URL
RUN DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" npx prisma generate --schema=./prisma/schema.prisma

## Expose server port [2025-11-10 13:45:00]
## [2025-01-27] Cloud Run uses PORT environment variable, default to 8080
## [2025-12-04 21:50:00] 支持构建时传入版本信息（短 SHA + UTC 构建时间）
ARG APP_BUILD_SHA
ARG APP_BUILD_TIME
ENV NODE_ENV=production
ENV PORT=8080
ENV APP_BUILD_SHA=${APP_BUILD_SHA}
ENV APP_BUILD_TIME=${APP_BUILD_TIME}
EXPOSE 8080

## Launch application [2025-11-10 13:45:00]
# [2025-11-15 23:07:58] Use server bootstrap to bind HTTP listener
CMD ["node", "server.js"]

