/**
 * Product Detail Page - Discovery Style
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
import { CategorySidebar } from '@/components/catalog/CategorySidebar';

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
  const [quantity, setQuantity] = useState(1);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);

  const colors = Array.from(new Set(product?.variants.map(v => v.color).filter(Boolean))) as string[];
  const sizes = Array.from(new Set(product?.variants.map(v => v.size).filter(Boolean))) as string[];
  const colorVariants = product?.variants.filter(v => v.color) || [];

  const selectedVariant = product?.variants.find(
    v =>
      (selectedColor ? v.color === selectedColor : !v.color) &&
      (selectedSize ? v.size === selectedSize : !v.size)
  );

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

  const handleStartDesign = () => {
    if (!selectedVariant) {
      showError('Please select a color and size first');
      return;
    }
    window.location.href = `/design-lab-native.html?variantId=${selectedVariant.id}`;
  };

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
        <div className="text-center py-12 text-lg" style={{ color: 'var(--color-text-muted)' }}>Loading product...</div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-container mx-auto px-4 py-6">
        <div className="text-center py-12 text-lg" style={{ color: 'var(--color-text-muted)' }}>{error || 'Product not found'}</div>
        <Link href="/products" style={{ color: 'var(--color-text)', textDecoration: 'underline' }}>Back to Products</Link>
      </div>
    );
  }

  const fallbackImage = '/assets/hero/hero-card-tee.jpg';
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

  const COLOR_HEX_MAP: Record<string, string> = {
    'Black': '#1a1a1a', 'White': '#FFFFFF', 'Navy': '#1B2A4A', 'Red': '#CC2222',
    'Royal': '#2255AA', 'Forest Green': '#2D6A2D', 'Charcoal': '#4A4A4A',
    'Dark Heather': '#5A5A5A', 'Sport Grey': '#AAAAAA', 'Ash': '#D0CEC8',
    'Cardinal Red': '#9B1B30', 'Gold': '#E8B400', 'Orange': '#E85D00',
    'Purple': '#5C2D91', 'Maroon': '#6B1E2E', 'Light Blue': '#7FB8E0',
    'Sand': '#D4B896', 'Natural': '#F5EDD8', 'Daisy': '#FFD700',
    'Azalea': '#E87EA1', 'Heliconia': '#E8457A', 'Irish Green': '#2D9B4A',
    'Sapphire': '#1A5FA8', 'Antique Cherry Red': '#8B2020', 'Military Green': '#4A5D2A',
    'Tweed': '#8B7355', 'Smoke': '#8A8A8A', 'Graphite Heather': '#6B6B6B',
    'Russet': '#8B4513', 'Midnight': '#191970', 'Cherry Red': '#BB1122',
  };
  const uniqueColors = Array.from(
    new Map(
      colorVariants.map(v => [
        v.color,
        { name: v.color, hex: v.colorHex || COLOR_HEX_MAP[v.color as string] || '#CCCCCC' },
      ])
    ).values()
  );

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
      {productSchema && <StructuredData data={[productSchema, ...(aggregateRatingSchema ? [aggregateRatingSchema] : [])]} />}

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 items-start">
        <aside className="hidden lg:block">
          <CategorySidebar currentCategorySlug={product.category?.slug ? String(product.category.slug) : undefined} />
        </aside>

        {/* Main Product Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-12 items-start w-full">

          {/* Left: Image Gallery */}
          <div className="flex flex-col md:flex-row gap-4 items-start">
            {/* Desktop: Vertical thumbnails */}
            <div className="hidden md:flex flex-col gap-3 max-h-[600px] overflow-y-auto flex-shrink-0">
              {product.images.length > 0 ? (
                product.images.map((img, index) => (
                  <button
                    key={img.id}
                    className={`w-20 h-20 overflow-hidden bg-white p-0 transition-colors border-2 ${
                      index === selectedImageIndex ? 'border-black' : 'border-transparent hover:border-[#DBDBDB]'
                    }`}
                    style={{ borderRadius: 0 }}
                    onClick={() => setSelectedImageIndex(index)}
                    aria-label={`View image ${index + 1}`}
                  >
                    <SafeImage src={img.url} alt={img.alt || `${product.name} view ${index + 1}`} width={80} height={80} className="w-full h-full object-cover" />
                  </button>
                ))
              ) : (
                <div className="w-20 h-20 border border-[#DBDBDB] flex items-center justify-center" style={{ background: 'var(--color-bg-sand)', borderRadius: 0 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--color-text-muted)' }}>
                    <rect x="3" y="3" width="18" height="18" rx="0" ry="0" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="8.5" cy="8.5" r="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
            </div>

            {/* Main Image */}
            <div className="relative w-full md:w-[500px] md:h-[666px] aspect-[3/4] md:aspect-auto flex-shrink-0 overflow-hidden" style={{ background: 'var(--color-bg-sand)', borderRadius: 0 }}>
              {product.images.length > 0 ? (
                <>
                  {/* Favorite button — circular exception */}
                  <button
                    className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 border border-[#DBDBDB] flex items-center justify-center cursor-pointer z-10 hover:bg-white transition-colors"
                    aria-label="Add to favorites"
                    title="Add to favorites"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-text)' }}>
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
                <div className="w-full h-full flex items-center justify-center border border-dashed border-[#DBDBDB]" style={{ background: 'var(--color-bg-sand)', borderRadius: 0 }}>
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--color-border)' }}>
                    <rect x="3" y="3" width="18" height="18" rx="0" ry="0" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="8.5" cy="8.5" r="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
            </div>

            {/* Mobile thumbnails */}
            {product.images.length > 1 && (
              <div className="md:hidden w-full overflow-x-auto pb-2 -mx-4 px-4" style={{ scrollbarWidth: 'thin' }}>
                <div className="flex gap-3" style={{ width: 'max-content' }}>
                  {product.images.map((img, index) => (
                    <button
                      key={img.id}
                      className={`w-20 h-20 overflow-hidden bg-white p-0 transition-colors flex-shrink-0 border-2 ${
                        index === selectedImageIndex ? 'border-black' : 'border-transparent hover:border-[#DBDBDB]'
                      }`}
                      style={{ borderRadius: 0 }}
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

            {/* Title + Share */}
            <div className="flex items-start justify-between gap-4">
              <h1
                className="flex-1 leading-tight m-0"
                style={{
                  fontFamily: 'var(--font-heading), Marcellus, serif',
                  fontWeight: 400,
                  fontSize: 'clamp(1.5rem, 2vw + 0.5rem, 2rem)',
                  letterSpacing: '-0.02em',
                  color: 'var(--color-text)',
                }}
              >
                {product.name}
              </h1>
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
                    console.log(`Shared to ${platform}:`, product.name);
                  }}
                />
              )}
            </div>

            {/* Brand */}
            {product.brand && (
              <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Designed and sold by{' '}
                <Link
                  href={`/products?brand=${product.brand.slug}`}
                  style={{ color: 'var(--color-text)', fontWeight: 500, textDecoration: 'underline' }}
                >
                  {product.brand.name}
                </Link>
              </div>
            )}

            {/* Price */}
            <div className="flex flex-col gap-2 my-2">
              {isOnSale ? (
                <>
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span style={{ fontSize: '28px', fontWeight: 600, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
                      {currencyFormatter.format(salePrice / 100)}
                    </span>
                    <span style={{ fontSize: '18px', color: 'var(--color-text-muted)', textDecoration: 'line-through' }}>
                      {currencyFormatter.format(originalPrice / 100)}
                    </span>
                  </div>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '3px 10px',
                      background: 'var(--color-accent)',
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      width: 'fit-content',
                    }}
                  >
                    {discountPercent}% off
                  </span>
                </>
              ) : (
                <span style={{ fontSize: '28px', fontWeight: 600, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
                  {currencyFormatter.format(price / 100)}
                </span>
              )}
            </div>

            {/* Rating */}
            <div className="flex items-center gap-2 flex-wrap text-sm my-2">
              {product.rating.count > 0 ? (
                <>
                  <span style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: '14px' }}>
                    {product.rating.average.toFixed(2)}
                  </span>
                  <span style={{ color: 'var(--color-accent)', fontSize: '15px', letterSpacing: '0.05em' }}>
                    {'★'.repeat(Math.floor(product.rating.average))}
                    {'☆'.repeat(5 - Math.floor(product.rating.average))}
                  </span>
                  <span style={{ color: 'var(--color-text-muted)' }}>({product.rating.count} reviews)</span>
                </>
              ) : (
                <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No reviews yet</span>
              )}
            </div>

            {/* Color Selection */}
            <div className="flex flex-col gap-3">
              <label
                className="block text-sm"
                style={{ fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text)' }}
              >
                Color: {selectedColor || 'Select a color'}
              </label>
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
                        className="w-9 h-9 rounded-full border-2 cursor-pointer relative p-0 flex-shrink-0 transition-colors"
                        style={{
                          backgroundColor: color.hex,
                          borderColor: isSelected ? '#000' : 'transparent',
                          boxShadow: isSelected ? '0 0 0 2px #fff, 0 0 0 3px #000' : 'none',
                          opacity: isAvailable ? 1 : 0.35,
                          cursor: isAvailable ? 'pointer' : 'not-allowed',
                        }}
                        onClick={() => {
                          if (isAvailable) {
                            setSelectedColor(color.name);
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
                          if (isAvailable) setHoveredColor(color.name);
                        }}
                        onMouseLeave={() => setHoveredColor(null)}
                        disabled={!isAvailable}
                        title={color.name ?? undefined}
                      >
                        {isSelected && (
                          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white text-lg pointer-events-none" style={{ fontWeight: 700, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm py-2" style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No colors available</div>
              )}
            </div>

            {/* Size Selection */}
            {sizes.length > 0 && selectedColor && (
              <div className="flex flex-col gap-3">
                <label
                  className="block text-sm"
                  style={{ fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text)' }}
                >
                  Size
                </label>
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
                        className="px-4 py-2 text-sm cursor-pointer transition-colors min-w-[50px] text-center"
                        style={{
                          border: `1px solid ${isSelected ? '#000' : 'var(--color-border)'}`,
                          borderRadius: 0,
                          background: isSelected ? '#000' : '#fff',
                          color: isSelected ? '#fff' : 'var(--color-text)',
                          fontWeight: 500,
                          opacity: isAvailable ? 1 : 0.4,
                          cursor: isAvailable ? 'pointer' : 'not-allowed',
                        }}
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

            {/* Action Buttons */}
            <div className="flex gap-2 flex-col sm:flex-row product-actions-mobile mt-1">
              {/* Start Design */}
              <button
                type="button"
                className="flex-1 min-h-[44px] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  padding: '12px 16px',
                  background: '#fff',
                  color: '#000',
                  border: '1px solid #4B4B4B',
                  borderRadius: 0,
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  cursor: selectedVariant ? 'pointer' : 'not-allowed',
                }}
                onMouseEnter={e => { if (selectedVariant) { (e.currentTarget as HTMLButtonElement).style.background = '#000'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; } }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff'; (e.currentTarget as HTMLButtonElement).style.color = '#000'; }}
                onClick={handleStartDesign}
                disabled={!selectedVariant}
              >
                Start Design
              </button>

              {/* Add to Cart — primary CTA */}
              <button
                type="button"
                className="flex-1 min-h-[44px] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  padding: '12px 16px',
                  background: '#000',
                  color: '#fff',
                  border: '1px solid #000',
                  borderRadius: 0,
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  cursor: (isAddingToCart || !selectedVariant) ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={e => { if (!isAddingToCart && selectedVariant) { (e.currentTarget as HTMLButtonElement).style.background = '#fff'; (e.currentTarget as HTMLButtonElement).style.color = '#000'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#4B4B4B'; } }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#000'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#000'; }}
                onClick={handleAddToCart}
                disabled={isAddingToCart || !selectedVariant}
              >
                {isAddingToCart ? 'Adding...' : 'Add to Cart'}
              </button>

              {/* Buy Now */}
              <button
                type="button"
                className="flex-1 min-h-[44px] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  padding: '12px 16px',
                  background: '#fff',
                  color: '#000',
                  border: '1px solid #4B4B4B',
                  borderRadius: 0,
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  cursor: (isAddingToCart || !selectedVariant) ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={e => { if (!isAddingToCart && selectedVariant) { (e.currentTarget as HTMLButtonElement).style.background = '#000'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; } }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff'; (e.currentTarget as HTMLButtonElement).style.color = '#000'; }}
                onClick={handleBuyNow}
                disabled={isAddingToCart || !selectedVariant}
              >
                {isBuyingNow ? 'Processing...' : 'Buy Now'}
              </button>
            </div>

            {/* Delivery Info */}
            <div className="flex flex-col gap-2">
              <p className="text-sm m-0 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                Estimated delivery: <strong style={{ color: 'var(--color-text)', fontWeight: 600 }}>by 24 November</strong><br />
                between 20-23 November
              </p>
              <Link href="/shipping-info" className="text-sm hover:underline" style={{ color: 'var(--color-text)', textDecoration: 'none' }}>
                Give a digital gift card
              </Link>
            </div>

            {/* Returns */}
            <div className="flex items-center gap-2 text-sm">
              <span style={{ color: 'var(--color-text)', fontWeight: 700 }}>✓</span>
              <span style={{ color: 'var(--color-text)' }}>Super-easy returns</span>
            </div>

            {/* Product Features */}
            <div className="mt-2">
              <h3
                className="m-0 mb-3"
                style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)', letterSpacing: '0.02em' }}
              >
                Product Features
              </h3>
              <ul className="flex flex-col gap-2 list-none p-0 m-0">
                {[
                  'Premium oversized crewneck',
                  'Versatile unisex silhouette',
                  '7 oz heavyweight 100% ring spun cotton jersey fabric',
                  'Dropped shoulders',
                  'Single heavy, large stitched ribban collar',
                  'Ethical production standards',
                  'Better Cotton Initiative',
                  'OEKO-TEX certified',
                  'Fair Labor Association',
                ].map((feature) => (
                  <li
                    key={feature}
                    className="text-sm pl-5 relative leading-relaxed"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    <span
                      className="absolute left-0"
                      style={{ color: 'var(--color-accent)', fontWeight: 700, fontSize: '16px' }}
                    >
                      •
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="pt-12 pb-12 mt-12" style={{ background: '#fff', borderTop: '1px solid var(--color-border)' }}>
          <div className="max-w-container mx-auto px-4">
            <h2
              className="mb-8 text-center"
              style={{
                fontFamily: 'var(--font-heading), Marcellus, serif',
                fontSize: 'clamp(1.75rem, 2.5vw + 0.5rem, 2.5rem)',
                fontWeight: 400,
                color: 'var(--color-text)',
                letterSpacing: '-0.02em',
              }}
            >
              You may also like
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1" style={{ border: '1px solid var(--color-border)' }}>
              {relatedProducts.map((related) => {
                const relatedImage = related.images?.[0]?.url || related.primaryImage?.url || fallbackImage;
                const relatedPrice = related.price?.sale || related.price?.base || related.basePrice;
                return (
                  <Link
                    key={related.id}
                    href={`/products/${related.slug}`}
                    className="block no-underline"
                    style={{ color: 'inherit' }}
                  >
                    <div className="flex flex-col gap-0 transition-colors hover:bg-[#F1EEE9]">
                      <div className="w-full aspect-[3/4] overflow-hidden" style={{ background: 'var(--color-bg-sand)', borderRadius: 0 }}>
                        <SafeImage src={relatedImage} alt={related.name} width={280} height={350} className="w-full h-full object-cover" />
                      </div>
                      <div className="p-4 border-t border-[#DBDBDB]">
                        <h3 className="text-sm font-medium m-0 leading-snug" style={{ color: 'var(--color-text)', letterSpacing: '0.02em' }}>{related.name}</h3>
                        <div className="text-sm mt-1" style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                          {currencyFormatter.format(Number(relatedPrice) / 100)}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* More from brand */}
      {product.brand && relatedProducts.filter(p => p.brand?.slug === product.brand?.slug).length > 0 && (
        <section className="pt-12 pb-12" style={{ background: 'var(--color-bg-sand)', borderTop: '1px solid var(--color-border)' }}>
          <div className="max-w-container mx-auto px-4">
            <h2
              className="mb-8 text-center"
              style={{
                fontFamily: 'var(--font-heading), Marcellus, serif',
                fontSize: 'clamp(1.75rem, 2.5vw + 0.5rem, 2.5rem)',
                fontWeight: 400,
                color: 'var(--color-text)',
                letterSpacing: '-0.02em',
              }}
            >
              More from {product.brand.name}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1" style={{ border: '1px solid var(--color-border)' }}>
              {relatedProducts.filter(p => p.brand?.slug === product.brand?.slug).slice(0, 4).map((brandProduct) => {
                const brandImage = brandProduct.images?.[0]?.url || brandProduct.primaryImage?.url || fallbackImage;
                const brandPrice = brandProduct.price?.sale || brandProduct.price?.base || brandProduct.basePrice;
                return (
                  <Link
                    key={brandProduct.id}
                    href={`/products/${brandProduct.slug}`}
                    className="block no-underline"
                    style={{ color: 'inherit' }}
                  >
                    <div className="flex flex-col gap-0 transition-colors hover:bg-white">
                      <div className="w-full aspect-[3/4] overflow-hidden" style={{ background: '#fff', borderRadius: 0 }}>
                        <SafeImage src={brandImage} alt={brandProduct.name} width={280} height={350} className="w-full h-full object-cover" />
                      </div>
                      <div className="p-4 border-t border-[#DBDBDB]">
                        <h3 className="text-sm font-medium m-0 leading-snug" style={{ color: 'var(--color-text)', letterSpacing: '0.02em' }}>{brandProduct.name}</h3>
                        <div className="text-sm mt-1" style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                          {currencyFormatter.format(Number(brandPrice) / 100)}
                        </div>
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
