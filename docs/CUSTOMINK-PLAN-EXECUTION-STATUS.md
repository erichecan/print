# Custom Ink Plan 执行状态

**创建时间**: 2025-12-02  
**状态**: 🚧 **进行中** - 开始执行 Upload 全链路完善

---

## 📋 执行计划概览

根据 `customink.plan.md` 的执行优先级，按照以下顺序执行：

### 优先级 1: Upload 全链路 ⚡ **当前进行中**

**目标**: 完善从左侧入口到 Choose File / 上传 / 在 Canvas 显示 / 基础 Edit Upload 控件这一整条路径

**当前状态**:
- ✅ Choose File 模态已实现
- ✅ 上传功能已实现
- ✅ Canvas 显示已实现
- ✅ 基础 Edit Image 面板已实现（包含 Opacity, Rotation, Position, Flip, Filters, Crop, Duplicate）

**需要添加/完善**:
- [ ] **Center 按钮**: 将当前选中对象居中到画布
- [ ] **Layering 控制**: Bring to Front / Send to Back 按钮（在 Edit Upload 面板中）
- [ ] **Size 显示**: 将宽度/高度显示改为英寸单位（DPI 转换）
- [ ] **控件顺序**: 按照 Custom Ink 的顺序重组 Edit Upload 面板控件

**预期顺序（参考 Custom Ink）**:
1. Size (宽×高，单位 in)
2. Center
3. Layering (Bring to Front / Send to Back)
4. Flip
5. Duplicate
6. Crop
7. Rotation slider

---

### 优先级 2: Text 全链路

**目标**: Add Text + Edit Text 的 UI 与行为完善

**待执行任务**:
- [ ] Add Text 模态 UI 对齐 Custom Ink（顶部大输入框 + 蓝色 Add To Design 按钮）
- [ ] Edit Text 字段顺序与 Custom Ink 一致（Text / Change Font / Edit Color / Rotation / Outline / Text Shape / Text Size / 底部 Center / Layering / Text Alignment / Duplicate）

---

### 优先级 3: Art 全链路

**目标**: 分类浏览 + 选择 + Edit Art 行为落到 Canvas

**待执行任务**:
- [ ] Artwork Categories 大类网格 UI
- [ ] 子分类列表
- [ ] Edit Art 面板（Center / Layering / Flip / Duplicate / Rotation slider / Make One Color / Edit Colors / Change Art / Art Size）

---

### 优先级 4: Product Colors + Names & Numbers

**目标**: 颜色选择影响产品 variant；Names & Numbers 完整两步流程打通

**待执行任务**:
- [ ] Choose Your Product Color 模态（Colors 色板矩阵）
- [ ] Names & Numbers 两步流程（介绍页 + Tools 页 + 列表页）
- [ ] 接入报价/下单

---

## 🎯 当前执行步骤

### 步骤 1: 添加辅助函数

在 `DesignLabClient.tsx` 中添加以下函数：

1. **handleCenterObject**: 将当前选中对象居中到画布
2. **handleBringActiveToFront**: 将当前选中对象置于最前（不需要 layerId）
3. **handleSendActiveToBack**: 将当前选中对象置于最后（不需要 layerId）
4. **pixelsToInches**: 像素转英寸的转换函数（假设 150 DPI）

### 步骤 2: 更新 Edit Image 面板

按照 Custom Ink 的顺序重新组织 Edit Upload 面板的控件顺序，并添加缺失的功能。

---

## 📊 完成度

- **Upload 全链路**: 80% → 目标 100%
- **Text 全链路**: 待开始
- **Art 全链路**: 待开始
- **Product Colors + Names & Numbers**: 待开始

---

---

## ✅ 已完成任务

### 优先级 1: Upload 全链路 ✅ **100% 完成**

**完成时间**: 2025-12-02

**已完成功能**:
1. ✅ 添加了 Center 功能（`handleCenterObject`）
2. ✅ 添加了 Layering 功能（`handleBringActiveToFront`, `handleSendActiveToBack`）
3. ✅ 添加了像素转英寸转换函数（`pixelsToInches`, `inchesToPixels`）
4. ✅ 更新了 Edit Image 面板标题为 "Edit Upload"
5. ✅ 按照 Custom Ink 顺序重新组织了 Edit Upload 面板：
   - 1. Size (宽×高，单位 in) ✅
   - 2. Center ✅
   - 3. Layering (Bring to Front / Send to Back) ✅
   - 4. Flip ✅
   - 5. Duplicate ✅
   - 6. Crop ✅
   - 7. Rotation slider ✅

**代码变更**:
- `apps/web/src/app/design-lab/DesignLabClient.tsx`:
  - 添加了辅助函数（约 50 行）
  - 重新组织了 Edit Upload 面板（约 200 行）

---

## 🚧 进行中任务

### 优先级 2: Text 全链路 ⚡ **进行中**

**当前状态**: Edit Text 面板已按照 Custom Ink 顺序重新组织

**已完成**:
- ✅ 按照 Custom Ink 顺序重新组织了 Edit Text 面板：
  - Text / Change Font / Edit Color / Rotation / Outline / Text Shape / Text Size / 底部 Center / Layering / Text Alignment / Duplicate
- ✅ Add Text 模态已有基础实现（包含输入框和 Add To Design 按钮）

---

---

## 📝 执行说明

### 执行策略

按照 Custom Ink Plan 的优先级顺序逐步执行：

1. ✅ **Upload 全链路** - 已完成
   - 按照 Custom Ink 要求重组了 Edit Upload 面板
   - 所有必需控件已实现并排序正确

2. 🚧 **Text 全链路** - 进行中
   - Edit Text 面板已有大部分功能
   - 需要按照 Custom Ink 顺序重新组织控件
   - Add Text 模态需要 UI 改进以对齐 Custom Ink 设计

3. ⏳ **Art 全链路** - 待执行
   - 需要实现 Artwork Categories 浏览界面
   - 需要完善 Edit Art 面板

4. ⏳ **Product Colors + Names & Numbers** - 待执行
   - 需要实现颜色选择模态
   - 需要实现 Names & Numbers 两步流程

---

**最后更新**: 2025-12-02
