/**
 * Catalog Category Client Component
* 客户端组件：处理分类商品列表数据加载与展示
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

interface CatalogCategoryClientProps {
  groupSlug: string;
  childSlug: string;
}

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' })
    .then((r) => {
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json();
    })
    .then((data) => data.data || data);

export function CatalogCategoryClient({ groupSlug, childSlug }: CatalogCategoryClientProps) {
  const [categoryInfo, setCategoryInfo] = useState<{ name: string; description?: string } | null>(null);

// 获取分类信息
  useEffect(() => {
    fetch(`${API_BASE_URL}/categories/${childSlug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.name) {
          setCategoryInfo({ name: data.name, description: data.description });
        }
      })
      .catch(() => {
        // 如果 API 失败，使用 slug 生成名称
        setCategoryInfo({
          name: childSlug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        });
      });
  }, [childSlug]);

// 获取该分类下的产品列表
  const { data: productsData, error, isLoading } = useSWR<{
    data: Product[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>(
    `${API_BASE_URL}/categories/${childSlug}/products?page=1&limit=24`,
    fetcher,
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
          <li><Link href={`/catalog/${groupSlug}`}>{groupSlug.replace(/-/g, ' ')}</Link></li>
          <li>›</li>
          <li>{categoryInfo?.name || childSlug}</li>
        </ol>
      </nav>

      {/* 页面标题 */}
      <h1 className="plp-new__title">
        {categoryInfo?.name || childSlug.replace(/-/g, ' ')}
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
          color: var(--color-accent, #B40C1C);
          text-decoration: none;
        }

        .breadcrumb-nav a:hover {
          text-decoration: underline;
        }

        .plp-new__title {
          font-size: 32px;
          font-weight: 400;
          font-family: var(--font-heading, 'Marcellus', serif);
          color: var(--color-text, #121212);
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
          border-radius: 0;
          overflow: hidden;
          background: var(--color-bg-sand, #F1EEE9);
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
