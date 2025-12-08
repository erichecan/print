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
  onOpenRatingModal?: () => void; // [2025-12-08] 添加可选的上传体验评分模态框回调
}

const EditUploadPanel: React.FC<EditUploadPanelProps> = ({ 
  selectedImage, 
  canvas, 
  onUpdate,
  onReset,
  onSave,
  onClose,
  onOpenRatingModal
}) => {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [sizeInches, setSizeInches] = useState({ width: 0, height: 0 }); // [2025-12-08] 英寸单位尺寸
  const [rotation, setRotation] = useState(0);
  const [makeOneColor, setMakeOneColor] = useState(false);
  const [removeBackground, setRemoveBackground] = useState(false);
  const [originalImageData, setOriginalImageData] = useState<string | null>(null);
  const [aspectRatioLocked, setAspectRatioLocked] = useState(true); // [2025-12-08] 比例锁状态
  const [originalAspectRatio, setOriginalAspectRatio] = useState(1); // [2025-12-08] 原始宽高比

  // [2025-01-30 23:30:00] 保存原始图片数据用于 Reset
  useEffect(() => {
    if (selectedImage && !originalImageData) {
      selectedImage.toDataURL((dataUrl) => {
        setOriginalImageData(dataUrl);
      });
    }
  }, [selectedImage, originalImageData]);

  // [2025-01-30 17:20:00] 更新尺寸和旋转值
  // [2025-12-08] 添加英寸单位计算和原始宽高比保存
  useEffect(() => {
    if (selectedImage) {
      // 计算实际尺寸（考虑缩放）
      const actualWidth = (selectedImage.width || 0) * (selectedImage.scaleX || 1);
      const actualHeight = (selectedImage.height || 0) * (selectedImage.scaleY || 1);
      
      // 转换为英寸（假设 300 DPI）
      const dpi = 300;
      const widthInches = actualWidth / dpi;
      const heightInches = actualHeight / dpi;
      
      setSize({ width: actualWidth, height: actualHeight }); // 像素单位
      setSizeInches({ width: widthInches, height: heightInches }); // 英寸单位
      setRotation(selectedImage.angle || 0);
      
      // [2025-12-08] 保存原始宽高比
      if (actualHeight > 0) {
        setOriginalAspectRatio(actualWidth / actualHeight);
      }
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

  // [2025-12-08] 处理尺寸变化
  const handleSizeChange = (widthInches: number, heightInches: number) => {
    if (!selectedImage) return;
    
    // 转换为像素（300 DPI）
    const dpi = 300;
    const widthPixels = widthInches * dpi;
    const heightPixels = heightInches * dpi;
    
    // 计算缩放比例
    const originalWidth = selectedImage.width || 1;
    const originalHeight = selectedImage.height || 1;
    const scaleX = widthPixels / originalWidth;
    const scaleY = heightPixels / originalHeight;
    
    selectedImage.set({
      scaleX,
      scaleY
    });
    selectedImage.setCoords();
    
    // 更新状态
    setSize({ width: widthPixels, height: heightPixels });
    setSizeInches({ width: widthInches, height: heightInches });
    
    if (canvas) {
      canvas.renderAll();
      onUpdate();
    }
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

  // [2025-12-08] Crop功能实现
  const handleCrop = () => {
    if (!selectedImage || !canvas) return;
    
    try {
      // 获取图片元素的原始尺寸
      const imgElement = selectedImage.getElement() as HTMLImageElement;
      if (!imgElement) {
        alert('Unable to crop: image element not found');
        return;
      }
      
      // 创建临时canvas用于裁剪
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) {
        alert('Unable to crop: canvas context not available');
        return;
      }
      
      // 获取当前图片的边界框（考虑缩放和旋转）
      const boundingRect = selectedImage.getBoundingRect();
      const left = boundingRect.left;
      const top = boundingRect.top;
      const width = boundingRect.width;
      const height = boundingRect.height;
      
      // 设置临时canvas尺寸
      tempCanvas.width = width;
      tempCanvas.height = height;
      
      // 保存当前变换
      tempCtx.save();
      
      // 应用旋转和平移
      const angle = selectedImage.angle || 0;
      const centerX = width / 2;
      const centerY = height / 2;
      
      tempCtx.translate(centerX, centerY);
      tempCtx.rotate((angle * Math.PI) / 180);
      tempCtx.translate(-centerX, -centerY);
      
      // 绘制图片（考虑缩放）
      const scaleX = selectedImage.scaleX || 1;
      const scaleY = selectedImage.scaleY || 1;
      const imgWidth = (selectedImage.width || 0) * scaleX;
      const imgHeight = (selectedImage.height || 0) * scaleY;
      
      // 计算图片在canvas中的位置（居中）
      const imgLeft = (width - imgWidth) / 2;
      const imgTop = (height - imgHeight) / 2;
      
      tempCtx.drawImage(imgElement, imgLeft, imgTop, imgWidth, imgHeight);
      tempCtx.restore();
      
      // 从临时canvas创建新的图片
      tempCanvas.toBlob((blob) => {
        if (!blob) {
          alert('Failed to create cropped image');
          return;
        }
        
        const url = URL.createObjectURL(blob);
        fabric.Image.fromURL(url, (croppedImage) => {
          if (!croppedImage || !canvas || !selectedImage) {
            URL.revokeObjectURL(url);
            return;
          }
          
          // 保持原有的位置和属性
          croppedImage.set({
            left: selectedImage.left,
            top: selectedImage.top,
            originX: selectedImage.originX,
            originY: selectedImage.originY,
            angle: 0, // 裁剪后重置旋转
            scaleX: 1,
            scaleY: 1,
            name: selectedImage.name || `image_${Date.now()}`
          });
          
          // 替换原始图片
          canvas.remove(selectedImage);
          canvas.add(croppedImage);
          canvas.setActiveObject(croppedImage);
          canvas.renderAll();
          
          // 清理URL
          URL.revokeObjectURL(url);
          
          onUpdate();
        });
      }, 'image/png');
    } catch (error) {
      console.error('[EditUploadPanel] Error cropping image:', error);
      alert('Failed to crop image. Please try again.');
    }
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
        {/* Upload Size - [2025-12-08] 添加编辑功能和比例锁 */}
        <div className="dl-edit-upload-panel__section">
          <div className="dl-edit-upload-panel__size-header">
            <label className="dl-edit-upload-panel__label">Upload Size</label>
            <button
              type="button"
              className={`dl-edit-upload-panel__lock-btn ${aspectRatioLocked ? 'is-locked' : ''}`}
              onClick={() => setAspectRatioLocked(!aspectRatioLocked)}
              aria-label={aspectRatioLocked ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
              title={aspectRatioLocked ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
            >
              {aspectRatioLocked ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                </svg>
              )}
            </button>
          </div>
          <div className="dl-edit-upload-panel__size-inputs">
            <input
              type="number"
              className="dl-edit-upload-panel__size-input"
              value={sizeInches.width.toFixed(2)}
              onChange={(e) => {
                const newWidth = parseFloat(e.target.value) || 0;
                if (newWidth > 0) {
                  let newHeight = sizeInches.height;
                  if (aspectRatioLocked) {
                    // [2025-12-08] 锁定比例时，按比例计算高度
                    newHeight = newWidth / originalAspectRatio;
                  }
                  handleSizeChange(newWidth, newHeight);
                }
              }}
              step="0.01"
              min="0.1"
              placeholder="Width"
            />
            <span className="dl-edit-upload-panel__size-separator">×</span>
            <input
              type="number"
              className="dl-edit-upload-panel__size-input"
              value={sizeInches.height.toFixed(2)}
              onChange={(e) => {
                const newHeight = parseFloat(e.target.value) || 0;
                if (newHeight > 0) {
                  let newWidth = sizeInches.width;
                  if (aspectRatioLocked) {
                    // [2025-12-08] 锁定比例时，按比例计算宽度
                    newWidth = newHeight * originalAspectRatio;
                  }
                  handleSizeChange(newWidth, newHeight);
                }
              }}
              step="0.01"
              min="0.1"
              placeholder="Height"
            />
            <span className="dl-edit-upload-panel__size-unit">in</span>
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
            onClick={(e) => { 
              e.preventDefault();
              // [2025-12-08] 打开上传体验评分模态框
              if (onOpenRatingModal) {
                onOpenRatingModal();
              }
            }}
          >
            How would you rate our upload experience?
          </a>
        </div>
      </div>
    </div>
  );
};

export default EditUploadPanel;

