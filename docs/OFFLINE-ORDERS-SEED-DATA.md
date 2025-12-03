# 线下订单 Seed 数据说明

## 📋 Seed 数据概览

### 1. Sales 测试账号

**文件**: `backend/scripts/seed-offline-e2e.js`

#### 测试账号信息
- **邮箱**: `offline-tester@example.com`
- **密码**: `OfflineTest123!`
- **姓名**: Offline Tester
- **角色**: `SALES`
- **邮箱已验证**: ✅ true

### 2. 线下订单测试数据

共创建 **3 条测试订单**，覆盖不同状态：

#### 订单 1: OFF-E2E-CASE-1
- **订单编号**: `OFF-E2E-CASE-1`
- **项目名称**: `E2E-Offline-Case-1 New`
- **主打产品**: `Custom T-Shirt Kit`
- **数量**: 50
- **加急订单**: ❌ false
- **状态**: `ACTIVE`
- **阶段**: `new` (New)
- **阶段位置**: 0

#### 订单 2: OFF-E2E-CASE-2
- **订单编号**: `OFF-E2E-CASE-2`
- **项目名称**: `E2E-Offline-Case-2 In Review`
- **主打产品**: `Branded Hoodie Batch`
- **数量**: 120
- **加急订单**: ✅ true
- **状态**: `ACTIVE`
- **阶段**: `review` (Review)
- **阶段位置**: 1

#### 订单 3: OFF-E2E-CASE-3
- **订单编号**: `OFF-E2E-CASE-3`
- **项目名称**: `E2E-Offline-Case-3 Completed`
- **主打产品**: `Event Drinkware Set`
- **数量**: 200
- **加急订单**: ❌ false
- **状态**: `COMPLETED`
- **阶段**: `completed` (Completed)
- **阶段位置**: 99
- **生产工单**: ✅ 已创建并完成

### 3. 订单通用字段

所有订单都包含以下通用信息：

```javascript
{
  deliveryDate: 当前时间 + 30天,
  description: 'Seeded offline order for E2E tests',
  requiresMockups: true,
  requiresProof: false,
  contactName: 'E2E Contact',
  company: 'E2E Testing Corp',
  email: 'offline-e2e-contact@example.com',
  phone: '4165550000',
  configuration: {
    source: 'offline-e2e-seed',
    artworkNotes: 'This order is created by seed-offline-e2e.js for automated tests.'
  },
  metadata: {
    submittedFrom: 'offline-e2e-seed',
    submittedByUserId: <Sales用户ID>
  }
}
```

## 🚀 如何运行 Seed

### 方法 1: 使用 npm 脚本（推荐）

```bash
cd backend
npm run seed:offline-e2e
```

### 方法 2: 直接运行脚本

```bash
cd backend
node scripts/seed-offline-e2e.js
```

### 运行结果

成功运行后会看到：

```
🌱 Seeding offline E2E data (Sales user + offline orders)...
✅ Sales 测试账号就绪: offline-tester@example.com / OfflineTest123!
✅ 线下订单 E2E 测试数据就绪 (3 条订单记录)
```

## 🧪 测试 Sales Login

### 1. 确保 Seed 数据已创建

首先运行 seed 脚本创建测试数据：

```bash
cd backend
npm run seed:offline-e2e
```

### 2. 访问 Sales 登录页面

打开浏览器访问：
- **本地**: `http://localhost:3000/offline-orders/sales/login`
- **生产环境**: `https://your-domain.com/offline-orders/sales/login`

### 3. 使用测试账号登录

- **邮箱**: `offline-tester@example.com`
- **密码**: `OfflineTest123!`

### 4. 登录后

成功登录后会跳转到：
- `/offline-orders/sales/orders` - 订单列表页面

在订单列表中应该能看到 3 条测试订单：
- `OFF-E2E-CASE-1` (New)
- `OFF-E2E-CASE-2` (In Review, 加急)
- `OFF-E2E-CASE-3` (Completed)

### 5. 查看订单详情

点击任意订单的"详情"按钮，可以查看：
- 订单基本信息
- 订单附件
- 订单历史记录
- 生产工单信息（订单 3 有）

## 📝 注意事项

### 幂等性

Seed 脚本是**幂等的**，可以多次运行：
- 如果用户已存在，会更新用户信息（包括密码）
- 如果订单已存在，会更新订单信息
- 不会创建重复数据

### 权限要求

Sales 登录页面只允许以下角色登录：
- `SALES`
- `SALES_MANAGER`
- `ADMIN`

其他角色（如 `CUSTOMER`）会被拒绝。

### 数据库要求

确保：
1. 数据库连接正常（`DATABASE_URL` 环境变量已设置）
2. Prisma schema 已同步（运行过 `prisma migrate`）
3. 后端服务可以访问数据库

## 🔍 验证 Seed 数据

### 使用 Prisma Studio

```bash
cd backend
npm run prisma:studio
```

在 Prisma Studio 中：
1. 查看 `User` 表，找到 `offline-tester@example.com`
2. 查看 `OfflineOrder` 表，找到 3 条订单
3. 查看 `ProductionWorkOrder` 表，找到订单 3 的生产工单

### 使用 SQL 查询

```sql
-- 查看 Sales 用户
SELECT * FROM users WHERE email = 'offline-tester@example.com';

-- 查看所有测试订单
SELECT order_code, project_name, status, stage_key 
FROM offline_orders 
WHERE order_code LIKE 'OFF-E2E-%';

-- 查看生产工单
SELECT * FROM production_work_orders 
WHERE work_order_code LIKE 'WO-E2E-%';
```

## 🐛 故障排查

### 问题 1: Seed 脚本运行失败

**可能原因**:
- 数据库连接失败
- Prisma Client 未生成
- 数据库表不存在

**解决方法**:
```bash
# 1. 检查数据库连接
echo $DATABASE_URL

# 2. 生成 Prisma Client
cd backend
npm run prisma:generate

# 3. 运行数据库迁移
npm run prisma:migrate
```

### 问题 2: 登录失败

**可能原因**:
- 用户未创建
- 密码错误
- 角色不正确

**解决方法**:
```bash
# 重新运行 seed 脚本
cd backend
npm run seed:offline-e2e
```

### 问题 3: 订单列表为空

**可能原因**:
- 订单未创建
- 用户 ID 不匹配
- API 权限问题

**解决方法**:
```bash
# 检查订单是否创建
cd backend
npm run prisma:studio
# 查看 OfflineOrder 表
```

## 📚 相关文档

- [线下订单 E2E 测试指南](./OFFLINE-ORDERS-E2E-GUIDE.md)
- [线下订单页面总结](./OFFLINE-ORDERS-PAGES-SUMMARY.md)

