'use client';

import { useCallback, useEffect, useMemo, useState, ChangeEvent, FormEvent, DragEvent } from 'react';
import { API_BASE_URL } from '@/lib/api-config'; // [2025-11-16 09:50:00] 使用统一 API 基址，避免指向 Next.js 自身路由
import { categoriesApi, Category } from '@/lib/api'; // [2025-01-27 18:00:00] 引入分类 API 和类型
import useSWR from 'swr'; // [2025-01-27 18:00:00] 使用 SWR 获取分类数据
import { OFFLINE_ORDERS_TRANSLATIONS, OfflineOrdersLocale } from '@/translations/offlineOrders'; // [2025-01-27 20:00:00] 引入翻译

const DEFAULT_MAX_FILES = 10;
const DEFAULT_MAX_FILE_MB = 50;
const ACCEPTED_EXTENSIONS = ['.ai', '.eps', '.svg', '.pdf', '.png', '.jpg', '.jpeg', '.psd'];
const DRAFT_STORAGE_KEY = 'offline-order-intake-draft';
const LOCALE_STORAGE_KEY = 'offline-orders-locale'; // [2025-01-27 20:00:00] 语言偏好存储键

const MAX_FILES =
  Number(process.env.NEXT_PUBLIC_OFFLINE_ORDER_MAX_FILES || DEFAULT_MAX_FILES) || DEFAULT_MAX_FILES;
const MAX_FILE_SIZE_MB =
  Number(process.env.NEXT_PUBLIC_OFFLINE_ORDER_MAX_FILE_MB || DEFAULT_MAX_FILE_MB) || DEFAULT_MAX_FILE_MB;

// [2025-01-27 18:00:00] 标准尺码选项
const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];

// [2025-01-27 18:00:00] 步骤定义（将在组件中根据语言动态生成）

// [2025-01-27 18:00:00] 印刷位置选项（将在组件中根据语言动态生成）

// [2025-01-27 18:00:00] 印刷位置数据类型
type PrintPosition = {
  position: string; // 位置选择
  width: string; // 宽度（inch）
  height: string; // 高度（inch）
  notes: string; // 备注
};

// [2025-11-28 14:20:05] 每个产品的印刷配置（按产品类型分组的印刷位置）
type ProductPrintConfig = {
  sideCount: number; // 为该产品印几个位置
  positions: PrintPosition[]; // 该产品的印刷位置数组
};

// [2025-11-28 14:20:10] 所有产品印刷配置映射表，key 为 ProductItem.id
type ProductPrintConfigMap = Record<string, ProductPrintConfig>;

// [2025-01-27 18:00:00] 产品变体类型（尺码和颜色组合）
type ProductVariant = {
  size: string; // 尺码，如 'XS', 'S', 'M', 'L', 'XL'
  color: string; // 颜色，如 'White', 'Black', 'Red'
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
  productPrintConfigs: ProductPrintConfigMap; // [2025-11-28 14:20:20] 按产品分组的印刷位置配置映射表
  
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
  orderCode: '', // [2025-01-28 09:30:00] 订单编号在客户端生成，避免 hydration 错误
  productItems: [], // [2025-01-27 18:00:00] 初始为空，用户添加产品
  sideCount: 1, // [2025-01-27 18:00:00] 默认1个印刷位置
  printPositions: [{ position: '', width: '', height: '', notes: '' }], // [2025-01-27 18:00:00] 默认1个位置
  productPrintConfigs: {}, // [2025-11-28 14:20:30] 初始无任何产品印刷配置
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
  // [2025-01-27 20:00:00] 语言切换状态 - 默认值，避免hydration错误
  const [locale, setLocale] = useState<OfflineOrdersLocale>('zh');
  const [isClient, setIsClient] = useState(false); // [2025-01-27 20:35:00] 标记是否在客户端
  
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [files, setFiles] = useState<File[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(1); // [2025-01-27 18:00:00] 当前步骤
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error'; message?: string }>({
    type: 'idle',
  });
  // [2025-01-28 09:35:00] 字段级别的错误状态，用于在对应输入框下方显示错误
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // [2025-01-27 20:35:00] 确保客户端渲染后再读取localStorage，避免hydration错误
  // [2025-01-28 09:30:00] 在客户端生成订单编号，避免 hydration 错误
  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
      if (stored === 'en' || stored === 'zh') {
        setLocale(stored);
      }
      // [2025-01-28 09:30:00] 在客户端生成订单编号
      setFormState((prev) => {
        if (!prev.orderCode) {
          return { ...prev, orderCode: generateOrderCode() };
        }
        return prev;
      });
    }
  }, []);

  // [2025-01-27 20:00:00] 翻译函数 - 只在客户端渲染时使用localStorage中的语言
  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    // [2025-01-27 20:35:00] 避免hydration错误，如果还没到客户端，使用默认语言
    const currentLocale = isClient ? locale : 'zh';
    const translations = OFFLINE_ORDERS_TRANSLATIONS[currentLocale] || OFFLINE_ORDERS_TRANSLATIONS.en;
    const fallback = OFFLINE_ORDERS_TRANSLATIONS.en;
    let text = translations[key] || fallback[key] || key;
    
    // 替换参数
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
      });
    }
    
    return text;
  }, [locale, isClient]);

  // [2025-01-27 20:00:00] 切换语言
  const handleLocaleChange = useCallback((newLocale: OfflineOrdersLocale) => {
    setLocale(newLocale);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    }
  }, []);

  // [2025-01-27 20:00:00] 动态生成步骤定义 - 依赖isClient确保hydration一致性
  const STEPS = useMemo(() => [
    { id: 1, title: t('step1Title'), description: t('step1Description') },
    { id: 2, title: t('step2Title'), description: t('step2Description') },
    { id: 3, title: t('step3Title'), description: t('step3Description') },
    { id: 4, title: t('step4Title'), description: t('step4Description') },
    { id: 5, title: t('step5Title'), description: t('step5Description') },
  ], [t, isClient]);

  // [2025-01-27 20:00:00] 动态生成印刷位置选项 - 依赖isClient确保hydration一致性
  const PRINT_POSITION_OPTIONS = useMemo(() => [
    { value: 'front', label: t('positionFront') },
    { value: 'back', label: t('positionBack') },
    { value: 'chest', label: t('positionChest') },
    { value: 'left_pocket', label: t('positionLeftPocket') },
    { value: 'left_sleeve', label: t('positionLeftSleeve') },
    { value: 'right_sleeve', label: t('positionRightSleeve') },
    { value: 'other', label: t('positionOther') },
  ], [t, isClient]);

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

  // [2025-11-28 14:20:45] 第一步：多产品定制管理方法（新增按产品印刷配置）
  const addProductItem = useCallback((categoryId: string, categoryName: string) => {
    const newItemId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newItem: ProductItem = {
      id: newItemId,
      categoryId,
      categoryName,
      variants: [
        {
          size: '',
          color: '',
          quantity: 0,
          unitPrice: 0,
        },
      ],
    };
    const defaultPrintConfig: ProductPrintConfig = {
      sideCount: 1,
      positions: [{ position: '', width: '', height: '', notes: '' }],
    };
    setFormState((prev) => ({
      ...prev,
      productItems: [...prev.productItems, newItem],
      productPrintConfigs: {
        ...prev.productPrintConfigs,
        [newItemId]: prev.productPrintConfigs?.[newItemId] || defaultPrintConfig,
      },
    }));
  }, []);

  const removeProductItem = useCallback((itemId: string) => {
    // [2025-11-28 14:20:55] 删除产品时同步清理对应的印刷配置，避免脏数据
    setFormState((prev) => {
      const nextItems = prev.productItems.filter((item) => item.id !== itemId);
      const { [itemId]: _removed, ...restConfigs } = prev.productPrintConfigs || {};
      return {
        ...prev,
        productItems: nextItems,
        productPrintConfigs: restConfigs,
      };
    });
  }, []);

  // [2025-11-28 14:21:10] 变体管理：表格内直接编辑尺码/颜色/数量/单价
  const addVariant = useCallback((itemId: string) => {
    setFormState((prev) => {
      const newItems = prev.productItems.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            variants: [
              ...item.variants,
              { size: '', color: '', quantity: 0, unitPrice: 0 },
            ],
          };
        }
        return item;
      });
      return { ...prev, productItems: newItems };
    });
  }, []);

  const removeVariant = useCallback((itemId: string, variantIndex: number) => {
    setFormState((prev) => {
      const newItems = prev.productItems.map((item) => {
        if (item.id === itemId) {
          const nextVariants = item.variants.filter((_, idx) => idx !== variantIndex);
          // 确保至少保留一行可编辑行，避免用户无处重新添加
          const safeVariants =
            nextVariants.length > 0 ? nextVariants : [{ size: '', color: '', quantity: 0, unitPrice: 0 }];
          return {
            ...item,
            variants: safeVariants,
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
      field: 'size' | 'color' | 'quantity' | 'unitPrice',
      value: string | number
    ) => {
      if ((field === 'quantity' || field === 'unitPrice') && typeof value === 'number' && value < 0) {
        return;
      }
      setFormState((prev) => {
        const newItems = prev.productItems.map((item) => {
          if (item.id === itemId) {
            const newVariants = [...item.variants];
            const nextVariant = { ...newVariants[variantIndex] };
            if (field === 'quantity' || field === 'unitPrice') {
              (nextVariant as any)[field] = typeof value === 'number' ? value : Number(value) || 0;
            } else {
              (nextVariant as any)[field] = String(value);
            }
            newVariants[variantIndex] = nextVariant;
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

  // [2025-11-28 15:00:00] 步骤验证 - 将错误保存到 fieldErrors 中，在字段附近显示
  const validateStep = useCallback((step: number): boolean => {
    // [2025-11-28 15:00:00] 清除之前的字段错误
    setFieldErrors({});
    
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
      // [2025-11-28 14:22:10] 第二步验证：按产品校验印刷位置
      if (!formState.productItems.length) {
        setStatus({ type: 'error', message: '请先在第一步添加产品' });
        return false;
      }
      const newFieldErrors: Record<string, string> = {};
      let firstErrorKey: string | null = null;
      
      for (let i = 0; i < formState.productItems.length; i++) {
        const item = formState.productItems[i];
        const itemQuantity = item.variants.reduce((sum, v) => sum + v.quantity, 0);
        if (itemQuantity <= 0) {
          continue; // 没有数量的产品不强制要求印刷位置
        }
        const config = formState.productPrintConfigs[item.id];
        const positions = config?.positions || [];
        if (!positions.length) {
          const errorKey = `product-${item.id}-positions`;
          newFieldErrors[errorKey] = `请至少添加一个印刷位置`;
          if (!firstErrorKey) firstErrorKey = errorKey;
        }
        for (let j = 0; j < positions.length; j++) {
          const pos = positions[j];
          if (!pos.position || pos.position.trim() === '') {
            const errorKey = `product-${item.id}-position-${j}`;
            newFieldErrors[errorKey] = '请选择印刷位置';
            if (!firstErrorKey) firstErrorKey = errorKey;
          }
          const width = parseFloat(pos.width);
          const height = parseFloat(pos.height);
          if (Number.isNaN(width) || width <= 0) {
            const errorKey = `product-${item.id}-width-${j}`;
            newFieldErrors[errorKey] = '请填写有效的宽度（大于0）';
            if (!firstErrorKey) firstErrorKey = errorKey;
          }
          if (Number.isNaN(height) || height <= 0) {
            const errorKey = `product-${item.id}-height-${j}`;
            newFieldErrors[errorKey] = '请填写有效的高度（大于0）';
            if (!firstErrorKey) firstErrorKey = errorKey;
          }
        }
      }
      
      if (Object.keys(newFieldErrors).length > 0) {
        setFieldErrors(newFieldErrors);
        // [2025-11-28 15:00:00] 滚动到第一个错误位置
        setTimeout(() => {
          if (firstErrorKey) {
            const errorElement = document.querySelector(`[data-error-key="${firstErrorKey}"]`);
            if (errorElement) {
              errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              // 聚焦到第一个错误字段
              const inputElement = errorElement.querySelector('select, input');
              if (inputElement && inputElement instanceof HTMLElement) {
                inputElement.focus();
              }
            }
          }
        }, 100);
        return false;
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
      // [2025-01-28 09:35:00] 清除对应字段的错误
      if (fieldErrors[name]) {
        setFieldErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
    },
    [setField, fieldErrors],
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
          .map((v) => `${v.size} ${v.color}: ${v.quantity}`)
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
        // [2025-01-28 09:05:00] 添加 company 字段（从发票信息中获取，如果有）
        payload.append('company', formState.requiresInvoice && formState.invoiceInfo.companyName ? formState.invoiceInfo.companyName.trim() : '');
        payload.append('artworkNotes', formState.artworkNotes);
        payload.append('requiresMockups', String(formState.requiresMockups));
        payload.append('requiresProof', String(formState.requiresProof));
        payload.append('rushOrder', String(formState.rushOrder));
        // [2025-11-28 14:22:30] 聚合按产品的印刷位置，兼容后端 printPositions 结构
        const aggregatedPrintPositions =
          Object.entries(formState.productPrintConfigs || {}).flatMap(
            ([itemId, config]) => {
              const productItem = formState.productItems.find(
                (item) => item.id === itemId,
              );
              if (!productItem) return [];
              const positions = config.positions || [];
              return positions
                .filter((pos) => pos.position && pos.width && pos.height)
                .map((pos, index) => ({
                  ...pos,
                  productItemId: itemId,
                  categoryId: productItem.categoryId,
                  categoryName: productItem.categoryName,
                  index,
                }));
            },
          );
        const totalSideCount =
          aggregatedPrintPositions.length || formState.sideCount || 0;

        payload.append(
          'configuration',
          JSON.stringify({
            source: 'nextjs-offline-intake',
            orderCode: formState.orderCode, // [2025-01-27 19:00:00] 订单编号
            artworkNotes: formState.artworkNotes,
            productItems: formState.productItems, // [2025-01-27 18:00:00] 多产品定制数据
            sideCount: totalSideCount, // [2025-11-28 14:22:35] 汇总后的印刷位置总数，兼容旧字段
            printPositions:
              aggregatedPrintPositions.length > 0
                ? aggregatedPrintPositions
                : formState.printPositions, // [2025-11-28 14:22:40] 优先使用按产品聚合后的印刷位置
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
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-2 flex-wrap gap-4">
          <h2 className="text-2xl font-bold text-gray-900 m-0">{t('step1Heading')}</h2>
        </div>
        <p className="text-gray-600 mb-6 text-sm">{t('step1Intro')}</p>

        {/* 添加产品区域 - 使用 Tailwind */}
        <div className="mb-8 p-4 bg-gray-50 rounded-lg">
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-2">{t('addProduct')}：</span>
            {categoriesLoading ? (
              <select
                className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                disabled
              >
                <option>加载产品分类中...</option>
              </select>
            ) : (
              <>
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
                  className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white disabled:bg-gray-100 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  disabled={availableCategories.length === 0}
                >
                  <option value="">
                    {availableCategories.length === 0 
                      ? (categories.length === 0 
                          ? '暂无产品分类，请先添加产品分类' 
                          : '所有产品分类已添加')
                      : t('selectProductType')}
                  </option>
                  {availableCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {availableCategories.length === 0 && categories.length > 0 && (
                  <p className="mt-2 text-xs text-gray-600">
                    所有产品分类已添加，如需添加更多，请先删除已添加的产品
                  </p>
                )}
              </>
            )}
          </label>
        </div>

        {/* 产品列表 - 使用 Tailwind */}
        {formState.productItems.length > 0 ? (
          <div className="space-y-6 mb-8">
            {formState.productItems.map((item, itemIndex) => {
              const itemTotal = calculateItemTotal(item);
              const itemQuantity = item.variants.reduce((sum, v) => sum + v.quantity, 0);

              return (
                <div key={item.id} className="border border-gray-200 rounded-xl p-5 bg-white">
                  <div className="mb-5 pb-3 border-b border-gray-200">
                    <h3 className="text-xl font-semibold text-gray-900 m-0 flex justify-between items-center">
                      {item.categoryName}
                      <button
                        type="button"
                        className="bg-red-600 text-white border-none rounded-md px-3 py-1.5 text-xs font-medium cursor-pointer hover:bg-red-700 transition-colors"
                        onClick={() => removeProductItem(item.id)}
                      >
                        {t('delete')}
                      </button>
                    </h3>
                  </div>

                  {/* 变体输入区域 - 使用 Tailwind（表格内直接编辑） */}
                  <div className="mt-4">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-3 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">
                              {t('size')}
                            </th>
                            <th className="px-3 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">
                              {t('color')}
                            </th>
                            <th className="px-3 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">
                              {t('quantity')}
                            </th>
                            <th className="px-3 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">
                              {t('unitPrice')}
                            </th>
                            <th className="px-3 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">
                              {t('subtotal')}
                            </th>
                            <th className="px-3 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">
                              {t('remove')}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {item.variants.map((variant, variantIndex) => {
                            const variantTotal = variant.quantity * variant.unitPrice;
                            return (
                              <tr key={variantIndex} className="border-b border-gray-200">
                                <td className="px-3 py-3 text-sm">
                                  <select
                                    value={variant.size}
                                    onChange={(e) =>
                                      updateVariant(item.id, variantIndex, 'size', e.target.value)
                                    }
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                  >
                                    <option value="">{t('selectSize')}</option>
                                    {SIZE_OPTIONS.map((size) => (
                                      <option key={size} value={size}>
                                        {size}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-3 py-3 text-sm">
                                  <select
                                    value={variant.color}
                                    onChange={(e) =>
                                      updateVariant(item.id, variantIndex, 'color', e.target.value)
                                    }
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                  >
                                    <option value="">{t('selectColor')}</option>
                                    {['White', 'Black', 'Red', 'Blue', 'Green', 'Yellow', 'Gray'].map(
                                      (color) => (
                                        <option key={color} value={color}>
                                          {color}
                                        </option>
                                      )
                                    )}
                                  </select>
                                </td>
                                <td className="px-3 py-3">
                                  <input
                                    type="number"
                                    min="0"
                                    value={variant.quantity}
                                    onChange={(e) =>
                                      updateVariant(
                                        item.id,
                                        variantIndex,
                                        'quantity',
                                        parseInt(e.target.value, 10) || 0,
                                      )
                                    }
                                    className="w-24 border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                  />
                                </td>
                                <td className="px-3 py-3">
                                  <input
                                    type="text"
                                    value={variant.unitPrice || ''}
                                    onChange={(e) => {
                                      const value = e.target.value.replace(/[^\d.]/g, '');
                                      const numValue = parseFloat(value) || 0;
                                      updateVariant(item.id, variantIndex, 'unitPrice', numValue);
                                    }}
                                    className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                                  />
                                </td>
                                <td className="px-3 py-3 text-sm font-semibold text-blue-700">
                                  ${variantTotal.toFixed(2)}
                                </td>
                                <td className="px-3 py-3">
                                  <button
                                    type="button"
                                    className="bg-red-600 text-white border-none rounded-md px-2 py-1 text-xs font-medium cursor-pointer hover:bg-red-700 transition-colors"
                                    onClick={() => removeVariant(item.id, variantIndex)}
                                  >
                                    {t('delete')}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-gray-50">
                          <tr>
                            <td colSpan={2} className="px-3 py-3">
                              <strong className="font-semibold">{t('productSubtotal')}：</strong>
                            </td>
                            <td className="px-3 py-3">
                              <strong className="font-semibold">
                                {itemQuantity} {t('items')}
                              </strong>
                            </td>
                            <td colSpan={2} className="px-3 py-3">
                              <strong className="font-semibold text-blue-700">
                                ${itemTotal.toFixed(2)} CAD
                              </strong>
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    <div className="mt-4">
                      <button
                        type="button"
                        className="px-4 py-2 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm"
                        onClick={() => addVariant(item.id)}
                      >
                        {t('addVariant')}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-600 bg-gray-50 rounded-lg">
            <p>{t('pleaseAddProducts')}</p>
          </div>
        )}

        {/* 总计 - 使用 Tailwind */}
        {calculateTotalQuantity > 0 && (
          <div className="p-5 bg-blue-50 border border-blue-200 rounded-lg grid gap-3">
            <div className="flex justify-between items-center text-base">
              <span>{t('totalQuantity')}：</span>
              <strong className="text-lg text-blue-700">{calculateTotalQuantity} {t('items')}</strong>
            </div>
            <div className="flex justify-between items-center text-base">
              <span>{t('totalAmount')}：</span>
              <strong className="text-xl text-blue-700">${calculateSubtotal.toFixed(2)} CAD</strong>
            </div>
          </div>
        )}
      </div>
    );
  };

  // [2025-11-28 14:21:40] 渲染第二步：按产品类型分组的印刷位置 - 使用 Tailwind
  const renderStep2 = () => {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 m-0 mb-2">{t('step2Heading')}</h2>
        <p className="text-gray-600 mb-6 text-sm">{t('step2Intro')}</p>
        {formState.productItems.length === 0 ? (
          <div className="p-8 text-center text-gray-600 bg-gray-50 rounded-lg">
            <p>{t('pleaseAddProductsFirst')}</p>
          </div>
        ) : (
          <div className="space-y-6 mt-6">
            {formState.productItems.map((item) => {
              const config =
                formState.productPrintConfigs[item.id] || {
                  sideCount: 1,
                  positions: [{ position: '', width: '', height: '', notes: '' }],
                };
              const positionsToRender =
                config.positions && config.positions.length > 0
                  ? config.positions
                  : [{ position: '', width: '', height: '', notes: '' }];
              const itemQuantity = item.variants.reduce((sum, v) => sum + v.quantity, 0);

              return (
                <div key={item.id} className="border border-gray-200 rounded-xl p-5 bg-white">
                  <div className="mb-4 pb-3 border-b border-gray-200 flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 m-0">
                        {item.categoryName}
                      </h3>
                      <p className="text-xs text-gray-600 mt-1">
                        {t('totalQuantity')}：{itemQuantity} {t('items')}
                      </p>
                    </div>
                    <label className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-700">
                        {t('howManyPositions')} *
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={config.sideCount}
                        onChange={(e) => {
                          const count = Math.min(
                            10,
                            Math.max(1, parseInt(e.target.value, 10) || 1),
                          );
                          setFormState((prev) => {
                            const prevConfig =
                              prev.productPrintConfigs[item.id] ||
                              ({
                                sideCount: 1,
                                positions: [
                                  { position: '', width: '', height: '', notes: '' },
                                ],
                              } as ProductPrintConfig);
                            const currentPositions = prevConfig.positions || [];
                            const newPositions: PrintPosition[] = [];
                            for (let i = 0; i < count; i += 1) {
                              if (currentPositions[i]) {
                                newPositions.push(currentPositions[i]);
                              } else {
                                newPositions.push({
                                  position: '',
                                  width: '',
                                  height: '',
                                  notes: '',
                                });
                              }
                            }
                            return {
                              ...prev,
                              productPrintConfigs: {
                                ...(prev.productPrintConfigs || {}),
                                [item.id]: {
                                  sideCount: count,
                                  positions: newPositions,
                                },
                              },
                            };
                          });
                        }}
                        className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <span className="text-xs text-gray-600">{t('max10Positions')}</span>
                    </label>
                  </div>

                  <div className="space-y-6 mt-4">
                    {positionsToRender.map((position, index) => (
                      <div key={index} className="border border-gray-100 rounded-lg p-4 bg-gray-50">
                        <div className="mb-3">
                          <h4 className="text-sm font-semibold text-gray-900 m-0">
                            {t('position')} {index + 1}
                          </h4>
                        </div>
                        <div className="space-y-4">
                          <label className="block" data-error-key={`product-${item.id}-position-${index}`}>
                            <span className="block text-sm font-medium text-gray-700 mb-2">
                              {t('position')} *
                            </span>
                            <select
                              value={position.position}
                              onChange={(e) => {
                                const value = e.target.value;
                                // [2025-11-28 15:00:00] 清除该字段的错误
                                const errorKey = `product-${item.id}-position-${index}`;
                                setFieldErrors((prev) => {
                                  const next = { ...prev };
                                  delete next[errorKey];
                                  return next;
                                });
                                setFormState((prev) => {
                                  const prevConfig =
                                    prev.productPrintConfigs[item.id] ||
                                    ({
                                      sideCount: positionsToRender.length || 1,
                                      positions: positionsToRender,
                                    } as ProductPrintConfig);
                                  const nextPositions = [...(prevConfig.positions || [])];
                                  if (nextPositions[index]) {
                                    nextPositions[index] = {
                                      ...nextPositions[index],
                                      position: value,
                                    };
                                  }
                                  return {
                                    ...prev,
                                    productPrintConfigs: {
                                      ...(prev.productPrintConfigs || {}),
                                      [item.id]: {
                                        ...prevConfig,
                                        positions: nextPositions,
                                      },
                                    },
                                  };
                                });
                              }}
                              className={`w-full border rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                                fieldErrors[`product-${item.id}-position-${index}`]
                                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                              }`}
                            >
                              <option value="">{t('selectPosition')}</option>
                              {PRINT_POSITION_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            {/* [2025-11-28 15:00:00] 在字段下方显示错误信息 */}
                            {fieldErrors[`product-${item.id}-position-${index}`] && (
                              <span className="block mt-1 text-sm text-red-600">
                                {fieldErrors[`product-${item.id}-position-${index}`]}
                              </span>
                            )}
                          </label>

                          <div className="grid grid-cols-2 gap-4">
                            <label className="block" data-error-key={`product-${item.id}-width-${index}`}>
                              <span className="block text-sm font-medium text-gray-700 mb-2">
                                {t('width')} *
                              </span>
                              <input
                                type="number"
                                min="0.1"
                                step="0.1"
                                placeholder="0.0"
                                value={position.width}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  // [2025-11-28 15:00:00] 清除该字段的错误
                                  const errorKey = `product-${item.id}-width-${index}`;
                                  setFieldErrors((prev) => {
                                    const next = { ...prev };
                                    delete next[errorKey];
                                    return next;
                                  });
                                  setFormState((prev) => {
                                    const prevConfig =
                                      prev.productPrintConfigs[item.id] ||
                                      ({
                                        sideCount: positionsToRender.length || 1,
                                        positions: positionsToRender,
                                      } as ProductPrintConfig);
                                    const nextPositions = [...(prevConfig.positions || [])];
                                    if (nextPositions[index]) {
                                      nextPositions[index] = {
                                        ...nextPositions[index],
                                        width: value,
                                      };
                                    }
                                    return {
                                      ...prev,
                                      productPrintConfigs: {
                                        ...(prev.productPrintConfigs || {}),
                                        [item.id]: {
                                          ...prevConfig,
                                          positions: nextPositions,
                                        },
                                      },
                                    };
                                  });
                                }}
                                className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all ${
                                  fieldErrors[`product-${item.id}-width-${index}`]
                                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                                }`}
                              />
                              {/* [2025-11-28 15:00:00] 在字段下方显示错误信息 */}
                              {fieldErrors[`product-${item.id}-width-${index}`] && (
                                <span className="block mt-1 text-sm text-red-600">
                                  {fieldErrors[`product-${item.id}-width-${index}`]}
                                </span>
                              )}
                            </label>
                            <label className="block" data-error-key={`product-${item.id}-height-${index}`}>
                              <span className="block text-sm font-medium text-gray-700 mb-2">
                                {t('height')} *
                              </span>
                              <input
                                type="number"
                                min="0.1"
                                step="0.1"
                                placeholder="0.0"
                                value={position.height}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  // [2025-11-28 15:00:00] 清除该字段的错误
                                  const errorKey = `product-${item.id}-height-${index}`;
                                  setFieldErrors((prev) => {
                                    const next = { ...prev };
                                    delete next[errorKey];
                                    return next;
                                  });
                                  setFormState((prev) => {
                                    const prevConfig =
                                      prev.productPrintConfigs[item.id] ||
                                      ({
                                        sideCount: positionsToRender.length || 1,
                                        positions: positionsToRender,
                                      } as ProductPrintConfig);
                                    const nextPositions = [...(prevConfig.positions || [])];
                                    if (nextPositions[index]) {
                                      nextPositions[index] = {
                                        ...nextPositions[index],
                                        height: value,
                                      };
                                    }
                                    return {
                                      ...prev,
                                      productPrintConfigs: {
                                        ...(prev.productPrintConfigs || {}),
                                        [item.id]: {
                                          ...prevConfig,
                                          positions: nextPositions,
                                        },
                                      },
                                    };
                                  });
                                }}
                                className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all ${
                                  fieldErrors[`product-${item.id}-height-${index}`]
                                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                                }`}
                              />
                              {/* [2025-11-28 15:00:00] 在字段下方显示错误信息 */}
                              {fieldErrors[`product-${item.id}-height-${index}`] && (
                                <span className="block mt-1 text-sm text-red-600">
                                  {fieldErrors[`product-${item.id}-height-${index}`]}
                                </span>
                              )}
                            </label>
                          </div>

                          <label className="block">
                            <span className="block text-sm font-medium text-gray-700 mb-2">
                              {t('notes')}
                            </span>
                            <textarea
                              rows={2}
                              placeholder={t('positionNotesPlaceholder')}
                              value={position.notes}
                              onChange={(e) => {
                                const value = e.target.value;
                                setFormState((prev) => {
                                  const prevConfig =
                                    prev.productPrintConfigs[item.id] ||
                                    ({
                                      sideCount: positionsToRender.length || 1,
                                      positions: positionsToRender,
                                    } as ProductPrintConfig);
                                  const nextPositions = [...(prevConfig.positions || [])];
                                  if (nextPositions[index]) {
                                    nextPositions[index] = {
                                      ...nextPositions[index],
                                      notes: value,
                                    };
                                  }
                                  return {
                                    ...prev,
                                    productPrintConfigs: {
                                      ...(prev.productPrintConfigs || {}),
                                      [item.id]: {
                                        ...prevConfig,
                                        positions: nextPositions,
                                      },
                                    },
                                  };
                                });
                              }}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-y min-h-[60px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // [2025-01-27 18:00:00] 更新发票信息字段
  const updateInvoiceInfo = useCallback((field: keyof InvoiceInfo, value: string) => {
    setFormState((prev) => ({
      ...prev,
      invoiceInfo: {
        ...prev.invoiceInfo,
        [field]: value,
      },
    }));
    // [2025-01-28 09:35:00] 清除对应字段的错误
    const errorKey = `invoice_${field}`;
    if (fieldErrors[errorKey]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  }, [fieldErrors]);

  // [2025-01-27 18:00:00] 渲染第三步：客人信息和价格管理 - 使用 Tailwind
  const renderStep3 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 m-0 mb-2">{t('step3Heading')}</h2>
      <p className="text-gray-600 mb-6 text-sm">{t('step3Intro')}</p>

      {/* 客人基本信息 - 使用 Tailwind */}
      <section className="mb-8 p-5 bg-white border border-gray-200 rounded-xl">
        <h3 className="text-xl font-semibold text-gray-900 m-0 mb-4">{t('customerInfo')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-2">{t('contactName')} *</span>
            <input
              type="text"
              name="contactName"
              required
              value={formState.contactName}
              onChange={handleInputChange}
              className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                fieldErrors.contactName ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
              }`}
            />
            {fieldErrors.contactName && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.contactName}</p>
            )}
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-2">{t('email')} *</span>
            <input
              type="email"
              name="email"
              required
              value={formState.email}
              onChange={handleInputChange}
              className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                fieldErrors.email ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
              }`}
            />
            {fieldErrors.email && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
            )}
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-2">{t('phone')} *</span>
            <input
              type="tel"
              name="phone"
              required
              value={formState.phone}
              onChange={handleInputChange}
              className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                fieldErrors.phone ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
              }`}
            />
            {fieldErrors.phone && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.phone}</p>
            )}
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-2">{t('dueDate')} *</span>
            <input
              type="date"
              name="dueDate"
              required
              value={formState.dueDate}
              onChange={handleInputChange}
              className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                fieldErrors.dueDate ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
              }`}
            />
            {fieldErrors.dueDate && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.dueDate}</p>
            )}
          </label>
        </div>
      </section>

      {/* 发票信息 - 使用 Tailwind */}
      <section className="mb-8 p-5 bg-white border border-gray-200 rounded-xl">
        <label className="inline-flex items-center gap-3 cursor-pointer mb-4">
          <input
            type="checkbox"
            name="requiresInvoice"
            checked={formState.requiresInvoice}
            onChange={(e) => setField('requiresInvoice', e.target.checked)}
            className="w-4.5 h-4.5 cursor-pointer"
          />
          <span className="text-sm font-medium text-gray-700">{t('requireInvoice')}</span>
        </label>

        {formState.requiresInvoice && (
          <div className="mt-4 p-5 bg-gray-50 rounded-lg">
            <h4 className="text-base font-semibold text-gray-700 m-0 mb-3">{t('invoiceInfo')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-2">{t('companyName')} *</span>
                <input
                  type="text"
                  value={formState.invoiceInfo.companyName}
                  onChange={(e) => updateInvoiceInfo('companyName', e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                    fieldErrors.invoice_companyName ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                  }`}
                />
                {fieldErrors.invoice_companyName && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.invoice_companyName}</p>
                )}
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-2">{t('companyEmail')} *</span>
                <input
                  type="email"
                  value={formState.invoiceInfo.companyEmail}
                  onChange={(e) => updateInvoiceInfo('companyEmail', e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                    fieldErrors.invoice_companyEmail ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                  }`}
                />
                {fieldErrors.invoice_companyEmail && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.invoice_companyEmail}</p>
                )}
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-2">{t('taxNumber')} *</span>
                <input
                  type="text"
                  value={formState.invoiceInfo.taxNumber}
                  onChange={(e) => updateInvoiceInfo('taxNumber', e.target.value)}
                  placeholder={t('taxNumberPlaceholder')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-2">{t('city')} *</span>
                <input
                  type="text"
                  value={formState.invoiceInfo.city}
                  onChange={(e) => updateInvoiceInfo('city', e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                    fieldErrors.invoice_city ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                  }`}
                />
                {fieldErrors.invoice_city && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.invoice_city}</p>
                )}
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-2">{t('province')} *</span>
                <input
                  type="text"
                  value={formState.invoiceInfo.province}
                  onChange={(e) => updateInvoiceInfo('province', e.target.value)}
                  placeholder={t('provincePlaceholder')}
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                    fieldErrors.invoice_province ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                  }`}
                />
                {fieldErrors.invoice_province && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.invoice_province}</p>
                )}
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-2">{t('postalCode')} *</span>
                <input
                  type="text"
                  value={formState.invoiceInfo.postalCode}
                  onChange={(e) => updateInvoiceInfo('postalCode', e.target.value)}
                  placeholder={t('postalCodePlaceholder')}
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                    fieldErrors.invoice_postalCode ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                  }`}
                />
                {fieldErrors.invoice_postalCode && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.invoice_postalCode}</p>
                )}
              </label>
            </div>
            <label className="block mt-4">
              <span className="block text-sm font-medium text-gray-700 mb-2">{t('address')} *</span>
              <input
                type="text"
                value={formState.invoiceInfo.address}
                onChange={(e) => updateInvoiceInfo('address', e.target.value)}
                className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                  fieldErrors.invoice_address ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                }`}
              />
              {fieldErrors.invoice_address && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.invoice_address}</p>
              )}
            </label>
          </div>
        )}
      </section>

      {/* 价格预估和管理 - 使用 Tailwind */}
      <section className="mb-8 p-5 bg-white border border-gray-200 rounded-xl">
        <h3 className="text-xl font-semibold text-gray-900 m-0 mb-4">{t('priceEstimate')}</h3>
        {formState.productItems.length > 0 ? (
          <div className="mt-4">
            {/* 价格表格 - 使用 Tailwind */}
            <div className="overflow-x-auto mb-6">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">产品</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">{t('size')}</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">{t('color')}</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">{t('quantity')}</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">{t('unitPrice')}</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">{t('subtotal')}</th>
                  </tr>
                </thead>
                <tbody>
                  {formState.productItems.flatMap((item) =>
                    item.variants.map((variant, variantIndex) => {
                      const variantTotal = variant.quantity * variant.unitPrice;
                      return (
                        <tr key={`${item.id}-${variantIndex}`} className="border-b border-gray-200">
                          <td className="px-3 py-3 text-sm">{item.categoryName}</td>
                          <td className="px-3 py-3 text-sm font-medium">{variant.size}</td>
                          <td className="px-3 py-3 text-sm">{variant.color}</td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              min="0"
                              value={variant.quantity}
                              onChange={(e) =>
                                updateVariant(item.id, variantIndex, 'quantity', parseInt(e.target.value, 10) || 0)
                              }
                              className="w-24 border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="text"
                              value={variant.unitPrice ?? ''}
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^\d.]/g, '');
                                const numValue = parseFloat(value) || 0;
                                updateVariant(item.id, variantIndex, 'unitPrice', numValue);
                              }}
                              className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                          </td>
                          <td className="px-3 py-3 text-sm font-semibold text-blue-700">${variantTotal.toFixed(2)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* 总计和折扣 - 使用 Tailwind */}
            <div className="p-5 bg-blue-50 border border-blue-200 rounded-lg grid gap-3">
              <div className="flex justify-between items-center text-sm">
                <span>{t('subtotal')}：</span>
                <span>${calculateSubtotal.toFixed(2)} CAD</span>
              </div>
              <div className="flex justify-between items-center gap-3">
                <span className="text-sm">{t('discount')}：</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formState.discount ?? 0}
                  onChange={(e) => setField('discount', parseFloat(e.target.value) || 0)}
                  className="w-24 border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
              {formState.discount > 0 && (
                <div className="flex justify-between items-center text-sm text-red-600">
                  <span>{t('discountAmount')}：</span>
                  <span>-${calculateDiscountAmount.toFixed(2)} CAD</span>
                </div>
              )}
              <div className="flex justify-between items-center text-lg pt-3 border-t border-blue-200">
                <span className="font-semibold">{t('total')}：</span>
                <strong className="text-2xl text-blue-700">${calculateTotal.toFixed(2)} CAD</strong>
              </div>
              <div className="flex justify-between items-center text-base text-gray-700">
                <span>{t('totalQuantity')}：</span>
                <strong>{calculateTotalQuantity} {t('items')}</strong>
              </div>
            </div>
          </div>
        ) : (
          <p className="p-5 text-center text-gray-600 bg-gray-50 rounded-lg">{t('pleaseAddProductsFirst')}</p>
        )}
      </section>
    </div>
  );

  // [2025-01-27 18:00:00] 渲染第四步：项目详情 - 使用 Tailwind
  const renderStep4 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 m-0 mb-2">{t('step4Heading')}</h2>
      <p className="text-gray-600 mb-6 text-sm">{t('step4Intro')}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-2">{t('projectName')} *</span>
          <input
            type="text"
            name="projectName"
            required
            value={formState.projectName}
            onChange={handleInputChange}
            className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
              fieldErrors.projectName ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
            }`}
          />
          {fieldErrors.projectName && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.projectName}</p>
          )}
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-2">{t('deliveryDate')}</span>
          <input
            type="date"
            name="deliveryDate"
            value={formState.deliveryDate}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
        </label>
      </div>
      <label className="block">
        <span className="block text-sm font-medium text-gray-700 mb-2">{t('designNotes')}</span>
        <textarea
          name="artworkNotes"
          rows={4}
          value={formState.artworkNotes}
          onChange={handleInputChange}
          placeholder={t('designNotesPlaceholder')}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
        />
      </label>
    </div>
  );

  // [2025-01-27 18:00:00] 渲染第五步：文件上传 - 使用 Tailwind
  const renderStep5 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 m-0 mb-2">{t('step5Heading')}</h2>
      <p className="text-gray-600 mb-6 text-sm">{t('step5Intro')}</p>
      <div
        className="border-2 border-dashed border-gray-300 rounded-xl p-6 bg-gray-50 text-center cursor-pointer relative transition-all hover:border-blue-500 hover:bg-blue-50"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        role="button"
        tabIndex={0}
      >
        <p className="text-sm text-gray-700 mb-2">{fileListSummary}</p>
        <p className="text-xs text-gray-600">
          {t('dragDropOrBrowse')} ({t('maxFiles', { maxFiles: MAX_FILES, maxSize: MAX_FILE_SIZE_MB })})
        </p>
        <input
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(',')}
          multiple
          onChange={handleFileInputChange}
          aria-label="Upload artwork files"
          className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
      {files.length > 0 && (
        <ul className="list-none m-0 p-0 grid gap-3 mt-4">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex justify-between items-center"
            >
              <div className="flex flex-col gap-1">
                <strong className="text-sm text-gray-900">{file.name}</strong>
                <span className="text-xs text-gray-600">{(file.size / (1024 * 1024)).toFixed(1)} MB</span>
              </div>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="border-none bg-transparent text-red-600 cursor-pointer text-sm font-medium hover:text-red-700 transition-colors"
              >
                {t('remove')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="relative py-12 px-6 bg-gradient-to-br from-yellow-200 via-yellow-100 to-yellow-50 z-10">
        <div>
          {/* [2025-01-27 20:45:00] 语言切换按钮 - 使用 Tailwind */}
          <div className="absolute top-6 right-6 flex gap-2 bg-white/90 rounded-lg p-1 shadow-md">
            <button
              type="button"
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                locale === 'en'
                  ? 'bg-blue-600 text-white'
                  : 'bg-transparent text-gray-700 hover:bg-blue-50'
              }`}
              onClick={() => handleLocaleChange('en')}
            >
              EN
            </button>
            <button
              type="button"
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                locale === 'zh'
                  ? 'bg-blue-600 text-white'
                  : 'bg-transparent text-gray-700 hover:bg-blue-50'
              }`}
              onClick={() => handleLocaleChange('zh')}
            >
              中文
            </button>
          </div>
          {/* [2025-01-28 09:10:00] 使用 isClient 条件渲染避免 hydration 错误 */}
          {isClient && (
            <>
              <p className="text-xs uppercase tracking-wider text-yellow-900 mb-2">{t('heroTitle')}</p>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{t('heroSubtitle')}</h1>
              <p className="text-gray-700">{t('heroDescription')}</p>
            </>
          )}
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto -mt-8 mb-10 px-6 relative z-20">
        <form className="bg-white rounded-2xl p-8 shadow-xl grid gap-8" onSubmit={handleSubmit}>
          {status.type !== 'idle' && (
            <div
              className={`rounded-lg px-4 py-3 ${
                status.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
              role="status"
            >
              {status.message}
            </div>
          )}

          {/* [2025-01-27 19:00:00] 订单编号显示（所有步骤可见）- 使用 Tailwind */}
          {/* [2025-01-28 09:30:00] 只在客户端显示订单编号，避免 hydration 错误 */}
          {isClient && formState.orderCode && (
          <div className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-600 rounded-lg">
            <span className="text-sm text-gray-700 font-medium">{t('orderCode')}：</span>
            <strong className="text-lg text-blue-800 font-mono tracking-wide font-bold">
              {formState.orderCode}
            </strong>
          </div>
          )}

          {/* [2025-01-27 18:00:00] 步骤导航栏 - 使用 Tailwind */}
          {/* [2025-01-28 09:10:00] 使用 isClient 条件渲染避免 hydration 错误 */}
          {isClient && (
          <div className="flex gap-3 pb-6 border-b-2 border-gray-200 overflow-x-visible">
            {STEPS.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all flex-1 min-w-0 ${
                  currentStep === step.id
                    ? 'bg-blue-50 border-2 border-blue-600'
                    : currentStep > step.id
                    ? 'bg-gray-50 hover:bg-gray-100'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
                onClick={() => goToStep(step.id)}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold flex-shrink-0 ${
                    currentStep === step.id
                      ? 'bg-blue-600 text-white'
                      : currentStep > step.id
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {step.id}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 mb-1 truncate">{step.title}</div>
                  <div className="text-xs text-gray-600 leading-tight line-clamp-2">{step.description}</div>
                </div>
              </div>
            ))}
          </div>
          )}

          {/* [2025-01-27 18:00:00] 步骤内容区域 - 使用 Tailwind */}
          {/* [2025-01-28 09:10:00] 使用 isClient 条件渲染避免 hydration 错误 */}
          {isClient && (
          <div className="min-h-[400px]">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
            {currentStep === 5 && renderStep5()}
          </div>
          )}

          {/* [2025-01-27 18:00:00] 步骤导航按钮 - 使用 Tailwind */}
          {/* [2025-01-28 09:10:00] 使用 isClient 条件渲染避免 hydration 错误 */}
          {isClient && (
          <div className="flex justify-between items-center gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              className="px-4 py-2 rounded-lg font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={saveDraft}
              disabled={isSubmitting || isSavingDraft}
            >
              {isSavingDraft ? t('saving') : t('saveDraft')}
            </button>
            <div className="flex gap-3">
              {currentStep > 1 && (
                <button
                  type="button"
                  className="px-6 py-2 rounded-lg font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  onClick={goToPreviousStep}
                >
                  {t('previousStep')}
                </button>
              )}
              {currentStep < STEPS.length ? (
                <button
                  type="button"
                  className="px-6 py-2 rounded-full font-semibold bg-primary text-white hover:bg-primary-dark transition-colors shadow-md"
                  onClick={goToNextStep}
                >
                  {t('nextStep')}
                </button>
              ) : (
                <button
                  type="submit"
                  className="px-6 py-2 rounded-full font-semibold bg-primary text-white hover:bg-primary-dark transition-colors shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? t('submitting') : t('submitOrder')}
                </button>
              )}
            </div>
          </div>
          )}
        </form>
      </main>
    </div>
  );
}

