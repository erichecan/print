# PRD：可印刷区域标定与 Design Lab 适配系统

**版本**：1.0  
**日期**：2026-06-04  
**状态**：已确认，待开发

---

## 一、背景与目标

管理员需要对每款服装（男款 T-shirt、女款 T-shirt、Hoodie 等）实测可印刷区域，将实测结果固定为系统参数，确保：

1. 标定工具和 Design Lab 显示同一张底图，标定结果直接生效
2. 用户在 Design Lab 添加设计时，自动适配到正确的印刷范围
3. 生产单上标注印刷区域的物理尺寸，供美工输出文件时参考

---

## 二、功能模块

### 模块 A：标定工具 — 仅允许移动，禁止调整尺寸

**当前状态**：标定工具的印刷框可以拖动移动，也可以拖动角点调整大小。  
**目标状态**：完全禁用调整大小功能，印刷框只能整体移动位置。

**实现要点**：
- 移除 `PrintableAreaCalibrator` 组件中四个角点（resize handle）的拖动事件
- 保留整体拖动（move）逻辑不变
- 印刷框的宽高由产品 `printableArea` 数据决定，标定工具只写入 `x, y`，不修改 `width, height`
- 若产品尚未有 `printableArea` 数据，初始化时使用该 garment type 对应的模板默认值（`PRINTABLE_AREA_TEMPLATES`）

**尺寸录入方式**（独立于标定工具之外）：
- 宽高只能通过产品管理页（Product Wizard）或直接修改模板默认值来设定
- 标定工具界面可以只读显示当前宽高（画布像素 + 英寸换算），不提供编辑入口

---

### 模块 B：底图对齐 — 标定工具与 Design Lab 使用相同图片

**当前状态**：已完成 ✅

- 标定工具改为使用 `product.images`（按 `sortOrder` 升序），与 Design Lab 的 `baseImages` 来源完全一致
- 索引映射：`front=images[0]`，`back=images[1]`，`left-sleeve=images[3]`，`right-sleeve=images[4]`

---

### 模块 C：Design Lab — 新增元素自动适配印刷区域

**目标**：用户在 Design Lab 添加文字、artwork 或上传图片时，元素默认缩放至适配当前视图的可印刷区域，不以原始像素尺寸出现。

**行为规格**：

| 元素类型 | 初始大小规则 |
|----------|-------------|
| 上传图片 | 等比缩放，使较长边 = 印刷区域较长边的 80%，居中放置 |
| Artwork / SVG | 等比缩放，使较长边 = 印刷区域较长边的 60%，居中放置 |
| 文字 | 初始字号使印刷区域宽度能容纳约 8–10 个字，居中放置 |

- 缩放后位置：水平居中、垂直居中于印刷区域
- 用户添加后仍可自由移动、缩放、旋转
- 若印刷区域数据缺失，回退到当前行为（以固定初始大小添加）

---

### 模块 D：生产单 — 标注印刷区域物理尺寸

**目标**：生产单（`/admin/online-orders/[id]/gang-sheet`）在每个印刷位置的标签行，显示该位置对应的印刷区域物理尺寸（英寸）。

**计算方式**：

```
物理尺寸 (inch) = 画布像素数 ÷ 150
```

- 画布坐标系：1200 × 1440 像素
- 150 DPI 下：1200px = 8 inch，1440px = 9.6 inch
- 示例：印刷区域宽 546px → 546 ÷ 150 = **3.64 inch**

**显示规格**：
- 位置：每个印刷位置的标签行，紧跟位置名称（如"正面"）
- 格式：`X.X" × Y.Y"`（保留一位小数）
- 数据来源：`pos.widthCm` / `pos.heightCm` 字段（已在 gang-sheet 模型中存在）
  - 注意：字段名为 `widthCm` / `heightCm`，但当单位为英寸时，显示标签应改为 `in`，或统一改为 `widthIn` / `heightIn`（需在存储时统一单位）
- 数值写入时机：Design Lab 导出 `printSpecs` 时，根据用户最终放置的设计元素尺寸（画布像素）÷ 150 计算并写入

**当前字段状态**：`pos.widthCm` / `pos.heightCm` 已在 gang-sheet 页面引用，但数值是否已被 Design Lab 写入待验证。

---

## 三、数据流梳理

```
管理员实测服装尺寸
       ↓
录入 printableArea.{position}.{width, height}（画布像素）
（通过 Product Wizard 或直接设模板默认值，不通过标定工具）
       ↓
标定工具：仅调整 x, y 位置 → 保存到 printableArea.{position}.{x, y}
       ↓
Design Lab 读取 printableArea → 显示印刷框
       ↓
用户添加元素 → 自动适配印刷区域大小 → 用户可再调整
       ↓
用户提交订单 → Design Lab 导出 printSpecs.positions[i]
    包含：artworkImageUrl, mockupImageUrl, widthIn, heightIn（÷150 计算）
       ↓
生产单：显示 widthIn × heightIn，供美工参考输出尺寸
```

---

## 四、不在本期范围内

- Design Lab 实时向用户显示 DPI 尺寸（用户不需要）
- 多尺码/多颜色的印刷区域差异（同款视为相同）
- 自动生成实际打印文件（仍由美工手工处理）

---

## 五、实测尺寸（已确认）

| 服装类型 | GarmentType | 印刷面 | 物理宽 | 物理高 | 画布像素（1200×1440） |
|----------|------------|--------|--------|--------|----------------------|
| 男款 T-Shirt L码 | `tshirt` | 正面 / 背面 | 16 inch | 22 inch | 546 × 960 px |
| 女款 T-Shirt L码 | `tshirt_women` | 正面 / 背面 | 15 inch | 20 inch | 512 × 872 px |
| Hoodie | `hoodie` | 待测量 | — | — | 500 × 820 px（暂用模板） |

**画布像素换算说明**：以男款为基准（546px=16", 960px=22"），得到比例系数 34.1px/inch（横）、43.6px/inch（纵）。女款：15×34.1≈512px，20×43.6≈872px。

**物理尺寸存储位置**：`printable-area-templates.ts` → `AreaConfig.physicalWidthIn / physicalHeightIn`（已写入）。

**生产单显示规则**：gang sheet 展示该位置的 `physicalWidthIn × physicalHeightIn`（固定印刷区域尺寸），不随用户实际放置的设计元素变化。字段命名统一改为 `widthIn` / `heightIn`（原 `widthCm` 字段名存在误导，一并修正）。

---

## 六、开发优先级

| 优先级 | 模块 | 预估复杂度 |
|--------|------|-----------|
| P0 | 模块 A：标定工具禁止 resize | 低（改 UI 组件） |
| P1 | 模块 C：Design Lab 新增元素自动适配 | 中（改添加元素逻辑） |
| P2 | 模块 D：生产单显示物理尺寸 | 低（改 gang-sheet 显示 + Design Lab 写入） |
| 已完成 | 模块 B：底图对齐 | — |
