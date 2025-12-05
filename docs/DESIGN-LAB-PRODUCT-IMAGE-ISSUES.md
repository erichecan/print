# Design Lab 产品图片问题分析与修复方案

**创建时间**: 2025-01-30 23:55:00  
**问题**: 画布中央的默认商品图片没有显示，以及颜色切换时图片不更新

---

## 问题分析

### 1. 画布中央的默认商品图片没有显示

**原因**：
- `loadBackgroundImage` 函数依赖于 `productInfo` 来获取图片 URL
- 如果 `productInfo` 为空或 `baseImages` 未设置，图片无法加载
- 初始化时虽然有默认产品设置（第 320-345 行），但可能在某些情况下未正确执行

**当前代码逻辑**（`DesignLabClient.tsx` 第 112-205 行）：
```typescript
const loadBackgroundImage = useCallback((view: 'front' | 'back' | 'sleeve' | 'zoom') => {
  if (view === 'zoom') return;
  if (!fabricCanvasRef.current) return;

  // 移除旧背景
  if (backgroundImageRef.current) {
    canvas.remove(backgroundImageRef.current);
    backgroundImageRef.current = null;
  }

  // 获取图片 URL
  let imageUrl: string;
  if (productInfo?.baseImages?.[viewKey]) {
    imageUrl = productInfo.baseImages[viewKey];
  } else if (productInfo?.color) {
    imageUrl = getDefaultProductImageUrl(productInfo.color, viewKey);
  } else {
    imageUrl = `https://picsum.photos/seed/tshirt-${viewKey}/900/700`;
  }
  // ... 加载图片
}, [CANVAS_WIDTH, CANVAS_HEIGHT, productInfo]);
```

**问题点**：
1. `loadBackgroundImage` 的依赖项包含 `productInfo`，但初始化时 `productInfo` 可能还未设置
2. 画布初始化完成后，需要等待 `productInfo` 设置后再加载背景图片

---

### 2. 颜色切换时图片不更新

**当前实现**（`DesignLabClient.tsx` 第 507-578 行）：
- `handleColorSelect` 函数会更新 `productInfo.color` 或重新加载产品信息
- 如果找到新的变体 ID，会调用 `loadProductInfo(targetVariantId)`
- 如果找不到变体，只更新颜色名称并调用 `loadBackgroundImage(currentView)`

**问题点**：
1. 颜色切换时，`baseImages` 可能没有更新
2. `loadBackgroundImage` 需要依赖更新后的 `productInfo`，但状态更新是异步的

---

## 修复方案

### 方案 1：修复初始化逻辑（推荐）

**问题**：初始化时 `productInfo` 设置后，`loadBackgroundImage` 可能因为依赖项问题未触发

**修复**：
1. 在 `useEffect` 中，当 `productInfo` 设置后，确保调用 `loadBackgroundImage`
2. 添加一个专门的 `useEffect` 监听 `productInfo` 和 `fabricCanvasRef.current` 的变化

```typescript
// [2025-01-30 23:55:00] 当 productInfo 或画布初始化后，加载背景图片
useEffect(() => {
  if (fabricCanvasRef.current && productInfo && currentView !== 'zoom') {
    loadBackgroundImage(currentView);
  }
}, [productInfo, fabricCanvasRef.current, currentView, loadBackgroundImage]);
```

### 方案 2：修复颜色切换逻辑

**问题**：颜色切换时，`baseImages` 没有立即更新

**修复**：
1. 在 `handleColorSelect` 中，更新 `productInfo` 时同时更新 `baseImages`
2. 使用 `getDefaultProductBaseImages` 生成新颜色的图片 URL

```typescript
// [2025-01-30 23:55:00] 修复：颜色切换时立即更新 baseImages
if (!targetVariantId) {
  const newBaseImages = getDefaultProductBaseImages(colorName);
  setProductInfo({
    ...productInfo,
    color: colorName,
    baseImages: newBaseImages, // 立即更新图片 URL
  });
  
  // 重新加载背景图片
  if (fabricCanvasRef.current) {
    loadBackgroundImage(currentView);
  }
}
```

---

## Custom Ink 图片爬取状态

### 当前状态

1. **图片 URL 生成工具**（`apps/web/src/lib/customink-images.ts`）：
   - ✅ 已实现基于 URL 模式的图片生成
   - ✅ 支持 Gildan Softstyle Jersey T-shirt 产品
   - ⚠️ 只支持 6 种颜色：White, Navy, Maroon, Black, Heather Grey, Heather Dark Grey

2. **爬取脚本**：
   - ✅ `scripts/scrape-customink-assets.py` - 支持爬取产品图片（不同颜色）
   - ✅ `scripts/crawl-customink-images-by-url-pattern.js` - 基于 URL 模式的爬取
   - ⚠️ 主要针对 Gildan Softstyle T-shirt 这一个产品

3. **颜色映射**（`customink-images.ts` 第 13-23 行）：
   ```typescript
   export const COLOR_ID_MAP: Record<string, string> = {
     'White': '176100',
     'Navy': '176101',
     'Maroon': '176102',
     'Black': '176103',
     'Heather Grey': '176104',
     'Heather Dark Grey': '176105',
     // ... 其他颜色使用默认映射
   };
   ```

### 缺失的功能

1. **更多产品支持**：
   - 当前只支持 Gildan Softstyle Jersey T-shirt
   - 需要扩展支持其他产品（Hoodie, Sweatshirt 等）

2. **更多颜色支持**：
   - 当前只有 6 种颜色的映射
   - Custom Ink 实际可能有更多颜色（如 Red, Blue, Green 等）

3. **产品-颜色映射数据库**：
   - 当前是硬编码的映射
   - 建议存储在数据库中，支持动态扩展

---

## 实施建议

### 短期修复（立即实施）

1. **修复初始化逻辑**：
   - 添加 `useEffect` 监听 `productInfo` 变化，自动加载背景图片
   - 确保画布初始化完成后立即显示默认产品图片

2. **修复颜色切换逻辑**：
   - 在 `handleColorSelect` 中，立即更新 `baseImages`
   - 确保颜色切换时图片立即更新

### 中期改进（1-2 周）

1. **扩展颜色映射**：
   - 从 Custom Ink 爬取更多颜色的 ID
   - 更新 `COLOR_ID_MAP` 支持更多颜色

2. **产品图片数据库**：
   - 创建产品-颜色-图片 URL 的映射表
   - 支持通过 API 动态获取图片 URL

### 长期优化（1 个月+）

1. **多产品支持**：
   - 扩展 `customink-images.ts` 支持多个产品
   - 根据产品 ID 动态生成图片 URL

2. **图片缓存**：
   - 实现图片预加载和缓存
   - 提升用户体验

---

## 测试验证

### 测试场景

1. **初始化测试**：
   - 打开 Design Lab 页面（无 variantId）
   - 验证画布中央是否显示默认产品图片（白色 T-shirt）

2. **颜色切换测试**：
   - 点击 Product Colors 工具
   - 选择不同颜色（Black, Navy, Maroon 等）
   - 验证画布中央图片是否立即更新

3. **视图切换测试**：
   - 切换 Front/Back/Sleeve 视图
   - 验证每个视图都显示正确的产品图片

---

## 相关文件

- `apps/web/src/app/design-lab/DesignLabClient.tsx` - 主组件
- `apps/web/src/lib/customink-images.ts` - 图片 URL 生成工具
- `apps/web/src/app/design-lab/components/modals/ProductColorsModal.tsx` - 颜色选择模态
- `scripts/scrape-customink-assets.py` - 图片爬取脚本
- `scripts/crawl-customink-images-by-url-pattern.js` - URL 模式爬取脚本

---

**最后更新**: 2025-01-30 23:55:00

