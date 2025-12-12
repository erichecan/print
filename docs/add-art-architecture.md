# Design Lab Add Art 架构文档

**创建时间**: 2025-12-11 23:50:00  
**版本**: 1.0  
**状态**: ✅ 实现完成

---

## 一、架构概述

### 1.1 存储架构

- **GCS 存储桶**: `print-main-assets` (通过 `GCP_IMAGE_BUCKET` 环境变量配置)
- **目录结构**: `art-asset/{topCategory}/{subCategory}/{slug}.{ext}`
- **缩略图**: `art-asset/{topCategory}/{subCategory}/thumb/{slug}@200x200.jpg`
- **CDN 访问**: 通过 `GCP_IMAGE_BASE_URL` 配置，默认使用 `https://storage.googleapis.com/{bucket}`

### 1.2 数据模型

#### artwork_categories 表（树状分类）

```sql
CREATE TABLE artwork_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  parent_id UUID REFERENCES artwork_categories(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### art_assets 表（扩展字段）

新增字段：
- `slug`: URL 友好的标识符
- `description`: 描述
- `top_category_id`: 一级分类 ID
- `sub_category_id`: 二级分类 ID
- `gcs_key`: GCS 对象路径
- `gcs_bucket`: GCS Bucket 名称
- `source_url`: 原始来源 URL
- `tags`: 标签数组（PostgreSQL array）
- `license`: 授权类型
- `attribution`: 署名信息
- `dominant_color`: 主色调（hex）
- `status`: 状态（active/archived）

---

## 二、API 接口

### 2.1 获取艺术作品列表

```
GET /api/artworks?top={topSlug}&sub={subSlug}&query={search}&page={page}&pageSize={pageSize}
```

**参数**:
- `top`: 一级分类 slug（可选）
- `sub`: 二级分类 slug（可选）
- `query`: 搜索关键词（可选）
- `page`: 页码（默认 1）
- `pageSize`: 每页数量（默认 48）

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Artwork Name",
      "slug": "artwork-slug",
      "imageUrl": "https://storage.googleapis.com/...",
      "thumbnailUrl": "https://storage.googleapis.com/...",
      "width": 512,
      "height": 512,
      "tags": ["tag1", "tag2"],
      "topCategory": { "id": "uuid", "name": "Emojis", "slug": "emojis" },
      "subCategory": { "id": "uuid", "name": "Animals", "slug": "animals" }
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 48,
    "total": 100,
    "totalPages": 3
  }
}
```

### 2.2 获取分类树

```
GET /api/artworks/categories/tree
```

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Emojis",
      "slug": "emojis",
      "count": 50,
      "children": [
        {
          "id": "uuid",
          "name": "Animals",
          "slug": "animals",
          "count": 20
        }
      ]
    }
  ]
}
```

---

## 三、爬虫与导入流程

### 3.1 爬虫脚本

**位置**: `scripts/crawler/apify/emojis-animals.ts`

**功能**:
- 从互联网来源抓取艺术素材
- 保存到本地 `/tmp/art-crawler/{topCategory}/{subCategory}/`
- 生成 `metadata.json` 文件

**用法**:
```bash
npx ts-node scripts/crawler/apify/emojis-animals.ts
```

### 3.2 上传到 GCS

**位置**: `scripts/ingest/upload-to-gcs.ts`

**功能**:
- 读取本地抓取的素材
- 上传到 GCS
- 生成缩略图
- 更新 metadata.json（添加 gcsKey 和 thumbnailKey）

**用法**:
```bash
node scripts/ingest/upload-to-gcs.ts --input-dir=/tmp/art-crawler
```

### 3.3 导入数据库

**位置**: `scripts/ingest/import-artworks.ts`

**功能**:
- 读取 metadata.json
- 创建或获取分类
- 导入艺术作品到数据库

**用法**:
```bash
node scripts/ingest/import-artworks.ts --input-dir=/tmp/art-crawler
```

---

## 四、Apify MCP 配置

### 4.1 配置文件

**位置**: `mcp/apify.config.json`

```json
{
  "server": "apify",
  "apiTokenEnv": "APIFY_TOKEN",
  "defaultDataset": "designer-art-import",
  "defaultStorage": "local"
}
```

### 4.2 环境变量

在 `.env` 或 `.env.local` 中添加：

```bash
APIFY_TOKEN=your_apify_token_here
GCP_IMAGE_BUCKET=print-main-assets
GCP_IMAGE_BASE_URL=https://storage.googleapis.com/print-main-assets
GCP_PROJECT_ID=your_project_id
```

---

## 五、前端组件

### 5.1 ArtPanel 组件

**位置**: `apps/web/src/app/design-lab/components/panels/ArtPanel.tsx`

**功能**:
- 显示分类树（一级分类网格）
- 子分类导航
- 素材网格（响应式：手机2列/平板3列/桌面4列）
- 搜索功能
- 分页加载
- Lazy loading 图片

**数据流**:
1. 加载分类树：`artworksApi.getCategoriesTree()`
2. 选择分类：`artworksApi.getArtworks({ top, sub, query, page })`
3. 选择素材：调用 `onSelectArt(imageUrl, title)`

---

## 六、合规与授权

### 6.1 授权要求

- 仅抓取许可明确为 **Public Domain** 或有可商用授权的资源
- 在 metadata 中记录 `license` 和 `attribution`
- 未授权资源不得导入

### 6.2 来源示例

- **OpenClipart**: Public Domain
- **Public Domain Vectors**: Public Domain
- **Noun Project**: 需要 API key 和授权（需配置）

---

## 七、部署与验证

### 7.1 数据库迁移

```bash
# 创建迁移
npx prisma migrate dev --name add_artwork_categories_and_gcs_fields --schema=prisma/schema.prisma

# 应用迁移
npx prisma migrate deploy --schema=prisma/schema.prisma
```

### 7.2 运行爬虫与导入

```bash
# 1. 抓取素材
npx ts-node scripts/crawler/apify/emojis-animals.ts

# 2. 上传到 GCS
node scripts/ingest/upload-to-gcs.ts

# 3. 导入数据库
node scripts/ingest/import-artworks.ts
```

### 7.3 验证

1. **API 验证**:
   ```bash
   curl http://localhost:4000/api/artworks/categories/tree
   curl http://localhost:4000/api/artworks?top=emojis&sub=animals
   ```

2. **前端验证**:
   - 打开 Design Lab
   - 点击 "Add Art"
   - 验证分类显示
   - 验证素材加载
   - 验证搜索功能

3. **E2E 测试**:
   ```bash
   cd apps/web
   npx playwright test tests/e2e/designlab-add-art.spec.ts
   ```

---

## 八、故障排查

### 8.1 GCS 上传失败

- 检查 `GCP_IMAGE_BUCKET` 环境变量
- 检查 GCP 凭证（Application Default Credentials）
- 检查 Bucket 权限（需要 `storage.objects.create` 和 `storage.objects.setIamPolicy`）

### 8.2 数据库导入失败

- 检查 `DATABASE_URL` 环境变量
- 检查 Prisma Client 是否已生成：`npx prisma generate`
- 检查分类是否已创建

### 8.3 前端图片不显示

- 检查 `GCP_IMAGE_BASE_URL` 配置
- 检查 GCS 文件是否公开访问
- 检查浏览器控制台错误

---

## 九、后续扩展

1. **更多分类爬虫**: 创建 `scripts/crawler/apify/sports-games.ts` 等
2. **批量导入**: 支持从 CSV/JSON 批量导入
3. **图片优化**: 自动生成多种尺寸的缩略图
4. **搜索优化**: 使用 PostgreSQL 全文搜索或 Elasticsearch
5. **缓存策略**: 使用 Redis 缓存分类树和热门素材

---

## 十、相关文件

- **数据库模型**: `prisma/schema.prisma`
- **后端 API**: `backend/src/routes/artworks.js`, `backend/src/controllers/artworksController.js`
- **前端组件**: `apps/web/src/app/design-lab/components/panels/ArtPanel.tsx`
- **API 客户端**: `apps/web/src/lib/api.ts`
- **爬虫脚本**: `scripts/crawler/apify/emojis-animals.ts`
- **上传脚本**: `scripts/ingest/upload-to-gcs.ts`
- **导入脚本**: `scripts/ingest/import-artworks.ts`
- **E2E 测试**: `apps/web/tests/e2e/designlab-add-art.spec.ts`
