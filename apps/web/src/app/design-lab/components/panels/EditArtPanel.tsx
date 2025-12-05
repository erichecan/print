/**
 * Edit Art Panel - 编辑艺术素材面板
 * [2025-01-30 18:05:00] 实现 Edit Art 面板，包含所有艺术素材编辑控件
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

const EditArtPanel: React.FC<EditArtPanelProps> = ({ selectedArt, canvas, onUpdate, onChangeArt }) => {
  const [rotation, setRotation] = useState(0);
  const [size, setSize] = useState({ width: 0, height: 0 });

  // [2025-01-30 18:05:00] 更新艺术素材属性
  useEffect(() => {
    if (selectedArt) {
      setRotation(selectedArt.angle || 0);
      
      // 计算实际尺寸（考虑缩放）
      const actualWidth = (selectedArt.width || 0) * (selectedArt.scaleX || 1);
      const actualHeight = (selectedArt.height || 0) * (selectedArt.scaleY || 1);
      setSize({ width: actualWidth, height: actualHeight });
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
  const handleSizeChange = (scale: number) => {
    if (!selectedArt) return;
    selectedArt.set({
      scaleX: scale,
      scaleY: scale
    });
    selectedArt.setCoords();
    
    // 更新显示的尺寸
    const actualWidth = (selectedArt.width || 0) * scale;
    const actualHeight = (selectedArt.height || 0) * scale;
    setSize({ width: actualWidth, height: actualHeight });
    
    if (canvas) {
      canvas.renderAll();
      onUpdate();
    }
  };

  // [2025-01-30 18:05:00] Make One Color（简化版 - 占位）
  const handleMakeOneColor = () => {
    // TODO: 实现单色化功能
    alert('Make One Color feature coming soon');
  };

  // [2025-01-30 18:05:00] Edit Colors（简化版 - 占位）
  const handleEditColors = () => {
    // TODO: 实现颜色编辑功能
    alert('Edit Colors feature coming soon');
  };

  if (!selectedArt) {
    return (
      <div className="dl-edit-art-panel">
        <p>No art selected</p>
      </div>
    );
  }

  const currentScale = selectedArt.scaleX || 1;

  return (
    <div className="dl-edit-art-panel">
      <div className="dl-edit-art-panel__section">
        <button
          className="dl-edit-art-panel__btn"
          onClick={handleCenter}
          type="button"
        >
          Center
        </button>
      </div>

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

      <div className="dl-edit-art-panel__section">
        <button
          className="dl-edit-art-panel__btn"
          onClick={handleDuplicate}
          type="button"
        >
          Duplicate
        </button>
      </div>

      {/* [2025-01-30 23:40:00] 修复：按照 Custom Ink 顺序重新排列控件 */}
      {/* 5. Rotation slider */}
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

      {/* 6. Make One Color */}
      <div className="dl-edit-art-panel__section">
        <button
          className="dl-edit-art-panel__btn"
          onClick={handleMakeOneColor}
          type="button"
        >
          Make One Color
        </button>
      </div>

      {/* 7. Edit Colors */}
      <div className="dl-edit-art-panel__section">
        <button
          className="dl-edit-art-panel__btn"
          onClick={handleEditColors}
          type="button"
        >
          Edit Colors
        </button>
      </div>

      {/* 8. Change Art */}
      <div className="dl-edit-art-panel__section">
        <button
          className="dl-edit-art-panel__btn dl-edit-art-panel__btn--primary"
          onClick={onChangeArt}
          type="button"
        >
          Change Art
        </button>
      </div>

      {/* 9. Art Size */}
      <div className="dl-edit-art-panel__section">
        <label className="dl-edit-art-panel__label">
          Art Size: {size.width.toFixed(0)} × {size.height.toFixed(0)}px
        </label>
        <input
          type="range"
          min="0.1"
          max="2"
          step="0.1"
          value={currentScale}
          onChange={(e) => handleSizeChange(parseFloat(e.target.value))}
          className="dl-edit-art-panel__slider"
        />
      </div>
    </div>
  );
};

export default EditArtPanel;

