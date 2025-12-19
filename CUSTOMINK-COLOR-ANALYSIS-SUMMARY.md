# Custom Ink 颜色分析总结

**分析时间**: 2025-01-30 21:30:00

## 关键发现

### 1. URL 参数结构

从 URL `https://www.customink.com/ndx/?SK=176100&PK=176126#/productColor` 可以看到：

- **SK (Style Key)**: `176100` - 可能是产品样式 ID
- **PK (Product Key)**: `176126` - 可能是产品 ID 或当前选中的颜色 ID
- **Hash**: `#/productColor` - 路由标识，表示颜色选择页面

### 2. 图片 URL 模式

从网络请求分析发现：

```
https://mms-images-prod.imgix.net/mms/images/catalog/{productId}/colors/{colorId}/views/alt/{view}_{size}.png
```

**关键发现**:
- 图片 URL 中的 `colorId` 是 `176126`，与 URL 参数中的 `PK=176126` 一致
- 这说明 **PK 参数就是当前选中的颜色 ID**
- 产品 ID 在 URL 中是 `e2869fba030e981dc4fa89b7b3d800fd` 或 `91fda2f50ed2bfbfcef2e5aeae5f9b51`（可能有多个产品变体）

### 3. 颜色选择器结构

从页面结构分析：

- 颜色选择器使用 `swatch-outline` 和 `pigment-colorswatch-selected` 类名
- 没有明显的 `data-color-id` 或 `data-sk` 属性
- 颜色信息可能存储在 React/Vue 组件的状态中
- 需要从网络请求中提取颜色 ID

### 4. 颜色数量

- 从用户截图可以看到有 **45+ 种颜色**
- 当前分析只找到了 5 个颜色选择器（可能是模态框未完全加载）
- 需要滚动或等待动态加载才能看到所有颜色

## 爬取策略

### 方案 1: 基于网络请求（推荐）

监听网络请求，从图片 URL 中提取所有颜色 ID：

```javascript
// 监听所有图片请求
page.on('request', (request) => {
  const url = request.url();
  if (url.includes('/colors/') && url.includes('mms-images-prod.imgix.net')) {
    const match = url.match(/\/colors\/(\d+)\//);
    if (match) {
      const colorId = match[1];
      // 记录颜色 ID
    }
  }
});

// 然后遍历所有可能的颜色 ID 范围
// 例如：176100-176200，验证哪些颜色存在
```

### 方案 2: 基于 URL 参数变化

1. 访问产品页面
2. 点击 "Change Color" 按钮
3. 等待模态框加载
4. 滚动查看所有颜色
5. 点击每个颜色，观察 URL 中 PK 参数的变化
6. 记录所有不同的 PK 值（即颜色 ID）

### 方案 3: 基于颜色 ID 范围扫描

由于颜色 ID 可能是连续的（如 176100, 176101, 176102...），可以：

1. 定义颜色 ID 范围（如 176100-176200）
2. 对每个 ID 生成图片 URL
3. 验证图片是否存在（HEAD 请求）
4. 如果存在，记录该颜色 ID

## 推荐实现

结合三种方案：

1. **首先**：使用方案 1 监听网络请求，快速收集已加载的颜色
2. **然后**：使用方案 3 扫描颜色 ID 范围，补充遗漏的颜色
3. **最后**：使用方案 2 验证并获取颜色名称

## 下一步行动

1. ✅ 已完成页面结构分析
2. ⏳ 创建改进的爬虫脚本，结合三种方案
3. ⏳ 运行脚本抓取所有颜色
4. ⏳ 上传图片到 GCS
5. ⏳ 导入到数据库

