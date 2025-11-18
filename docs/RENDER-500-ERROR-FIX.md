# Render 500 错误修复指南
[2025-01-11 14:25:00] 解决 Render API 返回 500 错误的排查和修复方法

## 🔴 问题现象

1. **API 请求失败**：`GET https://print-mnmz.onrender.com/api/products` 返回 500 错误
2. **前端无法加载数据**：Netlify 前端访问时出现 500 错误
3. **本地上传的商品线上看不到**：本地调试时上传的商品在线上环境看不到

## 🔍 问题原因

### 主要原因

1. **Prisma Client 未生成**
   - Render 构建命令可能缺少 `prisma generate` 步骤
   - Prisma Client 需要在运行前生成

2. **数据库连接问题**
   - 数据库迁移未执行
   - 数据库连接配置错误

3. **错误信息不详细**
   - 生产环境错误信息被隐藏，难以排查

## ✅ 解决方案

### 步骤 1：检查 Render 构建命令

在 Render Dashboard → 你的服务 → Settings → Build & Deploy 中，确保构建命令为：

```bash
cd backend && npm install && npx prisma generate --schema=../prisma/schema.prisma
```

或者如果你的构建命令是：

```bash
npm install;
```

需要改为：

```bash
cd backend && npm install && npx prisma generate --schema=../prisma/schema.prisma;
```

**注意**：
- 工作目录需要是 `backend/`（如果从根目录构建）
- 必须生成 Prisma Client 才能使用 Prisma
- `--schema=../prisma/schema.prisma` 指定 schema 路径（因为 schema 在项目根目录）

### 步骤 2：检查环境变量

在 Render Dashboard → 你的服务 → Environment 中，确认以下环境变量：

| 变量名 | 必需 | 说明 |
|--------|------|------|
| `DATABASE_URL` | ✅ | PostgreSQL 连接字符串 |
| `NODE_ENV` | ✅ | 设置为 `production` |
| `AUTO_MIGRATE` | 推荐 | 设置为 `true` 以自动运行迁移 |
| `FRONTEND_URL` | ✅ | 前端域名（用于 CORS） |

### 步骤 3：检查数据库迁移

确认迁移是否成功执行：

1. 在 Render Dashboard → Logs 中查看启动日志
2. 应该能看到类似以下输出：
   ```
   开始执行: Prisma migrate deploy
   ✅ Prisma migrate deploy 完成
   开始执行: Sequelize CLI migrate
   ✅ Sequelize CLI migrate 完成
   ```

3. 如果迁移失败，检查：
   - `DATABASE_URL` 是否正确
   - 数据库是否可访问
   - 迁移文件是否有错误

### 步骤 4：查看详细错误日志

1. 在 Render Dashboard → Logs 中查看实时日志
2. 访问 API 端点触发错误
3. 查看日志中的错误信息，应该能看到：
   ```
   [Product Controller] Error fetching products: ...
   [Product Controller] Error stack: ...
   [Product Controller] Error message: ...
   ```

### 步骤 5：验证数据库连接

访问健康检查端点：

```
https://your-app.onrender.com/health
```

应该返回：

```json
{
  "status": "ok",
  "services": {
    "database": "connected"
  }
}
```

如果 `database` 状态不是 `connected`，说明数据库连接有问题。

## 🐛 常见错误和解决方案

### 错误 1：`Cannot find module '@prisma/client'`

**原因**：Prisma Client 未生成

**解决方案**：
1. 确保构建命令包含 `npx prisma generate`
2. 重新部署服务

### 错误 2：`P1001: Can't reach database server`

**原因**：数据库连接失败

**解决方案**：
1. 检查 `DATABASE_URL` 是否正确
2. 确认数据库服务是否运行
3. 检查防火墙/网络设置

### 错误 3：`P2021: Table does not exist`

**原因**：数据库迁移未执行

**解决方案**：
1. 设置 `AUTO_MIGRATE=true` 环境变量
2. 或手动运行迁移：
   ```bash
   cd backend
   node scripts/run-migrations.js
   ```

### 错误 4：本地上传的商品线上看不到

**可能原因**：

1. **本地和线上使用不同数据库**
   - 检查本地 `.env` 中的 `DATABASE_URL`
   - 如果本地连接的是测试数据库，数据不会出现在线上

2. **数据库迁移未同步**
   - 本地可能有新表结构，线上没有
   - 确保运行了迁移

3. **数据未提交到线上数据库**
   - 确认本地的 `DATABASE_URL` 指向线上数据库
   - 或手动将数据导入线上数据库

**解决方案**：

如果你想要本地和线上共享数据：

1. 在本地 `.env` 中使用线上的 `DATABASE_URL`：
   ```env
   DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/dbname
   ```

2. **⚠️ 注意**：这会直接修改线上数据库，请谨慎操作

如果你想要分离本地和线上数据：

1. 在线上环境通过 API 或管理后台重新上传商品
2. 或使用数据库备份/恢复工具迁移数据

## 📝 验证修复

修复后，执行以下检查：

1. **健康检查**
   ```bash
   curl https://your-app.onrender.com/health
   ```
   应该返回 `"database": "connected"`

2. **API 测试**
   ```bash
   curl https://your-app.onrender.com/api/products?page=1&limit=1
   ```
   应该返回产品列表，而不是 500 错误

3. **前端测试**
   - 访问 Netlify 前端
   - 打开开发者工具（F12）
   - 查看 Network 标签
   - API 请求应该成功（200）

## 🔄 完整修复流程

1. ✅ 更新 Render 构建命令，包含 `prisma generate`
2. ✅ 确认环境变量配置正确
3. ✅ 确认 `AUTO_MIGRATE=true`
4. ✅ 重新部署服务
5. ✅ 查看日志确认迁移成功
6. ✅ 测试健康检查端点
7. ✅ 测试 API 端点
8. ✅ 测试前端连接

---

**最后更新**：2025-01-11 14:25:00

