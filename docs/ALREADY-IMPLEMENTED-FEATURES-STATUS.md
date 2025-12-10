# 已实现但未集成到当前版本的功能清单

**分析时间**: 2025-12-10  
**基础版本**: `660a722` (周日晚上可工作版本)  
**当前版本**: 阶段 1-8 已完成

---

## 一、已实现但未集成的功能

### 1.1 图层管理高级功能 ✅ **已实现**

**实现位置**:
- `apps/web/src/app/design-lab/components/panels/LayerManagementPanel.tsx`
- `apps/web/src/contexts/designLabStore.ts`

**已实现的功能**:
- ✅ **拖拽排序图层** (`handleDragStart`, `handleDragOver`, `handleDrop`)
  - 使用 HTML5 Drag & Drop API
  - 支持在分组内和分组间拖拽
  - 自动更新画布中对象的 Z-index
  
- ✅ **锁定/解锁图层** (`handleToggleLock`, `handleToggleGroupLock`)
  - 每个图层都有锁定/解锁按钮
  - 锁定后图层不可选择和编辑
  - 分组也支持锁定/解锁（批量操作）
  
- ✅ **图层分组功能** (`handleCreateGroup`, `handleUngroup`)
  - 创建分组：选择 2+ 图层后点击 "Group" 按钮
  - 分组展开/折叠
  - 分组可见性控制
  - 分组锁定/解锁
  - 取消分组

**文档**: `docs/DESIGN-LAB-LAYER-MANAGEMENT-IMPLEMENTATION.md`

**状态**: ✅ 已实现，但需要确认是否已集成到当前版本

---

### 1.2 设计模板功能 ✅ **已实现**

**实现位置**:
- `apps/web/src/app/design-lab/components/panels/TemplateLibraryPanel.tsx`
- `apps/web/src/lib/api.ts` (行 2530-2551) - `templateApi`
- `backend/src/controllers/designTemplateController.js`
- `prisma/schema.prisma` - `DesignTemplate` 模型

**已实现的功能**:
- ✅ **后端 API** (`/api/templates`)
  - `GET /api/templates` - 获取模板列表
  - `GET /api/templates/:id` - 获取模板详情
  - `POST /api/templates/:id/like` - 点赞模板
  
- ✅ **前端 API 定义** (`templateApi`)
  - `list()` - 获取模板列表
  - `getById()` - 获取模板详情
  - `like()` - 点赞模板
  
- ✅ **前端 UI 组件** (`TemplateLibraryPanel.tsx`)
  - 模板分类列表
  - 模板列表显示
  - 应用模板功能

**状态**: ✅ 已实现，但需要确认是否已集成到当前版本

---

### 1.3 设计评论功能 ✅ **已实现**

**实现位置**:
- `backend/src/controllers/designCommentController.js`
- `apps/web/src/lib/api.ts` (行 2564-2582) - `designCommentApi`
- `prisma/schema.prisma` - `DesignComment` 模型

**已实现的功能**:
- ✅ **后端 API** (`/api/designs/:id/comments`)
  - `GET /api/designs/:id/comments` - 获取评论列表
  - `POST /api/designs/:id/comments` - 创建评论
  - `POST /api/comments/:id/like` - 点赞评论
  
- ✅ **前端 API 定义** (`designCommentApi`)
  - `list()` - 获取评论列表
  - `create()` - 创建评论
  - `like()` - 点赞评论

**状态**: ✅ 后端和 API 已实现，但前端 UI 未实现

---

### 1.4 邮件通知功能 ✅ **部分实现**

**实现位置**:
- `backend/src/services/orderService.js` (行 161-162, 265)
- `backend/src/controllers/webhookController.js` (行 201)

**已实现的功能**:
- ✅ **订单确认邮件** (`40a5de9` - 2025-12-06)
  - `feat: [P0] 订单确认邮件完善 (#4)`

**待实现的功能**:
- ❌ 订单状态更新通知邮件 (TODO)
- ❌ 取消确认邮件 (TODO)
- ❌ 支付失败通知邮件 (TODO)

**状态**: ⚠️ 部分实现，需要配置邮件服务（SendGrid、AWS SES 等）

---

### 1.5 用户偏好设置功能 ✅ **已实现**

**实现位置**:
- `apps/web/src/app/account/settings/page.tsx`
- `apps/web/src/lib/api.ts` - `userPreferencesApi`
- `backend/src/routes/userPreferences.js`

**已实现的功能**:
- ✅ 邮件通知偏好（订单更新、促销、新闻通讯、产品更新）
- ✅ SMS通知偏好（订单更新、促销）
- ✅ 隐私设置（个人资料可见性、显示邮箱、显示电话）
- ✅ 实时保存和加载偏好设置

**文档**: `docs/IMPLEMENTATION-PROGRESS.md`

**状态**: ✅ 已实现并可用

---

### 1.6 Admin 审计日志功能 ✅ **已实现**

**实现位置**:
- `apps/web/src/app/admin/audit-logs/page.tsx`
- `apps/web/src/lib/api.ts` - `adminAuditLogsApi`
- `backend/src/routes/adminAuditLogs.js`

**已实现的功能**:
- ✅ 查看所有系统活动和管理操作
- ✅ 筛选功能（按目标类型、目标ID、操作类型）
- ✅ 分页显示
- ✅ 显示详细信息（时间、操作者、IP地址、元数据）
- ✅ 已添加到Admin导航菜单

**文档**: `docs/IMPLEMENTATION-PROGRESS.md`

**状态**: ✅ 已实现并可用

---

## 二、需要检查的功能

### 2.1 Design Lab Native 集成

**位置**: `apps/web/public/design-lab-native/app.js`

**TODO 项**:
1. 根据 variantId 加载产品数据并设置到 store (行28)
2. 可以在这里调用 API 获取产品信息并更新显示 (行287)
3. 保存设计名称（TODO: 保存到 store）(行304)
4. 实现添加到购物车功能 (行818)
5. 加载产品列表（占位）(行840)
6. 更新其他面的底图 (行893)

**状态**: ⚠️ 需要检查这些功能是否已在其他位置实现

---

### 2.2 导出功能

**需要检查**:
- PNG 导出功能
- SVG 导出功能
- PDF 导出功能

**状态**: ❓ 需要检查是否已实现

---

## 三、集成建议

### 3.1 高优先级（立即集成）

1. **图层管理高级功能**
   - 确认 `LayerManagementPanel.tsx` 是否已集成到当前版本
   - 如果未集成，需要添加到 `DesignLabClient.tsx`

2. **设计模板功能**
   - 确认 `TemplateLibraryPanel.tsx` 是否已集成到当前版本
   - 如果未集成，需要添加到 `DesignLabClient.tsx`

### 3.2 中优先级（近期集成）

1. **设计评论功能**
   - 后端和 API 已实现
   - 需要实现前端 UI 组件
   - 添加到设计详情页

2. **Design Lab Native 集成**
   - 检查 TODO 项是否已在其他位置实现
   - 如果未实现，需要完成这些功能

### 3.3 低优先级（后续集成）

1. **导出功能**
   - 检查是否已实现
   - 如果未实现，需要开发

2. **邮件通知功能**
   - 部分实现（订单确认邮件）
   - 需要配置邮件服务
   - 完成剩余的 TODO 项

---

## 四、检查步骤

### 4.1 检查当前版本是否包含这些功能

```bash
# 检查图层管理功能
grep -r "handleDragStart\|handleToggleLock\|handleCreateGroup" apps/web/src/app/design-lab/

# 检查模板功能
grep -r "TemplateLibraryPanel\|templateApi" apps/web/src/app/design-lab/

# 检查评论功能
grep -r "designCommentApi\|DesignComment" apps/web/src/app/
```

### 4.2 检查文件是否存在

```bash
# 检查图层管理面板
ls -la apps/web/src/app/design-lab/components/panels/LayerManagementPanel.tsx

# 检查模板库面板
ls -la apps/web/src/app/design-lab/components/panels/TemplateLibraryPanel.tsx
```

---

## 五、总结

### 5.1 已实现但可能未集成的功能

- ✅ 图层管理高级功能（拖拽排序、锁定/解锁、分组）
- ✅ 设计模板功能（后端 API + 前端组件）
- ✅ 设计评论功能（后端 API + 前端 API 定义，但缺少 UI）
- ✅ 用户偏好设置功能（已实现并可用）
- ✅ Admin 审计日志功能（已实现并可用）
- ⚠️ 邮件通知功能（部分实现）

### 5.2 需要确认的功能

- ❓ Design Lab Native 集成（TODO 项）
- ❓ 导出功能（PNG/SVG/PDF）

### 5.3 建议

1. **立即检查**当前版本是否包含图层管理和模板功能
2. **如果未包含**，需要将这些功能集成到当前版本
3. **完成设计评论功能**的前端 UI 实现
4. **检查 Design Lab Native** 的 TODO 项是否已在其他位置实现

---

**最后更新**: 2025-12-10  
**下一步**: 检查当前版本是否包含这些功能，如果未包含，制定集成计划

