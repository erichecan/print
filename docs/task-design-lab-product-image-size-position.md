# Design Lab 底图大小与位置修复 - 任务理解文档

**创建时间**: 2025-12-19 21:10:00

## 一、现状证据

### 1.1 画布尺寸常量
- **位置**: `apps/web/src/app/design-lab/DesignLabClient.tsx` Line 251-252
- **值**: `CANVAS_WIDTH = 1000`, `CANVAS_HEIGHT = 1200`

### 1.2 当前安全区配置
- **位置**: `apps/web/src/design/utils/fit.ts` Line 61-62
- **默认值**: `safeAreaWidth = 0.65` (65%), `safeAreaHeight = 0.75` (75%)
- **Fit模式**: `fit = 'contain'` (完整显示，可能有留白)

### 1.3 底图加载逻辑
- **主函数**: `loadBackgroundImage()` 在 `DesignLabClient.tsx` Line 467
- **核心调用**: `loadProductImageLayer()` 在 `@/design/canvas/layers/productImageLayer`
- **Fit算法**: `calculateImageFit()` 在 `@/design/utils/fit.ts`

### 1.4 问题分析（基于代码）
当前底图使用65%宽 × 75%高的安全区，这导致：
- 底图视觉上较小（只占画布的约一半面积）
- 虽然已居中，但尺寸不够大，不符合 CustomInk 的视觉预期

## 二、任务目标

### 2.1 视觉目标
- 底图更大：占据画布主要区域（参考 CustomInk：产品 mockup 大、突出）
- 底图严格居中：以画布中心为基准（`left = CANVAS_WIDTH/2`, `top = CANVAS_HEIGHT/2`，使用 `originX='center', originY='center'`）

### 2.2 功能要求
- 不影响用户添加文字/上传图片等图层
- 底图永远在最底层、不可选中、不可被误删
- 缩放策略对不同图片尺寸稳定
- 保持响应式：桌面与移动端都正常

## 三、需要确认的问题

### ❓ 问题1：底图尺寸占比目标
当前使用 65% × 75% 安全区，建议调整为：
- **选项A（推荐）**: 80% × 90% - 更大更突出，接近 CustomInk 效果
- **选项B**: 85% × 95% - 几乎填满画布
- **选项C**: 其他比例 - 请指定具体百分比

### ❓ 问题2：Fit 模式选择
- **选项A（当前）**: `contain` - 完整显示，可能有留白，图片不会裁剪
- **选项B**: `cover` - 填充安全区，可能裁剪图片边缘，但视觉更大
- **您的选择**：？

### ❓ 问题3：袖子视图（sleeve）特殊处理
袖子画布更窄，是否也要使用相同的大比例（80% × 90%），还是使用更小的比例（例如 90% × 85%）？

## 四、初步根因分析

基于代码审查，根因应该是：
1. **安全区比例太小**：当前 65% × 75% 导致底图视觉上较小
2. **Fit算法本身正确**：`calculateImageFit` 的居中逻辑是正确的（使用 center 原点）
3. **可能的问题**：需要检查是否还有其他因素（如 CSS 缩放、容器布局）影响视觉

## 五、建议实施方案

### 5.1 优先方案
修改 `@/design/utils/fit.ts` 的默认安全区参数，或者在使用时传入更大的安全区。

### 5.2 实施步骤
1. 使用 Chrome DevTools 复现并测量当前底图实际尺寸
2. 调整安全区比例（根据您的确认）
3. 验证居中逻辑（originX='center', originY='center'）
4. 测试不同图片尺寸的稳定性
5. 编写 Playwright 测试验证

---

**等待您的确认**：请回答上述3个问题，我再开始实施。
