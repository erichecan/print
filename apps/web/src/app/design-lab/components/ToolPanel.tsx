/**
 * Tool Panel - 左侧工具面板容器
* 实现工具面板容器，支持面板切换和自动切换
 */
'use client';

import React from 'react';

export type ToolPanelType = 
  | 'home' 
  | 'upload' 
  | 'text' 
  | 'art' 
  | 'edit-upload' 
  | 'edit-text' 
  | 'edit-art' 
| 'layers' // 图层管理面板
| 'colors' // 产品颜色选择面板
  | null;

interface ToolPanelProps {
  panelType: ToolPanelType;
  onBack?: () => void;
  children?: React.ReactNode;
}

const ToolPanel: React.FC<ToolPanelProps> = ({ panelType, onBack, children }) => {
// 如果没有面板类型，不显示
  if (!panelType) {
    return null;
  }

// 获取面板标题
  const getPanelTitle = (): string => {
    switch (panelType) {
      case 'home':
        return "What's next for you?";
      case 'upload':
        return 'Choose File To Upload';
      case 'text':
        return 'Add Text';
      case 'art':
        return 'Add Art';
      case 'edit-upload':
        return 'Edit Upload';
      case 'edit-text':
        return 'Edit Text';
      case 'edit-art':
        return 'Edit Art';
      case 'layers':
        return 'Layers';
      case 'colors':
        return 'Product Colors';
      default:
        return '';
    }
  };

// 是否显示返回按钮（Home 面板不显示）
  const showBackButton = panelType !== 'home' && onBack;

// 检查子组件是否有自己的 header（UploadPanel 和 EditUploadPanel 有自己的 header）
  const hasCustomHeader = panelType === 'upload' || panelType === 'edit-upload' || panelType === 'edit-text' || panelType === 'edit-art';

  return (
// 阶段1：添加 data-testid 用于 Playwright 测试
    <aside className="dl-tool-panel" aria-label="Tool panel" data-testid="tool-panel">
      <div className="dl-tool-panel__content">
        {!hasCustomHeader && (
          <div className="dl-tool-panel__header">
            <h2 className="dl-tool-panel__title" data-testid={`tool-panel-title-${panelType}`}>{getPanelTitle()}</h2>
            {showBackButton && (
              <button
                className="dl-tool-panel__back-btn"
                onClick={onBack}
                aria-label="Back to home"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </aside>
  );
};

export default ToolPanel;

