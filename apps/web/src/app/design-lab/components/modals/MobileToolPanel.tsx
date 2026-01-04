'use client';

import React from 'react';
import './MobileToolPanel.css';

interface MobileToolPanelProps {
    title: string;
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

export const MobileToolPanel: React.FC<MobileToolPanelProps> = ({
    title,
    isOpen,
    onClose,
    children
}) => {
    if (!isOpen) return null;

    return (
        <div className="dl-mobile-tool-panel-overlay">
            <div className="dl-mobile-tool-panel">
                <header className="dl-mobile-tool-panel__header">
                    <button className="dl-mobile-tool-panel__back" onClick={onClose} aria-label="Back">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h2 className="dl-mobile-tool-panel__title">{title}</h2>
                    <div className="dl-mobile-tool-panel__header-right"></div>
                </header>
                <div className="dl-mobile-tool-panel__content">
                    {children}
                </div>
            </div>
        </div>
    );
};
