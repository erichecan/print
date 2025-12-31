/**
 * Upload Panel - 文件上传面板
* 实现 Choose File To Upload 界面
* 根据 designlab-upload01.jpeg 和 designlab-upload03.jpeg 更新为完全匹配 Custom Ink
 */
'use client';

import React, { useRef, useState, useEffect } from 'react';

interface UploadPanelProps {
  onFileSelect: (file: File) => void;
  onBrowseClick: () => void;
  recentUploads?: Array<{ id: string; url: string; thumbnail: string }>;
  onRecentUploadClick?: (upload: { id: string; url: string; thumbnail: string }) => void;
  onClose?: () => void;
}

const UploadPanel: React.FC<UploadPanelProps> = ({
  onFileSelect,
  onBrowseClick,
  recentUploads = [],
  onRecentUploadClick,
  onClose
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
    onBrowseClick();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

// 拖拽上传处理
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="dl-upload-panel">
      <div className="dl-upload-panel__header">
        <h2 className="dl-upload-panel__title" data-testid="upload-panel-title">Choose File To Upload</h2>
        <button
          className="dl-upload-panel__close"
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

      <div className="dl-upload-panel__content">
        <div className="dl-upload-panel__browse">
          <button
            className="dl-upload-panel__browse-btn"
            onClick={handleBrowseClick}
            type="button"
          >
            Browse Your Computer
          </button>
          <input
            ref={fileInputRef}
            type="file"
accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/avif,image/svg+xml" // 明确支持 AVIF 和 WebP 格式
            onChange={handleFileChange}
            style={{ display: 'none' }}
            aria-label="Choose file to upload"
          />
        </div>

        <div className="dl-upload-panel__divider">
          <span>or</span>
        </div>

        <div
          className={`dl-upload-panel__drag-drop ${dragActive ? 'is-active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <p className="dl-upload-panel__drag-text">Drag & Drop Anywhere</p>
        </div>

        <div className="dl-upload-panel__info">
          <div className="dl-upload-panel__info-icon">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="8" cy="8" r="7" />
              <line x1="8" y1="4" x2="8" y2="8" />
              <line x1="8" y1="12" x2="8" y2="12" />
            </svg>
          </div>
          <p className="dl-upload-panel__info-text">
Vector or high resolution artwork of 300 DPI or more will look the best. Supported formats: JPG, PNG, GIF, WebP, AVIF, SVG. Max size of <strong>20 MB</strong>. {/* 添加支持的格式说明，包括 AVIF 和 WebP */}
          </p>
        </div>

{/* 按产品要求移除：Sign in to access your saved uploads 模块（截图区域） */}

        {recentUploads.length > 0 && (
          <div className="dl-upload-panel__recent">
            <h3 className="dl-upload-panel__recent-title">Recent Uploads</h3>
            <p className="dl-upload-panel__recent-desc">
              Files will be stored in your account for easy access once you save your design.
            </p>
            <div className="dl-upload-panel__recent-grid">
              {recentUploads.map((upload) => (
                <button
                  key={upload.id}
                  className="dl-upload-panel__recent-item"
                  onClick={() => onRecentUploadClick?.(upload)}
                  type="button"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={upload.thumbnail} alt="Recent upload" />
                </button>
              ))}
            </div>
          </div>
        )}

{/* 按产品要求移除：Need help with your upload / Chat / email 模块（截图区域） */}
      </div>
    </div>
  );
};

export default UploadPanel;

