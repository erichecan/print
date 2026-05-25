/**
 * Loading Spinner Component
* 统一的加载状态组件，支持不同尺寸和样式
 */
import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  fullScreen?: boolean;
  message?: string;
  className?: string;
}

export function LoadingSpinner({
  size = 'medium',
  fullScreen = false,
  message,
  className = '',
}: LoadingSpinnerProps) {
  const sizeMap = {
    small: '16px',
    medium: '24px',
    large: '32px',
  };

  const spinnerSize = sizeMap[size];

  const content = (
    <div className={`loading-spinner ${className}`}>
      <div className="spinner" />
      {message && <p className="message">{message}</p>}
      <style jsx>{`
        .loading-spinner {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          padding: ${fullScreen ? '0' : '2rem'};
        }
        .spinner {
          width: ${spinnerSize};
          height: ${spinnerSize};
          border: 3px solid rgba(0, 0, 0, 0.1);
          border-top-color: #B40C1C;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        .message {
          margin: 0;
          color: #64748b;
          font-size: 0.875rem;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="loading-spinner-fullscreen">
        {content}
        <style jsx>{`
          .loading-spinner-fullscreen {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.9);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        `}</style>
      </div>
    );
  }

  return content;
}

/**
 * Skeleton Loader Component
* 骨架屏组件，用于内容加载时的占位
 */
interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
  lines?: number;
}

export function Skeleton({ width = '100%', height = '1rem', className = '', lines = 1 }: SkeletonProps) {
  if (lines > 1) {
    return (
      <div className={`skeleton-container ${className}`}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className="skeleton"
            style={{
              width: index === lines - 1 ? '80%' : width,
              height,
              marginBottom: index < lines - 1 ? '0.5rem' : '0',
            }}
          />
        ))}
        <style jsx>{`
          .skeleton-container {
            display: flex;
            flex-direction: column;
          }
          .skeleton {
            background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 37%, #f3f4f6 63%);
            background-size: 400% 100%;
            animation: shimmer 1.6s infinite;
            border-radius: 0;
          }
          @keyframes shimmer {
            0% {
              background-position: 100% 0;
            }
            100% {
              background-position: -100% 0;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height }}
    >
      <style jsx>{`
        .skeleton {
          background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 37%, #f3f4f6 63%);
          background-size: 400% 100%;
          animation: shimmer 1.6s infinite;
          border-radius: 0;
        }
        @keyframes shimmer {
          0% {
            background-position: 100% 0;
          }
          100% {
            background-position: -100% 0;
          }
        }
      `}</style>
    </div>
  );
}

