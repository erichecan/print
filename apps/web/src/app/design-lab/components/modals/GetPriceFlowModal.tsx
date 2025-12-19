/**
 * Get Price Flow Modal
 * [2025-12-08] 完整的Get Price流程：Buy & Ship / Fundraiser选择 → Ordering Options → Quantity → Order Options
 */
'use client';

import React, { useState, useEffect } from 'react';
import { designLabApi } from '@/lib/api';
import './GetPriceFlowModal.css';

export type GetPriceFlowStep = 'ordering-options' | 'quantity' | 'order-options' | 'content-check' | 'added-to-cart';

export type OrderType = 'buy-ship' | 'fundraiser';
export type ShippingOption = 'single-address' | 'multiple-addresses';
export type SizesQuantitiesOption = 'i-know-sizes' | 'invite-group';
export type PaymentOption = 'i-pay' | 'group-pays';

interface GetPriceFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  designId: string | null;
  onAddToCart?: (orderData: any) => void;
  // [2025-12-08] 报价所需的数据
  getQuoteData?: () => Promise<{ sidesUsed: string[]; layerCount: number }> | { sidesUsed: string[]; layerCount: number };
  productName?: string;
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
  getQuoteData,
  productName = 'Design Item',
}) => {
  const [currentStep, setCurrentStep] = useState<GetPriceFlowStep>('quantity');
  const [orderType, setOrderType] = useState<OrderType>('buy-ship');
  const [orderingOptions, setOrderingOptions] = useState<OrderingOptions>({
    orderType: 'buy-ship',
    shipping: 'single-address',
    sizesQuantities: 'i-know-sizes',
    payment: 'i-pay',
  });
  const [sizeQuantities, setSizeQuantities] = useState<SizeQuantity[]>([]);
  const [estimatedQuantity, setEstimatedQuantity] = useState<number>(1);
  // [2025-12-08] 报价相关状态
  const [quoteData, setQuoteData] = useState<any>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  // [2025-12-07 15:30:00] Content Check 相关状态
  const [needsContentCheck, setNeedsContentCheck] = useState(false);
  const [hasUploadedImages, setHasUploadedImages] = useState(false);
  // [2025-12-07 15:30:00] 加车成功相关状态
  const [addedToCartData, setAddedToCartData] = useState<any>(null);

  // [2025-12-08] 初始化尺码列表
  const youthSizes = React.useMemo(() => ['YS', 'YM', 'YL'], []);
  const adultSizes = React.useMemo(() => ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'], []);
  const allSizes = React.useMemo(() => [...youthSizes, ...adultSizes], [youthSizes, adultSizes]);
  const womensSizes = React.useMemo(() => ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'], []); // [2025-12-07 15:30:00] 女性尺码
  const [showWomensSizes, setShowWomensSizes] = useState(false); // [2025-12-07 15:30:00] 是否显示女性尺码

  // [2025-12-08] 初始化尺码数量
  React.useEffect(() => {
    if (currentStep === 'quantity' && sizeQuantities.length === 0 && orderingOptions.sizesQuantities === 'i-know-sizes') {
      setSizeQuantities(
        allSizes.map(size => ({ size, quantity: 0 }))
      );
    }
  }, [currentStep, orderingOptions.sizesQuantities, allSizes, sizeQuantities.length]);

  // [2025-12-07 15:30:00] 检查是否有上传的图片（用于 Content Check）
  React.useEffect(() => {
    const checkImages = async () => {
      if (getQuoteData) {
        try {
          const data = typeof getQuoteData === 'function' ? await getQuoteData() : getQuoteData;
          // 检查是否有上传的图片对象
          if ((data as any)?.hasUploadedImages) {
            setHasUploadedImages(true);
            setNeedsContentCheck(true);
          }
        } catch (e) {
          console.error('[GetPriceFlowModal] Error checking images:', e);
        }
      }
    };
    checkImages();
  }, [getQuoteData]);

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
      setCurrentStep('quantity');
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
        <p>🚚 Free Standard Shipping on all orders!</p>
      </div>

      <div className="dl-get-price-flow__actions">
        <button
          className="dl-modal__btn dl-modal__btn--secondary"
          onClick={() => setCurrentStep('quantity')}
        >
          Back to Sizes
        </button>
        <button
          className="dl-modal__btn dl-modal__btn--primary"
          onClick={() => setCurrentStep('order-options')}
          disabled={
            orderingOptions.shipping === 'multiple-addresses' && totalQuantity < 6
          }
        >
          See My Price
        </button>
      </div>
    </div>
  );

  // [2025-12-08] 步骤1：Quantity - 尺码网格 (Now the first step)
  const renderQuantityStep = () => {
    if (orderingOptions.sizesQuantities === 'invite-group') {
      return (
        <div className="dl-get-price-flow__step">
          <h2 className="dl-get-price-flow__step-title">How many are you ordering?</h2>
          <p className="dl-get-price-flow__step-description">
            Enter the estimated total quantity for your group order. We&apos;ll give you a price based on this.
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

          <div className="dl-get-price-flow__total-quantity">
            <span className="dl-get-price-flow__total-label">Estimated Total:</span>
            <span className="dl-get-price-flow__total-value">{estimatedQuantity} items</span>
          </div>

          <div className="dl-get-price-flow__actions">
            <button className="dl-modal__btn dl-modal__btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              className="dl-modal__btn dl-modal__btn--primary"
              onClick={() => setCurrentStep('ordering-options')}
              disabled={estimatedQuantity < 1}
            >
              Next: Shipping Details
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="dl-get-price-flow__step">
        <h2 className="dl-get-price-flow__step-title">Select Sizes & Quantities</h2>
        <p className="dl-get-price-flow__step-description">
          Provide the number of items you need for each size to get an accurate price.
        </p>

        <div className="dl-get-price-flow__size-grid-container">
          {/* ADULT尺码 */}
          <div className="dl-get-price-flow__size-section">
            <h4 className="dl-get-price-flow__size-section-title">ADULT SIZES</h4>
            <div className="dl-get-price-flow__size-grid">
              {adultSizes.map(size => {
                const sizeFee = ['2XL', '3XL', '4XL', '5XL'].includes(size)
                  ? `(+$${size === '2XL' ? '2.50' : size === '3XL' ? '3.50' : size === '4XL' ? '4.50' : '5.50'})`
                  : '';
                return (
                  <div key={size} className="dl-get-price-flow__size-item">
                    <label className="dl-get-price-flow__size-label">
                      {size}
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
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
                    {sizeFee && <span className="dl-get-price-flow__size-fee">{sizeFee}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* YOUTH尺码 */}
          <div className="dl-get-price-flow__size-section">
            <h4 className="dl-get-price-flow__size-section-title">YOUTH SIZES</h4>
            <div className="dl-get-price-flow__size-grid">
              {youthSizes.map(size => (
                <div key={size} className="dl-get-price-flow__size-item">
                  <label className="dl-get-price-flow__size-label">{size}</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
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
        </div>

        <div className="dl-get-price-flow__total-quantity">
          <span className="dl-get-price-flow__total-label">Order Subtotal:</span>
          <span className="dl-get-price-flow__total-value">{totalQuantity} items</span>
        </div>

        <div className="dl-get-price-flow__actions">
          <button className="dl-modal__btn dl-modal__btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="dl-modal__btn dl-modal__btn--primary"
            onClick={() => setCurrentStep('ordering-options')}
            disabled={totalQuantity === 0}
          >
            Next: Order Options
          </button>
        </div>
      </div>
    );
  };

  // [2025-12-08] 获取报价数据
  const fetchQuote = async () => {
    if (totalQuantity === 0) {
      return;
    }

    setQuoteLoading(true);
    setQuoteError(null);

    try {
      // 获取报价所需的数据（使用的面和图层数）
      let quoteParams: { sidesUsed: string[]; layerCount: number } = {
        sidesUsed: ['front'], // 默认值
        layerCount: 0,
      };

      if (getQuoteData) {
        const data = await (typeof getQuoteData === 'function' ? getQuoteData() : Promise.resolve(getQuoteData));
        quoteParams = data;
      }

      if (designId) {
        // 调用报价API
        const response = await designLabApi.requestQuote(designId, {
          quantity: totalQuantity,
          sidesUsed: quoteParams.sidesUsed,
          layerCount: quoteParams.layerCount,
        }) as any;

        if (response && response.data) {
          setQuoteData(response.data);
        } else {
          throw new Error('Failed to get price quote');
        }
      } else {
        // [2025-12-20] 如果没有 designId，使用模拟数据，不阻塞流程
        console.log('[GetPriceFlowModal] No designId, using mock quote data');
        setQuoteData({
          unitPrice: 0,
          total: 0,
          discountedUnitPrice: 0,
          currency: 'USD',
          breakdown: {
            quantityDiscount: 0,
            sidesCount: quoteParams.sidesUsed.length,
            layerCount: quoteParams.layerCount,
            basePrice: 0,
            designPrice: 0
          }
        });
      }
    } catch (error: any) {
      console.error('[GetPriceFlowModal] Error fetching quote:', error);
      setQuoteError(error?.message || 'Failed to get price quote. Please try again.');
    } finally {
      setQuoteLoading(false);
    }
  };

  // [2025-12-08] 当进入Order Options步骤时，自动获取报价
  useEffect(() => {
    if (currentStep === 'order-options' && designId && totalQuantity > 0 && !quoteData && !quoteLoading) {
      fetchQuote();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, designId, totalQuantity]);

  // [2025-12-07 15:30:00] 处理加入购物车
  const handleAddToCart = async () => {
    if (!onAddToCart) {
      console.warn('[GetPriceFlowModal] onAddToCart callback not provided');
      return;
    }

    try {
      const orderData = {
        designId,
        orderingOptions,
        sizeQuantities: orderingOptions.sizesQuantities === 'i-know-sizes' ? sizeQuantities : null,
        estimatedQuantity: orderingOptions.sizesQuantities === 'invite-group' ? estimatedQuantity : null,
        totalQuantity,
        quoteData,
      };

      await onAddToCart(orderData);

      // 标记内容已确认（如果通过了 Content Check）
      if (needsContentCheck) {
        setNeedsContentCheck(false);
      }

      // 进入加车成功页
      setAddedToCartData(orderData);
      setCurrentStep('added-to-cart');
    } catch (error) {
      console.error('[GetPriceFlowModal] Error adding to cart:', error);
      setQuoteError('Failed to add to cart. Please try again.');
    }
  };

  // [2025-12-07 15:30:00] 步骤5：Content Check - 内容合规确认
  const renderContentCheckStep = () => (
    <div className="dl-get-price-flow__step">
      <h2 className="dl-get-price-flow__step-title">Content Check</h2>
      <p className="dl-get-price-flow__step-description">
        By continuing with your order, you confirm that any uploaded images comply with our content standards and copyright requirements.
      </p>

      <div className="dl-get-price-flow__content-check-warning">
        <p>⚠️ Please ensure that:</p>
        <ul>
          <li>You have the right to use all uploaded images</li>
          <li>Images do not contain offensive, illegal, or copyrighted content</li>
          <li>Images meet our quality standards (recommended: 300 DPI or higher)</li>
        </ul>
      </div>

      <div className="dl-get-price-flow__actions">
        <button
          className="dl-modal__btn dl-modal__btn--secondary"
          onClick={() => {
            onClose();
            // [2025-12-07 15:30:00] 返回设计器（通过关闭模态框）
          }}
        >
          Edit Design
        </button>
        <button
          className="dl-modal__btn dl-modal__btn--primary"
          onClick={() => {
            // 同意并继续到加入购物车
            setNeedsContentCheck(false);
            handleAddToCart();
          }}
        >
          Agree & Continue
        </button>
      </div>
    </div>
  );

  // [2025-12-07 15:30:00] 步骤6：Added to Cart - 加车成功页
  const renderAddedToCartStep = () => {
    if (!addedToCartData) return null;

    return (
      <div className="dl-get-price-flow__step">
        <h2 className="dl-get-price-flow__step-title">Added to Cart</h2>

        <div className="dl-get-price-flow__added-summary">
          <div className="dl-get-price-flow__added-item">
            <span className="dl-get-price-flow__added-label">Product:</span>
            <span className="dl-get-price-flow__added-value">
              {typeof productName === 'object' ? (productName as any).name : productName}
            </span>
          </div>
          <div className="dl-get-price-flow__added-item">
            <span className="dl-get-price-flow__added-label">Quantity:</span>
            <span className="dl-get-price-flow__added-value">{addedToCartData.totalQuantity} items</span>
          </div>
          {addedToCartData.sizeQuantities && (
            <div className="dl-get-price-flow__added-item">
              <span className="dl-get-price-flow__added-label">Sizes:</span>
              <span className="dl-get-price-flow__added-value">
                {addedToCartData.sizeQuantities
                  .filter((sq: SizeQuantity) => sq.quantity > 0)
                  .map((sq: SizeQuantity) => `${sq.size}×${sq.quantity}`)
                  .join(', ')}
              </span>
            </div>
          )}
        </div>

        <div className="dl-get-price-flow__actions">
          <button
            className="dl-modal__btn dl-modal__btn--primary"
            onClick={() => {
              // [2025-12-07 15:30:00] 跳转到购物车页面
              if (typeof window !== 'undefined') {
                window.location.href = '/cart';
              }
            }}
          >
            Review Cart & Check Out
          </button>
        </div>

        <div className="dl-get-price-flow__want-more">
          <p className="dl-get-price-flow__want-more-title">Want to add more?</p>
          <div className="dl-get-price-flow__want-more-options">
            <button
              className="dl-get-price-flow__want-more-btn"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.href = '/products';
                }
              }}
            >
              Browse the catalog
            </button>
            <button
              className="dl-get-price-flow__want-more-btn"
              onClick={() => {
                onClose();
                // [2025-12-07 15:30:00] 从当前设计继续
              }}
            >
              Start from this design
            </button>
            <button
              className="dl-get-price-flow__want-more-btn"
              onClick={() => {
                onClose();
                // [2025-12-07 15:30:00] 开始新设计（重置画布）
                if (typeof window !== 'undefined') {
                  window.location.href = '/design-lab';
                }
              }}
            >
              Start a new design
            </button>
          </div>
        </div>
      </div>
    );
  };

  // [2025-12-08] 步骤4：Order Options - 报价结果页
  const renderOrderOptionsStep = () => {
    // 如果正在加载，显示加载状态
    if (quoteLoading) {
      return (
        <div className="dl-get-price-flow__step">
          <h2 className="dl-get-price-flow__step-title">Order Options</h2>
          <div className="dl-get-price-flow__loading">
            <p>Calculating price...</p>
          </div>
        </div>
      );
    }

    // 如果有错误，显示错误信息
    if (quoteError) {
      return (
        <div className="dl-get-price-flow__step">
          <h2 className="dl-get-price-flow__step-title">Order Options</h2>
          <div className="dl-get-price-flow__error">
            <p>{quoteError}</p>
            <button
              className="dl-modal__btn dl-modal__btn--primary"
              onClick={fetchQuote}
            >
              Retry
            </button>
            <button
              className="dl-modal__btn dl-modal__btn--secondary"
              onClick={() => setCurrentStep('quantity')}
            >
              Back
            </button>
          </div>
        </div>
      );
    }

    // 如果没有报价数据，显示提示
    if (!quoteData) {
      return (
        <div className="dl-get-price-flow__step">
          <h2 className="dl-get-price-flow__step-title">Order Options</h2>
          <div className="dl-get-price-flow__error">
            <p>Unable to calculate price. Please try again.</p>
            <button
              className="dl-modal__btn dl-modal__btn--primary"
              onClick={fetchQuote}
            >
              Calculate Price
            </button>
          </div>
        </div>
      );
    }

    // 使用实际的报价数据
    const quote = quoteData;

    return (
      <div className="dl-get-price-flow__step">
        <h2 className="dl-get-price-flow__step-title">Order Options</h2>

        {/* 价格 */}
        <div className="dl-get-price-flow__price-section">
          <div className="dl-get-price-flow__price-item">
            <span className="dl-get-price-flow__price-each">
              ${quote.discountedUnitPrice?.toFixed(2) || quote.unitPrice?.toFixed(2) || '0.00'} each
            </span>
            <span className="dl-get-price-flow__price-total">
              ${quote.total?.toFixed(2) || '0.00'} total
            </span>
          </div>
          {quote.breakdown?.quantityDiscount > 0 && (
            <div className="dl-get-price-flow__discount-hint">
              <p>You saved ${quote.discount?.toFixed(2) || '0.00'} with quantity discount!</p>
            </div>
          )}
        </div>

        {/* 统计徽章 */}
        <div className="dl-get-price-flow__badges">
          {quote.breakdown?.sidesCount > 0 && (
            <span className="dl-get-price-flow__badge">{quote.breakdown.sidesCount} Side{quote.breakdown.sidesCount > 1 ? 's' : ''}</span>
          )}
          {quote.breakdown?.layerCount > 0 && (
            <span className="dl-get-price-flow__badge">{quote.breakdown.layerCount} Layer{quote.breakdown.layerCount > 1 ? 's' : ''}</span>
          )}
          <span className="dl-get-price-flow__badge">{totalQuantity} Item{totalQuantity > 1 ? 's' : ''}</span>
        </div>

        {/* 促销文案 */}
        {quote.breakdown?.quantityDiscount > 0 && (
          <div className="dl-get-price-flow__promotion-hint">
            <p>BUY MORE, SAVE MORE: {quote.breakdown.quantityDiscount}% discount applied for {totalQuantity} items</p>
          </div>
        )}

        {/* 配送文案 */}
        <div className="dl-get-price-flow__delivery-info">
          <p>FREE Standard Delivery (Estimated arrival: 7-10 business days)</p>
          <button className="dl-get-price-flow__link-btn">Edit</button>
        </div>

        {/* YOUR ORDER列表 */}
        <div className="dl-get-price-flow__order-list">
          <h3 className="dl-get-price-flow__order-list-title">YOUR ORDER</h3>
          <div className="dl-get-price-flow__order-item">
            <div className="dl-get-price-flow__order-item-details">
              <span>Product • Color • {totalQuantity} items</span>
              {orderingOptions.sizesQuantities === 'i-know-sizes' && sizeQuantities.filter(sq => sq.quantity > 0).length > 0 && (
                <div className="dl-get-price-flow__order-item-sizes">
                  Sizes: {sizeQuantities
                    .filter(sq => sq.quantity > 0)
                    .map(sq => `${sq.size}×${sq.quantity}`)
                    .join(', ')}
                </div>
              )}
            </div>
            <button
              className="dl-get-price-flow__link-btn"
              onClick={() => setCurrentStep('quantity')}
            >
              Edit
            </button>
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
              // [2025-12-07 15:30:00] 如果有上传图片，先进入 Content Check
              if (needsContentCheck && hasUploadedImages) {
                setCurrentStep('content-check');
              } else {
                // 直接加入购物车
                handleAddToCart();
              }
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
            <div className={`dl-get-price-flow__step-indicator ${(currentStep as string) === 'quantity' ? 'is-active' : (currentStep as string) !== 'quantity' ? 'is-completed' : ''}`}>
              <span>1</span>
              <span>Quantity</span>
            </div>
            <div className={`dl-get-price-flow__step-indicator ${currentStep === 'ordering-options' ? 'is-active' : ['order-options'].includes(currentStep) ? 'is-completed' : ''}`}>
              <span>2</span>
              <span>Options</span>
            </div>
            <div className={`dl-get-price-flow__step-indicator ${currentStep === 'order-options' ? 'is-active' : ['content-check', 'added-to-cart'].includes(currentStep) ? 'is-completed' : ''}`}>
              <span>3</span>
              <span>Quote</span>
            </div>
          </div>

          {/* 步骤内容 */}
          {currentStep === 'quantity' && renderQuantityStep()}
          {currentStep === 'ordering-options' && renderOrderingOptionsStep()}
          {currentStep === 'order-options' && renderOrderOptionsStep()}
          {currentStep === 'content-check' && renderContentCheckStep()}
          {currentStep === 'added-to-cart' && renderAddedToCartStep()}
        </div>
      </div>
    </div>
  );
};

export default GetPriceFlowModal;

