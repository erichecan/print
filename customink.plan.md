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

### To-dos（执行进度）

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

---

## 对话约定与实现细节说明

> 本节是在与你多轮对话后整理的统一「执行标准」，方便在不同环境继续开发时保持一致。  
> 更新时间：2025-12-02 06:20:00

### 1. 参照标准与边界

- **行为标准**：以 Custom Ink 的 Design Lab 为「体验金标准」，包括：
  - 交互路径（用户从左侧入口到各个工具/面板的流转顺序）
  - 面板结构和控件分布（左侧 / 中央 / 右侧 / 底部）
  - 用户操作顺序（例如：Choose File → Edit Upload → Save Design）
- **技术边界**：
  - 不直接阅读或复制 Custom Ink 的源代码（JS/CSS），把它当黑盒，只通过 DOM / 行为 / 网络请求观察。
  - 允许充分参考本仓库中已有的 native 版本代码（`design-lab-native.html` + `app.js` + `panelManager.js` + `toolbar.js`）作为「逻辑资料」，但最终 UI 壳以 React 版的 Custom Ink 风格为准。
  - 图标、字体、图片等视觉资源使用自有或开源替代，不直接拷贝 Custom Ink 资产。

### 2. 左侧工具与 Canvas 的统一原则

- **核心约定**：左侧 = 主要编辑中心，右侧 = 高级/补充信息。
- 具体要求：
  - 「What’s next for you?」四个入口（Upload / Add Text / Add Art / Change Products）：
    - 点击后进入对应工具流程，而不是只触发一次动作再回到空白。
  - 左侧 Rail 工具（Upload / Add Text / Add Art / Product Colors / Add Names）：
    - 控制当前激活工具和左侧工具面板内容。
    - 工具面板里的所有控件（按钮、滑块、输入框、开关）必须真实修改 Fabric Canvas 上的对象或产品状态。
  - 右侧面板（`dl-edit-panel` 等）作为补充：层级列表、更多属性、评论等，不再承担主要编辑入口的角色。

### 3. 四大主路径的实现策略

#### 3.1 Upload 路径

- **入口行为（已调整）**：
  - 所有调用 `triggerToolAction('upload')` 的入口（左 Rail、What’s next 卡片）：
    - 只设置 `selectedTool = 'upload'`；
    - 打开 `showUploadModal`（React 版 `Choose File To Upload` 模态）。
    - 不再直接调用 `fileInputRef.click()`，对齐 Custom Ink 先进入「Choose File」界面再选择文件的流程。
- **Choose File To Upload 模态**：
  - 结构：Browse 按钮、Drag & Drop Anywhere 文案、DPI/Max Size 提示、帮助文案（Chat/email）、后期加入 Recent Uploads。
  - 行为：
    - Browse → 使用 `fileInputRef.click()`，文件选择后由 `handleFileChange` 完成上传并在 Canvas 上添加 image 对象。
    - 拖拽 → 使用全屏 `dl-drag-drop-zone` 监听 drag/drop，过滤 `image/*` 文件，构造 synthetic `ChangeEvent` 调 `handleFileChange`。
- **Edit Upload（下一步目标）**：
  - 参考截图中的 `Edit Upload` 面板，MVP 目标：
    - Size（宽×高，单位 in）→ 通过计算 `scaleX/scaleY` 修改 Fabric image 尺寸。
    - Center / Layering / Flip / Duplicate / Crop / Rotation slider。
    - 简化的颜色工具（Make One Color / Remove Background Color）的占位及基础逻辑。
  - 位置：可以沿用现有右侧 `Edit Image` 逻辑，但 UI 和入口要与 Custom Ink 的 Upload 编辑体验一致；长期目标是迁移到左侧 Upload 工具上下文中。

#### 3.2 Text 路径

- **两步流程**：
  1. `Add Text` 模态负责创建文本对象；
  2. `Edit Text` 面板负责后续编辑（字体、颜色、旋转、Text Size、对齐、Duplicate 等）。
- **已有逻辑**：
  - `handleAddText`：基于 Fabric 创建 `IText`，支持字体、颜色、大小、旋转。
  - 文本编辑 handler：`handleTextChange`、`handleTextFontChange`、`handleTextColorChange`、`handleTextRotationChange` 等。
- **对齐要求**：
  - `Add Text` 模态 UI 对齐截图（顶部大输入框 + 蓝色 Add To Design 按钮）。
  - `Edit Text` 字段顺序与 Custom Ink 一致：
    - Text / Change Font / Edit Color / Rotation / Outline / Text Shape / Text Size / 底部 Center / Layering / Text Alignment / Duplicate。
  - 中长期将这些控件从右侧逐步搬到左侧 Text 工具区，使「左侧工具 = 主要编辑入口」这一原则彻底成立。

#### 3.3 Art 路径

- **Artwork Categories**：
  - 大类网格（Emojis / Shapes & Symbols / Sports & Games / Letters & Numbers / Animals / Nature / …），UI 结构仿照截图。
  - 点击某一类进入子分类列表（例如 Emojis → Animals / Food & Drink / Hands / …）。
- **选择与编辑**：
  - 选中 Art 后，在 Canvas 上创建相应的图像对象（可用 Emoji → 字符 +特殊字体 或基于已有 `ART_ASSETS` 图片实现）。
  - `Edit Art` 面板提供至少：
    - Center / Layering / Flip / Duplicate；
    - Rotation slider；
    - 简化的 Make One Color / Edit Colors / Change Art / Art Size 控件。
  - 所有按钮直接操作 Fabric image 对象，并通过 `renderAll + handleCanvasChange` 落盘。

#### 3.4 Product Colors & Names & Numbers

- **Product Colors**：
  - `Choose Your Product Color` 模态：
    - Colors 色板矩阵；
    - 「Ordering fewer than 6?」开关和说明；
    - Sizes available in 某色的信息；
    - 「Pick another color」流。
  - 行为：
    - 选择色块 → 更新 `currentVariant` / `selectedProductColor`，同步产品图片与底部 Product pill 信息。
- **Names & Numbers**：
  - 两步流程：
    1. 「Names and Numbers」介绍页 + CTA（Add Names and Numbers）。
    2. Tools 页（Add Names / Add Numbers 勾选 + Side/Height/Color 下拉）→ Step 2: Enter Names/Numbers 列表页。
  - 已有状态变量：
    - `addNames/addNumbers`、`nameSide/numberSide`、`nameHeight/numberHeight`、`nameColor/numberColor`、`sizeQuantities` 等。
  - 完成标准：
    - 在 Tools 页勾选/配置选项后，进入列表页录入所有名字和号码；
    - 将列表映射到 Canvas 上多个文本对象（每个 name/number 一行），并参与报价计算。

### 4. 执行优先级（对话确认版）

1. **Upload 全链路**：  
   - 先保证从左侧入口到 Choose File / 上传 / 在 Canvas 显示 / 基础 Edit Upload 控件这一整条路径可用。  
2. **Text 全链路**：  
   - Add Text + Edit Text 的 UI 与行为完善，优先保证左侧工具能独立完成常见文本编辑。  
3. **Art 全链路**：  
   - 分类浏览 + 选择 + Edit Art 行为落到 Canvas。  
4. **Product Colors + Names & Numbers**：  
   - 颜色选择影响产品 variant；
   - Names & Numbers 完整两步流程打通，并接入报价/下单。

以上条款作为后续在任意环境继续开发时的统一「行为契约」，如果后续对话中有新决定，需要同步更新本节。 
