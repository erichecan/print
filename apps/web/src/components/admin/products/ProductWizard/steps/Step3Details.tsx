'use client';

/**
 * Step 3: Details Component
 * 步骤3：详情完善（定价、库存、运输、Printable Area配置）
 * Created: 2025-01-06
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useProductWizard } from '../ProductWizard';
import { adminReviewsApi } from '@/lib/api';

const parseNumber = (value: any): number => {
  if (value === '' || value === undefined || value === null) return 0;
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export function Step3Details() {
  const { wizardData, updateWizardData, nextStep, prevStep, saveDraft, isLoading } =
    useProductWizard();

  const productId = (wizardData as any).productId as string | undefined;
  const [reviewsEnabled, setReviewsEnabled] = useState(true);
  const [maxDisplayCount, setMaxDisplayCount] = useState(10);
  const [reviewSettingsSaving, setReviewSettingsSaving] = useState(false);
  const [reviewSettingsSaved, setReviewSettingsSaved] = useState(false);

  useEffect(() => {
    if (!productId) return;
    adminReviewsApi.getSettings(productId).then((data) => {
      setReviewsEnabled(data.reviewsEnabled ?? true);
      setMaxDisplayCount(data.maxDisplayCount ?? 10);
    }).catch(() => {});
  }, [productId]);

  const saveReviewSettings = useCallback(async () => {
    if (!productId) return;
    setReviewSettingsSaving(true);
    try {
      await adminReviewsApi.updateSettings(productId, { reviewsEnabled, maxDisplayCount });
      setReviewSettingsSaved(true);
      setTimeout(() => setReviewSettingsSaved(false), 2000);
    } finally {
      setReviewSettingsSaving(false);
    }
  }, [productId, reviewsEnabled, maxDisplayCount]);

  // Auto-calculate gross profit
  useEffect(() => {
    const basePrice = wizardData.basePrice || 0;
    const salePrice = wizardData.salePrice;
    const unitCost = wizardData.unitCost || 0;
    const price = salePrice && salePrice > 0 ? salePrice : basePrice;
    const profit = price - unitCost;
    updateWizardData({ grossProfit: Number(profit.toFixed(2)) });
  }, [wizardData.basePrice, wizardData.salePrice, wizardData.unitCost, updateWizardData]);

  // Auto-calculate total stock from variants
  useEffect(() => {
    if (wizardData.variantCombinations && wizardData.variantCombinations.length > 0) {
      const enabledCombinations = wizardData.variantCombinations.filter((c) => c.enabled);
      if (enabledCombinations.length > 0) {
        const total = enabledCombinations.reduce((sum, c) => sum + (c.stockQuantity || 0), 0);
        if (total !== wizardData.stockQuantity) {
          updateWizardData({ stockQuantity: total });
        }
      }
    }
  }, [wizardData.variantCombinations, updateWizardData, wizardData.stockQuantity]);

  // Local state for numeric inputs to handle intermediate string states (like "0.")
  const [localBasePrice, setLocalBasePrice] = React.useState<string>(
    wizardData.basePrice?.toString() ?? ''
  );
  const [localSalePrice, setLocalSalePrice] = React.useState<string>(
    wizardData.salePrice?.toString() ?? ''
  );
  const [localUnitCost, setLocalUnitCost] = React.useState<string>(
    wizardData.unitCost?.toString() ?? ''
  );

  // Sync from wizardData when it changes externally (e.g. initial load)
  useEffect(() => {
    if (wizardData.basePrice !== undefined && parseNumber(localBasePrice) !== wizardData.basePrice) {
      setLocalBasePrice(wizardData.basePrice.toString());
    }
  }, [wizardData.basePrice]);

  useEffect(() => {
    if (wizardData.salePrice !== undefined && parseNumber(localSalePrice) !== wizardData.salePrice) {
      setLocalSalePrice(wizardData.salePrice.toString());
    }
  }, [wizardData.salePrice]);

  useEffect(() => {
    if (wizardData.unitCost !== undefined && parseNumber(localUnitCost) !== wizardData.unitCost) {
      setLocalUnitCost(wizardData.unitCost.toString());
    }
  }, [wizardData.unitCost]);

  const handleChange = (field: string, value: any) => {
    updateWizardData({ [field]: value });
  };

  const margin =
    wizardData.basePrice && wizardData.basePrice > 0
      ? Math.round(
        ((wizardData.basePrice - (wizardData.unitCost || 0)) / wizardData.basePrice) * 100
      )
      : 0;

  return (
    <div className="step3-details">
      <div className="step3-details__layout">
        {/* Pricing Section */}
        <div className="step3-details__section">
          <h2 className="section-title">定价</h2>
          <div className="form-row">
            <div className="form-field">
              <label className="form-field__label">
                基础价格 <span className="required">*</span>
              </label>
              <div className="input-prefix">
                <span>$</span>
                <input
                  type="number"
                  step="0.01"
                  className="form-field__input"
                  placeholder="0.00"
                  value={localBasePrice}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLocalBasePrice(val);
                    handleChange('basePrice', parseNumber(val));
                  }}
                />
              </div>
            </div>
            <div className="form-field">
              <label className="form-field__label">促销价格</label>
              <div className="input-prefix">
                <span>$</span>
                <input
                  type="number"
                  step="0.01"
                  className="form-field__input"
                  placeholder="0.00"
                  value={localSalePrice}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLocalSalePrice(val);
                    handleChange('salePrice', val ? parseNumber(val) : undefined);
                  }}
                />
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label className="form-field__label">单位成本</label>
              <div className="input-prefix">
                <span>$</span>
                <input
                  type="number"
                  step="0.01"
                  className="form-field__input"
                  placeholder="0.00"
                  value={localUnitCost}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLocalUnitCost(val);
                    handleChange('unitCost', val ? parseNumber(val) : undefined);
                  }}
                />
              </div>
              <small className="form-field__hint">客户不可见</small>
            </div>
            <div className="form-field">
              <label className="form-field__label">毛利</label>
              <div className="input-prefix input-disabled">
                <span>$</span>
                <input
                  type="text"
                  className="form-field__input"
                  disabled
                  value={wizardData.grossProfit?.toFixed(2) || '--'}
                />
              </div>
            </div>
            <div className="form-field">
              <label className="form-field__label">利润率</label>
              <div className="input-prefix input-disabled">
                <span>%</span>
                <input
                  type="text"
                  className="form-field__input"
                  disabled
                  value={wizardData.basePrice ? `${margin}%` : '--'}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Inventory Section */}
        <div className="step3-details__section">
          <h2 className="section-title">库存</h2>
          <div className="form-row">
            <div className="form-field">
              <label className="form-field__label">
                SKU (库存单位) <span className="required">*</span>
              </label>
              <input
                type="text"
                className="form-field__input"
                value={wizardData.sku || ''}
                onChange={(e) => handleChange('sku', e.target.value)}
                placeholder="例如：TSH-001"
              />
            </div>
          </div>

          <div className="form-field">
            <label className="form-field__label">总库存数量</label>
            <input
              type="number"
              className="form-field__input"
              value={wizardData.stockQuantity || ''}
              onChange={(e) => handleChange('stockQuantity', parseNumber(e.target.value))}
            />
            <small className="form-field__hint">
              {wizardData.variantCombinations &&
                wizardData.variantCombinations.filter((c) => c.enabled).length > 0
                ? '多规格产品将自动汇总各变体库存'
                : '单规格产品直接输入总库存'}
            </small>
          </div>

          {/* Variant Stock Table */}
          {wizardData.variantCombinations &&
            wizardData.variantCombinations.filter((c) => c.enabled).length > 0 && (
              <div className="variant-stock-table">
                <div className="variant-stock-header">
                  <div className="variant-stock-cell">变体</div>
                  <div className="variant-stock-cell">SKU</div>
                  <div className="variant-stock-cell">库存</div>
                </div>
                {wizardData.variantCombinations.map((combo, index) => {
                  if (!combo.enabled) return null;
                  return (
                    <div key={`${combo.color}-${combo.size}`} className="variant-stock-row">
                      <div className="variant-stock-cell">
                        <span
                          className="color-dot"
                          style={{
                            backgroundColor:
                              wizardData.colors?.find((c) => c.color === combo.color)
                                ?.colorHex || '#ccc',
                          }}
                        />
                        {wizardData.colors?.find((c) => c.color === combo.color)?.displayName || combo.color}
                        {' / '}
                        {combo.size}
                      </div>
                      <div className="variant-stock-cell text-small text-muted">{combo.sku || '-'}</div>
                      <div className="variant-stock-cell">
                        <input
                          type="number"
                          min="0"
                          className="form-field__input stock-input"
                          value={combo.stockQuantity !== undefined ? combo.stockQuantity : ''}
                          placeholder="0"
                          onChange={(e) => {
                            const val = e.target.value === '' ? undefined : parseNumber(e.target.value);
                            const newCombinations = [...(wizardData.variantCombinations || [])];
                            if (newCombinations[index]) {
                              newCombinations[index] = {
                                ...newCombinations[index],
                                stockQuantity: val !== undefined ? val : 0,
                              };
                              updateWizardData({ variantCombinations: newCombinations });
                            }
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </div>

        {/* Shipping Section */}
        <div className="step3-details__section">
          <h2 className="section-title">运输</h2>
          <div className="form-row">
            <div className="form-field">
              <label className="form-field__label">重量</label>
              <div className="input-suffix">
                <input
                  type="number"
                  step="0.01"
                  className="form-field__input"
                  placeholder="0.0"
                  value={wizardData.weight || ''}
                  onChange={(e) =>
                    handleChange('weight', e.target.value ? parseNumber(e.target.value) : undefined)
                  }
                />
                <span>kg</span>
              </div>
            </div>
            <div className="form-field">
              <label className="form-field__label">尺寸</label>
              <input
                type="text"
                className="form-field__input"
                placeholder="L x W x H"
                value={wizardData.dimensions || ''}
                onChange={(e) => handleChange('dimensions', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Printable Area Configuration */}
        <div className="step3-details__section">
          <h2 className="section-title">可打印区域配置 (Design Lab)</h2>
          <p className="section-description">
            定义每个视图的可打印区域。默认值 (T恤): 546x960。
            坐标基于 1200x1440 画布。
          </p>

          <div className="printable-area-grid">
            {/* Front View */}
            <div className="printable-area-section">
              <h4 className="printable-area-title">正面视图</h4>
              <div className="printable-area-fields">
                <div className="form-field">
                  <label className="form-field__label">宽度</label>
                  <input
                    type="number"
                    className="form-field__input"
                    value={wizardData.printableArea?.front?.width || 546}
                    onChange={(e) => {
                      const current = wizardData.printableArea || {
                        front: { width: 546, height: 960, x: 326, y: 240 },
                        back: { width: 546, height: 960, x: 326, y: 240 },
                        sleeve: { width: 500, height: 500, x: 600, y: 300 },
                      };
                      updateWizardData({
                        printableArea: {
                          ...current,
                          front: {
                            ...current.front,
                            width: parseNumber(e.target.value),
                          },
                        },
                      });
                    }}
                  />
                </div>
                <div className="form-field">
                  <label className="form-field__label">高度</label>
                  <input
                    type="number"
                    className="form-field__input"
                    value={wizardData.printableArea?.front?.height || 960}
                    onChange={(e) => {
                      const current = wizardData.printableArea || {
                        front: { width: 546, height: 960, x: 326, y: 240 },
                        back: { width: 546, height: 960, x: 326, y: 240 },
                        sleeve: { width: 500, height: 500, x: 600, y: 300 },
                      };
                      updateWizardData({
                        printableArea: {
                          ...current,
                          front: {
                            ...current.front,
                            height: parseNumber(e.target.value),
                          },
                        },
                      });
                    }}
                  />
                </div>
                <div className="form-field">
                  <label className="form-field__label">偏移 X</label>
                  <input
                    type="number"
                    className="form-field__input"
                    value={wizardData.printableArea?.front?.x || 326}
                    onChange={(e) => {
                      const current = wizardData.printableArea || {
                        front: { width: 546, height: 960, x: 326, y: 240 },
                        back: { width: 546, height: 960, x: 326, y: 240 },
                        sleeve: { width: 500, height: 500, x: 600, y: 300 },
                      };
                      updateWizardData({
                        printableArea: {
                          ...current,
                          front: {
                            ...current.front,
                            x: parseNumber(e.target.value),
                          },
                        },
                      });
                    }}
                  />
                </div>
                <div className="form-field">
                  <label className="form-field__label">偏移 Y</label>
                  <input
                    type="number"
                    className="form-field__input"
                    value={wizardData.printableArea?.front?.y || 240}
                    onChange={(e) => {
                      const current = wizardData.printableArea || {
                        front: { width: 546, height: 960, x: 326, y: 240 },
                        back: { width: 546, height: 960, x: 326, y: 240 },
                        sleeve: { width: 500, height: 500, x: 600, y: 300 },
                      };
                      updateWizardData({
                        printableArea: {
                          ...current,
                          front: {
                            ...current.front,
                            y: parseNumber(e.target.value),
                          },
                        },
                      });
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Back View */}
            <div className="printable-area-section">
              <h4 className="printable-area-title">背面视图</h4>
              <div className="printable-area-fields">
                <div className="form-field">
                  <label className="form-field__label">宽度</label>
                  <input
                    type="number"
                    className="form-field__input"
                    value={wizardData.printableArea?.back?.width || 546}
                    onChange={(e) => {
                      const current = wizardData.printableArea || {
                        front: { width: 546, height: 960, x: 326, y: 240 },
                        back: { width: 546, height: 960, x: 326, y: 240 },
                        sleeve: { width: 500, height: 500, x: 600, y: 300 },
                      };
                      updateWizardData({
                        printableArea: {
                          ...current,
                          back: {
                            ...current.back,
                            width: parseNumber(e.target.value),
                          },
                        },
                      });
                    }}
                  />
                </div>
                <div className="form-field">
                  <label className="form-field__label">高度</label>
                  <input
                    type="number"
                    className="form-field__input"
                    value={wizardData.printableArea?.back?.height || 960}
                    onChange={(e) => {
                      const current = wizardData.printableArea || {
                        front: { width: 546, height: 960, x: 326, y: 240 },
                        back: { width: 546, height: 960, x: 326, y: 240 },
                        sleeve: { width: 500, height: 500, x: 600, y: 300 },
                      };
                      updateWizardData({
                        printableArea: {
                          ...current,
                          back: {
                            ...current.back,
                            height: parseNumber(e.target.value),
                          },
                        },
                      });
                    }}
                  />
                </div>
                <div className="form-field">
                  <label className="form-field__label">偏移 X</label>
                  <input
                    type="number"
                    className="form-field__input"
                    value={wizardData.printableArea?.back?.x || 326}
                    onChange={(e) => {
                      const current = wizardData.printableArea || {
                        front: { width: 546, height: 960, x: 326, y: 240 },
                        back: { width: 546, height: 960, x: 326, y: 240 },
                        sleeve: { width: 500, height: 500, x: 600, y: 300 },
                      };
                      updateWizardData({
                        printableArea: {
                          ...current,
                          back: {
                            ...current.back,
                            x: parseNumber(e.target.value),
                          },
                        },
                      });
                    }}
                  />
                </div>
                <div className="form-field">
                  <label className="form-field__label">偏移 Y</label>
                  <input
                    type="number"
                    className="form-field__input"
                    value={wizardData.printableArea?.back?.y || 240}
                    onChange={(e) => {
                      const current = wizardData.printableArea || {
                        front: { width: 546, height: 960, x: 326, y: 240 },
                        back: { width: 546, height: 960, x: 326, y: 240 },
                        sleeve: { width: 500, height: 500, x: 600, y: 300 },
                      };
                      updateWizardData({
                        printableArea: {
                          ...current,
                          back: {
                            ...current.back,
                            y: parseNumber(e.target.value),
                          },
                        },
                      });
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Sleeve View */}
            <div className="printable-area-section">
              <h4 className="printable-area-title">袖子视图 (共享)</h4>
              <div className="printable-area-fields">
                <div className="form-field">
                  <label className="form-field__label">宽度</label>
                  <input
                    type="number"
                    className="form-field__input"
                    value={wizardData.printableArea?.sleeve?.width || 500}
                    onChange={(e) => {
                      const current = wizardData.printableArea || {
                        front: { width: 546, height: 960, x: 326, y: 240 },
                        back: { width: 546, height: 960, x: 326, y: 240 },
                        sleeve: { width: 500, height: 500, x: 600, y: 300 },
                      };
                      updateWizardData({
                        printableArea: {
                          ...current,
                          sleeve: {
                            ...current.sleeve,
                            width: parseNumber(e.target.value),
                          },
                        },
                      });
                    }}
                  />
                </div>
                <div className="form-field">
                  <label className="form-field__label">高度</label>
                  <input
                    type="number"
                    className="form-field__input"
                    value={wizardData.printableArea?.sleeve?.height || 500}
                    onChange={(e) => {
                      const current = wizardData.printableArea || {
                        front: { width: 546, height: 960, x: 326, y: 240 },
                        back: { width: 546, height: 960, x: 326, y: 240 },
                        sleeve: { width: 500, height: 500, x: 600, y: 300 },
                      };
                      updateWizardData({
                        printableArea: {
                          ...current,
                          sleeve: {
                            ...current.sleeve,
                            height: parseNumber(e.target.value),
                          },
                        },
                      });
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Review Settings */}
      {productId && (
        <div className="step3-details__section">
          <h2 className="section-title">评论设置</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={reviewsEnabled}
                onChange={(e) => setReviewsEnabled(e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              <span style={{ fontSize: 14, fontWeight: 500 }}>启用评论区</span>
            </label>
            <div className="form-field" style={{ maxWidth: 200 }}>
              <label className="form-field__label">最多显示条数</label>
              <input
                type="number"
                min={1}
                max={500}
                className="form-field__input"
                value={maxDisplayCount}
                onChange={(e) => setMaxDisplayCount(Math.max(1, parseInt(e.target.value) || 10))}
              />
            </div>
            <div>
              <button
                type="button"
                className="btn btn--primary"
                onClick={saveReviewSettings}
                disabled={reviewSettingsSaving}
                style={{ width: 'fit-content' }}
              >
                {reviewSettingsSaving ? '保存中...' : reviewSettingsSaved ? '已保存 ✓' : '保存评论设置'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="step3-details__actions">
        <button type="button" className="btn btn--secondary" onClick={prevStep}>
          上一步
        </button>
        <div className="step3-details__actions-right">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={saveDraft}
            disabled={isLoading}
          >
            {isLoading ? '保存中...' : '保存草稿'}
          </button>
          <button type="button" className="btn btn--primary" onClick={nextStep}>
            下一步：预览发布
          </button>
        </div>
      </div>

      <style jsx>{`
        .step3-details {
          display: flex;
          flex-direction: column;
          min-height: calc(100vh - 200px);
        }

        .step3-details__layout {
          flex: 1;
          max-width: 1000px;
          margin: 0 auto;
          width: 100%;
        }

        .step3-details__section {
          background: #fff;
          border-radius: 8px;
          padding: 24px;
          margin-bottom: 24px;
          border: 1px solid #e1e3e5;
        }

        .section-title {
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 20px 0;
          color: #202223;
        }

        .section-description {
          font-size: 14px;
          color: #6d7175;
          margin: 0 0 16px 0;
        }

        .form-row {
          display: flex;
          gap: 16px;
        }

        .form-row .form-field {
          flex: 1;
        }

        .form-field {
          margin-bottom: 16px;
        }

        .form-field__label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 8px;
          color: #202223;
        }

        .required {
          color: #e74c3c;
        }

        .form-field__input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #c9cccf;
          border-radius: 4px;
          font-size: 14px;
          color: #202223;
          transition: border-color 0.2s;
        }

        .form-field__input:focus {
          border-color: #005bd3;
          outline: none;
          box-shadow: 0 0 0 1px #005bd3;
        }

        .form-field__input:disabled {
          background: #f6f6f7;
          color: #8c9196;
        }

        .form-field__hint {
          font-size: 12px;
          color: #6d7175;
          margin-top: 4px;
          display: block;
        }

        .input-prefix,
        .input-suffix {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-prefix span {
          position: absolute;
          left: 10px;
          color: #6d7175;
          z-index: 1;
        }

        .input-prefix input {
          padding-left: 24px !important;
        }

        .input-suffix span {
          position: absolute;
          right: 10px;
          color: #6d7175;
        }

        .input-suffix input {
          padding-right: 32px !important;
        }

        .input-disabled input {
          background-color: #f6f6f7;
          color: #8c9196;
        }

        .printable-area-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
        }

        .printable-area-section {
          border: 1px solid #e1e3e5;
          border-radius: 4px;
          padding: 16px;
          background: #fafbfb;
        }

        .printable-area-title {
          font-size: 16px;
          font-weight: 600;
          margin: 0 0 16px 0;
          color: #202223;
        }

        .printable-area-fields {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .step3-details__actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 0;
          border-top: 1px solid #e1e3e5;
        }

        .step3-details__actions-right {
          display: flex;
          gap: 12px;
        }

        .btn {
          padding: 10px 24px;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn--primary {
          background: #008060;
          color: #fff;
        }

        .btn--primary:hover:not(:disabled) {
          background: #006e52;
        }

        .btn--secondary {
          background: #fff;
          color: #202223;
          border: 1px solid #c9cccf;
        }

        .btn--secondary:hover:not(:disabled) {
          background: #f6f6f7;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .variant-stock-table {
          margin-top: 16px;
          border: 1px solid #e1e3e5;
          border-radius: 4px;
          overflow: hidden;
        }

        .variant-stock-header {
          display: grid;
          grid-template-columns: 2fr 2fr 1fr;
          background: #f6f6f7;
          border-bottom: 1px solid #e1e3e5;
          font-weight: 500;
          font-size: 14px;
        }

        .variant-stock-row {
          display: grid;
          grid-template-columns: 2fr 2fr 1fr;
          border-bottom: 1px solid #e1e3e5;
          align-items: center;
        }

        .variant-stock-row:last-child {
          border-bottom: none;
        }

        .variant-stock-cell {
          padding: 8px 12px;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .stock-input {
          width: 100%;
          text-align: right;
        }

        .color-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 1px solid #dcdcdc;
          display: inline-block;
        }

        .text-small {
          font-size: 12px;
        }
        
        .text-muted {
          color: #6d7175;
        }
      `}</style>
    </div>
  );
}

