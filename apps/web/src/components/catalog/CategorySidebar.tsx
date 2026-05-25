/**
 * Category Sidebar Component
* 树状分类导航组件（参考 Custom Ink 左侧导航）
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { API_BASE_URL } from '@/lib/api-config';

interface CategoryTreeNode {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  parentId?: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
  children?: CategoryTreeNode[];
}

interface CategorySidebarProps {
  currentCategorySlug?: string;
}

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' })
    .then((r) => {
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json();
    })
    .then((data) => data.data || data);

export function CategorySidebar({ currentCategorySlug }: CategorySidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

// 从 API 获取树状分类
  const { data: categoryTree, error, isLoading } = useSWR<CategoryTreeNode[]>(
    `${API_BASE_URL}/categories/tree`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

// 自动展开当前分类的父级
  useEffect(() => {
    if (categoryTree && currentCategorySlug) {
      const findCategoryPath = (
        tree: CategoryTreeNode[],
        slug: string,
        path: string[] = []
      ): string[] | null => {
        for (const node of tree) {
          const newPath = [...path, node.slug];
          if (node.slug === slug) {
            return newPath;
          }
          if (node.children) {
            const found = findCategoryPath(node.children, slug, newPath);
            if (found) return found;
          }
        }
        return null;
      };

      const path = findCategoryPath(categoryTree, currentCategorySlug);
      if (path) {
        // 展开路径上的所有父级
        const expanded = new Set<string>();
        for (let i = 0; i < path.length - 1; i++) {
          expanded.add(path[i]);
        }
        setExpandedCategories(expanded);
      }
    }
  }, [categoryTree, currentCategorySlug]);

// 切换分类展开/收起
  const toggleCategory = (slug: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  };

// 构建分类链接 URL
  const buildCategoryUrl = (slug: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('category', slug);
    params.delete('page'); // 切换分类时重置页码
    return `/products?${params.toString()}`;
  };

// 过滤：只显示有产品的分类（含子类）
  const filterCategoriesWithProducts = (node: CategoryTreeNode): CategoryTreeNode | null => {
    // 如果当前分类有产品，保留
    if (node.productCount > 0) {
      // 过滤子分类，只保留有产品的子分类
      const filteredChildren = node.children
        ?.map((child) => filterCategoriesWithProducts(child))
        .filter((child): child is CategoryTreeNode => child !== null) || [];

      return {
        ...node,
        children: filteredChildren.length > 0 ? filteredChildren : undefined,
      };
    }
    // 如果当前分类没有产品，但子分类有产品，保留当前分类（显示一级类目）
    if (node.children && node.children.length > 0) {
      const filteredChildren = node.children
        .map((child) => filterCategoriesWithProducts(child))
        .filter((child): child is CategoryTreeNode => child !== null);

      if (filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren,
        };
      }
    }
    // 既没有产品也没有有产品的子分类，不显示
    return null;
  };

// 渲染分类节点
  const renderCategoryNode = (node: CategoryTreeNode, level: number = 0): JSX.Element | null => {
// 只渲染有产品的分类
    if (node.productCount === 0 && (!node.children || node.children.length === 0)) {
      return null;
    }

    const isExpanded = expandedCategories.has(node.slug);
    const hasChildren = node.children && node.children.length > 0;
    const isActive = currentCategorySlug === node.slug;
    const indent = level * 16;

    return (
      <div key={node.id} className="category-node">
        <div
          className={`category-item ${isActive ? 'is-active' : ''}`}
          style={{ paddingLeft: `${indent + 12}px` }}
        >
          {hasChildren ? (
            <button
              type="button"
              className="category-toggle"
              onClick={() => toggleCategory(node.slug)}
              aria-expanded={isExpanded}
              aria-label={`${isExpanded ? '收起' : '展开'} ${node.name}`}
            >
              <span className="category-toggle-icon">{isExpanded ? '▼' : '▶'}</span>
            </button>
          ) : (
            <span className="category-toggle-spacer" />
          )}

          <Link
            href={buildCategoryUrl(node.slug)}
            className="category-link"
            data-testid={`cat-${node.slug}`}
            data-count={node.productCount}
          >
            <span className="category-name">{node.name}</span>
            <span className="category-count">({node.productCount})</span>
          </Link>
        </div>

        {hasChildren && isExpanded && (
          <div className="category-children">
            {node.children!
              .map((child) => renderCategoryNode(child, level + 1))
              .filter((node): node is JSX.Element => node !== null)}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <aside className="category-sidebar" data-testid="category-sidebar">
        <div className="category-sidebar-loading">加载分类中...</div>
      </aside>
    );
  }

  if (error || !categoryTree || categoryTree.length === 0) {
    return (
      <aside className="category-sidebar" data-testid="category-sidebar">
        <div className="category-sidebar-error">无法加载分类</div>
      </aside>
    );
  }

// 过滤分类树：只显示有产品的分类
  const filteredCategoryTree = categoryTree
    .map((category) => filterCategoriesWithProducts(category))
    .filter((category): category is CategoryTreeNode => category !== null);

  return (
    <aside className="category-sidebar" data-testid="category-sidebar">
      <h2 className="category-sidebar-title">分类</h2>
      <nav className="category-nav" aria-label="商品分类导航">
        {filteredCategoryTree.map((category) => renderCategoryNode(category, 0)).filter((node): node is JSX.Element => node !== null)}
      </nav>

      <style jsx>{`
        .category-sidebar {
          width: 240px;
          padding: 24px 0;
          background: #ffffff;
          border-right: 1px solid #e5e7eb;
        }

        .category-sidebar-title {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 16px 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #e5e7eb;
        }

        .category-nav {
          display: flex;
          flex-direction: column;
        }

        .category-node {
          display: flex;
          flex-direction: column;
        }

        .category-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          transition: background-color 0.2s;
        }

        .category-item:hover {
          background-color: #f9fafb;
        }

        .category-item.is-active {
          background-color: #eff6ff;
        }

        .category-item.is-active .category-link {
          color: #B40C1C;
          font-weight: 600;
        }

        .category-toggle {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          border: none;
          background: transparent;
          cursor: pointer;
          padding: 0;
          color: #6b7280;
          transition: color 0.2s;
        }

        .category-toggle:hover {
          color: #374151;
        }

        .category-toggle-icon {
          font-size: 10px;
          line-height: 1;
        }

        .category-toggle-spacer {
          width: 20px;
          height: 20px;
        }

        .category-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex: 1;
          text-decoration: none;
          color: #374151;
          font-size: 14px;
          transition: color 0.2s;
        }

        .category-link:hover {
          color: #1f2937;
        }

        .category-name {
          flex: 1;
        }

        .category-count {
          color: #9ca3af;
          font-size: 12px;
          margin-left: 8px;
        }

        .category-children {
          display: flex;
          flex-direction: column;
        }

        .category-sidebar-loading,
        .category-sidebar-error {
          padding: 16px;
          text-align: center;
          color: #6b7280;
          font-size: 14px;
        }

        .category-sidebar-error {
          color: #ef4444;
        }

        @media (max-width: 768px) {
          .category-sidebar {
            width: 100%;
            border-right: none;
            border-bottom: 1px solid #e5e7eb;
          }
        }
      `}</style>
    </aside>
  );
}
