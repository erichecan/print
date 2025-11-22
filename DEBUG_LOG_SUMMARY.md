# 调试日志总结 - Design Lab 图片尺寸和 API 路由问题

**时间**: 2025-01-27 22:10:00  
**问题**: 
1. 404 错误：`GET http://localhost:3000/api/products/variant/b9ac1f4b-fd03-4aff-b6fe-e0066a71a24c 404 (Not Found)`
2. 商品图片太小，需要调整为 1000px*1200px，响应式布局

---

## ✅ 已完成的修复

### 1. 图片尺寸调整 ✅

**文件**: `apps/web/src/app/design-lab/DesignLabClient.tsx`
- 图片尺寸从 600x800 调整为 1000x1200
- 添加了详细的 onLoad 日志，记录：
  - 自然尺寸 (naturalWidth x naturalHeight)
  - 显示尺寸 (offsetWidth x offsetHeight)
  - 宽高比
  - 时间戳

**文件**: `apps/web/src/app/globals.css`
- 更新 `.dl-visualization__image` 最大宽度为 1000px
- 更新 `.dl-visualization__img` 最大尺寸为 1000x1200px
- 添加响应式媒体查询：
  - 桌面端 (> 1024px): 1000x1200px
  - 平板端 (768px - 1024px): 100% 宽度，16px 内边距
  - 移动端 (< 768px): 100% 宽度，12px 内边距

### 2. 增强调试日志 ✅

**文件**: `apps/web/public/design-lab-native/store.js`
- 增强 `hydrateProductFromVariantId` 函数日志
- 记录完整的 API 请求/响应流程
- 包括时间戳、持续时间、错误详情

**文件**: `apps/web/src/app/api/products/variant/[variantId]/route.ts`
- 添加详细的上游 API 调用日志
- 记录请求 URL、响应状态、持续时间

---

## 🔍 404 错误分析

### 错误信息
```json
{
  "success": false,
  "statusCode": 404,
  "code": "NOT_FOUND",
  "message": "Route not found",
  "path": "/products/variant/b9ac1f4b-fd03-4aff-b6fe-e0066a71a24c"
}
```

### 问题诊断

1. **路由文件存在**: ✅
   - 路径: `apps/web/src/app/api/products/variant/[variantId]/route.ts`
   - 文件结构正确

2. **代码语法**: ✅
   - 已修复 Next.js 14.2 的 params 类型（不是 Promise）
   - 代码无语法错误

3. **路由未注册**: ⚠️
   - Next.js 返回 HTML 404 页面，说明路由未被识别
   - 服务器日志中没有 `[Next.js API Route]` 输出

### 可能原因

1. **Next.js 开发服务器需要完全重启**
   - 已清除 `.next` 缓存
   - 需要确保服务器完全重启

2. **路由文件路径问题**
   - 检查文件夹名称是否正确：`[variantId]`（带方括号）
   - 检查文件名：`route.ts`（不是 `routes.ts`）

3. **Next.js 14.2 路由配置**
   - 已修复 params 类型（Next.js 14.2 中 params 是对象，不是 Promise）

---

## 🔧 调试步骤

### 步骤 1: 检查路由文件
```bash
ls -la apps/web/src/app/api/products/variant/\[variantId\]/route.ts
```

### 步骤 2: 检查服务器日志
在 Next.js 开发服务器的终端中，查找：
```
[Next.js API Route] GET /api/products/variant/[variantId]
```

如果没有看到这个日志，说明路由未被注册。

### 步骤 3: 完全重启服务器
```bash
# 停止服务器
pkill -f "next dev"

# 清除缓存
rm -rf apps/web/.next

# 重新启动
cd apps/web && npm run dev
```

### 步骤 4: 测试路由
```bash
curl http://localhost:3000/api/products/variant/test-id
```

应该看到：
- 如果路由正常：返回 JSON 数据或后端错误
- 如果路由未注册：返回 HTML 404 页面

---

## 📊 图片尺寸规格

### 桌面端 (> 1024px)
- **最大宽度**: 1000px
- **最大高度**: 1200px
- **宽高比**: 5:6 (1000:1200)

### 平板端 (768px - 1024px)
- **最大宽度**: 100%
- **内边距**: 16px
- **高度**: 自动（保持宽高比）

### 移动端 (< 768px)
- **最大宽度**: 100%
- **内边距**: 12px
- **高度**: 自动（保持宽高比）

---

## 🔍 调试日志位置

### 浏览器控制台
查找以下日志：
```
[Design Lab] Product image loaded: {
  naturalSize: "1000x1200",
  displaySize: "800x960",
  aspectRatio: "0.83",
  timestamp: "2025-01-27T22:10:00.000Z"
}

[Store] ===== hydrateProductFromVariantId START =====
[Store] API Request: { url: "/api/products/variant/...", method: "GET" }
[Store] API Response: { status: 200, duration: "45ms" }
```

### Next.js 服务器终端
查找以下日志：
```
[Next.js API Route] GET /api/products/variant/[variantId]
[Next.js API Route] Fetching from upstream: { url: "..." }
[Next.js API Route] Upstream response: { status: 200, ... }
```

---

## ⚠️ 待解决问题

### 404 错误
- **状态**: 未解决
- **原因**: Next.js 路由未被识别
- **下一步**: 
  1. 完全重启 Next.js 开发服务器
  2. 检查服务器终端日志
  3. 如果仍然 404，检查是否有其他路由冲突

### 图片尺寸
- **状态**: ✅ 已修复
- **验证**: 刷新浏览器页面，检查图片显示尺寸

---

## 📝 后续操作

1. **刷新浏览器页面** (http://localhost:3000/design-lab)
2. **打开浏览器控制台** (F12)
3. **检查日志输出**:
   - `[Design Lab] Product image loaded` - 图片加载日志
   - `[Store] hydrateProductFromVariantId` - API 调用日志
4. **检查图片显示**:
   - 图片应该显示为 1000x1200px（或按比例缩放）
   - 在小屏幕上应该响应式调整
5. **如果仍然 404**:
   - 检查 Next.js 服务器终端日志
   - 确认路由文件路径正确
   - 尝试完全重启服务器

---

## 🔗 相关文件

- `apps/web/src/app/design-lab/DesignLabClient.tsx` - Design Lab 组件
- `apps/web/src/app/globals.css` - 全局样式
- `apps/web/src/app/api/products/variant/[variantId]/route.ts` - Next.js API 路由
- `apps/web/public/design-lab-native/store.js` - 前端 Store
- `backend/src/routes/products.js` - 后端路由
- `backend/src/controllers/productController.js` - 后端控制器

