# 上线自检清单（Release Checklist）

> [2025-11-12 02:40:00] Sprint 6 - 发布准备

## 1. 环境变量确认

| 服务 | 必须变量 | 备注 |
| --- | --- | --- |
| 后端 (`backend/.env`) | `DATABASE_URL`、`JWT_SECRET`、`STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`、`SENTRY_DSN` | Stripe/Sentry 可按环境调整 `*_ENVIRONMENT`、`*_TRACES_SAMPLE_RATE` |
| 前端 (`apps/web/.env.production`) | `NEXT_PUBLIC_API_URL`、`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`、`NEXT_PUBLIC_SENTRY_DSN` | 保证指向 API 网关域名，开启 HTTPS |
| 其他 | `REDIS_*`、`AWS_*`、`ALIYUN_*`、`OFFLINE_ORDER_*` | 按需启用（缓存、对象存储、离线订单附件限制等） |

✅ **动作**：执行 `envsubst` 或密钥管理工具（Vault/Secrets Manager）注入所有变量，并对差异进行代码审查。

## 2. 数据库与迁移

- [ ] 运行 `npm run prisma:migrate --workspace backend`，确认最新模型（含 `admin_audit_logs`）。
- [ ] 备份生产 PostgreSQL：
  ```bash
  pg_dump --format=custom --file=backup_$(date +%Y%m%d_%H%M).dump $DATABASE_URL
  ```
- [ ] 若使用 Prisma Seed，自检脚本不会覆盖生产数据。

## 3. 应用构建与部署

- [ ] Root 安装依赖：`npm install --production`
- [ ] 构建前端：`npm run build --workspace apps/web`
- [ ] 构建后端（若使用 Docker）：`docker build -f backend/Dockerfile -t suvernire-backend:release .`
- [ ] 使用 `docker compose` 或 CI/CD 部署到目标环境，确保蓝绿/滚动策略可回滚。

## 4. 监控与报警

- [ ] Sentry 项目接入完成，验证 DSN 生效（在 Staging 触发一次测试异常）。
- [ ] Stripe Dashboard 设置 Webhook 签名并启用失败重试通知。
- [ ] API 日志（Winston/CloudWatch/ELK）确认保留策略 >= 14 天。
- [ ] 配置 Slack/Email 警报：订单生成失败、支付失败、库存不足。

**详细配置指南**: 参考 `docs/MONITORING-GUIDE.md`

## 5. 回滚方案

- [ ] 可用上一版本 Docker 镜像 / Git Tag。
- [ ] 如迁移新增表，准备 `prisma migrate resolve --rolled-back` 或 `prisma migrate deploy` 回滚策略。
- [ ] 数据库备份文件可快速恢复：`pg_restore --clean --dbname=$DATABASE_URL backup_xxx.dump`。

## 6. 发布后验证

1. 运行 `docs/E2E-PLAYBOOK.md` 中“快速冒烟”场景（最少覆盖下单+后台处理）。
2. 检查 `admin_audit_logs` 是否记录管理员操作。
3. 验证 Sentry 无异常告警（或处理已捕获异常）。
4. Stripe dashboard 中确认最新订单状态正确同步。

## 7. 文档与交接

- [ ] 更新 `README.md`、`docs/` 中的部署说明。
- [ ] 将本 Checklist 与运行结果同步至团队知识库/工单系统。
- [ ] 记录版本号与发布日期，通知相关干系人。

> 完成以上步骤后，方可将版本标记为“Ready for Production”。

