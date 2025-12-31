# 结账页面综合诊断测试说明

## 测试文件创建完成

### 已创建的文件

1. **`checkout-comprehensive-debug.spec.ts`** - 综合诊断测试文件
   - 集成 Chrome DevTools Protocol (CDP)
   - 4 个测试用例覆盖所有核心功能

2. **`helpers/checkout-helpers.ts`** - 测试辅助函数
   - 提供表单填写、日志捕获、状态检查等工具函数

### 测试用例

#### 1. 测试添加购物车功能
- 访问商品详情页
- 自动选择颜色和尺寸
- 点击 "Add to cart" 按钮
- 验证 API 请求和响应
- 捕获所有控制台日志和网络请求

#### 2. 测试 Buy Now 功能
- 访问商品详情页
- 自动选择颜色和尺寸
- 点击 "Buy Now" 按钮
- 验证添加到购物车和自动跳转到结账页

#### 3. 诊断 Place Order 按钮问题
- 添加商品到购物车
- 逐步填写表单（地址、运费、卡片信息）
- 记录每个步骤的按钮状态
- 捕获所有禁用原因
- 输出详细的调试日志

#### 4. 诊断 Coupon Apply 按钮问题
- 填写完整地址
- 输入优惠券代码
- 检查 Apply 按钮状态
- 验证 API 请求和响应
- 捕获错误信息

### CDP 集成功能

- ✅ 监听 `Runtime.consoleAPICalled` 捕获所有控制台输出
- ✅ 监听 `Runtime.exceptionThrown` 捕获 JavaScript 错误
- ✅ 监听网络请求和响应
- ✅ 捕获所有 `[Checkout Debug]` 开头的调试日志

### 运行测试

```bash
cd apps/web

# 运行所有测试
E2E_DB_RESET_CMD="echo 'Skipping DB reset'" npx playwright test tests/e2e/checkout-comprehensive-debug.spec.ts --project=chromium

# 运行单个测试
E2E_DB_RESET_CMD="echo 'Skipping DB reset'" npx playwright test tests/e2e/checkout-comprehensive-debug.spec.ts -g "测试添加购物车功能"

# 查看测试报告
npx playwright show-report
```

### 测试输出

每个测试会输出：
1. 详细的步骤日志
2. 按钮状态变化时间线
3. 所有控制台日志（特别是 `[Checkout Debug]` 开头的）
4. 网络请求和响应详情
5. 错误信息（如果有）
6. 最终诊断结果和建议

### 注意事项

1. **商品数据**：测试需要数据库中有可用的商品数据。如果找不到商品，测试会使用 fallback slug `classic-crew-tee`。

2. **环境变量**：测试会尝试从环境变量读取配置，如果没有配置，会使用默认值。

3. **Stripe 测试**：Stripe 卡片填写使用测试模式（4242 4242 4242 4242）。

4. **优惠券代码**：可以通过环境变量 `E2E_COUPON_CODE` 设置测试用的优惠券代码。

### 故障排查

如果测试失败：

1. **检查商品数据**：确保数据库中有商品数据
2. **检查 API 服务**：确保后端 API 正常运行
3. **查看截图**：测试失败时会自动截图，查看 `test-results/` 目录
4. **查看视频**：测试失败时会录制视频，查看 `test-results/` 目录
5. **查看日志**：测试会输出详细的调试日志，包括所有控制台输出

### 下一步

1. 确保测试环境有商品数据
2. 运行测试并查看输出
3. 根据测试结果诊断问题
4. 修复发现的问题
5. 重新运行测试验证修复

