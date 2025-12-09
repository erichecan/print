/**
 * Pixel Perfect Product Detail Component
 * [2025-11-19] 像素级精确复刻的商品详情页面，包含完整的占位符逻辑
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { productsApi } from '@/lib/api';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/useToast';
import { buildNewDesignUrl } from '@/utils/designUrl'; // [2025-12-08 14:40:00] 使用新的 Design Lab URL 构建器

interface ProductVariant {
  id: string;
  color: string | null;
  colorHex: string | null;
  size: string | null;
  sku: string;
  priceAdjustment: number;
  stockQuantity: number;
  imageUrl: string | null;
}

interface ProductImage {
  id: string;
  url: string;
  alt: string | null;
  sortOrder: number;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  basePrice: number;
  price?: {
    base: number;
    sale: number;
    currency: string;
    onSale?: boolean;
  };
  sku: string;
  variants: ProductVariant[];
  images: ProductImage[];
  category?: {
    name: string;
    slug: string;
  } | null;
  brand?: {
    name: string;
    slug: string;
  } | null;
  rating: {
    average: number;
    count: number;
  };
}

interface LoadingState {
  isLoading: boolean;
  stage: 'fetching' | 'processing' | 'ready';
}

const DESIGN_LAB_PAYLOAD_KEY = 'designLab:productPayload';

const currencyFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

// 占位符价格显示组件
const PlaceholderPrice = ({ type = 'normal' }: { type?: 'normal' | 'sale' | 'original' }) => {
  return <span className={`${type === 'original' ? 'text-gray-400 line-through' : type === 'sale' ? 'text-red-600' : ''}`}>¥{type === 'sale' ? '--' : '--'}</span>;
};

// 占位符图片组件
const PlaceholderImage = ({ size = 'large', text = '暂无图片' }: { size?: 'small' | 'large' | 'thumbnail'; text?: string }) => {
  const sizeClasses = {
    small: 'w-20 h-20',
    large: 'w-full h-full min-h-[500px]',
    thumbnail: 'w-[100px] h-[100px]'
  };

  const iconSizes = {
    small: 'w-8 h-8',
    large: 'w-16 h-16',
    thumbnail: 'w-8 h-8'
  };

  return (
    <div className={`${sizeClasses[size]} bg-gray-100 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center text-gray-400`}>
      <svg className={`${iconSizes[size]} mb-2`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <span className={`text-xs ${size === 'large' ? 'text-sm' : 'text-xs'}`}>{text}</span>
    </div>
  );
};

// 加载骨架屏组件
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
          <div className="space-y-4">
            <div className="h-12 bg-gray-200 rounded animate-pulse" />
            <div className="h-12 bg-gray-200 rounded animate-pulse" />
            <div className="h-12 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
};

export function PixelPerfectProductDetail() {
  const params = useParams();
  const router = useRouter(); // [2025-01-28 03:10:00] 添加 router 用于导航
  const slug = params?.slug as string;
  const { addItem } = useCart();
  const { success, error: showError } = useToast();

  // 状态管理
  const [product, setProduct] = useState<Product | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: true,
    stage: 'fetching'
  });
  const [error, setError] = useState<string | null>(null);
  
  // 选择器状态
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedPrintLocation, setSelectedPrintLocation] = useState<'front' | 'back'>('front');
  const [quantity, setQuantity] = useState(1);
  const [isFavorited, setIsFavorited] = useState(false);
  
  // 交互状态
  const [addingToCart, setAddingToCart] = useState(false);
  const [imageZoom, setImageZoom] = useState(false);
  const [activeTab, setActiveTab] = useState<'description' | 'specs' | 'reviews'>('description');
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);

  // [2025-11-19 08:50:00] 获取唯一颜色和尺寸（安全处理 product 为 null 的情况）
  const colors = product?.variants 
    ? Array.from(new Set(product.variants.map(v => v.color).filter(Boolean))) as string[]
    : [];
  const sizes = product?.variants
    ? Array.from(new Set(product.variants.map(v => v.size).filter(Boolean))) as string[]
    : [];
  const colorVariants = product?.variants?.filter(v => v.color && v.colorHex) || [];

  // [2025-11-19 08:50:00] 找到选中的变体（需要先检查 product 是否存在）
  const selectedVariant = product?.variants?.find(
    v => (selectedColor ? v.color === selectedColor : !v.color) &&
       (selectedSize ? v.size === selectedSize : !v.size)
  );

  // [2025-11-19 08:50:00] 价格计算：安全处理 basePrice 可能为 null 的情况
  // 后端返回的 basePrice 是整数（分），price.base 是元，优先使用 price.base
  const basePriceInDollars = product?.price?.base ?? (product?.basePrice != null ? Number(product.basePrice) / 100 : 0);
  
  const priceAdjustmentInDollars = selectedVariant?.priceAdjustment != null 
    ? Number(selectedVariant.priceAdjustment) / 100 
    : 0;
  
  const price = basePriceInDollars + priceAdjustmentInDollars;
  const salePrice = product?.price?.sale || price;
  const originalPrice = product?.price?.base || price;
  const isOnSale = product?.price?.onSale && salePrice < originalPrice;
  const discountPercent = isOnSale && originalPrice > 0
    ? Math.round(((originalPrice - salePrice) / originalPrice) * 100)
    : 0;

  // 获取唯一颜色
  const uniqueColors = Array.from(
    new Map(
      colorVariants.map(v => [v.color, { name: v.color, hex: v.colorHex || '#FFFFFF' }])
    ).values()
  );

  // 自动选择第一个变体
  useEffect(() => {
    if (!product) return;
    if (selectedColor || selectedSize) return;
    const firstVariant = product.variants[0];
    if (firstVariant) {
      setSelectedColor(firstVariant.color || null);
      setSelectedSize(firstVariant.size || null);
    }
  }, [product, selectedColor, selectedSize]);

  // 获取商品数据
  useEffect(() => {
    if (!slug) return;
    
    async function fetchProduct() {
      try {
        setLoadingState({ isLoading: true, stage: 'fetching' });
        const data = await productsApi.getBySlug(slug);
        setProduct(data as Product);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load product');
      } finally {
        setLoadingState({ isLoading: false, stage: 'ready' });
      }
    }
    
    fetchProduct();
  }, [slug]);

  // 获取相关商品
  useEffect(() => {
    if (!slug || !product) return;
    async function fetchRelated() {
      try {
        const response = await productsApi.getRelated(slug, 8);
        setRelatedProducts(response.data || []);
      } catch (err) {
        console.error('Failed to load related products:', err);
      }
    }
    fetchRelated();
  }, [slug, product]);

  const persistDesignLabPayload = useCallback((variant: ProductVariant) => {
    if (typeof window === 'undefined' || !product) return;
    try {
      const galleryUrls = (product.images || []).map((img) => img.url).filter(Boolean);
      const fallbackImage = variant.imageUrl || galleryUrls[0] || '/assets/hero/hero-card-tee.jpg';
      const baseImages = {
        front: variant.imageUrl || fallbackImage,
        back: galleryUrls[1] || fallbackImage,
        sleeve: galleryUrls[2] || fallbackImage,
      };
      const colorOptions = Array.from(
        new Set(
          (product.variants || [])
            .map((v) => v.color)
            .filter((color): color is string => Boolean(color))
        )
      );

      const payload = {
        productId: product.id,
        productName: product.name,
        variantId: variant.id,
        color: variant.color || null,
        colors: colorOptions,
        baseImages,
        gallery: galleryUrls,
      };

      window.localStorage.setItem(DESIGN_LAB_PAYLOAD_KEY, JSON.stringify(payload));
    } catch (err) {
      console.warn('[ProductDetail] Failed to persist Design Lab payload', err);
    }
  }, [product]);

  // 添加到购物车
  const handleAddToCart = useCallback(async () => {
    if (!selectedVariant) {
      showError('请选择颜色和尺寸');
      return;
    }

    try {
      setAddingToCart(true);
      await addItem(selectedVariant.id, quantity);
      success('商品已添加到购物车');
    } catch (err) {
      showError('添加到购物车失败，请重试');
    } finally {
      setAddingToCart(false);
    }
  }, [selectedVariant, quantity, addItem, success, showError]);

  // [2025-12-08 14:40:00] 开始设计 - 跳转到新的 Design Lab 页面
  const handleStartDesign = useCallback(() => {
    if (!selectedVariant) {
      showError('请选择颜色和尺寸');
      return;
    }

    try {
      // [2025-12-08 14:40:00] 保存设计器载荷（用于兼容）
      persistDesignLabPayload(selectedVariant);

      // [2025-12-08 14:40:00] 构建新的 Design Lab URL
      const designUrl = buildNewDesignUrl({
        variantId: selectedVariant.id,
        productId: product?.id,
        color: selectedVariant.color || undefined,
        size: selectedVariant.size || undefined,
        referrer: 'product_detail',
      });

      // [2025-12-08 14:40:00] 使用 router.push 进行客户端导航
      router.push(designUrl);
    } catch (error) {
      console.error('[PixelPerfectProductDetail] Failed to build design URL:', error);
      showError('无法开始设计：缺少必要参数。请刷新页面后重试。');
    }
  }, [selectedVariant, showError, persistDesignLabPayload, router, product]);

  // 加载状态
  if (loadingState.isLoading) {
    return <LoadingSkeleton />;
  }

  // 错误状态
  if (error || !product) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 py-6">
        <div className="text-center py-12">
          <div className="text-red-600 text-lg mb-4">{error || '商品未找到'}</div>
          <Link href="/products" className="inline-block px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
            返回商品列表
          </Link>
        </div>
      </div>
    );
  }

  // [2025-11-19 08:50:00] 安全获取图片 URL
  const fallbackImage = '/assets/hero/hero-card-tee.jpg';
  const currentImage = product?.images?.[selectedImageIndex]?.url || product?.images?.[0]?.url || fallbackImage;

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6">
      {/* 面包屑导航 */}
      <nav className="mb-6 text-sm">
        <ol className="flex items-center space-x-2">
          <li><Link href="/" className="text-blue-600 hover:underline">首页</Link></li>
          <li className="text-gray-400">/</li>
          <li><Link href="/products" className="text-blue-600 hover:underline">商品</Link></li>
          <li className="text-gray-400">/</li>
          <li className="text-gray-600 truncate max-w-[200px]">{product.name}</li>
        </ol>
      </nav>

      {/* 主要布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-[500px_1fr] gap-12 items-start">
        {/* 左侧：图片画廊 */}
        <div className="space-y-4">
          {/* 缩略图 */}
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
                  aria-label={`查看图片 ${index + 1}`}
                >
                  {img.url ? (
                    <Image 
                      src={img.url} 
                      alt={img.alt || `${product.name} 视图 ${index + 1}`} 
                      width={80} 
                      height={80} 
                      className="w-full h-full object-cover transition-transform duration-200 hover:scale-110" 
                    />
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

          {/* 主图片 */}
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
                  {/* 图片悬停放大按钮 */}
                  <button
                    className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/95 backdrop-blur-sm border border-gray-300 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 hover:bg-white shadow-lg z-10"
                    onClick={() => setImageZoom(true)}
                    aria-label="放大图片"
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
            
            {/* 收藏按钮 */}
            <button
              className={`absolute top-3 left-3 w-10 h-10 rounded-full border-2 transition-all duration-200 z-10 ${
                isFavorited 
                  ? 'bg-red-500 border-red-500 text-white' 
                  : 'bg-white/95 border-gray-300 hover:bg-white hover:scale-110 hover:border-red-400'
              }`}
              onClick={() => setIsFavorited(!isFavorited)}
              aria-label={isFavorited ? '取消收藏' : '添加收藏'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill={isFavorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={isFavorited ? 0 : 1.5}>
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          </div>

          {/* 移动端图片指示器 */}
          <div className="md:hidden flex justify-center space-x-2 mt-4">
            {product.images.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === selectedImageIndex ? 'bg-blue-600' : 'bg-gray-300'
                }`}
                onClick={() => setSelectedImageIndex(index)}
                aria-label={`切换到图片 ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* 右侧：商品详情 */}
        <div className="space-y-6">
          {/* 商品标题 */}
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 leading-tight mb-2">
              {product.name || '商品名称'}
            </h1>
            
            {/* 品牌/艺术家信息 */}
            {product.brand ? (
              <div className="text-sm text-gray-600">
                设计和销售由 <Link href={`/products?brand=${product.brand.slug}`} className="text-blue-600 font-medium hover:underline hover:text-blue-700 transition-colors">
                  {product.brand.name}
                </Link>
              </div>
            ) : (
              <div className="h-6 bg-gray-100 rounded animate-pulse w-1/3"></div>
            )}
          </div>

          {/* 价格区域 */}
          <div className="py-4 border-t border-b border-gray-200">
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
          </div>

          {/* 评分 */}
          <div className="flex items-center gap-3 flex-wrap">
            {product?.rating?.count > 0 ? (
              <>
                <span className="font-semibold text-gray-900 text-lg">
                  {product.rating.average.toFixed(1)}
                </span>
                <div className="flex text-yellow-400">
                  {'★'.repeat(Math.floor(product.rating.average))}
                  {'☆'.repeat(5 - Math.floor(product.rating.average))}
                </div>
                <span className="text-gray-600 text-sm">({product.rating.count} 条评价)</span>
              </>
            ) : (
              <>
                <span className="font-semibold text-gray-900 text-lg">--</span>
                <div className="flex text-gray-300">
                  {'☆☆☆☆☆'}
                </div>
                <span className="text-gray-400 text-sm">暂无评价</span>
              </>
            )}
          </div>

          {/* 颜色选择器 */}
          {colors.length > 0 ? (
            <div className="space-y-3">
              <h3 className="font-bold text-gray-900">颜色</h3>
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
                    aria-label={`选择 ${color.name}`}
                    title={color.name}
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
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="font-bold text-gray-900">颜色</h3>
              <div className="h-12 bg-gray-100 rounded animate-pulse w-1/2"></div>
            </div>
          )}

          {/* 尺寸选择器 */}
          {sizes.length > 0 ? (
            <div className="space-y-3">
              <h3 className="font-bold text-gray-900">尺寸</h3>
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
                    aria-label={`选择尺寸 ${size}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="font-bold text-gray-900">尺寸</h3>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"></div>
                ))}
              </div>
            </div>
          )}

          {/* 数量选择器 */}
          <div className="space-y-3">
            <h3 className="font-bold text-gray-900">数量</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center border-2 border-gray-300 rounded-lg">
                <button
                  className="px-4 py-3 text-gray-600 hover:bg-gray-50 transition-colors rounded-l-lg"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  aria-label="减少数量"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                  </svg>
                </button>
                <div className="px-6 py-3 font-semibold min-w-[60px] text-center">
                  {quantity}
                </div>
                <button
                  className="px-4 py-3 text-gray-600 hover:bg-gray-50 transition-colors rounded-r-lg"
                  onClick={() => setQuantity(quantity + 1)}
                  aria-label="增加数量"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
              
              {/* 库存状态 */}
              <span className="text-sm text-gray-600">
                {selectedVariant?.stockQuantity && selectedVariant.stockQuantity > 0
                  ? `库存 ${selectedVariant.stockQuantity} 件`
                  : '库存紧张'
                }
              </span>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="space-y-3">
            <button
              className={`w-full py-4 px-6 rounded-lg font-bold text-lg transition-all duration-200 transform hover:scale-[1.02] ${
                !selectedVariant || addingToCart
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg'
              }`}
              onClick={handleAddToCart}
              disabled={!selectedVariant || addingToCart}
            >
              {addingToCart ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  添加中...
                </span>
              ) : (
                '加入购物车'
              )}
            </button>
            
            <button
              className={`w-full py-4 px-6 rounded-lg font-bold text-lg transition-all duration-200 transform hover:scale-[1.02] ${
                !selectedVariant
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-900 text-white hover:bg-gray-800 hover:shadow-lg'
              }`}
              onClick={handleStartDesign}
              disabled={!selectedVariant}
            >
              开始定制设计
            </button>
          </div>

          {/* 服务保障 */}
          <div className="space-y-2 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-green-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>100% 满意保证</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-blue-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>免费送货</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-purple-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 12l.01 0m4.95-4.95a2.5 2.5 0 10-3.536 3.536L12 15.536l-1.424-1.424a2.5 2.5 0 10-3.536-3.536L7.05 7.05a2.5 2.5 0 000 3.536l4.95 4.95z" />
              </svg>
              <span>专业设计支持</span>
            </div>
          </div>
        </div>
      </div>

      {/* 商品详情标签页 */}
      <div className="mt-12">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {['description', 'specs', 'reviews'].map((tab) => (
              <button
                key={tab}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab(tab as any)}
              >
                {tab === 'description' ? '商品描述' : tab === 'specs' ? '规格参数' : '用户评价'}
              </button>
            ))}
          </nav>
        </div>

        <div className="py-8">
          {activeTab === 'description' && (
            <div className="prose prose-lg max-w-none">
              {product.description ? (
                <div dangerouslySetInnerHTML={{ __html: product.description }} />
              ) : (
                <div className="space-y-4">
                  <div className="h-6 bg-gray-100 rounded animate-pulse"></div>
                  <div className="h-6 bg-gray-100 rounded animate-pulse w-4/5"></div>
                  <div className="h-6 bg-gray-100 rounded animate-pulse w-3/4"></div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'specs' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="font-medium">SKU</span>
                  <span>{product.sku || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="font-medium">分类</span>
                  <span>{product.category?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="font-medium">品牌</span>
                  <span>{product.brand?.name || 'N/A'}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="font-medium">材质</span>
                  <span>100% 棉</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="font-medium">重量</span>
                  <span>180g/m²</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="font-medium">洗涤方式</span>
                  <span>机洗，冷水</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="text-center py-12 text-gray-500">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="mx-auto mb-4 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p>暂无用户评价</p>
              <p className="text-sm mt-2">成为第一个评价此商品的用户</p>
            </div>
          )}
        </div>
      </div>

      {/* 相关商品 */}
      {relatedProducts.length > 0 && (
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">相关商品</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {relatedProducts.map((related) => (
              <Link
                key={related.id}
                href={`/products/${related.slug}`}
                className="group block bg-white rounded-lg border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:border-gray-300"
              >
                <div className="aspect-[3/4] bg-gray-100 overflow-hidden">
                  {related.imageUrl ? (
                    <Image
                      src={related.imageUrl}
                      alt={related.name}
                      width={300}
                      height={400}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <PlaceholderImage size="large" text="暂无图片" />
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {related.name}
                  </h3>
                  <div className="text-lg font-bold text-gray-900">
                    {related.price ? currencyFormatter.format(related.price / 100) : <PlaceholderPrice />}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 图片放大模态框 */}
      {imageZoom && currentImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setImageZoom(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <Image
              src={currentImage}
              alt={product.name}
              width={1200}
              height={1600}
              className="w-full h-full object-contain"
            />
            <button
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors"
              onClick={() => setImageZoom(false)}
              aria-label="关闭放大图"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}