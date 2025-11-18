# Netlify 与 Render 线上联调指南
[2025-01-11 14:15:00] 完整的线上环境前后端联调配置说明

## ✅ 联调前检查清单

### 1. Render 后端部署确认

- [ ] Render 服务部署成功
- [ ] 数据库连接正常
- [ ] 迁移脚本执行成功
- [ ] API 健康检查通过：`https://your-app.onrender.com/api/health`

### 2. Netlify 前端部署确认

- [ ] Netlify 构建成功
- [ ] 前端网站可正常访问
- [ ] 无 JavaScript 错误

### 3. 环境变量配置

#### Render 后端环境变量

在 Render Dashboard → 你的服务 → Environment 中确认：

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `DATABASE_URL` | PostgreSQL 连接字符串 | `postgresql://...` |
| `NODE_ENV` | 环境模式 | `production` |
| `PORT` | 服务端口（Render 自动分配） | - |
| `AUTO_MIGRATE` | 自动迁移（推荐 `true`） | `true` |
| `FRONTEND_URL` | 前端域名（用于 CORS） | `https://your-site.netlify.app` |
| `JWT_SECRET` | JWT 密钥 | （强随机字符串） |
| `STRIPE_SECRET_KEY` | Stripe 密钥 | `sk_live_...` 或 `sk_test_...` |

#### Netlify 前端环境变量

在 Netlify Dashboard → 你的站点 → Site settings → Environment variables 中设置：

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `NEXT_PUBLIC_API_URL` | **必需** - Render API 地址 | `https://your-app.onrender.com/api` |

**重要**：必须包含 `/api` 后缀，前端会自动处理。

---

## 🔧 配置步骤

### 步骤 1：获取 Render API URL

1. 登录 Render Dashboard：https://dashboard.render.com
2. 选择你的 Web Service
3. 复制服务 URL（例如：`https://print-mnmz.onrender.com`）
4. 完整 API URL = `https://print-mnmz.onrender.com/api`

### 步骤 2：在 Netlify 设置环境变量

**方法 1：通过 Netlify Dashboard（推荐）**

1. 登录 Netlify Dashboard：https://app.netlify.com
2. 选择你的站点
3. 进入 **Site settings** → **Build & deploy** → **Environment variables**
4. 点击 **Add a variable**
5. 设置：
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://your-app.onrender.com/api`（替换为你的 Render URL）
   - **Scopes**: 选择 **All scopes**（生产、预览、分支部署）
6. 点击 **Save**

**方法 2：通过 netlify.toml（备选）**

如果 Dashboard 无法设置，可以在 `netlify.toml` 中设置：

```toml
[build.environment]
  NEXT_PUBLIC_API_URL = "https://your-app.onrender.com/api"
```

⚠️ **注意**：Dashboard 设置优先级高于 `netlify.toml`

### 步骤 3：触发重新部署

环境变量设置后：

1. Netlify 会自动检测到环境变量更改并触发重新部署
2. 或手动触发：进入 **Deploys** 页面 → 点击 **Trigger deploy** → **Deploy site**

### 步骤 4：验证配置

#### 检查 1：构建日志确认

在 Netlify 部署日志中搜索 `NEXT_PUBLIC_API_URL`，应该能看到设置的值。

#### 检查 2：浏览器控制台

1. 访问你的 Netlify 站点
2. 打开浏览器开发者工具（F12）
3. 查看 Console，在开发模式下应该能看到：
   ```
   [API Config] API_BASE_URL: https://your-app.onrender.com/api
   [API Config] NEXT_PUBLIC_API_URL: https://your-app.onrender.com/api
   ```

#### 检查 3：Network 请求

1. 在浏览器中访问产品列表页面（`/products`）
2. 打开 Network 标签
3. 应该能看到 API 请求发送到 Render 后端：
   - 请求 URL：`https://your-app.onrender.com/api/products`
   - 状态码：`200 OK`

#### 检查 4：CORS 验证

如果看到 CORS 错误，检查：

1. Render 后端的 `FRONTEND_URL` 环境变量是否包含你的 Netlify 域名
2. 后端 CORS 配置已支持 `.netlify.app` 域名，但如果使用自定义域名，需要在 `FRONTEND_URL` 中配置

---

## 🐛 常见问题排查

### 问题 1：API 请求失败，显示 CORS 错误

**原因**：后端 CORS 配置未包含前端域名

**解决方案**：

1. 在 Render 后端环境变量中添加：
   ```
   FRONTEND_URL=https://your-site.netlify.app
   ```

2. 确认后端 CORS 配置（已在代码中支持）：
   - 已支持 `*.netlify.app` 域名
   - 已支持 `FRONTEND_URL` 环境变量指定的域名

3. 重启 Render 服务

### 问题 2：API 请求返回 404

**原因**：API URL 配置错误

**检查**：

1. 确认 `NEXT_PUBLIC_API_URL` 包含完整的路径：`https://your-app.onrender.com/api`
2. 确认 Render 服务正在运行
3. 直接访问 `https://your-app.onrender.com/api/health` 检查后端是否正常

### 问题 3：环境变量不生效

**原因**：环境变量需要在构建时可用

**解决方案**：

1. 确认使用的是 `NEXT_PUBLIC_*` 前缀（Next.js 要求）
2. 确认环境变量已保存并触发重新部署
3. 检查构建日志，确认环境变量在构建时可用

### 问题 4：Render 服务休眠导致首次请求慢

**原因**：Render 免费计划服务会在 15 分钟无活动后休眠

**影响**：首次请求可能需要 30-60 秒唤醒服务

**解决方案**：

1. 升级到 Render 付费计划（服务不会休眠）
2. 或使用外部监控服务定期 ping 你的 API 端点
3. 或接受首次请求延迟（用户体验受影响）

---

## ✅ 联调成功标志

当以下所有项都正常时，表示联调成功：

- [ ] 前端可以正常访问
- [ ] 产品列表页面可以加载数据
- [ ] 浏览器 Network 标签显示 API 请求成功（200）
- [ ] 无 CORS 错误
- [ ] 无 JavaScript 错误
- [ ] 用户登录/注册功能正常（如果已实现）
- [ ] 购物车功能正常（如果已实现）
- [ ] 支付功能正常（如果已实现，需要 Stripe 配置）

---

## 📝 联调测试清单

### 基础功能测试

1. **首页加载**
   - [ ] 页面正常渲染
   - [ ] 无 API 错误

2. **产品列表**
   - [ ] 产品列表正常显示
   - [ ] 分页功能正常
   - [ ] 筛选功能正常

3. **产品详情**
   - [ ] 产品详情页正常加载
   - [ ] 图片正常显示

4. **用户认证**（如果已实现）
   - [ ] 登录功能正常
   - [ ] 注册功能正常
   - [ ] Token 保存和验证正常

5. **购物车**（如果已实现）
   - [ ] 添加商品正常
   - [ ] 购物车数据持久化

6. **订单**（如果已实现）
   - [ ] 创建订单正常
   - [ ] 订单列表正常显示

### API 端点测试

使用浏览器或 Postman 测试以下端点：

- [ ] `GET /api/health` - 健康检查
- [ ] `GET /api/products` - 产品列表
- [ ] `GET /api/products/:id` - 产品详情
- [ ] `GET /api/categories` - 分类列表（如果已实现）
- [ ] `POST /api/auth/login` - 用户登录（如果已实现）
- [ ] `POST /api/orders` - 创建订单（如果已实现）

---

## 🔄 持续监控

### Render 监控

- 定期检查 Render Dashboard 的服务状态
- 查看日志是否有错误
- 监控服务响应时间

### Netlify 监控

- 查看部署状态
- 检查构建日志
- 监控站点性能

### 用户反馈

- 收集用户反馈
- 监控错误报告（如果配置了 Sentry）
- 检查浏览器控制台错误

---

## 📚 相关文档

- [Netlify 环境变量设置指南](./NETLIFY_ENV_VARS_GUIDE.md)
- [API 配置说明](./API_CONFIG_FIX.md)
- [部署检查清单](./DEPLOYMENT_CHECK.md)
- [环境变量完整说明](./ENVIRONMENT-VARIABLES.md)

---

**最后更新**：2025-01-11 14:15:00

