# Design Lab 4.0 商品图片加载循环与居中显示修复

**日期**: 2025-01-30 20:55:00  
**类型**: Bug Fix  
**优先级**: P0 (Critical)  
**状态**: ✅ 已完成

## 问题描述

### 症状
生产环境控制台日志显示商品图片不断重复加载-移除循环：

```
[ProductImageLayer] Loading product image from URL: https://mms-images-prod.imgix.net/.../front_large_extended.png?w=2000&q=100&v=dev
[DesignLab] Object added: {object: nZ}
[ProductImageLayer] Product image loaded and positioned: {..., scale: 0.325}
[DesignLab] Object removed: {object: nZ}
[DesignLab] Product image loaded using new productImageLayer
```

循环不断：加载→添加→定位→移除→"loaded using new productImageLayer"→再次加载…

### 影响
1. 商品主图无法稳定显示在画布上
2. 画布中央不显示商品图片，且未居中
3. 图层顺序混乱，影响用户体验

## 根本原因分析

### 1. 缺少状态机管理
- `ProductImageLayer` 没有状态管理，每次调用都创建新对象
- 没有 `loadedOnce` 标记，导致重复加载

### 2. 缺少幂等保护
- `attach/detach` 操作没有保护，导致重复移除-添加
- 对象键不稳定，URL query 参数（如 `v=dev`）变化导致重建

### 3. 事件订阅重复绑定
- `onLoad/onReady` 事件可能重复绑定
- `ready` 回调中再次触发 `initialize` 导致循环

### 4. 居中算法错误
- 使用 `left/top` 原点而非 `center` 原点
- 计算居中位置时未考虑 `originX/originY` 为 `center` 的情况

### 5. 图层顺序未明确
- 上传图片和文字对象缺少 `zIndex` 设置
- 图层顺序依赖对象添加顺序，不稳定

## 修复方案

### 1. 引入有限状态机（FSM）与幂等保护

#### 状态枚举
```typescript
export enum ProductImageLayerState {
  IDLE = 'idle',
  LOADING = 'loading',
  LOADED = 'loaded',
  ATTACHED = 'attached',
  ERROR = 'error',
}
```

#### 幂等保护
- `canLoad()`: 检查是否可以加载（避免重复加载）
- `canRemove()`: 检查是否可以移除（最多允许移除 1 次）
- `loadedOnce` 标记：首次成功加载后不再重新创建

### 2. 稳定的对象键（Stable Key）

```typescript
function generateStableKey(
  colorName: string | null | undefined,
  view: 'front' | 'back' | 'sleeve',
  productId?: string
): string {
  const colorId = colorName || 'White';
  const pid = productId || 'default';
  return `product-image-${pid}-${colorId}-${view}`;
}
```

- 基于商品 SKU + view + colorId，不依赖 URL query 参数
- 版本戳（`v=dev`）只用于缓存控制，不影响对象 identity

### 3. 事件订阅去重

- 使用一次性事件处理（`loadHandlerExecuted` 标记）
- `product-image:ready` 事件一次性触发
- 在 `ready` 回调中禁止再次调用 `initialize()`

### 4. 居中与缩放算法修复

```typescript
// 修复前：使用 left/top 原点
const left = (canvasWidth - scaledWidth) / 2;
const top = (canvasHeight - scaledHeight) / 2;

// 修复后：使用 center 原点
const centerLeft = canvasWidth / 2;
const centerTop = canvasHeight / 2;
fabricImg.set({
  left: centerLeft,
  top: centerTop,
  originX: 'center',
  originY: 'center',
});
```

### 5. 图层顺序管理

```typescript
// ProductImageLayer: zIndex = 0 (底层)
data: {
  layerType: 'product-image',
  zIndex: 0,
}

// UploadLayer: zIndex = 10 (中层)
data: {
  layerType: 'upload',
  zIndex: 10,
}

// TextLayer: zIndex = 20 (最上层)
data: {
  layerType: 'text',
  zIndex: 20,
}
```

### 6. 循环防护监控

- 检测重复移除：如果同一对象在 1 秒内被重复移除，输出警告
- 限制日志输出：最多记录 10 次，避免日志过多
- 移除计数保护：最多允许移除 1 次，超过则阻止

## 修改的文件

### 核心修复文件

1. **`apps/web/src/design/canvas/layers/productImageLayer.ts`**
   - 引入 `ProductImageLayerManager` 单例管理器
   - 实现 FSM 状态机
   - 添加稳定键生成和幂等保护
   - 修复居中算法（center 原点）
   - 添加一次性 ready 事件

2. **`apps/web/src/design/canvas/engine.ts`**
   - 更新初始化顺序，等待产品图片 ready 事件
   - 一次性订阅 `product-image:ready` 事件

3. **`apps/web/src/app/design-lab/DesignLabClient.tsx`**
   - 更新 `loadBackgroundImage` 使用新的 API
   - 添加循环防护监控日志
   - 为上传图片和文字对象设置 `zIndex`

4. **`apps/web/src/design/utils/fit.ts`**
   - 修复居中算法，使用 center 原点坐标

### 配置文件

5. **`apps/web/next.config.mjs`**
   - ✅ 已包含 `mms-images-prod.imgix.net` 在白名单（无需修改）

### 测试文件

6. **`apps/web/tests/e2e/canvas-product-image.spec.ts`**
   - 添加循环检测测试
   - 验证居中算法
   - 验证图层顺序

7. **`apps/web/src/design/__tests__/fit.spec.ts`**
   - 更新居中测试，验证 center 原点算法

## 验证步骤

### 本地验证

1. **启动开发服务器**
   ```bash
   npm run dev
   ```

2. **访问 Design Lab**
   - 打开 `/design-lab` 页面
   - 打开浏览器控制台

3. **验证日志**
   - ✅ 日志不再循环；只出现一次 "Product image ready (one-time event)"
   - ✅ 主图居中显示，zIndex=0
   - ✅ 上传图与文字在其上层（zIndex=10, 20）

4. **运行 E2E 测试**
   ```bash
   npx playwright test tests/e2e/canvas-product-image.spec.ts --headed
   ```

### 生产验证（GCP 部署后）

1. **访问生产环境**
   - URL: `https://print-main-frontend-hsbqzlnkxa-uc.a.run.app/design-lab`

2. **检查控制台**
   - ✅ 无循环日志
   - ✅ 主图居中显示
   - ✅ 无 400 错误

## 测试结果

### 单元测试
- ✅ `fit.spec.ts`: 所有测试通过（包含居中算法验证）

### E2E 测试
- ✅ `canvas-product-image.spec.ts`: 
  - 产品图片加载和居中
  - 图层顺序正确
  - 无重复加载-移除循环

## GitHub 提交

### 分支
```
feat/design-lab4/product-image-loop-fix
```

### 提交消息（Conventional Commits）

```
fix(design): prevent repeated add/remove of product image with FSM and idempotent attach

- 引入有限状态机（FSM）管理 ProductImageLayer 状态
- 添加幂等保护，防止重复加载和移除
- 实现稳定对象键，避免 URL query 参数变化触发重建
- 修复居中算法，使用 center 原点确保正确居中
- 添加循环防护监控和日志

fix(design): add fitContain/center with DPI support for product image

- 修复 fit.ts 居中算法，使用 center 原点坐标
- 支持 DPI 转换和物理尺寸计算

chore(design): ensure layer order (product < upload < text)

- 为产品图片设置 zIndex=0（底层）
- 为上传图片设置 zIndex=10（中层）
- 为文字对象设置 zIndex=20（最上层）

test(e2e): assert product image visible, centered, and no log loop

- 添加循环检测测试
- 验证居中算法
- 验证图层顺序正确
```

## 部署说明

### 构建前检查
```bash
# 检查环境变量
npm run check-env

# 运行测试
npm run test
npx playwright test
```

### 部署到 GCP
```bash
./scripts/deploy-gcp.sh
```

### 部署后验证
1. 访问前端 URL
2. 打开 Design Lab 页面
3. 检查控制台日志
4. 验证产品图片显示和居中

## 后续改进建议

1. **性能优化**
   - 考虑使用图片缓存，避免重复加载相同资源
   - 优化 fit 计算，考虑使用 Web Worker

2. **监控**
   - 添加 Sentry 错误追踪
   - 监控循环警告事件

3. **文档**
   - 更新 Design Lab 架构文档
   - 添加图层管理最佳实践

## 相关 Issue

- 修复 Design Lab 4.0 商品图片加载循环问题
- 修复商品图片居中显示问题
- 确保图层顺序正确（product < upload < text）

---

**修复完成时间**: 2025-01-30 20:55:00  
**验证状态**: ✅ 通过  
**部署状态**: ⏳ 待部署
