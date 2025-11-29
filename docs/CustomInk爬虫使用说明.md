# Custom Ink 商品数据爬虫使用说明

## 概述

此爬虫脚本用于从 Custom Ink 网站提取商品数据，保存为 JSON 文件，并下载商品图片到本地。

## 目录结构

```
backend/
├── scripts/
│   └── scrape-customink-products.js    # 爬虫脚本
├── data/
│   └── scraped-products/
│       ├── all-products.json           # 所有商品汇总
│       └── {product-slug}.json         # 单个商品数据
apps/web/public/assets/
└── products/
    └── {product-slug}/                 # 商品图片目录
```

## 使用说明

### 1. 安装依赖

脚本使用 Node.js 内置模块，无需额外安装依赖。但如需使用 Puppeteer 自动提取数据，需要安装：

```bash
cd backend
npm install puppeteer
```

### 2. 运行爬虫

#### 爬取单个商品

```bash
node backend/scripts/scrape-customink-products.js "https://www.customink.com/products/t-shirts/short-sleeve-t-shirts/gildan-softstyle-jersey-t-shirt/176100?PK=176113&bg=1"
```

#### 爬取所有商品

```bash
node backend/scripts/scrape-customink-products.js
```

## 数据提取流程

由于 Custom Ink 网站可能使用动态加载，建议使用以下方法之一提取数据：

### 方法 1：使用 Puppeteer（推荐）

脚本将自动打开浏览器，访问页面并提取数据。

### 方法 2：手动提取 + JSON 编辑

1. 使用浏览器访问商品页面
2. 手动提取以下信息：
   - 商品名称
   - 商品描述
   - 价格
   - 颜色列表
   - 尺寸列表
   - 图片 URL
   - 面包屑导航中的类目信息
3. 将数据填入 JSON 模板
4. 使用脚本下载图片

## 待实现功能

- [ ] 使用 Puppeteer 自动提取商品数据
- [ ] 从面包屑导航提取类目信息
- [ ] 提取所有颜色和尺寸组合
- [ ] 自动下载所有图片
- [ ] 数据验证和错误处理

