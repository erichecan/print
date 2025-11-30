## Backend production Dockerfile [2025-11-10 13:45:00]
## [2025-01-29 15:20:00] 修复：在构建时预生成 Prisma Client（包含引擎），避免运行时生成失败
FROM node:18-bullseye-slim AS base
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

## [2025-01-29 15:20:00] 在构建时生成 Prisma Client（包含引擎）
## Prisma Client 生成时只需要 schema 文件，不需要真实的数据库连接
## 使用占位符 DATABASE_URL（格式正确即可），运行时将使用真实的 DATABASE_URL（从 Secret Manager）
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
# [2025-01-29 15:25:00] 明确禁用 DataProxy，确保生成标准引擎
ENV PRISMA_GENERATE_DATAPROXY="false"
RUN npx prisma generate --schema=./prisma/schema.prisma && \
    echo "[2025-01-29 15:20:00] ✅ Prisma Client generated at build time" && \
    # 验证引擎文件是否存在（可能有多个平台的文件）
    (ls -lh node_modules/.prisma/client/*.node 2>/dev/null || \
     ls -lh node_modules/.prisma/client/query-engine* 2>/dev/null || \
     echo "[2025-01-29 15:20:00] ⚠️  Warning: Engine file not found in expected location") && \
    echo "[2025-01-29 15:20:00] 📋 Generated files:" && \
    ls -lh node_modules/.prisma/client/ | head -10

## Expose server port [2025-11-10 13:45:00]
## [2025-01-27] Cloud Run uses PORT environment variable, default to 8080
ENV NODE_ENV=production
ENV PORT=8080
# [2025-01-29 15:20:00] 注意：DATABASE_URL 占位符在构建后不再需要
# 运行时将从 Secret Manager 读取真实的 DATABASE_URL（通过 cloudbuild.yaml 配置）
# 不需要在这里清除，因为 Secret Manager 的值会覆盖构建时的占位符
EXPOSE 8080

## Launch application [2025-11-10 13:45:00]
# [2025-11-15 23:07:58] Use server bootstrap to bind HTTP listener
CMD ["node", "server.js"]

