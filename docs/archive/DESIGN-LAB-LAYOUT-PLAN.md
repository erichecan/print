# Design Lab 界面布局优化计划
**日期**: 2025-11-01  
**策略**: 渐进式改进 (保留现有结构，逐步优化)

---

## 🎯 **优化目标**

将 Design Lab 界面布局提升至与 Custom Ink 的设计标准，侧重：
1. 视觉效果
2. 信息组织
3. 空间利用
4. 用户流程
5. 专业性

---

## 📐 **当前 vs 目标布局**

### **当前 Grid** (64px + 300px + 1fr + 360px)
```
┌────┬──────┬──────────┬───────┐
│ Rail│Tools│  Canvas  │Inspect│
│ 64  │ 300 │   1fr    │  360  │
└────┴──────┴──────────┴───────┘
```

### **目标 Grid** (80px + 320px + 1fr + 380px)
```
┌─────┬──────┬───────────┬─────────┐
│ Rail │Tools│  Canvas   │Inspector│
│  80  │ 320 │    1fr    │   380   │
└─────┴──────┴───────────┴─────────┘
```

**改进**:
- 增加 Rail 宽度（容纳图标+文字）
- 增加 Tools 宽度（更好的空间）
- 增加 Inspector 宽度（更大预览区）
- 改进间距和视觉层次

---

## 🔧 **具体改进项**

### **Phase 1: Rail 优化** ⚡ **立即**

#### **问题**
- 仅文字无图标
- 宽度不足
- 视觉层次弱

#### **解决方案**
```html
<nav class="lab__rail">
    <button class="rail__btn is-active" data-tool="upload" title="Upload">
        <span class="rail__icon">⬆️</span>
        <span class="rail__label">Upload</span>
    </button>
    <!-- 其他按钮类似 -->
</nav>
```

**CSS 修改**:
```css
.lab__grid { 
    grid-template-columns: 80px 320px 1fr 380px; 
    gap: 20px; 
}

.lab__rail { 
    width: 80px; 
    padding: 12px 6px; 
}

.rail__btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 10px;
    width: 100%;
}

.rail__icon {
    font-size: 24px;
}

.rail__label {
    font-size: 11px;
    font-weight: 600;
}
```

---

### **Phase 2: Tools Panel 重构** ⚡ **立即**

#### **问题**
- 所有工具同时显示
- 无 Tab 切换
- 面板拥挤

#### **解决方案**
改为 Tabs 布局，只显示活跃工具的面板

```html
<aside class="lab__tools">
    <!-- Tab 导航 -->
    <div class="tools__tabs">
        <button class="tab-btn active" data-panel="upload">
            <span>📤</span> Upload
        </button>
        <button class="tab-btn" data-panel="text">
            <span>📝</span> Text
        </button>
        <button class="tab-btn" data-panel="edit">
            <span>✏️</span> Edit
        </button>
    </div>
    
    <!-- 面板内容 -->
    <div class="tools__content">
        <div class="panel active" id="upload-panel">...</div>
        <div class="panel" id="text-panel">...</div>
        <div class="panel" id="edit-panel">...</div>
    </div>
</aside>
```

**CSS 修改**:
```css
.lab__tools {
    padding: 0;
    gap: 0;
}

.tools__tabs {
    display: flex;
    border-bottom: 1px solid var(--color-border);
    padding: 0 12px;
}

.tab-btn {
    flex: 1;
    padding: 12px 8px;
    border: none;
    border-bottom: 2px solid transparent;
    background: none;
    cursor: pointer;
    font-weight: 600;
    font-size: 13px;
}

.tab-btn.active {
    border-bottom-color: var(--color-primary);
    color: var(--color-primary);
}

.tools__content {
    padding: 16px;
}

.panel {
    display: none;
}

.panel.active {
    display: grid;
    gap: 12px;
}
```

---

### **Phase 3: Canvas Stage 增强** ⚡ **立即**

#### **问题**
- Stage header 缺失
- 工具栏布局一般
- 缺少打印区域指示

#### **解决方案**
```html
<section class="lab__stage">
    <!-- Header -->
    <header class="stage__header">
        <h2 class="stage__title">Design Preview</h2>
        <div class="stage__actions">
            <button class="action-btn" title="Undo">↶</button>
            <button class="action-btn" title="Redo">↷</button>
        </div>
    </header>
    
    <!-- View Tabs -->
    <nav class="stage__views">
        <button class="view-btn active" data-view="front">Front</button>
        <button class="view-btn" data-view="back">Back</button>
    </nav>
    
    <!-- Canvas -->
    <div class="stage">
        <img class="garment" ...>
        <div class="art-layer">...</div>
        <div class="print-area-indicator"></div>
    </div>
    
    <!-- Product Bar -->
    <div class="product-toolbar">...</div>
    
    <!-- Thumbnails -->
    <ul class="thumbs">...</ul>
</section>
```

**CSS 修改**:
```css
.stage__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 4px 12px;
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 12px;
}

.stage__title {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
}

.stage__actions {
    display: flex;
    gap: 4px;
}

.action-btn {
    padding: 6px 10px;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: #fff;
    cursor: pointer;
}

.stage__views {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
}

.view-btn {
    flex: 1;
    padding: 8px;
    border: 1px solid var(--color-border);
    background: #fff;
}

.view-btn.active {
    background: var(--color-primary);
    color: #fff;
}

.print-area-indicator {
    position: absolute;
    inset: 10%;
    border: 2px dashed rgba(255, 31, 61, 0.3);
    pointer-events: none;
}
```

---

### **Phase 4: Inspector Panel 优化** ⚡ **立即**

#### **问题**
- 预览区小（220px）
- 产品卡片不突出
- 视觉层次弱

#### **解决方案**
```html
<aside class="lab__inspector">
    <!-- Product Card -->
    <div class="product-card enhanced">
        <img class="product-img" ...>
        <h3>Product Name</h3>
        <p class="product-meta">Royal • <button>Change</button></p>
    </div>
    
    <!-- Preview -->
    <div class="preview-card enhanced">
        <div class="preview-main">...</div>
        <div class="preview-thumbs">...</div>
    </div>
    
    <!-- Accordions -->
    <div class="accordions">...</div>
</aside>
```

**CSS 修改**:
```css
.product-card.enhanced {
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 16px;
    background: #fff;
}

.product-img {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 8px;
    margin-bottom: 12px;
}

.preview-main {
    height: 280px; /* 从 220px 增加 */
}
```

---

## ✅ **实施优先级**

### **Step 1: Grid & Spacing** (5 min)
- 更新 grid 列宽
- 增加 gap
- 测试布局

### **Step 2: Rail Enhancement** (10 min)
- 添加图标
- 调整按钮样式
- 改进视觉

### **Step 3: Tools Tabs** (15 min)
- 重构为 Tabs
- 添加切换逻辑
- 样式调整

### **Step 4: Stage Header** (10 min)
- 新增 header
- 添加 action 按钮
- 改进 toolbar

### **Step 5: Inspector Polish** (10 min)
- 增强产品卡片
- 增大预览区
- 统一视觉

### **Step 6: Print Area** (10 min)
- 添加指示器
- 样式调整
- 测试交互

### **Step 7: Visual Polish** (15 min)
- 统一颜色
- 优化间距
- 添加阴影
- 统一边框样式

**总时间**: ~75 分钟

---

## 🚀 **现在开始实施**

准备好了吗？我将按照优先级逐步实施这些布局改进。

