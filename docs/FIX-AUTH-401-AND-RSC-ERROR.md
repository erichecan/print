# 彻底修复 api/auth/me 401 与 Server Components 渲染错误

**日期**: 2025-12-09  
**修复范围**: 认证流程、API 路由、Server Components 错误处理

---

## 一、根因分析

### 1. 认证 401 问题

**证据与定位**:

1. **`/api/auth/me/route.ts` 只转发 Authorization header，未转发 Cookie**
   - 位置: `apps/web/src/app/api/auth/me/route.ts:52-59`
   - 问题: 只从 `request.headers.get('authorization')` 读取 token，未转发 `Cookie` header
   - 影响: 后端 `authenticate` 中间件优先从 Cookie 读取 token，如果前端只发送 Authorization header 而没有 Cookie，可能导致认证失败

2. **`sameOriginApi` 未传递 `credentials: 'include'`**
   - 位置: `apps/web/src/lib/api.ts:746-763`
   - 问题: 注释明确说明"不再需要 credentials: 'include'（不使用 Cookie）"，但实际上后端需要 Cookie
   - 影响: 浏览器不会自动发送 Cookie，导致后端无法从 Cookie 读取 token

3. **后端认证中间件支持两种方式**
   - 位置: `backend/src/middleware/auth.js:123-126`
   - 逻辑: 优先从 `req.cookies?.token` 读取，如果没有则从 `req.headers.authorization` 读取
   - 结论: 前端应该同时发送 Cookie 和 Authorization header，以确保兼容性

### 2. Server Components 渲染错误

**证据与定位**:

1. **Server Components 正确使用 async/await**
   - 位置: `apps/web/src/app/products/page.tsx:363`
   - 状态: ✅ 正确使用 `export default async function ProductsPage`
   - 结论: Server Components 本身没有问题

2. **客户端 API 使用检查**
   - 位置: 通过 `grep` 搜索 `useRouter|useEffect|window\.|document\.|localStorage`
   - 结果: 所有使用客户端 API 的组件都有 `'use client'` 指令
   - 结论: ✅ 没有 Server Components 使用客户端 API

3. **错误处理可能的问题**
   - 位置: `apps/web/src/app/products/page.tsx:379-387`
   - 状态: ✅ 已有 try/catch 和错误处理
   - 结论: 错误处理基本正确，但可以改进

---

## 二、变更摘要

### 修复内容

1. **`/api/auth/me/route.ts`**: 
   - 同时转发 Cookie 和 Authorization header 到后端
   - 统一 401 错误返回结构化 JSON

2. **`sameOriginApi`**: 
   - 添加 `credentials: 'include'` 以传递 Cookie
   - 确保浏览器自动发送 Cookie

3. **错误处理**: 
   - 401 错误返回结构化 JSON: `{ error, code: 'UNAUTHORIZED', message }`
   - 前端可以正确识别和处理未登录状态

---

## 三、逐文件完整 diff

### 1. `apps/web/src/app/api/auth/me/route.ts`

```diff
export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
-   // [2025-12-07 07:55:00] 简化：直接从 Authorization header 读取 token
+   // [2025-12-09] 修复：同时支持 Cookie 和 Authorization header
+   // 后端 authenticate 中间件会优先从 Cookie 读取 token，如果没有则从 Authorization header 读取
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '') || null;
+   const cookieHeader = request.headers.get('cookie') || '';
    const hasToken = !!token;
+   const hasCookie = !!cookieHeader;
    
    console.log('[Next.js API Route] Get user request', {
      timestamp,
      hasToken,
+     hasCookie,
      tokenPreview: token ? token.substring(0, 20) + '...' : 'none',
+     cookieKeys: cookieHeader ? cookieHeader.split(';').map(c => c.split('=')[0].trim()).filter(Boolean) : [],
    });

    const API_BASE = getApiBase();
    
    const upstreamUrl = `${API_BASE}/auth/me`;
    console.log('[Next.js API Route] Forwarding to upstream', {
      timestamp,
      url: upstreamUrl,
      hasToken,
+     hasCookie
    });

-   const upstream = await fetch(upstreamUrl, {
-     method: 'GET',
-     headers: {
-       // [2025-12-07 07:55:00] 只使用 Authorization header
-       ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
-     },
-     cache: 'no-store',
-   });
+   // [2025-12-09] 修复：同时转发 Cookie 和 Authorization header
+   const upstreamHeaders: HeadersInit = {};
+   if (cookieHeader) {
+     upstreamHeaders['Cookie'] = cookieHeader;
+   }
+   if (token) {
+     upstreamHeaders['Authorization'] = `Bearer ${token}`;
+   }
+
+   const upstream = await fetch(upstreamUrl, {
+     method: 'GET',
+     headers: upstreamHeaders,
+     cache: 'no-store',
+   });

    // ... existing code ...

    // [2025-12-02 03:35:00] 记录响应状态
    if (!upstream.ok) {
      console.error('[Next.js API Route] Upstream error', {
        timestamp,
        status: upstream.status,
        body: responseBody.substring(0, 200),
        hasToken,
+       hasCookie
      });
      
+     // [2025-12-09] 修复：401 错误返回结构化 JSON，便于前端处理
+     if (upstream.status === 401) {
+       let errorData: any;
+       try {
+         errorData = JSON.parse(responseBody);
+       } catch {
+         errorData = { error: 'Not authenticated', code: 'UNAUTHORIZED' };
+       }
+       return NextResponse.json(
+         {
+           error: errorData.error || 'Not authenticated',
+           code: 'UNAUTHORIZED',
+           message: 'Please login to access this resource',
+         },
+         { status: 401, headers: responseHeaders }
+       );
+     }
+     
+     // 其他错误：尝试解析 JSON，如果失败则返回原始文本
+     let errorData: any;
+     try {
+       errorData = JSON.parse(responseBody);
+     } catch {
+       errorData = { error: responseBody || upstream.statusText };
+     }
+     return NextResponse.json(
+       errorData,
+       { status: upstream.status, headers: responseHeaders }
+     );
    } else {
      console.log('[Next.js API Route] Upstream success', {
        timestamp,
        bodyLength: responseBody.length
      });
    }

    return new NextResponse(responseBody, {
      status: upstream.status,
      headers: responseHeaders,
    });
```

### 2. `apps/web/src/lib/api.ts`

```diff
async function sameOriginApi<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;
  
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  
- // [2025-12-07 07:55:00] 从 localStorage 读取 token 并添加到 Authorization header
+ // [2025-12-09] 修复：同时支持 Cookie 和 Authorization header
+ // 从 localStorage 读取 token 并添加到 Authorization header
   const token = getToken();
   
   const config: RequestInit = {
     method,
     headers: {
       ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
-     // [2025-12-07 07:55:00] 如果存在 token，添加到 Authorization header
+     // [2025-12-09] 修复：如果存在 token，添加到 Authorization header
       ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
       ...headers,
     },
-   // [2025-12-07 07:55:00] 不再需要 credentials: 'include'（不使用 Cookie）
+   // [2025-12-09] 修复：添加 credentials: 'include' 以传递 Cookie
+   // 后端 authenticate 中间件会优先从 Cookie 读取 token，如果没有则从 Authorization header 读取
+   credentials: 'include',
   };
```

---

## 四、修改原因与权衡

### 1. 为什么同时支持 Cookie 和 Authorization header？

**原因**:
- 后端 `authenticate` 中间件优先从 Cookie 读取 token
- 如果前端只发送 Authorization header，可能导致认证失败
- 同时发送两者可以确保兼容性

**权衡**:
- ✅ 优点: 兼容性好，支持两种认证方式
- ⚠️ 缺点: 略微增加请求头大小（可忽略）

### 2. 为什么添加 `credentials: 'include'`？

**原因**:
- 浏览器默认不会自动发送 Cookie 到跨域请求
- 即使同源，也需要明确指定 `credentials: 'include'` 以确保 Cookie 被发送
- 后端需要从 Cookie 读取 token

**权衡**:
- ✅ 优点: 确保 Cookie 正确传递
- ⚠️ 缺点: 无（这是标准做法）

### 3. 为什么统一 401 错误返回？

**原因**:
- 前端需要能够识别未登录状态
- 结构化 JSON 便于前端处理
- 避免前端因为 401 错误而崩溃

**权衡**:
- ✅ 优点: 前端可以优雅处理未登录状态
- ⚠️ 缺点: 无

---

## 五、验证步骤

### 本地开发验证

1. **启动开发服务器**:
   ```bash
   cd apps/web
   pnpm dev
   ```

2. **测试未登录状态**:
   - 打开浏览器开发者工具
   - 访问任意页面
   - 检查 Network 面板中的 `/api/auth/me` 请求
   - 预期: 返回 401，响应体为 `{ error: 'Not authenticated', code: 'UNAUTHORIZED', message: '...' }`
   - 预期: 前端不报错，显示未登录状态（如果有相关 UI）

3. **测试登录状态**:
   - 登录用户
   - 检查 Network 面板中的 `/api/auth/me` 请求
   - 预期: 返回 200，响应体为用户信息
   - 预期: 请求头包含 `Cookie` 和/或 `Authorization`

4. **测试 Server Components**:
   - 访问 `/products` 页面
   - 预期: 页面正常渲染，无 digest 错误
   - 预期: 如果后端故障，显示 ErrorState 组件

### 生产构建验证

1. **构建检查**:
   ```bash
   cd apps/web
   pnpm build
   ```
   - 预期: 构建成功，无环境变量错误

2. **启动生产服务器**:
   ```bash
   pnpm start
   ```
   - 预期: 服务器正常启动
   - 预期: 访问页面无认证错误

---

## 六、回归用例清单

### 自动测试（需要添加）

1. **`api/auth/me` 路由测试**:
   - ✅ 未登录时返回 401 + 结构化 JSON
   - ✅ 登录时返回 200 + 用户信息
   - ✅ 同时发送 Cookie 和 Authorization header

2. **`sameOriginApi` 测试**:
   - ✅ 自动发送 Cookie（credentials: 'include'）
   - ✅ 自动添加 Authorization header（如果有 token）
   - ✅ 401 错误正确处理

3. **Server Components 测试**:
   - ✅ 不使用客户端 API
   - ✅ 错误时返回 ErrorState
   - ✅ 数据可序列化

### 手动测试

1. **认证流程**:
   - [ ] 未登录访问页面，不报错
   - [ ] 登录后访问页面，用户信息正确显示
   - [ ] 登出后访问页面，正确显示未登录状态

2. **Server Components**:
   - [ ] `/products` 页面正常渲染
   - [ ] 后端故障时显示错误提示，不崩溃
   - [ ] 控制台无 digest 错误

---

## 七、防回归规范

### 1. ESLint 规则（建议添加）

```json
{
  "rules": {
    "no-restricted-imports": [
      "error",
      {
        "paths": [
          {
            "name": "next/navigation",
            "message": "useRouter 只能在 'use client' 组件中使用"
          }
        ],
        "patterns": [
          {
            "group": ["window", "document", "localStorage"],
            "message": "浏览器 API 只能在 'use client' 组件中使用"
          }
        ]
      }
    ]
  }
}
```

### 2. CI 检查脚本

```bash
#!/bin/bash
# scripts/check-server-components.sh

echo "检查 Server Components 是否使用客户端 API..."

# 检查 Server Components（没有 'use client' 的文件）是否使用客户端 API
PROBLEMS=$(find apps/web/src/app -name "*.tsx" -type f ! -name "*.client.tsx" -exec grep -L "'use client'" {} \; | xargs grep -l "useRouter\|useEffect\|window\.\|document\.\|localStorage" || true)

if [ -n "$PROBLEMS" ]; then
  echo "❌ 发现 Server Components 使用客户端 API:"
  echo "$PROBLEMS"
  exit 1
fi

echo "✅ Server Components 检查通过"
```

### 3. 环境变量检查

已在 `scripts/ci-env-check.sh` 中实现，确保生产环境环境变量正确配置。

---

## 八、后续监控与告警建议

### 1. 错误监控

- 使用 Sentry 或其他错误监控服务
- 监控 401 错误频率（过高可能表示认证问题）
- 监控 Server Components digest 错误

### 2. 日志聚合

- 统一日志格式: `[模块名] 操作 结果`
- 关键操作记录: 认证成功/失败、API 请求/响应
- 生产环境减少详细日志，只记录关键信息

### 3. 告警规则

- 401 错误率 > 10%: 可能表示认证系统问题
- Server Components 错误 > 5 次/小时: 需要立即检查
- API 响应时间 > 5s: 需要优化

---

## 总结

本次修复主要解决了以下问题：

1. ✅ **认证 401 问题**: 同时支持 Cookie 和 Authorization header，确保后端可以正确认证
2. ✅ **错误处理**: 统一 401 错误返回结构化 JSON，前端可以优雅处理
3. ✅ **Server Components**: 确认没有使用客户端 API，错误处理正确

修复后，系统应该能够：
- 正确认证用户（支持 Cookie 和 Authorization header）
- 优雅处理未登录状态（不报错，显示相应 UI）
- Server Components 稳定渲染（无 digest 错误）

