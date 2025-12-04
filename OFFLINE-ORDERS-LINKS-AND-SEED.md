# Offline Orders 相关链接和 Sales Seed 数据

## 📍 Offline Orders 相关链接

### 1. 客户下单页面
- **路径**: `/offline-orders`
- **完整 URL（本地）**: `http://localhost:3000/offline-orders`
- **完整 URL（生产）**: `https://print-main-frontend-hsbqzlnkxa-uc.a.run.app/offline-orders`
- **功能**: 多步骤订单创建流程（4步）
  - 第1步：产品选择（多产品定制）
  - 第2步：印刷位置配置
  - 第3步：客人信息和价格管理（包含项目详情）
  - 第4步：文件上传（支持移动端拍照）

### 2. 管理员订单管理页面
- **路径**: `/admin/offline-orders`
- **完整 URL（本地）**: `http://localhost:3000/admin/offline-orders`
- **完整 URL（生产）**: `https://print-main-frontend-hsbqzlnkxa-uc.a.run.app/admin/offline-orders`
- **功能**: 
  - 订单列表展示（看板视图）
  - 订单详情查看
  - 阶段流转管理
  - 订单状态更新
  - 生产工单关联
  - 订单指标统计

### 3. 销售员登录页面
- **路径**: `/offline-orders/sales/login`
- **完整 URL（本地）**: `http://localhost:3000/offline-orders/sales/login`
- **完整 URL（生产）**: `https://print-main-frontend-hsbqzlnkxa-uc.a.run.app/offline-orders/sales/login`
- **功能**: 销售员登录认证
- **允许角色**: `SALES`, `SALES_MANAGER`, `ADMIN`

### 4. 销售员订单列表页面
- **路径**: `/offline-orders/sales/orders`
- **完整 URL（本地）**: `http://localhost:3000/offline-orders/sales/orders`
- **完整 URL（生产）**: `https://print-main-frontend-hsbqzlnkxa-uc.a.run.app/offline-orders/sales/orders`
- **功能**: 
  - 销售员查看自己的订单列表
  - 订单状态筛选
  - 订单详情跳转

### 5. 销售员订单详情页面
- **路径**: `/offline-orders/sales/orders/[id]`
- **完整 URL（本地）**: `http://localhost:3000/offline-orders/sales/orders/{orderId}`
- **完整 URL（生产）**: `https://print-main-frontend-hsbqzlnkxa-uc.a.run.app/offline-orders/sales/orders/{orderId}`
- **功能**: 
  - 查看订单详细信息
  - 查看订单附件
  - 查看订单历史记录

## 📋 Sales Seed 数据

### Seed 脚本位置
- **文件**: `backend/scripts/seed-offline-e2e.js`
- **生产环境脚本**: `backend/scripts/seed-offline-e2e-production.sh`

### 测试账号信息

#### 基础测试账号（E2E 测试用）
- **邮箱**: `offline-tester@example.com`
- **密码**: `OfflineTest123!`
- **姓名**: Offline Tester
- **角色**: `SALES`
- **邮箱已验证**: ✅ true

#### 生产环境测试账号（3个）
根据 `docs/OFFLINE-ORDERS-SEED-PRODUCTION.md`，生产环境还有 3 个销售账号：

| 账号 | 邮箱 | 密码 | 姓名 |
|------|------|------|------|
| Sales 1 | `sales1@example.com` | `Sales123!` | Sales One |
| Sales 2 | `sales2@example.com` | `Sales123!` | Sales Two |
| Sales 3 | `sales3@example.com` | `Sales123!` | Sales Three |

### 测试订单数据

#### 基础测试订单（3条）
由 `seed-offline-e2e.js` 创建：

1. **OFF-E2E-CASE-1**
   - 项目名称: `E2E-Offline-Case-1 New`
   - 主打产品: `Custom T-Shirt Kit`
   - 数量: 50
   - 加急订单: ❌ false
   - 状态: `ACTIVE`
   - 阶段: `new` (New)

2. **OFF-E2E-CASE-2**
   - 项目名称: `E2E-Offline-Case-2 In Review`
   - 主打产品: `Branded Hoodie Batch`
   - 数量: 120
   - 加急订单: ✅ true
   - 状态: `ACTIVE`
   - 阶段: `review` (Review)

3. **OFF-E2E-CASE-3**
   - 项目名称: `E2E-Offline-Case-3 Completed`
   - 主打产品: `Event Drinkware Set`
   - 数量: 200
   - 加急订单: ❌ false
   - 状态: `COMPLETED`
   - 阶段: `completed` (Completed)
   - 生产工单: ✅ 已创建并完成

#### 生产环境测试订单
每个销售账号都有不同的订单数据（详见 `docs/OFFLINE-ORDERS-SEED-PRODUCTION.md`）

## 🚀 如何运行 Seed 脚本

### 本地环境

```bash
cd backend
npm run seed:offline-e2e
```

或直接运行：

```bash
cd backend
node scripts/seed-offline-e2e.js
```

### 生产环境

#### 方法 1: 使用生产脚本

```bash
cd backend/scripts
export DATABASE_URL='postgresql://user:password@host:5432/database?sslmode=require'
./seed-offline-e2e-production.sh
```

#### 方法 2: 通过 GCP Cloud Run 执行

```bash
# 连接到后端服务容器
gcloud run services exec print-main-backend --region=us-central1 -- /bin/bash

# 在容器内运行
cd backend
npm run seed:offline-e2e
```

## ✅ 验证 Seed 数据

### 1. 验证用户账号

```bash
cd backend
npm run prisma:studio
```

在 Prisma Studio 中查看 `User` 表，确认：
- `offline-tester@example.com` 存在
- 角色为 `SALES`
- `emailVerified` 为 `true`

### 2. 验证订单数据

在 Prisma Studio 中查看 `OfflineOrder` 表，确认：
- 3 条订单记录存在（`OFF-E2E-CASE-1`, `OFF-E2E-CASE-2`, `OFF-E2E-CASE-3`）
- 订单状态正确
- 订单关联到正确的用户

### 3. 测试登录

1. 访问 `/offline-orders/sales/login`
2. 使用测试账号登录：
   - 邮箱: `offline-tester@example.com`
   - 密码: `OfflineTest123!`
3. 登录后应跳转到 `/offline-orders/sales/orders`
4. 应该能看到 3 条测试订单

## 📝 注意事项

### 幂等性
- Seed 脚本是**幂等的**，可以多次运行
- 如果用户已存在，会更新用户信息（包括密码）
- 如果订单已存在，会更新订单信息
- 不会创建重复数据

### 权限要求
- Sales 登录页面只允许以下角色登录：
  - `SALES`
  - `SALES_MANAGER`
  - `ADMIN`
- 其他角色（如 `CUSTOMER`）会被拒绝

### 数据库要求
确保：
1. 数据库连接正常（`DATABASE_URL` 环境变量已设置）
2. Prisma schema 已同步（运行过 `prisma migrate`）
3. 后端服务可以访问数据库

## 📚 相关文档

- [线下订单页面总结](./docs/OFFLINE-ORDERS-PAGES-SUMMARY.md)
- [线下订单 Seed 数据说明](./docs/OFFLINE-ORDERS-SEED-DATA.md)
- [线上环境 Seed 数据指南](./docs/OFFLINE-ORDERS-SEED-PRODUCTION.md)
- [线下订单 E2E 测试指南](./docs/OFFLINE-ORDERS-E2E-GUIDE.md)

