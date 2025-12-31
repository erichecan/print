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

export function CategoryForm({ mode, category, onSuccess }: CategoryFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
const [traceId, setTraceId] = useState<string | null>(null); // 添加 traceId 状态
const abortControllerRef = useRef<AbortController | null>(null); // 用于取消请求

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
// 防止重复提交
    if (submitting) {
      return;
    }
    
    setSubmitError(null);
    setTraceId(null);
    setSubmitting(true);
    
// 创建新的 AbortController
    abortControllerRef.current = new AbortController();
    
    try {
      const payload: AdminCategoryPayload = {
        ...values,
        parentId: values.parentId || null,
        sortOrder:
          values.sortOrder !== undefined
            ? Number(values.sortOrder)
            : undefined,
      };

      const response =
        mode === 'create'
          ? await adminCategoriesApi.create(payload)
          : await adminCategoriesApi.update(category!.id, payload);

      if (onSuccess) {
        onSuccess(response);
      }
    } catch (error: any) {
// 统一错误处理，提取 traceId 和错误码
      const errorMessage = error?.message || '提交失败，请稍后重试';
      const errorTraceId = error?.traceId || null;
      const errorCode = error?.errorCode || null;
      
      // 构建用户友好的错误消息
      let userMessage = errorMessage;
      if (errorCode) {
        // 根据错误码提供更友好的提示
        if (errorCode === 'VALIDATION_ERROR') {
          userMessage = '数据验证失败，请检查输入信息';
        } else if (errorCode === 'UNAUTHORIZED') {
          userMessage = '登录已过期，请重新登录';
        } else if (errorCode === 'FORBIDDEN') {
          userMessage = '没有权限执行此操作';
        } else if (errorCode === 'UPSTREAM_TIMEOUT') {
          userMessage = '请求超时，请稍后重试';
        } else if (errorCode === 'NETWORK_ERROR') {
          userMessage = '网络错误，请检查网络连接';
        }
      }
      
      setSubmitError(userMessage);
      setTraceId(errorTraceId);
      
      console.error('[CategoryForm] Submit error:', {
        error: errorMessage,
        traceId: errorTraceId,
        errorCode,
        status: error?.status,
        details: error?.details,
      });
    } finally {
      setSubmitting(false);
      abortControllerRef.current = null;
    }
  };
  
// 重试函数
  const handleRetry = () => {
    if (submitting) return;
    // 重新触发表单提交
    const form = document.querySelector('form.admin-form') as HTMLFormElement;
    if (form) {
      form.requestSubmit();
    }
  };

  return (
    <form className="admin-form" onSubmit={handleSubmit(onSubmit)}>
      <div className="form-card">
        <h2>分类信息</h2>
        <div className="form-field">
          <label>分类名称 *</label>
          <input type="text" {...register('name', { required: true })} />
          {errors.name && <span className="error">请填写分类名称</span>}
        </div>
        <div className="form-field">
          <label>Slug *</label>
          <input type="text" {...register('slug', { required: true })} />
          {errors.slug && <span className="error">请填写唯一 Slug</span>}
        </div>
        <div className="form-field">
          <label>父级分类</label>
          <select {...register('parentId')}>
            <option value="">无（顶级分类）</option>
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
          <label>排序值</label>
          <input type="number" {...register('sortOrder')} />
        </div>
        <div className="form-row">
          <label className="checkbox">
            <input type="checkbox" {...register('isActive')} />
            <span>启用</span>
          </label>
        </div>
      </div>

      <div className="form-card">
        <h2>内容与展示</h2>
        <div className="form-field">
          <label>分类简介</label>
          <textarea rows={4} {...register('description')} />
        </div>
        <div className="form-field">
          <label>封面图地址</label>
          <input type="text" {...register('imageUrl')} />
          <span className="hint">支持 CDN/S3 URL，后续可接入上传。</span>
        </div>
      </div>

      {submitError && (
        <div className="form-error">
          <div>{submitError}</div>
          {traceId && (
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              追踪ID: {traceId}
            </div>
          )}
          <button
            type="button"
            onClick={handleRetry}
            disabled={submitting}
            style={{
              marginTop: '8px',
              padding: '6px 12px',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: '4px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontSize: '14px',
            }}
          >
            重试
          </button>
        </div>
      )}

      <div className="form-actions">
        <button type="submit" className="primary-btn" disabled={submitting}>
          {submitting ? '提交中…' : mode === 'create' ? '创建分类' : '保存修改'}
        </button>
      </div>

      <style jsx>{`
        .admin-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .form-card {
          background: #ffffff;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
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
        .checkbox {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }
        .hint {
          font-size: 12px;
          color: #6b7280;
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
        .form-error {
          padding: 12px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          color: #991b1b;
          margin-bottom: 16px;
        }
      `}</style>
    </form>
  );
}


