# 促销活动和优惠券功能迁移到 Prisma 规划

## 目标

将促销活动（Promotions）和优惠券（Coupons）功能从 Sequelize 迁移到 Prisma，使这两个功能可以正常使用。

## 当前状态

### 问题
- 后端控制器使用 Sequelize 模型（`Coupon` 和 `Promotion`）
- Prisma schema 中没有定义这两个模型
- 前端页面已存在但功能不可用

### 现有代码
- **后端模型**：`backend/src/models/Coupon.js` 和 `backend/src/models/Promotion.js`（Sequelize）
- **后端控制器**：`backend/src/controllers/adminCouponController.js` 和 `backend/src/controllers/adminPromotionController.js`
- **后端路由**：`backend/src/routes/adminCoupons.js` 和 `backend/src/routes/adminPromotions.js`
- **前端页面**：`apps/web/src/app/admin/coupons/page.tsx` 和 `apps/web/src/app/admin/promotions/page.tsx`
- **前端 API**：`apps/web/src/lib/api.ts` 中已定义 `adminCouponsApi` 和 `adminPromotionsApi`

## 实施步骤

### 阶段 1：Prisma Schema 扩展

#### 1.1 添加 Coupon 模型到 Prisma Schema

**文件**：`prisma/schema.prisma`

```prisma
// [2025-01-28 10:30:00] Coupon model for promotional discounts
model Coupon {
  id              String   @id @default(uuid())
  code            String   @unique
  type            CouponType
  value           Decimal  @db.Decimal(10, 2)
  minOrderValue   Decimal? @map("min_order_value") @db.Decimal(10, 2)
  maxDiscount     Decimal? @map("max_discount") @db.Decimal(10, 2)
  usageLimit      Int?     @map("usage_limit")
  userUsageLimit Int?     @map("user_usage_limit")
  usedCount      Int      @default(0) @map("used_count")
  startDate      DateTime @map("start_date")
  endDate        DateTime @map("end_date")
  isActive        Boolean  @default(true) @map("is_active")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  // [2025-01-28 10:30:00] Track coupon usage per order
  orderCoupons    OrderCoupon[]

  @@index([code])
  @@index([isActive])
  @@index([startDate, endDate])
  @@map("coupons")
}

enum CouponType {
  PERCENTAGE
  FIXED
}
```

#### 1.2 添加 Promotion 模型到 Prisma Schema

```prisma
// [2025-01-28 10:30:00] Promotion model for marketing campaigns
model Promotion {
  id            String     @id @default(uuid())
  title         String
  description   String?    @db.Text
  bannerImageUrl String?   @map("banner_image_url")
  linkUrl      String?     @map("link_url")
  startDate    DateTime?   @map("start_date")
  endDate      DateTime?   @map("end_date")
  isActive     Boolean     @default(true) @map("is_active")
  sortOrder    Int         @default(0) @map("sort_order")
  createdAt    DateTime    @default(now()) @map("created_at")
  updatedAt    DateTime    @updatedAt @map("updated_at")

  @@index([isActive])
  @@index([sortOrder])
  @@index([startDate, endDate])
  @@map("promotions")
}
```

#### 1.3 添加 OrderCoupon 关联模型（可选，用于跟踪优惠券使用）

```prisma
// [2025-01-28 10:30:00] Track coupon usage in orders
model OrderCoupon {
  id        String   @id @default(uuid())
  orderId   String   @map("order_id")
  order     Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  couponId  String   @map("coupon_id")
  coupon    Coupon   @relation(fields: [couponId], references: [id])
  userId    String?  @map("user_id")
  discountAmount Decimal @map("discount_amount") @db.Decimal(10, 2)
  createdAt DateTime @default(now()) @map("created_at")

  @@unique([orderId, couponId])
  @@index([orderId])
  @@index([couponId])
  @@index([userId])
  @@map("order_coupons")
}
```

#### 1.4 更新 Order 模型（添加 OrderCoupon 关系）

在 `Order` 模型中添加：
```prisma
model Order {
  // ... existing fields ...
  orderCoupons OrderCoupon[]
}
```

#### 1.5 生成并运行迁移

```bash
cd /Users/eric/Desktop/print-main
npx prisma migrate dev --name add_coupons_and_promotions
npx prisma generate
```

### 阶段 2：后端控制器迁移

#### 2.1 迁移 adminCouponController.js

**文件**：`backend/src/controllers/adminCouponController.js`

**主要变更**：
- 移除 Sequelize 依赖：`const { Op } = require('sequelize');` 和 `const { Coupon } = require('../models');`
- 添加 Prisma：`const prisma = require('../lib/prisma');`
- 将所有 Sequelize 查询替换为 Prisma 查询：
  - `Coupon.findAll()` → `prisma.coupon.findMany()`
  - `Coupon.findByPk()` → `prisma.coupon.findUnique()`
  - `Coupon.create()` → `prisma.coupon.create()`
  - `coupon.update()` → `prisma.coupon.update()`
  - `Coupon.destroy()` → `prisma.coupon.delete()`
- 更新查询条件：
  - `where.code = { [Op.iLike]: '%${search}%' }` → `where: { code: { contains: search, mode: 'insensitive' } }`
  - `where.is_active = true` → `where: { isActive: true }`
- 更新字段映射（snake_case → camelCase）：
  - `coupon.is_active` → `coupon.isActive`
  - `coupon.min_order_value` → `coupon.minOrderValue`
  - `coupon.max_discount` → `coupon.maxDiscount`
  - `coupon.usage_limit` → `coupon.usageLimit`
  - `coupon.user_usage_limit` → `coupon.userUsageLimit`
  - `coupon.used_count` → `coupon.usedCount`
  - `coupon.start_date` → `coupon.startDate`
  - `coupon.end_date` → `coupon.endDate`
- 更新排序：
  - `order: [['created_at', 'DESC']]` → `orderBy: { createdAt: 'desc' }`
- 更新错误处理：
  - `error.name === 'SequelizeUniqueConstraintError'` → `error.code === 'P2002'`（Prisma unique constraint error code）

#### 2.2 迁移 adminPromotionController.js

**文件**：`backend/src/controllers/adminPromotionController.js`

**主要变更**：
- 移除 Sequelize 依赖
- 添加 Prisma
- 将所有 Sequelize 查询替换为 Prisma 查询
- 更新字段映射：
  - `promotion.banner_image_url` → `promotion.bannerImageUrl`
  - `promotion.link_url` → `promotion.linkUrl`
  - `promotion.start_date` → `promotion.startDate`
  - `promotion.end_date` → `promotion.endDate`
  - `promotion.is_active` → `promotion.isActive`
  - `promotion.sort_order` → `promotion.sortOrder`
- 更新排序逻辑：
  ```javascript
  orderBy: [
    { isActive: 'desc' },
    { sortOrder: 'asc' },
    { createdAt: 'desc' }
  ]
  ```

#### 2.3 更新 couponController.js（公共 API）

**文件**：`backend/src/controllers/couponController.js`

**主要变更**：
- 如果该文件也使用 Sequelize，需要迁移到 Prisma
- 更新 `validateCoupon` 和 `getActiveCoupons` 函数

### 阶段 3：前端页面修复

#### 3.1 移除警告提示

**文件**：`apps/web/src/app/admin/promotions/page.tsx` 和 `apps/web/src/app/admin/coupons/page.tsx`

**变更**：
- 移除黄色警告提示框
- 移除表单禁用样式（`opacity: 0.5, pointerEvents: 'none'`）
- 恢复正常的表单交互

### 阶段 4：测试和验证

#### 4.1 功能测试清单

**优惠券管理**：
- [ ] 创建优惠券（百分比和固定金额）
- [ ] 编辑优惠券
- [ ] 启用/禁用优惠券
- [ ] 删除优惠券
- [ ] 搜索优惠券
- [ ] 按状态筛选优惠券
- [ ] 验证优惠券代码唯一性

**促销活动管理**：
- [ ] 创建促销活动
- [ ] 编辑促销活动
- [ ] 删除促销活动
- [ ] 启用/禁用促销活动
- [ ] 搜索促销活动
- [ ] 按状态筛选促销活动
- [ ] 排序功能（sortOrder）

#### 4.2 数据迁移（如果数据库已有数据）

如果数据库中已有 Sequelize 创建的数据，需要确保：
- 表结构兼容（字段名、类型）
- 数据格式正确（日期格式、枚举值等）

## 文件清单

### 需要修改的文件

1. **Prisma Schema**
   - `prisma/schema.prisma` - 添加 Coupon 和 Promotion 模型

2. **后端控制器**
   - `backend/src/controllers/adminCouponController.js` - 迁移到 Prisma
   - `backend/src/controllers/adminPromotionController.js` - 迁移到 Prisma
   - `backend/src/controllers/couponController.js` - 迁移到 Prisma（如果使用 Sequelize）

3. **前端页面**
   - `apps/web/src/app/admin/promotions/page.tsx` - 移除警告提示
   - `apps/web/src/app/admin/coupons/page.tsx` - 移除警告提示

### 需要创建的文件

1. **数据库迁移**
   - `prisma/migrations/YYYYMMDDHHMMSS_add_coupons_and_promotions/migration.sql` - 由 Prisma 自动生成

## 注意事项

1. **字段类型转换**：
   - Sequelize `DECIMAL(10, 2)` → Prisma `Decimal @db.Decimal(10, 2)`
   - Sequelize `DATEONLY` → Prisma `DateTime`（需要处理日期格式）
   - Sequelize `ENUM` → Prisma `enum`

2. **日期处理**：
   - Sequelize 的 `DATEONLY` 只存储日期部分，Prisma 的 `DateTime` 包含时间
   - 在创建/更新时，确保日期格式正确（`YYYY-MM-DD`）

3. **枚举值映射**：
   - Sequelize: `'percentage'`, `'fixed'`
   - Prisma: `PERCENTAGE`, `FIXED`（或保持小写，根据 Prisma enum 定义）

4. **错误处理**：
   - Prisma 的唯一约束错误代码是 `P2002`
   - Prisma 的未找到错误需要显式检查 `null`

5. **查询性能**：
   - Prisma 的 `findMany` 默认不包含关联，需要显式 `include`
   - 使用 `select` 来限制返回字段，提升性能

## 时间估算

- **阶段 1**（Prisma Schema）：30 分钟
- **阶段 2**（后端控制器迁移）：2-3 小时
- **阶段 3**（前端修复）：15 分钟
- **阶段 4**（测试和验证）：1-2 小时

**总计**：约 4-6 小时

## 后续优化

1. **优惠券使用跟踪**：
   - 实现 `OrderCoupon` 模型来跟踪每个订单使用的优惠券
   - 更新 `usedCount` 和用户使用限制

2. **促销活动展示**：
   - 在前端首页展示活跃的促销活动
   - 实现促销活动轮播或横幅

3. **优惠券验证 API**：
   - 完善公共优惠券验证 API
   - 添加优惠券使用限制检查

