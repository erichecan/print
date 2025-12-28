'use client';

import React, { useState, useEffect } from 'react';
import { DESIGN_LAB_COLORS, DesignLabColor } from '@/data/colors';

interface ColorPickerProps {
    selectedColor: string;
    onChange: (color: string) => void;
    onDone?: () => void;
    title?: string;
}

const ColorPicker: React.FC<ColorPickerProps> = ({
    selectedColor,
    onChange,
    onDone,
    title = 'Select color',
}) => {
    const [currentColor, setCurrentColor] = useState<DesignLabColor | null>(null);

    useEffect(() => {
        const found = DESIGN_LAB_COLORS.find(
            (c) => c.hex.toLowerCase() === selectedColor.toLowerCase()
        );
        if (found) {
            setCurrentColor(found);
        } else {
            setCurrentColor({ name: 'Custom Color', hex: selectedColor });
        }
    }, [selectedColor]);

    const handleColorSelect = (color: DesignLabColor) => {
        onChange(color.hex);
        setCurrentColor(color);
    };

    return (
        <div className="dl-color-picker">
            <div className="dl-color-picker__header">
                <span className="dl-color-picker__title">{title}</span>
            </div>

            <div className="dl-color-picker__selected-info">
                <div
                    className="dl-color-picker__selected-swatch"
                    style={{ backgroundColor: currentColor?.hex || selectedColor }}
                />
                <span className="dl-color-picker__selected-name">
                    {currentColor?.name || 'Custom Color'}
                </span>
            </div>

            <div className="dl-color-picker__grid">
                {DESIGN_LAB_COLORS.map((color) => {
                    const isSelected = color.hex.toLowerCase() === selectedColor.toLowerCase();
                    const isBlack = color.hex === '#000000';

                    return (
                        <button
                            key={color.hex}
                            type="button"
                            className={`dl-color-picker__swatch ${isSelected ? 'is-selected' : ''}`}
                            style={{ backgroundColor: color.hex }}
                            onClick={() => handleColorSelect(color)}
                            title={color.name}
                        >
                            {isSelected && isBlack && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                    <path d="M20 6L9 17l-5-5" />
                                </svg>
                            )}
                        </button>
                    );
                })}
            </div>

            {onDone && (
                <button className="dl-color-picker__done-btn" onClick={onDone}>
                    Done
                </button>
            )}
        </div>
    );
};

export default ColorPicker;
