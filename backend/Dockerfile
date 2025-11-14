## Backend production Dockerfile [2025-11-10 13:45:00]
FROM node:18-alpine AS base
WORKDIR /app

## Install dependencies with cleaning [2025-11-10 23:55:03]
COPY backend/package*.json ./
# [2025-11-14 06:12:00] 为生成 Prisma Client，安装完整依赖
RUN npm install

## Copy source and build assets [2025-11-10 23:55:03]
COPY backend/src ./src
COPY prisma ./prisma
# [2025-11-14 06:12:00] 生成 Prisma 客户端以供运行阶段使用
RUN npx prisma generate --schema=./prisma/schema.prisma

## Expose server port [2025-11-10 13:45:00]
ENV NODE_ENV=production
EXPOSE 3001

## Launch application [2025-11-10 13:45:00]
CMD ["node", "src/app.js"]

