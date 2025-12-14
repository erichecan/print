'use client';

/**
 * Design Lab 5.0 - 极简版本
 * [2025-12-20 02:20:00] 完全参考 Custom Ink，使用最简单的 HTML/CSS 实现
 * 
 * 目标：
 * - UI 完全与 4.0 版本一致
 * - 只实现布局（阶段 1）和商品图片显示（阶段 2）
 * - 不包含任何功能代码
 * - 代码极简，使用简单的 HTML <img> 标签
 */
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation'; // [2025-12-20 03:05:00] 5.0 版本：功能2 - 从 URL 参数获取 productId/colorId
import { getDefaultProductBaseImages, getThumbnailImageUrl, getProductBaseImagesFromAPI } from '@/lib/customink-images';
import './design-lab.css';

// [2025-12-20 03:00:00] 5.0 版本：添加 props 接口（为后续功能准备）
interface DesignLabClient5Props {
  initialProductData?: any; // [2025-12-20 03:00:00] 服务端预取的产品数据（暂时未使用）
}

const DesignLabClient5: React.FC<DesignLabClient5Props> = ({ initialProductData }) => {
  // [2025-12-20 03:05:00] 5.0 版本：功能2 - 从 URL 参数获取 productId/colorId
  const searchParams = useSearchParams();

  // [2025-12-20 02:20:00] 5.0 版本：只保留最基本的 state
  const [currentView, setCurrentView] = useState<'front' | 'back' | 'sleeve'>('front');
  
  // [2025-12-20 03:05:00] 5.0 版本：功能2 - 改为 useState，支持动态更新
  const [productInfo, setProductInfo] = useState<{
    color: string;
    baseImages: {
      front: string;
      back: string;
      sleeve: string;
    };
    productId?: string;
    colorId?: string;
  }>({
    color: 'White',
    baseImages: getDefaultProductBaseImages('White'),
  });

  // [2025-12-20 03:05:00] 5.0 版本：功能2 - 从 URL 参数加载商品信息
  useEffect(() => {
    const productId = searchParams?.get('productId') || undefined;
    const colorId = searchParams?.get('colorId') || undefined;
    const variantId = searchParams?.get('variantId') || undefined;

    console.log('[DesignLab 5.0] 功能2 - URL 参数:', { productId, colorId, variantId });

    // 如果有 variantId，优先从服务端预取的数据中获取
    if (initialProductData && variantId) {
      console.log('[DesignLab 5.0] 功能2 - 使用服务端预取的数据:', initialProductData);
      const color = initialProductData.color || initialProductData.colorName || 'White';
      const baseImages = initialProductData.baseImages || getDefaultProductBaseImages(color);
      
      setProductInfo({
        color,
        baseImages,
        productId: initialProductData.productId || productId,
        colorId: initialProductData.colorId || colorId,
      });
      return;
    }

    // 如果只有 colorId，根据 colorId 更新颜色
    if (colorId && !initialProductData) {
      // 简单实现：假设 colorId 对应的颜色名称（后续可以从 API 获取映射）
      const colorName = 'White'; // 默认值，TODO: 从 API 获取 colorId 到 colorName 的映射
      
      console.log('[DesignLab 5.0] 功能2 - 根据 colorId 更新颜色:', { colorId, colorName });
      const baseImages = getDefaultProductBaseImages(colorName);
      
      setProductInfo(prev => ({
        ...prev,
        color: colorName,
        baseImages,
        colorId,
      }));
      return;
    }

    // 如果有 productId 和 colorName，尝试从 API 获取图片
    if (productId && !initialProductData) {
      const colorName = productInfo.color || 'White';
      
      console.log('[DesignLab 5.0] 功能2 - 尝试从 API 获取商品图片:', { productId, colorName });
      
      getProductBaseImagesFromAPI(colorName, productId)
        .then(apiImages => {
          if (apiImages) {
            console.log('[DesignLab 5.0] 功能2 - API 返回图片:', apiImages);
            setProductInfo(prev => ({
              ...prev,
              baseImages: apiImages,
              productId,
            }));
          } else {
            console.log('[DesignLab 5.0] 功能2 - API 未返回图片，使用默认图片');
          }
        })
        .catch(error => {
          console.warn('[DesignLab 5.0] 功能2 - API 获取失败，使用默认图片:', error);
        });
    }
  }, [searchParams, initialProductData]); // [2025-12-20 03:05:00] 依赖 searchParams 和 initialProductData

  // [2025-12-20 02:50:00] 5.0 版本：添加调试日志，确保元素正确渲染
  const railRef = useRef<HTMLElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // 检查 Rail（第一列）
    const rail = railRef.current;
    if (rail) {
      const rect = rail.getBoundingClientRect();
      const styles = window.getComputedStyle(rail);
      console.log('[DesignLab 5.0 Debug] Rail (第一列):', {
        exists: true,
        visible: rect.width > 0 && rect.height > 0,
        width: rect.width,
        height: rect.height,
        display: styles.display,
        position: styles.position,
        gridColumn: styles.gridColumn,
        backgroundColor: styles.backgroundColor,
        childrenCount: rail.children.length,
      });
    } else {
      console.error('[DesignLab 5.0 Debug] Rail (第一列) 元素未找到！');
    }

    // 检查 Sidebar（第四列）
    const sidebar = sidebarRef.current;
    if (sidebar) {
      const rect = sidebar.getBoundingClientRect();
      const styles = window.getComputedStyle(sidebar);
      console.log('[DesignLab 5.0 Debug] Sidebar (第四列):', {
        exists: true,
        visible: rect.width > 0 && rect.height > 0,
        width: rect.width,
        height: rect.height,
        display: styles.display,
        position: styles.position,
        gridColumn: styles.gridColumn,
        backgroundColor: styles.backgroundColor,
        childrenCount: sidebar.children.length,
      });
    } else {
      console.error('[DesignLab 5.0 Debug] Sidebar (第四列) 元素未找到！');
    }

    // 检查 Canvas（第三列）
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const styles = window.getComputedStyle(canvas);
      console.log('[DesignLab 5.0 Debug] Canvas (第三列):', {
        exists: true,
        visible: rect.width > 0 && rect.height > 0,
        width: rect.width,
        height: rect.height,
        display: styles.display,
        gridColumn: styles.gridColumn,
        backgroundColor: styles.backgroundColor,
      });
    } else {
      console.error('[DesignLab 5.0 Debug] Canvas (第三列) 元素未找到！');
    }

    // 检查主容器
    const mainContainer = document.querySelector('.design-lab-new');
    if (mainContainer) {
      const rect = mainContainer.getBoundingClientRect();
      const styles = window.getComputedStyle(mainContainer);
      console.log('[DesignLab 5.0 Debug] 主容器 (.design-lab-new):', {
        exists: true,
        display: styles.display,
        gridTemplateColumns: styles.gridTemplateColumns,
        gridTemplateRows: styles.gridTemplateRows,
        width: rect.width,
        height: rect.height,
        childrenCount: mainContainer.children.length,
      });
    } else {
      console.error('[DesignLab 5.0 Debug] 主容器未找到！');
    }
  }, []);

  // [2025-12-20 03:10:00] 5.0 版本：功能3 - ToolPanel 面板类型 state
  type ToolPanelType = 'home' | 'upload' | 'text' | 'art' | null;
  const [toolPanelType, setToolPanelType] = useState<ToolPanelType>('home');
  const [activeTool, setActiveTool] = useState<string | null>(null);

  // [2025-12-20 03:00:00] 5.0 版本：功能叠加 - 视图切换功能
  const handleViewChange = (view: 'front' | 'back' | 'sleeve') => {
    console.log('[DesignLab 5.0] 视图切换:', { from: currentView, to: view }); // [2025-12-20 03:00:00] 添加调试日志
    setCurrentView(view);
  };

  // [2025-12-20 03:10:00] 5.0 版本：功能3 - Rail 按钮点击处理
  const handleToolClick = (tool: 'upload' | 'text' | 'art') => {
    console.log('[DesignLab 5.0] 功能3 - Rail 按钮点击:', { tool, previousTool: activeTool }); // [2025-12-20 03:10:00] 添加调试日志
    
    // 如果点击的是已激活的工具，切换回 home
    if (activeTool === tool) {
      setActiveTool(null);
      setToolPanelType('home');
      console.log('[DesignLab 5.0] 功能3 - 切换回 home 面板');
    } else {
      setActiveTool(tool);
      setToolPanelType(tool);
      console.log('[DesignLab 5.0] 功能3 - 切换到面板:', tool);
    }
  };

  // [2025-12-20 03:10:00] 5.0 版本：功能3 - 返回 home 面板
  const handleBackToHome = () => {
    console.log('[DesignLab 5.0] 功能3 - 返回 home 面板');
    setActiveTool(null);
    setToolPanelType('home');
  };

  // [2025-12-20 02:20:00] 5.0 版本：获取当前视图的图片 URL
  const getCurrentImageUrl = () => {
    const url = productInfo.baseImages[currentView];
    console.log('[DesignLab 5.0] 获取图片 URL:', { currentView, url }); // [2025-12-20 03:00:00] 添加调试日志
    return url;
  };

  // [2025-12-20 03:00:00] 5.0 版本：功能叠加 - 监听视图变化，验证图片切换
  useEffect(() => {
    const imageUrl = getCurrentImageUrl();
    console.log('[DesignLab 5.0] 视图已切换:', { 
      currentView, 
      imageUrl,
      hasImage: !!imageUrl 
    });
  }, [currentView]);

  return (
    <div className="design-lab-new">
      {/* 1. Header - 顶部导航栏 */}
      <header className="dl-header" data-testid="header">
        <div className="dl-header__content">
          <div className="dl-header__left">
            <Link href="/" className="dl-header__logo" aria-label="Souvenir Plus Inc home" style={{ display: 'flex', alignItems: 'center' }}>
              <Image src="/logo.png" alt="Souvenir Plus Inc" width={200} height={34} priority style={{ height: 'auto', width: 'auto', maxWidth: '200px' }} />
            </Link>
            <nav className="dl-header__breadcrumb" aria-label="Breadcrumb">
              <Link href="/designs" className="dl-header__breadcrumb-link">My Designs</Link>
              <span className="dl-header__breadcrumb-separator">/</span>
              <span className="dl-header__breadcrumb-current">Untitled Design</span>
            </nav>
          </div>
          <div className="dl-header__right">
            <div className="dl-header__contact">
              <span className="dl-header__contact-label">Talk to a Real Person:</span>
              <a href="tel:1-800-000-0000" className="dl-header__contact-phone">1-800-000-0000</a>
            </div>
            <a href="#" className="dl-header__chat-link">Chat Now</a>
            <Link href="/signin" className="dl-header__signin-link">Sign In</Link>
          </div>
        </div>
      </header>

      {/* 2-5. Main Content - Rail + Tool Panel + Canvas + Sidebar */}
      {/* [2025-12-20 02:50:00] 5.0 版本：修复布局结构，所有列必须在 .dl-main 容器内 */}
      <div className="dl-main">
        {/* 2. Rail - 左侧深灰色工具栏 */}
        {/* [2025-12-20 02:30:00] 5.0 版本：与 4.0 版本 UI 一致 - Rail 工具栏 */}
        {/* [2025-12-20 02:50:00] 5.0 版本：添加 ref 用于调试 */}
        {/* [2025-12-20 03:10:00] 5.0 版本：功能3 - Rail 按钮点击交互 */}
        <nav ref={railRef} className="dl-rail" aria-label="Design tools" data-testid="rail">
          <button 
            className={`dl-rail__btn ${activeTool === 'upload' ? 'is-active' : ''}`}
            onClick={() => handleToolClick('upload')}
            aria-label="Upload image"
            aria-pressed={activeTool === 'upload'}
            title="Upload"
          >
            <span className="dl-rail__btn-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </span>
            <span className="dl-rail__btn-label">Upload</span>
          </button>

          <button 
            className={`dl-rail__btn ${activeTool === 'text' ? 'is-active' : ''}`}
            onClick={() => handleToolClick('text')}
            aria-label="Add text"
            aria-pressed={activeTool === 'text'}
            title="Add Text"
          >
            <span className="dl-rail__btn-icon dl-rail__icon--text">T</span>
            <span className="dl-rail__btn-label">Add Text</span>
          </button>

          <button 
            className={`dl-rail__btn ${activeTool === 'art' ? 'is-active' : ''}`}
            onClick={() => handleToolClick('art')}
            aria-label="Add art"
            aria-pressed={activeTool === 'art'}
            title="Add Art"
          >
            <span className="dl-rail__btn-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </span>
            <span className="dl-rail__btn-label">Add Art</span>
          </button>
        </nav>

        {/* 3. ToolPanel - 左侧工具面板 */}
        {/* [2025-12-20 03:10:00] 5.0 版本：功能3 - ToolPanel 面板切换 */}
        {toolPanelType && (
          <aside className="dl-tool-panel" aria-label="Tool panel" data-testid="panel">
            <div className="dl-tool-panel__content">
              {/* Home 面板 */}
              {toolPanelType === 'home' && (
                <>
                  <div className="dl-tool-panel__header">
                    <h2 className="dl-tool-panel__title">What&apos;s next for you?</h2>
                  </div>
                  <div className="dl-home-panel">
                    <div className="dl-home-panel__actions">
                      <button 
                        className="dl-home-panel__action" 
                        aria-label="Upload"
                        onClick={() => handleToolClick('upload')}
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
                        aria-label="Add Text"
                        onClick={() => handleToolClick('text')}
                      >
                        <span className="dl-home-panel__text-icon">abc</span>
                        <span>Add Text</span>
                      </button>
                      
                      <button 
                        className="dl-home-panel__action" 
                        aria-label="Add Art"
                        onClick={() => handleToolClick('art')}
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                        <span>Add Art</span>
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
                </>
              )}

              {/* Upload 面板 */}
              {toolPanelType === 'upload' && (
                <>
                  <div className="dl-tool-panel__header">
                    <h2 className="dl-tool-panel__title">Choose File To Upload</h2>
                    <button
                      className="dl-tool-panel__back-btn"
                      onClick={handleBackToHome}
                      aria-label="Back to home"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                      </svg>
                      Back
                    </button>
                  </div>
                  <div className="dl-tool-panel__placeholder">
                    <p>5.0 版本：Upload 功能待实现</p>
                  </div>
                </>
              )}

              {/* Text 面板 */}
              {toolPanelType === 'text' && (
                <>
                  <div className="dl-tool-panel__header">
                    <h2 className="dl-tool-panel__title">Add Text</h2>
                    <button
                      className="dl-tool-panel__back-btn"
                      onClick={handleBackToHome}
                      aria-label="Back to home"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                      </svg>
                      Back
                    </button>
                  </div>
                  <div className="dl-tool-panel__placeholder">
                    <p>5.0 版本：Add Text 功能待实现</p>
                  </div>
                </>
              )}

              {/* Art 面板 */}
              {toolPanelType === 'art' && (
                <>
                  <div className="dl-tool-panel__header">
                    <h2 className="dl-tool-panel__title">Add Art</h2>
                    <button
                      className="dl-tool-panel__back-btn"
                      onClick={handleBackToHome}
                      aria-label="Back to home"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                      </svg>
                      Back
                    </button>
                  </div>
                  <div className="dl-tool-panel__placeholder">
                    <p>5.0 版本：Add Art 功能待实现</p>
                  </div>
                </>
              )}
            </div>
          </aside>
        )}

        {/* 4. Canvas - 中央画布区域 */}
        {/* [2025-12-20 02:50:00] 5.0 版本：添加 ref 用于调试 */}
        <section ref={canvasRef} className="dl-canvas" aria-label="Design canvas" data-testid="canvas">
          <div className="dl-canvas__preview">
          <div className="dl-canvas__product">
            {/* [2025-12-20 02:20:00] 5.0 版本：使用简单的 HTML <img> 标签显示商品图片 */}
            {/* [2025-12-20 03:00:00] 5.0 版本：功能叠加 - 视图切换时图片自动更新 */}
            {(() => {
              const imageUrl = getCurrentImageUrl();
              return imageUrl ? (
                <img
                  key={currentView} // [2025-12-20 03:00:00] 使用 key 强制重新渲染，确保图片切换
                  src={imageUrl}
                  alt={`Product ${currentView} view`}
                  className="dl-canvas__product-image"
                />
              ) : null;
            })()}
          </div>
          </div>
        </section>

        {/* 5. Sidebar - 右侧视图切换面板 */}
        {/* [2025-12-20 02:30:00] 5.0 版本：与 4.0 版本 UI 一致 - Sidebar 完整内容 */}
        {/* [2025-12-20 02:50:00] 5.0 版本：添加 ref 用于调试 */}
        <aside ref={sidebarRef} className="dl-sidebar" aria-label="View options" data-testid="sidebar">
        <button
          className={`dl-sidebar__btn ${currentView === 'front' ? 'is-active' : ''}`}
          onClick={() => handleViewChange('front')}
          aria-label="Front view"
          aria-pressed={currentView === 'front'}
        >
          <div className="dl-sidebar__thumbnail">
            {productInfo.baseImages.front ? (
              <img 
                src={getThumbnailImageUrl(productInfo.color, 'front')} 
                alt="Front view thumbnail"
                className="dl-sidebar__thumbnail-image"
              />
            ) : (
              <div className="dl-sidebar__thumbnail-placeholder">Front</div>
            )}
          </div>
          <span className="dl-sidebar__label">Front</span>
        </button>

        <button
          className={`dl-sidebar__btn ${currentView === 'back' ? 'is-active' : ''}`}
          onClick={() => handleViewChange('back')}
          aria-label="Back view"
          aria-pressed={currentView === 'back'}
        >
          <div className="dl-sidebar__thumbnail">
            {productInfo.baseImages.back ? (
              <img 
                src={getThumbnailImageUrl(productInfo.color, 'back')} 
                alt="Back view thumbnail"
                className="dl-sidebar__thumbnail-image"
              />
            ) : (
              <div className="dl-sidebar__thumbnail-placeholder">Back</div>
            )}
          </div>
          <span className="dl-sidebar__label">Back</span>
        </button>

        <button
          className={`dl-sidebar__btn ${currentView === 'sleeve' ? 'is-active' : ''}`}
          onClick={() => handleViewChange('sleeve')}
          aria-label="Sleeve Design"
          aria-pressed={currentView === 'sleeve'}
        >
          <span className="dl-sidebar__label">Sleeve Design</span>
        </button>

        <button
          className="dl-sidebar__btn"
          aria-label="Zoom"
          aria-pressed={false}
        >
          <span className="dl-sidebar__icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </span>
          <span className="dl-sidebar__label">Zoom</span>
        </button>
        </aside>
      </div>

      {/* 6. BottomBar - 底部操作栏 */}
      {/* [2025-12-20 02:30:00] 5.0 版本：与 4.0 版本 UI 一致 - BottomBar 完整内容 */}
      <footer className="dl-bottom-bar" role="contentinfo" data-testid="bottom-bar">
        <div className="dl-bottom-bar__left">
          <button className="dl-bottom-bar__add-products">
            + Add Products
          </button>
          <div className="dl-bottom-bar__product-info">
            <div className="dl-bottom-bar__product-thumb">
              <div className="dl-bottom-bar__product-thumb-placeholder">T</div>
            </div>
            <div className="dl-bottom-bar__product-details">
              <div className="dl-bottom-bar__product-name">
                Gildan Softstyle Jersey T-shirt
              </div>
              <div className="dl-bottom-bar__product-links">
                <button className="dl-bottom-bar__link" type="button">
                  Change Product
                </button>
                {productInfo.color && (
                  <span className="dl-bottom-bar__color">
                    <input type="checkbox" id="color-selected" checked readOnly />
                    <label htmlFor="color-selected">{productInfo.color}</label>
                  </span>
                )}
                <button className="dl-bottom-bar__link" type="button">
                  Change Color
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="dl-bottom-bar__right">
          <button className="dl-bottom-bar__btn dl-bottom-bar__btn--secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            Save | Share
          </button>
          <button className="dl-bottom-bar__btn dl-bottom-bar__btn--primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
            Get Price
          </button>
        </div>
      </footer>
    </div>
  );
};

export default DesignLabClient5;
