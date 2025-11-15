# Design Lab 重构计划 - Custom Ink 风格

**创建日期**: 2025-11-05  
**目标**: 将现有 Design Lab 改造成 Custom Ink 风格的布局和设计

---

## 🎯 改造目标

### 布局变更
- **当前**: 4区域布局（Rail + Tools Panel + Canvas + Inspector）
- **目标**: 5区域布局（Header + Dark Rail + Canvas + Light Sidebar + Bottom Bar）

### 关键改造点

1. **深灰色 Rail** - 背景色改为 #2C2C2C
2. **移除工具面板** - 工具功能集成到中央引导面板
3. **中央引导面板** - 添加"What's next for you?"白色卡片
4. **浅灰色背景** - 画布区域背景改为 #F5F5F5
5. **右侧视图面板** - 简化为 Front/Back/Sleeve/Zoom
6. **底部操作栏** - 产品信息 + 主要操作按钮

---

## 📋 实施步骤

### Phase 1: HTML 结构重构

#### 1.1 布局结构改变
```html
<!-- 旧结构 -->
<div class="lab__grid"> <!-- 4列: Rail + Tools + Canvas + Inspector -->
  
<!-- 新结构 -->
<div class="lab__grid"> <!-- 5区域: Header + Dark Rail + Canvas + Light Sidebar + Bottom Bar -->
```

#### 1.2 Rail 改造
- 背景色改为深灰色 #2C2C2C
- 文字颜色改为白色
- 添加工具：Product Colors, Add Names
- 图标保持 SVG

#### 1.3 移除工具面板
- 删除 `.lab__tools` 整个元素
- 工具功能迁移到引导面板

#### 1.4 添加引导面板
```html
<div class="guide-panel">
  <h3>What's next for you?</h3>
  <div class="guide-actions">
    <button>Upload</button>
    <button>Add Text</button>
    <button>Add Art</button>
    <button>Change Products</button>
  </div>
  <p class="guide-hint">
    <svg>...</svg> Drag & drop a file anywhere to upload
  </p>
</div>
```

#### 1.5 右侧面板改造
- 改为浅灰色背景
- 只保留 Front/Back/Sleeve/Zoom
- 移除详细产品信息

#### 1.6 添加底部操作栏
```html
<div class="bottom-bar">
  <div class="bottom-bar__left">
    <button>Add Products</button>
    <div class="product-info">...</div>
  </div>
  <div class="bottom-bar__right">
    <button>Save | Share</button>
    <button class="btn-primary">Get Price</button>
  </div>
</div>
```

### Phase 2: CSS 样式改造

#### 2.1 Grid 布局更新
```css
.lab__grid {
  display: grid;
  grid-template-rows: auto 1fr auto; /* Header + Canvas + Bottom Bar */
  grid-template-columns: 80px 1fr 120px; /* Rail + Canvas + Sidebar */
  height: 100vh;
  gap: 0;
}
```

#### 2.2 Rail 样式
```css
.lab__rail {
  background: #2C2C2C;
  color: white;
  grid-row: 2;
}

.rail__btn {
  color: rgba(255, 255, 255, 0.7);
}

.rail__btn:hover,
.rail__btn.is-active {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}
```

#### 2.3 画布区域样式
```css
.lab__stage {
  background: #F5F5F5;
  grid-row: 2;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

#### 2.4 引导面板样式
```css
.guide-panel {
  position: absolute;
  left: 100px;
  top: 50%;
  transform: translateY(-50%);
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 10;
}
```

#### 2.5 右侧面板样式
```css
.lab__sidebar {
  background: #F5F5F5;
  grid-row: 2;
  padding: 20px;
  border-left: 1px solid #E5E5E5;
}
```

#### 2.6 底部操作栏样式
```css
.bottom-bar {
  grid-column: 1 / -1;
  background: white;
  border-top: 1px solid #E5E5E5;
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
```

---

## ✅ 实施检查清单

### HTML 结构
- [ ] 更新 Grid 布局为 5 区域
- [ ] Rail 添加 Product Colors 和 Add Names
- [ ] 移除工具面板（`.lab__tools`）
- [ ] 添加引导面板（`.guide-panel`）
- [ ] 改造右侧面板为视图切换
- [ ] 添加底部操作栏

### CSS 样式
- [ ] Rail 深灰色背景
- [ ] 画布浅灰色背景
- [ ] 引导面板白色卡片样式
- [ ] 右侧面板浅灰色样式
- [ ] 底部操作栏样式
- [ ] 响应式调整

### JavaScript 功能
- [ ] 引导面板按钮功能
- [ ] 拖拽上传功能增强
- [ ] 视图切换功能
- [ ] 产品切换功能

---

## 🎨 颜色规范

- **Rail 背景**: #2C2C2C
- **画布背景**: #F5F5F5
- **侧边栏背景**: #F5F5F5
- **引导面板**: 白色 (#FFFFFF)
- **按钮主色**: #0066CC (蓝色)
- **文字颜色**: #333333
- **边框颜色**: #E5E5E5

---

**最后更新**: 2025-11-05
