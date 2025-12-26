'use client';

/**
 * Admin Art Assets Client Component
 * [2025-01-28 01:05:00] Client component for managing art assets
 */
import { useState, useMemo } from 'react';
import { adminArtAssetsApi, ArtAsset } from '@/lib/api';
import { useAdminI18n } from '@/contexts/adminI18nContext'; // [2025-01-28 08:45:00] 国际化支持
// [2025-01-28 02:35:00] 暂时移除 Next.js Image 组件，使用普通 img 标签以避免图片加载问题
// import Image from 'next/image';

interface AdminArtAssetsClientProps {
  data: any;
  isLoading: boolean;
  error: any;
  page: number;
  setPage: (page: number) => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  isActiveFilter: boolean | undefined;
  setIsActiveFilter: (filter: boolean | undefined) => void;
  mutate: () => void;
}

const CATEGORIES = [
  'Emojis',
  'Shapes & Symbols',
  'Sports & Games',
  'Letters & Numbers',
  'Animals',
  'Mascots',
  'Nature',
  'America',
  'Food & Drink',
  'Travel',
  'Objects',
  'Clothing',
  'Activities',
];

export default function AdminArtAssetsClient({
  data,
  isLoading,
  error,
  page,
  setPage,
  categoryFilter,
  setCategoryFilter,
  isActiveFilter,
  setIsActiveFilter,
  mutate,
}: AdminArtAssetsClientProps) {
  const { t } = useAdminI18n(); // [2025-01-28 08:45:00] 国际化支持
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<ArtAsset | null>(null);
  const [uploading, setUploading] = useState(false);

  const assets: ArtAsset[] = useMemo(() => {
    console.log('[AdminArtAssets] ===== useMemo triggered =====');
    console.log('[AdminArtAssets] Raw data:', data);
    console.log('[AdminArtAssets] isLoading:', isLoading);
    console.log('[AdminArtAssets] error:', error);

    const result = data?.data ?? [];
    console.log('[AdminArtAssets] Processed assets array:', result);
    console.log('[AdminArtAssets] Assets count:', result.length);

    // [2025-01-28 02:30:00] 添加日志以便调试图片显示问题
    if (result.length > 0) {
      console.log('[AdminArtAssets] ✅ Loaded assets:', result.length);
      result.forEach((asset, index) => {
        console.log(`[AdminArtAssets] 📦 Asset ${index + 1}:`, {
          id: asset.id,
          name: asset.name,
          imageUrl: asset.imageUrl,
          thumbnailUrl: asset.thumbnailUrl,
          image_url: asset.image_url,
          fullAsset: asset
        });
      });
    } else {
      console.log('[AdminArtAssets] ⚠️ No assets found in data');
      if (data) {
        console.log('[AdminArtAssets] Data structure:', {
          success: data.success,
          data: data.data,
          pagination: data.pagination
        });
      }
    }
    return result;
  }, [data, isLoading, error]);
  const pagination = data?.pagination;

  const handleUpload = async (formData: FormData) => {
    setUploading(true);
    try {
      const category = formData.get('category') as string;
      const name = formData.get('name') as string;
      const image = formData.get('image') as File;
      const sortOrder = formData.get('sortOrder') ? parseInt(formData.get('sortOrder') as string) : undefined;

      // [2025-01-27] 验证必填字段
      if (!category || !name) {
        alert('Category and name are required');
        return;
      }

      if (!image || image.size === 0) {
        alert('Please select an image file');
        return;
      }

      // [2025-01-27] 验证文件类型
      if (!image.type.startsWith('image/')) {
        alert('Please select a valid image file');
        return;
      }

      console.log('[AdminArtAssets] Uploading asset:', {
        category,
        name,
        imageName: image.name,
        imageSize: image.size,
        imageType: image.type,
        sortOrder
      });

      await adminArtAssetsApi.create({
        category,
        name,
        image,
        sortOrder,
      });

      setShowUploadModal(false);
      mutate();
    } catch (err: any) {
      console.error('[AdminArtAssets] Upload error:', err);
      const errorMessage = err?.details || err?.message || 'Failed to upload art asset';
      alert(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleUpdate = async (id: string, formData: FormData) => {
    setUploading(true);
    try {
      const updateData: any = {};
      const category = formData.get('category') as string;
      const name = formData.get('name') as string;
      const image = formData.get('image') as File;
      const isActive = formData.get('isActive');
      const sortOrder = formData.get('sortOrder');

      if (category) updateData.category = category;
      if (name) updateData.name = name;
      if (image && image.size > 0) updateData.image = image;
      if (isActive !== null) updateData.isActive = isActive === 'true';
      if (sortOrder) updateData.sortOrder = parseInt(sortOrder as string);

      await adminArtAssetsApi.update(id, updateData);

      setEditingAsset(null);
      mutate();
    } catch (err: any) {
      alert(err.message || 'Failed to update art asset');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this art asset?')) {
      return;
    }

    try {
      await adminArtAssetsApi.delete(id);
      mutate();
    } catch (err: any) {
      alert(err.message || 'Failed to delete art asset');
    }
  };

  const handleToggleActive = async (asset: ArtAsset) => {
    try {
      const currentActive = asset.isActive !== undefined ? asset.isActive : asset.is_active;
      await adminArtAssetsApi.update(asset.id, {
        isActive: !currentActive,
      });
      mutate();
    } catch (err: any) {
      alert(err.message || 'Failed to update art asset');
    }
  };

  // [2025-01-28 02:40:00] 添加组件渲染日志（只在开发环境或首次渲染时显示）
  if (typeof window !== 'undefined') {
    console.log('[AdminArtAssets] ===== Component render =====');
    console.log('[AdminArtAssets] Props:', { isLoading, error, hasData: !!data, assetsCount: assets.length });
  }

  if (isLoading) {
    console.log('[AdminArtAssets] ⏳ Showing loading state');
    return (
      <div style={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {t('loadingArtAssets')}
      </div>
    );
  }

  if (error) {
    console.error('[AdminArtAssets] ❌ Error state:', error);
    return (
      <div style={{ minHeight: '40vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ef4444', gap: '12px', padding: '20px' }}>
        <div style={{ fontWeight: 600 }}>{t('failedToLoadArtAssets')}</div>
        <div style={{ fontSize: '14px', color: '#666', textAlign: 'center', maxWidth: '500px' }}>
          {error?.message || 'Unknown error occurred'}
        </div>
        <button
          className="btn btn--outline"
          onClick={() => {
            console.log('[AdminArtAssets] 🔄 Retrying...');
            mutate();
          }}
          style={{ marginTop: '8px' }}
        >
          {t('retry')}
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 24 }}>
      <div className="admin-page-header">
        <div>
          <h1>{t('artAssets')}</h1>
          <p className="text-muted">{t('artAssetsSubtitle')}</p>
        </div>
        <div className="admin-btn-group">
          <button
            className="btn btn--primary"
            onClick={() => {
              setEditingAsset(null);
              setShowUploadModal(true);
            }}
          >
            {t('uploadArtAsset')}
          </button>
        </div>
      </div>

      <div className="admin-filters">
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          style={{ minWidth: 200 }}
        >
          <option value="">{t('allCategories')}</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <select
          value={isActiveFilter === undefined ? 'all' : isActiveFilter ? 'active' : 'inactive'}
          onChange={(e) => {
            const value = e.target.value;
            setIsActiveFilter(value === 'all' ? undefined : value === 'active');
            setPage(1);
          }}
        >
          <option value="all">{t('allStatus')}</option>
          <option value="active">{t('activeOnly')}</option>
          <option value="inactive">{t('inactiveOnly')}</option>
        </select>
      </div>

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('image')}</th>
              <th>{t('name')}</th>
              <th>{t('category')}</th>
              <th>{t('size')}</th>
              <th>{t('status')}</th>
              <th>{t('sortOrder')}</th>
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {assets.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  {t('noArtAssetsFound')}
                </td>
              </tr>
            ) : (
              assets.map((asset) => (
                <tr key={asset.id}>
                  <td>
                    <div style={{ width: 60, height: 60, position: 'relative', borderRadius: 4, overflow: 'hidden', backgroundColor: '#f0f0f0' }}>
                      {(asset.thumbnailUrl || asset.imageUrl || asset.image_url) ? (
                        (() => {
                          const imageSrc = asset.thumbnailUrl || asset.imageUrl || asset.image_url;
                          console.log('[AdminArtAssets] Rendering image:', { assetId: asset.id, imageSrc });
                          // [2025-01-28 02:35:00] 使用普通 img 标签以避免 Next.js Image 组件的限制
                          return (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={imageSrc}
                              alt={asset.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => {
                                console.error('[AdminArtAssets] Image load error:', {
                                  assetId: asset.id,
                                  imageSrc,
                                  error: e,
                                  target: e.target
                                });
                              }}
                              onLoad={() => {
                                console.log('[AdminArtAssets] Image loaded successfully:', {
                                  assetId: asset.id,
                                  imageSrc
                                });
                              }}
                            />
                          );
                        })()
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999' }}>
                          {t('noImage')}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>{asset.name}</td>
                  <td>{asset.category}</td>
                  <td>
                    {(asset.width && asset.height) ? `${asset.width}×${asset.height}` : '—'}
                  </td>
                  <td>
                    <span className={(asset.isActive !== undefined ? asset.isActive : asset.is_active) ? 'badge badge-success' : 'badge badge-pending'}>
                      {(asset.isActive !== undefined ? asset.isActive : asset.is_active) ? t('active') : t('inactive')}
                    </span>
                  </td>
                  <td>{asset.sortOrder !== undefined ? asset.sortOrder : asset.sort_order}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn btn--xs btn--outline"
                        onClick={() => setEditingAsset(asset)}
                      >
                        {t('edit')}
                      </button>
                      <button
                        className="btn btn--xs btn--outline"
                        onClick={() => handleToggleActive(asset)}
                      >
                        {asset.isActive ? t('deactivate') : t('activate')}
                      </button>
                      <button
                        className="btn btn--xs btn--danger"
                        onClick={() => handleDelete(asset.id)}
                      >
                        {t('delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="admin-pagination">
          <button
            className="btn btn--outline btn--xs"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            {t('previous')}
          </button>
          <span>
            {t('page')} {pagination.page} {t('of')} {pagination.totalPages}
          </span>
          <button
            className="btn btn--outline btn--xs"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage(page + 1)}
          >
            {t('next')}
          </button>
        </div>
      )}

      {/* Upload/Edit Modal */}
      {(showUploadModal || editingAsset) && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => {
            setShowUploadModal(false);
            setEditingAsset(null);
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: 8,
              padding: 24,
              maxWidth: 600,
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0 }}>{editingAsset ? t('editArtAsset') : t('uploadArtAssetTitle')}</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                if (editingAsset) {
                  await handleUpdate(editingAsset.id, formData);
                } else {
                  await handleUpload(formData);
                }
              }}
            >
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                  {t('categoryRequired')}
                </label>
                <select
                  name="category"
                  required
                  defaultValue={editingAsset?.category || ''}
                  style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd' }}
                >
                  <option value="">{t('selectCategory')}</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                  {t('nameRequired')}
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingAsset?.name || ''}
                  style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd' }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                  {editingAsset ? t('imageLeaveEmpty') : t('imageRequired')}
                </label>
                <input
                  type="file"
                  name="image"
                  accept="image/*"
                  required={!editingAsset}
                  style={{ width: '100%', padding: 8 }}
                />
              </div>

              {editingAsset && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      name="isActive"
                      value="true"
                      defaultChecked={editingAsset.isActive}
                    />
                    {t('isActive')}
                  </label>
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                  {t('sortOrderLabel')}
                </label>
                <input
                  type="number"
                  name="sortOrder"
                  defaultValue={editingAsset?.sortOrder || 0}
                  style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 24 }}>
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={() => {
                    setShowUploadModal(false);
                    setEditingAsset(null);
                  }}
                  disabled={uploading}
                >
                  {t('cancel')}
                </button>
                <button type="submit" className="btn btn--primary" disabled={uploading}>
                  {uploading ? t('saving') : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


