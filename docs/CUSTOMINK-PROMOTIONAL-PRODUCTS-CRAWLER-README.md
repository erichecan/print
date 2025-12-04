# Custom Ink 促销产品页面爬虫使用说明

## [2025-01-29 12:00:00] 爬虫脚本说明

### 文件位置
- 爬虫脚本: `scripts/crawl-customink-promotional-products.js`
- 输出目录: `customink-images/promotional-products/`
- 清单文件: `docs/customink-analysis/promotional-products-image-inventory.json`

### 运行方法

```bash
cd /Users/apony-it/Downloads/print-main
node scripts/crawl-customink-promotional-products.js
```

### 功能说明

1. **访问目标页面**: https://www.customink.com/products/promotional-products/218
2. **提取图片**: 自动提取页面上的所有图片URL（img标签、CSS背景图片、source标签）
3. **自动分类**: 将图片按类型分类（categories、logos、banners、products、icons、misc）
4. **下载图片**: 下载所有图片到对应的分类目录
5. **生成清单**: 创建JSON清单文件，记录所有图片信息

### 配置说明

- **超时时间**: 120秒（页面加载）
- **浏览器模式**: 非无头模式（headless: false），可以看到浏览器窗口
- **等待策略**: domcontentloaded（更快，不等待所有资源加载完成）
- **延迟设置**: 每次下载后延迟300ms，避免请求过快

### 输出结构

```
customink-images/promotional-products/
├── categories/     # 类别图标
├── logos/          # Logo图片
├── banners/        # Banner图片
├── products/       # 产品图片
├── icons/          # 图标
└── misc/           # 其他图片
```

### 注意事项

1. 爬虫需要一定时间完成（取决于图片数量）
2. 如果遇到超时，可以增加 `timeout` 参数
3. 已下载的图片会自动跳过（基于文件名）
4. 爬取的图片可以用于更新 `apps/web/src/data/promotional-categories.ts` 中的图片路径

### 后续步骤

爬取完成后：
1. 查看清单文件了解爬取结果
2. 根据需要更新类别数据结构中的图片路径
3. 图片可以直接在页面中使用

