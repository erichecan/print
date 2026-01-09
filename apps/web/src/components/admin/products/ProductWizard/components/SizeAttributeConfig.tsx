'use client';

/**
 * Size Attribute Configuration Component
 * 尺寸属性配置组件
 * Created: 2025-01-06
 */
import React, { useState } from 'react';

export interface SizeConfig {
  size: string;
  displayName: string;
  sortOrder: number;
  enabled: boolean;
}

interface SizeAttributeConfigProps {
  sizes: SizeConfig[];
  onSizesChange: (sizes: SizeConfig[]) => void;
  onSizeGuideUpload?: (file: File) => Promise<string>;
}

const QUICK_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

export function SizeAttributeConfig({
  sizes,
  onSizesChange,
  onSizeGuideUpload,
}: SizeAttributeConfigProps) {
  const [newSize, setNewSize] = useState('');
  const sizeGuideInputRef = React.useRef<HTMLInputElement>(null);

  const addQuickSize = (size: string) => {
    if (sizes.find((s) => s.size === size)) {
      return; // Already exists
    }

    const newSizeConfig: SizeConfig = {
      size,
      displayName: size,
      sortOrder: sizes.length,
      enabled: true,
    };
    onSizesChange([...sizes, newSizeConfig]);
  };

  const addCustomSize = () => {
    if (!newSize.trim()) {
      return;
    }

    if (sizes.find((s) => s.size === newSize.trim())) {
      alert('该尺寸已存在');
      setNewSize('');
      return;
    }

    const newSizeConfig: SizeConfig = {
      size: newSize.trim(),
      displayName: newSize.trim(),
      sortOrder: sizes.length,
      enabled: true,
    };
    onSizesChange([...sizes, newSizeConfig]);
    setNewSize('');
  };

  const removeSize = (index: number) => {
    if (sizes.length <= 1) {
      alert('至少需要保留一个尺寸');
      return;
    }
    const newSizes = sizes.filter((_, i) => i !== index);
    // Reorder sortOrder
    const reorderedSizes = newSizes.map((size, i) => ({
      ...size,
      sortOrder: i,
    }));
    onSizesChange(reorderedSizes);
  };

  const updateSize = (index: number, updates: Partial<SizeConfig>) => {
    const newSizes = [...sizes];
    newSizes[index] = { ...newSizes[index], ...updates };
    onSizesChange(newSizes);
  };

  const handleSizeGuideUpload = async (file: File) => {
    if (onSizeGuideUpload) {
      try {
        await onSizeGuideUpload(file);
        // TODO: Store size guide URL
      } catch (error) {
        console.error('Failed to upload size guide:', error);
        alert('尺寸表上传失败');
      }
    }
  };

  return (
    <div className="size-attribute-config">
      <div className="size-attribute-config__header">
        <h4 className="size-attribute-config__title">尺寸</h4>
      </div>

      {/* Quick Size Selection */}
      <div className="form-field">
        <label className="form-field__label">快速选择</label>
        <div className="quick-size-buttons">
          {QUICK_SIZES.map((size) => {
            const exists = sizes.find((s) => s.size === size);
            return (
              <button
                key={size}
                type="button"
                className={`quick-size-btn ${exists ? 'quick-size-btn--selected' : ''}`}
                onClick={() => !exists && addQuickSize(size)}
                disabled={!!exists}
              >
                {size}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Size Input */}
      <div className="form-field">
        <label className="form-field__label">或自定义</label>
        <div className="custom-size-input-group">
          <input
            type="text"
            className="form-field__input"
            placeholder="输入自定义尺寸，例如：3XL"
            value={newSize}
            onChange={(e) => setNewSize(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustomSize();
              }
            }}
          />
          <button
            type="button"
            className="btn-add-custom"
            onClick={addCustomSize}
          >
            添加
          </button>
        </div>
      </div>

      {/* Size List */}
      <div className="size-list">
        {sizes
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((sizeConfig, index) => {
            const actualIndex = sizes.findIndex((s) => s.size === sizeConfig.size);
            return (
              <div key={sizeConfig.size} className="size-item">
                <div className="size-item__content">
                  <input
                    type="checkbox"
                    className="size-item__checkbox"
                    checked={sizeConfig.enabled}
                    onChange={(e) =>
                      updateSize(actualIndex, { enabled: e.target.checked })
                    }
                  />
                  <div className="size-item__fields">
                    <input
                      type="text"
                      className="form-field__input size-input"
                      value={sizeConfig.size}
                      onChange={(e) =>
                        updateSize(actualIndex, {
                          size: e.target.value,
                          displayName: e.target.value,
                        })
                      }
                    />
                    <span className="size-item__separator">显示:</span>
                    <input
                      type="text"
                      className="form-field__input size-display-input"
                      value={sizeConfig.displayName}
                      onChange={(e) =>
                        updateSize(actualIndex, { displayName: e.target.value })
                      }
                    />
                    <span className="size-item__separator">排序:</span>
                    <input
                      type="number"
                      className="form-field__input size-sort-input"
                      value={sizeConfig.sortOrder}
                      onChange={(e) =>
                        updateSize(actualIndex, {
                          sortOrder: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  {sizes.length > 1 && (
                    <button
                      type="button"
                      className="size-item__remove"
                      onClick={() => removeSize(actualIndex)}
                    >
                      删除
                    </button>
                  )}
                </div>
              </div>
            );
          })}
      </div>


      <style jsx>{`
        .size-attribute-config {
          background: #fff;
          border-radius: 8px;
          padding: 20px;
          border: 1px solid #e1e3e5;
        }

        .size-attribute-config__header {
          margin-bottom: 16px;
        }

        .size-attribute-config__title {
          font-size: 16px;
          font-weight: 600;
          margin: 0;
          color: #202223;
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

        .form-field__input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #c9cccf;
          border-radius: 4px;
          font-size: 14px;
        }

        .quick-size-buttons {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .quick-size-btn {
          padding: 8px 16px;
          background: #fff;
          border: 1px solid #c9cccf;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
          color: #202223;
          cursor: pointer;
          transition: all 0.2s;
        }

        .quick-size-btn:hover:not(:disabled) {
          border-color: #005bd3;
          color: #005bd3;
        }

        .quick-size-btn--selected {
          background: #005bd3;
          color: #fff;
          border-color: #005bd3;
          cursor: default;
        }

        .quick-size-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .custom-size-input-group {
          display: flex;
          gap: 8px;
        }

        .custom-size-input-group .form-field__input {
          flex: 1;
        }

        .btn-add-custom {
          padding: 8px 16px;
          background: #005bd3;
          color: #fff;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-add-custom:hover {
          background: #004bb3;
        }

        .size-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
        }

        .size-item {
          border: 1px solid #e1e3e5;
          border-radius: 4px;
          padding: 12px;
          background: #fafbfb;
        }

        .size-item__content {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .size-item__checkbox {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .size-item__fields {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
        }

        .size-input {
          width: 80px;
        }

        .size-display-input {
          width: 100px;
        }

        .size-sort-input {
          width: 80px;
        }

        .size-item__separator {
          font-size: 14px;
          color: #6d7175;
        }

        .size-item__remove {
          padding: 6px 12px;
          background: #fff;
          border: 1px solid #c9cccf;
          border-radius: 4px;
          color: #e74c3c;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .size-item__remove:hover {
          background: #fff5f5;
          border-color: #e74c3c;
        }

        .size-guide-section {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .btn-upload-guide {
          padding: 8px 16px;
          background: #fff;
          border: 1px solid #c9cccf;
          border-radius: 4px;
          font-size: 14px;
          color: #202223;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-upload-guide:hover {
          border-color: #005bd3;
          color: #005bd3;
        }

        .link-size-guide {
          font-size: 14px;
          color: #005bd3;
          text-decoration: none;
        }

        .link-size-guide:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}

