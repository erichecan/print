<!-- c071a070-6701-4e15-9632-8c3ba0655680 9f5c29de-70dc-46dc-b2fe-b90c3b947d7f -->
# Design Lab 100% 对齐 Custom Ink 重构计划

## 目标

- 将当前 `/design-lab` 页面重构为和 Custom Ink Design Lab 几乎 1:1 的体验：
- **布局结构**：Header + 深色左侧 Rail + 中央 Canvas 区域 + 右侧视图/工具栏 + 底部操作栏。
- **交互元素**：按钮、链接、tab、工具入口、视图切换等元素数量和分布尽量与 Custom Ink 一致。
- **主要功能**：Upload / Add Text / Add Art / Product Colors / Add Names / Front/Back/Sleeve 视图切换 / Zoom / Save | Share / Get Price 等核心流程完整可用。
- **交互方式 & 数据交互**：鼠标悬停、点击、拖拽、自动保存等行为与 Custom Ink 一致，但底层 API 尽量复用现有后端，如需扩展可新增接口。
- **视觉还原**：颜色、间距、布局、按钮样式、图标摆放等尽量做到像素级还原（不复制对方 logo 和素材）。

## 阶段 1：现状与目标对齐

1. **阅读现有实现与文档**

- 核心代码：
- `apps/web/src/app/design-lab/page.tsx`
- `apps/web/src/app/design-lab/DesignLabClient.tsx`
- `apps/web/public/design-lab-native.html` 和 `public/design-lab-native/app.js`
- 设计状态文档：
- `docs/DESIGN-LAB-GAP-ANALYSIS.md`
- `docs/COMPETITOR-ANALYSIS-DESIGN-LAB.md`
- `docs/DESIGN-LAB-REFRACTORING-STATUS.md`
- 确认当前 Fabric.js + Zustand 架构和持久化/报价 API（`designLabApi`, `productsApi` 等）。

2. **阅读 Custom Ink 分析输出**

- 结构与交互：`docs/customink-analysis/INTERACTION-DESIGN.md`。
- 元素 & 交互详情：`docs/customink-analysis/ELEMENT-INVENTORY.json`。
- 截图参考：`docs/customink-analysis/screenshots/`。

3. **提炼目标结构模型**

- 从报告中抽象出：
- Header 区域元素（设计名称、导航、保存入口等）。
- 左侧 Rail 工具顺序和图标文案。
- 中央 Canvas + 引导卡片（"What's next for you?"）结构。
- 右侧视图切换（Front/Back/Sleeve/Zoom）及设置区块。
- 底部产品信息 + 操作按钮区（Change Product/Color, Save | Share, Get Price）。
- 输出一份内部注释（留在 `DesignLabClient.tsx` 顶部）作为布局蓝图。

## 阶段 2：布局和样式重构（桌面端 + 移动端）

1. **重新设计 JSX 结构（不动核心业务逻辑）**

- 在 `DesignLabClient.tsx` 中：
- 引入顶层 Grid 容器：`lab`。
- 拆分为子区域组件（可以先内联，后续再拆）：
- `lab__header`（顶部导航 + 设计名称 + 用户菜单）。
- `lab__rail`（左侧工具竖条）。
- `lab__stage`（中间画布区域 + 引导卡片）。
- `lab__sidebar`（右侧视图及属性面板）。
- `lab__bottom-bar`（底部操作栏）。
- 参考 `COMPETITOR-ANALYSIS-DESIGN-LAB.md` 中的布局分析，照抄区域划分和 DOM 层级结构。

2. **同步更新 CSS 布局**

- 在 `apps/web/src/app/globals.css` 或专用 CSS 中：
- 使用 5 区域 Grid 布局，依据 `DESIGN-LAB-REFRACTORING-STATUS.md` 中已经设计好的 grid-template 设置。
- 左侧 Rail：深灰背景 `#2C2C2C`，竖向图标+文案，悬停和选中态样式 100% 对齐。
- Stage：浅灰背景 `#F5F5F5`，Canvas 居中，支持“Drag & drop to upload” 提示样式。
- Sidebar：浅灰背景 + 白色卡片按钮，Front/Back 缩略图按钮样式。
- Bottom Bar：白色背景 + 产品信息卡片 + 主按钮区；`Get Price` 作为主 CTA（蓝色大按钮）。
- 复制 Custom Ink 屏幕上可见的关键 spacing/border-radius/box-shadow 数值，使整体布局 1:1。

3. **移动端布局适配**

- 使用媒体查询模仿 Custom Ink：
- 顶部 / 底部工具条切换为移动端图标导航。
- Canvas 占据竖向空间，工具按钮压在产品附近或底部 bar。
- 参考 Custom Ink 在移动端时截图行为（可用 DevTools 响应式模式 + Playwright 再抓一次）。

## 阶段 3：交互元素和工具行为对齐

1. **左侧 Rail 工具交互**

- 工具列表（顺序和标识与 Custom Ink 一致）：Upload, Add Text, Add Art, Product Colors, Add Names 等。
- 点击行为：
- 更新 `activeTool` 状态（在 `useDesignLabStore` 或组件 state 中）。
- 更新 Stage 或 Sidebar 对应 panel 内容（如打开上传面板/文字样式面板等）。
- 悬停提示：使用 Tooltip 或简易 title，对齐 Custom Ink 行为。

2. **中央 Stage 行为**

- 引导卡片按钮：
- Upload → 聚焦到上传逻辑（触发隐藏 file input）。
- Add Text → 切换到 text 工具并在 Canvas 居中插入文本。
- Add Art → 打开艺术素材选择面板（使用现有 `artAssetsApi` 或本地 mock 资源）。
- Change Product → 打开右侧或底部产品切换区域。
- Canvas 行为：
- 拖拽上传（监听 drop 事件，复用 upload 逻辑）。
- 选择/拖拽/缩放/旋转元素：基于 Fabric.js 现有功能，优化默认控制样式，使之接近 Custom Ink。 

3. **右侧 Sidebar 视图 & 工具**

- Front/Back/Sleeve/Zoom 视图切换：
- 使用 store 中 `currentView`（front/back/left/right/zoom）控制 Fabric canvas 显示具体 view（复用当前 `viewCanvases` 架构）。
- 按钮高亮状态与 Custom Ink 一致。
- 其他面板（诸如尺寸/数量/说明等）先按 Custom Ink 视觉做静态内容，逐步接入后端数据。

4. **底部操作栏**

- 左侧显示产品缩略图 + 名称 + 当前颜色/尺码。
- 右侧操作：
- `Change Product` / `Change Color` 调用现有 `productsApi` 或路由跳转到 PDP 后回到 Design Lab。
- `Save | Share` 使用现有草稿 API（`designLabApi`）保存当前设计，并展示“设计已保存”的 toast。
- `Get Price` 触发报价 API，弹出模态或右侧显示价格（对齐 Custom Ink 流程）。

## 阶段 4：数据交互和后端集成

1. **复用现有后端 API（优先）**

- 设计草稿：`designLabApi`（保存/读取草稿），与 Custom Ink “My Designs” 体验对齐。
- 产品信息：`productsApi` 获取当前产品/颜色/库存。
- 报价/下单：复用现有报价和订单 API，仅调整 UI 流程和文案。

2. **必要时扩展或包装 API**

- 如果 Custom Ink 有特定数据结构（例如视图层级、命名等），优先在前端做 mapping；若实在不匹配，再在 backend 增加轻量 wrapper（不破坏现有接口）。

3. **与账户设计列表联动**

- `/account/designs` 页面展示与 Custom Ink Saved Designs 类似的卡片布局，点击回到 `/design-lab?designId=...`。

## 阶段 5：测试和验证

1. **Playwright 回归测试**

- 新增 `tests/e2e/design-lab-customink-parity.spec.ts`：
- 验证关键区域存在（header/rail/stage/sidebar/bottom bar）。
- 验证主要按钮和工具数量/文本与 `ELEMENT-INVENTORY.json` 一致（适当容忍度）。
- 验证基本交互流程：Upload→Add Text→Save→Get Price 完整跑通。
- 复用 CDP 机制，确保没有明显 JS 错误。

2. **视觉自检**

- 使用现有 `visual-helpers.ts` 或 Playwright screenshot 对比：
- 对比 Custom Ink 截图与本地页面布局和元素分布（一致性主观检查）。

## 阶段 6：迭代打磨

1. **根据你的反馈微调**

- 调整 spacing/颜色/对齐，直到你主观感觉“和 Custom Ink 一模一样”。

2. **整理文档**

- 更新：
- `docs/DESIGN-LAB-GAP-ANALYSIS.md`（完成度从 35% → ~100%）。
- `docs/DESIGN-LAB-REFRACTORING-STATUS.md` 标记所有任务为完成。
- 简要记录实现要点和可复用的组件/样式。

### To-dos

- [x] 创建 customink-analysis.spec.ts 测试脚本，配置 Playwright 和 CDP
- [x] 实现登录流程处理（等待用户手动输入凭据）
- [x] 实现页面元素收集功能，识别所有交互元素
- [x] 实现截图功能，保存全页面和元素截图
- [x] 实现交互测试，模拟点击并记录变化
- [x] 生成交互设计文档和元素清单
- [x] 创建 customink-analysis.spec.ts 测试脚本，配置 Playwright 和 CDP
- [x] 实现登录流程处理（等待用户手动输入凭据）
- [x] 实现页面元素收集功能，识别所有交互元素
- [x] 实现截图功能，保存全页面和元素截图
- [x] 实现交互测试，模拟点击并记录变化
- [x] 生成交互设计文档和元素清单
- [x] 梳理现有 Design Lab 代码和文档，明确与 Custom Ink 的差异（布局/功能/数据交互）
- [x] 根据 Custom Ink 分析文档，抽象出目标布局结构和主要交互元素清单
- [x] 在 DesignLabClient 中重构 JSX 和 CSS，完成 5 区域布局（桌面 + 移动端）并还原视觉样式
- [x] 实现左侧 Rail、中央引导卡片、右侧视图切换、底部操作栏等交互逻辑，复用现有 Fabric.js + store
- [x] 将新 UI 与现有后端 API 连接（设计草稿、产品、报价等），必要时增加轻量后端封装
- [x] 编写 Playwright 端到端测试和必要的视觉检查，根据测试结果和你反馈微调体验
