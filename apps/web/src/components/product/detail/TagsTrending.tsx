/**
 * TagsTrending Component - Redbubble Style
 * [2025-11-19 09:22:00] 参考图一：搜索条 + 主题词 Chips + Tag 云 + Trending topics
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './TagsTrending.module.css';

interface TagsTrendingProps {
  tags: string[];
  trending: string[];
  onSearch?: (query: string) => void;
}

export function TagsTrending({ tags, trending, onSearch }: TagsTrendingProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  return (
    <section className={styles.tagsTrending} aria-label="Search and trending topics">
      {/* [2025-11-19 09:22:00] 参考图一位置：搜索条 */}
      <div className={styles.tagsTrendingSearch}>
        <form onSubmit={handleSearch} className={styles.tagsTrendingSearchForm}>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Looking for something"
            className={styles.tagsTrendingSearchInput}
            aria-label="Search for products"
          />
          <button type="submit" className={styles.tagsTrendingSearchButton} aria-label="Search">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </button>
        </form>
      </div>

      {/* [2025-11-19 09:22:00] 参考图一位置：主题词 Chips */}
      <div className={styles.tagsTrendingTags}>
        {tags.map((tag, index) => (
          <Link
            key={index}
            href={`/products?search=${encodeURIComponent(tag)}`}
            className={styles.tagsTrendingTag}
          >
            {tag}
          </Link>
        ))}
      </div>

      {/* [2025-11-19 09:22:00] 参考图一位置：Trending topics */}
      {trending.length > 0 && (
        <div className={styles.tagsTrendingTrending}>
          <h3 className={styles.tagsTrendingTrendingTitle}>Trending topics</h3>
          <div className={styles.tagsTrendingTrendingList}>
            {trending.map((topic, index) => (
              <Link
                key={index}
                href={`/products?search=${encodeURIComponent(topic)}`}
                className={styles.tagsTrendingTrendingItem}
              >
                {topic}
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

