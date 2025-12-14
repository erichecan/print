# Design Lab 4.0 阶段2：更新为 contain 策略

**更新时间**: 2025-12-20 01:10:00  
**需求**: 
1. 图片不裁剪，完整显示（使用 contain 策略）
2. 虚线边框区域（安全区域）扩大到和绿色区域一样大小

**状态**: ✅ 已完成 contain 策略，虚线边框区域需要进一步确认

---

## 一、修改内容

### 1.1 图片填充策略改为 contain

**文件**: `apps/web/src/design/canvas/layers/productImageLayer.ts`

**修改**: `applyCoverCentered()` 函数

**关键改动**:
1. ✅ 添加 `fitMode` 参数，支持 `'contain' | 'cover'`
2. ✅ 默认使用 `contain` 策略（不裁剪图片）
3. ✅ `contain`: 使用 `Math.min(scaleX, scaleY)` - 完整显示，可能有留白
4. ✅ `cover`: 使用 `Math.max(scaleX, scaleY)` - 填满区域，可能裁剪

**代码**:
```typescript
const scale = fitMode === 'contain' 
  ? Math.min(scaleX, scaleY) // contain: 使用较小值，完整显示
  : Math.max(scaleX, scaleY); // cover: 使用较大值，填满区域
```

### 1.2 更新所有调用处

**已更新 3 处调用**，都添加了 `fitMode: 'contain'` 参数：
1. `loadProductImageLayer()` - 现有图片重新布局
2. `loadProductImageLayer()` - 新图片首次布局
3. `loadProductImageLayer()` - 最终布局保证

---

## 二、虚线边框区域（安全区域）

### 2.1 当前状态

用户提到有虚线边框区域，需要扩大到和绿色区域一样大小。

**可能的位置**:
- 可能在 Fabric Canvas 上绘制的安全区域矩形
- 可能在 CSS 中定义的元素边框
- 可能是调试用的基准线

### 2.2 需要确认

1. 虚线边框的具体位置（Fabric Canvas 对象还是 CSS 边框）
2. 虚线边框的绘制代码位置
3. 安全区域的计算逻辑

### 2.3 下一步

需要进一步确认虚线边框的具体实现方式，然后：
- 如果是在 Fabric Canvas 上绘制的矩形，修改其尺寸为 section 的实际尺寸
- 如果是在 CSS 中定义的边框，修改其尺寸或移除

---

## 三、验证方法

### 3.1 验证 contain 策略

1. **重新加载页面**: `http://localhost:3000/design-lab`
2. **检查控制台日志**: 应该看到 `contain 模式` 的日志
3. **检查图片**: 图片应该完整显示，不裁剪，可能有留白（如果图片宽高比与 section 不一致）

### 3.2 验证预期效果

- ✅ 图片完整显示（不裁剪）
- ✅ 图片居中
- ✅ 图片填满可用空间（contain 策略）
- ⏳ 虚线边框区域扩大到和绿色区域一样大小（待确认）

---

**修改状态**: ✅ contain 策略已完成  
**虚线边框**: ⏳ 需要进一步确认和修改  
**下一步**: 确认虚线边框的具体实现方式，然后扩大或移除
