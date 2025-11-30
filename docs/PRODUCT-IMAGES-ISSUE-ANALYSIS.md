# 商品图片显示问题分析报告
# [2025-01-29 19:30:00]

## 问题描述

商品图片无法正常显示。

## 检查结果

### 1. 图片文件状态 ✅

**本地文件**：
- 位置：`apps/web/public/assets/products/`
- 数量：12 个商品，56 张图片
- 状态：所有图片文件都存在

**部署状态**：
- 前端服务可以访问图片（HTTP 200）
- 测试 URL：`https://print-main-frontend-234065158862.us-central1.run.app/assets/products/2435100/image-1.jpg`
- Dockerfile 正确复制了 `public` 目录

### 2. API 响应问题 ⚠️

**发现的问题**：
- API 返回的 `images` 数组为空 `[]`
- 只有 `primaryImage` 有值
- `primaryImage.url` 格式正确：`https://print-main-frontend-234065158862.us-central1.run.app/assets/products/{slug}/image-1.jpg`

**示例 API 响应**：
```json
{
  "slug": "2435100",
  "primaryImage": {
    "url": "https://print-main-frontend-234065158862.us-central1.run.app/assets/products/2435100/image-1.jpg",
    "alt": "Medium Cotton Canvas Tote Bag"
  },
  "images": []  // ❌ 空数组
}
```

### 3. 可能的原因

1. **数据库中 `product_images` 表为空**
   - 数据库中没有图片记录
   - 只有商品，没有关联的图片记录

2. **数据库中的图片 URL 格式不对**
   - URL 可能指向错误的路径
   - URL 可能是相对路径，但没有正确处理

3. **`primaryImage` 是从 `variant.imageUrl` 生成的**
   - 可能是从变体的 `imageUrl` 字段获取的
   - 而不是从 `product_images` 表获取的

## 解决方案

### 方案 A：修复数据库中的图片 URL（推荐，快速修复）

**步骤**：
1. 检查数据库中 `product_images` 表是否有记录
2. 如果没有记录，需要插入图片记录
3. 如果有记录但 URL 不对，需要更新 URL

**需要执行的 SQL 查询**：
```sql
-- 检查 product_images 表
SELECT COUNT(*) FROM product_images;

-- 检查图片 URL 格式
SELECT 
    p.slug as product_slug,
    pi.url as image_url,
    pi.alt,
    pi.sort_order
FROM product_images pi
JOIN products p ON pi.product_id = p.id
WHERE p.is_active = true
ORDER BY p.slug, pi.sort_order
LIMIT 20;
```

### 方案 B：将图片迁移到 GCP Cloud Storage（长期方案）

**优点**：
- 更可靠（不受容器重启影响）
- 更好的性能（CDN 加速）
- 更容易管理（独立存储）

**步骤**：
1. 创建 GCP Cloud Storage bucket
2. 上传所有商品图片到 bucket
3. 更新数据库中的图片 URL 为 Cloud Storage URL
4. 配置 Cloud Storage 的公共访问权限

## 下一步

1. ✅ 检查数据库中的图片记录
2. ⏳ 根据检查结果选择修复方案
3. ⏳ 执行修复
4. ⏳ 验证修复结果

---

**分析时间**: 2025-01-29 19:30:00
**状态**: 待修复

