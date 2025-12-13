/**
 * Home Panel - 引导面板
 * [2025-01-30 16:55:00] 显示 "What's next for you?" 引导界面
 */
'use client';

import React from 'react';

interface HomePanelProps {
  onAction: (action: 'upload' | 'text' | 'art') => void; // [2025-12-19 21:25:00] 移除：products、layers、templates、export
}

const HomePanel: React.FC<HomePanelProps> = ({ onAction }) => {
  return (
    <div className="dl-home-panel">
      <div className="dl-home-panel__actions">
        <button
          className="dl-home-panel__action"
          onClick={() => onAction('upload')}
          aria-label="Upload"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span>Upload</span>
        </button>
        
        <button
          className="dl-home-panel__action"
          onClick={() => onAction('text')}
          aria-label="Add Text"
        >
          <span className="dl-home-panel__text-icon">abc</span>
          <span>Add Text</span>
        </button>
        
        <button
          className="dl-home-panel__action"
          onClick={() => onAction('art')}
          aria-label="Add Art"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span>Add Art</span>
        </button>
        
        {/* [2025-12-19 21:25:00] 移除：Change Products、Templates、Layers、Export 四个功能按钮 */}
      </div>
      
      <p className="dl-home-panel__hint">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        Drag & drop a file anywhere to upload
      </p>
    </div>
  );
};

export default HomePanel;

