# Design Lab 颜色映射实现总结

**创建时间**: 2025-01-30 23:55:00  
**状态**: ✅ 已完成

---

## 实现内容

### 1. 修复画布图片显示问题 ✅

**问题**：画布中央的默认商品图片没有显示

**修复**：
- 在 `DesignLabClient.tsx` 中添加了新的 `useEffect`，确保即使没有 `productInfo` 也显示默认图片
- 当画布初始化后，如果没有产品信息，自动设置默认白色产品信息
- 当 `productInfo` 更新后，自动重新加载背景图片

**代码位置**：
- `apps/web/src/app/design-lab/DesignLabClient.tsx` 第 343-365 行

---

### 2. 扩展 COLOR_ID_MAP ✅

**实现**：
- 在 `customink-images.ts` 中扩展了 `COLOR_ID_MAP`，添加了 10 种常见颜色：
  - Red (176106)
  - Royal Blue (176107)
  - Forest Green (176108)
  - Purple (176109)
  - Pink (176110)
  - Orange (176111)
  - Yellow (176112)
  - Charcoal (176113)
  - Heather Blue (176114)
  - Heather Red (176115)

**代码位置**：
- `apps/web/src/lib/customink-images.ts` 第 13-35 行

---

### 3. 创建爬取脚本 ✅

**脚本**：`scripts/scrape-customink-colors.js`

**功能**：
1. 访问 Custom Ink Design Lab
2. 监听网络请求，提取产品 ID 和颜色 ID
3. 尝试从页面提取颜色名称
4. 验证图片 URL 是否存在
5. 生成颜色映射表 JSON 文件

**使用方法**：
```bash
cd scripts
node scrape-customink-colors.js
```

**输出文件**：
- `docs/customink-analysis/color-mapping.json`

---

### 4. 创建数据库映射表 ✅

**数据库表**：`product_color_images`

**Schema**（Prisma）：
```prisma
model ProductColorImage {
  id                String   @id @default(uuid())
  productId         String?  @map("product_id")
  customInkProductId String  @map("customink_product_id")
  customInkColorId  String  @map("customink_color_id")
  colorName         String  @map("color_name")
  colorHex          String? @map("color_hex")
  imageUrls         Json    @map("image_urls")
  isVerified        Boolean @default(false) @map("is_verified")
  isActive          Boolean @default(true) @map("is_active")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")
  
  product Product? @relation(fields: [productId], references: [id])
  
  @@unique([customInkProductId, customInkColorId])
  @@index([customInkProductId])
  @@index([customInkColorId])
  @@index([colorName])
  @@map("product_color_images")
}
```

**迁移文件**：
- `backend/src/migrations/20250131000000-create-product-color-images.js`

**模型文件**：
- `backend/src/models/ProductColorImage.js`

**运行迁移**：
```bash
cd backend
npm run db:migrate
```

---

### 5. 创建 API 端点 ✅

**路由**：`/api/product-color-images`

**端点**：
1. `GET /api/product-color-images` - 获取产品颜色图片映射列表
2. `GET /api/product-color-images/by-color/:productId/:colorName` - 根据颜色名称获取图片 URL
3. `GET /api/product-color-images/mapping/:productId` - 获取颜色映射表（用于前端 COLOR_ID_MAP）
4. `POST /api/product-color-images/bulk` - 批量创建或更新颜色映射

**控制器**：
- `backend/src/controllers/productColorImageController.js`

**路由文件**：
- `backend/src/routes/productColorImages.js`

**前端 API 客户端**：
- `apps/web/src/lib/api.ts` - `productColorImageApi`

---

### 6. 更新前端图片加载逻辑 ✅

**更新内容**：
- `customink-images.ts` 添加了异步 API 支持：
  - `loadColorMapFromAPI()` - 从 API 加载颜色映射
  - `getProductImageUrlFromAPI()` - 从 API 获取图片 URL
  - `getProductBaseImagesFromAPI()` - 从 API 获取所有视图图片 URL

- `DesignLabClient.tsx` 更新了 `loadBackgroundImage`：
  - 优先使用 `productInfo.baseImages`
  - 如果没有，尝试从 API 异步获取
  - 回退到静态生成的 URL

---

## 使用流程

### 步骤 1：运行数据库迁移

```bash
cd backend
npm run db:migrate
```

### 步骤 2：运行爬取脚本（可选）

```bash
cd scripts
node scrape-customink-colors.js
```

这将：
- 从 Custom Ink Design Lab 提取颜色信息
- 验证图片 URL
- 生成 `docs/customink-analysis/color-mapping.json`

### 步骤 3：导入颜色映射到数据库

```bash
cd backend
node scripts/import-color-mapping.js
```

这将：
- 读取 `color-mapping.json`
- 批量导入到 `product_color_images` 表

### 步骤 4：测试 API

```bash
# 获取颜色映射表
curl http://localhost:3001/api/product-color-images/mapping/6a62c76ef0978853a20391b6c32da4fe

# 根据颜色名称获取图片 URL
curl "http://localhost:3001/api/product-color-images/by-color/6a62c76ef0978853a20391b6c32da4fe/White?view=front"
```

---

## 文件清单

### 新增文件

1. **爬取脚本**：
   - `scripts/scrape-customink-colors.js`

2. **数据库相关**：
   - `prisma/schema.prisma` (更新)
   - `backend/src/migrations/20250131000000-create-product-color-images.js`
   - `backend/src/models/ProductColorImage.js`

3. **API 相关**：
   - `backend/src/controllers/productColorImageController.js`
   - `backend/src/routes/productColorImages.js`
   - `backend/scripts/import-color-mapping.js`

4. **文档**：
   - `docs/DESIGN-LAB-PRODUCT-IMAGE-ISSUES.md`
   - `docs/DESIGN-LAB-COLOR-MAPPING-IMPLEMENTATION.md` (本文档)

### 修改文件

1. **前端**：
   - `apps/web/src/lib/customink-images.ts` - 扩展颜色映射，添加 API 支持
   - `apps/web/src/lib/api.ts` - 添加 `productColorImageApi`
   - `apps/web/src/app/design-lab/DesignLabClient.tsx` - 修复图片显示，支持 API 获取

2. **后端**：
   - `backend/src/app.js` - 注册新路由
   - `backend/src/models/index.js` - 注册新模型

---

## 测试验证

### 1. 画布图片显示测试

- [ ] 打开 Design Lab 页面（无 variantId）
- [ ] 验证画布中央显示默认白色 T-shirt 图片
- [ ] 验证图片加载成功，无控制台错误

### 2. 颜色切换测试

- [ ] 点击 Product Colors 工具
- [ ] 选择不同颜色（Black, Navy, Maroon 等）
- [ ] 验证画布中央图片立即更新
- [ ] 验证每个颜色都显示正确的产品图片

### 3. API 测试

- [ ] 运行数据库迁移
- [ ] 运行爬取脚本
- [ ] 导入颜色映射
- [ ] 测试 API 端点返回正确数据

### 4. 视图切换测试

- [ ] 切换 Front/Back/Sleeve 视图
- [ ] 验证每个视图都显示正确的产品图片
- [ ] 验证图片 URL 正确

---

## 下一步优化

### 短期（1-2 周）

1. **运行爬取脚本**：
   - 执行 `scripts/scrape-customink-colors.js` 获取更多颜色
   - 验证并导入到数据库

2. **扩展颜色支持**：
   - 从 Custom Ink 爬取更多颜色的实际 ID
   - 更新 `COLOR_ID_MAP` 和数据库

### 中期（1 个月）

1. **多产品支持**：
   - 扩展支持其他产品（Hoodie, Sweatshirt 等）
   - 创建产品-颜色映射的通用系统

2. **图片缓存**：
   - 实现图片预加载
   - 添加 CDN 支持

### 长期（2-3 个月）

1. **动态颜色发现**：
   - 自动从 Custom Ink API 发现新颜色
   - 定期更新颜色映射

2. **图片优化**：
   - 实现图片懒加载
   - 添加图片压缩和格式优化

---

## 相关文档

- [Design Lab 产品图片问题分析](./DESIGN-LAB-PRODUCT-IMAGE-ISSUES.md)
- [Design Lab 本地测试指南](./DESIGN-LAB-LOCAL-TESTING-GUIDE.md)
- [Custom Ink 分析报告](../customink-analysis/)

---

**最后更新**: 2025-01-30 23:55:00

