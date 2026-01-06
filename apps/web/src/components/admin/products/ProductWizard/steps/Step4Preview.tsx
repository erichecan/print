'use client';

/**
 * Step 4: Preview and Publish Component
 * 步骤4：预览和发布
 * Created: 2025-01-06
 */
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProductWizard } from '../ProductWizard';
import { ProductPreviewTabs } from '../components/ProductPreviewTabs';
import { PublishOptions } from '../components/PublishOptions';
import { SEOChecker } from '../components/SEOChecker';
import { adminProductsApi, AdminProductPayload } from '@/lib/api';

export function Step4Preview() {
  const router = useRouter();
  const { wizardData, updateWizardData, prevStep, isLoading, setSubmitting } = useProductWizard();
  const [publishOption, setPublishOption] = useState<'publish' | 'draft' | 'scheduled'>(
    wizardData.publishOption || 'publish'
  );
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(
    wizardData.scheduledPublishAt
  );
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handlePublishOptionChange = (option: 'publish' | 'draft' | 'scheduled') => {
    setPublishOption(option);
    updateWizardData({ publishOption: option });
  };

  const buildPayload = (): AdminProductPayload => {
    // Build variants from combinations and colors
    const variants = (wizardData.variantCombinations || [])
      .filter((c) => c.enabled)
      .map((combination) => {
        const colorConfig = wizardData.colors?.find((c) => c.color === combination.color);
        return {
          sku: combination.sku || `${wizardData.sku}-${combination.color}-${combination.size}`,
          color: combination.color,
          colorHex: colorConfig?.colorHex,
          colorDisplayName: colorConfig?.displayName,
          size: combination.size,
          stockQuantity: combination.stockQuantity || 0,
          priceAdjustment: 0,
          imageUrl: colorConfig?.images?.[0]?.url,
        };
      });

    // Build images from main image and color images
    const images = [];
    if (wizardData.mainImage?.url) {
      images.push({
        url: wizardData.mainImage.url,
        alt: wizardData.mainImage.alt || wizardData.name || '',
        sortOrder: 0,
      });
    }

    // Add color variant images
    wizardData.colors?.forEach((color, colorIndex) => {
      color.images?.forEach((img, imgIndex) => {
        images.push({
          url: img.url,
          alt: `${color.displayName} ${imgIndex + 1}`,
          sortOrder: (colorIndex + 1) * 10 + imgIndex,
        });
      });
    });

    const payload: AdminProductPayload = {
      name: wizardData.name || '',
      slug: wizardData.slug || '',
      categoryId: wizardData.categoryId || '',
      sku: wizardData.sku || '',
      basePrice: (wizardData.basePrice || 0) * 100, // Convert to cents
      salePrice: wizardData.salePrice,
      unitCost: wizardData.unitCost,
      grossProfit: wizardData.grossProfit,
      stockQuantity: wizardData.stockQuantity || 0,
      description: wizardData.description,
      longDescription: wizardData.longDescription,
      isActive: publishOption === 'publish',
      isCustomizable: variants.length > 0,
      weight: wizardData.weight,
      dimensions: wizardData.dimensions,
      variants: variants.length > 0 ? variants : undefined,
      images: images.length > 0 ? images : undefined,
      printableArea: wizardData.printableArea || undefined,
    };

    return payload;
  };

  const handlePublish = async () => {
    setSubmitError(null);
    setSubmitting?.(true);

    try {
      const payload = buildPayload();

      // Validate required fields
      if (!payload.name || !payload.categoryId || !payload.sku || !payload.basePrice) {
        setSubmitError('请完善必填字段：名称、分类、SKU、价格');
        setSubmitting?.(false);
        return;
      }

      let product;
      if (wizardData.productId) {
        // Update existing product (draft)
        product = await adminProductsApi.update(wizardData.productId, {
          ...payload,
          // TODO: Add isDraft support when API is ready
        });
      } else {
        // Create new product
        product = await adminProductsApi.create({
          ...payload,
          // TODO: Add isDraft support when API is ready
        });
      }

      // Handle file uploads for main image
      if (wizardData.mainImage?.file && product.id) {
        await adminProductsApi.uploadImages(product.id, [wizardData.mainImage.file]);
      }

      // Handle color image uploads
      if (product.id && wizardData.colors) {
        for (const color of wizardData.colors) {
          if (color.images) {
            const files = color.images.filter((img) => img.file).map((img) => img.file!);
            if (files.length > 0) {
              await adminProductsApi.uploadImages(product.id, files);
            }
          }
        }
      }

      // Redirect to product edit page or products list
      router.push(`/admin/products/${product.id}`);
    } catch (error: any) {
      console.error('Failed to publish product:', error);
      setSubmitError(error?.message || '发布失败，请稍后重试');
      setSubmitting?.(false);
    }
  };

  const handleSaveDraft = async () => {
    setSubmitError(null);
    setSubmitting?.(true);

    try {
      const payload = buildPayload();
      // TODO: Save as draft with isDraft: true when API is ready
      // For now, just save as inactive
      const draftPayload = { ...payload, isActive: false };

      let product;
      if (wizardData.productId) {
        product = await adminProductsApi.update(wizardData.productId, draftPayload);
      } else {
        product = await adminProductsApi.create(draftPayload);
      }

      updateWizardData({ productId: product.id });
      alert('草稿已保存');
      setSubmitting?.(false);
    } catch (error: any) {
      console.error('Failed to save draft:', error);
      setSubmitError(error?.message || '保存草稿失败');
      setSubmitting?.(false);
    }
  };

  return (
    <div className="step4-preview">
      <div className="step4-preview__layout">
        {/* Left: Preview Tabs */}
        <div className="step4-preview__preview">
          <ProductPreviewTabs wizardData={wizardData} />
        </div>

        {/* Right: Publish Options and SEO */}
        <div className="step4-preview__sidebar">
          <div className="sidebar-section">
            <PublishOptions
              value={publishOption}
              onChange={handlePublishOptionChange}
              scheduledDate={scheduledDate}
              onScheduledDateChange={(date) => {
                setScheduledDate(date);
                updateWizardData({ scheduledPublishAt: date });
              }}
            />
          </div>

          <div className="sidebar-section">
            <SEOChecker wizardData={wizardData} />
          </div>
        </div>
      </div>

      {submitError && (
        <div className="step4-preview__error">
          <span className="error-icon">❌</span>
          <span>{submitError}</span>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="step4-preview__actions">
        <button type="button" className="btn btn--secondary" onClick={prevStep}>
          上一步
        </button>
        <div className="step4-preview__actions-right">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={handleSaveDraft}
            disabled={isLoading}
          >
            {isLoading ? '保存中...' : '保存草稿'}
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handlePublish}
            disabled={isLoading}
          >
            {publishOption === 'publish' ? '立即上架' : '完成'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .step4-preview {
          display: flex;
          flex-direction: column;
          min-height: calc(100vh - 200px);
        }

        .step4-preview__layout {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
          flex: 1;
          margin-bottom: 24px;
        }

        @media (max-width: 1024px) {
          .step4-preview__layout {
            grid-template-columns: 1fr;
          }
        }

        .step4-preview__preview {
          min-height: 600px;
        }

        .step4-preview__sidebar {
          display: flex;
          flex-direction: column;
          gap: 24px;
          position: sticky;
          top: 24px;
          height: fit-content;
        }

        .sidebar-section {
          /* Spacing wrapper */
        }

        .step4-preview__error {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: #fff5f5;
          border: 1px solid #e74c3c;
          border-radius: 4px;
          color: #e74c3c;
          font-size: 14px;
          margin-bottom: 16px;
        }

        .error-icon {
          font-size: 18px;
        }

        .step4-preview__actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 0;
          border-top: 1px solid #e1e3e5;
        }

        .step4-preview__actions-right {
          display: flex;
          gap: 12px;
        }

        .btn {
          padding: 10px 24px;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn--primary {
          background: #008060;
          color: #fff;
        }

        .btn--primary:hover:not(:disabled) {
          background: #006e52;
        }

        .btn--secondary {
          background: #fff;
          color: #202223;
          border: 1px solid #c9cccf;
        }

        .btn--secondary:hover:not(:disabled) {
          background: #f6f6f7;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

