# Render 构建命令配置指南
[2025-01-11 14:30:00] 配置 Render 服务的构建命令，确保 Prisma Client 正确生成

## 📋 当前推荐的构建命令

### 方案 1：从项目根目录构建（推荐）

如果你的 Render 服务是从项目根目录开始构建，使用以下构建命令：

```bash
cd backend && npm install && npx prisma generate --schema=../prisma/schema.prisma
```

**说明**：
- `cd backend` - 进入后端目录
- `npm install` - 安装依赖
- `npx prisma generate --schema=../prisma/schema.prisma` - 生成 Prisma Client（schema 在根目录）

### 方案 2：从 backend 目录构建

如果你的 Render 服务 Base Directory 设置为 `backend`，使用以下构建命令：

```bash
npm install && npx prisma generate --schema=../prisma/schema.prisma
```

### 方案 3：完整构建命令（包含迁移，可选）

如果你想在构建时也运行迁移（但不推荐，因为迁移应该在启动时运行）：

```bash
cd backend && npm install && npx prisma generate --schema=../prisma/schema.prisma && node scripts/run-migrations.js
```

**注意**：迁移会在服务器启动时通过 `AUTO_MIGRATE=true` 自动运行，所以通常不需要在构建时运行。

---

## 🔧 在 Render Dashboard 中配置

### 步骤 1：进入服务设置

1. 登录 Render Dashboard：https://dashboard.render.com
2. 选择你的 Web Service
3. 点击 **Settings** 标签

### 步骤 2：配置构建命令

1. 向下滚动到 **Build & Deploy** 部分
2. 找到 **Build Command** 字段
3. 输入以下命令（根据你的构建方式选择）：

**如果 Base Directory 为空（根目录构建）**：
```bash
cd backend && npm install && npx prisma generate --schema=../prisma/schema.prisma
```

**如果 Base Directory 设置为 `backend`**：
```bash
npm install && npx prisma generate --schema=../prisma/schema.prisma
```

4. 点击 **Save Changes**

### 步骤 3：配置启动命令

确认 **Start Command** 设置为：

```bash
node server.js
```

### 步骤 4：确认环境变量

在 **Environment** 部分，确认以下环境变量已设置：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `DATABASE_URL` | `postgresql://...` | 数据库连接字符串 |
| `NODE_ENV` | `production` | 环境模式 |
| `AUTO_MIGRATE` | `true` | 自动运行迁移 |
| `FRONTEND_URL` | `https://your-site.netlify.app` | 前端域名 |

### 步骤 5：重新部署

1. 点击 **Manual Deploy** → **Deploy latest commit**
2. 或在 **Events** 标签查看自动部署进度

---

## ✅ 验证配置

### 1. 查看构建日志

在 **Logs** 标签中，应该能看到：

```
==> Running build command...
cd backend && npm install && npx prisma generate --schema=../prisma/schema.prisma
...
> @prisma/client@5.8.1
...
Prisma Client generated successfully
...
==> Build successful 🎉
```

### 2. 查看启动日志

在 **Logs** 标签中，应该能看到：

```
✅ Database connection established successfully.
开始执行: Prisma migrate deploy
✅ Prisma migrate deploy 完成
开始执行: Sequelize CLI migrate
✅ Sequelize CLI migrate 完成
✅ 所有迁移已成功执行
🚀 Server running on port 3000
```

### 3. 测试 API

```bash
curl https://your-app.onrender.com/health
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

---

## 🔍 常见问题

### 问题 1：构建失败 - "Cannot find module '@prisma/client'"

**原因**：Prisma Client 未生成

**解决方案**：
1. 确认构建命令包含 `npx prisma generate`
2. 确认 schema 路径正确（`--schema=../prisma/schema.prisma`）
3. 重新部署

### 问题 2：构建失败 - "Cannot find schema.prisma"

**原因**：Schema 路径错误

**解决方案**：
- 如果从根目录构建：`--schema=../prisma/schema.prisma`
- 如果从 backend 目录构建：`--schema=../prisma/schema.prisma`
- 检查 prisma 文件夹是否在项目根目录

### 问题 3：启动失败 - "Prisma Client not initialized"

**原因**：Prisma Client 未生成或路径错误

**解决方案**：
1. 确认构建命令正确
2. 查看构建日志确认 Prisma Client 生成成功
3. 检查 `backend/src/lib/prisma.js` 是否正确导入

---

## 📝 完整的 Render 配置示例

### Web Service 配置

```yaml
Name: your-backend-service
Environment: Node
Region: Oregon (US West)
Branch: main
Root Directory: (留空) 或 backend
Build Command: cd backend && npm install && npx prisma generate --schema=../prisma/schema.prisma
Start Command: node server.js
Instance Type: Free
```

### 环境变量配置

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/dbname
AUTO_MIGRATE=true
FRONTEND_URL=https://your-site.netlify.app
PORT=3000
```

---

## 🔄 更新构建命令后的操作

1. ✅ 保存构建命令配置
2. ✅ 触发重新部署（手动或自动）
3. ✅ 查看构建日志确认成功
4. ✅ 查看启动日志确认迁移成功
5. ✅ 测试 API 端点确认正常

---

**最后更新**：2025-01-11 14:30:00

