# Chrome DevTools MCP 配置指南

[2025-01-27 23:40:00] 配置 Chrome DevTools MCP 服务器，用于在 Cursor 中调试网页

## 📋 什么是 Chrome DevTools MCP？

Chrome DevTools MCP 是一个 Model Context Protocol 服务器，允许 Cursor 通过 Chrome DevTools Protocol 与 Chrome 浏览器交互，实现：
- 网页自动化
- 调试和截图
- 性能分析
- 网络请求监控

## ✅ 已完成的配置

Chrome DevTools MCP 服务器配置已添加到 Cursor 配置文件：

**配置文件位置**: `~/.cursor/mcp.json`

**配置内容**:
```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest"]
    }
  }
}
```

## 🔄 下一步

### 步骤 1: 重启 Cursor

配置完成后，需要**重启 Cursor** 以使 MCP 服务器生效。

### 步骤 2: 验证安装

重启后，Cursor 会自动：
1. 通过 `npx` 下载并安装 `chrome-devtools-mcp@latest`
2. 启动 MCP 服务器
3. 在 Cursor 中提供 Chrome DevTools 工具

### 步骤 3: 使用 Chrome DevTools MCP

重启后，你可以在 Cursor 中使用以下功能：

- **浏览器导航**：打开网页、点击元素、输入文本
- **截图**：捕获页面截图
- **调试**：查看控制台日志、网络请求
- **性能分析**：监控页面性能指标

## 🔧 配置说明

### 配置格式

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",                    // 使用 npx 运行包
      "args": ["-y", "chrome-devtools-mcp@latest"]  // 自动确认，使用最新版本
    }
  }
}
```

### 参数说明

- `command: "npx"`: 使用 Node.js 的 npx 工具运行包
- `args: ["-y", "..."]`: 
  - `-y`: 自动确认安装提示
  - `chrome-devtools-mcp@latest`: 使用最新的 Chrome DevTools MCP 包

## 📝 多个 MCP 服务器配置

如果你还有其他 MCP 服务器（如 Render MCP），可以合并配置：

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest"]
    },
    "render": {
      "url": "https://mcp.render.com/mcp",
      "headers": {
        "Authorization": "Bearer <YOUR_API_KEY>"
      }
    }
  }
}
```

## 🐛 故障排查

### 问题 1: MCP 服务器未启动

**原因**：Cursor 未重启或配置格式错误

**解决方案**：
1. 确认 `mcp.json` 文件格式正确（有效的 JSON）
2. 重启 Cursor
3. 检查 Cursor 的开发者工具查看错误信息

### 问题 2: npx 命令失败

**原因**：Node.js 未安装或不在 PATH 中

**解决方案**：
1. 确认已安装 Node.js：`node --version`
2. 确认 npx 可用：`npx --version`
3. 检查 PATH 环境变量

### 问题 3: Chrome 无法启动

**原因**：Chrome 浏览器未安装或路径不正确

**解决方案**：
1. 确认已安装 Chrome 浏览器
2. Chrome DevTools MCP 会自动查找 Chrome
3. 如果使用自定义路径，可能需要配置环境变量

## 📚 相关资源

- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Cursor MCP 文档](https://cursor.sh/docs/mcp)

---

**最后更新**: 2025-01-27 23:40:00

