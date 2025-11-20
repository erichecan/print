'use client';

import { useCallback, useEffect, useMemo, useState, ChangeEvent, FormEvent, DragEvent } from 'react';
import { API_BASE_URL } from '@/lib/api-config'; // [2025-11-16 09:50:00] 使用统一 API 基址，避免指向 Next.js 自身路由
import { categoriesApi, Category } from '@/lib/api'; // [2025-01-27 18:00:00] 引入分类 API 和类型
import useSWR from 'swr'; // [2025-01-27 18:00:00] 使用 SWR 获取分类数据

const DEFAULT_MAX_FILES = 10;
const DEFAULT_MAX_FILE_MB = 50;
const ACCEPTED_EXTENSIONS = ['.ai', '.eps', '.svg', '.pdf', '.png', '.jpg', '.jpeg', '.psd'];
const DRAFT_STORAGE_KEY = 'offline-order-intake-draft';

const MAX_FILES =
  Number(process.env.NEXT_PUBLIC_OFFLINE_ORDER_MAX_FILES || DEFAULT_MAX_FILES) || DEFAULT_MAX_FILES;
const MAX_FILE_SIZE_MB =
  Number(process.env.NEXT_PUBLIC_OFFLINE_ORDER_MAX_FILE_MB || DEFAULT_MAX_FILE_MB) || DEFAULT_MAX_FILE_MB;

// [2025-01-27 18:00:00] 标准尺码选项
const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];

// [2025-01-27 18:00:00] 步骤定义
const STEPS = [
  { id: 1, title: '产品选择', description: '多产品定制，选择产品类型、变体和数量' },
  { id: 2, title: '印刷位置', description: '选择印刷位置和尺寸' },
  { id: 3, title: '客人信息', description: '填写联系信息、交付日期和价格管理' },
  { id: 4, title: '项目详情', description: '填写项目名称和备注' },
  { id: 5, title: '文件上传', description: '上传设计文件和附件' },
];

// [2025-01-27 18:00:00] 印刷位置选项
const PRINT_POSITION_OPTIONS = [
  { value: 'front', label: '正面 (Front)' },
  { value: 'back', label: '背面 (Back)' },
  { value: 'chest', label: '胸前' },
  { value: 'left_pocket', label: '左上衣口袋' },
  { value: 'left_sleeve', label: '左臂' },
  { value: 'right_sleeve', label: '右臂' },
  { value: 'other', label: '其他位置' },
];

// [2025-01-27 18:00:00] 印刷位置数据类型
type PrintPosition = {
  position: string; // 位置选择
  width: string; // 宽度（inch）
  height: string; // 高度（inch）
  notes: string; // 备注
};

// [2025-01-27 18:00:00] 产品变体类型（尺码、颜色等）
type ProductVariant = {
  variantType: 'size' | 'color' | 'other'; // 变体类型
  variantValue: string; // 变体值，如 'M', 'L', 'White', 'Black'
  quantity: number; // 数量
  unitPrice: number; // 单价（CAD）
};

// [2025-01-27 18:00:00] 产品项目类型（支持多产品定制）
type ProductItem = {
  id: string; // 唯一ID
  categoryId: string; // 产品分类ID
  categoryName: string; // 产品分类名称
  variants: ProductVariant[]; // 变体列表（如不同尺码、颜色）
};

// [2025-01-27 18:00:00] 发票信息类型（加拿大invoice常规信息）
type InvoiceInfo = {
  companyName: string;
  companyEmail: string;
  taxNumber: string; // GST/HST Number
  address: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
};

type FormState = {
  // [2025-01-27 19:00:00] 订单编号（从第一步开始生成）
  orderCode: string; // [2025-01-27 19:00:00] 唯一订单编号
  
  // 第一步：多产品定制
  productItems: ProductItem[]; // [2025-01-27 18:00:00] 产品项目数组，支持多产品定制
  
  // 第二步：印刷位置
  sideCount: number; // [2025-01-27 18:00:00] 要印几个地方
  printPositions: PrintPosition[]; // [2025-01-27 18:00:00] 印刷位置数组
  
  // 第三步：客人信息和价格
  contactName: string;
  email: string;
  phone: string;
  dueDate: string; // 交付日期
  requiresInvoice: boolean; // 是否需要发票
  invoiceInfo: InvoiceInfo; // [2025-01-27 18:00:00] 发票信息
  discount: number; // [2025-01-27 18:00:00] 整体折扣百分比（0-100）
  
  // 第四步：项目详情
  projectName: string;
  requiresMockups: boolean;
  requiresProof: boolean;
  rushOrder: boolean;
  artworkNotes: string;
};

// [2025-01-27 19:00:00] 生成订单编号（与后端格式一致）
const generateOrderCode = (): string => {
  const timestamp = new Date();
  const datePart = timestamp.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `OFF-${datePart}-${randomPart}`;
};

const initialFormState: FormState = {
  orderCode: generateOrderCode(), // [2025-01-27 19:00:00] 初始化时生成订单编号
  productItems: [], // [2025-01-27 18:00:00] 初始为空，用户添加产品
  sideCount: 1, // [2025-01-27 18:00:00] 默认1个印刷位置
  printPositions: [{ position: '', width: '', height: '', notes: '' }], // [2025-01-27 18:00:00] 默认1个位置
  contactName: '',
  email: '',
  phone: '',
  dueDate: '',
  requiresInvoice: false,
  invoiceInfo: {
    companyName: '',
    companyEmail: '',
    taxNumber: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    country: 'Canada',
  },
  discount: 0,
  projectName: '',
  requiresMockups: false,
  requiresProof: false,
  rushOrder: false,
  artworkNotes: '',
};

const extensionIsAllowed = (fileName: string) => {
  const lower = fileName.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
};

export default function OfflineOrdersIntakePage() {
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [files, setFiles] = useState<File[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(1); // [2025-01-27 18:00:00] 当前步骤
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error'; message?: string }>({
    type: 'idle',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // [2025-01-27 18:00:00] 获取产品分类列表
  const { data: categoriesData, isLoading: categoriesLoading } = useSWR<{ data: Category[] }>(
    'offline-order-categories',
    () => categoriesApi.list(),
    {
      revalidateOnFocus: false,
    }
  );

  const categories = categoriesData?.data || [];

  // [2025-11-15 15:18:30] Restore last-saved draft data on mount
  useEffect(() => {
    try {
      const rawDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!rawDraft) {
        // [2025-01-27 19:00:00] 如果没有草稿，确保有订单编号
        setFormState((prev) => {
          if (!prev.orderCode) {
            return { ...prev, orderCode: generateOrderCode() };
          }
          return prev;
        });
        return;
      }
      const draftData = JSON.parse(rawDraft) as { formState?: Partial<FormState>; currentStep?: number };
      if (draftData.formState) {
        // [2025-01-27 19:00:00] 恢复草稿时，如果没有订单编号则生成新的
        const restoredState = draftData.formState.orderCode
          ? draftData.formState
          : { ...draftData.formState, orderCode: generateOrderCode() };
        setFormState((prev) => ({ ...prev, ...restoredState }));
      } else {
        // [2025-01-27 19:00:00] 如果没有表单数据，确保有订单编号
        setFormState((prev) => {
          if (!prev.orderCode) {
            return { ...prev, orderCode: generateOrderCode() };
          }
          return prev;
        });
      }
      if (draftData.currentStep) {
        setCurrentStep(draftData.currentStep);
      }
      setStatus({ type: 'success', message: 'Draft restored. Please re-attach files before submitting.' });
    } catch (error) {
      console.warn('Failed to restore offline order draft', error);
      // [2025-01-27 19:00:00] 恢复失败时，确保有订单编号
      setFormState((prev) => {
        if (!prev.orderCode) {
          return { ...prev, orderCode: generateOrderCode() };
        }
        return prev;
      });
    }
  }, []);

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  }, []);

  // [2025-01-27 18:00:00] 第一步：多产品定制管理方法
  const addProductItem = useCallback((categoryId: string, categoryName: string) => {
    const newItem: ProductItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      categoryId,
      categoryName,
      variants: [],
    };
    setFormState((prev) => ({
      ...prev,
      productItems: [...prev.productItems, newItem],
    }));
  }, []);

  const removeProductItem = useCallback((itemId: string) => {
    setFormState((prev) => ({
      ...prev,
      productItems: prev.productItems.filter((item) => item.id !== itemId),
    }));
  }, []);

  const addVariant = useCallback(
    (itemId: string, variantType: 'size' | 'color' | 'other', variantValue: string) => {
      setFormState((prev) => {
        const newItems = prev.productItems.map((item) => {
          if (item.id === itemId) {
            const variantExists = item.variants.some(
              (v) => v.variantType === variantType && v.variantValue === variantValue
            );
            if (!variantExists) {
              return {
                ...item,
                variants: [
                  ...item.variants,
                  {
                    variantType,
                    variantValue,
                    quantity: 0,
                    unitPrice: 0,
                  },
                ],
              };
            }
          }
          return item;
        });
        return { ...prev, productItems: newItems };
      });
    },
    []
  );

  const removeVariant = useCallback((itemId: string, variantIndex: number) => {
    setFormState((prev) => {
      const newItems = prev.productItems.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            variants: item.variants.filter((_, idx) => idx !== variantIndex),
          };
        }
        return item;
      });
      return { ...prev, productItems: newItems };
    });
  }, []);

  const updateVariant = useCallback(
    (
      itemId: string,
      variantIndex: number,
      field: 'quantity' | 'unitPrice',
      value: number
    ) => {
      if (value < 0) return;
      setFormState((prev) => {
        const newItems = prev.productItems.map((item) => {
          if (item.id === itemId) {
            const newVariants = [...item.variants];
            newVariants[variantIndex] = {
              ...newVariants[variantIndex],
              [field]: value,
            };
            return { ...item, variants: newVariants };
          }
          return item;
        });
        return { ...prev, productItems: newItems };
      });
    },
    []
  );

  // [2025-01-27 18:00:00] 价格计算逻辑
  const calculateItemTotal = useCallback((item: ProductItem): number => {
    return item.variants.reduce((sum, variant) => {
      return sum + variant.quantity * variant.unitPrice;
    }, 0);
  }, []);

  const calculateSubtotal = useMemo(() => {
    return formState.productItems.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  }, [formState.productItems, calculateItemTotal]);

  const calculateDiscountAmount = useMemo(() => {
    return (calculateSubtotal * formState.discount) / 100;
  }, [calculateSubtotal, formState.discount]);

  const calculateTotal = useMemo(() => {
    return calculateSubtotal - calculateDiscountAmount;
  }, [calculateSubtotal, calculateDiscountAmount]);

  const calculateTotalQuantity = useMemo(() => {
    return formState.productItems.reduce((sum, item) => {
      return sum + item.variants.reduce((itemSum, variant) => itemSum + variant.quantity, 0);
    }, 0);
  }, [formState.productItems]);

  // [2025-01-27 18:00:00] 第二步：印刷位置管理方法
  const updateSideCount = useCallback((count: number) => {
    if (count < 1) count = 1;
    if (count > 10) count = 10; // 限制最多10个位置
    setFormState((prev) => {
      const currentPositions = prev.printPositions || [];
      const newPositions: PrintPosition[] = [];
      for (let i = 0; i < count; i++) {
        if (currentPositions[i]) {
          newPositions.push(currentPositions[i]);
        } else {
          newPositions.push({ position: '', width: '', height: '', notes: '' });
        }
      }
      return {
        ...prev,
        sideCount: count,
        printPositions: newPositions,
      };
    });
  }, []);

  const updatePrintPosition = useCallback((index: number, field: keyof PrintPosition, value: string) => {
    setFormState((prev) => {
      const newPositions = [...prev.printPositions];
      if (newPositions[index]) {
        newPositions[index] = { ...newPositions[index], [field]: value };
      }
      return {
        ...prev,
        printPositions: newPositions,
      };
    });
  }, []);

  // [2025-01-27 18:00:00] 步骤验证
  const validateStep = useCallback((step: number): boolean => {
    if (step === 1) {
      // 第一步验证：至少添加一个产品，每个产品至少有一个变体，且数量和单价都大于0
      if (formState.productItems.length === 0) {
        setStatus({ type: 'error', message: '请至少添加一个产品' });
        return false;
      }
      for (let i = 0; i < formState.productItems.length; i++) {
        const item = formState.productItems[i];
        if (item.variants.length === 0) {
          setStatus({ type: 'error', message: `产品 ${i + 1} (${item.categoryName})：请至少添加一个变体` });
          return false;
        }
        const hasValidVariant = item.variants.some(
          (v) => v.quantity > 0 && v.unitPrice > 0
        );
        if (!hasValidVariant) {
          setStatus({ type: 'error', message: `产品 ${i + 1} (${item.categoryName})：请填写有效的数量和单价（大于0）` });
          return false;
        }
      }
      return true;
    }
    if (step === 2) {
      // 第二步验证：每个位置必须选择位置类型，并且填写尺寸
      if (formState.printPositions.length === 0) {
        setStatus({ type: 'error', message: '请至少添加一个印刷位置' });
        return false;
      }
      for (let i = 0; i < formState.printPositions.length; i++) {
        const pos = formState.printPositions[i];
        if (!pos.position || pos.position.trim() === '') {
          setStatus({ type: 'error', message: `位置 ${i + 1}：请选择印刷位置` });
          return false;
        }
        const width = parseFloat(pos.width);
        const height = parseFloat(pos.height);
        if (isNaN(width) || width <= 0) {
          setStatus({ type: 'error', message: `位置 ${i + 1}：请填写有效的宽度（大于0）` });
          return false;
        }
        if (isNaN(height) || height <= 0) {
          setStatus({ type: 'error', message: `位置 ${i + 1}：请填写有效的高度（大于0）` });
          return false;
        }
      }
      return true;
    }
    if (step === 3) {
      // 第三步验证：联系姓名、邮箱、电话、交付日期必填；如果需要发票，发票信息必填
      if (!formState.contactName.trim()) {
        setStatus({ type: 'error', message: '联系人姓名是必填项' });
        return false;
      }
      if (!formState.email.trim()) {
        setStatus({ type: 'error', message: '邮箱是必填项' });
        return false;
      }
      if (!formState.phone.trim()) {
        setStatus({ type: 'error', message: '电话是必填项' });
        return false;
      }
      if (!formState.dueDate.trim()) {
        setStatus({ type: 'error', message: '交付日期是必填项' });
        return false;
      }
      if (formState.requiresInvoice) {
        if (!formState.invoiceInfo.companyName.trim()) {
          setStatus({ type: 'error', message: '发票公司名称是必填项' });
          return false;
        }
        if (!formState.invoiceInfo.companyEmail.trim()) {
          setStatus({ type: 'error', message: '发票公司邮箱是必填项' });
          return false;
        }
        if (!formState.invoiceInfo.address.trim()) {
          setStatus({ type: 'error', message: '发票地址是必填项' });
          return false;
        }
      }
      return true;
    }
    if (step === 4) {
      // 第四步验证：项目名称必填
      if (!formState.projectName.trim()) {
        setStatus({ type: 'error', message: '项目名称是必填项' });
        return false;
      }
      return true;
    }
    return true;
  }, [formState]);

  // [2025-01-27 18:00:00] 步骤导航
  const resetStatus = useCallback(() => setStatus({ type: 'idle' }), []);

  const goToNextStep = useCallback(() => {
    if (!validateStep(currentStep)) {
      return;
    }
    resetStatus();
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, validateStep, resetStatus]);

  const goToPreviousStep = useCallback(() => {
    resetStatus();
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep, resetStatus]);

  const goToStep = useCallback((step: number) => {
    // [2025-01-27 18:00:00] 只能跳转到已完成的步骤或当前步骤
    // 暂时允许跳转到任意步骤（可以后续添加限制）
    resetStatus();
    if (step >= 1 && step <= STEPS.length) {
      setCurrentStep(step);
    }
  }, [resetStatus]);

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value, type } = event.target;
      if (type === 'checkbox') {
        const checked = (event.target as HTMLInputElement).checked;
        setField(name as keyof FormState, checked as any);
        return;
      }
      setField(name as keyof FormState, value as any);
    },
    [setField],
  );

  const addFiles = useCallback(
    (incomingFiles: FileList | File[]) => {
      const nextFiles = [...files];
      let added = 0;
      const iterable = Array.isArray(incomingFiles) ? incomingFiles : Array.from(incomingFiles);
      for (const file of iterable) {
        if (nextFiles.length >= MAX_FILES) {
          setStatus({ type: 'error', message: `Maximum of ${MAX_FILES} files reached.` });
          break;
        }
        if (!extensionIsAllowed(file.name)) {
          setStatus({
            type: 'error',
            message: `Unsupported file type: ${file.name}. Allowed: ${ACCEPTED_EXTENSIONS.join(', ')}`,
          });
          continue;
        }
        const sizeMb = file.size / (1024 * 1024);
        if (sizeMb > MAX_FILE_SIZE_MB) {
          setStatus({ type: 'error', message: `${file.name} exceeds ${MAX_FILE_SIZE_MB}MB limit.` });
          continue;
        }
        const duplicate = nextFiles.some((existing) => existing.name === file.name && existing.size === file.size);
        if (duplicate) {
          continue;
        }
        nextFiles.push(file);
        added += 1;
      }
      if (added) {
        resetStatus();
        setFiles(nextFiles);
      }
    },
    [files, resetStatus],
  );

  const handleFileInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (event.target.files) {
        addFiles(event.target.files);
        event.target.value = '';
      }
    },
    [addFiles],
  );

  const removeFile = useCallback(
    (index: number) => {
      setFiles((prev) => prev.filter((_, idx) => idx !== index));
    },
    [],
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer?.files) {
        addFiles(event.dataTransfer.files);
      }
    },
    [addFiles],
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const saveDraft = useCallback(() => {
    try {
      setIsSavingDraft(true);
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ formState, currentStep }));
      setStatus({ type: 'success', message: 'Draft saved locally. Files are not stored.' });
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to save draft locally.' });
    } finally {
      setIsSavingDraft(false);
    }
  }, [formState, currentStep]);

  const resetForm = useCallback(() => {
    // [2025-01-27 19:00:00] 重置表单时生成新的订单编号
    setFormState({ ...initialFormState, orderCode: generateOrderCode() });
    setFiles([]);
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  }, []);

  const fileListSummary = useMemo(() => {
    if (!files.length) {
      return 'No files selected yet.';
    }
    return `${files.length} file${files.length > 1 ? 's' : ''} attached`;
  }, [files]);

  // [2025-01-27 18:00:00] 生成主要产品描述（基于产品项目）
  const primaryProductDescription = useMemo(() => {
    if (formState.productItems.length === 0) return '';
    return formState.productItems
      .map((item) => {
        const variantsText = item.variants
          .filter((v) => v.quantity > 0)
          .map((v) => `${v.variantValue}: ${v.quantity}`)
          .join(', ');
        return `${item.categoryName}${variantsText ? ` (${variantsText})` : ''}`;
      })
      .join('; ');
  }, [formState.productItems]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      resetStatus();
      
      // [2025-01-27 18:00:00] 验证所有步骤
      if (!validateStep(1) || !validateStep(2) || !validateStep(3) || !validateStep(4)) {
        return;
      }

      try {
        setIsSubmitting(true);
        const payload = new FormData();
        payload.append('projectName', formState.projectName.trim());
        payload.append('primaryProduct', primaryProductDescription);
        payload.append('quantity', calculateTotalQuantity.toString());
        payload.append('deliveryDate', formState.dueDate);
        payload.append('contactName', formState.contactName.trim());
        payload.append('email', formState.email.trim());
        payload.append('phone', formState.phone.trim());
        payload.append('artworkNotes', formState.artworkNotes);
        payload.append('requiresMockups', String(formState.requiresMockups));
        payload.append('requiresProof', String(formState.requiresProof));
        payload.append('rushOrder', String(formState.rushOrder));
        payload.append(
          'configuration',
          JSON.stringify({
            source: 'nextjs-offline-intake',
            orderCode: formState.orderCode, // [2025-01-27 19:00:00] 订单编号
            artworkNotes: formState.artworkNotes,
            productItems: formState.productItems, // [2025-01-27 18:00:00] 多产品定制数据
            sideCount: formState.sideCount,
            printPositions: formState.printPositions, // [2025-01-27 18:00:00] 印刷位置数据
            requiresInvoice: formState.requiresInvoice, // [2025-01-27 18:00:00] 发票需求
            invoiceInfo: formState.requiresInvoice ? formState.invoiceInfo : null, // [2025-01-27 18:00:00] 发票信息
            pricing: {
              // [2025-01-27 18:00:00] 价格信息
              subtotal: calculateSubtotal,
              discount: formState.discount,
              discountAmount: calculateDiscountAmount,
              total: calculateTotal,
              currency: 'CAD',
            },
          }),
        );
        files.forEach((file) => payload.append('assets', file, file.name));

        // [2025-11-16 09:50:00] 指向后端 API_BASE_URL，避免 Netlify 返回 HTML 404
        const response = await fetch(`${API_BASE_URL}/offline-orders`, {
          method: 'POST',
          body: payload,
          credentials: 'include',
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.message || data?.error || 'Failed to submit offline order');
        }
        const finalOrderCode = data?.order?.orderCode || formState.orderCode;
        setStatus({
          type: 'success',
          message: `订单提交成功！订单编号：${finalOrderCode}。订单已进入生产管理系统，我们会尽快处理。`,
        });
        resetForm();
        setCurrentStep(1); // [2025-01-27 18:00:00] 重置到第一步
      } catch (error: any) {
        setStatus({ type: 'error', message: error.message || 'Submission failed.' });
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      files,
      formState,
      resetForm,
      resetStatus,
      validateStep,
      primaryProductDescription,
      calculateTotalQuantity,
      calculateSubtotal,
      calculateDiscountAmount,
      calculateTotal,
    ],
  );

  // [2025-01-27 18:00:00] 渲染第一步：多产品定制
  const renderStep1 = () => {
    // 获取已添加的产品分类ID列表
    const addedCategoryIds = formState.productItems.map((item) => item.categoryId);
    // 可添加的产品分类（未添加的）
    const availableCategories = categories.filter((cat) => !addedCategoryIds.includes(cat.id));

    return (
      <div className="step-content">
        <div className="order-header">
          <h2>多产品定制</h2>
          <div className="order-code-display">
            <span className="order-code-label">订单编号：</span>
            <strong className="order-code-value">{formState.orderCode}</strong>
          </div>
        </div>
        <p className="step-description">支持同时定制多种产品，每个产品可以选择不同的变体（尺码、颜色等）和数量</p>

        {/* 添加产品按钮 */}
        {availableCategories.length > 0 && (
          <div className="add-product-section">
            <label>
              <span>添加产品：</span>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    const category = categories.find((c) => c.id === e.target.value);
                    if (category) {
                      addProductItem(category.id, category.name);
                      e.target.value = '';
                    }
                  }
                }}
                className="product-select"
              >
                <option value="">选择产品类型...</option>
                {availableCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {/* 产品列表 */}
        {formState.productItems.length > 0 ? (
          <div className="product-items-list">
            {formState.productItems.map((item, itemIndex) => {
              const itemTotal = calculateItemTotal(item);
              const itemQuantity = item.variants.reduce((sum, v) => sum + v.quantity, 0);

              return (
                <div key={item.id} className="product-item-card">
                  <div className="product-item-header">
                    <h3>
                      {item.categoryName}
                      <button
                        type="button"
                        className="remove-item-btn"
                        onClick={() => removeProductItem(item.id)}
                      >
                        删除
                      </button>
                    </h3>
                  </div>

                  {/* 变体输入区域 */}
                  <div className="variants-section">
                    {/* 添加尺码变体 */}
                    <div className="add-variant-section">
                      <label>
                        <span>添加变体：</span>
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              const [type, value] = e.target.value.split(':');
                              if (type && value) {
                                addVariant(item.id, type as 'size' | 'color' | 'other', value);
                                e.target.value = '';
                              }
                            }
                          }}
                          className="variant-select"
                        >
                          <option value="">选择变体...</option>
                          <optgroup label="尺码">
                            {SIZE_OPTIONS.filter(
                              (size) => !item.variants.some((v) => v.variantType === 'size' && v.variantValue === size)
                            ).map((size) => (
                              <option key={`size:${size}`} value={`size:${size}`}>
                                {size}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="颜色">
                            {['White', 'Black', 'Red', 'Blue', 'Green', 'Yellow', 'Gray'].filter(
                              (color) => !item.variants.some((v) => v.variantType === 'color' && v.variantValue === color)
                            ).map((color) => (
                              <option key={`color:${color}`} value={`color:${color}`}>
                                {color}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="其他">
                            {['Default'].filter(
                              (other) => !item.variants.some((v) => v.variantType === 'other' && v.variantValue === other)
                            ).map((other) => (
                              <option key={`other:${other}`} value={`other:${other}`}>
                                {other}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </label>
                    </div>

                    {/* 变体列表 */}
                    {item.variants.length > 0 && (
                      <div className="variants-table">
                        <table>
                          <thead>
                            <tr>
                              <th>变体类型</th>
                              <th>变体值</th>
                              <th>数量</th>
                              <th>单价 (CAD)</th>
                              <th>小计 (CAD)</th>
                              <th>操作</th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.variants.map((variant, variantIndex) => {
                              const variantTotal = variant.quantity * variant.unitPrice;
                              return (
                                <tr key={variantIndex}>
                                  <td>{variant.variantType === 'size' ? '尺码' : variant.variantType === 'color' ? '颜色' : '其他'}</td>
                                  <td>{variant.variantValue}</td>
                                  <td>
                                    <input
                                      type="number"
                                      min="0"
                                      value={variant.quantity}
                                      onChange={(e) =>
                                        updateVariant(item.id, variantIndex, 'quantity', parseInt(e.target.value, 10) || 0)
                                      }
                                      className="variant-quantity-input"
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={variant.unitPrice}
                                      onChange={(e) =>
                                        updateVariant(item.id, variantIndex, 'unitPrice', parseFloat(e.target.value) || 0)
                                      }
                                      className="variant-price-input"
                                    />
                                  </td>
                                  <td className="variant-total">${variantTotal.toFixed(2)}</td>
                                  <td>
                                    <button
                                      type="button"
                                      className="remove-variant-btn"
                                      onClick={() => removeVariant(item.id, variantIndex)}
                                    >
                                      删除
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr>
                              <td colSpan={2}>
                                <strong>产品小计：</strong>
                              </td>
                              <td>
                                <strong>{itemQuantity} 件</strong>
                              </td>
                              <td colSpan={2}>
                                <strong>${itemTotal.toFixed(2)} CAD</strong>
                              </td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <p>请先添加产品类型，然后为每个产品添加变体（尺码、颜色等）和数量</p>
          </div>
        )}

        {/* 总计 */}
        {calculateTotalQuantity > 0 && (
          <div className="total-summary">
            <div className="total-row">
              <span>总数量：</span>
              <strong>{calculateTotalQuantity} 件</strong>
            </div>
            <div className="total-row">
              <span>总金额：</span>
              <strong>${calculateSubtotal.toFixed(2)} CAD</strong>
            </div>
          </div>
        )}
      </div>
    );
  };

  // [2025-01-27 18:00:00] 渲染第二步：印刷位置
  const renderStep2 = () => (
    <div className="step-content">
      <h2>印刷位置</h2>
      <p className="step-description">选择印刷位置、尺寸和添加备注</p>
      
      <div className="side-count-section">
        <label>
          <span>要印几个地方 *</span>
          <input
            type="number"
            min="1"
            max="10"
            value={formState.sideCount}
            onChange={(e) => updateSideCount(parseInt(e.target.value, 10) || 1)}
            className="side-count-input"
          />
          <span className="input-hint">（最多10个位置）</span>
        </label>
      </div>

      <div className="print-positions-list">
        {formState.printPositions.map((position, index) => (
          <div key={index} className="print-position-card">
            <div className="position-header">
              <h3>位置 {index + 1}</h3>
            </div>
            
            <div className="position-fields">
              <label>
                <span>印刷位置 *</span>
                <select
                  value={position.position}
                  onChange={(e) => updatePrintPosition(index, 'position', e.target.value)}
                  className="position-select"
                >
                  <option value="">请选择位置</option>
                  {PRINT_POSITION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="size-inputs">
                <label>
                  <span>宽度 (inch) *</span>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    placeholder="0.0"
                    value={position.width}
                    onChange={(e) => updatePrintPosition(index, 'width', e.target.value)}
                    className="size-input"
                  />
                </label>
                <label>
                  <span>高度 (inch) *</span>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    placeholder="0.0"
                    value={position.height}
                    onChange={(e) => updatePrintPosition(index, 'height', e.target.value)}
                    className="size-input"
                  />
                </label>
              </div>

              <label>
                <span>备注</span>
                <textarea
                  rows={2}
                  placeholder="添加此位置的额外说明（可选）"
                  value={position.notes}
                  onChange={(e) => updatePrintPosition(index, 'notes', e.target.value)}
                  className="position-notes"
                />
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // [2025-01-27 18:00:00] 更新发票信息字段
  const updateInvoiceInfo = useCallback((field: keyof InvoiceInfo, value: string) => {
    setFormState((prev) => ({
      ...prev,
      invoiceInfo: {
        ...prev.invoiceInfo,
        [field]: value,
      },
    }));
  }, []);

  // [2025-01-27 18:00:00] 渲染第三步：客人信息和价格管理
  const renderStep3 = () => (
    <div className="step-content">
      <h2>客人信息和价格管理</h2>
      <p className="step-description">填写客人联系信息、交付日期和价格管理</p>

      {/* 客人基本信息 */}
      <section className="info-section">
        <h3>客人信息</h3>
        <div className="grid two-col">
          <label>
            <span>联系人姓名 *</span>
            <input
              type="text"
              name="contactName"
              required
              value={formState.contactName}
              onChange={handleInputChange}
            />
          </label>
          <label>
            <span>邮箱 *</span>
            <input
              type="email"
              name="email"
              required
              value={formState.email}
              onChange={handleInputChange}
            />
          </label>
          <label>
            <span>电话 *</span>
            <input
              type="tel"
              name="phone"
              required
              value={formState.phone}
              onChange={handleInputChange}
            />
          </label>
          <label>
            <span>交付日期 (Due Date) *</span>
            <input
              type="date"
              name="dueDate"
              required
              value={formState.dueDate}
              onChange={handleInputChange}
            />
          </label>
        </div>
      </section>

      {/* 发票信息 */}
      <section className="info-section">
        <label className="checkbox-label">
          <input
            type="checkbox"
            name="requiresInvoice"
            checked={formState.requiresInvoice}
            onChange={(e) => setField('requiresInvoice', e.target.checked)}
          />
          <span>需要发票 (Require Invoice)</span>
        </label>

        {formState.requiresInvoice && (
          <div className="invoice-info-section">
            <h4>发票信息（加拿大）</h4>
            <div className="grid two-col">
              <label>
                <span>公司名称 *</span>
                <input
                  type="text"
                  value={formState.invoiceInfo.companyName}
                  onChange={(e) => updateInvoiceInfo('companyName', e.target.value)}
                />
              </label>
              <label>
                <span>公司邮箱 *</span>
                <input
                  type="email"
                  value={formState.invoiceInfo.companyEmail}
                  onChange={(e) => updateInvoiceInfo('companyEmail', e.target.value)}
                />
              </label>
              <label>
                <span>税号 (GST/HST Number) *</span>
                <input
                  type="text"
                  value={formState.invoiceInfo.taxNumber}
                  onChange={(e) => updateInvoiceInfo('taxNumber', e.target.value)}
                  placeholder="例如：123456789RT0001"
                />
              </label>
              <label>
                <span>城市 *</span>
                <input
                  type="text"
                  value={formState.invoiceInfo.city}
                  onChange={(e) => updateInvoiceInfo('city', e.target.value)}
                />
              </label>
              <label>
                <span>省份 *</span>
                <input
                  type="text"
                  value={formState.invoiceInfo.province}
                  onChange={(e) => updateInvoiceInfo('province', e.target.value)}
                  placeholder="例如：ON, BC, QC"
                />
              </label>
              <label>
                <span>邮编 *</span>
                <input
                  type="text"
                  value={formState.invoiceInfo.postalCode}
                  onChange={(e) => updateInvoiceInfo('postalCode', e.target.value)}
                  placeholder="例如：K1A 0B1"
                />
              </label>
            </div>
            <label>
              <span>地址 *</span>
              <input
                type="text"
                value={formState.invoiceInfo.address}
                onChange={(e) => updateInvoiceInfo('address', e.target.value)}
              />
            </label>
          </div>
        )}
      </section>

      {/* 价格预估和管理 */}
      <section className="info-section">
        <h3>价格预估</h3>
        {formState.productItems.length > 0 ? (
          <div className="price-management">
            {/* 价格表格 */}
            <div className="price-table-section">
              <table className="price-table">
                <thead>
                  <tr>
                    <th>产品</th>
                    <th>变体类型</th>
                    <th>变体值</th>
                    <th>数量</th>
                    <th>单价 (CAD)</th>
                    <th>小计 (CAD)</th>
                  </tr>
                </thead>
                <tbody>
                  {formState.productItems.flatMap((item) =>
                    item.variants.map((variant, variantIndex) => {
                      const variantTotal = variant.quantity * variant.unitPrice;
                      return (
                        <tr key={`${item.id}-${variantIndex}`}>
                          <td>{item.categoryName}</td>
                          <td>
                            {variant.variantType === 'size'
                              ? '尺码'
                              : variant.variantType === 'color'
                              ? '颜色'
                              : '其他'}
                          </td>
                          <td>{variant.variantValue}</td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              value={variant.quantity}
                              onChange={(e) =>
                                updateVariant(item.id, variantIndex, 'quantity', parseInt(e.target.value, 10) || 0)
                              }
                              className="price-input"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={variant.unitPrice}
                              onChange={(e) =>
                                updateVariant(item.id, variantIndex, 'unitPrice', parseFloat(e.target.value) || 0)
                              }
                              className="price-input"
                            />
                          </td>
                          <td className="price-total">${variantTotal.toFixed(2)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* 总计和折扣 */}
            <div className="price-summary">
              <div className="summary-row">
                <span>小计：</span>
                <span>${calculateSubtotal.toFixed(2)} CAD</span>
              </div>
              <div className="summary-row">
                <label>
                  <span>折扣 (%)：</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formState.discount}
                    onChange={(e) => setField('discount', parseFloat(e.target.value) || 0)}
                    className="discount-input"
                  />
                </label>
              </div>
              {formState.discount > 0 && (
                <div className="summary-row discount-row">
                  <span>折扣金额：</span>
                  <span>-${calculateDiscountAmount.toFixed(2)} CAD</span>
                </div>
              )}
              <div className="summary-row total-row">
                <span>总计：</span>
                <strong>${calculateTotal.toFixed(2)} CAD</strong>
              </div>
              <div className="summary-row quantity-row">
                <span>总数量：</span>
                <strong>{calculateTotalQuantity} 件</strong>
              </div>
            </div>
          </div>
        ) : (
          <p className="empty-message">请先返回第一步添加产品</p>
        )}
      </section>
    </div>
  );

  // [2025-01-27 18:00:00] 渲染第四步：项目详情
  const renderStep4 = () => (
    <div className="step-content">
      <h2>项目详情</h2>
      <p className="step-description">填写项目名称、交付日期和其他说明</p>
      <div className="grid two-col">
        <label>
          <span>项目名称 *</span>
          <input
            type="text"
            name="projectName"
            required
            value={formState.projectName}
            onChange={handleInputChange}
          />
        </label>
        <label>
          <span>交付日期</span>
          <input
            type="date"
            name="deliveryDate"
            value={formState.deliveryDate}
            onChange={handleInputChange}
          />
        </label>
      </div>
      <label>
        <span>设计说明</span>
        <textarea
          name="artworkNotes"
          rows={4}
          value={formState.artworkNotes}
          onChange={handleInputChange}
          placeholder="描述颜色目标、位置、包装或其他相关信息。"
        />
      </label>
    </div>
  );

  // [2025-01-27 18:00:00] 渲染第五步：文件上传
  const renderStep5 = () => (
    <div className="step-content">
      <h2>文件上传</h2>
      <p className="step-description">上传设计文件和附件</p>
      <div
        className="upload-zone"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        role="button"
        tabIndex={0}
      >
        <p>{fileListSummary}</p>
        <p className="muted">
          Drag & drop or <span className="link">browse</span> (max {MAX_FILES} files, {MAX_FILE_SIZE_MB}MB each)
        </p>
        <input
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(',')}
          multiple
          onChange={handleFileInputChange}
          aria-label="Upload artwork files"
        />
      </div>
      {files.length > 0 && (
        <ul className="file-list">
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`}>
              <div>
                <strong>{file.name}</strong>
                <span>{(file.size / (1024 * 1024)).toFixed(1)} MB</span>
              </div>
              <button type="button" onClick={() => removeFile(index)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="offline-intake">
      <header className="offline-intake__hero">
        <div>
          <p className="eyebrow">Offline Order Intake</p>
          <h1>Share your project specs and artwork</h1>
          <p>Upload brand assets, outline quantities, timeline, and special production notes.</p>
        </div>
      </header>

      <main>
        <form className="intake-form" onSubmit={handleSubmit}>
          {status.type !== 'idle' && (
            <div className={`intake-alert intake-alert--${status.type}`} role="status">
              {status.message}
            </div>
          )}

          {/* [2025-01-27 19:00:00] 订单编号显示（所有步骤可见） */}
          <div className="order-code-banner">
            <span className="order-code-label">订单编号：</span>
            <strong className="order-code-value">{formState.orderCode}</strong>
          </div>

          {/* [2025-01-27 18:00:00] 步骤导航栏 */}
          <div className="step-navigation">
            {STEPS.map((step, index) => (
              <div
                key={step.id}
                className={`step-nav-item ${currentStep === step.id ? 'active' : ''} ${
                  currentStep > step.id ? 'completed' : ''
                }`}
                onClick={() => goToStep(step.id)}
              >
                <div className="step-nav-number">{step.id}</div>
                <div className="step-nav-info">
                  <div className="step-nav-title">{step.title}</div>
                  <div className="step-nav-description">{step.description}</div>
                </div>
              </div>
            ))}
          </div>

          {/* [2025-01-27 18:00:00] 步骤内容区域 */}
          <div className="step-container">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
            {currentStep === 5 && renderStep5()}
          </div>

          {/* [2025-01-27 18:00:00] 步骤导航按钮 */}
          <div className="form-actions">
            <button
              type="button"
              className="ghost"
              onClick={saveDraft}
              disabled={isSubmitting || isSavingDraft}
            >
              {isSavingDraft ? 'Saving…' : 'Save draft'}
            </button>
            <div className="step-actions">
              {currentStep > 1 && (
                <button type="button" className="btn-secondary" onClick={goToPreviousStep}>
                  上一步
                </button>
              )}
              {currentStep < STEPS.length ? (
                <button type="button" className="btn-primary" onClick={goToNextStep}>
                  下一步
                </button>
              ) : (
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting…' : 'Submit offline order'}
                </button>
              )}
            </div>
          </div>
        </form>
      </main>

      <style jsx>{`
        /* [2025-01-27 18:00:00] 基础样式 */
        .offline-intake {
          background: #f5f5f5;
          min-height: 100vh;
        }
        .offline-intake__hero {
          padding: 64px 24px;
          background: radial-gradient(circle at top left, #fde68a, #fef3c7);
        }
        .eyebrow {
          letter-spacing: 0.2em;
          text-transform: uppercase;
          font-size: 12px;
          color: #854d0e;
          margin-bottom: 8px;
        }
        main {
          max-width: 960px;
          margin: -48px auto 40px;
          padding: 0 24px 24px;
        }
        .intake-form {
          background: #fff;
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 20px 60px rgba(15, 23, 42, 0.12);
          display: grid;
          gap: 32px;
        }
        
        /* [2025-01-27 19:00:00] 订单编号横幅样式 */
        .order-code-banner {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 20px;
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border: 2px solid #2563eb;
          border-radius: 8px;
          margin-bottom: 24px;
        }
        .order-code-banner .order-code-label {
          font-size: 15px;
          color: #374151;
          font-weight: 500;
        }
        .order-code-banner .order-code-value {
          font-size: 18px;
          color: #0369a1;
          font-family: monospace;
          letter-spacing: 1px;
          font-weight: 700;
        }
        
        /* [2025-01-27 18:00:00] 步骤导航栏样式 */
        .step-navigation {
          display: flex;
          gap: 16px;
          padding-bottom: 24px;
          border-bottom: 2px solid #e5e7eb;
          overflow-x: auto;
        }
        .step-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          flex: 1;
          min-width: 180px;
        }
        .step-nav-item:hover {
          background: #f9fafb;
        }
        .step-nav-item.active {
          background: #eff6ff;
          border: 2px solid #2563eb;
        }
        .step-nav-item.completed .step-nav-number {
          background: #10b981;
          color: #fff;
        }
        .step-nav-number {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #e5e7eb;
          color: #6b7280;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          flex-shrink: 0;
        }
        .step-nav-item.active .step-nav-number {
          background: #2563eb;
          color: #fff;
        }
        .step-nav-info {
          flex: 1;
        }
        .step-nav-title {
          font-weight: 600;
          color: #111827;
          margin-bottom: 4px;
        }
        .step-nav-description {
          font-size: 12px;
          color: #6b7280;
        }
        
        /* [2025-01-27 18:00:00] 步骤内容区域样式 */
        .step-container {
          min-height: 400px;
        }
        .step-content h2 {
          margin: 0 0 8px;
          font-size: 24px;
          color: #111827;
        }
        .step-description {
          color: #6b7280;
          margin-bottom: 24px;
          font-size: 14px;
        }
        
        /* [2025-01-27 19:00:00] 订单编号显示样式 */
        .order-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          flex-wrap: wrap;
          gap: 16px;
        }
        .order-code-display {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #eff6ff;
          border: 1px solid #bae6fd;
          border-radius: 8px;
        }
        .order-code-label {
          font-size: 14px;
          color: #374151;
        }
        .order-code-value {
          font-size: 16px;
          color: #0369a1;
          font-family: monospace;
          letter-spacing: 1px;
        }
        
        /* [2025-01-27 18:00:00] 第一步：产品选择样式 */
        .category-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 16px;
          margin-bottom: 32px;
        }
        .category-card {
          position: relative;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          padding: 16px;
          background: #fff;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
        }
        .category-card:hover {
          border-color: #2563eb;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
        }
        .category-card.selected {
          border-color: #2563eb;
          background: #eff6ff;
        }
        .category-card-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .category-image {
          width: 60px;
          height: 60px;
          object-fit: contain;
        }
        .category-name {
          font-size: 14px;
          font-weight: 500;
          color: #111827;
        }
        .checkmark {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #2563eb;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: bold;
        }
        
        /* [2025-01-27 18:00:00] 尺码和数量样式 */
        .size-quantity-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 12px;
          margin-bottom: 24px;
        }
        .size-quantity-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #fff;
        }
        .size-checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          flex: 1;
        }
        .size-checkbox input[type='checkbox'] {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }
        .quantity-input {
          width: 80px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 6px 8px;
          font-size: 14px;
        }
        .total-quantity-summary {
          padding: 16px;
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 8px;
          text-align: center;
          color: #0369a1;
          font-size: 18px;
        }
        
        /* [2025-01-27 18:00:00] 第一步：多产品定制样式 */
        .add-product-section {
          margin-bottom: 32px;
          padding: 16px;
          background: #f9fafb;
          border-radius: 8px;
        }
        .product-select {
          width: 100%;
          max-width: 300px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 15px;
        }
        .product-items-list {
          display: grid;
          gap: 24px;
          margin-bottom: 32px;
        }
        .product-item-card {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
          background: #fff;
        }
        .product-item-header {
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 1px solid #e5e7eb;
        }
        .product-item-header h3 {
          margin: 0;
          font-size: 20px;
          color: #111827;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .remove-item-btn {
          background: #dc2626;
          color: #fff;
          border: none;
          border-radius: 6px;
          padding: 6px 12px;
          font-size: 13px;
          cursor: pointer;
        }
        .remove-item-btn:hover {
          background: #b91c1c;
        }
        .variants-section {
          margin-top: 16px;
        }
        .add-variant-section {
          margin-bottom: 16px;
        }
        .variant-select {
          width: 100%;
          max-width: 250px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 14px;
        }
        .variants-table {
          overflow-x: auto;
        }
        .variants-table table {
          width: 100%;
          border-collapse: collapse;
        }
        .variants-table th,
        .variants-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }
        .variants-table th {
          background: #f9fafb;
          font-weight: 600;
          color: #374151;
        }
        .variants-table tfoot {
          background: #f9fafb;
          font-weight: 600;
        }
        .variant-quantity-input,
        .variant-price-input {
          width: 100px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 6px 8px;
          font-size: 14px;
        }
        .variant-total {
          font-weight: 600;
          color: #0369a1;
        }
        .remove-variant-btn {
          background: #dc2626;
          color: #fff;
          border: none;
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 12px;
          cursor: pointer;
        }
        .remove-variant-btn:hover {
          background: #b91c1c;
        }
        .empty-state {
          padding: 32px;
          text-align: center;
          color: #6b7280;
          background: #f9fafb;
          border-radius: 8px;
        }
        .total-summary {
          padding: 20px;
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 8px;
          display: grid;
          gap: 12px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 16px;
        }
        .total-row strong {
          font-size: 20px;
          color: #0369a1;
        }
        
        /* [2025-01-27 18:00:00] 第三步：客人信息和价格管理样式 */
        .info-section {
          margin-bottom: 32px;
          padding: 20px;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
        }
        .info-section h3 {
          margin: 0 0 16px;
          font-size: 20px;
          color: #111827;
        }
        .info-section h4 {
          margin: 16px 0 12px;
          font-size: 16px;
          color: #374151;
        }
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          margin-bottom: 16px;
        }
        .checkbox-label input[type='checkbox'] {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }
        .invoice-info-section {
          margin-top: 16px;
          padding: 20px;
          background: #f9fafb;
          border-radius: 8px;
        }
        .price-management {
          margin-top: 16px;
        }
        .price-table-section {
          overflow-x: auto;
          margin-bottom: 24px;
        }
        .price-table {
          width: 100%;
          border-collapse: collapse;
        }
        .price-table th,
        .price-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }
        .price-table th {
          background: #f9fafb;
          font-weight: 600;
          color: #374151;
        }
        .price-input {
          width: 100px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 6px 8px;
          font-size: 14px;
        }
        .price-total {
          font-weight: 600;
          color: #0369a1;
        }
        .price-summary {
          padding: 20px;
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 8px;
          display: grid;
          gap: 12px;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 15px;
        }
        .summary-row label {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .discount-input {
          width: 100px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 6px 8px;
          font-size: 14px;
        }
        .discount-row {
          color: #dc2626;
        }
        .total-row {
          font-size: 18px;
          padding-top: 12px;
          border-top: 1px solid #bae6fd;
        }
        .total-row strong {
          font-size: 24px;
          color: #0369a1;
        }
        .quantity-row {
          font-size: 16px;
          color: #374151;
        }
        .empty-message {
          padding: 20px;
          text-align: center;
          color: #6b7280;
          background: #f9fafb;
          border-radius: 8px;
        }
        
        /* [2025-01-27 18:00:00] 第二步：印刷位置样式 */
        .side-count-section {
          margin-bottom: 32px;
          padding: 16px;
          background: #f9fafb;
          border-radius: 8px;
        }
        .side-count-section label {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .side-count-input {
          width: 100px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 8px 12px;
          font-size: 15px;
        }
        .input-hint {
          color: #6b7280;
          font-size: 13px;
          font-weight: normal;
        }
        .print-positions-list {
          display: grid;
          gap: 24px;
          margin-top: 24px;
        }
        .print-position-card {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
          background: #fff;
        }
        .position-header {
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #e5e7eb;
        }
        .position-header h3 {
          margin: 0;
          font-size: 18px;
          color: #111827;
        }
        .position-fields {
          display: grid;
          gap: 16px;
        }
        .position-select {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 15px;
          background: #fff;
          cursor: pointer;
        }
        .position-select:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        .size-inputs {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        .size-input {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 15px;
        }
        .size-input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        .position-notes {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 15px;
          resize: vertical;
          min-height: 60px;
        }
        .position-notes:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        
        /* [2025-01-27 18:00:00] 通用表单样式 */
        .grid {
          display: grid;
          gap: 16px;
        }
        .two-col {
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        }
        label {
          display: grid;
          gap: 6px;
        }
        label span {
          font-size: 14px;
          color: #374151;
          font-weight: 500;
        }
        input,
        textarea {
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 15px;
        }
        textarea {
          resize: vertical;
        }
        .checkbox-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          margin-top: 16px;
        }
        .checkbox-grid label {
          align-items: center;
          grid-template-columns: auto 1fr;
          gap: 8px;
        }
        
        /* [2025-01-27 18:00:00] 文件上传样式 */
        .upload-zone {
          border: 2px dashed #d1d5db;
          border-radius: 12px;
          padding: 24px;
          background: #fafafa;
          text-align: center;
          cursor: pointer;
          position: relative;
        }
        .upload-zone input[type='file'] {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
        }
        .file-list {
          list-style: none;
          margin: 16px 0 0;
          padding: 0;
          display: grid;
          gap: 12px;
        }
        .file-list li {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .file-list button {
          border: none;
          background: transparent;
          color: #dc2626;
          cursor: pointer;
        }
        .muted {
          color: #6b7280;
          font-size: 13px;
        }
        .link {
          color: #2563eb;
        }
        
        /* [2025-01-27 18:00:00] 表单操作按钮样式 */
        .form-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding-top: 24px;
          border-top: 1px solid #e5e7eb;
        }
        .form-actions .ghost {
          border: none;
          border-radius: 8px;
          padding: 10px 16px;
          font-weight: 600;
          cursor: pointer;
          background: rgba(37, 99, 235, 0.08);
          color: #2563eb;
        }
        .step-actions {
          display: flex;
          gap: 12px;
        }
        .btn-secondary,
        .btn-primary {
          border: none;
          border-radius: 8px;
          padding: 10px 24px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-secondary {
          background: #f3f4f6;
          color: #374151;
        }
        .btn-secondary:hover {
          background: #e5e7eb;
        }
        .btn-primary {
          background: #111827;
          color: #fff;
        }
        .btn-primary:hover {
          background: #374151;
        }
        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .intake-alert {
          border-radius: 10px;
          padding: 12px 16px;
        }
        .intake-alert--success {
          background: #ecfdf5;
          color: #047857;
        }
        .intake-alert--error {
          background: #fef2f2;
          color: #b91c1c;
        }
        
        @media (max-width: 640px) {
          .intake-form {
            padding: 24px;
          }
          .step-navigation {
            flex-direction: column;
          }
          .step-nav-item {
            min-width: auto;
          }
          .category-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .size-quantity-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          /* [2025-01-27 19:00:00] 订单编号响应式样式 */
          .order-code-banner {
            padding: 10px 16px;
            flex-direction: column;
            align-items: flex-start;
          }
          .order-code-banner .order-code-value {
            font-size: 16px;
          }
          .order-header {
            flex-direction: column;
            align-items: flex-start;
          }
          /* [2025-01-27 18:00:00] 第一步：多产品定制响应式样式 */
          .product-item-card {
            padding: 16px;
          }
          .variants-table {
            font-size: 13px;
          }
          .variants-table th,
          .variants-table td {
            padding: 8px 4px;
          }
          .variant-quantity-input,
          .variant-price-input {
            width: 70px;
            font-size: 13px;
          }
          /* [2025-01-27 18:00:00] 第二步：印刷位置响应式样式 */
          .print-position-card {
            padding: 16px;
          }
          .size-inputs {
            grid-template-columns: 1fr;
          }
          .side-count-section label {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          .input-hint {
            margin-left: 0;
          }
          /* [2025-01-27 18:00:00] 第三步：价格管理响应式样式 */
          .price-table {
            font-size: 13px;
          }
          .price-table th,
          .price-table td {
            padding: 8px 4px;
          }
          .price-input {
            width: 70px;
            font-size: 13px;
          }
          .info-section {
            padding: 16px;
          }
          .form-actions {
            flex-direction: column;
            align-items: stretch;
          }
          .step-actions {
            width: 100%;
          }
          .btn-secondary,
          .btn-primary {
            flex: 1;
          }
        }
      `}</style>
    </div>
  );
}

