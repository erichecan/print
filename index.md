# PrintNGo — Project Index

> 独立定制印刷品电商平台（T恤/杯子等），用户可在线设计、下单、支付，订单流转至后台工厂队列生产。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Next.js 14 App Router · TypeScript · Tailwind CSS |
| 后端 | Express.js · Node.js |
| 数据库 | PostgreSQL（Neon 云托管）· Prisma ORM |
| 支付 | Stripe |
| 部署 | GCP Cloud Run（前后端独立服务）· GitHub Actions CI/CD |
| 图片托管 | Shopify CDN（借用，不使用 Shopify 商店功能） |
| AI 图片流水线 | Python · OpenAI GPT-Image-2（shopify/ 目录） |

## 项目结构

```
printngo/
├── apps/web/              # Next.js 前端（端口 3000）
│   ├── src/app/           # App Router 页面
│   │   ├── (main)/        # 公开页面（带共享 Layout）
│   │   ├── admin/         # 后台管理页面
│   │   ├── design-lab/    # 在线设计工具（Fabric.js）
│   │   ├── checkout/      # 结账流程
│   │   └── account/       # 用户账户
│   ├── src/components/    # React 组件
│   └── src/lib/api.ts     # 前端 API 调用封装
│
├── backend/               # Express.js API（端口 3001）
│   ├── server.js          # 入口：加载 .env，启动时自动跑迁移
│   ├── src/app.js         # Express 配置：CORS / Helmet / 路由注册
│   └── src/routes/        # ~55 个路由文件
│       ├── auth.js        # 登录/注册（JWT）
│       ├── products.js    # 产品列表/详情
│       ├── orders.js      # 订单
│       ├── payments.js    # Stripe
│       ├── design-lab.js  # 设计保存/加载
│       └── admin*/        # 管理端接口
│
├── prisma/
│   └── schema.prisma      # 唯一数据库 schema（前后端共用）
│
├── shopify/               # Python AI 图片生成流水线（独立子项目）
│   ├── app/pipeline.py    # GPT-Image-2 生成 + 换色
│   ├── app/upload_to_shopify.py  # 上传至 Shopify CDN
│   └── graduation_manifest.json  # CDN URL 映射表
│
├── scripts/               # 一次性数据脚本
│   ├── seed-graduation-products.js  # 毕业季产品入库
│   └── seed-mugs-online.js
│
├── .github/workflows/
│   ├── deploy-frontend.yml   # apps/web/** 变更触发
│   └── deploy-backend.yml    # backend/** 变更触发
│
└── cloudbuild.yaml        # 旧版 Cloud Build（已被 GitHub Actions 替代）
```

## 本地开发命令

```bash
# 前端（apps/web/）
npm run dev                # → http://localhost:3000

# 后端（backend/）
npm run dev                # → http://localhost:3001

# 数据库（项目根目录）
npm run db:migrate         # prisma migrate dev
npm run db:seed            # 种子数据
npx prisma studio          # 可视化数据库浏览器
npx prisma generate        # schema 变更后重新生成 client
```

## 关键环境变量

```
# backend/.env
DATABASE_URL=postgresql://...?sslmode=require
JWT_SECRET=...
STRIPE_SECRET_KEY=...
FRONTEND_URL=...

# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://127.0.0.1:3001
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
```

## 架构要点

- **认证**：JWT Bearer Token，`localStorage` 存储，每个受保护请求带 `Authorization: Bearer <token>`
- **前后端通信**：前端通过 `NEXT_PUBLIC_API_URL` 调用后端，构建时烧录进 bundle
- **图片**：产品图片托管在 Shopify CDN（`cdn.shopify.com/s/files/...`），通过 `shopify/` 流水线上传
- **设计工具**：`design-lab/` 基于 Fabric.js，支持文字/图片/颜色自定义，设计数据保存至 DB
- **工厂队列**：订单支付后自动进入 `adminFactoryQueue`，工厂操作员可认领并生产

## 部署

- **前端服务**：`printngo-frontend`（Cloud Run，us-central1）
- **后端服务**：`printngo-backend`（Cloud Run，us-central1）
- **触发方式**：push 到 `main` 分支，GitHub Actions 自动构建并部署对应服务
- **零费用配置**：`min-instances=0`，仅请求时计费

## 当前产品数据状态

- T恤产品（Gildan）：通过 `shopify/` Python 流水线生成 AI 图片后入库
- 毕业季产品（12件）：`scripts/seed-graduation-products.js` 已于 2026-06-04 入库
- 产品 slug 规则：小写、连字符、去除特殊字符
