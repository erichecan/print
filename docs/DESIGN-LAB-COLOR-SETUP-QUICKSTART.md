# Design Lab 颜色映射快速开始指南

**创建时间**: 2025-01-30 23:55:00

---

## 快速开始（3 步）

### 步骤 1：运行数据库迁移

```bash
cd backend
npm run db:migrate
```

这将创建 `product_color_images` 表。

### 步骤 2：运行爬取脚本（可选）

```bash
cd scripts
node scrape-customink-colors.js
```

这将：
- 从 Custom Ink Design Lab 提取颜色信息
- 验证图片 URL
- 生成 `docs/customink-analysis/color-mapping.json`

**注意**：如果爬取脚本无法运行或没有提取到数据，可以手动创建 `color-mapping.json` 文件。

### 步骤 3：导入颜色映射到数据库

```bash
cd backend
node scripts/import-color-mapping.js
```

这将从 `color-mapping.json` 导入颜色映射到数据库。

---

## 验证

### 测试 API

```bash
# 获取颜色映射表
curl http://localhost:3001/api/product-color-images/mapping/6a62c76ef0978853a20391b6c32da4fe

# 根据颜色名称获取图片 URL
curl "http://localhost:3001/api/product-color-images/by-color/6a62c76ef0978853a20391b6c32da4fe/White?view=front"
```

### 测试 Design Lab

1. 打开 http://localhost:3000/design-lab
2. 验证画布中央显示默认白色 T-shirt 图片
3. 点击 Product Colors 工具
4. 选择不同颜色，验证图片更新

---

## 手动创建颜色映射（如果爬取失败）

如果爬取脚本无法运行，可以手动创建 `docs/customink-analysis/color-mapping.json`：

```json
{
  "timestamp": "2025-01-30T23:55:00.000Z",
  "productId": "6a62c76ef0978853a20391b6c32da4fe",
  "productName": "Gildan Softstyle Jersey T-shirt",
  "colorData": {
    "176100": {
      "colorId": "176100",
      "name": "White",
      "hex": null,
      "imageUrls": {
        "front": "https://mms-images-prod.imgix.net/mms/images/catalog/6a62c76ef0978853a20391b6c32da4fe/colors/176100/views/alt/front_large_extended.png",
        "back": "https://mms-images-prod.imgix.net/mms/images/catalog/6a62c76ef0978853a20391b6c32da4fe/colors/176100/views/alt/back_large_extended.png",
        "sleeve": "https://mms-images-prod.imgix.net/mms/images/catalog/6a62c76ef0978853a20391b6c32da4fe/colors/176100/views/alt/front_large_extended.png"
      },
      "verified": true
    }
  },
  "colorMapping": {
    "White": "176100"
  },
  "totalColors": 1,
  "verifiedColors": 1
}
```

然后运行导入脚本即可。

---

## 故障排查

### 问题 1：数据库迁移失败

**错误**：`Environment variable not found: DATABASE_URL`

**解决**：
1. 确保 `backend/.env` 文件存在
2. 检查 `DATABASE_URL` 是否已配置

### 问题 2：爬取脚本无法运行

**错误**：`playwright not found`

**解决**：
```bash
cd scripts
npm install playwright
```

### 问题 3：API 返回 404

**检查**：
1. 后端服务是否运行在 3001 端口
2. 路由是否正确注册：`backend/src/app.js`
3. 模型是否正确注册：`backend/src/models/index.js`

---

**最后更新**: 2025-01-30 23:55:00

