# 线上环境 Seed 数据指南

## 🚨 重要提示

### 正确的访问 URL

**❌ 错误**: `https://print-main-frontend-234065158862.us-central1.run.app/apps/web/src/app/offline-orders/sales/login/page.tsx`

**✅ 正确**: `https://print-main-frontend-234065158862.us-central1.run.app/offline-orders/sales/login`

Next.js 的路由是基于文件系统的，但访问时不需要包含文件路径，只需要路由路径。

## 📋 生成的测试数据

### 销售员账号（3个）

| 账号 | 邮箱 | 密码 | 姓名 | 角色 |
|------|------|------|------|------|
| Sales 1 | `sales1@suvernireplus.com` | `sales123456` | Sales One | SALES |
| Sales 2 | `sales2@suvernireplus.com` | `sales123456` | Sales Two | SALES |
| Sales 3 | `sales3@suvernireplus.com` | `sales123456` | Sales Three | SALES |

### 销售主管账号（1个）

| 账号 | 邮箱 | 密码 | 姓名 | 角色 |
|------|------|------|------|------|
| Sales Manager | `salesmanager@suvernireplus.com` | `manager123456` | Sales Manager | SALES_MANAGER |

### 权限说明

- **Sales 账号**：只能查看和管理自己提交的订单（通过 `metadata.submittedByUserId` 过滤）
- **Sales Manager 账号**：可以查看和管理所有订单（无过滤限制）

## 🚀 在线上环境运行 Seed

### 方法 1: 通过 GCP Cloud Run 执行（推荐）

#### 步骤 1: 连接到后端服务

```bash
# 获取后端服务名称
gcloud run services list --region=us-central1

# 连接到后端服务容器
gcloud run services exec <backend-service-name> --region=us-central1 -- /bin/bash
```

#### 步骤 2: 在容器内运行 Seed

```bash
cd backend
npm run seed:offline-e2e
```

### 方法 2: 本地运行（连接到线上数据库）

#### 步骤 1: 配置环境变量

创建 `.env.production` 文件（不要提交到 Git）：

```bash
# 从 GCP Secret Manager 或 Cloud Run 环境变量获取
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
NODE_ENV=production
```

#### 步骤 2: 运行 Seed

```bash
cd backend
NODE_ENV=production npm run seed:offline-e2e
```

### 方法 3: 使用 Cloud Build（自动化）

创建 `cloudbuild-seed.yaml`:

```yaml
steps:
  - name: 'node:20'
    entrypoint: 'npm'
    args: ['run', 'seed:offline-e2e']
    env:
      - 'DATABASE_URL=${_DATABASE_URL}'
      - 'NODE_ENV=production'
    dir: 'backend'
```

运行：

```bash
gcloud builds submit --config=cloudbuild-seed.yaml
```

## 🧪 测试登录

### 1. 访问登录页面

打开浏览器访问：
```
https://print-main-frontend-234065158862.us-central1.run.app/offline-orders/sales/login
```

### 2. 使用不同账号登录测试

#### 测试 Sales 1
- 邮箱: `sales1@suvernireplus.com`
- 密码: `sales123456`
- 角色: SALES

#### 测试 Sales 2
- 邮箱: `sales2@suvernireplus.com`
- 密码: `sales123456`
- 角色: SALES

#### 测试 Sales 3
- 邮箱: `sales3@suvernireplus.com`
- 密码: `sales123456`
- 角色: SALES

#### 测试 Sales Manager
- 邮箱: `salesmanager@suvernireplus.com`
- 密码: `manager123456`
- 角色: SALES_MANAGER（可查看所有订单）

### 3. 验证功能

- ✅ 登录后跳转到订单列表
- ✅ 每个销售只能看到自己的订单
- ✅ 订单详情页面正常显示
- ✅ 可以切换不同销售账号查看不同数据

## 🔍 验证 Seed 数据

### 使用 Prisma Studio（本地连接线上数据库）

```bash
cd backend
DATABASE_URL="<线上数据库URL>" npx prisma studio --schema=../prisma/schema.prisma
```

### 使用 SQL 查询

```sql
-- 查看所有销售账号
SELECT email, "firstName", "lastName", role 
FROM users 
WHERE role = 'SALES' 
ORDER BY email;

-- 查看每个销售的订单数量
SELECT 
  u.email,
  u."firstName" || ' ' || u."lastName" as name,
  COUNT(o.id) as order_count
FROM users u
LEFT JOIN offline_orders o ON o."metadata"->>'submittedByUserId' = u.id::text
WHERE u.role = 'SALES'
GROUP BY u.id, u.email, u."firstName", u."lastName"
ORDER BY u.email;

-- 查看所有测试订单
SELECT 
  order_code,
  project_name,
  status,
  stage_key,
  "metadata"->>'submittedByUserId' as sales_user_id
FROM offline_orders 
WHERE order_code LIKE 'OFF-SALES%'
ORDER BY order_code;
```

## ⚠️ 注意事项

### 1. 数据库连接

- 确保 `DATABASE_URL` 环境变量正确配置
- 线上数据库可能需要 SSL 连接
- 检查防火墙规则，确保可以连接

### 2. 幂等性

Seed 脚本是幂等的，可以安全地多次运行：
- 如果用户已存在，会更新用户信息
- 如果订单已存在，会更新订单信息
- 不会创建重复数据

### 3. 数据隔离

每个销售账号的订单通过 `metadata.submittedByUserId` 关联到对应的用户。

### 4. 生产环境安全

- ⚠️ 不要在生产环境使用弱密码
- ⚠️ 考虑使用更复杂的测试账号密码
- ⚠️ 测试完成后可以考虑删除测试数据

## 🐛 故障排查

### 问题 1: 404 错误

**原因**: URL 路径错误

**解决**: 使用正确的路由路径，不包含文件系统路径
- ✅ `/offline-orders/sales/login`
- ❌ `/apps/web/src/app/offline-orders/sales/login/page.tsx`

### 问题 2: 数据库连接失败

**检查**:
```bash
# 检查环境变量
echo $DATABASE_URL

# 测试数据库连接
cd backend
npx prisma db pull --schema=../prisma/schema.prisma
```

### 问题 3: Seed 脚本运行失败

**检查日志**:
```bash
# 查看详细错误信息
cd backend
NODE_ENV=production npm run seed:offline-e2e 2>&1 | tee seed.log
```

### 问题 4: 登录后看不到订单

**检查**:
1. 确认订单的 `metadata.submittedByUserId` 与用户 ID 匹配
2. 检查 API 权限和认证
3. 查看浏览器控制台和网络请求

## 📚 相关文档

- [Seed 数据说明](./OFFLINE-ORDERS-SEED-DATA.md)
- [线下订单页面总结](./OFFLINE-ORDERS-PAGES-SUMMARY.md)

