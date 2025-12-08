/**
 * Edit Art Panel - 编辑艺术素材面板
 * [2025-01-30 18:05:00] 实现 Edit Art 面板，包含所有艺术素材编辑控件
 * [2025-12-04 21:55:00] 按照 Custom Ink 顺序重组控件，添加英寸单位显示
 */
'use client';

import React, { useState, useEffect } from 'react';
// [2025-01-30 21:45:00] 修复 fabric.js 导入：在 Next.js 中使用命名空间导入
import * as fabric from 'fabric';

interface EditArtPanelProps {
  selectedArt: fabric.Image | null;
  canvas: fabric.Canvas | null;
  onUpdate: () => void;
  onChangeArt: () => void; // [2025-01-30 18:05:00] 重新选择 Art，返回到 Art Categories
}

// [2025-12-04 21:55:00] 像素转英寸转换函数（假设 150 DPI）
const pixelsToInches = (pixels: number): number => {
  const dpi = 150;
  return pixels / dpi;
};

const EditArtPanel: React.FC<EditArtPanelProps> = ({ selectedArt, canvas, onUpdate, onChangeArt }) => {
  const [rotation, setRotation] = useState(0);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [sizeInches, setSizeInches] = useState({ width: 0, height: 0 });
  const [aspectRatioLocked, setAspectRatioLocked] = useState(true); // [2025-12-08] 比例锁状态
  const [originalAspectRatio, setOriginalAspectRatio] = useState(1); // [2025-12-08] 原始宽高比

  // [2025-01-30 18:05:00] 更新艺术素材属性
  // [2025-12-04 21:55:00] 添加英寸单位转换
  useEffect(() => {
    if (selectedArt) {
      setRotation(selectedArt.angle || 0);
      
      // 计算实际尺寸（考虑缩放）
      const actualWidth = (selectedArt.width || 0) * (selectedArt.scaleX || 1);
      const actualHeight = (selectedArt.height || 0) * (selectedArt.scaleY || 1);
      setSize({ width: actualWidth, height: actualHeight });
      
      // 转换为英寸（150 DPI）
      setSizeInches({
        width: pixelsToInches(actualWidth),
        height: pixelsToInches(actualHeight)
      });
      
      // [2025-12-08] 保存原始宽高比
      if (actualHeight > 0) {
        setOriginalAspectRatio(actualWidth / actualHeight);
      }
    }
  }, [selectedArt]);

  // [2025-01-30 18:05:00] Center 按钮
  // [2025-01-30 22:05:00] 添加调试日志和错误处理
  const handleCenter = () => {
    if (!selectedArt || !canvas) {
      console.warn('[EditArtPanel] handleCenter: selectedArt or canvas is null');
      return;
    }
    
    console.log('[EditArtPanel] Centering art');
    const canvasWidth = canvas.width || 1000;
    const canvasHeight = canvas.height || 1200;
    
    selectedArt.set({
      left: canvasWidth / 2,
      top: canvasHeight / 2,
      originX: 'center',
      originY: 'center'
    });
    
    selectedArt.setCoords();
    canvas.renderAll();
    onUpdate();
  };

  // [2025-01-30 18:05:00] Bring to Front
  const handleBringToFront = () => {
    if (!selectedArt || !canvas) return;
    canvas.bringToFront(selectedArt);
    canvas.renderAll();
    onUpdate();
  };

  // [2025-01-30 18:05:00] Send to Back
  const handleSendToBack = () => {
    if (!selectedArt || !canvas) return;
    canvas.sendToBack(selectedArt);
    canvas.renderAll();
    onUpdate();
  };

  // [2025-01-30 18:05:00] Flip Horizontal
  const handleFlipHorizontal = () => {
    if (!selectedArt) return;
    selectedArt.set('flipX', !selectedArt.flipX);
    selectedArt.setCoords();
    if (canvas) {
      canvas.renderAll();
      onUpdate();
    }
  };

  // [2025-01-30 18:05:00] Flip Vertical
  const handleFlipVertical = () => {
    if (!selectedArt) return;
    selectedArt.set('flipY', !selectedArt.flipY);
    selectedArt.setCoords();
    if (canvas) {
      canvas.renderAll();
      onUpdate();
    }
  };

  // [2025-01-30 18:05:00] Duplicate
  const handleDuplicate = () => {
    if (!selectedArt || !canvas) return;
    
    selectedArt.clone((cloned: fabric.Image) => {
      cloned.set({
        left: (selectedArt.left || 0) + 20,
        top: (selectedArt.top || 0) + 20,
        name: `art_${Date.now()}`
      });
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      canvas.renderAll();
      onUpdate();
    });
  };

  // [2025-01-30 18:05:00] Rotation slider
  const handleRotationChange = (angle: number) => {
    setRotation(angle);
    if (selectedArt) {
      selectedArt.set('angle', angle);
      selectedArt.setCoords();
      if (canvas) {
        canvas.renderAll();
        onUpdate();
      }
    }
  };

  // [2025-01-30 18:05:00] Art Size（大小控制）
  // [2025-12-04 21:55:00] 更新英寸单位显示
  // [2025-12-08] 添加比例锁支持
  const handleSizeChange = (scale: number) => {
    if (!selectedArt) return;
    
    // [2025-12-08] 如果锁定比例，同时更新scaleX和scaleY
    if (aspectRatioLocked) {
      selectedArt.set({
        scaleX: scale,
        scaleY: scale
      });
    } else {
      // 如果不锁定，只更新scaleX（scaleY保持不变）
      selectedArt.set({
        scaleX: scale
      });
    }
    
    selectedArt.setCoords();
    
    // 更新显示的尺寸
    const actualWidth = (selectedArt.width || 0) * (selectedArt.scaleX || 1);
    const actualHeight = (selectedArt.height || 0) * (selectedArt.scaleY || 1);
    setSize({ width: actualWidth, height: actualHeight });
    
    // 更新英寸单位
    setSizeInches({
      width: pixelsToInches(actualWidth),
      height: pixelsToInches(actualHeight)
    });
    
    if (canvas) {
      canvas.renderAll();
      onUpdate();
    }
  };
  
  // [2025-12-08] 处理宽度变化（当比例锁未锁定时）
  const handleWidthChange = (widthInches: number) => {
    if (!selectedArt || aspectRatioLocked) return;
    
    const dpi = 150;
    const widthPixels = widthInches * dpi;
    const originalWidth = selectedArt.width || 1;
    const scaleX = widthPixels / originalWidth;
    
    selectedArt.set({ scaleX });
    selectedArt.setCoords();
    
    const actualWidth = originalWidth * scaleX;
    const actualHeight = (selectedArt.height || 0) * (selectedArt.scaleY || 1);
    setSize({ width: actualWidth, height: actualHeight });
    setSizeInches({
      width: widthInches,
      height: pixelsToInches(actualHeight)
    });
    
    if (canvas) {
      canvas.renderAll();
      onUpdate();
    }
  };
  
  // [2025-12-08] 处理高度变化（当比例锁未锁定时）
  const handleHeightChange = (heightInches: number) => {
    if (!selectedArt || aspectRatioLocked) return;
    
    const dpi = 150;
    const heightPixels = heightInches * dpi;
    const originalHeight = selectedArt.height || 1;
    const scaleY = heightPixels / originalHeight;
    
    selectedArt.set({ scaleY });
    selectedArt.setCoords();
    
    const actualWidth = (selectedArt.width || 0) * (selectedArt.scaleX || 1);
    const actualHeight = originalHeight * scaleY;
    setSize({ width: actualWidth, height: actualHeight });
    setSizeInches({
      width: pixelsToInches(actualWidth),
      height: heightInches
    });
    
    if (canvas) {
      canvas.renderAll();
      onUpdate();
    }
  };

  // [2025-01-30 18:05:00] Make One Color（简化版）
  // [2025-12-04 22:00:00] 实现单色化功能：将图像转换为灰度
  const handleMakeOneColor = () => {
    if (!selectedArt || !canvas) return;
    
    try {
      // 使用 Canvas API 将图像转换为灰度
      const imgElement = selectedArt.getElement() as HTMLImageElement;
      if (!imgElement) return;
      
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;
      
      tempCanvas.width = imgElement.width || selectedArt.width || 1;
      tempCanvas.height = imgElement.height || selectedArt.height || 1;
      
      // 绘制原始图像
      tempCtx.drawImage(imgElement, 0, 0);
      
      // 获取图像数据并转换为灰度
      const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        // 灰度公式：0.299*R + 0.587*G + 0.114*B
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = gray;     // R
        data[i + 1] = gray; // G
        data[i + 2] = gray; // B
        // data[i + 3] 保持 alpha 不变
      }
      
      tempCtx.putImageData(imageData, 0, 0);
      
      // 从处理后的 Canvas 创建新的 Fabric Image
      tempCanvas.toBlob((blob) => {
        if (!blob) return;
        
        const url = URL.createObjectURL(blob);
        fabric.Image.fromURL(url, (fabricImage) => {
          if (fabricImage && canvas && selectedArt) {
            // 保持原有的位置和缩放
            fabricImage.set({
              left: selectedArt.left,
              top: selectedArt.top,
              scaleX: selectedArt.scaleX,
              scaleY: selectedArt.scaleY,
              angle: selectedArt.angle,
              originX: selectedArt.originX,
              originY: selectedArt.originY,
              name: selectedArt.name || `art_${Date.now()}`
            });
            
            // 替换原始图像
            canvas.remove(selectedArt);
            canvas.add(fabricImage);
            canvas.setActiveObject(fabricImage);
            canvas.renderAll();
            
            // 清理 URL
            URL.revokeObjectURL(url);
            
            onUpdate();
          }
        });
      }, 'image/png');
    } catch (error) {
      console.error('[EditArtPanel] Error making one color:', error);
      alert('Failed to apply Make One Color effect');
    }
  };

  // [2025-01-30 18:05:00] Edit Colors（简化版）
  // [2025-12-04 22:00:00] 实现颜色编辑功能：颜色叠加（简化版）
  const handleEditColors = () => {
    if (!selectedArt || !canvas) return;
    
    // 简化版：显示颜色选择器，应用颜色叠加效果
    const color = prompt('Enter a hex color (e.g., #FF0000 for red):', '#000000');
    if (!color) return;
    
    try {
      const imgElement = selectedArt.getElement() as HTMLImageElement;
      if (!imgElement) return;
      
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;
      
      tempCanvas.width = imgElement.width || selectedArt.width || 1;
      tempCanvas.height = imgElement.height || selectedArt.height || 1;
      
      // 绘制原始图像
      tempCtx.drawImage(imgElement, 0, 0);
      
      // 应用颜色叠加
      tempCtx.globalCompositeOperation = 'multiply';
      tempCtx.fillStyle = color;
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      
      // 从处理后的 Canvas 创建新的 Fabric Image
      tempCanvas.toBlob((blob) => {
        if (!blob) return;
        
        const url = URL.createObjectURL(blob);
        fabric.Image.fromURL(url, (fabricImage) => {
          if (fabricImage && canvas && selectedArt) {
            // 保持原有的位置和缩放
            fabricImage.set({
              left: selectedArt.left,
              top: selectedArt.top,
              scaleX: selectedArt.scaleX,
              scaleY: selectedArt.scaleY,
              angle: selectedArt.angle,
              originX: selectedArt.originX,
              originY: selectedArt.originY,
              name: selectedArt.name || `art_${Date.now()}`
            });
            
            // 替换原始图像
            canvas.remove(selectedArt);
            canvas.add(fabricImage);
            canvas.setActiveObject(fabricImage);
            canvas.renderAll();
            
            // 清理 URL
            URL.revokeObjectURL(url);
            
            onUpdate();
          }
        });
      }, 'image/png');
    } catch (error) {
      console.error('[EditArtPanel] Error editing colors:', error);
      alert('Failed to apply color edit effect');
    }
  };

  if (!selectedArt) {
    return (
      <div className="dl-edit-art-panel">
        <p>No art selected</p>
      </div>
    );
  }

  const currentScale = selectedArt.scaleX || 1;

  // [2025-12-04 21:55:00] 按照 Custom Ink 顺序重新排列控件
  return (
    <div className="dl-edit-art-panel">
      {/* 1. Art Size（宽×高，单位 in）- [2025-12-08] 添加比例锁 */}
      <div className="dl-edit-art-panel__section">
        <div className="dl-edit-art-panel__size-header">
          <label className="dl-edit-art-panel__label">
            Art Size: {sizeInches.width.toFixed(2)} × {sizeInches.height.toFixed(2)} in
          </label>
          <button
            type="button"
            className={`dl-edit-art-panel__lock-btn ${aspectRatioLocked ? 'is-locked' : ''}`}
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
        {aspectRatioLocked ? (
          // 锁定比例时，使用单个滑块
          <input
            type="range"
            min="0.1"
            max="2"
            step="0.1"
            value={currentScale}
            onChange={(e) => handleSizeChange(parseFloat(e.target.value))}
            className="dl-edit-art-panel__slider"
          />
        ) : (
          // 未锁定比例时，显示宽度和高度输入框
          <div className="dl-edit-art-panel__size-inputs">
            <div className="dl-edit-art-panel__size-input-group">
              <label className="dl-edit-art-panel__size-label">Width</label>
              <input
                type="number"
                className="dl-edit-art-panel__size-input"
                value={sizeInches.width.toFixed(2)}
                onChange={(e) => handleWidthChange(parseFloat(e.target.value) || 0)}
                step="0.01"
                min="0.1"
              />
              <span className="dl-edit-art-panel__size-unit">in</span>
            </div>
            <div className="dl-edit-art-panel__size-input-group">
              <label className="dl-edit-art-panel__size-label">Height</label>
              <input
                type="number"
                className="dl-edit-art-panel__size-input"
                value={sizeInches.height.toFixed(2)}
                onChange={(e) => handleHeightChange(parseFloat(e.target.value) || 0)}
                step="0.01"
                min="0.1"
              />
              <span className="dl-edit-art-panel__size-unit">in</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Center */}
      <div className="dl-edit-art-panel__section">
        <button
          className="dl-edit-art-panel__btn"
          onClick={handleCenter}
          type="button"
        >
          Center
        </button>
      </div>

      {/* 3. Layering */}
      <div className="dl-edit-art-panel__section">
        <label className="dl-edit-art-panel__label">Layering</label>
        <div className="dl-edit-art-panel__btn-group">
          <button
            className="dl-edit-art-panel__btn"
            onClick={handleBringToFront}
            type="button"
          >
            Bring to Front
          </button>
          <button
            className="dl-edit-art-panel__btn"
            onClick={handleSendToBack}
            type="button"
          >
            Send to Back
          </button>
        </div>
      </div>

      {/* 4. Flip */}
      <div className="dl-edit-art-panel__section">
        <label className="dl-edit-art-panel__label">Flip</label>
        <div className="dl-edit-art-panel__btn-group">
          <button
            className="dl-edit-art-panel__btn"
            onClick={handleFlipHorizontal}
            type="button"
          >
            Flip Horizontal
          </button>
          <button
            className="dl-edit-art-panel__btn"
            onClick={handleFlipVertical}
            type="button"
          >
            Flip Vertical
          </button>
        </div>
      </div>

      {/* 5. Duplicate */}
      <div className="dl-edit-art-panel__section">
        <button
          className="dl-edit-art-panel__btn"
          onClick={handleDuplicate}
          type="button"
        >
          Duplicate
        </button>
      </div>

      {/* 6. Rotation slider */}
      <div className="dl-edit-art-panel__section">
        <label className="dl-edit-art-panel__label">
          Rotation: {rotation.toFixed(0)}°
        </label>
        <input
          type="range"
          min="0"
          max="360"
          value={rotation}
          onChange={(e) => handleRotationChange(parseFloat(e.target.value))}
          className="dl-edit-art-panel__slider"
        />
      </div>

      {/* 7. Make One Color */}
      <div className="dl-edit-art-panel__section">
        <button
          className="dl-edit-art-panel__btn"
          onClick={handleMakeOneColor}
          type="button"
        >
          Make One Color
        </button>
      </div>

      {/* 8. Edit Colors */}
      <div className="dl-edit-art-panel__section">
        <button
          className="dl-edit-art-panel__btn"
          onClick={handleEditColors}
          type="button"
        >
          Edit Colors
        </button>
      </div>

      {/* 9. Change Art */}
      <div className="dl-edit-art-panel__section">
        <button
          className="dl-edit-art-panel__btn dl-edit-art-panel__btn--primary"
          onClick={onChangeArt}
          type="button"
        >
          Change Art
        </button>
      </div>
    </div>
  );
};

export default EditArtPanel;

