/**
 * Product Detail Page - Redbubble Style with Tailwind CSS
* 完全使用 Tailwind CSS 重新实现
 */
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import SafeImage from '@/components/SafeImage';
import Link from 'next/link';
import { productsApi } from '@/lib/api';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/useToast';
import { useAddToCart } from '@/hooks/useAddToCart';
import { useBuyNow } from '@/hooks/useBuyNow';
import { SocialShareMenu, ShareConfig } from '@/components/social-share';
import { StructuredData } from '@/components/seo/StructuredData';
import { generateProductSchema } from '@/lib/seo';
import { CategorySidebar } from '@/components/catalog/CategorySidebar'; // 商品详情页左侧分类导航

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

const currencyFormatter = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
});

export function ProductDetailContent() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const { success, error: showError } = useToast();
  const { addToCart, isLoading: isAddingToCart } = useAddToCart({
    onSuccess: (cartCount) => {
      // 购物车数量已更新，无需额外操作
      console.log('[ProductDetail] Added to cart, count:', cartCount);
    },
    onError: (error) => {
      console.error('[ProductDetail] Failed to add to cart:', error);
    },
  });
  const { buyNow, isLoading: isBuyingNow } = useBuyNow({
    onSuccess: () => {
      console.log('[ProductDetail] Buy now successful');
    },
    onError: (error) => {
      console.error('[ProductDetail] Failed to buy now:', error);
    },
  });

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
// 移除 Print Location 状态（模块已移除）
  const [quantity, setQuantity] = useState(1);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
// 悬停预览颜色状态
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);

  // Get unique colors and sizes from variants
  const colors = Array.from(new Set(product?.variants.map(v => v.color).filter(Boolean))) as string[];
  const sizes = Array.from(new Set(product?.variants.map(v => v.size).filter(Boolean))) as string[];
  const colorVariants = product?.variants.filter(v => v.color && v.colorHex) || [];

  // Find selected variant
  const selectedVariant = product?.variants.find(
    v =>
      (selectedColor ? v.color === selectedColor : !v.color) &&
      (selectedSize ? v.size === selectedSize : !v.size)
  );

  // Auto-select first variant
  useEffect(() => {
    if (!product) return;
    if (selectedColor || selectedSize) return;
    const firstVariant = product.variants[0];
    if (firstVariant) {
      setSelectedColor(firstVariant.color || null);
      setSelectedSize(firstVariant.size || null);
    }
  }, [product, selectedColor, selectedSize]);

  useEffect(() => {
    if (!slug) return;
    async function fetchProduct() {
      try {
        setLoading(true);
        const data = await productsApi.getBySlug(slug);
        setProduct(data as Product);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load product');
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [slug]);

  // Fetch related products
  useEffect(() => {
    if (!slug || !product) return;
    async function fetchRelated() {
      try {
        setLoadingRelated(true);
        const response = await productsApi.getRelated(slug, 8);
        setRelatedProducts(response.data || []);
      } catch (err) {
        console.error('Failed to load related products:', err);
      } finally {
        setLoadingRelated(false);
      }
    }
    fetchRelated();
  }, [slug, product]);

// 开始设计 - 跳转到原生 HTML 版本的 Design Lab（功能完整）
  const handleStartDesign = () => {
    if (!selectedVariant) {
      showError('Please select a color and size first');
      return;
    }
    window.location.href = `/design-lab-native.html?variantId=${selectedVariant.id}`;
  };

// 使用 useAddToCart hook - 包含防抖、错误处理和埋点
  const handleAddToCart = async () => {
    if (!selectedVariant) {
      showError('Please select a color and size first');
      return;
    }
    if (selectedVariant.stockQuantity < quantity) {
      showError(`Only ${selectedVariant.stockQuantity} items available in stock`);
      return;
    }
    await addToCart(selectedVariant.id, quantity);
  };

// 使用 useBuyNow hook - 包含防抖、错误处理和埋点
  const handleBuyNow = async () => {
    if (!selectedVariant) {
      showError('Please select a color and size first');
      return;
    }
    if (selectedVariant.stockQuantity < quantity) {
      showError(`Only ${selectedVariant.stockQuantity} items available in stock`);
      return;
    }
    await buyNow(selectedVariant.id, quantity);
  };

  if (loading) {
    return (
      <div className="max-w-container mx-auto px-4 py-6">
        <div className="text-center py-12 text-lg text-gray-600">Loading product...</div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-container mx-auto px-4 py-6">
        <div className="text-center py-12 text-lg text-gray-600">{error || 'Product not found'}</div>
        <Link href="/products" className="text-blue-600 hover:underline">Back to Products</Link>
      </div>
    );
  }

  const fallbackImage = '/assets/hero/hero-card-tee.jpg';
// 颜色切换图片逻辑：
  // 1. 如果悬停在某个颜色上，显示该颜色的 variant 图片（预览）
  // 2. 如果选中了颜色，显示选中 variant 的图片
  // 3. 否则显示产品主图片
  const getImageForColor = (colorName: string | null) => {
    if (!colorName) return null;
    const variant = product.variants.find(v => v.color === colorName);
    return variant?.imageUrl || null;
  };
  
  const previewImage = hoveredColor ? getImageForColor(hoveredColor) : null;
  const selectedImage = selectedVariant?.imageUrl || null;
  const currentImage = previewImage 
    ? previewImage 
    : (selectedImage || product.images[selectedImageIndex]?.url || product.images[0]?.url || fallbackImage);
  const price = selectedVariant
    ? Number(product.basePrice) + Number(selectedVariant.priceAdjustment || 0)
    : Number(product.basePrice);
  const salePrice = product.price?.sale || price;
  const originalPrice = product.price?.base || price;
  const isOnSale = product.price?.onSale && salePrice < originalPrice;
  const discountPercent = isOnSale 
    ? Math.round(((originalPrice - salePrice) / originalPrice) * 100)
    : 0;

  // Get unique colors with hex values
  const uniqueColors = Array.from(
    new Map(
      colorVariants.map(v => [v.color, { name: v.color, hex: v.colorHex || '#FFFFFF' }])
    ).values()
  );

// 生成产品结构化数据 for Issue #154
  const productSchema = product ? generateProductSchema({
    name: product.name,
    description: product.description || `${product.name} - Custom apparel from suvernire plus`,
    image: currentImage.startsWith('http') ? currentImage : (typeof window !== 'undefined' ? `${window.location.origin}${currentImage}` : currentImage),
    price: (salePrice / 100).toFixed(2),
    currency: 'CAD',
    sku: product.sku,
    brand: product.brand?.name || 'suvernire plus',
    availability: selectedVariant && selectedVariant.stockQuantity > 0 ? 'InStock' : 'OutOfStock',
  }) : null;

// 添加评分结构化数据 for Issue #154
  const aggregateRatingSchema = product && product.rating.count > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'AggregateRating',
    ratingValue: product.rating.average.toString(),
    reviewCount: product.rating.count.toString(),
    bestRating: '5',
    worstRating: '1',
  } : null;

  return (
    <div className="max-w-container mx-auto px-4 py-6">
{/* 结构化数据 (JSON-LD) for Issue #154 */}
      {productSchema && <StructuredData data={[productSchema, ...(aggregateRatingSchema ? [aggregateRatingSchema] : [])]} />}
      
{/* 商品详情页布局：左侧分类导航 + 右侧产品内容 */}
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 items-start">
{/* 左侧分类导航（只显示有产品的分类） */}
        <aside className="hidden lg:block">
          <CategorySidebar currentCategorySlug={product.category?.slug ? String(product.category.slug) : undefined} />
        </aside>
        
        {/* Main Product Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-12 items-start w-full">
        {/* Left: Image Gallery */}
        <div className="flex flex-col md:flex-row gap-4 items-start">
          {/* Thumbnails - Vertical on desktop, horizontal on mobile */}
          {/* Desktop: Vertical on left */}
          <div className="hidden md:flex flex-col gap-3 max-h-[600px] overflow-y-auto flex-shrink-0">
            {product.images.length > 0 ? (
              product.images.map((img, index) => (
                <button
                  key={img.id}
                  className={`w-20 h-20 rounded border-2 overflow-hidden bg-white p-0 transition-colors ${
                    index === selectedImageIndex ? 'border-blue-600' : 'border-transparent hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedImageIndex(index)}
                  aria-label={`View image ${index + 1}`}
                >
                  <SafeImage src={img.url} alt={img.alt || `${product.name} view ${index + 1}`} width={80} height={80} className="w-full h-full object-cover" />
                </button>
              ))
            ) : (
              <div className="w-20 h-20 rounded border-2 border-gray-300 bg-gray-100 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="8.5" cy="8.5" r="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
          </div>

          {/* Main Image - 始终显示灰色框，固定尺寸 */}
          <div className="relative w-full md:w-[500px] md:h-[666px] aspect-[3/4] md:aspect-auto flex-shrink-0 rounded overflow-hidden bg-gray-100">
            {product.images.length > 0 ? (
              <>
                <button 
                  className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 border border-gray-300 flex items-center justify-center cursor-pointer z-10 hover:bg-white hover:scale-110 transition-all" 
                  aria-label="Add to favorites" 
                  title="Add to favorites"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="stroke-gray-800">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </button>
                <SafeImage
                  src={currentImage}
                  alt={product.images[selectedImageIndex]?.alt || product.name}
                  width={600}
                  height={800}
                  priority
                  className="w-full h-full object-cover"
                />
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300 rounded text-gray-400">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-300">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="8.5" cy="8.5" r="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
          </div>
          
{/* 移动端缩略图：底部横向滑动 */}
          {product.images.length > 1 && (
            <div className="md:hidden w-full overflow-x-auto pb-2 -mx-4 px-4" style={{ scrollbarWidth: 'thin' }}>
              <div className="flex gap-3" style={{ width: 'max-content' }}>
                {product.images.map((img, index) => (
                  <button
                    key={img.id}
                    className={`w-20 h-20 rounded border-2 overflow-hidden bg-white p-0 transition-colors flex-shrink-0 ${
                      index === selectedImageIndex ? 'border-blue-600' : 'border-transparent hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedImageIndex(index)}
                    aria-label={`View image ${index + 1}`}
                  >
                    <SafeImage src={img.url} alt={img.alt || `${product.name} view ${index + 1}`} width={80} height={80} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Product Details */}
        <div className="max-w-[500px] flex flex-col gap-5 product-details-mobile">
          {/* Title */}
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-3xl font-bold leading-tight text-gray-900 flex-1">{product.name}</h1>
{/* 社交媒体分享按钮 for Issue #142 */}
            {typeof window !== 'undefined' && (
              <SocialShareMenu
                config={{
                  url: window.location.href,
                  title: product.name,
                  description: product.description || `Check out ${product.name} on Suvernire Plus`,
                  image: currentImage.startsWith('http') ? currentImage : `${window.location.origin}${currentImage}`,
                  hashtags: ['CustomPrint', 'CustomMerch', 'SuvernirePlus'],
                }}
                onShare={(platform) => {
// 分享统计（可选）for Issue #142
console.log(` Shared to ${platform}:`, product.name);
                  // TODO: 发送分享统计到后端 API
                }}
              />
            )}
          </div>

          {/* Brand/Artist Info */}
          {product.brand && (
            <div className="text-sm text-gray-600">
              Designed and sold by <Link href={`/products?brand=${product.brand.slug}`} className="text-blue-600 no-underline font-medium hover:underline">{product.brand.name}</Link>
            </div>
          )}

          {/* Price - 始终显示价格区域 */}
          <div className="flex flex-col gap-2 my-2">
            {isOnSale ? (
              <>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-3xl font-bold text-gray-900">{currencyFormatter.format(salePrice / 100)}</span>
                  <span className="text-lg text-gray-400 line-through">{currencyFormatter.format(originalPrice / 100)}</span>
                </div>
                <span className="text-sm text-red-600 font-semibold">{discountPercent}% off ends soon</span>
              </>
            ) : (
              <span className="text-3xl font-bold text-gray-900">{currencyFormatter.format(price / 100)}</span>
            )}
          </div>

          {/* Rating - 始终显示评分区域 */}
          <div className="flex items-center gap-2 flex-wrap text-sm my-2">
            {product.rating.count > 0 ? (
              <>
                <span className="font-semibold text-gray-900 text-base">{product.rating.average.toFixed(2)}</span>
                <span className="text-yellow-400 text-base tracking-wide">
                  {'★'.repeat(Math.floor(product.rating.average))}
                  {'☆'.repeat(5 - Math.floor(product.rating.average))}
                </span>
                <span className="text-gray-600">({product.rating.count} reviews)</span>
              </>
            ) : (
              <span className="text-gray-400 italic">No reviews yet</span>
            )}
          </div>

          {/* Style Selector */}
          {product.category && (
            <div className="flex flex-col gap-2">
              <label className="font-bold text-sm text-gray-900 block mb-2">Style</label>
              <select className="w-full px-3 py-3 border border-gray-300 rounded text-sm bg-white cursor-pointer" defaultValue={product.category.slug}>
                <option value={product.category.slug}>{product.category.name}</option>
              </select>
              <p className="text-xs text-gray-600 m-0">
                {product.category.name === 'Oversized T-Shirt' 
                  ? 'Heavyweight, crewneck, oversized fit.'
                  : product.category.name === 'Classic T-Shirt'
                  ? 'Lightweight, classic fit, crewneck.'
                  : 'Premium quality, comfortable fit.'}
              </p>
              <Link href="/products" className="text-sm text-blue-600 no-underline hover:underline">Explore more styles</Link>
            </div>
          )}

          {/* Color Selection - 始终显示颜色区域 */}
          <div className="flex flex-col gap-3">
            <label className="font-bold text-sm text-gray-900 block">Color: {selectedColor || 'Select a color'}</label>
            {uniqueColors.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {uniqueColors.map((color, index) => {
                  const variantForColor = product.variants.find(v => v.color === color.name);
                  const isAvailable = variantForColor && variantForColor.stockQuantity > 0;
                  const isSelected = selectedColor === color.name;
                  return (
                    <button
                      key={index}
                      type="button"
                      className={`w-9 h-9 rounded-full border-2 cursor-pointer relative p-0 transition-all flex-shrink-0 ${
                        isSelected 
                          ? 'border-blue-600 border-[3px] scale-110' 
                          : isAvailable
                          ? 'border-gray-300 hover:border-blue-600 hover:scale-110'
                          : 'border-gray-300 opacity-40 cursor-not-allowed'
                      } ${!isAvailable ? 'opacity-40' : ''}`}
                      style={{ backgroundColor: color.hex }}
                      onClick={() => {
                        if (isAvailable) {
                          setSelectedColor(color.name);
                          // Auto-select first available size
                          const availableSizes = product.variants
                            .filter(v => v.color === color.name && v.stockQuantity > 0)
                            .map(v => v.size)
                            .filter(Boolean);
                          if (availableSizes.length > 0 && !selectedSize) {
                            setSelectedSize(availableSizes[0] as string);
                          }
                        }
                      }}
                      onMouseEnter={() => {
// 鼠标悬停时预览该颜色的图片
                        if (isAvailable) {
                          setHoveredColor(color.name);
                        }
                      }}
                      onMouseLeave={() => {
// 鼠标离开时恢复显示选中颜色的图片
                        setHoveredColor(null);
                      }}
                      disabled={!isAvailable}
                      title={color.name ?? undefined}
                    >
                      {isSelected && (
                        <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-lg font-bold drop-shadow pointer-events-none">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-gray-400 italic text-sm py-2">No colors available</div>
            )}
          </div>

          {/* Size Selection */}
          {sizes.length > 0 && selectedColor && (
            <div className="flex flex-col gap-3">
              <label className="font-bold text-sm text-gray-900 block">Size</label>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => {
                  const variantForSize = product.variants.find(
                    v => v.color === selectedColor && v.size === size
                  );
                  const isAvailable = variantForSize && variantForSize.stockQuantity > 0;
                  const isSelected = selectedSize === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      className={`px-5 py-2.5 border-2 rounded bg-white text-sm font-medium cursor-pointer transition-all min-w-[50px] text-center ${
                        isSelected
                          ? 'border-blue-600 text-blue-600 bg-blue-50'
                          : isAvailable
                          ? 'border-gray-300 hover:border-blue-600 hover:bg-blue-50'
                          : 'border-gray-300 opacity-40 cursor-not-allowed line-through'
                      } ${!isAvailable ? 'opacity-40' : ''}`}
                      onClick={() => {
                        if (isAvailable) {
                          setSelectedSize(size);
                        } else {
                          showError(`Size ${size} is out of stock for ${selectedColor}`);
                        }
                      }}
                      disabled={!isAvailable}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

{/* 移除 Print Location 模块（按需求） */}

          {/* Action Buttons - 3 buttons in a row */}
          <div className="flex gap-3 flex-col sm:flex-row product-actions-mobile">
            {/* Start Design Button */}
            <button
              type="button"
              className="flex-1 px-4 py-4 rounded border-2 border-blue-600 bg-white text-blue-600 text-base font-semibold text-center cursor-pointer transition-all hover:bg-blue-50 disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px]"
              onClick={handleStartDesign}
              disabled={!selectedVariant}
            >
              Start Design
            </button>

            {/* Add to Cart Button */}
            <button
              type="button"
              className="flex-1 px-4 py-4 rounded border-2 border-gray-300 bg-white text-gray-900 text-base font-semibold text-center cursor-pointer transition-all hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px]"
              onClick={handleAddToCart}
              disabled={isAddingToCart || !selectedVariant}
            >
              {isAddingToCart ? 'Adding...' : 'Add to cart'}
            </button>

            {/* Buy Now Button */}
            <button
              type="button"
              className="flex-1 px-4 py-4 rounded bg-red-600 text-white text-base font-semibold text-center cursor-pointer transition-all border-none hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px]"
              onClick={handleBuyNow}
              disabled={isAddingToCart || !selectedVariant}
            >
              {isBuyingNow ? 'Processing...' : 'Buy Now'}
            </button>
          </div>

          {/* Delivery Info */}
          <div className="flex flex-col gap-2">
            <p className="text-sm text-gray-600 m-0 leading-relaxed">
              Estimated delivery: <strong className="text-gray-900 font-semibold">by 24 November</strong><br />
              between 20-23 November
            </p>
            <Link href="/shipping-info" className="text-sm text-blue-600 no-underline hover:underline">Give a digital gift card</Link>
          </div>

          {/* Returns Policy */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-green-600 text-lg font-bold">✓</span>
            <span className="text-gray-900">Super-easy returns</span>
          </div>

          {/* Product Features */}
          <div className="mt-2">
            <h3 className="text-lg font-bold m-0 mb-3 text-gray-900">Product Features</h3>
            <ul className="flex flex-col gap-2 list-none p-0 m-0">
              <li className="text-sm text-gray-600 pl-5 relative leading-relaxed before:content-['•'] before:absolute before:left-0 before:text-blue-600 before:font-bold before:text-lg">
                Premium oversized crewneck
              </li>
              <li className="text-sm text-gray-600 pl-5 relative leading-relaxed before:content-['•'] before:absolute before:left-0 before:text-blue-600 before:font-bold before:text-lg">
                Versatile unisex silhouette
              </li>
              <li className="text-sm text-gray-600 pl-5 relative leading-relaxed before:content-['•'] before:absolute before:left-0 before:text-blue-600 before:font-bold before:text-lg">
                7 oz heavyweight 100% ring spun cotton jersey fabric
              </li>
              <li className="text-sm text-gray-600 pl-5 relative leading-relaxed before:content-['•'] before:absolute before:left-0 before:text-blue-600 before:font-bold before:text-lg">
                Dropped shoulders
              </li>
              <li className="text-sm text-gray-600 pl-5 relative leading-relaxed before:content-['•'] before:absolute before:left-0 before:text-blue-600 before:font-bold before:text-lg">
                Single heavy, large stitched ribban collar
              </li>
              <li className="text-sm text-gray-600 pl-5 relative leading-relaxed before:content-['•'] before:absolute before:left-0 before:text-blue-600 before:font-bold before:text-lg">
                Ethical production standards
              </li>
              <li className="text-sm text-gray-600 pl-5 relative leading-relaxed before:content-['•'] before:absolute before:left-0 before:text-blue-600 before:font-bold before:text-lg">
                Better Cotton Initiative
              </li>
              <li className="text-sm text-gray-600 pl-5 relative leading-relaxed before:content-['•'] before:absolute before:left-0 before:text-blue-600 before:font-bold before:text-lg">
                OEKO-TEX certified
              </li>
              <li className="text-sm text-gray-600 pl-5 relative leading-relaxed before:content-['•'] before:absolute before:left-0 before:text-blue-600 before:font-bold before:text-lg">
                Fair Labor Association
              </li>
            </ul>
          </div>
        </div>
      </div>
      </div>

{/* 相关产品推荐 */}
      {relatedProducts.length > 0 && (
        <section className="bg-white border-t border-gray-200 pt-12 pb-12 mt-12">
          <div className="max-w-container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-8 text-gray-900 text-center">You may also like</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {relatedProducts.map((related) => {
                const relatedImage = related.images?.[0]?.url || related.primaryImage?.url || fallbackImage;
                const relatedPrice = related.price?.sale || related.price?.base || related.basePrice;
                return (
                  <Link key={related.id} href={`/products/${related.slug}`} className="block no-underline text-inherit transition-transform hover:-translate-y-1">
                    <div className="flex flex-col gap-3">
                      <div className="w-full aspect-[3/4] rounded overflow-hidden bg-gray-100">
                        <SafeImage src={relatedImage} alt={related.name} width={280} height={350} className="w-full h-full object-cover" />
                      </div>
                      <h3 className="text-base font-semibold m-0 text-gray-900 leading-snug">{related.name}</h3>
                      <div className="text-lg font-bold text-gray-900">
                        {currencyFormatter.format(Number(relatedPrice) / 100)}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

{/* 设计师/品牌推荐 */}
      {product.brand && relatedProducts.filter(p => p.brand?.slug === product.brand?.slug).length > 0 && (
        <section className="bg-gray-50 border-t border-gray-200 pt-12 pb-12">
          <div className="max-w-container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-8 text-gray-900 text-center">More from {product.brand.name}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {relatedProducts.filter(p => p.brand?.slug === product.brand?.slug).slice(0, 4).map((brandProduct) => {
                const brandImage = brandProduct.images?.[0]?.url || brandProduct.primaryImage?.url || fallbackImage;
                const brandPrice = brandProduct.price?.sale || brandProduct.price?.base || brandProduct.basePrice;
                return (
                  <Link key={brandProduct.id} href={`/products/${brandProduct.slug}`} className="block no-underline text-inherit transition-transform hover:-translate-y-1">
                    <div className="flex flex-col gap-3">
                      <div className="w-full aspect-[3/4] rounded overflow-hidden bg-gray-100">
                        <SafeImage src={brandImage} alt={brandProduct.name} width={280} height={350} className="w-full h-full object-cover" />
                      </div>
                      <h3 className="text-base font-semibold m-0 text-gray-900 leading-snug">{brandProduct.name}</h3>
                      <div className="text-lg font-bold text-gray-900">
                        {currencyFormatter.format(Number(brandPrice) / 100)}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
