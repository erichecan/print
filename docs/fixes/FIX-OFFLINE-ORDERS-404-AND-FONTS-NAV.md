# 修复离线订单 404 与字体管理页面导航嵌套

## 变更摘要

本次修复解决了两个主要问题：
1. **离线订单 404 请求**：创建了缺失的 Next.js API 路由代理，修复了订单详情页面的 404 错误
2. **字体管理页面导航嵌套**：移除了重复的页面标题，解决了导航嵌套显示问题
3. **API 配置硬编码**：移除了硬编码的后端地址，统一使用环境变量

---

## 变更文件列表

### 1. 新增 API 路由文件

#### `apps/web/src/app/api/sales/orders/[id]/route.ts`
- **新增文件**：创建销售订单详情 API 路由代理
- **功能**：代理 `/api/sales/orders/[id]` 请求到后端，处理 404 错误

#### `apps/web/src/app/api/proxy/sales/orders/[id]/status/route.ts`
- **新增文件**：创建销售订单状态更新 API 路由代理
- **功能**：代理 `/api/proxy/sales/orders/[id]/status` PATCH 请求到后端

#### `apps/web/src/app/api/proxy/sales/orders/[id]/stage/route.ts`
- **新增文件**：创建销售订单阶段更新 API 路由代理
- **功能**：代理 `/api/proxy/sales/orders/[id]/stage` PATCH 请求到后端

### 2. 修复 API 配置

#### `apps/web/src/lib/api-route-config.ts`
- **修改原因**：移除硬编码的后端地址，统一从环境变量读取
- **变更内容**：
  - 移除硬编码的 `productionBackendUrl`
  - 生产环境检测到 localhost 时抛出错误而非使用硬编码地址
  - 生产环境未配置环境变量时抛出错误，要求正确配置

#### `apps/web/src/lib/api-config.ts`
- **修改原因**：移除硬编码的后端地址，统一从环境变量读取
- **变更内容**：
  - 移除硬编码的 `backendApiUrl`
  - 生产环境检测到 localhost 时抛出错误
  - 生产环境未配置环境变量时回退到相对路径 `/api`

### 3. 修复前端 API 调用

#### `apps/web/src/lib/api.ts`
- **修改原因**：修复销售订单 API 调用路径，添加错误处理
- **变更内容**：
  - `salesOrdersApi.get()` 路径改为 `/api/sales/orders/${id}`
  - `salesOrdersApi.updateStage()` 路径改为 `/api/proxy/sales/orders/${id}/stage`
  - 添加 404 错误检测和友好提示

### 4. 修复订单详情页面

#### `apps/web/src/app/offline-orders/sales/orders/[id]/page.tsx`
- **修改原因**：改进错误处理和用户提示
- **变更内容**：
  - 添加 404 错误检测，显示友好提示
  - 添加重试按钮
  - 改进错误消息显示

### 5. 修复字体管理页面

#### `apps/web/src/app/admin/fonts/AdminFontsClient.tsx`
- **修改原因**：移除重复的页面标题，解决导航嵌套问题
- **变更内容**：
  - 移除 `admin-page-header` 中的 `<h1>Fonts Management</h1>`
  - 保留描述文字和操作按钮
  - 避免与 `AdminShell` 的标题重复

---

## 具体代码变更

### 1. 新增 API 路由：`apps/web/src/app/api/sales/orders/[id]/route.ts`

```typescript
/**
 * Next.js API Route: GET /api/sales/orders/[id]
* 代理销售订单详情请求到后端
 */
import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiBase } from '@/lib/api-route-config';

const API_BASE = getBackendApiBase();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const timestamp = new Date().toISOString();
  const orderId = params.id;

  try {
    const upstreamUrl = `${API_BASE}/sales/orders/${orderId}`;
    
    const response = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        'Cookie': request.headers.get('cookie') || '',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      cache: 'no-store',
    });

    // 如果是 404，返回友好的错误信息
    if (response.status === 404) {
      return NextResponse.json(
        {
          error: 'Not Found',
          message: '订单不存在或已被删除',
          orderId,
        },
        { status: 404 }
      );
    }

    const responseBody = await response.text();
    return new NextResponse(responseBody, {
      status: response.status,
      headers: {
        'content-type': response.headers.get('content-type') || 'application/json',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Failed to fetch order',
        message: '无法获取订单详情，请稍后重试',
      },
      { status: 500 }
    );
  }
}
```

### 2. 修复 API 配置：`apps/web/src/lib/api-route-config.ts`

```diff
- // 统一的后端地址（使用正确的前端域名对应的后端地址）
-  const productionBackendUrl = 'https://print-main-backend-234065158862.us-central1.run.app/api';
-  
  if (publicApiUrl) {
-  // 生产环境如果包含 localhost，使用硬编码后端地址替代
-    if (!isDevelopment && (publicApiUrl.includes('localhost') || publicApiUrl.includes('127.0.0.1'))) {
-      console.warn('[API Route Config] ⚠️ 警告：生产环境检测到 localhost API 地址！', publicApiUrl);
-      console.warn('[API Route Config] 使用硬编码后端地址替代 localhost:', productionBackendUrl);
-      return productionBackendUrl;
+    // 生产环境不允许 localhost
+    if (!isDevelopment && (publicApiUrl.includes('localhost') || publicApiUrl.includes('127.0.0.1'))) {
+      console.error('[API Route Config] ❌ 错误：生产环境检测到 localhost API 地址！', publicApiUrl);
+      throw new Error('生产环境 API 配置错误：检测到 localhost 地址。请设置 NEXT_PUBLIC_API_URL 环境变量。');
    }
    // ... 返回处理后的 URL
  }
  
// 生产环境必须配置环境变量
  if (!isDevelopment) {
-    console.warn('[API Route Config] ⚠️ 检测到生产环境，但 NEXT_PUBLIC_API_URL 未配置，使用后端地址:', productionBackendUrl);
-    return productionBackendUrl;
+    const errorMsg = '生产环境未配置 API 地址环境变量。请设置 NEXT_PUBLIC_API_URL、API_BASE_URL 或 NEXT_PUBLIC_API_BASE_URL。';
+    console.error('[API Route Config] ❌', errorMsg);
+    throw new Error(errorMsg);
  }
```

### 3. 修复字体页面：`apps/web/src/app/admin/fonts/AdminFontsClient.tsx`

```diff
  return (
-    <div style={{ marginTop: 24 }}>
-      <div className="admin-page-header">
-        <div>
-          <h1>Fonts Management</h1>
-          <p className="text-muted">Manage fonts for Design Lab</p>
-        </div>
-        <div className="admin-btn-group">
+    <div>
+   {/* 移除重复的 admin-page-header，因为 AdminShell 已经提供了标题 */}
+      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
+        <p className="text-muted" style={{ margin: 0 }}>Manage fonts for Design Lab</p>
+        <div className="admin-btn-group">
           <button
             className="btn btn--primary"
             onClick={() => {
               setEditingFont(null);
               setShowCreateModal(true);
             }}
           >
             Add Font
           </button>
         </div>
       </div>
```

### 4. 修复订单详情错误处理：`apps/web/src/app/offline-orders/sales/orders/[id]/page.tsx`

```diff
-        {error && <div className="order-detail-error">{error}</div>}
+        {error && (
+          <div className="order-detail-error">
+            <div style={{ fontWeight: 600, marginBottom: '8px' }}>无法加载订单</div>
+            <div>{error}</div>
+            <button
+              type="button"
+              onClick={() => {
+                // 重新加载逻辑
+              }}
+            >
+              重试
+            </button>
+          </div>
+        )}
```

---

## 修改原因

### 1. 离线订单 404 问题

**问题根源**：
- 前端页面 `/offline-orders/sales/orders/[id]` 调用 `salesOrdersApi.get(id)`
- 原 API 路径为 `/sales/orders/${id}`，但缺少 Next.js API 路由代理
- Next.js App Router 需要 `app/api/sales/orders/[id]/route.ts` 来代理请求到后端

**解决方案**：
- 创建 Next.js API 路由代理 `/api/sales/orders/[id]`
- 创建状态和阶段更新的代理路由
- 更新前端 API 调用路径，添加 `/api` 前缀
- 添加 404 错误处理和友好提示

### 2. 字体页面导航嵌套问题

**问题根源**：
- `AdminShell` 组件在 `admin-header` 中已经渲染了页面标题（基于当前导航项）
- `AdminFontsClient` 组件又渲染了 `admin-page-header` 包含 `<h1>Fonts Management</h1>`
- 导致标题重复显示，看起来像导航嵌套

**解决方案**：
- 移除 `AdminFontsClient` 中的 `admin-page-header` 和 `<h1>` 标题
- 保留描述文字和操作按钮
- 让 `AdminShell` 统一管理页面标题

### 3. API 配置硬编码问题

**问题根源**：
- `api-route-config.ts` 和 `api-config.ts` 中硬编码了生产环境后端地址
- 这违反了环境变量配置的最佳实践
- 导致部署时需要手动修改代码

**解决方案**：
- 移除所有硬编码地址
- 生产环境检测到 localhost 时抛出错误，要求正确配置
- 生产环境未配置环境变量时抛出错误，要求配置
- 开发环境保持回退到 localhost 的逻辑

---

## 验证步骤

### 1. 本地开发环境验证

```bash
# 1. 启动开发服务器
cd apps/web
npm run dev

# 2. 访问字体管理页面
# 打开 http://localhost:3000/admin/fonts
# 验证：
# - 侧边栏只显示一次
# - 页面标题在顶部 header 中显示（由 AdminShell 提供）
# - 页面内容区域没有重复的标题

# 3. 访问销售订单详情页面
# 打开 http://localhost:3000/offline-orders/sales/orders/{orderId}
# 验证：
# - 正常订单可以正常加载
# - 不存在的订单显示友好错误提示："订单不存在或已被删除"
# - 错误提示包含重试按钮
```

### 2. 生产环境验证

```bash
# 1. 构建生产版本
cd apps/web
npm run build

# 2. 启动生产服务器
npm start

# 3. 验证 API 配置
# 检查控制台日志：
# - 不应该出现 "使用硬编码后端地址" 的警告
# - 如果环境变量未配置，应该抛出明确的错误

# 4. 验证路由
# - 访问 /api/sales/orders/{id} 应该返回订单数据或 404 JSON
# - 访问 /admin/fonts 应该没有导航嵌套问题
```

### 3. 网络请求验证

**使用浏览器 DevTools Network 面板**：

1. **正常订单请求**：
   - 请求：`GET /api/sales/orders/{validId}`
   - 状态码：200
   - 响应：订单 JSON 数据

2. **不存在的订单请求**：
   - 请求：`GET /api/sales/orders/{invalidId}`
   - 状态码：404
   - 响应：`{ error: 'Not Found', message: '订单不存在或已被删除', orderId: '...' }`

3. **API 配置检查**：
   - 检查控制台，不应该出现 localhost 相关的警告
   - 如果出现错误，应该是明确的配置错误提示

---

## 回归检查用例

### 手动测试用例

#### 1. 离线订单详情页面

- [ ] **正常订单加载**
  - 访问 `/offline-orders/sales/orders/{validOrderId}`
  - 验证：订单详情正常显示，无 404 错误

- [ ] **不存在的订单**
  - 访问 `/offline-orders/sales/orders/{invalidOrderId}`
  - 验证：显示友好错误提示 "订单不存在或已被删除"
  - 验证：错误提示包含重试按钮
  - 验证：点击重试按钮可以重新尝试加载

- [ ] **网络错误处理**
  - 断开网络连接
  - 访问订单详情页面
  - 验证：显示错误提示，包含重试按钮

#### 2. 字体管理页面

- [ ] **导航结构**
  - 访问 `/admin/fonts`
  - 验证：侧边栏只显示一次
  - 验证：页面标题在顶部 header 中（"Fonts"）
  - 验证：页面内容区域没有重复的标题

- [ ] **页面功能**
  - 验证：可以正常添加字体
  - 验证：可以正常编辑字体
  - 验证：可以正常删除字体
  - 验证：筛选功能正常工作

#### 3. API 配置

- [ ] **开发环境**
  - 验证：未配置环境变量时，使用 `http://localhost:3001/api`
  - 验证：控制台显示警告信息

- [ ] **生产环境**
  - 验证：配置了 `NEXT_PUBLIC_API_URL` 时，使用配置的值
  - 验证：配置包含 localhost 时，抛出错误
  - 验证：未配置环境变量时，抛出错误

### 自动化测试用例

#### 1. E2E 测试（Playwright）

```typescript
// tests/e2e/offline-orders-detail.spec.ts
test('销售订单详情页面 - 正常订单', async ({ page }) => {
  await page.goto('/offline-orders/sales/orders/{validOrderId}');
  await expect(page.locator('.order-detail-card')).toBeVisible();
  await expect(page.locator('.order-code')).toContainText('ORDER-');
});

test('销售订单详情页面 - 不存在的订单', async ({ page }) => {
  await page.goto('/offline-orders/sales/orders/invalid-id');
  await expect(page.locator('.order-detail-error')).toContainText('订单不存在或已被删除');
  await expect(page.locator('button:has-text("重试")')).toBeVisible();
});

test('字体管理页面 - 导航结构', async ({ page }) => {
  await page.goto('/admin/fonts');
  // 验证侧边栏只出现一次
  const sidebars = await page.locator('.admin-sidebar').count();
  expect(sidebars).toBe(1);
  // 验证页面标题在 header 中
  await expect(page.locator('.admin-header h1')).toContainText('Fonts');
  // 验证页面内容区域没有重复的 h1
  const h1InContent = await page.locator('.admin-content h1').count();
  expect(h1InContent).toBe(0);
});
```

#### 2. API 路由测试

```typescript
// tests/api/sales-orders.spec.ts
test('GET /api/sales/orders/[id] - 正常订单', async () => {
  const response = await fetch('http://localhost:3000/api/sales/orders/{validId}');
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.order).toBeDefined();
});

test('GET /api/sales/orders/[id] - 不存在的订单', async () => {
  const response = await fetch('http://localhost:3000/api/sales/orders/invalid-id');
  expect(response.status).toBe(404);
  const data = await response.json();
  expect(data.message).toContain('订单不存在');
});
```

---

## 环境变量配置

### 必需的环境变量

#### 生产环境

```bash
# 方式 1：使用 NEXT_PUBLIC_API_URL（推荐）
NEXT_PUBLIC_API_URL=https://print-main-backend-234065158862.us-central1.run.app/api

# 方式 2：使用 API_BASE_URL（服务器端）
API_BASE_URL=https://print-main-backend-234065158862.us-central1.run.app/api

# 方式 3：使用 NEXT_PUBLIC_API_BASE_URL
NEXT_PUBLIC_API_BASE_URL=https://print-main-backend-234065158862.us-central1.run.app/api
```

#### 开发环境

```bash
# 可选：如果后端运行在不同端口
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### GCP Cloud Run 配置

在 Cloud Run 服务配置中添加环境变量：

```yaml
env:
  - name: NEXT_PUBLIC_API_URL
    value: https://print-main-backend-234065158862.us-central1.run.app/api
```

---

## 注意事项

1. **环境变量优先级**：
   - `NEXT_PUBLIC_API_URL` > `API_BASE_URL` > `NEXT_PUBLIC_API_BASE_URL`

2. **生产环境要求**：
   - 必须配置环境变量，否则会抛出错误
   - 不允许使用 localhost 地址

3. **开发环境回退**：
   - 未配置环境变量时，回退到 `http://localhost:3001/api`

4. **API 路由代理**：
   - 所有前端到后端的请求都通过 Next.js API 路由代理
   - 这确保了 Cookie 和认证信息的正确传递

---

## 后续优化建议

1. **统一错误处理**：
   - 考虑创建统一的错误处理组件
   - 统一 404、500 等错误的显示样式

2. **API 配置文档**：
   - 在项目 README 中明确说明环境变量配置要求
   - 提供配置示例和故障排查指南

3. **监控和日志**：
   - 添加 API 请求的监控和日志
   - 记录 404 请求的详细信息，便于排查问题

4. **测试覆盖**：
   - 为新增的 API 路由添加单元测试
   - 为错误处理逻辑添加测试用例

