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

## [2025-01-29 16:10:00] 在构建时生成 Prisma Client（包含引擎）
## Prisma Client 生成时只需要 schema 文件，不需要真实的数据库连接
## 使用占位符 DATABASE_URL（格式正确即可），运行时将使用真实的 DATABASE_URL（从 Secret Manager）
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
# [2025-01-29 16:10:00] 明确禁用 DataProxy 和 Accelerate，强制生成二进制引擎
ENV PRISMA_GENERATE_DATAPROXY="false"
ENV PRISMA_CLI_GENERATE_DATAPROXY="false"
ENV PRISMA_ENGINES_MIRROR=""
ENV PRISMA_SKIP_POSTINSTALL_GENERATE="false"
ENV PRISMA_GENERATE_SKIP_AUTOINSTALL="false"
# [2025-01-29 16:10:00] 强制使用二进制引擎（不是 DataProxy）
RUN PRISMA_GENERATE_DATAPROXY="false" \
    PRISMA_CLI_GENERATE_DATAPROXY="false" \
    npx prisma generate --schema=./prisma/schema.prisma && \
    echo "[2025-01-29 16:10:00] ✅ Prisma Client generated at build time" && \
    echo "[2025-01-29 16:10:00] 📋 Checking for engine files..." && \
    # 检查所有可能的引擎文件位置
    (ls -lh node_modules/.prisma/client/libquery_engine* 2>/dev/null || \
     ls -lh node_modules/.prisma/client/query-engine* 2>/dev/null || \
     ls -lh node_modules/.prisma/client/*.node 2>/dev/null || \
     find node_modules/.prisma/client -name "*engine*" -type f 2>/dev/null || \
     echo "[2025-01-29 16:10:00] ⚠️  Warning: Engine file not found") && \
    echo "[2025-01-29 16:10:00] 📋 Generated files in .prisma/client:" && \
    ls -lh node_modules/.prisma/client/ | head -15

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

