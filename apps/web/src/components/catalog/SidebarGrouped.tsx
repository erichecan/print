/**
 * SidebarGrouped Component - 分组类目导航
 * [2025-12-11 23:05:00] 实现分组结构、折叠/展开、选中态、精确计数显示
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import useSWR from 'swr';
import { API_BASE_URL } from '@/lib/api-config';
import styles from './SidebarGrouped.module.css';

interface CategoryChild {
  id: string;
  name: string;
  slug: string;
  count: number;
}

interface CategoryGroup {
  id: string;
  name: string;
  slug: string;
  children: CategoryChild[];
}

interface SidebarGroupedProps {
  selected?: {
    groupSlug?: string;
    childSlug?: string;
  };
  onSelect?: (child: { groupSlug: string; childSlug: string }) => void;
}

// [2025-12-19 02:00:00] 改进 fetcher：提供更详细的错误信息
const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' })
    .then((r) => {
      if (!r.ok) {
        // [2025-12-19 02:00:00] 提供更详细的错误信息，包括状态码和状态文本
        const error = new Error(`API请求失败: ${r.status} ${r.statusText || ''}`);
        (error as any).status = r.status;
        (error as any).statusText = r.statusText;
        throw error;
      }
      return r.json();
    })
    .then((data) => {
      // [2025-12-19 02:00:00] 验证返回数据格式
      if (!data || typeof data !== 'object') {
        console.warn('[SidebarGrouped] API返回数据格式异常:', data);
        return [];
      }
      return data.groups || [];
    })
    .catch((err) => {
      // [2025-12-19 02:00:00] 记录详细错误信息用于调试
      console.error('[SidebarGrouped] Fetcher错误:', {
        url,
        error: err.message,
        status: (err as any).status,
        statusText: (err as any).statusText,
      });
      throw err;
    });

export function SidebarGrouped({ selected, onSelect }: SidebarGroupedProps) {
  const pathname = usePathname();
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // [2025-12-11 23:05:00] 从 API 获取分组分类数据
  const { data: groups, error, isLoading } = useSWR<CategoryGroup[]>(
    `${API_BASE_URL}/categories/tree-with-counts?strategy=direct`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // 缓存 60 秒
    }
  );

  // [2025-12-11 23:05:00] 从 URL 解析选中状态
  useEffect(() => {
    // URL 格式：/catalog/[group]/[child] 或 /products?category=xxx
    const pathParts = pathname.split('/').filter(Boolean);
    if (pathParts[0] === 'catalog' && pathParts.length >= 3) {
      const groupSlug = pathParts[1];
      const childSlug = pathParts[2];
      if (onSelect) {
        onSelect({ groupSlug, childSlug });
      }
    }
  }, [pathname, onSelect]);

  // [2025-12-11 23:05:00] 切换分组折叠/展开
  const toggleGroup = (groupSlug: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupSlug)) {
        next.delete(groupSlug);
      } else {
        next.add(groupSlug);
      }
      return next;
    });
  };

  // [2025-12-11 23:05:00] 构建分类链接 URL
  // [2025-12-11 23:10:00] 支持一级分类（group）和二级分类（child）链接
  const buildCategoryUrl = (groupSlug: string, childSlug?: string) => {
    if (childSlug) {
      return `/catalog/${groupSlug}/${childSlug}`;
    }
    return `/catalog/${groupSlug}`;
  };

  // [2025-12-19 02:00:00] 改进错误处理：区分加载中、API错误和空数据三种状态
  if (isLoading) {
    return (
      <aside className={styles.sidebar} data-testid="sidebar-grouped">
        <div className={styles.loading}>加载分类中...</div>
      </aside>
    );
  }

  // [2025-12-19 02:00:00] 区分API错误和空数据
  if (error) {
    const apiUrl = `${API_BASE_URL}/categories/tree-with-counts?strategy=direct`;
    const errorStatus = (error as any).status;
    const errorStatusText = (error as any).statusText || '';
    
    // [2025-12-19 02:00:00] 记录错误到控制台
    console.error('[SidebarGrouped] API调用失败:', {
      url: apiUrl,
      error: error.message,
      status: errorStatus,
      statusText: errorStatusText,
    });

    return (
      <aside className={styles.sidebar} data-testid="sidebar-grouped">
        <div className={styles.error}>
          <div>无法加载分类</div>
          {process.env.NODE_ENV === 'development' && (
            <div style={{ 
              fontSize: '12px', 
              marginTop: '8px', 
              color: '#9ca3af',
              lineHeight: '1.5',
            }}>
              <div>错误: {error.message}</div>
              {errorStatus && <div>状态码: {errorStatus} {errorStatusText}</div>}
              <div style={{ marginTop: '4px', wordBreak: 'break-all' }}>
                API: {apiUrl}
              </div>
            </div>
          )}
        </div>
      </aside>
    );
  }

  // [2025-12-19 02:00:00] 空数据情况：可能是数据库中没有分类数据，或所有分类都被过滤掉了
  if (!groups || groups.length === 0) {
    console.warn('[SidebarGrouped] 分类数据为空，可能是数据库中没有分类数据或所有分类都被过滤');
    return (
      <aside className={styles.sidebar} data-testid="sidebar-grouped">
        <div className={styles.error}>
          暂无分类数据
          {process.env.NODE_ENV === 'development' && (
            <div style={{ 
              fontSize: '12px', 
              marginTop: '8px', 
              color: '#9ca3af' 
            }}>
              提示: 请检查数据库中是否有分类数据，或检查分类过滤逻辑
            </div>
          )}
        </div>
      </aside>
    );
  }

  return (
    <aside className={styles.sidebar} data-testid="sidebar-grouped">
      <h2 className={styles.title}>分类</h2>
      <nav className={styles.nav} aria-label="商品分类导航">
        {groups.map((group) => {
          const isCollapsed = collapsedGroups.has(group.slug);
          const visibleChildren = isCollapsed
            ? group.children.slice(0, 6)
            : group.children;
          const hasMore = group.children.length > 6;

          return (
            <section key={group.id} className={styles.group}>
              {/* [2025-12-11 23:10:00] 一级分类标题可点击，跳转到分组页面 */}
              <Link
                href={buildCategoryUrl(group.slug)}
                className={styles.groupTitleLink}
                data-testid={`group-${group.slug}`}
              >
                <h3 className={styles.groupTitle}>{group.name}</h3>
              </Link>
              <ul className={styles.childList}>
                {visibleChildren.map((child) => {
                  const isActive =
                    selected?.groupSlug === group.slug &&
                    selected?.childSlug === child.slug;

                  return (
                    <li key={child.id}>
                      <Link
                        href={buildCategoryUrl(group.slug, child.slug)}
                        className={`${styles.child} ${isActive ? styles.active : ''}`}
                        data-testid={`cat-${group.slug}-${child.slug}`}
                        data-count={child.count}
                        aria-selected={isActive}
                        onClick={() => {
                          if (onSelect) {
                            onSelect({ groupSlug: group.slug, childSlug: child.slug });
                          }
                        }}
                      >
                        <span className={styles.childName}>{child.name}</span>
                        <span className={styles.childCount}>({child.count})</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {hasMore && (
                <button
                  type="button"
                  className={styles.showMore}
                  onClick={() => toggleGroup(group.slug)}
                  data-testid={`show-more-${group.slug}`}
                  aria-expanded={!isCollapsed}
                >
                  {isCollapsed ? 'Show more' : 'Show less'}
                </button>
              )}
            </section>
          );
        })}
      </nav>
    </aside>
  );
}
