/**
 * Product Selector Modal - 产品选择器模态框
* 创建产品选择器组件
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { getProducts, type Product } from '../../api/product';
import './ProductSelectorModal.css';

interface ProductSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
  currentProductId?: string;
}

const ProductSelectorModal: React.FC<ProductSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectProduct,
  currentProductId,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

// 加载产品列表
  const loadProducts = useCallback(async (reset = false) => {
    if (loading) return;

    setLoading(true);
    try {
      const currentPage = reset ? 1 : page;
      const response = await getProducts({
        page: currentPage,
        limit: 24,
        search: searchQuery || undefined,
      });

      if (reset) {
        setProducts(response.data || []);
        setPage(1);
      } else {
        setProducts((prev) => [...prev, ...(response.data || [])]);
      }

      // 判断是否还有更多数据
      const pagination = response.pagination;
      if (pagination) {
        setHasMore(pagination.page < pagination.totalPages);
      } else {
        setHasMore((response.data || []).length === 24);
      }

      if (reset) {
        setPage(1);
      } else {
        setPage((prev) => prev + 1);
      }
    } catch (error) {
      console.error('[ProductSelectorModal] Failed to load products:', error);
      // 可以显示错误提示
    } finally {
      setLoading(false);
    }
  }, [loading, page, searchQuery]);

// 加载产品列表（初始加载）
  useEffect(() => {
    if (isOpen && products.length === 0 && !loading) {
      loadProducts(true);
    }
  }, [isOpen, products.length, loading, loadProducts]);

// 搜索处理（带防抖）
  useEffect(() => {
    if (!isOpen) return;

    const timeoutId = setTimeout(() => {
      if (searchQuery !== undefined) {
        setProducts([]);
        setPage(1);
        loadProducts(true);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, isOpen, loadProducts]);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

// 选择产品
  const handleSelectProduct = (product: Product) => {
    onSelectProduct(product);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="dl-modal-overlay" onClick={onClose}>
      <div className="dl-modal dl-product-selector-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dl-modal__header">
          <h3 className="dl-modal__title">Choose Your Product</h3>
          <button
            className="dl-modal__close"
            onClick={onClose}
            aria-label="Close"
            type="button"
          >
            ×
          </button>
        </div>

        <div className="dl-modal__body">
          {/* 搜索框 */}
          <div className="dl-product-selector__search">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="dl-product-selector__search-input"
            />
          </div>

          {/* 产品网格 */}
          {loading && products.length === 0 ? (
            <div className="dl-product-selector__loading">
              <p>Loading products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="dl-product-selector__empty">
              <p>No products found.</p>
            </div>
          ) : (
            <div className="dl-product-selector__grid">
              {products.map((product) => {
                const isCurrentProduct = product.id === currentProductId;
                return (
                  <button
                    key={product.id}
                    type="button"
                    className={`dl-product-item ${isCurrentProduct ? 'is-current' : ''}`}
                    onClick={() => handleSelectProduct(product)}
                    disabled={isCurrentProduct}
                  >
                    <div className="dl-product-item__image">
                      {product.coverImageUrl ? (
                        <Image
                          src={product.coverImageUrl}
                          alt={product.title}
                          width={200}
                          height={200}
                          className="dl-product-item__img"
                        />
                      ) : (
                        <div className="dl-product-item__placeholder">No Image</div>
                      )}
                      {isCurrentProduct && (
                        <div className="dl-product-item__badge">Current</div>
                      )}
                    </div>
                    <div className="dl-product-item__info">
                      <div className="dl-product-item__name">
                        {typeof product.title === 'object' ? (product.title as any).name : product.title}
                      </div>
                      <div className="dl-product-item__price">
                        ${(typeof product.price === 'object' ? (product.price as any).sale : product.price).toFixed(2)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* 加载更多 */}
          {hasMore && !loading && products.length > 0 && (
            <div className="dl-product-selector__load-more">
              <button
                type="button"
                className="dl-product-selector__load-more-btn"
                onClick={() => loadProducts()}
              >
                Load More
              </button>
            </div>
          )}

          {loading && products.length > 0 && (
            <div className="dl-product-selector__loading-more">
              <p>Loading...</p>
            </div>
          )}
        </div>

        <div className="dl-modal__footer">
          <button
            className="dl-modal__btn dl-modal__btn--secondary"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductSelectorModal;

