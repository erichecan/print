/**
 * Social Media Share Menu Component
* 社交媒体分享菜单组件 for Issue #142
 */
'use client';

import { useState } from 'react';
import { SocialShareButton, ShareConfig } from './SocialShareButton';

interface SocialShareMenuProps {
  config: ShareConfig;
  onShare?: (platform: string) => void;
  className?: string;
  platforms?: Array<'facebook' | 'twitter' | 'linkedin' | 'pinterest' | 'email' | 'copy'>;
}

export function SocialShareMenu({
  config,
  onShare,
  className = '',
  platforms = ['facebook', 'twitter', 'linkedin', 'pinterest', 'email', 'copy'],
}: SocialShareMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleShare = (platform: string) => {
    onShare?.(platform);
    setIsOpen(false);
  };

  return (
    <div className={className} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Share on social media"
        aria-expanded={isOpen}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          background: '#ffffff',
          color: '#1f2937',
          cursor: 'pointer',
          transition: 'all 0.2s',
          fontSize: '14px',
          fontWeight: 500,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#f9fafb';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#ffffff';
        }}
      >
        <span aria-hidden="true">🔗</span>
        <span>Share</span>
        <span aria-hidden="true" style={{ fontSize: '12px' }}>
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {isOpen && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
            }}
            onClick={() => setIsOpen(false)}
          />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '8px',
              padding: '12px',
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              zIndex: 1000,
              minWidth: '200px',
              display: 'grid',
              gap: '8px',
            }}
          >
            {platforms.map((platform) => (
              <SocialShareButton
                key={platform}
                platform={platform}
                config={config}
                onShare={handleShare}
                iconOnly={false}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

