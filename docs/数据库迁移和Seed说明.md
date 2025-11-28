# 数据库迁移和 Seed 数据说明

**更新时间**: 2025-11-28 12:30:00

---

## 问题背景

Admin 登录时显示 "Invalid email or password" 错误，可能是因为：
1. 数据库迁移已执行，但 seed 数据（包括 admin 用户）未运行
2. Admin 用户不存在或密码不匹配

---

## 解决方案

### 1. 自动运行 Seed 数据

已修改 `backend/scripts/run-migrations.js`，使其在迁移成功后自动运行 seed 数据：

```javascript
// [2025-11-28 12:20:00] 迁移成功后自动运行 seed 数据（包括 admin 用户）
if (prismaSuccess && sequelizeSuccess) {
  console.log('✅ 所有迁移已成功执行');
  
  // 迁移成功后自动运行 seed
  run(
    'npx sequelize-cli db:seed:all',
    'Sequelize seed（创建 admin 用户）',
    { timeout: 60000, allowFailure: true }
  );
}
```

### 2. Seed 数据重复检查

已修改 `backend/src/seeders/20251102000001-users.js`，添加重复检查，避免重复插入：

```javascript
// [2025-11-28 12:25:00] 检查用户是否已存在，避免重复插入
const [existingUsers] = await queryInterface.sequelize.query(
  `SELECT id FROM users WHERE email = 'admin@suvernireplus.com' LIMIT 1;`
);

if (existingUsers && existingUsers.length > 0) {
  console.log('ℹ️  Admin 用户已存在，跳过 seed');
  return;
}
```

---

## Admin 用户信息

**默认 Admin 用户**:
- **邮箱**: `admin@suvernireplus.com`
- **密码**: `admin123`
- **角色**: `ADMIN`
- **邮箱验证**: 已验证

---

## 如何手动运行 Seed

### 方法 1: 通过 Sequelize CLI

```bash
cd backend
npx sequelize-cli db:seed:all
```

### 方法 2: 通过 npm 脚本

```bash
cd backend
npm run db:seed
```

### 方法 3: 通过迁移脚本（自动）

当 `AUTO_MIGRATE=true` 时，服务器启动时会自动：
1. 运行 Prisma 迁移
2. 运行 Sequelize 迁移
3. 运行 seed 数据

---

## 验证 Admin 用户

### 检查用户是否存在

```bash
# 使用 check-admin-user.js 脚本
node scripts/check-admin-user.js
```

### 修复 Admin 用户

如果用户不存在或密码错误，可以运行：

```bash
# 使用 fix-admin-user.js 脚本
node scripts/fix-admin-user.js
```

---

## GCP 部署后的操作

### 自动处理

如果 `AUTO_MIGRATE=true` 环境变量已设置（已在 `cloudbuild.yaml` 中配置），重新部署后会自动：
1. 运行迁移
2. 运行 seed 数据
3. 创建 admin 用户

### 手动处理

如果自动处理失败，可以通过 Cloud Run 执行命令：

```bash
# 连接到 Cloud Run 服务并执行 seed
gcloud run jobs create run-seed \
  --image=${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REGISTRY}/backend:latest \
  --region=us-central1 \
  --set-env-vars="AUTO_MIGRATE=true" \
  --set-secrets="DATABASE_URL=database-url:latest" \
  --command="node" \
  --args="scripts/run-seed.js"
```

---

## 常见问题

### Q: Seed 失败怎么办？

A: Seed 脚本配置了 `allowFailure: true`，即使失败也不会阻止服务器启动。可以：
1. 检查数据库连接
2. 手动运行 seed 命令
3. 使用 `fix-admin-user.js` 脚本创建用户

### Q: 如何更改 Admin 密码？

A: 可以使用 `fix-admin-user.js` 脚本更新密码，或直接修改数据库。

### Q: 多个 Admin 用户？

A: Seed 脚本会检查用户是否已存在，避免重复创建。如果需要多个 Admin 用户，可以手动创建或修改 seed 脚本。

---

## 相关文件

- `backend/scripts/run-migrations.js` - 迁移脚本（自动运行 seed）
- `backend/src/seeders/20251102000001-users.js` - Admin 用户 seed
- `scripts/fix-admin-user.js` - 修复 Admin 用户脚本
- `scripts/check-admin-user.js` - 检查 Admin 用户脚本
- `cloudbuild.yaml` - GCP 部署配置（包含 `AUTO_MIGRATE=true`）

