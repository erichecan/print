'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Variant {
  id: string;
  color: string;
  colorHex?: string;
  size: string;
  priceAdjustment: number;
  stockQuantity: number;
  imageUrl?: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  basePrice: number; // In dollars (from backend normalization)
  salePrice?: number;
  stockQuantity: number;
  isActive: boolean;
  primaryImage?: { url: string; alt?: string };
  images: { url: string; alt?: string; color?: string }[];
  variants: Variant[];
}

interface AdminProductCardProps {
  product: Product;
  onDelete: (product: Product) => void;
  onStatusChange: (product: Product) => void;
}

export function AdminProductCard({ product, onDelete, onStatusChange }: AdminProductCardProps) {
  // 1. Group variants by color
  const colorGroups = useMemo(() => {
    const groups: Record<string, Variant[]> = {};
    const colorDetails: Record<string, { hex: string; image?: string }> = {};

    product.variants.forEach((v) => {
      if (!groups[v.color]) {
        groups[v.color] = [];
        colorDetails[v.color] = { hex: v.colorHex || '#ccc' };
      }
      groups[v.color].push(v);
      
      // Try to find image for this color if not already found
      if (!colorDetails[v.color].image && v.imageUrl) {
        colorDetails[v.color].image = v.imageUrl;
      }
    });
    
    // Also check product images for color linkage if variant doesn't have it
    // (This matches our Frontend logic fix)
    Object.keys(colorDetails).forEach(color => {
      if (!colorDetails[color].image) {
        const matchingImage = product.images.find(img => img.color === color || img.alt?.startsWith(color));
        if (matchingImage) {
          colorDetails[color].image = matchingImage.url;
        }
      }
    });

    return { groups, colorDetails };
  }, [product]);

  const uniqueColors = Object.keys(colorGroups.groups);
  
  // 2. State for active color (default to first one or product default)
  const [activeColor, setActiveColor] = useState<string | null>(uniqueColors[0] || null);
  const [isHoveringColor, setIsHoveringColor] = useState<string | null>(null);

  // Determine display values based on active color
  const displayColor = isHoveringColor || activeColor;
  
  const currentVariants = displayColor ? colorGroups.groups[displayColor] : product.variants;
  
  // Calculate stats for current view
  const currentStock = currentVariants?.reduce((sum, v) => sum + v.stockQuantity, 0) ?? product.stockQuantity;
  
  const priceRange = useMemo(() => {
    if (!currentVariants || currentVariants.length === 0) return null;
    const prices = currentVariants.map(v => product.basePrice + (v.priceAdjustment || 0)); // No need to divide by 100, basePrice is already in dollars
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min === max) return `$${min.toFixed(2)}`;
    return `$${min.toFixed(2)} - $${max.toFixed(2)}`;
  }, [currentVariants, product.basePrice]);

  const currentImage = useMemo(() => {
    if (displayColor && colorGroups.colorDetails[displayColor]?.image) {
      return colorGroups.colorDetails[displayColor].image;
    }
    return product.primaryImage?.url || product.images?.[0]?.url || '/placeholder.png';
  }, [displayColor, colorGroups, product]);

  const displaySizes = useMemo(() => {
    return currentVariants?.map(v => v.size).sort((a, b) => {
       const order = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
       return order.indexOf(a) - order.indexOf(b);
    }) || [];
  }, [currentVariants]);

  // Actions
  const handleColorClick = (e: React.MouseEvent, color: string) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveColor(color);
  };

  return (
    <div className="admin-product-card">
      {/* Left: Image */}
      <div className="card-image">
        <div className="image-wrapper">
         <Image 
           src={currentImage!} 
           alt={product.name} 
           fill 
           style={{ objectFit: 'contain' }}
           unoptimized // For blob/external urls
         />
        </div>
      </div>

      {/* Middle: Info */}
      <div className="card-info">
        <div className="info-header">
           <Link href={`/admin/online-products/${product.id}`} className="product-title">
             {product.name}
           </Link>
           <span className={`status-badge ${product.isActive ? 'active' : 'inactive'}`}>
             {product.isActive ? 'Active' : 'Inactive'}
           </span>
        </div>
        
        <div className="info-meta">
          <span className="meta-item">
            {currentVariants?.length || 0} variants
          </span>
          <span className="meta-divider">·</span>
          <span className="meta-item">
            Total Stock: {currentStock}
          </span>
        </div>
        
        <div className="info-price">
           {priceRange || `$${product.basePrice.toFixed(2)}`}
        </div>

        <div className="info-actions">
           <Link href={`/admin/online-products/${product.id}`} className="action-link">
             📝 Edit
           </Link>
           {/* Additional actions... */}
        </div>
      </div>

      {/* Right/Bottom: Variant Preview */}
      <div className="card-variants">
         <div className="variant-preview-title">
            Variant Quick Preview:
         </div>
         <div className="color-swatches">
            {uniqueColors.map(color => {
               const details = colorGroups.colorDetails[color];
               const isActive = color === activeColor;
               return (
                 <button
                   key={color}
                   className={`color-dot ${isActive ? 'active' : ''}`}
                   style={{ backgroundColor: details.hex }}
                   onClick={(e) => handleColorClick(e, color)}
                   onMouseEnter={() => setIsHoveringColor(color)}
                   onMouseLeave={() => setIsHoveringColor(null)}
                   title={color}
                   aria-label={`Select ${color}`}
                 />
               );
            })}
         </div>
         <div className="size-list">
            {displaySizes.slice(0, 5).map(size => (
               <span key={size} className="size-badge">{size}</span>
            ))}
            {displaySizes.length > 5 && <span className="size-more">+{displaySizes.length - 5}</span>}
         </div>
      </div>

      <style jsx>{`
        .admin-product-card {
          display: flex;
          background: #fff;
          border: 1px solid #e1e3e5;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 12px;
          transition: box-shadow 0.2s;
          gap: 24px;
        }

        .admin-product-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        .card-image {
          width: 120px;
          flex-shrink: 0;
        }

        .image-wrapper {
          position: relative;
          width: 120px;
          height: 120px;
          background: #f4f4f4;
          border-radius: 4px;
          overflow: hidden;
        }

        .card-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .info-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .product-title {
          font-size: 16px;
          font-weight: 600;
          color: #202223;
          text-decoration: none;
        }
        
        .product-title:hover {
           text-decoration: underline;
        }

        .status-badge {
          font-size: 12px;
          padding: 2px 8px;
          border-radius: 12px;
          background: #e4e5e7;
          color: #4a4a4a;
        }
        
        .status-badge.active {
           background: #aee9d1;
           color: #004d40; // darker teal
        }

        .info-meta {
           font-size: 13px;
           color: #6d7175;
           display: flex;
           gap: 8px;
        }

        .info-price {
           font-size: 14px;
           font-weight: 600;
           color: #202223;
        }

        .info-actions {
           margin-top: auto;
           display: flex;
           gap: 12px;
        }
        
        .action-link {
           font-size: 13px;
           color: #005bd3;
           text-decoration: none;
           display: flex;
           align-items: center;
           gap: 4px;
        }
        
        .action-link:hover {
           text-decoration: underline;
        }

        .card-variants {
           width: 200px;
           flex-shrink: 0;
           display: flex;
           flex-direction: column;
           gap: 8px;
           border-left: 1px solid #f1f2f3;
           padding-left: 24px;
        }
        
        .variant-preview-title {
           font-size: 12px;
           color: #6d7175;
           font-weight: 500;
        }

        .color-swatches {
           display: flex;
           flex-wrap: wrap;
           gap: 6px;
        }

        .color-dot {
           width: 20px;
           height: 20px;
           border-radius: 50%;
           border: 1px solid #dbdbdb;
           cursor: pointer;
           transition: transform 0.1s, border-color 0.1s;
        }
        
        .color-dot:hover {
           transform: scale(1.1);
           border-color: #999;
        }
        
        .color-dot.active {
           border-color: #005bd3;
           box-shadow: 0 0 0 1px #005bd3;
        }

        .size-list {
           display: flex;
           flex-wrap: wrap;
           gap: 4px;
        }

        .size-badge {
           font-size: 11px;
           background: #f1f2f3;
           padding: 2px 6px;
           border-radius: 2px;
           color: #444;
        }
        
        .size-more {
           font-size: 11px;
           color: #6d7175;
           padding: 2px 4px;
        }
      `}</style>
    </div>
  );
}
