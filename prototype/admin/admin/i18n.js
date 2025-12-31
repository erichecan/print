// Admin internationalization (Chinese/English)

const i18n = {
  translations: {
    en: {
      // Sidebar
// Added cost management navigation translations
      dashboard: "Dashboard",
      products: "Products",
      costManagement: "Cost Management",
      categories: "Categories",
      orders: "Orders",
      users: "Users",
      designReview: "Design Review",
      coupons: "Coupons",
      promotions: "Promotions",
      settings: "Settings",
      backToSite: "← Back to Site",
      productionManagement: "Production Management",
      offlineWorkflowBoard: "Offline Order Workflow",
      
      // Common
      logout: "Logout",
      save: "Save",
      cancel: "Cancel",
      edit: "Edit",
      delete: "Delete",
      view: "View",
      search: "Search",
      actions: "Actions",
      status: "Status",
      date: "Date",
      
      // Dashboard
      todaysRevenue: "Today's Revenue",
      newOrders: "New Orders",
      pendingReviews: "Pending Reviews",
      lowStockItems: "Low Stock Items",
      recentOrders: "Recent Orders",
      pendingDesignReviews: "Pending Design Reviews",
      fromYesterday: "from yesterday",
      newToday: "new today",
      critical: "critical",
      ordersInProgress: "Orders in Progress",
      averageCycleTime: "Average Cycle Time",
      rushOrders: "Rush Orders",
      delayedOrders: "Delayed",
      saveView: "Save View",
      dateRange: "Date Range",
      allPriorities: "All priorities",
      rushPriority: "Rush",
      standardPriority: "Standard",
      allOwnersComingSoon: "All owners (coming soon)",
      searchOfflineOrders: "Search orders or companies...",
      workflowConfigInfo: 'Workflow stages can be customized in <a href="settings.html" target="_blank" rel="noopener">System Settings</a>. Use the button to adjust column names for the board.',
      customizeWorkflow: "Customize Workflow",
      newOfflineOrder: "New Offline Order",
      toggleSidebar: "Toggle sidebar",
      collapseSidebar: "Collapse sidebar",
      expandSidebar: "Expand sidebar",
      
      // Products
// Added cost management field translations
      productManagement: "Products",
      newProduct: "+ New Product",
      productName: "Product Name",
      sku: "SKU",
      price: "Price",
      stock: "Stock",
      active: "Active",
      outOfStock: "Out of Stock",
      lowStock: "Low Stock",
      archived: "Archived",
      category: "Category",
      searchProducts: "Search products...",
      allCategories: "All Categories",
      allStatus: "All Status",
      duplicate: "Duplicate",
      costOverview: "Cost Overview",
      totalCost: "Total Cost",
      totalRevenue: "Total Revenue",
      averageGrossProfit: "Average Gross Profit",
      averageMargin: "Average Margin",
      costTableTitle: "Product Cost Breakdown",
      product: "Product",
      unitCost: "Unit Cost",
      unitSalePrice: "Unit Sale Price",
      unitGrossProfit: "Unit Gross Profit",
      margin: "Margin",
      lastUpdated: "Last Updated",
      editCosts: "Edit Costs",
      currencyCAD: "CAD",
      currencyUSD: "USD",
      timeframe30Days: "Last 30 days",
      timeframe90Days: "Last 90 days",
      timeframe12Months: "Last 12 months",
// Cost management messaging
      costLoading: "Loading cost data...",
      costNoResults: "No products match your filters.",
      costInvalidNumber: "Please enter a valid number.",
      costMultiCurrencyNotice: "Multi-currency reporting is coming soon. Showing CAD figures for now.",
      costUpdateSuccess: "Cost data updated successfully.",
      costProductMissing: "Product not found in current view.",
      costNoProductsLoaded: "No products loaded yet.",
      
      // Categories
      categoryManagement: "Categories",
      newCategory: "+ New Category",
      edit: "Edit",
      sortProducts: "Sort Products",
      
      // Orders
      orderManagement: "Orders",
      orderNumber: "Order #",
      customer: "Customer",
      items: "Items",
      total: "Total",
      exportCsv: "Export CSV",
      searchOrders: "Search orders...",
      pending: "Pending",
      processing: "Processing",
      shipped: "Shipped",
      completed: "Completed",
      cancelled: "Cancelled",
      trackingNumber: "Tracking Number",
      update: "Update",
      notes: "Notes",
      orderItems: "Order Items",
      quantity: "Quantity",
      saveChanges: "Save Changes",
      backToOrders: "Back to Orders",
      
      // Users
      userManagement: "Users",
      email: "Email",
      role: "Role",
      joined: "Joined",
      searchUsers: "Search users...",
      customer: "Customer",
      admin: "Admin",
      inactive: "Inactive",
      suspended: "Suspended",
      totalOrders: "Total Orders",
      totalSpent: "Total Spent",
      designsCreated: "Designs Created",
      memberSince: "Member Since",
      recentOrders: "Recent Orders",
      backToUsers: "Back to Users",
      
      // Design Review
      designReviewManagement: "Design Reviews",
      thumbnail: "Thumbnail",
      designName: "Design Name",
      submitted: "Submitted",
      searchDesigns: "Search designs...",
      allStatus: "All Status",
      pendingReview: "Pending Review",
      approved: "Approved",
      rejected: "Rejected",
      designPreview: "Design Preview",
      copyrightRiskCheck: "Copyright Risk Check",
      designInformation: "Design Information",
      reviewActions: "Review Actions",
      approveDesign: "✓ Approve Design",
      rejectDesign: "✕ Reject Design",
      requestChanges: "Request Changes",
      backToDesigns: "Back to Designs",
      
      // Coupons
      couponManagement: "Coupons",
      code: "Code",
      type: "Type",
      discount: "Discount",
      usage: "Usage",
      validUntil: "Valid Until",
      newCoupon: "+ New Coupon",
      searchCoupons: "Search coupons...",
      percentage: "Percentage",
      freeShipping: "Free Shipping",
      viewUsage: "View Usage",
      deactivate: "Deactivate",
      expired: "Expired",
      
      // Promotions
      promotionManagement: "Promotions",
      newPromotion: "+ New Promotion",
      bulkDiscountPromotion: "Bulk discount promotion",
      promotionDetails: "Promotion Details",
      pause: "Paused",
      activate: "Activate",
      viewStats: "View Stats",
      
      // Settings
      siteSettings: "Site Settings",
      contactEmail: "Contact Email",
      phoneNumber: "Phone Number",
      defaultCurrency: "Default Currency",
      defaultShippingProvider: "Default Shipping Provider",
      paymentIntegration: "Payment Integration",
      paymentGateway: "Payment Gateway",
      apiKey: "API Key",
      testMode: "Test Mode",
      designReviewSettings: "Design Review Settings",
      autoApproveDesigns: "Auto-approve designs",
      copyrightCheck: "Copyright Check",
      reviewNotificationEmail: "Review Notification Email",
      dangerZone: "Danger Zone",
      clearAllCache: "Clear All Cache",
      resetDatabase: "Reset Database",
      deleteAllTestData: "Delete All Test Data",
      saveSettings: "Save Settings",
      
      // Common
      siteName: "Site Name",
      previous: "Previous",
      next: "Next",
      showing: "Showing",
      results: "results"
    },
    zh: {
      // Sidebar
// 新增成本管理导航文案
      dashboard: "仪表板",
      products: "商品管理",
      costManagement: "成本管理",
      categories: "分类管理",
      orders: "订单管理",
      users: "用户管理",
      designReview: "设计审核",
      coupons: "优惠券",
      promotions: "促销活动",
      settings: "系统设置",
      backToSite: "← 返回前台",
      productionManagement: "生产管理",
      offlineWorkflowBoard: "线下订单看板",
      
      // Common
      logout: "退出登录",
      save: "保存",
      cancel: "取消",
      edit: "编辑",
      delete: "删除",
      view: "查看",
      search: "搜索",
      actions: "操作",
      status: "状态",
      date: "日期",
      
      // Dashboard
      todaysRevenue: "今日营收",
      newOrders: "新订单",
      pendingReviews: "待审核",
      lowStockItems: "低库存商品",
      recentOrders: "最近订单",
      pendingDesignReviews: "待审核设计稿",
      fromYesterday: "较昨日",
      newToday: "今日新增",
      critical: "严重",
      ordersInProgress: "进行中的订单",
      averageCycleTime: "平均周期",
      rushOrders: "加急订单",
      delayedOrders: "已延迟",
      saveView: "保存视图",
      dateRange: "日期范围",
      allPriorities: "全部优先级",
      rushPriority: "加急",
      standardPriority: "标准",
      allOwnersComingSoon: "所有负责人（即将上线）",
      searchOfflineOrders: "搜索订单或公司...",
      workflowConfigInfo: '可在 <a href="settings.html" target="_blank" rel="noopener">系统设置</a> 中调整流程阶段。点击按钮可修改看板列名称。',
      customizeWorkflow: "自定义流程",
      newOfflineOrder: "新建线下订单",
      toggleSidebar: "切换侧边栏",
      collapseSidebar: "折叠侧边栏",
      expandSidebar: "展开侧边栏",
      
      // Products
// 新增成本管理字段文案
      productManagement: "商品管理",
      newProduct: "+ 新建商品",
      productName: "商品名称",
      sku: "SKU",
      price: "价格",
      stock: "库存",
      active: "已上架",
      outOfStock: "缺货",
      lowStock: "库存不足",
      archived: "已归档",
      category: "分类",
      searchProducts: "搜索商品...",
      allCategories: "全部分类",
      allStatus: "全部状态",
      duplicate: "复制",
      costOverview: "成本概览",
      totalCost: "总成本",
      totalRevenue: "总成交额",
      averageGrossProfit: "平均毛利",
      averageMargin: "平均毛利率",
      costTableTitle: "商品成本明细",
      product: "商品",
      unitCost: "单位成本",
      unitSalePrice: "单位成交价",
      unitGrossProfit: "单位毛利",
      margin: "毛利率",
      lastUpdated: "更新时间",
      editCosts: "编辑成本",
      currencyCAD: "加元",
      currencyUSD: "美元",
      timeframe30Days: "最近30天",
      timeframe90Days: "最近90天",
      timeframe12Months: "最近12个月",
// 成本管理提示文案
      costLoading: "正在加载成本数据...",
      costNoResults: "没有符合条件的商品。",
      costInvalidNumber: "请输入有效的数字。",
      costMultiCurrencyNotice: "多币种报表功能即将上线，当前仍显示加元数据。",
      costUpdateSuccess: "成本数据更新成功。",
      costProductMissing: "当前列表中未找到该商品。",
      costNoProductsLoaded: "尚未加载任何商品。",
      
      // Categories
      categoryManagement: "分类管理",
      newCategory: "+ 新建分类",
      edit: "编辑",
      sortProducts: "商品排序",
      
      // Orders
      orderManagement: "订单管理",
      orderNumber: "订单号",
      customer: "客户",
      items: "商品数",
      total: "总额",
      exportCsv: "导出 CSV",
      searchOrders: "搜索订单...",
      pending: "待处理",
      processing: "处理中",
      shipped: "已发货",
      completed: "已完成",
      cancelled: "已取消",
      trackingNumber: "快递单号",
      update: "更新",
      notes: "备注",
      orderItems: "订单商品",
      quantity: "数量",
      saveChanges: "保存更改",
      backToOrders: "返回订单列表",
      
      // Users
      userManagement: "用户管理",
      email: "邮箱",
      role: "角色",
      joined: "注册时间",
      searchUsers: "搜索用户...",
      customer: "客户",
      admin: "管理员",
      inactive: "未激活",
      suspended: "已暂停",
      totalOrders: "总订单数",
      totalSpent: "总消费",
      designsCreated: "设计作品",
      memberSince: "注册时间",
      recentOrders: "最近订单",
      backToUsers: "返回用户列表",
      
      // Design Review
      designReviewManagement: "设计审核",
      thumbnail: "缩略图",
      designName: "设计名称",
      submitted: "提交时间",
      searchDesigns: "搜索设计稿...",
      allStatus: "全部状态",
      pendingReview: "待审核",
      approved: "已通过",
      rejected: "已拒绝",
      designPreview: "设计预览",
      copyrightRiskCheck: "版权风险检查",
      designInformation: "设计信息",
      reviewActions: "审核操作",
      approveDesign: "✓ 通过审核",
      rejectDesign: "✕ 拒绝审核",
      requestChanges: "要求修改",
      backToDesigns: "返回设计列表",
      
      // Coupons
      couponManagement: "优惠券管理",
      code: "优惠码",
      type: "类型",
      discount: "折扣",
      usage: "使用次数",
      validUntil: "有效期",
      newCoupon: "+ 新建优惠券",
      searchCoupons: "搜索优惠券...",
      percentage: "百分比折扣",
      freeShipping: "免运费",
      viewUsage: "查看使用记录",
      deactivate: "停用",
      expired: "已过期",
      
      // Promotions
      promotionManagement: "促销活动管理",
      newPromotion: "+ 新建促销",
      bulkDiscountPromotion: "批量折扣促销",
      promotionDetails: "促销详情",
      pause: "已暂停",
      activate: "激活",
      viewStats: "查看统计",
      
      // Settings
      siteSettings: "网站设置",
      contactEmail: "联系邮箱",
      phoneNumber: "联系电话",
      defaultCurrency: "默认货币",
      defaultShippingProvider: "默认物流商",
      paymentIntegration: "支付集成",
      paymentGateway: "支付网关",
      apiKey: "API 密钥",
      testMode: "测试模式",
      designReviewSettings: "设计审核设置",
      autoApproveDesigns: "自动审核通过",
      copyrightCheck: "版权检查",
      reviewNotificationEmail: "审核通知邮箱",
      dangerZone: "危险操作区",
      clearAllCache: "清除所有缓存",
      resetDatabase: "重置数据库",
      deleteAllTestData: "删除所有测试数据",
      saveSettings: "保存设置",
      
      // Common
      siteName: "网站名称",
      previous: "上一页",
      next: "下一页",
      showing: "显示",
      results: "条结果"
    }
  },
  
  currentLang: localStorage.getItem('admin-lang') || 'en',
  
  t(key) {
    return this.translations[this.currentLang][key] || key;
  },
  
  setLang(lang) {
    this.currentLang = lang;
    localStorage.setItem('admin-lang', lang);
    this.updatePage();
  },
  
  updatePage() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        el.textContent = this.t(key);
      }
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      if (key) {
        el.innerHTML = this.t(key);
      }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) {
        el.placeholder = this.t(key);
      }
    });
    // Update active button
    document.querySelectorAll('.lang-switcher button').forEach(btn => {
      btn.classList.remove('is-active');
      if (btn.dataset.lang === this.currentLang) {
        btn.classList.add('is-active');
      }
    });
    ensureProductionNav();
    applySidebarState(isSidebarCollapsed());
  },
  
  init() {
    // Create language switcher if not exists
    if (!document.querySelector('.lang-switcher')) {
      const adminUser = document.querySelector('.admin-user');
      if (adminUser) {
        const switcher = document.createElement('div');
        switcher.className = 'lang-switcher';
        switcher.innerHTML = `
          <button data-lang="en">EN</button>
          <button data-lang="zh">中文</button>
        `;
        adminUser.insertBefore(switcher, adminUser.firstChild);
        
        // Add click handlers
        switcher.querySelectorAll('button').forEach(btn => {
          btn.addEventListener('click', () => {
            i18n.setLang(btn.dataset.lang);
          });
        });
      }
    }
    ensureProductionNav();
    ensureSidebarToggle();
    applySidebarState(isSidebarCollapsed());
    this.updatePage();
  }
};

const SIDEBAR_STORAGE_KEY = 'admin-sidebar-collapsed';

function isSidebarCollapsed() {
  return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
}

function applySidebarState(collapsed) {
  const grid = document.querySelector('.admin-grid');
  if (grid) {
    grid.classList.toggle('sidebar-collapsed', collapsed);
  }

  const toggle = document.querySelector('.admin-sidebar-toggle');
  if (toggle) {
    const label = collapsed ? i18n.t('expandSidebar') : i18n.t('collapseSidebar');
    toggle.setAttribute('aria-label', label);
    toggle.setAttribute('title', label);
    toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  }

  const navLinks = document.querySelectorAll('.admin-nav a');
  navLinks.forEach(link => {
    const textEl = link.querySelector('[data-i18n]');
    if (textEl) {
      link.setAttribute('title', textEl.textContent || textEl.getAttribute('data-i18n'));
    }
  });
}

function ensureSidebarToggle() {
  const header = document.querySelector('.admin-header');
  if (!header || header.querySelector('.admin-sidebar-toggle')) {
    return;
  }

  let leftGroup = header.querySelector('.admin-header-left');
  const titleEl = header.querySelector('h1');
  if (!leftGroup && titleEl) {
    leftGroup = document.createElement('div');
    leftGroup.className = 'admin-header-left';
    header.insertBefore(leftGroup, titleEl);
    leftGroup.appendChild(titleEl);
  }

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'admin-sidebar-toggle';
  button.innerHTML = '☰';
  if (leftGroup) {
    leftGroup.insertBefore(button, leftGroup.firstChild);
  } else {
    header.insertBefore(button, header.firstChild);
  }

  const collapsed = isSidebarCollapsed();
  applySidebarState(collapsed);

  button.addEventListener('click', () => {
    const next = !isSidebarCollapsed();
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
    applySidebarState(next);
  });
}

function ensureProductionNav() {
  const sidebar = document.querySelector('.admin-sidebar');
  if (!sidebar) return;

  let navContainer = sidebar.querySelector('.admin-nav');
  if (!navContainer) {
    navContainer = document.createElement('div');
    navContainer.className = 'admin-nav';
    sidebar.insertBefore(navContainer, sidebar.firstChild);
  }

  let heading = navContainer.querySelector('h3');
  if (!heading) {
    heading = document.createElement('h3');
    navContainer.insertBefore(heading, navContainer.firstChild);
  }
  heading.textContent = 'suvernire plus';

  let navList = navContainer.querySelector('ul');
  if (!navList) {
    navList = document.createElement('ul');
    navContainer.appendChild(navList);
  }

// Canonical admin navigation structure to prevent duplicates
  const NAV_ITEMS = [
    { key: 'dashboard', href: 'index.html', icon: '📊', label: 'dashboard' },
    { key: 'products', href: 'products.html', icon: '🛍️', label: 'products' },
    { key: 'categories', href: 'categories.html', icon: '📁', label: 'categories' },
    { key: 'orders', href: 'orders.html', icon: '📦', label: 'orders' },
    { key: 'production', href: 'offline-orders-board.html', icon: '🛠️', label: 'productionManagement' },
    { key: 'cost', href: 'cost-management.html', icon: '💰', label: 'costManagement' },
    { key: 'users', href: 'users.html', icon: '👥', label: 'users' },
    { key: 'designs', href: 'designs.html', icon: '🎨', label: 'designReview' },
    { key: 'coupons', href: 'coupons.html', icon: '🎫', label: 'coupons' },
    { key: 'promotions', href: 'promotions.html', icon: '🎉', label: 'promotions' },
    { key: 'settings', href: 'settings.html', icon: '⚙️', label: 'settings' }
  ];

  const fallbackActive = {
    'product-edit.html': 'products.html',
    'order-detail.html': 'orders.html',
    'user-detail.html': 'users.html',
    'design-review.html': 'designs.html',
    'content-manager.html': 'products.html',
    'categories.html': 'categories.html'
  };

  const path = window.location.pathname;
  const currentFile = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
  const resolvedTarget = fallbackActive[currentFile] || currentFile;

  navList.innerHTML = '';

  NAV_ITEMS.forEach(item => {
    const li = document.createElement('li');
    const link = document.createElement('a');
    link.href = item.href;
    link.innerHTML = `<span class="admin-nav-icon">${item.icon}</span> <span data-i18n="${item.label}">${i18n.t(item.label)}</span>`;
    if (resolvedTarget === item.href) {
      link.classList.add('is-active');
    }
    li.appendChild(link);
    navList.appendChild(li);
  });

  let footer = navContainer.querySelector('[data-nav-footer]');
  if (!footer) {
    footer = document.createElement('div');
    footer.setAttribute('data-nav-footer', 'true');
    footer.style.marginTop = '32px';
    footer.style.paddingTop = '24px';
    footer.style.borderTop = '1px solid var(--color-border)';
    navContainer.appendChild(footer);
  }

  footer.innerHTML = `<a href="../home.html" style="color: var(--color-text-muted); font-size: 14px;" data-i18n="backToSite">${i18n.t('backToSite')}</a>`;
}

// Auto-init when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => i18n.init());
} else {
  i18n.init();
}

