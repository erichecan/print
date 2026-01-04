import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import './mobile-design-lab.css';


interface MobileDesignLabProps {
    // State
    currentView: string;
    designId: string | null;
    designName: string;
    activeTool: string | null;
    toolPanelType: string | null; // NEW: To detect edit mode
    productInfo: {
        productName?: string;
        color: string;
        baseImages: Record<string, string>;
        [key: string]: any;
    };
    productList: any[];

    // Actions
    handleToolClick: (tool: any) => void;
    handleSaveRequest: () => void;
    handleViewChange: (view: any) => void;
    handleSaveDesign: () => Promise<string | null>;
    setShowGetPriceModal: (show: boolean) => void;

    // New Product Dashboard Actions
    setCatalogMode: (mode: 'add' | 'change') => void;
    setIsCatalogModalOpen: (isOpen: boolean) => void;

    // NEW: Object Actions
    handleObjectAction: (action: string, payload?: any) => void;
    selectedObject: any; // Fabric object or null
    hasObjectOnCanvas: boolean;
}

export const MobileDesignLab: React.FC<MobileDesignLabProps> = ({
    currentView,
    designId,
    designName,
    activeTool,
    toolPanelType,
    productInfo,
    handleToolClick,
    handleSaveRequest,
    handleViewChange,
    handleSaveDesign,
    setShowGetPriceModal,
    setCatalogMode,
    setIsCatalogModalOpen,
    handleObjectAction,
    selectedObject,
    hasObjectOnCanvas
}) => {
    // Mobile Dashboard State
    const [showProductDashboard, setShowProductDashboard] = useState(false);

    // Check if we are in an edit mode
    const isEditMode = ['edit-upload', 'edit-text', 'edit-art'].includes(toolPanelType || '');

    // Helper: Should we show the big floating "Add" buttons?
    // Requirements: 
    // 1. Not in dashboard
    // 2. Not in edit mode
    // 3. Not if a tool is already active (activeTool) - "After clicking"
    // 4. Not if there is already an object on the canvas - "Or if there is already an object"
    const showFloatingControls = !showProductDashboard && !isEditMode && !activeTool && !hasObjectOnCanvas;

    // Toggle dashboard when clicking the "Product" tab
    const handleProductTabClick = () => {
        setShowProductDashboard(true);
        handleToolClick(null);
    };

    const closeDashboard = () => {
        setShowProductDashboard(false);
    };

    // Toolbar Buttons Configuration
    const toolbarActions = [
        // { label: 'Edit Color', icon: '🎨', action: 'color', showFor: ['text', 'art'] }, // Handled separately or needs popup
        { label: 'Rotate', icon: '↷', action: 'rotate' },
        { label: 'Flip', icon: '↔', action: 'flip' },
        { label: 'Duplicate', icon: '❐', action: 'duplicate' },
        // { label: 'Crop', icon: '✂', action: 'crop', showFor: ['image'] }, // Too complex for now?
        { label: 'Center', icon: '⤨', action: 'center' },
        { label: 'Layer Up', icon: '↑', action: 'layer-up' },
        { label: 'Layer Down', icon: '↓', action: 'layer-down' },
        { label: 'Delete', icon: '🗑', action: 'delete' },
    ];

    return (
        <div className="dl-mobile-layout dl-mobile-only">
            {/* MOBILE HEADER */}
            <header className="dl-mobile-header">
                <div className="dl-mobile-header__left">
                    <Link href="/" aria-label="Home">
                        <Image src="/logo.png" alt="Logo" width={120} height={32} className="dl-mobile-logo" />
                    </Link>
                </div>
                <div className="dl-mobile-header__right">
                    <button className="dl-mobile-nav-item">
                        <span className="dl-mobile-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                            </svg>
                        </span>
                        <span>Designs</span>
                    </button>
                    <button className="dl-mobile-nav-item" onClick={handleSaveRequest}>
                        <span className="dl-mobile-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                                <polyline points="17 21 17 13 7 13 7 21" />
                                <polyline points="7 3 7 8 15 8" />
                            </svg>
                        </span>
                        <span>Save</span>
                    </button>
                    <Link href="/account" className="dl-mobile-nav-item">
                        <span className="dl-mobile-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                        </span>
                        <span>Account</span>
                    </Link>

                    <button
                        className="dl-mobile-next-btn"
                        onClick={() => {
                            if (!designId) {
                                handleSaveDesign().then(id => { if (id) setShowGetPriceModal(true); });
                            } else {
                                setShowGetPriceModal(true);
                            }
                        }}
                    >
                        Next $
                    </button>
                </div>
            </header>

            {/* MOBILE VIEW SWITCHER */}
            <button
                className="dl-mobile-view-switcher"
                onClick={() => {
                    const views = ['front', 'back', 'sleeve', 'left-sleeve', 'right-sleeve'];
                    const currentIndex = views.indexOf(currentView);
                    const nextView = views[(currentIndex + 1) % views.length];
                    handleViewChange(nextView);
                }}
                style={{ zIndex: 60 }}
            >
                🔄
            </button>

            {/* MOBILE FLOATING CONTROLS (Only visible if showFloatingControls is true) */}
            {showFloatingControls && (
                <div className="dl-mobile-floating-controls">
                    <button className="dl-float-btn dl-float-btn--primary" onClick={() => handleToolClick('upload')}>
                        <span className="icon">☁️</span> Upload
                    </button>
                    <button className="dl-float-btn" onClick={() => handleToolClick('text')}>
                        <span className="icon">T</span> Add Text
                    </button>
                    <button className="dl-float-btn" onClick={() => handleToolClick('art')}>
                        <span className="icon">🖼️</span> Add Art
                    </button>
                </div>
            )}

            {/* PRODUCT DASHBOARD OVERLAY */}
            {showProductDashboard && (
                <div className="dl-mobile-product-dashboard">
                    <div className="dl-dashboard-header">
                        <h3>Product</h3>
                        <button onClick={closeDashboard} className="dl-close-btn">×</button>
                    </div>

                    <div className="dl-dashboard-content">
                        <div className="dl-dashboard-top-row">
                            <button
                                className="dl-dashboard-add-btn"
                                onClick={() => {
                                    setCatalogMode('add');
                                    setIsCatalogModalOpen(true);
                                }}
                            >
                                <span className="icon">⊕</span>
                                <span>Add Products</span>
                            </button>

                            <div className="dl-dashboard-thumbnail">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={productInfo.baseImages.front || productInfo.baseImages[currentView] || ''}
                                    alt="Product"
                                />
                            </div>
                        </div>

                        <div className="dl-dashboard-product-title">
                            <h4>Current Product</h4>
                            <p>{productInfo.productName || 'Untitled Product'}</p>
                        </div>

                        <div className="dl-dashboard-list">
                            <div className="dl-dashboard-item">
                                <span>Decoration Method</span>
                                <div className="dl-dashboard-value">
                                    <span style={{ color: 'orange' }}>🔥</span> Printed
                                    <span className="info-icon">ⓘ</span>
                                </div>
                            </div>

                            <div
                                className="dl-dashboard-item is-clickable"
                                onClick={() => {
                                    handleToolClick('product-colors');
                                }}
                            >
                                <span>Change Color</span>
                                <div className="dl-dashboard-value">
                                    <span>{productInfo.color}</span>
                                    <span
                                        className="color-swatch-sm"
                                        style={{ backgroundColor: 'red', display: 'inline-block', width: 20, height: 20, borderRadius: 4, marginLeft: 8 }}
                                    ></span>
                                    <span className="arrow">&gt;</span>
                                </div>
                            </div>

                            <div
                                className="dl-dashboard-item is-clickable"
                                onClick={() => {
                                    setCatalogMode('change');
                                    setIsCatalogModalOpen(true);
                                }}
                            >
                                <span>Change Product</span>
                                <span className="arrow">&gt;</span>
                            </div>

                            <div
                                className="dl-dashboard-item is-clickable"
                                onClick={() => {
                                    const targetId = productInfo.slug || productInfo.productId;
                                    if (targetId) window.open(`/products/${targetId}`, '_blank');
                                }}
                            >
                                <span>View Product Details</span>
                                <span className="arrow">&gt;</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT TOOLBAR OVERLAY (Visible only in Edit Mode) */}
            {isEditMode && (
                <div className="dl-mobile-edit-toolbar-container">
                    {/* We could put a small header or X to close edit mode? */}
                    <div className="dl-mobile-edit-header">
                        <span>Editing...</span>
                        <button onClick={() => handleToolClick(null)}>Done</button>
                    </div>

                    <div className="dl-mobile-edit-toolbar">
                        {toolbarActions.map((item) => (
                            <button
                                key={item.action}
                                className="dl-edit-tool-btn"
                                onClick={() => handleObjectAction(item.action)}
                            >
                                <span className="icon">{item.icon}</span>
                                <span className="label">{item.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* MOBILE BOTTOM NAV (Hidden in Edit Mode) */}
            {!isEditMode && (
                <footer className="dl-mobile-bottom-nav">
                    <button className={`dl-mobile-nav-btn ${activeTool === 'upload' ? 'active' : ''}`} onClick={() => handleToolClick('upload')}>
                        <span className="icon">☁️</span>
                        <span className="label">Upload</span>
                    </button>
                    <button className={`dl-mobile-nav-btn ${activeTool === 'text' ? 'active' : ''}`} onClick={() => handleToolClick('text')}>
                        <span className="icon">T</span>
                        <span className="label">Add Text</span>
                    </button>
                    <button className={`dl-mobile-nav-btn ${activeTool === 'art' ? 'active' : ''}`} onClick={() => handleToolClick('art')}>
                        <span className="icon">🖼️</span>
                        <span className="label">Add Art</span>
                    </button>
                    <button
                        className={`dl-mobile-nav-btn ${showProductDashboard ? 'active' : ''}`}
                        onClick={handleProductTabClick}
                    >
                        <span className="icon">👕</span>
                        <span className="label">Product</span>
                    </button>
                </footer>
            )}
        </div>
    );
};
