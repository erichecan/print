/**
 * SafeImage Component
 * [2025-01-27 19:10:00] 容错图片组件，next/image 失败时回退到 <img>
 * 确保图片加载失败不会导致页面 SSR 500 错误
 */
'use client';

import Image from 'next/image';
import React, { useState } from 'react';

interface SafeImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
  fill?: boolean;
  sizes?: string;
  style?: React.CSSProperties;
  onError?: () => void;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
}

/**
 * SafeImage 组件
 * [2025-01-27 19:10:00] 优先使用 next/image，失败时回退到原生 <img>
 */
export default function SafeImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  fill = false,
  sizes,
  style,
  onError: externalOnError,
  placeholder,
  blurDataURL,
}: SafeImageProps) {
  const [fallback, setFallback] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleError = () => {
    // [2025-01-27 19:10:00] 记录错误日志，包含 requestId（如果可用）
    const requestId = typeof window !== 'undefined' 
      ? (document.querySelector('meta[name="x-request-id"]')?.getAttribute('content') || 'unknown')
      : 'unknown';
    
    console.warn('[SafeImage] next/image error, fallback to <img>', { 
      src, 
      requestId,
      timestamp: new Date().toISOString()
    });
    
    setFallback(true);
    setImageError(true);
    
    // [2025-01-27 19:10:00] 调用外部错误处理函数（如果有）
    if (externalOnError) {
      externalOnError();
    }
  };

  // [2025-01-27 19:10:00] 如果已经回退到 <img>，使用原生 img 标签
  if (fallback || imageError) {
    if (fill) {
      return (
        <img
          src={src}
          alt={alt}
          className={className}
          style={style}
          loading={priority ? 'eager' : 'lazy'}
          onError={() => {
            // [2025-01-27 19:10:00] 如果原生 img 也失败，显示占位图
            console.error('[SafeImage] Native <img> also failed', { src });
            if (typeof window !== 'undefined') {
              const img = document.querySelector(`img[src="${src}"]`) as HTMLImageElement;
              if (img) {
                img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23f3f4f6" width="400" height="400"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="16" fill="%239ca3af"%3EImage not available%3C/text%3E%3C/svg%3E';
              }
            }
          }}
        />
      );
    }
    
    return (
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        style={style}
        loading={priority ? 'eager' : 'lazy'}
        onError={() => {
          // [2025-01-27 19:10:00] 如果原生 img 也失败，显示占位图
          console.error('[SafeImage] Native <img> also failed', { src });
          if (typeof window !== 'undefined') {
            const img = document.querySelector(`img[src="${src}"]`) as HTMLImageElement;
            if (img) {
              img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23f3f4f6" width="400" height="400"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="16" fill="%239ca3af"%3EImage not available%3C/text%3E%3C/svg%3E';
            }
          }
        }}
      />
    );
  }

  // [2025-01-27 19:10:00] 优先使用 next/image
  try {
    if (fill) {
      return (
        <Image
          src={src}
          alt={alt}
          fill={true}
          className={className}
          style={style}
          priority={priority}
          sizes={sizes}
          placeholder={placeholder}
          blurDataURL={blurDataURL}
          onError={handleError}
        />
      );
    }
    
    return (
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        style={style}
        priority={priority}
        sizes={sizes}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        onError={handleError}
      />
    );
  } catch (error) {
    // [2025-01-27 19:10:00] 如果 Image 组件本身抛错，立即回退
    console.error('[SafeImage] Image component error', { src, error });
    return (
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        style={style}
        loading={priority ? 'eager' : 'lazy'}
      />
    );
  }
}
