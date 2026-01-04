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

    // Rotate Modal State
    const [showRotateModal, setShowRotateModal] = useState(false);
    const [rotateAngle, setRotateAngle] = useState(0);

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


    // Handle Rotate Modal
    const handleRotateClick = () => {
        if (selectedObject) {
            setRotateAngle(selectedObject.angle || 0);
            setShowRotateModal(true);
        }
    };

    const applyRotation = () => {
        if (selectedObject) {
            handleObjectAction('rotate', { angle: rotateAngle });
        }
        setShowRotateModal(false);
    };

    // Toolbar Buttons Configuration with SVG Icons
    const toolbarActions = [
        {
            label: 'Rotate',
            action: 'rotate-modal',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.45-.83-.7-1.79-.7-2.8 0-3.31 2.69-6 6-6zm6.76 1.74L17.3 9.2c.44.84.7 1.79.7 2.8 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26z" />
                </svg>
            )
        },
        {
            label: 'Flip',
            action: 'flip',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15 21h2v-2h-2v2zm4-12h2V7h-2v2zM3 5v14c0 1.1.9 2 2 2h4v-2H5V5h4V3H5c-1.1 0-2 .9-2 2zm16-2v2h2c0-1.1-.9-2-2-2zm-8 20h2V1h-2v22zm8-6h2v-2h-2v2zM15 5h2V3h-2v2zm4 8h2v-2h-2v2zm0 8c1.1 0 2-.9 2-2h-2v2z" />
                </svg>
            )
        },
        {
            label: 'Duplicate',
            action: 'duplicate',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                </svg>
            )
        },
        {
            label: 'Center',
            action: 'center',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path fillRule="evenodd" clipRule="evenodd" d="M15 15V9H3.99562C3.44576 9 3 8.55614 3 8C3 7.44772 3.44995 7 3.99562 7H7V4.00427C7 3.44962 7.44386 3 8 3C8.55228 3 9 3.45098 9 4.00427V7H16.0044C16.2786 7 16.5268 7.11036 16.7069 7.28996C16.8887 7.47472 17 7.72297 17 7.9954V15H20.0044C20.5542 15 21 15.4439 21 16C21 16.5523 20.5501 17 20.0044 17H7.99562C7.44832 16.9976 7.00482 16.5548 7.00004 16.006C7.00001 16.004 7 10.5034 7 10.5034C7 10.2254 7.22168 10 7.50468 10H8.49532C8.77404 10 9 10.225 9 10.5034V15H15ZM15 18.4954C15 18.2218 15.2217 18 15.5047 18H16.4953C16.774 18 17 18.2255 17 18.4954V20.001C17 20.5528 16.5561 21 16 21C15.4477 21 15 20.5509 15 20.001V18.4954Z" />
                </svg>
            )
        },
        {
            label: 'Layer Up',
            action: 'layer-up',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
            )
        },
        {
            label: 'Layer Down',
            action: 'layer-down',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" transform="rotate(180 12 12)" />
                </svg>
            )
        },
        {
            label: 'Delete',
            action: 'delete',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                </svg>
            )
        },
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
                                onClick={() => item.action === 'rotate-modal' ? handleRotateClick() : handleObjectAction(item.action)}
                            >
                                <span className="icon">{item.icon}</span>
                                <span className="label">{item.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ROTATE MODAL */}
            {showRotateModal && (
                <div className="dl-mobile-rotate-modal">
                    <div className="dl-rotate-header">
                        <button onClick={() => setShowRotateModal(false)} className="dl-back-btn">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                            </svg>
                        </button>
                        <h3>Rotate</h3>
                        <button onClick={applyRotation} className="dl-done-btn">Done</button>
                    </div>

                    <div className="dl-rotate-content">
                        <div className="dl-rotate-controls">
                            <button onClick={() => setRotateAngle(a => a - 45)} className="dl-rotate-btn">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8h2c0-3.31 2.69-6 6-6z" />
                                </svg>
                            </button>

                            <button onClick={() => setRotateAngle(a => a - 1)} className="dl-adjust-btn">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 13H5v-2h14v2z" />
                                </svg>
                            </button>

                            <input
                                type="number"
                                value={Math.round(rotateAngle)}
                                onChange={(e) => setRotateAngle(Number(e.target.value))}
                                className="dl-rotate-input"
                            />

                            <button onClick={() => setRotateAngle(a => a + 1)} className="dl-adjust-btn">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                                </svg>
                            </button>

                            <button onClick={() => setRotateAngle(0)} className="dl-reset-btn">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
                                </svg>
                            </button>
                        </div>

                        <input
                            type="range"
                            min="-180"
                            max="180"
                            value={rotateAngle}
                            onChange={(e) => setRotateAngle(Number(e.target.value))}
                            className="dl-rotate-slider"
                        />
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
