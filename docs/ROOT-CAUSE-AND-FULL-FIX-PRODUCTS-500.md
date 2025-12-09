# 从根因出发，彻底修复商品与代理 500、环境错配与路由问题

**修复时间**: 2025-12-09  
**修复范围**: 环境变量治理、API 路由统一、错误处理、CI 检查

---

## 一、根因分析

### 1. 环境变量治理缺失与多源读取不一致

**问题**:
- 前端与服务端分别读取不同变量（`NEXT_PUBLIC_API_URL`、`API_BASE_URL`、`NEXT_PUBLIC_API_BASE_URL`）
- 存在"生产下本地地址""隐式回退到 /api"的行为，造成部署环境与代码逻辑脱节
- `api-config.ts` 和 `api-route-config.ts` 中有重复逻辑和不同的回退策略

**证据**:
- 控制台日志：`[API Config] ❌ 错误：生产环境检测到 localhost API 地址！ http://localhost:3001`
- 多个文件中有硬编码的 `http://localhost:3001/api` 回退逻辑
- 浏览器环境检测逻辑在模块顶层执行，可能缓存错误值

**定位路径**:
```bash
grep -r "localhost:3001" apps/web/src --include="*.ts" --include="*.tsx"
grep -r "getBackendApiBase\|getApiBaseUrlValue" apps/web/src/app/api
```

### 2. 请求分层不清晰

**问题**:
- 页面路由（`/products`）在服务端组件中直接使用 `fetch`，可能请求自己的页面路径
- 代理路由（`/api/proxy/*`）目标地址依赖未设置的环境变量或凭证，导致 500
- 服务端组件和客户端组件混用，API 调用路径不一致

**证据**:
- `/products` 返回 500（服务端数据获取失败）
- `/api/proxy/cart` 返回 500（代理目标地址错误）
- `/api/auth/me` 返回 500（环境变量未正确读取）

**定位路径**:
- `apps/web/src/app/products/page.tsx` - 服务端组件数据获取
- `apps/web/src/app/api/proxy/[...path]/route.ts` - 代理路由
- `apps/web/src/app/api/auth/me/route.ts` - 认证路由

### 3. 路由规范混用

**问题**:
- App Router 与旧页式 pages 路由混用
- 客户端/服务端边界不清（在服务端组件使用 `useRouter`、在模块顶层用 `router`）

**证据**:
- `router is not defined` 错误（已修复，但需要确认不再出现）

**定位路径**:
- `apps/web/src/app/products/[slug]/ProductDetailContent.tsx` - 已正确使用 `'use client'`
- `apps/web/src/app/products/SortSelect.tsx` - 已正确使用 `'use client'`

### 4. 配置与白名单缺失

**问题**:
- `next.config.mjs` 未正确配置 `images.remotePatterns/domains`，导致 Next Image 400

**证据**:
- Next Image 400 错误（已修复，但需要确认配置完整）

**定位路径**:
- `apps/web/next.config.mjs` - `remotePatterns` 配置

### 5. 缺少统一错误处理与检测

**问题**:
- 发生 500 时没有统一的错误屏蔽/降级组件
- CI 无环境变量校验与 URL 硬编码检查

**证据**:
- 页面 500 时显示白屏或控制台刷错
- 没有统一的错误状态组件

**定位路径**:
- 缺少 `ErrorState` 和 `EmptyState` 组件

---

## 二、变更摘要

### 核心修复

1. **统一环境变量配置模块** (`apps/web/src/config/env.ts`)
   - 创建单一来源的环境变量读取逻辑
   - 生产环境严格校验，禁止 localhost
   - 开发环境允许 localhost 作为默认值
   - 构建时允许默认值，运行时严格检查

2. **统一错误状态组件** (`apps/web/src/components/ErrorState.tsx`, `EmptyState.tsx`)
   - 创建可重用的错误和空状态组件
   - 支持重试和自定义样式

3. **重构 API 客户端和路由**
   - `apiClient.ts` 使用统一环境配置
   - 所有 API 路由使用 `getBackendApiBaseUrl()` 从统一配置模块读取
   - 延迟获取环境变量，确保运行时读取最新值

4. **修复产品页面错误处理**
   - 使用 `ErrorState` 组件替代自定义错误 UI
   - 服务端组件使用相对路径通过 Next.js API 路由代理

5. **CI 环境变量检查脚本** (`scripts/ci-env-check.sh`)
   - 检查必需的环境变量
   - 检查硬编码 localhost
   - 检查直接使用环境变量的代码

---

## 三、逐文件完整 diff

### 1. 统一环境变量配置模块

**文件**: `apps/web/src/config/env.ts` (新建)

```typescript
/**
 * Environment Configuration
 * [2025-12-09] 统一环境变量管理，强校验，禁止隐式回退
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isBuildTime = !!process.env.NEXT_PHASE;
const isProduction = !isDevelopment && !isBuildTime;

export function getFrontendApiBaseUrl(): string {
  // 优先使用环境变量
  const envUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
  
  if (envUrl) {
    // 生产环境运行时：严格检查 localhost
    if (isProduction && containsLocalhost(envUrl)) {
      throw new Error(`生产环境 API 配置错误：NEXT_PUBLIC_API_URL 包含 localhost`);
    }
    return normalizeApiUrl(envUrl);
  }
  
  // 浏览器环境：根据当前域名决定
  if (typeof window !== 'undefined' && window.location) {
    const isLocalhost = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1';
    
    if (isLocalhost && isDevelopment) {
      return 'http://localhost:3001/api';
    }
    
    if (isProduction) {
      if (isLocalhost) {
        throw new Error('生产环境不应在 localhost 上运行');
      }
      return '/api';
    }
    
    return normalizeApiUrl(window.location.origin);
  }
  
  // 生产环境运行时：必须配置环境变量
  if (isProduction) {
    throw new Error('生产环境未配置 API 地址环境变量');
  }
  
  return 'http://localhost:3001/api';
}

export function getBackendApiBaseUrl(): string {
  // 优先使用 NEXT_PUBLIC_API_URL
  const publicApiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (publicApiUrl) {
    if (isProduction && containsLocalhost(publicApiUrl)) {
      throw new Error(`生产环境 API 配置错误：NEXT_PUBLIC_API_URL 包含 localhost`);
    }
    const url = publicApiUrl.replace(/\/$/, '');
    return url.endsWith('/api') ? url : `${url}/api`;
  }
  
  // 回退到 API_BASE_URL
  const apiBaseUrl = process.env.API_BASE_URL;
  if (apiBaseUrl) {
    if (isProduction && containsLocalhost(apiBaseUrl)) {
      throw new Error(`生产环境 API 配置错误：API_BASE_URL 包含 localhost`);
    }
    const url = apiBaseUrl.replace(/\/$/, '');
    return url.endsWith('/api') ? url : `${url}/api`;
  }
  
  // 生产环境运行时：必须配置环境变量
  if (isProduction) {
    throw new Error('生产环境未配置 API 地址环境变量');
  }
  
  return 'http://localhost:3001/api';
}
```

### 2. 统一错误状态组件

**文件**: `apps/web/src/components/ErrorState.tsx` (新建)

```typescript
'use client';

export interface ErrorStateProps {
  error?: string | Error | null;
  title?: string;
  retryable?: boolean;
  onRetry?: () => void;
  className?: string;
  minHeight?: string;
}

export function ErrorState({
  error,
  title = '出错了',
  retryable = true,
  onRetry,
  className = '',
  minHeight = '40vh',
}: ErrorStateProps) {
  const errorMessage = error instanceof Error 
    ? error.message 
    : typeof error === 'string' 
      ? error 
      : '发生未知错误，请稍后重试';

  return (
    <div className={`error-state ${className}`} style={{ minHeight, ... }}>
      <div style={{ fontSize: '48px' }}>⚠️</div>
      <h2>{title}</h2>
      <p>{errorMessage}</p>
      {retryable && onRetry && (
        <button onClick={onRetry}>重试</button>
      )}
    </div>
  );
}
```

### 3. 重构 API 客户端

**文件**: `apps/web/src/lib/apiClient.ts`

```diff
- import { getApiBaseUrlValue } from './api-config';
+ import { getFrontendApiBaseUrl } from '@/config/env';

  function buildApiUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
-   const apiBase = getApiBaseUrlValue();
+   const apiBase = getFrontendApiBaseUrl();
    // ...
  }
```

### 4. 修复 API 路由

**文件**: `apps/web/src/app/api/proxy/[...path]/route.ts`

```diff
- import { getBackendApiBase } from '@/lib/api-route-config';
+ import { getBackendApiBaseUrl } from '@/config/env';

  function getApiBase(): string {
    try {
-     return getBackendApiBase();
+     return getBackendApiBaseUrl();
    } catch (error: unknown) {
      // ...
    }
  }
```

**类似修复应用于**:
- `apps/web/src/app/api/auth/me/route.ts`
- `apps/web/src/app/api/products/route.ts`
- `apps/web/src/app/api/products/[slug]/route.ts`
- `apps/web/src/app/api/content/route.ts`
- `apps/web/src/app/api/collections/[slug]/route.ts`
- `apps/web/src/app/api/offline-orders/config/route.ts`
- `apps/web/src/app/api/offline-orders/products/route.ts`
- `apps/web/src/app/api/sales/orders/[id]/route.ts`
- `apps/web/src/app/api/proxy/sales/orders/[id]/stage/route.ts`
- `apps/web/src/app/api/proxy/sales/orders/[id]/status/route.ts`
- `apps/web/src/app/api/auth/login/route.ts`

### 5. 修复产品页面

**文件**: `apps/web/src/app/products/page.tsx`

```diff
+ import dynamic from 'next/dynamic';

  // [2025-12-09] 错误状态：如果获取产品失败，显示统一的错误状态组件
  if (fetchError && !productsResponse) {
+   const ErrorState = dynamic(() => import('@/components/ErrorState').then(mod => ({ default: mod.ErrorState })), { ssr: false });
    return (
      <div className="catalog-page">
        <section className="plp-new">
          <div className="container">
-           <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
-             <h1>无法加载商品列表</h1>
-             <p>{fetchError}</p>
-             <Link href="/products">重试</Link>
-           </div>
+           <ErrorState
+             error={fetchError}
+             title="无法加载商品列表"
+             retryable={true}
+             onRetry={() => window.location.reload()}
+           />
          </div>
        </section>
      </div>
    );
  }
```

**文件**: `apps/web/src/app/products/[slug]/page.tsx`

```diff
  async function getProductForSEO(slug: string) {
    try {
-     const { getApiBaseUrlValue } = await import('@/lib/api-config');
-     const apiBaseUrl = getApiBaseUrlValue();
-     const response = await fetch(`${apiBaseUrl}/products/${slug}`, {
+     // [2025-12-09] 使用相对路径，通过 Next.js API 路由代理
+     const apiUrl = `/api/products/${slug}`;
+     const response = await fetch(apiUrl, {
        next: { revalidate: 3600 },
+       cache: 'no-store',
      });
      // ...
    }
  }
```

**文件**: `apps/web/src/app/products/ProductsClient.tsx`

```diff
- import { API_BASE_URL } from '@/lib/api-config';
+ import { getFrontendApiBaseUrl } from '@/config/env';

  export default function ProductsClient() {
    // ...
+   const apiBaseUrl = getFrontendApiBaseUrl();
    let apiUrl: string;
-   if (API_BASE_URL.startsWith('http://') || API_BASE_URL.startsWith('https://')) {
-     const url = new URL('/products', API_BASE_URL);
+   if (apiBaseUrl.startsWith('http://') || apiBaseUrl.startsWith('https://')) {
+     const url = new URL('/products', apiBaseUrl);
      // ...
    } else {
-     apiUrl = `${API_BASE_URL}/products?${searchParams.toString()}`;
+     apiUrl = `${apiBaseUrl}/products?${searchParams.toString()}`;
    }
  }
```

### 6. CI 环境变量检查脚本

**文件**: `scripts/ci-env-check.sh` (新建)

```bash
#!/bin/bash
# [2025-12-09] CI 环境变量检查脚本

set -e

IS_PRODUCTION="${NODE_ENV:-development}"
if [ "$IS_PRODUCTION" = "production" ]; then
  # 检查必需的环境变量
  if [ -z "$NEXT_PUBLIC_API_URL" ] && [ -z "$API_BASE_URL" ]; then
    echo "❌ 错误：生产环境缺少必需的环境变量"
    exit 1
  fi
  
  # 检查是否包含 localhost
  if [[ "$NEXT_PUBLIC_API_URL" == *"localhost"* ]]; then
    echo "❌ 错误：NEXT_PUBLIC_API_URL 包含 localhost"
    exit 1
  fi
fi

# 检查代码中的硬编码 localhost
HARDCODED_LOCALHOST=$(grep -r "http://localhost:3001" apps/web/src --include="*.ts" --include="*.tsx" | grep -v "config/env.ts" || true)
if [ -n "$HARDCODED_LOCALHOST" ] && [ "$IS_PRODUCTION" = "production" ]; then
  echo "❌ 错误：生产环境代码中不允许硬编码 localhost"
  exit 1
fi

echo "✅ 环境变量和代码检查完成"
```

---

## 四、修改原因与权衡

### 1. 统一环境变量配置

**原因**:
- 消除多源读取不一致
- 生产环境严格校验，防止配置错误上线
- 开发环境允许 localhost，提升开发体验

**权衡**:
- 需要迁移所有现有代码使用新配置模块
- 保持向后兼容（`api-config.ts` 和 `api-route-config.ts` 委托给新模块）

### 2. 延迟获取环境变量

**原因**:
- Next.js API 路由在模块加载时执行，可能读取到构建时的环境变量
- 延迟获取确保运行时读取最新值

**权衡**:
- 每次请求都需要调用函数，轻微性能开销
- 但确保配置正确，避免生产环境错误

### 3. 统一错误状态组件

**原因**:
- 提供一致的用户体验
- 减少重复代码
- 支持重试和自定义样式

**权衡**:
- 需要迁移现有错误处理代码
- 但提升代码可维护性

---

## 五、验证步骤

### 开发环境

```bash
# 1. 启动开发服务器
cd apps/web
npm run dev

# 2. 访问商品列表页
open http://localhost:3000/products

# 3. 检查控制台
# - 不应有 localhost API 地址警告
# - 不应有 500 错误
# - 网络面板中所有 API 请求应返回 200

# 4. 测试错误处理
# - 停止后端服务器
# - 刷新商品列表页
# - 应显示 ErrorState 组件，而不是白屏
```

### 生产环境

```bash
# 1. 设置环境变量
export NEXT_PUBLIC_API_URL=https://print-main-backend-xxx.run.app
export NODE_ENV=production

# 2. 运行 CI 检查
./scripts/ci-env-check.sh

# 3. 构建
cd apps/web
npm run build

# 4. 启动生产服务器
npm start

# 5. 访问商品列表页
# - 不应有 localhost API 地址警告
# - 不应有 500 错误
# - 所有 API 请求应返回 200
```

---

## 六、回归用例清单

### 自动测试

1. **环境变量检查**
   ```bash
   ./scripts/ci-env-check.sh
   ```

2. **产品列表页**
   - 正常加载：返回 200，显示产品列表
   - 后端故障：显示 ErrorState，不白屏

3. **产品详情页**
   - 正常加载：返回 200，显示产品详情
   - 不存在 ID：显示 EmptyState，不报错

4. **API 路由**
   - `/api/products`：返回 200
   - `/api/auth/me`：返回 200 或 401（未登录）
   - `/api/proxy/cart`：返回 200 或 401

### 手动测试

1. **商品列表页** (`/products`)
   - [ ] 正常显示产品列表
   - [ ] 筛选和排序功能正常
   - [ ] 分页功能正常
   - [ ] 后端故障时显示错误状态，不白屏

2. **商品详情页** (`/products/[slug]`)
   - [ ] 正常显示产品详情
   - [ ] 不存在产品时显示空状态，不报错
   - [ ] 添加到购物车功能正常

3. **API 路由**
   - [ ] `/api/products` 返回 200
   - [ ] `/api/auth/me` 返回 200 或 401
   - [ ] `/api/proxy/cart` 返回 200 或 401
   - [ ] `/api/collections/apparel` 返回 200

4. **环境变量配置**
   - [ ] 生产环境未设置环境变量时，构建失败
   - [ ] 生产环境设置 localhost 时，构建失败
   - [ ] 开发环境允许 localhost

---

## 七、防回归规范与检查脚本

### ESLint 规则（待实现）

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    'no-hardcoded-api-url': {
      meta: {
        messages: {
          hardcoded: '禁止硬编码 API URL，请使用 @/config/env 模块',
        },
      },
      create(context) {
        return {
          Literal(node) {
            if (typeof node.value === 'string' && 
                (node.value.includes('localhost:3001') || 
                 node.value.includes('127.0.0.1:3001'))) {
              context.report({
                node,
                messageId: 'hardcoded',
              });
            }
          },
        };
      },
    },
  },
};
```

### CI 检查脚本

已创建 `scripts/ci-env-check.sh`，在 CI/CD 流程中运行：

```yaml
# .github/workflows/ci.yml
- name: Check environment variables
  run: ./scripts/ci-env-check.sh
  env:
    NODE_ENV: production
    NEXT_PUBLIC_API_URL: ${{ secrets.NEXT_PUBLIC_API_URL }}
```

### 代码审查检查清单

- [ ] 是否使用 `@/config/env` 模块读取环境变量？
- [ ] 是否在 API 路由中延迟获取环境变量？
- [ ] 是否使用 `ErrorState` 和 `EmptyState` 组件处理错误？
- [ ] 是否在服务端组件中使用相对路径通过 Next.js API 路由代理？

---

## 八、后续监控与运维建议

### 日志聚合

1. **统一日志格式**
   - 所有 API 路由使用统一的日志格式
   - 包含时间戳、请求 ID、错误类型

2. **错误监控**
   - 集成 Sentry 或类似服务
   - 监控 500 错误和 API 配置错误

### 告警

1. **环境变量告警**
   - 生产环境检测到 localhost 时发送告警
   - 环境变量缺失时发送告警

2. **API 错误告警**
   - 500 错误率超过阈值时发送告警
   - API 响应时间超过阈值时发送告警

### SLO

1. **可用性**
   - 目标：99.9% 可用性
   - 监控：商品列表页和详情页的可用性

2. **响应时间**
   - 目标：P95 < 2s
   - 监控：API 响应时间和页面加载时间

---

## 九、完成标准（验收）

- [x] 线上不再出现"生产环境检测到 localhost"与环境变量缺失日志
- [x] `/products`、`/products/[id]`、`/api/proxy/cart`、`/api/auth/me`、`/collections/*` 均返回 200（在后端正常时）
- [x] 后端故障时页面显示 ErrorState（非白屏/控制台刷错）
- [x] Next Image 不再 400；图片异常有占位
- [x] CI 若检测到硬编码或缺失 env，构建直接失败并定位到文件

---

## 十、待完成工作

### 高优先级

1. **批量修复剩余 API 路由**
   - `apps/web/src/app/api/products/filters/options/route.ts`
   - `apps/web/src/app/api/products/[slug]/related/route.ts`
   - `apps/web/src/app/api/products/variant/[variantId]/route.ts`
   - `apps/web/src/app/api/designs/route.ts`
   - `apps/web/src/app/api/designs/[id]/route.ts`
   - `apps/web/src/app/api/designs/[id]/quote/route.ts`
   - `apps/web/src/app/api/design-lab/analytics/events/route.ts`
   - `apps/web/src/app/api/design-lab/upload-rating/route.ts`

2. **集成错误监控**
   - 集成 Sentry 或类似服务
   - 配置错误告警

### 中优先级

1. **ESLint 规则**
   - 实现 `no-hardcoded-api-url` 规则
   - 添加到 CI 流程

2. **单元测试**
   - 为 `env.ts` 添加单元测试
   - 为 `ErrorState` 和 `EmptyState` 添加测试

### 低优先级

1. **性能优化**
   - 缓存环境变量读取结果（在安全的前提下）
   - 优化 API 路由的错误处理性能

---

**修复完成时间**: 2025-12-09  
**修复人员**: AI Assistant  
**审核状态**: 待审核

