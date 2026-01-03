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
          {/* Header with Color Name */}
          <div className="dl-color-picker__header" style={{ marginBottom: '12px' }}>
            <span className="dl-color-picker__title" style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
              Product Color: <span style={{ fontWeight: 'normal' }}>{currentColorObj?.name || selectedColor || 'Select'}</span>
            </span>
          </div>

          {/* Color Grid - Matching ColorPicker.tsx structure */}
          <div className="dl-colors-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)', // Approximate 7 columns like ColorPicker
            gap: '8px'
          }}>
            {colors.map((color) => {
              const isSelected = selectedColor === color.name;

              return (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => handleColorClick(color)}
                  disabled={!color.isAvailable}
                  title={color.name}
                  style={{
                    width: '32px',
                    height: '32px',
                    padding: 0,
                    border: '1px solid rgba(0,0,0,0.1)',
                    borderRadius: '4px', // Rounded squares
                    backgroundColor: color.hex || '#ccc',
                    cursor: color.isAvailable ? 'pointer' : 'not-allowed',
                    position: 'relative',
                    boxShadow: isSelected ? '0 0 0 2px white, 0 0 0 4px #4a90e2' : 'none',
                    opacity: color.isAvailable ? 1 : 0.3,
                    transition: 'all 0.2s',
                    boxSizing: 'border-box'
                  }}
                  className={`dl-color-picker__swatch ${isSelected ? 'is-selected' : ''}`}
                >
                  {isSelected && (
                    <span style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      height: '100%',
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={['#ffffff', '#fff', '#f0f0f0'].includes(color.hex.toLowerCase()) ? '#333' : 'white'} strokeWidth="3">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </span>
                  )}
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
