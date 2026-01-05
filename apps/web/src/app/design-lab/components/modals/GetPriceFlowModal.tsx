/**
 * Get Price Flow Modal
* 完整的Get Price流程：Buy & Ship / Fundraiser选择 → Ordering Options → Quantity → Order Options
 */
'use client';

import React, { useState, useEffect } from 'react';
import { designLabApi, productsApi, sizeFeesApi } from '@/lib/api';
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
  getQuoteData?: () => Promise<{ sidesUsed: string[]; layerCount: number }> | { sidesUsed: string[]; layerCount: number };
  productName?: string;
  variants?: any[]; // Added variants prop
  // States lifted from parent for persistence
  currentStep: GetPriceFlowStep;
  setCurrentStep: React.Dispatch<React.SetStateAction<GetPriceFlowStep>>;
  orderingOptions: OrderingOptions;
  setOrderingOptions: React.Dispatch<React.SetStateAction<OrderingOptions>>;
  sizeQuantities: SizeQuantity[];
  setSizeQuantities: React.Dispatch<React.SetStateAction<SizeQuantity[]>>;
  estimatedQuantity: number;
  setEstimatedQuantity: React.Dispatch<React.SetStateAction<number>>;
  quoteData: any;
  setQuoteData: React.Dispatch<React.SetStateAction<any>>;
}

export interface OrderingOptions {
  orderType: OrderType;
  shipping: ShippingOption;
  sizesQuantities: SizesQuantitiesOption;
  payment: PaymentOption;
}

export interface SizeQuantity {
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
  variants, // Destructure variants
  currentStep,
  setCurrentStep,
  orderingOptions,
  setOrderingOptions,
  sizeQuantities,
  setSizeQuantities,
  estimatedQuantity,
  setEstimatedQuantity,
  quoteData,
  setQuoteData,
}) => {
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  // Content Check 相关状态
  const [needsContentCheck, setNeedsContentCheck] = useState(false);
  const [hasUploadedImages, setHasUploadedImages] = useState(false);
  // 加车成功相关状态
  const [addedToCartData, setAddedToCartData] = useState<any>(null);
  // Adding to cart loading state
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  // Fetch size pricing from DB
  const [sizeAdjustments, setSizeAdjustments] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchSizeData = async () => {
      // Fetch global size fees
      let globalSizeFees: Record<string, number> = {};
      try {
        const sizeFeesRes = await sizeFeesApi.getAll();
        if (sizeFeesRes.data) {
          sizeFeesRes.data.forEach(fee => {
            if (fee.additionalFee > 0) {
              globalSizeFees[fee.size] = fee.additionalFee;
            }
          });
        }
      } catch (e) {
        console.error("Failed to fetch global size fees", e);
      }

      // Prioritize passed variants prop
      if (variants && variants.length > 0) {
        console.log('[GetPriceFlowModal] Using provided variants for size fees');
        const adjustments: Record<string, number> = { ...globalSizeFees };
        variants.forEach((v: any) => {
          if (v.size && v.priceAdjustment) {
            // If global fee exists, it takes precedence (or we can decide logic here)
            // For now, let's assume global config overrides or if specific variant has higher, use that?
            // User request implies we want to show the fees from the config.
            // Let's use global fee if present, otherwise variant adjustment.
            if (!adjustments[v.size]) {
              adjustments[v.size] = Number(v.priceAdjustment) / 100;
            }
          }
        });
        setSizeAdjustments(adjustments);
        return;
      }

      if (!designId) {
        // Fallback: use global fees if no design/variants
        if (Object.keys(globalSizeFees).length > 0) {
          setSizeAdjustments(globalSizeFees);
        }
        return;
      }

      try {
        // 1. Get design to find variant params
        const designRes = await designLabApi.getDesign(designId);
        // Cast to any to access variant which might be missing in strict type
        const designData = designRes.data as any;

        if (designData && designData.variant) {
          const variantId = designData.variant.id;
          // 2. Get product details by variant (includes all sibling variants)
          const productRes = await productsApi.getByVariant(variantId);

          if (productRes && productRes.variants) {
            const adjustments: Record<string, number> = { ...globalSizeFees };
            // Extract priceAdjustment from variants
            // Note: frontend type might not have priceAdjustment yet, cast if needed
            productRes.variants.forEach((v: any) => {
              if (v.size && v.priceAdjustment && !adjustments[v.size]) {
                adjustments[v.size] = Number(v.priceAdjustment) / 100;
              }
            });
            setSizeAdjustments(adjustments);
          } else {
            // Fallback if no variants found in product response
            if (Object.keys(globalSizeFees).length > 0) {
              setSizeAdjustments(globalSizeFees);
            }
          }
        } else {
          // Fallback if no variant in design
          if (Object.keys(globalSizeFees).length > 0) {
            setSizeAdjustments(globalSizeFees);
          }
        }
      } catch (e) {
        console.error("Failed to fetch size data", e);
      }
    };
    fetchSizeData();
  }, [designId, variants]);

  // Actually, let's just make a new simple effect using productApi if possible or assume designLabApi can be extended.
  // The file imports `designLabApi` from `@/lib/api`. 
  // I should check `apps/web/src/lib/api.ts` to see if `productsApi` is exported. Yes it is.

  const youthSizes = React.useMemo(() => ['YS', 'YM', 'YL'], []);
  const adultSizes = React.useMemo(() => ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'], []);
  const allSizes = React.useMemo(() => [...youthSizes, ...adultSizes], [youthSizes, adultSizes]);
  const womensSizes = React.useMemo(() => ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'], []); // 女性尺码
  const [showWomensSizes, setShowWomensSizes] = useState(false); // 是否显示女性尺码

  // 初始化尺码数量
  React.useEffect(() => {
    if (currentStep === 'quantity' && sizeQuantities.length === 0 && orderingOptions.sizesQuantities === 'i-know-sizes') {
      setSizeQuantities(
        allSizes.map(size => ({ size, quantity: 0 }))
      );
    }
  }, [currentStep, orderingOptions.sizesQuantities, allSizes, sizeQuantities.length]);

  // 检查是否有上传的图片（用于 Content Check）
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

  // 计算总数量
  const totalQuantity = React.useMemo(() => {
    if (orderingOptions.sizesQuantities === 'i-know-sizes') {
      return sizeQuantities.reduce((sum: number, sq: SizeQuantity) => sum + sq.quantity, 0);
    } else {
      return estimatedQuantity;
    }
  }, [sizeQuantities, estimatedQuantity, orderingOptions.sizesQuantities]);

  // 重置状态当模态框关闭
  React.useEffect(() => {
    if (!isOpen) {
      // Note: We NO LONGER reset persistent state here.
      // We only reset local temporary states if needed.
      setQuoteError(null);
      setAddedToCartData(null);
    }
  }, [isOpen]);



  // 步骤2：Ordering Options
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
          <label className={`dl-get-price-flow__radio-label ${orderingOptions.shipping === 'single-address' ? 'is-selected' : ''}`}>
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
          <label className={`dl-get-price-flow__radio-label ${orderingOptions.shipping === 'multiple-addresses' ? 'is-selected' : ''}`}>
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
          <label className={`dl-get-price-flow__radio-label ${orderingOptions.sizesQuantities === 'i-know-sizes' ? 'is-selected' : ''}`}>
            <input
              type="radio"
              name="sizes-quantities"
              value="i-know-sizes"
              checked={orderingOptions.sizesQuantities === 'i-know-sizes'}
              onChange={(e) => setOrderingOptions(prev => ({
                ...prev,
                sizesQuantities: e.target.value as SizesQuantitiesOption,
              }))}
            />
            <span>I know the sizes I need</span>
          </label>
          <label className={`dl-get-price-flow__radio-label ${orderingOptions.sizesQuantities === 'invite-group' ? 'is-selected' : ''}`}>
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
          <label className={`dl-get-price-flow__radio-label ${orderingOptions.payment === 'i-pay' ? 'is-selected' : ''}`}>
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
          <label className={`dl-get-price-flow__radio-label ${orderingOptions.payment === 'group-pays' ? 'is-selected' : ''}`}>
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
        >
          See My Price
        </button>
      </div>
    </div>
  );

  // 步骤1：Quantity - 尺码网格 (Now the first step)
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
                const adjustment = sizeAdjustments[size] || 0;
                const sizeFee = adjustment > 0 ? `(+$${adjustment.toFixed(2)})` : '';
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
                        setQuoteData(null); // Reset quote data to trigger loading
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

  // 获取报价数据
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
          // Pass size quantities for accurate pricing
          sizeQuantities: sizeQuantities.filter(sq => sq.quantity > 0),
        }) as any;

        if (response && response.data) {
          setQuoteData(response.data);
        } else {
          throw new Error('Failed to get price quote');
        }
      } else {
        // 如果没有 designId，使用模拟数据，不阻塞流程
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

  // 当进入Order Options步骤时，自动获取报价
  // 依赖 totalQuantity 和 sizeQuantities 变化时重新获取
  useEffect(() => {
    if (currentStep === 'order-options' && designId && totalQuantity > 0 && !quoteLoading) {
      fetchQuote();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, designId, totalQuantity, JSON.stringify(sizeQuantities)]);

  // 处理加入购物车
  const handleAddToCart = async () => {
    if (!onAddToCart) {
      console.warn('[GetPriceFlowModal] onAddToCart callback not provided');
      return;
    }

    setIsAddingToCart(true);
    setQuoteError(null);

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
    } finally {
      setIsAddingToCart(false);
    }
  };

  // 步骤5：Content Check - 内容合规确认
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

      {quoteError && (
        <div className="dl-get-price-flow__error" style={{ margin: '16px 0' }}>
          <p>{quoteError}</p>
        </div>
      )}

      <div className="dl-get-price-flow__actions">
        <button
          className="dl-modal__btn dl-modal__btn--secondary"
          onClick={() => {
            onClose();
            // 返回设计器（通过关闭模态框）
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
          disabled={isAddingToCart}
        >
          {isAddingToCart ? 'Adding...' : 'Agree & Continue'}
        </button>
      </div>
    </div>
  );

  // 步骤6：Added to Cart - 加车成功页
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
              // 跳转到购物车页面
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
                // 从当前设计继续
              }}
            >
              Start from this design
            </button>
            <button
              className="dl-get-price-flow__want-more-btn"
              onClick={() => {
                onClose();
                // 开始新设计（重置画布）
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

  // 步骤 4 的高级渲染方案（Tailwind 风格）
  const renderOrderOptionsStep = () => {
    // Declare quote variable properly
    const quote = quoteData || {
      unitPrice: 0,
      total: 0,
      discountedUnitPrice: 0,
      discount: 0,
      breakdown: { quantityDiscount: 0, sidesCount: 0, layerCount: 0 }
    };

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

    return (
      <div className="dl-get-price-flow__quote-container">
        {/* 主要价格卡片 */}
        <div className="dl-get-price-flow__price-card">
          <div className="dl-get-price-flow__price-main-wrap">
            <div className="dl-get-price-flow__price-each">
              ${quote.discountedUnitPrice?.toFixed(2) || quote.unitPrice?.toFixed(2) || '0.00'}
              <span>each</span>
            </div>
            <div className="dl-get-price-flow__price-total-wrap">
              Total: ${quote.total?.toFixed(2) || '0.00'}
            </div>
          </div>

          {/* 优惠提示 */}
          {quote.breakdown?.quantityDiscount > 0 && (
            <div className="dl-get-price-flow__discount-hint" style={{ marginTop: '16px', color: '#38bdf8', fontWeight: 600 }}>
              🎉 You saved ${quote.discount?.toFixed(2) || '0.00'} with bulk discount!
            </div>
          )}
        </div>

        {/* 徽章行 */}
        <div className="dl-get-price-flow__badges-row">
          <span className="dl-get-price-flow__pill">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 8v4l3 3"></path></svg>
            {totalQuantity} Item{totalQuantity > 1 ? 's' : ''}
          </span>
          {quote.breakdown?.sidesCount > 0 && (
            <span className="dl-get-price-flow__pill">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="3" x2="12" y2="21"></line></svg>
              {quote.breakdown.sidesCount} Side{quote.breakdown.sidesCount > 1 ? 's' : ''}
            </span>
          )}
          {quote.breakdown?.layerCount > 0 && (
            <span className="dl-get-price-flow__pill">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
              Layers: {quote.breakdown.layerCount}
            </span>
          )}
        </div>

        {/* 信息网格 */}
        <div className="dl-get-price-flow__info-grid">
          {/* 配送信息卡片 */}
          <div className="dl-get-price-flow__info-card">
            <div className="dl-get-price-flow__info-header">
              <span className="dl-get-price-flow__info-title">Delivery & Options</span>
              <button
                className="dl-get-price-flow__info-edit-btn"
                onClick={() => setCurrentStep('ordering-options')}
              >
                Edit
              </button>
            </div>
            <div className="dl-get-price-flow__info-content">
              <div>FREE Standard Delivery</div>
              <div style={{ fontSize: '13px', color: '#64748b' }}>Estimated arrival: 7-10 business days</div>
              <div style={{ marginTop: '4px', fontStyle: 'italic', fontSize: '13px' }}>
                Payment: {orderingOptions.payment === 'i-pay' ? 'I Pay' : 'Group Pays'}
              </div>
            </div>
          </div>

          {/* 订单明细卡片 */}
          <div className="dl-get-price-flow__info-card">
            <div className="dl-get-price-flow__info-header">
              <span className="dl-get-price-flow__info-title">Your Order Breakdown</span>
              <button
                className="dl-get-price-flow__info-edit-btn"
                onClick={() => setCurrentStep('quantity')}
              >
                Edit
              </button>
            </div>
            <div className="dl-get-price-flow__info-content">
              <div className="dl-get-price-flow__order-summary-item">
                <div className="dl-get-price-flow__order-details-text">
                  Items Details • {totalQuantity} Total
                </div>
              </div>
              {orderingOptions.sizesQuantities === 'i-know-sizes' && sizeQuantities.filter(sq => sq.quantity > 0).length > 0 && (
                <div className="dl-get-price-flow__order-sizes-text">
                  {sizeQuantities
                    .filter(sq => sq.quantity > 0)
                    .map(sq => `${sq.size} × ${sq.quantity}`)
                    .join(', ')}
                </div>
              )}
              {orderingOptions.sizesQuantities === 'invite-group' && (
                <div className="dl-get-price-flow__order-sizes-text">
                  Group Order (Est. {estimatedQuantity} items)
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="dl-get-price-flow__actions">
          <button
            className="dl-modal__btn dl-modal__btn--secondary"
            onClick={onClose}
          >
            Continue Designing
          </button>
          <button
            className="dl-modal__btn dl-modal__btn--primary"
            onClick={() => {
              if (needsContentCheck && hasUploadedImages) {
                setCurrentStep('content-check');
              } else {
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
            <div
              className={`dl-get-price-flow__step-indicator ${(currentStep as string) === 'quantity' ? 'is-active' : (currentStep as string) !== 'quantity' ? 'is-completed' : ''}`}
              onClick={() => setCurrentStep('quantity')}
              style={{ cursor: 'pointer' }}
            >
              <span>1</span>
              <span>Quantity</span>
            </div>
            <div
              className={`dl-get-price-flow__step-indicator ${currentStep === 'ordering-options' ? 'is-active' : ['order-options', 'content-check', 'added-to-cart'].includes(currentStep) ? 'is-completed' : ''}`}
              onClick={() => {
                // Only allow clicking if we have quantity set
                if (totalQuantity > 0) setCurrentStep('ordering-options');
              }}
              style={{ cursor: totalQuantity > 0 ? 'pointer' : 'not-allowed' }}
            >
              <span>2</span>
              <span>Options</span>
            </div>
            <div
              className={`dl-get-price-flow__step-indicator ${currentStep === 'order-options' ? 'is-active' : ['content-check', 'added-to-cart'].includes(currentStep) ? 'is-completed' : ''}`}
              // Quote step usually requires options to be set, so maybe only allow if already visited or ready
              // For simplicity, let's allow it if we have quantity, as defaults exist for options.
              onClick={() => {
                if (totalQuantity > 0) setCurrentStep('order-options');
              }}
              style={{ cursor: totalQuantity > 0 ? 'pointer' : 'not-allowed' }}
            >
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

