/**
 * Product Detail Page
 * [2025-11-05 01:10:00]
 * [2025-11-12 03:05:00] Enhanced with inventory messaging, related products, and SEO metadata
 * [2025-01-27 19:00:00] 完全重新设计以100%匹配参考设计，包含所有模块和样式
 */
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { productsApi, authApi, productReviewApi, type ProductReview, type ProductReviewStats } from '@/lib/api'; // [2025-01-27 13:40:00] 添加评价相关导入
import { useCart } from '@/contexts/CartContext';

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
  sku: string;
  variants: ProductVariant[];
  images: ProductImage[];
  rating: {
    average: number;
    count: number;
  };
}

const currencyFormatter = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
}); // [2025-11-16 11:32:00] Prototype-aligned currency formatting

export function ProductDetailContent() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const { addItem } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<(Product | any)[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  // [2025-01-27 13:40:00] 评价相关状态
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewStats, setReviewStats] = useState<ProductReviewStats | null>(null); // [2025-01-27 21:50:00] 使用新的评价统计类型
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: '',
    comment: '',
  });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [helpfulReviews, setHelpfulReviews] = useState<Set<string>>(new Set()); // [2025-01-27 21:50:00] 已标记为有用的评价
  const [noMinimum, setNoMinimum] = useState(false); // [2025-01-27 19:00:00] No Minimum切换状态
  const [recommendedTab, setRecommendedTab] = useState('you-may-also-like'); // [2025-01-27 19:00:00] 推荐产品标签页

  // Get unique colors and sizes from variants
  const colors = Array.from(new Set(product?.variants.map(v => v.color).filter(Boolean))) as string[];
  const sizes = Array.from(new Set(product?.variants.map(v => v.size).filter(Boolean))) as string[];
  
  // [2025-01-27 19:00:00] 获取所有颜色变体（包含colorHex）
  const colorVariants = product?.variants.filter(v => v.color && v.colorHex) || [];

  // Find selected variant
  const selectedVariant = product?.variants.find(
    v =>
      (selectedColor ? v.color === selectedColor : !v.color) &&
      (selectedSize ? v.size === selectedSize : !v.size)
  );

  // [2025-11-10 13:12:45] 自动选择默认变体并满足 exhaustive-deps
  useEffect(() => {
    if (!product) {
      return;
    }
    if (selectedColor || selectedSize) {
      return;
    }
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

  // [2025-11-12 03:05:00] Fetch related products when product loads
  useEffect(() => {
    if (!slug || !product) return;

    async function fetchRelated() {
      try {
        setLoadingRelated(true);
        const response = await productsApi.getRelated(slug, 4);
        setRelatedProducts((response.data || []) as Product[]);
      } catch (err) {
        console.error('[2025-11-12 03:05:00] Failed to load related products:', err);
      } finally {
        setLoadingRelated(false);
      }
    }

    fetchRelated();
  }, [slug, product]);

  // [2025-01-27 13:40:00] 检查用户登录状态
  useEffect(() => {
    async function checkAuth() {
      try {
        await authApi.me();
        setIsAuthenticated(true);
      } catch {
        setIsAuthenticated(false);
      }
    }
    checkAuth();
  }, []);

  const productId = product?.id;

  // [2025-01-27 13:40:00] 获取产品评价
  useEffect(() => {
    if (!productId) return;

    async function fetchReviews() {
      if (!productId) return;
      try {
        setLoadingReviews(true);
        // [2025-01-27 21:50:00] 使用新的 productReviewApi
        const response = await productReviewApi.list(productId, { page: 1, limit: 50 });
        setReviews(response.data || []);
        setReviewStats(response.stats || null);
      } catch (err) {
        console.error('[2025-01-27 13:40:00] Failed to load reviews:', err);
      } finally {
        setLoadingReviews(false);
      }
    }

    fetchReviews();
  }, [productId]);

  // [2025-01-27 13:40:00] 提交评价处理函数
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !isAuthenticated) {
      router.push('/login?redirect=' + encodeURIComponent(`/products/${slug}`));
      return;
    }

    if (!reviewForm.title.trim() || !reviewForm.comment.trim()) {
      alert('Please fill in all fields');
      return;
    }

    setSubmittingReview(true);
    try {
      // [2025-01-27 21:50:00] 使用新的 productReviewApi
      if (!product.id) throw new Error('Product ID is required');
      await productReviewApi.create(product.id, {
        rating: reviewForm.rating,
        title: reviewForm.title.trim(),
        comment: reviewForm.comment.trim(),
      });
      // 重新加载评价
      const response = await productReviewApi.list(product.id, { page: 1, limit: 50 });
      setReviews(response.data || []);
      setReviewStats(response.stats || null);
      setReviewForm({ rating: 5, title: '', comment: '' });
      setShowReviewForm(false);
      alert('Thank you for your review!');
    } catch (err: any) {
      alert(err.message || 'Failed to submit review. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  // [2025-01-27 21:50:00] 标记评价为有用
  const handleMarkHelpful = async (reviewId: string) => {
    if (helpfulReviews.has(reviewId)) {
      return; // 已经标记过
    }

    try {
      await productReviewApi.markHelpful(reviewId);
      setHelpfulReviews(new Set([...helpfulReviews, reviewId]));
      // 更新本地评价数据
      setReviews(reviews.map((review) =>
        review.id === reviewId
          ? { ...review, helpfulCount: (review.helpfulCount || 0) + 1 }
          : review
      ));
    } catch (err: any) {
      console.error('Failed to mark review as helpful:', err);
    }
  };

  const handleAddToCart = async () => {
    if (!selectedVariant) {
      alert('Please select a variant (color/size)');
      return;
    }

    if (selectedVariant.stockQuantity < quantity) {
      alert(`Only ${selectedVariant.stockQuantity} items available in stock`);
      return;
    }

    setAddingToCart(true);
    try {
      await addItem(selectedVariant.id, quantity);
      alert('Added to cart!');
      // Optionally navigate to cart
      // router.push('/cart');
    } catch (err: any) {
      alert(err.message || 'Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <p>Loading product...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container">
        <p>{error || 'Product not found'}</p>
        <Link href="/products">Back to Products</Link>
      </div>
    );
  }

  const fallbackImage = '/assets/hero/hero-card-tee.jpg';
  const currentImage = product.images[selectedImageIndex]?.url || product.images[0]?.url || fallbackImage;
  const price = selectedVariant
    ? Number(product.basePrice) + Number(selectedVariant.priceAdjustment || 0)
    : Number(product.basePrice);
  const productHighlights = [
    `${product.variants.length || 1}+ styles & colors`,
    'Free art clean-up and unlimited proofs',
    'Rush delivery available when you need it',
  ]; // [2025-11-16 11:40:00] Prototype-style highlight items
  const availability =
    selectedVariant && selectedVariant.stockQuantity === 0 ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock';
  const productSchema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description ?? 'Custom apparel and promotional products from Suvernire Plus.',
    sku: selectedVariant?.sku || product.sku,
    image: product.images.length ? product.images.map((img) => img.url) : [fallbackImage],
    brand: {
      '@type': 'Brand',
      name: 'suvernire plus',
    },
    offers: {
      '@type': 'Offer',
      url: `https://suvernireplus.com/products/${product.slug}`,
      priceCurrency: 'CAD',
      price: price.toFixed(2),
      availability,
    },
  }; // [2025-11-16 11:40:00] Structured data for SEO

  if (product.rating.count > 0) {
    productSchema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.rating.average.toFixed(1),
      reviewCount: product.rating.count,
    };
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />{/* [2025-11-16 11:40:00] Product schema for search engines */}
      {/* [2025-01-27 19:00:00] 面包屑导航 - 匹配参考设计 */}
      <nav className="pdp-breadcrumb" aria-label="Breadcrumb">
        <div className="container">
          <ol>
            <li><Link href="/products">All Products</Link></li>
            <li>›</li>
            <li><Link href="/products?collection=t-shirts">T-shirts</Link></li>
            <li>›</li>
            <li><Link href="/products?collection=short-sleeve-t-shirts">Short Sleeve T-shirts</Link></li>
            <li>›</li>
            <li aria-current="page">{product.name}</li>
          </ol>
        </div>
      </nav>

      {/* [2025-01-27 19:00:00] 主产品展示区域 - 完全匹配参考设计 */}
      <div className="pdp-main">
        <div className="container">
          <div className="pdp-main__grid">
            {/* 左侧图片画廊 */}
            <section className="pdp-gallery" aria-label={`${product.name} gallery`}>
              <div className="pdp-gallery__main">
                {product.images.length > 0 ? (
                  <>
                    <Image
                      src={currentImage}
                      alt={product.images[selectedImageIndex]?.alt || product.name}
                      width={600}
                      height={800}
                      priority
                      className="pdp-gallery__main-image"
                    />
                    <button className="pdp-gallery__nav pdp-gallery__nav--prev" onClick={() => setSelectedImageIndex(Math.max(0, selectedImageIndex - 1))}>
                      ‹
                    </button>
                    <button className="pdp-gallery__nav pdp-gallery__nav--next" onClick={() => setSelectedImageIndex(Math.min(product.images.length - 1, selectedImageIndex + 1))}>
                      ›
                    </button>
                  </>
                ) : (
                  <div className="pdp-gallery__placeholder">No Image</div>
                )}
              </div>
              {product.images.length > 1 && (
                <div className="pdp-gallery__thumbs">
                  {product.images.map((img, index) => (
                    <button
                      key={img.id}
                      className={`pdp-gallery__thumb ${index === selectedImageIndex ? 'is-active' : ''}`}
                      onClick={() => setSelectedImageIndex(index)}
                      aria-label={`View image ${index + 1}`}
                    >
                      <Image
                        src={img.url}
                        alt={img.alt || `${product.name} view ${index + 1}`}
                        width={80}
                        height={80}
                      />
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* 右侧产品详情 */}
            <aside className="pdp-details">
              {/* Best Seller标签 */}
              <span className="pdp-badge pdp-badge--best-seller">Best Seller</span>
              
              <h1 className="pdp-details__title">{product.name}</h1>

              {/* 评分 */}
              {product.rating.count > 0 && (
                <div className="pdp-details__rating">
                  <span className="pdp-rating__stars">
                    {'★'.repeat(Math.floor(product.rating.average))}
                    {'☆'.repeat(5 - Math.floor(product.rating.average))}
                  </span>
                  <span className="pdp-rating__value">{product.rating.average.toFixed(1)}/5</span>
                  <span className="pdp-rating__count">({product.rating.count >= 10000 ? '10,000+' : product.rating.count.toLocaleString()} ratings)</span>
                  <span className="pdp-rating__reviews">{product.rating.count.toLocaleString()} reviews</span>
                </div>
              )}

              {/* 配送选项 */}
              <div className="pdp-details__delivery">
                <div className="pdp-delivery__option pdp-delivery__option--free">
                  <span className="pdp-delivery__label">FREE Delivery</span>
                  <span className="pdp-delivery__date">Mon, Dec 1</span>
                </div>
                <div className="pdp-delivery__option pdp-delivery__option--rush">
                  <span className="pdp-delivery__label">Rush Delivery</span>
                  <span className="pdp-delivery__date">Fri, Nov 21</span>
                </div>
                <div className="pdp-delivery__option pdp-delivery__option--super-rush">
                  <span className="pdp-delivery__label">Super Rush</span>
                  <span className="pdp-delivery__date">Wed, Nov 19</span>
                </div>
              </div>

              {/* 装饰类型 */}
              <div className="pdp-details__decoration">
                <span className="pdp-decoration__icon">🎨</span>
                <span className="pdp-decoration__label">Printing</span>
              </div>

              {/* 颜色选择 */}
              {colorVariants.length > 0 && (
                <div className="pdp-details__colors">
                  <div className="pdp-colors__header">
                    <span className="pdp-colors__label">Colors</span>
                    <label className="pdp-toggle">
                      <input type="checkbox" checked={noMinimum} onChange={(e) => setNoMinimum(e.target.checked)} />
                      <span className="pdp-toggle__slider">
                        <span className="pdp-toggle__label pdp-toggle__label--no">No</span>
                        <span className="pdp-toggle__label pdp-toggle__label--yes">Yes</span>
                      </span>
                      <span className="pdp-toggle__text">No Minimum</span>
                    </label>
                  </div>
                  <div className="pdp-colors__grid">
                    {colorVariants.slice(0, 60).map((variant, index) => (
                      <button
                        key={variant.id || index}
                        type="button"
                        className={`pdp-color-swatch ${selectedColor === variant.color ? 'is-selected' : ''}`}
                        style={{ backgroundColor: variant.colorHex || '#d1d5db' }}
                        onClick={() => setSelectedColor(variant.color || null)}
                        aria-label={`Select color ${variant.color}`}
                        title={variant.color || ''}
                      >
                        {selectedColor === variant.color && <span className="pdp-color-swatch__check">✓</span>}
                      </button>
                    ))}
                  </div>
                  {selectedColor && (
                    <div className="pdp-colors__selected">
                      <span>{selectedColor} YS-5XL</span>
                      <Link href="#sizes" className="pdp-colors__check-link">Check sizes for all colors</Link>
                    </div>
                  )}
                  <div className="pdp-colors__minimum">
                    <span>Minimum Quantity 1</span>
                  </div>
                </div>
              )}

              {/* 主要操作按钮 */}
              <div className="pdp-details__actions">
                <div className="pdp-details__primary-buttons">
                  <button
                    type="button"
                    className="pdp-btn pdp-btn--primary"
                    onClick={handleAddToCart}
                    disabled={addingToCart || !selectedVariant}
                  >
                    {addingToCart ? 'Adding...' : 'Add to Cart'}
                  </button>
                  <button
                    type="button"
                    className="pdp-btn pdp-btn--secondary"
                    onClick={async () => {
                      if (!selectedVariant) {
                        alert('Please select a variant (color/size)');
                        return;
                      }
                      try {
                        await handleAddToCart();
                        router.push('/cart');
                      } catch (err: any) {
                        // Error already handled in handleAddToCart
                      }
                    }}
                    disabled={addingToCart || !selectedVariant}
                  >
                    Buy Now
                  </button>
                </div>
                <Link href={`/design-lab?variantId=${selectedVariant?.id || ''}`} className="pdp-btn pdp-btn--outline">
                  Start Designing &gt;
                </Link>
                <div className="pdp-details__secondary-actions">
                  <Link href="/request-sample" className="pdp-link">Request a Sample</Link>
                  <Link href="/contact" className="pdp-link">Get a Quote</Link>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* [2025-01-27 19:00:00] 描述和特性部分 */}
      <section className="pdp-description">
        <div className="container">
          <div className="pdp-description__grid">
            <div className="pdp-description__left">
              <h2>Description</h2>
              <p>{product.description || 'This comfortable t-shirt is perfect for custom printing. Made with high-quality materials, it offers great value and a modern fit.'}</p>
              <Link href="/fit-sizing-guide" className="pdp-description__link">Fit & Sizing Guide</Link>
            </div>
            <div className="pdp-description__right">
              <h3>Features & Specifications</h3>
              <ul className="pdp-specs">
                <li>100% ring spun cotton</li>
                <li>Poly blend for durability</li>
                <li>Narrow width, rib collar</li>
                <li>Modern fit</li>
                <li>Recycled tear-away label</li>
                <li>Better Cotton</li>
                <li>OEKO-TEX certified</li>
                <li>Reduced plastic waste</li>
                <li>Fair Labor Association</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* [2025-01-27 19:00:00] 配送选项详细说明 */}
      <section className="pdp-delivery-info">
        <div className="container">
          <h2>Delivery Options</h2>
          <ul className="pdp-delivery-info__list">
            <li><strong>Free Delivery</strong> - Standard shipping at no extra cost</li>
            <li><strong>Rush or Super Rush</strong> - Get your order faster with expedited shipping</li>
            <li><strong>SHIP TO MULTIPLE ADDRESSES</strong> - Flat rate shipping per address. <Link href="/shipping-info">Learn More</Link></li>
          </ul>
        </div>
      </section>

      {/* [2025-01-27 19:00:00] 推荐产品部分 */}
      {relatedProducts.length > 0 && (
        <section className="pdp-recommended">
          <div className="container">
            <div className="pdp-recommended__tabs">
              <button 
                className={`pdp-tab ${recommendedTab === 'you-may-also-like' ? 'is-active' : ''}`}
                onClick={() => setRecommendedTab('you-may-also-like')}
              >
                You May Also Like
              </button>
              <button 
                className={`pdp-tab ${recommendedTab === 'budget-friendly' ? 'is-active' : ''}`}
                onClick={() => setRecommendedTab('budget-friendly')}
              >
                Budget Friendly
              </button>
              <button 
                className={`pdp-tab ${recommendedTab === 'more-from-brand' ? 'is-active' : ''}`}
                onClick={() => setRecommendedTab('more-from-brand')}
              >
                More From This Brand
              </button>
              <button 
                className={`pdp-tab ${recommendedTab === 'coordinating' ? 'is-active' : ''}`}
                onClick={() => setRecommendedTab('coordinating')}
              >
                Coordinating Styles
              </button>
            </div>
            <div className="pdp-recommended__grid">
              {relatedProducts.map((related) => {
                const relatedImage = related.images?.[0]?.url || fallbackImage;
                const relatedPrice = Number(related.basePrice);
                return (
                  <Link key={related.id} href={`/products/${related.slug}`} className="pdp-recommended__card">
                    <div className="pdp-recommended__image">
                      <Image src={relatedImage} alt={related.name} width={280} height={350} />
                    </div>
                    <h3 className="pdp-recommended__title">{related.name}</h3>
                    <div className="pdp-recommended__rating">
                      <span className="pdp-recommended__stars">
                        {'★'.repeat(Math.floor(related.rating?.average || 4.5))}
                        {'☆'.repeat(5 - Math.floor(related.rating?.average || 4.5))}
                      </span>
                      <span className="pdp-recommended__rating-value">{(related.rating?.average || 4.5).toFixed(1)}</span>
                    </div>
                    <p className="pdp-recommended__price">{currencyFormatter.format(relatedPrice)}</p>
                    <span className="pdp-recommended__minimum">No Minimum</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* [2025-01-27 19:00:00] 评论部分 - 完全匹配参考设计 */}
      <section className="pdp-reviews-new" aria-labelledby="reviews-heading">
        <div className="container">
          <h2 id="reviews-heading" className="pdp-reviews-new__title">
            Reviews for {product.name}
          </h2>

          {reviewStats && reviewStats.count > 0 && (
            <div className="pdp-reviews-new__summary">
              <div className="pdp-reviews-new__overall">
                <div className="pdp-reviews-new__score">{reviewStats.average.toFixed(1)}</div>
                <div className="pdp-reviews-new__stars">
                  {'★'.repeat(Math.floor(reviewStats.average))}
                  {'☆'.repeat(5 - Math.floor(reviewStats.average))}
                </div>
                <p className="pdp-reviews-new__count">{reviewStats.count.toLocaleString()} reviews</p>
                <div className="pdp-reviews-new__badge">
                  <span>Trustpilot</span>
                </div>
              </div>
              <div className="pdp-reviews-new__breakdown">
                <div className="pdp-reviews-new__bars">
                  {[5, 4, 3, 2, 1].map((rating) => {
                    const count = reviewStats.distribution[rating as keyof typeof reviewStats.distribution] || 0;
                    const percentage = reviewStats.count ? (count / reviewStats.count) * 100 : 0;
                    const labels = ['Excellent', 'Great', 'Average', 'Poor', 'Bad'];
                    return (
                      <div key={rating} className="pdp-reviews-new__bar-row">
                        <span className="pdp-reviews-new__bar-label">{labels[5 - rating]}</span>
                        <div className="pdp-reviews-new__bar">
                          <div className="pdp-reviews-new__bar-fill" style={{ width: `${percentage}%` }} />
                        </div>
                        <span className="pdp-reviews-new__bar-count">{count}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="pdp-reviews-new__attributes">
                  <div className="pdp-reviews-new__attr">
                    <span className="pdp-reviews-new__attr-label">Fit</span>
                    <span className="pdp-reviews-new__attr-stars">★★★★★</span>
                    <span className="pdp-reviews-new__attr-value">4.8</span>
                  </div>
                  <div className="pdp-reviews-new__attr">
                    <span className="pdp-reviews-new__attr-label">Materials</span>
                    <span className="pdp-reviews-new__attr-stars">★★★★★</span>
                    <span className="pdp-reviews-new__attr-value">4.7</span>
                  </div>
                  <div className="pdp-reviews-new__attr">
                    <span className="pdp-reviews-new__attr-label">Quality</span>
                    <span className="pdp-reviews-new__attr-stars">★★★★★</span>
                    <span className="pdp-reviews-new__attr-value">4.5</span>
                  </div>
                  <div className="pdp-reviews-new__attr">
                    <span className="pdp-reviews-new__attr-label">Style</span>
                    <span className="pdp-reviews-new__attr-stars">★★★★★</span>
                    <span className="pdp-reviews-new__attr-value">4.7</span>
                  </div>
                  <div className="pdp-reviews-new__attr">
                    <span className="pdp-reviews-new__attr-label">Value for money</span>
                    <span className="pdp-reviews-new__attr-stars">★★★★★</span>
                    <span className="pdp-reviews-new__attr-value">4.4</span>
                  </div>
                  <div className="pdp-reviews-new__attr">
                    <span className="pdp-reviews-new__attr-label">Size</span>
                    <span className="pdp-reviews-new__attr-stars">★★★★★</span>
                    <span className="pdp-reviews-new__attr-value">4.6</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 用户生成内容 */}
          <div className="pdp-reviews-new__ugc">
            <div className="pdp-reviews-new__ugc-grid">
              {[1, 2, 3].map((i) => (
                <div key={i} className="pdp-reviews-new__ugc-item">
                  <div className="pdp-reviews-new__ugc-placeholder">Photo {i}</div>
                </div>
              ))}
              <div className="pdp-reviews-new__ugc-item pdp-reviews-new__ugc-item--video">
                <div className="pdp-reviews-new__ugc-placeholder">Video</div>
              </div>
            </div>
            <Link href="#all-photos" className="pdp-reviews-new__ugc-link">Show all photos</Link>
          </div>

          <div className="reviews__list">
            {isAuthenticated && !showReviewForm && (
              <button type="button" className="btn-write-review" onClick={() => setShowReviewForm(true)}>
                Write a Review
              </button>
            )}

            {showReviewForm && (
              <form onSubmit={handleSubmitReview} className="review-form">
                <h3>Share your experience</h3>
                <div className="form-group">
                  <label>Rating *</label>
                  <div className="rating-input">
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => setReviewForm({ ...reviewForm, rating })}
                        className={`rating-btn ${reviewForm.rating >= rating ? 'active' : ''}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="review-title">Title *</label>
                  <input
                    id="review-title"
                    type="text"
                    required
                    value={reviewForm.title}
                    onChange={(event) => setReviewForm({ ...reviewForm, title: event.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="review-comment">Comment *</label>
                  <textarea
                    id="review-comment"
                    rows={5}
                    required
                    value={reviewForm.comment}
                    onChange={(event) => setReviewForm({ ...reviewForm, comment: event.target.value })}
                  />
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-submit-review" disabled={submittingReview}>
                    {submittingReview ? 'Submitting…' : 'Submit review'}
                  </button>
                  <button
                    type="button"
                    className="btn-cancel-review"
                    onClick={() => {
                      setShowReviewForm(false);
                      setReviewForm({ rating: 5, title: '', comment: '' });
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {loadingReviews ? (
              <p>Loading reviews…</p>
            ) : reviews.length === 0 ? (
              <div className="no-reviews">
                <p>No reviews yet. Be the first to review this product.</p>
                {!isAuthenticated && (
                  <Link href={`/login?redirect=${encodeURIComponent(`/products/${slug}`)}`} className="btn-login-to-review">
                    Sign in to review
                  </Link>
                )}
              </div>
            ) : (
              reviews.map((review) => (
                <article key={review.id} className="review">
                  <header>
                    <div className="review-rating">
                      {'★'.repeat(review.rating)}
                      {'☆'.repeat(5 - review.rating)}
                    </div>
                    <div className="audit-meta">
                      <span>
                        {review.user?.firstName || review.user?.lastName
                          ? `${review.user.firstName || ''} ${review.user.lastName || ''}`.trim()
                          : 'Anonymous'}
                      </span>
                      <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                    </div>
                  </header>
                  <h4>{review.title}</h4>
                  <p>{review.comment}</p>
                  <button
                    type="button"
                    className="btn-helpful"
                    onClick={() => handleMarkHelpful(review.id)}
                    disabled={helpfulReviews.has(review.id)}
                  >
                    {helpfulReviews.has(review.id) ? 'Marked helpful' : 'Helpful'}
                    {(review.helpfulCount || 0) > 0 && <span> ({review.helpfulCount})</span>}
                  </button>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      {/* [2025-01-27 19:00:00] 产品专家部分 */}
      <section className="pdp-experts">
        <div className="container">
          <div className="pdp-experts__content">
            <div className="pdp-experts__image">
              <div className="pdp-experts__placeholder">Product Experts</div>
            </div>
            <div className="pdp-experts__text">
              <h2>Product Experts Available 7 Days a Week</h2>
              <p>Not sure what to buy? We&apos;ll point you to the right product!</p>
              <div className="pdp-experts__contact">
                <a href="tel:8552712660" className="pdp-experts__phone">855-271-2660</a>
                <Link href="/chat" className="pdp-btn pdp-btn--secondary">Chat Now</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        .product-detail-page {
          min-height: 100vh;
        }
        .breadcrumb {
          background: #fff;
          border-bottom: 1px solid #e5e5e5;
          padding: 12px 0;
        }
        .breadcrumb ol {
          display: flex;
          gap: 8px;
          font-size: 14px;
          color: #666;
        }
        .breadcrumb a {
          color: #333;
          text-decoration: none;
        }
        .breadcrumb a:hover {
          text-decoration: underline;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1rem;
        }
        .product-detail-grid {
          display: grid;
          grid-template-columns: 1fr 420px;
          gap: 32px;
          padding: 32px 0;
        }
        .product-gallery {
          display: grid;
          gap: 16px;
        }
        .gallery-main {
          position: relative;
          width: 100%;
          aspect-ratio: 1;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid #e5e5e5;
        }
        .main-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .main-image-placeholder {
          width: 100%;
          height: 100%;
          background: #f5f5f5;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #999;
        }
        .gallery-thumbs {
          display: grid;
          grid-template-columns: repeat(auto-fill, 80px);
          gap: 12px;
        }
        .thumb {
          width: 80px;
          height: 80px;
          border-radius: 8px;
          border: 2px solid transparent;
          overflow: hidden;
          cursor: pointer;
          background: #fff;
          padding: 0;
        }
        .thumb.is-active {
          border-color: #ff1f3d;
        }
        .thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .product-info {
          display: grid;
          gap: 20px;
          align-content: start;
        }
        .pdp-details__actions {
          display: grid;
          gap: 12px;
        }
        .pdp-details__primary-buttons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .pdp-btn {
          padding: 14px 24px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          text-align: center;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          display: inline-block;
        }
        .pdp-btn--primary {
          background: #ff1f3d;
          color: white;
        }
        .pdp-btn--primary:hover:not(:disabled) {
          background: #e3002b;
        }
        .pdp-btn--secondary {
          background: #333;
          color: white;
        }
        .pdp-btn--secondary:hover:not(:disabled) {
          background: #000;
        }
        .pdp-btn--outline {
          background: transparent;
          color: #ff1f3d;
          border: 2px solid #ff1f3d;
        }
        .pdp-btn--outline:hover {
          background: rgba(255, 31, 61, 0.1);
        }
        .pdp-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .product-title {
          font-size: 28px;
          font-weight: 700;
          margin: 0;
          line-height: 1.2;
        }
        .product-meta {
          display: flex;
          gap: 16px;
          align-items: center;
          font-size: 14px;
          color: #666;
        }
        .rating {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .stars {
          color: #f59e0b;
          font-size: 16px;
        }
        .product-price {
          font-size: 24px;
          font-weight: 600;
          margin: 0;
        }
        .price-note {
          font-size: 16px;
          font-weight: 400;
          color: #666;
          margin-left: 8px;
        }
        .product-description {
          color: #666;
          line-height: 1.6;
        }
        .variant-section {
          display: grid;
          gap: 12px;
        }
        .variant-label {
          font-weight: 600;
          font-size: 14px;
        }
        .color-swatches {
          display: flex;
          gap: 12px;
        }
        .color-swatch {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 2px solid transparent;
          cursor: pointer;
          position: relative;
        }
        .color-swatch.is-active {
          border-color: #ff1f3d;
          outline: 2px solid #ff1f3d;
          outline-offset: 2px;
        }
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border-width: 0;
        }
        .size-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .size-button {
          padding: 8px 16px;
          border: 1px solid #e5e5e5;
          border-radius: 6px;
          background: #fff;
          cursor: pointer;
          font-weight: 500;
          font-size: 14px;
        }
        .size-button.is-active {
          border-color: #ff1f3d;
          background: rgba(255, 31, 61, 0.1);
          color: #ff1f3d;
        }
        .size-guide-link {
          font-size: 14px;
          color: #666;
          text-decoration: none;
        }
        .size-guide-link:hover {
          text-decoration: underline;
        }
        .quantity-section {
          display: grid;
          gap: 8px;
        }
        .quantity-controls {
          display: flex;
          align-items: center;
          gap: 0;
          border: 1px solid #e5e5e5;
          border-radius: 6px;
          width: fit-content;
        }
        .quantity-controls button {
          width: 36px;
          height: 36px;
          border: none;
          background: #fff;
          cursor: pointer;
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .quantity-controls button:hover {
          background: #f5f5f5;
        }
        .quantity-controls input {
          width: 60px;
          height: 36px;
          border: none;
          border-left: 1px solid #e5e5e5;
          border-right: 1px solid #e5e5e5;
          text-align: center;
          font-size: 16px;
        }
        .stock-info-wrapper {
          display: grid;
          gap: 4px;
        }
        .stock-info {
          color: #666;
          font-size: 13px;
        }
        .stock-info.stock-low {
          color: #f59e0b;
          font-weight: 600;
        }
        .stock-info.stock-out {
          color: #ef4444;
          font-weight: 600;
        }
        .stock-warning {
          color: #f59e0b;
          font-size: 12px;
          font-weight: 500;
        }
        .add-to-cart-button {
          padding: 16px 32px;
          background: #ff1f3d;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        .add-to-cart-button:hover:not(:disabled) {
          background: #e3002b;
        }
        .add-to-cart-button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        .product-highlights {
          padding-top: 16px;
          border-top: 1px solid #e5e5e5;
          display: grid;
          gap: 8px;
          font-size: 14px;
          color: #666;
        }
        .product-reviews {
          padding: 48px 0;
          background: #fff;
          border-top: 1px solid #e5e5e5;
        }
        .reviews-title {
          font-size: 24px;
          font-weight: 700;
          margin: 0 0 32px;
        }
        .reviews-summary {
          display: grid;
          grid-template-columns: 200px 1fr;
          gap: 32px;
          padding: 24px;
          background: #f9fafb;
          border-radius: 8px;
          margin-bottom: 32px;
        }
        .summary-rating {
          text-align: center;
        }
        .summary-average {
          font-size: 48px;
          font-weight: 700;
          color: #ff1f3d;
          margin-bottom: 8px;
        }
        .summary-stars {
          font-size: 20px;
          color: #fbbf24;
          margin-bottom: 8px;
        }
        .summary-count {
          font-size: 14px;
          color: #666;
        }
        .summary-breakdown {
          display: grid;
          gap: 8px;
        }
        .breakdown-row {
          display: grid;
          grid-template-columns: 40px 1fr 40px;
          gap: 12px;
          align-items: center;
        }
        .breakdown-rating {
          font-size: 14px;
          color: #666;
        }
        .breakdown-bar {
          height: 8px;
          background: #e5e5e5;
          border-radius: 4px;
          overflow: hidden;
        }
        .breakdown-fill {
          height: 100%;
          background: #fbbf24;
          transition: width 0.3s;
        }
        .breakdown-count {
          font-size: 14px;
          color: #666;
          text-align: right;
        }
        .btn-write-review {
          padding: 12px 24px;
          background: #ff1f3d;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          margin-bottom: 32px;
        }
        .btn-write-review:hover {
          background: #e3002b;
        }
        .review-form {
          padding: 24px;
          background: #f9fafb;
          border-radius: 8px;
          margin-bottom: 32px;
        }
        .review-form h3 {
          margin: 0 0 24px;
          font-size: 20px;
        }
        .form-group {
          margin-bottom: 20px;
        }
        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #333;
        }
        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          font-family: inherit;
        }
        .form-group textarea {
          resize: vertical;
        }
        .rating-input {
          display: flex;
          gap: 8px;
        }
        .rating-btn {
          background: none;
          border: none;
          font-size: 32px;
          color: #ddd;
          cursor: pointer;
          padding: 0;
          transition: color 0.2s;
        }
        .rating-btn.active,
        .rating-btn:hover {
          color: #fbbf24;
        }
        .form-actions {
          display: flex;
          gap: 12px;
        }
        .btn-submit-review {
          padding: 12px 24px;
          background: #ff1f3d;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-submit-review:hover:not(:disabled) {
          background: #e3002b;
        }
        .btn-submit-review:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .btn-cancel-review {
          padding: 12px 24px;
          background: white;
          color: #666;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 16px;
          cursor: pointer;
        }
        .btn-cancel-review:hover {
          background: #f5f5f5;
        }
        .no-reviews {
          text-align: center;
          padding: 48px;
          color: #666;
        }
        .btn-login-to-review {
          display: inline-block;
          margin-top: 16px;
          padding: 12px 24px;
          background: #ff1f3d;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          font-weight: 600;
        }
        .reviews-list {
          display: grid;
          gap: 24px;
        }
        .review-item {
          padding: 24px;
          background: #f9fafb;
          border-radius: 8px;
          border: 1px solid #e5e5e5;
        }
        .review-header {
          display: flex;
          gap: 16px;
          align-items: start;
          margin-bottom: 12px;
        }
        .review-rating {
          font-size: 18px;
          color: #fbbf24;
        }
        .review-meta {
          flex: 1;
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }
        .review-author {
          font-size: 16px;
          color: #333;
        }
        .verified-badge {
          padding: 4px 8px;
          background: #10b981;
          color: white;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }
        .review-date {
          font-size: 14px;
          color: #666;
        }
        .review-title {
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 8px;
          color: #333;
        }
        .review-comment {
          font-size: 14px;
          line-height: 1.6;
          color: #666;
          margin: 0;
        }
        .related-products {
          padding: 48px 0;
          background: #f9fafb;
          border-top: 1px solid #e5e5e5;
        }
        .related-products-title {
          font-size: 24px;
          font-weight: 700;
          margin: 0 0 24px;
        }
        .related-products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 24px;
        }
        .related-product-card {
          background: #fff;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid #e5e5e5;
          text-decoration: none;
          color: inherit;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .related-product-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .related-product-image {
          width: 100%;
          aspect-ratio: 1;
          position: relative;
          overflow: hidden;
        }
        .related-product-name {
          padding: 12px 16px 4px;
          font-size: 16px;
          font-weight: 600;
          margin: 0;
          color: #1f2937;
        }
        .related-product-price {
          padding: 0 16px 16px;
          font-size: 18px;
          font-weight: 700;
          color: #ff1f3d;
          margin: 0;
        }
        @media (max-width: 1024px) {
          .product-detail-grid {
            grid-template-columns: 1fr;
          }
          .related-products-grid {
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
            gap: 16px;
          }
        }
      `}</style>
    </>
  );
}


