/**
 * Names & Numbers Modal - 名字和号码添加模态
* 实现 Names & Numbers 两步流程，对齐 Custom Ink
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

type Step = 'intro' | 'tools' | 'list' | 'quantities';

const NamesNumbersModal: React.FC<NamesNumbersModalProps> = ({
  isOpen,
  onClose,
  onAddToCanvas,
}) => {
// 修复：跳过 intro，直接显示 tools 配置页面（与 Custom Ink 一致）
// 根据截图，应该先显示 intro 介绍页
  const [step, setStep] = useState<Step>('intro');
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
// 修复 React Hooks 错误：将所有 hooks 移到早期返回之前
// Additional Items 状态
  const [showAdditionalItems, setShowAdditionalItems] = useState(false);
  const [additionalItemsCount, setAdditionalItemsCount] = useState<Record<string, number>>({});
  const [hasAdditionalItems, setHasAdditionalItems] = useState(false);

// 修复：Add To Design 按钮应该添加示例文本到画布，然后进入列表页面
  const handleAddExample = () => {
// 添加示例文本到画布
    const exampleItems: NameNumberItem[] = [
      { name: 'EXAMPLE', number: '00', size: 'M' },
    ];
    onAddToCanvas(exampleItems, config);
// 添加示例后进入列表页面，让用户输入实际的 names/numbers
    setStep('list');
// 预填充示例数据到列表
    setItems([
      { name: 'EXAMPLE', number: '00', size: 'M' },
      { name: '', number: '', size: '' },
      { name: '', number: '', size: '' },
      { name: '', number: '', size: '' },
      { name: '', number: '', size: '' },
    ]);

// 埋点：Names & Numbers 添加
    if (typeof window !== 'undefined') {
      const { analytics } = require('@/lib/analytics');
      analytics.track('names_numbers_added', {
        addNames: config.addNames,
        addNumbers: config.addNumbers,
      });
    }
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
// 过滤空项并添加到画布
    const validItems = items.filter(
      (item) => item.name.trim() || item.number.trim()
    );
    if (validItems.length > 0) {
// 根据截图，Done 后应该进入 Additional Items 模态
      setShowAdditionalItems(true);
      setStep('quantities');
      // 初始化数量
      const sizes = [...new Set(validItems.map(item => item.size).filter(Boolean))];
      const initialCounts: Record<string, number> = {};
      sizes.forEach(size => {
        initialCounts[size] = validItems.filter(item => item.size === size).length;
      });
      setAdditionalItemsCount(initialCounts);
    } else {
      onClose();
      setStep('tools');
      setItems([
        { name: '', number: '', size: '' },
        { name: '', number: '', size: '' },
        { name: '', number: '', size: '' },
        { name: '', number: '', size: '' },
        { name: '', number: '', size: '' },
      ]);
    }
  };

// Additional Items Done 处理
  const handleQuantitiesDone = () => {
    // 最终添加到画布
    const validItems = items.filter(
      (item) => item.name.trim() || item.number.trim()
    );
    if (validItems.length > 0) {
      onAddToCanvas(validItems, config);
    }
    onClose();
    // 重置状态
    setStep('tools');
    setShowAdditionalItems(false);
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

// 修复 React Hooks 错误：移除早期返回，因为父组件已经使用条件渲染
  // 这样可以确保 hooks 在每次渲染时都以相同的顺序和数量被调用
  if (!isOpen) {
    return null;
  }

  return (
    <div className="dl-modal-overlay" onClick={onClose}>
      <div className="dl-modal dl-modal--large" onClick={(e) => e.stopPropagation()}>
        <div className="dl-modal__header">
{/* 根据截图，Tools 页标题应该是 "Names and Numbers Tools" */}
          <h3 className="dl-modal__title" data-testid="names-numbers-modal-title">
            {step === 'tools' ? 'Names and Numbers Tools' : step === 'list' ? 'My List' : step === 'quantities' ? 'My Quantities' : 'Names & Numbers'}
          </h3>
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
{/* Step 1: Intro Page - 根据 designlab-addnames01.jpeg 修复介绍页 */}
          {step === 'intro' && (
            <div className="dl-names-numbers-intro">
{/* 添加介绍图片 */}
              <div className="dl-names-numbers-intro__image">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/names-numbers-intro.jpg"
                  alt="Team jerseys with names and numbers"
                  onError={(e) => {
                    // 如果图片不存在，使用占位符
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
{/* 更新介绍文本，匹配 Custom Ink */}
              <p className="dl-names-numbers-intro__description">
                Use personalized Names & Numbers for projects like team jerseys where you need a unique name and/or number for each item.
              </p>
{/* 更新按钮文本 */}
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

{/* Step 2 按钮 - 根据 designlab-addnames02.jpeg 和 designlab-addnames03.jpeg */}
              <div className="dl-names-numbers-tools__section">
                <button
                  className="dl-modal__btn dl-modal__btn--primary dl-modal__btn--block"
                  onClick={handleAddExample}
                  type="button"
                >
                  Step 2: Enter Names/Numbers
                </button>
              </div>

{/* 价格信息 - 根据截图添加 */}
              <div className="dl-names-numbers-tools__pricing">
                <p className="dl-names-numbers-tools__pricing-text">Full list required for accurate pricing</p>
                <p className="dl-names-numbers-tools__pricing-item">Names: $5.50 each item</p>
                <p className="dl-names-numbers-tools__pricing-item">Numbers: $3.50 each item</p>
              </div>

{/* 说明文本 - 根据截图添加 */}
              <div className="dl-names-numbers-tools__notes">
                <p>&quot;EXAMPLE&quot; and &quot;00&quot; are sample placeholders</p>
                <p>Our artists will expertly place each name/number from your list</p>
                <p>Names/numbers may be printed or vinyl</p>
              </div>
            </div>
          )}

{/* Step 2: List Page - 根据 designlab-addnames04.png 和 designlab-addnames05.png 修复 */}
          {step === 'list' && (
            <div className="dl-names-numbers-list">
{/* 更新标题和副标题 */}
              <h4 className="dl-names-numbers-list__title">My List</h4>
              <p className="dl-names-numbers-list__subtitle">Enter your full list and sizes for accurate pricing</p>

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
{/* 更新占位符文本，匹配 Custom Ink */}
                    <input
                      type="text"
                      className="dl-names-numbers-list__input"
                      placeholder="ENTER NAME"
                      value={item.name}
                      onChange={(e) =>
                        handleItemChange(index, 'name', e.target.value)
                      }
                    />
                    <input
                      type="text"
                      className="dl-names-numbers-list__input"
                      placeholder="00"
                      value={item.number}
                      onChange={(e) =>
                        handleItemChange(index, 'number', e.target.value)
                      }
                    />
                    <select
                      className="dl-names-numbers-list__input dl-names-numbers-list__size-select"
                      value={item.size}
                      onChange={(e) =>
                        handleItemChange(index, 'size', e.target.value)
                      }
                    >
                      <option value="">Size▾</option>
                      <option value="XS">XS</option>
                      <option value="S">S</option>
                      <option value="M">M</option>
                      <option value="L">L</option>
                      <option value="XL">XL</option>
                      <option value="2XL">2XL</option>
                      <option value="3XL">3XL</option>
                      <option value="YS">YS</option>
                      <option value="YM">YM</option>
                      <option value="YL">YL</option>
                    </select>
                  </div>
                ))}
              </div>

{/* Add More 和 Manage List 链接 */}
              <div className="dl-names-numbers-list__actions">
                <button
                  className="dl-names-numbers-list__add-more"
                  onClick={handleAddMoreRows}
                  type="button"
                >
                  + Add More
                </button>
                <button
                  className="dl-names-numbers-list__manage-list"
                  onClick={() => {
                    // TODO: 实现 Manage List 功能
                    alert('Manage List feature coming soon');
                  }}
                  type="button"
                >
                  Manage List
                </button>
              </div>

{/* Totals 和 Sizes 摘要框 */}
              <div className="dl-names-numbers-list__summary">
                <div className="dl-names-numbers-list__totals">
                  <strong>Totals:</strong> {totalNames} name{totalNames !== 1 ? 's' : ''} and {totalNumbers} number{totalNumbers !== 1 ? 's' : ''} on {totalItems} item{totalItems !== 1 ? 's' : ''}
                </div>
                <div className="dl-names-numbers-list__sizes">
                  <strong>Sizes:</strong> {items.filter(item => item.size.trim()).length > 0 ? `(${items.filter(item => item.size.trim()).length}/${items.length}) ${[...new Set(items.filter(item => item.size.trim()).map(item => item.size))].join(', ')}` : ''}
                </div>
              </div>

{/* Helpful Hints 框 - 根据 designlab-addnames04.png */}
              <div className="dl-names-numbers-list__hints">
                <h5 className="dl-names-numbers-list__hints-title">Helpful Hints</h5>
                <ul className="dl-names-numbers-list__hints-list">
                  <li>
                    Don&apos;t see the size you want? Switch to a <a href="#" onClick={(e) => { e.preventDefault(); /* TODO: Open color selector */ }}>color</a> or <a href="#" onClick={(e) => { e.preventDefault(); /* TODO: Open product selector */ }}>product</a> that has your size available.
                  </li>
                  <li>
                    Not able to enter names or numbers? Return to the <a href="#" onClick={(e) => { e.preventDefault(); setStep('tools'); }}>settings</a> to select these options.
                  </li>
                </ul>
              </div>
            </div>
          )}

{/* Step 3: Additional Items 模态 - 根据 designlab-addnames06.png */}
          {step === 'quantities' && (
            <div className="dl-names-numbers-quantities">
              <h4 className="dl-names-numbers-quantities__title">My Quantities</h4>
              <p className="dl-names-numbers-quantities__subtitle">Additional items without Names and Numbers</p>
              <p className="dl-names-numbers-quantities__description">
                We will update the quantities in your design to match the sizes in your names/numbers list. Check the box below if you would like additional sizes that won&apos;t receive names or numbers.
              </p>

              {/* Items receiving names or numbers */}
              <div className="dl-names-numbers-quantities__section">
                <label className="dl-names-numbers-quantities__label">Items receiving names or numbers</label>
                {Object.entries(additionalItemsCount).map(([size, count]) => (
                  <div key={size} className="dl-names-numbers-quantities__size-row">
                    <span className="dl-names-numbers-quantities__size-label">{size}</span>
                    <input
                      type="number"
                      className="dl-names-numbers-quantities__count-input"
                      value={count}
                      onChange={(e) => {
                        setAdditionalItemsCount({
                          ...additionalItemsCount,
                          [size]: parseInt(e.target.value) || 0
                        });
                      }}
                      min="0"
                    />
                  </div>
                ))}
              </div>

              {/* Checkbox for additional items */}
              <div className="dl-names-numbers-quantities__section">
                <label className="dl-names-numbers-quantities__checkbox-label">
                  <input
                    type="checkbox"
                    checked={hasAdditionalItems}
                    onChange={(e) => setHasAdditionalItems(e.target.checked)}
                    className="dl-names-numbers-quantities__checkbox"
                  />
                  <span>I have items that are not receiving names or numbers</span>
                </label>
              </div>

              {/* Summary */}
              <div className="dl-names-numbers-quantities__summary">
                <div className="dl-names-numbers-quantities__totals">
                  <strong>Totals:</strong> {totalNames} name{totalNames !== 1 ? 's' : ''} and {totalNumbers} number{totalNumbers !== 1 ? 's' : ''} on {totalItems} item{totalItems !== 1 ? 's' : ''}
                </div>
                <div className="dl-names-numbers-quantities__sizes">
                  <strong>Sizes:</strong> {Object.keys(additionalItemsCount).length > 0 ? `(${Object.values(additionalItemsCount).reduce((a, b) => a + b, 0)}/${Object.values(additionalItemsCount).reduce((a, b) => a + b, 0)}) ${Object.keys(additionalItemsCount).join(', ')}` : ''}
                </div>
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
{/* 返回箭头按钮 - 根据截图 */}
              <button
                className="dl-modal__btn dl-modal__btn--back"
                onClick={() => setStep('tools')}
                type="button"
                aria-label="Back"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
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
          {step === 'quantities' && (
            <>
{/* 返回箭头按钮 */}
              <button
                className="dl-modal__btn dl-modal__btn--back"
                onClick={() => setStep('list')}
                type="button"
                aria-label="Back"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                className="dl-modal__btn dl-modal__btn--primary"
                onClick={handleQuantitiesDone}
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

