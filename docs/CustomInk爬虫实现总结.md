# Custom Ink 商品爬虫实现总结

**日期**: 2025-01-28 20:30:00

## 已完成的工作

### 1. 目录结构创建 ✅

- `backend/data/scraped-products/` - 存储 JSON 数据文件
- `apps/web/public/assets/products/` - 存储商品图片

### 2. 爬虫脚本框架 ✅

**文件**: `backend/scripts/scrape-customink-products.js`

**功能**:
- 定义了所有 13 个商品的 URL 列表
- 实现了目录创建功能
- 实现了图片下载功能
- 实现了 JSON 文件保存功能
- 提供了数据提取函数框架（待实现具体逻辑）

### 3. 数据导入脚本 ✅

**文件**: `backend/scripts/import-customink-products.js`

**功能**:
- 支持从 JSON 文件导入商品数据
- 自动创建分类（支持 2 级分类）
- 自动创建品牌
- 导入商品、变体和图片数据
- 完整的错误处理和数据验证

### 4. 文档 ✅

- `docs/CustomInk爬虫使用说明.md` - 使用说明
- `docs/CustomInk数据提取实现指南.md` - 数据提取指南

## 待完成的工作

### 1. 实现数据提取逻辑

由于需要使用浏览器访问页面提取数据，需要实现以下功能：

#### 从面包屑导航提取类目信息

```javascript
// 面包屑导航结构（从页面快照中看到）：
// All Product > T-shirt > Short Sleeve T-shirt > [产品名称]
// 需要提取一级类目和二级类目
```

#### 提取商品基础信息
- 产品名称
- 描述（简短和详细）
- 价格
- 品牌信息

#### 提取变体信息
- 所有可用颜色（名称和 hex 值）
- 所有可用尺寸
- 每个颜色×尺寸组合的图片

#### 提取图片信息
- 主图
- 所有颜色变体图
- 详情图

### 2. 测试单个商品爬取

选择一个商品（如 Gildan Softstyle Jersey T-shirt）进行测试，验证数据提取的准确性。

### 3. 批量爬取所有商品

爬取所有 13 个商品，生成 JSON 文件和汇总文件。

### 4. 图片下载和路径更新

下载所有图片到本地，并更新 JSON 中的图片 URL 为本地路径。

## 实现建议

### 选项 1：使用 Puppeteer 自动化提取（推荐）

1. 安装 Puppeteer：
   ```bash
   cd backend
   npm install puppeteer
   ```

2. 在 `scrapeProductData` 函数中实现 Puppeteer 逻辑
3. 提取所有需要的数据
4. 保存为 JSON 格式

### 选项 2：使用浏览器工具手动提取

1. 使用浏览器工具访问每个商品页面
2. 从页面快照中提取数据
3. 手动填写 JSON 文件
4. 使用脚本下载图片

### 选项 3：使用 Playwright（项目已安装）

项目已安装 Playwright，可以创建一个使用 Playwright 的爬虫版本。

## 下一步行动

1. 选择实现方式（推荐 Puppeteer 或 Playwright）
2. 实现 `scrapeProductData` 函数
3. 测试单个商品的数据提取
4. 批量爬取所有商品
5. 验证数据完整性
6. 执行导入到数据库

## JSON 数据结构

参考 `docs/CustomInk数据提取实现指南.md` 中的 JSON 数据结构定义。

## 注意事项

- 所有数据必须 100% 来自 Custom Ink 网站
- 确保从面包屑导航提取类目信息，支持 2 级分类
- 价格转换为 cents 格式
- 图片下载到本地并更新路径
- 所有变体（颜色×尺寸组合）都需要创建

