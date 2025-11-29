# Admin 登录问题修复说明

**更新时间**: 2025-11-28 12:50:00

---

## 问题分析

Admin 登录时显示 "Invalid email or password"，原因是：

1. **Admin 用户不存在**
   - 日志显示：`[Auth] User not found: admin@suvernireplus.com`
   - Seed 数据未运行或运行失败

2. **迁移失败**
   - 有迁移失败的错误，导致 seed 未执行
   - 错误：`The 20251118104512_catalog_projects migration started at ... failed`

3. **邮箱不一致**
   - Seed 使用：`admin@suvernireplus.com`
   - 登录尝试：`admin@suvernireplus.com` 或 `admin@souvenirplus.com`

---

## 解决方案

### 已实施的修复

1. **创建了直接创建用户的脚本**
   - `backend/scripts/create-admin-user.js` - 使用 Prisma 直接创建 admin 用户

2. **更新了迁移脚本**
   - `backend/scripts/run-migrations.js` - 迁移后自动运行 seed 并创建 admin 用户

3. **创建了临时 API 端点**
   - `backend/src/routes/admin-setup.js` - `/api/admin-setup/create-user`
   - 可以通过 HTTP 请求快速创建用户

4. **已重新部署到 GCP**
   - 新代码包含自动创建用户的逻辑
   - 部署后会自动运行并创建 admin 用户

---

## 部署后的验证步骤

### 1. 等待部署完成（10-15 分钟）

检查部署状态：
```bash
gcloud builds list --limit=1 --project=moonlit-gamma-479502-r6
```

### 2. 验证 Admin 用户是否创建

部署完成后，可以通过以下方式验证：

**方法 1: 直接测试登录**
- 访问：`https://print-main-frontend-hsbqzlnkxa-uc.a.run.app/admin/login`
- 使用：
  - 邮箱：`admin@suvernireplus.com`
  - 密码：`admin123`

**方法 2: 通过 API 端点创建（如果自动创建失败）**
```bash
curl -X POST "https://print-main-backend-hsbqzlnkxa-uc.a.run.app/api/admin-setup/create-user" \
  -H "Content-Type: application/json"
```

**方法 3: 查看后端日志**
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=print-main-backend" \
  --limit=50 \
  --project=moonlit-gamma-479502-r6 \
  --format=json | grep -i "admin\|seed\|create"
```

---

## Admin 用户信息

- **邮箱**: `admin@suvernireplus.com`
- **密码**: `admin123`
- **角色**: `ADMIN`
- **邮箱验证**: 已验证

---

## 如果登录仍然失败

### 检查清单

1. ✅ 部署是否完成？
   ```bash
   gcloud builds list --limit=1 --project=moonlit-gamma-479502-r6
   ```

2. ✅ 用户是否已创建？
   - 查看后端日志是否有 "Admin 用户已创建" 消息

3. ✅ 邮箱是否正确？
   - 使用：`admin@suvernireplus.com`（注意拼写）

4. ✅ 密码是否正确？
   - 使用：`admin123`

### 手动修复

如果自动创建失败，可以手动调用 API：

```bash
# 创建 admin 用户
curl -X POST "https://print-main-backend-hsbqzlnkxa-uc.a.run.app/api/admin-setup/create-user" \
  -H "Content-Type: application/json"
```

或者使用 fix-admin-user.js 脚本（需要本地连接数据库）。

---

## 后续清理

修复成功后，建议：

1. **禁用临时 API 端点**（安全考虑）
   - 从 `backend/src/app.js` 中移除 `/api/admin-setup` 路由
   - 或在路由中添加认证保护

2. **验证迁移问题**
   - 检查失败的迁移 `20251118104512_catalog_projects`
   - 修复迁移错误，确保未来部署正常

---

**预计修复时间**: 部署完成后立即生效

