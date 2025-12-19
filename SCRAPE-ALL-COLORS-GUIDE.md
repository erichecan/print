# 抓取 Custom Ink 所有颜色指南

**创建时间**: 2025-01-30 21:00:00

## 问题

当前数据库中只有 **6 种颜色**，但 Custom Ink 实际支持 **45+ 种颜色**。需要抓取所有可用颜色。

## 解决方案

### 方案 1: 使用新的爬虫脚本（推荐）

我创建了一个新的脚本 `scripts/scrape-all-customink-colors.js`，可以：

1. 访问 Custom Ink 产品页面
2. 自动提取所有颜色选择器
3. 获取每个颜色的 ID、名称和 hex 值
4. 验证图片 URL 是否存在
5. 生成完整的颜色映射文件

**使用方法**:
```bash
cd /Users/eric/Desktop/print-main
node scripts/scrape-all-customink-colors.js
```

**输出文件**: `docs/customink-analysis/all-colors-mapping.json`

### 方案 2: 改进现有脚本

修改 `scripts/scrape-and-upload-customink-product-images.js`，扩展颜色列表。

**步骤**:
1. 先运行 `scrape-all-customink-colors.js` 获取所有颜色
2. 将结果合并到 `PRODUCTS` 配置中
3. 重新运行上传脚本

### 方案 3: 手动扩展颜色范围

修改 `scripts/scrape-customink-colors.js`，扩大颜色 ID 搜索范围：

```javascript
// 当前范围: 176100-176200 (100个)
// 可以扩展到: 176100-176300 (200个) 或更大
const colorIdRange = Array.from({ length: 200 }, (i) => 176100 + i);
```

## 推荐流程

### 第一步: 抓取所有颜色

```bash
node scripts/scrape-all-customink-colors.js
```

这会生成 `docs/customink-analysis/all-colors-mapping.json`，包含所有可用颜色的信息。

### 第二步: 更新上传脚本

将抓取到的颜色添加到 `scripts/scrape-and-upload-customink-product-images.js` 的 `PRODUCTS` 配置中。

### 第三步: 上传所有颜色图片到 GCS

```bash
GCP_IMAGE_BUCKET=print-main-product-images \
GCP_IMAGE_BASE_URL=https://storage.googleapis.com/print-main-product-images \
node scripts/scrape-and-upload-customink-product-images.js
```

### 第四步: 导入到数据库

```bash
node backend/scripts/import-color-images-from-gcs-json.js
```

## 注意事项

1. **颜色 ID 范围**: Custom Ink 的颜色 ID 可能不连续，需要实际抓取才能确定
2. **图片验证**: 不是所有颜色 ID 都有对应的图片，需要验证
3. **颜色名称**: 某些颜色可能没有明确的名称，需要手动补充
4. **请求频率**: 避免请求过快，添加适当的延迟

## 预期结果

- 抓取 40-50 种颜色
- 每种颜色包含 front/back/sleeve 三个视图
- 总共 120-150 张图片需要上传到 GCS
- 数据库中将有 40-50 条颜色映射记录

