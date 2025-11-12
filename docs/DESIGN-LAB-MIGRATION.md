# Design Lab 数据库迁移指南

**创建时间**: 2025-11-11 16:30:00  
**迁移名称**: `add_design_lab_entities`

## 概述

本次迁移为 Design Lab 功能添加以下数据库表：

- `designs` - 设计草稿主表
- `design_versions` - 设计版本历史表
- `design_assets` - 设计素材表

## 前置条件

1. 确保 PostgreSQL 数据库已启动并可访问
2. 配置 `DATABASE_URL` 环境变量（参考 `backend/env.example`）
3. 确保已安装 Prisma CLI：`npm install -g prisma` 或使用项目本地版本

## 执行迁移

### 方法一：使用 Prisma Migrate（推荐）

```bash
# 在项目根目录执行
npx prisma migrate dev --name add_design_lab_entities --schema=prisma/schema.prisma
```

### 方法二：手动应用 SQL

如果 Prisma migrate 不可用，可以手动执行以下 SQL：

```sql
-- 创建 designs 表
CREATE TABLE IF NOT EXISTS "designs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "session_id" TEXT,
    "product_variant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "DesignStatus" NOT NULL DEFAULT 'DRAFT',
    "current_version" INTEGER NOT NULL DEFAULT 1,
    "canvas_snapshot" JSONB NOT NULL,
    "pricing_snapshot" JSONB,
    "thumbnail_url" TEXT,
    "locked_at" TIMESTAMP(3),
    "locked_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "designs_pkey" PRIMARY KEY ("id")
);

-- 创建 design_versions 表
CREATE TABLE IF NOT EXISTS "design_versions" (
    "id" TEXT NOT NULL,
    "design_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "summary" TEXT,
    "canvas_snapshot" JSONB NOT NULL,
    "pricing_snapshot" JSONB,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "design_versions_pkey" PRIMARY KEY ("id")
);

-- 创建 design_assets 表
CREATE TABLE IF NOT EXISTS "design_assets" (
    "id" TEXT NOT NULL,
    "design_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "content_type" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "uploaded_by" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "design_assets_pkey" PRIMARY KEY ("id")
);

-- 创建枚举类型
CREATE TYPE "DesignStatus" AS ENUM ('DRAFT', 'LOCKED', 'ORDERED', 'ARCHIVED');

-- 创建索引
CREATE INDEX IF NOT EXISTS "designs_user_id_idx" ON "designs"("user_id");
CREATE INDEX IF NOT EXISTS "designs_session_id_idx" ON "designs"("session_id");
CREATE INDEX IF NOT EXISTS "designs_product_variant_id_idx" ON "designs"("product_variant_id");
CREATE INDEX IF NOT EXISTS "designs_status_idx" ON "designs"("status");
CREATE INDEX IF NOT EXISTS "design_versions_design_id_version_idx" ON "design_versions"("design_id", "version");
CREATE INDEX IF NOT EXISTS "design_versions_created_at_idx" ON "design_versions"("created_at");
CREATE INDEX IF NOT EXISTS "design_assets_design_id_idx" ON "design_assets"("design_id");
CREATE INDEX IF NOT EXISTS "design_assets_uploaded_at_idx" ON "design_assets"("uploaded_at");

-- 创建外键约束
ALTER TABLE "designs" ADD CONSTRAINT "designs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "designs" ADD CONSTRAINT "designs_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "design_versions" ADD CONSTRAINT "design_versions_design_id_fkey" FOREIGN KEY ("design_id") REFERENCES "designs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "design_assets" ADD CONSTRAINT "design_assets_design_id_fkey" FOREIGN KEY ("design_id") REFERENCES "designs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 创建唯一约束
CREATE UNIQUE INDEX IF NOT EXISTS "design_versions_design_id_version_key" ON "design_versions"("design_id", "version");
```

## 验证迁移

迁移完成后，可以使用以下命令验证：

```bash
# 查看迁移状态
npx prisma migrate status --schema=prisma/schema.prisma

# 打开 Prisma Studio 查看数据
npx prisma studio --schema=prisma/schema.prisma
```

## 回滚迁移

如果需要回滚迁移：

```bash
npx prisma migrate reset --schema=prisma/schema.prisma
```

**警告**: `migrate reset` 会删除所有数据！生产环境请谨慎使用。

## 注意事项

1. **数据备份**: 在生产环境执行迁移前，请先备份数据库
2. **索引性能**: 迁移会自动创建必要的索引，但大量数据时可能需要额外时间
3. **JSONB 字段**: `canvas_snapshot` 和 `pricing_snapshot` 使用 JSONB 类型，支持高效查询和索引

## 后续步骤

迁移完成后：

1. 重启后端服务以加载新的 Prisma Client
2. 验证 Design Lab API 端点正常工作
3. 测试设计草稿创建、更新和素材上传功能

## 相关文件

- Schema 定义: `prisma/schema.prisma`
- 后端控制器: `backend/src/controllers/designController.js`
- 前端 Store: `apps/web/src/contexts/designLabStore.ts`

