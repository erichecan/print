# 快速安装步骤

<!-- 更新于 2025-11-10 12:58:00 -->

| 步骤 | 命令 | 说明 |
| ---- | ---- | ---- |
| 1 | `npm install` | 在仓库根目录安装所有 workspace 依赖 |
| 2 | `npm run setup --workspace backend` | 可选：执行 `backend/setup.ps1` 完成本地初始化 |
| 3 | `npm run migrate:deploy --workspace backend` | 一键执行 Prisma 与 Sequelize 迁移 |
| 4 | `npm run dev --workspace backend` | 启动 API（默认端口 3001，可在 `.env` 中调整） |
| 5 | `npm run dev --workspace apps/web` | 启动前端应用（默认端口 3000） |

