/**
 * 本地设计同步提示组件
 * [2025-01-31 00:20:00] 检测并提示用户上传本地设计到云端
 */
'use client';

import { useState, useEffect } from 'react';
import { getAllLocalDesigns, type LocalDesignDraft } from '@/app/design-lab/utils/localStorage';
import { designLabApi } from '@/lib/api';
import { mergeDesigns, type MergedDesign } from '../utils/designMerger';

interface LocalDesignSyncPromptProps {
  cloudDesigns: MergedDesign[];
  onSyncComplete?: () => void;
}

export function LocalDesignSyncPrompt({ cloudDesigns, onSyncComplete }: LocalDesignSyncPromptProps) {
  const [localDesigns, setLocalDesigns] = useState<LocalDesignDraft[]>([]);
  const [unsyncedDesigns, setUnsyncedDesigns] = useState<LocalDesignDraft[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // [2025-01-31 00:20:00] 检测未同步的本地设计
  useEffect(() => {
    const allLocal = getAllLocalDesigns();
    setLocalDesigns(allLocal);

    if (allLocal.length === 0) {
      setShowPrompt(false);
      return;
    }

    // [2025-01-31 00:20:00] 检查哪些本地设计还没有对应的云端版本
    const merged = mergeDesigns(cloudDesigns, allLocal);
    const unsynced = allLocal.filter(local => {
      // 检查是否有匹配的云端设计（通过名称和产品名称匹配）
      const matched = merged.find(m => m.localId === local.id);
      // 如果只有本地版本（source === 'local'），说明未同步
      // 如果 source === 'both'，说明已同步
      return !matched || matched.source === 'local';
    });

    setUnsyncedDesigns(unsynced);
    setShowPrompt(unsynced.length > 0 && !dismissed);
  }, [cloudDesigns, dismissed]);

  // [2025-01-31 00:20:00] 检查是否已关闭过提示（使用 localStorage）
  useEffect(() => {
    const dismissedKey = 'designSyncPromptDismissed';
    const isDismissed = localStorage.getItem(dismissedKey) === 'true';
    setDismissed(isDismissed);
  }, []);

  // [2025-01-31 00:20:00] 上传本地设计到云端
  const handleUploadAll = async () => {
    if (unsyncedDesigns.length === 0) {
      return;
    }

    setIsUploading(true);
    setUploadProgress({ current: 0, total: unsyncedDesigns.length });

    let successCount = 0;
    let failCount = 0;

    try {
      for (let i = 0; i < unsyncedDesigns.length; i++) {
        const localDesign = unsyncedDesigns[i];
        setUploadProgress({ current: i + 1, total: unsyncedDesigns.length });

        try {
          // [2025-01-31 00:20:00] 获取产品 variantId（如果不存在，使用默认值）
          let productVariantId = localDesign.productInfo.variantId;
          if (!productVariantId || productVariantId === 'default') {
            // 尝试从产品名称获取 variantId（这里简化处理，实际应该从 API 获取）
            productVariantId = 'default';
          }

          // [2025-01-31 00:20:00] 使用第一个视图的画布数据（通常是 front）
          const canvasData = localDesign.viewCanvases[localDesign.currentView] || 
                            localDesign.viewCanvases.front ||
                            { size: { width: 4000, height: 4800 }, objects: [] };

          // [2025-01-31 00:20:00] 上传到云端
          const payload = {
            name: localDesign.designName,
            canvas: canvasData,
            productVariantId: productVariantId,
          };

          await designLabApi.createDraft(payload);
          successCount++;
        } catch (error) {
          console.error(`[LocalDesignSync] Failed to upload design ${localDesign.id}:`, error);
          failCount++;
        }
      }

      // [2025-01-31 00:20:00] 上传完成，刷新列表
      if (successCount > 0) {
        setShowPrompt(false);
        if (onSyncComplete) {
          onSyncComplete();
        }
        // 刷新页面以更新设计列表
        window.location.reload();
      }

      if (failCount > 0) {
        alert(`成功上传 ${successCount} 个设计，${failCount} 个失败`);
      } else {
        alert(`成功上传 ${successCount} 个设计到云端！`);
      }
    } catch (error) {
      console.error('[LocalDesignSync] Upload error:', error);
      alert('上传失败，请重试');
    } finally {
      setIsUploading(false);
      setUploadProgress({ current: 0, total: 0 });
    }
  };

  // [2025-01-31 00:20:00] 关闭提示
  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('designSyncPromptDismissed', 'true');
  };

  if (!showPrompt || unsyncedDesigns.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: '#eff6ff',
        border: '1px solid #3b82f6',
        borderRadius: '8px',
        marginBottom: '24px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e40af', marginBottom: '8px' }}>
            检测到 {unsyncedDesigns.length} 个本地设计未同步到云端
          </h3>
          <p style={{ fontSize: '0.875rem', color: '#1e3a8a', marginBottom: '12px' }}>
            上传到云端后，您可以在任何设备上访问这些设计。
          </p>
        </div>
        <button
          onClick={handleDismiss}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            color: '#6b7280',
            cursor: 'pointer',
            padding: '0',
            marginLeft: '12px',
            lineHeight: '1',
          }}
          aria-label="关闭"
        >
          ×
        </button>
      </div>

      {isUploading && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.875rem', color: '#1e3a8a' }}>
              上传中... {uploadProgress.current} / {uploadProgress.total}
            </span>
            <span style={{ fontSize: '0.875rem', color: '#1e3a8a' }}>
              {Math.round((uploadProgress.current / uploadProgress.total) * 100)}%
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#dbeafe',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${(uploadProgress.current / uploadProgress.total) * 100}%`,
                height: '100%',
                backgroundColor: '#3b82f6',
                transition: 'width 0.3s',
              }}
            />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleUploadAll}
          disabled={isUploading}
          style={{
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: isUploading ? 'not-allowed' : 'pointer',
            opacity: isUploading ? 0.6 : 1,
          }}
        >
          {isUploading ? '上传中...' : `上传全部 (${unsyncedDesigns.length})`}
        </button>
        <button
          onClick={handleDismiss}
          disabled={isUploading}
          style={{
            padding: '8px 16px',
            backgroundColor: 'transparent',
            color: '#3b82f6',
            border: '1px solid #3b82f6',
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: isUploading ? 'not-allowed' : 'pointer',
            opacity: isUploading ? 0.6 : 1,
          }}
        >
          稍后
        </button>
      </div>
    </div>
  );
}

