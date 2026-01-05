'use client';

import React from 'react';
import './MobileEditPanel.css';

interface MobileEditPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onBack?: () => void;
    title?: string;
    children: React.ReactNode;
}

export const MobileEditPanel: React.FC<MobileEditPanelProps> = ({
    isOpen,
    onClose,
    onBack,
    title,
    children
}) => {
    if (!isOpen) return null;

    return (
        <>
            {/* 遮罩层 */}
            <div className="dl-mobile-edit-panel-overlay" onClick={onClose} />

            {/* 面板 */}
            <div className="dl-mobile-edit-panel">
                <header className="dl-mobile-edit-panel__header">
                    {onBack && (
                        <button
                            className="dl-mobile-edit-panel__back"
                            onClick={onBack}
                            aria-label="Back"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 12H5M12 19l-7-7 7-7" />
                            </svg>
                        </button>
                    )}

                    {title ? (
                        <h2 className="dl-mobile-edit-panel__title">{title}</h2>
                    ) : (
                        <div className="dl-mobile-edit-panel__header-spacer" />
                    )}

                    <button
                        className="dl-mobile-edit-panel__close"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </header>
                <div className="dl-mobile-edit-panel__content">
                    {children}
                </div>
            </div>
        </>
    );
};

