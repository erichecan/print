/**
 * Text Panel - 添加文本面板
 * [2025-01-30 17:40:00] 实现 Add Text 界面
 * [2025-01-31 00:00:00] 像素级对齐 Custom Ink designlab-addtext01.jpeg
 */
'use client';

import React, { useState } from 'react';

interface TextPanelProps {
  onAddText: (text: string) => void;
}

const TextPanel: React.FC<TextPanelProps> = ({ onAddText }) => {
  // [2025-01-31 00:00:00] 初始文本为空，匹配 Custom Ink 行为
  const [text, setText] = useState('');

  const handleAddToDesign = () => {
    // [2025-01-31 00:00:00] 如果文本为空，使用默认值
    const trimmedText = text.trim() || 'Your Text';
    onAddText(trimmedText);
  };

  return (
    <div className="dl-text-panel">
      <div className="dl-text-panel__content">
        <div className="dl-text-panel__input-section">
          {/* [2025-01-31 00:00:00] 根据 Custom Ink 截图，可能不需要 label，或 label 文本不同 */}
          <textarea
            className="dl-text-panel__input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Your Text"
            rows={4}
            autoFocus
          />
        </div>

        <button
          className="dl-text-panel__add-btn"
          onClick={handleAddToDesign}
          type="button"
        >
          Add To Design
        </button>
      </div>
    </div>
  );
};

export default TextPanel;

