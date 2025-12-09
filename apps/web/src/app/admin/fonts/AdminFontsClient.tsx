/**
 * Admin Fonts Client Component
 * [2025-01-30 19:00:00] 字体管理客户端组件
 */
'use client';

import { useState, useMemo } from 'react';
import { adminFontsApi, Font } from '@/lib/api';
import { useAdminI18n } from '@/contexts/adminI18nContext';

interface AdminFontsClientProps {
  data: any;
  isLoading: boolean;
  error: any;
  page: number;
  setPage: (page: number) => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  isActiveFilter: boolean | undefined;
  setIsActiveFilter: (filter: boolean | undefined) => void;
  sourceFilter: string;
  setSourceFilter: (source: string) => void;
  mutate: () => void;
}

const CATEGORIES: Font['category'][] = ['latin', 'chinese', 'japanese', 'hindi', 'arabic', 'korean', 'thai'];
const SOURCES: Font['source'][] = ['system', 'google', 'custom'];

const CATEGORY_LABELS: Record<Font['category'], string> = {
  latin: 'Latin Fonts',
  chinese: 'Chinese Fonts (中文)',
  japanese: 'Japanese Fonts (日本語)',
  hindi: 'Hindi Fonts (हिंदी)',
  arabic: 'Arabic Fonts (العربية)',
  korean: 'Korean Fonts (한국어)',
  thai: 'Thai Fonts (ไทย)',
};

const SOURCE_LABELS: Record<Font['source'], string> = {
  system: 'System',
  google: 'Google Fonts',
  custom: 'Custom',
};

export default function AdminFontsClient({
  data,
  isLoading,
  error,
  page,
  setPage,
  categoryFilter,
  setCategoryFilter,
  isActiveFilter,
  setIsActiveFilter,
  sourceFilter,
  setSourceFilter,
  mutate,
}: AdminFontsClientProps) {
  const { t } = useAdminI18n();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingFont, setEditingFont] = useState<Font | null>(null);
  const [saving, setSaving] = useState(false);

  const fonts: Font[] = useMemo(() => {
    return data?.data ?? [];
  }, [data]);

  const pagination = data?.pagination;

  const handleCreate = async (formData: FormData) => {
    setSaving(true);
    try {
      const fontData = {
        name: formData.get('name') as string,
        displayName: formData.get('displayName') as string || undefined,
        previewText: formData.get('previewText') as string || 'Aa',
        category: formData.get('category') as Font['category'],
        source: formData.get('source') as Font['source'],
        googleFontFamily: formData.get('googleFontFamily') as string || undefined,
        weights: formData.get('weights') ? (formData.get('weights') as string).split(',').map(w => w.trim()) : undefined,
        isActive: formData.get('isActive') === 'true',
        sortOrder: formData.get('sortOrder') ? parseInt(formData.get('sortOrder') as string) : 0,
      };

      if (!fontData.name || !fontData.category || !fontData.source) {
        alert('Name, category, and source are required');
        return;
      }

      await adminFontsApi.create(fontData);
      setShowCreateModal(false);
      mutate();
    } catch (err: any) {
      alert(err.message || 'Failed to create font');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string, formData: FormData) => {
    setSaving(true);
    try {
      const updateData: any = {};
      const name = formData.get('name') as string;
      const displayName = formData.get('displayName') as string;
      const previewText = formData.get('previewText') as string;
      const category = formData.get('category') as string;
      const source = formData.get('source') as string;
      const googleFontFamily = formData.get('googleFontFamily') as string;
      const weights = formData.get('weights') as string;
      const isActive = formData.get('isActive');
      const sortOrder = formData.get('sortOrder');

      if (name) updateData.name = name;
      if (displayName) updateData.displayName = displayName;
      if (previewText) updateData.previewText = previewText;
      if (category) updateData.category = category;
      if (source) updateData.source = source;
      if (googleFontFamily) updateData.googleFontFamily = googleFontFamily;
      if (weights) updateData.weights = weights.split(',').map(w => w.trim());
      if (isActive !== null) updateData.isActive = isActive === 'true';
      if (sortOrder) updateData.sortOrder = parseInt(sortOrder as string);

      await adminFontsApi.update(id, updateData);
      setEditingFont(null);
      mutate();
    } catch (err: any) {
      alert(err.message || 'Failed to update font');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this font?')) {
      return;
    }

    try {
      await adminFontsApi.delete(id);
      mutate();
    } catch (err: any) {
      alert(err.message || 'Failed to delete font');
    }
  };

  const handleToggleActive = async (font: Font) => {
    try {
      await adminFontsApi.update(font.id, {
        isActive: !font.isActive,
      });
      mutate();
    } catch (err: any) {
      alert(err.message || 'Failed to update font');
    }
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading fonts...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '40vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ef4444', gap: '12px', padding: '20px' }}>
        <div style={{ fontWeight: 600 }}>Failed to load fonts</div>
        <div style={{ fontSize: '14px', color: '#666', textAlign: 'center', maxWidth: '500px' }}>
          {error?.message || 'Unknown error occurred'}
        </div>
        <button
          className="btn btn--outline"
          onClick={() => mutate()}
          style={{ marginTop: '8px' }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* [2025-12-09] 移除重复的 admin-page-header，因为 AdminShell 已经提供了标题 */}
      {/* 使用简单的操作栏替代 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <p className="text-muted" style={{ margin: 0 }}>Manage fonts for Design Lab</p>
        <div className="admin-btn-group">
          <button
            className="btn btn--primary"
            onClick={() => {
              setEditingFont(null);
              setShowCreateModal(true);
            }}
          >
            Add Font
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
          <option value="">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {CATEGORY_LABELS[cat]}
            </option>
          ))}
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => {
            setSourceFilter(e.target.value);
            setPage(1);
          }}
          style={{ minWidth: 150 }}
        >
          <option value="">All Sources</option>
          {SOURCES.map((src) => (
            <option key={src} value={src}>
              {SOURCE_LABELS[src]}
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
          <option value="all">All Status</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Preview</th>
              <th>Name</th>
              <th>Category</th>
              <th>Source</th>
              <th>Status</th>
              <th>Sort Order</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {fonts.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>
                  No fonts found
                </td>
              </tr>
            ) : (
              fonts.map((font) => (
                <tr key={font.id}>
                  <td>
                    <div
                      style={{
                        fontFamily: font.name,
                        fontSize: '24px',
                        fontWeight: 'bold',
                        padding: '8px',
                        minWidth: '60px',
                        textAlign: 'center',
                        border: '1px solid #e5e7eb',
                        borderRadius: '4px',
                        backgroundColor: '#f9fafb',
                      }}
                    >
                      {font.previewText}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{font.displayName || font.name}</div>
                    {font.displayName && font.displayName !== font.name && (
                      <div style={{ fontSize: '12px', color: '#666' }}>{font.name}</div>
                    )}
                  </td>
                  <td>{CATEGORY_LABELS[font.category]}</td>
                  <td>{SOURCE_LABELS[font.source]}</td>
                  <td>
                    <button
                      className={`btn btn--sm ${font.isActive ? 'btn--success' : 'btn--outline'}`}
                      onClick={() => handleToggleActive(font)}
                    >
                      {font.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td>{font.sortOrder}</td>
                  <td>
                    <div className="admin-btn-group" style={{ gap: '4px' }}>
                      <button
                        className="btn btn--sm btn--outline"
                        onClick={() => setEditingFont(font)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn--sm btn--danger"
                        onClick={() => handleDelete(font.id)}
                      >
                        Delete
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
            className="btn btn--outline"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <span>
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </span>
          <button
            className="btn btn--outline"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingFont) && (
        <div className="admin-modal-overlay" onClick={() => {
          setShowCreateModal(false);
          setEditingFont(null);
        }}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>{editingFont ? 'Edit Font' : 'Add Font'}</h2>
              <button
                className="admin-modal-close"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingFont(null);
                }}
              >
                ×
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                if (editingFont) {
                  handleUpdate(editingFont.id, formData);
                } else {
                  handleCreate(formData);
                }
              }}
            >
              <div className="admin-form-group">
                <label>Name *</label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingFont?.name}
                  required
                  placeholder="Arial"
                />
              </div>
              <div className="admin-form-group">
                <label>Display Name</label>
                <input
                  type="text"
                  name="displayName"
                  defaultValue={editingFont?.displayName}
                  placeholder="Arial (optional)"
                />
              </div>
              <div className="admin-form-group">
                <label>Preview Text</label>
                <input
                  type="text"
                  name="previewText"
                  defaultValue={editingFont?.previewText || 'Aa'}
                  placeholder="Aa"
                />
              </div>
              <div className="admin-form-group">
                <label>Category *</label>
                <select name="category" defaultValue={editingFont?.category} required>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="admin-form-group">
                <label>Source *</label>
                <select name="source" defaultValue={editingFont?.source} required>
                  {SOURCES.map((src) => (
                    <option key={src} value={src}>
                      {SOURCE_LABELS[src]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="admin-form-group">
                <label>Google Font Family</label>
                <input
                  type="text"
                  name="googleFontFamily"
                  defaultValue={editingFont?.googleFontFamily || ''}
                  placeholder="Roboto (if source is google)"
                />
              </div>
              <div className="admin-form-group">
                <label>Weights (comma-separated)</label>
                <input
                  type="text"
                  name="weights"
                  defaultValue={editingFont?.weights?.join(', ') || ''}
                  placeholder="400, 500, 700"
                />
              </div>
              <div className="admin-form-group">
                <label>Sort Order</label>
                <input
                  type="number"
                  name="sortOrder"
                  defaultValue={editingFont?.sortOrder || 0}
                  min="0"
                />
              </div>
              <div className="admin-form-group">
                <label>
                  <input
                    type="checkbox"
                    name="isActive"
                    value="true"
                    defaultChecked={editingFont?.isActive !== false}
                  />
                  Active
                </label>
              </div>
              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingFont(null);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary" disabled={saving}>
                  {saving ? 'Saving...' : editingFont ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

