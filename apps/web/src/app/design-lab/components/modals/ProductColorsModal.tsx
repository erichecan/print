/**
 * Product Colors Modal - 产品颜色选择模态
 * [2025-01-30 18:30:00] 实现产品颜色选择模态，对齐 Custom Ink
 * [2025-01-31 12:00:00] 根据 designlab-colors01.jpeg 更新模态标题和结构，完全匹配 Custom Ink
 */
'use client';

import React, { useState } from 'react';

interface ProductColor {
  name: string;
  hex: string;
  availableSizes: string[];
  isAvailable: boolean;
}

interface ProductColorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  colors: ProductColor[];
  selectedColor: string | null;
  onSelectColor: (color: string) => void;
  productName?: string;
}

const ProductColorsModal: React.FC<ProductColorsModalProps> = ({
  isOpen,
  onClose,
  colors,
  selectedColor,
  onSelectColor,
  productName
}) => {
  const [orderingFewerThan6, setOrderingFewerThan6] = useState(false);

  if (!isOpen) return null;

  // [2025-01-30 21:50:00] 修复：点击颜色后不关闭模态，只更新产品图片，直到用户点击 Done 或 Cancel
  const handleColorClick = (color: ProductColor) => {
    if (color.isAvailable) {
      onSelectColor(color.name);
      // 不关闭模态，让用户可以继续选择其他颜色

      // [2025-12-08] 埋点：产品颜色切换
      if (typeof window !== 'undefined') {
        const { analytics } = require('@/lib/analytics');
        analytics.track('product_color_changed', {
          colorName: color.name,
          productName: productName,
        });
      }
    }
  };

  return (
    <div className="dl-modal-overlay" onClick={onClose}>
      <div className="dl-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dl-modal__header">
          {/* [2025-01-31 12:00:00] 根据 designlab-colors01.jpeg 更新标题为 "Choose Your Product Color" */}
          <h3 className="dl-modal__title">Choose Your Product Color</h3>
          <button
            className="dl-modal__close"
            onClick={onClose}
            aria-label="Close"
            type="button"
          >
            ×
          </button>
        </div>

        <div className="dl-modal__body">
          {productName && (
            <p className="dl-modal__product-name">
              {typeof productName === 'object' ? (productName as any).name : productName}
            </p>
          )}

          {/* Colors 色板矩阵 */}
          {/* [2025-01-31 12:00:00] 根据 designlab-colors01.jpeg，Ordering fewer than 6? 复选框应在 Colors 标题右侧 */}
          <div className="dl-modal__section">
            <div className="dl-modal__section-header">
              <h4 className="dl-modal__section-title">Colors:</h4>
              <label className="dl-modal__checkbox-label">
                <input
                  type="checkbox"
                  checked={orderingFewerThan6}
                  onChange={(e) => setOrderingFewerThan6(e.target.checked)}
                  className="dl-modal__checkbox"
                />
                <span>Ordering fewer than 6?</span>
              </label>
            </div>
            {orderingFewerThan6 && (
              <p className="dl-modal__hint">
                Some colors may have limited availability for orders under 6 items.
              </p>
            )}
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
                    {/* [2025-01-31 12:00:00] 根据 designlab-colors01.jpeg，checkmark 应在右上角 */}
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

            {/* [2025-01-31 12:00:00] 根据 designlab-colors01.jpeg，添加 Sizes Available in 显示 */}
            {selectedColor && (() => {
              const selectedColorObj = colors.find(c => c.name === selectedColor);
              if (selectedColorObj && selectedColorObj.availableSizes.length > 0) {
                return (
                  <div className="dl-modal__sizes-available">
                    <p className="dl-modal__sizes-available-title">
                      Sizes Available in: {typeof selectedColor === 'object' ? (selectedColor as any).name : selectedColor}
                    </p>
                    <div className="dl-modal__sizes-list">
                      {selectedColorObj.availableSizes.join(' ')}
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* [2025-01-31 12:00:00] 根据 designlab-colors01.jpeg，添加 "Add this product in another color" 部分 */}
            <div className="dl-modal__pick-another">
              <div className="dl-modal__pick-another-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
              <div className="dl-modal__pick-another-content">
                <p className="dl-modal__pick-another-text">Add this product in another color</p>
                <button
                  className="dl-modal__pick-another-link"
                  onClick={() => {
                    // 保持模态打开，用户可以继续选择颜色
                  }}
                >
                  Pick another color
                </button>
              </div>
            </div>
          </div>

          {/* Pick another color 提示 */}
          {colors.length === 0 && (
            <div className="dl-modal__section">
              <p className="dl-modal__empty">No colors available for this product.</p>
            </div>
          )}
        </div>

        <div className="dl-modal__footer">
          <button
            className="dl-modal__btn dl-modal__btn--secondary"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          {/* [2025-01-30 21:50:00] 添加 Done 按钮，确认颜色选择 */}
          <button
            className="dl-modal__btn dl-modal__btn--primary"
            onClick={onClose}
            type="button"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductColorsModal;

