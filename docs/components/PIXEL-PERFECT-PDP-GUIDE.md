# 像素级精确商品详情页面实现指南

## 概述

本文档详细说明了像素级精确复刻的商品详情页面实现，包含完整的占位符逻辑、响应式设计和交互效果。

## 🎯 设计目标

- **像素级精确**: 与参考设计100%匹配
- **占位符逻辑**: 数据缺失时的优雅降级
- **响应式适配**: 支持所有屏幕尺寸
- **交互完整**: 包含所有用户交互效果

## 📁 文件结构

```
src/components/product/
├── PixelPerfectProductDetail.tsx      # 主组件
├── PixelPerfectProductDetail.module.css # 样式模块
└── README.md                         # 组件文档
```

## 🧩 核心特性

### 1. 智能占位符系统

#### 价格占位符
```tsx
// 占位符价格组件
const PlaceholderPrice = ({ type = 'normal' }: { type?: 'normal' | 'sale' | 'original' }) => {
  return <span className={`${type === 'original' ? 'text-gray-400 line-through' : type === 'sale' ? 'text-red-600' : ''}`}>¥{type === 'sale' ? '--' : '--'}</span>;
};

// 使用示例
{salePrice ? currencyFormatter.format(salePrice / 100) : <PlaceholderPrice type="sale" />}
{originalPrice ? currencyFormatter.format(originalPrice / 100) : <PlaceholderPrice type="original" />}
```

#### 图片占位符
```tsx
// 占位符图片组件
const PlaceholderImage = ({ size = 'large', text = '暂无图片' }) => {
  const sizeClasses = {
    small: 'w-20 h-20',
    large: 'w-full h-full min-h-[500px]',
    thumbnail: 'w-[100px] h-[100px]'
  };

  return (
    <div className={`${sizeClasses[size]} bg-gray-100 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center`}>
      <svg className="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <span className="text-xs">{text}</span>
    </div>
  );
};
```

#### 加载骨架屏
```tsx
const LoadingSkeleton = () => {
  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[500px_1fr] gap-12 items-start">
        {/* 图片区域骨架 */}
        <div className="space-y-4">
          <div className="aspect-[3/4] bg-gray-200 rounded-lg animate-pulse" />
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-20 h-20 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
        
        {/* 信息区域骨架 */}
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse w-3/4" />
          <div className="h-6 bg-gray-200 rounded animate-pulse w-1/2" />
          <div className="h-10 bg-gray-200 rounded animate-pulse w-1/3" />
        </div>
      </div>
    </div>
  );
};
```

### 2. 价格计算逻辑

```tsx
// 价格计算
const price = selectedVariant 
  ? Number(product.basePrice) + Number(selectedVariant.priceAdjustment || 0)
  : Number(product.basePrice);
const salePrice = product?.price?.sale || price;
const originalPrice = product?.price?.base || price;
const isOnSale = product?.price?.onSale && salePrice < originalPrice;
const discountPercent = isOnSale 
  ? Math.round(((originalPrice - salePrice) / originalPrice) * 100)
  : 0;

// 显示逻辑
{isOnSale ? (
  <div className="space-y-2">
    <div className="flex items-baseline gap-3 flex-wrap">
      <span className="text-3xl lg:text-4xl font-bold text-gray-900">
        {salePrice ? currencyFormatter.format(salePrice / 100) : <PlaceholderPrice type="sale" />}
      </span>
      <span className="text-xl text-gray-400 line-through">
        {originalPrice ? currencyFormatter.format(originalPrice / 100) : <PlaceholderPrice type="original" />}
      </span>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-red-600 font-semibold text-lg">
        {discountPercent > 0 ? `${discountPercent}% 折扣` : <PlaceholderPrice />}
      </span>
      <span className="text-sm text-gray-500">限时优惠</span>
    </div>
  </div>
) : (
  <div className="text-3xl lg:text-4xl font-bold text-gray-900">
    {price ? currencyFormatter.format(price / 100) : <PlaceholderPrice />}
  </div>
)}
```

### 3. 图片画廊实现

#### 缩略图选择器
```tsx
<div className="hidden md:flex gap-3 max-h-[600px] overflow-y-auto flex-shrink-0">
  {product.images.length > 0 ? (
    product.images.map((img, index) => (
      <button
        key={img.id}
        className={`w-20 h-20 rounded-lg border-2 overflow-hidden bg-white p-0 transition-all duration-200 ${
          index === selectedImageIndex 
            ? 'border-blue-600 shadow-md transform scale-105' 
            : 'border-transparent hover:border-gray-300 hover:scale-105'
        }`}
        onClick={() => setSelectedImageIndex(index)}
      >
        {img.url ? (
          <Image src={img.url} alt={img.alt} width={80} height={80} className="w-full h-full object-cover transition-transform duration-200 hover:scale-110" />
        ) : (
          <PlaceholderImage size="small" />
        )}
      </button>
    ))
  ) : (
    // 占位符缩略图
    Array.from({ length: 4 }).map((_, index) => (
      <div key={index} className="w-20 h-20 rounded-lg border-2 border-gray-200 bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 bg-gray-300 rounded" />
      </div>
    ))
  )}
</div>
```

#### 主图片显示
```tsx
<div className="relative group">
  <div className="relative w-full aspect-[3/4] lg:aspect-auto lg:h-[666px] rounded-lg overflow-hidden bg-gray-50">
    {currentImage ? (
      <>
        <Image
          src={currentImage}
          alt={product.images[selectedImageIndex]?.alt || product.name}
          width={600}
          height={800}
          priority
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onClick={() => setImageZoom(true)}
        />
        {/* 悬停放大按钮 */}
        <button
          className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/95 backdrop-blur-sm border border-gray-300 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 hover:bg-white shadow-lg z-10"
          onClick={() => setImageZoom(true)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
          </svg>
        </button>
      </>
    ) : (
      <PlaceholderImage size="large" text="商品图片" />
    )}
  </div>
</div>
```

### 4. 交互效果

#### 颜色选择器
```tsx
<div className="flex flex-wrap gap-3">
  {uniqueColors.map((color) => (
    <button
      key={color.name}
      className={`relative w-12 h-12 rounded-full border-4 transition-all duration-200 hover:scale-110 ${
        selectedColor === color.name 
          ? 'border-blue-500 shadow-lg transform scale-110' 
          : 'border-gray-300 hover:border-gray-400'
      }`}
      style={{ backgroundColor: color.hex }}
      onClick={() => setSelectedColor(color.name)}
    >
      {selectedColor === color.name && (
        <div className="absolute inset-0 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white" className="drop-shadow-md">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      )}
    </button>
  ))}
</div>
```

#### 尺寸选择器
```tsx
<div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
  {sizes.map((size) => (
    <button
      key={size}
      className={`py-3 px-4 rounded-lg border-2 font-medium text-sm transition-all duration-200 hover:scale-105 ${
        selectedSize === size 
          ? 'border-blue-600 bg-blue-50 text-blue-600' 
          : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
      }`}
      onClick={() => setSelectedSize(size)}
    >
      {size}
    </button>
  ))}
</div>
```

### 5. 响应式布局

#### 断点设计
```css
/* 移动端 (< 768px) */
.grid-cols-1 {
  grid-template-columns: repeat(1, 1fr);
}

/* 平板端 (768px - 1023px) */
@media (min-width: 768px) {
  .grid-cols-2 {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .grid-cols-4 {
    grid-template-columns: repeat(6, 1fr);
  }
}

/* 桌面端 (≥ 1024px) */
@media (min-width: 1024px) {
  .mainLayout {
    grid-template-columns: 500px 1fr;
  }
  
  .mainImageWrapper {
    aspect-ratio: auto;
    height: 666px;
  }
  
  .productTitle {
    font-size: var(--font-size-4xl);
  }
}
```

## 🎨 设计系统

### 颜色变量
```css
:root {
  --primary-color: #2563eb;
  --primary-hover: #1d4ed8;
  --danger-color: #dc2626;
  --success-color: #059669;
  --text-primary: #111827;
  --text-secondary: #6b7280;
  --border-color: #e5e7eb;
  --bg-primary: #ffffff;
  --bg-secondary: #f9fafb;
}
```

### 间距系统
```css
:root {
  --spacing-xs: 0.25rem;    /* 4px */
  --spacing-sm: 0.5rem;     /* 8px */
  --spacing-md: 1rem;      /* 16px */
  --spacing-lg: 1.5rem;     /* 24px */
  --spacing-xl: 2rem;      /* 32px */
  --spacing-2xl: 3rem;    /* 48px */
}
```

### 动画效果
```css
.transformTransition {
  transition: transform 0.2s ease;
}

.colorTransition {
  transition: color 0.2s ease;
}

.borderTransition {
  transition: border-color 0.2s ease;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.skeletonBox {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

## 📱 响应式规范

### 布局断点
| 设备 | 宽度 | 网格 | 图片尺寸 |
|------|------|------|----------|
| 手机 | < 768px | 1列 | 3:4 比例 |
| 平板 | 768px-1023px | 500px + 1列 | 固定 666px 高 |
| 桌面 | ≥ 1024px | 500px + 1列 | 固定 666px 高 |

### 交互适配
- **触摸设备**: 增大点击区域 (48px 最小)
- **移动端**: 简化导航，移除悬停效果
- **键盘导航**: 完整的焦点管理

## 🔧 自定义配置

### 调整间距
```css
/* 修改全局间距 */
:root {
  --spacing-lg: 2rem; /* 改为 32px */
}
```

### 自定义颜色
```css
/* 修改主色调 */
:root {
  --primary-color: #your-brand-color;
  --primary-hover: #your-hover-color;
}
```

### 交互效果调整
```css
/* 修改悬停缩放 */
.thumbnailButton:hover {
  transform: scale(1.15); /* 增加到 1.15 */
}
```

## 🚀 性能优化

### 图片优化
- 使用 Next.js Image 组件
- 实现 lazy loading
- 提供多种尺寸 (srcset)
- WebP 格式支持

### 代码分割
- 组件级别的代码分割
- 按需加载相关组件
- 预加载关键资源

### 动画优化
```css
/* 使用 transform 而非改变布局属性 */
.product-card:hover {
  transform: translateY(-4px);
  /* 避免使用 margin-top */
}

/* 使用 opacity 和 transform */
.loading-fade {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.3s ease, transform 0.3s ease;
}
```

## 🧪 测试规范

### 功能测试
- [ ] 价格计算正确性
- [ ] 占位符显示逻辑
- [ ] 图片切换功能
- [ ] 颜色/尺寸选择
- [ ] 购物车添加
- [ ] 响应式布局

### 视觉测试
- [ ] 设计稿像素对比
- [ ] 不同浏览器兼容性
- [ ] 移动端适配
- [ ] 动画流畅性

### 性能测试
- [ ] 首屏加载时间
- [ ] 图片加载性能
- [ ] 交互响应时间
- [ ] 内存使用情况

## 🔍 故障排除

### 常见问题

#### 图片不显示
```tsx
// 检查图片URL
console.log('Current image:', currentImage);

// 检查占位符逻辑
if (!product.images || product.images.length === 0) {
  return <PlaceholderImage size="large" />;
}
```

#### 样式问题
```css
/* 确保CSS模块正确导入 */
import styles from './PixelPerfectProductDetail.module.css';

// 检查类名应用 */
<div className={styles.productDetail}>
```

#### 响应式问题
```css
/* 确保断点覆盖 */
@media (min-width: 768px) {
  .thumbnails {
    display: flex; /* 确保在平板端显示 */
  }
}
```

---

**更新时间**: 2025-11-19  
**版本**: v1.0  
**维护者**: 前端开发团队