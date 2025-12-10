# Design Lab 4.0 重写方案——稳定初始化 + 100% UI 复刻 + 复用2.0/3.0优点

**版本**: 4.0  
**创建时间**: 2025-01-30 23:00:00  
**状态**: 📋 设计文档  
**目标**: 系统性重写 Design Lab，实现 100% 稳定初始化与 100% UI 复刻

---

## 目录

- [一、4.0 设计总纲（目标态）](#一40-设计总纲目标态)
- [二、初始化问题的根因回溯与改进策略](#二初始化问题的根因回溯与改进策略)
- [三、复用与重写清单](#三复用与重写清单)
- [四、代码与配置改动（真实 diff）](#四代码与配置改动真实-diff)
- [五、测试与 CI](#五测试与-ci)
- [六、验收清单（对照 PRD 与 UI 复刻）](#六验收清单对照-prd-与-ui-复刻)
- [七、发布与监控建议](#七发布与监控建议)

---

## 一、4.0 设计总纲（目标态）

### 1.1 初始化架构（分层与阶段划分）

#### 阶段 1: Boot 阶段（超轻量、零业务）
**目标**: 环境变量校验、路由/平台检测、错误边界与占位 UI 挂载

**职责**:
- 验证必需的环境变量（构建时 fail）
- 检测运行环境（浏览器/SSR/构建时）
- 挂载全局错误边界
- 渲染基础骨架 UI（无业务逻辑）

**输出**: 
- 环境变量校验结果
- 错误边界已挂载
- 基础骨架 UI 已渲染

**失败处理**: 显示错误页面，阻止继续初始化

---

#### 阶段 2: Config 阶段
**目标**: 加载静态配置（fonts/artwork 分类、images 白名单）、主题与全局样式、i18n

**职责**:
- 加载字体分类配置（静态 JSON）
- 加载素材库分类配置（静态 JSON）
- 配置 Next.js Image 白名单
- 加载主题配置（颜色、字体、间距）
- 初始化 i18n（如果使用）

**输出**:
- 配置对象已加载
- 主题已应用
- 图片白名单已配置

**失败处理**: 使用默认配置，记录警告，继续初始化

---

#### 阶段 3: Data Prefetch 阶段
**目标**: 仅加载初始化必需的数据（产品/颜色、默认设计或空白设计、会话态）

**职责**:
- 从 URL 参数获取 `productId`、`colorId`、`designId`
- 加载产品信息（如果 `productId` 存在）
- 加载产品颜色列表（如果 `productId` 存在）
- 加载设计数据（如果 `designId` 存在）
- 获取用户会话（可选，不阻塞）

**输出**:
- 产品信息已加载（或使用默认产品）
- 产品颜色已加载（或使用默认颜色）
- 设计数据已加载（或创建空白设计）

**失败处理**: 使用默认产品/颜色，创建空白设计，记录错误，继续初始化

---

#### 阶段 4: Canvas Ready 阶段
**目标**: 画布引擎初始化完毕，支持对象创建/编辑

**职责**:
- 动态导入 Fabric.js
- 初始化 Fabric Canvas 实例
- 配置画布属性（尺寸、DPI、缩放）
- 加载产品背景图
- 恢复设计数据到画布（如果存在）
- 绑定画布事件（选择、拖拽、缩放等）

**输出**:
- Fabric Canvas 实例已创建
- 背景图已加载
- 设计数据已恢复（如果有）
- 画布事件已绑定

**失败处理**: 显示错误提示，提供重试按钮，阻止进入下一阶段

---

#### 阶段 5: Feature Hydration 阶段
**目标**: Names & Numbers、报价模块、素材库高级功能、字体预览等再逐步注水

**职责**:
- 延迟加载字体预览数据
- 延迟加载素材库完整数据
- 初始化报价计算模块
- 初始化 Names & Numbers 模块
- 初始化其他高级功能

**输出**:
- 所有功能模块已就绪

**失败处理**: 模块级错误状态，不影响其他模块，提供重试机制

---

### 1.2 错误边界与兜底

#### Boot 阶段错误处理
- **环境变量缺失/非法**: 构建时 fail，运行时显示错误页面
- **路由错误**: 显示 404 页面，提供返回首页链接
- **平台检测失败**: 使用默认配置，记录警告

#### Config 阶段错误处理
- **配置加载失败**: 使用默认配置，记录警告，继续初始化
- **主题加载失败**: 使用默认主题，记录警告

#### Data Prefetch 阶段错误处理
- **产品加载失败**: 使用默认产品，记录错误
- **设计加载失败**: 创建空白设计，记录错误
- **会话获取失败**: 继续初始化（匿名模式）

#### Canvas Ready 阶段错误处理
- **Fabric.js 加载失败**: 显示错误提示，提供重试按钮
- **画布初始化失败**: 显示错误提示，提供重试按钮
- **背景图加载失败**: 使用占位图，记录错误

#### Feature Hydration 阶段错误处理
- **模块加载失败**: 显示模块级错误状态，不影响其他模块
- **数据加载失败**: 显示空状态，提供重试按钮

---

### 1.3 UI 规范

#### 100% 复刻 Custom Ink（按 PRD 第3章-第13章的结构与交互）

**组件清单与映射关系**:

| PRD 章节 | 组件路径 | 验收项 |
|---------|---------|--------|
| 第3章 - 顶部栏 | `components/Header.tsx` | Logo、My Designs、Untitled、Talk/Chat/SignIn、Cart |
| 第4章 - 左侧功能栏 | `components/DarkRail.tsx` | Upload、Add Text、Add Art、Product Colors、Add Names |
| 第5章 - 画布视图 | `components/Canvas.tsx` | Front/Back/Sleeve 切换、Zoom、对象编辑 |
| 第6章 - 字体选择器 | `components/panels/FontSelector.tsx` | 分类、搜索、预览 |
| 第6章 - 素材库 | `components/panels/ArtPanel.tsx` | 分类、搜索、分页 |
| 第7章 - Names & Numbers | `components/modals/NamesNumbersModal.tsx` | Tools、My List、My Quantities |
| 第8章 - Get Price | `components/modals/GetPriceFlowModal.tsx` | 起始页、Ordering Options、Quantity、Order Options |
| 第9章 - 底部操作区 | `components/BottomBar.tsx` | Add Products、产品卡、Save\|Share、Get Price |
| 第10章 - 撤销/重做 | `components/UndoRedo.tsx` | Undo、Redo 按钮 |
| 第10章 - 分层 | `components/panels/LayerManagementPanel.tsx` | Bring to Front、Send to Back、Forward、Backward |
| 第10章 - 安全区 | `components/Canvas.tsx` | 安全区边界显示、越界警示 |

**验收标准**:
- 每个组件必须提供 skeleton 加载状态
- 每个组件必须提供错误兜底 UI
- 交互行为与 Custom Ink 100% 一致
- 视觉样式与 Custom Ink 100% 一致

---

### 1.4 代码资产复用策略

#### 可复用的模块/函数/组件

| 来源路径 | 优点 | 4.0 如何接入 |
|---------|------|-------------|
| `apps/web/src/contexts/designLabStore.ts` | Zustand + Immer，状态管理清晰 | 保留，添加初始化状态跟踪 |
| `apps/web/src/lib/customink-images.ts` | 产品图片 URL 生成逻辑 | 保留，添加错误处理 |
| `apps/web/src/app/design-lab/components/panels/*` | 面板组件结构完整 | 保留，添加 skeleton 和 error fallback |
| `apps/web/src/app/design-lab/components/modals/*` | 模态框组件完整 | 保留，添加初始化校验 |
| `apps/web/src/lib/api.ts` | API 封装完整 | 保留，统一使用 apiClient |

#### 必须淘汰/重写的部分

| 来源路径 | 问题描述 | 4.0 的替代方案 |
|---------|---------|---------------|
| `apps/web/src/app/design-lab/DesignLabClient.tsx` | 初始化逻辑混乱，无阶段划分 | 重写为分阶段初始化架构 |
| `apps/web/src/config/env.ts` | 自动回退逻辑，生产环境可能使用 localhost | 重写为构建时 fail，无隐式回退 |
| `apps/web/src/app/design-lab/page.tsx` | RSC 中使用客户端 API | 重写为纯服务端组件，仅返回可序列化数据 |
| 所有直接使用 `window`/`document`/`localStorage` 的 RSC | TDZ 错误，环境错配 | 移到客户端组件，RSC 仅做数据拼装 |

---

## 二、初始化问题的根因回溯与改进策略

### 2.1 导致 3.0 初始化失败的点

#### 问题 1: 环境变量错配与多源读取
**现象**:
- `NEXT_PUBLIC_API_URL`、`API_BASE_URL`、`NEXT_PUBLIC_API_BASE_URL` 三个变量混用
- 自动回退到 `/api` 的逻辑在生产环境可能失效
- 构建时未设置正确的值，运行时使用 localhost

**根因**:
- 环境变量读取逻辑分散在多个文件
- 自动回退逻辑在服务端和客户端不一致
- 构建时和运行时环境变量不一致

**4.0 改进**:
- 统一使用 `apps/web/src/config/env.ts`
- 构建时校验：缺失或 localhost 直接 fail
- 运行时校验：生产环境缺失或 localhost 直接 fail
- 移除所有自动回退逻辑

---

#### 问题 2: RSC 中错误未兜底，或服务端组件使用客户端 API
**现象**:
- `useRouter`、`window`、`document`、`localStorage` 在 RSC 中使用
- 错误冒泡到 RSC，导致白屏
- 服务端组件使用客户端 API，导致环境错配

**根因**:
- RSC 和客户端组件边界不清晰
- 错误边界未在 RSC 层挂载
- 服务端组件中直接使用客户端 API

**4.0 改进**:
- 严格 RSC 边界：服务端组件仅做数据拼装，返回可序列化数据
- 客户端组件承接所有交互与重试
- 在 Boot 阶段挂载错误边界
- 静态检查：禁止 RSC 中使用客户端 API

---

#### 问题 3: 请求层分散、不可控的预取
**现象**:
- 路由预取引发 404
- `_rsc` 参数干扰
- 请求分散在多个文件，无法统一控制

**根因**:
- Next.js 路由预取默认开启
- 对不存在页面的预取（如 `/chat`）
- 请求封装不统一

**4.0 改进**:
- 移除对不存在页面的预取
- 统一使用 `apiClient`，禁止散落 fetch/axios
- 对动态段与 `_rsc` 参数进行忽略与安全处理

---

#### 问题 4: 变量声明顺序与异步数据依赖导致 TDZ
**现象**:
- "Cannot access 'X' before initialization"
- 变量在声明前使用
- 异步数据依赖导致竞态

**根因**:
- 变量声明顺序错误
- 异步数据依赖未正确处理
- 状态初始化顺序混乱

**4.0 改进**:
- 变量提前声明，使用条件渲染
- 分阶段初始化，确保依赖顺序
- 使用 ref 跟踪初始化状态

---

#### 问题 5: Next Image 白名单与 URL 编码问题导致 400
**现象**:
- 图片 URL 不在白名单中，返回 400
- URL 编码问题导致图片加载失败

**根因**:
- Next.js Image 组件需要配置 `remotePatterns`
- URL 编码不一致

**4.0 改进**:
- 在 Config 阶段配置图片白名单
- 统一 URL 编码处理
- 提供占位图 fallback

---

#### 问题 6: Stripe 等第三方初始化未做空值防护
**现象**:
- Stripe 初始化时 key 为空，抛出错误
- 第三方 SDK 初始化失败导致页面崩溃

**根因**:
- 第三方 SDK 初始化前未检查环境变量
- 错误未捕获

**4.0 改进**:
- 初始化前检查环境变量
- 提供空值防护
- 错误捕获与降级处理

---

## 三、复用与重写清单

### 3.1 保留与复用

#### 状态管理
- **来源**: `apps/web/src/contexts/designLabStore.ts`
- **优点**: Zustand + Immer，状态管理清晰，支持撤销/重做
- **4.0 接入**: 保留，添加初始化状态跟踪字段

#### 产品图片 URL 生成
- **来源**: `apps/web/src/lib/customink-images.ts`
- **优点**: 统一的图片 URL 生成逻辑
- **4.0 接入**: 保留，添加错误处理与占位图

#### 面板组件
- **来源**: `apps/web/src/app/design-lab/components/panels/*`
- **优点**: 组件结构完整，交互逻辑清晰
- **4.0 接入**: 保留，添加 skeleton 和 error fallback

#### 模态框组件
- **来源**: `apps/web/src/app/design-lab/components/modals/*`
- **优点**: 模态框组件完整，交互逻辑清晰
- **4.0 接入**: 保留，添加初始化校验

#### API 封装
- **来源**: `apps/web/src/lib/api.ts`
- **优点**: API 封装完整，类型定义清晰
- **4.0 接入**: 保留，统一使用 `apiClient`

---

### 3.2 淘汰与重写

#### DesignLabClient.tsx
- **来源**: `apps/web/src/app/design-lab/DesignLabClient.tsx`
- **问题**: 初始化逻辑混乱，无阶段划分，错误处理不完善
- **4.0 替代**: 重写为分阶段初始化架构，每个阶段独立，错误处理完善

#### env.ts（部分逻辑）
- **来源**: `apps/web/src/config/env.ts`
- **问题**: 自动回退逻辑，生产环境可能使用 localhost
- **4.0 替代**: 重写为构建时 fail，无隐式回退

#### page.tsx
- **来源**: `apps/web/src/app/design-lab/page.tsx`
- **问题**: RSC 中使用客户端 API
- **4.0 替代**: 重写为纯服务端组件，仅返回可序列化数据

---

### 3.3 模块映射（按 PRD）

| PRD 模块 | 初始化所需的最小数据 | 可延迟的次要数据 | 失败兜底 UI |
|---------|-------------------|----------------|------------|
| Upload | 无 | Recent Uploads 列表 | 空状态提示 |
| Add Text | 无 | 字体列表 | 空状态提示 |
| Add Art | 素材分类列表 | 素材详情 | 空状态提示 |
| Product Colors | 产品颜色列表 | 颜色详情 | 默认颜色 |
| Names & Numbers | 无 | 价格配置 | 禁用状态 |
| Get Price | 产品信息、颜色信息 | 报价计算 | 错误提示 |
| Cart | 购物车数据 | 购物车详情 | 空购物车 |
| Zoom | 无 | 无 | 禁用状态 |
| Layering | 画布对象列表 | 对象详情 | 空状态提示 |
| Center | 无 | 无 | 禁用状态 |
| 安全区 | 产品尺寸 | 无 | 隐藏安全区 |

---

## 四、代码与配置改动（真实 diff）

### 4.1 环境与请求

#### 文件: `apps/web/src/config/env.ts`

```diff
/**
 * Environment Configuration
- * [2025-12-09] 统一环境变量管理，强校验，禁止隐式回退
+ * [2025-01-30 23:00:00] Design Lab 4.0: 构建时 fail，无隐式回退
 * 
 * 原则：
 * 1. 生产环境必须配置环境变量，不允许 localhost
 * 2. 开发环境允许 localhost 作为默认值
- * 3. 构建时允许默认值，运行时严格检查
- * 4. 禁止隐式回退到 /api，必须明确配置
+ * 3. 构建时严格检查，缺失或 localhost 直接 fail
+ * 4. 运行时严格检查，缺失或 localhost 直接 fail
+ * 5. 禁止所有隐式回退逻辑
 */

 const isDevelopment = process.env.NODE_ENV === 'development';
 const isBuildTime = !!process.env.NEXT_PHASE;
 const isProduction = !isDevelopment && !isBuildTime;

+/**
+ * 构建时环境变量校验
+ * [2025-01-30 23:00:00] Design Lab 4.0: 构建时 fail，无隐式回退
+ */
+export function validateEnvAtBuildTime(): void {
+   if (isBuildTime || isProduction) {
+     const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
+     
+     if (!apiUrl) {
+       throw new Error(
+         '❌ 构建时环境变量缺失: NEXT_PUBLIC_API_URL 或 NEXT_PUBLIC_API_BASE_URL 必须设置'
+       );
+     }
+     
+     if (containsLocalhost(apiUrl)) {
+       throw new Error(
+         `❌ 构建时环境变量非法: NEXT_PUBLIC_API_URL 包含 localhost (${apiUrl})，生产环境不允许使用 localhost`
+       );
+     }
+   }
+ }

 export function getFrontendApiBaseUrl(): string {
   // 优先使用环境变量
   const envUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
   
   if (envUrl) {
-    // [2025-12-09] 修复：在浏览器环境中，如果检测到 localhost，自动回退到相对路径
-    // 这是因为 NEXT_PUBLIC_* 变量在构建时内联，如果构建时未设置正确的值，就会使用 localhost
-    // 在浏览器环境中，我们可以安全地回退到相对路径，通过 Next.js API 路由代理
-    if (typeof window !== 'undefined' && isProduction && containsLocalhost(envUrl)) {
-      console.warn('[Env Config] ⚠️ 检测到 localhost API 地址，自动回退到相对路径 /api');
-      console.warn('[Env Config] 提示：下次部署时请在构建时设置正确的 NEXT_PUBLIC_API_URL 环境变量');
-      return '/api';
-    }
-    
-    // 服务端环境（SSR）：如果检测到 localhost，抛出错误（因为服务端需要知道真实的后端地址）
-    if (typeof window === 'undefined' && isProduction && containsLocalhost(envUrl)) {
+    // [2025-01-30 23:00:00] Design Lab 4.0: 生产环境检测到 localhost，直接 fail
+    if (isProduction && containsLocalhost(envUrl)) {
       const errorMsg = `生产环境 API 配置错误：NEXT_PUBLIC_API_URL 包含 localhost (${envUrl})。请设置正确的生产环境 API 服务器地址。`;
       console.error('[Env Config] ❌', errorMsg);
       throw new Error(errorMsg);
     }
     
     return normalizeApiUrl(envUrl);
   }
   
-  // 浏览器环境：根据当前域名决定
-  if (typeof window !== 'undefined' && window.location) {
-    const isLocalhost = window.location.hostname === 'localhost' || 
-                        window.location.hostname === '127.0.0.1';
-    
-    // 开发环境且是 localhost，直接指向后端服务器
-    if (isLocalhost && isDevelopment) {
-      return 'http://localhost:3001/api';
-    }
-    
-    // 生产环境：统一使用相对路径，通过 Next.js API 路由代理
-    if (isProduction) {
-      if (isLocalhost) {
-        throw new Error('生产环境不应在 localhost 上运行。请检查部署配置。');
-      }
-      // [2025-12-09] 生产环境统一使用相对路径，通过 Next.js API 路由代理
-      return '/api';
-    }
-    
-    // 开发环境其他情况，使用同源 URL
-    return normalizeApiUrl(window.location.origin);
-  }
-  
-  // SSR/构建时：检查部署 URL
-  const deployUrl = process.env.DEPLOY_URL || process.env.URL;
-  if (deployUrl) {
-    return normalizeApiUrl(deployUrl);
-  }
-  
-  // 生产环境运行时：必须配置环境变量
+  // [2025-01-30 23:00:00] Design Lab 4.0: 生产环境运行时，必须配置环境变量，无隐式回退
   if (isProduction) {
     const errorMsg = '生产环境未配置 API 地址环境变量。请设置 NEXT_PUBLIC_API_URL 或 NEXT_PUBLIC_API_BASE_URL。';
     console.error('[Env Config] ❌', errorMsg);
     throw new Error(errorMsg);
   }
   
-  // 开发环境或构建时：允许回退到 localhost
-  if (isBuildTime) {
-    console.warn('[Env Config] ⚠️ 构建时未配置 API 地址，使用默认值（运行时需要配置环境变量）: http://localhost:3001/api');
-  } else {
-    console.warn('[Env Config] ⚠️ 开发环境未配置 API 地址，使用默认值: http://localhost:3001/api');
-  }
+  // 开发环境：允许回退到 localhost
+  console.warn('[Env Config] ⚠️ 开发环境未配置 API 地址，使用默认值: http://localhost:3001/api');
   return 'http://localhost:3001/api';
 }
```

---

#### 文件: `apps/web/src/lib/apiClient.ts`

```diff
/**
 * Unified API Client
- * [2025-12-09] 统一 API 请求客户端，禁止硬编码 URL
+ * [2025-01-30 23:00:00] Design Lab 4.0: 统一错误分类，浏览器端 credentials: 'include'
 * 所有 API 请求必须通过此客户端，确保环境变量正确使用
 */

 import { getFrontendApiBaseUrl } from '@/config/env';

+/**
+ * API 错误分类
+ * [2025-01-30 23:00:00] Design Lab 4.0: 统一错误分类，便于错误处理
+ */
+export enum ApiErrorType {
+   NETWORK_ERROR = 'NETWORK_ERROR',
+   TIMEOUT = 'TIMEOUT',
+   UNAUTHORIZED = 'UNAUTHORIZED',
+   NOT_FOUND = 'NOT_FOUND',
+   SERVER_ERROR = 'SERVER_ERROR',
+   CLIENT_ERROR = 'CLIENT_ERROR',
+   UNKNOWN = 'UNKNOWN',
+ }
+
+export class ApiError extends Error {
+   constructor(
+     public type: ApiErrorType,
+     message: string,
+     public statusCode?: number,
+     public originalError?: Error
+   ) {
+     super(message);
+     this.name = 'ApiError';
+   }
+ }

 export async function apiClient<T = any>(
   path: string,
   options: {
     method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
     body?: any;
     params?: Record<string, string | number | boolean | undefined>;
     headers?: Record<string, string>;
     timeout?: number;
-    credentials?: RequestCredentials;
+    credentials?: RequestCredentials; // [2025-01-30 23:00:00] Design Lab 4.0: 浏览器端默认 'include'
   } = {}
 ): Promise<T> {
   const {
     method = 'GET',
     body,
     params,
     headers = {},
     timeout = 10000,
-    credentials = 'include',
+    credentials = 'include', // [2025-01-30 23:00:00] Design Lab 4.0: 浏览器端默认 'include'
   } = options;

   const url = buildApiUrl(path, params);

   const controller = new AbortController();
   const timeoutId = setTimeout(() => controller.abort(), timeout);

   try {
     const fetchOptions: RequestInit = {
       method,
       headers: {
         'Content-Type': 'application/json',
         ...headers,
       },
       credentials,
       signal: controller.signal,
     };

     if (body && method !== 'GET') {
       fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
     }

     const response = await fetch(url, fetchOptions);
     clearTimeout(timeoutId);

     if (!response.ok) {
+      // [2025-01-30 23:00:00] Design Lab 4.0: 统一错误分类
+      let errorType: ApiErrorType;
+      if (response.status === 401) {
+        errorType = ApiErrorType.UNAUTHORIZED;
+      } else if (response.status === 404) {
+        errorType = ApiErrorType.NOT_FOUND;
+      } else if (response.status >= 500) {
+        errorType = ApiErrorType.SERVER_ERROR;
+      } else if (response.status >= 400) {
+        errorType = ApiErrorType.CLIENT_ERROR;
+      } else {
+        errorType = ApiErrorType.UNKNOWN;
+      }
+      
       const errorText = await response.text().catch(() => 'Unknown error');
       console.error('[API Client] Request failed:', {
         url,
         method,
         status: response.status,
         statusText: response.statusText,
         error: errorText.substring(0, 200),
       });
-      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
+      throw new ApiError(
+        errorType,
+        `API request failed: ${response.status} ${response.statusText}`,
+        response.status,
+        new Error(errorText)
+      );
     }

     const contentType = response.headers.get('content-type');
     if (contentType?.includes('application/json')) {
       return await response.json() as T;
     } else {
       return await response.text() as T;
     }
   } catch (error: any) {
     clearTimeout(timeoutId);
     
     if (error.name === 'AbortError') {
-      throw new Error(`Request timeout after ${timeout}ms`);
+      throw new ApiError(
+        ApiErrorType.TIMEOUT,
+        `Request timeout after ${timeout}ms`,
+        undefined,
+        error
+      );
     }
     
+    if (error instanceof ApiError) {
+      throw error;
+    }
+    
+    // [2025-01-30 23:00:00] Design Lab 4.0: 网络错误分类
+    if (error.name === 'TypeError' && error.message.includes('fetch')) {
+      throw new ApiError(
+        ApiErrorType.NETWORK_ERROR,
+        'Network error: Failed to fetch',
+        undefined,
+        error
+      );
+    }
+    
     console.error('[API Client] Request error:', {
       url,
       method,
       error: error?.message || 'Unknown error',
     });
-    throw error;
+    throw new ApiError(
+      ApiErrorType.UNKNOWN,
+      error?.message || 'Unknown error',
+      undefined,
+      error
+    );
   }
 }
```

---

#### 文件: `apps/web/next.config.mjs`

```diff
+// [2025-01-30 23:00:00] Design Lab 4.0: 构建时环境变量校验
+import { validateEnvAtBuildTime } from './src/config/env';
+
+// 构建时校验环境变量
+if (process.env.NEXT_PHASE === 'phase-production-build' || process.env.NODE_ENV === 'production') {
+   try {
+     validateEnvAtBuildTime();
+   } catch (error) {
+     console.error('❌ 环境变量校验失败:', error.message);
+     process.exit(1);
+   }
+ }

 const nextConfig = {
   async rewrites() {
     // [2025-12-09] 修复：统一使用环境变量，移除硬编码地址
     const apiUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
     
     return [
       {
         source: '/api/:path*',
         destination: `${apiUrl}/api/:path*`,
       },
     ];
   },
   reactStrictMode: true,
   env: {
     // 仅在开发环境使用 localhost 作为默认值，生产环境必须设置环境变量
     NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : ''),
     API_BASE_URL: process.env.API_BASE_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : ''),
     NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3001/api' : ''),
     // [2025-01-31 14:00:00] GCS 图片基础 URL（用于 Design Lab 产品图片）
     NEXT_PUBLIC_GCS_IMAGE_BASE_URL: process.env.NEXT_PUBLIC_GCS_IMAGE_BASE_URL || process.env.GCP_IMAGE_BASE_URL || 'https://storage.googleapis.com/print-main-product-images',
     // [2025-01-31 00:45:00] 添加 Git SHA 环境变量（在构建时设置）
     NEXT_PUBLIC_GIT_SHA: process.env.NEXT_PUBLIC_GIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'dev',
     // [2025-12-08 14:40:00] 新的 Design Lab 页面 URL 配置
     NEXT_PUBLIC_NEW_DESIGN_URL: process.env.NEXT_PUBLIC_NEW_DESIGN_URL || '',
     NEXT_PUBLIC_NEW_DESIGN_PATH: process.env.NEXT_PUBLIC_NEW_DESIGN_PATH || '/design-lab',
   },
   // [2025-01-27 15:30:00] 临时禁用类型检查以避免 Next.js 15 类型生成问题
   typescript: {
     ignoreBuildErrors: true, // 临时方案，等待 Next.js 修复类型生成问题
   },
   // [2025-12-08 05:05:00] 允许构建时忽略 ESLint 警告（仅警告，不影响功能）
   eslint: {
     ignoreDuringBuilds: true, // 允许构建时忽略 ESLint 警告
   },
   // [2025-11-14 06:18:00] 切换 Netlify SSR 插件，移除静态导出 output 配置
   images: {
     remotePatterns: [
       {
         protocol: 'https',
         hostname: 'storage.googleapis.com',
         pathname: '/**',
       },
+      // [2025-01-30 23:00:00] Design Lab 4.0: 添加 CDN 白名单
+      {
+        protocol: 'https',
+        hostname: '**.cdn.example.com', // 替换为实际 CDN 域名
+        pathname: '/**',
+      },
     ],
   },
 };
```

---

#### 文件: `apps/web/src/lib/stripe.ts`（新建）

```typescript
/**
 * Stripe 初始化与配置
 * [2025-01-30 23:00:00] Design Lab 4.0: 初始化前检查，空值防护
 */

import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null> | null = null;

/**
 * 获取 Stripe 实例
 * [2025-01-30 23:00:00] Design Lab 4.0: 初始化前检查，空值防护
 */
export function getStripe(): Promise<Stripe | null> {
  if (stripePromise) {
    return stripePromise;
  }

  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  
  // [2025-01-30 23:00:00] Design Lab 4.0: 空值防护
  if (!publishableKey || publishableKey.trim() === '') {
    console.warn('[Stripe] ⚠️ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY 未设置或为空，Stripe 功能将不可用');
    stripePromise = Promise.resolve(null);
    return stripePromise;
  }

  // [2025-01-30 23:00:00] Design Lab 4.0: 初始化 Stripe
  stripePromise = loadStripe(publishableKey);
  return stripePromise;
}

/**
 * 验证 Stripe 配置
 * [2025-01-30 23:00:00] Design Lab 4.0: 构建时校验
 */
export function validateStripeConfig(): void {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  
  if (!publishableKey || publishableKey.trim() === '') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('❌ 生产环境 Stripe 配置缺失: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY 必须设置');
    } else {
      console.warn('[Stripe] ⚠️ 开发环境 Stripe 配置缺失: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY 未设置');
    }
  }
}
```

---

### 4.2 初始化入口与错误边界

#### 文件: `apps/web/src/app/design-lab/layout.tsx`（新建）

```typescript
/**
 * Design Lab Layout
 * [2025-01-30 23:00:00] Design Lab 4.0: Boot/Config/Data Prefetch/Canvas Ready 分阶段骨架
 */

import { Suspense } from 'react';
import { DesignLabErrorBoundary } from './DesignLabErrorBoundary';
import { DesignLabBootStage } from './stages/BootStage';
import { DesignLabConfigStage } from './stages/ConfigStage';
import { DesignLabDataPrefetchStage } from './stages/DataPrefetchStage';
import { DesignLabCanvasReadyStage } from './stages/CanvasReadyStage';
import { DesignLabFeatureHydrationStage } from './stages/FeatureHydrationStage';

export default function DesignLabLayout({ children }: { children: React.ReactNode }) {
  return (
    <DesignLabErrorBoundary>
      <Suspense fallback={<DesignLabSkeleton />}>
        <DesignLabBootStage>
          <DesignLabConfigStage>
            <DesignLabDataPrefetchStage>
              <DesignLabCanvasReadyStage>
                <DesignLabFeatureHydrationStage>
                  {children}
                </DesignLabFeatureHydrationStage>
              </DesignLabCanvasReadyStage>
            </DesignLabDataPrefetchStage>
          </DesignLabConfigStage>
        </DesignLabBootStage>
      </Suspense>
    </DesignLabErrorBoundary>
  );
}

function DesignLabSkeleton() {
  return (
    <section style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f5f5f5' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#666' }}>
          Preparing the Design Lab…
        </div>
        <div style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #3498db', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
      </div>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </section>
  );
}
```

---

#### 文件: `apps/web/src/app/design-lab/page.tsx`

```diff
/**
 * Design Lab Page
- * [2025-11-11 15:47:58] 服务端入口，挂载 Fabric.js 客户端编辑器
- * [2025-01-27 15:10:00] Next.js 15: 直接导入客户端组件，无需 dynamic
- * [2025-01-27 17:05:00] 补充 SEO 元数据
- * [2025-01-28 03:15:00] 添加错误边界处理
- * [2025-01-30 20:30:00] 恢复使用 DesignLabClient 组件
+ * [2025-01-30 23:00:00] Design Lab 4.0: 服务端组件仅做数据拼装与可序列化返回
 */
-import { Suspense } from 'react';
 import { generateSEOMetadata } from '@/lib/seo';
-import { DesignLabErrorBoundary } from './DesignLabErrorBoundary';
-import DesignLabClient from './DesignLabClient';
+import DesignLabClient from './DesignLabClient';
 import type { Metadata } from 'next';
+import { productsApi } from '@/lib/api';

 // [2025-01-27 17:05:00] 生成 Design Lab 页面 SEO 元数据
 export const metadata: Metadata = generateSEOMetadata({
   title: 'Design Lab - Online Custom Design Tool',
   description: 'Create custom designs for t-shirts, hoodies, and apparel with our professional online design tool. Upload artwork, add text, and preview your designs instantly.',
   keywords: ['design tool', 'custom design', 't-shirt designer', 'online editor', 'custom apparel designer', 'design lab'],
   url: 'https://suvernireplus.com/design-lab',
   image: 'https://suvernireplus.com/assets/hero/hero-card-tee.jpg',
 });

-export default function DesignLabPage() {
-  // [2025-11-14 06:07:05] 使用 Suspense 包裹 DesignLabClient 以满足 useSearchParams 要求
-  // [2025-01-28 03:15:00] 添加错误边界处理
-  // [2025-01-30 20:30:00] 恢复使用 DesignLabClient 组件
+/**
+ * 服务端组件：仅做数据拼装与可序列化返回
+ * [2025-01-30 23:00:00] Design Lab 4.0: 严格 RSC 边界，不包含客户端 API
+ */
+export default async function DesignLabPage({
+   searchParams,
+ }: {
+   searchParams: { productId?: string; colorId?: string; designId?: string };
+ }) {
+  // [2025-01-30 23:00:00] Design Lab 4.0: 服务端预取产品数据（可选，不阻塞）
+  let initialProductData = null;
+  if (searchParams?.productId) {
+    try {
+      initialProductData = await productsApi.getProduct(searchParams.productId);
+    } catch (error) {
+      // 服务端预取失败不影响页面加载，客户端会重试
+      console.warn('[Design Lab] 服务端预取产品数据失败:', error);
+    }
+  }
+
   return (
-    <Suspense
-      fallback={
-        <section style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
-          <p>Preparing the Design Lab…</p>
-        </section>
-      }
-    >
-      <DesignLabErrorBoundary>
-        <DesignLabClient />
-      </DesignLabErrorBoundary>
-    </Suspense>
+    <DesignLabClient initialProductData={initialProductData} />
   );
 }
```

---

### 4.3 画布引擎与模块注水

#### 文件: `apps/web/src/design/canvas/engine.ts`（新建）

```typescript
/**
 * Design Lab Canvas Engine
 * [2025-01-30 23:00:00] Design Lab 4.0: 初始化顺序与事件总线
 */

import type { fabric } from 'fabric';

export enum CanvasEventType {
  READY = 'canvas:ready',
  OBJECT_ADDED = 'canvas:object-added',
  OBJECT_REMOVED = 'canvas:object-removed',
  OBJECT_MODIFIED = 'canvas:object-modified',
  ERROR = 'canvas:error',
}

export interface CanvasEvent {
  type: CanvasEventType;
  payload?: any;
}

type CanvasEventListener = (event: CanvasEvent) => void;

export class CanvasEngine {
  private canvas: fabric.Canvas | null = null;
  private eventListeners: Map<CanvasEventType, Set<CanvasEventListener>> = new Map();
  private isInitialized = false;

  /**
   * 初始化画布
   * [2025-01-30 23:00:00] Design Lab 4.0: 初始化顺序与事件总线
   */
  async initialize(
    canvasElement: HTMLCanvasElement,
    fabricModule: typeof fabric
  ): Promise<void> {
    if (this.isInitialized) {
      console.warn('[Canvas Engine] 画布已初始化，跳过重复初始化');
      return;
    }

    try {
      // 1. 创建 Fabric Canvas 实例
      this.canvas = new fabricModule.Canvas(canvasElement, {
        width: 1000,
        height: 1200,
        backgroundColor: 'transparent',
        preserveObjectStacking: true,
        selection: true,
        stateful: true,
      });

      // 2. 配置画布属性
      const devicePixelRatio = window.devicePixelRatio || 1;
      const scale = devicePixelRatio;
      
      this.canvas.setWidth(1000 * scale);
      this.canvas.setHeight(1200 * scale);
      
      const canvasEl = this.canvas.getElement();
      if (canvasEl) {
        canvasEl.style.width = '1000px';
        canvasEl.style.height = '1200px';
      }
      
      this.canvas.setZoom(1);
      this.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);

      // 3. 设置对象默认属性
      fabricModule.Object.prototype.set({
        borderColor: '#3b82f6',
        cornerColor: '#3b82f6',
        cornerSize: 10,
        transparentCorners: false,
        borderScaleFactor: 2,
        cornerStyle: 'circle',
        rotatingPointOffset: 40,
      });

      // 4. 绑定画布事件
      this.setupEventListeners();

      // 5. 标记为已初始化
      this.isInitialized = true;

      // 6. 触发 READY 事件
      this.emit(CanvasEventType.READY, { canvas: this.canvas });
    } catch (error) {
      this.emit(CanvasEventType.ERROR, { error });
      throw error;
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    if (!this.canvas) return;

    this.canvas.on('object:added', (e) => {
      this.emit(CanvasEventType.OBJECT_ADDED, { object: e.target });
    });

    this.canvas.on('object:removed', (e) => {
      this.emit(CanvasEventType.OBJECT_REMOVED, { object: e.target });
    });

    this.canvas.on('object:modified', (e) => {
      this.emit(CanvasEventType.OBJECT_MODIFIED, { object: e.target });
    });
  }

  /**
   * 触发事件
   */
  private emit(type: CanvasEventType, payload?: any): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener({ type, payload });
        } catch (error) {
          console.error(`[Canvas Engine] 事件监听器错误 (${type}):`, error);
        }
      });
    }
  }

  /**
   * 添加事件监听器
   */
  on(type: CanvasEventType, listener: CanvasEventListener): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    this.eventListeners.get(type)!.add(listener);
  }

  /**
   * 移除事件监听器
   */
  off(type: CanvasEventType, listener: CanvasEventListener): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * 获取画布实例
   */
  getCanvas(): fabric.Canvas | null {
    return this.canvas;
  }

  /**
   * 清理资源
   */
  dispose(): void {
    if (this.canvas) {
      this.canvas.off();
      this.canvas.dispose();
      this.canvas = null;
    }
    this.eventListeners.clear();
    this.isInitialized = false;
  }
}

// 单例实例
export const canvasEngine = new CanvasEngine();
```

---

### 4.4 UI 组件与地图

#### 组件清单

| 组件 | 路径 | Skeleton | Error Fallback |
|------|------|---------|---------------|
| Header | `components/Header.tsx` | ✅ | ✅ |
| DarkRail | `components/DarkRail.tsx` | ✅ | ✅ |
| Canvas | `components/Canvas.tsx` | ✅ | ✅ |
| Sidebar | `components/Sidebar.tsx` | ✅ | ✅ |
| BottomBar | `components/BottomBar.tsx` | ✅ | ✅ |
| UploadPanel | `components/panels/UploadPanel.tsx` | ✅ | ✅ |
| TextPanel | `components/panels/TextPanel.tsx` | ✅ | ✅ |
| ArtPanel | `components/panels/ArtPanel.tsx` | ✅ | ✅ |
| ProductColorsModal | `components/modals/ProductColorsModal.tsx` | ✅ | ✅ |
| NamesNumbersModal | `components/modals/NamesNumbersModal.tsx` | ✅ | ✅ |
| GetPriceFlowModal | `components/modals/GetPriceFlowModal.tsx` | ✅ | ✅ |

**每个组件必须提供**:
- Skeleton 加载状态
- Error Fallback UI
- 空状态提示

---

### 4.5 路由与预取

#### 文件: `apps/web/next.config.mjs`（补充）

```diff
 const nextConfig = {
+  // [2025-01-30 23:00:00] Design Lab 4.0: 移除对不存在页面的预取
+  experimental: {
+    // 禁用路由预取（可选，根据需要）
+    // prefetch: false,
+  },
   async rewrites() {
     // ...
   },
 };
```

---

## 五、测试与 CI

### 5.1 单元测试（Jest/Testing Library）

#### 文件: `apps/web/src/config/__tests__/env.test.ts`

```typescript
/**
 * Environment Configuration Tests
 * [2025-01-30 23:00:00] Design Lab 4.0: env 校验测试
 */

import { getFrontendApiBaseUrl, validateEnvAtBuildTime } from '../env';

describe('Environment Configuration', () => {
  describe('validateEnvAtBuildTime', () => {
    it('生产环境缺失环境变量应抛错', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      delete process.env.NEXT_PUBLIC_API_URL;
      delete process.env.NEXT_PUBLIC_API_BASE_URL;

      expect(() => validateEnvAtBuildTime()).toThrow();

      process.env.NODE_ENV = originalEnv;
    });

    it('生产环境 localhost 应抛错', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';

      expect(() => validateEnvAtBuildTime()).toThrow();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('getFrontendApiBaseUrl', () => {
    it('生产环境缺失环境变量应抛错', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      delete process.env.NEXT_PUBLIC_API_URL;
      delete process.env.NEXT_PUBLIC_API_BASE_URL;

      expect(() => getFrontendApiBaseUrl()).toThrow();

      process.env.NODE_ENV = originalEnv;
    });
  });
});
```

---

#### 文件: `apps/web/src/lib/__tests__/apiClient.test.ts`

```typescript
/**
 * API Client Tests
 * [2025-01-30 23:00:00] Design Lab 4.0: apiClient 错误分类测试
 */

import { apiClient, ApiError, ApiErrorType } from '../apiClient';

describe('API Client', () => {
  it('401 错误应分类为 UNAUTHORIZED', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => 'Unauthorized',
    });

    await expect(apiClient('/test')).rejects.toThrow(ApiError);
    await expect(apiClient('/test')).rejects.toMatchObject({
      type: ApiErrorType.UNAUTHORIZED,
    });
  });

  it('404 错误应分类为 NOT_FOUND', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: async () => 'Not Found',
    });

    await expect(apiClient('/test')).rejects.toThrow(ApiError);
    await expect(apiClient('/test')).rejects.toMatchObject({
      type: ApiErrorType.NOT_FOUND,
    });
  });

  it('500 错误应分类为 SERVER_ERROR', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'Internal Server Error',
    });

    await expect(apiClient('/test')).rejects.toThrow(ApiError);
    await expect(apiClient('/test')).rejects.toMatchObject({
      type: ApiErrorType.SERVER_ERROR,
    });
  });
});
```

---

#### 文件: `apps/web/src/lib/__tests__/stripe.test.ts`

```typescript
/**
 * Stripe Tests
 * [2025-01-30 23:00:00] Design Lab 4.0: stripe 初始化空值防护测试
 */

import { getStripe, validateStripeConfig } from '../stripe';

describe('Stripe', () => {
  it('空 key 应返回 null', async () => {
    const originalKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    const stripe = await getStripe();
    expect(stripe).toBeNull();

    if (originalKey) {
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = originalKey;
    }
  });

  it('生产环境缺失 key 应抛错', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    expect(() => validateStripeConfig()).toThrow();

    process.env.NODE_ENV = originalEnv;
  });
});
```

---

### 5.2 e2e（Playwright）

#### 文件: `apps/web/tests/e2e/design-lab-4.0-init.spec.ts`

```typescript
/**
 * Design Lab 4.0 初始化测试
 * [2025-01-30 23:00:00] Design Lab 4.0: 无白屏、无 digest、画布进入可编辑
 */

import { test, expect } from '@playwright/test';

test.describe('Design Lab 4.0 初始化', () => {
  test('第一次加载 Design Lab：无白屏、无 digest', async ({ page }) => {
    await page.goto('/design-lab');

    // 等待页面加载完成
    await page.waitForLoadState('networkidle');

    // 检查无白屏（页面有内容）
    const content = await page.locator('body').textContent();
    expect(content).not.toBeNull();
    expect(content!.length).toBeGreaterThan(0);

    // 检查无 digest 错误
    const errorMessages = await page.locator('[data-testid="error"]').count();
    expect(errorMessages).toBe(0);

    // 检查画布已初始化
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });
  });

  test('画布进入可编辑状态', async ({ page }) => {
    await page.goto('/design-lab');
    await page.waitForLoadState('networkidle');

    // 等待画布初始化完成
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // 检查画布可交互（点击画布）
    await canvas.click({ position: { x: 500, y: 600 } });

    // 检查工具面板已加载
    const toolPanel = page.locator('[data-testid="tool-panel"]');
    await expect(toolPanel).toBeVisible();
  });

  test('UI 100% 复刻的关键交互', async ({ page }) => {
    await page.goto('/design-lab');
    await page.waitForLoadState('networkidle');

    // 1. 上传功能
    const uploadButton = page.locator('[data-testid="upload-button"]');
    await expect(uploadButton).toBeVisible();
    await uploadButton.click();

    // 2. 添加文字
    const addTextButton = page.locator('[data-testid="add-text-button"]');
    await expect(addTextButton).toBeVisible();
    await addTextButton.click();

    // 3. 切换颜色
    const colorButton = page.locator('[data-testid="product-colors-button"]');
    await expect(colorButton).toBeVisible();
    await colorButton.click();

    // 4. Names & Numbers
    const namesButton = page.locator('[data-testid="names-numbers-button"]');
    await expect(namesButton).toBeVisible();

    // 5. Get Price
    const getPriceButton = page.locator('[data-testid="get-price-button"]');
    await expect(getPriceButton).toBeVisible();

    // 6. Add to Cart
    const addToCartButton = page.locator('[data-testid="add-to-cart-button"]');
    await expect(addToCartButton).toBeVisible();
  });

  test('后端故障模拟：显示错误兜底 UI', async ({ page }) => {
    // 模拟 API 失败
    await page.route('**/api/**', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.goto('/design-lab');
    await page.waitForLoadState('networkidle');

    // 检查错误兜底 UI 已显示
    const errorFallback = page.locator('[data-testid="error-fallback"]');
    await expect(errorFallback).toBeVisible({ timeout: 5000 });
  });

  test('图片 400/路由 404 不复现', async ({ page }) => {
    await page.goto('/design-lab');
    await page.waitForLoadState('networkidle');

    // 检查无 400 错误
    const responsePromises = page.waitForResponse((response) => {
      return response.status() === 400;
    }, { timeout: 5000 }).catch(() => null);

    const response = await responsePromises;
    expect(response).toBeNull();

    // 检查无 404 错误
    const notFoundPromises = page.waitForResponse((response) => {
      return response.status() === 404 && response.url().includes('/api/');
    }, { timeout: 5000 }).catch(() => null);

    const notFound = await notFoundPromises;
    expect(notFound).toBeNull();
  });

  test('Stripe 不抛空 key 错误', async ({ page }) => {
    await page.goto('/design-lab');
    await page.waitForLoadState('networkidle');

    // 检查控制台无 Stripe 错误
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (text.includes('Stripe') && text.includes('publishable key')) {
          consoleErrors.push(text);
        }
      }
    });

    await page.waitForTimeout(2000);

    expect(consoleErrors.length).toBe(0);
  });
});
```

---

### 5.3 CI 脚本

#### 文件: `scripts/check-env.mjs`

```javascript
/**
 * 构建前检查必需 env
 * [2025-01-30 23:00:00] Design Lab 4.0: 非法值直接 fail
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

function checkEnvVar(name, value, isProduction) {
  if (!value || value.trim() === '') {
    if (isProduction) {
      console.error(`❌ 生产环境环境变量缺失: ${name}`);
      process.exit(1);
    } else {
      console.warn(`⚠️ 开发环境环境变量缺失: ${name}`);
    }
    return false;
  }

  if (isProduction && (value.includes('localhost') || value.includes('127.0.0.1'))) {
    console.error(`❌ 生产环境环境变量非法: ${name} 包含 localhost (${value})`);
    process.exit(1);
  }

  return true;
}

function main() {
  const isProduction = process.env.NODE_ENV === 'production';
  
  console.log('🔍 检查环境变量...');
  console.log(`环境: ${isProduction ? '生产' : '开发'}`);

  // 检查必需的环境变量
  const requiredVars = [
    'NEXT_PUBLIC_API_URL',
    'NEXT_PUBLIC_API_BASE_URL',
  ];

  let hasError = false;

  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!checkEnvVar(varName, value, isProduction)) {
      hasError = true;
    }
  }

  // 检查 Stripe（生产环境必需）
  if (isProduction) {
    const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!checkEnvVar('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', stripeKey, isProduction)) {
      hasError = true;
    }
  }

  if (hasError && isProduction) {
    console.error('❌ 环境变量检查失败，构建终止');
    process.exit(1);
  }

  console.log('✅ 环境变量检查通过');
}

main();
```

---

#### 文件: `scripts/grep-hardcoded-urls.sh`

```bash
#!/bin/bash
# [2025-01-30 23:00:00] Design Lab 4.0: 禁止硬编码域与散落 baseURL

echo "🔍 检查硬编码 URL..."

# 检查硬编码的 API URL
HARDCODED_URLS=$(grep -r "http://localhost:3001" apps/web/src --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | grep -v "env.example" | grep -v ".test." | grep -v ".spec." || true)

if [ -n "$HARDCODED_URLS" ]; then
  echo "❌ 发现硬编码 URL:"
  echo "$HARDCODED_URLS"
  exit 1
fi

# 检查散落的 baseURL
SCATTERED_BASEURL=$(grep -r "baseURL\|baseUrl\|BASE_URL" apps/web/src --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | grep -v "env.ts" | grep -v "apiClient.ts" | grep -v "api-config.ts" | grep -v ".test." | grep -v ".spec." || true)

if [ -n "$SCATTERED_BASEURL" ]; then
  echo "❌ 发现散落的 baseURL:"
  echo "$SCATTERED_BASEURL"
  exit 1
fi

echo "✅ 硬编码 URL 检查通过"
```

---

#### 文件: `scripts/check-rsc-boundaries.mjs`

```javascript
/**
 * 静态检查服务端组件里是否引入客户端 API
 * [2025-01-30 23:00:00] Design Lab 4.0: RSC 边界检查
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const CLIENT_APIS = [
  'useRouter',
  'window.',
  'document.',
  'localStorage',
  'sessionStorage',
  'navigator.',
];

function checkFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  
  // 检查是否是服务端组件（无 'use client'）
  if (content.includes("'use client'") || content.includes('"use client"')) {
    return { hasError: false, errors: [] };
  }

  const errors = [];
  
  for (const api of CLIENT_APIS) {
    if (content.includes(api)) {
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (line.includes(api) && !line.trim().startsWith('//')) {
          errors.push({
            file: filePath,
            line: index + 1,
            api,
            content: line.trim(),
          });
        }
      });
    }
  }

  return {
    hasError: errors.length > 0,
    errors,
  };
}

function checkDirectory(dirPath) {
  const files = readdirSync(dirPath);
  const allErrors = [];

  for (const file of files) {
    const filePath = join(dirPath, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      const errors = checkDirectory(filePath);
      allErrors.push(...errors);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      const result = checkFile(filePath);
      if (result.hasError) {
        allErrors.push(...result.errors);
      }
    }
  }

  return allErrors;
}

function main() {
  console.log('🔍 检查 RSC 边界...');

  const designLabDir = join(process.cwd(), 'apps/web/src/app/design-lab');
  const errors = checkDirectory(designLabDir);

  if (errors.length > 0) {
    console.error('❌ 发现 RSC 边界违规:');
    errors.forEach((error) => {
      console.error(`  ${error.file}:${error.line} - 使用了客户端 API: ${error.api}`);
      console.error(`    ${error.content}`);
    });
    process.exit(1);
  }

  console.log('✅ RSC 边界检查通过');
}

main();
```

---

### 5.4 CI 配置

#### 文件: `.github/workflows/design-lab-4.0-ci.yml`（新建）

```yaml
name: Design Lab 4.0 CI

on:
  push:
    branches: [main, develop]
    paths:
      - 'apps/web/src/app/design-lab/**'
      - 'apps/web/src/config/**'
      - 'apps/web/src/lib/apiClient.ts'
      - 'apps/web/src/lib/stripe.ts'
  pull_request:
    branches: [main, develop]
    paths:
      - 'apps/web/src/app/design-lab/**'
      - 'apps/web/src/config/**'
      - 'apps/web/src/lib/apiClient.ts'
      - 'apps/web/src/lib/stripe.ts'

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: apps/web/package-lock.json
      
      - name: Install dependencies
        working-directory: apps/web
        run: npm ci
      
      - name: Check environment variables
        run: node scripts/check-env.mjs
        env:
          NODE_ENV: production
          NEXT_PUBLIC_API_URL: https://api.example.com
          NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: pk_test_xxx
      
      - name: Check hardcoded URLs
        run: bash scripts/grep-hardcoded-urls.sh
      
      - name: Check RSC boundaries
        run: node scripts/check-rsc-boundaries.mjs
      
      - name: Run unit tests
        working-directory: apps/web
        run: npm test -- --coverage
      
      - name: Run E2E tests
        working-directory: apps/web
        run: npm run test:e2e
        env:
          NEXT_PUBLIC_API_URL: http://localhost:3001
      
      - name: Build
        working-directory: apps/web
        run: npm run build
        env:
          NEXT_PUBLIC_API_URL: https://api.example.com
          NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: pk_test_xxx
```

---

## 六、验收清单（对照 PRD 与 UI 复刻）

### 6.1 初始化验收

| 验收项 | 组件/页面路径 | DOM 查询断言 | 交互步骤 | 预期结果 |
|--------|-------------|-------------|---------|---------|
| 冷启动时间目标 | `apps/web/src/app/design-lab/page.tsx` | `await page.waitForSelector('canvas', { timeout: 5000 })` | 打开 `/design-lab` | 5 秒内画布可见 |
| 无白屏 | `apps/web/src/app/design-lab/layout.tsx` | `await page.locator('body').textContent()` | 打开 `/design-lab` | 页面有内容，无白屏 |
| 错误边界可视化 | `apps/web/src/app/design-lab/DesignLabErrorBoundary.tsx` | `await page.locator('[data-testid="error-boundary"]')` | 模拟错误 | 显示错误边界 UI |
| 可操作性进入时间 | `apps/web/src/app/design-lab/DesignLabClient.tsx` | `await page.locator('[data-testid="tool-panel"]')` | 打开 `/design-lab` | 10 秒内工具面板可用 |
| 刷新不出现重复初始化 | `apps/web/src/app/design-lab/DesignLabClient.tsx` | 检查控制台日志 | 刷新页面 | 无重复初始化日志 |

---

### 6.2 PRD 章节对照验收

#### 第3章 - 信息架构与全局布局

| 验收项 | 组件路径 | DOM 查询 | 交互步骤 | 预期结果 |
|--------|---------|---------|---------|---------|
| 顶部栏 Logo | `components/Header.tsx` | `page.locator('[data-testid="logo"]')` | 打开页面 | Logo 可见 |
| 顶部栏 My Designs | `components/Header.tsx` | `page.locator('[data-testid="my-designs"]')` | 点击 | 跳转到设计列表 |
| 顶部栏 Untitled | `components/Header.tsx` | `page.locator('[data-testid="design-name"]')` | 打开页面 | 显示 "Untitled Design" |
| 顶部栏 Talk/Chat | `components/Header.tsx` | `page.locator('[data-testid="talk-button"]')` | 点击 | 打开客服窗口 |
| 顶部栏 Sign In | `components/Header.tsx` | `page.locator('[data-testid="sign-in"]')` | 点击 | 跳转到登录页 |
| 顶部栏 Cart | `components/Header.tsx` | `page.locator('[data-testid="cart"]')` | 点击 | 跳转到购物车 |
| 左侧功能栏 | `components/DarkRail.tsx` | `page.locator('[data-testid="dark-rail"]')` | 打开页面 | 左侧栏可见，80px 宽 |
| 中央画布 | `components/Canvas.tsx` | `page.locator('canvas')` | 打开页面 | 画布可见，可交互 |
| 右侧视图 | `components/Sidebar.tsx` | `page.locator('[data-testid="sidebar"]')` | 打开页面 | 右侧栏可见，120px 宽 |
| 底部操作栏 | `components/BottomBar.tsx` | `page.locator('[data-testid="bottom-bar"]')` | 打开页面 | 底部栏可见 |

---

#### 第4章 - 左侧功能栏模块

| 验收项 | 组件路径 | DOM 查询 | 交互步骤 | 预期结果 |
|--------|---------|---------|---------|---------|
| Upload 面板 | `components/panels/UploadPanel.tsx` | `page.locator('[data-testid="upload-panel"]')` | 点击 Upload | 面板打开，显示上传选项 |
| Add Text 面板 | `components/panels/TextPanel.tsx` | `page.locator('[data-testid="text-panel"]')` | 点击 Add Text | 面板打开，显示输入框 |
| Add Art 面板 | `components/panels/ArtPanel.tsx` | `page.locator('[data-testid="art-panel"]')` | 点击 Add Art | 面板打开，显示分类 |
| Product Colors 面板 | `components/modals/ProductColorsModal.tsx` | `page.locator('[data-testid="product-colors-modal"]')` | 点击 Product Colors | 模态框打开，显示颜色列表 |
| Add Names 面板 | `components/modals/NamesNumbersModal.tsx` | `page.locator('[data-testid="names-numbers-modal"]')` | 点击 Add Names | 模态框打开，显示 Tools |

---

#### 第5章 - 画布视图与对象编辑

| 验收项 | 组件路径 | DOM 查询 | 交互步骤 | 预期结果 |
|--------|---------|---------|---------|---------|
| Front/Back/Sleeve 切换 | `components/Sidebar.tsx` | `page.locator('[data-testid="view-front"]')` | 点击 Front/Back/Sleeve | 画布切换视图 |
| Zoom 功能 | `components/Sidebar.tsx` | `page.locator('[data-testid="zoom-in"]')` | 点击 Zoom | 画布缩放 |
| 对象选中 | `components/Canvas.tsx` | 点击画布对象 | 点击对象 | 对象选中，显示控制点 |
| 对象删除 | `components/Canvas.tsx` | 点击右上角 X | 点击 X | 对象删除 |
| Layering 面板 | `components/panels/LayerManagementPanel.tsx` | `page.locator('[data-testid="layering-panel"]')` | 点击 Layering | 面板打开，显示层级列表 |
| Center 功能 | `components/Canvas.tsx` | `page.locator('[data-testid="center-button"]')` | 点击 Center | 对象居中 |

---

#### 第6章 - 字体选择器与素材库浏览

| 验收项 | 组件路径 | DOM 查询 | 交互步骤 | 预期结果 |
|--------|---------|---------|---------|---------|
| 字体分类 | `components/panels/FontSelector.tsx` | `page.locator('[data-testid="font-category"]')` | 打开字体选择器 | 显示分类列表 |
| 字体搜索 | `components/panels/FontSelector.tsx` | `page.locator('[data-testid="font-search"]')` | 输入搜索词 | 过滤字体列表 |
| 素材分类 | `components/panels/ArtPanel.tsx` | `page.locator('[data-testid="art-category"]')` | 打开素材库 | 显示分类网格 |
| 素材搜索 | `components/panels/ArtPanel.tsx` | `page.locator('[data-testid="art-search"]')` | 输入搜索词 | 过滤素材列表 |

---

#### 第7章 - Names & Numbers流程与联动

| 验收项 | 组件路径 | DOM 查询 | 交互步骤 | 预期结果 |
|--------|---------|---------|---------|---------|
| Tools 面板 | `components/modals/NamesNumbersModal.tsx` | `page.locator('[data-testid="names-tools"]')` | 打开 Names & Numbers | 显示 Tools 面板 |
| My List 弹窗 | `components/modals/NamesNumbersModal.tsx` | `page.locator('[data-testid="names-list"]')` | 点击 Enter Names/Numbers | 打开 My List 弹窗 |
| My Quantities 弹窗 | `components/modals/NamesNumbersModal.tsx` | `page.locator('[data-testid="names-quantities"]')` | 点击 Done | 打开 My Quantities 弹窗 |

---

#### 第8章 - 报价与下单流程（Get Price）

| 验收项 | 组件路径 | DOM 查询 | 交互步骤 | 预期结果 |
|--------|---------|---------|---------|---------|
| Get Price 起始页 | `components/modals/GetPriceFlowModal.tsx` | `page.locator('[data-testid="get-price-start"]')` | 点击 Get Price | 显示起始页 |
| Ordering Options | `components/modals/GetPriceFlowModal.tsx` | `page.locator('[data-testid="ordering-options"]')` | 点击 Continue | 显示 Ordering Options |
| Quantity 页面 | `components/modals/GetPriceFlowModal.tsx` | `page.locator('[data-testid="quantity-page"]')` | 点击 Continue to Sizes | 显示 Quantity 页面 |
| Order Options 页面 | `components/modals/GetPriceFlowModal.tsx` | `page.locator('[data-testid="order-options"]')` | 点击 Continue | 显示 Order Options 页面 |
| Add to Cart | `components/modals/GetPriceFlowModal.tsx` | `page.locator('[data-testid="add-to-cart"]')` | 点击 Add to Cart | 加入购物车成功 |

---

#### 第9章 - 底部操作区与工作流

| 验收项 | 组件路径 | DOM 查询 | 交互步骤 | 预期结果 |
|--------|---------|---------|---------|---------|
| Add Products | `components/BottomBar.tsx` | `page.locator('[data-testid="add-products"]')` | 点击 Add Products | 打开产品选择器 |
| 产品卡 | `components/BottomBar.tsx` | `page.locator('[data-testid="product-card"]')` | 打开页面 | 显示产品信息 |
| Save \| Share | `components/BottomBar.tsx` | `page.locator('[data-testid="save-share"]')` | 点击 Save \| Share | 打开 Save & Share 模态框 |
| Get Price | `components/BottomBar.tsx` | `page.locator('[data-testid="get-price"]')` | 点击 Get Price | 打开 Get Price 流程 |

---

#### 第10章 - 撤销与重做、分层与对齐、安全区

| 验收项 | 组件路径 | DOM 查询 | 交互步骤 | 预期结果 |
|--------|---------|---------|---------|---------|
| Undo/Redo | `components/UndoRedo.tsx` | `page.locator('[data-testid="undo"]')` | 点击 Undo/Redo | 撤销/重做操作 |
| Layering | `components/panels/LayerManagementPanel.tsx` | `page.locator('[data-testid="bring-to-front"]')` | 点击 Bring to Front | 对象移到最前 |
| Center | `components/Canvas.tsx` | `page.locator('[data-testid="center-button"]')` | 点击 Center | 对象居中 |
| 安全区 | `components/Canvas.tsx` | `page.locator('[data-testid="safe-zone"]')` | 打开页面 | 显示安全区边界 |

---

## 七、发布与监控建议

### 7.1 错误采集

#### 错误追踪服务
- 使用 Sentry 或类似服务采集错误
- 错误分类：环境变量错误、API 错误、画布初始化错误、模块加载错误

#### 错误日志格式
```typescript
{
  timestamp: string;
  level: 'error' | 'warning' | 'info';
  stage: 'boot' | 'config' | 'data-prefetch' | 'canvas-ready' | 'feature-hydration';
  errorType: string;
  message: string;
  stack?: string;
  context?: Record<string, any>;
}
```

---

### 7.2 TraceId

#### 请求追踪
- 每个请求添加 `X-Trace-Id` header
- 前端生成 traceId，传递给所有 API 请求
- 后端记录 traceId，关联日志

#### TraceId 生成
```typescript
function generateTraceId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
```

---

### 7.3 性能指标

#### 关键指标
- **TTFB (Time to First Byte)**: < 500ms
- **FCP (First Contentful Paint)**: < 1.5s
- **LCP (Largest Contentful Paint)**: < 2.5s
- **TTI (Time to Interactive)**: < 3.5s
- **Canvas Ready Time**: < 5s
- **Feature Hydration Time**: < 10s

#### 性能监控
- 使用 Web Vitals 采集性能指标
- 发送到分析服务（如 Google Analytics、Mixpanel）
- 设置告警阈值

---

### 7.4 发布检查清单

#### 构建前
- [ ] 环境变量已配置（生产环境）
- [ ] 环境变量校验通过（`scripts/check-env.mjs`）
- [ ] 硬编码 URL 检查通过（`scripts/grep-hardcoded-urls.sh`）
- [ ] RSC 边界检查通过（`scripts/check-rsc-boundaries.mjs`）

#### 构建后
- [ ] 构建成功，无错误
- [ ] 单元测试通过
- [ ] E2E 测试通过

#### 部署后
- [ ] 页面可访问，无白屏
- [ ] 画布初始化成功
- [ ] 关键交互可用
- [ ] 错误追踪正常
- [ ] 性能指标正常

---

## 附录

### A. 关键文件清单

| 文件路径 | 状态 | 说明 |
|---------|------|------|
| `apps/web/src/config/env.ts` | 修改 | 构建时 fail，无隐式回退 |
| `apps/web/src/lib/apiClient.ts` | 修改 | 统一错误分类 |
| `apps/web/src/lib/stripe.ts` | 新建 | 初始化前检查，空值防护 |
| `apps/web/src/app/design-lab/layout.tsx` | 新建 | 分阶段初始化架构 |
| `apps/web/src/app/design-lab/page.tsx` | 修改 | 纯服务端组件 |
| `apps/web/src/app/design-lab/DesignLabClient.tsx` | 重写 | 分阶段初始化 |
| `apps/web/src/design/canvas/engine.ts` | 新建 | 画布引擎与事件总线 |
| `apps/web/next.config.mjs` | 修改 | 构建时环境变量校验 |
| `scripts/check-env.mjs` | 新建 | 构建前检查 |
| `scripts/grep-hardcoded-urls.sh` | 新建 | 硬编码 URL 检查 |
| `scripts/check-rsc-boundaries.mjs` | 新建 | RSC 边界检查 |

---

### B. 测试文件清单

| 文件路径 | 类型 | 说明 |
|---------|------|------|
| `apps/web/src/config/__tests__/env.test.ts` | 单元测试 | 环境变量校验测试 |
| `apps/web/src/lib/__tests__/apiClient.test.ts` | 单元测试 | API 客户端错误分类测试 |
| `apps/web/src/lib/__tests__/stripe.test.ts` | 单元测试 | Stripe 初始化测试 |
| `apps/web/tests/e2e/design-lab-4.0-init.spec.ts` | E2E 测试 | 初始化流程测试 |

---

### C. CI 文件清单

| 文件路径 | 说明 |
|---------|------|
| `.github/workflows/design-lab-4.0-ci.yml` | CI 工作流配置 |

---

**文档版本**: 4.0  
**最后更新**: 2025-01-30 23:00:00  
**维护者**: Development Team

