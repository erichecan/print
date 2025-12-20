/**
 * Account Designs Page
 * [2025-12-18 23:25:00] 我的设计页面
 * [2025-01-31 00:05:00] 更新：支持本地+云端设计合并显示、30天筛选、编辑功能
 */
'use client';

import { useState, useEffect } from 'react';
import { designsApi } from '@/lib/api';
import { getAllLocalDesigns, getLocalDesignsByDays, deleteLocalDesign } from '@/app/design-lab/utils/localStorage';
import { mergeDesigns, filterDesignsByDays, type MergedDesign } from '../utils/designMerger';
import { DesignTimeFilter, type TimeFilterOption } from '../components/DesignTimeFilter';
import { DesignCard } from '../components/DesignCard';
import { LocalDesignSyncPrompt } from '../components/LocalDesignSyncPrompt';
import { useAccount } from '@/contexts/AccountContext';

export default function AccountDesignsPage() {
  const { user } = useAccount(); // [2025-01-31 00:20:00] 使用 useAccount hook
  const [mergedDesigns, setMergedDesigns] = useState<MergedDesign[]>([]);
  const [filteredDesigns, setFilteredDesigns] = useState<MergedDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilterOption>(30); // [2025-01-31 00:05:00] 默认30天
  const [refreshTrigger, setRefreshTrigger] = useState(0); // [2025-01-31 00:20:00] 用于触发刷新

  // [2025-01-31 00:05:00] 加载设计数据
  useEffect(() => {
    const fetchDesigns = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. 加载云端设计（如果用户已登录）
        let cloudDesigns = [];
        if (user) {
          try {
            const response = await designsApi.list(timeFilter > 0 ? timeFilter : undefined);
            cloudDesigns = response.designs || [];
            // [2025-01-31 00:05:00] 确保 updatedAt 字段存在（使用 createdAt 作为 fallback）
            cloudDesigns = cloudDesigns.map(design => ({
              ...design,
              updatedAt: design.updatedAt || design.createdAt,
            }));
          } catch (err) {
            console.warn('[AccountDesigns] Failed to load cloud designs:', err);
            // 云端加载失败不影响本地设计显示
          }
        }

        // 2. 加载本地设计
        const localDesigns = timeFilter > 0
          ? getLocalDesignsByDays(timeFilter)
          : getAllLocalDesigns();

        // 3. 合并设计
        const merged = mergeDesigns(cloudDesigns, localDesigns);
        setMergedDesigns(merged);
        setFilteredDesigns(merged);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load designs';
        setError(errorMessage);
        console.error('[AccountDesigns] Error loading designs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDesigns();
  }, [user, timeFilter, refreshTrigger]); // [2025-01-31 00:20:00] 添加 refreshTrigger 依赖

  // [2025-01-31 00:05:00] Handle design deletion
  const handleDelete = async (id: string, source: 'cloud' | 'local') => {
    try {
      if (source === 'cloud') {
        // Delete cloud design
        await designsApi.delete(id);
      } else {
        // Delete local design
        const result = deleteLocalDesign(id);
        if (!result.success) {
          alert(result.error || 'Failed to delete');
          return;
        }
      }

      // Update list
      const updatedMerged = mergedDesigns.filter(d => {
        if (source === 'cloud') {
          return d.cloudId !== id;
        } else {
          return d.localId !== id;
        }
      });
      setMergedDesigns(updatedMerged);
      setFilteredDesigns(updatedMerged);
    } catch (err) {
      console.error('[AccountDesigns] Error deleting design:', err);
      alert('Delete failed, please try again');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <p style={{ color: '#ef4444' }}>Error: {error}</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: '16px',
            padding: '8px 16px',
            backgroundColor: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>My Designs</h1>
        <a
          href="/design-lab"
          style={{
            padding: '10px 20px',
            backgroundColor: '#2563eb',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '6px',
            fontWeight: '500',
            fontSize: '0.875rem',
          }}
        >
          + New Design
        </a>
      </div>

      {/* [2025-01-31 00:20:00] Local design sync prompt (only shown if logged in) */}
      {user && (
        <LocalDesignSyncPrompt
          cloudDesigns={mergedDesigns.filter(d => d.source === 'cloud' || d.source === 'both')}
          onSyncComplete={() => {
            setRefreshTrigger(prev => prev + 1); // Trigger refresh
          }}
        />
      )}

      {/* [2025-01-31 00:05:00] Time filter */}
      <DesignTimeFilter value={timeFilter} onChange={setTimeFilter} />

      {/* Design List */}
      {filteredDesigns.length === 0 ? (
        <div
          style={{
            padding: '48px',
            textAlign: 'center',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e0e0e0',
          }}
        >
          <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '16px' }}>
            {timeFilter > 0
              ? `No designs found in the last ${timeFilter} days`
              : 'You haven\'t saved any designs yet'}
          </p>
          <a
            href="/design-lab"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              backgroundColor: '#2563eb',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: '6px',
              fontWeight: '500',
            }}
          >
            Start Designing
          </a>
        </div>
      ) : (
        <>
          <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '16px' }}>
            Total {filteredDesigns.length} designs
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '24px',
            }}
          >
            {filteredDesigns.map((design) => (
              <DesignCard
                key={design.id}
                design={design}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
