# Design Lab 5.0 - 功能 3: Rail 按钮交互和 ToolPanel 面板切换

**创建时间**: 2025-12-20 03:10:00  
**状态**: ✅ 已完成  
**优先级**: 3

---

## 一、功能描述

实现 Rail（第一列）按钮的点击交互和 ToolPanel（第二列）面板切换功能。用户点击 Rail 中的 Upload/Text/Art 按钮时：

1. Rail 按钮变为激活状态（视觉反馈）
2. ToolPanel 切换到对应的面板（Upload/Text/Art）
3. 再次点击已激活的按钮，切换回 home 面板
4. 各面板提供 Back 按钮返回 home 面板

---

## 二、实现内容

### 2.1 状态管理

- ✅ `activeTool` state：当前激活的工具（'upload' | 'text' | 'art' | null）
- ✅ `toolPanelType` state：当前 ToolPanel 面板类型（'home' | 'upload' | 'text' | 'art' | null）

### 2.2 交互逻辑

- ✅ `handleToolClick` 函数：处理 Rail 按钮点击
  - 如果点击的是已激活的工具，切换回 home
  - 如果点击的是其他工具，切换到新工具
- ✅ `handleBackToHome` 函数：返回 home 面板

### 2.3 UI 更新

- ✅ Rail 按钮添加 `is-active` class（基于 `activeTool`）
- ✅ Rail 按钮添加 `aria-pressed` 属性（可访问性）
- ✅ ToolPanel 根据 `toolPanelType` 条件渲染不同面板
- ✅ 各面板提供 Back 按钮

---

## 三、技术实现

### 3.1 状态定义

```typescript
type ToolPanelType = 'home' | 'upload' | 'text' | 'art' | null;
const [toolPanelType, setToolPanelType] = useState<ToolPanelType>('home');
const [activeTool, setActiveTool] = useState<string | null>(null);
```

### 3.2 按钮点击处理

```typescript
const handleToolClick = (tool: 'upload' | 'text' | 'art') => {
  // 如果点击的是已激活的工具，切换回 home
  if (activeTool === tool) {
    setActiveTool(null);
    setToolPanelType('home');
  } else {
    // 切换到新工具
    setActiveTool(tool);
    setToolPanelType(tool);
  }
};
```

### 3.3 Rail 按钮渲染

```tsx
<button 
  className={`dl-rail__btn ${activeTool === 'upload' ? 'is-active' : ''}`}
  onClick={() => handleToolClick('upload')}
  aria-pressed={activeTool === 'upload'}
>
  {/* 按钮内容 */}
</button>
```

### 3.4 ToolPanel 条件渲染

```tsx
{toolPanelType && (
  <aside className="dl-tool-panel">
    {toolPanelType === 'home' && <HomePanel />}
    {toolPanelType === 'upload' && <UploadPanel />}
    {toolPanelType === 'text' && <TextPanel />}
    {toolPanelType === 'art' && <ArtPanel />}
  </aside>
)}
```

---

## 四、测试验证

### 4.1 功能测试

1. **点击 Upload 按钮**
   - ✅ Rail 的 Upload 按钮变为激活状态（`is-active` class）
   - ✅ ToolPanel 切换到 "Choose File To Upload" 面板
   - ✅ 控制台输出切换日志

2. **再次点击 Upload 按钮**
   - ✅ Upload 按钮取消激活状态
   - ✅ ToolPanel 切换回 home 面板

3. **点击 Text 按钮**
   - ✅ Rail 的 Text 按钮变为激活状态
   - ✅ Upload 按钮取消激活状态
   - ✅ ToolPanel 切换到 "Add Text" 面板

4. **点击 Back 按钮**
   - ✅ ToolPanel 切换回 home 面板
   - ✅ Rail 按钮取消激活状态

### 4.2 调试日志

打开浏览器控制台（F12），应该能看到：
```
[DesignLab 5.0] 功能3 - Rail 按钮点击: { tool: 'upload', previousTool: null }
[DesignLab 5.0] 功能3 - 切换到面板: upload
```

---

## 五、当前面板内容

### 5.1 Home 面板
- ✅ "What's next for you?" 标题
- ✅ Upload/Text/Art 按钮（点击后切换到对应面板）
- ✅ "Drag & drop a file anywhere to upload" 提示

### 5.2 Upload 面板
- ✅ "Choose File To Upload" 标题
- ✅ Back 按钮
- ⚠️ 占位内容："5.0 版本：Upload 功能待实现"

### 5.3 Text 面板
- ✅ "Add Text" 标题
- ✅ Back 按钮
- ⚠️ 占位内容："5.0 版本：Add Text 功能待实现"

### 5.4 Art 面板
- ✅ "Add Art" 标题
- ✅ Back 按钮
- ⚠️ 占位内容："5.0 版本：Add Art 功能待实现"

---

## 六、后续优化

- [ ] 实现 Upload 面板的实际功能
- [ ] 实现 Text 面板的实际功能
- [ ] 实现 Art 面板的实际功能
- [ ] 添加面板切换过渡动画
- [ ] 支持键盘快捷键切换面板

---

**下一步**: 根据用户需求继续叠加其他功能
