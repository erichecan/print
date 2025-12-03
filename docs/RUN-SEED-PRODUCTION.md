# 在线上环境运行 Seed 脚本

## 🚀 快速开始

### 方法 1: 使用辅助脚本（推荐）

```bash
cd backend

# 设置线上数据库 URL
export DATABASE_URL='postgresql://user:password@host:5432/database?sslmode=require'

# 运行脚本
./scripts/seed-offline-e2e-production.sh
```

### 方法 2: 一行命令

```bash
cd backend

DATABASE_URL='postgresql://user:password@host:5432/database?sslmode=require' \
NODE_ENV=production \
npm run seed:offline-e2e
```

### 方法 3: 使用 npm 脚本（需要先设置环境变量）

```bash
cd backend

# 设置环境变量
export DATABASE_URL='postgresql://user:password@host:5432/database?sslmode=require'
export NODE_ENV=production

# 运行
npm run seed:offline-e2e
```

## 📋 获取线上数据库 URL

### 从 GCP Cloud Run 获取

```bash
# 列出所有服务
gcloud run services list --region=us-central1

# 获取后端服务的环境变量
gcloud run services describe <backend-service-name> \
  --region=us-central1 \
  --format='value(spec.template.spec.containers[0].env)' | \
  grep DATABASE_URL
```

### 从 GCP Secret Manager 获取

```bash
# 列出所有 secrets
gcloud secrets list

# 获取 DATABASE_URL secret
gcloud secrets versions access latest --secret=DATABASE_URL
```

### 从 Neon 数据库获取

1. 登录 [Neon Console](https://console.neon.tech/)
2. 选择你的项目
3. 在 "Connection Details" 中复制连接字符串
4. 格式类似: `postgresql://user:password@host.neon.tech/dbname?sslmode=require`

## ⚠️ 注意事项

1. **不要提交 DATABASE_URL 到 Git**
   - 使用环境变量，不要写入 `.env` 文件
   - 如果必须写入，确保 `.env` 在 `.gitignore` 中

2. **SSL 连接**
   - 线上数据库通常需要 SSL 连接
   - 确保连接字符串包含 `?sslmode=require`

3. **权限检查**
   - 确保数据库用户有创建表和插入数据的权限

4. **幂等性**
   - Seed 脚本是幂等的，可以安全地多次运行
   - 不会创建重复数据

## 🔍 验证结果

运行完成后，检查：

```bash
# 使用 Prisma Studio（连接线上数据库）
cd backend
DATABASE_URL='<线上数据库URL>' npx prisma studio --schema=../prisma/schema.prisma
```

或者使用 SQL 查询：

```sql
-- 查看创建的销售账号
SELECT email, "firstName", "lastName", role 
FROM users 
WHERE role = 'SALES' 
ORDER BY email;

-- 查看订单数量
SELECT COUNT(*) FROM offline_orders WHERE order_code LIKE 'OFF-SALES%';
```

## 🐛 故障排查

### 问题 1: 连接失败

```
Error: P1001: Can't reach database server
```

**解决**:
- 检查 DATABASE_URL 是否正确
- 检查网络连接
- 检查防火墙规则

### 问题 2: 认证失败

```
Error: P1000: Authentication failed
```

**解决**:
- 检查用户名和密码
- 确认数据库用户存在且有权限

### 问题 3: SSL 错误

```
Error: self signed certificate
```

**解决**:
- 在连接字符串中添加 `?sslmode=require`
- 或使用 `?sslmode=no-verify`（不推荐用于生产）

