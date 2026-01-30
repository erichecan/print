import React from 'react';

interface CropToolPanelProps {
    onApply: () => void;
    onCancel: () => void;
    onReset: () => void;
}

const CropToolPanel: React.FC<CropToolPanelProps> = ({ onApply, onCancel, onReset }) => {
    return (
        <div className="dl-tool-panel">
            <div className="dl-tool-panel__header">
                <h2 className="dl-tool-panel__title">Crop Image</h2>
                <button className="dl-tool-panel__back-btn" onClick={onCancel}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>

            <div className="dl-tool-panel__content p-4">
                <div className="space-y-4">
                    <p className="text-sm text-gray-600 mb-4">
                        Drag the corners to crop your image.
                    </p>

                    <button
                        onClick={onApply}
                        className="w-full bg-blue-600 text-white py-3 rounded-md font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Apply Crop
                    </button>

                    <button
                        onClick={onReset}
                        className="w-full border border-gray-300 text-gray-700 py-3 rounded-md font-medium hover:bg-gray-50 flex items-center justify-center gap-2"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                            <path d="M3 3v5h5"></path>
                        </svg>
                        Reset Original
                    </button>

                    <button
                        onClick={onCancel}
                        className="w-full text-gray-500 py-2 text-sm hover:text-gray-700 underline"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CropToolPanel;
