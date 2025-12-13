# Design Lab Logo和本地保存功能 - 实现总结

**完成时间**: 2025-12-19 16:30:00

## 一、根因/现状说明

### 为什么之前没实现本地保存？

1. **后端保存设计**：之前使用 `designLabApi.createDraft/updateDraft` 保存到后端数据库
   - 问题：数据库会变大，需要用户登录才能保存
   - 位置：`apps/web/src/app/design-lab/DesignLabClient.tsx` 的 `handleSaveDesignConfirm` 函数

2. **Store没有持久化**：`designLabStore.ts` 使用 Zustand + Immer，但没有 persist 中间件
   - 问题：页面刷新后状态丢失
   - 位置：`apps/web/src/contexts/designLabStore.ts`

3. **My Designs按钮直接跳转**：点击"My Designs"直接跳转到 `/products`，没有保存逻辑
   - 位置：`apps/web/src/app/design-lab/DesignLabClient.tsx` (Line 3850)

4. **Logo是纯文字**：使用文字"Logo"而不是图片
   - 位置：`apps/web/src/app/design-lab/DesignLabClient.tsx` (Line 3844)

## 二、改动文件列表

### 新增文件
1. `apps/web/src/app/design-lab/utils/localStorage.ts` - 本地存储工具函数
2. `apps/web/tests/e2e/design-lab-logo-local-save.spec.ts` - Playwright测试用例
3. `docs/task-design-lab-logo-mydesigns-local-save.md` - 任务理解文档
4. `docs/design-lab-logo-local-save-implementation.md` - 实现总结文档（本文档）

### 修改文件
1. `apps/web/src/app/design-lab/DesignLabClient.tsx` - 主要修改
   - Logo替换为图片
   - 移除My Designs按钮
   - 添加自动恢复和自动保存逻辑

2. `apps/web/src/contexts/designLabStore.ts` - Store扩展
   - 添加 `setViewCanvases` 方法用于批量更新视图画布

## 三、关键 diff 摘要

### 1. Logo替换（DesignLabClient.tsx）
```diff
- <Link href="/" className="dl-header__logo">
-   Logo
- </Link>
+ <Link href="/" className="dl-header__logo" aria-label="Souvenir Plus Inc home" style={{ display: 'flex', alignItems: 'center' }}>
+   <Image src="/logo.png" alt="Souvenir Plus Inc" width={200} height={34} priority style={{ height: 'auto', width: 'auto', maxWidth: '200px' }} />
+ </Link>
```

### 2. 移除My Designs按钮（DesignLabClient.tsx）
```diff
- <button 
-   className="dl-header__breadcrumb-link dl-header__breadcrumb-link--button"
-   onClick={() => window.location.href = '/products'}
-   type="button"
- >
-   My Designs
- </button>
- <span className="dl-header__breadcrumb-separator"> &gt; </span>
```

### 3. 本地存储工具函数（新增文件：utils/localStorage.ts）
- `saveDesignToLocalStorage()` - 保存草稿到localStorage
- `loadDesignFromLocalStorage()` - 从localStorage读取草稿
- `clearDesignFromLocalStorage()` - 清除本地草稿

### 4. 自动恢复功能（DesignLabClient.tsx，约Line 3796-3859）
```typescript
useEffect(() => {
  if (!canvasInitialized || !fabricCanvasRef.current || !fabricRef.current) {
    return;
  }
  
  const restoreDraft = async () => {
    const draft = loadDesignFromLocalStorage();
    if (!draft) return;
    
    // 恢复设计名称、产品信息、视图画布
    setDesignName(draft.designName);
    setProductInfo(/* ... */);
    setViewCanvases(draft.viewCanvases);
    setView(draft.currentView);
    // 加载画布快照
  };
  
  setTimeout(restoreDraft, 500);
}, [canvasInitialized, ...]);
```

### 5. 自动保存功能（DesignLabClient.tsx，约Line 3861-3920）
```typescript
useEffect(() => {
  if (!canvasInitialized) return;
  
  const autoSave = () => {
    const currentSnapshot = canvasToSnapshot(fabricCanvasRef.current);
    const storeState = useDesignLabStore.getState();
    const updatedViewCanvases = {
      ...storeState.viewCanvases,
      [storeState.currentView]: currentSnapshot,
    };
    
    saveDesignToLocalStorage(designName, updatedViewCanvases, ...);
  };
  
  // 每30秒自动保存
  const autoSaveInterval = setInterval(autoSave, 30000);
  
  // 页面卸载前保存
  window.addEventListener('beforeunload', autoSave);
  
  return () => {
    clearInterval(autoSaveInterval);
    window.removeEventListener('beforeunload', autoSave);
    autoSave(); // 组件卸载时最后一次保存
  };
}, [canvasInitialized, ...]);
```

### 6. Store扩展（designLabStore.ts）
```diff
+ setViewCanvases: (viewCanvases: Record<DesignView, DesignCanvasSnapshot>) => void;
+
+ setViewCanvases: (viewCanvases) =>
+   set((state) => {
+     state.viewCanvases = viewCanvases;
+     state.canvas = viewCanvases[state.currentView];
+   }),
```

## 四、存储数据结构

### localStorage Key
`designLab:lastDraft`

### 数据结构
```typescript
interface LocalDesignDraft {
  designName: string;
  viewCanvases: {
    front: DesignCanvasSnapshot;
    back: DesignCanvasSnapshot;
    sleeve: DesignCanvasSnapshot;
  };
  currentView: 'front' | 'back' | 'sleeve';
  productInfo: {
    productId: string;
    productName: string;
    variantId: string;
    color: string;
  };
  savedAt: string; // ISO 8601格式
  version: string; // 当前版本：'1.0.0'
}
```

## 五、测试计划

### Chrome DevTools验证步骤
1. 打开Design Lab页面
2. 检查Logo是否为图片（Application → Elements）
3. 点击Logo，验证跳转到主站首页
4. 在Design Lab中添加一些设计元素
5. 等待30秒或刷新页面
6. 检查Application → Local Storage → `designLab:lastDraft`
7. 刷新页面，验证设计是否自动恢复

### Playwright测试用例
文件：`apps/web/tests/e2e/design-lab-logo-local-save.spec.ts`

测试覆盖：
1. Logo显示为图片
2. Logo点击跳转到主站
3. My Designs按钮不存在
4. 自动保存到localStorage
5. 草稿数据结构完整性
6. 页面加载时自动恢复草稿

## 六、已知限制和注意事项

1. **localStorage大小限制**：通常5-10MB，如果设计数据过大可能需要迁移到IndexedDB
2. **隐私模式**：某些浏览器的隐私模式可能限制localStorage，会提示错误并阻止跳转
3. **浏览器兼容性**：现代浏览器都支持localStorage，IE11及以下不支持
4. **数据清理**：用户清除浏览器数据会丢失草稿（这是预期的行为）

## 七、后续优化建议（可选）

1. **多草稿支持**：如果需要保存多个草稿，可以改为使用 `designLab:drafts:[timestamp]` 格式
2. **数据压缩**：如果数据过大，可以考虑使用LZ-String等库压缩JSON
3. **IndexedDB迁移**：如果localStorage不够用，可以迁移到IndexedDB
4. **导出/导入功能**：允许用户导出草稿为JSON文件，或从文件导入
