# Development Changelog

**Format**: [YYYY-MM-DD HH:MM:SS] - Change description  
**Categories**: Added | Changed | Fixed | Removed | Security | Deprecated

---

## [Unreleased]

### Added
- [2025-01-27 00:00:00] 初始化 monorepo 项目结构
- [2025-01-27 00:00:00] 创建 Next.js 前端应用 (apps/web)
- [2025-01-27 00:00:00] 创建 Express API 后端结构
- [2025-01-27 00:00:00] 创建完整的 Prisma schema 定义（包含所有数据模型）
- [2025-01-27 00:00:00] 创建环境变量模板 (.env.example)
- [2025-01-27 00:00:00] 配置 .gitignore 文件
- [2025-01-27 00:00:00] 创建 GitHub Actions CI/CD 工作流
- [2025-01-27 00:00:00] 创建 Prisma 客户端单例 (backend/src/lib/prisma.ts)
- [2025-01-27 00:00:00] 创建 Next.js 基础页面和布局
- [2025-01-27 00:00:00] 更新 README 文档
- [2025-01-27 00:00:00] 实现产品列表 API 端点 (GET /api/products)
- [2025-01-27 00:00:00] 实现产品详情 API 端点 (GET /api/products/:slug)
- [2025-01-27 00:00:00] 实现分类列表 API 端点 (GET /api/collections)
- [2025-01-27 00:00:00] 实现分类详情 API 端点 (GET /api/collections/:slug)
- [2025-01-27 00:00:00] 配置 Express 应用中间件和路由
- [2025-01-27 00:00:00] 创建前端 API 客户端工具 (apps/web/src/lib/api.ts)
- [2025-01-27 00:00:00] 创建产品列表页面 (apps/web/src/app/products/page.tsx)
- [2025-01-27 00:00:00] 创建产品详情页面 (apps/web/src/app/products/[slug]/page.tsx)
- [2025-01-27 00:00:00] 创建分类页面 (apps/web/src/app/collections/[slug]/page.tsx)
- [2025-01-27 00:00:00] 实现购物车 API 端点 (GET/POST/PATCH/DELETE /api/cart)
- [2025-01-27 00:00:00] 实现结账流程 API (prepare, shipping-rates, create-payment-intent, confirm)
- [2025-01-27 00:00:00] 集成 Stripe Payment Intents 支付功能
- [2025-01-27 00:00:00] 实现订单 API 端点 (GET /api/orders)
- [2025-01-27 00:00:00] 实现 Stripe webhook 处理器
- [2025-01-27 00:00:00] 创建身份验证中间件（支持可选认证用于游客购物车）
- [2025-01-27 00:00:00] 创建环境变量示例文件 (.env.example)
- [2025-01-27 00:00:00] 创建详细安装步骤文档 (INSTALLATION-STEPS.md)
- [2025-01-27 00:00:00] 更新后端 README，添加完整的安装和配置说明
- [2025-11-04 23:25:00] 完成 npm workspaces 依赖安装（根目录 node_modules）
- [2025-11-04 23:26:00] 创建 backend/.env 环境变量文件
- [2025-11-04 23:27:00] 添加 DATABASE_URL 到 .env 文件（Prisma 配置）
- [2025-11-04 23:28:00] 成功生成 Prisma Client (v5.22.0)
- [2025-11-04 23:30:00] 使用 winget 自动安装 PostgreSQL 16
- [2025-11-04 23:31:00] 创建数据库自动设置脚本 (backend/create-database.js)
- [2025-11-04 23:32:00] 创建 PowerShell 数据库设置脚本 (backend/setup-database.ps1)
- [2025-11-04 23:33:00] 成功创建 PostgreSQL 数据库 "suvernireplus"
- [2025-11-04 23:34:00] 更新 .env 文件，设置数据库密码和 DATABASE_URL
- [2025-11-04 23:40:00] 使用 Prisma db push 成功同步数据库 schema
- [2025-11-04 23:41:00] 创建数据库表验证脚本 (backend/verify-tables.js)
- [2025-11-04 23:42:00] 成功创建 17 个数据库表（users, products, orders, carts 等）
- [2025-11-04 23:45:00] 创建 Prisma 客户端单例文件 (backend/src/lib/prisma.js)
- [2025-11-04 23:50:00] 实现完整的购物车控制器 (cartController.js)
- [2025-11-04 23:51:00] 实现认证中间件 (auth.js)，支持可选认证和会话管理
- [2025-11-04 23:52:00] 实现分类控制器 (collectionController.js)
- [2025-11-04 23:53:00] 实现结账控制器 (checkoutController.js)，包含 Stripe 支付集成
- [2025-11-04 23:54:00] 实现订单控制器 (orderController.js)
- [2025-11-04 23:55:00] 实现 Webhook 控制器 (webhookController.js)，处理 Stripe 事件
- [2025-11-04 23:56:00] 添加 cookie-parser 中间件到 Express 应用
- [2025-11-04 23:57:00] 创建订单路由文件 (orders.js)
- [2025-11-04 23:58:00] 创建 Webhook 路由文件 (webhooks.js)
- [2025-11-04 23:59:00] 完成所有核心 API 端点实现（产品、购物车、结账、订单、Webhook）
- [2025-11-05 00:10:00] 创建前端 API 客户端 (apps/web/src/lib/api.ts)，包含产品、购物车、结账、订单和认证 API
- [2025-11-05 00:15:00] 实现购物车 Context (CartContext)，使用 SWR 进行数据获取和状态管理
- [2025-11-05 00:20:00] 创建购物车图标组件 (CartIcon)，显示购物车商品数量
- [2025-11-05 00:25:00] 实现购物车页面 (/cart)，支持查看、更新数量和删除商品
- [2025-11-05 00:30:00] 实现结账页面 (/checkout)，集成 Stripe Elements 支付表单
- [2025-11-05 00:35:00] 更新根布局 (layout.tsx)，添加 CartProvider 包装所有页面
- [2025-11-05 00:40:00] 创建登录页面 (/login)，支持邮箱密码登录
- [2025-11-05 00:45:00] 创建注册页面 (/register)，支持用户注册
- [2025-11-05 00:50:00] 实现管理后台首页 (/admin)，包含订单统计和快捷操作
- [2025-11-05 00:55:00] 安装前端依赖：@stripe/stripe-js, @stripe/react-stripe-js, swr, react-hook-form, axios, uuid
- [2025-11-05 01:00:00] 创建订单详情页面 (/orders/[orderNumber])，支持通过订单号和邮箱查看订单详情
- [2025-11-05 01:05:00] 实现后端认证控制器 (authController.js)，包含注册、登录、登出、获取当前用户、忘记密码和重置密码功能
- [2025-11-05 01:06:00] 创建认证路由文件 (authRoutes.js)，连接认证控制器和中间件
- [2025-11-05 01:07:00] 在 app.js 中启用认证路由 (/api/auth)
- [2025-11-05 01:10:00] 创建完整的产品详情页面 (/products/[slug])，包含图片画廊、颜色/尺寸选择器、数量控制和加入购物车功能
- [2025-11-05 01:15:00] 增强管理后台页面，添加完整的统计数据（总订单、待处理订单、已完成订单、总收入、今日收入和订单）、订单列表和快速操作面板
- [2025-11-05 01:20:00] 创建环境变量配置文档 (docs/ENVIRONMENT-VARIABLES.md)，详细说明所有必需和可选的环境变量及其配置方法

### Changed
- [2025-11-04 23:56:00] 更新 app.js，添加 cookie-parser 中间件和正确的 webhook body 解析顺序
- [2025-11-04 23:59:00] 修复 webhook 路由的 body 解析配置，确保原始 body 正确传递给 Stripe webhook 处理器
- None yet

### Fixed
- None yet

### Removed
- None yet

### Security
- None yet

### Deprecated
- None yet

---

## Change Log Guidelines

### Format
每条记录应包含：
1. **时间戳**: [YYYY-MM-DD HH:MM:SS]
2. **类型**: Added | Changed | Fixed | Removed | Security | Deprecated
3. **描述**: 清晰描述变更内容
4. **相关 Issue/PR**: (可选) 关联的 issue 或 PR 号
5. **Breaking Changes**: (如有) 标注是否为破坏性变更

### Categories
- **Added**: 新功能、新组件、新 API 端点
- **Changed**: 现有功能的修改、API 变更、配置调整
- **Fixed**: Bug 修复
- **Removed**: 删除的功能、废弃的代码
- **Security**: 安全相关的修复或改进
- **Deprecated**: 即将废弃的功能（会在未来版本移除）

### Examples

#### Added
```
- [2025-01-27 10:30:00] 添加用户注册 API 端点 POST /api/auth/register
- [2025-01-27 11:00:00] 实现购物车持久化存储（基于 session）
- [2025-01-27 14:20:00] 添加 Stripe 支付集成
```

#### Changed
```
- [2025-01-27 15:00:00] 修改产品列表 API，支持分页和排序参数
- [2025-01-27 16:30:00] 更新订单状态枚举，添加 'processing' 状态
```

#### Fixed
```
- [2025-01-27 17:00:00] 修复购物车在用户登录后不同步的问题
- [2025-01-27 18:00:00] 修复 Stripe webhook 签名验证错误
```

#### Removed
```
- [2025-01-27 19:00:00] 移除 PayPal 支付集成（仅使用 Stripe）
- [2025-01-27 20:00:00] 删除未使用的用户评价模型
```

#### Security
```
- [2025-01-27 21:00:00] 修复 SQL 注入漏洞（迁移到 Prisma）
- [2025-01-27 22:00:00] 添加 CSRF 保护中间件
```

---

## Version History

### v1.0.0 (Planned)
- 初始版本发布
- 完整的产品目录功能
- 购物车和结账流程
- Stripe 支付集成
- 基础管理后台
