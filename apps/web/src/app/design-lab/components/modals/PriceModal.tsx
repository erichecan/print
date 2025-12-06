/**
 * Price Modal - 价格报价模态框
 * [2025-12-06 12:30:00] 显示设计报价信息
 */
'use client';

import React, { useState } from 'react';
import './PriceModal.css';

interface PriceBreakdown {
  basePrice: number;
  variantAdjustment: number;
  sidesCount: number;
  sidesFee: number;
  layerCount: number;
  layersFee: number;
  quantityDiscount: number; // 百分比
}

interface QuoteData {
  unitPrice: number;
  discountedUnitPrice: number;
  quantity: number;
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
  breakdown: PriceBreakdown;
}

interface PriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  quoteData: QuoteData | null;
  loading?: boolean;
  error?: string | null;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
}

const PriceModal: React.FC<PriceModalProps> = ({
  isOpen,
  onClose,
  quoteData,
  loading = false,
  error = null,
  quantity,
  onQuantityChange,
}) => {
  if (!isOpen) return null;

  return (
    <div className="dl-modal-overlay" onClick={onClose}>
      <div className="dl-modal dl-price-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dl-modal__header">
          <h2 className="dl-modal__title">Get Price</h2>
          <button
            className="dl-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="dl-modal__content">
          {loading && (
            <div className="dl-price-modal__loading">
              <p>Calculating price...</p>
            </div>
          )}

          {error && (
            <div className="dl-price-modal__error">
              <p>{error}</p>
              <button onClick={onClose}>Close</button>
            </div>
          )}

          {!loading && !error && quoteData && (
            <>
              {/* 数量选择 */}
              <div className="dl-price-modal__quantity">
                <label className="dl-price-modal__label">Quantity:</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => onQuantityChange(parseInt(e.target.value) || 1)}
                  className="dl-price-modal__quantity-input"
                />
              </div>

              {/* 价格明细 */}
              <div className="dl-price-modal__breakdown">
                <div className="dl-price-modal__breakdown-item">
                  <span>Base Price:</span>
                  <span>${quoteData.breakdown.basePrice.toFixed(2)}</span>
                </div>
                {quoteData.breakdown.variantAdjustment !== 0 && (
                  <div className="dl-price-modal__breakdown-item">
                    <span>Variant Adjustment:</span>
                    <span>${quoteData.breakdown.variantAdjustment.toFixed(2)}</span>
                  </div>
                )}
                {quoteData.breakdown.sidesCount > 0 && (
                  <div className="dl-price-modal__breakdown-item">
                    <span>Additional Sides ({quoteData.breakdown.sidesCount}):</span>
                    <span>${quoteData.breakdown.sidesFee.toFixed(2)}</span>
                  </div>
                )}
                {quoteData.breakdown.layerCount > 0 && (
                  <div className="dl-price-modal__breakdown-item">
                    <span>Additional Layers ({quoteData.breakdown.layerCount}):</span>
                    <span>${quoteData.breakdown.layersFee.toFixed(2)}</span>
                  </div>
                )}
                <div className="dl-price-modal__breakdown-item dl-price-modal__breakdown-item--subtotal">
                  <span>Unit Price:</span>
                  <span>${quoteData.unitPrice.toFixed(2)}</span>
                </div>
                {quoteData.breakdown.quantityDiscount > 0 && (
                  <>
                    <div className="dl-price-modal__breakdown-item">
                      <span>Quantity Discount ({quoteData.breakdown.quantityDiscount}%):</span>
                      <span>-${quoteData.discount.toFixed(2)}</span>
                    </div>
                    <div className="dl-price-modal__breakdown-item dl-price-modal__breakdown-item--subtotal">
                      <span>Discounted Unit Price:</span>
                      <span>${quoteData.discountedUnitPrice.toFixed(2)}</span>
                    </div>
                  </>
                )}
                <div className="dl-price-modal__breakdown-item dl-price-modal__breakdown-item--total">
                  <span>Total ({quantity} items):</span>
                  <span>${quoteData.total.toFixed(2)} {quoteData.currency}</span>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="dl-price-modal__actions">
                <button
                  className="dl-modal__btn dl-modal__btn--primary"
                  onClick={onClose}
                >
                  Continue Designing
                </button>
                <button
                  className="dl-modal__btn dl-modal__btn--secondary"
                  onClick={onClose}
                >
                  Add to Cart
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PriceModal;

