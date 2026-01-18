'use client';

/**
 * Product Wizard Main Container Component
 * 产品创建向导主容器组件
 * Created: 2025-01-06
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { StepProgressBar } from './StepProgressBar';
import { ProductWizardData } from '@/lib/api';
import { adminProductsApi, AdminProductDetail } from '@/lib/api';
import { Step1BasicInfo } from './steps/Step1BasicInfo';
import { Step2Variants } from './steps/Step2Variants';
import { Step3Details } from './steps/Step3Details';
import { Step4Preview } from './steps/Step4Preview';

interface ProductWizardContextType {
  wizardData: ProductWizardData;
  updateWizardData: (data: Partial<ProductWizardData>) => void;
  currentStep: number;
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  saveDraft: () => Promise<void>;
  isLoading: boolean;
  productId?: string;
  setSubmitting?: (value: boolean) => void;
}

const ProductWizardContext = createContext<ProductWizardContextType | null>(null);

export const useProductWizard = () => {
  const context = useContext(ProductWizardContext);
  if (!context) {
    throw new Error('useProductWizard must be used within ProductWizard');
  }
  return context;
};

interface ProductWizardProps {
  initialProduct?: AdminProductDetail;
  onComplete?: (product: AdminProductDetail) => void;
}

const STEPS = [
  { id: 1, label: '基础信息' },
  { id: 2, label: '变体设置' },
  { id: 3, label: '详情完善' },
  { id: 4, label: '预览发布' },
];

export function ProductWizard({ initialProduct, onComplete }: ProductWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [wizardData, setWizardData] = useState<ProductWizardData>(() => {
    // Initialize from existing product if editing
    if (initialProduct) {
      return {
        productId: initialProduct.id,
        name: initialProduct.name,
        categoryId: initialProduct.category?.id,
        description: initialProduct.description || undefined,
        longDescription: initialProduct.longDescription || undefined,
        sku: initialProduct.sku,
        basePrice: Number(initialProduct.basePrice), // Backend returns dollars, no need to divide by 100
        salePrice: initialProduct.salePrice ? Number(initialProduct.salePrice) : undefined,
        unitCost: initialProduct.unitCost ? Number(initialProduct.unitCost) : undefined,
        grossProfit: initialProduct.grossProfit ? Number(initialProduct.grossProfit) : undefined,
        stockQuantity: initialProduct.stockQuantity,
        weight: initialProduct.weight ? Number(initialProduct.weight) : undefined,
        dimensions: initialProduct.dimensions || undefined,
        printableArea: initialProduct.printableArea || undefined,
        mainImage: initialProduct.images?.[0] ? {
          url: initialProduct.images[0].url,
          alt: initialProduct.images[0].alt || undefined,
        } : undefined,
        tags: [], // TODO: Extract from product if tags are stored
        slug: initialProduct.slug,
        publishOption: initialProduct.isActive ? 'publish' : 'draft',
        // Load variant combinations
        variantCombinations: initialProduct.variants && initialProduct.variants.length > 0
          ? initialProduct.variants.map((v) => ({
            color: v.color || 'UNSET',
            size: v.size || 'ONE',
            enabled: true,
            sku: v.sku,
            stockQuantity: v.stockQuantity || 0,
            hasImage: !!v.imageUrl,
          }))
          : undefined,
        // Load colors from variants
        colors: initialProduct.variants && initialProduct.variants.length > 0
          ? (() => {
            const colorMap = new Map<string, {
              color: string;
              colorHex: string;
              displayName: string;
              images: Array<{ url: string; file?: File }>;
              enabled: boolean;
              mappingId?: string;
            }>();

            // First pass: aggregated from variants
            initialProduct.variants.forEach((variant) => {
              if (variant.color) {
                const colorKey = variant.color;
                if (!colorMap.has(colorKey)) {
                  colorMap.set(colorKey, {
                    color: variant.color,
                    colorHex: variant.colorHex || '#CCCCCC',
                    displayName: variant.colorDisplayName || variant.color,
                    images: variant.imageUrl ? [{ url: variant.imageUrl }] : [],
                    enabled: true,
                  });
                } else {
                  // Add image if not already present
                  const colorConfig = colorMap.get(colorKey)!;
                  if (variant.imageUrl && !colorConfig.images.find((img) => img.url === variant.imageUrl)) {
                    colorConfig.images.push({ url: variant.imageUrl });
                  }
                }
              }
            });

            // Second pass: enrich with multi-view images from `colorImages`
            if (initialProduct.colorImages && initialProduct.colorImages.length > 0) {
              initialProduct.colorImages.forEach(ci => {
                const colorKey = ci.colorName;
                if (colorMap.has(colorKey)) {
                  const config = colorMap.get(colorKey)!;
                  // Update Hex if missing
                  if (ci.colorHex && (!config.colorHex || config.colorHex === '#CCCCCC')) {
                    config.colorHex = ci.colorHex;
                  }
                  // Overwrite/Append Images from verified source
                  // If we have verified multi-view images, let's prefer them.
                  if (ci.imageUrls && Array.isArray(ci.imageUrls) && ci.imageUrls.length > 0) {
                    // Filter out existing to avoid dups
                    const newImages = (ci.imageUrls as string[]).map(url => ({ url }));
                    // Strategy: If we have multi-view, replace the single variant image?
                    // Or append? Let's append unique ones.
                    newImages.forEach(newImg => {
                      if (!config.images.find(curr => curr.url === newImg.url)) {
                        config.images.push(newImg);
                      }
                    });
                  }
                }
              });
            }

            return Array.from(colorMap.values());
          })()
          : undefined,
        // Load sizes from variants
        sizes: initialProduct.variants && initialProduct.variants.length > 0
          ? (() => {
            const sizeSet = new Set<string>();
            const sizes: Array<{ size: string; displayName: string; sortOrder: number; enabled: boolean }> = [];

            initialProduct.variants.forEach((variant, index) => {
              if (variant.size && !sizeSet.has(variant.size)) {
                sizeSet.add(variant.size);
                sizes.push({
                  size: variant.size,
                  displayName: variant.size,
                  sortOrder: index,
                  enabled: true,
                });
              }
            });

            return sizes.sort((a, b) => a.sortOrder - b.sortOrder);
          })()
          : undefined,
      };
    }
    return {};
  });

  const updateWizardData = useCallback((data: Partial<ProductWizardData>) => {
    setWizardData((prev) => ({ ...prev, ...data }));
  }, []);

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= STEPS.length) {
      setCurrentStep(step);
    }
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < STEPS.length) {
      window.scrollTo(0, 0);
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const saveDraft = useCallback(async () => {
    setIsLoading(true);
    try {
      // TODO: Implement draft saving logic
      // This will be implemented when we have the API ready
      console.log('Saving draft:', wizardData);

      // For now, just create a placeholder
      // In real implementation, this will call adminProductsApi.create or update with isDraft: true
    } catch (error) {
      console.error('Failed to save draft:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [wizardData]);

  const contextValue: ProductWizardContextType = {
    wizardData,
    updateWizardData,
    currentStep,
    goToStep,
    nextStep,
    prevStep,
    saveDraft,
    isLoading: isLoading || submitting,
    productId: wizardData.productId,
    setSubmitting,
  } as ProductWizardContextType;

  // Render current step component
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1BasicInfo />;
      case 2:
        return <Step2Variants />;
      case 3:
        return <Step3Details />;
      case 4:
        return <Step4Preview />;
      default:
        return null;
    }
  };

  return (
    <ProductWizardContext.Provider value={contextValue}>
      <div className="product-wizard">
        <StepProgressBar currentStep={currentStep} steps={STEPS} onStepClick={goToStep} />
        <div className="product-wizard__content">
          {renderStep()}
        </div>
        <style jsx>{`
          .product-wizard {
            min-height: 100vh;
            background: #f6f6f7;
          }

          .product-wizard__content {
            max-width: 1400px;
            margin: 0 auto;
            padding: 24px;
          }

          @media (max-width: 768px) {
            .product-wizard__content {
              padding: 16px;
            }
          }
        `}</style>
      </div>
    </ProductWizardContext.Provider>
  );
}

