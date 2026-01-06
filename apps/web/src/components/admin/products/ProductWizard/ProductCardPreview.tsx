'use client';

/**
 * Product Card Preview Component
 * 产品卡片预览组件 - 用于实时预览商品在列表页的展示效果
 * Created: 2025-01-06
 */
import React from 'react';
import Image from 'next/image';
import { ProductWizardData } from '@/lib/api';

interface ProductCardPreviewProps {
  wizardData: ProductWizardData;
}

export function ProductCardPreview({ wizardData }: ProductCardPreviewProps) {
  const mainImageUrl = wizardData.mainImage?.url || '/assets/hero/hero-card-tee.jpg';
  const productName = wizardData.name || '商品名称';
  const categoryName = wizardData.categoryId ? '分类' : ''; // TODO: Get category name from ID
  const basePrice = wizardData.basePrice || 0;
  const salePrice = wizardData.salePrice;

  return (
    <div className="product-card-preview">
      <div className="product-card-preview__header">
        <h3>商品卡片预览</h3>
        <p className="product-card-preview__hint">
          变体图片将在下一步设置
        </p>
      </div>

      <article className="product-card-preview__card product-card-new">
        <div className="product-card-new__image-link">
          <div className="product-card-new__image">
            {mainImageUrl && (
              <Image
                src={mainImageUrl}
                alt={productName}
                width={480}
                height={600}
                sizes="(max-width: 768px) 100vw, 320px"
                style={{ transition: 'opacity 0.3s ease-in-out' }}
                unoptimized
              />
            )}
          </div>
        </div>

        <div className="product-card-new__colors">
          {/* Color swatches will be shown here after Step 2 */}
          <div className="product-card-preview__placeholder">
            颜色将在变体设置中添加
          </div>
        </div>

        <h3 className="product-card-new__title">{productName}</h3>

        {categoryName && (
          <div className="product-card-preview__category">{categoryName}</div>
        )}

        <div className="product-card-new__price">
          {salePrice && salePrice < basePrice ? (
            <>
              <span className="product-card-new__price--sale">${salePrice.toFixed(2)}</span>
              <span className="product-card-new__price--original">${basePrice.toFixed(2)}</span>
            </>
          ) : (
            <span className="product-card-new__price--current">${basePrice.toFixed(2)}</span>
          )}
        </div>
      </article>

      {wizardData.mainImage?.url && (
        <div className="product-card-preview__info">
          <p className="product-card-preview__info-text">
            💡 这将作为默认变体的主图
          </p>
        </div>
      )}

      <style jsx>{`
        .product-card-preview {
          background: #fff;
          border-radius: 8px;
          padding: 24px;
          border: 1px solid #e1e3e5;
        }

        .product-card-preview__header {
          margin-bottom: 24px;
        }

        .product-card-preview__header h3 {
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 8px 0;
          color: #202223;
        }

        .product-card-preview__hint {
          font-size: 14px;
          color: #6d7175;
          margin: 0;
        }

        .product-card-preview__card {
          max-width: 320px;
          margin: 0 auto;
        }

        .product-card-new {
          display: flex;
          flex-direction: column;
        }

        .product-card-new__image-link {
          position: relative;
          width: 100%;
          padding-top: 125%; /* 4:5 aspect ratio */
          overflow: hidden;
          border-radius: 4px;
          margin-bottom: 12px;
        }

        .product-card-new__image {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .product-card-new__image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .product-card-new__colors {
          display: flex;
          gap: 6px;
          margin-bottom: 12px;
          min-height: 24px;
        }

        .product-card-preview__placeholder {
          font-size: 12px;
          color: #8c9196;
          font-style: italic;
        }

        .product-card-new__title {
          font-size: 16px;
          font-weight: 500;
          margin: 0 0 8px 0;
          color: #202223;
          line-height: 1.4;
        }

        .product-card-preview__category {
          font-size: 14px;
          color: #6d7175;
          margin-bottom: 12px;
        }

        .product-card-new__price {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 18px;
          font-weight: 600;
        }

        .product-card-new__price--current {
          color: #202223;
        }

        .product-card-new__price--sale {
          color: #e74c3c;
        }

        .product-card-new__price--original {
          color: #8c9196;
          text-decoration: line-through;
          font-size: 14px;
          font-weight: 400;
        }

        .product-card-preview__info {
          margin-top: 16px;
          padding: 12px;
          background: #f0f7ff;
          border-radius: 4px;
          border: 1px solid #b3d9ff;
        }

        .product-card-preview__info-text {
          font-size: 14px;
          color: #0066cc;
          margin: 0;
        }
      `}</style>
    </div>
  );
}

