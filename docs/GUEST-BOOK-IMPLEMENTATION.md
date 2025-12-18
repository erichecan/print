# 留言本功能实现文档

**实现时间**: 2025-12-10 00:00:00  
**功能**: 在 help center 添加留言本，并将所有 chat now 链接指向留言本

---

## 一、功能概述

### 1. 留言本功能
- 用户在 help center 可以提交留言
- 留言保存到数据库，作为 admin 后台的 notification
- Admin 可以在后台查看、管理留言

### 2. Chat Now 链接统一
- 所有网站的 "Chat Now" 或相关 chat 功能都链接到留言本
- 统一用户体验，简化客服流程

---

## 二、实现内容

### 1. 数据库模型

**文件**: `prisma/schema.prisma`

创建了 `GuestMessage` 模型：
- `id`: UUID 主键
- `name`: 姓名（必填）
- `email`: 邮箱（必填）
- `phone`: 电话（可选）
- `subject`: 主题（可选）
- `message`: 留言内容（必填，Text 类型）
- `orderNumber`: 订单号（可选）
- `status`: 状态（UNREAD/READ/ARCHIVED）
- `readAt`: 阅读时间
- `readBy`: 阅读者 ID
- `readByUser`: 阅读者关系（关联 User 模型）
- `createdAt`: 创建时间
- `updatedAt`: 更新时间

### 2. 后端 API

**控制器**: `backend/src/controllers/guestMessageController.js`
- `createGuestMessage`: 创建留言（公开接口）
- `listGuestMessages`: 获取留言列表（管理员）
- `getGuestMessage`: 获取单个留言（管理员）
- `updateGuestMessageStatus`: 更新留言状态（管理员）
- `deleteGuestMessage`: 删除留言（管理员）

**路由**: `backend/src/routes/guestMessages.js`
- `POST /api/guest-messages`: 创建留言
- `GET /api/admin/guest-messages`: 获取留言列表
- `GET /api/admin/guest-messages/:id`: 获取单个留言
- `PATCH /api/admin/guest-messages/:id/status`: 更新状态
- `DELETE /api/admin/guest-messages/:id`: 删除留言

**集成**: `backend/src/app.js`
- 添加了 `/api` 路由，使用 `guestMessages` 路由

### 3. 前端组件

**留言本表单**: `apps/web/src/components/help/GuestBookForm.tsx`
- 表单字段：姓名、邮箱、电话、主题、留言、订单号
- 表单验证：姓名、邮箱、留言为必填
- 提交成功后显示成功消息
- 错误处理：显示错误消息

**Help Center 集成**: `apps/web/src/app/help/HelpClient.tsx`
- 在 help center 页面底部添加留言本表单
- 使用 `#guestbook` 锚点，方便直接跳转

**Admin 通知页面**: `apps/web/src/app/admin/notifications/page.tsx`
- 留言列表：显示所有留言，支持状态筛选
- 留言详情：点击查看完整留言内容
- 状态管理：可以标记为已读、归档
- 删除功能：可以删除留言
- 分页功能：支持分页浏览
- 未读计数：显示未读留言数量

**Admin 导航**: `apps/web/src/components/admin/AdminShell.tsx`
- 添加了 "Notifications" 导航项
- 添加了通知图标

**翻译**: `apps/web/src/translations/admin.ts`
- 添加了 `notifications` 翻译键（英文和中文）

### 4. Chat Now 链接更新

更新了以下文件中的 Chat Now 链接：
1. `apps/web/src/components/SiteHeader.tsx` - 网站头部
2. `apps/web/src/components/home/HomeMobileClient.tsx` - 移动端首页
3. `apps/web/src/app/design-lab/DesignLabClient.tsx` - Design Lab
4. `apps/web/src/app/design-lab/DesignLabClient5.0.tsx` - Design Lab 5.0

所有链接都指向 `/help#guestbook`

---

## 三、使用说明

### 1. 用户提交留言

1. 访问 `/help` 页面
2. 滚动到底部，找到 "Leave a Message" 表单
3. 填写表单（姓名、邮箱、留言为必填）
4. 点击 "Submit Message" 提交
5. 提交成功后显示成功消息

### 2. Admin 查看留言

1. 登录 admin 后台
2. 点击左侧导航的 "Notifications"
3. 查看留言列表：
   - 可以按状态筛选（ALL/UNREAD/READ/ARCHIVED）
   - 未读留言会显示红色边框和未读计数
4. 点击留言查看详情
5. 可以更新状态（标记为已读、归档）
6. 可以删除留言

---

## 四、数据库迁移

运行以下命令创建数据库迁移：

```bash
npx prisma migrate dev --name add_guest_messages
```

或者在生产环境：

```bash
npx prisma migrate deploy
```

---

## 五、API 端点

### 公开接口

- `POST /api/guest-messages`
  - 请求体：
    ```json
    {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "1234567890",
      "subject": "Order inquiry",
      "message": "I have a question about my order",
      "orderNumber": "ORD-123"
    }
    ```
  - 响应：
    ```json
    {
      "id": "uuid",
      "message": "Message submitted successfully"
    }
    ```

### 管理员接口（需要认证）

- `GET /api/admin/guest-messages?status=UNREAD&page=1&limit=20`
- `GET /api/admin/guest-messages/:id`
- `PATCH /api/admin/guest-messages/:id/status`
  - 请求体：`{ "status": "READ" }`
- `DELETE /api/admin/guest-messages/:id`

---

## 六、文件清单

### 新增文件
- `prisma/schema.prisma` (更新)
- `backend/src/controllers/guestMessageController.js`
- `backend/src/routes/guestMessages.js`
- `apps/web/src/components/help/GuestBookForm.tsx`
- `apps/web/src/app/admin/notifications/page.tsx`

### 修改文件
- `backend/src/app.js`
- `apps/web/src/app/help/HelpClient.tsx`
- `apps/web/src/components/SiteHeader.tsx`
- `apps/web/src/components/home/HomeMobileClient.tsx`
- `apps/web/src/app/design-lab/DesignLabClient.tsx`
- `apps/web/src/app/design-lab/DesignLabClient5.0.tsx`
- `apps/web/src/components/admin/AdminShell.tsx`
- `apps/web/src/translations/admin.ts`

---

## 七、注意事项

1. **数据库迁移**: 需要运行 Prisma 迁移来创建 `guest_messages` 表
2. **认证**: Admin 接口需要管理员认证，使用 `authenticateAdmin` 中间件
3. **邮件通知**: 创建留言时会尝试发送邮件通知（可选，失败不影响留言创建）
4. **状态管理**: 留言状态包括 UNREAD（未读）、READ（已读）、ARCHIVED（归档）
5. **阅读记录**: 当管理员标记为已读时，会记录阅读时间和阅读者

---

## 八、后续优化建议

1. **实时通知**: 可以添加 WebSocket 或 Server-Sent Events 实现实时通知
2. **邮件回复**: 可以在 admin 后台直接回复留言，发送邮件给用户
3. **搜索功能**: 在 admin 后台添加搜索功能，按姓名、邮箱、订单号搜索
4. **批量操作**: 支持批量标记为已读、批量删除
5. **统计功能**: 显示留言统计（总数、未读数、今日新增等）

---

## 九、时间戳

- **实现时间**: 2025-12-10 00:00:00
- **数据库模型**: GuestMessage + GuestMessageStatus enum
- **后端 API**: 5 个端点（1 个公开，4 个管理员）
- **前端组件**: 2 个（留言本表单 + Admin 通知页面）
- **链接更新**: 4 个文件

