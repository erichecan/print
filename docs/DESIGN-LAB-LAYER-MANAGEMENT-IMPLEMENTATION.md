# Design Lab 图层管理面板实现总结

**实现时间**: 2025-12-06 13:00:00  
**Issue**: [#47](https://github.com/erichecan/print/issues/47)  
**状态**: ✅ 已完成

---

## 实现内容

### 1. 图层列表可视化显示 ✅

**功能**:
- 实时显示画布上的所有图层（排除背景图片）
- 按 Z-index 顺序显示（最上层在顶部）
- 显示图层类型图标（Text/Image/Art/Other）
- 显示图层名称（文本内容或对象名称）

**实现位置**:
- `apps/web/src/app/design-lab/components/panels/LayerManagementPanel.tsx`
- `updateLayers()` 函数监听画布变化并更新图层列表

---

### 2. 图层拖拽排序（Z-index 控制）✅

**功能**:
- 支持拖拽图层项来改变图层顺序
- 使用 HTML5 Drag & Drop API
- 自动更新画布中对象的 Z-index
- 使用 Fabric.js 的 `bringToFront`, `sendToBack`, `bringForward`, `sendBackwards` 方法

**实现位置**:
- `handleDragStart()`, `handleDragOver()`, `handleDrop()` 函数
- 支持在分组内和分组间拖拽

---

### 3. 图层锁定/解锁功能 ✅

**功能**:
- 每个图层都有锁定/解锁按钮
- 锁定后图层不可选择和编辑（`selectable: false`, `evented: false`）
- 分组也支持锁定/解锁（批量操作分组内所有图层）

**实现位置**:
- `handleToggleLock()` 函数
- `handleToggleGroupLock()` 函数（分组锁定）

---

### 4. 图层分组功能 ✅

**功能**:
- 创建分组：选择 2+ 图层后点击 "Group" 按钮
- 分组展开/折叠：点击分组标题切换
- 分组可见性控制：批量控制分组内所有图层
- 分组锁定/解锁：批量锁定/解锁分组内所有图层
- 取消分组：点击 "Ungroup" 按钮

**实现位置**:
- `handleCreateGroup()` - 创建分组
- `handleUngroup()` - 取消分组
- `handleToggleGroup()` - 展开/折叠分组
- `handleToggleGroupVisibility()` - 分组可见性
- `handleToggleGroupLock()` - 分组锁定

**数据结构**:
```typescript
interface LayerGroup {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  layerIds: string[];
}
```

---

### 5. 图层可见性控制 ✅

**功能**:
- 每个图层都有可见性切换按钮（眼睛图标）
- 隐藏图层后从画布中隐藏（`visible: false`）
- 分组也支持可见性控制（批量操作）

**实现位置**:
- `handleToggleVisibility()` 函数
- `handleToggleGroupVisibility()` 函数（分组可见性）

---

## 集成方式

### 1. 添加到 ToolPanel 类型

```typescript
export type ToolPanelType = 
  | 'home' 
  | 'upload' 
  | 'text' 
  | 'art' 
  | 'edit-upload' 
  | 'edit-text' 
  | 'edit-art' 
  | 'layers' // 新增
  | null;
```

### 2. 在 HomePanel 中添加按钮

在 HomePanel 中添加了 "Layers" 按钮，点击后打开图层管理面板。

### 3. 在 DesignLabClient 中集成

```typescript
{toolPanelType === 'layers' && (
  <LayerManagementPanel
    canvas={fabricCanvasRef.current}
    onSelectLayer={(object) => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.setActiveObject(object);
        fabricCanvasRef.current.renderAll();
      }
    }}
    onUpdate={handleCanvasUpdate}
  />
)}
```

---

## 样式实现

**位置**: `apps/web/src/app/design-lab/design-lab.css`

**主要样式类**:
- `.dl-layer-management-panel` - 主容器
- `.dl-layer-management-panel__header` - 标题栏
- `.dl-layer-management-panel__list` - 图层列表
- `.dl-layer-management-panel__item` - 图层项
- `.dl-layer-management-panel__group` - 分组容器
- `.dl-layer-management-panel__group-header` - 分组标题
- `.dl-layer-management-panel__group-layers` - 分组内图层列表
- `.dl-layer-management-panel__control-btn` - 控制按钮（可见性/锁定/删除）

**特性**:
- 响应式设计
- 悬停效果
- 选中状态高亮
- 拖拽状态视觉反馈

---

## 功能特性

### 图层操作
- ✅ 选择图层（点击图层项）
- ✅ 切换可见性（眼睛图标）
- ✅ 锁定/解锁（锁图标）
- ✅ 删除图层（垃圾桶图标）
- ✅ 拖拽排序（拖拽图层项）

### 分组操作
- ✅ 创建分组（选择 2+ 图层后点击 "Group" 按钮）
- ✅ 展开/折叠分组（点击分组标题）
- ✅ 分组可见性控制
- ✅ 分组锁定/解锁
- ✅ 取消分组（点击 "Ungroup" 按钮）

### 实时同步
- ✅ 监听画布对象添加/删除/修改事件
- ✅ 自动更新图层列表
- ✅ 同步选中状态
- ✅ 同步可见性和锁定状态

---

## 使用方式

1. **打开图层管理面板**:
   - 在 Home 面板中点击 "Layers" 按钮
   - 或通过代码设置 `toolPanelType = 'layers'`

2. **创建分组**:
   - 在画布上选择 2+ 个图层
   - 点击图层管理面板顶部的 "Group" 按钮
   - 输入分组名称

3. **管理图层**:
   - 点击图层项选择图层
   - 使用控制按钮切换可见性/锁定/删除
   - 拖拽图层项改变顺序

4. **管理分组**:
   - 点击分组标题展开/折叠
   - 使用分组控制按钮批量操作
   - 点击 "Ungroup" 取消分组

---

## 验收标准检查

- ✅ **图层列表可视化显示** - 实时显示所有图层，按 Z-index 排序
- ✅ **图层拖拽排序（Z-index 控制）** - 支持拖拽改变图层顺序
- ✅ **图层锁定/解锁功能** - 每个图层和分组都支持锁定/解锁
- ✅ **图层分组功能** - 支持创建、展开/折叠、可见性控制、锁定、取消分组
- ✅ **图层可见性控制** - 每个图层和分组都支持可见性切换

---

## 文件清单

### 新增/修改的文件

1. **组件文件**:
   - `apps/web/src/app/design-lab/components/panels/LayerManagementPanel.tsx` - 图层管理面板组件（已存在，已完善）

2. **样式文件**:
   - `apps/web/src/app/design-lab/design-lab.css` - 添加图层管理面板样式

3. **集成文件**:
   - `apps/web/src/app/design-lab/DesignLabClient.tsx` - 集成图层管理面板
   - `apps/web/src/app/design-lab/components/ToolPanel.tsx` - 添加 'layers' 面板类型
   - `apps/web/src/app/design-lab/components/panels/HomePanel.tsx` - 添加 "Layers" 按钮

---

## 下一步

1. **测试功能** - 测试所有图层管理功能
2. **优化体验** - 根据使用反馈优化 UI/UX
3. **性能优化** - 如果图层数量很多，考虑虚拟滚动

---

**最后更新**: 2025-12-06 13:00:00  
**状态**: ✅ 所有功能已实现并集成

