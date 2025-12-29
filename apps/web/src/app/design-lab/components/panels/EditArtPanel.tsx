/**
 * Edit Art Panel - 编辑艺术素材面板
 * [2025-01-30 18:05:00] 实现 Edit Art 面板，包含所有艺术素材编辑控件
 * [2025-12-04 21:55:00] 按照 Custom Ink 顺序重组控件，添加英寸单位显示
 */
'use client';

import React, { useState, useEffect } from 'react';
// [2025-01-30 21:45:00] 修复 fabric.js 导入：在 Next.js 中使用命名空间导入
import * as fabric from 'fabric';
import { ArtEditControls } from '../../../design-lab5/toolbar/controls'; // 2025-12-16 02:42:00 复用 Art 工具栏组件
import { applyCornerControls } from '../../../design-lab5/upload-controls/registerUploadCornerControls';

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
  const [color, setColor] = useState('#000000'); // [2025-01-30 13:40:00] Edit Colors 状态

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

  // [2025-12-16 04:06:00] Bring to Front - 修复 Fabric.js v6 API
  const handleBringToFront = () => {
    if (!selectedArt || !canvas) return;
    try {
      if (typeof (canvas as any).bringObjectToFront === 'function') {
        (canvas as any).bringObjectToFront(selectedArt);
      } else if (typeof (selectedArt as any).bringToFront === 'function') {
        (selectedArt as any).bringToFront();
      } else {
        const objects = canvas.getObjects();
        const index = objects.indexOf(selectedArt);
        if (index >= 0 && index < objects.length - 1) {
          objects.splice(index, 1);
          objects.push(selectedArt);
          canvas.renderAll();
        }
      }
      canvas.renderAll();
      onUpdate();
    } catch (error) {
      console.error('[EditArtPanel] bringToFront failed:', error);
    }
  };

  // [2025-12-16 04:06:00] Send to Back - 修复 Fabric.js v6 API
  // [2025-12-16 04:15:00] 限制：不能将对象移到商品底图（background）下面
  const handleSendToBack = async () => {
    if (!selectedArt || !canvas) return;
    try {
      const objects = canvas.getObjects();
      const currentIndex = objects.indexOf(selectedArt);
      if (currentIndex === -1) return;

      // 找到商品底图的位置（name === 'background' 或 name.startsWith('product-image-') 或 layerType === 'product'/'product-image'）
      const backgroundIndex = objects.findIndex((obj: any) => {
        const name = (obj as any).name || '';
        const layerType = (obj as any).data?.layerType;
        return name === 'background' || name.startsWith('product-image-') || layerType === 'product' || layerType === 'product-image';
      });

      // 计算目标索引：应该在商品底图之后（索引 = backgroundIndex + 1）
      const targetIndex = backgroundIndex >= 0 ? backgroundIndex + 1 : 0;

      // [2025-12-16 04:30:00] 添加调试日志
      console.log('[EditArtPanel] sendToBack called:', {
        currentIndex,
        backgroundIndex,
        targetIndex,
        objectsCount: objects.length,
      });

      // [2025-12-16 04:20:00] 如果已经在目标位置，不需要移动
      if (currentIndex === targetIndex) {
        console.log('[EditArtPanel] Already at target position, skipping');
        return;
      }

      // [2025-12-16 05:00:00] 使用原生方法 sendObjectToBack，然后检查并调整位置
      // 先使用 Fabric.js 原生方法将对象移到底部
      if (typeof (canvas as any).sendObjectToBack === 'function') {
        try {
          (canvas as any).sendObjectToBack(selectedArt);
        } catch (e) {
          console.warn('[EditArtPanel] sendObjectToBack failed:', e);
        }
      } else if (typeof (selectedArt as any).sendToBack === 'function') {
        try {
          (selectedArt as any).sendToBack();
        } catch (e) {
          console.warn('[EditArtPanel] sendToBack failed:', e);
        }
      } else {
        // 如果原生方法不可用，使用手动方法
        const adjustedTargetIndex = currentIndex < targetIndex ? targetIndex - 1 : targetIndex;
        objects.splice(currentIndex, 1);
        objects.splice(adjustedTargetIndex, 0, selectedArt);
        canvas.renderAll();
        onUpdate();
        return;
      }

      // [2025-12-16 05:10:00] 检查并调整：确保对象在商品底图之后
      // 等待一个 tick 确保原生方法执行完成
      await new Promise(resolve => setTimeout(resolve, 0));

      const objectsAfter = canvas.getObjects();
      const indexAfter = objectsAfter.indexOf(selectedArt);
      const backgroundIndexAfter = objectsAfter.findIndex((obj: any) => {
        const name = (obj as any).name || '';
        const layerType = (obj as any).data?.layerType;
        return name === 'background' || name.startsWith('product-image-') || layerType === 'product' || layerType === 'product-image';
      });

      console.log('[EditArtPanel] After native sendObjectToBack:', {
        indexAfter,
        backgroundIndexAfter,
        shouldBeAt: backgroundIndexAfter >= 0 ? backgroundIndexAfter + 1 : 0,
      });

      // 如果对象在商品底图之前或等于商品底图索引，需要调整到商品底图之后
      if (backgroundIndexAfter >= 0 && indexAfter <= backgroundIndexAfter) {
        console.log('[EditArtPanel] ⚠️ Object is at or below background, adjusting...');
        const adjustedTargetIndex = backgroundIndexAfter + 1;
        objectsAfter.splice(indexAfter, 1);
        objectsAfter.splice(adjustedTargetIndex, 0, selectedArt);
        canvas.renderAll();
        console.log('[EditArtPanel] ✅ Adjusted from index', indexAfter, 'to index', adjustedTargetIndex);
      } else if (backgroundIndexAfter >= 0 && indexAfter !== backgroundIndexAfter + 1) {
        const adjustedTargetIndex = backgroundIndexAfter + 1;
        objectsAfter.splice(indexAfter, 1);
        const finalAdjustedIndex = indexAfter < adjustedTargetIndex ? adjustedTargetIndex - 1 : adjustedTargetIndex;
        objectsAfter.splice(finalAdjustedIndex, 0, selectedArt);
        canvas.renderAll();
        console.log('[EditArtPanel] ✅ Adjusted from index', indexAfter, 'to index', finalAdjustedIndex);
      }

      const finalObjects = canvas.getObjects();
      const finalIndex = finalObjects.indexOf(selectedArt);
      const finalBackgroundIndex = finalObjects.findIndex((obj: any) => {
        const name = (obj as any).name || '';
        const layerType = (obj as any).data?.layerType;
        return name === 'background' || name.startsWith('product-image-') || layerType === 'product' || layerType === 'product-image';
      });
      const finalTargetIndex = finalBackgroundIndex >= 0 ? finalBackgroundIndex + 1 : 0;

      console.log('[EditArtPanel] sendToBack completed:', {
        finalIndex,
        finalTargetIndex,
        isCorrect: finalIndex === finalTargetIndex,
      });
      canvas.renderAll();
      onUpdate();
    } catch (error) {
      console.error('[EditArtPanel] sendToBack failed:', error);
    }
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

  // [2025-12-16 04:06:00] Duplicate - 修复 clone API 兼容性问题
  const handleDuplicate = async () => {
    if (!selectedArt || !canvas) return;
    try {
      const cloneResult = (selectedArt as any).clone();
      const cloned = cloneResult instanceof Promise
        ? await cloneResult
        : typeof cloneResult === 'function'
          ? await new Promise<fabric.Image>((resolve) => {
            (selectedArt as any).clone(resolve);
          })
          : cloneResult;

      if (!cloned) {
        console.error('[EditArtPanel] clone returned null/undefined');
        return;
      }

      cloned.set({
        left: (selectedArt.left || 0) + 40,
        top: (selectedArt.top || 0) + 40,
        name: `art_${Date.now()}`,
      });

      if ((selectedArt as any).data) {
        (cloned as any).data = { ...(selectedArt as any).data };
      }

      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      canvas.renderAll();
      onUpdate();
    } catch (error) {
      console.error('[EditArtPanel] duplicate failed:', error);
    }
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
  // [2025-01-30 13:35:00] 修复：参考 upload 和 text 的实现，使用英寸输入框
  const handleSizeChange = (widthInches: number, heightInches: number) => {
    if (!selectedArt) return;

    // 转换为像素（150 DPI，与 pixelsToInches 保持一致）
    const dpi = 150;
    const widthPixels = widthInches * dpi;
    const heightPixels = heightInches * dpi;

    // 计算缩放比例
    const originalWidth = selectedArt.width || 1;
    const originalHeight = selectedArt.height || 1;
    const scaleX = widthPixels / originalWidth;
    const scaleY = heightPixels / originalHeight;

    selectedArt.set({
      scaleX,
      scaleY
    });
    selectedArt.setCoords();

    // 更新状态
    const actualWidth = originalWidth * scaleX;
    const actualHeight = originalHeight * scaleY;
    setSize({ width: actualWidth, height: actualHeight });
    setSizeInches({ width: widthInches, height: heightInches });

    if (canvas) {
      canvas.renderAll();
      onUpdate();
    }
  };

  // [2025-01-30 18:05:00] Edit Colors
  // [2025-01-30 13:40:00] 修复：交互形式保持和 add text 一样（使用颜色选择器）

  // [2025-01-30 13:40:00] 初始化颜色（从对象获取，如果有的话）
  useEffect(() => {
    if (selectedArt) {
      // Art 对象可能没有 fill 属性，使用默认黑色
      const artColor = (selectedArt as any).fill || '#000000';
      setColor(typeof artColor === 'string' ? artColor : '#000000');
    }
  }, [selectedArt]);

  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    if (!selectedArt || !canvas) return;

    try {
      // [2025-01-30 13:40:00] 对于图片对象，应用颜色叠加效果
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
      tempCtx.fillStyle = newColor;
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

      // 从处理后的 Canvas 创建新的 Fabric Image
      tempCanvas.toBlob((blob) => {
        if (!blob) return;

        const url = URL.createObjectURL(blob);
        fabric.Image.fromURL(url, (fabricImage) => {
          if (fabricImage && canvas && selectedArt) {
            // 保持原有的位置、缩放和属性
            fabricImage.set({
              left: selectedArt.left,
              top: selectedArt.top,
              scaleX: selectedArt.scaleX,
              scaleY: selectedArt.scaleY,
              angle: selectedArt.angle,
              originX: selectedArt.originX,
              originY: selectedArt.originY,
              name: selectedArt.name || `art_${Date.now()}`,
              data: (selectedArt as any).data,
            });

            // 替换原始图像
            const oldIndex = canvas.getObjects().indexOf(selectedArt);
            canvas.remove(selectedArt);
            canvas.insertAt(fabricImage, oldIndex, false);
            canvas.setActiveObject(fabricImage);

            // 应用角控件
            applyCornerControls({ canvas, obj: fabricImage });

            canvas.renderAll();

            // 清理 URL
            URL.revokeObjectURL(url);

            onUpdate();
          }
        });
      }, 'image/png');
    } catch (error) {
      console.error('[EditArtPanel] Error editing colors:', error);
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
      {/* [2025-01-30 13:35:00] 修复：参考 upload 和 text 的实现，使用英寸输入框 */}
      <div className="dl-edit-art-panel__section">
        <div className="dl-edit-art-panel__size-header">
          <label className="dl-edit-art-panel__label">Art Size</label>
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
        <div className="dl-edit-art-panel__size-inputs">
          <input
            type="number"
            className="dl-edit-art-panel__size-input"
            value={sizeInches.width.toFixed(2)}
            onChange={(e) => {
              const newWidth = parseFloat(e.target.value) || 0;
              if (newWidth > 0) {
                let newHeight = sizeInches.height;
                if (aspectRatioLocked) {
                  // [2025-01-30 13:35:00] 锁定比例时，按比例计算高度
                  newHeight = newWidth / originalAspectRatio;
                }
                handleSizeChange(newWidth, newHeight);
              }
            }}
            step="0.01"
            min="0.1"
            placeholder="Width"
          />
          <span className="dl-edit-art-panel__size-separator">×</span>
          <input
            type="number"
            className="dl-edit-art-panel__size-input"
            value={sizeInches.height.toFixed(2)}
            onChange={(e) => {
              const newHeight = parseFloat(e.target.value) || 0;
              if (newHeight > 0) {
                let newWidth = sizeInches.width;
                if (aspectRatioLocked) {
                  // [2025-01-30 13:35:00] 锁定比例时，按比例计算宽度
                  newWidth = newHeight * originalAspectRatio;
                }
                handleSizeChange(newWidth, newHeight);
              }
            }}
            step="0.01"
            min="0.1"
            placeholder="Height"
          />
          <span className="dl-edit-art-panel__size-unit">in</span>
        </div>
      </div>

      {/* 2-6. Center / Layering / Flip / Duplicate / Rotation - 统一封装为 ArtEditControls */}
      {/* [2025-01-30 13:50:00] 确保操作按钮布局与 upload/text 一致 */}
      {/* [2025-01-30 14:00:00] 删除 +1 和 -1 按钮（Bring Forward 和 Send Backward） */}
      <ArtEditControls
        onCenter={handleCenter}
        onBringToFront={handleBringToFront}
        onSendToBack={handleSendToBack}
        onFlipHorizontal={handleFlipHorizontal}
        onFlipVertical={handleFlipVertical}
        onDuplicate={handleDuplicate}
        rotation={rotation}
        onRotationChange={handleRotationChange}
      />

      {/* 7. Edit Colors - [2025-01-30 13:40:00] 交互形式保持和 add text 一样 */}
      <div className="dl-edit-art-panel__section">
        <label className="dl-edit-art-panel__label">Edit Color</label>
        <div className="dl-edit-art-panel__color-group">
          <input
            type="color"
            value={color}
            onChange={(e) => handleColorChange(e.target.value)}
            className="dl-edit-art-panel__color-input"
          />
          <input
            type="text"
            value={color}
            onChange={(e) => handleColorChange(e.target.value)}
            className="dl-edit-art-panel__color-text"
          />
        </div>
      </div>

      {/* 8. Add New Art - [2025-01-30 13:45:00] 修改为 Add New Art（不是替换） */}
      <div className="dl-edit-art-panel__section">
        <button
          className="dl-edit-art-panel__btn dl-edit-art-panel__btn--primary"
          onClick={onChangeArt}
          type="button"
        >
          Add New Art
        </button>
      </div>
    </div>
  );
};

export default EditArtPanel;

