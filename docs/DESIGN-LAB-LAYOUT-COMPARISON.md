# Design Lab 界面布局对比分析
**日期**: 2025-11-01  
**目标**: Custom Ink Design Lab  
**当前**: design-lab.html

---

## 📐 **当前布局结构**

### **Grid 布局** (styles.css line 314)
```
grid-template-columns: 64px 300px 1fr 360px
                       ↑     ↑     ↑    ↑
                       Rail  Tools Canvas Inspector
```

### **现有模块**
1. **左轨 Rail** (64px) - 垂直工具栏
2. **左侧边栏 Tools** (300px) - 工具面板
3. **中央画布 Stage** (1fr) - 预览区域
4. **右侧栏 Inspector** (360px) - 信息面板

---

## 🔍 **Custom Ink Design Lab 典型布局**

基于分析和目标网站标准，Custom Ink 的布局通常包括：

### **标准布局** (Desktop 1920px+)
```
┌─────────────────────────────────────────────────────────────────┐
│  Top Navigation Bar (Header)                                    │
├────┬─────────┬─────────────────────┬───────────────────────────┤
│ 🌐 │ 📦      │    Canvas Stage     │  📊 Info Panel            │
│Rail│ 🎨      │   (Main Preview)    │  - Product Details        │
│64px│ Tools   │                     │  - Size Guide             │
│    │ 280px   │  ┌───────────────┐  │  - Shipping               │
│ 📤 │         │  │   Hoodie      │  │  - Print Areas           │
│ 📝 │         │  │   Preview     │  │  - Additional Views       │
│ 🖼️ │         │  │               │  │                          │
│ 🛍️ │         │  └───────────────┘  │                          │
│    │         │  View: [Front] [Back]│  ┌─────────────┐        │
│    │         │  [Save] [Share] [Price]│ │  Preview    │        │
│    │         │  ──────────────────   │  │  Thumbnails │        │
│    │         │  Product: Hoodie      │  └─────────────┘        │
│    │         │  Royal • [Change]     │  ▾ Size & Fit Guide     │
│    │         │  ──────────────────   │  ▾ Shipping              │
│    │         │  [Add Products] [Price]│  ▾ More Details         │
│    │         │                       │  ▾ Print Areas          │
├────┴─────────┴─────────────────────┴───────────────────────────┤
│ Recommendations: Buy more, save more                           │
└─────────────────────────────────────────────────────────────────┘
```

### **关键布局特征**
- **4 栏布局**: Rail + Tools + Canvas + Inspector
- **Rail**: 极窄垂直工具栏 (60-80px)
- **Tools**: 中宽工具面板 (280-320px)
- **Canvas**: 主画布自适应 (flex-grow)
- **Inspector**: 固定宽信息面板 (320-380px)

---

## ⚠️ **当前布局问题**

### **问题 1: Rail 图标设计**
**当前**: 文字 "Upload", "Text", "Art", "Products"  
**应该**: 图标 + 文字，或仅图标

### **问题 2: Tools Panel 内容组织**
**当前**: 
- Upload section
- Text section  
- Edit section

**问题**: 
- 缺少层级标题
- 工具按钮未分组
- 无图标标识
- 空间利用不足

### **问题 3: Canvas 区域**
**当前**:
- Toolbar 上
- Stage 中
- Product toolbar 下
- Thumbs 侧

**问题**:
- Stage 比例不对（4:5）
- 缺少缩放控制
- 缺少网格/标尺
- 工具栏布局一般

### **问题 4: Inspector Panel**
**当前**: 
- Preview card
- 4 个 accordions

**问题**:
- 预览卡片太小（220px）
- 缺少层级
- 无折叠状态
- 缺少更多预览

### **问题 5: 整体视觉**
**问题**:
- 边框样式不统一
- 间距不一致
- 颜色使用不充分
- 缺少视觉层次
- 无主题区分

---

## 🎯 **具体改进目标**

### **Phase 1: 视觉层次优化** (优先级最高)

#### **1.1 Rail 改进**
```html
<nav class="lab__rail">
    <button class="rail__btn is-active" title="Upload">
        <svg>...</svg> <!-- 图标 -->
        <span>Upload</span> <!-- 文字标签 -->
    </button>
</nav>
```

**修改**:
- [ ] 添加图标（SVG 或 emoji）
- [ ] 优化按钮样式
- [ ] 增加 hover 状态
- [ ] 统一活动态

#### **1.2 Tools Panel 重构**
```html
<aside class="lab__tools">
    <!-- Tab 导航 -->
    <nav class="tools__tabs">
        <button class="tab active" data-panel="upload">Upload</button>
        <button class="tab" data-panel="text">Text</button>
        <button class="tab" data-panel="edit">Edit</button>
    </nav>
    
    <!-- 面板内容 -->
    <div class="tools__panels">
        <div class="panel active" id="upload-panel">...</div>
        <div class="panel" id="text-panel">...</div>
        <div class="panel" id="edit-panel">...</div>
    </div>
</aside>
```

**修改**:
- [ ] 改为 Tabs 切换
- [ ] 仅显示当前工具面板
- [ ] 优化面板布局
- [ ] 添加图标与辅助文字

#### **1.3 Canvas Stage 增强**
```html
<section class="lab__stage">
    <!-- 顶部工具栏 -->
    <header class="stage__header">
        <div class="stage__title">
            <h2>Design Preview</h2>
            <span class="badge">Autosaved</span>
        </div>
        <div class="stage__actions">
            <button>Undo</button>
            <button>Redo</button>
            <button>Reset</button>
        </div>
    </header>
    
    <!-- 视图切换 -->
    <nav class="stage__views">
        <button>Front</button>
        <button>Back</button>
    </nav>
    
    <!-- 主画布 -->
    <div class="stage__canvas">
        <img class="garment" ...>
        <div class="art-layer">...</div>
        <!-- 打印区域指示 -->
        <div class="print-area-indicator"></div>
    </div>
    
    <!-- 底部工具栏 -->
    <div class="stage__toolbar">
        <button>Zoom: 100%</button>
        <button>Grid</button>
        <button>Rulers</button>
    </div>
</section>
```

**修改**:
- [ ] 添加 stage header
- [ ] 重新组织工具栏
- [ ] 增加缩放控制
- [ ] 添加网格/标尺选项
- [ ] 显示打印区域

#### **1.4 Inspector Panel 优化**
```html
<aside class="lab__inspector">
    <!-- 产品信息卡片 -->
    <div class="product-card">
        <img ...>
        <h3>Product Name</h3>
        <p>Color • Size</p>
        <button>Change Product</button>
    </div>
    
    <!-- 预览卡片 -->
    <div class="preview-card enhanced">
        <div class="preview-main">...</div>
        <div class="preview-thumbs">...</div>
    </div>
    
    <!-- 折叠面板 -->
    <div class="accordions">
        <details>...</details>
    </div>
</aside>
```

**修改**:
- [ ] 增强产品卡片
- [ ] 增大预览区域（300px+）
- [ ] 优化 accordion 样式
- [ ] 添加更多预览角度

---

### **Phase 2: 功能性布局** (优先级中)

#### **2.1 图层管理面板**
**需要添加**:
```html
<aside class="lab__layers">
    <header>
        <h3>Layers</h3>
        <button>Add</button>
    </header>
    <ul class="layer-list">
        <li class="layer-item active">
            <span class="layer-icon">T</span>
            <span class="layer-name">Text Layer</span>
            <div class="layer-controls">
                <button>Lock</button>
                <button>Delete</button>
            </div>
        </li>
    </ul>
</aside>
```

**布局调整**: 可能需要将 Tools 或 Inspector 改为可折叠

#### **2.2 高级工具区域**
**需要添加**:
- 对齐工具
- 分布工具
- 锁定/解锁
- 复制/粘贴

---

### **Phase 3: 视觉设计统一** (优先级中)

#### **3.1 颜色方案**
- [ ] Rail: 品牌色背景
- [ ] Tools: 白色背景 + 边框
- [ ] Canvas: 淡灰背景
- [ ] Inspector: 白色背景 + 品牌色强调

#### **3.2 间距系统**
- [ ] 使用统一 spacing tokens
- [ ] 对齐网格系统
- [ ] 优化 padding/margin

#### **3.3 边框与阴影**
- [ ] 统一 border-radius
- [ ] 添加 subtle shadows
- [ ] 区分容器层级

#### **3.4 图标系统**
- [ ] 创建 SVG 图标库
- [ ] 统一图标大小
- [ ] 统一颜色规范

---

## 📏 **具体测量目标**

### **目标尺寸** (Desktop 1920px)
- Rail: 80px (增加 16px 以容纳图标)
- Tools: 320px (增加 20px)
- Canvas: auto (保持 1fr)
- Inspector: 380px (增加 20px)
- Gap: 20px (增加 4px)

### **响应式调整**
- Tablet (< 1180px): Tools 折叠或隐藏
- Mobile (< 800px): Rail + Tools 折叠为抽屉

---

## ✅ **实施检查清单**

### **视觉改进**
- [ ] Rail 添加图标
- [ ] Tools 改为 Tabs
- [ ] Stage header 添加
- [ ] Inspector 增强
- [ ] 颜色方案统一
- [ ] 间距系统应用

### **布局改进**
- [ ] Grid 调整
- [ ] Responsive 优化
- [ ] Z-index 层级
- [ ] Sticky 定位
- [ ] 容器对齐

### **功能性布局**
- [ ] 图层面板 (可选项)
- [ ] 打印区域指示
- [ ] 预览增强
- [ ] 工具栏重组

---

## 🚀 **实施方案**

### **Approach 1: 渐进式优化** ✅ **推荐**
- 保留现有结构
- 逐步改进每个区域
- 先视觉后功能
- 每步可测试

### **Approach 2: 完整重构**
- 重写 HTML 结构
- 重新设计 CSS
- 一次完成
- 时间更长

---

## 📝 **下一步**

1. **确认布局目标** - 与用户确认优先项
2. **设计图标** - 创建 Rail 图标集
3. **重构 Tools** - 改为 Tabs 布局
4. **增强 Canvas** - 添加功能区域
5. **优化 Inspector** - 改进信息组织
6. **测试响应式** - 确保各设备正常

---

**当前状态**: 等待用户确认优先项，准备开始实施

