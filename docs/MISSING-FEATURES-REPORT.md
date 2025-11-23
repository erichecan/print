# 全站代码缺失功能报告
**生成时间**: 2025-01-27

## 一、占位符和TODO代码

### 1.1 后端代码中的TODO

#### 订单服务 (backend/src/services/orderService.js)
1. **行161**: 记录状态变更历史（如需要）
   - `// TODO: Record status change history (if needed)`
   
2. **行162**: 发送状态更新通知邮件
   - `// TODO: Send status update notification email`
   
3. **行265**: 发送取消确认邮件
   - `// TODO: Send cancellation confirmation email`

#### Webhook控制器 (backend/src/controllers/webhookController.js)
4. **行201**: 发送支付失败通知邮件（可选）
   - `// TODO: Send payment failure notification email (optional)`

### 1.2 前端代码中的TODO

#### Design Lab Native (apps/web/public/design-lab-native/app.js)
1. **行28**: 根据 variantId 加载产品数据并设置到 store
   - `// TODO: 根据 variantId 加载产品数据并设置到 store`
   
2. **行287**: 可以在这里调用 API 获取产品信息并更新显示
   - `// TODO: 可以在这里调用 API 获取产品信息并更新显示`
   
3. **行304**: 保存设计名称（TODO: 保存到 store）
   - `// [2025-11-19 11:30:00] 保存设计名称（TODO: 保存到 store）`
   
4. **行818**: 实现添加到购物车功能
   - `// TODO: 实现添加到购物车功能`
   
5. **行840**: 加载产品列表（占位）
   - `// [2025-11-19 11:30:00] TODO: 加载产品列表（占位）`
   
6. **行893**: 更新其他面的底图（需要保存当前面，切换面，更新，再切回）
   - `// [2025-11-19 11:30:00] TODO: 更新其他面的底图（需要保存当前面，切换面，更新，再切回）`

#### Design Lab Toolbar (apps/web/public/design-lab-native/toolbar.js)
7. **行195**: 显示产品选择（TODO）
   - `// [2025-11-19 11:15:00] 显示产品选择（TODO）`

#### 账户设置页面 (apps/web/src/app/account/settings/page.tsx)
8. **行60**: 如果后端API未实现，显示友好提示
   - 密码修改功能可能需要后端支持

### 1.3 API文档中的TODO和TBD

#### API Contracts (docs/API-CONTRACTS.md)
1. **认证流程**:
   - `POST /auth/forgot-password`: 邮件发送 **TBD**
   - 所有admin路由: `TODO: enable requireAdmin` - 当前为了UX已注释掉requireAdmin中间件

2. **安全考虑**:
   - 需要在admin UX准备好后重新启用 `requireAdmin` 中间件

---

## 二、API已实现但前端未使用的功能

### 2.1 认证相关API

1. **密码重置功能**
   - **后端API**: ✅ 已实现
     - `POST /api/auth/forgot-password` - 请求密码重置
     - `POST /api/auth/reset-password` - 重置密码
   - **前端实现**: ❌ 未实现
     - API已定义在 `apps/web/src/lib/api.ts` (行524-527)
     - 但没有前端页面或组件使用这些API
   - **建议**: 创建密码重置页面 `/forgot-password` 和 `/reset-password`

2. **密码修改功能**
   - **后端API**: ✅ 已实现 (`PUT /api/auth/me/password`)
   - **前端API定义**: ⚠️ 定义错误
     - 前端定义为 `POST /auth/change-password` (行523)
     - 后端实际是 `PUT /api/auth/me/password`
   - **前端实现**: ❌ 未实现或错误
     - `apps/web/src/app/account/settings/page.tsx` 有提示"如果后端API未实现"
   - **建议**: 修复API路径并实现密码修改功能

3. **验证码登录 (无密码登录)**
   - **后端API**: ✅ 已实现
     - `POST /api/auth/send-code` - 发送验证码
     - `POST /api/auth/verify-code` - 验证验证码
   - **前端实现**: ❌ 未实现
     - API在 `docs/API-SPEC.md` 中有定义
     - 但前端代码中没有使用
   - **建议**: 在登录页面添加验证码登录选项

### 2.2 用户偏好设置API

1. **用户偏好设置**
   - **后端API**: ✅ 已实现 (`/api/user/preferences`)
     - `GET /api/user/preferences` - 获取偏好设置
     - `PUT /api/user/preferences` - 更新偏好设置
   - **前端实现**: ❌ 未实现
     - 在 `backend/src/routes/userPreferences.js` 中已定义
     - 但前端代码中没有对应的API调用或页面
   - **建议**: 在账户设置页面添加偏好设置功能

### 2.3 Design Lab相关API

1. **设计模板功能**
   - **后端API**: ✅ 已实现 (`/api/templates`)
     - `GET /api/templates` - 获取模板列表
     - `GET /api/templates/:id` - 获取模板详情
     - `POST /api/templates/:id/like` - 点赞模板
   - **前端实现**: ⚠️ 部分实现
     - API已定义在 `apps/web/src/lib/api.ts` (行1572-1591)
     - 但在 `design-lab-native` 中未使用
   - **建议**: 在Design Lab中添加模板选择功能

2. **设计评论功能**
   - **后端API**: ✅ 已实现 (`/api/designs/:id/comments`)
     - `GET /api/designs/:id/comments` - 获取评论列表
     - `POST /api/designs/:id/comments` - 创建评论
     - `POST /api/comments/:id/like` - 点赞评论
   - **前端实现**: ❌ 未实现
     - API已定义在 `apps/web/src/lib/api.ts` (行1606-1624)
     - 但没有前端UI使用这些API
   - **建议**: 在设计详情页添加评论功能

### 2.4 产品评论功能

1. **产品评论提交和点赞**
   - **后端API**: ✅ 已实现
     - `POST /api/products/:id/reviews` - 提交评论
     - `POST /api/reviews/:id/helpful` - 标记有用
   - **前端实现**: ⚠️ 部分实现
     - API已定义，但可能没有完整的UI
     - 需要检查产品详情页是否有评论提交表单
   - **建议**: 确保产品详情页有完整的评论功能

### 2.5 订单相关API

1. **订单取消功能**
   - **后端API**: ✅ 已实现 (`POST /api/orders/:id/cancel`)
   - **前端实现**: ❌ 需要验证
     - API已定义在 `apps/web/src/lib/api.ts` (行493-497)
     - 需要在账户订单页面添加取消按钮

2. **订单发票下载**
   - **后端API**: ✅ 已实现
     - `GET /api/orders/:id/invoice` - 下载发票
     - `GET /api/orders/number/:orderNumber/invoice` - 通过订单号下载
   - **前端实现**: ✅ 已实现
     - API已定义并可能已使用

3. **订单跟踪功能**
   - **后端API**: ✅ 已实现 (`GET /api/orders/:id/tracking`)
   - **前端实现**: ⚠️ 部分实现
     - 有 `apps/web/src/app/order-tracking/page.tsx` 页面
     - 但需要验证是否完整实现所有跟踪功能

### 2.6 优惠券API

1. **优惠券验证和应用**
   - **后端API**: ✅ 已实现 (`POST /api/coupons/validate`)
   - **前端实现**: ⚠️ 需要验证
     - API已定义在 `apps/web/src/lib/api.ts` (行1537-1553)
     - 需要在结账页面验证是否使用了优惠券功能

### 2.7 Admin API

1. **Admin Audit Logs (审计日志)**
   - **后端API**: ✅ 已实现 (`GET /api/admin/audit-logs`)
   - **前端实现**: ❌ 未实现
     - 后端路由在 `backend/src/routes/adminAuditLogs.js`
     - 但前端没有对应的管理页面
   - **建议**: 创建admin审计日志查看页面

2. **Admin离线订单工作流阶段配置**
   - **后端API**: ✅ 已实现
     - `GET /api/admin/offline-orders/config/stages` - 获取阶段配置
     - `PUT /api/admin/offline-orders/config/stages` - 更新阶段配置
   - **前端实现**: ❌ 未实现
     - API已定义但可能没有管理界面
   - **建议**: 在admin离线订单页面添加阶段配置功能

---

## 三、前端占位符组件

### 3.1 占位符价格显示
- **位置**: `apps/web/src/components/product/PixelPerfectProductDetail.tsx`
- **组件**: `PlaceholderPrice`
- **说明**: 当价格数据缺失时显示占位符，这是正常的降级处理

### 3.2 占位符图片显示
- **位置**: `apps/web/src/components/product/PixelPerfectProductDetail.tsx`
- **组件**: `PlaceholderImage`
- **说明**: 当图片缺失时显示占位符，这是正常的降级处理

### 3.3 占位符产品数据
- **位置**: `apps/web/src/components/product/detail/dataAdapter.ts`
- **说明**: 当品牌数据缺失时使用占位符名称，这是正常的降级处理

---

## 四、API路径不匹配问题

### 4.1 密码修改API路径不匹配
- **前端定义**: `POST /auth/change-password`
- **后端实现**: `PUT /api/auth/me/password`
- **影响**: 密码修改功能无法正常工作
- **建议**: 修复前端API路径为 `PUT /auth/me/password`

### 4.2 地址API路径不匹配
- **前端定义**: `POST /addresses/:id/set-default` (行538)
- **后端实现**: `PATCH /addresses/:id/set-default` (backend/src/routes/addresses.js 行36)
- **影响**: 设置默认地址功能可能无法正常工作
- **建议**: 修复前端API方法为 `PATCH`

---

## 五、需要确认的功能

### 5.1 Design Lab功能完整性
- Design Lab Native (`apps/web/public/design-lab-native/`) 中有多个TODO
- 需要确认这些功能是否真的需要实现，还是已经通过其他方式实现

### 5.2 邮件通知功能
- 后端有多个TODO关于邮件通知
- 需要确认是否需要实现邮件通知功能，如果需要，需要配置邮件服务

### 5.3 Admin权限中间件
- 所有admin路由目前都注释掉了 `requireAdmin` 中间件
- 需要确认何时重新启用，以及如何实现admin登录UX

---

## 六、建议优先级

### 🔴 高优先级 (P0)

1. **修复密码修改API路径不匹配** - 影响用户账户安全
2. **修复地址API方法不匹配** - 影响地址管理功能
3. **实现密码重置功能** - 重要的用户体验功能

### 🟡 中优先级 (P1)

1. **实现用户偏好设置** - 提升用户体验
2. **实现Design Lab模板功能** - 提升Design Lab可用性
3. **实现设计评论功能** - 社交功能
4. **实现Admin审计日志页面** - 管理功能

### 🟢 低优先级 (P2)

1. **实现邮件通知功能** - 需要配置邮件服务
2. **完成Design Lab Native中的TODO** - 功能改进
3. **实现验证码登录** - 可选功能

---

## 七、总结

### 已实现但未使用
- 密码重置API（前端未实现UI）
- 用户偏好设置API（前端未实现）
- 设计模板API（部分使用）
- 设计评论API（未使用）
- Admin审计日志API（未使用）

### 需要修复
- 密码修改API路径不匹配
- 地址API方法不匹配

### 占位符和TODO
- 邮件通知功能（后端TODO）
- Design Lab Native中的多个TODO
- Admin权限中间件（待启用）

---

**报告生成时间**: 2025-01-27
**检查范围**: 全站代码
**检查工具**: grep, codebase_search, 手动代码审查

