'use client';

/**
 * Variant Combination Preview Component
 * 变体组合预览组件 - 显示所有颜色×尺寸组合
 * Created: 2025-01-06
 */
import React from 'react';
import { ColorConfig } from './ColorAttributeConfig';
import { SizeConfig } from './SizeAttributeConfig';

export interface VariantCombination {
  color: string;
  size: string;
  enabled: boolean;
  sku?: string;
  hasImage?: boolean;
  stockQuantity?: number;
}

interface VariantCombinationPreviewProps {
  colors: ColorConfig[];
  sizes: SizeConfig[];
  combinations: VariantCombination[];
  onCombinationsChange: (combinations: VariantCombination[]) => void;
  onUploadImage?: (color: string) => void;
  productSku?: string;
}

export function VariantCombinationPreview({
  colors,
  sizes,
  combinations,
  onCombinationsChange,
  onUploadImage,
  productSku = 'SKU',
}: VariantCombinationPreviewProps) {
  const enabledColors = colors.filter((c) => c.enabled);
  const enabledSizes = sizes.filter((s) => s.enabled).sort((a, b) => a.sortOrder - b.sortOrder);

  const totalVariants = enabledColors.length * enabledSizes.length;
  const enabledVariants = combinations.filter((c) => c.enabled).length;

  // Check which colors have images
  const colorImageStatus = enabledColors.map((color) => ({
    color: color.color,
    displayName: color.displayName,
    hasImage: color.images && color.images.length > 0,
    imageCount: color.images?.length || 0,
  }));

  const missingImageColors = colorImageStatus.filter((c) => !c.hasImage);

  const toggleCombination = (color: string, size: string) => {
    const newCombinations = combinations.map((c) => {
      if (c.color === color && c.size === size) {
        return { ...c, enabled: !c.enabled };
      }
      return c;
    });
    onCombinationsChange(newCombinations);
  };

  const toggleAllCombinations = (enabled: boolean) => {
    const newCombinations = combinations.map((c) => ({ ...c, enabled }));
    onCombinationsChange(newCombinations);
  };

  return (
    <div className="variant-combination-preview">
      <div className="variant-combination-preview__header">
        <h3 className="variant-combination-preview__title">
          变体组合预览
          <span className="variant-count">
            （将生成 {enabledVariants} 个变体）
          </span>
        </h3>
        <div className="variant-combination-preview__actions">
          <button
            type="button"
            className="btn-bulk-disable"
            onClick={() => toggleAllCombinations(false)}
          >
            批量禁用组合
          </button>
        </div>
      </div>

      {/* System Check */}
      <div className="variant-check-section">
        <h4 className="variant-check-title">系统检查：</h4>
        <div className="variant-check-list">
          {colorImageStatus.map((color) => (
            <div
              key={color.color}
              className={`variant-check-item ${color.hasImage ? 'variant-check-item--ok' : 'variant-check-item--warning'}`}
            >
              {color.hasImage ? (
                <>
                  <span className="check-icon">✅</span>
                  <span>
                    {color.displayName} 已上传变体图片 ({color.imageCount} 张)
                  </span>
                </>
              ) : (
                <>
                  <span className="check-icon">❌</span>
                  <span>{color.displayName} 缺少变体图片</span>
                  {onUploadImage && (
                    <button
                      type="button"
                      className="btn-upload-now"
                      onClick={() => onUploadImage(color.color)}
                    >
                      立即上传
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Combination Grid */}
      <div className="variant-grid-container">
        <div className="variant-grid-header">
          <div className="variant-grid-header-cell">颜色 / 尺寸</div>
          {enabledSizes.map((size) => (
            <div key={size.size} className="variant-grid-header-cell">
              {size.displayName}
            </div>
          ))}
        </div>

        {enabledColors.map((color) => (
          <div key={color.color} className="variant-grid-row">
            <div className="variant-grid-row-header">
              <div
                className="color-swatch-small"
                style={{ backgroundColor: color.colorHex }}
              />
              <span>{color.displayName}</span>
            </div>
            {enabledSizes.map((size) => {
              const combination = combinations.find(
                (c) => c.color === color.color && c.size === size.size
              );
              const isEnabled = combination?.enabled ?? true;
              const sku = combination?.sku || `${productSku}-${color.color.toUpperCase()}-${size.size.toUpperCase()}`;

              return (
                <div
                  key={`${color.color}-${size.size}`}
                  className={`variant-grid-cell ${isEnabled ? 'variant-grid-cell--enabled' : 'variant-grid-cell--disabled'}`}
                  onClick={() => toggleCombination(color.color, size.size)}
                >
                  <label className="variant-checkbox-label">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={() => toggleCombination(color.color, size.size)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="variant-label">{sku}</span>
                  </label>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {missingImageColors.length > 0 && (
        <div className="variant-warning-banner">
          <span className="warning-icon">⚠️</span>
          <span>
            有 {missingImageColors.length} 个颜色缺少图片，建议上传后再继续
          </span>
        </div>
      )}

      <style jsx>{`
        .variant-combination-preview {
          background: #fff;
          border-radius: 8px;
          padding: 20px;
          border: 1px solid #e1e3e5;
        }

        .variant-combination-preview__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .variant-combination-preview__title {
          font-size: 18px;
          font-weight: 600;
          margin: 0;
          color: #202223;
        }

        .variant-count {
          font-size: 14px;
          font-weight: 400;
          color: #6d7175;
          margin-left: 8px;
        }

        .variant-combination-preview__actions {
          display: flex;
          gap: 12px;
        }

        .btn-bulk-disable {
          padding: 8px 16px;
          background: #fff;
          border: 1px solid #c9cccf;
          border-radius: 4px;
          font-size: 14px;
          color: #202223;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-bulk-disable:hover {
          background: #f6f6f7;
          border-color: #8c9196;
        }

        .variant-check-section {
          margin-bottom: 24px;
          padding: 16px;
          background: #fafbfb;
          border-radius: 4px;
        }

        .variant-check-title {
          font-size: 14px;
          font-weight: 600;
          margin: 0 0 12px 0;
          color: #202223;
        }

        .variant-check-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .variant-check-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }

        .variant-check-item--ok {
          color: #008060;
        }

        .variant-check-item--warning {
          color: #e74c3c;
        }

        .check-icon {
          font-size: 16px;
        }

        .btn-upload-now {
          margin-left: auto;
          padding: 4px 12px;
          background: #005bd3;
          color: #fff;
          border: none;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-upload-now:hover {
          background: #004bb3;
        }

        .variant-grid-container {
          overflow-x: auto;
        }

        .variant-grid-header {
          display: grid;
          grid-template-columns: 150px repeat(auto-fit, minmax(120px, 1fr));
          gap: 8px;
          margin-bottom: 8px;
        }

        .variant-grid-header-cell {
          padding: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #202223;
          background: #f6f6f7;
          border-radius: 4px;
          text-align: center;
        }

        .variant-grid-row {
          display: grid;
          grid-template-columns: 150px repeat(auto-fit, minmax(120px, 1fr));
          gap: 8px;
          margin-bottom: 8px;
        }

        .variant-grid-row-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #202223;
        }

        .color-swatch-small {
          width: 24px;
          height: 24px;
          border-radius: 4px;
          border: 1px solid #e1e3e5;
        }

        .variant-grid-cell {
          padding: 8px;
          border: 1px solid #e1e3e5;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
          background: #fff;
        }

        .variant-grid-cell:hover {
          border-color: #005bd3;
          background: #f0f7ff;
        }

        .variant-grid-cell--enabled {
          background: #fff;
        }

        .variant-grid-cell--disabled {
          background: #f6f6f7;
          opacity: 0.6;
        }

        .variant-checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 12px;
          color: #202223;
        }

        .variant-label {
          flex: 1;
          word-break: break-all;
        }

        .variant-warning-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 16px;
          padding: 12px;
          background: #fff3cd;
          border: 1px solid #ffc107;
          border-radius: 4px;
          color: #856404;
          font-size: 14px;
        }

        .warning-icon {
          font-size: 18px;
        }
      `}</style>
    </div>
  );
}

