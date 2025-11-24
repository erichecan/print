> [2025-11-24 10:12:05] E2E 测试数据与账号需求清单

## 范围说明
- 关联 PRD `2.1`~`2.3`、`2.2.5`，以及 `docs/COUPON-PROMOTION-MIGRATION-PLAN.md`、`docs/E2E-TESTING-GUIDE.md`。
- 供 Playwright 端到端脚本使用，覆盖商品展示、搜索、筛选、购物车、优惠券、Stripe 支付、订单生成、后台订单管理。

## 账号矩阵
| 角色 | 标识 | 需求 | 来源 |
| --- | --- | --- | --- |
| 管理员 | `demo@print.local` | 用于后台登录、订单状态更新、促销管理 | `prisma/seed.ts` |
| 管理员测试 | `admin@test.com` | 旧 Cypress 示例账号，需确认是否仍在数据库 | `docs/E2E-TESTING-GUIDE.md` |
| 顾客（注册） | `customer@test.com` | 登录态购物车同步、已保存地址 checkout | `docs/E2E-TESTING-GUIDE.md` |
| 顾客（访客） | `guest+e2e@print.local` | 访客结账、会话购物车持久化 | 拟新增 |

## 商品与类目
| 类目 | 产品 slug | 关键校验点 | 备注 |
| --- | --- | --- | --- |
| `t-shirts` | `classic-crew-tee` | 多颜色/尺码（White/Black，S~L），变体库存扣减 | `prisma/seed.ts` |
| `t-shirts` | `relaxed-fit-tee` | 打印区域 JSON，描述长文案 | |
| `mugs` | `classic-11oz-mug` | wrap 打印区域 (px 单位) | |
| `caps` | `structured-trucker-cap` | 组合颜色 (Black/White) | |
| `caps` | `unstructured-dad-cap` | 多色 + 校验库存总数同步 | |

## 促销 / 优惠券
| 类型 | 代码/标题 | 期望行为 | 依赖 |
| --- | --- | --- | --- |
| 固定金额优惠券 | `SAVE10CAD` | 满 $50 CAD 减 $10 CAD，`minOrderValue`=50.00 | 需在 Prisma 中新增，`CouponType.FIXED` |
| 百分比优惠券 | `FREESHIP15` | 全品 15% off，上限 $40 CAD | `maxDiscount`=40.00 |
| 限次优惠券 | `FIRSTBUY` | 新客首单一次性 $20 CAD | `userUsageLimit`=1 |
| 促销横幅 | `Holiday Drop` | 首页 Banner，`isActive=true`，验证排序 | `Promotion` 模型 |
| 促销横幅 | `BOGO Hoodie` | 列表页 CTA，`linkUrl=/collections/hoodies` | 需准备对应集合 |

## 订单 / 支付
- Stripe 测试密钥：使用 `.env.test` 中 `STRIPE_SECRET_KEY=sk_test_xxx`，Payment Element 采用 `4242 4242 4242 4242`。
- 订单号格式：`ORD-####`；种子包含 `ORD-1001`，E2E 需断言新订单 `paymentStatus=COMPLETED` 并在后台可见。
- 运费：加拿大标准 `9.99 CAD`、快速 `19.99 CAD`，美国标准 `12.99 CAD`（参考 PRD `2.4.1`）。
- 税率：基于省份（示例 `ON`）；若未实现动态税率，在测试中校验显示字段存在即可。

## 数据操作前置
1. Prisma schema 已包含 Coupon/Promotion/OrderCoupon；若未迁移，需要先完成 `docs/COUPON-PROMOTION-MIGRATION-PLAN.md` 步骤。
2. `prisma/seed.ts` 目前只写入商品和 Demo 订单，需要扩展以：
   - 插入上述优惠券/促销记录。
   - 插入顾客账号 `customer@test.com`、访客邮箱白名单（若需要）。
   - 生成至少 2 个待处理订单供后台筛选测试。
3. `scripts/seed-categories.js` 要同步新增集合/分类，以便搜索/筛选脚本调用。

## 测试依赖矩阵
- **前端 URL**：`BASE_URL=http://localhost:3000`
- **后端 API**：`API_BASE_URL=http://localhost:4000`
- **数据库**：Playwright fixture 需要在每个测试套件前调用 `npm run db:reset`（或 `prisma migrate reset`）以保证状态一致。
- **外部服务**：Stripe 测试模式；邮件可通过 mock service（如 Mailhog）或直接断言 UI。

## 待确认事项
1. `customer@test.com` 是否已存在于生产/测试数据库？若无，需要在种子脚本创建并提供密码。
2. 优惠券是否已切换到 Prisma 模型？若仍为 Sequelize，需要阻塞端到端测试。
3. 后台订单状态流转 API (`/admin/orders/:id/status`) 是否稳定，可直接在 Playwright 管理员脚本调用？

以上条目用于支撑 `req-sync` 任务，后续步骤将基于该清单继续实施。

