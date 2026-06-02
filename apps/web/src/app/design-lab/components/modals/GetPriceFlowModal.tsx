/**
 * Get Price Flow Modal
 * 3-step flow: Print Method → Sizes & Quantities (with inline price) → Done
 */
'use client';

import React, { useState, useEffect } from 'react';
import { designLabApi, sizeFeesApi, cartApi, adminSettingsApi, PrintPricingConfig, QuantityTier } from '@/lib/api';
import './GetPriceFlowModal.css';

export type GetPriceFlowStep = 'print-method' | 'quantity' | 'content-check' | 'added-to-cart';
export type PrintMethod = 'dtf' | 'embroidery';
export type PrintSize = 'small' | 'medium' | 'large';

// Kept for backward compat in parent state declarations
export type OrderType = 'buy-ship' | 'fundraiser';
export type ShippingOption = 'single-address' | 'multiple-addresses';
export type SizesQuantitiesOption = 'i-know-sizes' | 'invite-group';
export type PaymentOption = 'i-pay' | 'group-pays';

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

interface GetPriceFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  designId: string | null;
  variantId?: string | null;
  getQuoteData?: () => Promise<{ sidesUsed: string[]; layerCount: number }> | { sidesUsed: string[]; layerCount: number };
  productName?: string;
  variants?: any[];
  initialSize?: string | null;
  // States lifted from parent for persistence
  currentStep: GetPriceFlowStep;
  setCurrentStep: React.Dispatch<React.SetStateAction<GetPriceFlowStep>>;
  sizeQuantities: SizeQuantity[];
  setSizeQuantities: React.Dispatch<React.SetStateAction<SizeQuantity[]>>;
  estimatedQuantity: number;
  setEstimatedQuantity: React.Dispatch<React.SetStateAction<number>>;
  quoteData: any;
  setQuoteData: React.Dispatch<React.SetStateAction<any>>;
  printMethod: PrintMethod;
  setPrintMethod: React.Dispatch<React.SetStateAction<PrintMethod>>;
  printSize: PrintSize;
  setPrintSize: React.Dispatch<React.SetStateAction<PrintSize>>;
}

const GetPriceFlowModal: React.FC<GetPriceFlowModalProps> = ({
  isOpen,
  onClose,
  designId,
  variantId,
  getQuoteData,
  productName = 'Design Item',
  variants,
  initialSize,
  currentStep,
  setCurrentStep,
  sizeQuantities,
  setSizeQuantities,
  estimatedQuantity,
  setEstimatedQuantity,
  quoteData,
  setQuoteData,
  printMethod,
  setPrintMethod,
  printSize,
  setPrintSize,
}) => {
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [needsContentCheck, setNeedsContentCheck] = useState(false);
  const [hasUploadedImages, setHasUploadedImages] = useState(false);
  const [addedToCartData, setAddedToCartData] = useState<any>(null);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const [sizeConfig, setSizeConfig] = useState<Array<{ size: string; sizeType?: string; additionalFee: number; displayOrder?: number }>>([]);
  const [printPricing, setPrintPricing] = useState<PrintPricingConfig | null>(null);
  const [quantityTiers, setQuantityTiers] = useState<QuantityTier[]>([]);

  // Ref to read sizeQuantities without adding it to effect deps (avoids init loop)
  const sizeQuantitiesRef = React.useRef(sizeQuantities);
  sizeQuantitiesRef.current = sizeQuantities;

  // Fetch size config when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchSizeData = async () => {
      try {
        const sizeFeesRes = await sizeFeesApi.getAll();
        if (sizeFeesRes && sizeFeesRes.data && Array.isArray(sizeFeesRes.data)) {
          setSizeConfig(sizeFeesRes.data.map((fee: any) => ({
            size: fee.size,
            sizeType: fee.sizeType || 'Adult',
            additionalFee: fee.additionalFee || 0,
            displayOrder: fee.displayOrder || 0,
          })));
        } else {
          setSizeConfig([]);
        }
      } catch (e) {
        console.error('[GetPriceFlowModal] Failed to fetch size fees:', e);
        setSizeConfig([]);
      }
    };

    fetchSizeData();
    adminSettingsApi.getPrintPricing().then(res => setPrintPricing(res.data)).catch(() => {});
    adminSettingsApi.getQuantityTiers().then(res => setQuantityTiers(res.data ?? [])).catch(() => {});
  }, [isOpen]);

  // Size adjustment map
  const sizeAdjustments = React.useMemo(() => {
    const adjustments: Record<string, number> = {};
    sizeConfig.forEach(fee => {
      adjustments[fee.size] = fee.additionalFee || 0;
    });
    return adjustments;
  }, [sizeConfig]);

  // Size lists sorted by displayOrder
  const { youthSizes, adultSizes, allSizes } = React.useMemo(() => {
    if (sizeConfig.length === 0) {
      const defaultYouth = ['YS', 'YM', 'YL'];
      const defaultAdult = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];
      return { youthSizes: defaultYouth, adultSizes: defaultAdult, allSizes: [...defaultYouth, ...defaultAdult] };
    }
    const sorted = [...sizeConfig].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0) || a.size.localeCompare(b.size));
    const youth: string[] = [];
    const adult: string[] = [];
    sorted.forEach(sf => {
      if (sf.sizeType === 'Youth') youth.push(sf.size);
      else adult.push(sf.size);
    });
    return {
      youthSizes: youth.length > 0 ? youth : ['YS', 'YM', 'YL'],
      adultSizes: adult.length > 0 ? adult : ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'],
      allSizes: [...youth, ...adult],
    };
  }, [sizeConfig]);

  // Initialize size quantities when entering quantity step.
  // Uses a ref for sizeQuantities to avoid the effect re-firing after setSizeQuantities,
  // while still respecting any quantities the user has already typed (hasUserInput guard).
  React.useEffect(() => {
    if (!isOpen || currentStep !== 'quantity' || allSizes.length === 0) return;
    const hasUserInput = sizeQuantitiesRef.current.some(sq => sq.quantity > 0);
    if (!hasUserInput) {
      setSizeQuantities(allSizes.map(size => ({ size, quantity: initialSize === size ? 1 : 0 })));
    }
  }, [isOpen, currentStep, allSizes, initialSize, setSizeQuantities]);

  // Total quantity
  const totalQuantity = React.useMemo(() => {
    return sizeQuantities.reduce((sum, sq) => sum + sq.quantity, 0);
  }, [sizeQuantities]);

  // Check for uploaded images (content check)
  React.useEffect(() => {
    const checkImages = async () => {
      if (getQuoteData) {
        try {
          const data = typeof getQuoteData === 'function' ? await getQuoteData() : getQuoteData;
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

  // Reset local state when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setQuoteError(null);
      setAddedToCartData(null);
    }
  }, [isOpen]);

  // Fetch quote with debounce when quantities change in the quantity step
  const fetchQuote = async () => {
    if (totalQuantity === 0) return;

    setQuoteLoading(true);
    setQuoteError(null);

    try {
      let quoteParams: { sidesUsed: string[]; layerCount: number } = { sidesUsed: ['front'], layerCount: 0 };
      if (getQuoteData) {
        const data = await (typeof getQuoteData === 'function' ? getQuoteData() : Promise.resolve(getQuoteData));
        quoteParams = data;
      }

      if (designId) {
        const response = await designLabApi.requestQuote(designId, {
          quantity: totalQuantity,
          sidesUsed: quoteParams.sidesUsed,
          layerCount: quoteParams.layerCount,
          sizeQuantities: sizeQuantities.filter(sq => sq.quantity > 0),
          printMethod,
          printSize,
        }) as any;

        if (response && response.data) {
          setQuoteData(response.data);
        } else {
          throw new Error('Failed to get price quote');
        }
      } else {
        setQuoteData({ unitPrice: 0, total: 0, discountedUnitPrice: 0, currency: 'USD', breakdown: { quantityDiscount: 0 } });
      }
    } catch (error: any) {
      console.error('[GetPriceFlowModal] Error fetching quote:', error);
      setQuoteError(error?.message || 'Failed to get price quote.');
    } finally {
      setQuoteLoading(false);
    }
  };

  // Debounced quote fetch when on quantity step
  useEffect(() => {
    if (currentStep !== 'quantity' || totalQuantity === 0) return;
    const timer = setTimeout(() => {
      if (!quoteLoading) fetchQuote();
    }, 700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, totalQuantity, JSON.stringify(sizeQuantities), printMethod, printSize, designId]);

  // Handle size quantity input change
  const handleSizeQtyChange = (size: string, value: number) => {
    const qty = Math.max(0, value);
    setSizeQuantities(prev => {
      const existing = prev.find(sq => sq.size === size);
      if (existing) return prev.map(sq => sq.size === size ? { ...sq, quantity: qty } : sq);
      return [...prev, { size, quantity: qty }];
    });
    setQuoteData(null);
  };

  // Add to cart handler — calls cartApi directly
  const handleAddToCart = async (redirectToCheckout = false) => {
    if (!variantId) {
      setQuoteError('No product variant selected. Please select a product first.');
      return;
    }

    setIsAddingToCart(true);
    setQuoteError(null);

    try {
      const activeSizes = sizeQuantities.filter(sq => sq.quantity > 0);

      await cartApi.addItem(
        variantId,
        totalQuantity,
        designId || undefined,
        activeSizes,
        { printMethod, printSize, quoteData }
      );

      if (needsContentCheck) setNeedsContentCheck(false);

      if (redirectToCheckout) {
        window.location.href = '/checkout';
      } else {
        setAddedToCartData({ sizeQuantities: activeSizes, totalQuantity, quoteData });
        setCurrentStep('added-to-cart');
      }
    } catch (error) {
      console.error('[GetPriceFlowModal] Error adding to cart:', error);
      setQuoteError('Failed to add to cart. Please try again.');
    } finally {
      setIsAddingToCart(false);
    }
  };

  // ─── Step 1: Print Method ─────────────────────────────────────────────────
  const renderPrintMethodStep = () => {
    const p = printPricing;
    const dtfOptions: Array<{ value: PrintSize; label: string; price: number; desc: string }> = [
      { value: 'small',  label: p?.dtf.small.label  ?? 'Under 5"',  price: p?.dtf.small.price  ?? 5.99,  desc: p?.dtf.small.desc  ?? 'Left chest / small logo' },
      { value: 'medium', label: p?.dtf.medium.label ?? '5" – 11"',  price: p?.dtf.medium.price ?? 8.99,  desc: p?.dtf.medium.desc ?? 'Standard front print' },
      { value: 'large',  label: p?.dtf.large.label  ?? '11" – 22"', price: p?.dtf.large.price  ?? 11.99, desc: p?.dtf.large.desc  ?? 'Full front / back' },
    ];
    const embroideryOptions: Array<{ value: PrintSize; label: string; price: number; desc: string }> = [
      { value: 'small',  label: p?.embroidery.small.label  ?? 'Under 5"',  price: p?.embroidery.small.price  ?? 14.99, desc: p?.embroidery.small.desc  ?? 'Left chest / small logo' },
      { value: 'medium', label: p?.embroidery.medium.label ?? '5" – 11"',  price: p?.embroidery.medium.price ?? 24.99, desc: p?.embroidery.medium.desc ?? 'Standard / medium' },
      { value: 'large',  label: p?.embroidery.large.label  ?? '11" – 22"', price: p?.embroidery.large.price  ?? 24.99, desc: p?.embroidery.large.desc  ?? 'Large area' },
    ];
    const sizeOptions = printMethod === 'dtf' ? dtfOptions : embroideryOptions;
    const validPrintSize = sizeOptions.find(o => o.value === printSize) ? printSize : sizeOptions[0].value;

    return (
      <div className="dl-get-price-flow__step">
        <h2 className="dl-get-price-flow__step-title">Print Method</h2>
        <p className="dl-get-price-flow__step-description">Choose how your design will be printed</p>

        <div className="dl-get-price-flow__method-row">
          {[
            { value: 'dtf' as PrintMethod, label: 'DTF Print', icon: '🖨️', desc: 'Full color, photo-quality' },
            { value: 'embroidery' as PrintMethod, label: 'Embroidery', icon: '🧵', desc: 'Stitched, premium feel' },
          ].map(opt => (
            <button
              key={opt.value}
              className={`dl-get-price-flow__method-card${printMethod === opt.value ? ' is-selected' : ''}`}
              onClick={() => {
                setPrintMethod(opt.value);
                if (opt.value === 'embroidery' && printSize === 'large') setPrintSize('medium');
              }}
            >
              <span className="dl-get-price-flow__method-icon">{opt.icon}</span>
              <span className="dl-get-price-flow__method-label">{opt.label}</span>
              <span className="dl-get-price-flow__method-desc">{opt.desc}</span>
            </button>
          ))}
        </div>

        <div style={{ marginTop: '24px' }}>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '12px', fontWeight: 600 }}>
            Print Size <span style={{ fontWeight: 400 }}>(per location)</span>
          </p>
          <div className="dl-get-price-flow__size-option-row">
            {sizeOptions.map(opt => (
              <button
                key={opt.value}
                className={`dl-get-price-flow__size-option-card${validPrintSize === opt.value ? ' is-selected' : ''}`}
                onClick={() => setPrintSize(opt.value)}
              >
                <span className="dl-get-price-flow__size-option-label">{opt.label}</span>
                <span className="dl-get-price-flow__size-option-price">${opt.price.toFixed(2)}</span>
                <span className="dl-get-price-flow__size-option-desc">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          className="dl-modal__btn dl-modal__btn--primary"
          style={{ marginTop: '28px', width: '100%' }}
          onClick={() => setCurrentStep('quantity')}
        >
          Continue
        </button>
      </div>
    );
  };

  // ─── Step 2: Sizes & Quantities ───────────────────────────────────────────
  const renderQuantityStep = () => {
    const thumbUrl = (() => {
      if (!variants || variants.length === 0) return null;
      const selected = variantId ? variants.find((v: any) => v.id === variantId) : null;
      const v = selected || variants[0];
      return v.imageUrl || v.image || v.thumbnailUrl || null;
    })();

    const printSizeLabel = printSize === 'small' ? 'Under 5"' : printSize === 'medium' ? '5"–11"' : '11"–22"';
    const methodLabel = printMethod === 'dtf' ? '🖨️ DTF Print' : '🧵 Embroidery';

    const renderSizesRow = (sizes: string[]) => (
      <div className="gp-sizes-row">
        {sizes.map(size => {
          const adj = sizeAdjustments[size] || 0;
          const qty = sizeQuantities.find(sq => sq.size === size)?.quantity || 0;
          return (
            <div key={size} className="gp-size-col">
              <span className="gp-size-col-label">{size}</span>
              <input
                type="number"
                min="0"
                value={qty === 0 ? '' : qty}
                placeholder="0"
                className={`gp-size-input-box${qty > 0 ? ' has-val' : ''}`}
                onChange={(e) => handleSizeQtyChange(size, parseInt(e.target.value) || 0)}
              />
              {adj > 0
                ? <span className="gp-size-surcharge">+${adj.toFixed(2)}</span>
                : <span className="gp-size-surcharge gp-size-surcharge--empty" />
              }
            </div>
          );
        })}
      </div>
    );

    return (
      <div className="dl-get-price-flow__step">
        <h2 className="dl-get-price-flow__step-title">Sizes &amp; Quantities</h2>

        {/* Product card */}
        <div className="gp-product-card">
          {thumbUrl ? (
            <img src={thumbUrl} className="gp-product-thumb" alt={typeof productName === 'string' ? productName : ''} />
          ) : (
            <div className="gp-product-thumb gp-product-thumb--placeholder">
              {(typeof productName === 'string' ? productName : '').charAt(0).toUpperCase() || 'P'}
            </div>
          )}

          <div className="gp-product-info">
            <div className="gp-product-name">{typeof productName === 'string' ? productName : ''}</div>
            <div className="gp-product-meta">{methodLabel} · {printSizeLabel}</div>

            {/* Adult sizes */}
            <div className="gp-sizes-section">
              <div className="gp-sizes-section-label">Adult</div>
              {renderSizesRow(adultSizes)}
            </div>

            {/* Youth sizes */}
            {youthSizes.length > 0 && (
              <div className="gp-sizes-section">
                <div className="gp-sizes-section-label">Youth</div>
                {renderSizesRow(youthSizes)}
              </div>
            )}
          </div>
        </div>

        {/* Inline price summary */}
        <div className="gp-inline-price-summary">
          {quantityTiers.length > 0 && (
            <div className="gp-tier-hint">
              <span className="gp-tier-hint__icon">🏷️</span>
              {[...quantityTiers].sort((a, b) => a.minQty - b.minQty).map((t, i, arr) => (
                <React.Fragment key={t.minQty}>
                  <span className={`gp-tier-hint__item${totalQuantity >= t.minQty ? ' is-active' : ''}`}>
                    {t.minQty}+ pcs · {t.discount}% off
                  </span>
                  {i < arr.length - 1 && <span className="gp-tier-hint__sep">·</span>}
                </React.Fragment>
              ))}
            </div>
          )}
          {totalQuantity === 0 ? (
            <span className="gp-price-hint">Enter quantities above to see pricing</span>
          ) : quoteLoading ? (
            <span className="gp-price-loading">Calculating price…</span>
          ) : quoteData ? (
            <div className="gp-price-breakdown">
              {/* Common per-item fees */}
              <div className="gp-price-breakdown-rows">
                {(quoteData.breakdown?.basePrice ?? 0) > 0 && (
                  <div className="gp-price-breakdown-row gp-price-breakdown-row--muted">
                    <span className="gp-price-breakdown-label">Base price</span>
                    <span className="gp-price-breakdown-val">${(quoteData.breakdown.basePrice).toFixed(2)}/item</span>
                  </div>
                )}
                {(quoteData.breakdown?.printMethodFee ?? 0) > 0 && (
                  <div className="gp-price-breakdown-row gp-price-breakdown-row--muted">
                    <span className="gp-price-breakdown-label">
                      {quoteData.breakdown.printMethod === 'embroidery' ? 'Embroidery' : 'DTF print'} ({quoteData.breakdown.printSize})
                    </span>
                    <span className="gp-price-breakdown-val">+${(quoteData.breakdown.printMethodFee).toFixed(2)}/item</span>
                  </div>
                )}
                {(quoteData.breakdown?.sidesFee ?? 0) > 0 && (
                  <div className="gp-price-breakdown-row gp-price-breakdown-row--muted">
                    <span className="gp-price-breakdown-label">Extra print sides ×{quoteData.breakdown.sidesCount - 1}</span>
                    <span className="gp-price-breakdown-val">+${(quoteData.breakdown.sidesFee).toFixed(2)}/item</span>
                  </div>
                )}
                {(quoteData.breakdown?.layersFee ?? 0) > 0 && (
                  <div className="gp-price-breakdown-row gp-price-breakdown-row--muted">
                    <span className="gp-price-breakdown-label">Design complexity</span>
                    <span className="gp-price-breakdown-val">+${(quoteData.breakdown.layersFee).toFixed(2)}/item</span>
                  </div>
                )}
              </div>
              {/* Per-size line items */}
              <div className="gp-price-breakdown-sizes">
                {sizeQuantities.filter(sq => sq.quantity > 0).map(sq => {
                  const surcharge = sizeAdjustments[sq.size] || 0;
                  const basePricePerItem = (quoteData.breakdown?.basePrice ?? 0)
                    + surcharge
                    + (quoteData.breakdown?.printMethodFee ?? 0)
                    + (quoteData.breakdown?.sidesFee ?? 0)
                    + (quoteData.breakdown?.layersFee ?? 0);
                  const lineTotal = basePricePerItem * sq.quantity;
                  return (
                    <div key={sq.size} className="gp-price-breakdown-row gp-price-breakdown-row--size">
                      <span className="gp-price-breakdown-label">
                        {sq.size}
                        {surcharge > 0 && <span className="gp-price-size-surcharge"> +${surcharge.toFixed(2)}</span>}
                        {' '}× {sq.quantity}
                      </span>
                      <span className="gp-price-breakdown-val">${lineTotal.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
              {/* Grand total */}
              <div className="gp-price-breakdown-total">
                <div className="gp-price-breakdown-grand">
                  Total ({totalQuantity} item{totalQuantity !== 1 ? 's' : ''}): <strong>${(quoteData.total || 0).toFixed(2)}</strong>
                </div>
              </div>
              {(quoteData.breakdown?.quantityDiscount ?? 0) > 0 && (
                <div className="gp-price-discount">Bulk discount applied — saved ${(quoteData.discount || 0).toFixed(2)}</div>
              )}
            </div>
          ) : quoteError ? (
            <div className="gp-price-error-row">
              <span className="gp-price-error">{quoteError}</span>
              <button className="gp-price-retry" onClick={fetchQuote}>Retry</button>
            </div>
          ) : null}
        </div>

        {/* CTA row */}
        <div className="gp-cta-row">
          <button
            className="dl-modal__btn dl-modal__btn--secondary"
            disabled={totalQuantity === 0 || isAddingToCart}
            onClick={() => {
              if (needsContentCheck && hasUploadedImages) setCurrentStep('content-check');
              else handleAddToCart(false);
            }}
          >
            {isAddingToCart ? 'Adding…' : 'Add to Cart'}
          </button>
          <button
            className="gp-btn-checkout"
            disabled={totalQuantity === 0 || isAddingToCart}
            onClick={() => {
              if (needsContentCheck && hasUploadedImages) setCurrentStep('content-check');
              else handleAddToCart(true);
            }}
          >
            {isAddingToCart ? 'Processing…' : 'Buy Now →'}
          </button>
        </div>
      </div>
    );
  };

  // ─── Content Check ────────────────────────────────────────────────────────
  const renderContentCheckStep = () => (
    <div className="dl-get-price-flow__step">
      <h2 className="dl-get-price-flow__step-title">Content Check</h2>
      <p className="dl-get-price-flow__step-description">
        By continuing, you confirm that any uploaded images comply with our content standards and copyright requirements.
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
        <button className="dl-modal__btn dl-modal__btn--secondary" onClick={onClose}>
          Edit Design
        </button>
        <button
          className="dl-modal__btn dl-modal__btn--primary"
          onClick={() => { setNeedsContentCheck(false); handleAddToCart(false); }}
          disabled={isAddingToCart}
        >
          {isAddingToCart ? 'Adding...' : 'Agree & Continue'}
        </button>
      </div>
    </div>
  );

  // ─── Added to Cart ────────────────────────────────────────────────────────
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
            onClick={() => { if (typeof window !== 'undefined') window.location.href = '/checkout'; }}
          >
            Go to Checkout
          </button>
        </div>

        <div className="dl-get-price-flow__want-more">
          <p className="dl-get-price-flow__want-more-title">Want to add more?</p>
          <div className="dl-get-price-flow__want-more-options">
            <button
              className="dl-get-price-flow__want-more-btn"
              onClick={() => { if (typeof window !== 'undefined') window.location.href = '/products'; }}
            >
              Browse the catalog
            </button>
            <button className="dl-get-price-flow__want-more-btn" onClick={onClose}>
              Start from this design
            </button>
            <button
              className="dl-get-price-flow__want-more-btn"
              onClick={() => { if (typeof window !== 'undefined') window.location.href = '/design-lab'; }}
            >
              Start a new design
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="dl-modal-overlay">
      <div className="dl-modal dl-get-price-flow-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dl-modal__header">
          <h2 className="dl-modal__title">Get Price</h2>
          <button className="dl-modal__close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="dl-modal__body">
          {/* Step indicator — 3 steps */}
          <div className="dl-get-price-flow__steps-indicator">
            <div
              className={`dl-get-price-flow__step-indicator ${currentStep === 'print-method' ? 'is-active' : 'is-completed'}`}
              onClick={() => setCurrentStep('print-method')}
              style={{ cursor: 'pointer' }}
            >
              <span>1</span>
              <span>Method</span>
            </div>
            <div
              className={`dl-get-price-flow__step-indicator ${
                currentStep === 'quantity' || currentStep === 'content-check' ? 'is-active'
                : currentStep === 'added-to-cart' ? 'is-completed'
                : ''
              }`}
              onClick={() => setCurrentStep('quantity')}
              style={{ cursor: 'pointer' }}
            >
              <span>2</span>
              <span>Quantity</span>
            </div>
            <div
              className={`dl-get-price-flow__step-indicator ${currentStep === 'added-to-cart' ? 'is-active' : ''}`}
            >
              <span>3</span>
              <span>Done</span>
            </div>
          </div>

          {/* Step content */}
          {currentStep === 'print-method' && renderPrintMethodStep()}
          {currentStep === 'quantity' && renderQuantityStep()}
          {currentStep === 'content-check' && renderContentCheckStep()}
          {currentStep === 'added-to-cart' && renderAddedToCartStep()}
        </div>
      </div>
    </div>
  );
};

export default GetPriceFlowModal;
