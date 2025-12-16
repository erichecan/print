'use client';

/**
 * Design Lab 5.x - 通用编辑工具栏组件
 * [2025-12-16 02:32:20] 初始实现：
 * - UploadEditControls：Center / Layering / Flip / Duplicate / Crop / Rotation
 * - TextEditControls：Center / Layering / Text Align / Duplicate / Rotation
 * - ArtEditControls：Center / Layering / Flip / Duplicate / Rotation
 *
 * 注意：这里只负责 UI 与事件绑定，不直接操作 Fabric 对象；
 * 具体逻辑仍由各自 Panel（EditUploadPanel / EditTextPanel / EditArtPanel）提供。
 */

import React from 'react';
import {
  CenterIcon,
  LayeringUpIcon,
  LayeringDownIcon,
  FlipHorizontalIcon,
  FlipVerticalIcon,
  DuplicateIcon,
  RotationIcon,
  TextAlignLeftIcon,
  TextAlignCenterIcon,
  TextAlignRightIcon,
} from './icons';

// ================= Upload Controls =================

export interface UploadEditControlsProps {
  onCenter: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onFlipHorizontal: () => void;
  onFlipVertical: () => void;
  onDuplicate: () => void;
  rotation: number;
  onRotationSliderChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRotationInputChange: (value: number) => void;
}

export const UploadEditControls: React.FC<UploadEditControlsProps> = ({
  onCenter,
  onBringToFront,
  onSendToBack,
  onFlipHorizontal,
  onFlipVertical,
  onDuplicate,
  rotation,
  onRotationSliderChange,
  onRotationInputChange,
}) => {
  return (
    <>
      {/* Positioning Controls */}
      <div className="dl-edit-upload-panel__section">
        <div className="dl-edit-upload-panel__controls">
          {/* Center Tool */}
          <div className="dl-edit-upload-panel__tool-group">
            <button
              className="dl-edit-upload-panel__control-btn"
              onClick={onCenter}
              type="button"
              aria-label="Center"
              title="Center"
            >
              <CenterIcon size={20} />
            </button>
            <div className="dl-edit-upload-panel__tool-label">Center</div>
          </div>

          {/* Layering Tool */}
          <div className="dl-edit-upload-panel__tool-group">
            <div className="dl-edit-upload-panel__tool-buttons">
              <button
                className="dl-edit-upload-panel__control-btn"
                onClick={onBringToFront}
                type="button"
                aria-label="Bring to Front"
                title="Bring to Front"
              >
                <LayeringUpIcon size={20} />
              </button>
              <button
                className="dl-edit-upload-panel__control-btn"
                onClick={onSendToBack}
                type="button"
                aria-label="Send to Back"
                title="Send to Back"
              >
                <LayeringDownIcon size={20} />
              </button>
            </div>
            <div className="dl-edit-upload-panel__tool-label">Layering</div>
          </div>

          {/* Flip Tool */}
          <div className="dl-edit-upload-panel__tool-group">
            <div className="dl-edit-upload-panel__tool-buttons">
              <button
                className="dl-edit-upload-panel__control-btn"
                onClick={onFlipHorizontal}
                type="button"
                aria-label="Flip Horizontal"
                title="Flip Horizontal"
              >
                <FlipHorizontalIcon size={18} />
              </button>
              <button
                className="dl-edit-upload-panel__control-btn"
                onClick={onFlipVertical}
                type="button"
                aria-label="Flip Vertical"
                title="Flip Vertical"
              >
                <FlipVerticalIcon size={18} />
              </button>
            </div>
            <div className="dl-edit-upload-panel__tool-label">Flip</div>
          </div>

          {/* Duplicate Tool */}
          <button
            className="dl-edit-upload-panel__control-btn"
            onClick={onDuplicate}
            type="button"
            aria-label="Duplicate"
            title="Duplicate"
          >
            <DuplicateIcon size={20} />
          </button>
        </div>
      </div>

      {/* Rotation */}
      <div className="dl-edit-upload-panel__section">
        <label className="dl-edit-upload-panel__label">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <RotationIcon size={14} /> Rotation
          </span>
        </label>
        <div className="dl-edit-upload-panel__rotation">
          <input
            type="range"
            min="0"
            max="360"
            value={rotation}
            onChange={onRotationSliderChange}
            className="dl-edit-upload-panel__slider"
          />
          <input
            type="number"
            className="dl-edit-upload-panel__rotation-input"
            value={rotation.toFixed(0)}
            onChange={(e) => {
              const value = parseFloat(e.target.value) || 0;
              onRotationInputChange(value);
            }}
            min="0"
            max="360"
          />
        </div>
      </div>
    </>
  );
};

// ================= Text Controls =================

export interface TextEditControlsProps {
  onCenter: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  textAlign: 'left' | 'center' | 'right';
  onTextAlignChange: (align: 'left' | 'center' | 'right') => void;
  onDuplicate: () => void;
}

export const TextEditControls: React.FC<TextEditControlsProps> = ({
  onCenter,
  onBringToFront,
  onSendToBack,
  textAlign,
  onTextAlignChange,
  onDuplicate,
}) => {
  return (
    <div className="dl-edit-text-panel__section dl-edit-text-panel__section--toolbar">
      <div className="dl-edit-text-panel__toolbar">
        {/* Center */}
        <button
          type="button"
          className="dl-edit-text-panel__toolbar-btn"
          onClick={onCenter}
          aria-label="Center"
          title="Center"
        >
          <CenterIcon size={18} />
        </button>

        {/* Layering */}
        <div className="dl-edit-text-panel__toolbar-group" aria-label="Layering">
          <button
            type="button"
            className="dl-edit-text-panel__toolbar-btn"
            onClick={onBringToFront}
            aria-label="Bring to Front"
            title="Bring to Front"
          >
            <LayeringUpIcon size={18} />
          </button>
          <button
            type="button"
            className="dl-edit-text-panel__toolbar-btn"
            onClick={onSendToBack}
            aria-label="Send to Back"
            title="Send to Back"
          >
            <LayeringDownIcon size={18} />
          </button>
        </div>

        {/* Text Align */}
        <div className="dl-edit-text-panel__toolbar-group" aria-label="Text alignment">
          <button
            type="button"
            className={`dl-edit-text-panel__toolbar-btn ${textAlign === 'left' ? 'is-active' : ''}`}
            onClick={() => onTextAlignChange('left')}
            aria-label="Align Left"
            title="Align Left"
          >
            <TextAlignLeftIcon size={18} />
          </button>
          <button
            type="button"
            className={`dl-edit-text-panel__toolbar-btn ${textAlign === 'center' ? 'is-active' : ''}`}
            onClick={() => onTextAlignChange('center')}
            aria-label="Align Center"
            title="Align Center"
          >
            <TextAlignCenterIcon size={18} />
          </button>
          <button
            type="button"
            className={`dl-edit-text-panel__toolbar-btn ${textAlign === 'right' ? 'is-active' : ''}`}
            onClick={() => onTextAlignChange('right')}
            aria-label="Align Right"
            title="Align Right"
          >
            <TextAlignRightIcon size={18} />
          </button>
        </div>

        {/* Duplicate */}
        <button
          type="button"
          className="dl-edit-text-panel__toolbar-btn"
          onClick={onDuplicate}
          aria-label="Duplicate"
          title="Duplicate"
        >
          <DuplicateIcon size={18} />
        </button>

        {/* [2025-12-16 07:12:00] 旋转控件去重：移除底部工具栏的旋转条（保留上方 Rotation 区块） */}
      </div>
    </div>
  );
};

// ================= Art Controls =================

export interface ArtEditControlsProps {
  onCenter: () => void;
  onBringToFront: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onSendToBack: () => void;
  onFlipHorizontal: () => void;
  onFlipVertical: () => void;
  onDuplicate: () => void;
  rotation: number;
  onRotationChange: (angle: number) => void;
}

export const ArtEditControls: React.FC<ArtEditControlsProps> = ({
  onCenter,
  onBringToFront,
  onBringForward,
  onSendBackward,
  onSendToBack,
  onFlipHorizontal,
  onFlipVertical,
  onDuplicate,
  rotation,
  onRotationChange,
}) => {
  return (
    <div className="dl-edit-art-panel__section dl-edit-art-panel__section--toolbar">
      <div className="dl-edit-art-panel__toolbar">
        {/* Center */}
        <button
          type="button"
          className="dl-edit-art-panel__btn"
          onClick={onCenter}
        >
          <CenterIcon size={18} />
        </button>

        {/* Layering 四个按钮：Bring Front / Forward / Backward / To Back */}
        <div className="dl-edit-art-panel__btn-group" aria-label="Layering">
          <button
            type="button"
            className="dl-edit-art-panel__btn"
            onClick={onBringToFront}
          >
            <LayeringUpIcon size={18} />
          </button>
          <button
            type="button"
            className="dl-edit-art-panel__btn"
            onClick={onBringForward}
          >
            +1
          </button>
          <button
            type="button"
            className="dl-edit-art-panel__btn"
            onClick={onSendBackward}
          >
            -1
          </button>
          <button
            type="button"
            className="dl-edit-art-panel__btn"
            onClick={onSendToBack}
          >
            <LayeringDownIcon size={18} />
          </button>
        </div>

        {/* Flip */}
        <div className="dl-edit-art-panel__btn-group" aria-label="Flip">
          <button
            type="button"
            className="dl-edit-art-panel__btn"
            onClick={onFlipHorizontal}
          >
            <FlipHorizontalIcon size={18} />
          </button>
          <button
            type="button"
            className="dl-edit-art-panel__btn"
            onClick={onFlipVertical}
          >
            <FlipVerticalIcon size={18} />
          </button>
        </div>

        {/* Duplicate */}
        <button
          type="button"
          className="dl-edit-art-panel__btn"
          onClick={onDuplicate}
        >
          <DuplicateIcon size={18} />
        </button>

        {/* Rotation */}
        <div className="dl-edit-art-panel__toolbar-rotation">
          <RotationIcon size={14} />
          <input
            type="range"
            min="0"
            max="360"
            value={rotation}
            onChange={(e) => onRotationChange(parseFloat(e.target.value) || 0)}
            className="dl-edit-art-panel__slider"
          />
        </div>
      </div>
    </div>
  );
};

export default {
  UploadEditControls,
  TextEditControls,
  ArtEditControls,
};

