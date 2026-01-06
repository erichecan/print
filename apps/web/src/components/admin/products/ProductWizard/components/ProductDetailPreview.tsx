'use client';

/**
 * Product Detail Preview Component
 * 商品详情页预览组件 - 用于Step 4预览
 * Created: 2025-01-06
 */
import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { ProductWizardData } from '@/lib/api';

interface ProductDetailPreviewProps {
  wizardData: ProductWizardData;
}

export function ProductDetailPreview({ wizardData }: ProductDetailPreviewProps) {
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const mainImage = wizardData.mainImage?.url || '/assets/hero/hero-card-tee.jpg';
  const colors = wizardData.colors || [];
  const sizes = wizardData.sizes || [];
  const enabledColors = colors.filter((c) => c.enabled);
  const enabledSizes = sizes.filter((s) => s.enabled).sort((a, b) => a.sortOrder - b.sortOrder);

  // Get images for selected color or main image
  const selectedColor = enabledColors[selectedColorIndex];
  const displayImages = useMemo(() => {
    return selectedColor?.images && selectedColor.images.length > 0
      ? selectedColor.images.map((img) => img.url)
      : (mainImage ? [mainImage] : ['/assets/hero/hero-card-tee.jpg']);
  }, [selectedColor, mainImage]);

  // Reset selected image index when color changes or if out of bounds
  useEffect(() => {
    setSelectedImageIndex(0);
  }, [selectedColorIndex]);

  useEffect(() => {
    if (selectedImageIndex >= displayImages.length) {
      setSelectedImageIndex(0);
    }
  }, [displayImages.length, selectedImageIndex]);

  const currentImage = displayImages[selectedImageIndex] || displayImages[0] || '/assets/hero/hero-card-tee.jpg';
  const basePrice = wizardData.basePrice || 0;
  const salePrice = wizardData.salePrice;

  return (
    <div className="product-detail-preview">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <span className="breadcrumb-item">首页</span>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-item">
          {wizardData.categoryId ? '分类' : '商品'}
        </span>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-item">{wizardData.name || '商品名称'}</span>
      </div>

      {/* Main Layout */}
      <div className="detail-main-layout">
        {/* Left: Gallery */}
        <div className="detail-gallery">
          <div className="gallery-main">
            <div className="gallery-main-image" key={currentImage}>
              {currentImage && (
                <Image
                  src={currentImage}
                  alt={wizardData.name || 'Product'}
                  fill
                  style={{ objectFit: 'contain' }}
                  unoptimized
                />
              )}
            </div>
          </div>
          {displayImages.length > 1 && (
            <div className="gallery-thumbnails">
              {displayImages.map((img, index) => (
                <button
                  key={index}
                  type="button"
                  className={`thumbnail ${selectedImageIndex === index ? 'thumbnail--active' : ''}`}
                  onClick={() => setSelectedImageIndex(index)}
                >
                  <Image
                    src={img}
                    alt={`Thumbnail ${index + 1}`}
                    fill
                    style={{ objectFit: 'cover' }}
                    unoptimized
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Buy Box */}
        <div className="detail-buybox">
          <h1 className="product-title">{wizardData.name || '商品名称'}</h1>

          {/* Price */}
          <div className="product-price">
            {salePrice && salePrice < basePrice ? (
              <>
                <span className="price-sale">${salePrice.toFixed(2)}</span>
                <span className="price-original">${basePrice.toFixed(2)}</span>
              </>
            ) : (
              <span className="price-current">${basePrice.toFixed(2)}</span>
            )}
          </div>

          {/* Color Selection */}
          {enabledColors.length > 0 && (
            <div className="option-group">
              <label className="option-label">颜色</label>
              <div className="color-selector">
                {enabledColors.map((color, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`color-option ${selectedColorIndex === index ? 'color-option--selected' : ''}`}
                    onClick={() => {
                      setSelectedColorIndex(index);
                      setSelectedImageIndex(0);
                    }}
                    title={color.displayName}
                  >
                    <div
                      className="color-swatch"
                      style={{ backgroundColor: color.colorHex || '#CCCCCC' }}
                    />
                    <span className="color-name">{color.displayName}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size Selection */}
          {enabledSizes.length > 0 && (
            <div className="option-group">
              <label className="option-label">尺寸</label>
              <div className="size-selector">
                {enabledSizes.map((size, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`size-option ${selectedSize === size.size ? 'size-option--selected' : ''}`}
                    onClick={() => setSelectedSize(size.size)}
                  >
                    {size.displayName}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Add to Cart Button */}
          <div className="action-buttons">
            <button type="button" className="btn-add-to-cart">
              添加到购物车
            </button>
            <button type="button" className="btn-buy-now">
              立即购买
            </button>
          </div>

          {/* Description */}
          {wizardData.description && (
            <div className="product-description">
              <h3 className="section-title">商品描述</h3>
              <p>{wizardData.description}</p>
            </div>
          )}

          {/* Long Description */}
          {wizardData.longDescription && (
            <div className="product-long-description">
              <h3 className="section-title">详细信息</h3>
              <p>{wizardData.longDescription}</p>
            </div>
          )}

          {/* Features */}
          <div className="product-features">
            <h3 className="section-title">产品特性</h3>
            <ul className="features-list">
              <li>✅ 高质量面料</li>
              <li>✅ 多种颜色可选</li>
              <li>✅ 支持定制设计</li>
              <li>✅ 免费配送</li>
            </ul>
          </div>
        </div>
      </div>

      <style jsx>{`
        .product-detail-preview {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          background: #fff;
          min-height: 600px;
        }

        .breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 24px;
          font-size: 14px;
          color: #6d7175;
        }

        .breadcrumb-separator {
          color: #c9cccf;
        }

        .breadcrumb-item {
          color: #005bd3;
          cursor: pointer;
        }

        .breadcrumb-item:last-child {
          color: #202223;
          cursor: default;
        }

        .detail-main-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 48px;
        }

        @media (max-width: 768px) {
          .detail-main-layout {
            grid-template-columns: 1fr;
            gap: 24px;
          }
        }

        /* Gallery Styles */
        .detail-gallery {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .gallery-main {
          width: 100%;
          aspect-ratio: 4 / 5;
          border: 1px solid #e1e3e5;
          border-radius: 8px;
          overflow: hidden;
          background: #fafbfb;
        }

        .gallery-main-image {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .gallery-thumbnails {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding: 4px 0;
        }

        .thumbnail {
          flex-shrink: 0;
          width: 80px;
          height: 80px;
          border: 2px solid transparent;
          border-radius: 4px;
          overflow: hidden;
          cursor: pointer;
          background: #fafbfb;
          position: relative;
          transition: border-color 0.2s;
        }

        .thumbnail:hover {
          border-color: #c9cccf;
        }

        .thumbnail--active {
          border-color: #005bd3;
        }

        /* Buy Box Styles */
        .detail-buybox {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .product-title {
          font-size: 28px;
          font-weight: 600;
          margin: 0;
          color: #202223;
          line-height: 1.3;
        }

        .product-price {
          display: flex;
          align-items: baseline;
          gap: 12px;
          font-size: 24px;
          font-weight: 600;
        }

        .price-current,
        .price-sale {
          color: #202223;
        }

        .price-original {
          color: #8c9196;
          text-decoration: line-through;
          font-size: 18px;
          font-weight: 400;
        }

        .option-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .option-label {
          font-size: 14px;
          font-weight: 500;
          color: #202223;
        }

        .color-selector {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .color-option {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border: 2px solid #e1e3e5;
          border-radius: 8px;
          background: #fff;
          cursor: pointer;
          transition: all 0.2s;
          min-width: 80px;
        }

        .color-option:hover {
          border-color: #c9cccf;
        }

        .color-option--selected {
          border-color: #005bd3;
          background: #f0f7ff;
        }

        .color-swatch {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 2px solid #e1e3e5;
        }

        .color-name {
          font-size: 12px;
          color: #202223;
          text-align: center;
        }

        .size-selector {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .size-option {
          padding: 10px 20px;
          border: 2px solid #e1e3e5;
          border-radius: 4px;
          background: #fff;
          font-size: 14px;
          font-weight: 500;
          color: #202223;
          cursor: pointer;
          transition: all 0.2s;
          min-width: 60px;
        }

        .size-option:hover {
          border-color: #c9cccf;
        }

        .size-option--selected {
          border-color: #005bd3;
          background: #005bd3;
          color: #fff;
        }

        .action-buttons {
          display: flex;
          gap: 12px;
          padding-top: 8px;
        }

        .btn-add-to-cart,
        .btn-buy-now {
          flex: 1;
          padding: 14px 24px;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn-add-to-cart {
          background: #fff;
          color: #005bd3;
          border: 2px solid #005bd3;
        }

        .btn-add-to-cart:hover {
          background: #f0f7ff;
        }

        .btn-buy-now {
          background: #008060;
          color: #fff;
        }

        .btn-buy-now:hover {
          background: #006e52;
        }

        .product-description,
        .product-long-description,
        .product-features {
          padding-top: 24px;
          border-top: 1px solid #e1e3e5;
        }

        .section-title {
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 12px 0;
          color: #202223;
        }

        .product-description p,
        .product-long-description p {
          font-size: 14px;
          line-height: 1.6;
          color: #202223;
          margin: 0;
        }

        .features-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .features-list li {
          font-size: 14px;
          color: #202223;
        }
      `}</style>
    </div>
  );
}

