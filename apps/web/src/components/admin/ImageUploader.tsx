/**
 * Image Uploader Component
* Reusable image upload component for CMS content management
 */
'use client';

import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { adminContentApi } from '@/lib/api';

interface ImageUploaderProps {
  currentUrl?: string;
  onUploadComplete: (url: string) => void;
  onRemove?: () => void;
  accept?: string;
  maxSize?: number; // in MB
  label?: string;
}

export function ImageUploader({
  currentUrl,
  onUploadComplete,
  onRemove,
  accept = 'image/*',
  maxSize = 10,
  label,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
// 验证文件大小
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File size must be less than ${maxSize}MB`);
      return;
    }

// 验证文件类型
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const response = await adminContentApi.uploadImage(file);
      onUploadComplete(response.data.url);
    } catch (err) {
      setError((err as Error).message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDrag = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.type === 'dragenter' || event.type === 'dragover') {
      setDragActive(true);
    } else if (event.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);

    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="image-uploader">
      {label && <label className="image-uploader__label">{label}</label>}
      
      <div
        className={`image-uploader__dropzone ${dragActive ? 'drag-active' : ''} ${uploading ? 'uploading' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileInput}
          style={{ display: 'none' }}
          disabled={uploading}
        />

        {currentUrl ? (
          <div className="image-uploader__preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={currentUrl} alt="Preview" />
            {uploading && (
              <div className="image-uploader__overlay">
                <div className="image-uploader__spinner">Uploading...</div>
              </div>
            )}
            {onRemove && !uploading && (
              <button
                type="button"
                className="image-uploader__remove"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                aria-label="Remove image"
              >
                ×
              </button>
            )}
          </div>
        ) : (
          <div className="image-uploader__placeholder">
            {uploading ? (
              <div className="image-uploader__spinner">Uploading...</div>
            ) : (
              <>
                <div className="image-uploader__icon">📷</div>
                <div className="image-uploader__text">
                  <strong>Click to upload</strong> or drag and drop
                </div>
                <div className="image-uploader__hint">
                  PNG, JPG, GIF up to {maxSize}MB
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="image-uploader__error" role="alert">
          {error}
        </div>
      )}

      {currentUrl && (
        <input
          type="text"
          className="image-uploader__url"
          value={currentUrl}
          readOnly
          placeholder="Image URL"
        />
      )}
    </div>
  );
}

