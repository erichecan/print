'use client';

/**
 * SEO Checker Component
 * SEO检查组件
 * Created: 2025-01-06
 */
import React, { useMemo } from 'react';
import { ProductWizardData } from '@/lib/api';

interface SEOCheckerProps {
  wizardData: ProductWizardData;
}

interface SEOCheckResult {
  id: string;
  label: string;
  status: 'pass' | 'warning' | 'fail';
  message: string;
}

export function SEOChecker({ wizardData }: SEOCheckerProps) {
  const checks = useMemo<SEOCheckResult[]>(() => {
    const results: SEOCheckResult[] = [];

    // Check product title contains keywords
    const name = wizardData.name || '';
    const hasKeywords = name.length >= 10 && /\w{3,}/.test(name);
    results.push({
      id: 'title-keywords',
      label: '商品标题包含关键词',
      status: hasKeywords ? 'pass' : 'warning',
      message: hasKeywords
        ? '标题包含有效关键词'
        : '建议在标题中添加更多描述性关键词',
    });

    // Check tags
    const tags = wizardData.tags || [];
    results.push({
      id: 'tags',
      label: '商品标签',
      status: tags.length >= 3 ? 'pass' : 'warning',
      message:
        tags.length >= 3
          ? `已添加 ${tags.length} 个标签`
          : `建议添加更多商品标签（当前：${tags.length} 个）`,
    });

    // Check all variants have images
    const colors = wizardData.colors || [];
    const allVariantsHaveImages = colors.every(
      (color) => color.enabled && color.images && color.images.length > 0
    );
    results.push({
      id: 'variant-images',
      label: '所有变体都有图片',
      status: allVariantsHaveImages ? 'pass' : 'warning',
      message: allVariantsHaveImages
        ? '所有启用的变体都有图片'
        : '部分变体缺少图片，建议补充',
    });

    // Check description
    const hasDescription = wizardData.description && wizardData.description.length >= 50;
    results.push({
      id: 'description',
      label: '商品描述',
      status: hasDescription ? 'pass' : 'warning',
      message: hasDescription
        ? '商品描述内容充足'
        : '建议添加更详细的商品描述（至少50字）',
    });

    return results;
  }, [wizardData]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'fail':
        return '❌';
      default:
        return '•';
    }
  };

  return (
    <div className="seo-checker">
      <h3 className="seo-checker__title">SEO检查</h3>
      <div className="seo-checker__list">
        {checks.map((check) => (
          <div
            key={check.id}
            className={`seo-check-item seo-check-item--${check.status}`}
          >
            <span className="seo-check-icon">{getStatusIcon(check.status)}</span>
            <div className="seo-check-content">
              <span className="seo-check-label">{check.label}</span>
              <span className="seo-check-message">{check.message}</span>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .seo-checker {
          background: #fff;
          border-radius: 8px;
          padding: 20px;
          border: 1px solid #e1e3e5;
        }

        .seo-checker__title {
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 16px 0;
          color: #202223;
        }

        .seo-checker__list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .seo-check-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px;
          border-radius: 4px;
          background: #fafbfb;
        }

        .seo-check-item--pass {
          background: #f0f9f4;
        }

        .seo-check-item--warning {
          background: #fffbf0;
        }

        .seo-check-item--fail {
          background: #fff5f5;
        }

        .seo-check-icon {
          font-size: 18px;
          flex-shrink: 0;
        }

        .seo-check-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .seo-check-label {
          font-size: 14px;
          font-weight: 500;
          color: #202223;
        }

        .seo-check-message {
          font-size: 12px;
          color: #6d7175;
        }
      `}</style>
    </div>
  );
}

