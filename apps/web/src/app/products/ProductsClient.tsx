'use client';

/**
 * ProductsClient
* 客户端渲染版 PLP，直接走浏览器发起的 API 请求，绕开 SSR 环节的环境差异
* 重新设计产品卡片以匹配参考设计，包含标签、颜色选择器、评分等
* 添加颜色悬停切换图片功能
 */
import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import Image from 'next/image';
import { API_BASE_URL } from '@/lib/api-config';
import { useSearchParams, useRouter } from 'next/navigation';
import { Pagination } from '@/components/ui/Pagination'; // 分页组件
import { promotionApi, Promotion } from '@/lib/api'; // 促销活动 API
import { useIsMobile } from '@/hooks/useIsMobile';
import { MobileProductsPage } from './MobileProductsPage';

type Product = {
  id: string;
  name: string;
  slug: string;
  price: { base: number; sale: number; currency: string };
  primaryImage?: { url: string | null; alt?: string | null } | null;
  images?: Array<{ url: string; alt?: string | null }>;
  category?: { name: string } | null;
  brand?: { name: string } | null;
  variants?: Array<{ color?: string; colorHex?: string; imageUrl?: string | null }>; // 添加 imageUrl 字段
  rating?: { average: number; count: number };
  promotions?: Promotion[]; // 促销活动信息
};

type ProductsResponse = {
  data: Product[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => {
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
});

export default function ProductsClient({
  collections = [],
  initialCategoryName = 'All Products'
}: {
  collections?: any[],
  initialCategoryName?: string
}) {
  const params = useSearchParams();
  const router = useRouter();
  const page = params?.get('page') || '1';
  const limit = params?.get('limit') || '12';
  const search = params?.get('search') || '';
  const collection = params?.get('collection') || '';
  const sort = params?.get('sort') || '';
  const tags = params?.get('tags') || '';

  // 状态管理：跟踪每个商品悬停的颜色
  const [hoveredColors, setHoveredColors] = useState<Record<string, string | null>>({});

  // 解析排序参数（sort=price_asc -> sort=price&order=asc）
  const parseSort = (sortValue: string) => {
    if (!sortValue) return { sort: undefined, order: undefined };
    const parts = sortValue.split('_');
    if (parts.length !== 2) return { sort: undefined, order: undefined };
    return { sort: parts[0], order: parts[1] };
  };

  const { sort: sortField, order: sortOrder } = parseSort(sort);

  // 读取所有筛选参数并传递给 API
  // 添加 category 参数支持
  const filterParams = [
    'fit', 'decoration', 'color', 'size', 'material', 'type', 'style',
    'neckline', 'feature', 'price', 'brand', 'rushDelivery',
    'multiAddress', 'noMinimum', 'category', 'minPrice', 'maxPrice'
  ];

  const apiUrl = new URL(`${API_BASE_URL}/products`);
  apiUrl.searchParams.set('page', page);
  apiUrl.searchParams.set('limit', limit);
  if (search) apiUrl.searchParams.set('search', search);
  if (collection) apiUrl.searchParams.set('collection', collection);
  if (sortField) apiUrl.searchParams.set('sort', sortField);
  if (sortOrder) apiUrl.searchParams.set('order', sortOrder);
  if (tags) apiUrl.searchParams.set('tags', tags);

  // 添加所有筛选参数到 API 请求
  if (params) {
    filterParams.forEach(filterName => {
      const filterValue = params.get(filterName);
      if (filterValue) {
        apiUrl.searchParams.set(filterName, filterValue);
      }
    });
  }

  // 开发阶段允许无库存商品也显示
  apiUrl.searchParams.set('includeOutOfStock', 'true');

  const { data, error, isLoading } = useSWR<ProductsResponse>(apiUrl.toString(), fetcher);
  const isMobile = useIsMobile();

  // 为每个产品获取促销活动信息
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
              // 选择折扣最大的促销活动
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

  // 颜色映射表（用于将颜色名称映射到hex值，如果没有colorHex）
  const COLOR_MAP: Record<string, string> = {
    'black': '#1a1a1a',
    'white': '#FFFFFF',
    'grey': '#808080',
    'gray': '#808080',
    'charcoal': '#4a4a4a',
    'dark heather': '#5a5a5a',
    'heather grey': '#AAAAAA',
    'heather': '#BBBBBB',
    'navy': '#001F5B',
    'dark navy': '#001040',
    'royal': '#4169E1',
    'sapphire': '#0F52BA',
    'blue': '#0066CC',
    'light blue': '#87CEEB',
    'carolina blue': '#56A0D3',
    'antique sapphire': '#4E5D8A',
    'red': '#CC2200',
    'cardinal': '#AA0000',
    'maroon': '#800000',
    'sport scarlet red': '#CC1111',
    'orange': '#FF6600',
    'gold': '#FFB300',
    'daisy': '#FFDD00',
    'yellow': '#FFCC00',
    'green': '#2E7D32',
    'forest green': '#1B5E20',
    'irish green': '#3A9D23',
    'sage': '#8FAF6E',
    'military green': '#4B5320',
    'kelly': '#4CBB17',
    'purple': '#6A0DAD',
    'lilac': '#C8A2C8',
    'violet': '#8B00FF',
    'pink': '#E91E8C',
    'light pink': '#FFB6C1',
    'azalea': '#F28DB3',
    'heliconia': '#DF3A7A',
    'brown': '#795548',
    'chocolate': '#4E2222',
    'sand': '#D7C6A4',
    'natural': '#F5F0E8',
    'cream': '#FFFDD0',
    'ash': '#D3D3D3',
    'sport grey': '#C0C0C0',
    'ice grey': '#E8E8E8',
    'camo': '#4A5D23',
    'tie-dye': '#CC44AA',
  };

  const resolveColorHex = (name: string, hexFromDb?: string | null): string => {
    if (hexFromDb) return hexFromDb;
    const lower = name.toLowerCase();
    if (COLOR_MAP[lower]) return COLOR_MAP[lower];
    for (const word of lower.split(/[\s-]+/).reverse()) {
      if (COLOR_MAP[word]) return COLOR_MAP[word];
    }
    return '#CCCCCC';
  };

  // 生成产品标签（示例数据）
  const getProductBadge = (index: number) => {
    const badges = ['Best Seller', 'Customer Fave', 'Staff Pick'];
    return badges[index % badges.length];
  };

  const pagination = data?.pagination || { page: 1, limit: 12, total: 0, totalPages: 1 };

  // 从产品数据中提取品牌列表
  const brands = Array.from(
    new Map(
      products
        .filter((p) => p.brand?.name)
        .map((p) => [p.brand!.name, { name: p.brand!.name, slug: p.brand!.name.toLowerCase().replace(/\s+/g, '-') }])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  // 获取分类名称
  const categoryParam = params?.get('category') || '';
  const categoryName = collection
    ? collections.find(c => c.slug === collection)?.name || initialCategoryName
    : (categoryParam
      ? categoryParam.charAt(0).toUpperCase() + categoryParam.slice(1).replace(/-/g, ' ')
      : initialCategoryName);

  if (isMobile) {
    return (
      <MobileProductsPage
        products={products}
        categoryName={categoryName}
        pagination={pagination}
        currentSort={sort}
        currentCollection={collection}
        currentBrand={params?.get('brand') || ''}
        brands={brands}
      />
    );
  }

  return (
    <>
      <div className="product-grid-new">
        {products.map((product, index) => {
          const fallbackImage = '/assets/hero/hero-card-tee.jpg';
          // 根据悬停的颜色切换图片
          // 颜色名称映射：将英文颜色名称映射到中文显示名称
          const COLOR_NAME_MAP_FOR_MATCH: Record<string, string> = {
            'Black': '黑',
            'White': '白',
            'black': '黑',
            'white': '白',
          };
          const hoveredColor = hoveredColors[product.id];

          // 主图选择逻辑：优先使用产品主图，回退到第一个变体图
          const getDefaultImage = () => {
            return product.primaryImage?.url
              || product.images?.[0]?.url
              || product.variants?.[0]?.imageUrl
              || fallbackImage;
          };

          const allVariantUrls = (product.variants || []).map(v => v.imageUrl).filter((u): u is string => !!u);
          const hasPerColorVariantImages = new Set(allVariantUrls).size > 1;

          const getGalleryImageForColor = (colorName: string): string | null => {
            const galleryImgs = product.images || [];
            const front = galleryImgs.find(gi => {
              const alt = gi.alt || '';
              return alt.includes(colorName) && alt.toLowerCase().includes('front');
            });
            return front?.url || galleryImgs.find(gi => (gi.alt || '').includes(colorName))?.url || null;
          };

          let img = getDefaultImage();

          if (hoveredColor) {
            const colorVariant = product.variants?.find(v => {
              const originalColor = (v.color || '').trim();
              const displayName = COLOR_NAME_MAP_FOR_MATCH[originalColor] || originalColor;
              return displayName === hoveredColor ||
                originalColor === hoveredColor ||
                originalColor.toLowerCase() === hoveredColor.toLowerCase() ||
                (hoveredColor === '黑' && (originalColor === 'Black' || originalColor === 'black')) ||
                (hoveredColor === '白' && (originalColor === 'White' || originalColor === 'white'));
            });

            if (hasPerColorVariantImages && colorVariant?.imageUrl) {
              img = colorVariant.imageUrl;
            } else {
              const lookupColor = colorVariant?.color || hoveredColor;
              img = getGalleryImageForColor(lookupColor) || getDefaultImage();
            }
          }
          const alt = product.primaryImage?.alt || product.name;
          const basePrice = Number(product.price?.sale || product.price?.base || 0);
          // 获取该产品的促销活动
          const productPromotions = promotionsData?.[product.id] || product.promotions || [];
          const bestPromotion = productPromotions.length > 0 ? productPromotions[0] : null;

          // 计算促销后的价格
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
          // 从产品variants中获取所有颜色信息（不限制为黑白，支持后续添加其他颜色）
          // 颜色名称映射：将英文颜色名称映射到中文显示名称
          const COLOR_NAME_MAP: Record<string, string> = {
            'Black': '黑',
            'White': '白',
            'black': '黑',
            'white': '白',
          };

          const productColors = product.variants?.filter(v => v.color && v.color.trim() !== '') || [];
          const uniqueColors = Array.from(
            new Map(
              productColors.map(v => {
                const originalColorName = (v.color || '').trim();
                const displayColorName = COLOR_NAME_MAP[originalColorName] || originalColorName;
                const hex = resolveColorHex(originalColorName, v.colorHex);
                const colorImage = hasPerColorVariantImages
                  ? (v.imageUrl || null)
                  : getGalleryImageForColor(originalColorName);
                return [displayColorName, {
                  name: displayColorName,
                  originalName: originalColorName,
                  hex,
                  imageUrl: colorImage
                }];
              })
            ).values()
          );
          // 按颜色名称排序，确保显示顺序一致
          const colors = uniqueColors.sort((a, b) => {
            // 优先显示黑白，然后按字母顺序
            if (a.name === '黑') return -1;
            if (b.name === '黑') return 1;
            if (a.name === '白') return -1;
            if (b.name === '白') return 1;
            return a.name.localeCompare(b.name);
          });
          const totalColorCount = colors.length;
          // 最多显示10个颜色点，超过的显示"+N"
          const displayedColors = colors.slice(0, 10);
          const moreColors = totalColorCount > 10 ? totalColorCount - 10 : 0;

          return (
            <article key={product.id} className="product-card-new">
              <Link href={`/products/${product.slug}`} className="product-card-new__image-link">
                <div className="product-card-new__image">
                  <Image
                    src={img}
                    alt={alt || product.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 320px"
                    style={{ objectFit: 'cover', transition: 'opacity 0.3s ease-in-out' }}
                  />
                  {/* 显示促销活动标签 */}
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

              <div className="product-card-new__info">
                <h3 className="product-card-new__title">{product.name}</h3>

                <div className="product-card-new__colors">
                  {displayedColors.map((color, colorIndex) => (
                    <span
                      key={colorIndex}
                      className="color-dot"
                      style={!color.imageUrl ? { backgroundColor: color.hex, cursor: 'pointer' } : { cursor: 'pointer' }}
                      title={color.name}
                      onClick={(e) => {
                        e.preventDefault();
                        router.push(`/products/${product.slug}?color=${encodeURIComponent(color.originalName)}`);
                      }}
                      onMouseEnter={() => {
                        setHoveredColors(prev => ({ ...prev, [product.id]: color.name }));
                      }}
                      onMouseLeave={() => {
                        setHoveredColors(prev => {
                          const newState = { ...prev };
                          delete newState[product.id];
                          return newState;
                        });
                      }}
                    >
                      {color.imageUrl && (
                        <img src={color.imageUrl} alt={color.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', display: 'block' }} />
                      )}
                    </span>
                  ))}
                  {moreColors > 0 && (
                    <span className="color-more">+{moreColors}</span>
                  )}
                </div>

                <div className="product-card-new__price-row">
                  <div className="product-card-new__rating">
                    <span className="rating-stars">{'★'.repeat(Math.floor(rating))}{'☆'.repeat(5 - Math.floor(rating))}</span>
                    <span className="rating-value">{rating.toFixed(1)}</span>
                  </div>
                  <div className="product-card-new__price">
                    {bestPromotion && basePrice !== finalPrice ? (
                      <>
                        <span className="price-original">${basePrice.toFixed(2)}</span>
                        <span className="price-amount price-amount--sale">${finalPrice.toFixed(2)}/ea</span>
                      </>
                    ) : (
                      <span className="price-amount">${basePrice.toFixed(2)}/ea</span>
                    )}
                  </div>
                </div>

              </div>
            </article>
          );
        })}
      </div>

      {/* 分页组件 */}
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


