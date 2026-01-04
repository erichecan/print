import React, { useState, useEffect } from 'react';
import { getProducts, type Product as ApiProduct } from '../../api/product';
import './MobileProductCatalogModal.css';

interface MobileProductCatalogModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectProduct: (productId: string) => void;
}

const MobileProductCatalogModal: React.FC<MobileProductCatalogModalProps> = ({
    isOpen,
    onClose,
    onSelectProduct
}) => {
    const [products, setProducts] = useState<ApiProduct[]>([]);
    const [categories, setCategories] = useState<{ name: string; slug: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeCategory, setActiveCategory] = useState('All Products');
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch categories initially
    useEffect(() => {
        const loadCategories = async () => {
            try {
                const res = await fetch('/api/proxy/products/filters/options');
                if (!res.ok) throw new Error('Failed to fetch filter options');
                const data = await res.json();
                if (data.categories) {
                    setCategories(data.categories.map((c: any) => ({ name: c.name, slug: c.slug })));
                }
            } catch (error) {
                console.error('[MobileProductCatalog] Failed to load categories:', error);
            }
        };
        loadCategories();
    }, []);

    // Fetch products from API
    useEffect(() => {
        if (!isOpen) return;

        const loadProducts = async () => {
            setLoading(true);
            try {
                const activeCategorySlug = activeCategory === 'All Products'
                    ? undefined
                    : categories.find(c => c.name === activeCategory)?.slug;

                const response = await getProducts({
                    limit: 50,
                    search: searchQuery || undefined,
                    category: activeCategorySlug
                });
                setProducts(response.data || []);
            } catch (error) {
                console.error('[MobileProductCatalog] Failed to load products:', error);
            } finally {
                setLoading(false);
            }
        };

        const timeoutId = setTimeout(loadProducts, 300); // Debounce
        return () => clearTimeout(timeoutId);
    }, [isOpen, searchQuery, activeCategory, categories]);

    if (!isOpen) return null;

    return (
        <div className="mobile-catalog-overlay">
            <div className="mobile-catalog-container">
                <header className="mobile-catalog-header">
                    <button className="mobile-catalog-back" onClick={onClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                    <h1>Select Product</h1>
                    <div style={{ width: 24 }} /> {/* Spacer */}
                </header>

                <div className="mobile-catalog-search-bar">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="search-icon">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button className="clear-search" onClick={() => setSearchQuery('')}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    )}
                </div>

                <div className="mobile-catalog-categories">
                    <button
                        className={`category-tag ${activeCategory === 'All Products' ? 'is-active' : ''}`}
                        onClick={() => setActiveCategory('All Products')}
                    >
                        All
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat.slug}
                            className={`category-tag ${activeCategory === cat.name ? 'is-active' : ''}`}
                            onClick={() => setActiveCategory(cat.name)}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>

                <div className="mobile-catalog-results">
                    {loading ? (
                        <div className="catalog-status">Loading products...</div>
                    ) : products.length === 0 ? (
                        <div className="catalog-status">No products found.</div>
                    ) : (
                        <div className="mobile-catalog-grid">
                            {products.map(product => (
                                <div
                                    key={product.id}
                                    className="mobile-catalog-card"
                                    onClick={() => onSelectProduct(product.id)}
                                >
                                    <div className="product-image">
                                        <img src={product.coverImageUrl || ''} alt={product.title} />
                                    </div>
                                    <div className="product-info">
                                        <h3>{typeof product.title === 'object' ? (product.title as any).name : product.title}</h3>
                                        <p className="price">From ${typeof product.price === 'object' ? (product.price as any).sale : product.price}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MobileProductCatalogModal;
