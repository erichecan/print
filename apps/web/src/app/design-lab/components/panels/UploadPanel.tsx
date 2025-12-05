/**
 * Upload Panel - 文件上传面板
 * [2025-01-30 17:15:00] 实现 Choose File To Upload 界面
 */
'use client';

import React, { useRef } from 'react';

interface UploadPanelProps {
  onFileSelect: (file: File) => void;
  onBrowseClick: () => void;
}

const UploadPanel: React.FC<UploadPanelProps> = ({ onFileSelect, onBrowseClick }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="dl-upload-panel">
      <div className="dl-upload-panel__content">
        <div className="dl-upload-panel__browse">
          <button
            className="dl-upload-panel__browse-btn"
            onClick={handleBrowseClick}
            type="button"
          >
            Browse
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
            aria-label="Choose file to upload"
          />
        </div>

        <div className="dl-upload-panel__divider">
          <span>or</span>
        </div>

        <div className="dl-upload-panel__hint">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p>Drag & drop a file anywhere to upload</p>
        </div>

        <div className="dl-upload-panel__info">
          <div className="dl-upload-panel__info-item">
            <strong>DPI:</strong> 300 DPI recommended for best print quality
          </div>
          <div className="dl-upload-panel__info-item">
            <strong>Max Size:</strong> 25 MB
          </div>
          <div className="dl-upload-panel__info-item">
            <strong>Formats:</strong> JPG, PNG, GIF, SVG
          </div>
        </div>

        <div className="dl-upload-panel__help">
          <p>Need help? <a href="#" onClick={(e) => { e.preventDefault(); /* TODO: Open chat */ }}>Chat with us</a> or <a href="mailto:support@example.com">email us</a></p>
        </div>
      </div>
    </div>
  );
};

export default UploadPanel;

