'use client';

import React from 'react';
import './MobileArtFullPage.css';

interface MobileArtFullPageProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

export const MobileArtFullPage: React.FC<MobileArtFullPageProps> = ({
    isOpen,
    onClose,
    children
}) => {
    if (!isOpen) return null;

    return (
        <div className="dl-mobile-art-full-page">
            <header className="dl-mobile-art-full-page__header">
                <div className="dl-mobile-art-full-page__header-spacer" />
                <button 
                    className="dl-mobile-art-full-page__back" 
                    onClick={onClose} 
                    aria-label="Back"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                </button>
            </header>
            <div className="dl-mobile-art-full-page__content">
                {children}
            </div>
        </div>
    );
};

