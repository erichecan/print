# Add Art 数据库迁移指南

**创建时间**: 2025-01-30 12:10:00  
**目的**: 指导完成 Design Lab Add Art 功能的数据库迁移和数据准备

---

## 一、前置条件

### 1.1 环境变量配置

确保已配置 `DATABASE_URL` 环境变量：

**方式 1: 使用 .env 文件（推荐本地开发）**

```bash
# 在仓库根目录创建 .env 文件
echo "DATABASE_URL=postgresql://user:password@localhost:5432/print_main" > .env
```

**方式 2: 使用环境变量（生产环境）**

```bash
export DATABASE_URL=postgresql://user:password@host:port/database
```

**方式 3: 从 Secret Manager 加载（GCP 环境）**

如果使用 GCP Secret Manager，确保应用已配置自动加载。

---

## 二、数据库迁移步骤

### 2.1 运行 Prisma 迁移

```bash
# 在仓库根目录执行
npx prisma migrate dev --schema=prisma/schema.prisma --name add_artwork_tables
```

**说明**:
- `--schema=prisma/schema.prisma`: 指定 Prisma schema 文件路径
- `--name add_artwork_tables`: 迁移名称（可选，会自动生成）

**预期输出**:
- 创建 `artwork_categories` 表（如果不存在）
- 扩展 `art_assets` 表（添加 GCS 相关字段）
- 创建必要的索引

### 2.2 生成 Prisma Client

```bash
npx prisma generate --schema=prisma/schema.prisma
```

**说明**: 确保 Prisma Client 与最新的 schema 同步。

---

## 三、数据状态检查

### 3.1 运行检查脚本

```bash
node scripts/check-art-assets.js
```

**检查内容**:
- ✅ `artwork_categories` 表的记录数量
- ✅ `art_assets` 表的记录数量
- ✅ GCS bucket 中 `art-asset/` 前缀的文件数量
- ✅ 分类结构和示例数据

**预期输出示例**:
```
🔍 Design Lab Add Art 数据状态检查
============================================================

📊 检查数据库数据...
✅ artwork_categories 表: 5 条记录
✅ art_assets 表: 120 条记录

☁️  检查 GCS bucket 中的文件...
✅ art-asset/ 前缀的文件: 240 个

📋 检查总结:
   数据库分类: 5 个
   数据库素材: 120 个
   GCS 文件: 240 个

✅ 数据状态正常，可以开始测试 Add Art 功能
```

---

## 四、数据准备（如果数据不足）

### 4.1 运行爬虫脚本

```bash
# 示例：爬取 Emojis -> Animals 分类
npm run crawl:emojis:animals
```

**输出**: `/tmp/art-crawler/emojis/animals/` 目录下的图片文件和 `metadata.json`

### 4.2 上传到 GCS

```bash
npm run ingest:upload
```

**说明**: 将本地爬取的素材上传到 GCS，并生成缩略图。

### 4.3 导入数据库

```bash
npm run ingest:db
```

**说明**: 读取 `metadata.json`，创建分类和素材记录到数据库。

---

## 五、验证迁移结果

### 5.1 使用 Prisma Studio（可视化）

```bash
npx prisma studio --schema=prisma/schema.prisma
```

在浏览器中打开 `http://localhost:5555`，查看：
- `artwork_categories` 表
- `art_assets` 表

### 5.2 使用 SQL 查询

```sql
-- 检查分类数量
SELECT COUNT(*) FROM artwork_categories;

-- 检查素材数量
SELECT COUNT(*) FROM art_assets;

-- 查看分类树结构
SELECT 
  tc.name AS top_category,
  COUNT(DISTINCT sc.id) AS sub_category_count,
  COUNT(a.id) AS asset_count
FROM artwork_categories tc
LEFT JOIN artwork_categories sc ON sc.parent_id = tc.id
LEFT JOIN art_assets a ON a.top_category_id = tc.id
WHERE tc.parent_id IS NULL
GROUP BY tc.id, tc.name;
```

### 5.3 测试 API 端点

```bash
# 获取分类树
curl http://localhost:4000/api/artworks/categories/tree

# 获取素材列表
curl http://localhost:4000/api/artworks?page=1&pageSize=10
```

---

## 六、常见问题

### Q1: 迁移失败，提示 "table already exists"

**原因**: 表已存在，可能是之前运行过迁移。

**解决**:
```bash
# 查看迁移状态
npx prisma migrate status --schema=prisma/schema.prisma

# 如果需要重置（⚠️ 会删除数据）
npx prisma migrate reset --schema=prisma/schema.prisma
```

### Q2: DATABASE_URL 未设置

**解决**: 参考 "一、前置条件" 配置环境变量。

### Q3: GCS 检查失败

**原因**: 可能缺少 GCP 凭证或 `GCP_IMAGE_BUCKET` 环境变量。

**解决**:
```bash
# 配置 GCP 凭证（使用 Application Default Credentials）
gcloud auth application-default login

# 设置 bucket 名称
export GCP_IMAGE_BUCKET=print-main-assets
```

### Q4: Prisma Client 未生成

**解决**:
```bash
npx prisma generate --schema=prisma/schema.prisma
```

---

## 七、下一步

迁移完成后，可以：

1. ✅ 运行检查脚本验证数据状态
2. ✅ 启动前后端服务测试 Add Art 功能
3. ✅ 运行 E2E 测试: `npx playwright test apps/web/tests/e2e/designlab-add-art.spec.ts`

---

## 八、相关文档

- Add Art 架构文档: `docs/add-art-architecture.md`
- Add Art 实现总结: `docs/ADD-ART-IMPLEMENTATION-SUMMARY.md`
- Prisma 官方文档: https://www.prisma.io/docs
