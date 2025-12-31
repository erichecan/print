/**
 * Social Media Share Button Component
* 社交媒体分享按钮组件 for Issue #142
 */
'use client';

import { useState } from 'react';

export interface ShareConfig {
  url: string;
  title: string;
  description?: string;
  image?: string;
  hashtags?: string[];
}

interface SocialShareButtonProps {
  platform: 'facebook' | 'twitter' | 'linkedin' | 'pinterest' | 'email' | 'copy';
  config: ShareConfig;
  onShare?: (platform: string) => void;
  className?: string;
  iconOnly?: boolean;
}

// 社交媒体平台配置 for Issue #142
const platformConfig = {
  facebook: {
    name: 'Facebook',
    icon: '📘',
    color: '#1877F2',
    getUrl: (config: ShareConfig) => {
      const params = new URLSearchParams({
        u: config.url,
        quote: config.title + (config.description ? ` - ${config.description}` : ''),
      });
      return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`;
    },
  },
  twitter: {
    name: 'Twitter',
    icon: '🐦',
    color: '#1DA1F2',
    getUrl: (config: ShareConfig) => {
      const params = new URLSearchParams({
        url: config.url,
        text: config.title,
        ...(config.hashtags && config.hashtags.length > 0 && { hashtags: config.hashtags.join(',') }),
      });
      return `https://twitter.com/intent/tweet?${params.toString()}`;
    },
  },
  linkedin: {
    name: 'LinkedIn',
    icon: '💼',
    color: '#0077B5',
    getUrl: (config: ShareConfig) => {
      const params = new URLSearchParams({
        url: config.url,
        title: config.title,
        summary: config.description || '',
      });
      return `https://www.linkedin.com/sharing/share-offsite/?${params.toString()}`;
    },
  },
  pinterest: {
    name: 'Pinterest',
    icon: '📌',
    color: '#BD081C',
    getUrl: (config: ShareConfig) => {
      const params = new URLSearchParams({
        url: config.url,
        description: config.title + (config.description ? ` - ${config.description}` : ''),
        media: config.image || '',
      });
      return `https://pinterest.com/pin/create/button/?${params.toString()}`;
    },
  },
  email: {
    name: 'Email',
    icon: '✉️',
    color: '#34C759',
    getUrl: (config: ShareConfig) => {
      const params = new URLSearchParams({
        subject: config.title,
        body: `${config.title}\n\n${config.description || ''}\n\n${config.url}`,
      });
      return `mailto:?${params.toString()}`;
    },
  },
  copy: {
    name: 'Copy Link',
    icon: '🔗',
    color: '#6B7280',
    getUrl: () => '',
  },
};

export function SocialShareButton({
  platform,
  config,
  onShare,
  className = '',
  iconOnly = false,
}: SocialShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const platformInfo = platformConfig[platform];

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();

    if (platform === 'copy') {
// 复制链接到剪贴板 for Issue #142
      try {
        await navigator.clipboard.writeText(config.url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        onShare?.(platform);
      } catch (err) {
        console.error('Failed to copy link:', err);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = config.url;
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
          onShare?.(platform);
        } catch (fallbackErr) {
          console.error('Fallback copy failed:', fallbackErr);
        }
        document.body.removeChild(textArea);
      }
    } else {
// 打开社交媒体分享窗口 for Issue #142
      const shareUrl = platformInfo.getUrl(config);
      const width = 600;
      const height = 400;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;

      window.open(
        shareUrl,
        'share',
        `width=${width},height=${height},left=${left},top=${top},toolbar=0,menubar=0,location=0,status=0,scrollbars=1,resizable=1`
      );

      onShare?.(platform);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className}
      aria-label={`Share on ${platformInfo.name}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: iconOnly ? '8px' : '10px 16px',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        background: '#ffffff',
        color: platformInfo.color,
        cursor: 'pointer',
        transition: 'all 0.2s',
        fontSize: iconOnly ? '20px' : '14px',
        fontWeight: 500,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#f9fafb';
        e.currentTarget.style.borderColor = platformInfo.color;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#ffffff';
        e.currentTarget.style.borderColor = '#e5e7eb';
      }}
    >
      <span aria-hidden="true">{platformInfo.icon}</span>
      {!iconOnly && (
        <span>{copied && platform === 'copy' ? 'Copied!' : platformInfo.name}</span>
      )}
    </button>
  );
}

