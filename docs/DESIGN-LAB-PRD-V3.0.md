# Design Lab 3.0 产品需求文档（PRD）

**版本**: 3.0  
**创建时间**: 2025-12-07 19:40:00  
**状态**: 📋 需求文档

---

## 目录

- [1. 产品概述与目标](#1-产品概述与目标)
- [2. 用户角色与核心用户故事](#2-用户角色与核心用户故事)
- [3. 信息架构与全局布局](#3-信息架构与全局布局)
- [4. 左侧功能栏模块](#4-左侧功能栏模块)
- [5. 画布视图与对象编辑](#5-画布视图与对象编辑)
- [6. 字体选择器与素材库浏览](#6-字体选择器与素材库浏览)
- [7. Names & Numbers流程与联动](#7-names--numbers流程与联动)
- [8. 报价与下单流程（Get Price）](#8-报价与下单流程get-price)
- [9. 底部操作区与工作流](#9-底部操作区与工作流)
- [10. 撤销与重做、分层与对齐、安全区](#10-撤销与重做分层与对齐安全区)
- [11. 校验规则与边界条件](#11-校验规则与边界条件)
- [12. 无障碍（A11y）、性能与可观测性](#12-无障碍a11y性能与可观测性)
- [13. 关键按钮与交互清单（速查）](#13-关键按钮与交互清单速查)
- [14. 里程碑与验收建议](#14-里程碑与验收建议)
- [15. API 接口设计](#15-api-接口设计)
- [16. 数据库设计](#16-数据库设计)
- [17. 与商品详情的集成](#17-与商品详情的集成)
- [18. 与购物车的集成](#18-与购物车的集成)

---

## 1. 产品概述与目标

- 提供一个所见即所得的服装定制平台，支持上传图片、添加文字与艺术素材、选择产品与颜色、设置个性化名字和号码（Names & Numbers），并完成报价与下单或发起筹款。

- **目标指标**：
  - 设计完成率
  - 进入报价率
  - 加车率
  - 结账率
  - 客服触达率
  - 设计器交互满意度（含上传体验评分）

---

## 2. 用户角色与核心用户故事

### 用户角色
- **个人用户**：独立完成设计并下单
- **团队管理员**：为多人统一下单，管理团队尺码与支付
- **组员**：被邀请选择尺码与支付

### 核心用户故事

1. **作为用户，我能在T恤各面（Front/Back/Sleeve）添加并编辑元素**
2. **作为团队管理员，我能录入或收集团队的名字与号码，并让系统按尺码与数量自动计价**
3. **我能选择"Buy & Ship"并配置配送、数量、支付方式，或选择"Start a Fundraiser"创建筹款**
4. **我能保存或分享设计，并在购物车中统一查看与结算**

---

## 3. 信息架构与全局布局

### 布局结构

- **顶部栏**：
  - 品牌Logo
  - 面包屑（My Designs > [Design Name]）
  - 客服入口（Talk to a Real Person、Chat Now）
  - Sign In

- **左侧功能栏**：
  - Upload
  - Add Text
  - Add Art
  - Product Colors
  - Add Names（点击打开对应面板）

- **中央**：
  - 画布（默认Front），显示产品预览与可编辑对象

- **右侧视图**：
  - Front / Back / Sleeve Design / Zoom

- **左上浮层**：
  - Undo / Redo

- **底部栏**：
  - Add Products
  - 当前产品卡（产品名 + Change Product + Change Color）
  - Save | Share
  - Get Price

---

## 4. 左侧功能栏模块

### 4.1 Upload（上传）

#### 面板功能
- **Choose File To Upload**
  - Browse Your Computer：调起系统文件选择；成功后在当前面插入"上传对象"并选中
  - Drag & Drop Anywhere：全画布拖拽上传
  - 提示：推荐≥300DPI、最大20MB；登录可显示"Recent Uploads"并复用
  - Recent Uploads：列表缩略图，点击插入到画布
  - 失败反馈：格式/大小不合规，显示错误toast与帮助链接

#### 对象编辑：Edit Upload
- Upload Size（Width × Height + 比例锁）：数值或拖拽角点；锁定保持等比
- Edit Colors：支持的分色槽位（矢量或可分色素材）
- Make One Color：开关，将多色转单色
- Remove Background Color：开关，移除指定背景色（可扩展Eyedropper与阈值）
- Center / Layering / Flip / Duplicate / Crop / Rotation / Reset To Original / Save Design
- 体验评分：底部"Rate our upload experience"

### 4.2 Add Text（添加文字）

#### Add Text面板
- 输入框：Enter text here；为空时"Add To Design"禁用
- Add To Design：创建文字对象、选中并打开"Edit Text"面板

#### Edit Text面板
- Change Font（打开字体选择器）
- Edit Color（取色器/色板）
- Rotation（滑杆或数值）
- Outline（轮廓类型与颜色）
- Text Shape（直线/弧形/圆形/波浪等）
- Text Size（字号）
- Text Alignment（左/中/右）
- Center / Layering / Duplicate
- 超出安全区时警示并引导调整

### 4.3 Add Art（素材库）

#### Artwork Categories面板
- Search For Artwork
- 分类网格：Emojis、Shapes & Symbols、Sports & Games、Letters & Numbers、Animals、Mascots、Nature、America、Parties & Events、Military、Occupations、Colleges、Music、Transportation、Greek Life、School、Charity、People…

#### 子分类（如Emojis）
- Animals、Food & Drink、Hands、Nature & Weather、Objects & Symbols、Smileys、View All

#### 素材列表
- 网格；点击生成艺术对象并打开Edit Art

#### Edit Art面板
- Center / Layering / Flip / Duplicate / Rotation
- Make One Color（开关）
- Edit Colors（多色槽位）
- Change Art（保留位置与尺寸替换素材）
- Art Size（Width × Height + 比例锁）
- Reset To Original / Save Design

### 4.4 Product Colors（产品颜色）

#### 面板：Choose Your Product Color
- Colors格子：点击即应用产品颜色
- Sizes Available in：显示该颜色支持的尺码（YS/YM/YL/S/M/L/XL/2XL/3XL/4XL）
- Pick another color：将同款添加为另一颜色的订单项

**注意**：切换颜色不影响画布对象；若与已选尺码不匹配会触发校验（见第11章）

### 4.5 Add Names（Names & Numbers）

#### 面板：Names and Numbers（说明+按钮"Add Names and Numbers"）

#### Tools面板（Names and Numbers Tools）
- **Step 1**：
  - Add Names（复选框）
  - Add Numbers（复选框）
  - Side（Front/Back，默认Back）
  - Height（2in/8in等）
  - Color（如Black）
- **Step 2**：
  - Enter Names/Numbers（进入My List）
- 价格说明文案：Names $5.50 each item、Numbers $3.50 each item

#### My List弹窗
- 列：Name、#（号码）、Size（下拉）
- + Add More：新增行
- Manage List：批量（扩展CSV）
- Totals与Sizes统计
- Done：保存返回

#### My Quantities弹窗
- Items receiving names or numbers [size][qty]
- 复选：I have items that are not receiving names or numbers
- Totals与Sizes
- Done：确认

---

## 5. 画布视图与对象编辑

### 右侧按钮
- Front / Back / Sleeve Design（切换当前面；各面独立图层）
- Zoom：放大/缩小/拖拽/重置视图

### 对象选中
- 右上角X：删除（支持Undo恢复）
- 角点缩放（比例锁逻辑与面板一致）
- 旋转控制（角点或滑杆）
- 拖拽移动；吸附对齐线；显示打印安全区边界

### Layering面板
- Bring to Front、Send to Back、Forward、Backward
- 支持列表拖拽顺序

### Center
- 居中（水平+垂直）
- 若超出安全区提示

---

## 6. 字体选择器与素材库浏览

### 字体选择器分类
- Popular、Modern、Serif、Sans Serif、College & Sports、Script+Cursive、Brush、Retro、Bold、Thin、Outline、Comic、Handwritten、Bubble、Curly、Just Added、Recently Used

### 搜索
- 实时过滤；点击应用到选中文本对象

### 素材库
- 分类导航、搜索、分页/懒加载

---

## 7. Names & Numbers流程与联动

- Step 1设置的Side/Height/Color用于生成N&N占位区（系统规范位置）
- My List与My Quantities与产品颜色/尺码绑定校验：
  - 不匹配时在保存、报价与购物车处给出提醒
- 报价与购物车摘要：显示"X Name, Y Number"与分布说明

---

## 8. 报价与下单流程（Get Price）

### 8.1 起始路径选择（Get Price起始页）

#### 卡片
- **Buy & Ship**（默认选中）：进入下单路径
- **Start a Fundraiser**：进入筹款路径（复用后端，本文不详述）

- **Continue**：进入"Ordering Options"

### 8.2 Ordering Options（选择订单选项）

#### 组1：Shipping
- Ship to single address
- Ship to multiple addresses（存在最小订单约束，购物车页<6件置灰）

#### 组2：Sizes and Quantities
- I know the sizes I need（进入Quantity尺码网格）
- Invite my group to choose their sizes（进入预估总量页，并后续通过链接收集）

#### 组3：Payment
- I will pay for the entire order
- Invite my group to pay for their order（与"多地址"可组合）

- **Continue to Sizes**：进入后续页

#### 状态联动与文案
- 选择"Invite my group …"时，"I know the sizes …"置灰
- 显示预计送达日期提示（根据地区与配送策略）

### 8.3 数量与样式（Quantity）

#### 情况A：I know the sizes I need
- 当前产品卡（显示颜色、View Sizing Guide）
- YOUTH与ADULT尺码网格：YS/YM/YL/XS/S/M/L/XL/2XL/3XL/4XL/5XL，输入数量
- 加价文案：如 +$2.50 / +$3.50 / +$4.50 / +$5.50（随尺码）
- + Add Women's：添加女性版型网格
- Buy more, save more推荐区：
  - WOMEN'S / RECOMMENDED / SAME ITEM, DIFFERENT COLOR 卡片，按钮"+ Add style / + Add another color"
- Browse more styles：打开更多样式选择
- Total Quantity：汇总
- Continue：进入报价结果页

#### 情况B：Invite my group to choose their sizes
- 预估总量页：
  - 计数器（+-与输入框），≥1时"See Pricing"启用
  - Change options侧栏可返回修改
  - See Pricing：进入报价结果页（按估值计价）

### 8.4 报价结果页（Order Options）

#### 价格
- 每件价与总价（如 $32.47 each / $97.40 total）

#### 统计徽章
- 颜色数、设计区域数、Names & Numbers摘要、商品总数

#### 促销文案
- BUY MORE, SAVE MORE 阶梯价提示（10件/20件等）

#### 配送文案
- FREE Standard Delivery（预计到达日期，Edit）
- Faster delivery（Rush/Super Rush文案，实际选择在Cart/Checkout）

#### YOUR ORDER列表
- 产品项、颜色、数量与尺码分布，Edit链接

#### 底部按钮
- Change your order options（返回修改）
- Save & Continue Designing（保存并返回设计器）
- Add to Cart（加入购物车）

#### 校验
- 数量为0或缺尺码禁用Add to Cart
- N&N与尺码不一致时提示（可继续）

### 8.5 内容合规确认（Content Check）

#### 文案
- 继续下单即确认上传图符合内容标准与版权要求

#### 按钮
- Edit Design（返回编辑器）
- Agree & Continue（继续到Add to Cart或Cart）

#### 触发
- 首次含上传图下单或更换上传图后的首次下单

### 8.6 加入购物车与购物车页（My Cart）

#### 加车成功页
- Added to Cart摘要（产品名、颜色、Qty与尺码）
- Review Cart & Check Out（进入Cart）
- Want to add more?（Browse the catalog / Start from this design / Start a new design）

#### 购物车（My Cart）

##### 左列订单项
- 设计名（Edit Design）
- 产品项卡：产品名、颜色、Printing、Qty与单价（显示原价与volume discount后价）、尺码分布
- Edit Sizes：回到Quantity编辑
- Names & Numbers摘要与提醒（例如"3 items total, 1 with Name, 1 with Number"）

##### Delivery Options
- Get it by [日期]（Standard - FREE）
- Rush（+15%）、Super Rush（+30%）
- Ship to multiple addresses（<6件禁用，并显示"Only available for orders of 6 or more items"）

##### Order Summary
- Subtotal
- Volume Discount
- 折扣码（自动应用TENOFF或手动Edit discount code）
- Delivery（FREE或加急费）
- Tax（结账计算）
- Total
- Proceed to Checkout（进入结账）

---

## 9. 底部操作区与工作流

- **Add Products**：打开产品选择器，添加或替换当前产品；添加后在Quantity/Order Options/Cart显示为多产品订单

- **产品卡**：
  - Change Product：打开选择器替换当前产品
  - Change Color：打开Product Colors面板

- **Save | Share**：
  - Save：保存设计（未登录提醒登录或提供临时链接）
  - Share：生成只读/可评论链接，支持复制

- **Get Price**：进入报价主流程

---

## 10. 撤销与重做、分层与对齐、安全区

- **Undo/Redo**：记录对象创建/删除、属性变化（位置/尺寸/颜色/旋转/文本）、层级变更；视图切换不记录

- **Layering**：层级操作与列表拖拽

- **Center**：居中定位

- **安全区**：打印安全边界展示；越界警示与阻断提交

---

## 11. 校验规则与边界条件

### 上传
- >20MB或不支持格式：错误提示
- 分辨率不足：质量警告，允许继续但在Content Check再次提醒

### 产品颜色与尺码
- Quantity页输入不可用尺码数量时错误提示；切换颜色后与已有尺码冲突时给出修正选项（保留并标注不可用/自动过滤/取消切换）

### Names & Numbers一致性
- My List与Quantity尺码匹配校验，在Order Options与Cart给出提醒

### 多地址配送限制
- 购物车总件数<6，Ship to multiple addresses禁用并显示说明

### 报价完整性
- 无数量或为0时禁用Add to Cart；Get Price流程需提示完善信息

### 促销与价格
- BUY MORE, SAVE MORE、加急费、尺码加价、N&N加价、折扣码由后端配置；前端动态呈现

### 会话持久
- 自动保存草稿（扩展）；刷新恢复

---

## 12. 无障碍（A11y）、性能与可观测性

### 无障碍
- 所有按钮与输入有aria-label与明确焦点样式
- 键盘导航：Tab、Enter、Esc；列表上下箭头；颜色格子方向键

### 性能
- 画布使用Canvas/SVG混合；素材/字体懒加载与缓存；撤销栈内存优化

### 可观测性
- 埋点：打开/点击/上传成功/失败/进入报价/加车/修改Cart/结账
- 错误日志：上传、网络、报价服务异常

---

## 13. 关键按钮与交互清单（速查）

### Upload
- Browse / Drag & Drop / Recent Uploads
- Edit Upload里的 Center / Layering / Flip / Duplicate / Crop / Rotation / Reset / Save / Make One Color / Remove Background

### Add Text
- Add To Design
- Edit Text里的 Change Font / Edit Color / Rotation / Outline / Text Shape / Text Size / Text Alignment / Center / Layering / Duplicate

### Add Art
- 分类/子分类卡片、素材卡
- Edit Art里的 Center / Layering / Flip / Duplicate / Rotation / Make One Color / Edit Colors / Change Art / Art Size / Reset / Save

### Product Colors
- 颜色格子应用
- Pick another color添加变体

### Add Names
- Add Names and Numbers
- Tools（Add Names/Numbers/Side/Height/Color；Enter Names/Numbers）→ My List（Name/#/Size、Add More、Manage List、Done）→ My Quantities（size+qty、额外不带N&N、Done）

### 视图与缩放
- Front / Back / Sleeve Design
- Zoom

### Get Price
- 起始页：Buy & Ship / Start a Fundraiser → Continue
- Ordering Options：Shipping/ Sizes & Quantities / Payment → Continue to Sizes
- 预估总量页：+-/输入 → See Pricing
- Quantity：尺码网格输入、+ Add Women's、+ Add style、+ Add another color、Browse more styles、Total Quantity、Continue
- Order Options：Change your order options / Save & Continue Designing / Add to Cart

### 内容合规
- Edit Design / Agree & Continue

### 加车成功页
- Review Cart & Check Out / Browse the catalog / Start from this design / Start a new design

### 购物车
- Delivery Options（Standard/Rush/Super Rush、多地址<6禁用）、Edit Sizes、Edit discount code、Proceed to Checkout

---

## 14. 里程碑与验收建议

### M1 设计器基础版
- Upload、Add Text、Add Art、视图切换、Zoom、Undo/Redo、Layering、Center、安全区；Product Colors；Save/Share
- **验收**：对象编辑与安全区校验；上传≤20MB；字体与素材选择器可用

### M2 Names & Numbers与数量
- Tools、My List、My Quantities；Quantity尺码网格与推荐样式
- **验收**：尺码与颜色一致性校验；Totals统计正确；Add Women's与Add style生效

### M3 报价与购物车
- Get Price路径、Ordering Options、Order Options报价、Content Check、Add to Cart、Cart（配送选项、折扣、汇总）
- **验收**：价格与促销阶梯正确；<6件多地址禁用；Rush/Super Rush费用展示；折扣码应用与总价一致

### M4 稳定与体验
- 性能优化、A11y覆盖、埋点与错误日志、自动保存草稿
- **验收**：无障碍操作通过键盘完成；关键路径埋点齐全；异常处理完善

---

## 15. API 接口设计

### 15.1 设计保存与加载

#### 15.1.1 保存设计
```http
POST /api/design-lab/designs
Authorization: Bearer <token>
Content-Type: application/json

Request Body:
{
  "name": "My Design",
  "productId": "prod_123",
  "productColorId": "color_456",
  "canvasData": {
    "front": {
      "objects": [
        {
          "type": "text",
          "id": "text_1",
          "text": "Hello",
          "font": "Arial",
          "color": "#000000",
          "x": 100,
          "y": 100,
          "width": 200,
          "height": 50,
          "rotation": 0,
          "zIndex": 1
        },
        {
          "type": "image",
          "id": "img_1",
          "imageUrl": "https://storage.example.com/uploads/img_123.jpg",
          "x": 200,
          "y": 200,
          "width": 300,
          "height": 300,
          "rotation": 0,
          "zIndex": 2
        },
        {
          "type": "art",
          "id": "art_1",
          "artId": "art_789",
          "x": 150,
          "y": 150,
          "width": 100,
          "height": 100,
          "rotation": 0,
          "zIndex": 3
        }
      ],
      "backgroundImageUrl": "https://storage.example.com/products/tshirt_front.jpg"
    },
    "back": { /* 类似结构 */ },
    "sleeve": { /* 类似结构 */ }
  },
  "namesAndNumbers": {
    "enabled": true,
    "side": "back",
    "height": "2in",
    "color": "#000000",
    "names": [
      { "name": "John", "number": "23", "size": "M" },
      { "name": "Jane", "number": "45", "size": "S" }
    ],
    "quantities": {
      "M": 1,
      "S": 1
    }
  },
  "thumbnailUrl": "https://storage.example.com/thumbnails/design_123.jpg"
}

Response:
{
  "success": true,
  "data": {
    "id": "design_123",
    "name": "My Design",
    "createdAt": "2025-12-07T19:40:00Z",
    "updatedAt": "2025-12-07T19:40:00Z",
    "shareUrl": "https://example.com/design-lab?designId=design_123&shareToken=abc123"
  }
}
```

#### 15.1.2 加载设计
```http
GET /api/design-lab/designs/:designId
Authorization: Bearer <token> (可选，公开分享链接不需要)

Response:
{
  "success": true,
  "data": {
    "id": "design_123",
    "name": "My Design",
    "productId": "prod_123",
    "productColorId": "color_456",
    "canvasData": { /* 同保存时的结构 */ },
    "namesAndNumbers": { /* 同保存时的结构 */ },
    "createdAt": "2025-12-07T19:40:00Z",
    "updatedAt": "2025-12-07T19:40:00Z",
    "isPublic": false,
    "shareToken": "abc123"
  }
}
```

#### 15.1.3 获取用户设计列表
```http
GET /api/design-lab/designs?page=1&limit=20
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "designs": [
      {
        "id": "design_123",
        "name": "My Design",
        "thumbnailUrl": "https://storage.example.com/thumbnails/design_123.jpg",
        "productName": "Classic T-Shirt",
        "productColorName": "Navy Blue",
        "createdAt": "2025-12-07T19:40:00Z",
        "updatedAt": "2025-12-07T19:40:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

#### 15.1.4 删除设计
```http
DELETE /api/design-lab/designs/:designId
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Design deleted successfully"
}
```

### 15.2 图片上传

#### 15.2.1 上传图片
```http
POST /api/design-lab/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form Data:
- file: <binary>
- designId: "design_123" (可选，用于关联到设计)

Response:
{
  "success": true,
  "data": {
    "id": "upload_456",
    "url": "https://storage.example.com/uploads/img_789.jpg",
    "thumbnailUrl": "https://storage.example.com/uploads/thumbnails/img_789.jpg",
    "width": 1920,
    "height": 1080,
    "size": 524288,
    "mimeType": "image/jpeg",
    "uploadedAt": "2025-12-07T19:40:00Z"
  }
}
```

#### 15.2.2 获取用户最近上传的图片
```http
GET /api/design-lab/uploads?limit=20
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    {
      "id": "upload_456",
      "url": "https://storage.example.com/uploads/img_789.jpg",
      "thumbnailUrl": "https://storage.example.com/uploads/thumbnails/img_789.jpg",
      "uploadedAt": "2025-12-07T19:40:00Z"
    }
  ]
}
```

### 15.3 产品与颜色

#### 15.3.1 获取产品列表（用于产品选择器）
```http
GET /api/products?category=tshirt&available=true

Response:
{
  "success": true,
  "data": [
    {
      "id": "prod_123",
      "name": "Classic T-Shirt",
      "description": "100% Cotton",
      "basePrice": 19.99,
      "imageUrl": "https://storage.example.com/products/tshirt.jpg",
      "availableColors": [
        {
          "id": "color_456",
          "name": "Navy Blue",
          "hex": "#1B365D",
          "imageUrl": "https://storage.example.com/products/tshirt_navy.jpg",
          "availableSizes": ["S", "M", "L", "XL", "2XL"]
        }
      ],
      "availableSizes": ["YS", "YM", "YL", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"]
    }
  ]
}
```

#### 15.3.2 获取产品详情（从商品详情页进入 Design Lab）
```http
GET /api/products/:productId

Response:
{
  "success": true,
  "data": {
    "id": "prod_123",
    "name": "Classic T-Shirt",
    "description": "100% Cotton",
    "basePrice": 19.99,
    "imageUrl": "https://storage.example.com/products/tshirt.jpg",
    "availableColors": [ /* 同产品列表 */ ],
    "availableSizes": [ /* 同产品列表 */ ],
    "designLabEnabled": true,
    "defaultColorId": "color_456"
  }
}
```

#### 15.3.3 获取产品颜色详情
```http
GET /api/products/:productId/colors/:colorId

Response:
{
  "success": true,
  "data": {
    "id": "color_456",
    "name": "Navy Blue",
    "hex": "#1B365D",
    "imageUrl": "https://storage.example.com/products/tshirt_navy.jpg",
    "availableSizes": ["S", "M", "L", "XL", "2XL"],
    "sizePricing": {
      "S": { "basePrice": 19.99, "surcharge": 0 },
      "M": { "basePrice": 19.99, "surcharge": 0 },
      "L": { "basePrice": 19.99, "surcharge": 2.50 },
      "XL": { "basePrice": 19.99, "surcharge": 3.50 },
      "2XL": { "basePrice": 19.99, "surcharge": 4.50 }
    }
  }
}
```

### 15.4 素材库

#### 15.4.1 获取素材分类
```http
GET /api/design-lab/artwork/categories

Response:
{
  "success": true,
  "data": [
    {
      "id": "cat_1",
      "name": "Emojis",
      "icon": "😀",
      "subcategories": [
        { "id": "subcat_1", "name": "Animals" },
        { "id": "subcat_2", "name": "Food & Drink" }
      ]
    }
  ]
}
```

#### 15.4.2 获取素材列表
```http
GET /api/design-lab/artwork?categoryId=cat_1&subcategoryId=subcat_1&page=1&limit=50&search=dog

Response:
{
  "success": true,
  "data": {
    "artworks": [
      {
        "id": "art_789",
        "name": "Dog Emoji",
        "imageUrl": "https://storage.example.com/artwork/dog.png",
        "thumbnailUrl": "https://storage.example.com/artwork/thumbnails/dog.png",
        "categoryId": "cat_1",
        "subcategoryId": "subcat_1",
        "isColorable": true,
        "colorSlots": ["fill", "outline"]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 200,
      "totalPages": 4
    }
  }
}
```

### 15.5 字体

#### 15.5.1 获取字体列表
```http
GET /api/design-lab/fonts?category=popular&search=arial

Response:
{
  "success": true,
  "data": [
    {
      "id": "font_1",
      "name": "Arial",
      "family": "Arial, sans-serif",
      "category": "Sans Serif",
      "weight": "400",
      "style": "normal",
      "previewUrl": "https://storage.example.com/fonts/arial_preview.png"
    }
  ]
}
```

### 15.6 报价计算

#### 15.6.1 计算报价
```http
POST /api/design-lab/pricing/calculate
Authorization: Bearer <token> (可选)
Content-Type: application/json

Request Body:
{
  "designId": "design_123",
  "productId": "prod_123",
  "productColorId": "color_456",
  "quantities": {
    "S": 2,
    "M": 5,
    "L": 3,
    "XL": 1
  },
  "namesAndNumbers": {
    "namesCount": 5,
    "numbersCount": 3
  },
  "shippingOption": "standard", // standard, rush, superRush
  "shippingAddress": {
    "country": "US",
    "state": "CA",
    "zipCode": "90210"
  },
  "discountCode": "TENOFF" // 可选
}

Response:
{
  "success": true,
  "data": {
    "basePrice": 19.99,
    "sizeSurcharges": {
      "S": 0,
      "M": 0,
      "L": 2.50,
      "XL": 3.50
    },
    "namesAndNumbersPrice": {
      "names": 27.50, // 5 * $5.50
      "numbers": 10.50, // 3 * $3.50
      "total": 38.00
    },
    "subtotal": 219.89, // (2+5+3+1) * $19.99 + size surcharges + N&N
    "volumeDiscount": {
      "tier": "10+",
      "discountPercent": 10,
      "discountAmount": 21.99
    },
    "discountCode": {
      "code": "TENOFF",
      "discountAmount": 19.79
    },
    "shipping": {
      "option": "standard",
      "cost": 0,
      "estimatedDelivery": "2025-12-15"
    },
    "tax": {
      "rate": 0.08,
      "amount": 14.25
    },
    "total": 192.36,
    "breakdown": {
      "items": [
        {
          "size": "S",
          "quantity": 2,
          "unitPrice": 19.99,
          "totalPrice": 39.98
        }
        // ... 其他尺码
      ],
      "namesAndNumbers": {
        "names": 27.50,
        "numbers": 10.50
      },
      "volumeDiscount": -21.99,
      "discountCode": -19.79,
      "shipping": 0,
      "tax": 14.25
    }
  }
}
```

### 15.7 加入购物车

#### 15.7.1 将设计加入购物车
```http
POST /api/cart/items
Authorization: Bearer <token>
Content-Type: application/json

Request Body:
{
  "designId": "design_123",
  "productId": "prod_123",
  "productColorId": "color_456",
  "quantities": {
    "S": 2,
    "M": 5,
    "L": 3,
    "XL": 1
  },
  "namesAndNumbers": {
    "names": [
      { "name": "John", "number": "23", "size": "M" },
      { "name": "Jane", "number": "45", "size": "S" }
    ],
    "quantities": {
      "M": 1,
      "S": 1
    }
  },
  "shippingOption": "standard",
  "unitPrice": 19.99,
  "totalPrice": 192.36
}

Response:
{
  "success": true,
  "data": {
    "cartItemId": "cart_item_789",
    "designId": "design_123",
    "productId": "prod_123",
    "productColorId": "color_456",
    "quantities": { /* 同请求 */ },
    "namesAndNumbers": { /* 同请求 */ },
    "unitPrice": 19.99,
    "totalPrice": 192.36,
    "addedAt": "2025-12-07T19:40:00Z"
  }
}
```

#### 15.7.2 更新购物车项（编辑尺码）
```http
PATCH /api/cart/items/:cartItemId
Authorization: Bearer <token>
Content-Type: application/json

Request Body:
{
  "quantities": {
    "S": 3,
    "M": 6
  }
}

Response:
{
  "success": true,
  "data": {
    "cartItemId": "cart_item_789",
    "quantities": { /* 更新后的数量 */ },
    "totalPrice": 215.88,
    "updatedAt": "2025-12-07T19:40:00Z"
  }
}
```

#### 15.7.3 获取购物车（包含 Design Lab 项）
```http
GET /api/cart
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "cart_item_789",
        "type": "design_lab",
        "designId": "design_123",
        "designName": "My Design",
        "designThumbnailUrl": "https://storage.example.com/thumbnails/design_123.jpg",
        "productId": "prod_123",
        "productName": "Classic T-Shirt",
        "productColorId": "color_456",
        "productColorName": "Navy Blue",
        "quantities": {
          "S": 2,
          "M": 5,
          "L": 3,
          "XL": 1
        },
        "namesAndNumbers": {
          "namesCount": 5,
          "numbersCount": 3,
          "summary": "5 names, 3 numbers"
        },
        "unitPrice": 19.99,
        "totalPrice": 192.36,
        "addedAt": "2025-12-07T19:40:00Z"
      },
      {
        "id": "cart_item_790",
        "type": "regular",
        "productId": "prod_456",
        "productName": "Hoodie",
        "quantity": 1,
        "unitPrice": 39.99,
        "totalPrice": 39.99,
        "addedAt": "2025-12-07T19:35:00Z"
      }
    ],
    "summary": {
      "subtotal": 232.35,
      "volumeDiscount": -23.24,
      "discountCode": {
        "code": "TENOFF",
        "discountAmount": -20.91
      },
      "shipping": 0,
      "tax": 15.06,
      "total": 203.26
    }
  }
}
```

### 15.8 内容合规检查

#### 15.8.1 检查上传图片内容
```http
POST /api/design-lab/content-check
Authorization: Bearer <token>
Content-Type: application/json

Request Body:
{
  "imageUrl": "https://storage.example.com/uploads/img_789.jpg",
  "designId": "design_123"
}

Response:
{
  "success": true,
  "data": {
    "isCompliant": true,
    "warnings": [],
    "requiresConfirmation": false
  }
}

// 或需要确认的情况
{
  "success": true,
  "data": {
    "isCompliant": true,
    "warnings": [
      "Low resolution detected. Recommended: 300 DPI or higher."
    ],
    "requiresConfirmation": true
  }
}
```

### 15.9 上传体验评分

#### 15.9.1 提交上传体验评分
```http
POST /api/design-lab/upload-rating
Authorization: Bearer <token>
Content-Type: application/json

Request Body:
{
  "uploadId": "upload_456",
  "rating": 5, // 1-5
  "comment": "Very easy to use!"
}

Response:
{
  "success": true,
  "message": "Rating submitted successfully"
}
```

---

## 16. 数据库设计

### 16.1 设计表（design_lab_designs）

```sql
CREATE TABLE design_lab_designs (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  product_id VARCHAR(255) REFERENCES products(id),
  product_color_id VARCHAR(255),
  canvas_data JSONB NOT NULL, -- 存储完整的画布数据（front/back/sleeve）
  names_and_numbers JSONB, -- 存储 N&N 配置
  thumbnail_url TEXT,
  share_token VARCHAR(255) UNIQUE,
  is_public BOOLEAN DEFAULT false,
  is_template BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_design_lab_designs_user_id ON design_lab_designs(user_id);
CREATE INDEX idx_design_lab_designs_share_token ON design_lab_designs(share_token);
CREATE INDEX idx_design_lab_designs_created_at ON design_lab_designs(created_at DESC);
```

**canvas_data JSONB 结构示例**：
```json
{
  "front": {
    "objects": [
      {
        "type": "text",
        "id": "text_1",
        "text": "Hello",
        "font": "Arial",
        "color": "#000000",
        "x": 100,
        "y": 100,
        "width": 200,
        "height": 50,
        "rotation": 0,
        "zIndex": 1
      }
    ],
    "backgroundImageUrl": "https://..."
  },
  "back": { /* 类似 */ },
  "sleeve": { /* 类似 */ }
}
```

**names_and_numbers JSONB 结构示例**：
```json
{
  "enabled": true,
  "side": "back",
  "height": "2in",
  "color": "#000000",
  "names": [
    { "name": "John", "number": "23", "size": "M" }
  ],
  "quantities": {
    "M": 1,
    "S": 1
  }
}
```

### 16.2 上传图片表（design_lab_uploads）

```sql
CREATE TABLE design_lab_uploads (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  design_id VARCHAR(255) REFERENCES design_lab_designs(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  width INTEGER,
  height INTEGER,
  size_bytes BIGINT,
  mime_type VARCHAR(100),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_design_lab_uploads_user_id ON design_lab_uploads(user_id);
CREATE INDEX idx_design_lab_uploads_design_id ON design_lab_uploads(design_id);
CREATE INDEX idx_design_lab_uploads_uploaded_at ON design_lab_uploads(uploaded_at DESC);
```

### 16.3 素材库表（design_lab_artwork）

```sql
CREATE TABLE design_lab_artwork (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category_id VARCHAR(255) REFERENCES design_lab_artwork_categories(id),
  subcategory_id VARCHAR(255) REFERENCES design_lab_artwork_subcategories(id),
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  is_colorable BOOLEAN DEFAULT false,
  color_slots JSONB, -- ["fill", "outline"]
  tags TEXT[],
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_design_lab_artwork_category ON design_lab_artwork(category_id);
CREATE INDEX idx_design_lab_artwork_subcategory ON design_lab_artwork(subcategory_id);
CREATE INDEX idx_design_lab_artwork_tags ON design_lab_artwork USING GIN(tags);
```

### 16.4 素材分类表（design_lab_artwork_categories）

```sql
CREATE TABLE design_lab_artwork_categories (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  icon VARCHAR(50),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE design_lab_artwork_subcategories (
  id VARCHAR(255) PRIMARY KEY,
  category_id VARCHAR(255) REFERENCES design_lab_artwork_categories(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 16.5 字体表（design_lab_fonts）

```sql
CREATE TABLE design_lab_fonts (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  family VARCHAR(255) NOT NULL,
  category VARCHAR(100), -- Popular, Modern, Serif, etc.
  weight VARCHAR(50),
  style VARCHAR(50),
  preview_url TEXT,
  font_file_url TEXT, -- 如果需要自定义字体文件
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_design_lab_fonts_category ON design_lab_fonts(category);
```

### 16.6 上传体验评分表（design_lab_upload_ratings）

```sql
CREATE TABLE design_lab_upload_ratings (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  upload_id VARCHAR(255) REFERENCES design_lab_uploads(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_design_lab_upload_ratings_user_id ON design_lab_upload_ratings(user_id);
CREATE INDEX idx_design_lab_upload_ratings_upload_id ON design_lab_upload_ratings(upload_id);
```

### 16.7 购物车项扩展（cart_items）

**扩展现有的 cart_items 表**：
```sql
-- 如果 cart_items 表已存在，添加以下字段
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'regular'; -- 'regular' | 'design_lab'
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS design_id VARCHAR(255) REFERENCES design_lab_designs(id) ON DELETE SET NULL;
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS design_data JSONB; -- 存储设计的完整数据（用于编辑）
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS names_and_numbers JSONB; -- 存储 N&N 数据

CREATE INDEX IF NOT EXISTS idx_cart_items_design_id ON cart_items(design_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_type ON cart_items(type);
```

---

## 17. 与商品详情的集成

### 17.1 从商品详情页进入 Design Lab

#### 17.1.1 前端路由
```typescript
// 商品详情页
/product/:productId

// 点击 "Customize" 按钮后
/design-lab?productId=prod_123&colorId=color_456
```

#### 17.1.2 前端逻辑
```typescript
// apps/web/src/app/design-lab/page.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { productsApi } from '@/lib/api';

export default function DesignLabPage() {
  const searchParams = useSearchParams();
  const productId = searchParams.get('productId');
  const colorId = searchParams.get('colorId');
  
  const [product, setProduct] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  
  useEffect(() => {
    if (productId) {
      // 从商品详情页进入，加载产品信息
      productsApi.getProduct(productId).then((data) => {
        setProduct(data);
        // 如果指定了颜色，设置为默认颜色
        if (colorId) {
          const color = data.availableColors.find(c => c.id === colorId);
          setSelectedColor(color || data.availableColors[0]);
        } else {
          setSelectedColor(data.availableColors[0]);
        }
      });
    }
  }, [productId, colorId]);
  
  // ... 其他逻辑
}
```

#### 17.1.3 API 调用流程
1. **前端请求产品详情**：
   ```typescript
   GET /api/products/:productId
   ```
2. **后端返回产品信息**（包含可用颜色、尺码、基础价格）
3. **前端初始化 Design Lab**：
   - 设置默认产品
   - 设置默认颜色
   - 加载产品底图（根据颜色）
   - 初始化画布

### 17.2 在 Design Lab 中切换产品

#### 17.2.1 前端逻辑
```typescript
// 点击 "Add Products" 或 "Change Product"
const handleChangeProduct = async (newProductId: string) => {
  // 1. 加载新产品信息
  const newProduct = await productsApi.getProduct(newProductId);
  
  // 2. 检查当前设计是否兼容新产品
  // （例如：如果当前设计有特定尺寸的对象，新产品可能不支持）
  
  // 3. 如果兼容，更新产品
  setProduct(newProduct);
  setSelectedColor(newProduct.availableColors[0]);
  
  // 4. 更新画布背景图
  updateCanvasBackground(newProduct.defaultColorId);
  
  // 5. 保存设计（自动保存）
  await saveDesign();
};
```

#### 17.2.2 API 调用
```typescript
// 获取产品列表（用于产品选择器）
GET /api/products?category=tshirt&available=true

// 获取新产品详情
GET /api/products/:newProductId

// 更新设计（保存产品变更）
PATCH /api/design-lab/designs/:designId
{
  "productId": "new_product_id",
  "productColorId": "new_color_id"
}
```

### 17.3 产品颜色切换

#### 17.3.1 前端逻辑
```typescript
const handleChangeColor = async (newColorId: string) => {
  // 1. 获取新颜色信息
  const colorInfo = await productsApi.getProductColor(productId, newColorId);
  
  // 2. 检查尺码兼容性
  const currentSizes = getCurrentSelectedSizes(); // 从 Quantity 页面获取
  const availableSizes = colorInfo.availableSizes;
  const incompatibleSizes = currentSizes.filter(size => !availableSizes.includes(size));
  
  // 3. 如果有不兼容的尺码，提示用户
  if (incompatibleSizes.length > 0) {
    showIncompatibleSizeWarning(incompatibleSizes);
    // 用户可以选择：保留并标注不可用 / 自动过滤 / 取消切换
  }
  
  // 4. 更新颜色
  setSelectedColor(colorInfo);
  
  // 5. 更新画布背景图
  updateCanvasBackground(colorInfo.imageUrl);
  
  // 6. 保存设计
  await saveDesign();
};
```

#### 17.3.2 API 调用
```typescript
// 获取产品颜色详情
GET /api/products/:productId/colors/:colorId

// 更新设计颜色
PATCH /api/design-lab/designs/:designId
{
  "productColorId": "new_color_id"
}
```

---

## 18. 与购物车的集成

### 18.1 从 Design Lab 加入购物车

#### 18.1.1 前端流程
```typescript
// 在报价结果页点击 "Add to Cart"
const handleAddToCart = async () => {
  // 1. 验证数据完整性
  if (!validateQuantities() || !validateNamesAndNumbers()) {
    showError('Please complete all required fields');
    return;
  }
  
  // 2. 计算最终价格（如果需要重新计算）
  const pricing = await calculatePricing({
    designId: currentDesign.id,
    productId: product.id,
    productColorId: selectedColor.id,
    quantities: quantities,
    namesAndNumbers: namesAndNumbers,
    shippingOption: shippingOption
  });
  
  // 3. 加入购物车
  const cartItem = await cartApi.addItem({
    designId: currentDesign.id,
    productId: product.id,
    productColorId: selectedColor.id,
    quantities: quantities,
    namesAndNumbers: namesAndNumbers,
    shippingOption: shippingOption,
    unitPrice: pricing.data.unitPrice,
    totalPrice: pricing.data.total
  });
  
  // 4. 跳转到加车成功页
  router.push(`/cart/added?cartItemId=${cartItem.id}`);
};
```

#### 18.1.2 API 调用
```typescript
// 1. 计算报价（可选，如果前端已计算）
POST /api/design-lab/pricing/calculate

// 2. 加入购物车
POST /api/cart/items
{
  "designId": "design_123",
  "productId": "prod_123",
  "productColorId": "color_456",
  "quantities": { "S": 2, "M": 5 },
  "namesAndNumbers": { /* ... */ },
  "shippingOption": "standard",
  "unitPrice": 19.99,
  "totalPrice": 192.36
}
```

### 18.2 购物车中显示 Design Lab 项

#### 18.2.1 前端显示
```typescript
// apps/web/src/app/cart/page.tsx
const CartPage = () => {
  const { data: cart } = useSWR('/api/cart', cartApi.getCart);
  
  return (
    <div>
      {cart.items.map(item => {
        if (item.type === 'design_lab') {
          return (
            <DesignLabCartItem
              key={item.id}
              item={item}
              onEditDesign={() => router.push(`/design-lab?designId=${item.designId}`)}
              onEditSizes={() => router.push(`/design-lab/quantity?designId=${item.designId}`)}
            />
          );
        } else {
          return <RegularCartItem key={item.id} item={item} />;
        }
      })}
    </div>
  );
};
```

#### 18.2.2 后端逻辑
```javascript
// backend/src/controllers/cartController.js
exports.getCart = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // 获取购物车项
    const cartItems = await prisma.cartItem.findMany({
      where: { userId, deletedAt: null },
      include: {
        // 如果是 Design Lab 项，关联设计数据
        design: item.type === 'design_lab' ? {
          include: {
            product: true,
            productColor: true
          }
        } : undefined
      }
    });
    
    // 格式化返回数据
    const formattedItems = cartItems.map(item => {
      if (item.type === 'design_lab') {
        return {
          id: item.id,
          type: 'design_lab',
          designId: item.designId,
          designName: item.design.name,
          designThumbnailUrl: item.design.thumbnailUrl,
          productId: item.design.productId,
          productName: item.design.product.name,
          productColorId: item.design.productColorId,
          productColorName: item.design.productColor.name,
          quantities: item.quantities, // JSONB
          namesAndNumbers: item.namesAndNumbers, // JSONB
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          addedAt: item.createdAt
        };
      } else {
        // 常规商品项
        return { /* ... */ };
      }
    });
    
    // 计算汇总
    const summary = calculateCartSummary(formattedItems);
    
    res.json({
      success: true,
      data: {
        items: formattedItems,
        summary
      }
    });
  } catch (error) {
    next(error);
  }
};
```

### 18.3 从购物车编辑 Design Lab 项

#### 18.3.1 编辑设计
```typescript
// 点击 "Edit Design"
const handleEditDesign = () => {
  // 跳转到 Design Lab，加载设计
  router.push(`/design-lab?designId=${item.designId}&editMode=true`);
};

// 在 Design Lab 页面
useEffect(() => {
  if (editMode && designId) {
    // 加载设计
    loadDesign(designId);
    // 标记为编辑模式，保存时更新购物车项
    setEditMode(true);
  }
}, [editMode, designId]);
```

#### 18.3.2 编辑尺码
```typescript
// 点击 "Edit Sizes"
const handleEditSizes = () => {
  // 跳转到 Quantity 页面，预填充当前数量
  router.push(`/design-lab/quantity?designId=${item.designId}&cartItemId=${item.id}`);
};

// 在 Quantity 页面保存后
const handleSaveQuantities = async () => {
  // 更新购物车项
  await cartApi.updateItem(cartItemId, {
    quantities: newQuantities
  });
  
  // 重新计算价格
  const pricing = await calculatePricing({ /* ... */ });
  
  // 更新购物车项价格
  await cartApi.updateItem(cartItemId, {
    totalPrice: pricing.data.total
  });
  
  // 返回购物车
  router.push('/cart');
};
```

#### 18.3.3 API 调用
```typescript
// 更新购物车项
PATCH /api/cart/items/:cartItemId
{
  "quantities": { "S": 3, "M": 6 },
  "totalPrice": 215.88
}
```

### 18.4 购物车结算流程

#### 18.4.1 前端逻辑
```typescript
// 点击 "Proceed to Checkout"
const handleCheckout = () => {
  // 1. 验证购物车项
  const hasInvalidItems = cart.items.some(item => {
    if (item.type === 'design_lab') {
      // 验证 Design Lab 项的数据完整性
      return !item.quantities || Object.values(item.quantities).every(qty => qty === 0);
    }
    return false;
  });
  
  if (hasInvalidItems) {
    showError('Please complete all design lab items');
    return;
  }
  
  // 2. 跳转到结账页
  router.push('/checkout');
};
```

#### 18.4.2 后端逻辑
```javascript
// backend/src/controllers/checkoutController.js
exports.createCheckoutSession = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // 获取购物车
    const cart = await getCart(userId);
    
    // 验证 Design Lab 项
    for (const item of cart.items) {
      if (item.type === 'design_lab') {
        // 验证设计是否存在
        const design = await prisma.designLabDesign.findUnique({
          where: { id: item.designId }
        });
        
        if (!design) {
          throw new Error(`Design ${item.designId} not found`);
        }
        
        // 验证产品颜色是否仍然可用
        const color = await prisma.productColor.findUnique({
          where: { id: item.productColorId }
        });
        
        if (!color || !color.isActive) {
          throw new Error(`Product color ${item.productColorId} is no longer available`);
        }
        
        // 验证尺码兼容性
        const availableSizes = color.availableSizes;
        const requestedSizes = Object.keys(item.quantities);
        const incompatibleSizes = requestedSizes.filter(size => !availableSizes.includes(size));
        
        if (incompatibleSizes.length > 0) {
          throw new Error(`Sizes ${incompatibleSizes.join(', ')} are not available for this color`);
        }
      }
    }
    
    // 创建订单（包含 Design Lab 项）
    const order = await createOrderFromCart(cart);
    
    // 创建 Stripe Checkout Session
    const session = await createStripeCheckoutSession(order);
    
    res.json({
      success: true,
      data: { sessionId: session.id }
    });
  } catch (error) {
    next(error);
  }
};
```

---

## 19. 数据流图

### 19.1 设计保存流程
```
用户操作 → 前端状态更新 → 自动保存（防抖） → POST /api/design-lab/designs
  ↓
后端验证 → 存储到数据库 → 生成分享链接 → 返回设计ID
  ↓
前端更新本地状态 → 更新URL（可选）
```

### 19.2 报价计算流程
```
用户点击 Get Price → 收集设计数据 → POST /api/design-lab/pricing/calculate
  ↓
后端加载产品/颜色信息 → 计算基础价格 → 计算尺码加价 → 计算N&N加价
  ↓
应用数量折扣 → 应用折扣码 → 计算配送费用 → 计算税费 → 返回总价
  ↓
前端显示报价结果页
```

### 19.3 加入购物车流程
```
用户点击 Add to Cart → 验证数据完整性 → POST /api/cart/items
  ↓
后端创建购物车项 → 关联设计数据 → 存储数量与N&N配置 → 返回购物车项ID
  ↓
前端跳转到加车成功页 → 显示摘要 → 提供继续操作选项
```

### 19.4 从商品详情进入 Design Lab
```
商品详情页 → 点击 Customize → /design-lab?productId=xxx&colorId=yyy
  ↓
前端加载产品信息 → GET /api/products/:productId
  ↓
设置默认产品与颜色 → 加载产品底图 → 初始化画布 → 用户开始设计
```

---

## 20. 错误处理

### 20.1 常见错误场景

#### 设计保存失败
- **错误**：网络超时、服务器错误
- **处理**：自动重试（最多3次），失败后保存到 localStorage，提示用户稍后重试

#### 图片上传失败
- **错误**：文件过大、格式不支持、网络错误
- **处理**：显示具体错误信息，提供帮助链接

#### 报价计算失败
- **错误**：产品/颜色不存在、价格配置错误
- **处理**：显示错误提示，允许用户返回修改

#### 加入购物车失败
- **错误**：设计不存在、产品/颜色不可用、尺码不兼容
- **处理**：显示具体错误，提供编辑选项

### 20.2 错误码定义

```typescript
enum DesignLabErrorCode {
  DESIGN_NOT_FOUND = 'DESIGN_NOT_FOUND',
  PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
  COLOR_NOT_AVAILABLE = 'COLOR_NOT_AVAILABLE',
  SIZE_NOT_AVAILABLE = 'SIZE_NOT_AVAILABLE',
  UPLOAD_TOO_LARGE = 'UPLOAD_TOO_LARGE',
  UPLOAD_INVALID_FORMAT = 'UPLOAD_INVALID_FORMAT',
  PRICING_CALCULATION_ERROR = 'PRICING_CALCULATION_ERROR',
  CART_ITEM_INVALID = 'CART_ITEM_INVALID',
  CONTENT_CHECK_FAILED = 'CONTENT_CHECK_FAILED'
}
```

---

## 21. 性能优化建议

### 21.1 前端优化
- **画布渲染**：使用 Canvas 或 SVG，避免大量 DOM 操作
- **图片懒加载**：素材库和字体列表使用虚拟滚动
- **防抖保存**：设计保存使用防抖，避免频繁请求
- **缓存策略**：产品信息、颜色信息、素材分类使用 SWR 缓存

### 21.2 后端优化
- **数据库索引**：为常用查询字段添加索引
- **JSONB 查询优化**：使用 GIN 索引加速 JSONB 查询
- **图片存储**：使用 CDN 存储图片，加速加载
- **缓存策略**：产品信息、价格配置使用 Redis 缓存

---

## 22. 安全考虑

### 22.1 数据验证
- **文件上传**：验证文件类型、大小、内容
- **设计数据**：验证 JSON 结构，防止注入攻击
- **价格计算**：后端验证，防止前端篡改

### 22.2 权限控制
- **设计访问**：用户只能访问自己的设计，除非是公开分享
- **分享链接**：使用 token 验证，设置过期时间
- **购物车操作**：验证用户身份，防止越权访问

---

**文档版本**: 3.0  
**最后更新**: 2025-12-07 19:40:00  
**维护者**: Development Team

