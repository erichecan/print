/**
 * Toast Component
 * [2025-01-27 16:35:00] 用于显示临时消息通知，替代 alert
 */
'use client';

import { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose?: () => void;
}

export function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onClose?.(), 300); // Wait for fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!visible) return null;

  return (
    <div className={`toast toast--${type}`} role="alert">
      <span className="toast__message">{message}</span>
      <button 
        className="toast__close" 
        onClick={() => {
          setVisible(false);
          setTimeout(() => onClose?.(), 300);
        }}
        aria-label="Close"
      >
        ×
      </button>
    </div>
  );
}

interface ToastContainerProps {
  children: React.ReactNode;
}

export function ToastContainer({ children }: ToastContainerProps) {
  return <div className="toast-container">{children}</div>;
}

