'use client';

import React, { useRef } from 'react';

interface MobileUploadFirstStepProps {
    onFileSelect: (file: File) => void;
}

export const MobileUploadFirstStep: React.FC<MobileUploadFirstStepProps> = ({ onFileSelect }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleBrowseClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onFileSelect(file);
        }
    };

    return (
        <div className="dl-mobile-upload-first-step">
            <div className="dl-mobile-upload-first-step__main">
                <button
                    className="dl-mobile-upload-first-step__browse-btn"
                    onClick={handleBrowseClick}
                    type="button"
                >
                    Browse Your Computer
                </button>
            </div>

            <div className="dl-mobile-upload-first-step__info">
                <div className="dl-mobile-upload-first-step__info-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                </div>
                <div className="dl-mobile-upload-first-step__info-text">
                    <p>Vector or high resolution artwork of 300 DPI or more will look the best.</p>
                    <p>Supported formats: JPG, PNG, GIF, WebP, AVIF, SVG. Max size of <strong>20 MB</strong>.</p>
                </div>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/avif,image/svg+xml"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                aria-label="Choose file to upload"
            />
        </div>
    );
};

