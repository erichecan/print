/**
 * MoreByArtist Component - Redbubble Style
 * [2025-11-19 09:18:00] 参考图一："More by this artist" 卡片栅格
 */
'use client';

import Link from 'next/link';
import Image from 'next/image';

interface ArtistProduct {
  id: string;
  title: string;
  url: string;
  price: number;
  link: string;
}

interface MoreByArtistProps {
  artistName: string;
  artistShopUrl: string;
  products: ArtistProduct[];
}

export function MoreByArtist({ artistName, artistShopUrl, products }: MoreByArtistProps) {
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <section className="more-by-artist" aria-label={`More products by ${artistName}`}>
      <div className="more-by-artist-header">
        <h2 className="more-by-artist-title">More by this artist</h2>
        <Link href={artistShopUrl} className="more-by-artist-link">
          View shop
        </Link>
      </div>
      <div className="more-by-artist-grid">
        {products.map((product) => (
          <Link
            key={product.id}
            href={product.link}
            className="more-by-artist-item"
            aria-label={`${product.title} - ${formatPrice(product.price)}`}
          >
            <div className="more-by-artist-image-wrapper">
              <Image
                src={product.url}
                alt={product.title}
                width={300}
                height={300}
                className="more-by-artist-image"
              />
            </div>
            <div className="more-by-artist-info">
              <div 
                className="more-by-artist-title-text" 
                title={product.title}
              >
                {product.title}
              </div>
              <div className="more-by-artist-price">{formatPrice(product.price)}</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

