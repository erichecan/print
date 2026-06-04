# PRD — 商品评论系统

> 创建日期：2026-05-27

---

## 1. 背景与目标

为 PrintNGo 平台添加完整的商品评论系统，帮助买家做购买决策，同时给管理员提供完整的内容审核与展示控制能力。

---

## 2. 用户角色

| 角色 | 说明 |
|------|------|
| 买家 | 已登录、且在订单中购买过该商品的用户 |
| 管理员 | 后台管理员（role = admin） |
| 访客 | 未登录用户，只可查看已审核评论 |

---

## 3. 功能需求

### 3.1 买家侧

#### 查看评论
- 商品列表页：每张商品卡显示星级图标 + 平均分（无已审核评论时不显示）
- 商品详情页：
  - 顶部展示平均分（大字）+ 评分分布条形图（1-5 星各占比）
  - 评论列表：分页加载，每页 10 条
  - 每条评论展示：星级、标题、正文、图片（可点击放大）、管理员回复（如有）、提交时间
  - 若该商品评论入口被管理员关闭，则不展示整个评论区域

#### 提交评论
- 入口：商品详情页评论区底部
- **前置条件**：已登录 + 在任意已完成订单中包含该商品（`isVerifiedPurchase`）
- 未满足条件时，入口不显示
- 提交字段：
  - 星级（1-5，必填）
  - 标题（必填，最长 100 字）
  - 正文（必填，最长 1000 字）
  - 图片（可选，最多 5 张，每张不超过 5MB，支持 jpg/png/webp）
- 提交后状态为 `PENDING`，提示"评论已提交，等待审核"
- 每个用户对同一商品只能提交一次评论

### 3.2 管理员侧

#### 评论审核管理（`/admin/reviews`）
- 评论列表，支持筛选：
  - 状态（全部 / PENDING / APPROVED / REJECTED / HIDDEN）
  - 商品名称（搜索）
  - 时间范围
- 每条评论展示：商品名、买家名、星级、标题、正文、图片缩略图、提交时间、当前状态
- 操作按钮：
  - **批准**（PENDING → APPROVED）：评论对外可见
  - **拒绝**（PENDING / APPROVED → REJECTED）：评论不可见
  - **隐藏**（APPROVED → HIDDEN）：临时下架，不可见
  - **恢复显示**（HIDDEN → APPROVED）
  - **回复**：输入管理员回复文字，展示在评论下方（可修改）
- 分页，每页 20 条

#### 商品评论设置（在商品详情/编辑页中）
- **评论入口开关**：关闭后，该商品详情页不显示评论区（买家无法提交，也不显示已有评论）
- **最大展示数量**：设置该商品评论区最多展示多少条（0 = 不限制，按分页正常加载）

---

## 4. 数据模型变更

### 4.1 `ProductReview` 补充字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `status` | Enum | `PENDING / APPROVED / REJECTED / HIDDEN`，默认 `PENDING` |
| `images` | `String[]` | 评论图片 URL 数组 |
| `adminReply` | `String?` | 管理员回复内容 |
| `adminRepliedAt` | `DateTime?` | 管理员回复时间 |

### 4.2 新增 `ProductReviewSettings` 模型

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | String | UUID 主键 |
| `productId` | String | 唯一，关联 Product |
| `reviewsEnabled` | Boolean | 默认 `true` |
| `maxDisplayCount` | Int | 默认 `10`（0 = 不限制）|
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

---

## 5. API 端点清单

### 公开端点（无需登录）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/products/:id/reviews` | 分页获取已审核（APPROVED）评论 |
| GET | `/api/products/:id/review-summary` | 平均分 + 评分分布 + 总数 |

### 认证端点（买家 / 管理员）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/products/:id/reviews` | 提交评论（验证已购买） |
| GET | `/api/reviews/mine` | 当前用户的评论列表 |
| POST | `/api/reviews/images/upload` | 上传评论图片，返回 URL |

### 管理员端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/reviews` | 全部评论列表（支持筛选） |
| PATCH | `/api/admin/reviews/:id/status` | 变更状态（approve/reject/hide/restore）|
| POST | `/api/admin/reviews/:id/reply` | 写/更新管理员回复 |
| GET | `/api/admin/products/:id/review-settings` | 读取 per-product 评论设置 |
| PUT | `/api/admin/products/:id/review-settings` | 更新开关 + 展示数量 |

---

## 6. 前端改动范围

| 位置 | 改动 |
|------|------|
| 商品卡组件 | 新增星级 + 平均分展示 |
| 商品详情页 | 新增评论区（摘要 + 列表 + 提交表单）|
| 评论提交表单 | 星级选择、标题、正文、图片上传 |
| `/admin/reviews` | 评论审核管理页（全新页面）|
| `/admin/products/:id` 编辑页 | 新增评论设置区块 |

---

## 7. 业务规则

1. 每用户对同一商品只能提交一次评论
2. 只有在已完成订单中购买过该商品的用户，才显示提交入口
3. 管理员不受"已购买"限制，可直接提交
4. 评论提交后默认 `PENDING`，只有管理员批准后才对外可见
5. 商品评论入口被关闭时，整个评论区域对买家不可见（包括已审核评论）
6. 图片存储于 GCP Cloud Storage，路径格式：`gs://print-482914-images/reviews/{reviewId}/{filename}`
