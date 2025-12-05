/**
 * Edit Upload Panel - 编辑上传图片面板
 * [2025-01-30 17:20:00] 实现 Edit Upload 面板，包含 Size、Center、Layering、Flip、Duplicate、Crop、Rotation 等控件
 * [2025-01-30 23:30:00] 根据 designlab-upload02.jpeg 更新控件顺序和样式，完全匹配 Custom Ink
 */
'use client';

import React, { useState, useEffect } from 'react';
// [2025-01-30 21:45:00] 修复 fabric.js 导入：在 Next.js 中使用命名空间导入
import * as fabric from 'fabric';

interface EditUploadPanelProps {
  selectedImage: fabric.Image | null;
  canvas: fabric.Canvas | null;
  onUpdate: () => void;
  onReset?: () => void;
  onSave?: () => void;
  onClose?: () => void;
}

const EditUploadPanel: React.FC<EditUploadPanelProps> = ({ 
  selectedImage, 
  canvas, 
  onUpdate,
  onReset,
  onSave,
  onClose
}) => {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [rotation, setRotation] = useState(0);
  const [makeOneColor, setMakeOneColor] = useState(false);
  const [removeBackground, setRemoveBackground] = useState(false);
  const [originalImageData, setOriginalImageData] = useState<string | null>(null);

  // [2025-01-30 23:30:00] 保存原始图片数据用于 Reset
  useEffect(() => {
    if (selectedImage && !originalImageData) {
      selectedImage.toDataURL((dataUrl) => {
        setOriginalImageData(dataUrl);
      });
    }
  }, [selectedImage, originalImageData]);

  // [2025-01-30 17:20:00] 更新尺寸和旋转值
  useEffect(() => {
    if (selectedImage) {
      // 计算实际尺寸（考虑缩放）
      const actualWidth = (selectedImage.width || 0) * (selectedImage.scaleX || 1);
      const actualHeight = (selectedImage.height || 0) * (selectedImage.scaleY || 1);
      
      // 转换为英寸（假设 300 DPI）
      const dpi = 300;
      const widthInches = actualWidth / dpi;
      const heightInches = actualHeight / dpi;
      
      setSize({ width: widthInches, height: heightInches });
      setRotation(selectedImage.angle || 0);
    }
  }, [selectedImage]);

  // [2025-01-30 17:20:00] Center 按钮
  // [2025-01-30 22:05:00] 添加调试日志和错误处理
  const handleCenter = () => {
    if (!selectedImage || !canvas) {
      console.warn('[EditUploadPanel] handleCenter: selectedImage or canvas is null');
      return;
    }
    
    console.log('[EditUploadPanel] Centering image');
    const canvasWidth = canvas.width || 1000;
    const canvasHeight = canvas.height || 1200;
    
    selectedImage.set({
      left: canvasWidth / 2,
      top: canvasHeight / 2,
      originX: 'center',
      originY: 'center'
    });
    
    selectedImage.setCoords();
    canvas.renderAll();
    onUpdate();
  };

  // [2025-01-30 17:20:00] Bring to Front
  const handleBringToFront = () => {
    if (!selectedImage || !canvas) return;
    canvas.bringToFront(selectedImage);
    canvas.renderAll();
    onUpdate();
  };

  // [2025-01-30 17:20:00] Send to Back
  const handleSendToBack = () => {
    if (!selectedImage || !canvas) return;
    canvas.sendToBack(selectedImage);
    canvas.renderAll();
    onUpdate();
  };

  // [2025-01-30 17:20:00] Flip Horizontal
  const handleFlipHorizontal = () => {
    if (!selectedImage) return;
    selectedImage.set('flipX', !selectedImage.flipX);
    selectedImage.setCoords();
    if (canvas) {
      canvas.renderAll();
      onUpdate();
    }
  };

  // [2025-01-30 17:20:00] Flip Vertical
  const handleFlipVertical = () => {
    if (!selectedImage) return;
    selectedImage.set('flipY', !selectedImage.flipY);
    selectedImage.setCoords();
    if (canvas) {
      canvas.renderAll();
      onUpdate();
    }
  };

  // [2025-01-30 17:20:00] Duplicate
  const handleDuplicate = () => {
    if (!selectedImage || !canvas) return;
    
    selectedImage.clone((cloned: fabric.Image) => {
      cloned.set({
        left: (selectedImage.left || 0) + 20,
        top: (selectedImage.top || 0) + 20,
        name: `image_${Date.now()}`
      });
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      canvas.renderAll();
      onUpdate();
    });
  };

  // [2025-01-30 17:20:00] Rotation slider
  const handleRotationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const angle = parseFloat(e.target.value);
    setRotation(angle);
    
    if (selectedImage) {
      selectedImage.set('angle', angle);
      selectedImage.setCoords();
      if (canvas) {
        canvas.renderAll();
        onUpdate();
      }
    }
  };

  // [2025-01-30 17:20:00] Crop（简化版，提示功能）
  const handleCrop = () => {
    // TODO: 实现裁剪功能
    alert('Crop feature coming soon');
  };

  // [2025-01-30 23:30:00] Reset To Original
  const handleReset = () => {
    if (!selectedImage || !originalImageData) return;
    
    fabric.Image.fromURL(originalImageData, (img) => {
      if (canvas && selectedImage) {
        const left = selectedImage.left;
        const top = selectedImage.top;
        const scaleX = selectedImage.scaleX;
        const scaleY = selectedImage.scaleY;
        
        canvas.remove(selectedImage);
        img.set({
          left,
          top,
          scaleX,
          scaleY,
          originX: 'center',
          originY: 'center'
        });
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
        onUpdate();
        onReset?.();
      }
    });
  };

  // [2025-01-30 23:30:00] Save Design
  const handleSave = () => {
    onSave?.();
    onUpdate();
  };

  // [2025-01-30 23:30:00] Edit Colors - 颜色色板
  const colorSwatches = [
    { name: 'Dark Blue', hex: '#1E3A8A' },
    { name: 'Gray', hex: '#6B7280' },
    { name: 'Yellow', hex: '#FBBF24' },
    { name: 'Light Blue', hex: '#3B82F6' },
    { name: 'Dark Blue 2', hex: '#1E40AF' }
  ];

  if (!selectedImage) {
    return (
      <div className="dl-edit-upload-panel">
        <p>No image selected</p>
      </div>
    );
  }

  return (
    <div className="dl-edit-upload-panel">
      <div className="dl-edit-upload-panel__header">
        <h2 className="dl-edit-upload-panel__title">Edit Upload</h2>
        <button 
          className="dl-edit-upload-panel__close" 
          aria-label="Close" 
          type="button"
          onClick={onClose}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="4" x2="12" y2="12" />
            <line x1="12" y1="4" x2="4" y2="12" />
          </svg>
        </button>
      </div>

      <div className="dl-edit-upload-panel__content">
        {/* Upload Size */}
        <div className="dl-edit-upload-panel__section">
          <label className="dl-edit-upload-panel__label">Width x Height</label>
          <div className="dl-edit-upload-panel__size-inputs">
            <input
              type="text"
              className="dl-edit-upload-panel__size-input"
              value={`${size.width.toFixed(2)} in`}
              readOnly
            />
            <span className="dl-edit-upload-panel__size-separator">×</span>
            <input
              type="text"
              className="dl-edit-upload-panel__size-input"
              value={`${size.height.toFixed(2)} in`}
              readOnly
            />
          </div>
        </div>

        {/* Edit Colors */}
        <div className="dl-edit-upload-panel__section">
          <label className="dl-edit-upload-panel__label">Edit Colors</label>
          <div className="dl-edit-upload-panel__colors">
            {colorSwatches.map((color, index) => (
              <button
                key={index}
                className="dl-edit-upload-panel__color-swatch"
                style={{ backgroundColor: color.hex }}
                aria-label={color.name}
                type="button"
              />
            ))}
          </div>
        </div>

        {/* Make One Color New! */}
        <div className="dl-edit-upload-panel__section">
          <div className="dl-edit-upload-panel__toggle">
            <label className="dl-edit-upload-panel__toggle-label">Make One Color New!</label>
            <button
              className={`dl-edit-upload-panel__toggle-btn ${makeOneColor ? 'is-active' : ''}`}
              onClick={() => setMakeOneColor(!makeOneColor)}
              type="button"
              aria-label="Make One Color New"
            >
              <span className="dl-edit-upload-panel__toggle-slider" />
            </button>
          </div>
        </div>

        {/* Remove Background Color */}
        <div className="dl-edit-upload-panel__section">
          <div className="dl-edit-upload-panel__toggle">
            <label className="dl-edit-upload-panel__toggle-label">Remove Background Color</label>
            <button
              className={`dl-edit-upload-panel__toggle-btn ${removeBackground ? 'is-active' : ''}`}
              onClick={() => setRemoveBackground(!removeBackground)}
              type="button"
              aria-label="Remove Background Color"
            >
              <span className="dl-edit-upload-panel__toggle-slider" />
            </button>
          </div>
        </div>

        {/* Positioning Controls */}
        <div className="dl-edit-upload-panel__section">
          <div className="dl-edit-upload-panel__controls">
            <button
              className="dl-edit-upload-panel__control-btn"
              onClick={handleCenter}
              type="button"
              aria-label="Center"
              title="Center"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="10" y1="2" x2="10" y2="18" />
                <line x1="2" y1="10" x2="18" y2="10" />
              </svg>
            </button>
            <button
              className="dl-edit-upload-panel__control-btn"
              onClick={handleBringToFront}
              type="button"
              aria-label="Bring to Front"
              title="Bring to Front"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="4" width="12" height="12" />
                <rect x="6" y="6" width="8" height="8" />
              </svg>
            </button>
            <button
              className="dl-edit-upload-panel__control-btn"
              onClick={handleSendToBack}
              type="button"
              aria-label="Send to Back"
              title="Send to Back"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="6" y="6" width="8" height="8" />
                <rect x="4" y="4" width="12" height="12" />
              </svg>
            </button>
            <button
              className="dl-edit-upload-panel__control-btn"
              onClick={handleFlipHorizontal}
              type="button"
              aria-label="Flip Horizontal"
              title="Flip Horizontal"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 10 L16 10" />
                <path d="M10 4 L14 10 L10 16" />
                <path d="M10 4 L6 10 L10 16" />
              </svg>
            </button>
            <button
              className="dl-edit-upload-panel__control-btn"
              onClick={handleDuplicate}
              type="button"
              aria-label="Duplicate"
              title="Duplicate"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="4" width="8" height="8" />
                <rect x="8" y="8" width="8" height="8" />
              </svg>
            </button>
            <button
              className="dl-edit-upload-panel__control-btn"
              onClick={handleCrop}
              type="button"
              aria-label="Crop"
              title="Crop"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="4" width="12" height="12" />
                <line x1="4" y1="8" x2="16" y2="8" />
                <line x1="8" y1="4" x2="8" y2="16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Rotation */}
        <div className="dl-edit-upload-panel__section">
          <label className="dl-edit-upload-panel__label">Rotation</label>
          <div className="dl-edit-upload-panel__rotation">
            <input
              type="range"
              min="0"
              max="360"
              value={rotation}
              onChange={handleRotationChange}
              className="dl-edit-upload-panel__slider"
            />
            <input
              type="number"
              className="dl-edit-upload-panel__rotation-input"
              value={rotation.toFixed(0)}
              onChange={(e) => {
                const value = parseFloat(e.target.value) || 0;
                setRotation(value);
                if (selectedImage) {
                  selectedImage.set('angle', value);
                  selectedImage.setCoords();
                  if (canvas) {
                    canvas.renderAll();
                    onUpdate();
                  }
                }
              }}
              min="0"
              max="360"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="dl-edit-upload-panel__section">
          <div className="dl-edit-upload-panel__actions">
            <button
              className="dl-edit-upload-panel__action-btn dl-edit-upload-panel__action-btn--outline"
              onClick={handleReset}
              type="button"
            >
              Reset To Original
            </button>
            <button
              className="dl-edit-upload-panel__action-btn dl-edit-upload-panel__action-btn--primary"
              onClick={handleSave}
              type="button"
            >
              Save Design
            </button>
          </div>
        </div>

        {/* Information Box */}
        <div className="dl-edit-upload-panel__section">
          <div className="dl-edit-upload-panel__info-box">
            <svg className="dl-edit-upload-panel__info-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="8" cy="8" r="7" />
              <line x1="8" y1="4" x2="8" y2="8" />
              <line x1="8" y1="12" x2="8" y2="12" />
            </svg>
            <div className="dl-edit-upload-panel__info-content">
              <p className="dl-edit-upload-panel__info-title">Need A Pantone Color Match?</p>
              <p className="dl-edit-upload-panel__info-text">
                Add your brand colors to orders of 6 items or more.
              </p>
            </div>
          </div>
        </div>

        {/* Feedback Link */}
        <div className="dl-edit-upload-panel__section">
          <a 
            href="#" 
            className="dl-edit-upload-panel__feedback-link"
            onClick={(e) => { e.preventDefault(); /* TODO: Open feedback */ }}
          >
            How would you rate our upload experience?
          </a>
        </div>
      </div>
    </div>
  );
};

export default EditUploadPanel;

