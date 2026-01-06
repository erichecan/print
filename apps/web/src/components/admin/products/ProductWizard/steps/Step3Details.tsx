'use client';

/**
 * Step 3: Details Component
 * 步骤3：详情完善（定价、库存、运输、Printable Area配置）
 * Created: 2025-01-06
 */
import React, { useEffect } from 'react';
import { useProductWizard } from '../ProductWizard';

const parseNumber = (value: any): number => {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export function Step3Details() {
  const { wizardData, updateWizardData, nextStep, prevStep, saveDraft, isLoading } =
    useProductWizard();

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
      // This would be calculated from variant stock quantities
      // For now, we keep the stockQuantity field
    }
  }, [wizardData.variantCombinations]);

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
                  value={wizardData.basePrice || ''}
                  onChange={(e) => handleChange('basePrice', parseNumber(e.target.value))}
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
                  value={wizardData.salePrice || ''}
                  onChange={(e) =>
                    handleChange('salePrice', e.target.value ? parseNumber(e.target.value) : undefined)
                  }
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
                  value={wizardData.unitCost || ''}
                  onChange={(e) =>
                    handleChange('unitCost', e.target.value ? parseNumber(e.target.value) : undefined)
                  }
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
                    onChange={(e) =>
                      updateWizardData({
                        printableArea: {
                          ...wizardData.printableArea,
                          front: {
                            ...(wizardData.printableArea?.front || {
                              width: 546,
                              height: 960,
                              x: 326,
                              y: 240,
                            }),
                            width: parseNumber(e.target.value),
                          },
                        },
                      })
                    }
                  />
                </div>
                <div className="form-field">
                  <label className="form-field__label">高度</label>
                  <input
                    type="number"
                    className="form-field__input"
                    value={wizardData.printableArea?.front?.height || 960}
                    onChange={(e) =>
                      updateWizardData({
                        printableArea: {
                          ...wizardData.printableArea,
                          front: {
                            ...(wizardData.printableArea?.front || {
                              width: 546,
                              height: 960,
                              x: 326,
                              y: 240,
                            }),
                            height: parseNumber(e.target.value),
                          },
                        },
                      })
                    }
                  />
                </div>
                <div className="form-field">
                  <label className="form-field__label">偏移 X</label>
                  <input
                    type="number"
                    className="form-field__input"
                    value={wizardData.printableArea?.front?.x || 326}
                    onChange={(e) =>
                      updateWizardData({
                        printableArea: {
                          ...wizardData.printableArea,
                          front: {
                            ...(wizardData.printableArea?.front || {
                              width: 546,
                              height: 960,
                              x: 326,
                              y: 240,
                            }),
                            x: parseNumber(e.target.value),
                          },
                        },
                      })
                    }
                  />
                </div>
                <div className="form-field">
                  <label className="form-field__label">偏移 Y</label>
                  <input
                    type="number"
                    className="form-field__input"
                    value={wizardData.printableArea?.front?.y || 240}
                    onChange={(e) =>
                      updateWizardData({
                        printableArea: {
                          ...wizardData.printableArea,
                          front: {
                            ...(wizardData.printableArea?.front || {
                              width: 546,
                              height: 960,
                              x: 326,
                              y: 240,
                            }),
                            y: parseNumber(e.target.value),
                          },
                        },
                      })
                    }
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
                    onChange={(e) =>
                      updateWizardData({
                        printableArea: {
                          ...wizardData.printableArea,
                          back: {
                            ...(wizardData.printableArea?.back || {
                              width: 546,
                              height: 960,
                              x: 326,
                              y: 240,
                            }),
                            width: parseNumber(e.target.value),
                          },
                        },
                      })
                    }
                  />
                </div>
                <div className="form-field">
                  <label className="form-field__label">高度</label>
                  <input
                    type="number"
                    className="form-field__input"
                    value={wizardData.printableArea?.back?.height || 960}
                    onChange={(e) =>
                      updateWizardData({
                        printableArea: {
                          ...wizardData.printableArea,
                          back: {
                            ...(wizardData.printableArea?.back || {
                              width: 546,
                              height: 960,
                              x: 326,
                              y: 240,
                            }),
                            height: parseNumber(e.target.value),
                          },
                        },
                      })
                    }
                  />
                </div>
                <div className="form-field">
                  <label className="form-field__label">偏移 X</label>
                  <input
                    type="number"
                    className="form-field__input"
                    value={wizardData.printableArea?.back?.x || 326}
                    onChange={(e) =>
                      updateWizardData({
                        printableArea: {
                          ...wizardData.printableArea,
                          back: {
                            ...(wizardData.printableArea?.back || {
                              width: 546,
                              height: 960,
                              x: 326,
                              y: 240,
                            }),
                            x: parseNumber(e.target.value),
                          },
                        },
                      })
                    }
                  />
                </div>
                <div className="form-field">
                  <label className="form-field__label">偏移 Y</label>
                  <input
                    type="number"
                    className="form-field__input"
                    value={wizardData.printableArea?.back?.y || 240}
                    onChange={(e) =>
                      updateWizardData({
                        printableArea: {
                          ...wizardData.printableArea,
                          back: {
                            ...(wizardData.printableArea?.back || {
                              width: 546,
                              height: 960,
                              x: 326,
                              y: 240,
                            }),
                            y: parseNumber(e.target.value),
                          },
                        },
                      })
                    }
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
                    onChange={(e) =>
                      updateWizardData({
                        printableArea: {
                          ...wizardData.printableArea,
                          sleeve: {
                            ...(wizardData.printableArea?.sleeve || {
                              width: 500,
                              height: 500,
                              x: 600,
                              y: 300,
                            }),
                            width: parseNumber(e.target.value),
                          },
                        },
                      })
                    }
                  />
                </div>
                <div className="form-field">
                  <label className="form-field__label">高度</label>
                  <input
                    type="number"
                    className="form-field__input"
                    value={wizardData.printableArea?.sleeve?.height || 500}
                    onChange={(e) =>
                      updateWizardData({
                        printableArea: {
                          ...wizardData.printableArea,
                          sleeve: {
                            ...(wizardData.printableArea?.sleeve || {
                              width: 500,
                              height: 500,
                              x: 600,
                              y: 300,
                            }),
                            height: parseNumber(e.target.value),
                          },
                        },
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
      `}</style>
    </div>
  );
}

