# Custom Ink 艺术素材爬取指南

**日期**: 2025-12-06 12:30:00

## 概述

本指南说明如何从 Custom Ink Design Lab 爬取艺术素材（Art Assets），并保存到 Google Cloud Storage (GCS)。

## 功能说明

艺术素材库（Art Assets）是 Design Lab 中 "Add Art" 功能使用的素材库，包含：
- Emojis（表情符号）
- Shapes & Symbols（形状和符号）
- Sports & Games（运动和游戏）
- Letters & Numbers（字母和数字）
- Animals（动物）
- Mascots（吉祥物）
- Nature（自然）
- America（美国主题）
- Food & Drink（食物和饮料）
- Travel（旅行）
- Objects（物品）
- Clothing（服装）
- Activities（活动）

## 脚本说明

### 1. 爬取脚本：`scripts/scrape-customink-art-assets.js`

**功能**：
- 使用 Puppeteer 访问 Custom Ink Design Lab
- 自动点击 "Add Art" 按钮
- 提取所有艺术素材分类和素材列表
- 下载所有素材图片到本地
- 上传所有素材到 GCS
- 生成包含 GCS URL 的 JSON 数据文件

**使用方法**：
```bash
cd /Users/eric/Desktop/print-main
node scripts/scrape-customink-art-assets.js
```

**输出**：
- 本地文件：`customink-images/art-assets/{category}/{asset-name}.png`
- 数据文件：`customink-images/art-assets/art-assets-data.json`
- GCS 路径：`art-asset/{category}/{asset-name}.png`

### 2. 导入脚本：`scripts/import-customink-art-assets.js`

**功能**：
- 读取爬取生成的 JSON 数据文件
- 将艺术素材数据导入到数据库
- 如果素材已存在，则更新 URL（如果不同）
- 如果素材不存在，则创建新记录

**使用方法**：
```bash
cd /Users/eric/Desktop/print-main
node scripts/import-customink-art-assets.js
```

**前提条件**：
- 必须先运行爬取脚本生成数据文件
- 数据库连接正常
- 环境变量配置正确

## 环境变量配置

确保以下环境变量已配置：

```bash
# GCS 配置
GCP_IMAGE_BUCKET=print-main-assets
GCP_IMAGE_BASE_URL=https://storage.googleapis.com/print-main-assets

# 数据库配置（已在 .env 中配置）
DATABASE_URL=postgresql://...
```

## 工作流程

1. **爬取阶段**：
   ```bash
   node scripts/scrape-customink-art-assets.js
   ```
   - 访问 Custom Ink Design Lab
   - 提取所有艺术素材
   - 下载到本地
   - 上传到 GCS
   - 生成 JSON 数据文件

2. **导入阶段**：
   ```bash
   node scripts/import-customink-art-assets.js
   ```
   - 读取 JSON 数据文件
   - 导入到数据库
   - 更新现有记录

3. **验证**：
   - 访问 Design Lab 的 "Add Art" 功能
   - 检查艺术素材是否正确显示
   - 验证图片 URL 是否为 GCS URL

## 数据格式

### JSON 数据文件格式

```json
{
  "categories": [
    {
      "name": "Emojis",
      "slug": "emojis"
    },
    ...
  ],
  "assets": {
    "emojis": [
      {
        "name": "smile",
        "url": "https://storage.googleapis.com/print-main-assets/art-asset/emojis/smile.png",
        "thumbnailUrl": "https://storage.googleapis.com/print-main-assets/art-asset/emojis/smile.png",
        "imageUrl": "https://storage.googleapis.com/print-main-assets/art-asset/emojis/smile.png"
      },
      ...
    ],
    ...
  }
}
```

### 数据库模型

艺术素材存储在 `art_assets` 表中，包含以下字段：
- `id`: UUID
- `category`: 分类名称（如 "Emojis"）
- `name`: 素材名称
- `image_url`: 图片 URL（GCS URL）
- `thumbnail_url`: 缩略图 URL（GCS URL）
- `width`: 图片宽度
- `height`: 图片高度
- `sort_order`: 排序顺序
- `is_active`: 是否启用
- `created_at`: 创建时间
- `updated_at`: 更新时间

## 注意事项

1. **爬取频率**：避免过于频繁的请求，脚本中已添加延迟（500ms）
2. **GCS 权限**：确保 GCS bucket 有正确的权限设置
3. **数据更新**：如果素材已存在，导入脚本会更新 URL（如果不同）
4. **错误处理**：脚本会记录所有错误，但不会中断执行

## 故障排除

### 问题 1: 无法找到 Add Art 按钮
**解决方案**：脚本会尝试直接查找艺术素材面板，如果仍然失败，可以手动打开 Design Lab 页面，然后运行脚本。

### 问题 2: GCS 上传失败
**解决方案**：
- 检查 GCS 凭证配置
- 确认 bucket 名称正确
- 检查网络连接

### 问题 3: 数据库导入失败
**解决方案**：
- 检查数据库连接
- 确认 Prisma schema 正确
- 查看错误日志

## 后续优化

1. **增量更新**：只爬取新增或更新的素材
2. **批量导入**：优化数据库导入性能
3. **自动同步**：定期自动同步 Custom Ink 的艺术素材
4. **分类管理**：支持自定义分类和排序

