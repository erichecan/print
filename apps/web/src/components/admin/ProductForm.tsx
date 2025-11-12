'use client';

/**
 * Admin Product Form
 * [2025-11-11 23:22:48] 后台商品创建/编辑表单
 */
import { useEffect, useMemo, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import useSWR from 'swr';
import {
  adminCategoriesApi,
  adminProductsApi,
  AdminCategorySummary,
  AdminProductDetail,
  AdminProductPayload,
} from '@/lib/api';

interface ProductFormProps {
  mode: 'create' | 'edit';
  product?: AdminProductDetail;
  onSuccess?: (product: AdminProductDetail) => void;
}

const defaultVariant = {
  sku: '',
  color: '',
  size: '',
  stockQuantity: 0,
  priceAdjustment: 0,
};

const defaultImage = {
  url: '',
  alt: '',
  sortOrder: 0,
};

const parseNumber = (value: any) => {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export function ProductForm({ mode, product, onSuccess }: ProductFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: categoryResponse } = useSWR(
    ['admin-categories', 'all'],
    () => adminCategoriesApi.list({ limit: 200 })
  );

  const categories = useMemo<AdminCategorySummary[]>(() => {
    return categoryResponse?.data ?? [];
  }, [categoryResponse]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AdminProductPayload>({
    defaultValues: {
      name: '',
      slug: '',
      categoryId: '',
      sku: '',
      basePrice: 0,
      salePrice: 0,
      unitCost: 0,
      stockQuantity: 0,
      description: '',
      longDescription: '',
      isActive: true,
      isCustomizable: true,
      variants: [defaultVariant],
      images: [defaultImage],
      collections: [],
    },
  });

  const {
    fields: variantFields,
    append: appendVariant,
    remove: removeVariant,
  } = useFieldArray({
    control,
    name: 'variants',
  });

  const {
    fields: imageFields,
    append: appendImage,
    remove: removeImage,
  } = useFieldArray({
    control,
    name: 'images',
  });

  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        slug: product.slug,
        categoryId: product.category?.id || '',
        sku: product.sku,
        basePrice: Number(product.basePrice),
        salePrice: Number(product.salePrice),
        unitCost: Number(product.unitCost),
        grossProfit: Number(product.grossProfit),
        stockQuantity: product.stockQuantity,
        description: product.description || '',
        longDescription: product.longDescription || '',
        isActive: product.isActive,
        isCustomizable: product.isCustomizable,
        weight: product.weight ? Number(product.weight) : undefined,
        dimensions: product.dimensions || '',
        variants:
          product.variants?.length
            ? product.variants.map((variant) => ({
                sku: variant.sku,
                color: variant.color || '',
                size: variant.size || '',
                stockQuantity: variant.stockQuantity,
                priceAdjustment: 0,
              }))
            : [defaultVariant],
        images:
          product.images?.length
            ? product.images.map((image) => ({
                url: image.url,
                alt: image.alt || '',
                sortOrder: image.sortOrder,
              }))
            : [defaultImage],
        collections: product.collectionProducts?.map(
          (item) => item.collection.id
        ),
      });
    }
  }, [product, reset]);

  const onSubmit = async (values: AdminProductPayload) => {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const payload: AdminProductPayload = {
        ...values,
        basePrice: parseNumber(values.basePrice),
        salePrice: values.salePrice !== undefined ? parseNumber(values.salePrice) : undefined,
        unitCost: values.unitCost !== undefined ? parseNumber(values.unitCost) : undefined,
        grossProfit:
          values.grossProfit !== undefined
            ? parseNumber(values.grossProfit)
            : undefined,
        stockQuantity:
          values.stockQuantity !== undefined
            ? parseNumber(values.stockQuantity)
            : undefined,
        weight:
          values.weight !== undefined && values.weight !== null
            ? parseNumber(values.weight)
            : undefined,
        variants: values.variants
          ?.filter((variant) => variant?.sku)
          .map((variant) => ({
            ...variant,
            stockQuantity:
              variant.stockQuantity !== undefined
                ? parseNumber(variant.stockQuantity)
                : 0,
            priceAdjustment:
              variant.priceAdjustment !== undefined
                ? parseNumber(variant.priceAdjustment)
                : 0,
          })),
        images: values.images
          ?.filter((image) => image?.url)
          .map((image, index) => ({
            ...image,
            sortOrder:
              image.sortOrder !== undefined
                ? parseNumber(image.sortOrder)
                : index,
          })),
      };

      const response =
        mode === 'create'
          ? await adminProductsApi.create(payload)
          : await adminProductsApi.update(product!.id, payload);

      if (onSuccess) {
        onSuccess(response);
      }
    } catch (error: any) {
      setSubmitError(error?.message || '提交失败，请稍后再试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="admin-form" onSubmit={handleSubmit(onSubmit)}>
      <div className="form-grid">
        <div className="form-card">
          <h2>基础信息</h2>
          <div className="form-field">
            <label>商品名称 *</label>
            <input type="text" {...register('name', { required: true })} />
            {errors.name && <span className="error">请填写商品名称</span>}
          </div>
          <div className="form-field">
            <label>自定义 Slug</label>
            <input type="text" {...register('slug')} placeholder="不填写则自动生成" />
          </div>
          <div className="form-field">
            <label>SKU *</label>
            <input type="text" {...register('sku', { required: true })} />
            {errors.sku && <span className="error">请填写 SKU</span>}
          </div>
          <div className="form-field">
            <label>所属分类 *</label>
            <select {...register('categoryId', { required: true })}>
              <option value="">选择分类</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {errors.categoryId && (
              <span className="error">请选择分类</span>
            )}
          </div>
          <div className="form-field">
            <label>描述</label>
            <textarea rows={3} {...register('description')} />
          </div>
          <div className="form-field">
            <label>详细描述</label>
            <textarea rows={5} {...register('longDescription')} />
          </div>
        </div>

        <div className="form-card">
          <h2>定价与库存</h2>
          <div className="form-field">
            <label>基础价格 *</label>
            <input
              type="number"
              step="0.01"
              {...register('basePrice', { required: true, min: 0 })}
            />
            {errors.basePrice && (
              <span className="error">请填写基础价格</span>
            )}
          </div>
          <div className="form-field">
            <label>促销价格</label>
            <input type="number" step="0.01" {...register('salePrice')} />
          </div>
          <div className="form-field">
            <label>单位成本</label>
            <input type="number" step="0.01" {...register('unitCost')} />
          </div>
          <div className="form-field">
            <label>毛利</label>
            <input type="number" step="0.01" {...register('grossProfit')} />
          </div>
          <div className="form-field">
            <label>库存数量</label>
            <input type="number" {...register('stockQuantity')} />
          </div>
          <div className="form-row">
            <label className="checkbox">
              <input type="checkbox" {...register('isActive')} />
              <span>上架展示</span>
            </label>
            <label className="checkbox">
              <input type="checkbox" {...register('isCustomizable')} />
              <span>支持定制</span>
            </label>
          </div>
          <div className="form-field">
            <label>重量(kg)</label>
            <input type="number" step="0.01" {...register('weight')} />
          </div>
          <div className="form-field">
            <label>尺寸说明</label>
            <input type="text" {...register('dimensions')} />
          </div>
        </div>
      </div>

      <div className="form-card">
        <div className="form-card-header">
          <h2>商品图片</h2>
          <button
            type="button"
            className="text-button"
            onClick={() => appendImage(defaultImage)}
          >
            添加图片
          </button>
        </div>
        {imageFields.length === 0 && (
          <p className="hint">尚未添加图片，可使用 CDN/S3 URL。</p>
        )}
        {imageFields.map((field, index) => (
          <div key={field.id} className="repeatable">
            <div className="form-field">
              <label>图片地址 *</label>
              <input
                type="text"
                {...register(`images.${index}.url` as const, { required: true })}
              />
            </div>
            <div className="form-field">
              <label>ALT 文案</label>
              <input type="text" {...register(`images.${index}.alt` as const)} />
            </div>
            <div className="form-row">
              <div className="form-field">
                <label>排序值</label>
                <input
                  type="number"
                  {...register(`images.${index}.sortOrder` as const)}
                />
              </div>
              <button
                type="button"
                className="text-button danger"
                onClick={() => removeImage(index)}
              >
                删除
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="form-card">
        <div className="form-card-header">
          <h2>商品变体</h2>
          <button
            type="button"
            className="text-button"
            onClick={() => appendVariant(defaultVariant)}
          >
            添加变体
          </button>
        </div>
        {variantFields.length === 0 && (
          <p className="hint">暂无变体，点击右上角按钮添加。</p>
        )}
        {variantFields.map((field, index) => (
          <div key={field.id} className="repeatable">
            <div className="form-field">
              <label>变体 SKU *</label>
              <input
                type="text"
                {...register(`variants.${index}.sku` as const, { required: true })}
              />
            </div>
            <div className="form-grid-inline">
              <div className="form-field">
                <label>颜色</label>
                <input type="text" {...register(`variants.${index}.color` as const)} />
              </div>
              <div className="form-field">
                <label>尺码</label>
                <input type="text" {...register(`variants.${index}.size` as const)} />
              </div>
              <div className="form-field">
                <label>库存</label>
                <input
                  type="number"
                  {...register(`variants.${index}.stockQuantity` as const)}
                />
              </div>
              <div className="form-field">
                <label>价格调整</label>
                <input
                  type="number"
                  step="0.01"
                  {...register(`variants.${index}.priceAdjustment` as const)}
                />
              </div>
            </div>
            <button
              type="button"
              className="text-button danger"
              onClick={() => removeVariant(index)}
            >
              删除变体
            </button>
          </div>
        ))}
      </div>

      {submitError && <div className="form-error">{submitError}</div>}

      <div className="form-actions">
        <button type="submit" className="primary-btn" disabled={submitting}>
          {submitting ? '提交中…' : mode === 'create' ? '创建商品' : '保存修改'}
        </button>
      </div>

      <style jsx>{`
        .admin-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .form-grid {
          display: grid;
          gap: 24px;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        }
        .form-card {
          background: #ffffff;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
        }
        .form-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        h2 {
          margin: 0 0 16px;
          font-size: 18px;
        }
        .form-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 16px;
        }
        .form-field label {
          font-size: 14px;
          color: #475569;
        }
        .form-field input,
        .form-field select,
        .form-field textarea {
          border: 1px solid #cbd5f5;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 14px;
          transition: border 0.2s ease, box-shadow 0.2s ease;
        }
        .form-field textarea {
          resize: vertical;
        }
        .form-field input:focus,
        .form-field select:focus,
        .form-field textarea:focus {
          border-color: #ff1f3d;
          outline: none;
          box-shadow: 0 0 0 3px rgba(255, 31, 61, 0.1);
        }
        .form-row {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          align-items: center;
        }
        .form-grid-inline {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 16px;
          margin-bottom: 12px;
        }
        .checkbox {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }
        .hint {
          font-size: 14px;
          color: #6b7280;
        }
        .repeatable {
          padding: 16px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          margin-bottom: 16px;
          background: #f8fafc;
        }
        .text-button {
          background: none;
          border: none;
          color: #ff1f3d;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
        }
        .text-button.danger {
          color: #ef4444;
        }
        .form-error {
          padding: 12px 16px;
          border-radius: 10px;
          background: rgba(239, 68, 68, 0.12);
          color: #b91c1c;
        }
        .form-actions {
          display: flex;
          justify-content: flex-end;
        }
        .primary-btn {
          padding: 12px 24px;
          background: #ff1f3d;
          border: none;
          border-radius: 999px;
          color: #fff;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .primary-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 20px rgba(255, 31, 61, 0.25);
        }
        .primary-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          box-shadow: none;
        }
        .error {
          font-size: 12px;
          color: #ef4444;
        }
      `}</style>
    </form>
  );
}


