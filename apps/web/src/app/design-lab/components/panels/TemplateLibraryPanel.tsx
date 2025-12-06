/**
 * Template Library Panel - 设计模板库面板
 * [2025-12-06 12:30:00] 显示设计模板库，允许用户浏览和应用模板
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { templateApi, DesignTemplate } from '@/lib/api';
import './TemplateLibraryPanel.css';

interface TemplateLibraryPanelProps {
  onApplyTemplate?: (template: DesignTemplate) => void;
  onClose?: () => void;
}

const TemplateLibraryPanel: React.FC<TemplateLibraryPanelProps> = ({
  onApplyTemplate,
  onClose
}) => {
  const [templates, setTemplates] = useState<DesignTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);

  // 模板分类列表
  const categories = [
    { value: null, label: 'All Categories' },
    { value: 'birthday', label: 'Birthday' },
    { value: 'wedding', label: 'Wedding' },
    { value: 'business', label: 'Business' },
    { value: 'sports', label: 'Sports' },
    { value: 'holiday', label: 'Holiday' },
    { value: 'graduation', label: 'Graduation' },
    { value: 'anniversary', label: 'Anniversary' },
  ];

  // 加载模板列表
  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await templateApi.list({
        category: selectedCategory || undefined,
        search: searchQuery || undefined,
        featured: showFeaturedOnly || undefined,
        limit: 50,
      });
      
      if (response.success && response.data) {
        setTemplates(response.data.data || []);
      } else {
        setError('Failed to load templates');
      }
    } catch (err) {
      console.error('[TemplateLibraryPanel] Error loading templates:', err);
      setError('Failed to load templates. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery, showFeaturedOnly]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // 应用模板
  const handleApplyTemplate = useCallback((template: DesignTemplate) => {
    if (onApplyTemplate) {
      onApplyTemplate(template);
    }
  }, [onApplyTemplate]);

  return (
    <div className="dl-template-library-panel">
      <div className="dl-template-library-panel__header">
        <h2 className="dl-template-library-panel__title">Design Templates</h2>
        {onClose && (
          <button
            className="dl-template-library-panel__close"
            onClick={onClose}
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* 搜索和筛选 */}
      <div className="dl-template-library-panel__filters">
        <div className="dl-template-library-panel__search">
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="dl-template-library-panel__search-input"
          />
        </div>
        
        <div className="dl-template-library-panel__category-filter">
          <select
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value || null)}
            className="dl-template-library-panel__category-select"
          >
            {categories.map((cat) => (
              <option key={cat.value || 'all'} value={cat.value || ''}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <label className="dl-template-library-panel__featured-toggle">
          <input
            type="checkbox"
            checked={showFeaturedOnly}
            onChange={(e) => setShowFeaturedOnly(e.target.checked)}
          />
          <span>Featured Only</span>
        </label>
      </div>

      {/* 模板列表 */}
      <div className="dl-template-library-panel__content">
        {loading && (
          <div className="dl-template-library-panel__loading">
            <p>Loading templates...</p>
          </div>
        )}

        {error && (
          <div className="dl-template-library-panel__error">
            <p>{error}</p>
            <button onClick={loadTemplates}>Retry</button>
          </div>
        )}

        {!loading && !error && templates.length === 0 && (
          <div className="dl-template-library-panel__empty">
            <p>No templates found. Try adjusting your filters.</p>
          </div>
        )}

        {!loading && !error && templates.length > 0 && (
          <div className="dl-template-library-panel__grid">
            {templates.map((template) => (
              <div
                key={template.id}
                className="dl-template-library-panel__item"
                onClick={() => handleApplyTemplate(template)}
              >
                {template.thumbnailUrl ? (
                  <img
                    src={template.thumbnailUrl}
                    alt={template.name}
                    className="dl-template-library-panel__thumbnail"
                  />
                ) : (
                  <div className="dl-template-library-panel__thumbnail-placeholder">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                )}
                
                <div className="dl-template-library-panel__item-info">
                  <h3 className="dl-template-library-panel__item-name">{template.name}</h3>
                  {template.description && (
                    <p className="dl-template-library-panel__item-description">
                      {template.description}
                    </p>
                  )}
                  <div className="dl-template-library-panel__item-meta">
                    {template.isFeatured && (
                      <span className="dl-template-library-panel__badge">Featured</span>
                    )}
                    <span className="dl-template-library-panel__usage">
                      {template.usageCount} uses
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateLibraryPanel;

