# API 配置修复说明

## 问题分析

前端在访问后端 API 时出现 404 错误，主要原因是：

1. **API 路径不正确**：请求发送到了 `print-mnmz.onrender.com/cart` 而不是 `print-mnmz.onrender.com/api/cart`
2. **环境变量配置问题**：`NEXT_PUBLIC_API_URL` 可能没有正确设置，或者缺少 `/api` 后缀
3. **缺少页面**：`/forgot-password` 页面不存在

## 修复内容

### 1. 创建集中管理的 API 配置 (`apps/web/src/lib/api-config.ts`)

- 自动确保 `API_BASE_URL` 始终以 `/api` 结尾
- 如果环境变量没有设置，使用开发环境默认值 `http://localhost:3000/api`
- 如果环境变量设置了但没有 `/api` 后缀，自动添加

### 2. 更新所有使用 API 的文件

- `apps/web/src/lib/api.ts` - 使用新的 API 配置
- `apps/web/src/app/products/page.tsx` - 使用新的 API 配置
- `apps/web/src/app/collections/[slug]/page.tsx` - 使用新的 API 配置

### 3. 创建忘记密码页面

- `apps/web/src/app/forgot-password/page.tsx` - 新增忘记密码页面

## Netlify 环境变量配置

**重要**：在 Netlify 中设置环境变量时，请确保：

1. **变量名**：`NEXT_PUBLIC_API_URL`
2. **变量值**：`https://print-mnmz.onrender.com/api`

**注意**：
- ✅ 正确：`https://print-mnmz.onrender.com/api`
- ❌ 错误：`https://print-mnmz.onrender.com`（缺少 `/api`）
- ❌ 错误：`https://print-mnmz.onrender.com/api/`（末尾有斜杠，会被自动移除）

即使你设置了错误的格式（缺少 `/api`），代码也会自动修复，但建议直接设置正确的值。

## 验证步骤

1. 在 Netlify 中设置环境变量 `NEXT_PUBLIC_API_URL=https://print-mnmz.onrender.com/api`
2. 触发重新部署（环境变量更改后需要重新部署）
3. 访问 `https://souvenirplus.netlify.app/login`
4. 检查浏览器控制台，应该看到正确的 API 请求：
   - ✅ `https://print-mnmz.onrender.com/api/auth/login`
   - ❌ 不应该看到 `https://print-mnmz.onrender.com/auth/login`

## 测试

部署后，请测试以下功能：

1. ✅ 登录功能 - 应该能正常登录
2. ✅ 购物车功能 - 应该能正常加载购物车
3. ✅ 忘记密码 - 应该能访问 `/forgot-password` 页面
4. ✅ 产品列表 - 应该能正常加载产品
5. ✅ 分类页面 - 应该能正常加载分类

