/**
 * Collection Detail Page
 * [2025-11-11 22:29:20] TODO scaffold
 * [2025-11-12 00:02:00] Fetches collection hero and product grid from backend
 */

import Link from 'next/link';
import Image from 'next/image'; // [2025-11-11 06:06:54] 使用 Next Image 提升性能
import { notFound } from 'next/navigation';

type ProductListItem = {
  id: string;
  name: string;
  slug: string;
  price?: number;
  basePrice?: number;
  primaryImage?: {
    url: string | null;
    alt: string | null;
  };
};

type CollectionDetail = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  heroImage?: {
    url: string | null;
    alt: string | null;
  };
  products?: ProductListItem[];
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const currencyFormatter = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
});

async function fetchCollection(slug: string) {
  const response = await fetch(`${API_BASE_URL}/collections/${slug}`, {
    cache: 'no-store',
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to load collection (${response.status})`);
  }

  return (await response.json()) as CollectionDetail;
}

// [2025-01-27 14:25:00] 为静态导出模式添加 generateStaticParams
export async function generateStaticParams() {
  // 返回空数组，因为分类 slug 是动态的，无法在构建时预生成
  // 页面会在客户端运行时动态加载
  return [];
}

export default async function CollectionPage({ params }: { params: { slug: string } }) {
  const collection = await fetchCollection(params.slug);

  if (!collection) {
    notFound();
  }

  const products = collection.products ?? [];

  return (
    <div className="collection-page">
      <div className="collection-hero">
        <div className="container">
          <nav aria-label="Breadcrumb" className="breadcrumb-nav">
            <ol>
              <li>
                <Link href="/">Home</Link>
              </li>
              <li>
                <Link href="/products">Products</Link>
              </li>
              <li aria-current="page">{collection.name}</li>
            </ol>
          </nav>
          <div className="collection-hero__content">
            <h1>{collection.name}</h1>
            {collection.description && <p>{collection.description}</p>}
            <div className="collection-hero__actions">
              <Link className="btn" href={`/products?collection=${collection.slug}`}>
                Shop this collection
              </Link>
              <Link className="btn btn--outline" href="/design-lab">
                Start a design
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container collection-products">
        {products.length === 0 ? (
          <div className="results-empty">
            <h2>No products in this collection (yet)</h2>
            <p>
              Check back soon or explore the full catalog for similar items that can be customized for your
              team.
            </p>
          </div>
        ) : (
          <div className="results-grid">
            {products.map((product) => {
              const price = product.price ?? product.basePrice ?? 0;
              return (
                <article key={product.id} className="product-card">
                  <Link href={`/products/${product.slug}`}>
                    <div className="product-card__image">
                      {product.primaryImage?.url ? (
                        <Image
                          src={product.primaryImage.url}
                          alt={product.primaryImage.alt ?? product.name}
                          className="product-card__image-media" // [2025-11-11 06:07:52] 使用统一样式控制裁剪
                          width={480}
                          height={480}
                          sizes="(max-width: 768px) 100vw, 480px" // [2025-11-11 06:06:54] 设定默认尺寸供优化
                        />
                      ) : (
                        <div className="product-card__placeholder">Image coming soon</div>
                      )}
                    </div>
                    <div className="product-card__body">
                      <h3>{product.name}</h3>
                      <p className="product-card__price">{currencyFormatter.format(Number(price))}</p>
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}