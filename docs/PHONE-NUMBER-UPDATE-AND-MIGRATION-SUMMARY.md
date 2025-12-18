# 电话号码统一和数据库迁移总结

**时间**: 2025-12-10 00:45:00

---

## 一、电话号码统一

### ✅ 已完成

所有网站的电话号码已统一为 **416 916 6352**

### 更新的文件

1. **Prototype 文件** (19 个文件):
   - `prototype/static-pages/home.html`
   - `prototype/static-pages/contact.html`
   - `prototype/static-pages/help.html`
   - `prototype/static-pages/cart.html`
   - `prototype/static-pages/checkout.html`
   - `prototype/static-pages/account.html`
   - `prototype/static-pages/order-tracking.html`
   - `prototype/static-pages/order-detail.html`
   - `prototype/static-pages/order-confirmation.html`
   - `prototype/static-pages/product-hoodie.html`
   - `prototype/static-pages/long-sleeve.html`
   - `prototype/static-pages/design-gallery.html`
   - `prototype/static-pages/profile-edit.html`
   - `prototype/static-pages/offline-pod-intake.html`
   - `prototype/static-pages/promotions.html`
   - `prototype/static-pages/returns.html`
   - `prototype/static-pages/shipping-info.html`
   - `prototype/static-pages/privacy-policy.html`
   - `prototype/static-pages/terms-of-service.html`

2. **前端文件**:
   - `apps/web/public/design-lab-native.html`

3. **已确认使用 416 916 6352 的文件**:
   - `apps/web/src/components/SiteHeader.tsx`
   - `apps/web/src/components/home/HomeMobileClient.tsx`
   - `apps/web/src/app/design-lab/DesignLabClient.tsx`
   - `apps/web/src/app/design-lab/DesignLabClient5.0.tsx`
   - `apps/web/src/app/help/HelpClient.tsx`
   - `apps/web/src/app/contact/ContactClient.tsx`
   - `apps/web/src/app/cart/page.tsx`
   - `apps/web/src/lib/seo.ts`
   - `backend/src/controllers/adminSettingController.js`
   - `backend/src/services/easyshipService.js`
   - `backend/src/controllers/orderController.js`

### 替换的电话号码

- `800-293-4232` → `416 916 6352`
- `855-271-2660` → `416 916 6352`
- `1-800-000-0000` → `416 916 6352`

---

## 二、数据库迁移

### ✅ 已完成

1. **迁移文件已创建**: `prisma/migrations/20251210000000_add_guest_messages/migration.sql`
2. **迁移文件已修复**: 外键类型从 UUID 改为 TEXT（匹配 users 表的 id 类型）
3. **迁移已提交执行**: 通过 Cloud Run Job 执行

### 迁移内容

创建 `guest_messages` 表：
- `id`: UUID (主键)
- `name`: TEXT (必填)
- `email`: TEXT (必填)
- `phone`: TEXT (可选)
- `subject`: TEXT (可选)
- `message`: TEXT (必填)
- `order_number`: TEXT (可选)
- `status`: GuestMessageStatus enum (UNREAD/READ/ARCHIVED)
- `read_at`: TIMESTAMP (可选)
- `read_by`: TEXT (可选，外键关联 users.id)
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

创建索引：
- `guest_messages_status_idx`
- `guest_messages_created_at_idx`
- `guest_messages_read_by_idx`

创建外键：
- `guest_messages_read_by_fkey` → `users.id`

### 迁移状态

- **迁移执行**: 已通过 Cloud Run Job 提交
- **执行 ID**: `db-migrate-job-vmls5`
- **状态**: 执行中

### 如果迁移失败

如果迁移仍然失败，可以：

1. **手动运行 SQL**（通过 GCP Console）:
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
       "read_by" TEXT,
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

2. **或者等待部署时自动运行**:
   - 部署脚本已配置 `AUTO_MIGRATE=true`
   - 部署时会自动运行迁移

---

## 三、提交记录

- `3246fcd`: fix: 统一所有电话号码为 416 916 6352
- `5069122`: fix: 修复留言本迁移文件中的外键类型

---

## 四、下一步

1. ✅ 电话号码已统一
2. ⏳ 等待数据库迁移完成
3. 重新部署后端服务（如果需要）
4. 测试留言本功能

---

## 五、时间戳

- **电话号码统一**: 2025-12-10 00:30:00
- **迁移文件修复**: 2025-12-10 00:35:00
- **迁移执行**: 2025-12-10 00:45:00

