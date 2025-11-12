# 全链路 E2E 测试脚本

> [2025-11-12 02:35:00] Sprint 6 - 核心电商流程验证

本测试脚本覆盖用户从浏览商品到后台核验订单的完整链路，适用于候选环境（Staging / Production）。建议结合 Playwright/Cypress 自动化实现，下表提供手工执行步骤与可编程断言要点。

## 0. 预置条件

| 项目 | 要求 |
| --- | --- |
| 前端 | `apps/web` 以 `npm run dev --workspace apps/web` or `next start` 运行在 `http://localhost:3000` |
| 后端 | `backend` 以 `npm run dev --workspace backend` 运行在 `http://localhost:3001` |
| 数据 | 执行 `npm run prisma:migrate --workspace backend` 与基础数据 seed（分类/商品/管理员账号） |
| 管理员账号 | `admin@example.com` / `Admin@123`（示例） |
| Stripe | 准备 `STRIPE_SECRET_KEY`、`STRIPE_PUBLISHABLE_KEY`；如无真实秘钥可使用 test key 并跳过支付确认步骤 |
| Sentry | 若需捕获链路异常，配置 `SENTRY_DSN`（可选） |

> **提示**：如希望自动化执行，可使用 Playwright 创建 `tests/e2e/checkout-flow.spec.ts`，复用下述步骤与断言。

## 1. 浏览与加购

1. 打开首页 `GET /`，验证分类、推荐商品加载成功（检查 HTTP 200 / React hydration）。
2. 跳转某商品详情 `/products/{slug}`，确认 SKU、价格、库存、图片展示正常。
3. 选择颜色/尺码后点击 “Add to cart”，断言购物车浮层或 `/cart` 页面出现对应条目，价格计算正确。

✅ 断言：
- `CartContext` 中 `items.length > 0`
- 网络请求 `POST /api/cart/items` 返回 200；若使用 Playwright，监听 `page.waitForResponse`

## 2. 结账与支付

1. 访问 `/checkout`，确保购物车同步。
2. 填写收货地址（建议使用加拿大地址以校验税率逻辑）。
3. 选择配送方式（默认 standard/express），核对 totals 区域动态更新。
4. 输入 Stripe 测试卡 `4242 4242 4242 4242 / 12-34 / 123`，提交订单。
5. 若使用真实 Stripe key，确认跳转至 success 页面携带 `orderNumber`、`email` 参数。

✅ 断言：
- `POST /api/checkout/create-payment-intent` 返回 breakdown，total = subtotal + shipping + tax
- `POST /api/checkout/confirm` 返回 201，响应体含 `orderNumber`
- 成功页面 `/checkout/success` 展示感谢信息，点击 “View Order Details” 可跳转到 `/orders/{orderNumber}` 并读取邮件参数

> 支付失败路径：在 Stripe 输入 `4000 0000 0000 0341` 卡号可模拟失败，验证 `/checkout/failure` 密态提示。

## 3. 用户订单中心核验

1. 在成功页点击 “View Order Details” 或访问 `/orders/{orderNumber}?email=...`。
2. 验证订单状态、商品列表、发票下载、重发邮件按钮可用（按钮点击应触发 `GET /api/orders/:orderNumber/invoice`、`POST /api/orders/:orderNumber/resend-email`）。
3. 登录用户可访问 `/account/orders`，确认新订单位于列表顶部。

✅ 断言：
- `GET /api/orders/number/{orderNumber}` 返回 200
- `Download Invoice` 调用返回 PDF (`Content-Type: application/pdf`)

## 4. 后台订单处理

1. 使用管理员账号登录 `/login` 并访问 `/admin/orders`。
2. 搜索订单编号，进入详情页 `/admin/orders/{id}`。
3. 修改 fulfillment/payment 状态 & 跟踪号，保存后确保：
   - UI 提示保存成功
   - 右侧 Activity log 出现审计记录（调用 `GET /api/admin/audit-logs?targetType=order&targetId={id}`）
4. 点击 “Mark as refunded” 模拟退款操作，Activity log 应追加记录。

✅ 断言：
- 管理接口均返回 200 (`PATCH /api/admin/orders/{id}/status`、`POST /api/admin/orders/{id}/refund`)
- `admin_audit_logs` 表新增记录（可通过数据库或 API 验证）

## 5. 监控与日志核对

1. 登录 Sentry Dashboard，确认上述成功/失败流程事件被捕获（如已配置 DSN）。
2. 后端 `logs/` 目录（或集中日志系统）中应记录接口访问和错误。

## 6. 回滚与数据清理

- 使用 Prisma/SQL 删除测试订单、支付意图、购物车条目：
  ```bash
  npx prisma db execute --file scripts/cleanup-test-orders.sql --schema prisma/schema.prisma
  ```
- Stripe Dashboard（测试模式）中删除对应 PaymentIntent。

## 自动化建议（Playwright 草稿）

```ts
// playwright/checkout-flow.spec.ts (示例草稿)
import { test, expect } from '@playwright/test';

test('guest checkout happy path', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /products/i }).first().click();
  await page.getByRole('button', { name: /add to cart/i }).click();
  await page.goto('/checkout');
  await page.fill('input[name="fullName"]', 'Test User');
  // ... 填写地址与 Stripe iframe
  await page.getByRole('button', { name: /place order/i }).click();
  await expect(page).toHaveURL(/checkout\/success/);
});
```

> Playwright/Stripe 集成可参考官方文档，通过 Stripe 测试卡模拟支付成功/失败场景。

---

如需扩展：
- 增加离线订单、Design Lab 自定义流程
- 在 CI 中集成 `npm run test:e2e`，执行 docker-compose 部署后运行
- 将 Activity log 校验纳入自动化断言

