# 运行商品图片修复 API 指南
# [2025-01-29 19:55:00]

## 概述

由于本地无法直接连接生产数据库，我创建了一个 API 端点来执行修复操作。这个端点会在 Cloud Run 环境中运行，可以访问生产数据库。

## API 端点

### 1. 检查修复状态（不执行修复）

**端点**: `GET /api/admin/fix-images/status`

**功能**: 检查数据库中商品图片的当前状态

**请求示例**:
```bash
curl "https://print-main-backend-234065158862.us-central1.run.app/api/admin/fix-images/status"
```

**响应示例**:
```json
{
  "success": true,
  "stats": {
    "totalProducts": 12,
    "productsWithImages": 5,
    "productsWithoutImages": 7,
    "totalImages": 25
  },
  "products": [...]
}
```

### 2. 执行修复

**端点**: `POST /api/admin/fix-images/fix-product-images`

**功能**: 修复数据库中缺失的商品图片记录

**请求示例**:
```bash
curl -X POST "https://print-main-backend-234065158862.us-central1.run.app/api/admin/fix-images/fix-product-images" \
  -H "Content-Type: application/json"
```

**响应示例**:
```json
{
  "success": true,
  "message": "图片修复完成",
  "summary": {
    "total": 12,
    "fixed": 7,
    "skipped": 5,
    "errors": 0
  },
  "results": [...]
}
```

## 部署步骤

### 1. 提交代码到 GitHub

```bash
git add backend/src/routes/adminFixImages.js backend/src/app.js
git commit -m "feat: 添加修复商品图片记录的 API 端点"
git push origin main
```

### 2. 等待自动部署

代码会自动触发 Cloud Build 构建并部署到 Cloud Run。

### 3. 调用 API 执行修复

```bash
# 先检查状态
curl "https://print-main-backend-234065158862.us-central1.run.app/api/admin/fix-images/status"

# 执行修复
curl -X POST "https://print-main-backend-234065158862.us-central1.run.app/api/admin/fix-images/fix-product-images"
```

### 4. 验证修复结果

```bash
# 检查 API 响应
curl "https://print-main-backend-234065158862.us-central1.run.app/api/products?page=1&limit=1" \
  -H "Origin: https://print-main-frontend-234065158862.us-central1.run.app"
```

应该看到 `images` 数组不再为空。

## 安全注意事项

⚠️  **这个端点是临时的，修复完成后建议删除或添加身份验证**。

当前端点没有身份验证，任何人都可以调用。在生产环境中，应该：

1. 添加管理员身份验证
2. 限制 IP 访问
3. 修复完成后删除端点

## 修复逻辑

脚本会：

1. 查询所有激活的商品
2. 检查每个商品是否有图片记录
3. 根据已知的商品 slug 生成图片文件名
4. 为缺失的商品插入图片记录
5. 更新图片 URL 为正确的前端服务 URL

**图片 URL 格式**:
```
https://print-main-frontend-234065158862.us-central1.run.app/assets/products/{slug}/image-1.jpg
```

## 故障排除

### 如果 API 返回 404

- 检查路由是否已正确注册
- 检查服务是否已部署最新版本

### 如果修复失败

- 检查数据库连接是否正常
- 检查日志查看详细错误信息
- 确保数据库用户有足够的权限

---

**创建时间**: 2025-01-29 19:55:00
**状态**: 待部署和执行

