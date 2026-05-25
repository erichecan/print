/**
 * 设计卡片组件
* 显示设计信息、来源标识、操作按钮
 */
'use client';

import { useRouter } from 'next/navigation';
import type { MergedDesign } from '../utils/designMerger';

interface DesignCardProps {
  design: MergedDesign;
  onDelete?: (design: MergedDesign) => void;
}

export function DesignCard({ design, onDelete }: DesignCardProps) {
  const router = useRouter();

  const handleEdit = () => {
// 优先使用云端ID，如果不存在则使用本地ID
    const designId = design.cloudId || design.localId || design.id;
    const source = design.cloudId ? 'cloud' : 'local';
    router.push(`/design-lab?designId=${designId}&source=${source}`);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    console.log('[DesignCard] Delete button clicked for design:', design.name);
    console.log('[DesignCard] onDelete exists:', !!onDelete);

    if (!onDelete) {
      console.error('[DesignCard] onDelete callback not provided!');
      return;
    }

// TEMPORARY: Remove confirm dialog to test core functionality
    // TODO: Implement proper confirmation modal that doesn't auto-dismiss
    console.log('[DesignCard] Calling onDelete directly (no confirmation)');
    onDelete(design);
  };

// Format Date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

// Source Badge
  const getSourceBadge = () => {
    const badges = [];
    if (design.source === 'cloud' || design.source === 'both') {
      badges.push(
        <span
          key="cloud"
          style={{
            display: 'inline-block',
            padding: '2px 8px',
            fontSize: '0.75rem',
            backgroundColor: '#dbeafe',
            color: '#1e40af',
            borderRadius: '0',
            marginRight: '4px',
          }}
        >
          Cloud
        </span>
      );
    }
    if (design.source === 'local' || design.source === 'both') {
      badges.push(
        <span
          key="local"
          style={{
            display: 'inline-block',
            padding: '2px 8px',
            fontSize: '0.75rem',
            backgroundColor: '#f3f4f6',
            color: '#374151',
            borderRadius: '0',
          }}
        >
          Local
        </span>
      );
    }
    return badges;
  };

  return (
    <div
      style={{
        border: '1px solid #e0e0e0',
        borderRadius: '0',
        padding: '16px',
        backgroundColor: '#fff',
        transition: 'box-shadow 0.2s',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Thumbnail */}
      {design.thumbnailUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={design.thumbnailUrl}
          alt={design.name || 'Design'}
          style={{
            width: '100%',
            height: '200px',
            objectFit: 'cover',
            borderRadius: '0',
            marginBottom: '12px',
          }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '200px',
            backgroundColor: '#f3f4f6',
            borderRadius: '0',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#9ca3af',
            fontSize: '0.875rem',
          }}
        >
          No Preview
        </div>
      )}

      {/* Design Name */}
      <h3
        style={{
          fontSize: '1.1rem',
          fontWeight: '600',
          marginBottom: '8px',
          color: '#1f2937',
          flex: 1,
        }}
      >
        {design.name || 'Untitled Design'}
      </h3>

      {/* Product Name */}
      {design.productName && (
        <p
          style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            marginBottom: '8px',
          }}
        >
          {design.productName}
        </p>
      )}

      {/* Source Badge */}
      <div style={{ marginBottom: '8px' }}>{getSourceBadge()}</div>

      {/* Last Edited */}
      <p
        style={{
          fontSize: '0.875rem',
          color: '#666',
          marginBottom: '12px',
        }}
      >
        Edited: {formatDate(design.updatedAt)}
      </p>

      {/* Action Buttons */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginTop: 'auto',
        }}
      >
        <button
          onClick={handleEdit}
          style={{
            flex: 1,
            padding: '8px 16px',
            backgroundColor: '#000000',
            color: '#fff',
            border: 'none',
            borderRadius: '0',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#333333';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#000000';
          }}
        >
          Edit
        </button>
        {onDelete && (
          <button
            onClick={handleDelete}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              color: '#ef4444',
              border: '1px solid #ef4444',
              borderRadius: '0',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#fee2e2';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

