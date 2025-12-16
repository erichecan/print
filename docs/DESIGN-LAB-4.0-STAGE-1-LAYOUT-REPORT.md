# Design Lab 4.0 阶段1：布局确认报告

**生成时间**: 2025-12-19 23:50:00  
**阶段**: 阶段1 - 确认并固化页面布局（4列3行）  
**状态**: 📋 等待确认后实施

---

## 一、需求文档证据

### 1.1 4.0 需求文档引用

根据 `docs/DESIGN-LAB-4.0-REWRITE-PLAN.md`，虽然文档主要关注初始化架构，但布局需求明确在 CSS 变量中定义：

**列布局**：
- Rail: `--dl-rail-width: 80px`
- ToolPanel: `--dl-tool-panel-width: 430px`
- Canvas: `1fr`（自适应剩余空间）
- Sidebar: `--dl-sidebar-width: 120px`

**行布局**：
- Header: `--dl-header-height: 64px`
- Main: `1fr`（自适应剩余空间）
- BottomBar: `--dl-bottom-bar-height: 80px`

### 1.2 CSS 证据

从 `apps/web/src/app/design-lab/design-lab.css` 第55-67行：

```css
.design-lab-new {
  min-height: 100vh;
  height: 100vh;
  display: grid !important;
  grid-template-rows: var(--dl-header-height) 1fr var(--dl-bottom-bar-height);
  grid-template-columns: var(--dl-rail-width) var(--dl-tool-panel-width) 1fr var(--dl-sidebar-width);
  background: var(--dl-bg-primary) !important;
  overflow: hidden;
  position: relative;
  width: 100%;
  isolation: isolate;
}

.dl-main {
  grid-column: 1 / -1;
  grid-row: 2;
  display: grid;
  grid-template-columns: var(--dl-rail-width) var(--dl-tool-panel-width) 1fr var(--dl-sidebar-width);
  height: 100%;
  overflow: hidden;
}
```

---

## 二、现状分析

### 2.1 当前 JSX 结构

从 `apps/web/src/app/design-lab/DesignLabClient.tsx` 第4054行开始：

```tsx
<div className="design-lab-new">
  {/* 1. Header */}
  <header className="dl-header">...</header>
  
  {/* 2-5. Main Content */}
  <div className="dl-main">
    {/* 2. Rail */}
    <nav className="dl-rail">...</nav>
    
    {/* 3. ToolPanel - 通过组件渲染 */}
    <ToolPanel ... />
    
    {/* 4. Canvas */}
    <section className="dl-canvas">...</section>
    
    {/* 5. Sidebar */}
    <aside className="dl-sidebar">...</aside>
  </div>
  
  {/* 6. BottomBar */}
  <footer className="dl-bottom-bar">...</footer>
</div>
```

### 2.2 问题点分析

#### ✅ 已正确实现的部分：
1. ✅ 外层容器 `.design-lab-new` 使用 grid，定义了 4 列 3 行
2. ✅ Header 跨越所有列（grid-column: 1 / -1）
3. ✅ Main 跨越所有列（grid-column: 1 / -1），内部使用 grid 定义 4 列
4. ✅ BottomBar 跨越所有列（grid-column: 1 / -1）
5. ✅ Rail、ToolPanel、Canvas、Sidebar 都已在结构中存在

#### ✅ 已验证正确的部分：
1. ✅ Rail、ToolPanel、Canvas、Sidebar 的 grid 定位已确认正确（通过 CSS 检查）：
   - Rail: `grid-column: 1` ✅
   - ToolPanel: `grid-column: 2` ✅
   - Canvas: `grid-column: 3` ✅
   - Sidebar: `grid-column: 4` ✅
   - Header: `grid-column: 1 / -1; grid-row: 1` ✅
   - Main: `grid-column: 1 / -1; grid-row: 2` ✅
   - BottomBar: `grid-column: 1 / -1; grid-row: 3` ✅

2. ✅ ToolPanel 组件已正确使用 `.dl-tool-panel` 类（第63行）

#### ⚠️ 需要改进的部分：
1. ⚠️ 缺少 data-testid 属性用于 Playwright 测试：
   - Header: `data-testid="header"`
   - Rail: `data-testid="rail"`
   - ToolPanel: `data-testid="tool-panel"`
   - Canvas: `data-testid="canvas"`
   - Sidebar: `data-testid="sidebar"`
   - BottomBar: `data-testid="bottom-bar"`

3. ⚠️ 需要验证 ToolPanel 组件的容器是否正确应用了 `.dl-tool-panel` 类

---

## 三、To-Do List（阶段1）

### 任务1：验证并确认 CSS Grid 定位 ✅ (已完成检查)

**目标**：确认所有区域在 grid 中的定位正确

**检查结果**：✅ 所有 grid 定位已确认正确
- ✅ `.dl-rail`: `grid-column: 1`
- ✅ `.dl-tool-panel`: `grid-column: 2`
- ✅ `.dl-canvas`: `grid-column: 3`
- ✅ `.dl-sidebar`: `grid-column: 4`
- ✅ `.dl-header`: `grid-column: 1 / -1; grid-row: 1`
- ✅ `.dl-main`: `grid-column: 1 / -1; grid-row: 2`
- ✅ `.dl-bottom-bar`: `grid-column: 1 / -1; grid-row: 3`

**文件**：`apps/web/src/app/design-lab/design-lab.css`

**状态**：✅ 无需修改，定位已正确

---

### 任务2：添加 data-testid 属性 🔨

**目标**：为所有关键区域添加 data-testid，便于 Playwright 测试

**修改文件**：`apps/web/src/app/design-lab/DesignLabClient.tsx`

**需要添加的 data-testid**：
1. Header: `<header className="dl-header" data-testid="header">`
2. Rail: `<nav className="dl-rail" data-testid="rail">`
3. ToolPanel: 需要检查 `ToolPanel.tsx` 组件，在容器上添加 `data-testid="tool-panel"`
4. Canvas: `<section className="dl-canvas" data-testid="canvas">`
5. Sidebar: `<aside className="dl-sidebar" data-testid="sidebar">`
6. BottomBar: `<footer className="dl-bottom-bar" data-testid="bottom-bar">`

**预计时间**：10分钟

---

### 任务3：验证 ToolPanel 组件结构 ✅ (已完成检查)

**目标**：确认 ToolPanel 组件的根容器正确使用了 `.dl-tool-panel` 类

**检查文件**：`apps/web/src/app/design-lab/components/ToolPanel.tsx`

**检查结果**：✅ 已确认正确
- ✅ 根元素使用了 `className="dl-tool-panel"`（第63行）
- ✅ 该元素在 CSS 中被正确设置为 `grid-column: 2`

**状态**：✅ 无需修改，结构已正确

---

### 任务4：创建 Playwright 测试用例 🧪

**目标**：创建最小测试用例验证布局结构

**新建文件**：`apps/web/tests/e2e/design-lab-4.0-stage1-layout.spec.ts`

**测试内容**：
```typescript
test('阶段1：验证4列3行布局结构', async ({ page }) => {
  await page.goto('/design-lab');
  
  // 验证所有区域存在
  await expect(page.locator('[data-testid="header"]')).toBeVisible();
  await expect(page.locator('[data-testid="rail"]')).toBeVisible();
  await expect(page.locator('[data-testid="tool-panel"]')).toBeVisible();
  await expect(page.locator('[data-testid="canvas"]')).toBeVisible();
  await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
  await expect(page.locator('[data-testid="bottom-bar"]')).toBeVisible();
  
  // 验证布局尺寸（可选，通过计算样式验证）
  const header = page.locator('[data-testid="header"]');
  const rail = page.locator('[data-testid="rail"]');
  const toolPanel = page.locator('[data-testid="tool-panel"]');
  const sidebar = page.locator('[data-testid="sidebar"]');
  const bottomBar = page.locator('[data-testid="bottom-bar"]');
  
  // 验证高度
  await expect(header).toHaveCSS('height', '64px');
  await expect(bottomBar).toHaveCSS('height', '80px');
  
  // 验证宽度（通过计算样式）
  const railWidth = await rail.evaluate((el) => window.getComputedStyle(el).width);
  const toolPanelWidth = await toolPanel.evaluate((el) => window.getComputedStyle(el).width);
  const sidebarWidth = await sidebar.evaluate((el) => window.getComputedStyle(el).width);
  
  expect(railWidth).toBe('80px');
  expect(toolPanelWidth).toBe('430px');
  expect(sidebarWidth).toBe('120px');
});
```

**预计时间**：20分钟

---

### 任务5：DevTools 验证 📸

**目标**：使用 Chrome DevTools 截图验证布局

**步骤**：
1. 启动本地开发服务器
2. 打开 Chrome DevTools
3. 导航到 `/design-lab`
4. 使用 DevTools 的 Elements 面板检查：
   - `.design-lab-new` 的 grid 计算样式
   - 每个区域的 grid-column 和 grid-row 值
   - 实际渲染的宽度和高度
5. 截图保存作为证据

**预计时间**：15分钟

---

## 四、修改计划

### 4.1 需要修改的文件清单

| 文件 | 修改类型 | 说明 |
|------|---------|------|
| `apps/web/src/app/design-lab/DesignLabClient.tsx` | 修改 | 添加 data-testid 属性 |
| `apps/web/src/app/design-lab/components/ToolPanel.tsx` | 检查/修改 | 确认/添加 data-testid |
| `apps/web/src/app/design-lab/design-lab.css` | 检查 | 验证 grid 定位（如需要，添加注释） |
| `apps/web/tests/e2e/design-lab-4.0-stage1-layout.spec.ts` | 新建 | Playwright 测试用例 |

### 4.2 代码修改示例

#### 示例1：添加 data-testid 到 Header
```tsx
// 修改前
<header className="dl-header">

// 修改后
<header className="dl-header" data-testid="header">
```

#### 示例2：添加 data-testid 到 Rail
```tsx
// 修改前
<nav className="dl-rail" aria-label="Design tools">

// 修改后
<nav className="dl-rail" aria-label="Design tools" data-testid="rail">
```

#### 示例3：添加注释和时间戳
```tsx
// [2025-12-19 23:50:00] 阶段1：添加 data-testid 用于 Playwright 测试
<header className="dl-header" data-testid="header">
```

---

## 五、验收标准

### 5.1 DevTools 验证

**成功标准**：
- ✅ 截图显示 4 列 3 行网格区域明确
- ✅ Header 跨越所有列，高度 64px
- ✅ Main 区域内部显示 4 列：Rail(80px) / ToolPanel(430px) / Canvas(自适应) / Sidebar(120px)
- ✅ BottomBar 跨越所有列，高度 80px

### 5.2 Playwright 验证

**成功标准**：
- ✅ 所有 data-testid 元素可被定位
- ✅ 尺寸断言通过：
  - Header height = 64px
  - Rail width = 80px
  - ToolPanel width = 430px
  - Sidebar width = 120px
  - BottomBar height = 80px

### 5.3 代码审查

**成功标准**：
- ✅ 所有修改都添加了注释和时间戳
- ✅ data-testid 命名规范统一
- ✅ 无 linter 错误

---

## 六、风险评估

### 6.1 低风险项
- ✅ 添加 data-testid 不会影响现有功能
- ✅ CSS 验证不会改变现有样式

### 6.2 需要注意的点
- ⚠️ 确保 data-testid 不会与现有测试冲突
- ⚠️ 确保 ToolPanel 组件的修改不会破坏现有功能

---

## 七、下一步

等待确认后：
1. 按照 To-Do List 逐步执行
2. 每个任务完成后进行本地验证
3. 完成所有任务后，输出验收证据（DevTools 截图 + Playwright 测试结果）
4. 暂停等待确认，再进入阶段2

---

**报告状态**: 📋 等待用户确认  
**下一步**: 用户确认后开始执行任务
