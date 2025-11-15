# Netlify 环境变量设置指南

## 问题：找不到修改按钮

如果你在 Netlify Dashboard 中找不到修改环境变量的按钮，可能有以下几种情况：

## 方法 1：通过 Netlify Dashboard 添加（推荐）

### 详细步骤：

1. **登录 Netlify Dashboard**
   - 访问 https://app.netlify.com
   - 登录你的账户

2. **进入站点设置**
   - 点击你的站点名称（例如：`souvenirplus`）
   - 在左侧菜单中，点击 **Site settings**（站点设置）

3. **找到环境变量设置**
   - 在左侧菜单中，点击 **Build & deploy**（构建和部署）
   - 向下滚动，找到 **Environment variables**（环境变量）部分
   - 点击 **Environment variables**

4. **添加新变量**
   - 点击右上角的 **Add a variable**（添加变量）按钮
   - 或者点击 **Add variable** 按钮（通常在列表上方）

5. **填写变量信息**
   - **Key（键）**: `NEXT_PUBLIC_API_URL`
   - **Value（值）**: `https://print-mnmz.onrender.com/api`
   - **Scopes（作用域）**: 选择 **All scopes**（所有作用域）或根据需要选择
   - 点击 **Save**（保存）

### 如果看不到 "Add a variable" 按钮：

- **检查权限**：确保你是站点的所有者或有编辑权限
- **刷新页面**：尝试刷新浏览器页面（F5 或 Cmd+R）
- **使用不同浏览器**：尝试使用 Chrome 或 Firefox
- **检查站点状态**：确保站点没有被暂停或锁定

## 方法 2：通过 netlify.toml 文件设置（备选方案）

如果 Dashboard 中无法设置，可以在 `netlify.toml` 文件中直接设置：

### 步骤：

1. **编辑 netlify.toml 文件**
   - 打开项目根目录的 `netlify.toml` 文件
   - 找到 `[build.environment]` 部分

2. **取消注释环境变量**
   - 找到这一行：`# NEXT_PUBLIC_API_URL = "https://print-mnmz.onrender.com/api"`
   - 删除前面的 `#` 号，使其生效：
     ```toml
     [build.environment]
       NEXT_PUBLIC_API_URL = "https://print-mnmz.onrender.com/api"
     ```

3. **提交并推送**
   ```bash
   git add netlify.toml
   git commit -m "添加 NEXT_PUBLIC_API_URL 环境变量到 netlify.toml"
   git push origin main
   ```

4. **触发重新部署**
   - Netlify 会自动检测到代码更改并重新部署
   - 或者手动在 Dashboard 中触发部署

### 注意事项：

- ⚠️ **安全性**：`NEXT_PUBLIC_*` 变量会暴露给浏览器，所以可以安全地放在 `netlify.toml` 中
- ⚠️ **优先级**：如果 Dashboard 和 `netlify.toml` 都设置了同一个变量，Dashboard 的优先级更高
- ⚠️ **敏感信息**：不要将敏感信息（如 API 密钥、密码）放在 `netlify.toml` 中，应该使用 Dashboard

## 方法 3：使用 Netlify CLI（高级用户）

如果你安装了 Netlify CLI，可以使用命令行设置：

```bash
# 安装 Netlify CLI（如果还没有安装）
npm install -g netlify-cli

# 登录
netlify login

# 设置环境变量
netlify env:set NEXT_PUBLIC_API_URL "https://print-mnmz.onrender.com/api"

# 查看所有环境变量
netlify env:list
```

## 验证环境变量是否设置成功

### 方法 1：检查构建日志

1. 在 Netlify Dashboard 中，进入 **Deploys**（部署）页面
2. 点击最新的部署
3. 查看构建日志，搜索 `NEXT_PUBLIC_API_URL`
4. 应该能看到环境变量的值

### 方法 2：在代码中输出（临时测试）

在 `apps/web/src/lib/api-config.ts` 中，我已经添加了开发环境的日志输出：

```typescript
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('[API Config] API_BASE_URL:', API_BASE_URL);
  console.log('[API Config] NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
}
```

部署后，在浏览器控制台中应该能看到这些日志。

### 方法 3：检查网络请求

1. 打开你的网站（例如：https://souvenirplus.netlify.app）
2. 打开浏览器开发者工具（F12）
3. 进入 **Network**（网络）标签
4. 尝试登录或加载购物车
5. 查看 API 请求的 URL，应该是 `https://print-mnmz.onrender.com/api/...`

## 常见问题

### Q: 为什么我修改了环境变量，但网站还是没有变化？

A: 环境变量更改后，需要**重新部署**才能生效：
1. 在 Netlify Dashboard 中，进入 **Deploys** 页面
2. 点击 **Trigger deploy** > **Deploy site**
3. 等待部署完成

### Q: 环境变量设置了，但构建时还是使用旧值？

A: 检查以下几点：
1. 变量名是否正确（区分大小写）：`NEXT_PUBLIC_API_URL`
2. 是否选择了正确的 Scope（作用域）
3. 是否有多个环境变量同名（检查是否有重复）

### Q: 我可以直接在代码中硬编码 API URL 吗？

A: 不推荐。使用环境变量可以：
- 在不同环境（开发、生产）使用不同的 API URL
- 方便切换后端服务
- 遵循最佳实践

## 推荐方案

**优先使用方法 1（Dashboard）**，如果无法使用，再使用方法 2（netlify.toml）。

我已经在 `netlify.toml` 中添加了注释掉的环境变量配置，你可以根据需要取消注释。

