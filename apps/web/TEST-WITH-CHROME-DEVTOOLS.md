# 使用 Chrome DevTools 测试支付功能

## 前置要求

1. **启动前端服务**:
   ```bash
   cd apps/web
   npm run dev
   ```
   前端服务通常运行在 `http://localhost:3000`

2. **启动后端服务** (如果需要):
   ```bash
   cd backend
   npm run dev
   ```
   后端服务通常运行在 `http://localhost:4000` 或 `http://localhost:3001`

## 运行测试

### 方法 1: 使用独立测试脚本（推荐）

```bash
cd apps/web
BASE_URL=http://localhost:3000 node scripts/test-payment-with-cdp.js
```

### 方法 2: 使用 Playwright 测试

```bash
cd apps/web
SKIP_WEB_SERVER=1 BASE_URL=http://localhost:3000 npx playwright test payment-flow-chrome-devtools.spec.ts --headed
```

## 测试内容

测试脚本会验证以下功能：

1. **添加购物车功能**
   - ✅ 无弹窗提示
   - ✅ 购物车图标数字实时更新
   - ✅ 无需刷新页面

2. **购物车图片显示**
   - ✅ 图片正常加载
   - ✅ 图片 URL 格式正确

3. **Stripe 支付按钮**
   - ✅ 填写完整信息后按钮可点击
   - ✅ cardComplete 状态正确更新

## 测试结果

测试完成后，会在 `test-results/` 目录下生成：
- `cdp-add-to-cart.png` - 添加购物车测试截图
- `cdp-cart-images.png` - 购物车图片测试截图
- `cdp-checkout-button.png` - 支付按钮测试截图
- `debug-*.png` - 调试截图（如果有问题）

## 故障排除

### 问题：找不到商品链接
- 确保前端服务正在运行
- 检查数据库中是否有商品数据
- 尝试直接访问商品详情页：`http://localhost:3000/products/classic-crew-tee`

### 问题：找不到添加购物车按钮
- 检查商品详情页是否正确加载
- 查看调试截图：`test-results/debug-no-button.png`
- 确保已选择颜色和尺寸（如果需要）

### 问题：Stripe 按钮无法点击
- 检查 Stripe publishable key 是否正确配置
- 查看浏览器控制台的调试日志
- 确保所有必填字段都已填写完整

## Chrome DevTools 功能

测试脚本使用了以下 CDP 功能：

- `Network.enable` - 监控网络请求
- `Runtime.enable` - 执行 JavaScript 代码
- `Page.enable` - 页面事件
- `DOM.enable` - DOM 操作
- `Runtime.consoleAPICalled` - 监听控制台日志
- `Network.loadingFailed` - 检测图片加载失败

## 手动测试步骤

如果自动测试失败，可以按照以下步骤手动测试：

1. **打开 Chrome DevTools** (F12)
2. **访问商品详情页**
3. **添加商品到购物车**
   - 观察是否有弹窗（不应该有）
   - 观察购物车图标数字是否更新
4. **访问购物车页面**
   - 检查图片是否正常显示
5. **访问结算页**
   - 填写完整信息
   - 检查 Place Order 按钮是否可点击

