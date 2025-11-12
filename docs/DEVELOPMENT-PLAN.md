# Development Plan
# Print E-commerce Platform - Dynamic Features

**Plan Version**: 1.0  
**Created**: 2025-01-27 00:00:00  
**Status**: In Progress

---

## Overview

本开发计划将现有静态 HTML 网站升级为完整的动态电商平台，分为 5 个主要里程碑（M1-M5），预计 5 周完成。

---

## Milestone 1: Project Setup & Database Schema (Week 1)

### 目标
- 完成项目基础架构设置
- 设计并实现数据库 schema
- 建立开发环境和工具链

### 任务分解

#### 1.1 Monorepo Setup
- [x] 创建根 package.json (workspaces)
- [x] 创建 Next.js 前端应用 (apps/web)
- [ ] 配置 TypeScript 和 ESLint
- [ ] 创建 Express API 基础结构
- [ ] 设置共享类型包 (packages/shared-types)

#### 1.2 Database Setup
- [ ] 安装并配置 Prisma
- [ ] 设计完整 Prisma schema（基于现有 Sequelize models）
- [ ] 创建初始 migration
- [ ] 设置数据库连接和测试

#### 1.3 Documentation
- [x] 创建产品需求文档 (PRD.md)
- [x] 创建技术架构文档 (ARCHITECTURE.md)
- [x] 创建开发变更记录 (CHANGELOG.md)
- [x] 创建开发计划 (DEVELOPMENT-PLAN.md)

#### 1.4 Development Environment
- [ ] 配置环境变量模板 (.env.example)
- [ ] 设置 Git 工作流和 .gitignore
- [ ] 配置 CI/CD 基础 (GitHub Actions)
- [ ] 创建开发脚本

### 交付物
- ✅ 完整的项目文档
- ✅ Prisma schema 定义
- ✅ 数据库 migration 可运行
- ✅ 开发环境可启动

---

## Milestone 2: Catalog API & SSR Pages (Week 1-2)

### 目标
- 实现产品目录的 API 端点
- 创建 Next.js SSR 产品页面
- 实现产品列表和详情页

### 任务分解

#### 2.1 Product Catalog API
- [ ] 实现 `GET /api/products` (列表，支持分页、筛选、排序)
- [ ] 实现 `GET /api/products/:slug` (详情)
- [ ] 实现 `GET /api/collections` (分类列表)
- [ ] 实现 `GET /api/collections/:slug` (分类详情)
- [ ] 添加数据验证和错误处理

#### 2.2 Product Data Migration
- [ ] 从现有 HTML 页面提取产品数据
- [ ] 创建 seed 脚本，导入产品数据到数据库
- [ ] 验证产品数据完整性

#### 2.3 Next.js Product Pages
- [ ] 创建产品列表页面 (`/products`)
- [ ] 创建产品详情页面 (`/products/[slug]`)
- [ ] 实现分类页面 (`/collections/[slug]`)
- [ ] 添加产品图片优化和懒加载
- [ ] 实现产品变体选择器（尺寸、颜色）

#### 2.4 SEO & Metadata
- [ ] 为产品页面添加动态 metadata
- [ ] 实现 Open Graph 标签
- [ ] 创建动态 sitemap.xml
- [ ] 配置 robots.txt

### 交付物
- ✅ 完整的产品目录 API
- ✅ 可访问的产品列表和详情页
- ✅ 基础 SEO 支持

---

## Milestone 3: Cart & Checkout Foundation (Week 2)

### 目标
- 实现购物车功能
- 建立结账流程的基础结构

### 任务分解

#### 3.1 Cart Service & API
- [ ] 实现购物车数据模型（Cart, CartItem）
- [ ] 实现 `GET /api/cart` (获取购物车)
- [ ] 实现 `POST /api/cart/items` (添加商品)
- [ ] 实现 `PATCH /api/cart/items/:id` (更新数量)
- [ ] 实现 `DELETE /api/cart/items/:id` (删除商品)
- [ ] 实现购物车持久化（基于 session，登录后同步到用户）

#### 3.2 Cart UI Components
- [ ] 创建购物车页面 (`/cart`)
- [ ] 实现购物车图标和数量显示（header）
- [ ] 创建添加到购物车按钮组件
- [ ] 实现购物车项更新和删除 UI

#### 3.3 Checkout Preparation
- [ ] 实现 `POST /api/checkout/prepare` (验证购物车，计算总额)
- [ ] 实现 `POST /api/checkout/shipping-rates` (获取运费，Phase 1 使用静态费率)
- [ ] 创建结账页面基础结构 (`/checkout`)
- [ ] 实现地址表单组件

### 交付物
- ✅ 完整的购物车 API 和 UI
- ✅ 结账流程基础页面
- ✅ 购物车持久化功能

---

## Milestone 4: Stripe Payment & Orders (Week 3)

### 目标
- 集成 Stripe 支付
- 实现订单创建和管理

### 任务分解

#### 4.1 Stripe Integration
- [ ] 安装 Stripe SDK
- [ ] 配置 Stripe 环境变量
- [ ] 实现 `POST /api/checkout/create-payment-intent`
- [ ] 在前端集成 Stripe Elements (Payment Element)
- [ ] 实现支付确认流程

#### 4.2 Order Management
- [ ] 实现订单数据模型（Order, OrderItem）
- [ ] 实现订单号生成逻辑
- [ ] 实现 `POST /api/checkout/confirm` (创建订单)
- [ ] 实现 `GET /api/orders/:id` (订单详情)
- [ ] 实现订单确认页面 (`/order-confirmation/[id]`)

#### 4.3 Stripe Webhooks
- [ ] 实现 `POST /api/webhooks/stripe`
- [ ] 处理 `payment_intent.succeeded` 事件
- [ ] 处理 `payment_intent.payment_failed` 事件
- [ ] 处理 `charge.refunded` 事件
- [ ] 实现 webhook 签名验证

#### 4.4 Tax & Shipping Calculation
- [ ] 实现简单税费计算（基于省份/州，硬编码费率）
- [ ] 实现静态运费计算（加拿大/美国）
- [ ] 在结账页面显示税费和运费明细

#### 4.5 Email Notifications (Optional - Basic)
- [ ] 配置邮件服务（Resend/SendGrid）
- [ ] 实现订单确认邮件模板
- [ ] 发送订单确认邮件

### 交付物
- ✅ 完整的 Stripe 支付集成
- ✅ 订单创建和管理功能
- ✅ Webhook 处理
- ✅ 订单确认邮件

---

## Milestone 5: Admin Dashboard MVP (Week 4)

### 目标
- 创建管理后台基础功能
- 支持产品、订单管理

### 任务分解

#### 5.1 Admin Authentication
- [ ] 实现管理员登录 (`/admin/login`)
- [ ] 创建管理员认证中间件
- [ ] 实现角色检查 (role = ADMIN)

#### 5.2 Admin Dashboard
- [ ] 创建仪表板页面 (`/admin`)
- [ ] 显示关键指标（订单数、收入、待处理订单）
- [ ] 实现数据统计 API

#### 5.3 Product Management
- [ ] 实现 `GET /api/admin/products` (列表)
- [ ] 实现 `POST /api/admin/products` (创建)
- [ ] 实现 `PATCH /api/admin/products/:id` (更新)
- [ ] 实现 `DELETE /api/admin/products/:id` (删除)
- [ ] 创建产品管理页面 (`/admin/products`)
- [ ] 创建产品编辑表单

#### 5.4 Collection Management
- [ ] 实现集合 CRUD API
- [ ] 创建集合管理页面
- [ ] 实现产品与集合的关联管理

#### 5.5 Order Management
- [ ] 实现 `GET /api/admin/orders` (列表，支持筛选)
- [ ] 实现 `GET /api/admin/orders/:id` (详情)
- [ ] 实现 `PATCH /api/admin/orders/:id/status` (更新状态)
- [ ] 实现 `POST /api/admin/orders/:id/refund` (退款)
- [ ] 创建订单管理页面 (`/admin/orders`)
- [ ] 创建订单详情页面

### 交付物
- ✅ 完整的管理后台
- ✅ 产品和订单管理功能
- ✅ 管理员认证和授权

---

## Milestone 6: Polish & Launch Prep (Week 5)

### 目标
- 完善功能和用户体验
- 准备生产环境部署

### 任务分解

#### 6.1 User Account Features (Phase 1.1)
- [ ] 实现用户注册 (`POST /api/auth/register`)
- [ ] 实现用户登录 (`POST /api/auth/login`)
- [ ] 实现 `GET /api/orders` (用户订单列表)
- [ ] 创建用户账户页面 (`/account`)
- [ ] 实现地址管理功能

#### 6.2 EasyShip Integration (Phase 2 - Optional)
- [ ] 研究 EasyShip API 文档
- [ ] 实现 EasyShip 认证
- [ ] 实现实时运费计算 (`POST /api/checkout/shipping-rates`)
- [ ] 实现发货标签生成 (`POST /api/admin/shipments/:orderId/label`)
- [ ] 实现 EasyShip webhook 处理

#### 6.3 Testing & QA
- [ ] 编写关键 API 的单元测试
- [ ] 进行端到端测试（完整购买流程）
- [ ] 修复发现的 bug
- [ ] 性能优化（数据库查询、图片优化）

#### 6.4 Deployment Setup
- [ ] 配置 Vercel（前端部署）
- [ ] 配置 Render/Railway（后端部署）
- [ ] 设置生产环境数据库
- [ ] 配置生产环境环境变量
- [ ] 设置 Stripe webhook 端点（生产环境）
- [ ] 配置域名和 SSL

#### 6.5 Documentation & Handoff
- [ ] 更新 API 文档
- [ ] 创建部署指南
- [ ] 创建管理员使用手册
- [ ] 最终代码审查

### 交付物
- ✅ 生产环境可部署
- ✅ 完整的测试覆盖
- ✅ 部署文档和手册

---

## Risk Management

### 高风险项
1. **数据库迁移**: 从 Sequelize 迁移到 Prisma 可能遇到兼容性问题
   - **缓解**: 仔细测试 migration，准备回滚方案

2. **支付集成**: Stripe webhook 测试和调试可能耗时
   - **缓解**: 使用 Stripe CLI 本地测试，充分测试各种支付场景

3. **时间压力**: 5 周完成可能紧张
   - **缓解**: 优先核心功能，非关键功能可延后

### 中风险项
1. **产品数据迁移**: 从 HTML 提取产品数据可能不完整
   - **缓解**: 创建数据验证脚本，手动检查

2. **前端样式**: 需要将现有 HTML/CSS 迁移到 Next.js
   - **缓解**: 复用现有样式，逐步重构

---

## Success Criteria

### M1 成功标准
- [ ] 所有文档完成
- [ ] Prisma schema 可生成 migration
- [ ] 开发环境可启动

### M2 成功标准
- [ ] 产品列表和详情页可访问
- [ ] API 响应时间 < 500ms
- [ ] 基础 SEO 已实现

### M3 成功标准
- [ ] 用户可以添加商品到购物车
- [ ] 购物车数据持久化
- [ ] 结账页面基础流程完成

### M4 成功标准
- [ ] 用户可以完成支付流程
- [ ] 订单成功创建
- [ ] Webhook 正确处理支付事件

### M5 成功标准
- [ ] 管理员可以管理产品和订单
- [ ] 管理员认证安全可靠

### M6 成功标准
- [ ] 系统可部署到生产环境
- [ ] 所有核心功能测试通过
- [ ] 部署文档完整

---

## Timeline Summary

| Week | Milestone | Key Deliverables |
|------|-----------|------------------|
| 1 | M1 + M2 | Setup, Database, Catalog API, Product Pages |
| 2 | M3 | Cart, Checkout Foundation |
| 3 | M4 | Stripe, Orders, Webhooks |
| 4 | M5 | Admin Dashboard |
| 5 | M6 | Polish, Testing, Deployment |

---

**Plan Owner**: Development Team  
**Last Updated**: 2025-01-27 00:00:00
