import React, { useState, useRef, useEffect } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { getCroppedImg } from '../utils/canvasUtils';

// Helper to center the crop initially
function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
    return centerCrop(
        makeAspectCrop(
            { unit: '%', width: 90 },
            aspect,
            mediaWidth,
            mediaHeight,
        ),
        mediaWidth,
        mediaHeight,
    )
}

interface ImageCropperProps {
    imageSrc: string;
    onApply: (croppedImageBlob: Blob) => void;
    onCancel: () => void;
}

export function ImageCropper({ imageSrc, onApply, onCancel }: ImageCropperProps) {
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const imgRef = useRef<HTMLImageElement>(null);

    // Load image handler to set initial crop center
    function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
        const { width, height } = e.currentTarget;
        const aspect = width / height; // Get aspect from the loaded image
        // Initial crop: center 90%
        setCrop(centerAspectCrop(width, height, aspect));
    }

    // The "Apply" logic
    async function handleApply() {
        if (completedCrop && imgRef.current) {
            const croppedBlob = await getCroppedImg(imgRef.current, completedCrop);
            if (croppedBlob) onApply(croppedBlob);
        }
    }

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80">
            <div className="bg-white p-4 rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between mb-4 border-b pb-2">
                    <h3 className="font-bold text-lg text-gray-800">Crop Image</h3>
                    <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">✕</button>
                </div>

                <div className="overflow-auto flex-1 flex justify-center bg-gray-100 p-4 min-h-[300px] items-center">
                    <ReactCrop
                        crop={crop}
                        onChange={(_, percentCrop) => setCrop(percentCrop)}
                        onComplete={(c) => setCompletedCrop(c)}
                        aspect={undefined} // Free aspect ratio
                        className="max-w-full"
                    >
                        <img
                            ref={imgRef}
                            src={imageSrc}
                            onLoad={onImageLoad}
                            alt="Crop me"
                            style={{ maxHeight: '60vh', objectFit: 'contain' }}
                        />
                    </ReactCrop>
                </div>

                <div className="flex justify-end gap-3 mt-4 pt-2 border-t">
                    <button onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50">Cancel</button>
                    <button onClick={handleApply} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium">Apply Crop</button>
                </div>
            </div>
        </div>
    );
}
