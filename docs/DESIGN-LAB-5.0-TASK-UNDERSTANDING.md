# Design Lab 5.0 任务理解文档

**创建时间**: 2025-12-20 02:15:00  
**状态**: ⏸️ 等待确认

---

## 一、任务目标

### 1.1 核心目标

1. **备份当前代码**: ✅ 已完成（分支 `design-lab-5.0-base`）
2. **开启 5.0 版本开发**: ✅ 已创建分支 `design-lab-5.0`
3. **完成阶段 1 和阶段 2**: 
   - 阶段 1：布局结构（4 列 3 行）
   - 阶段 2：商品图片显示（简单的 HTML `<img>` 标签）
4. **UI 完全一致**: 与 4.0 版本 UI 保持一致
5. **不包含任何功能**: 只做 UI 显示，不包含任何编辑功能
6. **代码极简**: 使用最简单的 HTML/CSS，不使用复杂的 Fabric.js 逻辑
7. **参考 Custom Ink**: 全面参考 Custom Ink 的实现方式

### 1.2 限制条件

- **技术栈**: Next.js + React + CSS
- **不允许**: Fabric.js、任何编辑功能、复杂逻辑
- **必须**: 简单的 HTML `<img>` 标签、CSS 定位、UI 与 4.0 一致

### 1.3 未确认的问题

无

---

## 二、现状分析

### 2.1 当前代码状态

- ✅ 4.0 代码已备份到分支 `design-lab-5.0-base`
- ✅ 当前在分支 `design-lab-5.0`（可以开始修改）
- ✅ Custom Ink 实现已分析完成

### 2.2 问题点

- 当前 4.0 版本使用了 Fabric.js，代码复杂
- 图片显示逻辑复杂，涉及多个层级的容器
- 有纵向滚动条问题

---

## 三、To-Do List

### 阶段 1: 布局结构（4 列 3 行）

**目标**: 实现与 4.0 版本完全一致的布局结构，不包含任何功能

#### 任务 1.1: 简化 DesignLabClient.tsx 的布局部分

**文件**: `apps/web/src/app/design-lab/DesignLabClient.tsx`

**操作**:
- 保留布局 JSX 结构（Header / Rail / ToolPanel / Canvas / Sidebar / BottomBar）
- 移除所有 useState（除了 `currentView` 用于切换视图）
- 移除所有 useRef（除了简单的引用）
- 移除所有 useEffect（除了加载产品图片 URL）
- 移除所有 Fabric.js 相关代码
- 移除所有编辑功能代码
- 保留基本的 props 和类型定义

**预计时间**: 30 分钟

#### 任务 1.2: 保留并验证 CSS 布局

**文件**: `apps/web/src/app/design-lab/design-lab.css`

**操作**:
- 检查 `.design-lab-new` 的 Grid 布局（4 列 3 行）
- 验证各区域的尺寸和定位
- 确保绿色边框（`.dl-canvas`）正确显示

**预计时间**: 15 分钟

#### 任务 1.3: 添加 data-testid 用于测试

**文件**: `apps/web/src/app/design-lab/DesignLabClient.tsx`

**操作**:
- 在主要区域添加 `data-testid` 属性
- 确保与 4.0 版本的测试兼容

**预计时间**: 10 分钟

#### 任务 1.4: 验证布局

**操作**:
- 使用 Chrome DevTools 截图验证布局
- 运行 Playwright 测试验证结构

**预计时间**: 15 分钟

**阶段 1 总时间**: 约 70 分钟

---

### 阶段 2: 商品图片显示

**目标**: 在绿色边框区域（Canvas 区域）使用简单的 HTML `<img>` 标签显示商品图片

#### 任务 2.1: 添加简单的 `<img>` 标签

**文件**: `apps/web/src/app/design-lab/DesignLabClient.tsx`

**操作**:
- 在 `.dl-canvas__product` 容器内添加 `<img>` 标签
- 使用 `productInfo.baseImages[currentView]` 作为图片源
- 处理 `currentView === 'zoom'` 的情况（使用 'front' 视图）

**预计时间**: 15 分钟

#### 任务 2.2: 调整 CSS 样式

**文件**: `apps/web/src/app/design-lab/design-lab.css`

**操作**:
- 调整 `.dl-canvas` 样式（参考 Custom Ink：flex，居中，overflow: hidden）
- 调整 `.dl-canvas__preview` 样式（height: 100%，移除 padding）
- 添加 `.dl-canvas__product-image` 样式（position: absolute，object-fit: contain，居中）

**预计时间**: 20 分钟

#### 任务 2.3: 验证图片显示

**操作**:
- 检查图片是否在绿色边框区域显示
- 检查图片是否居中（水平和垂直）
- 检查图片是否完整显示（contain 模式）
- 检查是否没有滚动条

**预计时间**: 15 分钟

**阶段 2 总时间**: 约 50 分钟

---

## 四、实施策略

### 4.1 方法

1. **基于现有代码简化**: 不创建新文件，在现有代码基础上简化
2. **保留 CSS**: 保留现有的 CSS 文件，只做必要调整
3. **移除功能代码**: 逐步移除功能相关代码，保留 UI 结构

### 4.2 关键修改点

1. **DesignLabClient.tsx**:
   - 移除所有 Fabric.js 导入和代码
   - 移除所有编辑功能相关的 state 和 handlers
   - 简化组件，只保留布局和图片显示

2. **design-lab.css**:
   - 调整 `.dl-canvas` 和 `.dl-canvas__preview` 的高度和 overflow
   - 添加 `.dl-canvas__product-image` 样式（绝对定位，contain 模式）

---

## 五、预期结果

### 阶段 1 完成后的效果

- ✅ 布局完全符合 4 列 3 行结构
- ✅ 各区域尺寸正确
- ✅ 绿色边框区域正确显示
- ✅ 没有任何功能代码

### 阶段 2 完成后的效果

- ✅ 商品图片在绿色边框区域显示
- ✅ 图片完整显示（contain 模式）
- ✅ 图片居中（水平和垂直）
- ✅ 不产生滚动条
- ✅ 代码非常简单（只有 HTML `<img>` 标签和 CSS）

---

## 六、需要确认

请确认以下内容：

1. ✅ **实施方法**: 基于现有代码简化，还是创建全新的文件？
   - **建议**: 基于现有代码简化（保留 CSS，简化 JSX）

2. ✅ **CSS 调整**: 是否保留现有的 CSS 文件，只做必要调整？
   - **建议**: 保留现有 CSS，只调整 Canvas 相关样式

3. ✅ **图片模式**: 使用 `contain` 模式（完整显示，可能有留白）？
   - **确认**: 是的，使用 `contain` 模式

4. ✅ **功能移除**: 是否需要完全移除所有功能代码，还是可以注释？
   - **建议**: 完全移除，保持代码简洁

---

**等待确认后开始实施**
