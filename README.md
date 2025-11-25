# suvernire plus - Complete E-commerce Platform

A full-featured custom merchandise e-commerce platform with design lab, order management, and admin dashboard.

**Status:** ✅ Phase 1 Complete - Ready for Client Review  
**Built:** November 2025  
**Theme:** Brand Red (#FF1F3D)  
**Platform:** Next.js 14 + Express (Node.js 18)

---

## Quick Start

<!-- 更新 Quick Start 2025-11-10 12:50:00 -->
```bash
# 安装 Node.js 18+ 与 npm 9+
# 克隆仓库后，在根目录安装依赖（启用 npm workspaces）
npm install

# 配置环境变量
cp backend/env.example backend/.env
cp apps/web/.env.example apps/web/.env.local
# 编辑 .env 文件，填入必要的配置（数据库、Stripe 等）

# 运行数据库迁移
./scripts/db-migrate.sh

# 启动前端 Next.js 应用
npm run dev --workspace apps/web
# 浏览器访问 http://localhost:3000

# 启动后端 API
npm run dev --workspace backend
# API 提供 http://localhost:3001/api （示例端口）
```

## 🚀 GCP Deployment (Free Tier Optimized)

本项目已配置为 GCP 免费部署，支持 Windows、Mac 和 Linux：

### Windows 11 部署

```powershell
# 在 PowerShell 中执行
.\scripts\setup-billing-alerts.ps1    # 设置费用预算告警
.\scripts\deploy-gcp-free.ps1         # 部署应用
```

详细步骤：查看 [docs/GCP-WINDOWS-DEPLOYMENT.md](./docs/GCP-WINDOWS-DEPLOYMENT.md)

### Mac/Linux 部署

```bash
./scripts/setup-billing-alerts.sh     # 设置费用预算告警
./scripts/deploy-gcp-free.sh          # 部署应用
```

**重要：部署前必须设置费用预算告警！**

**快速参考：**
- [免费部署快速指南](./README-GCP-FREE.md)
- [Windows 部署指南](./docs/GCP-WINDOWS-DEPLOYMENT.md)
- [成本优化指南](./docs/GCP-COST-OPTIMIZATION.md)

---

## Deployment

<!-- 更新 Deployment 2025-11-12 03:30:00 -->
### Production Build

```bash
# 构建所有服务
./scripts/build.sh

# 或跳过测试
./scripts/build.sh --skip-tests
```

### Docker Deployment

```bash
# 使用 docker-compose 一键启动
docker compose up --build -d

# 或使用部署脚本
./scripts/deploy.sh production --build
```

### Database Management

```bash
# 备份数据库
./scripts/db-backup.sh

# 恢复数据库
./scripts/db-restore.sh backups/backup_YYYYMMDD_HHMMSS.dump

# 运行迁移
./scripts/db-migrate.sh

# 重置数据库（危险操作）
./scripts/db-migrate.sh --reset
```

### Environment Variables

- 后端：复制 `backend/env.example` 为 `backend/.env` 并配置
- 前端：复制 `apps/web/.env.example` 为 `apps/web/.env.local`（开发）或 `apps/web/.env.production`（生产）

详细配置说明请参考：
- `backend/env.example` - 后端环境变量模板
- `apps/web/.env.example` - 前端环境变量模板
- `docs/RELEASE-CHECKLIST.md` - 发布前检查清单

### Smoke Tests

```bash
# 运行 E2E 冒烟测试
./scripts/e2e-smoke.sh http://localhost:3000 http://localhost:3001/api

# 运行完整 Playwright 回归（需先复制 configs/e2e.test.envvars 至 .env.test）
RUN_PLAYWRIGHT=1 ./scripts/e2e-smoke.sh
# 或者进入前端目录执行
cd apps/web && npx playwright test
```

## Monitoring & Alerts

- 后端使用 Sentry（`@sentry/node`）捕获异常，启用前设置 `SENTRY_DSN`、`SENTRY_ENVIRONMENT`、`SENTRY_TRACES_SAMPLE_RATE`
- 前端集成 `@sentry/nextjs`，将 `NEXT_PUBLIC_SENTRY_DSN` 注入构建，支持浏览器 Replays 采样控制
- 模板文件已提供占位变量：`backend/env.example`、`apps/web/env.production.template`
- 推荐在 Sentry 中配置邮件/Slack 报警，确保支付与订单链路异常可被即时感知

---

## System Overview

**33 Total Pages**
- 19 Frontend Pages (shop, design, checkout, account, support)
- 14 Admin Pages (products, orders, users, designs, marketing, settings)
- Full i18n support (English & Chinese)

---

## Pages Index

### Customer-Facing Pages

#### Shopping
- `home.html` - Landing page with hero, categories, brands
- `long-sleeve.html` - Product listing with filters & sort
- `product-hoodie.html` - Product detail with gallery & reviews

#### Design Tools
- `design-lab.html` - Visual design editor with canvas
- `design-gallery.html` - Saved designs showcase

#### Checkout Flow
- `cart.html` - Shopping cart
- `checkout.html` - Checkout form
- `order-confirmation.html` - Success page

#### Orders
- `order-detail.html` - Order details & timeline
- `order-tracking.html` - Shipping tracking

#### Account
- `account.html` - User dashboard
- `ndx-welcome.html` - Login
- `register.html` - Registration
- `forgot-password.html` - Password reset
- `profile-edit.html` - Edit profile

#### Marketing & Support
- `promotions.html` - Active deals
- `contact.html` - Contact form
- `help.html` - FAQ & resources

---

### Admin Dashboard

**Access:** `admin/login.html`

- `admin/index.html` - Dashboard with KPIs
- `admin/products.html` - Product management
- `admin/product-edit.html` - Create/edit products
- `admin/categories.html` - Category management
- `admin/orders.html` - Order management
- `admin/order-detail.html` - Order details (admin)
- `admin/users.html` - User management
- `admin/user-detail.html` - User profile
- `admin/designs.html` - Design submissions
- `admin/design-review.html` - Review workflow
- `admin/coupons.html` - Coupon codes
- `admin/promotions.html` - Bulk discounts
- `admin/settings.html` - System config

---

## Design System

### Brand Colors
- **Core Red**: `#FF1F3D`
- **Secondary Red**: `#E3002B`
- **Dark Red**: `#CC0026`
- **Ink Black**: `#121212`
- **Pure White**: `#FFFFFF`
- **Warm Gray**: `#F8F8F8`

### Typography
- **Font**: Inter, system-ui
- **Weights**: 400, 500, 600, 700, 800
- **Scales**: 12px → 48px

### Components
- Buttons (primary, outline)
- Cards & grids
- Forms & inputs
- Tables & lists
- Status badges
- Navigation (sidebar, header)

---

## Key Features

### Frontend
✅ Product browsing with filters  
✅ Shopping cart & checkout  
✅ Design lab with visual editor  
✅ Order tracking & history  
✅ User authentication  
✅ Account management  
✅ Promotions & deals  
✅ Help center  

### Admin
✅ Dashboard analytics  
✅ Product CRUD  
✅ Category management  
✅ Order management  
✅ User management  
✅ Design review workflow  
✅ Coupon management  
✅ Bulk promotions  
✅ System settings  

---

## File Structure

```
/
├── Frontend Pages
│   ├── home.html
│   ├── long-sleeve.html
│   ├── product-hoodie.html
│   ├── design-lab.html
│   ├── design-gallery.html
│   ├── cart.html, checkout.html, order-confirmation.html
│   ├── order-detail.html, order-tracking.html
│   ├── account.html, ndx-welcome.html, register.html
│   ├── forgot-password.html, profile-edit.html
│   ├── promotions.html, contact.html, help.html
│
├── Admin Pages
│   └── admin/
│       ├── login.html, index.html
│       ├── products.html, product-edit.html, categories.html
│       ├── orders.html, order-detail.html
│       ├── users.html, user-detail.html
│       ├── designs.html, design-review.html
│       ├── coupons.html, promotions.html, settings.html
│       └── admin.css
│
├── Styles
│   ├── styles.css (main design system)
│
└── Assets
    └── assets/ (images, icons, brand logos)
```

---

## Documentation

- `COMPLETE-SYSTEM.md` - Full system documentation
- `THEME-MIGRATION.md` - Color theme migration notes
- `visual-check.md` - Visual testing checklist
- `style-guide.md` - Design guidelines
- `docs/E2E-PLAYBOOK.md` - 全链路 E2E 测试脚本
- `docs/RELEASE-CHECKLIST.md` - 发布前自检清单

---

## Tech Stack

<!-- 更新 Tech Stack 2025-11-10 12:52:00 -->
- **Next.js 14** - React 应用框架（App Router）
- **React 18.2** - 前端组件与交互
- **TypeScript 5.4** - 前端类型系统
- **Express 4** - 后端 REST API 层
- **PostgreSQL + Prisma/Sequelize** - 数据访问
- **Stripe** - 支付集成

---

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile responsive (640px, 1024px)

---

## Documentation

- 📊 [Complete Project Status](./PROJECT-STATUS-FINAL.md) - Full feature list & stats
- 📡 [API Specification](./API-SPEC.md) - 60+ endpoints documented
- 🗄️ [Database Schema](./DATABASE-SCHEMA.md) - 19 tables with relationships
- 🎨 [Design System](./THEME-MIGRATION.md) - Brand red theme details
- 🌐 [i18n Implementation](./I18N-IMPLEMENTATION.md) - Bilingual support
- 🔍 [SEO Guide](./SEO-GUIDE.md) - SEO optimization
- 📈 [Progress Report](./PHASE-1-PROGRESS.md) - Completion tracking

---

## Next Steps

### Phase 2: Backend Development
1. Set up Node.js + Express server
2. Implement PostgreSQL database
3. Build 60+ API endpoints
4. Integrate Stripe/PayPal payment
5. Set up AWS S3 file storage
6. Add email notifications
7. Implement security measures

### Phase 3: Launch Preparation
1. Populate product catalog
2. Create help content
3. Configure analytics
4. Run security audit
5. Load testing
6. Deploy to production

---

**Built with ❤️ for custom merchandise e-commerce**

**Phase 1 Complete** ✅ Ready for client review & backend integration
