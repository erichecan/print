/**
 * Product Colors Panel - refactored to "Product Details"
 * Displays product decoration info and color selection
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
    }
  };

  // Find currently selected color object
  const currentColorObj = colors.find(c => c.name === selectedColor);

  return (
    <div className="dl-product-colors-panel">
      {/* Header with Title and Close Button */}
      <div className="dl-tool-panel__header" style={{ justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
        <h2 className="dl-tool-panel__title" style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>
          Product and Decoration Details
        </h2>
        <button
          className="dl-tool-panel__close-btn"
          onClick={onClose}
          aria-label="Close"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="dl-product-colors-panel__content" style={{ padding: '0 16px 16px' }}>

        {/* Colors Section - Styled like Add Text Color Picker */}
        <div className="dl-colors-section">
          {/* Selected Color Header - Matches uploaded_image_0 */}
          <div className="dl-color-picker__header" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Selected Swatch Preview */}
            <div
              style={{
                width: '32px',
                height: '32px',
                backgroundColor: currentColorObj?.hex || '#ccc',
                borderRadius: '6px', // Slightly rounded
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}
            />
            <span className="dl-color-picker__title" style={{ fontSize: '16px', fontWeight: '500', color: '#111' }}>
              {currentColorObj?.name || selectedColor || 'Select Color'}
            </span>
          </div>

          {/* Color Grid - Matching Add Text style via updated CSS */}
          <div className="dl-product-colors-panel__colors-grid" style={{ gap: '5px' }}>
            {colors.map((color) => {
              const isSelected = selectedColor === color.name;

              return (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => handleColorClick(color)}
                  disabled={!color.isAvailable}
                  title={color.name}
                  className={`dl-product-colors-panel__color-swatch ${isSelected ? 'is-selected' : ''}`}
                  style={{
                    backgroundColor: color.hex || '#ccc',
                    opacity: color.isAvailable ? 1 : 0.3
                  }}
                />
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProductColorsPanel;
