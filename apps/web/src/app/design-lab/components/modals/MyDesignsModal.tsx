'use client';

/**
 * My Designs Modal - 显示用户保存的设计列表
 * [2025-12-06 12:30:00] 实现 My Designs 功能，允许用户查看和加载已保存的设计
 */
import React, { useState, useEffect } from 'react';
import { designsApi, type UserDesign } from '@/lib/api';
import './MyDesignsModal.css';

interface MyDesignsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadDesign: (designId: string) => void;
}

const MyDesignsModal: React.FC<MyDesignsModalProps> = ({
  isOpen,
  onClose,
  onLoadDesign,
}) => {
  const [designs, setDesigns] = useState<UserDesign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // [2025-12-06 12:30:00] 加载设计列表
  useEffect(() => {
    if (isOpen) {
      loadDesigns();
    }
  }, [isOpen]);

  const loadDesigns = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await designsApi.list();
      if (response && response.designs) {
        setDesigns(response.designs);
      } else {
        setDesigns([]);
      }
    } catch (err: any) {
      console.error('[MyDesignsModal] Error loading designs:', err);
      setError(err.message || 'Failed to load designs');
      setDesigns([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDesign = (designId: string) => {
    onLoadDesign(designId);
    onClose();
  };

  const handleDeleteDesign = async (designId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this design?')) {
      return;
    }

    try {
      await designsApi.delete(designId);
      // 重新加载列表
      loadDesigns();
    } catch (err: any) {
      console.error('[MyDesignsModal] Error deleting design:', err);
      alert('Failed to delete design: ' + (err.message || 'Unknown error'));
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="dl-modal-overlay" onClick={onClose}>
      <div className="dl-modal dl-modal--large" onClick={(e) => e.stopPropagation()}>
        <div className="dl-modal__header">
          <h3 className="dl-modal__title">My Designs</h3>
          <button
            className="dl-modal__close"
            onClick={onClose}
            aria-label="Close"
            type="button"
          >
            ×
          </button>
        </div>

        <div className="dl-modal__body">
          {loading && (
            <div className="dl-my-designs__loading">
              <p>Loading designs...</p>
            </div>
          )}

          {error && (
            <div className="dl-my-designs__error">
              <p>{error}</p>
              <button onClick={loadDesigns} className="dl-my-designs__retry-btn">
                Retry
              </button>
            </div>
          )}

          {!loading && !error && designs.length === 0 && (
            <div className="dl-my-designs__empty">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="9" y1="9" x2="15" y2="15" />
                <line x1="15" y1="9" x2="9" y2="15" />
              </svg>
              <p>No saved designs yet</p>
              <p className="dl-my-designs__empty-hint">Create a design and save it to see it here</p>
            </div>
          )}

          {!loading && !error && designs.length > 0 && (
            <div className="dl-my-designs__grid">
              {designs.map((design) => (
                <div
                  key={design.id}
                  className="dl-my-designs__item"
                  onClick={() => handleLoadDesign(design.id)}
                >
                  <div className="dl-my-designs__item-thumb">
                    {design.thumbnailUrl ? (
                      <img
                        src={design.thumbnailUrl}
                        alt={design.name}
                        className="dl-my-designs__item-image"
                      />
                    ) : (
                      <div className="dl-my-designs__item-placeholder">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="dl-my-designs__item-info">
                    <h4 className="dl-my-designs__item-name">{design.name}</h4>
                    {design.productName && (
                      <p className="dl-my-designs__item-product">{design.productName}</p>
                    )}
                  </div>
                  <button
                    className="dl-my-designs__item-delete"
                    onClick={(e) => handleDeleteDesign(design.id, e)}
                    aria-label="Delete design"
                    type="button"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyDesignsModal;

