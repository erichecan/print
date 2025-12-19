/**
 * Product Colors Panel - 产品颜色选择面板
 * [2025-01-30 22:30:00] 实现产品颜色选择面板，类似 Custom Ink 的颜色选择界面
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { productColorImageApi } from '@/lib/api';

interface ProductColor {
  name: string;
  hex: string | null;
  isAvailable: boolean;
  colorId: string;
}

interface ProductColorsPanelProps {
  selectedColor: string | null;
  onSelectColor: (colorName: string) => void;
  productName?: string;
}

const ProductColorsPanel: React.FC<ProductColorsPanelProps> = ({
  selectedColor,
  onSelectColor,
  productName = 'Gildan Softstyle Jersey T-shirt'
}) => {
  const [colors, setColors] = useState<ProductColor[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderingFewerThan6, setOrderingFewerThan6] = useState(false);

  // [2025-01-30 22:30:00] 从 API 加载颜色列表
  useEffect(() => {
    const loadColors = async () => {
      try {
        setLoading(true);
        // 使用默认产品 ID
        const GILDAN_SOFTSTYLE_PRODUCT_ID = 'e2869fba030e981dc4fa89b7b3d800fd';
        const response = await productColorImageApi.getProductColorImages(GILDAN_SOFTSTYLE_PRODUCT_ID);
        
        if (response.data && Array.isArray(response.data)) {
          const colorList: ProductColor[] = response.data.map((item: any) => ({
            name: item.colorName || `Color-${item.customInkColorId}`,
            hex: item.colorHex || null,
            isAvailable: item.isActive !== false,
            colorId: item.customInkColorId
          }));
          setColors(colorList);
        }
      } catch (error) {
        console.error('[ProductColorsPanel] Failed to load colors:', error);
        // 如果 API 失败，使用默认颜色列表
        setColors([
          { name: 'White', hex: '#FFFFFF', isAvailable: true, colorId: '176100' },
          { name: 'Navy', hex: '#001F3F', isAvailable: true, colorId: '176101' },
          { name: 'Maroon', hex: '#800000', isAvailable: true, colorId: '176102' },
          { name: 'Black', hex: '#000000', isAvailable: true, colorId: '176103' },
          { name: 'Heather Grey', hex: '#B0B0B0', isAvailable: true, colorId: '176104' },
          { name: 'Heather Dark Grey', hex: '#606060', isAvailable: true, colorId: '176105' },
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadColors();
  }, []);

  const handleColorClick = useCallback((color: ProductColor) => {
    if (color.isAvailable) {
      onSelectColor(color.name);
      
      // [2025-01-30 22:30:00] 埋点：产品颜色切换
      if (typeof window !== 'undefined') {
        try {
          const { analytics } = require('@/lib/analytics');
          analytics.track('product_color_changed', {
            colorName: color.name,
            productName: productName,
          });
        } catch (error) {
          // 忽略 analytics 错误
        }
      }
    }
  }, [onSelectColor, productName]);

  if (loading) {
    return (
      <div className="dl-product-colors-panel">
        <div className="dl-product-colors-panel__loading">
          <p>Loading colors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dl-product-colors-panel">
      <div className="dl-product-colors-panel__header">
        <h3 className="dl-product-colors-panel__title">Product and Decoration Details</h3>
      </div>

      <div className="dl-product-colors-panel__body">
        {/* Decoration Method */}
        <div className="dl-product-colors-panel__section">
          <div className="dl-product-colors-panel__section-header">
            <span className="dl-product-colors-panel__section-label">Decoration Method:</span>
            <div className="dl-product-colors-panel__decoration-method">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c.55 0 1-.45 1-1v-4c0-.55-.45-1-1-1-1.25 0-2.45-.2-3.57-.57-.4-.11-.81-.03-1.1.24l-2.2 2.2c-2.83-1.45-4.6-4.33-4.6-7.59 0-4.42 3.58-8 8-8s8 3.58 8 8v1c0 .55.45 1 1 1h3c.55 0 1 .45 1 1 0 5.52-4.48 10-10 10z" />
              </svg>
              <span>Printed</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
          </div>
        </div>

        {/* Colors Section */}
        <div className="dl-product-colors-panel__section">
          <div className="dl-product-colors-panel__section-header">
            <h4 className="dl-product-colors-panel__section-title">Colors:</h4>
            <label className="dl-product-colors-panel__checkbox-label">
              <input
                type="checkbox"
                checked={orderingFewerThan6}
                onChange={(e) => setOrderingFewerThan6(e.target.checked)}
                className="dl-product-colors-panel__checkbox"
              />
              <span>Ordering fewer than 6?</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </label>
          </div>

          {orderingFewerThan6 && (
            <p className="dl-product-colors-panel__hint">
              Some colors may have limited availability for orders under 6 items.
            </p>
          )}

          {/* Color Swatches Grid */}
          <div className="dl-product-colors-panel__colors-grid">
            {colors.map((color) => {
              const isSelected = selectedColor === color.name;
              const displayColor = color.hex || '#CCCCCC';

              return (
                <button
                  key={color.colorId}
                  className={`dl-product-colors-panel__color-swatch ${
                    isSelected ? 'is-selected' : ''
                  } ${!color.isAvailable ? 'is-unavailable' : ''}`}
                  onClick={() => handleColorClick(color)}
                  disabled={!color.isAvailable}
                  aria-label={`Select ${color.name} color`}
                  title={color.name}
                >
                  <div
                    className="dl-product-colors-panel__color-swatch-inner"
                    style={{ backgroundColor: displayColor }}
                  >
                    {isSelected && (
                      <svg
                        className="dl-product-colors-panel__checkmark"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="3"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Add Product in Another Color */}
        <div className="dl-product-colors-panel__add-color">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z" />
            <line x1="12" y1="2" x2="12" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="12" y1="10" x2="12" y2="14" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          <div>
            <p className="dl-product-colors-panel__add-color-text">Add this product in another color</p>
            <button className="dl-product-colors-panel__add-color-link">Pick another color</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductColorsPanel;

