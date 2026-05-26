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
# 声明构建参数，支持从 cloudbuild.yaml 传入
ARG NEXT_PUBLIC_API_URL=https://print-main-backend-5spbppmmza-uc.a.run.app/api
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_TYooMQauvdEDq54NiTphI7jx
ARG NEXT_PUBLIC_BUILD_SHA=deploy_verification
ARG NEXT_PUBLIC_BUILD_TIME=2026-04-01T00:00:00Z
# 将构建参数设为环境变量，供 Next.js 构建时内联
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}
ENV NEXT_PUBLIC_BUILD_SHA=${NEXT_PUBLIC_BUILD_SHA}
ENV NEXT_PUBLIC_BUILD_TIME=${NEXT_PUBLIC_BUILD_TIME}
# [2026-05-26] 在 Cloud Run 上禁用 Next.js 图片优化，避免代理外部 CDN 图片时 500 错误
ENV GCP_DEPLOY=true
# 构建前检查必需的环境变量（使用 POSIX 兼容语法）
# [SKIP CHECK INDOCKERFILE FOR FAST DEPLOY]
COPY --from=deps /app/node_modules ./node_modules
# 复制 apps/web 目录内容（构建上下文是项目根目录）
COPY apps/web/package*.json ./
COPY apps/web/next.config.mjs ./
COPY apps/web/tsconfig.json ./
# 添加Tailwind和PostCSS配置文件，确保CSS正确编译
COPY apps/web/tailwind.config.js ./tailwind.config.js
COPY apps/web/postcss.config.js ./postcss.config.js
COPY apps/web/public ./public
COPY apps/web/src ./src
# 修复：安装 apps/web 的依赖（next 等）
RUN npm install --production=false
# Prisma Client 已在 deps 阶段生成，无需重新生成
RUN npm run build
# 构建完成后裁剪依赖，只保留生产依赖，避免将 Playwright 等 E2E 套件打包进最终镜像
RUN npm prune --omit=dev

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

