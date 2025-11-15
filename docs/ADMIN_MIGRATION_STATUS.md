# Admin 页面迁移状态

## 原始 HTML 页面（17个）

### ✅ 已迁移
1. ✅ `index.html` → `/admin` (Dashboard) - **2025-11-15 完成 1:1 还原**
2. ✅ `products.html` → `/admin/products` - **2025-11-15 完成 1:1 还原**
3. ✅ `product-edit.html` → `/admin/products/[id]` 和 `/admin/products/new`
4. ✅ `categories.html` → `/admin/categories`
5. ✅ `orders.html` → `/admin/orders`
6. ✅ `order-detail.html` → `/admin/orders/[id]`
7. ✅ `offline-orders-board.html` → `/admin/offline-orders`
8. ✅ `users.html` → `/admin/users`
9. ✅ `user-detail.html` → `/admin/users/[id]`
10. ✅ `designs.html` → `/admin/designs`
11. ✅ `design-review.html` → `/admin/designs/[id]`
12. ✅ `coupons.html` → `/admin/coupons`
13. ✅ `promotions.html` → `/admin/promotions`
14. ✅ `settings.html` → `/admin/settings`
15. ✅ `content-manager.html` → `/admin/content-manager`
16. ✅ `cost-management.html` → `/admin/cost-management`
17. ✅ `login.html` → `/login`（全站共享登录）

### ⏳ 待核对项
- （无）2025-11-15 16:45:00 已完成 `categories.html` 与 `/admin/categories` 的卡片式复刻
- （无）2025-11-15 16:45:00 已完成 `orders.html` / `order-detail.html` 与 `/admin/orders` / `/admin/orders/[id]` 的 1:1 对齐

## 主要问题

### 1. 部分旧页面仍需细节复核
- ✅ `categories` / `orders` 页面已完成卡片 + 表格布局重构，交互与原型一致
- `offline-orders` 为功能增强版，继续沿用现有实现
- ✅ `/admin/products` 现已支持后端筛选（搜索 / 状态 / 分类）与批量上/下架/归档
- ✅ `/admin/users` 新增 `/api/admin/users` 列表与详情接口，页面展示真实用户、统计与订单
- ✅ `/admin/designs` / `/admin/designs/[id]`、`/admin/coupons`、`/admin/promotions`、`/admin/settings`、`/admin/content-manager`、`/admin/cost-management` 已接入新的后台 API（设计审核、优惠券 CRUD、促销管理、站点设置、内容配置、成本看板）

### 2. 样式统一性
- 2025-11-15 起所有新迁移页面均依赖 `admin.css`
- 后续需要把 legacy 页面逐步切换到相同的 class 体系

## 建议

下一步：
1. 复核 `categories`/`orders` 与原型的差异
2. 按照同样方式整理剩余 legacy 页面，彻底完成统一设计语言

