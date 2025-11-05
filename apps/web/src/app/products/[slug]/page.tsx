/**
 * Product Detail Page
 * [2025-11-05 01:10:00]
 */
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { productsApi } from '@/lib/api';
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

function ProductDetailContent() {
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

  // Get unique colors and sizes from variants
  const colors = Array.from(new Set(product?.variants.map(v => v.color).filter(Boolean))) as string[];
  const sizes = Array.from(new Set(product?.variants.map(v => v.size).filter(Boolean))) as string[];

  // Find selected variant
  const selectedVariant = product?.variants.find(
    v =>
      (selectedColor ? v.color === selectedColor : !v.color) &&
      (selectedSize ? v.size === selectedSize : !v.size)
  );

  // Auto-select first variant on load
  useEffect(() => {
    if (product && !selectedColor && !selectedSize) {
      const firstVariant = product.variants[0];
      if (firstVariant) {
        setSelectedColor(firstVariant.color || null);
        setSelectedSize(firstVariant.size || null);
      }
    }
  }, [product]);

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
              <small className="stock-info">
                {selectedVariant.stockQuantity > 0
                  ? `${selectedVariant.stockQuantity} in stock`
                  : 'Out of stock'}
              </small>
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
            <p><strong>100% Satisfaction</strong> • We'll make it right</p>
          </div>
        </aside>
      </div>

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
        .stock-info {
          color: #666;
          font-size: 13px;
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
        @media (max-width: 1024px) {
          .product-detail-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default function ProductDetailPage() {
  return (
    <Suspense fallback={<div className="container"><p>Loading...</p></div>}>
      <ProductDetailContent />
    </Suspense>
  );
}
