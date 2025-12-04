/**
 * Edit Upload Panel - 编辑上传图片面板
 * [2025-01-30 17:20:00] 实现 Edit Upload 面板，包含 Size、Center、Layering、Flip、Duplicate、Crop、Rotation 等控件
 */
'use client';

import React, { useState, useEffect } from 'react';
import { fabric } from 'fabric';

interface EditUploadPanelProps {
  selectedImage: fabric.Image | null;
  canvas: fabric.Canvas | null;
  onUpdate: () => void;
}

const EditUploadPanel: React.FC<EditUploadPanelProps> = ({ selectedImage, canvas, onUpdate }) => {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [rotation, setRotation] = useState(0);

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
  const handleCenter = () => {
    if (!selectedImage || !canvas) return;
    
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

  if (!selectedImage) {
    return (
      <div className="dl-edit-upload-panel">
        <p>No image selected</p>
      </div>
    );
  }

  return (
    <div className="dl-edit-upload-panel">
      <div className="dl-edit-upload-panel__section">
        <label className="dl-edit-upload-panel__label">Size</label>
        <div className="dl-edit-upload-panel__size">
          <span>{size.width.toFixed(2)}&quot; × {size.height.toFixed(2)}&quot;</span>
        </div>
      </div>

      <div className="dl-edit-upload-panel__section">
        <button
          className="dl-edit-upload-panel__btn"
          onClick={handleCenter}
          type="button"
        >
          Center
        </button>
      </div>

      <div className="dl-edit-upload-panel__section">
        <label className="dl-edit-upload-panel__label">Layering</label>
        <div className="dl-edit-upload-panel__btn-group">
          <button
            className="dl-edit-upload-panel__btn"
            onClick={handleBringToFront}
            type="button"
          >
            Bring to Front
          </button>
          <button
            className="dl-edit-upload-panel__btn"
            onClick={handleSendToBack}
            type="button"
          >
            Send to Back
          </button>
        </div>
      </div>

      <div className="dl-edit-upload-panel__section">
        <label className="dl-edit-upload-panel__label">Flip</label>
        <div className="dl-edit-upload-panel__btn-group">
          <button
            className="dl-edit-upload-panel__btn"
            onClick={handleFlipHorizontal}
            type="button"
          >
            Flip Horizontal
          </button>
          <button
            className="dl-edit-upload-panel__btn"
            onClick={handleFlipVertical}
            type="button"
          >
            Flip Vertical
          </button>
        </div>
      </div>

      <div className="dl-edit-upload-panel__section">
        <button
          className="dl-edit-upload-panel__btn"
          onClick={handleDuplicate}
          type="button"
        >
          Duplicate
        </button>
      </div>

      <div className="dl-edit-upload-panel__section">
        <button
          className="dl-edit-upload-panel__btn"
          onClick={handleCrop}
          type="button"
        >
          Crop
        </button>
      </div>

      <div className="dl-edit-upload-panel__section">
        <label className="dl-edit-upload-panel__label">
          Rotation: {rotation.toFixed(0)}°
        </label>
        <input
          type="range"
          min="0"
          max="360"
          value={rotation}
          onChange={handleRotationChange}
          className="dl-edit-upload-panel__slider"
        />
      </div>
    </div>
  );
};

export default EditUploadPanel;

