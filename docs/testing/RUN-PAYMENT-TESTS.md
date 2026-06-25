# 支付功能完整测试运行指南

## 前置要求

### 1. 启动后端服务

```bash
cd backend
npm run dev
```

后端服务将运行在 `http://localhost:4000`（或配置的端口）

### 2. 启动前端服务

```bash
cd apps/web
npm run dev
```

前端服务将运行在 `http://localhost:3000`

### 3. 确保数据库连接

确保 `DATABASE_URL` 环境变量已配置，数据库可访问。

## 运行测试

### 方法 1: 使用 Playwright 测试（推荐）

```bash
cd apps/web

# 跳过数据库重置和服务器启动（服务已手动启动）
SKIP_WEB_SERVER=1 SKIP_DB_RESET=1 BASE_URL=http://localhost:3000 API_BASE_URL=http://localhost:4000 \
  npx playwright test payment-flow-complete.spec.ts --headed --project=chromium
```

### 方法 2: 使用 webapp-testing skill（Python）

```bash
# 确保服务已启动后运行
python3 test-payment-with-webapp-testing.py http://localhost:3000
```

### 方法 3: 使用自动服务器管理（webapp-testing）

```bash
./test-payment-complete.sh
```

注意：此方法需要配置好数据库连接。

### 方法 4: 测试生产环境

```bash
cd apps/web
npm run test:gcp -- payment-flow-complete.spec.ts --project=chromium
```

## 测试内容

测试将验证以下功能：

1. **添加购物车无弹窗，实时更新图标数字**
   - ✅ 无 alert 弹窗
   - ✅ 无 Toast 提示
   - ✅ 购物车图标数字实时更新
   - ✅ API 请求成功

2. **购物车实时更新，无需刷新页面**
   - ✅ 购物车数量立即更新
   - ✅ 无需手动刷新页面
   - ✅ 购物车 API 自动调用刷新

3. **购物车页面图片正常显示**
   - ✅ 所有图片正常显示
   - ✅ 图片 URL 格式正确
   - ✅ 无图片加载错误

4. **Stripe 支付按钮在填写完整信息后可点击**
   - ✅ Stripe 正确加载
   - ✅ 填写地址后运费计算成功
   - ✅ 选择运费方式后按钮状态更新
   - ✅ 填写卡片信息后 cardComplete 为 true
   - ✅ Place Order 按钮可点击

## 测试结果

测试完成后会生成：

- **HTML 报告**: `apps/web/playwright-report/index.html`
- **截图**: `apps/web/test-results/artifacts/`
- **视频**: `apps/web/test-results/artifacts/`（失败时）

查看报告：
```bash
cd apps/web
npx playwright show-report
```

## 故障排除

### 问题：连接被拒绝

**原因**: 服务未启动

**解决**:
1. 检查后端服务是否运行：`curl http://localhost:4000/api/products?limit=1`
2. 检查前端服务是否运行：`curl http://localhost:3000`
3. 启动服务后重试

### 问题：找不到商品

**原因**: 数据库中没有商品数据

**解决**:
1. 运行数据库种子脚本
2. 或使用已知的商品 slug（如 `classic-crew-tee`）

### 问题：数据库连接失败

**原因**: DATABASE_URL 未配置或数据库不可访问

**解决**:
1. 检查 `backend/.env` 中的 `DATABASE_URL`
2. 确保数据库服务运行
3. 测试数据库连接

## 快速测试命令

```bash
# 一键启动服务并测试（需要配置好环境）
cd /Users/apony-it/Downloads/print-main

# 终端1: 启动后端
cd backend && npm run dev

# 终端2: 启动前端
cd apps/web && npm run dev

# 终端3: 运行测试
cd apps/web && SKIP_WEB_SERVER=1 SKIP_DB_RESET=1 \
  BASE_URL=http://localhost:3000 API_BASE_URL=http://localhost:4000 \
  npx playwright test payment-flow-complete.spec.ts --headed --project=chromium
```

## 使用 webapp-testing skill

已安装的 skills：
- ✅ **webapp-testing** - Web 应用测试工具包
- ✅ **frontend-design** - 前端设计工具
- ✅ **canvas-design** - Canvas 设计工具

查看 skill 说明：
```bash
openskills read webapp-testing
```

