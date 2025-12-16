# Design Lab 4.0 阶段2：简单 HTML 图片显示修复

**修复时间**: 2025-12-20 01:55:00  
**状态**: ✅ 已完成

---

## 一、问题分析

### 1.1 用户反馈的问题

1. **第一屏看不到商品图片**：Canvas 区域（绿色边框内）显示为空白
2. **滚动后看到加载失败占位符**：红色边框内显示错误图标
3. **图片不够大**：无法铺满绿色边框区域

### 1.2 根本原因

- 之前使用 Fabric.js 加载图片，但图片未正确显示
- 图片尺寸太小（w=2000），无法铺满高分辨率显示区域
- 过度依赖 Fabric.js 的逻辑定位，而不是简单的 HTML/CSS

---

## 二、修复方案

### 2.1 核心思路

**用户要求**：
- 不要考虑 Fabric.js 的逻辑定位
- 使用简单的 HTML/CSS 定位
- 商品图片在绿色边框区域中心显示
- 居中对齐，铺满绿色边框区域

**实现方式**：
1. **增大图片尺寸**：从 `w=2000` 改为 `w=4000`
2. **添加简单的 HTML `<img>` 标签**：不使用 Fabric.js 加载
3. **使用 CSS `object-fit: cover`**：铺满容器并居中

---

## 三、具体修改

### 3.1 增大图片尺寸

**文件**: `apps/web/src/lib/customink-images.ts`

**修改**:
```typescript
// 修改前
return `${baseUrl}?w=2000&q=100`;

// 修改后
// [2025-12-20 01:50:00] 阶段2修复：增大图片尺寸，确保能够铺满绿色边框区域
// 使用 w=4000 获取更大的图片，以确保在高分辨率显示时也能铺满
return `${baseUrl}?w=4000&q=100`;
```

### 3.2 添加简单的 HTML `<img>` 标签

**文件**: `apps/web/src/app/design-lab/DesignLabClient.tsx`

**修改**: 在 `.dl-canvas__product` 容器内添加 `<img>` 标签

```tsx
<div className="dl-canvas__product">
  {/* [2025-12-20 01:55:00] 阶段2修复：使用简单的 HTML <img> 标签显示商品图片 */}
  {/* 不使用 Fabric.js 逻辑定位，使用简单的 HTML/CSS 居中铺满 */}
  {(() => {
    // [2025-12-20 01:56:00] 处理 zoom 视图：使用 front 视图的图片
    const viewForImage = currentView === 'zoom' ? 'front' : currentView;
    const imageUrl = productInfo?.baseImages?.[viewForImage];
    return imageUrl ? (
      <img
        src={imageUrl}
        alt={`Product ${viewForImage} view`}
        className="dl-canvas__product-image"
      />
    ) : null;
  })()}
  {/* Fabric.js canvas 保持不变，用于后续的编辑功能 */}
  {!canvasInitError && (
    <canvas ref={canvasRef} className="dl-canvas__fabric" />
  )}
</div>
```

### 3.3 添加 CSS 样式

**文件**: `apps/web/src/app/design-lab/design-lab.css`

**新增样式**:
```css
/* [2025-12-20 01:55:00] 阶段2修复：简单的 HTML 图片标签样式 - 铺满绿色边框区域 */
.dl-canvas__product-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover; /* 铺满容器，允许裁剪 */
  object-position: center; /* 居中显示 */
  z-index: 0; /* 在 Fabric.js canvas 下方 */
}
```

**说明**:
- `position: absolute` + `top: 0; left: 0` + `width: 100%; height: 100%`：图片填满 `.dl-canvas__product` 容器（即绿色边框区域）
- `object-fit: cover`：铺满容器，如果图片比例与容器不一致，会裁剪边缘
- `object-position: center`：图片居中显示
- `z-index: 0`：图片在 Fabric.js canvas 下方，这样后续添加的编辑对象（文字、图片等）会显示在商品图片上方

---

## 四、技术细节

### 4.1 图片 URL 获取

- 从 `productInfo.baseImages[currentView]` 获取图片 URL
- 如果 `currentView` 是 `'zoom'`，则使用 `'front'` 视图的图片
- 图片 URL 现在包含 `w=4000` 参数，确保高分辨率显示

### 4.2 视图处理

- `front` / `back` / `sleeve`：直接使用对应视图的图片
- `zoom`：使用 `front` 视图的图片（因为 baseImages 中没有 zoom 视图）

### 4.3 图片加载

- 使用原生 HTML `<img>` 标签，浏览器会自动处理图片加载
- 如果图片加载失败，浏览器会显示默认的错误图标（可以后续添加错误处理）

---

## 五、预期效果

修复后应该：

1. ✅ **第一屏能看到商品图片**：图片在绿色边框区域内显示
2. ✅ **图片居中显示**：使用 CSS `object-position: center`
3. ✅ **图片铺满绿色边框区域**：使用 `object-fit: cover` 和 `width: 100%; height: 100%`
4. ✅ **图片足够大**：使用 `w=4000` 参数，确保高分辨率显示也能铺满
5. ✅ **不依赖 Fabric.js**：使用简单的 HTML/CSS，不涉及 Fabric.js 的逻辑定位

---

## 六、验证步骤

1. 刷新页面（`http://localhost:3000/design-lab`）
2. 检查第一屏是否能看到商品图片
3. 检查图片是否在绿色边框区域中心显示
4. 检查图片是否铺满绿色边框区域
5. 检查滚动后是否仍然显示图片（而不是错误占位符）

---

**修复状态**: ✅ 已完成  
**下一步**: 验证图片是否正确显示
