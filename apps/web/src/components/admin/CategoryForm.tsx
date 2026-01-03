'use client';

/**
 * Admin Category Form
* 后台分类创建/编辑表单
 */
import { useEffect, useMemo, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import useSWR from 'swr';
import {
  adminCategoriesApi,
  AdminCategoryDetail,
  AdminCategoryPayload,
  AdminCategorySummary,
} from '@/lib/api';

interface CategoryFormProps {
  mode: 'create' | 'edit';
  category?: AdminCategoryDetail;
  onSuccess?: (category: AdminCategoryDetail) => void;
}

import { ImageUploader } from './ImageUploader';

// ... (imports remain the same, except ImageUploader added above)

export function CategoryForm({ mode, category, onSuccess }: CategoryFormProps) {
  // ... (hooks remain mostly the same)
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [traceId, setTraceId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { data: categoryResponse } = useSWR(
    ['admin-categories', 'parent-options'],
    () => adminCategoriesApi.list({ limit: 200 })
  );

  const categories = useMemo<AdminCategorySummary[]>(() => {
    return categoryResponse?.data ?? [];
  }, [categoryResponse]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AdminCategoryPayload>({
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      imageUrl: '',
      parentId: '',
      sortOrder: 0,
      isActive: true,
    },
  });

  const imageUrl = watch('imageUrl');

  useEffect(() => {
    if (category) {
      reset({
        name: category.name,
        slug: category.slug,
        description: category.description || '',
        imageUrl: category.imageUrl || '',
        parentId: category.parent?.id || '',
        sortOrder: category.sortOrder,
        isActive: category.isActive,
      });
    }
  }, [category, reset]);

  const onSubmit = async (values: AdminCategoryPayload) => {
    if (submitting) return;
    setSubmitError(null);
    setTraceId(null);
    setSubmitting(true);
    abortControllerRef.current = new AbortController();

    try {
      const payload: AdminCategoryPayload = {
        ...values,
        parentId: values.parentId || null,
        sortOrder: values.sortOrder !== undefined ? Number(values.sortOrder) : undefined,
      };

      const response =
        mode === 'create'
          ? await adminCategoriesApi.create(payload)
          : await adminCategoriesApi.update(category!.id, payload);

      if (onSuccess) {
        onSuccess(response);
      }
    } catch (error: any) {
      // ... (error handling remains the same)
      const errorMessage = error?.message || '提交失败，请稍后重试';
      setSubmitError(errorMessage);
    } finally {
      setSubmitting(false);
      abortControllerRef.current = null;
    }
  };

  const handleRetry = () => {
    if (submitting) return;
    const form = document.querySelector('form.admin-form') as HTMLFormElement;
    if (form) form.requestSubmit();
  };

  return (
    <form className="admin-form" onSubmit={handleSubmit(onSubmit)}>
      <div className="form-layout">
        {/* Main Column */}
        <div className="form-main">
          <div className="form-card">
            <h2>Category Details</h2>
            <div className="form-field">
              <label>Title</label>
              <input type="text" {...register('name', { required: true })} placeholder="e.g., Summer Collection" />
              {errors.name && <span className="error">Title is required</span>}
            </div>
            <div className="form-field">
              <label>Description</label>
              <textarea rows={6} {...register('description')} placeholder="Write a description..." />
            </div>
          </div>

          <div className="form-card">
            <h2>URL Handle</h2>
            <div className="form-field">
              <label>Slug</label>
              <input type="text" {...register('slug', { required: true })} />
              {errors.slug && <span className="error">Slug is required</span>}
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="form-sidebar">
          <div className="form-card">
            <h2>Publishing</h2>
            <div className="form-field">
              <label className="checkbox">
                <input type="checkbox" {...register('isActive')} />
                <span>Online Store</span>
              </label>
            </div>
          </div>

          <div className="form-card">
            <h2>Image</h2>
            <div className="form-field">
              <ImageUploader
                currentUrl={imageUrl}
                onUploadComplete={(url) => setValue('imageUrl', url)}
                onRemove={() => setValue('imageUrl', '')}
                label="Category Cover"
              />
            </div>
          </div>

          <div className="form-card">
            <h2>Organization</h2>
            <div className="form-field">
              <label>Parent Category</label>
              <select {...register('parentId')}>
                <option value="">None (Top Level)</option>
                {categories
                  .filter((item) => item.id !== category?.id)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="form-field">
              <label>Sort Order</label>
              <input type="number" {...register('sortOrder')} />
            </div>
          </div>
        </div>
      </div>

      {submitError && (
        <div className="form-error">
          <div>{submitError}</div>
          <button type="button" onClick={handleRetry} className="retry-btn">Retry</button>
        </div>
      )}

      <div className="form-actions-bar">
        {/* Could add Delete button here for Edit mode */}
        <button type="submit" className="primary-btn" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save'}
        </button>
      </div>

      <style jsx>{`
        .admin-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .form-layout {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
        }
        @media (max-width: 768px) {
          .form-layout {
            grid-template-columns: 1fr;
          }
        }
        .form-main, .form-sidebar {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .form-card {
          background: #ffffff;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
        }
        h2 {
          margin: 0 0 16px;
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
        }
        .form-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
        }
        .form-field:last-child {
          margin-bottom: 0;
        }
        .form-field label {
          font-size: 14px;
          font-weight: 500;
          color: #475569;
        }
        .form-field input[type="text"],
        .form-field input[type="number"],
        .form-field select,
        .form-field textarea {
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 8px 12px;
          font-size: 14px;
          transition: border-color 0.2s;
          width: 100%;
        }
        .form-field input:focus,
        .form-field select:focus,
        .form-field textarea:focus {
          border-color: #2563eb;
          outline: none;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
        }
        .checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          white-space: nowrap; /* Prevent text wrapping */
        }
        .form-actions-bar {
          display: flex;
          justify-content: flex-end;
          padding-top: 16px;
          border-top: 1px solid #e2e8f0;
        }
        .primary-btn {
          background: #1e293b;
          color: white;
          padding: 10px 20px;
          border-radius: 6px;
          font-weight: 500;
          border: none;
          cursor: pointer;
        }
        .primary-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .primary-btn:hover:not(:disabled) {
          background: #0f172a;
        }
        .error {
          color: #ef4444;
          font-size: 12px;
        }
        .form-error {
          background: #fee2e2;
          color: #991b1b;
          padding: 12px;
          border-radius: 6px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .retry-btn {
          background: white;
          border: 1px solid #fecaca;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
        }
      `}</style>
    </form>
  );
}


