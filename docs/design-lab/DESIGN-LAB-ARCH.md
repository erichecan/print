# Design Lab 架构文档

> 本文档记录 Design Lab（`/apps/web/src/app/design-lab/`）的完整技术架构，以及新旧两个 Store 的深度对比分析。作为后续正式开发的参考基准。
>
> 生成时间：2026-05-25

---

## 目录

1. [整体布局与组件结构](#1-整体布局与组件结构)
2. [Canvas 初始化流程](#2-canvas-初始化流程)
3. [图层 Z-Index 系统](#3-图层-z-index-系统)
4. [产品图片加载 FSM](#4-产品图片加载-fsm)
5. [多视图快照管理](#5-多视图快照管理)
6. [工具操作处理器](#6-工具操作处理器)
7. [自动保存与持久化](#7-自动保存与持久化)
8. [Store 深度对比：旧版 vs 新版](#8-store-深度对比旧版-vs-新版)
9. [已知 Bug 列表](#9-已知-bug-列表)
10. [开发决策建议](#10-开发决策建议)

---

## 1. 整体布局与组件结构

### 主文件
`apps/web/src/app/design-lab/DesignLabClient.tsx`（约 4887 行）

### 五区布局

```
┌─────────────────────────────────────────────────────────────────┐
│  HEADER: Logo | 设计名称 | 电话 | 在线咨询 | 登录                 │
├────┬──────────────┬───────────────────────┬─────────────────────┤
│    │              │                       │                     │
│ R  │  ToolPanel   │    Canvas 区域         │   Sidebar           │
│ A  │  (430px固定宽)│  ┌─────────────────┐  │  (视图切换：Front   │
│ I  │              │  │ 产品图片(img)    │  │   Back / Sleeve)   │
│ L  │  根据工具类型  │  │ Fabric Canvas   │  │                     │
│    │  动态切换内容  │  │ 浮动控件        │  │  缩放控制           │
│    │              │  └─────────────────┘  │                     │
├────┴──────────────┴───────────────────────┴─────────────────────┤
│  BOTTOM BAR: + Add Products | 产品信息 | Save|Share | Get Price  │
└─────────────────────────────────────────────────────────────────┘
```

### Rail 工具图标（左侧竖栏）

| 图标 | 功能 | 切换面板类型 |
|------|------|-------------|
| Upload | 上传图片 | `'upload'` |
| Add Text | 添加文字 | `'text'` |
| Add Art | 添加艺术图案 | `'art'` |
| Product Colors | 产品颜色 | `'colors'` |

### ToolPanel 面板类型

| `toolPanelType` | 显示内容 |
|----------------|---------|
| `'home'` | 默认空白/首页 |
| `'upload'` | 上传图片区域 |
| `'text'` | 文字工具设置 |
| `'art'` | 艺术图案库 |
| `'colors'` | 颜色选择器 |
| `'edit-upload'` | 已选上传图层的编辑属性 |
| `'edit-text'` | 已选文字图层的编辑属性 |
| `'edit-art'` | 已选艺术图层的编辑属性 |

### 弹窗组件

- `ProductColorsModal` — 产品颜色选择
- `NamesNumbersModal` — 姓名/号码个性化
- `PriceModal` — 旧版价格面板（兼容）
- `GetPriceFlowModal` — 新版完整报价流程（含尺码数量）
- `SaveShareModal` — 保存与分享

---

## 2. Canvas 初始化流程

### 技术栈
- **Fabric.js**：核心 Canvas 操作库（动态 import，避免 SSR 问题）
- **`CanvasEngine`**：单例封装类，位于 `src/design/canvas/engine.ts`

### 逻辑尺寸
```
LOGICAL_WIDTH  = 4000 px
LOGICAL_HEIGHT = 4800 px
```
CSS 缩放适配显示区域，坐标系始终是 4000×4800。

### 初始化序列

```
1. dynamic import('fabric')           — 仅客户端加载
2. canvasEngine.initialize(           — 创建 fabric.Canvas
     canvasEl,
     fabric,
     { loadProductImage: true }
   )
3. 注册 CanvasEngine 事件             — READY / OBJECT_ADDED / OBJECT_REMOVED / OBJECT_MODIFIED / ERROR
4. 绑定 Fabric 原生事件               — object:moving / moved / modified / added / removed
                                        selection:created / updated / cleared
5. 重写 canvas.renderAll              — 包装原始方法，附加 drawSafeArea() + drawSnapLines()
6. 延迟 100ms 恢复快照               — snapshotToCanvas(viewCanvases[currentView], fabricCanvas)
7. setCanvasInitialized(true)         — 解锁 UI 交互
```

### Canvas 事件绑定详情

| 事件 | 处理函数 | 主要逻辑 |
|------|----------|---------|
| `object:moving` | `handleObjectMoving` | 5px 阈值吸附对齐 |
| `object:moved` | `handleObjectMoved` | 清除吸附辅助线 |
| `selection:created` | `handleSelection` | 根据选中对象类型切换 ToolPanel |
| `selection:updated` | `handleSelection` | 同上 |
| `selection:cleared` | `handleSelectionCleared` | 通过 `isAddingObjectRef` 保护对象添加流 |
| `object:modified` | → `canvasToSnapshot()` | 序列化快照 → `setCanvas(snapshot, {pushHistory:true})` |
| `object:added` | → `canvasToSnapshot()` | 同上 |
| `object:removed` | → `canvasToSnapshot()` | 同上，含循环检测保护 |

### 对象移除保护机制（Anti-Loop）

文字对象在 `edit-text` 面板处于激活状态时，若被意外移除（非用户主动删除）：
- `removalContext !== 'user-delete'` → 将对象重新加回 Canvas，保持面板不变
- 若产品图片在自身移除后 1 秒内被重新添加 → 触发循环检测日志

### 吸附对齐（Snap）

- 阈值：5px
- 吸附目标：Canvas 中心 + 其他对象的边缘/中心线
- 视觉反馈：蓝色虚线辅助线（`drawSnapLines()`）

### 安全区（Safe Area）

- 橙色虚线边框，覆盖整个 Canvas（0% 边距）
- 通过重写后的 `renderAll` 在每帧绘制（`drawSafeArea()`）

---

## 3. 图层 Z-Index 系统

| 图层类型 | zIndex 值 | 说明 |
|---------|----------|------|
| 产品背景图 | `0` | `product-image-*`，不可选中，不触发事件 |
| 上传图片 | `10` | 用户上传的自定义图片 |
| 艺术图案 | `15` | 从图案库添加的 SVG/PNG |
| 文字 | `20` | `fabric.IText` 实例 |

图层类型存储在 Fabric 对象的 `data.layerType` 字段（`'upload'` / `'art'` / `'text'`）。

---

## 4. 产品图片加载 FSM

**文件**：`src/design/canvas/layers/productImageLayer.ts`（约 1690 行）

### 状态机

```
IDLE → LOADING → LOADED → ATTACHED
                        ↘ ERROR
```

### Stable Key 机制

```typescript
generateStableKey(colorName, view, productId)
// 输出: "product-image-{pid}-{colorId}-{view}"
// 作用: 幂等性标识，防止同一图片重复加载
```

`canLoad(key)` 在 state 为 LOADING 时阻断重复请求。

### 图片应用策略（`applyCoverCentered`）

- 布局模式：Contain/Cover（固定逻辑尺寸 4000×4800）
- 定位：`originX/Y: 'center'`，`left=2000, top=2400`
- 属性：`selectable: false, evented: false`（不可操作）

### 颜色切换流程

```
handleColorSelect(colorName)
  → 查找 variant by colorName（优先 M 码）
  → loadProductInfo(variantId)
  → 触发背景图重载（ProductImageLayerManager 换 stableKey）
```

### ⚠️ 已知 Bug（生产环境调试代码残留）

```typescript
// productImageLayer.ts
const shouldShowCenterSquare = true  // 硬编码！
// 会为所有用户绘制红色 50×50 调试方块 + 十字准线
```

---

## 5. 多视图快照管理

### 视图切换流程

```
handleViewChange(newView)
  → store.setView(newView)
    ├── 保存 canvas → viewCanvases[currentView]
    ├── currentView = newView
    └── canvas = viewCanvases[newView]
  → useEffect 检测 currentView 变化
    ├── loadBackgroundImage(newView)
    └── snapshotToCanvas(viewCanvases[newView], fabricCanvas)
```

### 快照格式（旧版 Store）

```typescript
interface DesignCanvasSnapshot {
  size: { width: number; height: number };  // 500×600（与 4000×4800 不匹配！）
  objects: fabric.Object[];                  // Fabric 内部 JSON
}
```

### 草稿恢复流程

```
页面加载
  → URL 查询参数 draftId? → API 拉取草稿
  → setDraft(draft) → 重置所有视图画布
  : 无 draftId → 检查 localStorage → setViewCanvases(saved)
  → 延迟 100ms（等 Canvas 初始化）→ snapshotToCanvas()
```

---

## 6. 工具操作处理器

### 添加文字（`handleAddText`，约 lines 1857-1980）

```typescript
isAddingObjectRef.current = true  // 防止 selection:cleared 误切面板
new fabric.IText('Your Text Here', {
  fontSize: 48,
  fill: '#000000',
  data: { layerType: 'text', zIndex: 20 }
})
canvas.add(obj)
canvas.setActiveObject(obj)
setToolPanelType('edit-text')
// 双 requestAnimationFrame 后重置 isAddingObjectRef
```

### 添加艺术图案（`handleAddArt`，约 lines 1984-2079）

```typescript
fabric.Image.fromURL(url, (img) => {
  img.scale(0.3 * canvasWidth / img.width)  // 30% Canvas 宽
  img.set({ left: 2000, top: 2400, data: { layerType: 'art', zIndex: 15 } })
  canvas.add(img)
  canvas.setActiveObject(img)
  setToolPanelType('edit-art')
})
```

### 上传文件（`handleFileUpload`，约 lines 2090-2424）

```typescript
// 验证：< 20MB，格式：jpg/png/gif/webp/avif/svg
FileReader → base64 → new Image() → fabric.Image.fromURL()
// 智能缩放：Math.min(0.3 × canvasW/imgW, 0.3 × canvasH/imgH)
img.set({ data: { layerType: 'upload', zIndex: 10 } })
// 双 rAF 确保可靠的 selection 事件
```

### 保存设计（`handleSaveDesignConfirm`，约 lines 2590-2726）

```typescript
canvas.toDataURL()                   // 生成缩略图
saveToLocalStorage(snapshot)         // 先本地存储
designLabApi.createDraft() 或 updateDraft()  // 再 API 同步
// 返回 designId
```

---

## 7. 自动保存与持久化

### 自动保存策略

| 触发时机 | 行为 |
|---------|------|
| 每 30 秒 | `setInterval(autoSave, 30000)` |
| 页面关闭前 | `beforeunload` 事件 |
| 组件卸载 | 最终保存 |

### 持久化分层

```
本地存储（localStorage）
  ├── 当前设计快照（所有视图）
  └── 草稿元信息（productId, variantId）

服务端 API
  └── DesignDraft（含 canvasSnapshot JSON）
```

---

## 8. Store 深度对比：旧版 vs 新版

### 文件位置

| | 旧版 | 新版 |
|---|---|---|
| **文件** | `src/contexts/designLabStore.ts` | `src/app/design-lab/store/useDesignStore.ts` |
| **导出** | `useDesignLabStore` | `useDesignStore` |
| **接入 UI** | ✅ DesignLabClient.tsx 实际使用 | ❌ 完全未接入任何组件 |

---

### 核心设计理念差异

| 维度 | 旧版 `useDesignLabStore` | 新版 `useDesignStore` |
|------|--------------------------|----------------------|
| **真相来源** | Fabric Canvas（Store 是镜像/副本） | Store 图层数据（Fabric 是渲染器） |
| **数据耦合** | 强耦合 Fabric 内部格式 | 框架无关的纯数据模型 |
| **架构模式** | Canvas-First（先有 Fabric，再同步 Store） | Data-First（先有 Store，再驱动 Fabric） |

---

### 状态结构对比

#### 旧版状态接口

```typescript
type DesignView = 'front' | 'back' | 'sleeve';  // 仅 3 个视图

interface LayerInfo {
  id: string;
  type: 'textbox' | 'image' | 'rect' | 'circle' | 'path' | 'group' | 'i-text' | 'text';
  // ↑ Fabric 内部类型字符串
  name: string;
  visible: boolean;
  locked: boolean;
  zIndex: number;
  // ❌ 无 src（图片 URL）
  // ❌ 无 text（文字内容）
  // ❌ 无 transform（位置/缩放/旋转）
  // 仅是 UI 元数据影子列表
}

interface DesignLabState {
  draft?: DesignDraft;                           // 服务端实体混入 UI 状态
  canvas: DesignCanvasSnapshot;                  // 当前视图快照
  viewCanvases: Record<DesignView, DesignCanvasSnapshot>;
  currentView: DesignView;
  history: DesignCanvasSnapshot[];               // 最大 20 条，完整 Fabric JSON 拷贝
  future: DesignCanvasSnapshot[];
  mode: 'edit' | 'quick-edit' | 'preview';
  mobileLocked: boolean;
  layers: LayerInfo[];                           // 影子列表，非真相来源
}
```

#### 新版状态接口

```typescript
type ViewId = 'front' | 'back' | 'left-sleeve' | 'right-sleeve' | 'sleeve';  // 5 个视图

type LayerType = 'image' | 'text' | 'vector' | 'group';  // 业务类型，非 Fabric 类型

interface Layer {
  id: string;                    // 稳定 UUID
  type: LayerType;
  name?: string;
  src?: string;                  // ✅ 图片 URL（含上传 ID）
  text?: string;                 // ✅ 文字内容
  style?: LayerStyle;            // ✅ 字体/颜色/描边/阴影
  transform: Transform;          // ✅ x/y/scaleX/scaleY/rotation/skewX/skewY
  visible: boolean;
  locked: boolean;
  metadata?: Record<string, unknown>;
  clipPath?: string;
  zIndex: number;
}

interface ViewState {
  viewId: ViewId;
  layers: Layer[];
  constraints?: ViewConstraints;  // ✅ 可打印区域约束
  canvasSize: { width: number; height: number };  // ✅ 每视图独立尺寸
}

interface DesignDocument {
  docId: string;
  productId: string;
  variantId?: string;
  createdAt: string;
  updatedAt: string;
  version: number;               // ✅ 版本号，每次保存递增
  activeView: ViewId;
  views: Record<ViewId, ViewState>;
  name?: string;
}

interface DesignState {
  document: DesignDocument | null;  // 干净的领域对象
  isLoading: boolean;
  isSaving: boolean;
  dirty: boolean;                   // ✅ 未保存变更标志
}
```

---

### 功能维度详细对比

| 维度 | 旧版 | 新版 |
|------|------|------|
| **视图数量** | 3（front/back/sleeve） | 5（+left-sleeve/right-sleeve） |
| **快照默认尺寸** | 500×600（与 Canvas 4000×4800 不匹配） | 每视图独立 `canvasSize`，默认 1200×1440 |
| **图层数据完整性** | 仅 UI 元数据（无位置/内容） | 完整自描述（src/text/transform/style） |
| **图层类型** | Fabric 内部字符串（i-text/textbox/...） | 业务类型（image/text/vector/group） |
| **撤销/重做** | 在 Store 内，存完整 Fabric JSON 拷贝 | 不在 Store，设计上留给调用层处理 |
| **撤销 Bug** | ✅ 存在：跨视图历史污染 | ✅ 规避：无内置 undo |
| **持久化** | `DesignDraft` 混入 UI 状态 | 干净的 `dirty` + `isSaving` 标志 |
| **服务端适配** | 差（Fabric 内部格式、blob URL） | 好（纯原始类型，可直接序列化入库） |
| **图层重排** | 双写：需同时更新 Store + Fabric Canvas | 单写：Store 变更，Fabric 跟随渲染 |
| **框架耦合** | 强耦合 Fabric | 零耦合，可换任意渲染引擎 |
| **产品信息** | 无专属字段 | `productId`, `variantId`, `name` |
| **打印约束** | 无 | `ViewConstraints.printableArea` |
| **版本控制** | 无 | `document.version`，每次保存 +1 |

---

### 操作行为对比

#### 撤销/重做

**旧版**（有 Bug）：
```typescript
undo() {
  const previous = state.history.pop();
  state.future.unshift(state.canvas);
  state.canvas = previous;
  // ❌ 未更新 viewCanvases[currentView]
  // ❌ 历史栈无视图归属，可能恢复到错误视图
}
```

**新版**（无内置 undo）：
- 注释说明应由调用层维护每视图独立历史栈
- 实现思路：`Map<ViewId, Layer[][]>` 每视图独立快照栈

#### 图层重排

**旧版**（双写，易不同步）：
```typescript
bringToFront(layerId) {
  // 1. 更新 state.layers[] 顺序
  state.layers.splice(layerIndex, 1);
  state.layers.push(layer);
  // ❌ 未调用 canvas.bringObjectToFront()
  // 调用者必须额外手动同步 Fabric
}
```

**新版**（单写）：
```typescript
addLayer(viewId, layer)
updateLayer(viewId, layerId, patch)
removeLayer(viewId, layerId)
setViewLayers(viewId, layers)  // 可用于重排：传入重新排序的数组
// Store 更新 → 触发 React re-render → 调用层用 useEffect 同步 Fabric
```

#### 草稿加载

**旧版**（破坏多视图数据）：
```typescript
setDraft(draft) {
  state.canvas = draft.canvasSnapshot || defaultSnapshot;
  state.viewCanvases.front = draft.canvasSnapshot || defaultSnapshot;
  state.viewCanvases.back = { ...defaultSnapshot, objects: [] };   // ❌ 强制清空 back
  state.viewCanvases.sleeve = { ...defaultSnapshot, ... };          // ❌ 强制清空 sleeve
}
```

**新版**（完整多视图支持）：
```typescript
initializeDesign(productId, variantId, initialData?) {
  // initialData 可包含已有 views 数据
  // 每个视图独立初始化，不强制覆盖
}
```

---

### 数据库持久化适配性对比

| 场景 | 旧版快照（Fabric JSON） | 新版 Layer 数据 |
|------|------------------------|----------------|
| 存入数据库 | 差（含 Fabric 内部属性） | 好（纯 JSON 原始类型） |
| 跨设备恢复 | 差（blob: URL 跨会话失效） | 好（URL/text 均为可持久化字符串） |
| 版本迁移 | 难（Fabric 格式升级会 Break） | 易（自有数据结构，可控） |
| 服务端渲染 | 不可（浏览器 API 依赖） | 可（纯数据，服务端可处理） |
| 差异计算（diff） | 难（Fabric JSON 体积大） | 易（逐字段 diff） |

---

## 9. 已知 Bug 列表

### Bug #1：生产环境调试代码残留 【高优先级】

**位置**：`src/design/canvas/layers/productImageLayer.ts`

```typescript
const shouldShowCenterSquare = true  // ← 必须改为 false 或删除
```

**影响**：所有用户均会看到红色 50×50 调试方块和十字准线覆盖在 Canvas 中心。

**修复**：将 `true` 改为 `false`，或整体删除相关绘制代码。

---

### Bug #2：跨视图撤销污染 【高优先级】

**位置**：`src/contexts/designLabStore.ts` — `undo()` 方法

**问题**：
- 历史栈中的快照没有视图归属标记
- 在 Front 视图编辑后切换到 Back 视图，undo() 会把 Front 视图的历史恢复到 Back 视图的 canvas

**修复方案**：
```typescript
// 方案 A：历史记录携带视图信息
type HistoryEntry = { view: DesignView; snapshot: DesignCanvasSnapshot };
history: HistoryEntry[];

// 方案 B：每视图独立历史栈
viewHistories: Record<DesignView, DesignCanvasSnapshot[]>;
```

---

### Bug #3：图层重排双写不同步 【中优先级】

**位置**：`src/contexts/designLabStore.ts` — `bringToFront` / `sendToBack` / `moveLayer`

**问题**：以上操作只更新 `state.layers[]` 影子列表，不调用 Fabric Canvas 对应方法，导致视觉顺序与 Store 顺序不一致。

**修复**：调用层在调用 Store 方法后，必须同时调用：
```typescript
canvas.bringObjectToFront(fabricObject)
// 或
canvas.sendObjectToBack(fabricObject)
// 或
canvas.moveTo(fabricObject, newIndex)
```

---

### Bug #4：加载草稿时清空多视图数据 【中优先级】

**位置**：`src/contexts/designLabStore.ts` — `setDraft()`

**问题**：每次加载草稿都将 back 和 sleeve 视图重置为空，即使草稿中包含这些视图的数据。

**修复**：从草稿中提取各视图数据，不强制覆盖为空默认值。

---

### Bug #5：Canvas 尺寸三方不一致 【中优先级】

| 来源 | 尺寸 |
|------|------|
| Fabric Canvas 逻辑尺寸（CanvasEngine） | 4000×4800 |
| 旧版 Store 快照默认尺寸 | 500×600 |
| 新版 Store 默认 Canvas 尺寸 | 1200×1440 |

**问题**：快照序列化/反序列化时坐标体系不明确，可能导致恢复位置偏差。

**修复**：统一为 4000×4800（Fabric 逻辑坐标），所有快照和图层 transform 坐标均以此为基准。

---

## 10. 开发决策建议

### 关于两个 Store 的取舍

**推荐策略：渐进迁移**

1. **近期（修 Bug 阶段）**：继续使用旧版 `useDesignLabStore`，先修复上述 Bug #1-#4
2. **中期（重构阶段）**：将新版 `useDesignStore` 接入 DesignLabClient，用新版 Layer 数据驱动 Fabric
3. **最终架构**：
   - Store（`useDesignStore`）持有完整图层数据
   - Fabric Canvas 由 `useEffect` 响应 Store 变化自动同步
   - 撤销/重做在 Hook 层实现每视图独立历史栈

### 关于 Canvas 坐标系

**统一标准**：所有坐标以 Fabric 逻辑坐标 4000×4800 为准：
- 新增图层时，`transform.x/y` 使用 Fabric 坐标
- 存入数据库时，直接存 Fabric 坐标（无需转换）
- 快照 `canvasSize` 统一设为 `{ width: 4000, height: 4800 }`

### 关于多视图扩展

如需支持 left-sleeve / right-sleeve，迁移到新版 Store 时直接支持，无需改旧版代码。

### 关于撤销/重做

推荐实现方案：
```typescript
// 每视图独立历史栈 Hook
function useViewHistory(viewId: ViewId) {
  const [past, setPast] = useState<Layer[][]>([]);
  const [future, setFuture] = useState<Layer[][]>([]);
  
  const push = (layers: Layer[]) => {
    setPast(p => [...p.slice(-19), layers]);
    setFuture([]);
  };
  const undo = () => { /* pop past → push future → apply */ };
  const redo = () => { /* pop future → push past → apply */ };
  
  return { undo, redo, push, canUndo: past.length > 0, canRedo: future.length > 0 };
}
```

---

*文档结束。如有架构变更，请同步更新本文档。*
