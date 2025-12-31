/**
 * Account Designs Page
* 我的设计页面
* 更新：支持本地+云端设计合并显示、30天筛选、编辑功能
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
const { user } = useAccount(); // 使用 useAccount hook
  const [mergedDesigns, setMergedDesigns] = useState<MergedDesign[]>([]);
  const [filteredDesigns, setFilteredDesigns] = useState<MergedDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
const [timeFilter, setTimeFilter] = useState<TimeFilterOption>(30); // 默认30天
const [refreshTrigger, setRefreshTrigger] = useState(0); // 用于触发刷新

// 加载设计数据
  useEffect(() => {
    const fetchDesigns = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. 加载云端设计（如果用户已登录）
        let cloudDesigns: any[] = [];
        if (user) {
          try {
            console.log('[AccountDesigns] ===== LOADING CLOUD DESIGNS =====');
            console.log('[AccountDesigns] User logged in:', user.email || user.id);
            console.log('[AccountDesigns] Fetching with timeFilter:', timeFilter);
            const response = await designsApi.list(timeFilter > 0 ? timeFilter : undefined);
            console.log('[AccountDesigns] API response:', response);
            cloudDesigns = response.designs || [];
            console.log('[AccountDesigns] Cloud designs count:', cloudDesigns.length);
            if (cloudDesigns.length > 0) {
              console.log('[AccountDesigns] First cloud design:', cloudDesigns[0]);
            }
// 确保 updatedAt 字段存在（使用 createdAt 作为 fallback）
            cloudDesigns = cloudDesigns.map(design => ({
              ...design,
              updatedAt: design.updatedAt || design.createdAt,
            }));
          } catch (err) {
            console.error('[AccountDesigns] ❌ Failed to load cloud designs:', err);
            // 云端加载失败不影响本地设计显示
          }
        } else {
          console.log('[AccountDesigns] User not logged in, skipping cloud designs');
        }

        // 2. 加载本地设计
        const localDesigns = timeFilter > 0
          ? getLocalDesignsByDays(timeFilter)
          : getAllLocalDesigns();
        console.log('[AccountDesigns] Local designs count:', localDesigns.length);

        // 3. 合并设计
        console.log('[AccountDesigns] Merging designs...');
        const merged = mergeDesigns(cloudDesigns, localDesigns);
        console.log('[AccountDesigns] ===== MERGE COMPLETE =====');
        console.log('[AccountDesigns] Merged designs count:', merged.length);
        if (merged.length > 0) {
          console.log('[AccountDesigns] First merged design:', merged[0]);
        }
        setMergedDesigns(merged);
        setFilteredDesigns(merged);
        console.log('[AccountDesigns] ===== DESIGNS LOADED =====');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load designs';
        setError(errorMessage);
        console.error('[AccountDesigns] Error loading designs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDesigns();
}, [user, timeFilter, refreshTrigger]); // 添加 refreshTrigger 依赖

// Handle design deletion
  const handleDelete = async (design: MergedDesign) => {
    console.log('[AccountDesigns] ===== DELETION START =====');
    console.log('[AccountDesigns] Deleting design:', {
      id: design.id,
      name: design.name,
      cloudId: design.cloudId,
      localId: design.localId,
      source: design.source
    });

// CRITICAL: Check if design has ANY valid ID
    if (!design.cloudId && !design.localId) {
      console.error('[AccountDesigns] ERROR: Design has no cloudId or localId!', design);
      alert('Cannot delete: Design has no valid ID');
      return;
    }

    try {
      const deletions = [];

      // If it has a cloud ID, delete from cloud
      if (design.cloudId) {
        console.log('[AccountDesigns] Attempting cloud deletion for:', design.cloudId);
        deletions.push(
          designsApi.delete(design.cloudId).then(res => {
            console.log('[AccountDesigns] ✅ Cloud deletion successful:', design.cloudId, res);
            return res;
          }).catch(err => {
            console.error('[AccountDesigns] ❌ Failed to delete cloud design:', design.cloudId, err);
            return { error: 'Failed to delete from cloud' };
          })
        );
      } else {
        console.log('[AccountDesigns] Skipping cloud deletion (no cloudId)');
      }

      // If it has a local ID, delete from local
      if (design.localId) {
        console.log('[AccountDesigns] Attempting local deletion for:', design.localId);
        const result = deleteLocalDesign(design.localId);
        if (!result.success) {
          console.error('[AccountDesigns] ❌ Failed to delete local design:', design.localId, result.error);
        } else {
          console.log('[AccountDesigns] ✅ Local deletion successful:', design.localId);
        }
      } else {
        console.log('[AccountDesigns] Skipping local deletion (no localId)');
      }

      // Wait for cloud deletion if applicable
      await Promise.all(deletions);

      // Update list - remove the deleted design
      console.log('[AccountDesigns] Updating UI - removing design from state:', design.id);
      console.log('[AccountDesigns] Current mergedDesigns count:', mergedDesigns.length);
      const updatedMerged = mergedDesigns.filter(d => d.id !== design.id);
      console.log('[AccountDesigns] Updated mergedDesigns count:', updatedMerged.length);
      setMergedDesigns(updatedMerged);
      setFilteredDesigns(updatedMerged);
      console.log('[AccountDesigns] ===== DELETION COMPLETE =====');

    } catch (err) {
      console.error('[AccountDesigns] ❌ Error deleting design:', err);
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

{/* Local design sync prompt (only shown if logged in) */}
      {user && (
        <LocalDesignSyncPrompt
          cloudDesigns={mergedDesigns.filter(d => d.source === 'cloud' || d.source === 'both')}
          onSyncComplete={() => {
            setRefreshTrigger(prev => prev + 1); // Trigger refresh
          }}
        />
      )}

{/* Time filter */}
      <DesignTimeFilter value={timeFilter} onChange={setTimeFilter} />

      {/* Design List */}
      {(() => {
        console.log('[AccountDesigns] ===== RENDERING =====');
        console.log('[AccountDesigns] filteredDesigns.length:', filteredDesigns.length);
        console.log('[AccountDesigns] mergedDesigns.length:', mergedDesigns.length);
        return null;
      })()}
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
            Create Your First Design
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
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '24px',
            }}
          >
            {filteredDesigns.map((design, index) => {
              console.log(`[AccountDesigns] Rendering design ${index}:`, design.name);
              return <DesignCard key={design.id} design={design} onDelete={handleDelete} />;
            })}
          </div>
        </>
      )}
    </div>
  );
}
