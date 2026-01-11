'use client';

/**
 * Color Attribute Configuration Component
 * 颜色属性配置组件
 * Created: 2025-01-06
 */
import React, { useState } from 'react';
import Image from 'next/image';
import { ColorMappingPayload } from '@/lib/api';

export interface ColorConfig {
  color: string;
  colorHex: string;
  displayName: string;
  images: Array<{ url: string; file?: File }>;
  enabled: boolean;
  mappingId?: string; // ID from ColorMapping
}

interface ColorAttributeConfigProps {
  colors: ColorConfig[];
  onColorsChange: (colors: ColorConfig[]) => void;
  onUploadImage?: (colorIndex: number, file: File) => Promise<string>;
  productImages?: Array<{ url: string; alt?: string }>;
  colorMappings?: ColorMappingPayload[];
}

export function ColorAttributeConfig({
  colors,
  onColorsChange,
  onUploadImage,
  productImages = [],
  colorMappings = [],
}: ColorAttributeConfigProps) {
  const [expandedColors, setExpandedColors] = useState<Set<number>>(new Set([0]));
  const fileInputRefs = React.useRef<{ [key: number]: HTMLInputElement | null }>({});

  const toggleColorExpanded = (index: number) => {
    setExpandedColors((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const addColor = () => {
    const newColor: ColorConfig = {
      color: `Color ${colors.length + 1}`,
      colorHex: '#CCCCCC',
      displayName: `Color ${colors.length + 1}`,
      images: [],
      enabled: true,
    };
    onColorsChange([...colors, newColor]);
    setExpandedColors((prev) => new Set([...prev, colors.length]));
  };

  const removeColor = (index: number) => {
    if (colors.length <= 1) {
      alert('至少需要保留一个颜色');
      return;
    }
    const newColors = colors.filter((_, i) => i !== index);
    onColorsChange(newColors);
    setExpandedColors((prev) => {
      const newSet = new Set(prev);
      newSet.delete(index);
      return newSet;
    });
  };

  const updateColor = (index: number, updates: Partial<ColorConfig>) => {
    const newColors = [...colors];
    newColors[index] = { ...newColors[index], ...updates };
    onColorsChange(newColors);
  };

  const handleColorSelectionChange = (index: number, value: string) => {
    // "Other" option or specific mapping
    if (value === 'other') {
      // Clear mapping, keep current visible values but allow editing
      updateColor(index, { mappingId: undefined });
    } else {
      // Find mapping
      const mapping = colorMappings.find(m => m.id === value);
      if (mapping) {
        updateColor(index, {
          mappingId: mapping.id,
          color: mapping.productColor, // Internal ID/Name
          colorHex: mapping.values[0] || '#CCCCCC',
          displayName: mapping.productColor, // Default display name
          // Auto-populate images if available in mapping
          images: mapping.images && mapping.images.length > 0
            ? mapping.images.map(url => ({ url }))
            : []
        });
      }
    }
  };

  const handleFileSelect = async (colorIndex: number, file: File) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      alert('不支持的文件类型');
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('文件大小不能超过 10MB');
      return;
    }

    if (onUploadImage) {
      try {
        const url = await onUploadImage(colorIndex, file);
        const newColors = [...colors];
        newColors[colorIndex].images = [
          ...newColors[colorIndex].images,
          { url, file },
        ];
        onColorsChange(newColors);
      } catch (error) {
        console.error('Failed to upload image:', error);
        alert('图片上传失败');
      }
    } else {
      // Local preview
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          const url = e.target.result as string;
          const newColors = [...colors];
          newColors[colorIndex].images = [
            ...newColors[colorIndex].images,
            { url, file },
          ];
          onColorsChange(newColors);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeColorImage = (colorIndex: number, imageIndex: number) => {
    const newColors = [...colors];
    newColors[colorIndex].images = newColors[colorIndex].images.filter(
      (_, i) => i !== imageIndex
    );
    onColorsChange(newColors);
  };

  /* New State for URL Input */
  const [activeUrlInputIndex, setActiveUrlInputIndex] = useState<number | null>(null);
  const [tempUrl, setTempUrl] = useState('');

  const handleAddUrlClick = (index: number) => {
    setActiveUrlInputIndex(index);
    setTempUrl('');
  };

  const handleConfirmUrl = (index: number) => {
    if (!tempUrl.trim()) return;

    // Simple validation (can be improved)
    if (!tempUrl.match(/^https?:\/\/.+/)) {
      alert('请输入有效的图片链接 (http:// 或 https://)');
      return;
    }

    const newColors = [...colors];
    newColors[index].images = [
      ...newColors[index].images,
      { url: tempUrl },
    ];
    onColorsChange(newColors);
    setActiveUrlInputIndex(null);
    setTempUrl('');
  };

  const handleCancelUrl = () => {
    setActiveUrlInputIndex(null);
    setTempUrl('');
  };

  return (
    <div className="color-attribute-config">
      <div className="color-attribute-config__header">
        <h4 className="color-attribute-config__title">
          颜色 <span className="required-indicator">*</span>
          <span className="color-attribute-config__subtitle">
            （必选属性，影响商品展示图片）
          </span>
        </h4>
      </div>

      <div className="color-attribute-config__list">
        {colors.map((colorConfig, index) => {
          const isExpanded = expandedColors.has(index);

          return (
            <div
              key={index}
              className={`color-config-item ${isExpanded ? 'color-config-item--expanded' : ''}`}
            >
              <div
                className="color-config-item__header"
                onClick={() => toggleColorExpanded(index)}
              >
                <div className="color-config-item__preview">
                  <div
                    className="color-config-item__swatch"
                    style={{ backgroundColor: colorConfig.colorHex }}
                  />
                  <div className="color-config-item__info">
                    <span className="color-config-item__name">{colorConfig.displayName}</span>
                    {colorConfig.mappingId && (
                      <span className="color-config-item__id" style={{ display: 'block', fontSize: '11px', color: '#999', marginTop: '2px' }}>
                        ID: {colorConfig.mappingId}
                      </span>
                    )}
                  </div>
                </div>
                <div className="color-config-item__actions">
                  {colorConfig.images.length > 0 && (
                    <span className="color-config-item__image-count">
                      已上传 {colorConfig.images.length} 张
                    </span>
                  )}
                  {colors.length > 1 && (
                    <button
                      type="button"
                      className="color-config-item__remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeColor(index);
                      }}
                    >
                      删除
                    </button>
                  )}
                  <button
                    type="button"
                    className="color-config-item__toggle"
                  >
                    {isExpanded ? '−' : '+'}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="color-config-item__content">
                  <div className="form-row" style={{ alignItems: 'flex-start', gap: '24px' }}>
                    <div className="form-field" style={{ flex: 1 }}>
                      <label className="form-field__label">选择颜色</label>
                      <select
                        className="form-field__input"
                        value={colorConfig.mappingId || 'other'}
                        onChange={(e) => handleColorSelectionChange(index, e.target.value)}
                      >
                        {/* Default empty option if needed, but we default to Other or specific ID */}
                        {colorMappings.map(m => (
                          <option key={m.id} value={m.id}>{m.productColor}</option>
                        ))}
                        <option value="other">其他 (自定义)</option>
                      </select>
                    </div>

                    <div className="form-field" style={{ flex: 1 }}>
                      <label className="form-field__label">颜色值 / 预览</label>
                      <div className="color-picker-group" style={{ height: '40px' }}>
                        <div
                          className="color-picker-swatch"
                          style={{
                            backgroundColor: colorConfig.colorHex,
                            flexShrink: 0
                          }}
                        />
                        {/* Only show editable input when "Other" is selected */}
                        {!colorConfig.mappingId ? (
                          <>
                            <input
                              type="color"
                              className="form-field__input color-picker-input"
                              value={colorConfig.colorHex}
                              onChange={(e) =>
                                updateColor(index, { colorHex: e.target.value })
                              }
                            />
                            <input
                              type="text"
                              className="form-field__input color-hex-input"
                              value={colorConfig.colorHex}
                              onChange={(e) =>
                                updateColor(index, { colorHex: e.target.value })
                              }
                              placeholder="#FF0000"
                            />
                          </>
                        ) : (
                          /* Read-only display for mapped colors */
                          <div
                            className="form-field__input color-hex-input"
                            style={{
                              backgroundColor: '#f9fafb',
                              color: '#6b7280',
                              display: 'flex',
                              alignItems: 'center',
                              userSelect: 'none',
                              cursor: 'default'
                            }}
                          >
                            {colorConfig.colorHex}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Display Name - ReadOnly if mapped, Editable if Other */}
                  <div className="form-field">
                    <label className="form-field__label">显示名称</label>
                    <input
                      type="text"
                      className="form-field__input"
                      value={colorConfig.displayName}
                      onChange={(e) =>
                        updateColor(index, { displayName: e.target.value })
                      }
                      placeholder="例如：经典红"
                      disabled={!!colorConfig.mappingId}
                      style={{ backgroundColor: colorConfig.mappingId ? '#f4f6f8' : 'white' }}
                    />
                  </div>

                  {/* Variant Images */}
                  <div className="form-field">
                    <label className="form-field__label">变体主图</label>
                    <div className="variant-images-upload">
                      {colorConfig.images.map((image, imgIndex) => (
                        <div key={imgIndex} className="variant-image-item">
                          <a
                            href={image.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="variant-image-preview"
                            style={{ display: 'block', cursor: 'pointer' }}
                            title="点击在新标签页打开大图"
                          >
                            <Image
                              src={image.url}
                              alt={`${colorConfig.displayName} ${imgIndex + 1}`}
                              fill
                              style={{ objectFit: 'contain' }}
                              unoptimized
                            />
                          </a>
                          <button
                            type="button"
                            className="variant-image-remove"
                            onClick={() => removeColorImage(index, imgIndex)}
                          >
                            ×
                          </button>
                        </div>
                      ))}

                      {/* Add Buttons or Input Form */}
                      {activeUrlInputIndex === index ? (
                        <div className="url-input-container">
                          <input
                            type="text"
                            value={tempUrl}
                            onChange={(e) => setTempUrl(e.target.value)}
                            placeholder="https://..."
                            className="url-input"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleConfirmUrl(index);
                              if (e.key === 'Escape') handleCancelUrl();
                            }}
                          />
                          <div className="url-input-actions">
                            <button
                              type="button"
                              onClick={() => handleConfirmUrl(index)}
                              className="url-action-btn confirm"
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelUrl}
                              className="url-action-btn cancel"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* File Upload Button */}
                          <div
                            className="variant-image-upload-btn"
                            onClick={() => fileInputRefs.current[index]?.click()}
                            title="上传本地图片"
                          >
                            <span>+ 上传</span>
                          </div>

                          {/* URL Button */}
                          <div
                            className="variant-image-upload-btn url-btn"
                            onClick={() => handleAddUrlClick(index)}
                            title="添加网络图片链接"
                          >
                            <span>🔗 链接</span>
                          </div>
                        </>
                      )}

                      <input
                        ref={(el) => { fileInputRefs.current[index] = el; }}
                        type="file"
                        accept="image/*"
                        multiple
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          if (e.target.files) {
                            Array.from(e.target.files).forEach((file) => {
                              handleFileSelect(index, file);
                            });
                          }
                        }}
                      />
                    </div>
                    <small className="form-field__hint">
                      支持本地上传或网络图片链接
                    </small>
                  </div>

                  {/* Enabled Status */}
                  <div className="form-field checkbox-field">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={colorConfig.enabled}
                        onChange={(e) =>
                          updateColor(index, { enabled: e.target.checked })
                        }
                      />
                      <span>启用此颜色</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className="add-color-btn"
        onClick={addColor}
      >
        + 添加新颜色
      </button>

      <style jsx>{`
        .color-attribute-config {
          background: #fff;
          border-radius: 8px;
          padding: 20px;
          border: 1px solid #e1e3e5;
        }

        .color-attribute-config__header {
          margin-bottom: 16px;
        }

        .color-attribute-config__title {
          font-size: 16px;
          font-weight: 600;
          margin: 0;
          color: #202223;
        }

        .required-indicator {
          color: #e74c3c;
        }

        .color-attribute-config__subtitle {
          font-size: 14px;
          font-weight: 400;
          color: #6d7175;
          margin-left: 8px;
        }

        .color-config-item {
          border: 1px solid #e1e3e5;
          border-radius: 4px;
          margin-bottom: 12px;
          overflow: hidden;
        }

        .color-config-item__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          cursor: pointer;
          background: #fafbfb;
          transition: background 0.2s;
        }

        .color-config-item__header:hover {
          background: #f6f6f7;
        }

        .color-config-item__preview {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .color-config-item__swatch {
          width: 32px;
          height: 32px;
          border-radius: 4px;
          border: 2px solid #e1e3e5;
        }

        .color-config-item__name {
          font-size: 14px;
          font-weight: 500;
          color: #202223;
        }

        .color-config-item__actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .color-config-item__image-count {
          font-size: 12px;
          color: #6d7175;
        }

        .color-config-item__remove,
        .color-config-item__toggle {
          background: none;
          border: none;
          color: #005bd3;
          cursor: pointer;
          font-size: 16px;
          padding: 4px 8px;
        }

        .color-config-item__remove:hover {
          color: #e74c3c;
        }

        .color-config-item__content {
          padding: 16px;
          border-top: 1px solid #e1e3e5;
        }

        .form-row {
          display: flex;
          gap: 16px;
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

        .color-picker-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .color-picker-swatch {
          width: 40px;
          height: 40px;
          border-radius: 4px;
          border: 1px solid #e1e3e5;
        }

        .color-picker-input {
          width: 60px;
          height: 40px;
          padding: 0;
          border: none;
          cursor: pointer;
        }

        .color-hex-input {
          flex: 1;
        }

        .variant-images-upload {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .variant-image-item {
          position: relative;
          width: 80px;
          height: 80px;
        }

        .variant-image-preview {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 4px;
          overflow: hidden;
          border: 1px solid #e1e3e5;
        }

        .variant-image-remove {
          position: absolute;
          top: -8px;
          right: -8px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #e74c3c;
          color: #fff;
          border: none;
          cursor: pointer;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .variant-image-upload-btn {
          width: 80px;
          height: 80px;
          border: 2px dashed #c9cccf;
          border-radius: 4px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 12px;
          color: #6d7175;
          transition: all 0.2s;
          background: #fff;
          text-align: center;
        }

        .variant-image-upload-btn:hover {
          border-color: #005bd3;
          color: #005bd3;
        }
        
        .variant-image-upload-btn.url-btn {
          background-color: #f9fafb;
        }

        .url-input-container {
          width: 200px;
          height: 80px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          border: 1px solid #c9cccf;
          border-radius: 4px;
          padding: 4px;
          background: #fff;
        }

        .url-input {
          width: 100%;
          flex: 1;
          border: 1px solid #e1e3e5;
          border-radius: 2px;
          padding: 2px 4px;
          font-size: 12px;
        }
        
        .url-input:focus {
          border-color: #005bd3;
          outline: none;
        }

        .url-input-actions {
          display: flex;
          gap: 4px;
          height: 24px;
        }

        .url-action-btn {
          flex: 1;
          border: none;
          border-radius: 2px;
          cursor: pointer;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
        }
        
        .url-action-btn.confirm {
          background: #005bd3;
          color: white;
        }
        
        .url-action-btn.cancel {
          background: #e1e3e5;
          color: #202223;
        }

        .form-field__hint {
          font-size: 12px;
          color: #6d7175;
          margin-top: 4px;
          display: block;
        }

        .checkbox-field {
          margin-bottom: 0;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 14px;
          color: #202223;
        }

        .add-color-btn {
          width: 100%;
          padding: 12px;
          background: #fff;
          border: 1px dashed #c9cccf;
          border-radius: 4px;
          color: #005bd3;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .add-color-btn:hover {
          border-color: #005bd3;
          background: #f0f7ff;
        }
      `}</style>
    </div>
  );
}
