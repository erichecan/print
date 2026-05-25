'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Promotion } from '@/lib/api';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: { base: number; sale: number; currency: string };
  primaryImage?: { url: string | null; alt?: string | null } | null;
  images?: Array<{ url: string; alt?: string | null }>;
  category?: { name: string } | null;
  brand?: { name: string } | null;
  variants?: Array<{ color?: string; colorHex?: string; imageUrl?: string | null }>;
  rating?: { average: number; count: number };
  promotions?: Promotion[];
}

interface MobileProductCardProps {
  product: Product;
  index: number;
}

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
};

const COLOR_NAME_MAP: Record<string, string> = {
  'Black': '黑',
  'White': '白',
  'black': '黑',
  'white': '白',
};

export function MobileProductCard({ product, index }: MobileProductCardProps) {
  const fallbackImage = '/assets/hero/hero-card-tee.jpg';

  const getDefaultImage = () => {
    const whiteVariant = product.variants?.find(v => {
      const color = (v.color || '').trim();
      return color === 'White' || color === 'white' || color === '白';
    });
    if (whiteVariant?.imageUrl) return whiteVariant.imageUrl;

    const blackVariant = product.variants?.find(v => {
      const color = (v.color || '').trim();
      return color === 'Black' || color === 'black' || color === '黑';
    });
    if (blackVariant?.imageUrl) return blackVariant.imageUrl;

    return product.primaryImage?.url || product.images?.[0]?.url || fallbackImage;
  };

  const img = getDefaultImage();
  const basePrice = Number(product.price?.sale || product.price?.base || 0);
  const rating = product.rating?.average || 4.5;
  const reviewCount = product.rating?.count || 1000;

  const badges = ['Best Seller', 'Customer Fave', 'Staff Pick'];
  const badge = index < 3 ? badges[index % badges.length] : null;

  const productColors = product.variants?.filter(v => v.color && v.color.trim() !== '') || [];
  const uniqueColors = Array.from(
    new Map(
      productColors.map(v => {
        const originalColorName = (v.color || '').trim();
        const displayColorName = COLOR_NAME_MAP[originalColorName] || originalColorName;
        const hex = v.colorHex || COLOR_MAP[originalColorName.toLowerCase()] || '#CCCCCC';
        return [displayColorName, { name: displayColorName, hex }];
      })
    ).values()
  );

  const colors = uniqueColors.slice(0, 5);
  const moreColors = uniqueColors.length > 5 ? uniqueColors.length - 5 : 0;

  return (
    <div className="mobile-product-card">
      <Link href={`/products/${product.slug}`} className="mobile-product-card__content">
        <div className="mobile-product-card__image-container">
          <div className="mobile-product-card__image-wrapper">
            <Image
              src={img}
              alt={product.name}
              fill
              className="mobile-product-card__image"
              sizes="125px"
              priority={index < 4}
            />
            {badge && (
              <div className={`mobile-product-card__badge mobile-product-card__badge--${badge.toLowerCase().replace(/\s+/g, '-')}`}>
                {badge}
              </div>
            )}
            <div className="mobile-product-card__eco">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2d5a27" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8a7 7 0 0 1-7 7c0 1.25-.75 3-3 3z" />
                <path d="M11 20c-1.78 0-3.22-3.39-3.5-5" />
              </svg>
            </div>
          </div>
        </div>

        <div className="mobile-product-card__info">
          <h3 className="mobile-product-card__name">{product.name}</h3>

          <div className="mobile-product-card__colors">
            {colors.map((color, i) => (
              <span key={i} className="color-swatch" style={{ backgroundColor: color.hex }} />
            ))}
            {moreColors > 0 && <span className="color-more">+{moreColors}</span>}
          </div>

          <div className="mobile-product-card__rating">
            <span className="stars">★</span>
            <span className="rating-val">{rating.toFixed(1)}</span>
            <span className="rating-count">({reviewCount.toLocaleString()})</span>
          </div>

          <div className="mobile-product-card__price">
            <div className="price-line">
              <span className="price-val">${basePrice.toFixed(2)}</span>
              <span className="price-ea">/ea for 500 items</span>
            </div>
            <Link href={`/products/${product.slug}`} className="mobile-product-card__pricing-link">Pricing Details</Link>
          </div>

          <div className="mobile-product-card__rush">
            <span className="mobile-product-card__rush-pill">
              <span className="rush-icon">⚡</span>
              <span>3-Day Super Rush Available</span>
            </span>
          </div>

          <div className="mobile-product-card__minimum">No Minimum</div>
        </div>
      </Link>

      <style jsx>{`
        .mobile-product-card {
          background: #fff;
          border-bottom: 1px solid #E5E7EB;
          padding: 16px 0;
          margin: 0 16px;
        }
        .mobile-product-card:last-child {
          border-bottom: none;
        }
        .mobile-product-card__content {
          display: grid;
          grid-template-columns: auto 1fr;
          column-gap: 15px;
          align-items: stretch;
          text-decoration: none;
          color: #333;
        }
        .mobile-product-card__image-container {
          width: 140px;
          display: flex;
          align-items: stretch;
        }
        .mobile-product-card__image-wrapper {
          position: relative;
          background: #F3F4F6;
          border-radius: 0;
          overflow: hidden;
          width: 100%;
          height: 100%;
          min-height: 160px;
        }
        .mobile-product-card__image {
          object-fit: cover;
          object-position: center;
        }
        .mobile-product-card__badge {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          color: #fff;
          text-transform: uppercase;
          background: #FF5722;
          z-index: 10;
          line-height: 1;
        }
        
        .mobile-product-card__eco {
          position: absolute;
          bottom: 4px;
          right: 4px;
          background: #dcfce7;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 1px 2px rgba(0,0,0,0.1);
          z-index: 5;
        }
        
        .mobile-product-card__info {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          padding-top: 0;
        }
        .mobile-product-card__name {
          font-size: 15px;
          font-weight: 700;
          margin: 0 0 6px 0;
          line-height: 1.3;
          color: #1F2937;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .mobile-product-card__colors {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-bottom: 6px;
        }
        .color-swatch {
          width: 18px;
          height: 18px;
          border-radius: 2px;
          border: 1px solid #E5E7EB;
        }
        .color-more {
          font-size: 12px;
          color: #6B7280;
          font-weight: 400;
          margin-left: 2px;
        }
        .mobile-product-card__rating {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          margin-bottom: 6px;
          line-height: 1;
        }
        .stars { color: #FFC107; font-size: 14px; }
        .rating-val { font-weight: 700; color: #1F2937; }
        .rating-count { color: #6B7280; font-size: 13px; font-weight: 400; }
        
        .mobile-product-card__price {
          display: flex;
          flex-direction: column;
          gap: 2px;
          margin-bottom: 6px;
        }
        .price-line {
          display: flex;
          align-items: baseline;
          flex-wrap: wrap;
          gap: 4px;
        }
        .price-val {
          font-size: 16px;
          font-weight: 700;
          color: #1F2937;
        }
        .price-ea {
          font-size: 13px;
          color: #4B5563;
          font-weight: 400;
        }
        .mobile-product-card__pricing-link {
          font-size: 13px;
          color: #2563EB;
          text-decoration: none;
          display: inline-block;
        }
        .mobile-product-card__rush {
          margin-bottom: 4px;
        }
        .mobile-product-card__rush-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #F3F4F6;
          padding: 2px 8px;
          border-radius: 100px;
          font-size: 11px;
          font-style: italic;
          color: #1F2937;
        }
        .rush-icon { color: #1F2937; font-size: 9px; font-style: normal; }
        .mobile-product-card__minimum {
          font-size: 13px;
          color: #4B5563;
          margin-top: 2px;
        }
      `}</style>
    </div>
  );
}
