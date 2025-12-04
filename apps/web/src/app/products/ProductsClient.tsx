'use client';

/**
 * ProductsClient
 * [2025-11-16 16:35:00] 客户端渲染版 PLP，直接走浏览器发起的 API 请求，绕开 SSR 环节的环境差异
 * [2025-01-27 18:30:00] 重新设计产品卡片以匹配参考设计，包含标签、颜色选择器、评分等
 * [2025-01-29 23:00:00] 添加颜色悬停切换图片功能
 */
import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import Image from 'next/image';
import { API_BASE_URL } from '@/lib/api-config';
import { useSearchParams } from 'next/navigation';
import { Pagination } from '@/components/ui/Pagination'; // [2025-01-27 16:40:00] 分页组件
import { promotionApi, Promotion } from '@/lib/api'; // [2025-01-28 12:35:00] 促销活动 API

type Product = {
  id: string;
  name: string;
  slug: string;
  price: { base: number; sale: number; currency: string };
  primaryImage?: { url: string | null; alt?: string | null } | null;
  images?: Array<{ url: string; alt?: string | null }>;
  category?: { name: string } | null;
  brand?: { name: string } | null;
  variants?: Array<{ color?: string; colorHex?: string; imageUrl?: string | null }>; // [2025-01-29 23:00:00] 添加 imageUrl 字段
  rating?: { average: number; count: number };
  promotions?: Promotion[]; // [2025-01-28 12:35:00] 促销活动信息
};

type ProductsResponse = {
  data: Product[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => {
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
});

export default function ProductsClient() {
  const params = useSearchParams();
  const page = params.get('page') || '1';
  const limit = params.get('limit') || '12';
  const search = params.get('search') || '';
  const collection = params.get('collection') || '';
  const sort = params.get('sort') || '';
  
  // [2025-01-29 23:00:00] 状态管理：跟踪每个商品悬停的颜色
  const [hoveredColors, setHoveredColors] = useState<Record<string, string | null>>({});

  // [2025-01-27 16:55:00] 解析排序参数（sort=price_asc -> sort=price&order=asc）
  const parseSort = (sortValue: string) => {
    if (!sortValue) return { sort: undefined, order: undefined };
    const parts = sortValue.split('_');
    if (parts.length !== 2) return { sort: undefined, order: undefined };
    return { sort: parts[0], order: parts[1] };
  };

  const { sort: sortField, order: sortOrder } = parseSort(sort);

  // [2025-11-28 11:00:00] 读取所有筛选参数并传递给 API
  // [2025-01-28 23:20:00] 添加 category 参数支持
  const filterParams = [
    'fit', 'decoration', 'color', 'size', 'material', 'type', 'style', 
    'neckline', 'feature', 'price', 'brand', 'rushDelivery', 
    'multiAddress', 'noMinimum', 'category'
  ];

  const apiUrl = new URL(`${API_BASE_URL}/products`);
  apiUrl.searchParams.set('page', page);
  apiUrl.searchParams.set('limit', limit);
  if (search) apiUrl.searchParams.set('search', search);
  if (collection) apiUrl.searchParams.set('collection', collection);
  if (sortField) apiUrl.searchParams.set('sort', sortField);
  if (sortOrder) apiUrl.searchParams.set('order', sortOrder);
  
  // [2025-11-28 11:00:00] 添加所有筛选参数到 API 请求
  filterParams.forEach(filterName => {
    const filterValue = params.get(filterName);
    if (filterValue) {
      apiUrl.searchParams.set(filterName, filterValue);
    }
  });
  
  // [2025-01-27 16:55:00] 开发阶段允许无库存商品也显示
  apiUrl.searchParams.set('includeOutOfStock', 'true');

  const { data, error, isLoading } = useSWR<ProductsResponse>(apiUrl.toString(), fetcher);

  // [2025-01-28 12:35:00] 为每个产品获取促销活动信息
  const productIds = data?.data?.map((p) => p.id) || [];
  const { data: promotionsData } = useSWR(
    productIds.length > 0 ? ['product-promotions', productIds] : null,
    async () => {
      // 批量获取每个产品的促销活动
      const promotionsMap: Record<string, Promotion[]> = {};
      await Promise.all(
        productIds.map(async (productId) => {
          try {
            const result = await promotionApi.getForProduct(productId);
            if (result.promotions && result.promotions.length > 0) {
              // [2025-01-28 12:35:00] 选择折扣最大的促销活动
              const bestPromotion = result.promotions.sort((a, b) => {
                const aValue = a.discountType === 'percentage' ? a.discountValue : a.discountValue;
                const bValue = b.discountType === 'percentage' ? b.discountValue : b.discountValue;
                return bValue - aValue;
              })[0];
              promotionsMap[productId] = [bestPromotion];
            }
          } catch (err) {
            // 忽略错误，继续处理其他产品
            console.warn(`Failed to fetch promotions for product ${productId}:`, err);
          }
        })
      );
      return promotionsMap;
    }
  );

  if (isLoading) {
    return <div className="results-empty"><h2>Loading products…</h2></div>;
  }
  if (error) {
    return <div className="results-empty"><h2>We hit a snag loading products</h2><p>Failed to fetch products ({String(error.message)})</p></div>;
  }
  const products = data?.data ?? [];

  if (products.length === 0) {
    return <div className="results-empty"><h2>No products found</h2><p>Try expanding your filters or enter a different search.</p></div>;
  }

  // [2025-01-27 17:05:00] 颜色映射表（用于将颜色名称映射到hex值，如果没有colorHex）
  const COLOR_MAP: Record<string, string> = {
    'black': '#000000',
    'blue': '#0066CC',
    'white': '#FFFFFF',
    'grey': '#808080',
    'gray': '#808080',
    'green': '#00CC00',
    'red': '#CC0000',
    'pink': '#FF99CC',
    'purple': '#9933CC',
    'yellow': '#FFCC00',
    'orange': '#FF9900',
    'brown': '#996633',
    'heather': '#CCCCCC',
    'camo': '#4A5D23',
    'tie-dye': '#FF00FF',
    'sand': '#D7C6A4',
  };

  // [2025-01-27 18:30:00] 生成产品标签（示例数据）
  const getProductBadge = (index: number) => {
    const badges = ['Best Seller', 'Customer Fave', 'Staff Pick'];
    return badges[index % badges.length];
  };

  const pagination = data?.pagination || { page: 1, limit: 12, total: 0, totalPages: 1 };

  return (
    <>
      <div className="product-grid-new">
        {products.map((product, index) => {
        const fallbackImage = '/assets/hero/hero-card-tee.jpg';
        // [2025-01-29 23:00:00] 根据悬停的颜色切换图片
        // [2025-12-03 23:20:00] 颜色名称映射：将英文颜色名称映射到中文显示名称
        const COLOR_NAME_MAP_FOR_MATCH: Record<string, string> = {
          'Black': '黑',
          'White': '白',
          'black': '黑',
          'white': '白',
        };
        const hoveredColor = hoveredColors[product.id];
        
        // [2025-12-04 22:30:00] 主图选择逻辑：优先显示白色变体图片，无白色则用黑色，最后回退到 primaryImage
        const getDefaultImage = () => {
          // 1. 优先查找白色变体的 imageUrl
          const whiteVariant = product.variants?.find(v => {
            const color = (v.color || '').trim();
            return color === 'White' || color === 'white' || color === '白';
          });
          if (whiteVariant?.imageUrl) {
            return whiteVariant.imageUrl;
          }
          
          // 2. 如果没有白色，查找黑色变体的 imageUrl
          const blackVariant = product.variants?.find(v => {
            const color = (v.color || '').trim();
            return color === 'Black' || color === 'black' || color === '黑';
          });
          if (blackVariant?.imageUrl) {
            return blackVariant.imageUrl;
          }
          
          // 3. 如果都没有，使用产品主图或第一张图片
          return product.primaryImage?.url || product.images?.[0]?.url || fallbackImage;
        };
        
        let img = getDefaultImage();
        
        // [2025-12-04 22:30:00] 颜色悬停切换逻辑：当悬停时优先使用变体图片，如果没有则回退到产品图片
        if (hoveredColor) {
          // [2025-12-04 22:40:00] 修复颜色匹配逻辑：支持中文显示名称和英文原始名称的双向匹配
          const colorVariant = product.variants?.find(v => {
            const originalColor = (v.color || '').trim();
            const displayName = COLOR_NAME_MAP_FOR_MATCH[originalColor] || originalColor;
            // 匹配逻辑：hoveredColor 可能是中文"黑"/"白"，也可能是英文"Black"/"White"
            // 需要同时匹配显示名称和原始名称
            return displayName === hoveredColor || 
                   originalColor === hoveredColor ||
                   originalColor.toLowerCase() === hoveredColor.toLowerCase() ||
                   (hoveredColor === '黑' && (originalColor === 'Black' || originalColor === 'black')) ||
                   (hoveredColor === '白' && (originalColor === 'White' || originalColor === 'white'));
          });
          
          if (colorVariant?.imageUrl) {
            // 如果变体有 imageUrl，使用变体的图片
            img = colorVariant.imageUrl;
          } else {
            // 如果变体没有 imageUrl，回退到默认主图
            img = getDefaultImage();
          }
        }
        const alt = product.primaryImage?.alt || product.name;
        const basePrice = Number(product.price?.sale || product.price?.base || 0);
        // [2025-01-28 12:35:00] 获取该产品的促销活动
        const productPromotions = promotionsData?.[product.id] || product.promotions || [];
        const bestPromotion = productPromotions.length > 0 ? productPromotions[0] : null;
        
        // [2025-01-28 12:35:00] 计算促销后的价格
        let finalPrice = basePrice;
        let discountAmount = 0;
        if (bestPromotion) {
          if (bestPromotion.discountType === 'percentage') {
            discountAmount = (basePrice * bestPromotion.discountValue) / 100;
            if (bestPromotion.maxDiscount && discountAmount > bestPromotion.maxDiscount) {
              discountAmount = bestPromotion.maxDiscount;
            }
          } else {
            discountAmount = bestPromotion.discountValue;
          }
          finalPrice = Math.max(0, basePrice - discountAmount);
        }
        
        const badge = index < 3 ? getProductBadge(index) : null;
        const rating = product.rating?.average || 4.5;
        const reviewCount = product.rating?.count || 10000;
        // [2025-01-29 23:30:00] 从产品variants中获取所有颜色信息（不限制为黑白，支持后续添加其他颜色）
        // [2025-12-03 23:20:00] 颜色名称映射：将英文颜色名称映射到中文显示名称
        const COLOR_NAME_MAP: Record<string, string> = {
          'Black': '黑',
          'White': '白',
          'black': '黑',
          'white': '白',
        };
        
        // [2025-12-04 22:00:00] 显示所有颜色（当前数据库只有黑白，未来会有更多颜色）
        const productColors = product.variants?.filter(v => v.color && v.color.trim() !== '') || [];
        // [2025-01-29 23:30:00] 去重并保留所有颜色，每个颜色包含名称、hex值和图片URL
        const uniqueColors = Array.from(
          new Map(
            productColors.map(v => {
              const originalColorName = (v.color || '').trim();
              // [2025-12-03 23:20:00] 将英文颜色名称映射到中文显示名称
              const displayColorName = COLOR_NAME_MAP[originalColorName] || originalColorName;
              // [2025-01-29 23:30:00] 如果colorHex存在则使用，否则从COLOR_MAP查找，最后根据颜色名称推断
              const hex = v.colorHex || COLOR_MAP[originalColorName.toLowerCase()] || 
                (displayColorName === '黑' || originalColorName.toLowerCase() === 'black' ? '#000000' : 
                 displayColorName === '白' || originalColorName.toLowerCase() === 'white' ? '#FFFFFF' : 
                 '#CCCCCC'); // 默认灰色
              return [displayColorName, { 
                name: displayColorName, // [2025-12-03 23:20:00] 使用中文显示名称
                originalName: originalColorName, // [2025-12-03 23:20:00] 保留原始名称用于匹配
                hex,
                imageUrl: v.imageUrl || null
              }];
            })
          ).values()
        );
        // [2025-01-29 23:30:00] 按颜色名称排序，确保显示顺序一致
        const colors = uniqueColors.sort((a, b) => {
          // 优先显示黑白，然后按字母顺序
          if (a.name === '黑') return -1;
          if (b.name === '黑') return 1;
          if (a.name === '白') return -1;
          if (b.name === '白') return 1;
          return a.name.localeCompare(b.name);
        });
        const totalColorCount = colors.length;
        // [2025-01-29 23:30:00] 最多显示10个颜色点，超过的显示"+N"
        const displayedColors = colors.slice(0, 10);
        const moreColors = totalColorCount > 10 ? totalColorCount - 10 : 0;

        return (
          <article key={product.id} className="product-card-new">
            <Link href={`/products/${product.slug}`} className="product-card-new__image-link">
              <div className="product-card-new__image">
                <Image 
                  src={img} 
                  alt={alt || product.name} 
                  width={480} 
                  height={600} 
                  sizes="(max-width: 768px) 100vw, 320px"
                  style={{ transition: 'opacity 0.3s ease-in-out' }} // [2025-01-29 23:00:00] 添加过渡效果
                />
                {/* [2025-01-28 12:35:00] 显示促销活动标签 */}
                {bestPromotion && (
                  <span className="product-badge product-badge--promotion" style={{ backgroundColor: '#e74c3c', color: 'white' }}>
                    {bestPromotion.discountType === 'percentage' 
                      ? `${bestPromotion.discountValue}% OFF` 
                      : `$${bestPromotion.discountValue.toFixed(2)} OFF`}
                  </span>
                )}
                {badge && (
                  <span className={`product-badge product-badge--${badge.toLowerCase().replace(/\s+/g, '-')}`}>
                    {badge}
                  </span>
                )}
                {index % 2 === 0 && (
                  <span className="product-badge product-badge--eco">
                    <span className="eco-icon">🌿</span> Eco-friendly
                  </span>
                )}
              </div>
            </Link>
            
            <div className="product-card-new__colors">
              {displayedColors.map((color, colorIndex) => (
                <span
                  key={colorIndex}
                  className="color-dot"
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                  onMouseEnter={() => {
                    // [2025-01-29 23:30:00] 鼠标悬停时切换图片
                    setHoveredColors(prev => ({
                      ...prev,
                      [product.id]: color.name
                    }));
                  }}
                  onMouseLeave={() => {
                    // [2025-01-29 23:30:00] 鼠标离开时恢复默认图片
                    setHoveredColors(prev => {
                      const newState = { ...prev };
                      delete newState[product.id];
                      return newState;
                    });
                  }}
                />
              ))}
              {moreColors > 0 && (
                <span className="color-more">+{moreColors}</span>
              )}
            </div>

            <h3 className="product-card-new__title">{product.name}</h3>
            
            <div className="product-card-new__rating">
              <span className="rating-stars">
                {'★'.repeat(Math.floor(rating))}
                {'☆'.repeat(5 - Math.floor(rating))}
              </span>
              <span className="rating-value">{rating.toFixed(1)}</span>
              <span className="rating-count">({reviewCount >= 10000 ? '10,000+' : reviewCount.toLocaleString()} reviews)</span>
            </div>

            <div className="product-card-new__price">
              {/* [2025-01-28 12:35:00] 显示促销后的价格 */}
              {bestPromotion && basePrice !== finalPrice ? (
                <>
                  <span className="price-amount" style={{ textDecoration: 'line-through', color: '#999', marginRight: '8px' }}>
                    ${basePrice.toFixed(2)}
                  </span>
                  <span className="price-amount" style={{ color: '#e74c3c', fontWeight: 'bold' }}>
                    ${finalPrice.toFixed(2)}/ea
                  </span>
                </>
              ) : (
                <span className="price-amount">${basePrice.toFixed(2)}/ea</span>
              )}
              <span className="price-quantity">for 500 items</span>
              <Link href={`/products/${product.slug}`} className="price-details-link">Pricing Details</Link>
            </div>

            <div className="product-card-new__shipping">
              <span className="shipping-rush">3-Day Super Rush Available</span>
            </div>

            <div className="product-card-new__minimum">
              <span>No Minimum</span>
            </div>
          </article>
        );
      })}
      </div>
      
      {/* [2025-01-27 16:40:00] 分页组件 */}
      {pagination.totalPages > 1 && (
        <Pagination 
          currentPage={pagination.page} 
          totalPages={pagination.totalPages}
          baseUrl="/products"
          preserveParams={true}
        />
      )}
    </>
  );
}


