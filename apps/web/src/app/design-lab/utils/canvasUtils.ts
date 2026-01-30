import { PixelCrop } from 'react-image-crop';

/**
 * Crops an image based on the provided pixel crop area.
 * @param image - The source HTML component image element
 * @param crop - The pixel crop coordinates (x, y, width, height)
 * @returns A Promise resolving to the cropped image Blob
 */
export function getCroppedImg(image: HTMLImageElement, crop: PixelCrop): Promise<Blob | null> {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = crop.width * scaleX;
    canvas.height = crop.height * scaleY;

    const ctx = canvas.getContext('2d');
    if (!ctx) return Promise.resolve(null);

    // Draw the cropped portion
    ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        crop.width * scaleX,
        crop.height * scaleY
    );

    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            resolve(blob);
        }, 'image/png', 1); // High quality PNG
    });
}
