# 图片代理错误修复总结

[2025-01-30 19:00:00] 修复 Design Lab 5.0 中图片代理加载失败的问题

---

## 一、问题分析

### 1.1 错误现象

在 Design Lab 5.0 中选择艺术素材时，出现图片加载失败错误：

```
[DesignLab 5.0] ❌ Failed to load art image: Event {...}
[DesignLab 5.0] Failed URL: /api/image-proxy?src=https%3A%2F%2Fstorage.googleapis.com%2Fprint-main-product-images%2Fart-asset%2Femojis%2Fanimals%2F1034078648-alt01.png
```

### 1.2 根本原因

1. **原始图片不存在（404）**：GCS 中的图片文件可能已被删除或路径错误
2. **代理 API 返回 JSON 错误**：当上游图片返回 404 时，代理 API 返回 JSON 格式的错误响应
3. **Image 对象无法处理 JSON**：浏览器 Image 对象期望图片数据，但收到 JSON 响应，导致加载失败
4. **缺少 CORS 头**：代理 API 的错误响应缺少 CORS 头，可能影响错误信息的获取
5. **缺少降级方案**：代理失败时没有尝试直接加载原始 URL

---

## 二、修复方案

### 2.1 改进图片代理 API (`apps/web/src/app/api/image-proxy/route.ts`)

#### 添加 CORS 支持

```typescript
// [2025-01-30 19:00:00] 添加 CORS 头，确保浏览器可以访问错误响应
const corsHeaders = new Headers();
corsHeaders.set('Access-Control-Allow-Origin', '*');
corsHeaders.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
corsHeaders.set('Access-Control-Allow-Headers', 'Content-Type, X-Request-Id, X-Trace-Id');
```

**改进点：**
- 所有错误响应都添加 CORS 头
- 成功响应也添加 CORS 头
- 添加 OPTIONS 方法处理预检请求

#### 改进错误响应

```typescript
// [2025-01-30 19:00:00] 添加详细的错误信息，包括原始 URL
return NextResponse.json(
  { 
    error: 'Upstream error', 
    status: response.status,
    message: `Failed to fetch image from upstream: ${response.statusText}`,
    src: src.substring(0, 100)
  },
  { 
    status: response.status >= 500 ? 502 : response.status,
    headers: corsHeaders
  }
);
```

**改进点：**
- 错误响应包含更详细的信息（状态码、错误消息、原始 URL）
- 所有错误响应都添加 CORS 头

### 2.2 增强 DesignLab 5.0 错误处理 (`apps/web/src/app/design-lab/DesignLabClient5.0.tsx`)

#### 添加详细日志

```typescript
imgElement.onerror = async (error) => {
  const timestamp = new Date().toISOString();
  console.error('[DesignLab 5.0] ❌ Failed to load art image:', {
    error,
    imageUrl,
    originalUrl: artUrl,
    useProxy,
    timestamp
  });
  // ...
};
```

#### 检查代理 API 响应

```typescript
// 检查代理 API 的响应，获取详细错误信息
try {
  const proxyResponse = await fetch(imageUrl);
  if (!proxyResponse.ok) {
    const errorData = await proxyResponse.json().catch(() => ({}));
    console.error('[DesignLab 5.0] Proxy API error details:', {
      status: proxyResponse.status,
      statusText: proxyResponse.statusText,
      error: errorData,
      timestamp
    });
  }
} catch (fetchError) {
  console.error('[DesignLab 5.0] Failed to check proxy response:', {
    error: fetchError instanceof Error ? fetchError.message : String(fetchError),
    timestamp
  });
}
```

#### 添加降级方案

当代理失败时，尝试直接加载原始 URL：

```typescript
// [2025-01-30 19:00:00] 降级方案：尝试直接加载原始 URL
if (useProxy && artUrl) {
  const fallbackImg = new window.Image();
  fallbackImg.crossOrigin = 'anonymous';
  
  fallbackImg.onload = () => {
    // 成功加载后，创建 Fabric Image 对象并添加到画布
    // ...
  };
  
  fallbackImg.onerror = (fallbackError) => {
    console.error('[DesignLab 5.0] ❌ Fallback direct load also failed:', {
      error: fallbackError,
      originalUrl: artUrl,
      timestamp
    });
  };
  
  fallbackImg.src = artUrl;
}
```

**改进点：**
- 代理失败时自动尝试直接加载
- 直接加载成功时，正常添加到画布
- 提供完整的错误日志

---

## 三、修复内容总结

### 3.1 图片代理 API 改进

1. ✅ 添加 CORS 支持（所有响应）
2. ✅ 添加 OPTIONS 方法处理预检请求
3. ✅ 改进错误响应格式（包含详细错误信息）
4. ✅ 所有错误响应都添加 CORS 头

### 3.2 DesignLab 5.0 错误处理增强

1. ✅ 添加详细的错误日志（包含时间戳、URL、代理状态）
2. ✅ 检查代理 API 响应，获取详细错误信息
3. ✅ 添加降级方案（代理失败时尝试直接加载）
4. ✅ 降级方案成功时正常添加到画布

---

## 四、测试建议

### 4.1 测试场景

1. **正常情况**：图片存在，代理成功
   - 验证图片正常加载
   - 验证图片正确添加到画布

2. **图片不存在（404）**：原始图片返回 404
   - 验证代理 API 返回正确的错误响应
   - 验证错误日志包含详细信息
   - 验证降级方案是否尝试直接加载

3. **网络错误**：代理请求超时或网络错误
   - 验证错误处理逻辑
   - 验证降级方案是否触发

4. **CORS 问题**：直接加载时遇到 CORS 错误
   - 验证降级方案是否处理 CORS 错误
   - 验证错误日志是否记录 CORS 相关信息

### 4.2 验证点

- [ ] 代理 API 返回正确的 CORS 头
- [ ] 错误响应包含详细的错误信息
- [ ] DesignLab 5.0 正确记录错误日志
- [ ] 降级方案在代理失败时正确触发
- [ ] 降级方案成功时图片正确添加到画布

---

## 五、相关文件

- `apps/web/src/app/api/image-proxy/route.ts` - 图片代理 API
- `apps/web/src/app/design-lab/DesignLabClient5.0.tsx` - Design Lab 5.0 主组件
- `apps/web/src/app/design-lab/components/panels/ArtPanel.tsx` - 艺术素材面板

---

## 六、后续优化建议

1. **图片验证**：在选择艺术素材前，先验证图片是否存在
2. **缓存机制**：缓存已验证的图片 URL，避免重复验证
3. **用户提示**：当图片加载失败时，显示用户友好的错误提示
4. **重试机制**：添加自动重试机制（例如：重试 3 次）
5. **监控告警**：监控图片代理失败率，及时发现问题

---

**最后更新：** 2025-01-30 19:00:00

