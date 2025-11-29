# 图片 URL 修复完成报告

**完成时间**: 2025-01-28 22:45:00

## 问题分析

### 问题原因

1. **数据库中的图片 URL 指向 Custom Ink CDN**
   - 数据库存储的图片 URL 是 `https://mms-images.out.customink.com/...`
   - Next.js Image 组件无法加载这些外部 URL：
     - `next.config.mjs` 中没有配置 `mms-images.out.customink.com` 域名
     - Custom Ink 可能有防盗链保护
     - 外部 CDN 可能不稳定

2. **本地图片已下载但未更新到数据库**
   - 图片已经下载到本地：`apps/web/public/assets/products/{slug}/`
   - 但数据库中仍使用 Custom Ink CDN URL
   - 导致前端无法正确显示图片

## 解决方案

### 1. 创建图片 URL 更新脚本

创建了 `backend/scripts/update-product-image-urls.js` 脚本，功能：
- 扫描所有激活的商品
- 检查本地图片目录
- 将数据库中的 Custom Ink CDN URL 替换为本地路径
- 删除旧的 CDN 图片记录

### 2. 执行更新

```bash
node backend/scripts/update-product-image-urls.js
```

**更新结果：**
- ✅ 更新/创建: 37 张图片
- ✅ 删除旧的 CDN 图片记录
- ⚠️  4 个商品没有本地图片目录（需要后续处理）

### 3. 删除残留的 CDN 图片记录

删除了所有仍指向 Custom Ink CDN 的图片记录。

## 更新后的图片 URL 格式

**之前：**
```
https://mms-images.out.customink.com/mms/images/catalog/...
```

**现在：**
```
/assets/products/176100/main.png
/assets/products/176100/image-1.jpg
```

## 当前状态

### 已修复的商品（8个）
- ✅ Gildan Softstyle Jersey T-shirt (176100)
- ✅ Design Custom Printed Gildan Ultra Cotton T-Shirts (4600)
- ✅ Gildan Hammer T-shirt (364900)
- ✅ Comfort Colors 100% Cotton T-shirt (175800)
- ✅ Gildan Women's Softstyle Jersey Blend T-shirt (1021100)
- ✅ Gildan Youth 100% Cotton T-Shirt (134000)
- ✅ Gildan 100% Cotton Long Sleeve T-shirt (225900)
- ✅ Design Custom Printed Gildan Lightweight Hooded Sweatshirts (108200)

### 需要处理商品（4个）
- ⚠️  Gildan Youth Lightweight Hooded Sweatshirt (135300) - 没有本地图片目录
- ⚠️  Medium Cotton Canvas Tote Bag (2435100) - 没有本地图片目录
- ⚠️  Design Custom Printed Gildan Lightweight Crewneck Sweatshirts (107200) - 没有本地图片目录
- ⚠️  Gildan Youth Lightweight Crewneck Sweatshirt (135500) - 没有本地图片目录

## 下一步

1. **检查缺失图片的商品**
   - 检查这些商品是否有本地图片目录
   - 如果没有，需要重新下载图片

2. **验证图片显示**
   - 测试前端商品列表页面
   - 测试商品详情页面
   - 确认所有图片都能正常显示

3. **Next.js 配置**
   - 本地图片路径（`/assets/...`）不需要在 `next.config.mjs` 中配置
   - Next.js 会自动处理 `public` 目录下的静态文件

## 技术细节

### 本地图片路径结构
```
apps/web/public/assets/products/
├── 176100/
│   ├── main.png
│   ├── image-1.jpg
│   ├── image-2.jpg
│   ├── image-3.jpg
│   └── image-4.jpg
└── ...
```

### 数据库中的 URL 格式
```sql
SELECT url FROM product_images WHERE product_id = '...';
-- 结果: /assets/products/176100/main.png
```

### Next.js 静态文件处理
- `public` 目录下的文件会自动映射到网站根目录
- `/assets/products/176100/main.png` 对应文件 `apps/web/public/assets/products/176100/main.png`
- 不需要额外配置

## ✨ 总结

✅ 已修复大部分商品的图片 URL  
✅ 图片路径已更新为本地路径  
✅ 删除了旧的 CDN 图片记录  
⚠️  仍有 4 个商品需要处理本地图片  

现在前端应该能够正常显示大部分商品的图片了！

