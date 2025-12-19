import React, { useState, useEffect } from 'react';
import { getProducts, type Product as ApiProduct } from '../../api/product';
import './ProductCatalogModal.css';

const CATEGORIES = [
    'All Products',
    'T-shirts',
    'Hoodies & Sweatshirts',
    'Activewear',
    'Long Sleeve Tees',
    'Ladies',
    'Kids & Youth',
    'Hats',
    'Workwear'
];

interface ProductCatalogModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectProduct: (productId: string) => void;
}

const ProductCatalogModal: React.FC<ProductCatalogModalProps> = ({
    isOpen,
    onClose,
    onSelectProduct
}) => {
    const [products, setProducts] = useState<ApiProduct[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeCategory, setActiveCategory] = useState('All Products');
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch products from API
    React.useEffect(() => {
        if (!isOpen) return;

        const loadProducts = async () => {
            setLoading(true);
            try {
                const response = await getProducts({
                    limit: 50,
                    search: searchQuery || undefined,
                    category: activeCategory === 'All Products' ? undefined : activeCategory
                });
                setProducts(response.data || []);
            } catch (error) {
                console.error('[ProductCatalogModal] Failed to load products:', error);
            } finally {
                setLoading(false);
            }
        };

        const timeoutId = setTimeout(loadProducts, 300); // Debounce search
        return () => clearTimeout(timeoutId);
    }, [isOpen, searchQuery, activeCategory]);

    const filteredProducts = products; // Already filtered by API

    if (!isOpen) return null;

    return (
        <div className="dl-catalog-overlay">
            <div className="dl-catalog-modal">
                <header className="dl-catalog-header">
                    <div className="dl-catalog-header-left">
                        <h1 className="dl-catalog-title">Shop Our Catalog</h1>
                    </div>
                    <div className="dl-catalog-header-right">
                        <div className="dl-catalog-search">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search products..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button className="dl-catalog-close" onClick={onClose} aria-label="Close">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                </header>

                <main className="dl-catalog-body">
                    <aside className="dl-catalog-sidebar">
                        <nav className="dl-catalog-nav">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat}
                                    className={`dl-catalog-nav-item ${activeCategory === cat ? 'is-active' : ''}`}
                                    onClick={() => setActiveCategory(cat)}
                                >
                                    {cat}
                                </button>
                            ))}
                        </nav>
                    </aside>

                    <section className="dl-catalog-content">
                        <div className="dl-catalog-grid">
                            {filteredProducts.map(product => (
                                <div
                                    key={product.id}
                                    className="dl-catalog-card"
                                    onClick={() => onSelectProduct(product.id)}
                                >
                                    <div className="dl-catalog-card-image">
                                        <img src={product.coverImageUrl || ''} alt={product.title} />
                                    </div>
                                    <div className="dl-catalog-card-info">
                                        <h3 className="dl-catalog-product-name">{typeof product.title === 'object' ? (product.title as any).name : product.title}</h3>
                                        <p className="dl-catalog-product-desc">{typeof product.category === 'object' ? (product.category as any).name : product.category}</p>
                                        <div className="dl-catalog-product-footer">
                                            <span className="dl-catalog-product-price">From ${typeof product.price === 'object' ? (product.price as any).sale : product.price}</span>
                                            <button className="dl-catalog-select-btn">Select</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {filteredProducts.length === 0 && (
                            <div className="dl-catalog-empty">
                                <p>No products found matching your search.</p>
                            </div>
                        )}
                    </section>
                </main>
            </div>
        </div>
    );
};

export default ProductCatalogModal;
