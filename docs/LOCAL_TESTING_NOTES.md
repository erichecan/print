# 本地联调与上线前切换清单

记录为在本地验证“完整电商流程（PLP → PDP → Cart → Checkout）”所做的环境配置与辅助脚本，便于之后上线/切回线上环境时快速对齐。

## 1) 后端（backend）

- 端口
  - 本地开发约定：`PORT=3001`

- 数据库指向（Neon）
  - `.env` 关键变量（任选其一条链路，建议同时配置两条以兼容 Prisma/Sequelize）
    ```env
    DATABASE_URL=postgresql://<neon-user>:<neon-pass>@<neon-host>/<db>?sslmode=require
    PRISMA_DATABASE_URL=postgresql://<neon-user>:<neon-pass>@<neon-host>/<db>?sslmode=require
    ```
  - 本地命令行临时覆盖（等效）
    ```bash
    export DATABASE_URL="postgresql://<neon-user>:<neon-pass>@<neon-host>/<db>?sslmode=require"
    export PRISMA_DATABASE_URL="$DATABASE_URL"
    ```

- 启动相关
  - 是否在启动时自动迁移：
    ```env
    AUTO_MIGRATE=true  # Render/CI 启动前自动迁移；本机可设 false 手动执行
    ```
  - 常用命令：
    ```bash
    # 仅部署已有迁移（非交互）
    npm run migrate:deploy

    # Prisma 直接推送 schema（用于空库快速建表，仅开发）
    npx prisma db push --schema=../prisma/schema.prisma

    # 启动本地后端（端口 3001）
    PORT=3001 AUTO_MIGRATE=false npm run dev
    ```

- 本地演示数据（验证用，可选）
  - 写入分类/品牌/商品与图片：
    ```bash
    node scripts/seed-demo.js
    ```
  - 为每个商品创建一个有库存的变体：
    ```bash
    node scripts/seed-variants.js
    ```
  - 这些脚本只在开发环境用于“造数验流”，上线环境不建议执行。

## 2) 前端（apps/web）

- API 基址（本地对接后端 3001）
  - `apps/web/.env.local`：
    ```env
    NEXT_PUBLIC_API_URL=http://localhost:3001
    API_BASE_URL=http://localhost:3001
    # 兼容旧读取方式（留着无害）
    NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
    ```
  - 启动：
    ```bash
    npm run dev
    # 访问 http://localhost:3000/products
    ```

## 3) 页面/接口说明

- 产品列表页（PLP）：`/products`
  - 后端接口：`GET /api/products`（已对齐：无集合接口时也能渲染产品）
  - 注意：若需要左侧“Category”下拉展示真实分类，可新增或映射到 `/api/categories`。

- 产品详情页（PDP）：`/products/[slug]`

- 购物车：`/cart`；结算：`/checkout`

## 4) 上线前切换（GCP/Netlify/Render）

- 后端
  - 将 `DATABASE_URL`/`PRISMA_DATABASE_URL` 指向正式库。
  - 关闭演示种子脚本（不要在生产环境执行 `seed-demo.js` / `seed-variants.js`）。
  - 如使用自动迁移：保留 `AUTO_MIGRATE=true`；否则在 CI/CD 里显式执行 `npm run migrate:deploy`。

- 前端
  - 将 `NEXT_PUBLIC_API_URL`/`API_BASE_URL` 指向线上后端域名，例如：
    ```env
    NEXT_PUBLIC_API_URL=https://api.suvernireplus.com
    API_BASE_URL=https://api.suvernireplus.com
    ```
  - 重新部署以使用新环境变量。

## 5) 快速排错清单

- “PLP 显示 404 / 没有产品”：
  1. 打开浏览器 Network，确认请求 URL 以 `http(s)://<后端>/api/products?...` 开头；
  2. 直接访问后端 `GET /api/products?page=1&limit=12&includeOutOfStock=true` 是否返回 200 + data；
  3. 数据库是否已有商品（可执行 `seed-demo.js` + `seed-variants.js` 在开发库造数据）。

- “页面不像原型”：清理浏览器缓存或重启 dev，确认 `globals.css` 已被加载。

---

如需把以上流程自动化（脚本/CI），可新增
`npm scripts`：`web:dev`, `api:dev`, `db:seed:demo`、并在 README 增补一键命令。*** End Patch*** End Patch  }

