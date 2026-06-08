'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { tagGroupsApi, TagGroup, TagGroupPayload } from '@/lib/api';

export default function TagGroupsAdminPage() {
  const { data: groups, isLoading } = useSWR<TagGroup[]>('tag-groups', () => tagGroupsApi.list());
  const [editingGroup, setEditingGroup] = useState<TagGroup | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => mutate('tag-groups');

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete tag group "${name}"?`)) return;
    try {
      await tagGroupsApi.delete(id);
      refresh();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Tag Groups</h1>
        <button className="primary-btn" onClick={() => { setShowNew(true); setEditingGroup(null); }}>
          + New Group
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {(showNew || editingGroup) && (
        <TagGroupForm
          group={editingGroup ?? undefined}
          onSave={async (payload) => {
            try {
              if (editingGroup) {
                await tagGroupsApi.update(editingGroup.id, payload);
              } else {
                await tagGroupsApi.create(payload as TagGroupPayload);
              }
              refresh();
              setEditingGroup(null);
              setShowNew(false);
            } catch (e: any) {
              setError(e.message);
            }
          }}
          onCancel={() => { setEditingGroup(null); setShowNew(false); }}
        />
      )}

      {isLoading ? (
        <p>Loading…</p>
      ) : (
        <div className="group-list">
          {(groups ?? []).map((g) => (
            <div key={g.id} className="group-card">
              <div className="group-header">
                <div>
                  <span className="group-name">{g.name}</span>
                  <span className="group-slug">/{g.slug}</span>
                  {!g.isActive && <span className="badge-inactive">Inactive</span>}
                </div>
                <div className="group-actions">
                  <button className="link-btn" onClick={() => { setEditingGroup(g); setShowNew(false); }}>Edit</button>
                  <button className="danger-btn" onClick={() => handleDelete(g.id, g.name)}>Delete</button>
                </div>
              </div>
              <div className="tag-chips">
                {g.tags.map((tag) => (
                  <span key={tag} className="tag-chip">{tag}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .page { padding: 24px; max-width: 900px; margin: 0 auto; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        h1 { font-size: 24px; font-weight: 700; }
        .primary-btn { background: #1e293b; color: white; padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; }
        .primary-btn:hover { background: #0f172a; }
        .error-banner { background: #fee2e2; color: #991b1b; padding: 12px; border-radius: 6px; margin-bottom: 16px; }
        .group-list { display: flex; flex-direction: column; gap: 12px; }
        .group-card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
        .group-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
        .group-name { font-weight: 600; font-size: 15px; }
        .group-slug { font-size: 13px; color: #94a3b8; margin-left: 8px; }
        .badge-inactive { background: #fef9c3; color: #854d0e; font-size: 11px; padding: 2px 6px; border-radius: 10px; margin-left: 8px; }
        .group-actions { display: flex; gap: 8px; }
        .link-btn { background: none; border: 1px solid #cbd5e1; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 13px; color: #2563eb; }
        .danger-btn { background: none; border: 1px solid #fecaca; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 13px; color: #dc2626; }
        .tag-chips { display: flex; flex-wrap: wrap; gap: 6px; }
        .tag-chip { background: #f1f5f9; border: 1px solid #e2e8f0; padding: 3px 10px; border-radius: 20px; font-size: 13px; color: #475569; }
      `}</style>
    </div>
  );
}

interface TagGroupFormProps {
  group?: TagGroup;
  onSave: (data: Partial<TagGroupPayload>) => Promise<void>;
  onCancel: () => void;
}

function TagGroupForm({ group, onSave, onCancel }: TagGroupFormProps) {
  const [name, setName] = useState(group?.name ?? '');
  const [slug, setSlug] = useState(group?.slug ?? '');
  const [tagsRaw, setTagsRaw] = useState(group?.tags.join(', ') ?? '');
  const [sortOrder, setSortOrder] = useState(group?.sortOrder ?? 0);
  const [isActive, setIsActive] = useState(group?.isActive ?? true);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const tags = tagsRaw.split(',').map((t) => t.trim()).filter(Boolean);
      await onSave({ name, slug, tags, sortOrder, isActive });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <h2>{group ? 'Edit Tag Group' : 'New Tag Group'}</h2>
      <div className="field">
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g., 服装类型" />
      </div>
      <div className="field">
        <label>Slug</label>
        <input value={slug} onChange={(e) => setSlug(e.target.value)} required placeholder="e.g., garment-type" />
      </div>
      <div className="field">
        <label>Tags (comma-separated)</label>
        <textarea
          rows={3}
          value={tagsRaw}
          onChange={(e) => setTagsRaw(e.target.value)}
          placeholder="T-Shirt, Hoodie, Crewneck Sweatshirt"
        />
      </div>
      <div className="field-row">
        <div className="field">
          <label>Sort Order</label>
          <input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
        </div>
        <div className="field">
          <label className="checkbox">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <span>Active</span>
          </label>
        </div>
      </div>
      <div className="form-actions">
        <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>
        <button type="submit" className="primary-btn" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <style jsx>{`
        .form-card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 16px; }
        h2 { font-size: 16px; font-weight: 600; margin: 0 0 16px; }
        .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
        .field label { font-size: 13px; font-weight: 500; color: #475569; }
        .field input, .field textarea { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-size: 14px; width: 100%; }
        .field-row { display: flex; gap: 16px; }
        .checkbox { display: flex; align-items: center; gap: 6px; cursor: pointer; margin-top: 22px; }
        .form-actions { display: flex; justify-content: flex-end; gap: 8px; }
        .cancel-btn { background: none; border: 1px solid #cbd5e1; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; }
        .primary-btn { background: #1e293b; color: white; padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; }
        .primary-btn:disabled { opacity: 0.7; }
      `}</style>
    </form>
  );
}
