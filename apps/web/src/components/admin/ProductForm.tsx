'use client';

/**
 * Admin Product Form
* 后台商品创建/编辑表单
 */
import { useEffect, useMemo, useState, useRef } from 'react';
import Image from 'next/image'; // 商品图片预览使用 Next Image
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
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadingImages, setUploadingImages] = useState<{ [key: number]: boolean }>({});
  const [uploadProgress, setUploadProgress] = useState<{ [key: number]: number }>({});
  const [imagePreviews, setImagePreviews] = useState<{ [key: number]: string }>({});
  const [traceId, setTraceId] = useState<string | null>(null); // 添加 traceId 状态
  const fileRefs = useRef<{ [key: number]: File }>({});
  const abortControllerRef = useRef<AbortController | null>(null); // 用于取消请求
  const isUploadingAny = useMemo(() => Object.values(uploadingImages).some(Boolean), [uploadingImages]);

  // 自动关闭成功提示
  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [saveSuccess]);

  const { data: categoryResponse } = useSWR(
    ['admin-categories', 'all'],
    () => adminCategoriesApi.list({ limit: 200 })
  );

  const categories = useMemo<AdminCategorySummary[]>(() => {
    const list = categoryResponse?.data ?? [];

    // FIX: If product has a category that's not in the (active/limited) list, 
    // we must add it as an option so the select element doesn't reset to empty.
    if (product?.category && !list.find(c => c.id === product.category?.id)) {
      return [...list, {
        id: product.category.id,
        name: `${product.category.name} (当前)`,
      } as AdminCategorySummary];
    }

    return list;
  }, [categoryResponse, product]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
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
      printableArea: {
        front: { width: 546, height: 960, x: 326, y: 240 },
        back: { width: 546, height: 960, x: 326, y: 240 },
        sleeve: { width: 500, height: 500, x: 600, y: 300 },
      },
    },
  });

  // 自动生成/规范化 slug，展示说明
  const nameValue = watch('name');
  const slugValue = watch('slug');
  useEffect(() => {
    const slugify = (value: string) =>
      value
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 60);
    if (nameValue && (!slugValue || slugValue.trim() === '')) {
      setValue('slug' as any, slugify(nameValue));
    }
  }, [nameValue, slugValue, setValue]);

  // 自动计算毛利：(促销价 || 基础价) - 单位成本
  const basePriceValue = watch('basePrice');
  const salePriceValue = watch('salePrice');
  const unitCostValue = watch('unitCost');

  useEffect(() => {
    const price = Number(salePriceValue) > 0 ? Number(salePriceValue) : Number(basePriceValue);
    const cost = Number(unitCostValue);

    if (!Number.isNaN(price) && !Number.isNaN(cost)) {
      const profit = price - cost;
      // 只有当毛利字段为空或需要更新时才自动设置，避免干扰用户手动微调
      // 在这里我们选择自动更新以保持逻辑一致
      setValue('grossProfit', Number(profit.toFixed(2)) as any);
    }
  }, [basePriceValue, salePriceValue, unitCostValue, setValue]);

  // 自动根据变体库存计算总库存
  const variantsValue = watch('variants');
  const isCustomizableValue = watch('isCustomizable');

  useEffect(() => {
    // 只有当开启多规格且有变体数据时才自动计算
    if (isCustomizableValue && variantsValue && variantsValue.length > 0) {
      const totalStock = variantsValue.reduce((sum, v) => sum + (Number(v.stockQuantity) || 0), 0);
      setValue('stockQuantity', totalStock);
    }
  }, [variantsValue, isCustomizableValue, setValue]);

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


  // Handle file selection and preview
  const handleFileSelect = async (index: number, file: File) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setSubmitError('不支持的文件类型，请上传 JPG、PNG、WEBP 或 GIF 格式的图片');
      return;
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setSubmitError('文件大小不能超过 10MB');
      return;
    }

    // Store file reference
    fileRefs.current[index] = file;

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setImagePreviews((prev) => ({ ...prev, [index]: e.target!.result as string }));
      }
    };
    reader.readAsDataURL(file);

    // If editing existing product, upload immediately
    if (mode === 'edit' && product?.id) {
      await handleImageUpload(product.id, index, file);
    } else {
      // For new products, store file for later upload
      // Set a placeholder URL to indicate file is ready
      setValue(`images.${index}.url` as any, `file://${file.name}`);
    }
  };

  // Upload image to server
  const handleImageUpload = async (productId: string, index: number, file: File) => {
    setUploadingImages((prev) => ({ ...prev, [index]: true }));
    setUploadProgress((prev) => ({ ...prev, [index]: 0 }));

    try {
      // Get ALT text from form
      const currentImages = watch('images') || [];
      const altText = currentImages[index]?.alt || '';

      const response = await adminProductsApi.uploadImages(
        productId,
        [file],
        altText ? [altText] : undefined
      );

      if (response.images && response.images.length > 0) {
        // FIX: uploadImages returns ALL images for the product, 
        // the newly uploaded one will be at the end of the sorted list.
        const uploadedImage = response.images[response.images.length - 1];
        setValue(`images.${index}.url` as any, uploadedImage.url);
        if (uploadedImage.alt) {
          setValue(`images.${index}.alt` as any, uploadedImage.alt);
        }
        if (uploadedImage.sortOrder !== undefined) {
          setValue(`images.${index}.sortOrder` as any, uploadedImage.sortOrder);
        }
        // Clear file ref after successful upload
        delete fileRefs.current[index];
      }
    } catch (error: any) {
      setSubmitError(error?.message || '图片上传失败，请稍后再试');
    } finally {
      setUploadingImages((prev) => ({ ...prev, [index]: false }));
      setUploadProgress((prev) => ({ ...prev, [index]: 0 }));
    }
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(index, files[0]); // Handle single file drop replacement
    }
  };

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
        printableArea: product.printableArea || {
          front: { width: 546, height: 960, x: 326, y: 240 },
          back: { width: 546, height: 960, x: 326, y: 240 },
          sleeve: { width: 500, height: 500, x: 600, y: 300 },
        },
      });
    }
  }, [product, reset]);

  const onSubmit = async (values: AdminProductPayload) => {
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
      // Store files to upload after product creation
      const filesToUpload: { [index: number]: File } = {};
      const currentImages = watch('images') || [];

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
          // Only filter completely empty rows if needed, but let's be permissive
          ?.map((variant) => ({
            ...variant,
            // Auto-generate SKU if missing
            sku: variant.sku || `${values.sku || 'SKU'}-${variant.color || 'CO'}-${variant.size || 'SZ'}`.replace(/[^a-zA-Z0-9-]/g, '-').toUpperCase(),
            stockQuantity:
              variant.stockQuantity !== undefined
                ? parseNumber(variant.stockQuantity)
                : 0,
            priceAdjustment:
              variant.priceAdjustment !== undefined
                ? parseNumber(variant.priceAdjustment)
                : 0,
          })),
        // Filter out temporary file placeholders, keep only valid URLs
        images: values.images
          ?.filter((image, index) => {
            // If it's a file placeholder (starts with file://), don't include in payload
            if (image.url && image.url.startsWith('file://')) {
              return false; // Don't include in initial payload, will upload after creation
            }
            return image.url && (image.url.startsWith('http') || image.url.startsWith('/')); // Only include valid URLs
          })
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

      // Upload any pending files after product creation/update
      // FIX: Also enable for 'edit' mode to handle race conditions or missed uploads
      const hasPendingFiles = Object.keys(fileRefs.current).length > 0;
      if (response.id && hasPendingFiles) {
        const uploadPromises: Promise<void>[] = [];
        Object.keys(fileRefs.current).forEach((key) => {
          const index = parseInt(key, 10);
          const file = fileRefs.current[index];
          if (file) {
            uploadPromises.push(
              handleImageUpload(response.id, index, file).catch((err) => {
                console.error(`Failed to upload image ${index}:`, err);
              })
            );
          }
        });
        if (uploadPromises.length > 0) {
          await Promise.all(uploadPromises);
          // Clear file refs after upload
          fileRefs.current = {};
          // Refresh product data to get updated images
          const updatedProduct = await adminProductsApi.get(response.id);
          setSaveSuccess(true);
          if (onSuccess) {
            onSuccess(updatedProduct);
          }
          return;
        }
      }

      setSaveSuccess(true);
      if (onSuccess) {
        onSuccess(response);
      }
    } catch (error: any) {
      // 统一错误处理，提取 traceId 和错误码
      const errorMessage = error?.message || '提交失败，请稍后再试';
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

      console.error('[ProductForm] Submit error:', {
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
      <div className="layout-grid">
        {/* Left Column: Main Content */}
        <div className="main-col">
          {/* 1. Title & Description */}
          <div className="card">
            <div className="form-field">
              <label>Title</label>
              <input
                type="text"
                {...register('name', { required: true })}
                placeholder="Short sleeve t-shirt"
                className="input-lg"
              />
              {errors.name && <span className="error">Please enter product title</span>}
            </div>

            <div className="form-field">
              <label>Description</label>
              <textarea
                rows={6}
                {...register('description')}
                placeholder="Description"
              />
            </div>

            <div className="form-field">
              <label>Detailed Description</label>
              <textarea
                rows={6}
                {...register('longDescription')}
                placeholder="Detailed Description"
              />
            </div>
          </div>

          {/* 2. Media */}
          <div className="card">
            <div className="card-header">
              <h3>Media</h3>
              <div className="text-sm text-gray-500 mb-2" style={{ fontSize: '12px', color: '#666', marginTop: '-8px' }}>
                <p><strong>Design Lab Image Order:</strong></p>
                <p>1. Front &nbsp; 2. Back &nbsp; 3. Left Sleeve &nbsp; 4. Right Sleeve</p>
              </div>
              <button
                type="button"
                className="text-btn"
                onClick={() => appendImage(defaultImage)}
              >
                Add from URL
              </button>
            </div>

            <div className="media-grid">
              {/* Media Upload Area */}
              <div
                className="media-upload-area"
                onDragOver={handleDragOver}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const files = e.dataTransfer.files;
                  if (files.length > 0) {
                    const startIndex = imageFields.length;
                    Array.from(files).forEach((file, i) => {
                      appendImage({ ...defaultImage });
                      // Use clean timeout to allow state update
                      setTimeout(() => handleFileSelect(startIndex + i, file), 0);
                    });
                  }
                }}
              >
                <div className="upload-placeholder">
                  <span className="upload-icon">📷</span>
                  <div className="upload-text">
                    <label className="upload-trigger">
                      Upload new
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          if (e.target.files?.length) {
                            const startIndex = imageFields.length;
                            Array.from(e.target.files).forEach((file, i) => {
                              appendImage({ ...defaultImage });
                              setTimeout(() => handleFileSelect(startIndex + i, file), 0);
                            });
                          }
                        }}
                      />
                    </label>
                    {' '}or drag and drop
                  </div>
                </div>
              </div>

              {/* Media List */}
              {imageFields.map((field, index) => {
                const imageUrl = watch(`images.${index}.url` as any) || '';
                const validImageUrl = imageUrl && !imageUrl.startsWith('file://')
                  ? (imageUrl.startsWith('http') || imageUrl.startsWith('/') ? imageUrl : null)
                  : null;
                const preview = imagePreviews[index] || validImageUrl;
                const isUploading = uploadingImages[index] || false;

                // If no URL and no preview, it's a newly added field waiting for input
                if (!preview && !imageUrl) return null; // Or show a small input box

                return (
                  <div key={field.id} className="media-item">
                    <div className="media-preview">
                      {preview ? (
                        <Image
                          src={preview}
                          alt="Product"
                          fill
                          sizes="100px"
                          style={{ objectFit: 'cover' }}
                          unoptimized
                        />
                      ) : (
                        <div className="media-placeholder" />
                      )}
                      {isUploading && <div className="media-loading">...</div>}
                    </div>
                    <div className="media-actions">
                      <button type="button" onClick={() => removeImage(index)} title="Remove">×</button>
                    </div>
                    {/* Hidden inputs for URL fallback if needed */}
                    <input type="hidden" {...register(`images.${index}.url` as const)} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Pricing */}
          <div className="card">
            <h3>Usage Pricing</h3>
            <div className="form-row">
              <div className="form-field">
                <label>Price</label>
                <div className="input-prefix">
                  <span>$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...register('basePrice', { required: true, min: 0 })}
                  />
                </div>
              </div>
              <div className="form-field">
                <label>Compare at price</label>
                <div className="input-prefix">
                  <span>$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...register('salePrice')}
                  />
                </div>
              </div>
            </div>

            <div className="form-row border-top pt-4 mt-4">
              <div className="form-field">
                <label>Cost per item</label>
                <div className="input-prefix">
                  <span>$</span>
                  <input type="number" step="0.01" placeholder="0.00" {...register('unitCost')} />
                </div>
                <small>Customers won't see this</small>
              </div>
              <div className="form-field">
                <label>Profit</label>
                <div className="input-prefix input-disabled">
                  <span>$</span>
                  <input type="text" disabled value={watch('grossProfit') || '--'} />
                </div>
              </div>
              <div className="form-field">
                <label>Margin</label>
                <div className="input-prefix input-disabled">
                  <span>%</span>
                  <input
                    type="text"
                    disabled
                    value={(() => {
                      const price = Number(watch('basePrice') || 0);
                      const cost = Number(watch('unitCost') || 0);
                      if (!price) return '--';
                      return Math.round(((price - cost) / price) * 100) + '%';
                    })()}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 4. Inventory */}
          <div className="card">
            <h3>Inventory</h3>
            <div className="form-row">
              <div className="form-field">
                <label>SKU (Stock Keeping Unit)</label>
                <input type="text" {...register('sku')} />
              </div>
              <div className="form-field">
                <label>Barcode (ISBN, UPC, GTIN, etc.)</label>
                <input type="text" placeholder="" />
              </div>
            </div>

            <div className="checkbox-row">
              <input type="checkbox" id="trackQuantity" checked readOnly />
              <label htmlFor="trackQuantity">Track quantity</label>
            </div>

            <div className="form-field border-top pt-4 mt-4">
              <div className="flex-row-between">
                <label>Quantity</label>
                <input
                  type="number"
                  style={{ width: '150px' }}
                  {...register('stockQuantity')}
                />
              </div>
            </div>
          </div>

          {/* 5. Shipping */}
          <div className="card">
            <h3>Shipping</h3>
            <div className="checkbox-row mb-4">
              <input type="checkbox" id="physicalProduct" checked readOnly />
              <label htmlFor="physicalProduct">This is a physical product</label>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label>Weight</label>
                <div className="input-suffix">
                  <input type="number" step="0.01" {...register('weight')} placeholder="0.0" />
                  <span>kg</span>
                </div>
              </div>
              <div className="form-field">
                <label>Dimensions</label>
                <input type="text" {...register('dimensions')} placeholder="L x W x H" />
              </div>
            </div>
          </div>

          {/* 6. Variants */}
          <div className="card">
            <div className="card-header">
              <h3>Variants</h3>
              <button type="button" className="text-btn" onClick={() => appendVariant(defaultVariant)}>
                + Add Option
              </button>
            </div>

            <div className="checkbox-row mb-4">
              <input type="checkbox" {...register('isCustomizable')} id="isCustomizable" />
              <label htmlFor="isCustomizable">This product has options, like size or color</label>
            </div>

            <div className="variants-list">
              {variantFields.map((field, index) => (
                <div key={field.id} className="variant-item form-row">
                  <div className="form-field" style={{ flex: 2 }}>
                    {index === 0 && <label>Option Name</label>}
                    <input
                      type="text"
                      placeholder="Color / Size"
                      value={`${watch(`variants.${index}.color`) || ''} ${watch(`variants.${index}.size`) || ''}`.trim()}
                      readOnly
                    />
                  </div>
                  <div className="form-field" style={{ flex: 1 }}>
                    {index === 0 && <label>Values</label>}
                    <div className="flex-row gap-2">
                      <input type="text" placeholder="Color" {...register(`variants.${index}.color` as const)} />
                      <input type="text" placeholder="Size" {...register(`variants.${index}.size` as const)} />
                    </div>
                  </div>
                  <div className="form-field" style={{ width: '80px' }}>
                    {index === 0 && <label>Price</label>}
                    <input type="number" step="0.01" {...register(`variants.${index}.priceAdjustment` as const)} placeholder="0.00" />
                  </div>
                  <div className="form-field" style={{ width: '80px' }}>
                    {index === 0 && <label>Stock</label>}
                    <input type="number" {...register(`variants.${index}.stockQuantity` as const)} placeholder="0" />
                  </div>
                  <div className="form-field" style={{ width: '30px', paddingTop: index === 0 ? '28px' : '0' }}>
                    <button type="button" className="icon-btn" onClick={() => removeVariant(index)}>×</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 7. Printable Area Configuration */}
          <div className="card">
            <h3>Printable Area Configuration (Design Lab)</h3>
            <p className="text-sm text-gray-500 mb-4">
              Define the printable area for each view. Default (T-Shirt): 546x960.
              Coordinates are based on a 1200x1440 canvas.
            </p>

            <div className="form-row">
              <div style={{ flex: 1 }}>
                <h4 className="mb-2 font-bold">Front View</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="form-field">
                    <label>Width</label>
                    <input type="number" {...register('printableArea.front.width', { valueAsNumber: true })} />
                  </div>
                  <div className="form-field">
                    <label>Height</label>
                    <input type="number" {...register('printableArea.front.height', { valueAsNumber: true })} />
                  </div>
                  <div className="form-field">
                    <label>Offset X</label>
                    <input type="number" {...register('printableArea.front.x', { valueAsNumber: true })} />
                  </div>
                  <div className="form-field">
                    <label>Offset Y</label>
                    <input type="number" {...register('printableArea.front.y', { valueAsNumber: true })} />
                  </div>
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <h4 className="mb-2 font-bold">Back View</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="form-field">
                    <label>Width</label>
                    <input type="number" {...register('printableArea.back.width', { valueAsNumber: true })} />
                  </div>
                  <div className="form-field">
                    <label>Height</label>
                    <input type="number" {...register('printableArea.back.height', { valueAsNumber: true })} />
                  </div>
                  <div className="form-field">
                    <label>Offset X</label>
                    <input type="number" {...register('printableArea.back.x', { valueAsNumber: true })} />
                  </div>
                  <div className="form-field">
                    <label>Offset Y</label>
                    <input type="number" {...register('printableArea.back.y', { valueAsNumber: true })} />
                  </div>
                </div>
              </div>
            </div>

            <div className="form-row border-top pt-4 mt-4">
              <div style={{ flex: 1 }}>
                <h4 className="mb-2 font-bold">Sleeve View (Shared)</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="form-field">
                    <label>Width</label>
                    <input type="number" {...register('printableArea.sleeve.width', { valueAsNumber: true })} />
                  </div>
                  <div className="form-field">
                    <label>Height</label>
                    <input type="number" {...register('printableArea.sleeve.height', { valueAsNumber: true })} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sidebar */}
        <div className="sidebar-col">
          {/* 1. Status */}
          <div className="card">
            <h3>Status</h3>
            <select {...register('isActive', {
              setValueAs: v => (v === 'true' || v === true),
            })} className="select-full">
              <option value="true">Active</option>
              <option value="false">Draft</option>
            </select>
          </div>

          {/* 2. Publishing */}
          <div className="card">
            <h3>Publishing</h3>
            <div className="channel-list">
              <div className="channel-item">
                <div className="status-dot active" />
                <span>Online Store</span>
              </div>
              <div className="channel-item">
                <div className="status-dot active" />
                <span>Point of Sale</span>
              </div>
            </div>
          </div>

          {/* 3. Organization */}
          <div className="card">
            <h3>Product organization</h3>

            <div className="form-field">
              <label>Category</label>
              <select {...register('categoryId', { required: true })}>
                <option value="">Select Category</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {errors.categoryId && <span className="error">Required</span>}
            </div>

            <div className="form-field">
              <label>Product Type</label>
              <input type="text" placeholder="e.g. T-Shirt" />
            </div>

            <div className="form-field">
              <label>Vendor</label>
              <input type="text" placeholder="e.g. Gildan" />
            </div>

            <div className="form-field">
              <label>Collections</label>
              <select multiple {...register('collections')} className="select-multiple">
                <option value="" disabled>Select collections</option>
                {/* Placeholder for collections */}
              </select>
            </div>

            <div className="form-field">
              <label>Tags</label>
              <input type="text" placeholder="Vintage, Cotton, Summer" />
              <small>Separate by comma</small>
            </div>
          </div>
        </div>
      </div>

      <div className="page-actions-bar">
        {submitError && <span className="error-msg">{submitError}</span>}
        {saveSuccess && <span className="success-msg">Saved successfully</span>}
        <div className="actions-right">
          <button type="button" className="secondary-btn" onClick={() => reset()}>Discard</button>
          <button type="submit" className="primary-btn" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .admin-form {
          padding-bottom: 80px;
        }
        .layout-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }
        @media (max-width: 900px) {
          .layout-grid {
            grid-template-columns: 1fr;
          }
        }
        
        .card {
          background: #fff;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          border: 1px solid #e1e3e5;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .card h3 {
          font-size: 16px;
          font-weight: 600;
          margin: 0 0 16px 0;
          color: #202223;
        }
        .card-header {
           display: flex;
           justify-content: space-between;
           align-items: center;
           margin-bottom: 16px;
        }
        .card-header h3 { margin-bottom: 0; }
        
        .form-field {
          margin-bottom: 16px;
        }
        .form-field label {
          display: block;
          margin-bottom: 6px;
          font-size: 14px;
          color: #202223;
          font-weight: 400;
        }
        .form-field input[type="text"],
        .form-field input[type="number"],
        .form-field textarea,
        .form-field select {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #c9cccf;
          border-radius: 4px;
          font-size: 14px;
          color: #202223;
          transition: border-color 0.2s;
        }
        .form-field input:focus,
        .form-field textarea:focus,
        .form-field select:focus {
           border-color: #005bd3;
           outline: none;
           box-shadow: 0 0 0 1px #005bd3;
        }
        
        .input-lg {
          padding: 10px 12px;
          font-size: 16px;
        }
        
        .form-row {
          display: flex;
          gap: 16px;
        }
        .form-row .form-field {
          flex: 1;
        }
        .flex-row-between {
           display: flex;
           justify-content: space-between;
           align-items: center;
        }
        
        .border-top {
          border-top: 1px solid #e1e3e5;
        }
        .pt-4 { padding-top: 16px; }
        .mt-4 { margin-top: 16px; }
        .mb-4 { margin-bottom: 16px; }
        
        .checkbox-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }
        
        .input-prefix, .input-suffix {
           position: relative;
           display: flex;
           align-items: center;
        }
        .input-prefix span {
           position: absolute;
           left: 10px;
           color: #6d7175;
           z-index: 1;
        }
        .input-prefix input {
           padding-left: 24px !important;
        }
        
        .input-suffix input {
           padding-right: 32px !important;
        }
        .input-suffix span {
           position: absolute;
           right: 10px;
           color: #6d7175;
        }
        
        .input-disabled input {
           background-color: #f6f6f7;
           color: #8c9196;
        }
        
        .media-grid {
           display: grid;
           grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
           gap: 12px;
        }
        .media-upload-area {
           grid-column: 1 / -1;
           border: 1px dashed #c9cccf;
           border-radius: 4px;
           padding: 24px;
           text-align: center;
           cursor: pointer;
           transition: background 0.2s;
        }
        .media-upload-area:hover {
           background: #fcfcfc;
           border-color: #8c9196;
        }
        .upload-trigger {
           color: #005bd3;
           font-weight: 600;
           cursor: pointer;
           text-decoration: underline;
        }
        
        .media-item {
           position: relative;
           aspect-ratio: 1;
           border: 1px solid #e1e3e5;
           border-radius: 4px;
           overflow: hidden;
        }
        .media-actions {
           position: absolute;
           top: 4px;
           right: 4px;
           display: none;
        }
        .media-item:hover .media-actions {
           display: block;
        }
        
        .page-actions-bar {
           position: fixed;
           bottom: 0;
           left: 0;
           right: 0;
           background: #fff;
           border-top: 1px solid #e1e3e5;
           padding: 16px 24px;
           display: flex;
           justify-content: flex-end;
           align-items: center;
           z-index: 100;
           gap: 16px;
           box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
        }
        .actions-right {
           display: flex;
           gap: 12px;
        }
        
        .primary-btn {
           background: #008060;
           color: #fff;
           border: none;
           padding: 8px 16px;
           border-radius: 4px;
           font-weight: 500;
           cursor: pointer;
           font-size: 14px;
        }
        .primary-btn:hover {
           background: #006e52;
        }
        .primary-btn:disabled {
           background: #bdc1cc;
           cursor: not-allowed;
        }
        
        .secondary-btn {
           background: #fff;
           color: #202223;
           border: 1px solid #c9cccf;
           padding: 8px 16px;
           border-radius: 4px;
           font-weight: 500;
           cursor: pointer;
           font-size: 14px;
        }
        .secondary-btn:hover {
           background: #f6f6f7;
        }
        
        .text-btn {
           background: none;
           border: none;
           color: #005bd3;
           cursor: pointer;
           font-weight: 500;
        }
        .text-btn:hover {
           text-decoration: underline;
        }
        
        .error { color: #d72c0d; font-size: 12px; margin-top: 4px; display: block; }
        .success-msg { color: #008060; font-weight: 500; }
        
        .channel-list {
           display: flex;
           flex-direction: column;
           gap: 8px;
        }
        .channel-item {
           display: flex;
           align-items: center;
           gap: 8px;
           font-size: 14px;
        }
        .status-dot {
           width: 8px;
           height: 8px;
           border-radius: 50%;
           background: #ccc;
        }
        .status-dot.active { background: #90ee90; }
      `}</style>
    </form>
  );
}


