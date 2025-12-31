/**
 * Edit Text Panel - 编辑文本面板
* 实现 Edit Text 面板，包含所有文本编辑控件
* 像素级对齐 Custom Ink designlab-addtext03.jpeg
 * 控件顺序：Text, Change Font, Edit Color, Rotation, Outline, Text Size, Positioning Controls
 */
'use client';

import React, { useState, useEffect, useRef } from 'react';
// 修复 fabric.js 导入：在 Next.js 中使用命名空间导入
import * as fabric from 'fabric';
import { fontsApi, type Font } from '@/lib/api';
import { FONT_CATEGORY_LABELS, type FontCategory } from '@/data/fonts';
import { TextEditControls } from '../../../design-lab5/toolbar/controls'; // 复用 Text 工具栏组件
import ColorPicker from '../ColorPicker';
import { applyCornerControls } from '../../../design-lab5/upload-controls/registerUploadCornerControls';

interface EditTextPanelProps {
  selectedText: fabric.IText | null;
  canvas: fabric.Canvas | null;
  onUpdate: () => void;
  onSave?: () => void;
}

const EditTextPanel: React.FC<EditTextPanelProps> = ({ selectedText, canvas, onUpdate, onSave }) => {
  const [text, setText] = useState('');
  const [fontFamily, setFontFamily] = useState('Arial');
  const [fontSize, setFontSize] = useState(48);
  const [color, setColor] = useState('#000000');
  const [rotation, setRotation] = useState(0);
  const [outlineColor, setOutlineColor] = useState('#000000');
  const [outlineWidth, setOutlineWidth] = useState(0);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center');
const [textShape, setTextShape] = useState<'straight' | 'arc' | 'circle' | 'wave'>('straight'); // 文本形状
const [isOutOfSafeArea, setIsOutOfSafeArea] = useState(false); // 是否超出安全区
// 字体选择器下拉菜单状态
  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const fontSelectorRef = useRef<HTMLDivElement>(null);
// 从 API 加载字体
  const [fonts, setFonts] = useState<Record<string, Font[]>>({});
  const [fontsLoading, setFontsLoading] = useState(true);
const loadedGoogleFontsRef = useRef<Set<string>>(new Set()); // 记录已加载的 Google Fonts，避免重复插入 <link>

// 确保 Google Font 已加载（否则下拉预览看起来“都一样”）
  const ensureGoogleFontLoaded = (fontInfo?: Font) => {
    if (!fontInfo) return;
    if (typeof document === 'undefined') return;
    if (fontInfo.source !== 'google') return;

    const family = (fontInfo.googleFontFamily || fontInfo.name || '').trim();
    if (!family) return;

    const weights = Array.isArray(fontInfo.weights) && fontInfo.weights.length > 0 ? fontInfo.weights : undefined;
    const key = `${family}|${weights ? weights.join(',') : 'default'}`;
    if (loadedGoogleFontsRef.current.has(key)) return;

    // Google Fonts family param uses + for spaces
    const familyParam = encodeURIComponent(family).replace(/%20/g, '+');
    const weightParam = weights ? `:wght@${weights.join(';')}` : '';
    const href = `https://fonts.googleapis.com/css2?family=${familyParam}${weightParam}&display=swap`;

    // 避免重复：如果页面上已经存在同 href 的 link，也认为已加载
    const alreadyInDom = Array.from(document.querySelectorAll('link[rel=\"stylesheet\"]')).some(
      (l) => (l as HTMLLinkElement).href === href,
    );
    if (alreadyInDom) {
      loadedGoogleFontsRef.current.add(key);
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute('data-dl-font', key);
    document.head.appendChild(link);
    loadedGoogleFontsRef.current.add(key);
  };

// 点击外部关闭下拉菜单
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

// 从 API 加载字体
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

// 更新文本属性
  useEffect(() => {
    if (selectedText) {
      setText(selectedText.text || '');
// 检查字体是否在加载的字体列表中
      const fontName = selectedText.fontFamily || 'Arial';
      const allFonts = Object.values(fonts).flat();
      const fontExists = allFonts.some(f => f.name === fontName);
      setFontFamily(fontExists ? fontName : 'Arial');
      setFontSize(selectedText.fontSize || 48);
      setColor(selectedText.fill as string || '#000000');
      setRotation(selectedText.angle || 0);
      setTextAlign((selectedText.textAlign as "left" | "center" | "right") || 'center');

// 描边设置
      if (selectedText.stroke) {
        setOutlineColor(selectedText.stroke as string || '#000000');
        setOutlineWidth(selectedText.strokeWidth || 0);
      }

// 文本形状（如果有path属性，判断形状类型）
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

// 检查是否超出安全区
      checkSafeArea(selectedText, canvas);
    }
  }, [selectedText, fonts, canvas]);

// 检查对象是否超出安全区
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

// 监听对象移动和缩放，实时检查安全区
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

// 更新文本内容
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

// 更新字体
// 支持多语言字体，需要加载 Google Fonts
// 修复：使用从 API 加载的 fonts 数据或从 fonts.ts 导入的配置
// 修复：添加错误处理和调试日志，确保字体更改正确应用
  const handleFontChange = (font: string) => {
    console.log('[EditTextPanel] handleFontChange called:', { font, hasSelectedText: !!selectedText, hasCanvas: !!canvas });
    setFontFamily(font);
    if (selectedText && canvas) {
      try {
// 对于 Google Fonts，需要确保字体已加载
// 从加载的 fonts 数据中查找字体信息
        const allFonts = Object.values(fonts).flat();
        const fontInfo = allFonts.find(f => f.name === font);
// 选择时触发加载，确保 Fabric/预览都能用到真实字体
        ensureGoogleFontLoaded(fontInfo);

// 直接设置字体，Fabric.js 会自动使用系统字体或已加载的 Web 字体
// 优先使用 googleFontFamily（有些字体 name/displayName 不等于 Google 的 family）
        selectedText.set('fontFamily', fontInfo?.googleFontFamily || font);
(selectedText as any).dirty = true; // 强制标记为 dirty，避免缓存导致“看起来没变”
        selectedText.setCoords();
        canvas.renderAll();

        console.log('[EditTextPanel] Font changed successfully:', { font, textObjectName: (selectedText as any).name });

// 延迟调用 onUpdate，确保字体更改已应用
        setTimeout(() => {
          onUpdate();
        }, 100);
      } catch (error) {
        console.error('[EditTextPanel] Error changing font:', error);
      }
    } else {
      console.warn('[EditTextPanel] Cannot change font: selectedText or canvas is null');
    }
  };

// 当字体列表加载完成或当前 fontFamily 变化时，预加载当前字体（让下拉/预览立即有差异）
  useEffect(() => {
    const allFonts = Object.values(fonts).flat();
    const fontInfo = allFonts.find(f => f.name === fontFamily || f.googleFontFamily === fontFamily);
    ensureGoogleFontLoaded(fontInfo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontsLoading, fontFamily]);

// 更新颜色
// 修复：添加错误处理和调试日志，确保颜色更改正确应用
  const handleColorChange = (newColor: string) => {
    console.log('[EditTextPanel] handleColorChange called:', { newColor, hasSelectedText: !!selectedText, hasCanvas: !!canvas });
    setColor(newColor);
    if (selectedText && canvas) {
      try {
        selectedText.set('fill', newColor);
        selectedText.setCoords();
        canvas.renderAll();

        console.log('[EditTextPanel] Color changed successfully:', { newColor, textObjectName: (selectedText as any).name });

// 延迟调用 onUpdate，确保颜色更改已应用
        setTimeout(() => {
          onUpdate();
        }, 100);
      } catch (error) {
        console.error('[EditTextPanel] Error changing color:', error);
      }
    } else {
      console.warn('[EditTextPanel] Cannot change color: selectedText or canvas is null');
    }
  };

// 更新旋转
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

// 更新字体大小
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

// 更新描边
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

// 更新文本对齐
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

// 处理文本形状变化
// 修复：添加参数验证和错误处理，防止 TypeError "t is not iterable"
  const handleTextShapeChange = (shape: 'straight' | 'arc' | 'circle' | 'wave') => {
    setTextShape(shape);
    if (!selectedText || !canvas) return;

    try {
// 验证 selectedText 是有效的文本对象
      if (selectedText.type !== 'i-text' && selectedText.type !== 'textbox') {
        console.warn('[EditTextPanel] Selected object is not a text object, skipping shape change');
        return;
      }

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
      let path: string | undefined;
      const width = (selectedText.width || 200);
      const height = (selectedText.height || 50);

      switch (shape) {
        case 'straight':
          // 直线：使用普通文本对象，清除路径
          path = undefined;
          break;
        case 'arc':
          // 弧形：使用SVG路径字符串
          path = `M ${left} ${top + height} Q ${left + width / 2} ${top} ${left + width} ${top + height}`;
          break;
        case 'circle':
          // 圆形：使用圆形路径字符串
          const radius = Math.min(width, height) / 2;
          const centerX = left + width / 2;
          const centerY = top + height / 2;
          path = `M ${centerX + radius} ${centerY} A ${radius} ${radius} 0 1 1 ${centerX - radius} ${centerY} A ${radius} ${radius} 0 1 1 ${centerX + radius} ${centerY}`;
          break;
        case 'wave':
          // 波浪：使用波浪路径字符串
          const waveAmplitude = 10;
          const waveLength = width / 4;
          let wavePath = `M ${left} ${top + height / 2}`;
          for (let i = 0; i <= width; i += waveLength) {
            const x = left + i;
            const y = top + height / 2 + Math.sin((i / waveLength) * Math.PI * 2) * waveAmplitude;
            wavePath += ` L ${x} ${y}`;
          }
          path = wavePath;
          break;
        default:
          console.warn('[EditTextPanel] Unknown shape type:', shape);
          path = undefined;
      }

// 验证路径格式：必须是字符串或 undefined
      if (path !== undefined && typeof path !== 'string') {
        console.error('[EditTextPanel] Invalid path format, expected string or undefined, got:', typeof path, path);
        path = undefined;
      }

// 安全地设置路径属性
      if (path === undefined) {
        selectedText.set('path', undefined);
      } else {
        // 确保路径是有效的字符串
        selectedText.set('path', path);
      }

      selectedText.setCoords();
      canvas.renderAll();
      onUpdate();
    } catch (error) {
// 仅打印错误，不弹窗也不改变面板状态
      console.error('[EditTextPanel] Error applying text shape:', error);
      // 如果路径设置失败，回退到直线
      try {
        if (selectedText) {
          selectedText.set('path', undefined);
          selectedText.setCoords();
          canvas?.renderAll();
        }
      } catch (recoveryError) {
        console.error('[EditTextPanel] Error during recovery:', recoveryError);
      }
    }
  };

// Center 按钮
// 添加调试日志和错误处理
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

// Bring to Front - 修复 Fabric.js v6 API
  const handleBringToFront = () => {
    if (!selectedText || !canvas) return;
    try {
      if (typeof (canvas as any).bringObjectToFront === 'function') {
        (canvas as any).bringObjectToFront(selectedText);
      } else if (typeof (selectedText as any).bringToFront === 'function') {
        (selectedText as any).bringToFront();
      } else {
        const objects = canvas.getObjects();
        const index = objects.indexOf(selectedText);
        if (index >= 0 && index < objects.length - 1) {
          objects.splice(index, 1);
          objects.push(selectedText);
          canvas.renderAll();
        }
      }
      canvas.renderAll();
      onUpdate();
    } catch (error) {
      console.error('[EditTextPanel] bringToFront failed:', error);
    }
  };

// Send to Back - 修复 Fabric.js v6 API
// 限制：不能将对象移到商品底图（background）下面
  const handleSendToBack = async () => {
    if (!selectedText || !canvas) return;
    try {
      const objects = canvas.getObjects();
      const currentIndex = objects.indexOf(selectedText);
      if (currentIndex === -1) return;

      // 找到商品底图的位置（name === 'background' 或 name.startsWith('product-image-') 或 layerType === 'product'/'product-image'）
      const backgroundIndex = objects.findIndex((obj: any) => {
        const name = (obj as any).name || '';
        const layerType = (obj as any).data?.layerType;
// 兼容 5.0：底图名称为 product-image-base
        return (
          name === 'background' ||
          name === 'product-image-base' ||
          name.startsWith('product-image-') ||
          layerType === 'product' ||
          layerType === 'product-image' ||
          layerType === 'product-image-base'
        );
      });

      // 计算目标索引：应该在商品底图之后（索引 = backgroundIndex + 1）
      const targetIndex = backgroundIndex >= 0 ? backgroundIndex + 1 : 0;

// 添加调试日志
      console.log('[EditTextPanel] sendToBack called:', {
        currentIndex,
        backgroundIndex,
        targetIndex,
        objectsCount: objects.length,
      });

// 如果已经在目标位置，不需要移动
      if (currentIndex === targetIndex) {
        console.log('[EditTextPanel] Already at target position, skipping');
        return;
      }

// 修复根因：不再先 sendObjectToBack（会把对象送到绝对底层，必然跑到商品底图后面）
      // 直接将对象移动到“商品底图之后的第一个位置”（backgroundIndex + 1），使用 Fabric API 保证顺序生效
      if (typeof (canvas as any).moveObjectTo === 'function') {
        (canvas as any).moveObjectTo(selectedText, targetIndex);
      } else {
        // 兜底：手动调整顺序（如果 moveObjectTo 不可用）
        const objs = canvas.getObjects();
        const idx = objs.indexOf(selectedText);
        if (idx >= 0) {
          objs.splice(idx, 1);
          const insertIndex = Math.max(0, Math.min(targetIndex, objs.length));
          objs.splice(insertIndex, 0, selectedText);
        }
      }

      canvas.renderAll();
      onUpdate();
    } catch (error) {
      console.error('[EditTextPanel] sendToBack failed:', error);
    }
  };

// Duplicate - 修复 clone API 兼容性问题
  const handleDuplicate = async () => {
    if (!selectedText || !canvas) return;
    try {
      const cloneResult = (selectedText as any).clone();
      const cloned = cloneResult instanceof Promise
        ? await cloneResult
        : typeof cloneResult === 'function'
          ? await new Promise<fabric.IText>((resolve) => {
            (selectedText as any).clone(resolve);
          })
          : cloneResult;

      if (!cloned) {
        console.error('[EditTextPanel] clone returned null/undefined');
        return;
      }

      cloned.set({
        left: (selectedText.left || 0) + 40,
        top: (selectedText.top || 0) + 40,
        name: `text_${Date.now()}`,
      });

      if ((selectedText as any).data) {
        (cloned as any).data = { ...(selectedText as any).data };
      }

      canvas.add(cloned);
// Add Text: 复用 5.0 图标角控件（delete/duplicate/resize）
      applyCornerControls({ canvas, obj: cloned });
      canvas.setActiveObject(cloned);
      canvas.renderAll();
      onUpdate();
    } catch (error) {
      console.error('[EditTextPanel] duplicate failed:', error);
    }
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
/* 按类别分组显示字体，从 API 动态获取 */
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
// 悬停时懒加载字体，确保下拉预览“像字体应该有的样子”
                            onMouseEnter={() => ensureGoogleFontLoaded(font)}
                            onClick={() => {
                              handleFontChange(font.name);
                              setShowFontDropdown(false);
                            }}
// 优先用 googleFontFamily 渲染预览
                            style={{ fontFamily: `${font.googleFontFamily || font.name}, Arial, sans-serif` }}
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
        <ColorPicker
          selectedColor={color}
          onChange={handleColorChange}
          title="Font Colors"
        />
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

{/* 5.5. Text Shape（文本形状） - 已移除 */}

      {/* 6. Text Size（字体大小滑块） */}
{/* 像素级对齐：根据 Custom Ink designlab-addtext03.jpeg，Text Size 应在 Outline 之后 */}
      <div className="dl-edit-text-panel__section">
        <label className="dl-edit-text-panel__label">
          Text Size: {fontSize}px
        </label>
        <input
          type="range"
          min="12"
          max="300"
          value={fontSize}
          onChange={(e) => handleFontSizeChange(parseFloat(e.target.value))}
          className="dl-edit-text-panel__slider"
        />
      </div>

      {/* 8. 底部操作：Center / Layering / Text Alignment / Duplicate / Rotation */}
      <TextEditControls
        onCenter={handleCenter}
        onBringToFront={handleBringToFront}
        onSendToBack={handleSendToBack}
        textAlign={textAlign}
        onTextAlignChange={handleTextAlignChange}
        onDuplicate={handleDuplicate}
      />

      {/* Action Buttons */}
      <div className="dl-edit-text-panel__section">
        <button
          className="dl-edit-text-panel__btn dl-edit-text-panel__btn--primary"
          onClick={onSave}
          type="button"
          style={{ width: '100%', marginTop: '10px' }}
        >
          Save Design
        </button>
      </div>

{/* 超出安全区警示 */}
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

