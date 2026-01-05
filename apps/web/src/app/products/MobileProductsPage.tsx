'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MobileFilterDrawer } from '@/components/products/MobileFilterDrawer';
import { Pagination } from '@/components/ui/Pagination';
import SortSelect from './SortSelect';
import { Promotion } from '@/lib/api';
import './mobile-products.css';

interface Product {
    id: string;
    name: string;
    slug: string;
    price: { base: number; sale: number; currency: string };
    primaryImage?: { url: string | null; alt?: string | null } | null;
    images?: Array<{ url: string; alt?: string | null }>;
    category?: { name: string } | null;
    brand?: { name: string } | null;
    variants?: Array<{ color?: string; colorHex?: string; imageUrl?: string | null }>;
    rating?: { average: number; count: number };
    promotions?: Promotion[];
}

interface MobileProductsPageProps {
    products: Product[];
    categoryName: string;
    pagination: { page: number; limit: number; total: number; totalPages: number };
    currentSort: string;
    currentCollection: string;
    currentBrand: string;
    brands: any[];
}

const COLOR_MAP: Record<string, string> = {
    'black': '#000000',
    'blue': '#0066CC',
    'white': '#FFFFFF',
    'grey': '#808080',
    'gray': '#808080',
    'green': '#00CC00',
    'red': '#CC0000',
    'pink': '#FF99CC',
    'purple': '#9933CC',
    'yellow': '#FFCC00',
    'orange': '#FF9900',
    'brown': '#996633',
    'heather': '#CCCCCC',
    'camo': '#4A5D23',
};

const COLOR_NAME_MAP: Record<string, string> = {
    'Black': '黑',
    'White': '白',
    'black': '黑',
    'white': '白',
};

const ProductCard: React.FC<{ product: Product; index: number }> = ({ product, index }) => {
    const fallbackImage = '/assets/hero/hero-card-tee.jpg';

    const getDefaultImage = () => {
        const whiteVariant = product.variants?.find(v => {
            const color = (v.color || '').trim();
            return color === 'White' || color === 'white' || color === '白';
        });
        if (whiteVariant?.imageUrl) return whiteVariant.imageUrl;

        const blackVariant = product.variants?.find(v => {
            const color = (v.color || '').trim();
            return color === 'Black' || color === 'black' || color === '黑';
        });
        if (blackVariant?.imageUrl) return blackVariant.imageUrl;

        return product.primaryImage?.url || product.images?.[0]?.url || fallbackImage;
    };

    const img = getDefaultImage();
    const basePrice = Number(product.price?.sale || product.price?.base || 0);
    const rating = product.rating?.average || 4.5;
    const reviewCount = product.rating?.count || 10000;
    const badge = index < 3 ? 'Best Seller' : null;

    const productColors = product.variants?.filter(v => v.color && v.color.trim() !== '') || [];
    const uniqueColors = Array.from(
        new Map(
            productColors.map(v => {
                const originalColorName = (v.color || '').trim();
                const displayColorName = COLOR_NAME_MAP[originalColorName] || originalColorName;
                const hex = v.colorHex || COLOR_MAP[originalColorName.toLowerCase()] || '#CCCCCC';
                return [displayColorName, { name: displayColorName, hex }];
            })
        ).values()
    ).slice(0, 5);

    const moreColors = productColors.length > 5 ? productColors.length - 5 : 0;

    return (
        <Link href={`/products/${product.slug}`} className="m-product-card">
            <div className="m-product-image-section">
                <Image
                    src={img}
                    alt={product.name}
                    fill
                    className="m-product-image"
                    sizes="171px"
                />
                {badge && <div className="m-product-card-badge">{badge}</div>}
                <div className="m-product-eco-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2d5a27" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8a7 7 0 0 1-7 7c0 1.25-.75 3-3 3z" />
                        <path d="M11 20c-1.78 0-3.22-3.39-3.5-5" />
                    </svg>
                </div>
            </div>

            <div className="m-product-content">
                <div style={{ marginTop: '0px' }}>
                    <h3 className="m-product-title">{product.name}</h3>
                </div>

                <div className="m-product-swatches">
                    {uniqueColors.map((color, i) => (
                        <span key={i} className="m-swatch" style={{ backgroundColor: color.hex }} />
                    ))}
                    {moreColors > 0 && <span className="m-swatch-more">+{moreColors}</span>}
                </div>

                <div className="m-product-rating">
                    <span className="m-star">★</span>
                    <span className="m-rating-val">{rating.toFixed(1)}</span>
                    <span className="m-rating-count">({reviewCount >= 10000 ? '10,000+' : reviewCount.toLocaleString()} reviews)</span>
                </div>

                <div className="m-product-price-section">
                    <span className="m-price-val">${basePrice.toFixed(2)}/ea</span>
                    <span className="m-price-ea">for 500 items</span>
                    <span className="m-pricing-details" onClick={(e) => { e.preventDefault(); /* navigation handles this via parent Link */ }}>Pricing Details</span>
                </div>

                <div className="m-product-rush">
                    <div className="m-rush-pill">
                        <span>⚡</span>
                        <span>3-Day Super Rush Available</span>
                    </div>
                </div>

                <div className="m-product-minimum">
                    No Minimum
                </div>
            </div>
        </Link>
    );
};

export function MobileProductsPage({
    products,
    categoryName,
    pagination,
    currentSort,
    currentCollection,
    currentBrand,
    brands
}: MobileProductsPageProps) {
    return (
        <div className="mobile-plp-container">
            <div className="mobile-plp-header">
                <nav className="mobile-plp-breadcrumbs">
                    <Link href="/products">All Products</Link>
                    <span className="separator">{'>'}</span>
                    <Link href="/products?category=t-shirts">T-shirts</Link>
                    <span className="separator">{'>'}</span>
                    <span className="current">{categoryName}</span>
                </nav>

                <h1 className="mobile-plp-title">{categoryName}</h1>
            </div>

            <div className="mobile-plp-controls">
                <div className="mobile-plp-filter-btn">
                    <MobileFilterDrawer
                        currentCollection={currentCollection}
                        currentBrand={currentBrand}
                        brands={brands}
                    />
                </div>
                <div className="mobile-plp-sort">
                    <span>Sort By:</span>
                    <SortSelect defaultValue={currentSort} />
                </div>
            </div>

            <div className="mobile-plp-list">
                {products.map((product, index) => (
                    <ProductCard key={product.id} product={product} index={index} />
                ))}
            </div>

            {pagination.totalPages > 1 && (
                <div style={{ padding: '20px 0' }}>
                    <Pagination
                        currentPage={pagination.page}
                        totalPages={pagination.totalPages}
                        baseUrl="/products"
                        preserveParams={true}
                    />
                </div>
            )}
        </div>
    );
}
