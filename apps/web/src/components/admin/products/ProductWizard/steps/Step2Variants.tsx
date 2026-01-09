'use client';

/**
 * Step 2: Variants Configuration Component
 * 步骤2：变体属性配置
 * Created: 2025-01-06
 */
import React, { useEffect, useMemo } from 'react';
import { useProductWizard } from '../ProductWizard';
import { ColorAttributeConfig, ColorConfig } from '../components/ColorAttributeConfig';
import { SizeAttributeConfig, SizeConfig } from '../components/SizeAttributeConfig';
import {
  VariantCombinationPreview,
  VariantCombination,
} from '../components/VariantCombinationPreview';
import useSWR from 'swr';
import { adminSettingsApi, ColorMappingPayload } from '@/lib/api';

export function Step2Variants() {
  const { wizardData, updateWizardData, nextStep, prevStep, saveDraft, isLoading, productId } =
    useProductWizard();

  const { data: colorMappingsData } = useSWR('admin-color-mappings', adminSettingsApi.getColorMappings);
  const colorMappings = useMemo(() => colorMappingsData?.data || [], [colorMappingsData]);

  const colors = wizardData.colors || [
    {
      color: 'White',
      colorHex: '#FFFFFF',
      displayName: '白色',
      images: [],
      enabled: true,
      mappingId: undefined, // Optional mapping ID
    },
  ];

  const sizes = wizardData.sizes || [
    { size: 'S', displayName: 'S', sortOrder: 0, enabled: true },
    { size: 'M', displayName: 'M', sortOrder: 1, enabled: true },
    { size: 'L', displayName: 'L', sortOrder: 2, enabled: true },
  ];

  // Generate combinations when colors or sizes change
  useEffect(() => {
    const enabledColors = colors.filter((c) => c.enabled);
    const enabledSizes = sizes.filter((s) => s.enabled).sort((a, b) => a.sortOrder - b.sortOrder);

    const newCombinations: VariantCombination[] = [];

    enabledColors.forEach((color) => {
      enabledSizes.forEach((size) => {
        // Check if combination already exists
        const existing = wizardData.variantCombinations?.find(
          (c) => c.color === color.color && c.size === size.size
        );

        const sku = existing?.sku || `${wizardData.sku || 'SKU'}-${color.color.toUpperCase()}-${size.size.toUpperCase()}`;

        newCombinations.push({
          color: color.color,
          size: size.size,
          enabled: existing?.enabled ?? true,
          sku,
          hasImage: color.images && color.images.length > 0,
          stockQuantity: existing?.stockQuantity || 0,
        });
      });
    });

    // Preserve existing combinations that are not in the new list
    const existingCombinations = wizardData.variantCombinations || [];
    existingCombinations.forEach((existing) => {
      if (
        !newCombinations.find(
          (c) => c.color === existing.color && c.size === existing.size
        )
      ) {
        // Keep disabled combinations that are no longer in the enabled list
        if (!existing.enabled) {
          newCombinations.push(existing);
        }
      }
    });

    updateWizardData({ variantCombinations: newCombinations });
    updateWizardData({ variantCombinations: newCombinations });
  }, [colors, sizes, wizardData.sku]);

  // Auto-link initial colors to mappings if they match by name but have no mappingId
  useEffect(() => {
    if (colorMappings.length > 0 && colors.some(c => !c.mappingId)) {
      let changed = false;
      const linkedColors = colors.map(c => {
        if (!c.mappingId) {
          // Try to find by name (case insensitive) or if it's "White" (common default)
          const mapping = colorMappings.find(m =>
            m.productColor.toLowerCase() === c.color.toLowerCase() ||
            m.productColor.toLowerCase() === c.displayName.toLowerCase()
          );
          if (mapping) {
            changed = true;
            return {
              ...c,
              mappingId: mapping.id,
              color: mapping.productColor,
              colorHex: mapping.values[0] || c.colorHex,
              displayName: mapping.productColor
            };
          }
        }
        return c;
      });

      if (changed) {
        updateWizardData({ colors: linkedColors });
      }
    }
  }, [colorMappings, colors]);

  const handleColorsChange = (newColors: ColorConfig[]) => {
    updateWizardData({ colors: newColors });
  };

  const handleSizesChange = (newSizes: SizeConfig[]) => {
    updateWizardData({ sizes: newSizes });
  };

  const handleCombinationsChange = (newCombinations: VariantCombination[]) => {
    updateWizardData({ variantCombinations: newCombinations });
  };

  const handleUploadImage = async (colorIndex: number, file: File): Promise<string> => {
    // TODO: Implement actual image upload
    // For now, return a data URL
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleUploadColorImage = (color: string) => {
    // Find the color index and trigger upload
    const colorIndex = colors.findIndex((c) => c.color === color);
    if (colorIndex >= 0) {
      // Trigger file input
      // This would be handled by the ColorAttributeConfig component
      console.log('Upload image for color:', color);
    }
  };

  const validate = (): boolean => {
    const enabledColors = colors.filter((c) => c.enabled);
    const enabledSizes = sizes.filter((s) => s.enabled);

    if (enabledColors.length === 0) {
      alert('请至少添加一个颜色');
      return false;
    }

    if (enabledSizes.length === 0) {
      alert('请至少添加一个尺寸');
      return false;
    }

    const enabledCombinations = wizardData.variantCombinations?.filter((c) => c.enabled) || [];
    if (enabledCombinations.length === 0) {
      alert('请至少启用一个变体组合');
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (validate()) {
      nextStep();
    }
  };

  const handleSaveDraft = async () => {
    try {
      await saveDraft();
    } catch (error) {
      console.error('Failed to save draft:', error);
      alert('保存草稿失败');
    }
  };

  return (
    <div className="step2-variants">
      <div className="step2-variants__layout">
        {/* Left: Color and Size Configuration */}
        <div className="step2-variants__config">
          <div className="config-section">
            <ColorAttributeConfig
              colors={colors}
              onColorsChange={handleColorsChange}
              onUploadImage={handleUploadImage}
              colorMappings={colorMappings}
            />
          </div>

          <div className="config-section">
            <SizeAttributeConfig
              sizes={sizes}
              onSizesChange={handleSizesChange}
            />
          </div>
        </div>

        {/* Right: Combination Preview */}
        <div className="step2-variants__preview">
          <VariantCombinationPreview
            colors={colors}
            sizes={sizes}
            combinations={wizardData.variantCombinations || []}
            onCombinationsChange={handleCombinationsChange}
            onUploadImage={handleUploadColorImage}
            productSku={wizardData.sku || 'SKU'}
          />
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="step2-variants__actions">
        <button
          type="button"
          className="btn btn--secondary"
          onClick={prevStep}
        >
          上一步
        </button>
        <div className="step2-variants__actions-right">
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
            onClick={handleNext}
          >
            下一步：完善变体信息
          </button>
        </div>
      </div>

      <style jsx>{`
        .step2-variants {
          display: flex;
          flex-direction: column;
          min-height: calc(100vh - 200px);
        }

        .step2-variants__layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          flex: 1;
          margin-bottom: 24px;
        }

        @media (max-width: 1024px) {
          .step2-variants__layout {
            grid-template-columns: 1fr;
          }
        }

        .step2-variants__config {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .config-section {
          /* Section wrapper for spacing */
        }

        .step2-variants__preview {
          position: sticky;
          top: 24px;
          height: fit-content;
          max-height: calc(100vh - 100px);
          overflow-y: auto;
        }

        .step2-variants__actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 0;
          border-top: 1px solid #e1e3e5;
        }

        .step2-variants__actions-right {
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

