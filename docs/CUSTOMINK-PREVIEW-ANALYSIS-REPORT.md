# Custom Ink 产品预览实现分析报告

**分析时间**: 2025-12-02 21:50:14  
**分析 URL**: https://www.customink.com/ndx/#/welcome  
**状态**: ✅ 分析完成

## 执行摘要

经过对 Custom Ink Design Lab 的深入分析，确认了产品预览的实现方式：

- ✅ **实现方式**: 使用**预渲染的不同颜色和视图的图片**
- ✅ **图片存储**: 使用 `mms-images-prod.imgix.net` (Imgix CDN)
- ✅ **URL 结构**: 规范的路径结构，便于爬取
- ✅ **视图支持**: Front、Back 等多种视图
- ✅ **颜色支持**: 每种颜色都有独立的图片

## 详细分析结果

### 1. 图片实现方式

**结论**: Custom Ink 使用**预渲染的不同颜色和视图的静态图片**，而不是动态生成。

**证据**:
- 图片存储在 `mms-images-prod.imgix.net` CDN 上
- URL 路径中包含明确的产品 ID、颜色 ID 和视图名称
- 切换颜色/视图时，直接加载不同的图片 URL

### 2. 图片 URL 结构模式

**基础 URL**:
```
https://mms-images-prod.imgix.net/mms/images/catalog/{product-id}/colors/{color-id}/views/alt/{view}_{size}.png
```

**URL 组成部分**:
1. **域名**: `mms-images-prod.imgix.net` - Imgix CDN
2. **产品 ID**: `{product-id}` - 例如 `6a62c76ef0978853a20391b6c32da4fe`
3. **颜色 ID**: `{color-id}` - 例如 `176100`
4. **视图路径**: `/views/alt/`
5. **视图文件名**: `{view}_{size}.png`
   - `view`: `front`, `back`, `left`, `right` 等
   - `size`: `large_extended`, `medium_extended` 等

**Imgix 参数**:
- `dpr=1.2` - 设备像素比
- `auto=format` - 自动格式优化
- `nrs=0` - 图片处理参数
- `w=1000` - 图片宽度

**示例 URL**:
```
https://mms-images-prod.imgix.net/mms/images/catalog/6a62c76ef0978853a20391b6c32da4fe/colors/176100/views/alt/front_large_extended.png?dpr=1.2&auto=format&nrs=0&w=1000
```

### 3. 支持的视图类型

根据分析结果，发现的视图类型包括：

- `front_large_extended.png` - 正面大图
- `front_medium_extended.png` - 正面中图
- `back_medium_extended.png` - 背面中图

**推测的其他视图**:
- `back_large_extended.png` - 背面大图
- `left_large_extended.png` / `left_medium_extended.png` - 左侧视图
- `right_large_extended.png` / `right_medium_extended.png` - 右侧视图
- 其他尺寸变体

### 4. 颜色变化机制

**机制**: 每种颜色都有独立的颜色 ID，对应不同的图片路径。

**示例**:
- 颜色 ID `176100` 对应的图片路径中包含 `/colors/176100/`
- 切换颜色时，URL 中的颜色 ID 部分会改变

### 5. 页面元素分析

**Canvas 元素**: 0 个
- Custom Ink 不使用 Canvas 渲染产品预览
- 直接使用 `<img>` 标签显示图片

**图片元素**: 6 个相关图片
- 所有图片都来自 `mms-images-prod.imgix.net`
- 使用 `ndx-Product-photo` 类名

**网络请求**:
- 图片请求: 48 个
- API 请求: 64 个
- 说明页面会加载多个尺寸的图片

## 爬取可行性分析

### ✅ 可以爬取

**优势**:
1. URL 结构规范，易于生成
2. 图片直接存储在 CDN，无需认证
3. 可以移除 URL 参数获取原始高质量图片
4. 支持批量下载

**策略**:
1. 提取所有产品的产品 ID
2. 提取每个产品的所有颜色 ID
3. 为每个颜色 ID 生成所有视图的 URL
4. 下载所有图片

## 爬取 URL 生成规则

### 基础模板

```
https://mms-images-prod.imgix.net/mms/images/catalog/{product-id}/colors/{color-id}/views/alt/{view}_{size}.png
```

### 需要提取的信息

1. **产品 ID** (`product-id`):
   - 从产品页面或 API 获取
   - 例如: `6a62c76ef0978853a20391b6c32da4fe`

2. **颜色 ID** (`color-id`):
   - 从产品变体信息中获取
   - 例如: `176100`

3. **视图类型** (`view`):
   - `front`, `back`, `left`, `right`
   - 可能还有其他视图

4. **尺寸** (`size`):
   - `large_extended`, `medium_extended`
   - 可能还有其他尺寸

### 高质量图片 URL

移除 Imgix 参数可获取原始高质量图片：

```
# 带参数（当前使用）
https://mms-images-prod.imgix.net/mms/images/catalog/.../front_large_extended.png?dpr=1.2&auto=format&nrs=0&w=1000

# 原始高质量（推荐用于爬取）
https://mms-images-prod.imgix.net/mms/images/catalog/.../front_large_extended.png
```

或者使用高质量参数：

```
https://mms-images-prod.imgix.net/mms/images/catalog/.../front_large_extended.png?w=2000&q=100
```

## 下一步行动

1. ✅ **分析完成** - 确认使用预渲染图片
2. ⏭️ **提取产品列表** - 获取所有产品 ID 和颜色 ID
3. ⏭️ **创建爬虫脚本** - 根据 URL 模式生成所有图片 URL
4. ⏭️ **批量下载图片** - 下载所有产品的所有颜色和视图组合

## 参考信息

- **分析结果文件**: `docs/customink-analysis/preview-analysis-result.json`
- **页面截图**: `docs/customink-analysis/customink-preview-full-page.png`
- **Imgix CDN**: https://imgix.com/ (图片 CDN 服务)

## 结论

Custom Ink 使用预渲染的不同颜色和视图的图片来实现产品预览功能。这种方式：

- ✅ **优点**: 图片质量高、加载速度快、实现简单
- ✅ **可爬取**: URL 结构规范，易于批量下载
- ✅ **可复制**: 可以类似地实现到我们的系统中
