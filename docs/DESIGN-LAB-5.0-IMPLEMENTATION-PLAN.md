# Design Lab 5.0 实施计划

**创建时间**: 2025-12-20 02:10:00  
**状态**: 📋 准备实施

---

## 一、实施策略

### 1.1 基于现有代码简化

**方法**: 
- 保留现有的 CSS 文件（`design-lab.css`），确保 UI 一致
- 简化 `DesignLabClient.tsx`，移除所有功能代码
- 只保留布局和商品图片显示的代码

### 1.2 文件修改策略

1. **保留文件**:
   - `design-lab.css` - 样式文件（可能需要小幅调整）
   - `customink-images.ts` - 图片 URL 生成工具

2. **简化文件**:
   - `DesignLabClient.tsx` - 移除所有功能代码，只保留：
     - 布局结构（4 列 3 行）
     - 商品图片显示（简单的 `<img>` 标签）

3. **移除/注释**:
   - 所有 Fabric.js 相关代码
   - 所有编辑功能（上传、文字、素材）
   - 所有业务逻辑

---

## 二、Custom Ink 实现关键点

### 2.1 容器结构

```
.ndx-App-canvasContainer (flex, 固定宽高)
  └─ .ndx-CanvasContainer (flex, flex-direction: column, position: relative)
      └─ .ndx-Canvas (flex, flex-direction: row)
          └─ [Fabric.js canvas 或其他内容]
      └─ <span> (产品图片容器)
          └─ <img class="ndx-Product-photo" /> (position: absolute)
```

### 2.2 关键 CSS

```css
.ndx-CanvasContainer {
  display: flex;
  flex-direction: column;
  position: relative;
  width: 100%;
  height: 100%;
}

.ndx-Product-photo {
  position: absolute;
  width: 100%;
  height: 100%;
  object-fit: fill;  /* 我们改为 contain */
  object-position: 50% 50%;
}
```

### 2.3 我们的实现

```css
.dl-canvas {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.dl-canvas__product-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.dl-canvas__product-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;  /* 完整显示 */
  object-position: center;
}
```

---

## 三、实施步骤

### 步骤 1: 简化 DesignLabClient.tsx

1. 移除所有 useState（除了必要的 view 和 productInfo）
2. 移除所有 useRef（除了简单的引用）
3. 移除所有 useEffect（除了加载产品图片 URL）
4. 移除所有 Fabric.js 相关代码
5. 移除所有编辑功能代码
6. 保留布局 JSX 结构
7. 添加简单的 `<img>` 标签显示商品图片

### 步骤 2: 调整 CSS

1. 确保 `.dl-canvas` 使用 flex 居中
2. 确保 `.dl-canvas__product` 容器正确
3. 添加 `.dl-canvas__product-image` 样式（绝对定位，contain 模式）

### 步骤 3: 验证

1. 检查布局是否与 4.0 一致
2. 检查商品图片是否正确显示
3. 检查图片是否居中
4. 检查是否没有滚动条

---

## 四、代码示例

### 4.1 简化的 DesignLabClient.tsx 结构

```tsx
'use client';

import React, { useState } from 'react';
import { getDefaultProductBaseImages } from '@/lib/customink-images';
import './design-lab.css';

const DesignLabClient: React.FC = () => {
  const [currentView, setCurrentView] = useState<'front' | 'back' | 'sleeve'>('front');
  const [productInfo] = useState({
    color: 'White',
    baseImages: getDefaultProductBaseImages('White'),
  });

  return (
    <div className="design-lab-new">
      {/* Header */}
      <div className="dl-header">...</div>
      
      {/* Rail */}
      <div className="dl-rail">...</div>
      
      {/* ToolPanel */}
      <div className="dl-tool-panel">...</div>
      
      {/* Canvas */}
      <section className="dl-canvas">
        <div className="dl-canvas__preview">
          <div className="dl-canvas__product">
            <img
              src={productInfo.baseImages[currentView]}
              alt={`Product ${currentView} view`}
              className="dl-canvas__product-image"
            />
          </div>
        </div>
      </section>
      
      {/* Sidebar */}
      <div className="dl-sidebar">...</div>
      
      {/* BottomBar */}
      <div className="dl-bottom-bar">...</div>
    </div>
  );
};

export default DesignLabClient;
```

---

**下一步**: 开始实施简化版本
