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
  // [2025-01-30 10:30:00] 移除 makeOneColor 和 removeBackground 状态（功能已移除）
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

  // [2025-01-30 10:30:00] 移除 Edit Colors 颜色色板（功能已移除）

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

        {/* [2025-01-30 10:30:00] 移除 Edit Colors、Make One Color New! 和 Remove Background Color 模块（按需求） */}

        {/* Positioning Controls - [2025-01-30 10:45:00] 更新图标为新的SVG样式 */}
        <div className="dl-edit-upload-panel__section">
          <div className="dl-edit-upload-panel__controls">
            {/* Center Tool */}
            <div className="dl-edit-upload-panel__tool-group">
              <button
                className="dl-edit-upload-panel__control-btn"
                onClick={handleCenter}
                type="button"
                aria-label="Center"
                title="Center"
              >
                <svg id="17-center" data-name="17-center" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 38.98 38.98" width="20" height="20">
                  <title>17-center-01</title>
                  <rect className="cls-1" x="18.49" y="10.1" width="2" height="18.79" fill="currentColor" />
                  <polygon className="cls-1" points="28.37 24.37 23.49 19.49 28.37 14.61 29.79 16.02 26.32 19.49 29.79 22.96 28.37 24.37" fill="currentColor" />
                  <polygon className="cls-1" points="10.61 14.61 15.49 19.49 10.61 24.37 9.2 22.96 12.66 19.49 9.2 16.02 10.61 14.61" fill="currentColor" />
                </svg>
              </button>
              <div className="dl-edit-upload-panel__tool-label">Center</div>
            </div>

            {/* Layering Tool */}
            <div className="dl-edit-upload-panel__tool-group">
              <div className="dl-edit-upload-panel__tool-buttons">
                <button
                  className="dl-edit-upload-panel__control-btn"
                  onClick={handleBringToFront}
                  type="button"
                  aria-label="Bring to Front"
                  title="Bring to Front"
                >
                  <svg width="20" height="21" viewBox="11 0 20 21" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink">
                    <path d="M29.0478491,10.7540124 L20.8931398,15.885529 C20.6668449,16.0279163 20.385773,16.0278536 20.1594781,15.885529 L12.0046479,10.7540124 C11.7915792,10.6198314 11.6643299,10.3854217 11.6643299,10.1268946 C11.6643299,9.86830477 11.7915792,9.63383247 12.0046479,9.49971407 L13.2058771,8.74386511 L19.8149324,12.9027258 L19.814872,12.9027258 C20.0342821,13.0407907 20.2802653,13.1098231 20.5262485,13.1097605 C20.7722318,13.1097605 21.0182754,13.0407907 21.2376854,12.9027258 L27.8467408,8.74386511 L29.0478491,9.49971407 C29.2609782,9.63383247 29.388288,9.86830477 29.388288,10.1268946 C29.3882276,10.3854217 29.2609782,10.6198314 29.0478491,10.7540124 L29.0478491,10.7540124 Z M29.0478491,13.0716736 C29.2609782,13.2058546 29.388288,13.4402643 29.388288,13.6988541 C29.388288,13.9573812 29.2609782,14.1917909 29.0478491,14.3259093 L20.8931398,19.4574885 C20.6668449,19.5999384 20.3857126,19.5998131 20.1594781,19.4574885 L12.0046479,14.3259093 C11.7915792,14.1917909 11.6643299,13.9573812 11.6643299,13.6988541 C11.6643299,13.4402643 11.7915792,13.2058546 12.0047083,13.0716736 L13.2058771,12.315762 L19.814872,16.4746226 C20.0342821,16.6126875 20.2802653,16.6817826 20.5262485,16.68172 C20.7722318,16.68172 21.0182754,16.6126875 21.2376854,16.4746226 L27.8466804,12.3158246 L29.0478491,13.0716736 Z M30.0526179,10.1268946 C30.0526179,9.62537569 29.8057891,9.17071368 29.3923948,8.91055781 L28.4870944,8.34088348 L29.3923948,7.77120915 C29.8057891,7.51105328 30.0526179,7.05639128 30.0526179,6.5548724 C30.0526179,6.05341617 29.8057891,5.59875416 29.3923948,5.33866094 L21.2376854,0.207019052 C20.7988653,-0.0690481091 20.2536317,-0.0689854662 19.8149324,0.207081695 L11.6601023,5.33866094 C11.2467683,5.59875416 11,6.05341617 11,6.5548724 C11,7.05639128 11.2467683,7.51105328 11.6601023,7.77114651 L12.5654631,8.34088348 L11.6601023,8.91055781 C11.2467683,9.17071368 11,9.62537569 11,10.1268946 C11,10.6283508 11.2467683,11.0830128 11.6601023,11.343106 L12.5654631,11.912843 L11.6601023,12.48258 C11.2467683,12.7426732 11,13.1973352 11,13.6988541 C11,14.2003103 11.2467683,14.6549097 11.6601023,14.9150655 L19.814872,20.0466448 C20.0342821,20.1847097 20.2802653,20.2537421 20.5262485,20.2536795 C20.7722318,20.2536795 21.0182754,20.1847097 21.2376854,20.0466448 L29.3923948,14.9150655 C29.8057891,14.6549097 30.0526179,14.2003103 30.0526179,13.6988541 C30.0526179,13.1973352 29.8057891,12.7426732 29.3923948,12.48258 L28.487034,11.912843 L29.3923948,11.343106 C29.8057891,11.0830128 30.0525575,10.6283508 30.0526179,10.1268946 L30.0526179,10.1268946 Z" fill="currentColor" />
                  </svg>
                </button>
                <button
                  className="dl-edit-upload-panel__control-btn"
                  onClick={handleSendToBack}
                  type="button"
                  aria-label="Send to Back"
                  title="Send to Back"
                >
                  <svg width="20" height="21" viewBox="13 0 20 21" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink">
                    <path d="M31.0478491,10.7540124 L22.8931398,15.885529 C22.6668449,16.0279163 22.385773,16.0278536 22.1594781,15.885529 L14.0046479,10.7540124 C13.7915792,10.6198314 13.6643299,10.3854217 13.6643299,10.1268946 C13.6643299,9.86830477 13.7915792,9.63383247 14.0046479,9.49971407 L15.2058167,8.74386511 L21.8149324,12.9027258 L21.814872,12.9027258 C22.0342821,13.0407907 22.2802653,13.1098231 22.5262485,13.1097605 C22.7722318,13.1097605 23.0182754,13.0407907 23.2376854,12.9027258 L29.8467408,8.74386511 L31.0478491,9.49971407 C31.2609782,9.63383247 31.388288,9.86830477 31.388288,10.1268946 C31.3882276,10.3854217 31.2609782,10.6198314 31.0478491,10.7540124 M13.6643299,6.5548724 C13.6643299,6.29634525 13.7915792,6.06187296 14.0046479,5.92775456 L22.1594781,0.796175315 C22.2725953,0.725013006 22.3994219,0.689431852 22.5262485,0.689431852 C22.6531355,0.689431852 22.7800225,0.725013006 22.8931398,0.796175315 L31.0478491,5.9278172 C31.2609782,6.06187296 31.388288,6.29634525 31.388288,6.5548724 C31.388288,6.8134622 31.2609782,7.04793449 31.0478491,7.18205289 L22.8931398,12.3136321 C22.6668449,12.456082 22.3857126,12.4559567 22.1594781,12.3136321 L14.0046479,7.18205289 C13.7915792,7.04793449 13.6643299,6.8134622 13.6643299,6.5548724 M32.0526179,10.1268946 C32.0526179,9.62537569 31.8057891,9.17071368 31.3923948,8.91055781 L30.4870944,8.34088348 L31.3923948,7.77120915 C31.8057891,7.51105328 32.0526179,7.05639128 32.0526179,6.5548724 C32.0526179,6.05341617 31.8057891,5.59875416 31.3923948,5.33866094 L23.2376854,0.207019052 C22.7988653,-0.0690481091 22.2536317,-0.0689854662 21.8149324,0.207081695 L13.6601023,5.33866094 C13.2467683,5.59875416 13,6.05341617 13,6.5548724 C13,7.05639128 13.2467683,7.51105328 13.6601023,7.77114651 L14.5654631,8.34088348 L13.6601023,8.91055781 C13.2467683,9.17071368 13,9.62537569 13,10.1268946 C13,10.6283508 13.2467683,11.0830128 13.6601023,11.343106 L14.5654631,11.912843 L13.6601023,12.48258 C13.2467683,12.7426732 13,13.1973352 13,13.6988541 C13,14.2003103 13.2467683,14.6549097 13.6601023,14.9150655 L21.814872,20.0466448 C22.0342821,20.1847097 22.2802653,20.2537421 22.5262485,20.2536795 C22.7722318,20.2536795 23.0182754,20.1847097 23.2376854,20.0466448 L31.3923948,14.9150655 C31.8057891,14.6549097 32.0526179,14.2003103 32.0526179,13.6988541 C32.0526179,13.1973352 31.8057891,12.7426732 31.3923948,12.48258 L30.487034,11.912843 L31.3923948,11.343106 C31.8057891,11.0830128 32.0525575,10.6283508 32.0526179,10.1268946" fill="currentColor" />
                  </svg>
                </button>
              </div>
              <div className="dl-edit-upload-panel__tool-label">Layering</div>
            </div>

            {/* Flip Tool */}
            <div className="dl-edit-upload-panel__tool-group">
              <div className="dl-edit-upload-panel__tool-buttons">
                <button
                  className="dl-edit-upload-panel__control-btn"
                  onClick={handleFlipHorizontal}
                  type="button"
                  aria-label="Flip Horizontal"
                  title="Flip Horizontal"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink">
                    <title>Flip Icon</title>
                    <desc>Flip icon for art and upload tools</desc>
                    <g stroke="currentColor" strokeLinejoin="round" fill="none">
                      <polygon points="1,3 1,15, 6,9" strokeLinejoin="round" fill="currentColor" />
                      <polygon points="17,3 17,15, 12,9" fill="none" />
                    </g>
                    <g fill="currentColor">
                      <rect x="8.3624" y="10.7835768" width="1.275" height="1.33399553" />
                      <rect x="8.3624" y="16.1178451" width="1.275" height="1.33399553" />
                      <rect x="8.3624" y="8.11665691" width="1.275" height="1.33356707" />
                      <rect x="8.3624" y="13.4509252" width="1.275" height="1.33356707" />
                      <rect x="8.3624" y="5.44930854" width="1.275" height="1.33399553" />
                      <rect x="8.3624" y="0.114826016" width="1.275" height="1.33399553" />
                      <rect x="8.3624" y="2.78217439" width="1.275" height="1.33356707" />
                    </g>
                  </svg>
                </button>
                <button
                  className="dl-edit-upload-panel__control-btn"
                  onClick={handleFlipVertical}
                  type="button"
                  aria-label="Flip Vertical"
                  title="Flip Vertical"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink">
                    <title>Flop Icon</title>
                    <desc>Flop icon for art and upload tools</desc>
                    <g stroke="currentColor" strokeLinejoin="round" fill="none">
                      <polygon points="3,1 15,1, 9,6" strokeLinejoin="round" fill="currentColor" />
                      <polygon points="3,17 15,17, 9,12" fill="none" />
                    </g>
                    <g fill="currentColor">
                      <rect y="8.3624" x="10.7835768" height="1.275" width="1.33399553" />
                      <rect y="8.3624" x="16.1178451" height="1.275" width="1.33399553" />
                      <rect y="8.3624" x="8.11665691" height="1.275" width="1.33356707" />
                      <rect y="8.3624" x="13.4509252" height="1.275" width="1.33356707" />
                      <rect y="8.3624" x="5.44930854" height="1.275" width="1.33399553" />
                      <rect y="8.3624" x="0.114826016" height="1.275" width="1.33399553" />
                      <rect y="8.3624" x="2.78217439" height="1.275" width="1.33356707" />
                    </g>
                  </svg>
                </button>
              </div>
              <div className="dl-edit-upload-panel__tool-label">Flip</div>
            </div>

            {/* Duplicate Tool */}
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

            {/* Crop Tool */}
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

