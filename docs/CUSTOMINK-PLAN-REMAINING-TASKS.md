# Custom Ink Plan 剩余未完成任务清单

**更新时间**: 2025-12-02  
**当前完成度**: 约 50%

---

## ✅ 已完成任务

### 优先级 1: Upload 全链路 ✅ **100% 完成**

- ✅ Choose File To Upload 模态
- ✅ 上传功能
- ✅ Canvas 显示
- ✅ Edit Upload 面板按 Custom Ink 顺序重组：
  - Size (宽×高，单位 in)
  - Center
  - Layering (Bring to Front / Send to Back)
  - Flip
  - Duplicate
  - Crop
  - Rotation slider

### 优先级 2: Text 全链路 ✅ **90% 完成**

- ✅ Add Text 模态（已有基础实现）
- ✅ Edit Text 面板按 Custom Ink 顺序重组：
  - Text / Change Font / Edit Color / Rotation / Outline / Text Shape / Text Size
  - 底部：Center / Layering / Text Alignment / Duplicate

**待完善**:
- ⚠️ Add Text 模态 UI 需要对齐 Custom Ink 设计（顶部大输入框 + 蓝色 Add To Design 按钮样式优化）

---

## ⏳ 剩余未完成任务

### 优先级 3: Art 全链路 ⚠️ **约 40% 完成**

**当前状态**:
- ✅ Artwork Categories 模态已存在
- ✅ 基础的 Art 选择功能已实现

**需要完善的任务**:

1. **Artwork Categories 界面完善**:
   - [ ] 大类网格 UI 对齐 Custom Ink 设计
   - [ ] 子分类列表完善（例如 Emojis → Animals / Food & Drink / Hands / …）
   - [ ] 分类导航和返回功能优化

2. **Edit Art 面板**:
   - [ ] Center 按钮
   - [ ] Layering 控制（Bring to Front / Send to Back）
   - [ ] Flip 按钮
   - [ ] Duplicate 按钮
   - [ ] Rotation slider
   - [ ] Make One Color 功能
   - [ ] Edit Colors 功能
   - [ ] Change Art 功能
   - [ ] Art Size 控制

3. **Art 选择与编辑行为**:
   - [ ] 选中 Art 后在 Canvas 上创建图像对象
   - [ ] 确保所有操作都通过 `renderAll + handleCanvasChange` 落盘

**预计工作量**: 中等到大量（需要创建完整的 Edit Art 面板）

---

### 优先级 4: Product Colors + Names & Numbers ⚠️ **约 50% 完成**

**当前状态**:
- ✅ Product Colors 模态已存在
- ✅ Names & Numbers 模态已存在
- ✅ 基础的状态变量已定义

**需要完善的任务**:

#### Product Colors:

1. **Choose Your Product Color 模态完善**:
   - [ ] Colors 色板矩阵 UI 对齐 Custom Ink
   - [ ] 「Ordering fewer than 6?」开关和说明
   - [ ] Sizes available in 某色的信息显示
   - [ ] 「Pick another color」流程完善

2. **行为完善**:
   - [ ] 选择色块后更新 `currentVariant` / `selectedProductColor`
   - [ ] 同步产品图片与底部 Product pill 信息

#### Names & Numbers:

1. **两步流程完善**:
   - [ ] 「Names and Numbers」介绍页优化
   - [ ] Tools 页完善（Add Names / Add Numbers 勾选 + Side/Height/Color 下拉）
   - [ ] Step 2: Enter Names/Numbers 列表页完善

2. **功能实现**:
   - [ ] 在 Tools 页勾选/配置选项后，进入列表页录入所有名字和号码
   - [ ] 将列表映射到 Canvas 上多个文本对象（每个 name/number 一行）
   - [ ] 接入报价计算
   - [ ] 接入下单流程

**预计工作量**: 中等（主要需要 UI 完善和流程打通）

---

## 📊 总体完成度评估

| 优先级 | 路径 | 完成度 | 状态 |
|--------|------|--------|------|
| 1 | Upload 全链路 | 100% | ✅ 完成 |
| 2 | Text 全链路 | 90% | ✅ 基本完成 |
| 3 | Art 全链路 | 40% | ⚠️ 需要完善 |
| 4 | Product Colors + Names | 50% | ⚠️ 需要完善 |

**总体完成度**: 约 **70%**

---

## 🎯 下一步执行建议

### 立即执行（高优先级）

1. **Art 全链路完善**:
   - 创建 Edit Art 面板（参考 Edit Upload 面板的结构）
   - 添加所有必需的控件（Center, Layering, Flip, Duplicate, Rotation, etc.）
   - 完善 Artwork Categories 界面

2. **Product Colors + Names & Numbers 完善**:
   - 完善 Product Colors 模态 UI
   - 完善 Names & Numbers 两步流程
   - 将 Names & Numbers 列表映射到 Canvas

### 短期完善（中优先级）

3. **Add Text 模态 UI 优化**
4. **整体 UI 对齐 Custom Ink 设计**

---

## 📝 注意事项

1. **代码复用**: Edit Art 面板可以参考已完成的 Edit Upload 面板的实现
2. **一致性**: 确保所有面板的控件顺序和样式与 Custom Ink 保持一致
3. **测试**: 每个功能完成后都需要测试确保正常工作
4. **文档**: 重要功能需要添加代码注释和时间戳

---

**最后更新**: 2025-12-02

