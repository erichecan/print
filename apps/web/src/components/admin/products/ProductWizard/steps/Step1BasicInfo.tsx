'use client';

/**
 * Step 1: Basic Info Component
 * 步骤1：基础信息配置
 * Created: 2025-01-06
 */
import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useProductWizard } from '../ProductWizard';
import { ProductCardPreview } from '../ProductCardPreview';
import { adminCategoriesApi, tagGroupsApi, AdminCategorySummary, TagGroup } from '@/lib/api';
import useSWR from 'swr';

export function Step1BasicInfo() {
  const { wizardData, updateWizardData, nextStep, saveDraft, isLoading } = useProductWizard();
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    wizardData.mainImage?.url || null
  );

  const { data: categoryResponse } = useSWR(
    ['admin-categories', 'all'],
    () => adminCategoriesApi.list({ limit: 200 })
  );
  const { data: tagGroups = [] } = useSWR<TagGroup[]>('tag-groups', () => tagGroupsApi.list());

  const categories = categoryResponse?.data ?? [];

  // Auto-generate slug from name
  useEffect(() => {
    if (wizardData.name && !wizardData.slug) {
      const slug = wizardData.name
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 60);
      updateWizardData({ slug });
    }
  }, [wizardData.name, wizardData.slug, updateWizardData]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    updateWizardData({ name });
    if (errors.name) {
      setErrors((prev) => ({ ...prev, name: '' }));
    }
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const categoryId = e.target.value;
    updateWizardData({ categoryId: categoryId || undefined });
    if (errors.categoryId) {
      setErrors((prev) => ({ ...prev, categoryId: '' }));
    }
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateWizardData({ description: e.target.value });
  };

  const handleLongDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateWizardData({ longDescription: e.target.value });
  };

  const activeTags: string[] = wizardData.tags || [];

  function toggleTag(tag: string) {
    const next = activeTags.includes(tag)
      ? activeTags.filter((t) => t !== tag)
      : [...activeTags, tag];
    updateWizardData({ tags: next });
  }

  const handleFileSelect = (file: File) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        image: '不支持的文件类型，请上传 JPG、PNG、WEBP 或 GIF 格式的图片',
      }));
      return;
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setErrors((prev) => ({
        ...prev,
        image: '文件大小不能超过 10MB',
      }));
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const previewUrl = e.target.result as string;
        setImagePreview(previewUrl);
        updateWizardData({
          mainImage: {
            url: previewUrl,
            file: file,
            alt: wizardData.mainImage?.alt || wizardData.name || '',
          },
        });
      }
    };
    reader.readAsDataURL(file);

    if (errors.image) {
      setErrors((prev) => ({ ...prev, image: '' }));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    updateWizardData({ mainImage: undefined });
  };

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!wizardData.name || !wizardData.name.trim()) {
      newErrors.name = '请输入商品名称';
    }

    if (!wizardData.categoryId) {
      newErrors.categoryId = '请选择商品分类';
    }

    if (!wizardData.mainImage || !wizardData.mainImage.url) {
      newErrors.image = '请上传商品主图';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      nextStep();
    }
  };

  const handleSaveDraft = async () => {
    try {
      await saveDraft();
      // TODO: Show success message
    } catch (error) {
      console.error('Failed to save draft:', error);
      // TODO: Show error message
    }
  };

  return (
    <div className="step1-basic-info">
      <div className="step1-basic-info__layout">
        {/* Left: Form */}
        <div className="step1-basic-info__form">
          <div className="step1-basic-info__section">
            <h2 className="step1-basic-info__section-title">基础信息</h2>

            {/* Product Name */}
            <div className="form-field">
              <label className="form-field__label">
                商品名称 <span className="required">*</span>
              </label>
              <input
                type="text"
                className="form-field__input"
                placeholder="例如：短袖T恤"
                value={wizardData.name || ''}
                onChange={handleNameChange}
              />
              {errors.name && <span className="form-field__error">{errors.name}</span>}
            </div>

            {/* Category */}
            <div className="form-field">
              <label className="form-field__label">
                商品分类 <span className="required">*</span>
              </label>
              <select
                className="form-field__select"
                value={wizardData.categoryId || ''}
                onChange={handleCategoryChange}
              >
                <option value="">请选择分类</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <span className="form-field__error">{errors.categoryId}</span>
              )}
              <p className="form-field__hint">仅用于后台管理分组，不影响前台类目页展示。例如 Hoodie 选 Gildan Blanks 即可。</p>
            </div>

            {/* Description */}
            <div className="form-field">
              <label className="form-field__label">商品描述</label>
              <textarea
                className="form-field__textarea"
                rows={4}
                placeholder="简要描述商品特点..."
                value={wizardData.description || ''}
                onChange={handleDescriptionChange}
              />
            </div>

            {/* Long Description */}
            <div className="form-field">
              <label className="form-field__label">详细描述</label>
              <textarea
                className="form-field__textarea"
                rows={6}
                placeholder="详细介绍商品信息..."
                value={wizardData.longDescription || ''}
                onChange={handleLongDescriptionChange}
              />
            </div>

            {/* Main Image */}
            <div className="form-field">
              <label className="form-field__label">
                商品主图 <span className="required">*</span>
              </label>
              {imagePreview ? (
                <div className="image-preview-container">
                  <div className="image-preview">
                    <Image
                      src={imagePreview}
                      alt={wizardData.name || 'Product'}
                      fill
                      style={{ objectFit: 'cover' }}
                      unoptimized
                    />
                  </div>
                  <button
                    type="button"
                    className="image-remove-btn"
                    onClick={handleRemoveImage}
                  >
                    移除图片
                  </button>
                </div>
              ) : (
                <div
                  className="image-upload-area"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="image-upload-placeholder">
                    <span className="upload-icon">📷</span>
                    <div className="upload-text">
                      <span className="upload-link">点击上传</span>
                      {' '}或拖拽图片到这里
                    </div>
                    <div className="upload-hint">支持 JPG、PNG、WEBP、GIF，最大 10MB</div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleFileSelect(e.target.files[0]);
                      }
                    }}
                  />
                </div>
              )}
              {errors.image && <span className="form-field__error">{errors.image}</span>}
            </div>

            {/* Product Tags */}
            <div className="form-field">
              <label className="form-field__label">
                商品标签 <span className="required">*</span>
              </label>
              <div className="tags-routing-notice">
                <strong>商品打了什么 tag → 自动出现在对应类目页，无需其他操作</strong>
                <div className="tags-routing-map">
                  <span>Hoodie / Crewneck Sweatshirt → Hoodies &amp; Sweatshirts</span>
                  <span>T-Shirt → T-Shirts</span>
                  <span>Youth → Kids</span>
                  <span>Women&apos;s → Women&apos;s</span>
                  <span>Cap / Hat / Beanie → Hats</span>
                  <span>Mug → Mugs</span>
                </div>
              </div>
              <div className="tags-editor">
                {tagGroups.filter((g) => g.isActive).map((group) => (
                  <div key={group.id} className="tags-dimension">
                    <div className="tags-dimension__label">{group.name}</div>
                    <div className="tags-dimension__chips">
                      {group.tags.map((tag) => {
                        const isOn = activeTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            className={`tag-chip${isOn ? ' tag-chip--on' : ''}`}
                            onClick={() => toggleTag(tag)}
                          >
                            {isOn && <span className="tag-chip__check">✓</span>}
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {activeTags.length > 0 && (
                <p className="form-field__hint">
                  已选 {activeTags.length} 个：{activeTags.join(', ')}
                </p>
              )}
            </div>

          </div>
        </div>

        {/* Right: Preview */}
        <div className="step1-basic-info__preview">
          <ProductCardPreview wizardData={wizardData} />
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="step1-basic-info__actions">
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
          下一步：设置变体
        </button>
      </div>

      <style jsx>{`
        .step1-basic-info {
          display: flex;
          flex-direction: column;
          min-height: calc(100vh - 200px);
        }

        .step1-basic-info__layout {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 24px;
          flex: 1;
        }

        @media (max-width: 1024px) {
          .step1-basic-info__layout {
            grid-template-columns: 1fr;
          }
        }

        .step1-basic-info__form {
          background: #fff;
          border-radius: 8px;
          padding: 24px;
          border: 1px solid #e1e3e5;
        }

        .step1-basic-info__section {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .step1-basic-info__section-title {
          font-size: 20px;
          font-weight: 600;
          margin: 0 0 8px 0;
          color: #202223;
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-field__label {
          font-size: 14px;
          font-weight: 500;
          color: #202223;
        }

        .required {
          color: #e74c3c;
        }

        .form-field__input,
        .form-field__select,
        .form-field__textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #c9cccf;
          border-radius: 4px;
          font-size: 14px;
          color: #202223;
          font-family: inherit;
          transition: border-color 0.2s;
        }

        .form-field__input:focus,
        .form-field__select:focus,
        .form-field__textarea:focus {
          border-color: #005bd3;
          outline: none;
          box-shadow: 0 0 0 1px #005bd3;
        }

        .form-field__textarea {
          resize: vertical;
          min-height: 80px;
        }

        .form-field__error {
          font-size: 12px;
          color: #e74c3c;
        }

        .form-field__hint {
          font-size: 12px;
          color: #6d7175;
        }

        .image-upload-area {
          border: 2px dashed #c9cccf;
          border-radius: 4px;
          padding: 40px 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          background: #fafbfb;
        }

        .image-upload-area:hover {
          border-color: #005bd3;
          background: #f0f7ff;
        }

        .image-upload-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .upload-icon {
          font-size: 48px;
        }

        .upload-text {
          font-size: 14px;
          color: #202223;
        }

        .upload-link {
          color: #005bd3;
          font-weight: 600;
          text-decoration: underline;
        }

        .upload-hint {
          font-size: 12px;
          color: #6d7175;
        }

        .image-preview-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .image-preview {
          position: relative;
          width: 100%;
          aspect-ratio: 4 / 5;
          border-radius: 4px;
          overflow: hidden;
          border: 1px solid #e1e3e5;
        }

        .image-remove-btn {
          padding: 8px 16px;
          background: #fff;
          border: 1px solid #c9cccf;
          border-radius: 4px;
          color: #202223;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .image-remove-btn:hover {
          background: #f6f6f7;
          border-color: #8c9196;
        }

        .step1-basic-info__preview {
          position: sticky;
          top: 24px;
          height: fit-content;
        }

        .step1-basic-info__actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 0;
          margin-top: 24px;
          border-top: 1px solid #e1e3e5;
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

        .tags-routing-notice {
          padding: 10px 12px;
          background: #f0f7ff;
          border: 1px solid #b3d4ff;
          border-radius: 6px;
          font-size: 13px;
          color: #202223;
        }

        .tags-routing-notice strong {
          display: block;
          margin-bottom: 8px;
          color: #005bd3;
        }

        .tags-routing-map {
          display: flex;
          flex-wrap: wrap;
          gap: 4px 16px;
        }

        .tags-routing-map span {
          font-size: 12px;
          color: #6d7175;
          white-space: nowrap;
        }

        .tags-editor {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 12px;
          border: 1px solid #e1e3e5;
          border-radius: 6px;
          background: #fafbfb;
        }

        .tags-dimension__label {
          font-size: 12px;
          font-weight: 600;
          color: #6d7175;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 6px;
        }

        .tags-dimension__chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .tag-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border: 1px solid #c9cccf;
          border-radius: 4px;
          background: #fff;
          color: #202223;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .tag-chip:hover {
          border-color: #005bd3;
          color: #005bd3;
        }

        .tag-chip--on {
          background: #005bd3;
          border-color: #005bd3;
          color: #fff;
        }

        .tag-chip--on:hover {
          background: #0047b3;
          border-color: #0047b3;
        }

        .tag-chip__check {
          font-size: 11px;
        }
      `}</style>
    </div>
  );
}

