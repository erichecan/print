# Design Lab Custom Ink 对比清单

**创建时间**: 2025-01-30 23:00:00  
**目标**: 100% 对齐 Custom Ink Design Lab 的布局、样式、交互和功能

---

## 1. 布局结构对比

### 1.1 Header 区域

#### Custom Ink 要求（基于 ELEMENT-INVENTORY.json）

| 元素 | 位置 | 尺寸 | 样式类 | 颜色 |
|------|------|------|--------|------|
| My Designs (element-1) | x: 41, y: 0 | width: 116, height: 32 | `MuiButton-text MuiButton-textBlue MuiButton-sizeSmall` | rgb(74, 74, 74) |
| Untitled design (element-2) | x: 177, y: 0 | width: 139, height: 32 | `MuiButton-text MuiButton-textBlue MuiButton-sizeSmall` | rgba(0, 0, 0, 0.57) |

#### 当前实现状态

- [ ] **My Designs 按钮位置**: 当前使用 Link 组件，需要检查位置是否匹配 (x: 41, y: 0)
- [ ] **My Designs 按钮样式**: 需要应用 `MuiButton-text MuiButton-textBlue MuiButton-sizeSmall` 样式
- [ ] **My Designs 按钮颜色**: 需要设置为 rgb(74, 74, 74)
- [ ] **Untitled design 按钮位置**: 当前使用 contentEditable span，需要检查位置 (x: 177, y: 0)
- [ ] **Untitled design 按钮样式**: 需要应用 `MuiButton-text MuiButton-textBlue MuiButton-sizeSmall` 样式
- [ ] **Untitled design 按钮颜色**: 需要设置为 rgba(0, 0, 0, 0.57)
- [ ] **Header 高度**: 需要确认是否为 64px（--dl-header-height）

**文件位置**:
- JSX: `apps/web/src/app/design-lab/DesignLabClient.tsx` (lines 1100-1130)
- CSS: `apps/web/src/app/design-lab/design-lab.css` (.dl-header)

---

### 1.2 左侧 Rail（深灰色工具栏）

#### Custom Ink 要求（基于 ELEMENT-INVENTORY.json）

| 元素 | 位置 | 尺寸 | 样式类 | 颜色 |
|------|------|------|--------|------|
| Upload (element-8) | x: 16, y: 169 | width: 68, height: 70 | `ndx-MenuButton isActionable ndx-VerticalToolbar-item` | rgb(191, 191, 191) |
| Add Text (element-9) | x: 16, y: 239 | width: 68, height: 70 | `ndx-MenuButton isActionable ndx-VerticalToolbar-item` | rgb(191, 191, 191) |
| Add Art (element-10) | x: 16, y: 309 | width: 68, height: 70 | `ndx-MenuButton isActionable ndx-VerticalToolbar-item` | rgb(191, 191, 191) |
| Product Colors (element-11) | x: 16, y: 379 | width: 68, height: 86 | `ndx-MenuButton isActionable ndx-VerticalToolbar-item` | rgb(191, 191, 191) |
| Add Names (element-12) | x: 16, y: 466 | width: 68, height: 86 | `ndx-MenuButton isActionable ndx-VerticalToolbar-item` | rgb(191, 191, 191) |

**Rail 背景**: rgb(34, 32, 32) - 深灰色 (#222020 或 #2C2C2C)

#### 当前实现状态

- [ ] **Rail 宽度**: 当前设置为 80px (--dl-rail-width)，需要确认是否匹配
- [ ] **Rail 背景色**: 当前设置为 #2C2C2C，需要确认是否与 Custom Ink 的 rgb(34, 32, 32) 一致
- [ ] **Upload 按钮位置**: 需要检查是否匹配 (x: 16, y: 169, width: 68, height: 70)
- [ ] **Upload 按钮颜色**: 当前为 rgba(255, 255, 255, 0.7)，需要改为 rgb(191, 191, 191)
- [ ] **Add Text 按钮位置**: 需要检查是否匹配 (x: 16, y: 239, width: 68, height: 70)
- [ ] **Add Art 按钮位置**: 需要检查是否匹配 (x: 16, y: 309, width: 68, height: 70)
- [ ] **Product Colors 按钮位置**: 需要检查是否匹配 (x: 16, y: 379, width: 68, height: 86)
- [ ] **Add Names 按钮位置**: 需要检查是否匹配 (x: 16, y: 466, width: 68, height: 86)
- [ ] **按钮激活状态**: 当前有 is-active 类，需要确认样式是否匹配 Custom Ink
- [ ] **按钮悬停效果**: 当前有 hover 效果，需要确认是否匹配 Custom Ink

**文件位置**:
- JSX: `apps/web/src/app/design-lab/DesignLabClient.tsx` (lines 1135-1212)
- CSS: `apps/web/src/app/design-lab/design-lab.css` (.dl-rail)

---

### 1.3 工具面板（Tool Panel）

#### Custom Ink 要求

- **宽度**: 430px (--dl-tool-panel-width)
- **背景色**: 白色 (#FFFFFF)
- **位置**: Rail 右侧
- **面板标题**: "What's next for you?" / "Choose File To Upload" / "Add Text" / "Edit Upload" / "Edit Text" / "Edit Art"
- **返回按钮**: 除 Home 面板外，其他面板都应显示返回按钮

#### 当前实现状态

- [ ] **面板宽度**: 当前设置为 430px，需要确认
- [ ] **面板背景色**: 当前设置为 var(--dl-bg-panel) (#FFFFFF)，需要确认
- [ ] **面板标题样式**: 需要检查字体、大小、颜色是否匹配
- [ ] **返回按钮样式**: 需要检查位置、图标、文字是否匹配
- [ ] **面板内边距**: 需要检查是否匹配 Custom Ink

**文件位置**:
- JSX: `apps/web/src/app/design-lab/components/ToolPanel.tsx`
- CSS: `apps/web/src/app/design-lab/design-lab.css` (.dl-tool-panel)

---

### 1.4 中央 Canvas 区域

#### Custom Ink 要求

- **背景色**: #F5F5F5 (浅灰色)
- **产品图片**: 居中显示，占据画布中间约 65% 宽、75% 高的区域
- **引导面板**: "What's next for you?" 面板（如果存在）

#### 当前实现状态

- [ ] **Canvas 背景色**: 需要确认是否为 #F5F5F5
- [ ] **产品图片位置**: 需要确认是否居中，尺寸是否匹配
- [ ] **引导面板位置**: 当前有 showGuidePanel 状态，需要确认位置和样式

**文件位置**:
- JSX: `apps/web/src/app/design-lab/DesignLabClient.tsx` (lines 1255-1331)
- CSS: `apps/web/src/app/design-lab/design-lab.css` (.dl-canvas)

---

### 1.5 右侧 Sidebar（视图切换面板）

#### Custom Ink 要求（基于 ELEMENT-INVENTORY.json）

| 元素 | 位置 | 尺寸 | 样式类 | 颜色 |
|------|------|------|--------|------|
| front (element-13) | x: 1177, y: 145 | width: 64, height: 87 | `ndx-MenuButton isActionable ndx-CanvasToolbar-changeViewButton` | rgb(34, 32, 32) |
| back (element-14) | x: 1177, y: 240 | width: 64, height: 87 | `ndx-MenuButton isActionable ndx-CanvasToolbar-changeViewButton` | rgb(34, 32, 32) |
| Sleeve Design (element-15) | x: 1179, y: 343 | width: 61, height: 38 | `ndx-MenuButton isActionable ndx-CanvasToolbar-printAreaButton` | rgb(34, 32, 32) |
| Zoom (element-16) | x: 1179, y: 392 | width: 61, height: 61 | `ndx-MenuButton isActionable ndx-CanvasToolbar-zoomButton` | rgb(34, 32, 32) |

**Sidebar 宽度**: 120px (--dl-sidebar-width)

#### 当前实现状态

- [ ] **Sidebar 宽度**: 当前设置为 120px，需要确认
- [ ] **Front 按钮位置**: 需要检查是否匹配 (x: 1177, y: 145, width: 64, height: 87)
- [ ] **Back 按钮位置**: 需要检查是否匹配 (x: 1177, y: 240, width: 64, height: 87)
- [ ] **Sleeve Design 按钮位置**: 需要检查是否匹配 (x: 1179, y: 343, width: 61, height: 38)
- [ ] **Zoom 按钮位置**: 需要检查是否匹配 (x: 1179, y: 392, width: 61, height: 61)
- [ ] **按钮颜色**: 需要确认是否为 rgb(34, 32, 32)
- [ ] **按钮激活状态**: 需要确认样式是否匹配

**文件位置**:
- JSX: `apps/web/src/app/design-lab/DesignLabClient.tsx` (lines 1334-1382)
- CSS: `apps/web/src/app/design-lab/design-lab.css` (.dl-sidebar)

---

### 1.6 底部操作栏（Bottom Bar）

#### Custom Ink 要求（基于 ELEMENT-INVENTORY.json）

| 元素 | 位置 | 尺寸 | 样式类 | 颜色 |
|------|------|------|--------|------|
| Add Products (element-3) | x: 16, y: 656 | width: 167, height: 48 | `MuiButton-outlined MuiButton-outlinedBlue MuiButton-sizeLarge` | 背景: rgb(255, 255, 255), 文字: rgb(30, 57, 210) |
| Change Product (element-4) | x: 478, y: 658 | width: 101, height: 18 | `MuiTypography-uiTextSmall MuiLink-underlineAlways` | rgb(30, 57, 210) |
| Change Color (element-5) | x: 357, y: 682 | width: 86, height: 18 | `MuiTypography-inherit MuiLink-underlineAlways` | rgb(30, 57, 210) |
| Save \| Share (element-6) | x: 946, y: 656 | width: 157, height: 48 | `MuiButton-outlined MuiButton-outlinedBlue MuiButton-sizeLarge` | 背景: rgb(255, 255, 255), 文字: rgb(30, 57, 210) |
| Get Price (element-7) | x: 1119, y: 656 | width: 130, height: 48 | `MuiButton-contained MuiButton-containedBlue MuiButton-sizeLarge` | 背景: rgb(30, 57, 210), 文字: rgb(255, 255, 255) |

**Bottom Bar 高度**: 80px (--dl-bottom-bar-height)

#### 当前实现状态

- [ ] **Bottom Bar 高度**: 当前设置为 80px，需要确认
- [ ] **Add Products 按钮位置**: 需要检查是否匹配 (x: 16, y: 656, width: 167, height: 48)
- [ ] **Add Products 按钮样式**: 需要应用 `MuiButton-outlined MuiButton-outlinedBlue` 样式
- [ ] **Change Product 链接位置**: 需要检查是否匹配 (x: 478, y: 658, width: 101, height: 18)
- [ ] **Change Color 链接位置**: 需要检查是否匹配 (x: 357, y: 682, width: 86, height: 18)
- [ ] **Save \| Share 按钮位置**: 需要检查是否匹配 (x: 946, y: 656, width: 157, height: 48)
- [ ] **Save \| Share 按钮样式**: 需要应用 `MuiButton-outlined MuiButton-outlinedBlue` 样式
- [ ] **Get Price 按钮位置**: 需要检查是否匹配 (x: 1119, y: 656, width: 130, height: 48)
- [ ] **Get Price 按钮样式**: 需要应用 `MuiButton-contained MuiButton-containedBlue` 样式（蓝色背景，白色文字）

**文件位置**:
- JSX: `apps/web/src/app/design-lab/DesignLabClient.tsx` (lines 1385-1433)
- CSS: `apps/web/src/app/design-lab/design-lab.css` (.dl-bottom-bar)

---

## 2. 视觉样式对比

### 2.1 颜色方案

#### Custom Ink 颜色要求

| 颜色用途 | Custom Ink 值 | 当前实现 | 状态 |
|---------|--------------|----------|------|
| 主背景色 | #F5F5F5 | var(--dl-bg-primary): #F5F5F5 | ✅ |
| Rail 背景色 | #2C2C2C 或 rgb(34, 32, 32) | var(--dl-bg-rail): #2C2C2C | ⚠️ 需要确认是否一致 |
| 主按钮色 | rgb(30, 57, 210) 或 #0066CC | var(--dl-color-primary): #0066CC | ⚠️ 需要确认是否一致 |
| 文本主色 | #333333 | var(--dl-text-primary): #333333 | ✅ |
| 文本次色 | #666666 | var(--dl-text-secondary): #666666 | ✅ |
| Rail 文本色 | rgb(191, 191, 191) | rgba(255, 255, 255, 0.7) | ❌ 需要改为 rgb(191, 191, 191) |
| 白色文本 | #FFFFFF | var(--dl-text-inverse): #FFFFFF | ✅ |

#### 需要修复的颜色

- [ ] **Rail 背景色**: 确认 #2C2C2C 是否与 rgb(34, 32, 32) 一致，如果不一致需要调整
- [ ] **主按钮色**: 确认 #0066CC 是否与 rgb(30, 57, 210) 一致，如果不一致需要调整
- [ ] **Rail 按钮文本色**: 从 rgba(255, 255, 255, 0.7) 改为 rgb(191, 191, 191)

---

### 2.2 字体

#### Custom Ink 字体要求

- **字体族**: 需要确认 Custom Ink 使用的字体（可能是系统字体或自定义字体）
- **字号**: 
  - 小号: 11px (--dl-font-sm)
  - 基础: 14px (--dl-font-base)
  - 中等: 16px (--dl-font-md)
  - 大号: 18px (--dl-font-lg)
- **字重**: 
  - 正常: 400
  - 中等: 500
  - 粗体: 700

#### 当前实现状态

- [ ] **字体族**: 当前使用系统字体栈，需要确认是否匹配 Custom Ink
- [ ] **字号**: 已定义 CSS 变量，需要确认实际使用是否一致
- [ ] **字重**: 已定义 CSS 变量，需要确认实际使用是否一致

---

### 2.3 间距

#### Custom Ink 间距要求

- **内边距**: 需要从截图和元素清单中提取精确值
- **外边距**: 需要从截图和元素清单中提取精确值
- **元素间距**: 需要从截图和元素清单中提取精确值

#### 当前实现状态

- [ ] **间距变量**: 已定义 --dl-space-1 到 --dl-space-6，需要确认是否匹配 Custom Ink
- [ ] **实际使用**: 需要检查每个组件的间距是否匹配

---

### 2.4 圆角

#### Custom Ink 圆角要求

- **小圆角**: 4px (--dl-radius-sm)
- **中等圆角**: 8px (--dl-radius-md)
- **大圆角**: 12px (--dl-radius-lg)

#### 当前实现状态

- [ ] **圆角变量**: 已定义，需要确认实际使用是否匹配 Custom Ink

---

### 2.5 阴影

#### Custom Ink 阴影要求

- **面板阴影**: 需要从截图中提取
- **按钮阴影**: 需要从截图中提取

#### 当前实现状态

- [ ] **面板阴影**: 当前有 box-shadow，需要确认是否匹配
- [ ] **按钮阴影**: 需要确认是否有阴影，以及样式是否匹配

---

## 3. 交互行为对比

### 3.1 按钮交互

#### Custom Ink 要求

- **悬停效果**: 背景色变化、图标变化
- **点击效果**: 按下状态
- **激活状态**: 选中工具的高亮样式（可能是蓝色高亮或白色高亮）
- **禁用状态**: 灰色样式

#### 当前实现状态

- [ ] **Rail 按钮悬停**: 当前有 hover 效果，需要确认是否匹配 Custom Ink
- [ ] **Rail 按钮激活**: 当前有 is-active 类，需要确认样式是否匹配
- [ ] **底部按钮悬停**: 需要确认是否有悬停效果
- [ ] **底部按钮点击**: 需要确认是否有按下状态
- [ ] **Sidebar 按钮悬停**: 需要确认是否有悬停效果
- [ ] **Sidebar 按钮激活**: 需要确认激活状态样式

---

### 3.2 面板切换动画

#### Custom Ink 要求

- **面板打开/关闭**: 可能有淡入淡出或滑动动画
- **模态框打开/关闭**: 可能有淡入淡出或缩放动画
- **过渡效果**: 需要确认时长和缓动函数

#### 当前实现状态

- [ ] **面板切换动画**: 当前可能没有动画，需要添加
- [ ] **模态框动画**: 需要确认是否有动画
- [ ] **过渡时长**: 当前设置为 0.2s，需要确认是否匹配

---

### 3.3 Canvas 交互

#### Custom Ink 要求

- **拖拽上传**: 支持拖拽文件到 Canvas 区域上传
- **元素选择**: 点击元素选中
- **元素拖拽**: 拖拽元素移动位置
- **元素缩放**: 拖拽控制点缩放
- **元素旋转**: 拖拽旋转控制点旋转

#### 当前实现状态

- [ ] **拖拽上传**: 需要确认是否实现
- [ ] **元素选择**: 使用 Fabric.js，需要确认交互是否匹配
- [ ] **元素拖拽**: 使用 Fabric.js，需要确认交互是否匹配
- [ ] **元素缩放**: 使用 Fabric.js，需要确认控制点样式是否匹配
- [ ] **元素旋转**: 使用 Fabric.js，需要确认控制点样式是否匹配

---

## 4. 功能流程对比

### 4.1 Upload 流程

#### Custom Ink 流程

1. 点击 Rail 中的 "Upload" 按钮
2. 打开 "Choose File To Upload" 面板
3. 点击 "Browse" 按钮或拖拽文件上传
4. 文件上传后，在 Canvas 上显示图片
5. 自动切换到 "Edit Upload" 面板

#### 当前实现状态

- [ ] **点击 Upload**: 当前实现 handleToolClick('upload')
- [ ] **打开面板**: 当前切换到 'upload' 面板类型
- [ ] **Browse 按钮**: 当前有 Browse 按钮
- [ ] **拖拽上传**: 需要确认是否实现
- [ ] **上传后显示**: 当前有 handleFileUpload 函数
- [ ] **自动切换**: 当前有自动切换到 'edit-upload' 的逻辑

**文件位置**:
- Upload Panel: `apps/web/src/app/design-lab/components/panels/UploadPanel.tsx`
- Edit Upload Panel: `apps/web/src/app/design-lab/components/panels/EditUploadPanel.tsx`

---

### 4.2 Text 流程

#### Custom Ink 流程

1. 点击 Rail 中的 "Add Text" 按钮
2. 打开 "Add Text" 面板
3. 在输入框中输入文本
4. 点击 "Add To Design" 按钮
5. 在 Canvas 上创建文本对象
6. 自动切换到 "Edit Text" 面板

#### 当前实现状态

- [ ] **点击 Add Text**: 当前实现 handleToolClick('text')
- [ ] **打开面板**: 当前切换到 'text' 面板类型
- [ ] **输入框**: 当前有 textarea 输入框
- [ ] **Add To Design 按钮**: 当前有按钮
- [ ] **创建文本**: 当前有 handleAddText 函数
- [ ] **自动切换**: 当前有自动切换到 'edit-text' 的逻辑

**文件位置**:
- Text Panel: `apps/web/src/app/design-lab/components/panels/TextPanel.tsx`
- Edit Text Panel: `apps/web/src/app/design-lab/components/panels/EditTextPanel.tsx`

---

### 4.3 Art 流程

#### Custom Ink 流程

1. 点击 Rail 中的 "Add Art" 按钮
2. 打开 "Artwork Categories" 面板
3. 选择类别（如 Emojis、Shapes & Symbols 等）
4. 选择具体的 Art
5. 在 Canvas 上创建 Art 对象
6. 自动切换到 "Edit Art" 面板

#### 当前实现状态

- [ ] **点击 Add Art**: 当前实现 handleToolClick('art')
- [ ] **打开面板**: 当前切换到 'art' 面板类型
- [ ] **类别浏览**: 需要确认是否实现大类网格 UI
- [ ] **选择 Art**: 当前有 handleAddArt 函数
- [ ] **自动切换**: 当前有自动切换到 'edit-art' 的逻辑

**文件位置**:
- Art Panel: `apps/web/src/app/design-lab/components/panels/ArtPanel.tsx`
- Edit Art Panel: `apps/web/src/app/design-lab/components/panels/EditArtPanel.tsx`

---

### 4.4 Product Colors 流程

#### Custom Ink 流程

1. 点击 Rail 中的 "Product Colors" 按钮
2. 打开 "Choose Your Product Color" 模态
3. 显示颜色色板矩阵
4. 选择颜色
5. 更新产品图片和底部 Product pill 信息

#### 当前实现状态

- [ ] **点击 Product Colors**: 当前实现 handleToolClick('colors')
- [ ] **打开模态**: 当前有 ProductColorsModal 组件
- [ ] **颜色色板**: 需要确认 UI 是否匹配 Custom Ink
- [ ] **选择颜色**: 当前有 handleColorSelect 函数
- [ ] **更新产品**: 需要确认是否更新产品图片

**文件位置**:
- Product Colors Modal: `apps/web/src/app/design-lab/components/modals/ProductColorsModal.tsx`

---

### 4.5 Names & Numbers 流程

#### Custom Ink 流程

1. 点击 Rail 中的 "Add Names" 按钮
2. 打开 "Names and Numbers" 模态
3. 第一步：介绍页 + CTA（Add Names and Numbers）
4. 第二步：Tools 页（Add Names / Add Numbers 勾选 + Side/Height/Color 下拉）
5. 第三步：Enter Names/Numbers 列表页
6. 将列表映射到 Canvas 上多个文本对象

#### 当前实现状态

- [ ] **点击 Add Names**: 当前实现 handleToolClick('names')
- [ ] **打开模态**: 当前有 NamesNumbersModal 组件
- [ ] **两步流程**: 需要确认是否实现完整的流程
- [ ] **映射到 Canvas**: 当前有 handleAddNamesNumbers 函数

**文件位置**:
- Names & Numbers Modal: `apps/web/src/app/design-lab/components/modals/NamesNumbersModal.tsx`

---

## 5. 面板组件详细对比

### 5.1 Home Panel ("What's next for you?")

#### Custom Ink 要求

- **布局**: 4个按钮（Upload、Add Text、Add Art、Change Products）
- **按钮排列**: 可能是横向排列或2x2网格
- **按钮图标**: 每个按钮都有图标
- **提示文字**: "Drag & drop a file anywhere to upload"

#### 当前实现状态

- [ ] **布局**: 当前有 4 个按钮，需要确认排列方式是否匹配
- [ ] **按钮图标**: 当前有图标，需要确认样式是否匹配
- [ ] **提示文字**: 当前有提示文字，需要确认样式是否匹配
- [ ] **面板背景**: 需要确认背景色和圆角是否匹配

**文件位置**:
- `apps/web/src/app/design-lab/components/panels/HomePanel.tsx`

---

### 5.2 Edit Upload Panel

#### Custom Ink 控件顺序要求

1. Size (宽×高，单位 in)
2. Center
3. Layering (Bring to Front / Send to Back)
4. Flip
5. Duplicate
6. Crop
7. Rotation slider

#### 当前实现状态

- [ ] **控件顺序**: 当前顺序可能不匹配，需要重新排序
- [ ] **Size 显示**: 当前显示英寸，需要确认格式是否匹配
- [ ] **每个控件样式**: 需要确认标签、按钮、滑块样式是否匹配
- [ ] **间距和对齐**: 需要确认是否匹配

**文件位置**:
- `apps/web/src/app/design-lab/components/panels/EditUploadPanel.tsx`
- CSS: `apps/web/src/app/design-lab/design-lab.css` (.dl-edit-upload-panel)

---

### 5.3 Edit Text Panel

#### Custom Ink 控件顺序要求

1. Text
2. Change Font
3. Edit Color
4. Rotation
5. Outline
6. Text Shape
7. Text Size
8. 底部: Center / Layering / Text Alignment / Duplicate

#### 当前实现状态

- [ ] **控件顺序**: 需要确认当前顺序是否匹配
- [ ] **字体选择器**: 需要确认 UI 是否匹配 Custom Ink
- [ ] **颜色选择器**: 需要确认 UI 是否匹配 Custom Ink
- [ ] **每个控件样式**: 需要确认是否匹配

**文件位置**:
- `apps/web/src/app/design-lab/components/panels/EditTextPanel.tsx`
- CSS: `apps/web/src/app/design-lab/design-lab.css` (.dl-edit-text-panel)

---

### 5.4 Edit Art Panel

#### Custom Ink 控件顺序要求

1. Center
2. Layering
3. Flip
4. Duplicate
5. Rotation slider
6. Make One Color
7. Edit Colors
8. Change Art
9. Art Size

#### 当前实现状态

- [ ] **控件顺序**: 需要确认当前顺序是否匹配
- [ ] **每个控件样式**: 需要确认是否匹配
- [ ] **Make One Color**: 需要确认是否实现
- [ ] **Edit Colors**: 需要确认是否实现
- [ ] **Change Art**: 需要确认是否实现

**文件位置**:
- `apps/web/src/app/design-lab/components/panels/EditArtPanel.tsx`
- CSS: `apps/web/src/app/design-lab/design-lab.css` (.dl-edit-art-panel)

---

## 6. 验证检查清单

### 6.1 视觉验证

- [ ] 使用 Playwright 截图当前实现
- [ ] 对比 Custom Ink 全页面截图
- [ ] 检查布局是否一致
- [ ] 检查颜色是否一致
- [ ] 检查间距是否一致
- [ ] 检查字体是否一致
- [ ] 检查按钮样式是否一致
- [ ] 检查面板样式是否一致

### 6.2 交互验证

- [ ] 测试所有 Rail 按钮点击
- [ ] 测试所有面板切换
- [ ] 测试所有工具流程
- [ ] 测试按钮悬停效果
- [ ] 测试按钮激活状态
- [ ] 测试面板切换动画
- [ ] 测试模态框打开/关闭
- [ ] 测试 Canvas 交互（拖拽、缩放、旋转）

### 6.3 功能验证

- [ ] Upload 完整流程测试
- [ ] Text 完整流程测试
- [ ] Art 完整流程测试
- [ ] Product Colors 完整流程测试
- [ ] Names & Numbers 完整流程测试
- [ ] 所有功能是否正常工作
- [ ] 是否有错误或警告

---

## 7. 修复优先级

### 高优先级（必须修复）

1. **布局结构**: Header、Rail、Canvas、Sidebar、Bottom Bar 的位置和尺寸
2. **颜色方案**: Rail 背景色、按钮颜色、文本颜色
3. **按钮样式**: 所有按钮的位置、尺寸、样式
4. **面板布局**: 工具面板的宽度、背景、标题样式

### 中优先级（应该修复）

5. **控件顺序**: Edit Upload、Edit Text、Edit Art 面板的控件顺序
6. **交互效果**: 按钮悬停、激活状态、面板切换动画
7. **字体和间距**: 字体族、字号、间距

### 低优先级（可选修复）

8. **阴影效果**: 面板阴影、按钮阴影
9. **动画细节**: 过渡时长、缓动函数
10. **细节优化**: 圆角、边框等细节

---

**最后更新**: 2025-01-30 23:00:00  
**状态**: 对比清单已创建，等待执行修复

