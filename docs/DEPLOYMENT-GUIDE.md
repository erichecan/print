# 部署指南

<!-- 更新于 2025-11-10 13:55:00 -->

## 环境概览
- 前端：Next.js 14（apps/web），默认端口 3000
- 后端：Express API（backend），默认端口 3001
- 数据库：PostgreSQL 15，默认端口 5432

## 前置条件
1. 准备容器运行环境（Docker Engine + Compose，或 Kubernetes 集群）
2. 配置 `.env`（参考 `backend/env.production.template`、`apps/web/env.production.template`）
3. Stripe、JWT 等敏感配置请使用安全的 Secret Manager

## Docker Compose 快速启动
```bash
docker compose up --build
```

## 自定义部署
1. 构建镜像
   ```bash
   docker build -t suvernire-backend ./backend
   docker build -t suvernire-web ./apps/web
   ```
2. 创建数据库 & 迁移
   ```bash
   docker run --rm --env-file backend/.env suvernire-backend npm run prisma:migrate
   ```
3. 启动服务（示意）
   ```bash
   docker run -d --env-file backend/.env -p 3001:3001 suvernire-backend
   docker run -d --env-file apps/web/.env -p 3000:3000 suvernire-web
   ```

## 发布流程
1. 在 Staging 环境运行 `npm run lint --workspace apps/web`、`npm test --workspace backend`、`npm run migrate:deploy --workspace backend`
2. 构建并推送镜像到镜像仓库（如 GHCR/ECR），带版本标签
3. 使用蓝绿或滚动方式发布：
   - 蓝绿：部署新版本并通过健康检查后切换流量
   - 滚动：逐台替换实例，确保最小可用容量
4. 发布完成后，持续监控 30 分钟并确认关键指标稳定

## 回滚策略
- 数据库：使用 Prisma/Sequelize `migrate:deploy` 前先备份；若失败，执行相应 `migrate:resolve` 或 `db:migrate:undo`
- 应用：保留上一版本镜像与环境变量，执行 `docker stack deploy` 或 `kubectl rollout undo`
- 支付：若出现重复扣款风险，立即暂停 Stripe Webhook 并联系财务团队

## 上线清单
- [ ] 数据库迁移已执行
- [ ] Stripe Webhook URL 已配置
- [ ] HTTPS 证书/反向代理已就绪
- [ ] 健康检查端点可用
- [ ] 监控/日志管道开启
- [ ] 备份与回滚策略确认

