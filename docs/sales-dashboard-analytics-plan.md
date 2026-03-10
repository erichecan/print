# Sales Dashboard 经营分析增强与「自写 SQL」可行性说明

**日期**: 2026-03-10  
**目标**: 从电商经营角度增强看板（更灵活筛选、多维度分析），并说明「客户自己写 SQL」的可行方案与风险。

---

## 一、客户诉求归纳

1. **更灵活的筛选条件**：时间、分类、供应商、产品、工艺类型、印刷位置、创建人等。
2. **更多经营维度分析**：
   - 卖了多少（销量/营收）
   - 成本多少
   - 库存消耗多少
   - 平均单价
   - 哪款服装销量最好
   - 定制工艺（DTF/Screen/Embroidery 等）维度
   - 定制位置（前胸/后背/袖子等）维度
3. **希望可以自己写 SQL 查数据**：类似数据平台的自助分析能力。

---

## 二、经营分析增强方案（推荐先做）

### 2.1 筛选条件扩展

| 筛选项       | 说明                     | 数据来源                          |
|--------------|--------------------------|-----------------------------------|
| 时间范围     | 已有                     | `created_at`                      |
| 我的业绩     | 已有                     | `metadata.submittedByUserId`      |
| 产品         | 主产品名称               | `primary_product`                 |
| 分类         | 产品所属分类             | 需通过 product 名关联 offline_order_products.category_id → categories |
| 供应商       | 产品供应商               | offline_order_products.supplier_id |
| 工艺类型     | 印刷工艺                 | `configuration` → colorGroupsByProduct → positions[].method |
| 印刷位置     | 前胸/后背/袖子等         | configuration → positions[].positionKey |
| 创建人       | 销售/经理                | metadata.submittedByUserId → users |

### 2.2 经营指标扩展

| 指标           | 说明                     | 计算方式 |
|----------------|--------------------------|----------|
| 销售笔数       | 已有                     | 订单数   |
| 总营收         | 已有                     | SUM(pricing.total) |
| 客单价         | 已有                     | 总营收/订单数 |
| 总成本         | 已有                     | SUM(pricing.costTotal) |
| 毛利/毛利率    | 已有                     | 营收-成本 |
| **库存消耗**   | 订单消耗的总件数         | 从 configuration.productItems 汇总各 color 下 quantities 之和 |
| **平均单价**   | 营收/总件数              | 总营收 / 库存消耗件数（或按订单维度：总营收/订单数，已有客单价） |
| **按工艺统计** | 各工艺（DTF/Screen/Embroidery）的订单数/营收 | 解析 configuration 中 method 聚合 |
| **按位置统计** | 各位置（前胸/后背等）的订单数/数量 | 解析 configuration 中 positionKey 聚合 |
| **销量最好产品** | 已有 topProducts        | 按 primary_product 聚合 |

### 2.3 后端 API 设计建议

- **扩展现有指标接口**  
  `GET /api/admin/offline-orders/metrics/summary` 增加查询参数，例如：
  - `primaryProduct`、`categoryId`、`supplierId`（需通过 primary_product 关联到 offline_order_products）
  - `craft`（工艺，如 DTF/Screen/Embroidery，对应 configuration 内 method）
  - `position`（位置，如 front/back，对应 configuration 内 positionKey）
  - `creatorId`（即 submittedByUserId）
- **返回结构增加**：
  - `inventoryConsumed`: 总件数（从 configuration.productItems 汇总）
  - `averageUnitPrice`: 总营收 / 总件数（件数>0 时）
  - `byCraft`: `[{ craft, orderCount, revenue, quantity }]`
  - `byPosition`: `[{ position, orderCount, revenue, quantity }]`
- **实现注意**：  
  工艺/位置在 JSONB `configuration` 内，需要用 PostgreSQL 的 `jsonb_path` 或逐行解析聚合；分类/供应商需 JOIN `offline_order_products`（通过 primary_product 或 name 关联）。

### 2.4 前端看板增强

- 筛选栏增加：产品（下拉/搜索）、分类、供应商、工艺、位置、创建人（经理视角）。
- 指标区增加：库存消耗、平均单价（或明确区分「客单价」与「件均价」）。
- 图表/表格增加：按工艺分布、按位置分布（柱状或表格）。

---

## 三、「客户自己写 SQL」的可行性与替代方案

### 3.1 为何不直接开放「任意 SQL」

- **安全**：任意 SQL 可能导致删库、越权访问、泄露其他客户/订单数据。
- **稳定**：复杂/全表扫描 SQL 会拖垮数据库，影响线上业务。
- **合规**：生产库直接暴露给业务用户写 SQL 不符合常见安全规范。

因此，**不建议**在销售/经营侧提供「任意写 SQL 执行」的能力。

### 3.2 可实现的「数据平台」式能力

以下方式在满足「自助分析」的同时，避免上述风险：

| 方案 | 说明 | 适用角色 |
|------|------|----------|
| **A. 自定义报表（推荐）** | 前端提供「维度 + 指标 + 筛选」配置，后端根据配置生成**固定、参数化**的 SQL（只读、白名单字段与表）。用户不写 SQL，但可自由组合维度（时间/产品/分类/工艺/位置等）和指标（营收/成本/件数等）。 | 销售、经理 |
| **B. 管理员只读 SQL 控制台** | 仅 **Admin** 可用；使用**只读数据库账号**、**查询超时**（如 30s）、**审计日志**；禁止 `INSERT/UPDATE/DELETE` 与敏感表。类似 Metabase/Supabase SQL Editor。 | 仅管理员 |
| **C. 导出 + 外部分析** | 提供「导出当前筛选结果」为 CSV/Excel，用户在 Excel / BI 工具中做进一步分析。 | 所有有权限的角色 |

推荐路径：**先做 A（自定义报表/探索分析）**，满足「更灵活筛选、多维度、经营视角」；若客户确需写 SQL，再单独做 **B（仅 Admin、只读、带审计与限流）**。

---

## 四、实施优先级建议

1. **Phase 1（当前可做）**
   - 后端：指标接口增加筛选参数（产品、分类、供应商、工艺、位置、创建人），增加返回字段：库存消耗、平均单价、byCraft、byPosition。
   - 前端：看板筛选栏与指标/图表按上表增强。
2. **Phase 2**
   - 自定义报表/探索：前端「维度 + 指标 + 筛选」选择器，后端通用 analytics 接口（白名单维度与指标，生成安全 SQL）。
3. **Phase 3（按需）**
   - 仅 Admin：只读 SQL 控制台 + 超时 + 审计；或导出为 CSV/Excel。

---

## 五、配置结构参考（用于实现）

- **工艺**：`configuration.colorGroupsByProduct` → 各颜色组 → `positions[]` → `method`（如 DTF, Screen, Embroidery）。
- **位置**：同上 → `positions[]` → `positionKey`（如 front, back, left_sleeve）。
- **件数/库存消耗**：`configuration.productItems` → 各 item → `colors` → 各尺码数量汇总；或从 colorGroupsByProduct 的 quantities 汇总。
- **成本**：已有 `configuration.pricing.costTotal`（若每条订单都写入）。

以上用于在后端用 Prisma raw query 或 SQL 从 `offline_orders.configuration` 中解析并聚合。

---

## 六、能否实现「数据平台常用功能」？

**可以，但建议用「自定义报表」而不是「开放写 SQL」。**

- **数据平台常用功能**一般包括：多维度筛选、下钻、多指标、自定义维度/指标组合、导出。这些都可以通过 **维度+指标+筛选** 的「自定义报表」API + 前端配置化 UI 实现，无需让用户写 SQL。
- **若客户坚持要写 SQL**：可为 **管理员** 提供 **只读 SQL 控制台**（只读账号、超时、审计、禁止写操作），作为可选 Phase 3。销售/经理侧仍建议仅提供「自定义报表」与导出，不开放任意 SQL。
