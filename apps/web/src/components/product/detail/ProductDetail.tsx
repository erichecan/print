/**
 * Product Detail Page - Main Component
* 整合所有组件，实现商品详情页
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
import { MoreByArtist } from './MoreByArtist';
import { YouMightLike } from './YouMightLike';
import { adaptProductData } from './dataAdapter';
import { ProductData } from './types';
import styles from './ProductDetail.module.css';
import { buildNewDesignUrlSafe } from '@/utils/designUrl';

const DESIGN_LAB_PAYLOAD_KEY = 'designLab:productPayload';

export function ProductDetail() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  // 从 API 获取产品数据
  const { data: apiProduct, error, isLoading } = useSWR(
    slug ? `product-${slug}` : null,
    () => productsApi.getBySlug(slug)
  );

  // 获取相关产品
  const { data: relatedData } = useSWR(
    slug ? `related-${slug}` : null,
    () => productsApi.getRelated(slug, 20).catch(() => ({ data: [] }))
  );

  // 获取同一品牌的其它商品
  const productWithBrand = apiProduct as any;
  const { data: brandProductsData } = useSWR(
    productWithBrand?.brand?.id && productWithBrand?.id
      ? `brand-products-${productWithBrand.brand.id}-${productWithBrand.id}`
      : null,
    () => {
      if (productWithBrand?.brand?.id && productWithBrand?.id) {
        return productsApi
          .getBrandProducts(productWithBrand.brand.id, productWithBrand.id, 12)
          .catch(() => ({ items: [], brand: null }));
      }
      return Promise.resolve({ items: [], brand: null });
    }
  );

  // 转换数据格式
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [selectedColor, setSelectedColor] = useState('');

  useEffect(() => {
    if (apiProduct) {
      const adapted = adaptProductData(apiProduct as any, relatedData?.data as any);
      setProductData(adapted);
      setSelectedColor(adapted.colors.find(c => c.available)?.name || '');
    }
  }, [apiProduct, relatedData]);

  // 加入购物车处理函数
  // 移除 alert 弹窗，使用 CartContext 确保状态同步
  // 添加详细调试日志，修复添加购物车功能
  const handleAddToCart = useCallback(async (payload: any) => {
    console.log('[Add to Cart] ===== START =====');
    console.log('[Add to Cart] Payload:', JSON.stringify(payload, null, 2));
    console.log('[Add to Cart] API Product exists:', !!apiProduct);
    console.log('[Add to Cart] Variants count:', apiProduct?.variants?.length || 0);

    if (!apiProduct || !apiProduct.variants) {
      console.error('[Add to Cart] ❌ No API product or variants');
      alert('Product data not loaded. Please refresh and try again.');
      return;
    }

    console.log('[Add to Cart] Available variants:', apiProduct.variants.map((v: any) => ({
      id: v.id,
      color: v.color,
      size: v.size,
      sku: v.sku
    })));

    // 找到对应的 variant
    let matchingVariant = null;
    // 找到对应的 variant (Case-insensitive matching)
    let matchingVariant = null;
    for (const v of apiProduct.variants) {
      const vColor = (v.color || '').toLowerCase().trim();
      const pColor = (payload.color || '').toLowerCase().trim();
      const colorMatch = !pColor || vColor === pColor || !vColor;

      const vSize = (v.size || '').toLowerCase().trim();
      const pSize = (payload.size || '').toLowerCase().trim();
      const sizeMatch = !pSize || vSize === pSize || !vSize;

      console.log('[Add to Cart] Checking variant:', {
        variantId: v.id,
        vColor, pColor, colorMatch,
        vSize, pSize, sizeMatch
      });

      if (colorMatch && sizeMatch) {
        matchingVariant = v;
        break;
      }
    }

    console.log('[Add to Cart] Matching variant found:', !!matchingVariant);
    console.log('[Add to Cart] Matching variant:', matchingVariant);

    if (!matchingVariant || !matchingVariant.id) {
      console.error('[Add to Cart] ❌ No matching variant found');
      console.error('[Add to Cart] Requested:', { color: payload.color, size: payload.size });
      alert('Please select a valid color and size.');
      return;
    }

    try {
      console.log('[Add to Cart] Calling API with variantId:', matchingVariant.id, 'quantity:', payload.quantity || 1);
      const { cartApi } = await import('@/lib/api');
      const result = await cartApi.addItem(matchingVariant.id, payload.quantity || 1);
      console.log('[Add to Cart] ✅ API Response:', result);

      // 触发购物车更新事件，让 CartContext 自动刷新
      window.dispatchEvent(new CustomEvent('cart:updated'));
      console.log('[Add to Cart] ✅ Cart update event dispatched');
      console.log('[Add to Cart] ===== SUCCESS =====');
    } catch (error: any) {
      console.error('[Add to Cart] ❌ API Error:', error);
      console.error('[Add to Cart] Error details:', {
        message: error?.message,
        stack: error?.stack,
        response: error?.response
      });
      alert(`Failed to add to cart: ${error?.message || 'Unknown error'}. Please try again.`);
      console.log('[Add to Cart] ===== FAILED =====');
    }
  }, [apiProduct]);

  // 立即购买处理函数
  // 添加详细调试日志，修复 Buy Now 功能
  const handleBuyNow = useCallback(async (payload: any) => {
    console.log('[Buy Now] ===== START =====');
    console.log('[Buy Now] Payload:', JSON.stringify(payload, null, 2));
    console.log('[Buy Now] API Product exists:', !!apiProduct);
    console.log('[Buy Now] Variants count:', apiProduct?.variants?.length || 0);

    if (!apiProduct || !apiProduct.variants) {
      console.error('[Buy Now] ❌ No API product or variants');
      alert('Product data not loaded. Please refresh and try again.');
      return;
    }

    // 找到对应的 variant
    let matchingVariant = null;
    // 找到对应的 variant (Case-insensitive matching)
    let matchingVariant = null;
    for (const v of apiProduct.variants) {
      const vColor = (v.color || '').toLowerCase().trim();
      const pColor = (payload.color || '').toLowerCase().trim();
      const colorMatch = !pColor || vColor === pColor || !vColor;

      const vSize = (v.size || '').toLowerCase().trim();
      const pSize = (payload.size || '').toLowerCase().trim();
      const sizeMatch = !pSize || vSize === pSize || !vSize;

      console.log('[Buy Now] Checking variant:', {
        variantId: v.id,
        vColor, pColor, colorMatch,
        vSize, pSize, sizeMatch
      });

      if (colorMatch && sizeMatch) {
        matchingVariant = v;
        break;
      }
    }

    console.log('[Buy Now] Matching variant found:', !!matchingVariant);
    console.log('[Buy Now] Matching variant:', matchingVariant);

    if (!matchingVariant || !matchingVariant.id) {
      console.error('[Buy Now] ❌ No matching variant found');
      alert('Please select a valid color and size.');
      return;
    }

    try {
      console.log('[Buy Now] Calling API with variantId:', matchingVariant.id, 'quantity:', payload.quantity || 1);
      const { cartApi } = await import('@/lib/api');
      await cartApi.addItem(matchingVariant.id, payload.quantity || 1);
      console.log('[Buy Now] ✅ Item added to cart');

      // 触发购物车更新事件
      window.dispatchEvent(new CustomEvent('cart:updated'));
      console.log('[Buy Now] ✅ Cart update event dispatched');

      // 跳转到结账页面
      console.log('[Buy Now] Navigating to checkout...');
      router.push('/checkout');
      console.log('[Buy Now] ===== SUCCESS =====');
    } catch (error: any) {
      console.error('[Buy Now] ❌ Error:', error);
      console.error('[Buy Now] Error details:', {
        message: error?.message,
        stack: error?.stack
      });
      alert(`Failed to process your request: ${error?.message || 'Unknown error'}. Please try again.`);
      console.log('[Buy Now] ===== FAILED =====');
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

  // 搜索处理函数
  const handleSearch = useCallback((query: string) => {
    console.log('[Search]', query);
    router.push(`/products?search=${encodeURIComponent(query)}`);
  }, [router]);

  // 开始设计处理函数 - 跳转到新的 Design Lab 页面
  const handleStartDesign = useCallback((payload: any) => {
    console.log('[Start Design]', payload);

    // 根据选中的颜色和尺码找到对应的 variantId
    let targetVariant: any = null;

    if (apiProduct && apiProduct.variants) {
      const matchingVariant = apiProduct.variants.find((v: any) => {
        const colorMatch = !payload.color || v.color === payload.color || !v.color;
        const sizeMatch = !payload.size || v.size === payload.size || !v.size;
        return colorMatch && sizeMatch;
      });

      if (matchingVariant && matchingVariant.id) {
        targetVariant = matchingVariant;
      } else if (apiProduct.variants.length > 0) {
        // 如果没有找到匹配的 variant，使用第一个可用的 variant
        targetVariant = apiProduct.variants[0];
      }
    }

    if (!targetVariant || !targetVariant.id) {
      console.error('[ProductDetail] No variant found for Start Design');
      // 如果没有 variant，显示错误提示
      alert('Unable to start design: Product variant not found. Please select a color and size.');
      return;
    }

    try {
      persistDesignLabPayload(targetVariant);

      // 使用新的 URL 构建函数
      const designUrl = buildNewDesignUrlSafe({
        variantId: targetVariant.id,
        productId: apiProduct?.id,
        color: targetVariant.color || payload.color || undefined,
        size: targetVariant.size || payload.size || undefined,
        referrer: 'product_detail',
      });

      // 使用 router.push 进行客户端导航
      router.push(designUrl);
    } catch (error) {
      console.error('[ProductDetail] Failed to build design URL:', error);
      alert('Unable to start design. Please try again.');
    }
  }, [apiProduct, persistDesignLabPayload, router]);

  // 加载状态
  if (isLoading) {
    return (
      <div className={styles.productDetail}>
        <div className={styles.container}>
          <div className={styles.loading}>Loading product...</div>
        </div>
      </div>
    );
  }

  // 错误状态
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

  // 根据选中颜色过滤图片（如果有颜色特定图片）
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
        {/* 参考图一位置：面包屑导航 */}
        <Breadcrumb items={breadcrumbItems} />

        {/* 参考图一位置：主体双栏布局 */}
        <div className={styles.mainLayout}>
          {/* 参考图一位置：左侧图片画廊 */}
          <div className={styles.gallerySection}>
            <Gallery images={galleryImages} selectedColor={selectedColor} />
          </div>

          {/* 参考图一位置：右侧购买盒 */}
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
              productId={apiProduct?.id} // 传递实际的 productId
            />

            {/* 参考图一位置：配送和退货信息 */}
            <DeliveryReturns
              delivery={productData.delivery}
              returns={productData.returns}
            />

            {/* 参考图一位置：产品特性 */}
            <ProductFeatures
              features={productData.features}
              rating={productData.rating}
            />
          </div>
        </div>

        {/* 移除 Also Available On 模块（按需求） */}

        {/* 参考图一位置："More by this artist" */}
        {/* 使用新 API 获取同一品牌的产品 */}
        <MoreByArtist
          artistName={productData.artist.name}
          artistShopUrl={productData.artist.shopUrl}
          products={
            brandProductsData?.items?.map((item) => ({
              id: item.id,
              title: item.title,
              url: item.coverImageUrl || '/assets/hero/hero-card-tee.jpg',
              price: item.price,
              link: `/products/${item.slug}`,
            })) || []
          }
        />

        {/* 参考图一位置："T-shirts you might like" */}
        <YouMightLike
          title="T-shirts you might like"
          products={productData.youMightLike}
        />

        {/* 移除 Trending Topics 模块（按需求） */}
      </div>
    </div>
  );
}

