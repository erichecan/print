'use client';

/**
 * ProductsClient
 * [2025-11-16 16:35:00] 客户端渲染版 PLP，直接走浏览器发起的 API 请求，绕开 SSR 环节的环境差异
 * [2025-01-27 18:30:00] 重新设计产品卡片以匹配参考设计，包含标签、颜色选择器、评分等
 */
import useSWR from 'swr';
import Link from 'next/link';
import Image from 'next/image';
import { API_BASE_URL } from '@/lib/api-config';
import { useSearchParams } from 'next/navigation';

type Product = {
  id: string;
  name: string;
  slug: string;
  price: { base: number; sale: number; currency: string };
  primaryImage?: { url: string | null; alt?: string | null } | null;
  images?: Array<{ url: string; alt?: string | null }>;
  category?: { name: string } | null;
  brand?: { name: string } | null;
  variants?: Array<{ color?: string; colorHex?: string }>;
  rating?: { average: number; count: number };
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

  const apiUrl = new URL(`${API_BASE_URL}/products`);
  apiUrl.searchParams.set('page', page);
  apiUrl.searchParams.set('limit', limit);
  if (search) apiUrl.searchParams.set('search', search);
  if (collection) apiUrl.searchParams.set('collection', collection);
  if (sort) apiUrl.searchParams.set('sort', sort);
  // 开发阶段允许无库存商品也显示
  apiUrl.searchParams.set('includeOutOfStock', 'true');

  const { data, error, isLoading } = useSWR<ProductsResponse>(apiUrl.toString(), fetcher);

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

  // [2025-01-27 18:30:00] 示例颜色数据（实际应从产品variants获取）
  const sampleColors = [
    { name: 'Purple', hex: '#9933CC' },
    { name: 'Green', hex: '#00CC00' },
    { name: 'Yellow', hex: '#FFCC00' },
    { name: 'Orange', hex: '#FF9900' },
    { name: 'Brown', hex: '#996633' },
    { name: 'Black', hex: '#000000' },
    { name: 'White', hex: '#FFFFFF' },
    { name: 'Grey', hex: '#808080' },
    { name: 'Pink', hex: '#FF99CC' },
    { name: 'Red', hex: '#CC0000' },
  ];

  // [2025-01-27 18:30:00] 生成产品标签（示例数据）
  const getProductBadge = (index: number) => {
    const badges = ['Best Seller', 'Customer Fave', 'Staff Pick'];
    return badges[index % badges.length];
  };

  return (
    <div className="product-grid-new">
      {products.map((product, index) => {
        const img = product.primaryImage?.url || product.images?.[0]?.url || '/placeholder-product.jpg';
        const alt = product.primaryImage?.alt || product.name;
        const price = product.price?.sale || product.price?.base || 0;
        const badge = index < 3 ? getProductBadge(index) : null;
        const rating = product.rating?.average || 4.5;
        const reviewCount = product.rating?.count || 10000;
        // [2025-01-27 18:30:00] 使用产品variants中的颜色，如果没有则使用示例颜色
        const productColors = product.variants?.filter(v => v.colorHex || v.color) || [];
        const colors = productColors.length > 0 
          ? productColors.slice(0, 10).map(v => ({ 
              name: v.color || 'Color', 
              hex: v.colorHex || sampleColors[0].hex 
            }))
          : sampleColors.slice(0, 10);
        const totalColorCount = product.variants?.length || 10;
        const moreColors = totalColorCount > colors.length ? totalColorCount - colors.length : 0;

        return (
          <article key={product.id} className="product-card-new">
            <Link href={`/products/${product.slug}`} className="product-card-new__image-link">
              <div className="product-card-new__image">
                <Image src={img} alt={alt || product.name} width={480} height={600} sizes="(max-width: 768px) 100vw, 320px" />
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
              {colors.map((color, colorIndex) => (
                <span
                  key={colorIndex}
                  className="color-dot"
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
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
              <span className="price-amount">${Number(price).toFixed(2)}/ea</span>
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
  );
}


