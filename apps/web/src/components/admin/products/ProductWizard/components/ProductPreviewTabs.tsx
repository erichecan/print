'use client';

/**
 * Product Preview Tabs Component
 * 产品预览标签组件 - 三种预览视图切换
 * Created: 2025-01-06
 */
import React, { useState } from 'react';
import { ProductWizardData } from '@/lib/api';
import { ProductCardPreview } from '../ProductCardPreview';
import { ProductDetailPreview } from './ProductDetailPreview';

type PreviewView = 'list' | 'detail' | 'mobile';

interface ProductPreviewTabsProps {
  wizardData: ProductWizardData;
}

export function ProductPreviewTabs({ wizardData }: ProductPreviewTabsProps) {
  const [activeView, setActiveView] = useState<PreviewView>('list');

  return (
    <div className="product-preview-tabs">
      <div className="product-preview-tabs__header">
        <button
          type="button"
          className={`tab-btn ${activeView === 'list' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveView('list')}
        >
          商品列表预览
        </button>
        <button
          type="button"
          className={`tab-btn ${activeView === 'detail' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveView('detail')}
        >
          详情页预览
        </button>
        <button
          type="button"
          className={`tab-btn ${activeView === 'mobile' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveView('mobile')}
        >
          移动端预览
        </button>
      </div>

      <div className="product-preview-tabs__content">
        {activeView === 'list' && (
          <div className="preview-container preview-container--list">
            <ProductCardPreview wizardData={wizardData} />
          </div>
        )}

        {activeView === 'detail' && (
          <div className="preview-container preview-container--detail">
            <div className="detail-preview-wrapper">
              <ProductDetailPreview wizardData={wizardData} />
            </div>
          </div>
        )}

        {activeView === 'mobile' && (
          <div className="preview-container preview-container--mobile">
            <div className="mobile-preview-wrapper">
              <div className="mobile-preview-device">
                <div className="mobile-preview-content">
                  <ProductCardPreview wizardData={wizardData} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .product-preview-tabs {
          background: #fff;
          border-radius: 8px;
          border: 1px solid #e1e3e5;
          overflow: hidden;
        }

        .product-preview-tabs__header {
          display: flex;
          border-bottom: 1px solid #e1e3e5;
          background: #fafbfb;
        }

        .tab-btn {
          flex: 1;
          padding: 12px 16px;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          font-size: 14px;
          font-weight: 500;
          color: #6d7175;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tab-btn:hover {
          background: #f6f6f7;
          color: #202223;
        }

        .tab-btn--active {
          color: #005bd3;
          border-bottom-color: #005bd3;
          background: #fff;
        }

        .product-preview-tabs__content {
          padding: 24px;
          min-height: 500px;
        }

        .preview-container {
          display: flex;
          justify-content: center;
          align-items: flex-start;
        }

        .preview-container--detail {
          justify-content: flex-start;
        }

        .detail-preview-wrapper {
          width: 100%;
          max-width: 1200px;
          background: #f6f6f7;
          border-radius: 8px;
          overflow: hidden;
        }

        .detail-preview-placeholder {
          text-align: center;
          padding: 80px 20px;
          color: #6d7175;
        }

        .placeholder-hint {
          font-size: 12px;
          margin-top: 8px;
        }

        .mobile-preview-wrapper {
          display: flex;
          justify-content: center;
          width: 100%;
        }

        .mobile-preview-device {
          width: 375px;
          max-width: 100%;
          border: 8px solid #000;
          border-radius: 20px;
          background: #000;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }

        .mobile-preview-content {
          background: #fff;
          border-radius: 12px;
          overflow: hidden;
          min-height: 600px;
          padding: 16px;
        }
      `}</style>
    </div>
  );
}

