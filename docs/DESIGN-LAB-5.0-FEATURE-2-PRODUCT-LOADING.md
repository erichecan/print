# Design Lab 5.0 - 功能 2: 商品图片动态加载

**创建时间**: 2025-12-20 03:05:00  
**状态**: ✅ 已完成  
**优先级**: 2

---

## 一、功能描述

根据 URL 参数（productId、colorId、variantId）动态加载商品图片。支持以下场景：

1. **服务端预取数据**（`initialProductData`）：如果提供了 variantId，使用服务端预取的数据
2. **根据 colorId**：从 URL 参数 colorId 更新颜色和图片
3. **根据 productId**：尝试从 API 获取商品图片（回退到默认图片）

---

## 二、实现内容

### 2.1 URL 参数支持

支持的 URL 参数：
- `productId`: 产品 ID
- `colorId`: 颜色 ID
- `variantId`: 变体 ID（优先使用服务端预取的数据）

### 2.2 数据加载逻辑

```typescript
优先级：
1. initialProductData (服务端预取) > 
2. colorId (URL 参数) > 
3. productId + API > 
4. 默认 (White)
```

### 2.3 状态管理

- 将 `productInfo` 从 `useState` 改为可更新的 state
- 支持动态更新 `color` 和 `baseImages`

---

## 三、技术实现

### 3.1 URL 参数获取

```typescript
const searchParams = useSearchParams();
const productId = searchParams?.get('productId') || undefined;
const colorId = searchParams?.get('colorId') || undefined;
const variantId = searchParams?.get('variantId') || undefined;
```

### 3.2 数据加载

```typescript
useEffect(() => {
  // 1. 优先使用服务端预取的数据
  if (initialProductData && variantId) {
    // 使用 initialProductData
  }
  
  // 2. 根据 colorId 更新颜色
  if (colorId) {
    // 更新 productInfo.color 和 baseImages
  }
  
  // 3. 根据 productId 从 API 获取
  if (productId) {
    getProductBaseImagesFromAPI(colorName, productId)
      .then(apiImages => {
        // 更新 baseImages
      });
  }
}, [searchParams, initialProductData]);
```

---

## 四、测试验证

### 4.1 测试 URL

1. **默认（无参数）**
   ```
   http://localhost:3000/design-lab
   ```
   - 应该显示默认的 White 颜色商品图片

2. **带 colorId 参数**
   ```
   http://localhost:3000/design-lab?colorId=176100
   ```
   - 应该根据 colorId 更新颜色（暂时使用默认 White，因为 colorId 到 colorName 的映射未实现）

3. **带 productId 参数**
   ```
   http://localhost:3000/design-lab?productId=6a62c76ef0978853a20391b6c32da4fe
   ```
   - 应该尝试从 API 获取商品图片

4. **带 variantId 参数**
   ```
   http://localhost:3000/design-lab?variantId=xxx
   ```
   - 应该使用服务端预取的数据（如果 page.tsx 预取了数据）

### 4.2 调试日志

打开浏览器控制台（F12），应该能看到：
```
[DesignLab 5.0] 功能2 - URL 参数: { productId: '...', colorId: '...', variantId: '...' }
[DesignLab 5.0] 功能2 - 使用服务端预取的数据: { ... }
或
[DesignLab 5.0] 功能2 - 根据 colorId 更新颜色: { colorId: '...', colorName: '...' }
或
[DesignLab 5.0] 功能2 - 尝试从 API 获取商品图片: { productId: '...', colorName: '...' }
```

---

## 五、后续优化

- [ ] 实现 colorId 到 colorName 的映射（从 API 或配置获取）
- [ ] 添加加载状态指示
- [ ] 添加错误处理（API 失败时显示友好提示）
- [ ] 支持更多 URL 参数（如 view、zoom 等）

---

**下一步**: 根据用户需求继续叠加其他功能
