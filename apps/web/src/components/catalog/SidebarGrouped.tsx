/**
 * SidebarGrouped Component - 分组类目导航
* 实现分组结构、折叠/展开、选中态、精确计数显示
* Refactored to use '/products/filters/options' API for consistent data and matched UI to reference.
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
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

// Reuse fetcher to be consistent
const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => {
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
});

export function SidebarGrouped({ selected, onSelect }: SidebarGroupedProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
// Fixed possible null searchParams
  const search = searchParams?.get('search') || '';
  const collection = searchParams?.get('collection') || ''; // Support collection filter if needed

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

// Switch to the robust filters API which already aggregates product data
  // passing collection/search to get accurate counts
  const apiUrl = `${API_BASE_URL}/products/filters/options?collection=${collection}&search=${search}`;

  const { data: filterOptions, error, isLoading } = useSWR(
    apiUrl,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

// Transform filter options categories into Group structure
  // The API returns a flat list or tree depending on backend, but DynamicFilters expected a tree.
  // Let's assume filterOptions.categories is the array of categories.
  const groups: CategoryGroup[] = (() => {
    if (!filterOptions || !filterOptions.categories) return [];

    const rawCategories: any[] = filterOptions.categories;

// Fix: Identify all child categories to avoid rendering them as top-level duplicates
    const childIds = new Set<string>();
    rawCategories.forEach(cat => {
      if (cat.children && Array.isArray(cat.children)) {
        cat.children.forEach((child: any) => childIds.add(child.id));
      }
    });

    return rawCategories
      // Filter out categories that are children of others (they will appear nested)
      .filter(cat => !childIds.has(cat.id))
      .map(cat => {
        const hasChildren = cat.children && Array.isArray(cat.children) && cat.children.length > 0;

        // If category has children, render them. If not (flat category like Mugs), render itself as the only option.
        const children = hasChildren
          ? cat.children.map((child: any) => ({
            id: child.id,
            name: child.name,
            slug: child.slug,
            count: child.count || 0
          }))
          : [{
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            count: cat.count || 0
          }];

        return {
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          children
        };
      });
  })();

// 从 URL 解析选中状态
  useEffect(() => {
    // Legacy support for onSelect callback if used
    if (onSelect) {
      // Logic to trigger onSelect if needed based on URL, or remove if unused.
      // For now, minimizing side effects.
    }
  }, [pathname, onSelect]);

// 切换分组折叠/展开
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

  const isCategoryActive = (slug: string) => {
    // Check if this category is currently active in searchParams or path
    // For query param: ?category=slug or ?collection=slug
    const activeCategory = searchParams?.get('category') || searchParams?.get('collection');
    return activeCategory === slug;
  };

  if (isLoading) {
    return null; // Or a subtle skeleton
  }

  // If no data, render nothing instead of "No Data" error
  if (!groups || groups.length === 0) {
    return null;
  }

  return (
    <aside className={styles.sidebar} data-testid="sidebar-grouped">
      <nav className={styles.nav} aria-label="Product Categories">
        {groups.map((group) => {
          // Default to expanded unless specifically collapsed? 
          // Or default collapsed? Let's default to expanded for the first group or active group.
          const isCollapsed = collapsedGroups.has(group.slug);

          // Show all children by default or limit? User image shows "Show more"
          const limit = 6;
          const showAll = !isCollapsed; // Reusing state slightly differently: collapsed = "show less" (limited)
          // Actually let's flip it: isCollapsed set -> hidden completely? 
          // No, the design usually is: Main Header (Group) -> List.
          // Let's assume the user wants the list visible.

          // Logic: "Show more" expands the list if > limit.
          // We'll use a separate state or just `collapsedGroups` to mean "Expanded past limit".
          const isExpanded = collapsedGroups.has(group.slug); // Using set to track "Expanded" state

          const visibleChildren = isExpanded
            ? group.children
            : group.children.slice(0, limit);

          const hasMore = group.children.length > limit;

          return (
            <section key={group.id} className={styles.group}>
              {/* Group Title - Main Heading Style */}
              <h3 className={styles.groupTitle}>{group.name}</h3>

              <ul className={styles.childList}>
                {/* Add "All [Group Name]" option? Optional but common */}
                {visibleChildren.map((child) => {
                  const isActive = isCategoryActive(child.slug);

                  return (
                    <li key={child.id}>
                      <Link
                        href={`/products?category=${child.slug}`}
                        className={`${styles.child} ${isActive ? styles.active : ''}`}
                        onClick={() => {
                          if (onSelect) {
                            onSelect({ groupSlug: group.slug, childSlug: child.slug });
                          }
                        }}
                      >
                        <span className={styles.childName}>{child.name}</span>
                        {/* Remove count if user wants clean look, or keep lightly */}
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
                >
                  {isExpanded ? (
                    <>Show less <span style={{ fontSize: '10px', marginLeft: '4px' }}>▲</span></>
                  ) : (
                    <>Show more <span style={{ fontSize: '10px', marginLeft: '4px' }}>▼</span></>
                  )}
                </button>
              )}
            </section>
          );
        })}
      </nav>
    </aside>
  );
}
