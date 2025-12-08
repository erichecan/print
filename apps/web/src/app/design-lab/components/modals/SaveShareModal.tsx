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
  const [activeTab, setActiveTab] = useState<'save' | 'share'>('save');
  const [saving, setSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [shareToken, setShareToken] = useState<string>('');

  // [2025-12-08] 加载分享链接
  useEffect(() => {
    if (isOpen && designId && activeTab === 'share') {
      loadShareUrl();
    }
    // 切换tab时重置shareUrl（如果需要）
    if (activeTab === 'save') {
      // 可以保留shareUrl，不需要重置
    }
  }, [isOpen, designId, activeTab]);

  // [2025-12-08] 当designId从外部更新时，如果正在share tab，重新加载分享链接
  useEffect(() => {
    if (isOpen && designId && activeTab === 'share' && !shareUrl) {
      loadShareUrl();
    }
  }, [designId]);

  const loadShareUrl = async () => {
    if (!designId) {
      // 如果没有designId，提示用户先保存
      return;
    }

    try {
      // 如果设计已有分享token，直接使用
      // 否则需要先保存设计并生成分享链接
      const response = await designLabApi.getDesign(designId);
      if (response.success && response.data) {
        if (response.data.shareToken) {
          const url = `${getBaseUrl()}/design-lab/share/${response.data.shareToken}`;
          setShareUrl(url);
          setShareToken(response.data.shareToken);
        } else {
          // 生成分享链接
          await generateShareLink();
        }
      }
    } catch (error) {
      console.error('[SaveShareModal] Failed to load share URL:', error);
      // 如果获取失败，尝试生成新链接
      if (designId) {
        await generateShareLink();
      }
    }
  };

  const generateShareLink = async () => {
    if (!designId) return;

    try {
      const response = await designLabApi.shareDesign(designId);
      if (response.success && response.data) {
        const url = `${getBaseUrl()}/design-lab/share/${response.data.shareToken}`;
        setShareUrl(url);
        setShareToken(response.data.shareToken);
        if (onShare) {
          onShare(url);
        }
      }
    } catch (error) {
      console.error('[SaveShareModal] Failed to generate share link:', error);
      alert('Failed to generate share link. Please try again.');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 保存设计逻辑在父组件中处理
      // onSave会处理创建或更新设计
      if (onSave) {
        await onSave();
        // 保存成功后，如果还没有designId，等待父组件更新
        // 这里可以触发重新加载designId（通过props更新）
      }
      // 显示成功消息
      setTimeout(() => {
        setSaving(false);
        onClose();
      }, 1000);
    } catch (error) {
      console.error('[SaveShareModal] Failed to save design:', error);
      alert('Failed to save design. Please try again.');
      setSaving(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) {
      await generateShareLink();
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('Share link copied to clipboard!');
    } catch (error) {
      console.error('[SaveShareModal] Failed to copy link:', error);
      alert('Failed to copy link. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="dl-modal-overlay" onClick={onClose}>
      <div className="dl-modal dl-save-share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dl-modal__header">
          <h2 className="dl-modal__title">Save | Share</h2>
          <button className="dl-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="dl-modal__body">
          {/* Tab切换 */}
          <div className="dl-save-share-modal__tabs">
            <button
              className={`dl-save-share-modal__tab ${activeTab === 'save' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('save')}
            >
              Save
            </button>
            <button
              className={`dl-save-share-modal__tab ${activeTab === 'share' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('share')}
            >
              Share
            </button>
          </div>

          {/* Save Tab */}
          {activeTab === 'save' && (
            <div className="dl-save-share-modal__content">
              <p className="dl-save-share-modal__description">
                Save your design to access it later from "My Designs".
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
                    Your design will be saved when you click "Save Design".
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
          )}

          {/* Share Tab */}
          {activeTab === 'share' && (
            <div className="dl-save-share-modal__content">
              <p className="dl-save-share-modal__description">
                Share your design with others. They can view and comment on your design.
              </p>
              
              {!designId ? (
                <div className="dl-save-share-modal__loading">
                  <p style={{ color: '#6b7280', marginBottom: '16px' }}>
                    Please save your design first before sharing.
                  </p>
                  <button
                    className="dl-modal__btn dl-modal__btn--primary"
                    onClick={() => {
                      setActiveTab('save');
                    }}
                  >
                    Go to Save Tab
                  </button>
                </div>
              ) : !shareUrl ? (
                <div className="dl-save-share-modal__loading">
                  <p style={{ color: '#6b7280', marginBottom: '16px' }}>
                    Click the button below to generate a share link.
                  </p>
                  <button
                    className="dl-modal__btn dl-modal__btn--primary"
                    onClick={generateShareLink}
                  >
                    Generate Share Link
                  </button>
                </div>
              ) : (
                <div className="dl-save-share-modal__share-section">
                  <label className="dl-save-share-modal__label">
                    Share Link:
                    <div className="dl-save-share-modal__link-input">
                      <input
                        type="text"
                        className="dl-save-share-modal__input"
                        value={shareUrl}
                        readOnly
                      />
                      <button
                        className="dl-save-share-modal__copy-btn"
                        onClick={handleCopyLink}
                        aria-label="Copy link"
                      >
                        Copy
                      </button>
                    </div>
                  </label>

                  {/* 社交媒体分享 */}
                  <div className="dl-save-share-modal__social-share">
                    <p className="dl-save-share-modal__social-title">Share on:</p>
                    <SocialShareMenu
                      config={{
                        url: shareUrl,
                        title: `${designName} - Custom Design`,
                        description: 'Check out my custom design!',
                        hashtags: ['CustomDesign', 'DesignLab'],
                      }}
                      onShare={(platform) => {
                        console.log(`[SaveShareModal] Shared to ${platform}`);
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SaveShareModal;

