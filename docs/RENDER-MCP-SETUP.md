# Render MCP 服务器配置指南
[2025-01-11 14:35:00] 配置 Render MCP 服务器以通过 Cursor 管理 Render 服务

## 📋 前提条件

1. Render 账户（https://render.com）
2. Cursor IDE
3. Render API Key

## 🔑 获取 Render API Key

### 步骤 1：登录 Render Dashboard

1. 访问 https://dashboard.render.com
2. 登录你的账户

### 步骤 2：生成 API Key

1. 点击右上角的用户头像
2. 选择 **Account Settings**（账户设置）
3. 在左侧菜单中找到 **API Keys**（API 密钥）
4. 点击 **Create API Key**（创建 API 密钥）
5. 输入密钥名称（例如：`Cursor MCP`）
6. 点击 **Create**（创建）
7. **重要**：立即复制生成的 API Key，因为以后无法再次查看

⚠️ **安全提示**：
- API Key 具有账户的完整访问权限
- 不要将 API Key 提交到 Git 仓库
- 如果泄露，立即在 Render Dashboard 中删除并重新生成

## ⚙️ 配置 MCP 服务器

### 方法 1：通过 Cursor 设置（推荐）

1. 打开 Cursor
2. 按 `Cmd+,` (macOS) 或 `Ctrl+,` (Windows) 打开设置
3. 搜索 "MCP" 或 "Model Context Protocol"
4. 找到 MCP Servers 配置
5. 添加 Render MCP 服务器配置

### 方法 2：直接编辑配置文件

MCP 配置文件位置：
- **macOS**: `~/.cursor/mcp.json`
- **Windows**: `%APPDATA%\Cursor\mcp.json`
- **Linux**: `~/.config/Cursor/mcp.json`

编辑 `mcp.json` 文件，添加以下配置：

```json
{
  "mcpServers": {
    "render": {
      "url": "https://mcp.render.com/mcp",
      "headers": {
        "Authorization": "Bearer <YOUR_API_KEY>"
      }
    }
  }
}
```

**替换 `<YOUR_API_KEY>` 为你的实际 Render API Key**

例如：

```json
{
  "mcpServers": {
    "render": {
      "url": "https://mcp.render.com/mcp",
      "headers": {
        "Authorization": "Bearer rnd_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

### 步骤 3：重启 Cursor

配置完成后，需要重启 Cursor 以使 MCP 服务器生效。

## ✅ 验证配置

重启 Cursor 后，你应该能够：

1. 在 Cursor 中使用 Render MCP 工具
2. 通过 Cursor 查询和更新 Render 服务配置
3. 修改构建命令、环境变量等

## 🔧 使用 MCP 更新构建命令

配置好 MCP 服务器后，你可以通过 Cursor 直接更新 Render 服务的构建命令：

### 推荐构建命令

**如果 Base Directory 为空（从根目录构建）**：
```bash
cd backend && npm install && npx prisma generate --schema=../prisma/schema.prisma
```

**如果 Base Directory 设置为 `backend`**：
```bash
npm install && npx prisma generate --schema=../prisma/schema.prisma
```

### 使用 MCP 更新构建命令的步骤

1. 在 Cursor 中，使用 MCP 工具查询你的 Render 服务
2. 找到需要更新的服务
3. 使用 MCP 工具更新构建命令
4. 服务将自动重新部署

## 📝 配置示例

完整的 `mcp.json` 配置示例：

```json
{
  "mcpServers": {
    "render": {
      "url": "https://mcp.render.com/mcp",
      "headers": {
        "Authorization": "Bearer rnd_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

## 🐛 故障排查

### 问题 1：MCP 服务器连接失败

**原因**：API Key 无效或配置错误

**解决方案**：
1. 确认 API Key 正确复制（没有多余空格）
2. 确认 Authorization header 格式正确：`Bearer <API_KEY>`
3. 检查 Render Dashboard 中的 API Key 是否仍然有效

### 问题 2：无法找到 MCP 工具

**原因**：Cursor 未正确加载 MCP 服务器

**解决方案**：
1. 确认 `mcp.json` 文件格式正确（有效的 JSON）
2. 重启 Cursor
3. 检查 Cursor 的日志文件查看错误信息

### 问题 3：权限错误

**原因**：API Key 权限不足

**解决方案**：
1. 确认 API Key 是在主账户下创建的
2. 检查 Render Dashboard 中的服务权限设置
3. 如果使用团队账户，确认账户有足够权限

## 🔐 安全最佳实践

1. **不要在代码中硬编码 API Key**
   - API Key 应该只存在于本地配置文件中
   - 确保 `mcp.json` 在 `.gitignore` 中

2. **定期轮换 API Key**
   - 每 90 天更换一次 API Key
   - 如果怀疑泄露，立即删除并重新生成

3. **使用最小权限原则**
   - 只为需要的服务创建 API Key
   - 如果不需要，及时删除旧的 API Key

## 📚 相关文档

- [Render API 文档](https://render.com/docs/api)
- [Render MCP 服务器](https://mcp.render.com/mcp)
- [Cursor MCP 配置文档](https://docs.cursor.com/mcp)
- [Render 构建命令配置指南](./RENDER-BUILD-COMMAND-CONFIG.md)

---

**最后更新**：2025-01-11 14:35:00

