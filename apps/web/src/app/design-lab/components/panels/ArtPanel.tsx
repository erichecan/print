/**
 * Art Panel - 艺术素材面板
 * [2025-01-30 18:00:00] 实现 Artwork Categories 界面
 * [2025-12-04 21:50:00] 优化大类网格 UI，调整为 3 列布局，对齐 Custom Ink 设计
 */
'use client';

import React, { useState, useEffect } from 'react';
import { artAssetsApi, type ArtAsset } from '@/lib/api';

// [2025-01-30 18:00:00] 艺术素材分类
const ART_CATEGORIES = [
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
  'Activities'
];

interface ArtPanelProps {
  onSelectArt: (artUrl: string, artName: string) => void;
}

const ArtPanel: React.FC<ArtPanelProps> = ({ onSelectArt }) => {
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  const [artAssets, setArtAssets] = useState<Record<string, ArtAsset[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // [2025-01-30 18:00:00] 加载所有艺术素材
  useEffect(() => {
    const loadArtAssets = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await artAssetsApi.getAll();
        if (response.success && response.data) {
          setArtAssets(response.data);
        }
      } catch (err) {
        console.error('[ArtPanel] Error loading art assets:', err);
        setError('Failed to load art assets');
      } finally {
        setLoading(false);
      }
    };

    loadArtAssets();
  }, []);

  // [2025-01-30 18:00:00] 显示分类网格
  // [2025-12-04 21:50:00] 优化分类网格 UI，添加 header 和更好的布局
  if (!currentCategory) {
    return (
      <div className="dl-art-panel">
        <div className="dl-art-panel__header">
          <h2 className="dl-art-panel__title">Artwork Categories</h2>
        </div>
        <div className="dl-art-panel__categories">
          {loading && <p className="dl-art-panel__loading">Loading categories...</p>}
          {error && <p className="dl-art-panel__error">{error}</p>}
          {!loading && !error && (
            <div className="dl-art-panel__grid">
              {ART_CATEGORIES.map(category => {
                const assets = artAssets[category] || [];
                const hasAssets = assets.length > 0;
                
                return (
                  <button
                    key={category}
                    className={`dl-art-panel__category-card ${hasAssets ? '' : 'is-empty'}`}
                    onClick={() => setCurrentCategory(category)}
                    disabled={!hasAssets}
                    type="button"
                  >
                    <div className="dl-art-panel__category-icon">
                      {hasAssets && assets[0]?.thumbnailUrl ? (
                        <img
                          src={assets[0].thumbnailUrl}
                          alt={category}
                          onError={(e) => {
                            // 如果缩略图加载失败，显示占位符
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span>🎨</span>
                      )}
                    </div>
                    <div className="dl-art-panel__category-name">{category}</div>
                    {hasAssets && (
                      <div className="dl-art-panel__category-count">{assets.length} items</div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // [2025-01-30 18:00:00] 显示分类下的素材列表
  const categoryAssets = artAssets[currentCategory] || [];

  return (
    <div className="dl-art-panel">
      <div className="dl-art-panel__header">
        <button
          className="dl-art-panel__back-btn"
          onClick={() => setCurrentCategory(null)}
          type="button"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Categories
        </button>
        <h3 className="dl-art-panel__category-title">{currentCategory}</h3>
      </div>

      <div className="dl-art-panel__assets">
        {loading && <p className="dl-art-panel__loading">Loading assets...</p>}
        {error && <p className="dl-art-panel__error">{error}</p>}
        {!loading && !error && (
          <>
            {categoryAssets.length === 0 ? (
              <p className="dl-art-panel__empty">No assets in this category</p>
            ) : (
              <div className="dl-art-panel__assets-grid">
                {categoryAssets.map(asset => (
                  <button
                    key={asset.id}
                    className="dl-art-panel__asset-item"
                    onClick={() => onSelectArt(asset.imageUrl, asset.name)}
                    type="button"
                    title={asset.name}
                  >
                    {asset.thumbnailUrl ? (
                      <img
                        src={asset.thumbnailUrl}
                        alt={asset.name}
                        onError={(e) => {
                          // 如果缩略图加载失败，使用主图
                          const img = e.target as HTMLImageElement;
                          if (asset.imageUrl) {
                            img.src = asset.imageUrl;
                          }
                        }}
                      />
                    ) : asset.imageUrl ? (
                      <img src={asset.imageUrl} alt={asset.name} />
                    ) : (
                      <div className="dl-art-panel__asset-placeholder">🎨</div>
                    )}
                    <div className="dl-art-panel__asset-name">{asset.name}</div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ArtPanel;

