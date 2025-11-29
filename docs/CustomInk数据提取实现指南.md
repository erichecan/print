# Custom Ink 商品数据提取实现指南

## 概述

本指南说明如何从 Custom Ink 网站提取商品数据。由于需要使用浏览器访问页面，提供了两种方法：
1. 使用浏览器工具手动提取并填写数据
2. 使用 Puppeteer 自动化提取（推荐）

## 需要提取的数据

### 1. 从面包屑导航提取类目信息

面包屑导航通常显示为：
```
All Product > T-shirt > Short Sleeve T-shirt > [产品名称]
```

需要提取：
- 一级类目（如 "T-shirt"）
- 二级类目（如 "Short Sleeve T-shirt"）
- 将类目名称转换为 slug 格式

### 2. 商品基础信息

- **产品名称**：页面标题或 H1 标签
- **描述**：简短描述和详细描述
- **价格**：基础价格（转换为 cents）
- **品牌**：从产品名称或页面信息提取（主要是 Gildan）
- **SKU 前缀**：从产品信息生成

### 3. 变体信息

- **颜色列表**：查找颜色选择器，提取所有可用颜色
  - 颜色名称（如 "Black", "White"）
  - 颜色 hex 值（如果可用）
- **尺寸列表**：查找尺寸选择器，提取所有可用尺寸
- **颜色×尺寸组合**：为每个组合创建变体数据
- **变体图片**：每个颜色变体的产品图片 URL

### 4. 图片信息

- **主图**：产品的主要展示图片
- **颜色变体图**：每个颜色变体的图片
- **详情图**：产品详情页的其他图片
- **图片 alt 文本**：从图片元素提取

## 实现步骤

### 方法 1：使用 Puppeteer 自动化提取

1. **安装 Puppeteer**：
   ```bash
   cd backend
   npm install puppeteer
   ```

2. **实现数据提取函数**：
   - 使用 Puppeteer 打开页面
   - 等待页面加载完成
   - 提取所有需要的数据
   - 保存为 JSON 格式

3. **提取面包屑导航**：
   ```javascript
   const breadcrumbs = await page.$$eval('nav[aria-label="breadcrumb"] a', 
     elements => elements.map(el => el.textContent.trim())
   );
   ```

4. **提取商品信息**：
   - 从页面标题提取产品名称
   - 从描述区域提取描述文本
   - 从价格元素提取价格

5. **提取变体信息**：
   - 查找颜色选择器按钮/选项
   - 点击每个颜色，提取颜色名称和图片
   - 查找尺寸选择器，提取所有尺寸

6. **下载图片**：
   - 获取所有图片 URL
   - 使用 downloadImage 函数下载到本地
   - 更新 JSON 中的图片路径为本地路径

### 方法 2：手动提取 + JSON 编辑

1. 使用浏览器访问商品页面
2. 手动提取以下信息：
   - 从面包屑导航获取类目信息
   - 复制商品名称、描述、价格
   - 列出所有颜色和尺寸
   - 复制图片 URL
3. 将数据填入 JSON 模板文件
4. 运行脚本下载图片

## JSON 数据格式

每个商品的 JSON 文件应包含以下结构：

```json
{
  "sourceUrl": "https://www.customink.com/products/...",
  "scrapedAt": "2025-01-28T20:00:00Z",
  "product": {
    "name": "Gildan Softstyle Jersey T-shirt",
    "slug": "gildan-softstyle-jersey-t-shirt",
    "description": "Short description from page",
    "longDescription": "Long description from page",
    "basePriceCents": 1500,
    "skuPrefix": "GIL-SSJ",
    "categoryParentSlug": "t-shirts",
    "categoryChildSlug": "short-sleeve-t-shirts",
    "brandSlug": "gildan",
    "weight": null,
    "dimensions": null,
    "isCustomizable": true
  },
  "variants": [
    {
      "color": "Black",
      "colorHex": "#000000",
      "size": "S",
      "priceAdjustment": 0,
      "imageUrl": "/assets/products/gildan-softstyle-jersey-t-shirt/color-black-s.jpg",
      "stockQuantity": 50
    }
  ],
  "images": [
    {
      "url": "/assets/products/gildan-softstyle-jersey-t-shirt/main.jpg",
      "alt": "Gildan Softstyle Jersey T-shirt",
      "sortOrder": 0
    }
  ]
}
```

## 注意事项

1. **数据准确性**：确保所有数据 100% 来自 Custom Ink 网站，不要生成或编造任何数据
2. **类目映射**：注意将 Custom Ink 的类目映射到我们的分类系统
3. **价格格式**：价格需要转换为 cents（整数）
4. **图片下载**：所有图片都要下载到本地，URL 更新为本地路径
5. **错误处理**：对于无法提取的字段，使用 null 或合理的默认值

## 下一步

完成数据提取后，使用导入脚本将数据导入数据库：

```bash
node backend/scripts/import-customink-products.js
```

