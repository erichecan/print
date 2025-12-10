/**
 * Home Panel - 引导面板
 * [2025-01-30 16:55:00] 显示 "What's next for you?" 引导界面
 */
'use client';

import React from 'react';

interface HomePanelProps {
  onAction: (action: 'upload' | 'text' | 'art' | 'products' | 'layers' | 'templates' | 'export') => void; // [2025-12-10] 添加模板库和导出
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
        
        <button
          className="dl-home-panel__action"
          onClick={() => onAction('products')}
          aria-label="Change Products"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
          <span>Change Products</span>
        </button>
        
        {/* [2025-12-06 13:00:00] 图层管理按钮 */}
        <button
          className="dl-home-panel__action"
          onClick={() => onAction('layers')}
          aria-label="Manage Layers"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="3" y1="15" x2="21" y2="15" />
          </svg>
          <span>Layers</span>
        </button>
        
        {/* [2025-12-10] 模板库按钮 */}
        <button
          className="dl-home-panel__action"
          onClick={() => onAction('templates')}
          aria-label="Browse Templates"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
          </svg>
          <span>Templates</span>
        </button>
        
        {/* [2025-12-10] 导出按钮 */}
        <button
          className="dl-home-panel__action"
          onClick={() => onAction('export')}
          aria-label="Export Design"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>Export</span>
        </button>
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

