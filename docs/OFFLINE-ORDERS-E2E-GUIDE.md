## Offline Orders E2E 测试说明（Sales + Intake）

- **最后更新**：2025-12-02 05:31:30

### 1. 测试前置条件

- 已在目标环境（本地或 GCP）正确配置：
  - 后端 `DATABASE_URL` 指向测试数据库；
  - 前端可通过 `FRONTEND_URL` 访问（例如 `https://print-main-frontend-234065158862.us-central1.run.app`）。
- 运行后端种子脚本，创建线下订单 E2E 测试账号和测试订单：
  - 在 `backend` 目录下执行：`npm run seed:offline-e2e`
  - 创建账号：`offline-tester@example.com / OfflineTest123!`
  - 创建 3 条线下订单：`OFF-E2E-CASE-1/2/3`。

### 2. Playwright 测试脚本

- Intake 创建流程：
  - 文件：`apps/web/tests/e2e/offline-order-creation.spec.ts`
  - 入口：`/offline-orders`（多步表单 + 附件上传）
  - 覆盖：完整表单填写与提交、错误提示展示。
- Sales 侧线下订单流程（本计划新增）：
  - 文件：`apps/web/tests/e2e/offline-orders-sales-flow.spec.ts`
  - 使用基准 fixture：`apps/web/tests/e2e/fixtures/test-base.ts`
  - 通过环境变量控制前端 URL：
    - `FRONTEND_URL` 或 `BASE_URL`（缺省为 `http://localhost:3000`）。

#### 2.1 Sales 流程用例覆盖

- 未登录从首页点击「Submit Offline Order」：
  - 访问 `/`，点击按钮，期望落在 `/offline-orders` 或 `/offline-orders/sales/login`。
- Sales 测试账号登录并查看列表：
  - 访问 `/offline-orders/sales/login`；
  - 使用 `offline-tester@example.com / OfflineTest123!` 登录；
  - 成功后落在 `/offline-orders/sales/orders`，看到 `OFF-E2E-CASE-*` 订单。
- 列表进入详情并返回：
  - 从 `/offline-orders/sales/orders` 点击任一「详情」按钮；
  - 进入 `/offline-orders/sales/orders/[id]`，看到订单编号和关键信息；
  - 点击「返回列表」回到列表页。
- 未登录直接访问列表/详情的行为：
  - 未登录访问 `/offline-orders/sales/orders` 或 `/offline-orders/sales/orders/OFF-E2E-CASE-1`；
  - 期望重定向至 `/offline-orders/sales/login`。

#### 2.2 控制台错误与 History 校验

- 在 `offline-orders-sales-flow.spec.ts` 中对控制台错误进行监听：
  - 断言不存在包含 `Minified React error #418` 或 `#423` 的日志；
  - 断言不存在 `SecurityError` 且包含 `replaceState` 的日志。
- 如触发上述错误：
  - 使用 Chrome DevTools 复现同一路径；
  - 检查是否存在跨 origin 的绝对 URL（如 `https://offline-orders/...`）或不正确的 `router.replace` 调用；
  - 修正为以 `/offline-orders...` 开头的相对路径，并在相关代码处添加带秒级时间戳注释说明原因。

### 3. 本地与远程环境运行方式

- 本地（默认）：
  - 启动本地前端和后端；
  - 在 `apps/web` 目录下执行：
    - `npx playwright test offline-order-creation.spec.ts`
    - `npx playwright test offline-orders-sales-flow.spec.ts`
- 远程 GCP 环境（推荐）：
  - 设置环境变量：
    - `FRONTEND_URL=https://print-main-frontend-234065158862.us-central1.run.app`
  - 只跑线下订单相关 E2E：
    - 在 `apps/web` 目录下执行：`npx playwright test offline-order-creation.spec.ts offline-orders-sales-flow.spec.ts`

### 4. DevTools 手动验证建议

- 建议在 Chrome DevTools 中手动走一遍完整线下订单流程：
  - 打开 Console 确认无 React / History 相关红色错误；
  - 打开 Network 确认：
    - `/api/auth/me` 在登录后返回 200；
    - `/offline-orders` POST 返回 201 或 200；
    - `/sales/orders`、`/sales/orders/:id` 返回 2xx，无多余 401/5xx。
- 如发现异常，将其记录并同步更新本文件和相应代码处的时间戳注释。


