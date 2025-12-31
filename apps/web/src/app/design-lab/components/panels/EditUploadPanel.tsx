/**
 * Edit Upload Panel - 编辑上传图片面板
* 实现 Edit Upload 面板，包含 Size、Center、Layering、Flip、Duplicate、Rotation 等控件
* 根据 designlab-upload02.jpeg 更新控件顺序和样式，完全匹配 Custom Ink
 */
'use client';

import React, { useState, useEffect } from 'react';
// 修复 fabric.js 导入：在 Next.js 中使用命名空间导入
import * as fabric from 'fabric';
import { UploadEditControls } from '../../../design-lab5/toolbar/controls'; // 复用 Upload 工具栏组件
import { applyCornerControls } from '../../../design-lab5/upload-controls/registerUploadCornerControls'; // 导入角控件应用函数

interface EditUploadPanelProps {
  selectedImage: fabric.Image | null;
  canvas: fabric.Canvas | null;
  onUpdate: () => void;
  onReset?: () => void;
  onSave?: () => void;
  onClose?: () => void;
// 已移除上传评分模块：保留回调仅为兼容旧调用点（当前面板不再渲染入口）
  onOpenRatingModal?: () => void;
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
const [sizeInches, setSizeInches] = useState({ width: 0, height: 0 }); // 英寸单位尺寸
  const [rotation, setRotation] = useState(0);
// 移除 makeOneColor 和 removeBackground 状态（功能已移除）
  const [originalImageData, setOriginalImageData] = useState<string | null>(null);
const [aspectRatioLocked, setAspectRatioLocked] = useState(true); // 比例锁状态
const [originalAspectRatio, setOriginalAspectRatio] = useState(1); // 原始宽高比

// 保存原始图片数据用于 Reset
  useEffect(() => {
    if (selectedImage && !originalImageData) {
      selectedImage.toDataURL((dataUrl) => {
        setOriginalImageData(dataUrl);
      });
    }
  }, [selectedImage, originalImageData]);

// 更新尺寸和旋转值
// 添加英寸单位计算和原始宽高比保存
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

// 保存原始宽高比
      if (actualHeight > 0) {
        setOriginalAspectRatio(actualWidth / actualHeight);
      }
    }
  }, [selectedImage]);

// Center 按钮
// 添加调试日志和错误处理
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

// Bring to Front - 修复 Fabric.js v6 API
  const handleBringToFront = () => {
    if (!selectedImage || !canvas) return;
    try {
      // Fabric.js v6 使用 bringObjectToFront
      if (typeof (canvas as any).bringObjectToFront === 'function') {
        (canvas as any).bringObjectToFront(selectedImage);
      } else if (typeof (selectedImage as any).bringToFront === 'function') {
        (selectedImage as any).bringToFront();
      } else {
        // 降级：手动移动到最前
        const objects = canvas.getObjects();
        const index = objects.indexOf(selectedImage);
        if (index >= 0 && index < objects.length - 1) {
          objects.splice(index, 1);
          objects.push(selectedImage);
          canvas.renderAll();
        }
      }
      canvas.renderAll();
      onUpdate();
    } catch (error) {
      console.error('[EditUploadPanel] bringToFront failed:', error);
    }
  };

// Send to Back - 修复 Fabric.js v6 API
// 限制：不能将对象移到商品底图（background）下面
  const handleSendToBack = async () => {
    if (!selectedImage || !canvas) return;

    try {
      const objects = canvas.getObjects();
      const currentIndex = objects.indexOf(selectedImage);
      if (currentIndex === -1) return;

      // 找到商品底图的位置（name === 'background' 或 name.startsWith('product-image-') 或 layerType === 'product'/'product-image'）
      const backgroundIndex = objects.findIndex((obj: any) => {
        const name = (obj as any).name || '';
        const layerType = (obj as any).data?.layerType;
// 兼容 5.0：底图名称为 product-image-base
        return name === 'background' || name === 'product-image-base' || name.startsWith('product-image-') || layerType === 'product' || layerType === 'product-image';
      });

// 计算目标索引：应该在商品底图之后（索引 = backgroundIndex + 1）
      // 如果没有找到商品底图，则移动到索引 0（最底层）
      const targetIndex = backgroundIndex >= 0 ? backgroundIndex + 1 : 0;

// 添加调试日志
      console.log('[EditUploadPanel] sendToBack called:', {
        currentIndex,
        backgroundIndex,
        targetIndex,
        objectsCount: objects.length,
        selectedImageName: (selectedImage as any).name,
      });

// 如果已经在目标位置，不需要移动
      if (currentIndex === targetIndex) {
        console.log('[EditUploadPanel] Already at target position, skipping');
        return;
      }

// 修复根因：不再先 sendObjectToBack（会把对象送到绝对底层，必然跑到商品底图后面）
      // 直接将对象移动到“商品底图之后的第一个位置”（backgroundIndex + 1），使用 Fabric API 保证顺序生效
      if (typeof (canvas as any).moveObjectTo === 'function') {
        (canvas as any).moveObjectTo(selectedImage, targetIndex);
      } else {
        // 兜底：手动调整顺序（如果 moveObjectTo 不可用）
        const objs = canvas.getObjects();
        const idx = objs.indexOf(selectedImage);
        if (idx >= 0) {
          objs.splice(idx, 1);
          const insertIndex = Math.max(0, Math.min(targetIndex, objs.length));
          objs.splice(insertIndex, 0, selectedImage);
        }
      }

      canvas.renderAll();

// 最终验证（保留 debug 日志）
      const verifiedObjects = canvas.getObjects();
      const verifiedIndex = verifiedObjects.indexOf(selectedImage);
      const verifiedBackgroundIndex = verifiedObjects.findIndex((obj: any) => {
        const name = (obj as any).name || '';
        const layerType = (obj as any).data?.layerType;
        return name === 'background' || name === 'product-image-base' || name.startsWith('product-image-') || layerType === 'product' || layerType === 'product-image';
      });
      const verifiedTargetIndex = verifiedBackgroundIndex >= 0 ? verifiedBackgroundIndex + 1 : 0;

      console.log('[EditUploadPanel] sendToBack completed:', {
        verifiedIndex,
        verifiedBackgroundIndex,
        verifiedTargetIndex,
        isCorrect: verifiedIndex === verifiedTargetIndex,
        isAboveBackground: verifiedBackgroundIndex < 0 || verifiedIndex > verifiedBackgroundIndex,
      });

      onUpdate();
    } catch (error) {
      console.error('[EditUploadPanel] sendToBack failed:', error);
    }
  };

// Flip Horizontal
  const handleFlipHorizontal = () => {
    if (!selectedImage) return;
    selectedImage.set('flipX', !selectedImage.flipX);
    selectedImage.setCoords();
    if (canvas) {
      canvas.renderAll();
      onUpdate();
    }
  };

// Flip Vertical
  const handleFlipVertical = () => {
    if (!selectedImage) return;
    selectedImage.set('flipY', !selectedImage.flipY);
    selectedImage.setCoords();
    if (canvas) {
      canvas.renderAll();
      onUpdate();
    }
  };

// Duplicate - 修复 clone API 兼容性问题
  const handleDuplicate = async () => {
    if (!selectedImage || !canvas) return;

    try {
      // Fabric.js v6 clone 可能是同步或异步的，需要兼容处理
      const cloneResult = (selectedImage as any).clone();

      // 如果返回 Promise，等待它
      const cloned = cloneResult instanceof Promise
        ? await cloneResult
        : typeof cloneResult === 'function'
          ? await new Promise<fabric.Image>((resolve) => {
            // 如果是回调形式的 clone
            (selectedImage as any).clone(resolve);
          })
          : cloneResult;

      if (!cloned) {
        console.error('[EditUploadPanel] clone returned null/undefined');
        return;
      }

      cloned.set({
        left: (selectedImage.left || 0) + 40,
        top: (selectedImage.top || 0) + 40,
        name: `image_${Date.now()}`,
      });

      // 复制自定义数据
      if ((selectedImage as any).data) {
        (cloned as any).data = { ...(selectedImage as any).data };
      }

      canvas.add(cloned);

// 修复根因：统一使用 applyCornerControls
      try {
        applyCornerControls({ canvas, obj: cloned });
        console.log('[EditUploadPanel] ✅ 角控件已应用到复制的对象');
      } catch (error) {
        console.warn('[EditUploadPanel] ⚠️ 应用角控件失败:', error);
      }

      canvas.setActiveObject(cloned);

      canvas.renderAll();
      onUpdate();
    } catch (error) {
      console.error('[EditUploadPanel] duplicate failed:', error);
    }
  };

// 处理尺寸变化
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

// Rotation slider
  const handleRotationSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

// 数字输入框调整角度
  const handleRotationInputChange = (angle: number) => {
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


// Reset To Original
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

// Save Design
  const handleSave = () => {
    onSave?.();
    onUpdate();
  };

// 移除 Edit Colors 颜色色板（功能已移除）

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
{/* Upload Size - 添加编辑功能和比例锁 */}
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
// 锁定比例时，按比例计算高度
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
// 锁定比例时，按比例计算宽度
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

{/* 移除 Edit Colors、Make One Color New! 和 Remove Background Color 模块（按需求） */}

        {/* Positioning + Rotation Controls（统一封装为 UploadEditControls） */}
        <UploadEditControls
          onCenter={handleCenter}
          onBringToFront={handleBringToFront}
          onSendToBack={handleSendToBack}
          onFlipHorizontal={handleFlipHorizontal}
          onFlipVertical={handleFlipVertical}
          onDuplicate={handleDuplicate}
          rotation={rotation}
          onRotationSliderChange={handleRotationSliderChange}
          onRotationInputChange={handleRotationInputChange}
        />

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
{/* 按产品要求移除：Pantone 提示模块（避免 Upload 面板出现无关营销信息） */}

        {/* Feedback Link */}
{/* 按产品要求移除：Upload 体验评分入口（截图中的模块） */}
      </div>
    </div>
  );
};

export default EditUploadPanel;

