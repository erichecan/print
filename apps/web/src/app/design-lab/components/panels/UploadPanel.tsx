/**
 * Upload Panel - 文件上传面板
* 实现 Choose File To Upload 界面
* 根据 designlab-upload01.jpeg 和 designlab-upload03.jpeg 更新为完全匹配 Custom Ink
 */
'use client';

import React, { useRef, useEffect, useState } from 'react';
import { getBgRemoveResults, type BgRemovedImage } from '../../api/bgRemove';

interface UploadPanelProps {
  onFileSelect: (file: File) => void;
  onBrowseClick: () => void;
  onUrlSelect?: (url: string) => void;
  recentUploads?: Array<{ id: string; url: string; thumbnail: string }>;
  onRecentUploadClick?: (upload: { id: string; url: string; thumbnail: string }) => void;
  onClose?: () => void;
}

const UploadPanel: React.FC<UploadPanelProps> = ({
  onFileSelect,
  onBrowseClick,
  onUrlSelect,
  recentUploads = [],
  onRecentUploadClick,
  onClose
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bgRemovedImages, setBgRemovedImages] = useState<BgRemovedImage[]>([]);

  // Load previously bg-removed images
  useEffect(() => {
    getBgRemoveResults().then(setBgRemovedImages).catch(() => {});
  }, []);

  // Ctrl+V / Cmd+V paste support
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            onFileSelect(file);
            return;
          }
        }
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [onFileSelect]);

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
          <p style={{ fontSize: 11, color: '#718096', marginTop: 6, textAlign: 'center' }}>
            or paste an image with <kbd style={{ background: '#edf2f7', border: '1px solid #e2e8f0', borderRadius: 3, padding: '1px 4px', fontSize: 10 }}>Ctrl+V</kbd>
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/avif,image/svg+xml"
            onChange={handleFileChange}
            style={{ display: 'none' }}
            aria-label="Choose file to upload"
          />
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
            Vector or high resolution artwork of 300 DPI or more will look the best. Supported formats: JPG, PNG, GIF, WebP, AVIF, SVG. Max size of <strong>20 MB</strong>.
          </p>
        </div>

        {/* Background-removed images */}
        {bgRemovedImages.length > 0 && (
          <div className="dl-upload-panel__recent">
            <h3 className="dl-upload-panel__recent-title">Removed Backgrounds</h3>
            <p className="dl-upload-panel__recent-desc">
              Click to reuse a previously processed image on any view or color.
            </p>
            <div className="dl-upload-panel__recent-grid">
              {bgRemovedImages.map((img) => (
                <button
                  key={img.id}
                  className="dl-upload-panel__recent-item"
                  onClick={() => onUrlSelect?.(img.resultUrl)}
                  type="button"
                  title="Click to add to canvas"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.resultUrl}
                    alt="Removed background"
                    style={{ background: 'repeating-conic-gradient(#e2e8f0 0% 25%, #fff 0% 50%) 0 0 / 12px 12px' }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

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
      </div>
    </div>
  );
};

export default UploadPanel;
