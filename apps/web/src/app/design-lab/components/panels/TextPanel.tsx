/**
 * Text Panel - 添加文本面板
 * [2025-01-30 17:40:00] 实现 Add Text 界面
 */
'use client';

import React, { useState } from 'react';

interface TextPanelProps {
  onAddText: (text: string) => void;
}

const TextPanel: React.FC<TextPanelProps> = ({ onAddText }) => {
  const [text, setText] = useState('Your Text');

  const handleAddToDesign = () => {
    const trimmedText = text.trim() || 'Your Text';
    onAddText(trimmedText);
  };

  return (
    <div className="dl-text-panel">
      <div className="dl-text-panel__content">
        <div className="dl-text-panel__input-section">
          <label className="dl-text-panel__label">Enter your text</label>
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

