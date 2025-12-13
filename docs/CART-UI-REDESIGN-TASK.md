# 购物车页面 UI 改造任务文档

**创建时间**: 2025-12-13 15:35:00  
**目标**: 使用 frontend-design 能力产出高质量购物车页面布局（视觉统一、响应式、可访问性好）

---

## 一、任务理解

### 1.1 目标
改造购物车页面 UI，使其：
- 视觉统一、信息层级明确
- 响应式稳定（桌面/平板/手机）
- 可访问性好（focus 样式、键盘导航、语义化 HTML）
- 功能不回归

### 1.2 范围

#### 需要注释掉的板块（立即执行）：
1. **Delivery Options** (`cart-delivery`)
   - 位置：`apps/web/src/app/cart/page.tsx` 约 L374-L384
   - DOM: `<section className="cart-delivery">...</section>`
   
2. **Add Your Design to More Styles** (`cart-upsell`)
   - 位置：`apps/web/src/app/cart/page.tsx` 约 L386-L406
   - DOM: `<section className="cart-upsell">...</section>`
   - 使用 `recommendedProducts.map(...)` 渲染卡片

#### 相关样式（注释/删除）：
- `apps/web/src/app/globals.css` 约 L9101-9140 (`.cart-delivery*` 相关)
- `apps/web/src/app/globals.css` 约 L9791-9840 (`.cart-upsell*` 相关)

#### 需要重做的部分：
1. **布局结构**
   - 桌面：左侧商品列表（主列）+ 右侧 Summary（sticky）
   - 平板/手机：Summary 下沉到列表下方
   - 保留 `cart-new__grid` 但视觉优化

2. **商品卡片**
   - 统一图片区域（图片 400 不破图、不塌陷）
   - 商品标题、variant 描述、数量 stepper、单价/小计清晰对齐
   - Remove 按钮、Edit Design 按钮样式统一
   - 可访问性：focus 样式明显

3. **Summary 区**
   - 小计、促销折扣、coupon、delivery、税、总计排版更紧凑
   - 邮编输入保留在右侧（已存在 `.summary-panel__zip`）
   - Checkout 按钮突出，移动端固定底部或放在 Summary 顶部

4. **状态设计**
   - 空购物车：`renderEmptyState()` 保持友好（可提升视觉）
   - 加载中：Loading skeleton 或轻量 loading
   - 更新数量/删除商品：按钮 disabled/loading 状态一致
   - promotions 超时：不阻塞页面（已有 warning，确保 UI 不抖）

5. **视觉规范**
   - 统一圆角、阴影、边框、间距（参考站内 `--color-*` token）
   - typography：标题/副标题/正文/辅助信息分级明确
   - 不要再出现“大块留白 + 弱信息”的板块

### 1.3 限制条件
- 必须保证功能不回归（数量更新、删除、优惠券、邮编输入、促销折扣等）
- 必须响应式（375/768/1280 视口）
- 必须可访问（键盘导航、focus 样式、语义化 HTML）
- 所有修改必须加时间戳注释

### 1.4 未知点（需要确认）
1. Summary 在移动端是否要做“底部固定栏”？
2. 是否要保留“Edit Design”入口？如果要，目标链接是什么？
3. 视觉风格更偏“简洁现代”（Stripe）还是“CustomInk 风格”？

---

## 二、关键代码引用

### 2.1 需要注释的代码

#### Delivery Options (L374-L384)
```tsx
<section className="cart-delivery">
  <h3>Delivery Options</h3>
  <div className="cart-delivery__options">
    <div className="cart-delivery__card is-disabled">
      <span>Ship to multiple addresses</span>
    </div>
    <div className="cart-delivery__card is-disabled">
      <span>Only available for orders of 6 or more items</span>
    </div>
  </div>
</section>
```

#### Add Your Design to More Styles (L386-L406)
```tsx
<section className="cart-upsell">
  <div className="cart-upsell__header">
    <h3>Add Your Design to More Styles</h3>
    <p>Only available for orders of 6 or more items.</p>
  </div>
  <div className="cart-upsell__grid">
    {recommendedProducts.map((product) => (
      <div key={product.id} className="cart-upsell__card">
        <Image src={product.image} alt={product.name} width={96} height={120} />
        <p>{product.name}</p>
        <button type="button">Add product</button>
      </div>
    ))}
    <div className="cart-upsell__cta">
      <div>
        <p>View more items that your group will love</p>
        <button type="button">Take a look</button>
      </div>
    </div>
  </div>
</section>
```

### 2.2 现有布局结构 (L266-L407)
```tsx
<div className="cart-new__grid">
  <div className="cart-new__main">
    {cart.items.map((item) => (
      <article key={item.id} className="cart-card">
        {/* 商品卡片内容 */}
      </article>
    ))}
    {/* cart-delivery section */}
    {/* cart-upsell section */}
  </div>
  <aside className="cart-new__summary">
    <div className="summary-panel">
      {/* Summary 内容 */}
    </div>
  </aside>
</div>
```

### 2.3 商品卡片关键元素
- 图片区域：`cart-card__media` (L270-L292)
- 商品信息：`cart-card__body` (L293-L370)
- 数量 stepper：`cart-card__qty` (L343-L364)
- Remove 按钮：`cart-card__remove` (L301-L308)
- Edit Design 按钮：`cart-card__link` (L297-L299)

### 2.4 Summary 关键元素
- 邮编输入：`summary-panel__zip` (L432-L450)
- Checkout 按钮：`summary-panel__primary` (约 L450+)
- 各项费用行：`summary-panel__row`

---

## 三、待确认问题

### 问题 1: Summary 在移动端的显示方式
**选项 A**: Summary 作为底部固定栏（sticky bottom）
- 优点：Checkout 按钮始终可见，便于快速结账
- 缺点：可能遮挡部分内容，需要 padding-bottom

**选项 B**: Summary 下沉到列表下方（非固定）
- 优点：不遮挡内容，用户体验更流畅
- 缺点：需要滚动到底部才能看到 Summary

**选项 C**: Summary 放在列表顶部（移动端）
- 优点：价格信息优先展示
- 缺点：不符合常见购物车布局习惯

**请选择**: A / B / C

### 问题 2: "Edit Design" 按钮的处理
**现状**: 
- 位置：`apps/web/src/app/cart/page.tsx` L297-L299
- 当前状态：`<button>` 没有 `onClick` 或 `href`
- 代码：`<button type="button" className="cart-card__link">Edit Design</button>`

**选项 A**: 保留并实现跳转
- 目标链接：请确认（如 `/design-lab?itemId=${item.id}` 或 `/products/${item.productId}?edit=${item.id}`）

**选项 B**: 暂时隐藏（注释掉），后续再实现
- 优点：避免无效按钮影响用户体验
- 缺点：功能缺失

**选项 C**: 保留但禁用（显示但不可点击）
- 优点：保持 UI 完整性
- 缺点：可能造成困惑

**请选择**: A（如选择 A，请提供目标链接） / B / C

### 问题 3: 视觉风格选择
**选项 A**: 简洁现代风格（Stripe 风格）
- 特点：大量留白、简洁边框、柔和阴影、低饱和度颜色
- 适合：B2B、专业感、信任感

**选项 B**: CustomInk 风格（电商风格）
- 特点：更丰富的颜色、更明显的 CTA、更紧凑的布局
- 适合：B2C、购物导向、转化率优先

**请选择**: A / B

---

## 四、To-Do List

### Phase 1: 注释掉指定板块（立即执行）
- [ ] 1.1 注释掉 `cart-delivery` section (L374-L384)
- [ ] 1.2 注释掉 `cart-upsell` section (L386-L406)
- [ ] 1.3 注释/删除 `.cart-delivery*` 相关样式 (globals.css L9101-9140)
- [ ] 1.4 注释/删除 `.cart-upsell*` 相关样式 (globals.css L9791-9840)
- [ ] 1.5 验证注释后页面无错误（本地测试）

**时间预估**: 15 分钟

### Phase 2: 布局结构优化（等待确认后执行）
- [ ] 2.1 优化 `cart-new__grid` 布局（桌面端两列，移动端单列）
- [ ] 2.2 优化 Summary 在移动端的显示方式（根据问题1的选择）
- [ ] 2.3 优化商品列表区域间距和排版
- [ ] 2.4 确保响应式断点正确（375/768/1280）

**时间预估**: 30 分钟

### Phase 3: 商品卡片重设计（等待确认后执行）
- [ ] 3.1 统一图片区域样式（不破图、不塌陷、占位符优化）
- [ ] 3.2 优化商品信息排版（标题、variant、meta 信息）
- [ ] 3.3 统一按钮样式（Remove、Edit Design、Edit Sizes、Add Another Color）
- [ ] 3.4 优化数量 stepper 样式和交互
- [ ] 3.5 优化价格显示（单价、小计对齐）
- [ ] 3.6 添加 focus 样式（可访问性）

**时间预估**: 45 分钟

### Phase 4: Summary 区重设计（等待确认后执行）
- [ ] 4.1 优化费用行排版（更紧凑、对齐清晰）
- [ ] 4.2 优化邮编输入区域样式
- [ ] 4.3 优化优惠券输入区域样式
- [ ] 4.4 突出 Checkout 按钮样式
- [ ] 4.5 根据问题1的选择实现移动端布局

**时间预估**: 30 分钟

### Phase 5: 状态设计优化（等待确认后执行）
- [ ] 5.1 优化空购物车状态（`renderEmptyState()`）
- [ ] 5.2 优化加载中状态（skeleton 或轻量 loading）
- [ ] 5.3 统一按钮 disabled/loading 状态样式
- [ ] 5.4 确保 promotions 超时不影响 UI（验证现有逻辑）

**时间预估**: 30 分钟

### Phase 6: 视觉规范统一（等待确认后执行）
- [ ] 6.1 统一圆角、阴影、边框（使用 CSS 变量或 Tailwind）
- [ ] 6.2 统一间距系统（使用一致的 spacing scale）
- [ ] 6.3 优化 typography 层级（标题/副标题/正文/辅助信息）
- [ ] 6.4 移除大块留白 + 弱信息的板块

**时间预估**: 30 分钟

### Phase 7: 测试与验证（必须闭环）
- [ ] 7.1 Playwright E2E 测试：
  - [ ] `/cart` 页面不再渲染 `.cart-delivery` 与 `.cart-upsell`
  - [ ] 桌面宽度下存在两列布局（list + summary）
  - [ ] 手机宽度下变为单列
  - [ ] `#summary-zip` 输入存在；顶部不出现邮编红框提醒
  - [ ] 数量 stepper 能工作（至少点击 +/− 不报错）
- [ ] 7.2 Chrome DevTools 验证：
  - [ ] 不同视口（375/768/1280）布局无溢出
  - [ ] Network/Console：无新增错误
  - [ ] promotions 超时不影响渲染
- [ ] 7.3 功能回归测试：
  - [ ] 数量更新功能正常
  - [ ] 删除商品功能正常
  - [ ] 优惠券功能正常
  - [ ] 邮编输入功能正常
  - [ ] 促销折扣显示正常
- [ ] 7.4 提交与部署：
  - [ ] commit + push GitHub
  - [ ] 部署
  - [ ] 线上 Playwright 验证
  - [ ] 提供测试结果摘要

**时间预估**: 45 分钟

---

## 五、总时间预估

- Phase 1: 15 分钟
- Phase 2-6: 3 小时（等待确认后）
- Phase 7: 45 分钟

**总计**: 约 4 小时

---

## 六、关键约束

1. ✅ 所有修改必须加时间戳注释（格式：`// [2025-12-13 20:15:10] ...`）
2. ✅ 禁止删除逻辑代码，只注释（便于后续恢复）
3. ✅ 必须保证功能不回归
4. ✅ 必须响应式和可访问
5. ✅ 必须闭环测试（Playwright + Chrome DevTools）

---

**等待确认后开始执行 Phase 2-7**
