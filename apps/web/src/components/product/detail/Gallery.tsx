/**
 * Gallery Component - Redbubble Style
* 参考图一：左侧竖向缩略图列 + 大图区域，支持放大/灯箱
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import SafeImage from '@/components/SafeImage';
import styles from './Gallery.module.css';

interface GalleryImage {
  id: string;
  url: string;
  alt: string;
  thumbnail?: string;
  color?: string | null;
}

interface GalleryProps {
  images: GalleryImage[];
  selectedColor?: string;
}

export function Gallery({ images, selectedColor }: GalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // 键盘导航支持
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isLightboxOpen) return;

    if (e.key === 'ArrowLeft') {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    } else if (e.key === 'ArrowRight') {
      setSelectedIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'Escape') {
      setIsLightboxOpen(false);
    }
  }, [isLightboxOpen, images.length]);

  // [2026-01-06 15:30:00] 颜色切换逻辑优化：切换颜色时始终重置到该颜色图片列表的第一张（与后台 Step4 预览行为对齐）
  useEffect(() => {
    if (selectedColor && images.length > 0) {
      setSelectedIndex(0);
    }
  }, [selectedColor, images.length]);

  useEffect(() => {
    if (isLightboxOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isLightboxOpen, handleKeyDown]);

  const currentImage = images[selectedIndex] || images[0];

  return (
    <>
      <section className={styles.gallery} aria-label="Product gallery">
        <div className={styles.galleryContainer}>
          {/* 参考图一位置：左侧竖向缩略图列 */}
          <div className={styles.galleryThumbnails}>
            {images.map((img, index) => (
              <button
                key={img.id}
                className={`${styles.galleryThumbnail} ${index === selectedIndex ? styles.isActive : ''}`}
                onClick={() => setSelectedIndex(index)}
                aria-label={`View image ${index + 1}: ${img.alt}`}
                aria-pressed={index === selectedIndex}
              >
                <SafeImage
                  src={img.thumbnail || img.url}
                  alt={img.alt}
                  width={80}
                  height={80}
                  sizes="80px"
                  className={styles.galleryThumbnailImage}
                />
              </button>
            ))}
          </div>

          {/* 参考图一位置：大图区域 */}
          <div className={styles.galleryMain}>
            <div
              className={styles.galleryMainImageWrapper}
              onClick={() => setIsLightboxOpen(true)}
              role="button"
              tabIndex={0}
              aria-label="Click to enlarge image"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsLightboxOpen(true);
                }
              }}
            >
              {currentImage && (
                <SafeImage
                  src={currentImage.url}
                  alt={currentImage.alt}
                  width={800}
                  height={1000}
                  sizes="(max-width: 768px) 100vw, 600px"
                  className={styles.galleryMainImage}
                  priority={selectedIndex === 0}
                />
              )}
              {/* 放大图标提示 */}
              <div className={styles.galleryZoomHint} aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 灯箱模态框 */}
      {isLightboxOpen && (
        <div
          className={styles.galleryLightbox}
          onClick={() => setIsLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox"
        >
          <button
            className={styles.galleryLightboxClose}
            onClick={() => setIsLightboxOpen(false)}
            aria-label="Close lightbox"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <button
            className={styles.galleryLightboxPrev}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
            }}
            aria-label="Previous image"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div className={styles.galleryLightboxContent} onClick={(e) => e.stopPropagation()}>
            {currentImage && (
              <SafeImage
                src={currentImage.url}
                alt={currentImage.alt}
                width={1200}
                height={1500}
                className={styles.galleryLightboxImage}
              />
            )}
          </div>

          <button
            className={styles.galleryLightboxNext}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
            }}
            aria-label="Next image"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}

