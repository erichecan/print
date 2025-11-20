/**
 * Categories Section Component
 * [2025-01-27 18:50:00] 首页分类展示组件，从 API 读取分类数据
 */
'use client';

import Image from 'next/image';
import Link from 'next/link';
import useSWR from 'swr';
import { categoriesApi, Category } from '@/lib/api';

export function CategoriesSection() {
  const { data, error, isLoading } = useSWR('categories', () => categoriesApi.list());

  if (isLoading) {
    return (
      <section className="categories" aria-labelledby="categories-heading">
        <div className="container">
          <h2 id="categories-heading" style={{ textAlign: 'center', marginBottom: '24px' }}>
            Shop by Category
          </h2>
          <div className="categories__grid">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="category-card" style={{ opacity: 0.5 }}>
                <div className="category-card__image" style={{ backgroundColor: '#f3f4f6' }} />
                <div className="category-card__label">Loading...</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error || !data?.data || data.data.length === 0) {
    return (
      <section className="categories" aria-labelledby="categories-heading">
        <div className="container">
          <h2 id="categories-heading" style={{ textAlign: 'center', marginBottom: '24px' }}>
            Shop by Category
          </h2>
          <div className="text-center text-gray-600 py-8">
            Failed to load categories. Please try again later.
          </div>
        </div>
      </section>
    );
  }

  const categories = data.data;

  return (
    <section className="categories" aria-labelledby="categories-heading">
      <div className="container">
        <h2 id="categories-heading" style={{ textAlign: 'center', marginBottom: '24px' }}>
          Custom T-shirts & Promotional Products for Your Group
        </h2>
        <div className="categories__grid">
          {categories.map((category: Category) => (
            <Link
              key={category.id}
              href={`/products?category=${category.slug}`}
              className="category-card"
              aria-label={`Browse ${category.name}`}
            >
              <div className="category-card__image">
                <Image
                  src={category.imageUrl || '/assets/categories/cat-tshirt.png'}
                  alt={category.name}
                  width={300}
                  height={300}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <div className="category-card__label">{category.name}</div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

