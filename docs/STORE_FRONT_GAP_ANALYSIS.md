# Storefront Gap Analysis
# [2025-11-16 10:20:00] Prototype vs Next.js audit for customer-facing pages

## 1. Summary
- 原型 (`prototype/static-pages/*.html`) 仍包含完整的电商体验（主页、PLP、PDP、Cart、Checkout、内容页），但 Next.js 实现的布局在多个关键区域与之偏离，导致“页面风格不一致”的观感。
- 差异集中在 **全局外壳 (header/nav/footer)**、**产品目录模块 (filters grid)**、**产品详情 (PDP info panels)**、以及 **结账流程 (Cart → Checkout)** 的栅格结构与视觉层级。
- CSS 尚未系统化移植：`apps/web/src/app/globals.css` 只包含部分 token/导航样式，Prototype 中大量 `.plp__`, `.pdp__`, `.cart__`、`.checkout__` 等类未被引用，导致 React 版本无法复用既有设计。
- 需在保持动态数据/交互的前提下，按原型的 DOM 结构与样式重新组织 React 组件（或共用可复用 section 组件），并同步 SEO 片段（schema、OG meta）。

## 2. Global Shell 对齐情况
| 区块 | Prototype 参考 | Next.js 实现 | 差异 |
| --- | --- | --- | --- |
| 顶部 Utility Bar | `home.html` `long-sleeve.html` 顶部 `<div class="topbar">` 展示 `Sign In / Cart / 800-293-4232` | 缺失；`SiteHeader` 仅有 `top-message-bar` | 需要恢复 Utility Bar 及链接（含电话/Sign In/Cart 计数）。 |
| 搜索+联系方式 Header | `home.html` L71-L118 | `SiteHeader` 具备品牌/搜索/联系，但缺少“Get a Quote / Start Designing” CTA 区块 | CTA 需移回 header 或 hero 前；搜索按钮图标需改为 SVG，与原型一致。 |
| 主导航 | `home.html` L105-L120 | `SiteHeader` 中 `primary-nav` 实现基本链接 | Prototype 有 dropdown indicator / hover 背景；Next 缺少 `has-dropdown` 样式和 `user-actions` 的 icon+文字组合。 |
| Footer | `prototype/static-pages/cart.html` L156-L200 | `SiteFooter` 含基本列，但缺少“Trust badges”横条与 CTA Ribbon | 需添加 `trust-badges` 段、全宽 CTA（`Need help? Talk to experts`）等原型元素。 |

## 3. 页面映射与差异
| 页面 (Prototype) | Next 路由 | 当前状态 | 需补齐的布局/模块 |
| --- | --- | --- | --- |
| `home.html` | `/` (`apps/web/src/app/page.tsx`) | 文案接近，但 hero 以下段落未完全匹配 | - 恢复 `<div class="grid">` 形式的分类卡（目前 CSS 近似但 spacing 不同）<br/>- 品牌横条应使用原型 `.brandrow`，并确保等宽展示<br/>- Testimonials 需使用 SVG 星级 icon（当前为文本 `★`）<br/>- Enterprise CTA 需采用双卡 + `Get a Demo`/`Start Designing` 样式 |
| `long-sleeve.html` (PLP) | `/products`, `/collections/[slug]` | 逻辑完整，但布局/filters 不符 | - 采用 `plp-head` + `plp__grid` DOM 结构（左侧 `<aside class="filters">` + 右侧 `<div class="product-grid">`）<br/>- 引入 `details/summary` filter 组件、颜色 swatch、尺寸按钮<br/>- 恢复顶部 `results count + sort` bar；当前 sort/filter UI 混用 `<select>` 和 chips。 |
| `product-hoodie.html` (PDP) | `/products/[slug]` (`ProductDetailContent.tsx`) | 功能超集（Fabric、reviews），但视觉不符 | - Gallery 主图 + thumbs 需使用 `.gallery__stage` `.gallery__thumbs` 布局<br/>- 信息侧栏包含 “Price tiers, highlights, delivery, CTA stack” 等面板<br/>- 规格/详情/Reviews 三列 sections 需改为 `.pdp-details` 风格；当前 block 数量多但顺序不同。 |
| `cart.html` | `/cart` | 具备核心功能 | - 需要 `cart__grid` 外层 + 原型 `cart-row` 样式（而非 table）<br/>- 恢复 `Promo code` 输入布局、Trust badges 区块、以及全宽 CTA 样式。 |
| `checkout.html` | `/checkout` | 支持地址/支付表单 | - 原型顶部有 “Progress steps + trust badges + summary aside”；Next 版本以多 step form 呈现但缺少视觉引导<br/>- 需添加“Need help”等侧边信息块。 |
| `contact.html` | `/contact` (`ContactClient.tsx`) | 文案丰富，但布局为简洁栅格 | - Prototype 使用 `.contact-grid` + `.contact-help-cards`；Next 版本需扩展 hero + FAQ preview + phone/email cards。 |
| `help.html` | `/help` | 功能 OK | - Prototype 结尾有“Still need help?” CTA ribbon + contact options；Next 版本 2025-11-15 已有近似，但 spacing/font 需根据 CSS 调整。 |
| `offline-pod-intake.html` | `/offline-orders` | 现有 intake form (React) | - 原型 hero/steps/FAQ 结构与 Next 版本差异大，需在 form 上方增加“3-step info cards”和“Upload tips” sections。 |
| `account.html` | `/account/*` | Next 拆分子路由 | - Prototype 单页含“Orders/My designs/Profile”cards。需在 `/account` 入口保留概览板块以呼应原型 UI。 |
| `promotions.html`/content pages | `/promotions`, `/returns`, `/shipping-info` 等 | 内容存在，但缺少 hero + table 样式 | - 复用原型 `.content-hero`, `.policy-list` 等 class，保证 typography/spacing 一致。 |

## 4. CSS 与资产
- **CSS 来源**：`prototype/static-pages/styles.css` 包含 1,800+ 行的 storefront 样式（含变量、grid、组件）。当前 `globals.css` 仅移植了 tokens、header、hero。需要把以下模块拆分并导入：
  - `plp-head`, `plp__grid`, `.filters`, `.swatches`, `.product-card`.
  - `pdp__grid`, `.gallery`, `.pdp-info`, `.price-stack`, `.specs`.
  - `.cart__grid`, `.cart-row`, `.promo`, `.trust-badges`.
  - `.checkout`, `.steps`, `.summary-card`, `.support-banner`.
  - `.content-hero`, `.faq-list`, `.cta-ribbon`.
- **资产**：`/public/assets` 已包含品牌 logo、category 图。需确保所有页面使用相同图片路径（部分组件仍引用 `.webp` 版本 vs `.png`）。Prototype 中 `assets/cat-*.webp` vs Next `assets/categories/*.png`——需统一。

## 5. SEO / Schema
- Prototype 首页/PDP 内嵌 JSON-LD (`WebSite`, `Organization`, `Product`)：Next 首页 `generateSEOMetadata` 已覆盖 meta，但 `ProductDetailContent` 尚未 output `Product` schema / meta tags（`metadata` 由 Layout 控制，需在动态路由生成 `generateMetadata`）。
- `long-sleeve.html` 等 PLP 没有 schema，但 prototype `<head>` meta/keywords 应复制到对应 Next 页面 `generateSEOMetadata`.

## 6. 建议下一步
1. **CSS 分层**：将 `styles.css` 分段迁移到 `/app/styles/storefront/*.css`（或直接扩充 `globals.css`），并确保 className 与 React DOM 对齐。
2. **布局重构**：针对 Home/PLP/PDP/Cart/Checkout 各建 `Section`/`Card` 组件，复刻原型 DOM 结构；引用已有数据逻辑，以免破坏 API 集成。
3. **统一资产/Copy**：引用 `/public/assets` 中与原型同名文件；确保 CTA 文案、标题完全对齐（含 en dash/emdash）。
4. **SEO**：为 `/products/[slug]`、`/products`、`/checkout` 等添加 `generateSEOMetadata` + schema blocks，匹配原型 `<head>`。

---
> 审核范围：`prototype/static-pages/{home,long-sleeve,product-hoodie,cart,checkout,contact}.html` vs `apps/web/src/app/{page.tsx,products/page.tsx,products/[slug]/*,cart/page.tsx,checkout/page.tsx,contact/ContactClient.tsx}`，检查时间 `2025-11-16 10:20:00`。后续步骤参见 TODO 列表。 

