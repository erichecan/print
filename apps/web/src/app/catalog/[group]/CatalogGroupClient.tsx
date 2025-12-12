/**
 * Catalog Group Client Component
 * [2025-12-11 23:10:00] 客户端组件：处理分组商品列表数据加载与展示
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { API_BASE_URL } from '@/lib/api-config';
import useSWR from 'swr';

interface Product {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  images?: Array<{ url: string; alt?: string }>;
  category?: {
    name: string;
    slug: string;
  };
}

interface CatalogGroupClientProps {
  groupSlug: string;
}

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' })
    .then((r) => {
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json();
    })
    .then((data) => data.data || data);

export function CatalogGroupClient({ groupSlug }: CatalogGroupClientProps) {
  const [groupInfo, setGroupInfo] = useState<{ name: string; description?: string } | null>(null);

  // [2025-12-11 23:10:00] 获取分组信息（从 tree-with-counts API）
  useEffect(() => {
    fetch(`${API_BASE_URL}/categories/tree-with-counts`)
      .then((r) => r.json())
      .then((data) => {
        const group = data.groups?.find((g: any) => g.slug === groupSlug);
        if (group) {
          setGroupInfo({ name: group.name });
        }
      })
      .catch(() => {
        // 如果 API 失败，使用 slug 生成名称
        setGroupInfo({
          name: groupSlug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        });
      });
  }, [groupSlug]);

  // [2025-12-11 23:10:00] 获取该分组下所有子分类的产品列表
  // 通过获取所有子分类的 ID，然后查询这些分类下的产品
  const { data: productsData, error, isLoading } = useSWR<{
    data: Product[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>(
    `${API_BASE_URL}/categories/tree-with-counts?strategy=direct`,
    async (url) => {
      const treeResponse = await fetch(url, { credentials: 'include' });
      const treeData = await treeResponse.json();
      const group = treeData.groups?.find((g: any) => g.slug === groupSlug);
      
      if (!group || !group.children || group.children.length === 0) {
        return { data: [], pagination: { page: 1, limit: 24, total: 0, totalPages: 0 } };
      }

      // 获取所有子分类的 slug
      const childSlugs = group.children.map((child: any) => child.slug);
      
      // 获取所有子分类的产品（合并）
      const allProducts: Product[] = [];
      for (const childSlug of childSlugs) {
        try {
          const response = await fetch(`${API_BASE_URL}/categories/${childSlug}/products?page=1&limit=100`, {
            credentials: 'include',
          });
          const childData = await response.json();
          if (childData.data && Array.isArray(childData.data)) {
            // 去重（基于 product id）
            const existingIds = new Set(allProducts.map(p => p.id));
            childData.data.forEach((product: Product) => {
              if (!existingIds.has(product.id)) {
                allProducts.push(product);
              }
            });
          }
        } catch (err) {
          console.error(`Failed to fetch products for ${childSlug}:`, err);
        }
      }

      return {
        data: allProducts.slice(0, 24), // 限制显示前 24 个
        pagination: {
          page: 1,
          limit: 24,
          total: allProducts.length,
          totalPages: Math.ceil(allProducts.length / 24),
        },
      };
    },
    {
      revalidateOnFocus: false,
    }
  );

  const products = productsData?.data || [];
  const pagination = productsData?.pagination;

  return (
    <>
      {/* 面包屑导航 */}
      <nav className="breadcrumb-nav">
        <ol>
          <li><Link href="/products">All Products</Link></li>
          <li>›</li>
          <li>{groupInfo?.name || groupSlug}</li>
        </ol>
      </nav>

      {/* 页面标题 */}
      <h1 className="plp-new__title">
        {groupInfo?.name || groupSlug.replace(/-/g, ' ')}
      </h1>

      {/* 产品数量信息 */}
      {pagination && (
        <p className="plp-new__count">
          {pagination.total} {pagination.total === 1 ? 'product' : 'products'}
        </p>
      )}

      {/* 加载状态 */}
      {isLoading && (
        <div className="plp-new__loading">
          <p>Loading products...</p>
        </div>
      )}

      {/* 错误状态 */}
      {error && (
        <div className="plp-new__error">
          <p>Failed to load products. Please try again later.</p>
        </div>
      )}

      {/* 产品网格 */}
      {!isLoading && !error && products.length > 0 && (
        <div className="plp-new__grid-products">
          {products.map((product) => {
            const imageUrl = product.images?.[0]?.url || '/assets/hero/hero-card-tee.jpg';
            return (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                className="plp-new__product-card"
              >
                <div className="plp-new__product-image">
                  <Image
                    src={imageUrl}
                    alt={product.name}
                    width={280}
                    height={350}
                    className="product-image"
                  />
                </div>
                <h3 className="plp-new__product-title">{product.name}</h3>
                <div className="plp-new__product-price">
                  ${(product.basePrice / 100).toFixed(2)}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* 空状态 */}
      {!isLoading && !error && products.length === 0 && (
        <div className="plp-new__empty">
          <p>No products found in this category.</p>
          <Link href="/products">Browse all products</Link>
        </div>
      )}

      <style jsx>{`
        .breadcrumb-nav {
          margin-bottom: 16px;
        }

        .breadcrumb-nav ol {
          display: flex;
          align-items: center;
          gap: 8px;
          list-style: none;
          padding: 0;
          margin: 0;
          font-size: 14px;
          color: #6b7280;
        }

        .breadcrumb-nav a {
          color: #2563eb;
          text-decoration: none;
        }

        .breadcrumb-nav a:hover {
          text-decoration: underline;
        }

        .plp-new__title {
          font-size: 32px;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 8px 0;
        }

        .plp-new__count {
          font-size: 14px;
          color: #6b7280;
          margin: 0 0 24px 0;
        }

        .plp-new__loading,
        .plp-new__error,
        .plp-new__empty {
          padding: 48px;
          text-align: center;
          color: #6b7280;
        }

        .plp-new__error {
          color: #ef4444;
        }

        .plp-new__grid-products {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 24px;
          margin-top: 24px;
        }

        .plp-new__product-card {
          display: flex;
          flex-direction: column;
          text-decoration: none;
          color: inherit;
          transition: transform 0.2s;
        }

        .plp-new__product-card:hover {
          transform: translateY(-4px);
        }

        .plp-new__product-image {
          width: 100%;
          aspect-ratio: 3/4;
          border-radius: 8px;
          overflow: hidden;
          background: #f9fafb;
          margin-bottom: 12px;
        }

        .plp-new__product-title {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          margin: 0 0 4px 0;
          line-height: 1.4;
        }

        .plp-new__product-price {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
        }
      `}</style>
    </>
  );
}
