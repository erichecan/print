/**
 * Text Panel - 添加文本面板
* 实现 Add Text 界面
* 像素级对齐 Custom Ink designlab-addtext01.jpeg
 */
'use client';

import React, { useState } from 'react';

interface TextPanelProps {
  onAddText: (text: string) => void;
}

const TextPanel: React.FC<TextPanelProps> = ({ onAddText }) => {
// 初始文本为空，匹配 Custom Ink 行为
// 修复：为空时禁用"Add To Design"按钮
  const [text, setText] = useState('');

  const handleAddToDesign = () => {
// 如果文本为空，使用默认值
    const trimmedText = text.trim() || 'Your Text';
    onAddText(trimmedText);
  };

// 检查文本是否为空（去除空白字符后）
  const isTextEmpty = !text.trim();

  return (
    <div className="dl-text-panel">
      <div className="dl-text-panel__content">
        <div className="dl-text-panel__input-section">
{/* 根据 Custom Ink 截图，可能不需要 label，或 label 文本不同 */}
          <textarea
            className="dl-text-panel__input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter text here"
            rows={4}
            autoFocus
          />
        </div>

        <button
          className="dl-text-panel__add-btn"
          onClick={handleAddToDesign}
          type="button"
disabled={isTextEmpty} // 为空时禁用按钮
        >
          Add To Design
        </button>
      </div>
    </div>
  );
};

export default TextPanel;

