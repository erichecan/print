# Apify MCP 服务器配置指南
[2025-01-27 23:45:00] 配置 Apify MCP 服务器，用于在 Cursor 中通过 Apify Actors 提取网页数据

## 📋 什么是 Apify MCP？

Apify MCP 是一个 Model Context Protocol 服务器，允许 Cursor 通过 Apify 平台使用数千个现成的爬虫、数据提取工具和自动化工具，实现：
- 从社交媒体、搜索引擎、地图、电商网站等提取数据
- 使用 Apify Store 中的现成 Actors
- 运行自定义的网页抓取和自动化任务

## ✅ 已完成的配置

Apify MCP 服务器配置已添加到 Cursor 配置文件：

**配置文件位置**: `~/.cursor/mcp.json`

**配置内容**:
```json
{
  "mcpServers": {
    "apify": {
      "command": "npx",
      "args": ["-y", "@apify/actors-mcp-server@latest"]
    }
  }
}
```

## 🔑 获取 Apify API Token

### 步骤 1：创建 Apify 账户

1. 访问 https://apify.com
2. 注册或登录你的账户

### 步骤 2：生成 API Token

1. 登录后，点击右上角的用户头像
2. 选择 **Settings**（设置）
3. 在左侧菜单中找到 **Integrations**（集成）
4. 找到 **Personal API tokens**（个人 API 令牌）
5. 点击 **Create token**（创建令牌）
6. 输入令牌名称（例如：`Cursor MCP`）
7. 选择权限范围（通常选择 **Full access** 或根据需要选择）
8. 点击 **Create**（创建）
9. **重要**：立即复制生成的 API Token，因为以后无法再次查看

⚠️ **安全提示**：
- API Token 具有账户的访问权限
- 不要将 API Token 提交到 Git 仓库
- 如果泄露，立即在 Apify Dashboard 中删除并重新生成

## ⚙️ 设置环境变量

### macOS/Linux

在终端中运行：

```bash
export APIFY_TOKEN="your-apify-token-here"
```

要永久设置（添加到 `~/.zshrc` 或 `~/.bashrc`）：

```bash
echo 'export APIFY_TOKEN="your-apify-token-here"' >> ~/.zshrc
source ~/.zshrc
```

### Windows

在 PowerShell 中运行：

```powershell
$env:APIFY_TOKEN="your-apify-token-here"
```

要永久设置（添加到系统环境变量）：
1. 打开"系统属性" > "高级" > "环境变量"
2. 在"用户变量"中添加新变量：
   - 变量名：`APIFY_TOKEN`
   - 变量值：你的 API Token

### 在 MCP 配置中设置（可选）

如果你不想在系统级别设置环境变量，也可以在 MCP 配置中直接设置：

```json
{
  "mcpServers": {
    "apify": {
      "command": "npx",
      "args": ["-y", "@apify/actors-mcp-server@latest"],
      "env": {
        "APIFY_TOKEN": "your-apify-token-here"
      }
    }
  }
}
```

⚠️ **注意**：这种方式会将 Token 存储在配置文件中，安全性较低，不推荐用于生产环境。

## 🔄 下一步

### 步骤 1: 重启 Cursor

配置完成后，需要**重启 Cursor** 以使 MCP 服务器生效。

### 步骤 2: 验证安装

重启后，Cursor 会自动：
1. 通过 `npx` 下载并安装 `@apify/actors-mcp-server@latest`
2. 启动 MCP 服务器
3. 在 Cursor 中提供 Apify 工具

### 步骤 3: 使用 Apify MCP

重启后，你可以在 Cursor 中使用以下功能：

- **搜索 Actors**：在 Apify Store 中搜索可用的爬虫和自动化工具
- **运行 Actors**：执行数据提取任务
- **查看文档**：获取 Actors 的使用说明和参数配置
- **管理任务**：查看运行状态和结果

## 🔧 配置说明

### 配置格式

```json
{
  "mcpServers": {
    "apify": {
      "command": "npx",                    // 使用 npx 运行包
      "args": ["-y", "@apify/actors-mcp-server@latest"]  // 自动确认，使用最新版本
    }
  }
}
```

### 参数说明

- `command: "npx"`: 使用 Node.js 的 npx 工具运行包
- `args: ["-y", "..."]`: 
  - `-y`: 自动确认安装提示
  - `@apify/actors-mcp-server@latest`: 使用最新的 Apify MCP 服务器包

### 工具选择（高级配置）

你可以通过 `--tools` 参数选择要启用的工具：

```json
{
  "mcpServers": {
    "apify": {
      "command": "npx",
      "args": ["-y", "@apify/actors-mcp-server@latest", "--tools", "actors,docs,apify/rag-web-browser"]
    }
  }
}
```

可用的工具类别：
- `actors`: 所有 Actors 相关工具
- `docs`: 文档工具
- `apify/rag-web-browser`: RAG Web Browser Actor
- `experimental`: 实验性功能（包括添加新 Actors）

## 📝 多个 MCP 服务器配置

如果你还有其他 MCP 服务器（如 Context7、Chrome DevTools），可以合并配置：

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest"]
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    },
    "apify": {
      "command": "npx",
      "args": ["-y", "@apify/actors-mcp-server@latest"]
    }
  }
}
```

## 🐛 故障排查

### 问题 1：MCP 服务器连接失败

**原因**：API Token 未设置或无效

**解决方案**：
1. 确认 `APIFY_TOKEN` 环境变量已正确设置
2. 在终端中运行 `echo $APIFY_TOKEN`（macOS/Linux）或 `echo $env:APIFY_TOKEN`（Windows）验证
3. 确认 API Token 在 Apify Dashboard 中仍然有效
4. 如果使用配置中的 `env` 字段，确认 JSON 格式正确

### 问题 2：无法找到 MCP 工具

**原因**：Cursor 未正确加载 MCP 服务器

**解决方案**：
1. 确认 `mcp.json` 文件格式正确（有效的 JSON）
2. 重启 Cursor
3. 检查 Cursor 的日志文件查看错误信息
4. 确认 Node.js 已安装（运行 `node -v` 应该显示 v18 或更高版本）

### 问题 3：权限错误

**原因**：API Token 权限不足

**解决方案**：
1. 确认 API Token 具有足够的权限
2. 在 Apify Dashboard 中重新生成具有完整权限的 Token
3. 检查账户是否有足够的配额

### 问题 4：模块未找到错误

**原因**：npx 无法正确解析包

**解决方案**：
尝试使用 `bunx` 替代 `npx`：

```json
{
  "mcpServers": {
    "apify": {
      "command": "bunx",
      "args": ["-y", "@apify/actors-mcp-server@latest"]
    }
  }
}
```

## 🔐 安全最佳实践

1. **不要在代码中硬编码 API Token**
2. **使用环境变量**：优先在系统级别设置环境变量，而不是在配置文件中
3. **定期轮换 Token**：定期更新 API Token 以提高安全性
4. **限制权限**：如果可能，创建具有最小必要权限的 Token
5. **监控使用**：定期检查 Apify Dashboard 中的 API 使用情况

## 📚 了解更多

- [Apify 官方文档](https://docs.apify.com/)
- [Apify Store](https://apify.com/store)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Apify MCP 服务器 GitHub](https://github.com/apify/apify-mcp-server)

## 💡 使用示例

配置完成后，你可以在 Cursor 中使用 Apify MCP 来：

1. **搜索 Actors**：查找适合你需求的网页抓取工具
2. **运行数据提取**：从网站提取产品信息、价格、评论等
3. **自动化任务**：执行重复性的网页操作和数据收集
4. **监控网站变化**：定期检查网站内容更新

例如，你可以使用 Apify MCP 来：
- 从电商网站提取产品信息和价格
- 从社交媒体平台收集数据
- 从搜索引擎获取搜索结果
- 从地图服务提取位置信息

