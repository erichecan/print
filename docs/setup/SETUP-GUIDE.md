# 项目环境搭建指南

<!-- 更新于 2025-11-10 12:57:00 -->

1. 安装 **Node.js 18+** 与 **npm 9+**，推荐使用 nvm-windows 管理版本。
2. 克隆仓库后，在项目根目录执行 `npm install`，以启用 npm workspaces 安装前后端依赖。
3. 复制 `backend/.env.example` 为 `backend/.env`，根据 `docs/ENVIRONMENT-VARIABLES.md` 填写配置。
4. 运行 `npm run prisma:generate --workspace backend` 与 `npm run migrate:deploy --workspace backend` 初始化数据库。
5. 分别执行 `npm run dev --workspace backend` 与 `npm run dev --workspace apps/web` 启动后端与前端。

