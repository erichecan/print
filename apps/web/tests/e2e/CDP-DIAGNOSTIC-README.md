# CDP 闭环诊断测试说明

## 概述

这个测试文件 (`checkout-cdp-diagnostic.spec.ts`) 使用 Chrome DevTools Protocol (CDP) 进行深度诊断，测试以下功能：

1. **添加购物车功能** - 验证商品添加到购物车的完整流程
2. **Buy Now 功能** - 验证立即购买并跳转到结账页
3. **Place Order 按钮诊断** - 诊断为什么按钮不能点击
4. **Coupon Apply 按钮诊断** - 诊断为什么优惠券不能应用

## 测试环境

- **环境**: GCP 生产环境
- **前端 URL**: `https://print-main-frontend-hsbqzlnkxa-uc.a.run.app`
- **后端 URL**: `https://print-main-backend-234065158862.us-central1.run.app`

## 运行测试

### 在 GCP 环境运行

```bash
cd apps/web
SKIP_WEB_SERVER=1 BASE_URL='https://print-main-frontend-hsbqzlnkxa-uc.a.run.app' API_BASE_URL='https://print-main-backend-234065158862.us-central1.run.app' npx playwright test tests/e2e/checkout-cdp-diagnostic.spec.ts --project=chromium
```

### 在本地环境运行

```bash
cd apps/web
npx playwright test tests/e2e/checkout-cdp-diagnostic.spec.ts --project=chromium
```

## CDP 功能

测试使用 CDP 捕获以下信息：

1. **控制台日志** (`Runtime.consoleAPICalled`)
   - 所有控制台输出
   - 特别是 `[Checkout Debug]` 开头的调试日志

2. **网络请求** (`Network.requestWillBeSent` 和 `Network.responseReceived`)
   - API 请求和响应
   - 请求头、请求体、响应状态、响应体

3. **JavaScript 异常** (`Runtime.exceptionThrown`)
   - 所有 JavaScript 错误和堆栈跟踪

4. **运行时状态检查** (`Runtime.evaluate`)
   - `window.Stripe` 对象状态
   - React 组件状态（如果可能）

## 测试输出

每个测试会输出：

1. **详细的步骤日志** - 每个操作的时间戳和结果
2. **按钮状态变化时间线** - 记录每个步骤后按钮的状态
3. **所有控制台日志** - 特别是 `[Checkout Debug]` 开头的
4. **网络请求和响应详情** - 包括请求头、请求体、响应状态、响应体
5. **错误信息** - JavaScript 错误、网络错误、API 错误
6. **最终诊断结果和建议** - 总结问题原因和修复建议

## 测试数据

- **商品**: 测试会自动查找可用的商品（通过 API 或页面导航）
- **地址**: 使用默认的加拿大测试地址（`getDefaultTestAddress()`）
- **优惠券**: 使用环境变量 `TEST_COUPON_CODE` 或默认值 `TEST10`
- **信用卡**: 使用 Stripe 测试卡号 `4242424242424242`

## 诊断重点

### Place Order 按钮诊断

测试会检查以下禁用条件：

```typescript
disabled={!stripe || isSubmitting || isFetchingRates || isCalculatingTotals || !cardComplete || !addressReady || !selectedShipping || shippingRates.length === 0}
```

诊断步骤：
1. 检查初始状态
2. 填写地址后检查状态
3. 选择运费后检查状态
4. 填写卡片信息后检查状态
5. 收集所有调试日志
6. 生成诊断报告

### Coupon Apply 按钮诊断

测试会检查以下禁用条件：

```typescript
disabled={applyingCoupon || !couponCode.trim() || !addressReady}
```

诊断步骤：
1. 填写完整地址
2. 验证 `addressReady` 状态
3. 输入优惠券代码
4. 检查按钮状态
5. 点击按钮并捕获 API 响应
6. 检查错误或成功消息

## 查看测试报告

运行测试后，查看 HTML 报告：

```bash
npx playwright show-report
```

报告包含：
- 测试执行时间线
- 截图（失败时）
- 视频（失败时）
- 控制台日志
- 网络请求

## 故障排除

### 测试失败：找不到商品

- 确保数据库中有商品数据
- 检查商品是否有库存
- 验证 API 端点 `/api/products` 是否正常工作

### 测试失败：购物车为空

- 确保添加到购物车的 API 调用成功
- 检查 session cookie 是否正确设置
- 验证购物车 API 端点是否正常工作

### 测试失败：Stripe 未加载

- 检查 Stripe publishable key 是否正确配置
- 验证 Stripe 脚本是否成功加载
- 检查网络连接和防火墙设置

### CDP Session 设置失败

- 确保使用 Chromium 浏览器（CDP 仅支持 Chromium）
- 检查 Playwright 版本是否支持 CDP
- 验证浏览器上下文是否正确创建

## 相关文件

- `apps/web/tests/e2e/checkout-cdp-diagnostic.spec.ts` - 主测试文件
- `apps/web/tests/e2e/helpers/checkout-helpers.ts` - 测试辅助函数
- `apps/web/src/app/checkout/page.tsx` - 结账页面组件
- `apps/web/src/app/products/[slug]/ProductDetailContent.tsx` - 商品详情页

