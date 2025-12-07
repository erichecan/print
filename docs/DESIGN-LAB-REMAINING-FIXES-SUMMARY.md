# Design Lab 剩余问题修复总结

**修复时间**: 2025-12-06 12:40:00  
**修复范围**: Rail 按钮激活状态、handleToolClick 逻辑、测试辅助属性

---

## 已完成的修复

### 1. Rail 按钮激活状态修复 ✅

**问题**: 点击 Rail 按钮后，`is-active` 类未正确应用，或者样式被其他规则覆盖

**修复**:
- 在 `.dl-rail__btn.is-active` 中添加 `!important` 确保激活状态样式正确应用
- 为激活状态的标签添加样式规则，确保标签文本也变白
- 确保激活状态有蓝色左边框（3px solid）

**代码位置**: `apps/web/src/app/design-lab/design-lab.css`
- 第 328-336 行: `.dl-rail__btn.is-active` 样式
- 第 338-340 行: `.dl-rail__btn.is-active .dl-rail__btn-label` 样式

---

### 2. handleToolClick 逻辑修复 ✅

**问题**: `handleToolClick` 函数使用 `setActiveTool(activeTool === tool ? null : tool);`，导致点击同一个按钮会取消激活状态

**修复**:
- 修改逻辑为：如果点击的是当前激活的工具，保持激活状态（不取消）
- 如果点击的是其他工具，切换到新工具
- 确保按钮点击后始终处于激活状态

**代码位置**: `apps/web/src/app/design-lab/DesignLabClient.tsx`
- 第 706-734 行: `handleToolClick` 函数

**修复前**:
```typescript
const handleToolClick = (tool: string) => {
  setActiveTool(activeTool === tool ? null : tool); // 会取消激活
  // ...
};
```

**修复后**:
```typescript
const handleToolClick = (tool: string) => {
  // 如果点击的是当前激活的工具，保持激活状态（不取消）
  // 如果点击的是其他工具，切换到新工具
  if (activeTool !== tool) {
    setActiveTool(tool);
  }
  // 如果已经是激活状态，保持激活（不设置为 null）
  // ...
};
```

---

### 3. 测试辅助属性添加 ✅

**问题**: 测试选择器可能找不到特定元素，或者有多个匹配元素（strict mode violation）

**修复**:
- 为 UploadPanel 标题添加 `data-testid="upload-panel-title"`
- 为 ToolPanel 标题添加 `data-testid="tool-panel-title-{panelType}"`
- 为 NamesNumbersModal 标题添加 `data-testid="names-numbers-modal-title"`

**代码位置**:
- `apps/web/src/app/design-lab/components/panels/UploadPanel.tsx` 第 64 行
- `apps/web/src/app/design-lab/components/ToolPanel.tsx` 第 64 行
- `apps/web/src/app/design-lab/components/modals/NamesNumbersModal.tsx` 第 161 行

**使用示例**:
```typescript
// 测试中可以使用这些 data-testid 来精确定位元素
await expect(page.locator('[data-testid="upload-panel-title"]')).toBeVisible();
await expect(page.locator('[data-testid="tool-panel-title-text"]')).toHaveText('Add Text');
await expect(page.locator('[data-testid="names-numbers-modal-title"]')).toHaveText(/Names.*Numbers/);
```

---

## 修复效果

### 修复前
- Rail 按钮点击后可能取消激活状态
- 激活状态样式可能被其他规则覆盖
- 测试选择器可能找不到元素或有多匹配

### 修复后
- Rail 按钮点击后保持激活状态 ✅
- 激活状态样式正确应用（背景、颜色、边框） ✅
- 测试辅助属性已添加，便于精确定位元素 ✅

---

## 待修复问题（需要测试文件）

### P1 - 功能测试选择器问题
由于测试文件已被删除，以下问题需要在重新创建测试时修复：

1. **Upload 面板文本匹配**
   - 问题: 测试找不到 "Choose File To Upload" 文本
   - 解决: 使用 `data-testid="upload-panel-title"` 或更精确的选择器

2. **Text/Art 面板多匹配**
   - 问题: Rail 按钮和面板标题都有 "Add Text" 和 "Add Art" 文本
   - 解决: 使用 `data-testid="tool-panel-title-text"` 或 `data-testid="tool-panel-title-art"` 精确定位面板标题

3. **Names & Numbers 模态文本**
   - 问题: 测试找不到模态文本
   - 解决: 使用 `data-testid="names-numbers-modal-title"` 或正则表达式匹配

---

## 下一步

1. **重新创建测试文件** - 使用新的 `data-testid` 属性
2. **运行测试验证** - 确保所有修复生效
3. **优化测试选择器** - 使用 `data-testid` 替代文本匹配
4. **添加更多测试辅助属性** - 为其他关键元素添加 `data-testid`

---

**最后更新**: 2025-12-06 12:40:00

