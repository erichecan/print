# 客户端评审指南
**日期**: 2025-11-01  
**项目**: suvernire plus E-commerce Platform  
**状态**: Phase 1 完成 - 准备评审

---

## 🎯 评审目标

本次评审将全面检查所有33个页面，确保：
1. ✅ 视觉设计符合品牌要求
2. ✅ 功能完整且可用
3. ✅ 响应式设计正常
4. ✅ 用户体验流畅
5. ✅ 双语切换正常
6. ✅ SEO优化到位

---

## 🚀 快速开始

### 启动本地服务器
服务器已在后台运行：**http://localhost:8080**

如果没有运行，请执行：
```bash
python -m http.server 8080
```

### 浏览器要求
- Chrome / Edge (推荐)
- Firefox
- Safari
- 移动端浏览器

---

## 📋 评审清单

### **阶段 1: 首页和导航** (15分钟)

#### 1.1 主页 (home.html)
**URL**: http://localhost:8080/home.html

**检查项**:
- [ ] Hero区域视觉效果
- [ ] "Start Designing" 和 "Browse Products" 按钮可点击
- [ ] 服务承诺栏显示正确（Free Shipping, Satisfaction等）
- [ ] 10个产品类别图片加载正常
- [ ] 品牌Logo展示区域
- [ ] 客户评价区域
- [ ] Enterprise推广区域
- [ ] Footer导航链接完整
- [ ] 响应式布局正常（调整窗口大小测试）

**关键测试**:
```
✓ 点击 "Start Designing" → 跳转到 design-lab.html
✓ 点击 "Browse Products" → 跳转到 long-sleeve.html
✓ 点击类别图片 → 跳转到产品列表
✓ 滚动页面 → 检查动画和布局
```

---

#### 1.2 导航系统
**检查所有页面的头部导航**:
- [ ] Logo可点击返回首页
- [ ] "Design Lab" 链接
- [ ] "Products" 链接
- [ ] "Help" 链接
- [ ] "Get a Quote" 按钮
- [ ] "Start Designing" / "Sign In" 按钮

---

### **阶段 2: 购物流程** (30分钟)

#### 2.1 产品列表 (long-sleeve.html)
**URL**: http://localhost:8080/long-sleeve.html

**检查项**:
- [ ] 页面标题和结果数显示
- [ ] 排序下拉菜单（Relevance, Best Sellers, Price等）
- [ ] 左侧过滤器面板：
  - [ ] Category复选框可操作
  - [ ] Brand过滤器可用
  - [ ] Color swatches可点击
  - [ ] Size按钮可切换
  - [ ] Price范围输入
  - [ ] Rating单选
  - [ ] "Clear Filters" 按钮有效
- [ ] 产品卡片网格：
  - [ ] 6个产品卡片显示
  - [ ] 产品图片占位符
  - [ ] 产品名称和价格
  - [ ] 星级评分
  - [ ] 颜色swatches
  - [ ] 点击产品卡片跳转到 product-hoodie.html
- [ ] 分页按钮可用

**关键测试**:
```
✓ 点击颜色swatch → 产品过滤
✓ 点击Size按钮 → 按钮状态切换
✓ 点击产品卡片 → 跳转到详情页
✓ 切换排序 → 结果更新
```

---

#### 2.2 产品详情 (product-hoodie.html)
**URL**: http://localhost:8080/product-hoodie.html

**检查项**:
- [ ] 面包屑导航正确
- [ ] 产品图片画廊：
  - [ ] 主图显示
  - [ ] 缩略图可切换
- [ ] 产品信息：
  - [ ] 产品名称
  - [ ] 评分和SKU
  - [ ] 价格 "From $24"
  - [ ] 评分摘要（4.8/5, 326 reviews）
- [ ] 颜色选择器：
  - [ ] 4个颜色swatches
  - [ ] 点击切换颜色
- [ ] 尺寸选择器：
  - [ ] 5个尺寸按钮
  - [ ] 点击切换尺寸
  - [ ] "Size chart" 链接
- [ ] 配送选项：
  - [ ] Standard和Rush单选
  - [ ] 日期显示
- [ ] 数量控制：
  - [ ] +/- 按钮工作
  - [ ] 数量输入框
- [ ] 行动按钮：
  - [ ] "Start Designing" → design-lab.html
  - [ ] "Add to Cart" → cart.html
- [ ] 详细信息和规格
- [ ] 客户评论区域：
  - [ ] 评分分布图表
  - [ ] 评论列表
  - [ ] "Load More Reviews" 按钮
- [ ] 推荐产品网格

**关键测试**:
```
✓ 切换颜色 → UI更新
✓ 切换尺寸 → M按钮保持高亮
✓ +/- 数量 → 数值变化
✓ 点击 "Add to Cart" → 跳转到购物车
```

---

#### 2.3 购物车 (cart.html)
**URL**: http://localhost:8080/cart.html

**检查项**:
- [ ] 购物车标题
- [ ] 产品列表：
  - [ ] 产品缩略图
  - [ ] 产品名称和SKU
  - [ ] 颜色/尺寸信息
  - [ ] 数量控制（+/-）
  - [ ] 单价和总价
  - [ ] 删除按钮（×）
- [ ] 促销码输入：
  - [ ] 输入框
  - [ ] "Apply" 按钮
- [ ] 订单摘要：
  - [ ] Subtotal
  - [ ] Shipping (Free)
  - [ ] Tax
  - [ ] Total
- [ ] 行动按钮：
  - [ ] "Proceed to Checkout" → checkout.html
  - [ ] "Continue Shopping" → home.html
- [ ] Trust badges

**关键测试**:
```
✓ 修改数量 → Subtotal和Total更新
✓ 点击 "Proceed to Checkout" → 跳转到结账页
```

---

#### 2.4 结账 (checkout.html)
**URL**: http://localhost:8080/checkout.html

**检查项**:
- [ ] 配送信息表单：
  - [ ] Full Name输入
  - [ ] Email输入
  - [ ] Phone输入
  - [ ] Street Address输入
  - [ ] City, State, ZIP输入
- [ ] 配送选项：
  - [ ] Standard Delivery（默认选中）
  - [ ] Rush Delivery
- [ ] 支付信息：
  - [ ] Card Number输入
  - [ ] Expiry Date (MM/YY)
  - [ ] CVV输入
- [ ] 复选框：
  - [ ] "Billing address same as shipping"
- [ ] 右侧订单摘要：
  - [ ] 产品预览
  - [ ] Subtotal, Shipping, Tax, Total
  - [ ] "Secure payment" 提示
- [ ] "Place Order" 按钮 → order-confirmation.html

**关键测试**:
```
✓ 填写表单 → 所有字段可输入
✓ 切换配送选项 → UI更新
✓ 点击 "Place Order" → 跳转到确认页
```

---

#### 2.5 订单确认 (order-confirmation.html)
**URL**: http://localhost:8080/order-confirmation.html

**检查项**:
- [ ] 成功图标和标题
- [ ] 订单号显示
- [ ] 订单日期
- [ ] 配送信息总结
- [ ] 产品列表
- [ ] 金额总结
- [ ] "Track Your Order" 按钮 → order-tracking.html
- [ ] "Continue Shopping" 按钮 → home.html

**关键测试**:
```
✓ 检查所有信息显示正确
```

---

### **阶段 3: 设计实验室** (20分钟)

#### 3.1 Design Lab主页 (design-lab.html)
**URL**: http://localhost:8080/design-lab.html

**检查项**:

**左侧Rail工具栏**:
- [ ] Upload按钮（图标+标签）
- [ ] Text按钮
- [ ] Art按钮
- [ ] Products按钮
- [ ] 点击按钮 → 激活状态切换

**Tools面板（Tabs）**:
- [ ] 5个Tab：Upload, Text, Art, Layers, Edit
- [ ] Tab切换正常

**Upload面板**:
- [ ] "Browse Your Computer" 按钮
- [ ] 文件选择对话框
- [ ] Drag & drop提示文字
- [ ] 上传提示（300 DPI, 20MB max）

**Text面板**:
- [ ] 输入框和"Add"按钮
- [ ] Font下拉菜单（6个选项）
- [ ] Font size滑块（12-120px）
- [ ] Letter spacing滑块
- [ ] Line height滑块
- [ ] Color选择器
- [ ] Alignment按钮（⬅️⬆️➡️）
- [ ] Outline复选框和滑块
- [ ] Shadow复选框和滑块
- [ ] 添加文本到画布

**Art面板**:
- [ ] 4个类别：All, Icons, Patterns, Logos
- [ ] 类别过滤器切换
- [ ] Art网格显示
- [ ] 点击art项目添加到画布

**Layers面板**:
- [ ] 图层列表显示
- [ ] 图层缩略图
- [ ] Show/Hide切换
- [ ] Delete按钮
- [ ] 点击图层 → 选中状态

**Edit面板**:
- [ ] Position X/Y滑块
- [ ] Scale X/Y滑块
- [ ] Rotation滑块
- [ ] Flip buttons（↔️和↕️）
- [ ] 实时更新canvas元素

**Canvas Stage**:
- [ ] 标题 "Design Preview"
- [ ] Undo/Redo按钮（占位）
- [ ] 打印区域虚线指示器
- [ ] 产品图像显示
- [ ] 添加的元素显示
- [ ] 拖拽功能工作

**Inspector面板**:
- [ ] 预览区域（280px高度）
- [ ] "Product Info" Accordion
- [ ] "Recommendations" Strip

**底部工具栏**:
- [ ] Product color swatches可切换
- [ ] View切换（Front/Back）
- [ ] "Get Price" 按钮
- [ ] "Save Design" 按钮
- [ ] "Share" 按钮

**关键测试**:
```
✓ 上传图片 → 显示在canvas
✓ 添加文本 → 出现在画布上
✓ 修改文本属性 → 实时更新
✓ 添加art → 显示在canvas
✓ 创建多个图层 → 在Layers面板显示
✓ 切换Show/Hide → 元素可见性
✓ 删除图层 → 元素从canvas移除
✓ 调整Position/Scale/Rotation → 元素变换
✓ 切换产品颜色 → 背景更新
✓ 切换Front/Back → 视图切换
```

---

### **阶段 4: 用户账户** (15分钟)

#### 4.1 登录页 (ndx-welcome.html)
**URL**: http://localhost:8080/ndx-welcome.html

**检查项**:
- [ ] 用户名/邮箱输入
- [ ] 密码输入
- [ ] "Sign In" 按钮
- [ ] "Forgot Password?" 链接
- [ ] "Create Account" 链接
- [ ] OAuth选项（Google, Facebook, WeChat）
- [ ] 视觉设计

---

#### 4.2 注册页 (register.html)
**URL**: http://localhost:8080/register.html

**检查项**:
- [ ] Full Name输入
- [ ] Email输入
- [ ] Password输入
- [ ] Confirm Password输入
- [ ] "Create Account" 按钮
- [ ] 已有账户登录链接
- [ ] 表单验证提示

---

#### 4.3 账户中心 (account.html)
**URL**: http://localhost:8080/account.html

**检查项**:
**侧边栏导航**:
- [ ] My Orders（默认）
- [ ] My Designs
- [ ] Account Settings
- [ ] Help Center

**My Orders面板**:
- [ ] 订单卡片显示
- [ ] 订单号、日期、状态
- [ ] 产品预览图
- [ ] "View Details" 和 "Track Order" 按钮

**My Designs面板**:
- [ ] 设计卡片网格
- [ ] 设计预览图
- [ ] 设计名称和日期
- [ ] "Edit" 和 "Delete" 按钮

**Account Settings面板**:
- [ ] Profile表单
- [ ] 密码更改表单
- [ ] "Save Changes" 按钮

**关键测试**:
```
✓ 切换导航Tab → 内容面板切换
✓ 点击"View Details" → order-detail.html
✓ 点击"Edit" → design-lab.html
```

---

### **阶段 5: 管理后台** (20分钟)

#### 5.1 后台登录 (admin/login.html)
**URL**: http://localhost:8080/admin/login.html

**检查项**:
- [ ] 登录表单
- [ ] 用户名/邮箱输入
- [ ] 密码输入
- [ ] "Sign In" 按钮
- [ ] 视觉效果

---

#### 5.2 后台Dashboard (admin/index.html)
**URL**: http://localhost:8080/admin/index.html

**检查项**:
**语言切换器**:
- [ ] 右上角 "English / 中文" 切换器
- [ ] 点击切换到中文 → 所有文字翻译
- [ ] 点击切回英文 → 恢复英文
- [ ] 切换流畅无闪烁

**侧边栏导航**:
- [ ] Dashboard
- [ ] Products
- [ ] Categories
- [ ] Orders
- [ ] Users
- [ ] Design Review
- [ ] Coupons
- [ ] Promotions
- [ ] Settings

**仪表板内容**:
- [ ] KPI卡片（Total Revenue, Orders, Users, Products）
- [ ] 图表和统计
- [ ] Recent Orders表格
- [ ] Quick Actions

---

#### 5.3 产品管理 (admin/products.html)
**检查项**:
- [ ] 产品列表表格
- [ ] 搜索和过滤器
- [ ] "+ New Product" 按钮
- [ ] 编辑/删除操作
- [ ] 分页

---

#### 5.4 订单管理 (admin/orders.html)
**检查项**:
- [ ] 订单列表
- [ ] 状态过滤器
- [ ] 搜索功能
- [ ] 查看详情按钮

---

#### 5.5 用户管理 (admin/users.html)
**检查项**:
- [ ] 用户列表
- [ ] 搜索和过滤器
- [ ] 用户详情链接

---

#### 5.6 设计审核 (admin/designs.html)
**检查项**:
- [ ] 设计提交列表
- [ ] 状态标签
- [ ] "Review" 按钮

---

#### 5.7 优惠券管理 (admin/coupons.html)
**检查项**:
- [ ] 优惠券列表
- [ ] 使用统计
- [ ] "+ New Coupon" 按钮

---

#### 5.8 促销管理 (admin/promotions.html)
**检查项**:
- [ ] 促销活动卡片
- [ ] 状态显示
- [ ] "+ New Promotion" 按钮

---

#### 5.9 系统设置 (admin/settings.html)
**检查项**:
- [ ] Site Settings表单
- [ ] Payment Integration配置
- [ ] Shipping Settings
- [ ] Email Notifications

**关键测试（i18n）**:
```
✓ 在所有admin页面测试语言切换
✓ 确保所有文字正确翻译
✓ 表格、按钮、标签全部双语
✓ 布局无错乱
```

---

### **阶段 6: 营销和支持页面** (15分钟)

#### 6.1 促销页面 (promotions.html)
**检查项**:
- [ ] 促销活动展示
- [ ] 促销产品列表
- [ ] CTA按钮

---

#### 6.2 帮助中心 (help.html)
**检查项**:
- [ ] FAQ Accordion
- [ ] 帮助分类
- [ ] 搜索功能
- [ ] 联系支持

---

#### 6.3 联系页面 (contact.html)
**检查项**:
- [ ] 联系表单
- [ ] 地址和电话信息

---

### **阶段 7: 响应式测试** (15分钟)

#### 7.1 桌面端 (1440px+)
测试主要页面：
- [ ] home.html
- [ ] long-sleeve.html
- [ ] product-hoodie.html
- [ ] design-lab.html
- [ ] cart.html
- [ ] checkout.html
- [ ] admin/index.html

**检查项**:
- [ ] 布局完整显示
- [ ] 所有模块可见
- [ ] 间距合理
- [ ] 文字清晰

---

#### 7.2 平板端 (768px - 1024px)
**检查项**:
- [ ] 导航菜单适配
- [ ] 产品网格调整
- [ ] 侧边栏/主内容平衡
- [ ] 表单宽度合理

---

#### 7.3 移动端 (320px - 767px)
**检查项**:
- [ ] 导航变成汉堡菜单（如适用）
- [ ] 过滤器可折叠
- [ ] 产品卡片单列显示
- [ ] 按钮大小适合触摸
- [ ] 文字大小可读
- [ ] 表单输入方便

**测试URL**:
```
✓ Chrome DevTools → Toggle Device Toolbar
✓ 测试: 375px (iPhone), 768px (iPad), 1280px (Desktop)
✓ 检查所有页面布局
```

---

### **阶段 8: SEO和性能** (10分钟)

#### 8.1 SEO检查
**检查以下页面的meta标签**:
- [ ] home.html - title, description, OG tags
- [ ] product-hoodie.html - Product structured data
- [ ] long-sleeve.html - title, description

**方法**: View Page Source (Ctrl+U)
- [ ] `<title>` 标签存在
- [ ] `<meta name="description">` 存在
- [ ] Open Graph tags存在
- [ ] Twitter Card tags存在
- [ ] JSON-LD结构化数据存在

---

#### 8.2 robots.txt和sitemap.xml
**检查**:
- [ ] http://localhost:8080/robots.txt
- [ ] http://localhost:8080/sitemap.xml

**检查项**:
- [ ] robots.txt格式正确
- [ ] sitemap.xml包含所有页面
- [ ] URL结构合理

---

#### 8.3 性能检查
**工具**: Chrome DevTools → Network

**检查项**:
- [ ] 页面加载时间 < 3秒
- [ ] 图片优化（webp格式）
- [ ] CSS/JS文件合理大小
- [ ] 没有阻塞资源

---

## 🐛 常见问题检查

### 链接错误
- [ ] 所有内部链接指向正确页面
- [ ] 外部链接安全（如有）
- [ ] 死链不存在

### 图片加载
- [ ] 所有类别图片加载
- [ ] 产品占位符显示
- [ ] 头像/logo正常

### 表单验证
- [ ] 必填字段标记
- [ ] 错误提示显示
- [ ] 提交按钮状态

### 浏览器兼容性
- [ ] Chrome正常
- [ ] Firefox正常
- [ ] Edge正常
- [ ] Safari正常（如有）

---

## 📝 评审反馈表

### 整体印象
- [ ] 视觉设计符合品牌要求 ⭐⭐⭐⭐⭐
- [ ] 用户体验流畅 ⭐⭐⭐⭐⭐
- [ ] 功能完整 ⭐⭐⭐⭐⭐
- [ ] 响应式设计优秀 ⭐⭐⭐⭐⭐

### 需要改进
请记录任何发现的问题：

**页面**: __________________
**问题描述**: 
_________________________________
_________________________________

**优先级**: [ ] 高 [ ] 中 [ ] 低

**建议**: 
_________________________________
_________________________________

---

### 设计问题
- [ ] 颜色
- [ ] 字体
- [ ] 间距
- [ ] 布局

### 功能问题
- [ ] 链接错误
- [ ] 表单问题
- [ ] 交互缺失
- [ ] 数据问题

### 响应式问题
- [ ] 桌面端
- [ ] 平板端
- [ ] 移动端

### 双语问题
- [ ] 翻译错误
- [ ] 缺失翻译
- [ ] 布局问题

---

## ✅ 评审完成检查

- [ ] 已完成所有阶段测试
- [ ] 已记录所有问题
- [ ] 已填写反馈表
- [ ] 已保存截图（如有）
- [ ] 已提供下一步建议

---

## 🎯 评审后下一步

### 如果大部分通过
1. ✅ 进入Phase 2 - Backend开发
2. ✅ 开始API实现
3. ✅ 数据库搭建
4. ✅ 第三方集成

### 如果需要改进
1. ⚠️ 列出优先级问题
2. ⚠️ 分配修复任务
3. ⚠️ 设定修改时间表
4. ⚠️ 重新评审修改后版本

### 如果需要内容更新
1. 📝 提供真实产品数据
2. 📝 更新品牌信息
3. 📝 添加实际图片
4. 📝 完善帮助内容

---

## 📞 技术支持

**评审期间如有问题**:
1. 检查 `PROJECT-STATUS-FINAL.md` 了解项目详情
2. 查看 `API-SPEC.md` 了解接口设计
3. 参考 `DATABASE-SCHEMA.md` 了解数据结构
4. 阅读各页面HTML注释了解功能

---

**祝评审顺利！** 🎉

