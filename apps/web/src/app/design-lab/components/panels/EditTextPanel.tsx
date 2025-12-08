/**
 * Edit Text Panel - 编辑文本面板
 * [2025-01-30 17:45:00] 实现 Edit Text 面板，包含所有文本编辑控件
 * [2025-01-31 00:00:00] 像素级对齐 Custom Ink designlab-addtext03.jpeg
 * 控件顺序：Text, Change Font, Edit Color, Rotation, Outline, Text Size, Positioning Controls
 */
'use client';

import React, { useState, useEffect, useRef } from 'react';
// [2025-01-30 21:45:00] 修复 fabric.js 导入：在 Next.js 中使用命名空间导入
import * as fabric from 'fabric';
import { fontsApi, type Font } from '@/lib/api';
import { FONT_CATEGORY_LABELS, type FontCategory } from '@/data/fonts';

interface EditTextPanelProps {
  selectedText: fabric.IText | null;
  canvas: fabric.Canvas | null;
  onUpdate: () => void;
}

const EditTextPanel: React.FC<EditTextPanelProps> = ({ selectedText, canvas, onUpdate }) => {
  const [text, setText] = useState('');
  const [fontFamily, setFontFamily] = useState('Arial');
  const [fontSize, setFontSize] = useState(48);
  const [color, setColor] = useState('#000000');
  const [rotation, setRotation] = useState(0);
  const [outlineColor, setOutlineColor] = useState('#000000');
  const [outlineWidth, setOutlineWidth] = useState(0);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center');
  const [textShape, setTextShape] = useState<'straight' | 'arc' | 'circle' | 'wave'>('straight'); // [2025-12-08] 文本形状
  const [isOutOfSafeArea, setIsOutOfSafeArea] = useState(false); // [2025-12-08] 是否超出安全区
  // [2025-01-30 18:15:00] 字体选择器下拉菜单状态
  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const fontSelectorRef = useRef<HTMLDivElement>(null);
  // [2025-01-30 19:00:00] 从 API 加载字体
  const [fonts, setFonts] = useState<Record<string, Font[]>>({});
  const [fontsLoading, setFontsLoading] = useState(true);

  // [2025-01-30 18:15:00] 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fontSelectorRef.current && !fontSelectorRef.current.contains(event.target as Node)) {
        setShowFontDropdown(false);
      }
    };

    if (showFontDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFontDropdown]);

  // [2025-01-30 19:00:00] 从 API 加载字体
  useEffect(() => {
    const loadFonts = async () => {
      try {
        setFontsLoading(true);
        const response = await fontsApi.getAll();
        if (response.success && response.data) {
          setFonts(response.data);
        }
      } catch (error) {
        console.error('[EditTextPanel] Error loading fonts:', error);
        // 如果 API 失败，使用配置文件中的字体作为后备
        const { getActiveFonts } = await import('@/data/fonts');
        const fallbackFonts = getActiveFonts();
        const grouped: Record<string, Font[]> = {};
        fallbackFonts.forEach(font => {
          if (!grouped[font.category]) {
            grouped[font.category] = [];
          }
          grouped[font.category].push({
            id: font.name,
            name: font.name,
            displayName: font.displayName,
            previewText: font.previewText,
            category: font.category,
            source: font.source,
            googleFontFamily: font.googleFontFamily,
            weights: font.weights,
            isActive: font.isActive !== false,
            sortOrder: font.sortOrder || 0,
          });
        });
        setFonts(grouped);
      } finally {
        setFontsLoading(false);
      }
    };

    loadFonts();
  }, []);

  // [2025-01-30 17:45:00] 更新文本属性
  useEffect(() => {
    if (selectedText) {
      setText(selectedText.text || '');
      // [2025-01-30 19:00:00] 检查字体是否在加载的字体列表中
      const fontName = selectedText.fontFamily || 'Arial';
      const allFonts = Object.values(fonts).flat();
      const fontExists = allFonts.some(f => f.name === fontName);
      setFontFamily(fontExists ? fontName : 'Arial');
      setFontSize(selectedText.fontSize || 48);
      setColor(selectedText.fill as string || '#000000');
      setRotation(selectedText.angle || 0);
      setTextAlign(selectedText.textAlign || 'center');
      
      // [2025-01-30 17:45:00] 描边设置
      if (selectedText.stroke) {
        setOutlineColor(selectedText.stroke as string || '#000000');
        setOutlineWidth(selectedText.strokeWidth || 0);
      }
      
      // [2025-12-08] 文本形状（如果有path属性，判断形状类型）
      if ((selectedText as any).path) {
        const path = (selectedText as any).path;
        if (typeof path === 'string') {
          if (path.includes('A') && path.includes('radius')) {
            setTextShape('circle');
          } else if (path.includes('Q')) {
            setTextShape('arc');
          } else if (path.includes('sin')) {
            setTextShape('wave');
          } else {
            setTextShape('arc'); // 默认弧形
          }
        }
      } else {
        setTextShape('straight');
      }
      
      // [2025-12-08] 检查是否超出安全区
      checkSafeArea(selectedText, canvas);
    }
  }, [selectedText, fonts, canvas]);
  
  // [2025-12-08] 检查对象是否超出安全区
  const checkSafeArea = (textObj: fabric.IText, canvasObj: fabric.Canvas | null) => {
    if (!textObj || !canvasObj) {
      setIsOutOfSafeArea(false);
      return;
    }
    
    // 安全区边距（假设为画布的10%）
    const safeAreaMargin = 0.1;
    const canvasWidth = canvasObj.width || 1000;
    const canvasHeight = canvasObj.height || 1200;
    const safeLeft = canvasWidth * safeAreaMargin;
    const safeTop = canvasHeight * safeAreaMargin;
    const safeRight = canvasWidth * (1 - safeAreaMargin);
    const safeBottom = canvasHeight * (1 - safeAreaMargin);
    
    // 获取文本对象的边界框
    const boundingRect = textObj.getBoundingRect();
    const objLeft = boundingRect.left;
    const objTop = boundingRect.top;
    const objRight = objLeft + boundingRect.width;
    const objBottom = objTop + boundingRect.height;
    
    // 检查是否超出安全区
    const outOfBounds = 
      objLeft < safeLeft ||
      objTop < safeTop ||
      objRight > safeRight ||
      objBottom > safeBottom;
    
    setIsOutOfSafeArea(outOfBounds);
  };
  
  // [2025-12-08] 监听对象移动和缩放，实时检查安全区
  useEffect(() => {
    if (!selectedText || !canvas) return;
    
    const handleObjectModified = () => {
      checkSafeArea(selectedText, canvas);
    };
    
    canvas.on('object:modified', handleObjectModified);
    canvas.on('object:moving', handleObjectModified);
    
    return () => {
      canvas.off('object:modified', handleObjectModified);
      canvas.off('object:moving', handleObjectModified);
    };
  }, [selectedText, canvas]);

  // [2025-01-30 17:45:00] 更新文本内容
  const handleTextChange = (newText: string) => {
    setText(newText);
    if (selectedText) {
      selectedText.set('text', newText);
      selectedText.setCoords();
      if (canvas) {
        canvas.renderAll();
        onUpdate();
      }
    }
  };

  // [2025-01-30 17:45:00] 更新字体
  // [2025-01-30 18:40:00] 支持多语言字体，需要加载 Google Fonts
  // [2025-01-30 22:00:00] 修复：使用从 API 加载的 fonts 数据或从 fonts.ts 导入的配置
  const handleFontChange = (font: string) => {
    setFontFamily(font);
    if (selectedText) {
      // [2025-01-30 18:40:00] 对于 Google Fonts，需要确保字体已加载
      // [2025-01-30 22:00:00] 从加载的 fonts 数据中查找字体信息
      const allFonts = Object.values(fonts).flat();
      const fontInfo = allFonts.find(f => f.name === font);
      
      // [2025-01-30 22:00:00] 直接设置字体，Fabric.js 会自动使用系统字体或已加载的 Web 字体
      selectedText.set('fontFamily', font);
      selectedText.setCoords();
      if (canvas) {
        canvas.renderAll();
        onUpdate();
      }
    }
  };

  // [2025-01-30 17:45:00] 更新颜色
  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    if (selectedText) {
      selectedText.set('fill', newColor);
      selectedText.setCoords();
      if (canvas) {
        canvas.renderAll();
        onUpdate();
      }
    }
  };

  // [2025-01-30 17:45:00] 更新旋转
  const handleRotationChange = (angle: number) => {
    setRotation(angle);
    if (selectedText) {
      selectedText.set('angle', angle);
      selectedText.setCoords();
      if (canvas) {
        canvas.renderAll();
        onUpdate();
      }
    }
  };

  // [2025-01-30 17:45:00] 更新字体大小
  const handleFontSizeChange = (size: number) => {
    setFontSize(size);
    if (selectedText) {
      selectedText.set('fontSize', size);
      selectedText.setCoords();
      if (canvas) {
        canvas.renderAll();
        onUpdate();
      }
    }
  };

  // [2025-01-30 17:45:00] 更新描边
  const handleOutlineChange = (color: string, width: number) => {
    setOutlineColor(color);
    setOutlineWidth(width);
    if (selectedText) {
      selectedText.set({
        stroke: width > 0 ? color : '',
        strokeWidth: width
      });
      selectedText.setCoords();
      if (canvas) {
        canvas.renderAll();
        onUpdate();
      }
    }
  };

  // [2025-01-30 17:45:00] 更新文本对齐
  const handleTextAlignChange = (align: 'left' | 'center' | 'right') => {
    setTextAlign(align);
    if (selectedText) {
      selectedText.set('textAlign', align);
      selectedText.setCoords();
      if (canvas) {
        canvas.renderAll();
        onUpdate();
      }
    }
  };

  // [2025-12-08] 处理文本形状变化
  const handleTextShapeChange = (shape: 'straight' | 'arc' | 'circle' | 'wave') => {
    setTextShape(shape);
    if (!selectedText || !canvas) return;
    
    try {
      // 获取文本对象的位置和属性
      const left = selectedText.left || 0;
      const top = selectedText.top || 0;
      const text = selectedText.text || '';
      const fontSize = selectedText.fontSize || 48;
      const fontFamily = selectedText.fontFamily || 'Arial';
      const fill = selectedText.fill as string || '#000000';
      const stroke = selectedText.stroke as string || '';
      const strokeWidth = selectedText.strokeWidth || 0;
      
      // 创建路径
      let path: string;
      const width = (selectedText.width || 200);
      const height = (selectedText.height || 50);
      
      switch (shape) {
        case 'straight':
          // 直线：使用普通文本对象
          selectedText.set('path', undefined);
          break;
        case 'arc':
          // 弧形：使用SVG路径
          path = `M ${left} ${top + height} Q ${left + width / 2} ${top} ${left + width} ${top + height}`;
          selectedText.set('path', path);
          break;
        case 'circle':
          // 圆形：使用圆形路径
          const radius = Math.min(width, height) / 2;
          const centerX = left + width / 2;
          const centerY = top + height / 2;
          path = `M ${centerX + radius} ${centerY} A ${radius} ${radius} 0 1 1 ${centerX - radius} ${centerY} A ${radius} ${radius} 0 1 1 ${centerX + radius} ${centerY}`;
          selectedText.set('path', path);
          break;
        case 'wave':
          // 波浪：使用波浪路径
          const waveAmplitude = 10;
          const waveLength = width / 4;
          let wavePath = `M ${left} ${top + height / 2}`;
          for (let i = 0; i <= width; i += waveLength) {
            const x = left + i;
            const y = top + height / 2 + Math.sin((i / waveLength) * Math.PI * 2) * waveAmplitude;
            wavePath += ` L ${x} ${y}`;
          }
          selectedText.set('path', wavePath);
          break;
      }
      
      selectedText.setCoords();
      canvas.renderAll();
      onUpdate();
    } catch (error) {
      console.error('[EditTextPanel] Error applying text shape:', error);
      // 如果路径设置失败，回退到直线
      if (selectedText) {
        selectedText.set('path', undefined);
        canvas?.renderAll();
      }
    }
  };

  // [2025-01-30 17:45:00] Center 按钮
  // [2025-01-30 22:05:00] 添加调试日志和错误处理
  const handleCenter = () => {
    if (!selectedText || !canvas) {
      console.warn('[EditTextPanel] handleCenter: selectedText or canvas is null');
      return;
    }
    
    console.log('[EditTextPanel] Centering text');
    const canvasWidth = canvas.width || 1000;
    const canvasHeight = canvas.height || 1200;
    
    selectedText.set({
      left: canvasWidth / 2,
      top: canvasHeight / 2,
      originX: 'center',
      originY: 'center'
    });
    
    selectedText.setCoords();
    canvas.renderAll();
    onUpdate();
  };

  // [2025-01-30 17:45:00] Bring to Front
  const handleBringToFront = () => {
    if (!selectedText || !canvas) return;
    canvas.bringToFront(selectedText);
    canvas.renderAll();
    onUpdate();
  };

  // [2025-01-30 17:45:00] Send to Back
  const handleSendToBack = () => {
    if (!selectedText || !canvas) return;
    canvas.sendToBack(selectedText);
    canvas.renderAll();
    onUpdate();
  };

  // [2025-01-30 17:45:00] Duplicate
  const handleDuplicate = () => {
    if (!selectedText || !canvas) return;
    
    selectedText.clone((cloned: fabric.IText) => {
      cloned.set({
        left: (selectedText.left || 0) + 20,
        top: (selectedText.top || 0) + 20,
        name: `text_${Date.now()}`
      });
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      canvas.renderAll();
      onUpdate();
    });
  };

  if (!selectedText) {
    return (
      <div className="dl-edit-text-panel">
        <p>No text selected</p>
      </div>
    );
  }

  return (
    <div className="dl-edit-text-panel">
      {/* 1. Text（编辑文本内容） */}
      <div className="dl-edit-text-panel__section">
        <label className="dl-edit-text-panel__label">Text</label>
        <textarea
          className="dl-edit-text-panel__textarea"
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          rows={3}
        />
      </div>

      {/* 2. Change Font（字体选择器 - 带预览效果） */}
      <div className="dl-edit-text-panel__section">
        <label className="dl-edit-text-panel__label">Change Font</label>
        <div className="dl-edit-text-panel__font-selector" ref={fontSelectorRef}>
          <button
            type="button"
            className="dl-edit-text-panel__font-selector-btn"
            onClick={() => setShowFontDropdown(!showFontDropdown)}
            aria-expanded={showFontDropdown}
            aria-haspopup="listbox"
          >
            <span className="dl-edit-text-panel__font-preview" style={{ fontFamily: fontFamily }}>
              {(() => {
                const allFonts = Object.values(fonts).flat();
                return allFonts.find(f => f.name === fontFamily)?.previewText || 'Aa';
              })()}
            </span>
            <span className="dl-edit-text-panel__font-name">{fontFamily}</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`dl-edit-text-panel__font-arrow ${showFontDropdown ? 'is-open' : ''}`}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          
          {showFontDropdown && (
            <>
              <div
                className="dl-edit-text-panel__font-dropdown-overlay"
                onClick={() => setShowFontDropdown(false)}
              />
              <div className="dl-edit-text-panel__font-dropdown" role="listbox">
                {fontsLoading ? (
                  <div style={{ padding: '20px', textAlign: 'center' }}>Loading fonts...</div>
                ) : (
                  /* [2025-01-30 19:00:00] 按类别分组显示字体，从 API 动态获取 */
                  Object.keys(fonts).sort().map(category => {
                    const categoryFonts = fonts[category] || [];
                    if (categoryFonts.length === 0) return null;
                    
                    return (
                      <div key={category} className="dl-edit-text-panel__font-category">
                        <div className="dl-edit-text-panel__font-category-label">
                          {FONT_CATEGORY_LABELS[category as FontCategory] || category}
                        </div>
                        {categoryFonts.map(font => (
                          <button
                            key={font.id}
                            type="button"
                            role="option"
                            aria-selected={font.name === fontFamily}
                            className={`dl-edit-text-panel__font-option ${font.name === fontFamily ? 'is-selected' : ''}`}
                            onClick={() => {
                              handleFontChange(font.name);
                              setShowFontDropdown(false);
                            }}
                            style={{ fontFamily: font.name }}
                          >
                            <span className="dl-edit-text-panel__font-option-preview">
                              {font.previewText}
                            </span>
                            <span className="dl-edit-text-panel__font-option-name">{font.displayName || font.name}</span>
                            {font.name === fontFamily && (
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="dl-edit-text-panel__font-check"
                              >
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            )}
                          </button>
                        ))}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 3. Edit Color（颜色选择器） */}
      <div className="dl-edit-text-panel__section">
        <label className="dl-edit-text-panel__label">Edit Color</label>
        <div className="dl-edit-text-panel__color-group">
          <input
            type="color"
            value={color}
            onChange={(e) => handleColorChange(e.target.value)}
            className="dl-edit-text-panel__color-input"
          />
          <input
            type="text"
            value={color}
            onChange={(e) => handleColorChange(e.target.value)}
            className="dl-edit-text-panel__color-text"
          />
        </div>
      </div>

      {/* 4. Rotation（旋转滑块） */}
      <div className="dl-edit-text-panel__section">
        <label className="dl-edit-text-panel__label">
          Rotation: {rotation.toFixed(0)}°
        </label>
        <input
          type="range"
          min="0"
          max="360"
          value={rotation}
          onChange={(e) => handleRotationChange(parseFloat(e.target.value))}
          className="dl-edit-text-panel__slider"
        />
      </div>

      {/* 5. Outline（描边设置） */}
      <div className="dl-edit-text-panel__section">
        <label className="dl-edit-text-panel__label">Outline</label>
        <div className="dl-edit-text-panel__outline-group">
          <input
            type="color"
            value={outlineColor}
            onChange={(e) => handleOutlineChange(e.target.value, outlineWidth)}
            className="dl-edit-text-panel__color-input"
          />
          <input
            type="range"
            min="0"
            max="10"
            value={outlineWidth}
            onChange={(e) => handleOutlineChange(outlineColor, parseFloat(e.target.value))}
            className="dl-edit-text-panel__slider"
          />
          <span className="dl-edit-text-panel__slider-value">{outlineWidth.toFixed(0)}px</span>
        </div>
      </div>

      {/* 5.5. Text Shape（文本形状） - [2025-12-08] 新增 */}
      <div className="dl-edit-text-panel__section">
        <label className="dl-edit-text-panel__label">Text Shape</label>
        <div className="dl-edit-text-panel__btn-group">
          <button
            className={`dl-edit-text-panel__btn ${textShape === 'straight' ? 'is-active' : ''}`}
            onClick={() => handleTextShapeChange('straight')}
            type="button"
          >
            Straight
          </button>
          <button
            className={`dl-edit-text-panel__btn ${textShape === 'arc' ? 'is-active' : ''}`}
            onClick={() => handleTextShapeChange('arc')}
            type="button"
          >
            Arc
          </button>
          <button
            className={`dl-edit-text-panel__btn ${textShape === 'circle' ? 'is-active' : ''}`}
            onClick={() => handleTextShapeChange('circle')}
            type="button"
          >
            Circle
          </button>
          <button
            className={`dl-edit-text-panel__btn ${textShape === 'wave' ? 'is-active' : ''}`}
            onClick={() => handleTextShapeChange('wave')}
            type="button"
          >
            Wave
          </button>
        </div>
      </div>

      {/* 6. Text Size（字体大小滑块） */}
      {/* [2025-01-31 00:00:00] 像素级对齐：根据 Custom Ink designlab-addtext03.jpeg，Text Size 应在 Outline 之后 */}
      <div className="dl-edit-text-panel__section">
        <label className="dl-edit-text-panel__label">
          Text Size: {fontSize}px
        </label>
        <input
          type="range"
          min="12"
          max="200"
          value={fontSize}
          onChange={(e) => handleFontSizeChange(parseFloat(e.target.value))}
          className="dl-edit-text-panel__slider"
        />
      </div>

      {/* 8. 底部操作：Center / Layering / Text Alignment / Duplicate */}
      <div className="dl-edit-text-panel__section">
        <button
          className="dl-edit-text-panel__btn"
          onClick={handleCenter}
          type="button"
        >
          Center
        </button>
      </div>

      <div className="dl-edit-text-panel__section">
        <label className="dl-edit-text-panel__label">Layering</label>
        <div className="dl-edit-text-panel__btn-group">
          <button
            className="dl-edit-text-panel__btn"
            onClick={handleBringToFront}
            type="button"
          >
            Bring to Front
          </button>
          <button
            className="dl-edit-text-panel__btn"
            onClick={handleSendToBack}
            type="button"
          >
            Send to Back
          </button>
        </div>
      </div>

      <div className="dl-edit-text-panel__section">
        <label className="dl-edit-text-panel__label">Text Alignment</label>
        <div className="dl-edit-text-panel__btn-group">
          <button
            className={`dl-edit-text-panel__btn ${textAlign === 'left' ? 'is-active' : ''}`}
            onClick={() => handleTextAlignChange('left')}
            type="button"
          >
            Left
          </button>
          <button
            className={`dl-edit-text-panel__btn ${textAlign === 'center' ? 'is-active' : ''}`}
            onClick={() => handleTextAlignChange('center')}
            type="button"
          >
            Center
          </button>
          <button
            className={`dl-edit-text-panel__btn ${textAlign === 'right' ? 'is-active' : ''}`}
            onClick={() => handleTextAlignChange('right')}
            type="button"
          >
            Right
          </button>
        </div>
      </div>

      <div className="dl-edit-text-panel__section">
        <button
          className="dl-edit-text-panel__btn"
          onClick={handleDuplicate}
          type="button"
        >
          Duplicate
        </button>
      </div>

      {/* [2025-12-08] 超出安全区警示 */}
      {isOutOfSafeArea && (
        <div className="dl-edit-text-panel__section dl-edit-text-panel__section--warning">
          <div className="dl-edit-text-panel__warning">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#f59e0b', flexShrink: 0 }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div className="dl-edit-text-panel__warning-content">
              <p className="dl-edit-text-panel__warning-title">Text is outside the safe print area</p>
              <p className="dl-edit-text-panel__warning-text">
                Parts of your text may be cut off during printing. Please adjust the position or size.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditTextPanel;

