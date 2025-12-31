/**
 * Art Panel - 艺术素材面板
* 实现 Artwork Categories 界面
* 优化大类网格 UI，调整为 3 列布局，对齐 Custom Ink 设计
* 重构：使用新的 artworks API，支持分类树、分页、搜索
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { artworksApi, type Artwork, type CategoryNode } from '@/lib/api';

// CORS 修复：将 GCS URL 转换为代理 URL
const getProxyUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
// 如果是 GCS URL，使用图片代理
  if (url.includes('storage.googleapis.com') || url.includes('.storage.googleapis.com')) {
    return `/api/image-proxy?src=${encodeURIComponent(url)}`;
  }
  return url;
};

interface ArtPanelProps {
  onSelectArt: (artUrl: string, artName: string) => void;
}

const ArtPanel: React.FC<ArtPanelProps> = ({ onSelectArt }) => {
  const [categoriesTree, setCategoriesTree] = useState<CategoryNode[]>([]);
  const [currentTopCategory, setCurrentTopCategory] = useState<CategoryNode | null>(null);
  const [currentSubcategory, setCurrentSubcategory] = useState<{ id: string; name: string; slug: string; count: number } | null>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 48;

// 加载分类树
  useEffect(() => {
    const loadCategoriesTree = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await artworksApi.getCategoriesTree();
        if (response.success && response.data) {
          setCategoriesTree(response.data);
        }
      } catch (err) {
        console.error('[ArtPanel] Error loading categories tree:', err);
        setError('Failed to load categories');
      } finally {
        setLoading(false);
      }
    };

    loadCategoriesTree();
  }, []);

// 加载艺术作品
  const loadArtworks = useCallback(async (topSlug?: string, subSlug?: string, query?: string, pageNum = 1) => {
    try {
      setLoading(true);
      setError(null);
      const response = await artworksApi.getArtworks({
        top: topSlug,
        sub: subSlug,
        query: query || undefined,
        page: pageNum,
        pageSize,
      });
      if (response.success && response.data) {
        setArtworks(response.data);
        setTotalPages(response.pagination.totalPages);
        setPage(response.pagination.page);
      }
    } catch (err) {
      console.error('[ArtPanel] Error loading artworks:', err);
      setError('Failed to load artworks');
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

// 当选择分类或搜索时加载素材
  useEffect(() => {
    if (currentTopCategory) {
      loadArtworks(
        currentTopCategory.slug,
        currentSubcategory?.slug,
        searchQuery || undefined,
        1
      );
    }
  }, [currentTopCategory, currentSubcategory, searchQuery, loadArtworks]);

// 显示分类网格（一级分类）
  if (!currentTopCategory) {
    return (
      <div className="dl-art-panel">
        <div className="dl-art-panel__header">
          <h2 className="dl-art-panel__title">Artwork Categories</h2>
{/* 搜索框 */}
          <div className="dl-art-panel__search">
            <input
              type="text"
              className="dl-art-panel__search-input"
              placeholder="Search For Artwork"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
// 如果有搜索词，直接加载搜索结果
                if (e.target.value.trim()) {
                  loadArtworks(undefined, undefined, e.target.value, 1);
                  setCurrentTopCategory({ id: '', name: 'Search Results', slug: 'search', count: 0, children: [] });
                } else {
                  setCurrentTopCategory(null);
                }
              }}
              data-testid="art-search-input"
            />
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="dl-art-panel__search-icon">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </div>
        </div>
        <div className="dl-art-panel__categories">
          {loading && <p className="dl-art-panel__loading">Loading categories...</p>}
          {error && <p className="dl-art-panel__error">{error}</p>}
          {!loading && !error && (
            <div className="dl-art-panel__grid">
              {categoriesTree.map(category => (
                <button
                  key={category.id}
                  className={`dl-art-panel__category-card ${category.count > 0 ? '' : 'is-empty'}`}
                  onClick={() => setCurrentTopCategory(category)}
                  disabled={category.count === 0}
                  type="button"
                  data-testid={`art-category-${category.slug}`}
                >
                  <div className="dl-art-panel__category-icon">
                    <span>🎨</span>
                  </div>
                  <div className="dl-art-panel__category-name">{category.name}</div>
                  {category.count > 0 && (
                    <div className="dl-art-panel__category-count">{category.count} items</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

// 显示分类下的素材列表
  const subcategories = currentTopCategory.children || [];

  return (
    <div className="dl-art-panel">
      <div className="dl-art-panel__header">
        <button
          className="dl-art-panel__back-btn"
          onClick={() => {
            setCurrentTopCategory(null);
            setCurrentSubcategory(null);
            setSearchQuery('');
            setArtworks([]);
          }}
          type="button"
          data-testid="art-back-button"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Categories
        </button>
        <h3 className="dl-art-panel__category-title">{currentTopCategory.name}</h3>
{/* 分类页面也显示搜索框 */}
        <div className="dl-art-panel__search">
          <input
            type="text"
            className="dl-art-panel__search-input"
            placeholder="Search For Artwork"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              loadArtworks(currentTopCategory.slug, currentSubcategory?.slug, e.target.value || undefined, 1);
            }}
            data-testid="art-search-input"
          />
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="dl-art-panel__search-icon">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </div>
      </div>

{/* 子分类导航 */}
      {subcategories.length > 0 && (
        <div className="dl-art-panel__subcategories">
          <button
            className={`dl-art-panel__subcategory-btn ${!currentSubcategory ? 'is-active' : ''}`}
            onClick={() => {
              setCurrentSubcategory(null);
              loadArtworks(currentTopCategory.slug, undefined, searchQuery || undefined, 1);
            }}
            type="button"
            data-testid="art-subcategory-view-all"
          >
            View All
          </button>
          {subcategories.map(subcategory => (
            <button
              key={subcategory.id}
              className={`dl-art-panel__subcategory-btn ${currentSubcategory?.id === subcategory.id ? 'is-active' : ''}`}
              onClick={() => {
                setCurrentSubcategory(subcategory);
                loadArtworks(currentTopCategory.slug, subcategory.slug, searchQuery || undefined, 1);
              }}
              type="button"
              data-testid={`art-subcategory-${subcategory.slug}`}
            >
              {subcategory.name} ({subcategory.count})
            </button>
          ))}
        </div>
      )}

      <div className="dl-art-panel__assets">
        {loading && <p className="dl-art-panel__loading">Loading assets...</p>}
        {error && <p className="dl-art-panel__error">{error}</p>}
        {!loading && !error && (
          <>
            {artworks.length === 0 ? (
              <p className="dl-art-panel__empty">No assets in this category</p>
            ) : (
              <>
                <div className="dl-art-panel__assets-grid">
                  {artworks.map(artwork => (
                    <button
                      key={artwork.id}
                      className="dl-art-panel__asset-item"
                      onClick={() => onSelectArt(artwork.imageUrl, artwork.title)}
                      type="button"
                      title={artwork.title}
                      data-testid={`artwork-${artwork.slug}`}
                    >
                      {(() => {
// CORS 修复：使用代理 URL
                        const thumbnailUrl = getProxyUrl(artwork.thumbnailUrl);
                        const imageUrl = getProxyUrl(artwork.imageUrl);

                        if (thumbnailUrl) {
                          return (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={thumbnailUrl}
                              alt={artwork.title}
                              loading="lazy"
                              onError={(e) => {
                                const img = e.target as HTMLImageElement;
                                if (imageUrl) {
                                  img.src = imageUrl;
                                }
                              }}
                            />
                          );
                        } else if (imageUrl) {
                          // eslint-disable-next-line @next/next/no-img-element
                          return <img src={imageUrl} alt={artwork.title} loading="lazy" />;
                        } else {
                          return <div className="dl-art-panel__asset-placeholder">🎨</div>;
                        }
                      })()}
                      <div className="dl-art-panel__asset-name">{artwork.title}</div>
                    </button>
                  ))}
                </div>
{/* 分页控件 */}
                {totalPages > 1 && (
                  <div className="dl-art-panel__pagination">
                    <button
                      onClick={() => {
                        const newPage = page - 1;
                        if (newPage >= 1) {
                          loadArtworks(currentTopCategory.slug, currentSubcategory?.slug, searchQuery || undefined, newPage);
                        }
                      }}
                      disabled={page <= 1}
                      type="button"
                    >
                      Previous
                    </button>
                    <span>Page {page} of {totalPages}</span>
                    <button
                      onClick={() => {
                        const newPage = page + 1;
                        if (newPage <= totalPages) {
                          loadArtworks(currentTopCategory.slug, currentSubcategory?.slug, searchQuery || undefined, newPage);
                        }
                      }}
                      disabled={page >= totalPages}
                      type="button"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ArtPanel;
