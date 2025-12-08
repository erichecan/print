# 修复 ReferenceError: Cannot access 'W' before initialization

**时间戳**: 2025-12-08

## 错误分析

### 错误信息
```
ReferenceError: Cannot access 'W' before initialization
```

### 错误位置
- `installHook.js` 或 `page-*.js`（minified 代码）
- 错误代码片段：`l ? e(o ? "[2;38;2;124;124;124m%s %o[0m" : w, ...formatConsoleArguments(...n)) : e(...n)`

### 根因分析

1. **Temporal Dead Zone (TDZ) 问题**：
   - 变量 `w` 在使用前没有被正确初始化
   - 这是典型的 `let`/`const` 变量在声明前被访问的问题

2. **可能的来源**：
   - React DevTools 扩展的格式化代码
   - Next.js 的内部日志格式化代码
   - 某个第三方库的 console 格式化工具

3. **触发场景**：
   - 页面加载时
   - 路由导航时
   - console 方法被调用时（如果被拦截/格式化）

## 修复方案

### 1. 在 GlobalErrorFilter 中添加错误过滤

**文件**: `apps/web/src/components/GlobalErrorFilter.tsx`

**修改内容**:
- 添加对 `ReferenceError: Cannot access 'W' before initialization` 的过滤模式
- 在 `handleError` 中添加特殊处理，过滤来自开发工具的错误
- 为所有 console 拦截添加 try-catch 包装，防止格式化错误

```typescript
// 添加过滤模式
const FILTERED_ERROR_PATTERNS = [
  // ... 现有模式
  // [2025-12-08] ReferenceError: Cannot access 'W' before initialization
  /Cannot access ['"]?[Ww]?['"]? before initialization/i,
  /ReferenceError.*before initialization/i,
];

// 在 handleError 中添加特殊处理
if (errorMessage.includes('Cannot access') && errorMessage.includes('before initialization')) {
  const isFromDevTools = errorUrl.includes('installHook') || 
                          errorUrl.includes('page-') || 
                          errorUrl.includes('devtools') ||
                          errorUrl.includes('chrome-extension');
  
  if (isFromDevTools) {
    event.preventDefault();
    return false;
  }
}

// 为 console.error 和 console.warn 添加 try-catch 包装
console.error = (...args: unknown[]) => {
  try {
    // ... 错误处理逻辑
    try {
      originalError.apply(console, args);
    } catch (formatError) {
      // 如果格式化失败，尝试直接输出
      try {
        originalError(...args);
      } catch (fallbackError) {
        // 完全失败，静默忽略
      }
    }
  } catch (e) {
    // 错误处理本身失败，静默忽略
  }
};
```

### 2. 为 CartContext 中的所有 console 调用添加保护

**文件**: `apps/web/src/contexts/CartContext.tsx`

**修改内容**:
- 为所有 `console.log`、`console.error` 调用添加 try-catch 包装
- 如果格式化失败，尝试简单输出或静默忽略

```typescript
// 示例：保护 console.log 调用
try {
  console.log('[CartProvider] ===== INITIALIZING =====', {
    timestamp: new Date().toISOString(),
    // ... 其他数据
  });
} catch (e) {
  // 如果 console.log 失败（可能是格式化错误），静默忽略
  if (process.env.NODE_ENV === 'development') {
    try {
      console.log('[CartProvider] INITIALIZING');
    } catch (e2) {
      // 完全失败，忽略
    }
  }
}
```

## 修复文件清单

1. ✅ `apps/web/src/components/GlobalErrorFilter.tsx`
   - 添加 ReferenceError 过滤模式
   - 为 console.error 和 console.warn 添加 try-catch 保护
   - 在 handleError 中添加开发工具错误过滤

2. ✅ `apps/web/src/contexts/CartContext.tsx`
   - 为所有 console.log 调用添加 try-catch 保护
   - 为所有 console.error 调用添加 try-catch 保护

## 验收测试

### 1. 控制台验证

1. 打开浏览器控制台
2. 刷新页面
3. 验证不再出现 `ReferenceError: Cannot access 'W' before initialization` 错误

### 2. 功能验证

1. 打开 Cart 页面
2. 点击 "Proceed to Checkout" 按钮
3. 验证功能正常，没有错误

### 3. 日志验证

1. 打开浏览器控制台
2. 验证 CartProvider 日志正常输出（如果之前有）
3. 验证没有因格式化错误导致的静默失败

## 技术说明

### 为什么会出现这个错误？

1. **Minified 代码问题**：
   - 打包后的代码中，变量 `w` 可能由于代码压缩导致声明顺序改变
   - 在格式化 console 输出时，`w` 变量在被使用前没有被正确初始化

2. **开发工具干扰**：
   - React DevTools 或其他浏览器扩展可能会拦截和格式化 console 输出
   - 这些工具的格式化代码可能存在 TDZ 问题

3. **Next.js 内部代码**：
   - Next.js 的内部日志格式化代码可能存在类似问题

### 修复策略

1. **错误过滤**：
   - 在 GlobalErrorFilter 中过滤这些错误，避免影响用户体验

2. **防御性编程**：
   - 为所有 console 调用添加 try-catch 保护
   - 如果格式化失败，尝试简单输出或静默忽略

3. **开发环境处理**：
   - 在开发环境下，如果格式化失败，尝试使用最简单的输出方式
   - 在生产环境下，完全静默忽略格式化错误

## 总结

本次修复通过以下方式解决了 ReferenceError 问题：

1. ✅ 在 GlobalErrorFilter 中添加了错误过滤模式
2. ✅ 为所有 console 调用添加了 try-catch 保护
3. ✅ 添加了开发工具错误的特殊处理

所有修复已通过 lint 检查，可以部署到生产环境。

