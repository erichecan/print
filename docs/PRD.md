# Product Requirements Document (PRD)
# Print E-commerce Platform - Dynamic Features

**Document Version**: 1.1  
**Last Updated**: 2025-01-27  
**Status**: Active Development

## 1. Executive Summary

### 1.1 Product Overview
将现有的静态 HTML 电商网站升级为完整的动态电商平台，支持产品管理、购物车、结账、支付（Stripe CAD）、订单管理和发货功能。

### 1.2 Target Market
- **主要市场**: 加拿大（默认）
- **次要市场**: 美国
- **货币**: 加元 (CAD)

### 1.3 Technology Stack
- **前端**: Next.js 14 (App Router) + TypeScript
- **后端 API**: Node.js + Express
- **数据库**: PostgreSQL
- **ORM**: Prisma
- **支付**: Stripe (CAD only)
- **发货**: EasyShip (Phase 2)

---

## 2. User Stories & Features

### 2.1 Storefront Features

#### 2.1.1 Homepage
- **US-001**: 作为访客，我可以查看主页，包括产品推荐、特色分类和营销横幅
- **US-002**: 作为访客，我可以快速导航到产品分类或搜索产品

#### 2.1.2 Product Catalog
- **US-003**: 作为访客，我可以浏览所有可用产品
- **US-004**: 作为访客，我可以按分类筛选产品
- **US-005**: 作为访客，我可以搜索产品（按名称、SKU、描述）
- **US-006**: 作为访客，我可以查看产品列表的分页结果
- **US-007**: 作为访客，我可以按价格、名称、最新排序产品

#### 2.1.3 Product Detail
- **US-008**: 作为访客，我可以查看单个产品的详细信息
- **US-009**: 作为访客，我可以查看产品的多个图片
- **US-010**: 作为访客，我可以选择产品的变体（尺寸、颜色）
- **US-011**: 作为访客，我可以查看产品的价格、SKU、库存状态
- **US-012**: 作为访客，我可以将产品添加到购物车

#### 2.1.4 Shopping Cart
- **US-013**: 作为访客，我可以查看购物车中的所有商品
- **US-014**: 作为访客，我可以修改购物车中商品的数量
- **US-015**: 作为访客，我可以从购物车中删除商品
- **US-016**: 作为访客，我的购物车在刷新页面后仍然保留（基于 session）
- **US-017**: 作为登录用户，我的购物车与账户同步

#### 2.1.5 Checkout
- **US-018**: 作为访客，我可以以访客身份结账（无需账户）
- **US-019**: 作为访客，我可以选择创建账户并结账
- **US-020**: 作为登录用户，我可以使用已保存的地址信息
- **US-021**: 作为用户，我可以输入收货地址（加拿大或美国）
- **US-022**: 作为用户，我可以选择发货方式（标准/快速）
- **US-023**: 作为用户，我可以在结账前预览订单总额（含税费和运费）
- **US-024**: 作为用户，我可以使用 Stripe 安全支付

#### 2.1.6 Order Confirmation
- **US-025**: 作为用户，我可以在支付成功后查看订单确认页面
- **US-026**: 作为用户，我可以收到订单确认邮件
- **US-027**: 作为用户，我可以查看订单号和订单详情

#### 2.1.7 User Account (Phase 1.1)
- **US-028**: 作为用户，我可以注册账户（邮箱 + 密码）
- **US-029**: 作为用户，我可以登录账户
- **US-030**: 作为用户，我可以查看我的订单历史
- **US-031**: 作为用户，我可以查看单个订单的详情
- **US-032**: 作为用户，我可以管理我的收货地址

#### 2.1.8 Content Pages
- **US-033**: 作为访客，我可以访问关于我们页面
- **US-034**: 作为访客，我可以访问联系页面
- **US-035**: 作为访客，我可以访问帮助/FAQ 页面
- **US-036**: 作为访客，我可以访问服务条款页面
- **US-037**: 作为访客，我可以访问隐私政策页面
- **US-038**: 作为访客，我可以访问退货政策页面

#### 2.1.9 Design Lab
- **US-039**: 作为用户，我可以在产品详情页启动 Design Lab 自定义设计
- **US-040**: 作为用户，我可以在画布上添加文字、图片、素材
- **US-041**: 作为用户，我可以切换产品颜色并在画布上预览
- **US-042**: 作为用户，我可以切换设计面（正面/背面/袖子）
- **US-043**: 作为用户，我可以添加 Names and Numbers（名字和号码）定制
- **US-044**: 作为用户，我可以获取设计报价
- **US-045**: 作为用户，我可以保存设计草稿（Phase 1: localStorage，Phase 2: 云端保存）

---

### 2.2 Admin Features

#### 2.2.1 Authentication
- **US-046**: 作为管理员，我可以使用管理员账户登录
- **US-047**: 作为管理员，我可以安全地访问管理后台

#### 2.2.2 Dashboard
- **US-048**: 作为管理员，我可以查看关键指标仪表板
  - 今日/本周/本月订单数
  - 今日/本周/本月收入
  - 待处理订单数
  - 低库存产品数

#### 2.2.3 Product Management
- **US-049**: 作为管理员，我可以创建新产品
- **US-050**: 作为管理员，我可以编辑现有产品
- **US-051**: 作为管理员，我可以删除产品（软删除）
- **US-052**: 作为管理员，我可以管理产品变体（尺寸、颜色、价格、库存）
- **US-053**: 作为管理员，我可以上传产品图片
- **US-054**: 作为管理员，我可以设置产品为激活/停用状态
- **US-055**: 作为管理员，我可以将产品分配到分类

#### 2.2.4 Collection Management
- **US-056**: 作为管理员，我可以创建产品分类/集合
- **US-057**: 作为管理员，我可以编辑分类
- **US-058**: 作为管理员，我可以删除分类
- **US-059**: 作为管理员，我可以将产品添加到分类

#### 2.2.5 Order Management
- **US-060**: 作为管理员，我可以查看所有订单列表
- **US-061**: 作为管理员，我可以按状态筛选订单
- **US-062**: 作为管理员，我可以查看订单详情
- **US-063**: 作为管理员，我可以更新订单状态（处理中 → 已发货 → 已送达）
- **US-064**: 作为管理员，我可以取消订单
- **US-065**: 作为管理员，我可以处理退款（通过 Stripe）

#### 2.2.6 Shipping Management (Phase 2)
- **US-066**: 作为管理员，我可以查看发货标签请求
- **US-067**: 作为管理员，我可以通过 EasyShip API 生成发货标签
- **US-068**: 作为管理员，我可以查看订单的跟踪信息
- **US-069**: 作为管理员，我可以接收发货状态更新的 Webhook

---

### 2.3 Payment Features

#### 2.3.1 Stripe Integration
- **US-070**: 作为用户，我可以使用 Stripe Payment Element 输入支付信息
- **US-071**: 作为用户，我的支付信息不会存储在服务器上（PCI 合规）
- **US-072**: 作为系统，支付金额以 CAD 处理
- **US-073**: 作为系统，支付成功后自动创建订单
- **US-074**: 作为系统，支付失败时显示错误信息

#### 2.3.2 Webhook Handling
- **US-075**: 作为系统，我可以处理 Stripe webhook 事件
  - `payment_intent.succeeded`: 标记订单为已支付
  - `payment_intent.payment_failed`: 标记订单为支付失败
  - `charge.refunded`: 更新订单退款状态

---

### 2.4 Shipping Features

#### 2.4.1 Phase 1: Static Shipping Rates
- **US-076**: 作为用户，我可以看到基于收货地址的固定运费
  - 加拿大: 标准 $9.99 CAD, 快速 $19.99 CAD
  - 美国: 标准 $12.99 CAD
- **US-077**: 作为用户，我可以看到预计送达时间

#### 2.4.2 Phase 2: EasyShip Integration
- **US-078**: 作为用户，我可以看到基于 EasyShip 的实时运费
- **US-079**: 作为管理员，我可以通过 EasyShip API 获取发货标签
- **US-080**: 作为系统，我可以接收 EasyShip 的跟踪更新 webhook

---

## 3. Technical Requirements

### 3.1 Performance
- 首页加载时间 (LCP) < 2.5s (4G 网络)
- API 响应时间 (TTFB) < 500ms
- 图片自动优化和懒加载
- 路由预取优化

### 3.2 SEO
- 所有产品页面 SSR (Server-Side Rendering)
- 动态 sitemap.xml
- robots.txt 配置
- Open Graph 和 Twitter Card 元数据
- 结构化数据 (JSON-LD)

### 3.3 Security
- HTTPS only
- CSRF 保护
- SQL 注入防护 (Prisma)
- XSS 防护
- 环境变量管理（敏感信息不提交到代码库）
- Stripe webhook 签名验证

### 3.4 Accessibility
- WCAG 2.1 AA 级别合规
- 键盘导航支持
- 屏幕阅读器兼容

---

## 4. Non-Functional Requirements

### 4.1 Scalability
- 支持至少 1000 个并发用户
- 数据库连接池配置
- API 速率限制

### 4.2 Monitoring & Logging
- 错误追踪 (Sentry 推荐)
- 请求日志记录
- 性能监控
- 管理员操作审计日志

### 4.3 Email Notifications
- 订单确认邮件
- 发货通知邮件
- 密码重置邮件（如需要）

---

## 5. Design Lab Data Persistence Strategy

### 5.1 Decision Overview

**Date**: 2025-01-27  
**Decision**: Implement **Phase 1 - Enhanced localStorage Mechanism**  
**Future Plan**: **Phase 2 - Full User Account Cloud Persistence** (planned for Phase 2)

### 5.2 Phase 1: Enhanced localStorage Mechanism (Current Implementation)

#### 5.2.1 Technical Implementation
- **Storage Location**: Browser localStorage (`designLabStore` key)
- **Auto-Recovery**: Automatic restoration on page load from localStorage
- **Scope**: Same browser + same device only
- **Data Persisted**:
  - Current side (front/back/sleeve)
  - Canvas JSON for all three sides
  - Product variant ID
  - Names and Numbers order data
  - Design name
  - Timestamp

#### 5.2.2 User Experience
- ✅ **Supported Scenarios**:
  - User refreshes page → Design automatically restored
  - User closes and reopens browser (same session) → Design automatically restored
  - User navigates away and returns → Design automatically restored

- ❌ **Limitations**:
  - Different browser → Design not available
  - Clear browser data → Design lost permanently
  - Different device → Design not available
  - Private/Incognito mode → Design lost when tab closed

#### 5.2.3 Save Button Behavior
- **Current Implementation** (`saveDesign()` function):
  - Downloads JSON file to local machine (`design-{timestamp}.json`)
  - Downloads PNG preview to local machine (`design-{side}-{timestamp}.png`)
  - Does NOT save to server
  - Does NOT save to localStorage (already saved automatically)

#### 5.2.4 Backend Integration (Partial)
- **Get Price Flow**:
  - When user clicks "Get Price", design is automatically saved to backend via `/api/designs` API
  - Uses `authenticateOptional` middleware (works without login via sessionId)
  - Design can be saved with `userId` (if logged in) or `sessionId` (if guest)
  - **Note**: Currently there is NO mechanism to load saved designs from backend into Design Lab

### 5.3 Phase 2: Full User Account Cloud Persistence (Planned)

#### 5.3.1 Planned Features
- **User Authentication Required**: Users must be logged in to save designs
- **Cloud Storage**: All designs saved to database via backend API
- **Cross-Device Access**: Access designs from any browser/device
- **Design List UI**: "My Designs" panel in Design Lab to list and load saved designs
- **Auto-Load on Page Load**: If URL contains `?designId=xxx`, automatically load that design
- **Sync Mechanism**: Merge localStorage designs with cloud designs on login

#### 5.3.2 Technical Requirements
- Enhance `saveDesign()` to also save to backend
- Implement auto-save to backend (periodic or on design changes)
- Create "Load Design" functionality that fetches from `/api/designs/:id`
- Add "My Designs" panel UI component
- Integrate with `/api/user/designs` API to list user's designs
- Handle design versioning and updates

#### 5.3.3 User Stories (Phase 2)
- **US-081**: 作为登录用户，我可以在任何浏览器/设备上访问我之前保存的设计
- **US-082**: 作为登录用户，我可以查看我所有保存的设计列表
- **US-083**: 作为登录用户，我可以点击已保存的设计来加载并继续编辑
- **US-084**: 作为登录用户，我的设计会自动保存到云端
- **US-085**: 作为登录用户，我可以给我的设计命名和重命名

### 5.4 Current Implementation Details

#### 5.4.1 Storage Structure
```javascript
localStorage.getItem('designLabStore') = {
  currentSide: 'front' | 'back' | 'sleeve',
  designName: 'Untitled Design',
  sides: {
    front: { canvasJSON: {...}, thumbDataURL: 'data:image/png...' },
    back: { canvasJSON: {...}, thumbDataURL: 'data:image/png...' },
    sleeve: { canvasJSON: {...}, thumbDataURL: 'data:image/png...' }
  },
  product: {
    variantId: 'uuid',
    // ... other product data
  },
  namesNumbersOrder: {
    items: [...],
    totals: {...}
  },
  version: '1.0.0',
  timestamp: '2025-01-27T...'
}
```

#### 5.4.2 Auto-Recovery Logic
1. On page load, `store.js` calls `loadFromStorage()`
2. Checks if `variantId` in URL matches saved `variantId`
3. If different, clears canvas data (new product variant)
4. If same, restores all saved data including canvas JSON for all sides
5. Canvas manager loads the restored data into Fabric.js canvas

#### 5.4.3 Save Button Flow
1. User clicks "Save" button
2. `saveDesign()` function executed:
   - Saves current side to store
   - Creates JSON export with all design data
   - Downloads JSON file to user's computer
   - Exports current side as PNG (2x resolution)
   - Downloads PNG file to user's computer
   - **Does NOT call backend API**

#### 5.4.4 Get Price Flow (Saves to Backend)
1. User clicks "Get Price" button
2. `getPrice()` function executed:
   - Calls `saveDesignToBackend()` (if not already saved)
   - Creates/updates design via `POST /api/designs` or `PATCH /api/designs/:id`
   - Stores design ID in `currentDesignId` variable
   - Fetches quote via `POST /api/designs/:id/quote`
   - Displays pricing information

### 5.5 Backend API Status

#### 5.5.1 Available APIs
- ✅ `POST /api/designs` - Create design draft (supports guest via sessionId)
- ✅ `GET /api/designs/:id` - Get design draft (requires ownership)
- ✅ `PATCH /api/designs/:id` - Update design draft (requires ownership)
- ✅ `GET /api/user/designs` - List user's designs (requires authentication)
- ✅ `POST /api/designs/:id/quote` - Get pricing quote

#### 5.5.2 Missing Frontend Integration
- ❌ Design Lab does NOT load designs from backend on page load
- ❌ Design Lab does NOT have UI to list user's saved designs
- ❌ Design Lab does NOT have UI to load a specific design by ID
- ❌ Save button does NOT save to backend (only downloads files)

### 5.6 Migration Path from Phase 1 to Phase 2

When implementing Phase 2, consider:

1. **Backward Compatibility**: 
   - Continue supporting localStorage for guest users
   - On login, offer to migrate localStorage designs to cloud

2. **Design Loading Priority**:
   - Check URL for `?designId=xxx` → Load from backend
   - If logged in and no designId → Show "My Designs" panel
   - Otherwise → Fall back to localStorage

3. **Data Sync**:
   - When user logs in, check if localStorage has unsaved designs
   - Prompt user to save localStorage designs to cloud
   - Merge localStorage and cloud designs intelligently

---

## 6. Out of Scope (Phase 1)

- PayPal 支付（仅使用 Stripe）
- 用户评价/评论系统（可后续添加）
- 优惠券系统（可后续添加）
- 推荐产品算法
- 多语言支持（i18n）
- 实时聊天支持
- **Design Lab 云端保存（Phase 2）** - See Section 5.3

---

## 7. Success Metrics

### 6.1 Business Metrics
- 订单转化率
- 平均订单价值 (AOV)
- 购物车放弃率
- 支付成功率

### 6.2 Technical Metrics
- API 响应时间 P95 < 500ms
- 错误率 < 0.1%
- 系统正常运行时间 > 99.9%

---

## 8. Timeline & Milestones

- **M1 (Week 1)**: 项目设置、数据库 schema、产品目录 API 和 SSR 页面
- **M2 (Week 2)**: 购物车服务和 API，持久化购物车
- **M3 (Week 3)**: Stripe 支付集成、Webhook、订单创建
- **M4 (Week 4)**: 管理后台 MVP、SEO、分析工具
- **M5 (Week 5)**: EasyShip 集成、完善功能、上线准备

---

**Document Owner**: Development Team  
**Review Frequency**: Weekly during development phase
