# 登录 401 (Unauthorized) 排查与修复

当在 **printngoplus.com** 登录出现 `POST .../api/auth/login 401 (Unauthorized)` 时，通常是**后端连的数据库里没有对应用户**，或**密码与库中不一致**。

## 原因说明

- 前端请求：`https://printngoplus.com/api/auth/login` → 由 Next.js 转发到**后端**（`NEXT_PUBLIC_API_URL` 或 `API_BASE_URL` 指向的地址）。
- 后端用 **DATABASE_URL** 连数据库，按邮箱查用户并校验密码；用户不存在或密码错误会返回 401。

若你在**本机或别的环境**跑过恢复脚本（或只跑过 `create-manager-users.js`），但**生产后端**连的是**另一套数据库**（例如另一个 Neon 分支、另一个项目），那这些管理员账号只写入了你当时用的库，生产后端库里没有，登录就会 401。

## 解决步骤

### 1. 确认生产后端用的数据库

- 若后端在 **GCP Cloud Run**：在控制台该服务的「变量与密钥」里查看/确认 **DATABASE_URL**（或来自 Secret Manager 的 secret）。
- 记下这条连接串（或对应的 Neon 项目/分支），下面步骤要用**同一条**。

### 2. 用「生产库」在本机执行管理员脚本

在项目根目录执行，**把 `DATABASE_URL` 设成生产后端用的那条**（不要用本地或恢复分支的）：

```bash
cd /path/to/print-main
export DATABASE_URL='生产后端的 Neon 连接串'
node backend/scripts/create-manager-users.js
```

脚本会在这条连接串对应的库里**创建或更新**以下 5 个管理员（密码会按脚本里配置的写入）：

| 邮箱 | 密码 | 角色 |
|------|------|------|
| thea@printngoplus.com | manager@1600Print | ADMIN |
| patrick@printngoplus.com | manager@1600Print | ADMIN |
| erichecan@gmail.com | 511511 | ADMIN |
| yoyo@printngoplus.com | yoyo1600 | ADMIN |
| mia@printngoplus.com | mia1600 | ADMIN |

### 3. 再次尝试登录

在 printngoplus.com 用上表任一一组邮箱/密码登录。若仍 401，请检查：

- 登录时输入的邮箱、密码是否与上表**完全一致**（区分大小写、无多余空格）。
- 生产后端环境变量是否已用正确的 **DATABASE_URL** 并完成重新部署/生效。

### 4. 若仍失败

- 查看**后端日志**（Cloud Run 或部署平台）：登录请求会打 `[Auth] User not found` 或密码校验结果，可确认是「用户不存在」还是「密码错误」。
- 确认运行 `create-manager-users.js` 时使用的 `DATABASE_URL` 与生产后端当前使用的**完全一致**（同一 Neon 项目、同一分支）。
