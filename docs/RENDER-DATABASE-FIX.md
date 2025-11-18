# Render 数据库字段修复指南
[2025-01-11 14:45:00] 修复 `base_price` 列不存在的问题

## 🔴 问题分析

错误信息：`The column 'products.base_price' does not exist in the current database.`

**原因**：
1. Prisma schema 定义了 `basePrice` 映射到数据库列 `base_price_cents`
2. 迁移文件会将旧的 `base_price` 列改为 `base_price_cents`
3. 但数据库可能还没有正确执行迁移，或者迁移执行失败

## ✅ 解决方案

### 方法 1：手动运行数据库迁移（推荐）

通过 Render 的 SSH 连接到服务，手动执行迁移：

1. **通过 Render Dashboard 进入服务**
   - 访问：https://dashboard.render.com/web/srv-d4c5igqli9vc73bptc70
   - 点击 **Shell** 或使用 SSH

2. **SSH 连接**（如果可用）：
   ```bash
   ssh srv-d4c5igqli9vc73bptc70@ssh.oregon.render.com
   ```

3. **执行迁移**：
   ```bash
   cd backend
   npx prisma migrate deploy --schema=../prisma/schema.prisma
   ```

### 方法 2：检查数据库表结构

如果迁移已经执行，检查表结构是否正确：

1. **通过 Render Dashboard 查看日志**
   - 确认迁移是否成功执行
   - 查看是否有错误信息

2. **直接查询数据库**（如果有数据库访问权限）：
   ```sql
   -- 检查列是否存在
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'products' 
   AND column_name IN ('base_price', 'base_price_cents');
   ```

### 方法 3：创建修复迁移

如果表结构不一致，可以创建一个修复迁移：

1. **在本地创建迁移**：
   ```bash
   cd backend
   npx prisma migrate dev --name fix_base_price_column --schema=../prisma/schema.prisma --create-only
   ```

2. **检查生成的迁移文件**，确保包含：
   ```sql
   ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "base_price_cents" INTEGER NOT NULL DEFAULT 0;
   ALTER TABLE "products" DROP COLUMN IF EXISTS "base_price";
   ```

3. **提交并推送到 GitHub**：
   ```bash
   git add prisma/migrations
   git commit -m "fix: add base_price_cents column migration"
   git push origin main
   ```

4. **Render 会自动重新部署并执行迁移**

## 🔍 验证修复

修复后，检查：

1. **健康检查端点**：
   ```bash
   curl https://print-mnmz.onrender.com/health
   ```

2. **API 测试**：
   ```bash
   curl https://print-mnmz.onrender.com/api/products?page=1&limit=1
   ```
   应该返回产品数据，而不是 500 错误

3. **查看 Render 日志**：
   - 确认迁移成功执行
   - 确认没有列不存在的错误

## 📝 迁移文件说明

当前的迁移文件 (`20251118104512_catalog_projects/migration.sql`) 包含：

```sql
-- 添加新列
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "base_price_cents" INTEGER NOT NULL DEFAULT 0;

-- 迁移数据（从旧列到新列）
UPDATE "products"
SET "base_price_cents" = COALESCE(ROUND("base_price" * 100)::INTEGER, 0)
WHERE "base_price_cents" = 0;

-- 删除旧列
ALTER TABLE "products" DROP COLUMN IF EXISTS "base_price";
```

这个迁移应该是安全的（使用 `IF NOT EXISTS` 和 `IF EXISTS`），但如果旧列已经不存在，可能会失败。

## 🚨 如果迁移失败

如果迁移因为列不存在而失败，可以：

1. **手动添加列**（如果有数据库访问权限）：
   ```sql
   ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "base_price_cents" INTEGER NOT NULL DEFAULT 0;
   ```

2. **或者修改迁移文件**，移除删除旧列的语句：
   ```sql
   -- 只添加新列，不删除旧列（如果旧列不存在）
   ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "base_price_cents" INTEGER NOT NULL DEFAULT 0;
   ```

3. **重新提交迁移**

---

**最后更新**：2025-01-11 14:45:00

