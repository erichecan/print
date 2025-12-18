# 留言本功能部署指南

**时间**: 2025-12-10 00:20:00

---

## 部署状态

### ✅ 已完成
1. 数据库迁移文件已创建：`prisma/migrations/20251210000000_add_guest_messages/migration.sql`
2. 部署脚本已更新：添加 `AUTO_MIGRATE=true` 环境变量
3. 所有代码已提交到 Git

### ⚠️ 部署问题
容器启动超时，可能是数据库迁移需要时间。

---

## 解决方案

### 方案 1：先手动运行迁移（推荐）

1. **通过 Cloud SQL Proxy 运行迁移**：
   ```bash
   # 安装 Cloud SQL Proxy
   gcloud components install cloud-sql-proxy
   
   # 启动 Cloud SQL Proxy
   cloud-sql-proxy moonlit-gamma-479502-r6:us-central1:print-main-db &
   
   # 设置 DATABASE_URL
   export DATABASE_URL="postgresql://user:password@127.0.0.1:5432/database"
   
   # 运行迁移
   npx prisma migrate deploy
   ```

2. **或者通过 GCP Console 运行 SQL**：
   - 访问 GCP Console > SQL > 数据库
   - 选择数据库实例
   - 运行以下 SQL：
   ```sql
   -- CreateEnum
   CREATE TYPE "GuestMessageStatus" AS ENUM ('UNREAD', 'READ', 'ARCHIVED');
   
   -- CreateTable
   CREATE TABLE "guest_messages" (
       "id" UUID NOT NULL,
       "name" TEXT NOT NULL,
       "email" TEXT NOT NULL,
       "phone" TEXT,
       "subject" TEXT,
       "message" TEXT NOT NULL,
       "order_number" TEXT,
       "status" "GuestMessageStatus" NOT NULL DEFAULT 'UNREAD',
       "read_at" TIMESTAMP(3),
       "read_by" UUID,
       "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
       "updated_at" TIMESTAMP(3) NOT NULL,
       CONSTRAINT "guest_messages_pkey" PRIMARY KEY ("id")
   );
   
   -- CreateIndex
   CREATE INDEX "guest_messages_status_idx" ON "guest_messages"("status");
   CREATE INDEX "guest_messages_created_at_idx" ON "guest_messages"("created_at");
   CREATE INDEX "guest_messages_read_by_idx" ON "guest_messages"("read_by");
   
   -- AddForeignKey
   ALTER TABLE "guest_messages" ADD CONSTRAINT "guest_messages_read_by_fkey" 
   FOREIGN KEY ("read_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
   ```

3. **重新部署（不使用 AUTO_MIGRATE）**：
   ```bash
   # 临时移除 AUTO_MIGRATE
   # 编辑 scripts/deploy-gcp.sh，将 AUTO_MIGRATE=true 改为 AUTO_MIGRATE=false
   ./scripts/deploy-gcp.sh
   ```

### 方案 2：增加启动超时时间

编辑 `scripts/deploy-gcp.sh`，增加超时时间：
```bash
--timeout 600 \
--startup-cpu-boost
```

### 方案 3：检查 GCP 日志

访问 GCP Console 日志查看具体错误：
```
https://console.cloud.google.com/logs/viewer?project=moonlit-gamma-479502-r6
```

---

## 迁移文件位置

迁移文件已创建在：
- `prisma/migrations/20251210000000_add_guest_messages/migration.sql`

---

## 部署后验证

1. **检查数据库表**：
   ```sql
   SELECT * FROM guest_messages LIMIT 1;
   ```

2. **测试 API**：
   ```bash
   curl -X POST https://print-main-backend-xxx.run.app/api/guest-messages \
     -H "Content-Type: application/json" \
     -d '{"name":"Test","email":"test@example.com","message":"Test message"}'
   ```

3. **测试前端**：
   - 访问 `/help#guestbook` 页面
   - 提交一条测试留言
   - 在 admin 后台 `/admin/notifications` 查看留言

---

## 时间戳

- **迁移文件创建**: 2025-12-10 00:15:00
- **部署脚本更新**: 2025-12-10 00:20:00

