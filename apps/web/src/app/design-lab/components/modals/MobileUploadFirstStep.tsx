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
            <button
                className="dl-mobile-upload-first-step__browse-btn"
                onClick={handleBrowseClick}
                type="button"
            >
                Browse Your Computer
            </button>
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

