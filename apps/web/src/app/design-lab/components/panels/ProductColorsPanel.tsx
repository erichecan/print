/**
 * Product Colors Panel - 产品颜色选择面板
* Adapted from ProductColorsModal to display in the left ToolPanel area.
 */
'use client';

import React from 'react';
import { ProductColor } from '@/lib/product-data';

interface ProductColorsPanelProps {
  colors: ProductColor[];
  selectedColor: string | null;
  onSelectColor: (color: string) => void;
  onClose: () => void;
  productName?: string;
}

const ProductColorsPanel: React.FC<ProductColorsPanelProps> = ({
  colors,
  selectedColor,
  onSelectColor,
  onClose,
  productName
}) => {

  const handleColorClick = (color: ProductColor) => {
    if (color.isAvailable) {
      onSelectColor(color.name);

      // Analytics tracking
      if (typeof window !== 'undefined') {
        try {
          const { analytics } = require('@/lib/analytics');
          analytics.track('product_color_changed', {
            colorName: color.name,
            productName: productName,
          });
        } catch (e) {
          // ignore
        }
      }
    }
  };

  return (
    <div className="dl-product-colors-panel">
      <div className="dl-tool-panel__header">
        <h2 className="dl-tool-panel__title">Product Colors</h2>
        <button
          className="dl-tool-panel__back-btn"
          onClick={onClose}
          aria-label="Back to home"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>

      <div className="dl-product-colors-panel__content">
        {productName && (
          <p className="dl-product-colors-panel__product-name">
            {typeof productName === 'object' ? (productName as any).name : productName}
          </p>
        )}

        <div className="dl-product-colors-panel__section">
          <div className="dl-product-colors-panel__section-header">
            <h4 className="dl-product-colors-panel__section-title">Colors:</h4>
          </div>

          <div className="dl-colors-grid">
            {colors.map((color) => {
              const isSelected = selectedColor === color.name;
              const hasAvailableSizes = color.availableSizes.length > 0;

              return (
                <button
                  key={color.name}
                  type="button"
                  className={`dl-color-item ${isSelected ? 'is-selected' : ''} ${!color.isAvailable ? 'is-unavailable' : ''}`}
                  onClick={() => handleColorClick(color)}
                  disabled={!color.isAvailable}
                  title={color.name}
                >
                  <div
                    className="dl-color-item__swatch"
                    style={{ backgroundColor: color.hex || '#cccccc' }}
                  >
                    {isSelected && (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="3"
                        className="dl-color-item__check"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </div>
                  <div className="dl-color-item__info">
                    <div className="dl-color-item__name">
                      {typeof color.name === 'object' ? (color.name as any).name : color.name}
                    </div>
                    {hasAvailableSizes && (
                      <div className="dl-color-item__sizes">
                        Sizes: {color.availableSizes.join(', ')}
                      </div>
                    )}
                    {!color.isAvailable && (
                      <div className="dl-color-item__unavailable">Unavailable</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductColorsPanel;
