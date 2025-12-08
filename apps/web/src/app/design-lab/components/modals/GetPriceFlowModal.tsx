/**
 * Get Price Flow Modal
 * [2025-12-08] 完整的Get Price流程：Buy & Ship / Fundraiser选择 → Ordering Options → Quantity → Order Options
 */
'use client';

import React, { useState } from 'react';
import './GetPriceFlowModal.css';

export type GetPriceFlowStep = 'start' | 'ordering-options' | 'quantity' | 'order-options';

export type OrderType = 'buy-ship' | 'fundraiser';
export type ShippingOption = 'single-address' | 'multiple-addresses';
export type SizesQuantitiesOption = 'i-know-sizes' | 'invite-group';
export type PaymentOption = 'i-pay' | 'group-pays';

interface GetPriceFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  designId: string | null;
  onAddToCart?: (orderData: any) => void;
}

interface OrderingOptions {
  orderType: OrderType;
  shipping: ShippingOption;
  sizesQuantities: SizesQuantitiesOption;
  payment: PaymentOption;
}

interface SizeQuantity {
  size: string;
  quantity: number;
}

const GetPriceFlowModal: React.FC<GetPriceFlowModalProps> = ({
  isOpen,
  onClose,
  designId,
  onAddToCart,
}) => {
  const [currentStep, setCurrentStep] = useState<GetPriceFlowStep>('start');
  const [orderType, setOrderType] = useState<OrderType>('buy-ship');
  const [orderingOptions, setOrderingOptions] = useState<OrderingOptions>({
    orderType: 'buy-ship',
    shipping: 'single-address',
    sizesQuantities: 'i-know-sizes',
    payment: 'i-pay',
  });
  const [sizeQuantities, setSizeQuantities] = useState<SizeQuantity[]>([]);
  const [estimatedQuantity, setEstimatedQuantity] = useState<number>(1);

  // [2025-12-08] 初始化尺码列表
  const youthSizes = React.useMemo(() => ['YS', 'YM', 'YL'], []);
  const adultSizes = React.useMemo(() => ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'], []);
  const allSizes = React.useMemo(() => [...youthSizes, ...adultSizes], [youthSizes, adultSizes]);

  // [2025-12-08] 初始化尺码数量
  React.useEffect(() => {
    if (currentStep === 'quantity' && sizeQuantities.length === 0 && orderingOptions.sizesQuantities === 'i-know-sizes') {
      setSizeQuantities(
        allSizes.map(size => ({ size, quantity: 0 }))
      );
    }
  }, [currentStep, orderingOptions.sizesQuantities, allSizes, sizeQuantities.length]);

  // [2025-12-08] 计算总数量
  const totalQuantity = React.useMemo(() => {
    if (orderingOptions.sizesQuantities === 'i-know-sizes') {
      return sizeQuantities.reduce((sum, sq) => sum + sq.quantity, 0);
    } else {
      return estimatedQuantity;
    }
  }, [sizeQuantities, estimatedQuantity, orderingOptions.sizesQuantities]);

  // [2025-12-08] 重置状态当模态框关闭
  React.useEffect(() => {
    if (!isOpen) {
      setCurrentStep('start');
      setOrderType('buy-ship');
      setOrderingOptions({
        orderType: 'buy-ship',
        shipping: 'single-address',
        sizesQuantities: 'i-know-sizes',
        payment: 'i-pay',
      });
      setSizeQuantities([]);
      setEstimatedQuantity(1);
    }
  }, [isOpen]);

  // [2025-12-08] 重置状态当模态框关闭
  React.useEffect(() => {
    if (!isOpen) {
      setCurrentStep('start');
      setOrderType('buy-ship');
      setOrderingOptions({
        orderType: 'buy-ship',
        shipping: 'single-address',
        sizesQuantities: 'i-know-sizes',
        payment: 'i-pay',
      });
      setSizeQuantities([]);
      setEstimatedQuantity(1);
    }
  }, [isOpen]);

  // [2025-12-08] 步骤1：起始页 - Buy & Ship / Fundraiser选择
  const renderStartStep = () => (
    <div className="dl-get-price-flow__step">
      <h2 className="dl-get-price-flow__step-title">Choose Your Path</h2>
      <p className="dl-get-price-flow__step-description">
        Select how you want to proceed with your order
      </p>

      <div className="dl-get-price-flow__path-cards">
        <button
          className={`dl-get-price-flow__path-card ${orderType === 'buy-ship' ? 'is-selected' : ''}`}
          onClick={() => setOrderType('buy-ship')}
        >
          <div className="dl-get-price-flow__path-card-icon">📦</div>
          <h3 className="dl-get-price-flow__path-card-title">Buy & Ship</h3>
          <p className="dl-get-price-flow__path-card-description">
            Order your custom design and have it shipped to you
          </p>
        </button>

        <button
          className={`dl-get-price-flow__path-card ${orderType === 'fundraiser' ? 'is-selected' : ''}`}
          onClick={() => setOrderType('fundraiser')}
        >
          <div className="dl-get-price-flow__path-card-icon">🎗️</div>
          <h3 className="dl-get-price-flow__path-card-title">Start a Fundraiser</h3>
          <p className="dl-get-price-flow__path-card-description">
            Create a fundraiser and invite others to contribute
          </p>
        </button>
      </div>

      <div className="dl-get-price-flow__actions">
        <button
          className="dl-modal__btn dl-modal__btn--secondary"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          className="dl-modal__btn dl-modal__btn--primary"
          onClick={() => {
            setOrderingOptions(prev => ({ ...prev, orderType }));
            setCurrentStep('ordering-options');
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );

  // [2025-12-08] 步骤2：Ordering Options
  const renderOrderingOptionsStep = () => (
    <div className="dl-get-price-flow__step">
      <h2 className="dl-get-price-flow__step-title">Ordering Options</h2>
      <p className="dl-get-price-flow__step-description">
        Configure your order preferences
      </p>

      {/* 组1：Shipping */}
      <div className="dl-get-price-flow__option-group">
        <h3 className="dl-get-price-flow__option-group-title">Shipping</h3>
        <div className="dl-get-price-flow__radio-group">
          <label className="dl-get-price-flow__radio-label">
            <input
              type="radio"
              name="shipping"
              value="single-address"
              checked={orderingOptions.shipping === 'single-address'}
              onChange={(e) => setOrderingOptions(prev => ({
                ...prev,
                shipping: e.target.value as ShippingOption,
              }))}
            />
            <span>Ship to single address</span>
          </label>
          <label className="dl-get-price-flow__radio-label">
            <input
              type="radio"
              name="shipping"
              value="multiple-addresses"
              checked={orderingOptions.shipping === 'multiple-addresses'}
              onChange={(e) => setOrderingOptions(prev => ({
                ...prev,
                shipping: e.target.value as ShippingOption,
              }))}
            />
            <span>Ship to multiple addresses</span>
            {orderingOptions.shipping === 'multiple-addresses' && (
              <span className="dl-get-price-flow__hint">
                (Minimum 6 items required)
              </span>
            )}
          </label>
        </div>
      </div>

      {/* 组2：Sizes and Quantities */}
      <div className="dl-get-price-flow__option-group">
        <h3 className="dl-get-price-flow__option-group-title">Sizes and Quantities</h3>
        <div className="dl-get-price-flow__radio-group">
          <label className="dl-get-price-flow__radio-label">
            <input
              type="radio"
              name="sizes-quantities"
              value="i-know-sizes"
              checked={orderingOptions.sizesQuantities === 'i-know-sizes'}
              onChange={(e) => setOrderingOptions(prev => ({
                ...prev,
                sizesQuantities: e.target.value as SizesQuantitiesOption,
              }))}
              disabled={orderingOptions.sizesQuantities === 'invite-group'}
            />
            <span>I know the sizes I need</span>
          </label>
          <label className="dl-get-price-flow__radio-label">
            <input
              type="radio"
              name="sizes-quantities"
              value="invite-group"
              checked={orderingOptions.sizesQuantities === 'invite-group'}
              onChange={(e) => setOrderingOptions(prev => ({
                ...prev,
                sizesQuantities: e.target.value as SizesQuantitiesOption,
              }))}
            />
            <span>Invite my group to choose their sizes</span>
          </label>
        </div>
      </div>

      {/* 组3：Payment */}
      <div className="dl-get-price-flow__option-group">
        <h3 className="dl-get-price-flow__option-group-title">Payment</h3>
        <div className="dl-get-price-flow__radio-group">
          <label className="dl-get-price-flow__radio-label">
            <input
              type="radio"
              name="payment"
              value="i-pay"
              checked={orderingOptions.payment === 'i-pay'}
              onChange={(e) => setOrderingOptions(prev => ({
                ...prev,
                payment: e.target.value as PaymentOption,
              }))}
            />
            <span>I will pay for the entire order</span>
          </label>
          <label className="dl-get-price-flow__radio-label">
            <input
              type="radio"
              name="payment"
              value="group-pays"
              checked={orderingOptions.payment === 'group-pays'}
              onChange={(e) => setOrderingOptions(prev => ({
                ...prev,
                payment: e.target.value as PaymentOption,
              }))}
            />
            <span>Invite my group to pay for their order</span>
          </label>
        </div>
      </div>

      {/* 预计送达日期提示 */}
      <div className="dl-get-price-flow__delivery-hint">
        <p>Estimated delivery: Standard shipping arrives in 7-10 business days</p>
      </div>

      <div className="dl-get-price-flow__actions">
        <button
          className="dl-modal__btn dl-modal__btn--secondary"
          onClick={() => setCurrentStep('start')}
        >
          Back
        </button>
        <button
          className="dl-modal__btn dl-modal__btn--primary"
          onClick={() => setCurrentStep('quantity')}
          disabled={
            orderingOptions.shipping === 'multiple-addresses' && totalQuantity < 6
          }
        >
          Continue to Sizes
        </button>
      </div>
    </div>
  );

  // [2025-12-08] 步骤3：Quantity - 尺码网格
  const renderQuantityStep = () => {
    if (orderingOptions.sizesQuantities === 'invite-group') {
      // 情况B：预估总量页
      return (
        <div className="dl-get-price-flow__step">
          <h2 className="dl-get-price-flow__step-title">Estimated Quantity</h2>
          <p className="dl-get-price-flow__step-description">
            Enter the estimated total quantity for your group order
          </p>

          <div className="dl-get-price-flow__estimated-quantity">
            <button
              className="dl-get-price-flow__quantity-btn"
              onClick={() => setEstimatedQuantity(Math.max(1, estimatedQuantity - 1))}
            >
              −
            </button>
            <input
              type="number"
              min="1"
              value={estimatedQuantity}
              onChange={(e) => setEstimatedQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="dl-get-price-flow__quantity-input"
            />
            <button
              className="dl-get-price-flow__quantity-btn"
              onClick={() => setEstimatedQuantity(estimatedQuantity + 1)}
            >
              +
            </button>
          </div>

          <div className="dl-get-price-flow__actions">
            <button
              className="dl-modal__btn dl-modal__btn--secondary"
              onClick={() => setCurrentStep('ordering-options')}
            >
              Change Options
            </button>
            <button
              className="dl-modal__btn dl-modal__btn--primary"
              onClick={() => setCurrentStep('order-options')}
              disabled={estimatedQuantity < 1}
            >
              See Pricing
            </button>
          </div>
        </div>
      );
    }

    // 情况A：I know the sizes I need - 尺码网格
    return (
      <div className="dl-get-price-flow__step">
        <h2 className="dl-get-price-flow__step-title">Select Sizes and Quantities</h2>
        <p className="dl-get-price-flow__step-description">
          Enter the quantity for each size you need
        </p>

        {/* YOUTH尺码 */}
        <div className="dl-get-price-flow__size-section">
          <h4 className="dl-get-price-flow__size-section-title">YOUTH</h4>
          <div className="dl-get-price-flow__size-grid">
            {youthSizes.map(size => (
              <div key={size} className="dl-get-price-flow__size-item">
                <label className="dl-get-price-flow__size-label">{size}</label>
                <input
                  type="number"
                  min="0"
                  value={sizeQuantities.find(sq => sq.size === size)?.quantity || 0}
                  onChange={(e) => {
                    const value = Math.max(0, parseInt(e.target.value) || 0);
                    setSizeQuantities(prev => {
                      const existing = prev.find(sq => sq.size === size);
                      if (existing) {
                        return prev.map(sq => sq.size === size ? { ...sq, quantity: value } : sq);
                      } else {
                        return [...prev, { size, quantity: value }];
                      }
                    });
                  }}
                  className="dl-get-price-flow__size-input"
                />
              </div>
            ))}
          </div>
        </div>

        {/* ADULT尺码 */}
        <div className="dl-get-price-flow__size-section">
          <h4 className="dl-get-price-flow__size-section-title">ADULT</h4>
          <div className="dl-get-price-flow__size-grid">
            {adultSizes.map(size => {
              const sizeFee = ['2XL', '3XL', '4XL', '5XL'].includes(size)
                ? `+$${size === '2XL' ? '2.50' : size === '3XL' ? '3.50' : size === '4XL' ? '4.50' : '5.50'}`
                : '';
              return (
                <div key={size} className="dl-get-price-flow__size-item">
                  <label className="dl-get-price-flow__size-label">
                    {size}
                    {sizeFee && <span className="dl-get-price-flow__size-fee">{sizeFee}</span>}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={sizeQuantities.find(sq => sq.size === size)?.quantity || 0}
                    onChange={(e) => {
                      const value = Math.max(0, parseInt(e.target.value) || 0);
                      setSizeQuantities(prev => {
                        const existing = prev.find(sq => sq.size === size);
                        if (existing) {
                          return prev.map(sq => sq.size === size ? { ...sq, quantity: value } : sq);
                        } else {
                          return [...prev, { size, quantity: value }];
                        }
                      });
                    }}
                    className="dl-get-price-flow__size-input"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Total Quantity */}
        <div className="dl-get-price-flow__total-quantity">
          <span className="dl-get-price-flow__total-label">Total Quantity:</span>
          <span className="dl-get-price-flow__total-value">{totalQuantity}</span>
        </div>

        <div className="dl-get-price-flow__actions">
          <button
            className="dl-modal__btn dl-modal__btn--secondary"
            onClick={() => setCurrentStep('ordering-options')}
          >
            Back
          </button>
          <button
            className="dl-modal__btn dl-modal__btn--primary"
            onClick={() => setCurrentStep('order-options')}
            disabled={totalQuantity === 0}
          >
            Continue
          </button>
        </div>
      </div>
    );
  };

  // [2025-12-08] 步骤4：Order Options - 报价结果页
  const renderOrderOptionsStep = () => {
    // 这里应该调用报价API获取实际价格
    // 暂时使用模拟数据
    const mockQuote = {
      unitPrice: 32.47,
      total: totalQuantity * 32.47,
      currency: 'USD',
    };

    return (
      <div className="dl-get-price-flow__step">
        <h2 className="dl-get-price-flow__step-title">Order Options</h2>

        {/* 价格 */}
        <div className="dl-get-price-flow__price-section">
          <div className="dl-get-price-flow__price-item">
            <span>${mockQuote.unitPrice.toFixed(2)} each</span>
            <span>${mockQuote.total.toFixed(2)} total</span>
          </div>
        </div>

        {/* 统计徽章 */}
        <div className="dl-get-price-flow__badges">
          <span className="dl-get-price-flow__badge">1 Color</span>
          <span className="dl-get-price-flow__badge">{totalQuantity} Items</span>
        </div>

        {/* 配送文案 */}
        <div className="dl-get-price-flow__delivery-info">
          <p>FREE Standard Delivery (Estimated arrival: 7-10 business days)</p>
          <button className="dl-get-price-flow__link-btn">Edit</button>
        </div>

        {/* YOUR ORDER列表 */}
        <div className="dl-get-price-flow__order-list">
          <h3 className="dl-get-price-flow__order-list-title">YOUR ORDER</h3>
          <div className="dl-get-price-flow__order-item">
            <span>Product • Color • {totalQuantity} items</span>
            <button className="dl-get-price-flow__link-btn">Edit</button>
          </div>
        </div>

        <div className="dl-get-price-flow__actions">
          <button
            className="dl-modal__btn dl-modal__btn--secondary"
            onClick={() => setCurrentStep('quantity')}
          >
            Change your order options
          </button>
          <button
            className="dl-modal__btn dl-modal__btn--secondary"
            onClick={onClose}
          >
            Save & Continue Designing
          </button>
          <button
            className="dl-modal__btn dl-modal__btn--primary"
            onClick={() => {
              if (onAddToCart) {
                onAddToCart({
                  designId,
                  orderingOptions,
                  sizeQuantities: orderingOptions.sizesQuantities === 'i-know-sizes' ? sizeQuantities : null,
                  estimatedQuantity: orderingOptions.sizesQuantities === 'invite-group' ? estimatedQuantity : null,
                  totalQuantity,
                });
              }
              onClose();
            }}
            disabled={totalQuantity === 0}
          >
            Add to Cart
          </button>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="dl-modal-overlay" onClick={onClose}>
      <div className="dl-modal dl-get-price-flow-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dl-modal__header">
          <h2 className="dl-modal__title">Get Price</h2>
          <button className="dl-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="dl-modal__body">
          {/* 步骤指示器 */}
          <div className="dl-get-price-flow__steps-indicator">
            <div className={`dl-get-price-flow__step-indicator ${currentStep === 'start' ? 'is-active' : currentStep !== 'start' ? 'is-completed' : ''}`}>
              <span>1</span>
              <span>Start</span>
            </div>
            <div className={`dl-get-price-flow__step-indicator ${currentStep === 'ordering-options' ? 'is-active' : ['quantity', 'order-options'].includes(currentStep) ? 'is-completed' : ''}`}>
              <span>2</span>
              <span>Options</span>
            </div>
            <div className={`dl-get-price-flow__step-indicator ${currentStep === 'quantity' ? 'is-active' : currentStep === 'order-options' ? 'is-completed' : ''}`}>
              <span>3</span>
              <span>Quantity</span>
            </div>
            <div className={`dl-get-price-flow__step-indicator ${currentStep === 'order-options' ? 'is-active' : ''}`}>
              <span>4</span>
              <span>Review</span>
            </div>
          </div>

          {/* 步骤内容 */}
          {currentStep === 'start' && renderStartStep()}
          {currentStep === 'ordering-options' && renderOrderingOptionsStep()}
          {currentStep === 'quantity' && renderQuantityStep()}
          {currentStep === 'order-options' && renderOrderOptionsStep()}
        </div>
      </div>
    </div>
  );
};

export default GetPriceFlowModal;

