# Design Lab 5.0 开发计划

**创建时间**: 2025-12-20 02:00:00  
**状态**: 📋 计划阶段  
**目标**: 完全参考 Custom Ink，使用最简单的方式实现 UI

---

## 一、目标与原则

### 1.1 核心目标

- ✅ **UI 完全一致**: 与 4.0 版本 UI 保持一致
- ✅ **代码极简**: 使用最简单的 HTML/CSS，不使用复杂的 Fabric.js 逻辑
- ✅ **参考 Custom Ink**: 全面参考 Custom Ink 的实现方式
- ✅ **阶段 1 + 阶段 2**: 只完成布局和商品图片显示，不包含任何功能

### 1.2 开发原则

1. **简单优先**: 能用 HTML/CSS 解决的，不用 JavaScript
2. **直接显示**: 商品图片直接用 `<img>` 标签显示
3. **CSS 定位**: 使用简单的 CSS flexbox 或 grid 居中
4. **无功能**: 不包含任何编辑功能，只做 UI 显示

---

## 二、阶段划分

### 阶段 1: 布局结构（4 列 3 行）

**目标**: 实现与 4.0 版本完全一致的布局结构

**要求**:
- 4 列: Rail (80px) / ToolPanel (430px) / Canvas (1fr) / Sidebar (120px)
- 3 行: Header (64px) / Main (1fr) / BottomBar (80px)
- 使用 CSS Grid 布局
- 添加 `data-testid` 用于测试

**不包含**:
- 任何交互功能
- Fabric.js 相关代码
- 任何业务逻辑

### 阶段 2: 商品图片显示

**目标**: 在绿色边框区域（Canvas 区域）显示商品图片

**要求**:
- 使用简单的 HTML `<img>` 标签
- 使用 CSS `object-fit: contain` 完整显示
- 图片居中显示（水平和垂直）
- 图片填满绿色边框区域（允许留白）
- 不产生滚动条

**不包含**:
- Fabric.js canvas
- 任何编辑功能
- 图片上传、文字添加等功能

---

## 三、Custom Ink 实现分析

### 3.1 Canvas 容器结构

根据访问 Custom Ink 网站的分析：

```
.ndx-App-canvasContainer (display: flex, width: 1475.1px, height: 1149px)
  └─ .ndx-CanvasContainer
      └─ .ndx-Product-photo (position: absolute, object-fit: fill)
```

**关键发现**:
- Canvas 容器使用 `display: flex`
- 产品图片使用 `position: absolute`
- 图片使用 `object-fit: fill`（而不是 contain 或 cover）
- 容器有固定的宽高

### 3.2 我们的实现目标

参考 Custom Ink，但根据用户需求调整为：
- 使用 `object-fit: contain`（完整显示，不裁剪）
- 图片居中显示
- 容器自适应（不固定尺寸）

---

## 四、实施步骤

### 4.1 代码备份

- ✅ 已创建分支 `design-lab-5.0-base`
- ✅ 已提交 4.0 代码到该分支

### 4.2 创建新分支

```bash
git checkout -b design-lab-5.0
```

### 4.3 阶段 1: 布局

1. 创建新的 Design Lab 组件文件
2. 实现 CSS Grid 布局
3. 添加必要的 `data-testid`
4. 验证布局结构

### 4.4 阶段 2: 商品图片

1. 在 Canvas 区域添加 `<img>` 标签
2. 设置 CSS 样式（居中、contain）
3. 验证图片显示

---

## 五、文件结构

### 5.1 新文件

- `apps/web/src/app/design-lab-5.0/page.tsx` - 主页面
- `apps/web/src/app/design-lab-5.0/design-lab-5.0.css` - 样式文件

### 5.2 保留文件

- `apps/web/src/lib/customink-images.ts` - 图片 URL 生成（复用）

---

## 六、验收标准

### 阶段 1 验收

- ✅ 布局完全符合 4 列 3 行结构
- ✅ 各区域尺寸正确
- ✅ DevTools 截图验证
- ✅ Playwright 测试通过

### 阶段 2 验收

- ✅ 商品图片在绿色边框区域显示
- ✅ 图片完整显示（contain 模式）
- ✅ 图片居中（水平和垂直）
- ✅ 不产生滚动条
- ✅ DevTools 截图验证
- ✅ Playwright 测试通过

---

**下一步**: 创建 5.0 开发分支，开始实施
