# API Proxy 404 错误深度分析

**分析时间**: 2025-12-08 05:05:00  
**错误信息**: `GET /api/proxy/cart 404 (Not Found)` 和 `POST /api/proxy/cart/items 404 (Not Found)`

## 🔍 问题分析

### 错误现象
1. **请求 URL**: 
   - `GET https://print-main-frontend-234065158862.us-central1.run.app/api/proxy/cart`
   - `POST https://print-main-frontend-234065158862.us-central1.run.app/api/proxy/cart/items`

2. **错误信息**: 
   - `404 (Not Found)`
   - `Error: Route not found`

3. **错误来源**: 
   - 错误是从 API 客户端 (`api.ts`) 返回的，不是 Next.js 的路由系统
   - 说明请求根本没有到达 Next.js API 路由处理器

### 根本原因分析

#### 1. 路由文件位置和结构
- ✅ 路由文件存在：`apps/web/src/app/api/proxy/[...path]/route.ts`
- ✅ 文件结构正确：使用了 catch-all 路由 `[...path]`
- ❓ 可能问题：Next.js 15 中 catch-all 路由的参数处理

#### 2. Next.js 15 路由匹配问题

在 Next.js 15 中，catch-all 路由 `[...path]` 的行为可能有变化：

**问题 1: 参数类型定义**
- Next.js 15 中，`params` 总是 `Promise`，必须 `await`
- 我们的代码已经处理了这个问题，但可能还有其他问题

**问题 2: 路由导出方式**
- 之前使用 `export const GET = handleProxyRequest`
- 现在改为直接导出函数 `export async function GET`
- 这应该能解决问题

**问题 3: 参数名和类型**
- Catch-all 路由 `[...path]` 的参数名应该是 `path`
- 类型应该是 `string[]` 或 `Promise<string[]>`
- 对于 `/api/proxy/cart`，`path` 应该是 `['cart']`
- 对于 `/api/proxy/cart/items`，`path` 应该是 `['cart', 'items']`

#### 3. 可能的原因

**原因 A: 路由没有被 Next.js 识别**
- 如果 Next.js 没有识别到路由文件，会直接返回 404
- 这可能是构建时的问题，或者文件路径问题

**原因 B: 参数解析失败**
- 如果参数解析失败，路由处理器可能没有被调用
- 或者参数类型不匹配导致路由不匹配

**原因 C: 构建产物问题**
- 如果构建时路由文件没有被正确包含，部署后就会 404
- 需要检查构建日志确认路由文件是否被处理

## 🔧 修复方案

### 修复 1: 改进参数处理
```typescript
// 确保正确处理 Next.js 15 的异步 params
const resolvedParams = await Promise.resolve(context.params);
params = resolvedParams as { path: string[] };
```

### 修复 2: 直接导出函数
```typescript
// 改为直接导出函数，而不是通过 const
export async function GET(request: NextRequest, context: RouteContext) {
  return handleProxyRequest(request, context);
}
```

### 修复 3: 增强错误处理和日志
- 添加详细的日志记录参数解析过程
- 添加错误处理，确保即使参数解析失败也能返回有意义的错误

## 📋 验证步骤

### 1. 检查构建日志
查看构建日志，确认：
- 路由文件是否被正确编译
- 是否有任何警告或错误

### 2. 检查运行时日志
部署后，查看 Cloud Run 日志：
- 是否有 `[API Proxy]` 相关的日志
- 如果没有，说明路由根本没有被调用

### 3. 测试路由匹配
直接访问路由，查看：
- 是否返回 404（路由未匹配）
- 是否返回其他错误（路由已匹配但处理失败）

## 🎯 关键发现

**"Route not found" 错误的来源**：
- 这个错误不是 Next.js 返回的
- 而是从 `api.ts` 中的 `api()` 函数返回的
- 说明请求根本没有到达 Next.js API 路由

**这意味着**：
1. Next.js 路由系统没有识别到这个路由
2. 或者路由文件在构建时没有被正确包含
3. 或者部署的代码版本不包含最新的路由文件

## ✅ 下一步

1. **重新构建和部署**：确保最新的路由文件被包含
2. **检查构建日志**：确认路由文件被正确处理
3. **检查运行时日志**：确认路由是否被调用
4. **如果仍然 404**：检查 Next.js 版本和路由配置

