/**
 * Product Colors Modal - 产品颜色选择模态
 * [2025-01-30 18:30:00] 实现产品颜色选择模态，对齐 Custom Ink
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
    }
  };

  return (
    <div className="dl-modal-overlay" onClick={onClose}>
      <div className="dl-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dl-modal__header">
          <h3 className="dl-modal__title">Product Colors</h3>
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
            <p className="dl-modal__product-name">{productName}</p>
          )}

          {/* Ordering fewer than 6? 开关 */}
          <div className="dl-modal__section">
            <label className="dl-modal__checkbox-label">
              <input
                type="checkbox"
                checked={orderingFewerThan6}
                onChange={(e) => setOrderingFewerThan6(e.target.checked)}
                className="dl-modal__checkbox"
              />
              <span>Ordering fewer than 6?</span>
            </label>
            {orderingFewerThan6 && (
              <p className="dl-modal__hint">
                Some colors may have limited availability for orders under 6 items.
              </p>
            )}
          </div>

          {/* Colors 色板矩阵 */}
          <div className="dl-modal__section">
            <h4 className="dl-modal__section-title">Colors</h4>
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
                          width="20"
                          height="20"
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
                      <div className="dl-color-item__name">{color.name}</div>
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

