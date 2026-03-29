# 分类体系重构方案（一级 + 二级类目）

**日期**：2026-03-11  
**背景**：当前系统中的 `categories` 仅支持「单层分类」，无法满足类似 Custom Ink 那样的「一级类目 + 二级类目」结构需求。  
**目标**：在不依赖现有脏数据前提下，引入通用的父子分类模型，支撑：

- 顶级类目（如：T‑shirts / Hoodies & Sweatshirts / Hats / Jackets & Vests / Polo Shirts / Activewear / Women’s / Kids）
- 每个顶级下的一组二级类目（如：Short Sleeve T‑shirts / Long Sleeve T‑shirts / …）

---

## 1. 数据库与 Prisma 模型设计

### 1.1 现状（简要）

- 有一张 `categories` 表（Prisma 模型 `Category`），目前为**扁平结构**。
- 产品表（含 `offline_order_products` 等）通过 `categoryId` 外键指向 `categories.id`。
- 不区分一级 / 二级，只能用一个名字表达分类。

### 1.2 目标结构

在 `categories` 上增加「自关联父子关系」，实现任意层级的树形结构（当前只用到两层）：

```prisma
model Category {
  id        String   @id @default(uuid())
  name      String
  // 新增：父分类（顶级分类 parentId = null）
  parentId  String?  @map("parent_id")
  parent    Category? @relation("CategoryToParent", fields: [parentId], references: [id])
  children  Category[] @relation("CategoryToParent")

  // ... 其他字段（slug、isActive、sortOrder 等）保持不变
}
```

对应数据库迁移（PostgreSQL）：

```sql
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS parent_id TEXT;

ALTER TABLE categories
  ADD CONSTRAINT categories_parent_id_fkey
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
```

**约定：**

- `parent_id IS NULL` → 一级类目（如 `T-shirts` / `Hoodies & Sweatshirts` 等）
- `parent_id IS NOT NULL` → 二级类目（如 `Short Sleeve T-shirts` 等）

产品仍然只挂「一个分类」，但这个分类永远是**二级类目**，一级类目通过 `JOIN categories parent ON categories.parent_id = parent.id` 推导。

---

## 2. 顶级 / 二级类目标准树（对标 Custom Ink）

### 2.1 顶级类目（一级）

统一插入以下 8 个顶级类目：

1. `T-shirts`
2. `Hoodies & Sweatshirts`
3. `Hats`
4. `Jackets & Vests`
5. `Polo Shirts`
6. `Activewear`
7. `Women’s`
8. `Kids`

### 2.2 每个一级类目下的二级类目

> 以下列表直接对标 Custom Ink 左侧导航，仅做轻微命名标准化。

#### 2.2.1 `T-shirts` 下的二级类目

- `Short Sleeve T-shirts`
- `Long Sleeve T-shirts`
- `Soft Tri-Blend T-shirts`
- `Performance Shirts`
- `Women's T-shirts`
- `Kids T-shirts`
- `Heavyweight T-shirts`
- `Tie-Dye T-shirts`
- `Tank Tops & Sleeveless`
- `No Minimum T-shirts`
- `Made in the USA T-shirts`
- `Tall T-shirts`
- `Sustainable T-shirts`
- `Canada T-shirts`
- `NEW T-shirts`
- `All T-shirts`

#### 2.2.2 `Hoodies & Sweatshirts` 下的二级类目

- `Hoodies`
- `Crewneck Sweatshirts`
- `Full Zip Sweatshirts`
- `Quarter Zip Sweatshirts`
- `Heavyweight Sweatshirts`
- `Lightweight Sweatshirts`
- `Champion Sweatshirts`
- `Carhartt Sweatshirts`
- `Nike Sweatshirts`
- `Performance Sweatshirts`
- `Fleece Jackets & Pullovers`
- `Premium Sweatshirts`
- `Women's Hoodies & Sweatshirts`
- `Kids Sweatshirts`
- `Tall Sweatshirts`
- `Embroidered Sweatshirts`
- `No Minimum Sweatshirts`
- `Canada Sweatshirts`
- `All Hoodies & Sweatshirts`

#### 2.2.3 `Hats` 下的二级类目

- `Baseball Hats`
- `Trucker Hats`
- `Beanies`
- `No Minimum Hats`
- `Dad Hats`
- `Patch Hats`
- `Rope Hats`
- `5 Panel Hats`
- `Premium Hats`
- `Embroidered Hats`
- `Bucket Hats`
- `New Era Hats`
- `Nike Hats`
- `Performance Hats`
- `Work Hats`
- `Visors`
- `Camo Hats`
- `Headbands`
- `Kids Hats`
- `Canada Hats`
- `NEW Hats`
- `All Hats`

#### 2.2.4 `Jackets & Vests` 下的二级类目

- `Fleece Jackets & Pullovers`
- `Soft Shell Jackets`
- `Vests`
- `The North Face Jackets`
- `Patagonia Jackets`
- `Insulated & Down Jackets`
- `Work Jackets`
- `Windbreakers`
- `Rain Jackets`
- `No Minimum Jackets`
- `Blazers`
- `Tech Fleece Jackets`
- `Track Jackets`
- `Women's Jackets`
- `Tall Jackets`
- `All Jackets`

#### 2.2.5 `Polo Shirts` 下的二级类目

- `Embroidered Polo Shirts`
- `Printed Polo Shirts`
- `Performance Polo Shirts`
- `Golf Polo Shirts`
- `Nike Dri-FIT Polo Shirts`
- `Under Armour Polo Shirts`
- `Adidas Polo Shirts`
- `Long Sleeve Polo Shirts`
- `Women's Polo Shirts`
- `No Minimum Polo Shirts`
- `Tall Polo Shirts`
- `Kids Polo Shirts`
- `Canada Polo Shirts`
- `NEW Polo Shirts`
- `All Polo Shirts`

#### 2.2.6 `Activewear` 下的二级类目

- `Short Sleeve Performance Shirts`
- `Long Sleeve Performance Shirts`
- `Team Jerseys`
- `Quarter Zip Performance Shirts`
- `Performance Tanks`
- `Women's Activewear`
- `Kids Activewear`
- `Under Armour Activewear`
- `Nike Activewear`
- `Performance Sweatshirts & Hoodies`
- `Performance Polos`
- `Track Jackets`
- `Performance Sweatpants`
- `Shorts`
- `No Minimum Activewear`
- `Rash Guards & Swim Shirts`
- `Performance Hats`
- `Canada Activewear`
- `All Activewear`

#### 2.2.7 `Women’s` 下的二级类目

- `Women's Short Sleeve T-shirts`
- `Women's Hoodies & Sweatshirts`
- `Women's Long Sleeve T-shirts`
- `Women's Vests & Jackets`
- `Women's Tank Tops`
- `Women's Activewear`
- `Yoga & Dance`
- `Women's Shorts & Pants`
- `Women's Business Apparel`
- `Women's Polos`
- `Bella + Canvas Women's`
- `No Minimum Women's`
- `Canada Women's`
- `View All`

#### 2.2.8 `Kids` 下的二级类目

- `Kids T-shirts`
- `Baby`
- `Toddlers`
- `Kids Sweats`
- `No Minimum Kids`
- `Kids Long Sleeve Shirts`
- `Kids Activewear`
- `Girls`
- `Kids Accessories`
- `Kids Hats`
- `Kids Outerwear`
- `Kids Polos`
- `Canada Kids`
- `View All`

---

## 3. 现有数据的默认映射策略

> 前提：当前所有业务数据都是「前期准备数据」，可以做合理的默认归类，不要求 100% 精准。

### 3.1 保留现有分类记录

对每条现有 `categories` 记录：

1. **若名字刚好等于一个标准二级类目名**  
   - 将其视为「标准二级类目」，`parent_id` 设置为对应顶级类目的 id。
   - 不再新建重复的记录。

2. **否则（不在标准列表中）**  
   - 为该名称创建一个顶级分类：`<原 name>`（如果还不存在）。  
   - 为该名称创建一个二级分类：`All <原 name>`，其 `parent_id` 指向上面的顶级。  
   - 原来挂在 `<原 name>` 下的所有 `products` / `offline_order_products`，统一挂到 `All <原 name>` 上。

3. **对于 `category_id` 为空的产品**  
   - 统一挂到一个特殊分类树：  
     - 顶级：`Uncategorized`  
     - 二级：`All Uncategorized`  
   - 后续可以在后台手动调整到更合适的类目。

### 3.2 产品 / Offline Orders 的调整

- `products.categoryId` 与 `offline_order_products.categoryId`：
  - 迁移之后，保证都指向**某个二级类目**的 `id`。
  - 一级类目信息通过 join `categories.parent` 自动获得。

---

## 4. 后端 API 改造要点

### 4.1 Category 相关接口

**当前（推测）：**

- `GET /api/categories` 返回一维列表：`[{ id, name, ... }]`。

**目标：**

- 至少返回 `parentId`，前端可自行组织层级；
- 理想形态：直接返回嵌套树：

```json
[
  {
    "id": "cat_tshirts",
    "name": "T-shirts",
    "parentId": null,
    "children": [
      { "id": "cat_tshirts_short_sleeve", "name": "Short Sleeve T-shirts", "parentId": "cat_tshirts" }
    ]
  }
]
```

### 4.2 产品 / Offline Orders 相关接口

**写入：**

- 创建 / 更新产品时依然只接收一个 `categoryId`（约定为二级类目 id），不需要前端传 parent。

**读取：**

- 为便于展示，可以返回：

```json
{
  "id": "...",
  "name": "...",
  "category": {
    "id": "cat_tshirts_short_sleeve",
    "name": "Short Sleeve T-shirts",
    "parent": {
      "id": "cat_tshirts",
      "name": "T-shirts"
    }
  }
}
```

后端实现上，只需要在 Prisma 查询中 `include: { category: { include: { parent: true } } }` 即可。

---

## 5. 前端改造要点

### 5.1 管理后台中的分类选择控件

目标：从单一 select 升级为「先选一级，再选二级」的级联选择。

- 第一个下拉：显示所有 `parentId = null` 的顶级分类。
- 第二个下拉：根据所选顶级过滤其 `children`。
- 保存时只把**二级类目**的 `id` 传给后端。

### 5.2 列表 & 详情展示

- 在 Product Management / Offline Orders 等管理页面：
  - 显示为：`<一级类目> / <二级类目>`（例如 `T-shirts / Short Sleeve T-shirts`）。
  - 支持按一级类目筛选：选择某个顶级时，后端或前端筛选该顶级下所有 `children` 的产品。

---

## 6. 实施顺序建议

1. **Schema & Seed**
   - 修改 Prisma 模型 & 生成迁移，更新 `categories` 表结构。
   - 写 seed 脚本插入标准 8 个一级 + 全部二级类目。
   - 写迁移脚本将现有产品归入合理的默认二级类目。

2. **后端 API**
   - 更新 Category / Product / Offline Orders 相关查询逻辑，返回包含 parent 的分类信息。
   - 确认创建 / 更新接口只使用二级 `categoryId`，不影响现有调用方。

3. **前端**
   - 改造管理后台分类选择 UI 为级联选择。
   - 更新列表 / 详情展示为「一级 / 二级」结构，验证筛选逻辑。

4. **生产验证**
   - 本地 / 测试环境完成 E2E 验证后，再执行生产数据迁移脚本。
   - 在生产上验证：  
     - Product Management 加载正常；  
     - Offline Orders 配置页中的分类选择与筛选逻辑正确；  
     - 现有订单 / 产品数据在新分类结构下不会报错。

