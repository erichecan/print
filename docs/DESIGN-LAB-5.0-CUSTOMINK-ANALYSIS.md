# Design Lab 5.0: Custom Ink 实现分析

**分析时间**: 2025-12-20 02:05:00  
**来源**: https://www.customink.com/ndx/?SK=176100&PK=176100#/

---

## 一、Canvas 容器结构分析

### 1.1 HTML 结构

```html
<div class="ndx-App-canvasContainer">  <!-- 外层容器 -->
  <div class="ndx-CanvasContainer" id="canvas-container">  <!-- 内层容器 -->
    <div class="ndx-Canvas"></div>
    <span>  <!-- 产品图片容器 -->
      <img class="ndx-Product-photo" />
      <img class="watch-overlay" />
    </span>
  </div>
</div>
```

### 1.2 CSS 样式分析

#### `.ndx-App-canvasContainer`（外层容器）

```css
display: flex;
position: static;
width: 1475.1px;
height: 1149px;
overflow: visible;
flex-direction: row;
align-items: normal;
justify-content: normal;
padding: 0px;
margin: 0px;
```

**关键点**:
- 使用 `display: flex`
- 固定宽高（1475.1px × 1149px）
- `overflow: visible`

#### `.ndx-CanvasContainer`（内层容器）

```css
display: flex;
position: relative;
width: 1475.1px;
height: 1149px;
overflow: visible;
flex-direction: column;  /* 注意：这里是 column */
align-items: normal;
justify-content: normal;
padding: 0px;
margin: 0px;
```

**关键点**:
- 使用 `display: flex`，`flex-direction: column`
- `position: relative`（用于绝对定位的子元素）
- 固定宽高，与外层容器相同

#### `.ndx-Product-photo`（产品图片）

```css
display: block;
position: absolute;  /* 绝对定位 */
width: 980.648px;
height: 1149px;
object-fit: fill;  /* 注意：使用 fill，而不是 contain 或 cover */
object-position: 50% 50%;
```

**关键点**:
- `position: absolute`：绝对定位，相对于父容器（`.ndx-CanvasContainer`）
- `object-fit: fill`：拉伸填满容器，可能会变形
- `object-position: 50% 50%`：居中显示
- 宽度：980.648px（小于容器宽度 1475.1px）
- 高度：1149px（等于容器高度）

---

## 二、我们的实现策略

### 2.1 与 Custom Ink 的差异

**Custom Ink 使用**:
- `object-fit: fill`（可能会变形）
- 固定尺寸容器

**我们使用**:
- `object-fit: contain`（保持比例，完整显示）
- 自适应容器（使用 Grid 的 1fr）

### 2.2 实现方案

```css
.dl-canvas {
  /* Grid 列，自适应宽度 */
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;  /* 避免滚动条 */
}

.dl-canvas__product-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dl-canvas__product-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;  /* 完整显示，不裁剪 */
  object-position: center;  /* 居中 */
}
```

---

## 三、关键发现

1. **Custom Ink 使用绝对定位**: 图片使用 `position: absolute`，相对于相对定位的父容器
2. **Custom Ink 使用 fill 模式**: `object-fit: fill`，可能会变形，但能完全填满
3. **Custom Ink 固定尺寸**: 容器使用固定宽高，而不是自适应
4. **Custom Ink 简单的 HTML 结构**: 没有复杂的 Fabric.js canvas 嵌套

---

## 四、我们的简化实现

1. **使用绝对定位**: 图片相对于容器绝对定位
2. **使用 contain 模式**: `object-fit: contain`，保持比例，完整显示
3. **使用自适应容器**: 容器使用 Grid 的 1fr，自适应可用空间
4. **简单的 HTML 结构**: 直接使用 `<img>` 标签，不使用 Fabric.js（阶段 2）

---

**下一步**: 实施简化的实现方案
