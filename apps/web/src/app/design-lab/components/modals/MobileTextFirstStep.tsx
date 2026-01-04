'use client';

import React, { useState } from 'react';

interface MobileTextFirstStepProps {
    onAddText: (text: string) => void;
}

export const MobileTextFirstStep: React.FC<MobileTextFirstStepProps> = ({ onAddText }) => {
    const [text, setText] = useState('');
    const isTextEmpty = !text.trim();

    const handleAddToDesign = () => {
        const trimmedText = text.trim() || 'Your Text';
        onAddText(trimmedText);
    };

    return (
        <div className="dl-mobile-text-first-step">
            <textarea
                className="dl-mobile-text-first-step__input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter text here"
                rows={3}
                autoFocus
            />
            <button
                className="dl-mobile-text-first-step__add-btn"
                onClick={handleAddToDesign}
                type="button"
                disabled={isTextEmpty}
            >
                Add To Design
            </button>
        </div>
    );
};

