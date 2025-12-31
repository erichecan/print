/**
 * Error Message Component
* 统一的错误提示组件，支持不同类型的错误显示
 */
import React from 'react';
import { ApiError } from '@/hooks/useApiError';

interface ErrorMessageProps {
  error: ApiError | string | null;
  onDismiss?: () => void;
  onRetry?: () => void;
  className?: string;
}

export function ErrorMessage({ error, onDismiss, onRetry, className = '' }: ErrorMessageProps) {
  if (!error) return null;

  const errorMessage = typeof error === 'string' ? error : error.message;
  const isRetryable = typeof error === 'object' && error !== null && 'retryable' in error && error.retryable;

  return (
    <div className={`error-message ${className}`}>
      <div className="error-message__content">
        <div className="error-message__icon">⚠️</div>
        <div className="error-message__text">
          <p className="error-message__title">Error</p>
          <p className="error-message__message">{errorMessage}</p>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="error-message__dismiss"
            aria-label="Dismiss error"
          >
            ×
          </button>
        )}
      </div>
      {(isRetryable || onRetry) && (
        <div className="error-message__actions">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="error-message__retry"
            >
              Try again
            </button>
          )}
        </div>
      )}
      <style jsx>{`
        .error-message {
          border-left: 4px solid #ef4444;
          background: rgba(239, 68, 68, 0.08);
          padding: 16px 20px;
          border-radius: 12px;
          color: #991b1b;
        }
        .error-message__content {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }
        .error-message__icon {
          font-size: 1.25rem;
          flex-shrink: 0;
        }
        .error-message__text {
          flex: 1;
        }
        .error-message__title {
          margin: 0 0 4px 0;
          font-weight: 600;
          font-size: 0.875rem;
        }
        .error-message__message {
          margin: 0;
          font-size: 0.875rem;
          line-height: 1.5;
        }
        .error-message__dismiss {
          background: none;
          border: none;
          color: #991b1b;
          font-size: 1.5rem;
          line-height: 1;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: background 0.2s ease;
        }
        .error-message__dismiss:hover {
          background: rgba(153, 27, 27, 0.1);
        }
        .error-message__actions {
          margin-top: 12px;
          display: flex;
          gap: 8px;
        }
        .error-message__retry {
          padding: 0.5rem 1rem;
          background: #ffffff;
          border: 1px solid #ef4444;
          border-radius: 6px;
          color: #991b1b;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .error-message__retry:hover {
          background: #fef2f2;
          border-color: #dc2626;
        }
      `}</style>
    </div>
  );
}

