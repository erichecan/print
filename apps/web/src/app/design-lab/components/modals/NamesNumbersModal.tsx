/**
 * Names & Numbers Modal - 名字和号码添加模态
 * [2025-01-30 20:00:00] 实现 Names & Numbers 两步流程，对齐 Custom Ink
 */
'use client';

import React, { useState } from 'react';

interface NameNumberItem {
  name: string;
  number: string;
  size: string;
}

interface NamesNumbersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToCanvas: (items: NameNumberItem[], config: NamesNumbersConfig) => void;
}

interface NamesNumbersConfig {
  addNames: boolean;
  addNumbers: boolean;
  nameSide: 'front' | 'back' | 'sleeve';
  nameHeight: number; // in inches
  nameColor: string;
  numberSide: 'front' | 'back' | 'sleeve';
  numberHeight: number; // in inches
  numberColor: string;
}

type Step = 'intro' | 'tools' | 'list';

const NamesNumbersModal: React.FC<NamesNumbersModalProps> = ({
  isOpen,
  onClose,
  onAddToCanvas,
}) => {
  // [2025-01-30 21:50:00] 修复：跳过 intro，直接显示 tools 配置页面（与 Custom Ink 一致）
  const [step, setStep] = useState<Step>('tools');
  const [config, setConfig] = useState<NamesNumbersConfig>({
    addNames: true,
    addNumbers: true,
    nameSide: 'front',
    nameHeight: 2,
    nameColor: '#ffff00',
    numberSide: 'back',
    numberHeight: 8,
    numberColor: '#00ffff',
  });
  const [items, setItems] = useState<NameNumberItem[]>([
    { name: '', number: '', size: '' },
    { name: '', number: '', size: '' },
    { name: '', number: '', size: '' },
    { name: '', number: '', size: '' },
    { name: '', number: '', size: '' },
  ]);

  if (!isOpen) return null;

  // [2025-01-30 21:50:00] 修复：Add To Design 按钮应该添加示例文本到画布，然后进入列表页面
  const handleAddExample = () => {
    // [2025-01-30 20:00:00] 添加示例文本到画布
    const exampleItems: NameNumberItem[] = [
      { name: 'EXAMPLE', number: '00', size: 'M' },
    ];
    onAddToCanvas(exampleItems, config);
    // [2025-01-30 21:50:00] 添加示例后进入列表页面，让用户输入实际的 names/numbers
    setStep('list');
    // [2025-01-30 21:50:00] 预填充示例数据到列表
    setItems([
      { name: 'EXAMPLE', number: '00', size: 'M' },
      { name: '', number: '', size: '' },
      { name: '', number: '', size: '' },
      { name: '', number: '', size: '' },
      { name: '', number: '', size: '' },
    ]);
  };

  const handleAddMoreRows = () => {
    setItems([...items, { name: '', number: '', size: '' }]);
  };

  const handleItemChange = (index: number, field: keyof NameNumberItem, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleDone = () => {
    // [2025-01-30 20:00:00] 过滤空项并添加到画布
    const validItems = items.filter(
      (item) => item.name.trim() || item.number.trim()
    );
    if (validItems.length > 0) {
      onAddToCanvas(validItems, config);
    }
    onClose();
    // [2025-01-30 20:00:00] 重置状态（回到 tools 页面，与 Custom Ink 一致）
    setStep('tools');
    setItems([
      { name: '', number: '', size: '' },
      { name: '', number: '', size: '' },
      { name: '', number: '', size: '' },
      { name: '', number: '', size: '' },
      { name: '', number: '', size: '' },
    ]);
  };

  const totalNames = items.filter((item) => item.name.trim()).length;
  const totalNumbers = items.filter((item) => item.number.trim()).length;
  const totalItems = items.filter((item) => item.name.trim() || item.number.trim()).length;

  return (
    <div className="dl-modal-overlay" onClick={onClose}>
      <div className="dl-modal dl-modal--large" onClick={(e) => e.stopPropagation()}>
        <div className="dl-modal__header">
          <h3 className="dl-modal__title">Names & Numbers</h3>
          <button
            className="dl-modal__close"
            onClick={onClose}
            aria-label="Close"
            type="button"
          >
            ×
          </button>
        </div>

        <div className="dl-modal__body">
          {/* Step 1: Intro Page */}
          {step === 'intro' && (
            <div className="dl-names-numbers-intro">
              <h4 className="dl-names-numbers-intro__title">
                Add Names and Numbers to Your Design
              </h4>
              <p className="dl-names-numbers-intro__description">
                Personalize your design by adding names and numbers. You can add names
                and numbers to the front, back, or sleeve of your product.
              </p>
              <div className="dl-names-numbers-intro__features">
                <div className="dl-names-numbers-intro__feature">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <span>Customize side, height, and color</span>
                </div>
                <div className="dl-names-numbers-intro__feature">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <span>Add multiple names and numbers</span>
                </div>
                <div className="dl-names-numbers-intro__feature">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <span>Preview on canvas before ordering</span>
                </div>
              </div>
              <button
                className="dl-modal__btn dl-modal__btn--primary"
                onClick={() => setStep('tools')}
                type="button"
              >
                Add Names and Numbers
              </button>
            </div>
          )}

          {/* Step 1: Tools Page */}
          {step === 'tools' && (
            <div className="dl-names-numbers-tools">
              {/* Add Names Section */}
              <div className="dl-names-numbers-tools__section">
                <label className="dl-names-numbers-tools__checkbox-label">
                  <input
                    type="checkbox"
                    checked={config.addNames}
                    onChange={(e) =>
                      setConfig({ ...config, addNames: e.target.checked })
                    }
                    className="dl-names-numbers-tools__checkbox"
                  />
                  <span className="dl-names-numbers-tools__checkbox-text">
                    <strong>Step 1: Add Names</strong>
                  </span>
                </label>
                {config.addNames && (
                  <div className="dl-names-numbers-tools__options">
                    <div className="dl-names-numbers-tools__option-row">
                      <label className="dl-names-numbers-tools__label">Side:</label>
                      <select
                        className="dl-names-numbers-tools__select"
                        value={config.nameSide}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            nameSide: e.target.value as 'front' | 'back' | 'sleeve',
                          })
                        }
                      >
                        <option value="front">Front</option>
                        <option value="back">Back</option>
                        <option value="sleeve">Sleeve</option>
                      </select>
                    </div>
                    <div className="dl-names-numbers-tools__option-row">
                      <label className="dl-names-numbers-tools__label">Height:</label>
                      <select
                        className="dl-names-numbers-tools__select"
                        value={config.nameHeight}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            nameHeight: parseInt(e.target.value),
                          })
                        }
                      >
                        <option value="1">1 In</option>
                        <option value="2">2 In</option>
                        <option value="3">3 In</option>
                        <option value="4">4 In</option>
                        <option value="5">5 In</option>
                        <option value="6">6 In</option>
                      </select>
                    </div>
                    <div className="dl-names-numbers-tools__option-row">
                      <label className="dl-names-numbers-tools__label">Color:</label>
                      <select
                        className="dl-names-numbers-tools__select"
                        value={config.nameColor}
                        onChange={(e) =>
                          setConfig({ ...config, nameColor: e.target.value })
                        }
                      >
                        <option value="#000000">Black</option>
                        <option value="#ffffff">White</option>
                        <option value="#ffff00">Yellow</option>
                        <option value="#ff0000">Red</option>
                        <option value="#0000ff">Blue</option>
                        <option value="#00ff00">Green</option>
                        <option value="#00ffff">Teal</option>
                        <option value="#ff00ff">Magenta</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Add Numbers Section */}
              <div className="dl-names-numbers-tools__section">
                <label className="dl-names-numbers-tools__checkbox-label">
                  <input
                    type="checkbox"
                    checked={config.addNumbers}
                    onChange={(e) =>
                      setConfig({ ...config, addNumbers: e.target.checked })
                    }
                    className="dl-names-numbers-tools__checkbox"
                  />
                  <span className="dl-names-numbers-tools__checkbox-text">
                    <strong>Step 1: Add Numbers</strong>
                  </span>
                </label>
                {config.addNumbers && (
                  <div className="dl-names-numbers-tools__options">
                    <div className="dl-names-numbers-tools__option-row">
                      <label className="dl-names-numbers-tools__label">Side:</label>
                      <select
                        className="dl-names-numbers-tools__select"
                        value={config.numberSide}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            numberSide: e.target.value as 'front' | 'back' | 'sleeve',
                          })
                        }
                      >
                        <option value="front">Front</option>
                        <option value="back">Back</option>
                        <option value="sleeve">Sleeve</option>
                      </select>
                    </div>
                    <div className="dl-names-numbers-tools__option-row">
                      <label className="dl-names-numbers-tools__label">Height:</label>
                      <select
                        className="dl-names-numbers-tools__select"
                        value={config.numberHeight}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            numberHeight: parseInt(e.target.value),
                          })
                        }
                      >
                        <option value="4">4 In</option>
                        <option value="5">5 In</option>
                        <option value="6">6 In</option>
                        <option value="7">7 In</option>
                        <option value="8">8 In</option>
                        <option value="9">9 In</option>
                        <option value="10">10 In</option>
                      </select>
                    </div>
                    <div className="dl-names-numbers-tools__option-row">
                      <label className="dl-names-numbers-tools__label">Color:</label>
                      <select
                        className="dl-names-numbers-tools__select"
                        value={config.numberColor}
                        onChange={(e) =>
                          setConfig({ ...config, numberColor: e.target.value })
                        }
                      >
                        <option value="#000000">Black</option>
                        <option value="#ffffff">White</option>
                        <option value="#ffff00">Yellow</option>
                        <option value="#ff0000">Red</option>
                        <option value="#0000ff">Blue</option>
                        <option value="#00ff00">Green</option>
                        <option value="#00ffff">Teal</option>
                        <option value="#ff00ff">Magenta</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Add To Design Button */}
              <div className="dl-names-numbers-tools__section">
                <button
                  className="dl-modal__btn dl-modal__btn--primary dl-modal__btn--block"
                  onClick={handleAddExample}
                  type="button"
                >
                  Add To Design
                </button>
                <p className="dl-names-numbers-tools__hint">
                  This will add example text &quot;EXAMPLE&quot; and &quot;00&quot; to the canvas
                </p>
              </div>
            </div>
          )}

          {/* Step 2: List Page */}
          {step === 'list' && (
            <div className="dl-names-numbers-list">
              <h4 className="dl-names-numbers-list__title">
                Step 2: Enter Names/Numbers
              </h4>

              {/* Table Header */}
              <div className="dl-names-numbers-list__table-header">
                <div className="dl-names-numbers-list__table-col">Name</div>
                <div className="dl-names-numbers-list__table-col">#</div>
                <div className="dl-names-numbers-list__table-col">Size</div>
              </div>

              {/* Table Body */}
              <div className="dl-names-numbers-list__table-body">
                {items.map((item, index) => (
                  <div key={index} className="dl-names-numbers-list__table-row">
                    <input
                      type="text"
                      className="dl-names-numbers-list__input"
                      placeholder="Enter name"
                      value={item.name}
                      onChange={(e) =>
                        handleItemChange(index, 'name', e.target.value)
                      }
                    />
                    <input
                      type="text"
                      className="dl-names-numbers-list__input"
                      placeholder="Enter number"
                      value={item.number}
                      onChange={(e) =>
                        handleItemChange(index, 'number', e.target.value)
                      }
                    />
                    <input
                      type="text"
                      className="dl-names-numbers-list__input"
                      placeholder="Size"
                      value={item.size}
                      onChange={(e) =>
                        handleItemChange(index, 'size', e.target.value)
                      }
                    />
                  </div>
                ))}
              </div>

              {/* Add More Button */}
              <button
                className="dl-names-numbers-list__add-more"
                onClick={handleAddMoreRows}
                type="button"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add More
              </button>

              {/* Totals */}
              <div className="dl-names-numbers-list__totals">
                <strong>Totals:</strong> {totalNames} names and {totalNumbers} numbers on{' '}
                {totalItems} items
              </div>

              {/* Pricing Info */}
              <div className="dl-names-numbers-list__pricing">
                <p>Names: $5.50 each item</p>
                <p>Numbers: $3.50 each item</p>
              </div>
            </div>
          )}
        </div>

        <div className="dl-modal__footer">
          {step === 'intro' && (
            <button
              className="dl-modal__btn dl-modal__btn--secondary"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
          )}
          {step === 'tools' && (
            <>
              <button
                className="dl-modal__btn dl-modal__btn--secondary"
                onClick={() => setStep('intro')}
                type="button"
              >
                Back
              </button>
              <button
                className="dl-modal__btn dl-modal__btn--secondary"
                onClick={onClose}
                type="button"
              >
                Cancel
              </button>
            </>
          )}
          {step === 'list' && (
            <>
              <button
                className="dl-modal__btn dl-modal__btn--secondary"
                onClick={() => setStep('tools')}
                type="button"
              >
                Back
              </button>
              <button
                className="dl-modal__btn dl-modal__btn--primary"
                onClick={handleDone}
                type="button"
              >
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NamesNumbersModal;

