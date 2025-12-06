# Design Lab 需求文档与实现对比分析

**创建时间**: 2025-12-06 12:30:00  
**对比基准**: Custom Ink Design Lab 截图 + PRD 文档

---

## 1. PRD 需求摘要

根据 `docs/PRD.md`，Design Lab 的核心需求包括：

### 2.1.9 Design Lab (US-039 到 US-045)

- **US-039**: 作为用户，我可以在产品详情页启动 Design Lab 自定义设计 ✅
- **US-040**: 作为用户，我可以在画布上添加文字、图片、素材 ✅
- **US-041**: 作为用户，我可以切换产品颜色并在画布上预览 ✅
- **US-042**: 作为用户，我可以切换设计面（正面/背面/袖子） ✅
- **US-043**: 作为用户，我可以添加 Names and Numbers（名字和号码）定制 ✅
- **US-044**: 作为用户，我可以获取设计报价 ✅
- **US-045**: 作为用户，我可以保存设计草稿（Phase 1: localStorage，Phase 2: 云端保存） ⚠️ 部分完成

---

## 2. 功能对比分析

### 2.1 已实现的核心功能 ✅

#### 布局结构
- ✅ Header（顶部导航栏）
- ✅ Dark Rail（左侧深灰色工具栏，80px）
- ✅ Canvas（中央画布区域）
- ✅ Sidebar（右侧视图切换面板，120px）
- ✅ Bottom Bar（底部操作栏，80px）

#### 核心功能
- ✅ Upload（文件上传）
- ✅ Add Text（添加文字）
- ✅ Add Art（添加素材）
- ✅ Product Colors（产品颜色切换）
- ✅ Names & Numbers（名字和号码）
- ✅ Get Price（获取报价）
- ✅ Layer Management（图层管理）
- ✅ Multi-view Support（多视图支持：Front/Back/Sleeve）

#### 编辑面板
- ✅ Edit Upload Panel（编辑上传图片）
- ✅ Edit Text Panel（编辑文字）
- ✅ Edit Art Panel（编辑素材）

---

## 3. 与截图对比发现的差异

### 3.1 Header 区域差异 ⚠️

#### Custom Ink 要求（基于截图和 ELEMENT-INVENTORY.json）

| 元素 | 位置 | 尺寸 | 样式 | 颜色 |
|------|------|------|------|------|
| My Designs | x: 41, y: 0 | 116×32 | MuiButton-text | rgb(74, 74, 74) |
| Untitled design | x: 177, y: 0 | 139×32 | MuiButton-text | rgba(0, 0, 0, 0.57) |
| Talk to a Real Person | - | - | - | - |
| Chat with a Real Person | - | - | - | - |
| Sign In | - | - | - | - |
| Cart | - | - | - | - |

#### 当前实现状态

- ✅ **My Designs 按钮**: 已实现，样式基本匹配
- ✅ **Untitled design**: 已实现，可编辑设计名称
- ⚠️ **Talk to a Real Person**: **部分实现** - 有电话链接（📞 1-800-000-0000），但样式和位置可能不匹配 Custom Ink
- ⚠️ **Chat with a Real Person**: **部分实现** - 有 Chat 按钮，但样式和文字可能不匹配（应该是 "Chat with a Real Person" + "Chat Now"）
- ⚠️ **Sign In**: 已实现，但需要确认位置和样式是否匹配
- ❌ **Cart**: **未实现** - Header 右侧缺少购物车图标

**需要修复**:
- [ ] 优化 "Talk to a Real Person" 按钮样式（耳机图标 + 电话 "844-222-8343"）
- [ ] 优化 "Chat with a Real Person" 按钮样式（聊天气泡图标 + "Chat Now"）
- [ ] 添加购物车图标到 Header 右侧
- [ ] 确认 Sign In 的位置和样式是否匹配

---

### 3.2 Bottom Bar 区域差异 ⚠️

#### Custom Ink 要求（基于截图）

| 元素 | 位置 | 尺寸 | 样式 | 说明 |
|------|------|------|------|------|
| Add Products | x: 16, y: 656 | 167×48 | MuiButton-outlined | 蓝色边框，白色背景 |
| Change Product | x: 478, y: 658 | 101×18 | MuiLink | 蓝色链接 |
| Change Color | x: 357, y: 682 | 86×18 | MuiLink | 蓝色链接 |
| Save \| Share | x: 946, y: 656 | 157×48 | MuiButton-outlined | 蓝色边框，白色背景 |
| Get Price | x: 1119, y: 656 | 130×48 | MuiButton-contained | 蓝色背景，白色文字 |

#### 当前实现状态

- ⚠️ **Add Products 按钮**: **已存在但功能未实现** - 按钮已添加（`dl-bottom-bar__add-products`），但点击后没有功能
- ✅ **Change Product**: 已实现，链接样式
- ✅ **Change Color**: 已实现，链接样式
- ⚠️ **Save \| Share**: 已实现，但功能不完整（可能只是占位）
- ✅ **Get Price**: 已实现，功能完整

**需要修复**:
- [ ] 实现 "Add Products" 按钮的点击功能（打开产品选择器）
- [ ] 确认 "Save \| Share" 按钮的实际功能（保存到云端？分享链接？）
- [ ] 确认按钮位置和尺寸是否精确匹配

---

### 3.3 My Designs 功能缺失 ❌

#### Custom Ink 功能

根据 PRD 和截图分析，Custom Ink 的 "My Designs" 按钮应该：
1. 打开一个模态框或侧边栏
2. 显示用户保存的所有设计列表
3. 允许用户选择并加载已保存的设计
4. 显示设计的缩略图、名称、创建时间等

#### 当前实现状态

- ⚠️ **My Designs 按钮**: 已存在，但**功能未实现**
- ❌ **设计列表**: **未实现** - 没有显示已保存设计的列表
- ❌ **加载设计**: **未实现** - 无法从列表中选择并加载设计
- ❌ **设计缩略图**: **未实现** - 没有显示设计预览图

**需要实现**:
- [ ] 创建 "My Designs" 模态框或侧边栏组件
- [ ] 实现从后端 API 获取用户设计列表（`GET /api/user/designs`）
- [ ] 显示设计列表，包括缩略图、名称、创建时间
- [ ] 实现点击设计后加载到画布的功能
- [ ] 支持从 URL 参数加载设计（`?designId=xxx`）

**相关 PRD 说明**:
- PRD Section 5.3.2: "Create 'Load Design' functionality that fetches from `/api/designs/:id`"
- PRD Section 5.3.2: "Add 'My Designs' panel UI component"
- PRD Section 5.3.2: "Integrate with `/api/user/designs` API to list user's designs"

---

### 3.4 Save \| Share 功能不完整 ⚠️

#### Custom Ink 功能

"Save \| Share" 按钮应该：
1. **Save**: 保存设计到云端（如果已登录）或 localStorage（如果未登录）
2. **Share**: 生成分享链接，允许其他人查看或编辑设计

#### 当前实现状态

- ⚠️ **Save 功能**: 部分实现
  - ✅ 自动保存到 localStorage
  - ✅ Get Price 时自动保存到后端
  - ❌ **Save 按钮点击**: 当前可能只是下载 JSON/PNG 文件，没有保存到云端
- ❌ **Share 功能**: **未实现** - 没有生成分享链接的功能

**需要实现**:
- [ ] 实现 Save 按钮点击时保存到后端 API（如果已登录）
- [ ] 实现 Share 功能：生成分享链接
- [ ] 实现分享链接的访问和加载功能

**相关 PRD 说明**:
- PRD Section 5.4.3: "Save button does NOT save to backend (only downloads files)"
- PRD Section 5.3.2: "Enhance `saveDesign()` to also save to backend"

---

### 3.5 视觉样式差异 ⚠️

#### 颜色方案

| 颜色用途 | Custom Ink 值 | 当前实现 | 状态 |
|---------|--------------|----------|------|
| Rail 背景色 | rgb(34, 32, 32) | #2C2C2C | ⚠️ 需要确认是否一致 |
| Rail 按钮文本色 | rgb(191, 191, 191) | rgba(255, 255, 255, 0.7) | ❌ 需要改为 rgb(191, 191, 191) |
| 主按钮色 | rgb(30, 57, 210) | #0066CC | ⚠️ 需要确认是否一致 |

**需要修复**:
- [ ] 确认 Rail 背景色是否与 rgb(34, 32, 32) 一致
- [ ] 将 Rail 按钮文本色改为 rgb(191, 191, 191)
- [ ] 确认主按钮色是否与 rgb(30, 57, 210) 一致

#### 按钮位置和尺寸

根据 ELEMENT-INVENTORY.json，需要确认：
- [ ] Rail 按钮的精确位置（x, y 坐标）
- [ ] Bottom Bar 按钮的精确位置（x, y 坐标）
- [ ] Sidebar 按钮的精确位置（x, y 坐标）

---

## 4. 缺失的功能清单

### 4.1 高优先级（必须实现）🔴

1. **My Designs 功能**
   - [ ] My Designs 模态框/侧边栏组件
   - [ ] 设计列表显示（缩略图、名称、时间）
   - [ ] 从列表加载设计到画布
   - [ ] 支持 URL 参数加载（`?designId=xxx`）

2. **Save \| Share 功能完善**
   - [ ] Save 按钮保存到后端 API
   - [ ] Share 功能：生成分享链接
   - [ ] 分享链接的访问和加载

3. **Header 右侧功能**
   - [ ] "Talk to a Real Person" 按钮
   - [ ] "Chat with a Real Person" 按钮
   - [ ] 确认 Sign In 和 Cart 的位置

4. **Bottom Bar 左侧功能**
   - [ ] "Add Products" 按钮
   - [ ] 按钮功能和交互

### 4.2 中优先级（应该实现）🟡

5. **视觉样式精确匹配**
   - [ ] Rail 按钮文本色改为 rgb(191, 191, 191)
   - [ ] 确认所有颜色值是否精确匹配
   - [ ] 确认按钮位置和尺寸是否精确匹配

6. **交互细节优化**
   - [ ] 面板切换动画（如果需要）
   - [ ] 模态框动画（如果需要）
   - [ ] 按钮悬停和激活状态精确匹配

### 4.3 低优先级（可选实现）🟢

7. **高级功能**
   - [ ] 文本格式化（粗体、斜体、下划线）
   - [ ] 渐变填充
   - [ ] 元素分组/取消分组
   - [ ] 键盘快捷键
   - [ ] 工具提示

---

## 5. 实现与截图不一致的地方

### 5.1 Header 区域

**不一致点**:
1. ❌ 缺少 "Talk to a Real Person" 按钮
2. ❌ 缺少 "Chat with a Real Person" 按钮
3. ⚠️ Sign In 和 Cart 的位置可能不匹配

### 5.2 Bottom Bar 区域

**不一致点**:
1. ⚠️ "Add Products" 按钮已存在但功能未实现（需要添加点击处理）
2. ⚠️ "Save \| Share" 按钮功能可能不完整（需要确认实际功能）

### 5.3 My Designs 功能

**不一致点**:
1. ❌ "My Designs" 按钮存在但功能未实现
2. ❌ 点击后没有显示设计列表
3. ❌ 无法加载已保存的设计

### 5.4 视觉样式

**不一致点**:
1. ⚠️ Rail 按钮文本色：当前 rgba(255, 255, 255, 0.7)，应该是 rgb(191, 191, 191)
2. ⚠️ 按钮位置可能不完全精确（需要根据 ELEMENT-INVENTORY.json 调整）

---

## 6. 建议的修复优先级

### 立即修复（P0）

1. **My Designs 功能实现**
   - 这是 PRD 中明确要求的功能（US-045 Phase 2）
   - 用户期望的核心功能之一

2. **Save \| Share 功能完善**
   - Save 按钮应该保存到后端
   - Share 功能是重要的用户需求

3. **Add Products 按钮**
   - 底部操作栏的完整功能
   - 与 Custom Ink 保持一致

### 短期修复（P1）

4. **Header 右侧功能**
   - 客服联系选项
   - 提升用户体验

5. **视觉样式精确匹配**
   - 颜色、位置、尺寸的精确对齐

### 长期优化（P2）

6. **高级功能**
   - 文本格式化
   - 渐变填充
   - 键盘快捷键

---

## 7. 相关文档参考

- **PRD**: `docs/PRD.md` - Section 2.1.9 Design Lab
- **PRD**: `docs/PRD.md` - Section 5 Design Lab Data Persistence Strategy
- **对比清单**: `docs/DESIGN-LAB-CUSTOMINK-COMPARISON-CHECKLIST.md`
- **Gap 分析**: `docs/DESIGN-LAB-GAP-ANALYSIS.md`
- **竞品分析**: `docs/COMPETITOR-ANALYSIS-DESIGN-LAB.md`
- **截图目录**: `docs/customink-analysis/screenshots/interactions/`

---

## 8. 总结

### 当前完成度

- **核心功能**: ~90% ✅
- **视觉样式**: ~85% ⚠️
- **完整功能**: ~80% ⚠️

### 主要缺失

1. **My Designs 功能** - 完全缺失
2. **Save \| Share 功能** - 部分缺失
3. **Add Products 按钮** - 完全缺失
4. **Header 右侧功能** - 部分缺失

### 下一步行动

1. **立即**: 实现 My Designs 功能
2. **立即**: 完善 Save \| Share 功能
3. **短期**: 添加 Add Products 按钮
4. **短期**: 添加 Header 右侧功能
5. **长期**: 视觉样式精确匹配

---

**最后更新**: 2025-12-06 12:30:00

