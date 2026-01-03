## Next.js production Dockerfile 
## 改用 Debian 基础镜像以解决 Prisma 在 Alpine 上的兼容性问题
FROM node:18-bullseye-slim AS deps
WORKDIR /app
# 安装 OpenSSL 以支持 Prisma
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm install

FROM node:18-bullseye-slim AS builder
# 安装 OpenSSL 以支持 Prisma
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# 支持构建时传入 NEXT_PUBLIC_API_URL
# 支持构建时传入 NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
# 支持构建时传入前端构建版本信息（短 SHA + UTC 构建时间）
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_BUILD_SHA
ARG NEXT_PUBLIC_BUILD_TIME
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}
ENV NEXT_PUBLIC_BUILD_SHA=${NEXT_PUBLIC_BUILD_SHA}
ENV NEXT_PUBLIC_BUILD_TIME=${NEXT_PUBLIC_BUILD_TIME}
# 构建前检查必需的环境变量（使用 POSIX 兼容语法）
RUN if [ -z "$NEXT_PUBLIC_API_URL" ] || [ "$NEXT_PUBLIC_API_URL" = "" ]; then \
  echo "❌ 错误: NEXT_PUBLIC_API_URL 未设置"; \
  exit 1; \
  fi && \
  if [ -z "$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" ] || [ "$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" = "" ]; then \
  echo "❌ 错误: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY 未设置（必须在构建时传入）"; \
  exit 1; \
  fi && \
  if ! echo "$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" | grep -qE "^pk_(test|live)_"; then \
  echo "❌ 错误: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY 格式错误（必须以 pk_test_ 或 pk_live_ 开头）"; \
  exit 1; \
  fi && \
  echo "✅ 环境变量检查通过"
COPY --from=deps /app/node_modules ./node_modules
# 复制 apps/web 目录内容（构建上下文现在是项目根目录）
COPY apps/web/package*.json ./
COPY apps/web/next.config.mjs ./
COPY apps/web/tsconfig.json ./
# 添加Tailwind和PostCSS配置文件，确保CSS正确编译
COPY apps/web/tailwind.config.js ./tailwind.config.js
COPY apps/web/postcss.config.js ./postcss.config.js
COPY apps/web/public ./public
COPY apps/web/src ./src
# 复制 Prisma schema（从项目根目录）
COPY prisma ./prisma
# 修复：安装 apps/web 的依赖（next 等）
RUN npm install --production=false
# 生成 Prisma Client（API 路由需要）
# 确保 Prisma Client 在构建前生成
RUN DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" npx prisma generate --schema=./prisma/schema.prisma
# 验证 Prisma Client 已生成
RUN test -d ./node_modules/.prisma/client || (echo "❌ Prisma Client generation failed" && exit 1)
RUN npm run build

FROM node:18-bullseye-slim AS runner
WORKDIR /app
# 安装 OpenSSL 以支持 Prisma（运行时可能需要）
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# 复制构建阶段依赖以便 next start 可执行
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["npm", "run", "start"]

