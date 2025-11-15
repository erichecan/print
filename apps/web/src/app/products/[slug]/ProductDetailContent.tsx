/**
 * Product Detail Page
 * [2025-11-05 01:10:00]
 * [2025-11-12 03:05:00] Enhanced with inventory messaging, related products, and SEO metadata
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

  // Get unique colors and sizes from variants
  const colors = Array.from(new Set(product?.variants.map(v => v.color).filter(Boolean))) as string[];
  const sizes = Array.from(new Set(product?.variants.map(v => v.size).filter(Boolean))) as string[];

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
          ? { ...review, helpfulCount: review.helpfulCount + 1 }
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

  const currentImage = product.images[selectedImageIndex]?.url || product.images[0]?.url || '/placeholder-product.jpg';
  const price = selectedVariant
    ? Number(product.basePrice) + Number(selectedVariant.priceAdjustment || 0)
    : Number(product.basePrice);

  return (
    <div className="product-detail-page">
      <nav className="breadcrumb">
        <div className="container">
          <ol>
            <li><Link href="/">Home</Link></li>
            <li><Link href="/products">Products</Link></li>
            <li aria-current="page">{product.name}</li>
          </ol>
        </div>
      </nav>

      <div className="container product-detail-grid">
        {/* Image Gallery */}
        <section className="product-gallery">
          <div className="gallery-main">
            {product.images.length > 0 ? (
              <Image
                src={currentImage}
                alt={product.images[selectedImageIndex]?.alt || product.name}
                width={600}
                height={600}
                className="main-image"
                priority
              />
            ) : (
              <div className="main-image-placeholder">No Image</div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="gallery-thumbs">
              {product.images.map((img, index) => (
                <button
                  key={img.id}
                  className={`thumb ${index === selectedImageIndex ? 'is-active' : ''}`}
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

        {/* Product Info */}
        <aside className="product-info">
          <h1 className="product-title">{product.name}</h1>

          <div className="product-meta">
            {product.rating.count > 0 && (
              <div className="rating">
                <span className="stars">
                  {'★'.repeat(Math.round(product.rating.average))}
                  {'☆'.repeat(5 - Math.round(product.rating.average))}
                </span>
                <small>{product.rating.average.toFixed(1)} ({product.rating.count} reviews)</small>
              </div>
            )}
            <div className="sku">SKU: {selectedVariant?.sku || product.sku}</div>
          </div>

          <p className="product-price">
            <strong>${price.toFixed(2)} CAD</strong>
            {product.variants.length > 0 && <span className="price-note">From ${Number(product.basePrice).toFixed(2)}</span>}
          </p>

          {product.description && (
            <p className="product-description">{product.description}</p>
          )}

          {/* Color Selector */}
          {colors.length > 0 && (
            <div className="variant-section">
              <label className="variant-label">Color</label>
              <div className="color-swatches">
                {colors.map((color) => {
                  const variant = product.variants.find(v => v.color === color);
                  return (
                    <button
                      key={color}
                      type="button"
                      className={`color-swatch ${selectedColor === color ? 'is-active' : ''}`}
                      style={{
                        backgroundColor: variant?.colorHex || '#ccc',
                      }}
                      onClick={() => setSelectedColor(color)}
                      aria-label={`Select color ${color}`}
                      aria-pressed={selectedColor === color}
                    >
                      <span className="sr-only">{color}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Size Selector */}
          {sizes.length > 0 && (
            <div className="variant-section">
              <label className="variant-label">Size</label>
              <div className="size-buttons">
                {sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={`size-button ${selectedSize === size ? 'is-active' : ''}`}
                    onClick={() => setSelectedSize(size)}
                    aria-pressed={selectedSize === size}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <Link href="/size-guide" className="size-guide-link">
                Size guide
              </Link>
            </div>
          )}

          {/* Quantity Selector */}
          <div className="quantity-section">
            <label htmlFor="quantity" className="variant-label">Quantity</label>
            <div className="quantity-controls">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <input
                id="quantity"
                type="number"
                min="1"
                max={selectedVariant?.stockQuantity || 999}
                value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1;
                  setQuantity(Math.max(1, Math.min(val, selectedVariant?.stockQuantity || 999)));
                }}
              />
              <button
                type="button"
                onClick={() => setQuantity(Math.min(selectedVariant?.stockQuantity || 999, quantity + 1))}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            {selectedVariant && (
              <div className="stock-info-wrapper">
                <small className={`stock-info ${selectedVariant.stockQuantity === 0 ? 'stock-out' : selectedVariant.stockQuantity <= 5 ? 'stock-low' : ''}`}>
                  {selectedVariant.stockQuantity === 0
                    ? 'Out of stock'
                    : selectedVariant.stockQuantity <= 5
                    ? `Only ${selectedVariant.stockQuantity} left in stock`
                    : `${selectedVariant.stockQuantity} in stock`}
                </small>
                {selectedVariant.stockQuantity > 0 && selectedVariant.stockQuantity <= 5 && (
                  <small className="stock-warning">⚠️ Low stock - Order soon!</small>
                )}
              </div>
            )}
          </div>

          {/* Add to Cart Button */}
          <button
            className="add-to-cart-button"
            onClick={handleAddToCart}
            disabled={!selectedVariant || addingToCart || (selectedVariant?.stockQuantity || 0) < quantity}
          >
            {addingToCart ? 'Adding...' : 'Add to Cart'}
          </button>

          {/* Additional Info */}
          <div className="product-highlights">
            <p><strong>Free Shipping</strong> • Standard 2-week delivery</p>
            <p><strong>Rush Available</strong> • As fast as 3 days</p>
            <p><strong>100% Satisfaction</strong> • We will make it right</p>
          </div>
        </aside>
      </div>

      {/* [2025-01-27 13:40:00] Product Reviews Section */}
      <section className="product-reviews">
        <div className="container">
          <h2 className="reviews-title">Customer Reviews</h2>

          {reviewStats && reviewStats.count > 0 && (
            <div className="reviews-summary">
              <div className="summary-rating">
                <div className="summary-average">{reviewStats.average.toFixed(1)}</div>
                <div className="summary-stars">
                  {'★'.repeat(Math.round(reviewStats.average))}
                  {'☆'.repeat(5 - Math.round(reviewStats.average))}
                </div>
                <div className="summary-count">{reviewStats.count} reviews</div>
              </div>
              <div className="summary-breakdown">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = reviewStats.distribution[rating as keyof typeof reviewStats.distribution] || 0;
                  const percentage = reviewStats.count > 0 ? (count / reviewStats.count) * 100 : 0;
                  return (
                    <div key={rating} className="breakdown-row">
                      <span className="breakdown-rating">{rating}★</span>
                      <div className="breakdown-bar">
                        <div className="breakdown-fill" style={{ width: `${percentage}%` }}></div>
                      </div>
                      <span className="breakdown-count">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {isAuthenticated && !showReviewForm && (
            <button
              type="button"
              onClick={() => setShowReviewForm(true)}
              className="btn-write-review"
            >
              Write a Review
            </button>
          )}

          {showReviewForm && (
            <form onSubmit={handleSubmitReview} className="review-form">
              <h3>Write a Review</h3>
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
                  onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                  placeholder="Summarize your review"
                />
              </div>
              <div className="form-group">
                <label htmlFor="review-comment">Comment *</label>
                <textarea
                  id="review-comment"
                  required
                  rows={5}
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                  placeholder="Share your experience with this product"
                />
              </div>
              <div className="form-actions">
                <button type="submit" disabled={submittingReview} className="btn-submit-review">
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowReviewForm(false);
                    setReviewForm({ rating: 5, title: '', comment: '' });
                  }}
                  className="btn-cancel-review"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {loadingReviews ? (
            <p>Loading reviews...</p>
          ) : reviews.length === 0 ? (
            <div className="no-reviews">
              <p>No reviews yet. Be the first to review this product!</p>
              {!isAuthenticated && (
                <Link href={`/login?redirect=${encodeURIComponent(`/products/${slug}`)}`} className="btn-login-to-review">
                  Sign in to write a review
                </Link>
              )}
            </div>
          ) : (
            <div className="reviews-list">
              {reviews.map((review) => (
                <div key={review.id} className="review-item">
                  <div className="review-header">
                    <div className="review-rating">
                      {'★'.repeat(review.rating)}
                      {'☆'.repeat(5 - review.rating)}
                    </div>
                    <div className="review-meta">
                      <strong className="review-author">
                        {review.user?.firstName || review.user?.lastName
                          ? `${review.user.firstName || ''} ${review.user.lastName || ''}`.trim()
                          : 'Anonymous'}
                      </strong>
                      {review.isVerifiedPurchase && (
                        <span className="verified-badge">✓ Verified Purchase</span>
                      )}
                      <span className="review-date">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <h4 className="review-title">{review.title}</h4>
                  <p className="review-comment">{review.comment}</p>
                  {/* [2025-01-27 21:50:00] 添加"有用"按钮 */}
                  <div className="review-actions">
                    <button
                      type="button"
                      onClick={() => handleMarkHelpful(review.id)}
                      disabled={helpfulReviews.has(review.id)}
                      className="btn-helpful"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#666',
                        cursor: helpfulReviews.has(review.id) ? 'default' : 'pointer',
                        fontSize: '14px',
                        padding: '8px 0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>{helpfulReviews.has(review.id) ? '✓' : 'Helpful'}</span>
                      {review.helpfulCount > 0 && <span>({review.helpfulCount})</span>}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* [2025-11-12 03:05:00] Related Products Section */}
      {relatedProducts.length > 0 && (
        <section className="related-products">
          <div className="container">
            <h2 className="related-products-title">You may also like</h2>
            <div className="related-products-grid">
              {relatedProducts.map((related) => {
                const relatedImage = related.images?.[0]?.url || '/placeholder-product.jpg';
                const relatedPrice = Number(related.basePrice);
                return (
                  <Link key={related.id} href={`/products/${related.slug}`} className="related-product-card">
                    <div className="related-product-image">
                      <Image
                        src={relatedImage}
                        alt={related.name}
                        width={280}
                        height={280}
                      />
                    </div>
                    <h3 className="related-product-name">{related.name}</h3>
                    <p className="related-product-price">${relatedPrice.toFixed(2)} CAD</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

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
    </div>
  );
}


