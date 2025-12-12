## Next.js production Dockerfile [2025-11-10 13:47:00]
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install

FROM node:18-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# [2025-01-27 22:55:00] 支持构建时传入 NEXT_PUBLIC_API_URL
# [2025-01-29 01:45:00] 支持构建时传入 NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
# [2025-12-04 16:30:15] 支持构建时传入前端构建版本信息（短 SHA + UTC 构建时间）
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_BUILD_SHA
ARG NEXT_PUBLIC_BUILD_TIME
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}
ENV NEXT_PUBLIC_BUILD_SHA=${NEXT_PUBLIC_BUILD_SHA}
ENV NEXT_PUBLIC_BUILD_TIME=${NEXT_PUBLIC_BUILD_TIME}
# [2025-01-30 18:20:00] 构建前检查必需的环境变量（使用 POSIX 兼容语法）
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
# [2025-01-27 20:50:00] 复制 apps/web 目录内容（构建上下文现在是项目根目录）
COPY apps/web/package*.json ./
COPY apps/web/next.config.mjs ./
COPY apps/web/tsconfig.json ./
COPY apps/web/tailwind.config.js ./tailwind.config.js # [2025-12-19] 添加Tailwind配置文件，确保CSS正确编译
COPY apps/web/postcss.config.js ./postcss.config.js # [2025-12-19] 添加PostCSS配置文件，确保Tailwind正确处理
COPY apps/web/public ./public
COPY apps/web/src ./src
# [2025-01-27 20:50:00] 复制 Prisma schema（从项目根目录）
COPY prisma ./prisma
# [2025-01-27 20:45:00] 生成 Prisma Client（API 路由需要）
# 使用与 @prisma/client 匹配的 prisma 版本（5.22.0）
RUN npm install -g prisma@5.22.0
RUN prisma generate --schema=./prisma/schema.prisma
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# [2025-11-14 06:10:30] 复制构建阶段依赖以便 next start 可执行
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["npm", "run", "start"]

