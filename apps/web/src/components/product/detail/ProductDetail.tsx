/**
 * Product Detail Page - Main Component
 * [2025-11-19 09:30:00] 整合所有组件，实现商品详情页
 */
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { productsApi } from '@/lib/api';
import { Breadcrumb } from './Breadcrumb';
import { Gallery } from './Gallery';
import { BuyBox } from './BuyBox';
import { DeliveryReturns } from './DeliveryReturns';
import { ProductFeatures } from './ProductFeatures';
import { AlsoAvailable } from './AlsoAvailable';
import { MoreByArtist } from './MoreByArtist';
import { YouMightLike } from './YouMightLike';
import { TagsTrending } from './TagsTrending';
import { adaptProductData } from './dataAdapter';
import { ProductData } from './types';
import styles from './ProductDetail.module.css';

const DESIGN_LAB_PAYLOAD_KEY = 'designLab:productPayload';

export function ProductDetail() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  // [2025-11-19 09:45:00] 从 API 获取产品数据
  const { data: apiProduct, error, isLoading } = useSWR(
    slug ? `product-${slug}` : null,
    () => productsApi.getBySlug(slug)
  );

  // [2025-11-19 09:45:00] 获取相关产品
  const { data: relatedData } = useSWR(
    slug ? `related-${slug}` : null,
    () => productsApi.getRelated(slug, 8).catch(() => ({ data: [] }))
  );

  // [2025-11-19 09:45:00] 转换数据格式
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [selectedColor, setSelectedColor] = useState('');

  useEffect(() => {
    if (apiProduct) {
      const adapted = adaptProductData(apiProduct as any, relatedData?.data);
      setProductData(adapted);
      setSelectedColor(adapted.colors.find(c => c.available)?.name || '');
    }
  }, [apiProduct, relatedData]);

  // [2025-11-19 09:30:00] 加入购物车处理函数
  const handleAddToCart = useCallback(async (payload: any) => {
    console.log('[Add to Cart]', payload);

    // 找到对应的 variant
    if (apiProduct && apiProduct.variants) {
      const matchingVariant = apiProduct.variants.find((v: any) => {
        const colorMatch = !payload.color || v.color === payload.color || !v.color;
        const sizeMatch = !payload.size || v.size === payload.size || !v.size;
        return colorMatch && sizeMatch;
      });

      if (matchingVariant && matchingVariant.id) {
        try {
          const { cartApi } = await import('@/lib/api');
          await cartApi.addItem(matchingVariant.id, payload.quantity || 1);

          // 显示成功提示
          alert(`Successfully added ${payload.quantity || 1} item(s) to cart!`);
        } catch (error) {
          console.error('Failed to add to cart:', error);
          alert('Failed to add to cart. Please try again.');
        }
      } else {
        alert('Please select a valid color and size.');
      }
    }
  }, [apiProduct]);

  // [2025-11-19 09:30:00] 立即购买处理函数
  const handleBuyNow = useCallback(async (payload: any) => {
    console.log('[Buy Now]', payload);

    // 找到对应的 variant
    if (apiProduct && apiProduct.variants) {
      const matchingVariant = apiProduct.variants.find((v: any) => {
        const colorMatch = !payload.color || v.color === payload.color || !v.color;
        const sizeMatch = !payload.size || v.size === payload.size || !v.size;
        return colorMatch && sizeMatch;
      });

      if (matchingVariant && matchingVariant.id) {
        try {
          const { cartApi } = await import('@/lib/api');
          await cartApi.addItem(matchingVariant.id, payload.quantity || 1);

          // 跳转到结账页面
          router.push('/checkout');
        } catch (error) {
          console.error('Failed to buy now:', error);
          alert('Failed to process your request. Please try again.');
        }
      } else {
        alert('Please select a valid color and size.');
      }
    }
  }, [router, apiProduct]);

  const persistDesignLabPayload = useCallback((variant: any) => {
    if (typeof window === 'undefined' || !apiProduct) return;
    try {
      const galleryUrls = (apiProduct.images || []).map((img: any) => img.url).filter(Boolean);
      const fallbackImage = variant?.imageUrl || galleryUrls[0] || '/assets/hero/hero-card-tee.jpg';
      const baseImages = {
        front: variant?.imageUrl || fallbackImage,
        back: galleryUrls[1] || fallbackImage,
        sleeve: galleryUrls[2] || fallbackImage,
      };
      const colorOptions = Array.from(
        new Set(
          (apiProduct.variants || [])
            .map((v: any) => v.color)
            .filter((color: string | null): color is string => Boolean(color))
        )
      );

      const payload = {
        productId: apiProduct.id,
        productName: apiProduct.name,
        variantId: variant?.id || null,
        color: variant?.color || null,
        colors: colorOptions,
        baseImages,
        gallery: galleryUrls,
      };

      window.localStorage.setItem(DESIGN_LAB_PAYLOAD_KEY, JSON.stringify(payload));
    } catch (err) {
      console.warn('[ProductDetail] Failed to persist Design Lab payload', err);
    }
  }, [apiProduct]);

  // [2025-11-19 09:30:00] 搜索处理函数
  const handleSearch = useCallback((query: string) => {
    console.log('[Search]', query);
    router.push(`/products?search=${encodeURIComponent(query)}`);
  }, [router]);

  // [2025-01-28 04:00:00] 开始设计处理函数 - 跳转到原生 HTML 版本（功能完整）
  const handleStartDesign = useCallback((payload: any) => {
    console.log('[Start Design]', payload);

    // [2025-01-28 04:00:00] 根据选中的颜色和尺码找到对应的 variantId
    if (apiProduct && apiProduct.variants) {
      const matchingVariant = apiProduct.variants.find((v: any) => {
        const colorMatch = !payload.color || v.color === payload.color || !v.color;
        const sizeMatch = !payload.size || v.size === payload.size || !v.size;
        return colorMatch && sizeMatch;
      });

      if (matchingVariant && matchingVariant.id) {
        persistDesignLabPayload(matchingVariant);
        // [2025-01-28 04:00:00] 跳转到原生 HTML 版本的 Design Lab，传递 variantId
        window.location.href = `/design-lab-native.html?variantId=${matchingVariant.id}`;
        return;
      }
    }

    // [2025-01-28 04:00:00] 如果没有找到 variant，使用第一个可用的 variant 或跳转到默认页面
    if (apiProduct && apiProduct.variants && apiProduct.variants.length > 0) {
      const firstVariant = apiProduct.variants[0];
      persistDesignLabPayload(firstVariant);
      window.location.href = `/design-lab-native.html?variantId=${firstVariant.id}`;
    } else {
      // [2025-01-28 04:00:00] 如果没有 variant，跳转到原生 HTML 版本的 Design Lab
      window.location.href = '/design-lab-native.html';
    }
  }, [apiProduct, persistDesignLabPayload]);

  // [2025-11-19 09:45:00] 加载状态
  if (isLoading) {
    return (
      <div className={styles.productDetail}>
        <div className={styles.container}>
          <div className={styles.loading}>Loading product...</div>
        </div>
      </div>
    );
  }

  // [2025-11-19 09:45:00] 错误状态
  if (error || !productData) {
    return (
      <div className={styles.productDetail}>
        <div className={styles.container}>
          <div className={styles.error}>
            <h2>Product not found</h2>
            <p>Unable to load product details. Please try again later.</p>
          </div>
        </div>
      </div>
    );
  }

  // [2025-11-19 09:30:00] 根据选中颜色过滤图片（如果有颜色特定图片）
  const galleryImages = productData.images.map(img => ({
    id: img.id,
    url: img.url,
    alt: img.alt,
    thumbnail: img.thumbnail,
  }));

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Products', href: '/products' },
    { label: productData.title },
  ];

  return (
    <div className={styles.productDetail}>
      <div className={styles.container}>
        {/* [2025-11-19 09:30:00] 参考图一位置：面包屑导航 */}
        <Breadcrumb items={breadcrumbItems} />

        {/* [2025-11-19 09:30:00] 参考图一位置：主体双栏布局 */}
        <div className={styles.mainLayout}>
          {/* [2025-11-19 09:30:00] 参考图一位置：左侧图片画廊 */}
          <div className={styles.gallerySection}>
            <Gallery images={galleryImages} selectedColor={selectedColor} />
          </div>

          {/* [2025-11-19 09:30:00] 参考图一位置：右侧购买盒 */}
          <div className={styles.buyboxSection}>
            <BuyBox
              title={productData.title}
              artistName={productData.artist.name}
              artistShopUrl={productData.artist.shopUrl}
              price={productData.price}
              style={productData.style}
              colors={productData.colors}
              sizes={productData.sizes}
              printLocations={productData.printLocations}
              rating={productData.rating}
              onAddToCart={handleAddToCart}
              onBuyNow={handleBuyNow}
              onStartDesign={handleStartDesign}
            />

            {/* [2025-11-19 09:30:00] 参考图一位置：配送和退货信息 */}
            <DeliveryReturns
              delivery={productData.delivery}
              returns={productData.returns}
            />

            {/* [2025-11-19 09:30:00] 参考图一位置：产品特性 */}
            <ProductFeatures
              features={productData.features}
              rating={productData.rating}
            />
          </div>
        </div>

        {/* [2025-11-19 09:30:00] 参考图一位置："Also available on" 横滑 */}
        <AlsoAvailable items={productData.alsoAvailableOn} />

        {/* [2025-11-19 09:30:00] 参考图一位置："More by this artist" */}
        <MoreByArtist
          artistName={productData.artist.name}
          artistShopUrl={productData.artist.shopUrl}
          products={productData.moreByArtist}
        />

        {/* [2025-11-19 09:30:00] 参考图一位置："T-shirts you might like" */}
        <YouMightLike
          title="T-shirts you might like"
          products={productData.youMightLike}
        />

        {/* [2025-11-19 09:30:00] 参考图一位置：搜索与标签 */}
        <TagsTrending
          tags={productData.tags}
          trending={productData.trending}
          onSearch={handleSearch}
        />
      </div>
    </div>
  );
}

