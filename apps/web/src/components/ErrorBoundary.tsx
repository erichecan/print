/**
 * Error Boundary Component
 * [2025-01-27 10:50:00] React 错误边界组件，捕获组件树中的错误
 */
'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // [2025-01-27 10:50:00] 记录错误到控制台和错误追踪服务
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    
    // 可以在这里集成 Sentry 或其他错误追踪服务
    // Sentry.captureException(error, { contexts: { react: errorInfo } });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary">
          <div className="error-boundary__content">
            <h2>Something went wrong</h2>
            <p>We encountered an unexpected error. Please try refreshing the page.</p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-boundary__details">
                <summary>Error details (development only)</summary>
                <pre>{this.state.error.toString()}</pre>
              </details>
            )}
            <div className="error-boundary__actions">
              <button onClick={this.handleReset} className="btn-primary">
                Try again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="btn-outline"
              >
                Refresh page
              </button>
            </div>
          </div>
          <style jsx>{`
            .error-boundary {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 400px;
              padding: 2rem;
            }
            .error-boundary__content {
              max-width: 600px;
              text-align: center;
              padding: 2rem;
              background: #ffffff;
              border-radius: 12px;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }
            h2 {
              font-size: 1.5rem;
              margin-bottom: 1rem;
              color: #1f2937;
            }
            p {
              color: #64748b;
              margin-bottom: 1.5rem;
            }
            .error-boundary__details {
              margin: 1.5rem 0;
              text-align: left;
              background: #f8fafc;
              padding: 1rem;
              border-radius: 8px;
              border: 1px solid #e2e8f0;
            }
            .error-boundary__details summary {
              cursor: pointer;
              font-weight: 600;
              color: #475569;
              margin-bottom: 0.5rem;
            }
            .error-boundary__details pre {
              margin: 0;
              font-size: 0.875rem;
              color: #991b1b;
              overflow-x: auto;
            }
            .error-boundary__actions {
              display: flex;
              gap: 0.75rem;
              justify-content: center;
              flex-wrap: wrap;
            }
            .btn-primary {
              padding: 0.75rem 1.5rem;
              background: #ff1f3d;
              color: #ffffff;
              border: none;
              border-radius: 8px;
              font-weight: 600;
              cursor: pointer;
              transition: background 0.2s ease;
            }
            .btn-primary:hover {
              background: #e3002b;
            }
            .btn-outline {
              padding: 0.75rem 1.5rem;
              background: transparent;
              color: #475569;
              border: 1px solid #d4d7de;
              border-radius: 8px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s ease;
            }
            .btn-outline:hover {
              background: #f8fafc;
              border-color: #94a3b8;
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

