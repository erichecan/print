/**
 * Save & Share Modal
 * [2025-12-08] 保存和分享设计模态框
 */
'use client';

import React, { useState, useEffect } from 'react';
import { designLabApi } from '@/lib/api';
import { SocialShareMenu } from '@/components/social-share/SocialShareMenu';
import './SaveShareModal.css';

// [2025-12-08] 修复：确保在客户端环境中使用window
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
};

interface SaveShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  designId: string | null;
  designName: string;
  onSave?: () => Promise<void>;
  onShare?: (shareUrl: string) => void;
}

const SaveShareModal: React.FC<SaveShareModalProps> = ({
  isOpen,
  onClose,
  designId,
  designName,
  onSave,
  onShare,
}) => {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (onSave) {
        await onSave();
      }
      setTimeout(() => {
        setSaving(false);
        onClose();
        alert('Design saved successfully to My Designs!');
      }, 500);
    } catch (error) {
      console.error('[SaveShareModal] Failed to save design:', error);
      alert('Failed to save design. Please try again.');
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="dl-modal-overlay" onClick={onClose}>
      <div className="dl-modal dl-save-share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dl-modal__header">
          <h2 className="dl-modal__title">Save Design</h2>
          <button className="dl-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="dl-modal__body">
          <div className="dl-save-share-modal__content">
            <p className="dl-save-share-modal__description">
              {/* [2025-12-19 16:02:20] 修复 ESLint react/no-unescaped-entities：转义双引号（显示效果不变） */}
              Save your design to access it later from &quot;My Designs&quot;.
            </p>
            <div className="dl-save-share-modal__form">
              <label className="dl-save-share-modal__label">
                Design Name:
                <input
                  type="text"
                  className="dl-save-share-modal__input"
                  value={designName}
                  readOnly
                />
              </label>
              {!designId && (
                <p className="dl-save-share-modal__hint" style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px' }}>
                  {/* [2025-12-19 16:02:20] 修复 ESLint react/no-unescaped-entities：转义双引号（显示效果不变） */}
                  Your design will be saved when you click &quot;Save Design&quot;.
                </p>
              )}
            </div>
            <div className="dl-save-share-modal__actions">
              <button
                className="dl-modal__btn dl-modal__btn--primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : designId ? 'Update Design' : 'Save Design'}
              </button>
              <button
                className="dl-modal__btn dl-modal__btn--secondary"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaveShareModal;

