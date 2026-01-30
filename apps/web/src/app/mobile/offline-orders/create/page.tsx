'use client';

import { useCallback, useEffect, useMemo, useState, useRef, Suspense, ChangeEvent, DragEvent, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/api-config';
import { categoriesApi, Category, offlineOrderProductApi, OfflineOrderConfig, simpleOfflineOrderProductApi, SimpleOfflineOrderProduct, authenticatedFetch, salesOrdersApi, SalesOfflineOrderDetail, adminOfflineOrdersApi } from '@/lib/api';
import useSWR from 'swr';
import { OFFLINE_ORDERS_TRANSLATIONS, OfflineOrdersLocale } from '@/translations/offlineOrders';
import { OrderItemColorGroup } from '@/types/order';
import { ProductItemColorConfig } from './components/ProductItemColorConfig';
import { validateColorGroups } from '@/lib/services/orderItemPricing';
import { ColorGroupCardIntegrated } from './components/ColorGroupCardIntegrated';
import { AddColorModal } from './components/AddColorModal';
import { convertProductColorsToColorGroups, convertColorGroupToProductColor } from './components/utils/colorGroupConverter';
import { BillingDetails } from './components/BillingDetails';

const DEFAULT_MAX_FILES = 10;
const DEFAULT_MAX_FILE_MB = 50;
const ACCEPTED_EXTENSIONS = ['.ai', '.eps', '.svg', '.pdf', '.png', '.jpg', '.jpeg', '.psd'];
const DRAFT_STORAGE_KEY = 'offline-order-intake-draft-mobile'; // Separate draft key for mobile
const LOCALE_STORAGE_KEY = 'offline-orders-locale';

const MAX_FILES =
  Number(process.env.NEXT_PUBLIC_OFFLINE_ORDER_MAX_FILES || DEFAULT_MAX_FILES) || DEFAULT_MAX_FILES;
const MAX_FILE_SIZE_MB =
  Number(process.env.NEXT_PUBLIC_OFFLINE_ORDER_MAX_FILE_MB || DEFAULT_MAX_FILE_MB) || DEFAULT_MAX_FILE_MB;

// ... (Types remain unchanged)
type PrintPosition = {
  position: string;
  printingStyle: string;
  dstFileFee?: number;
  width?: string;
  height?: string;
  notes: string;
};

type ProductPrintConfig = {
  sideCount: number;
  positions: PrintPosition[];
};

type ProductPrintConfigMap = Record<string, ProductPrintConfig>;

type SizeAdditionalFee = {
  size: string;
  fee: number;
};

type SizeQuantity = {
  size: string;
  quantity: number;
  unitPrice: number;
  additionalFee: number;
  subtotal: number;
};

type ProductColor = {
  groupId: string;
  colorId: string;
  colorName: string;
  availableSizes: string[];
  sizes: SizeQuantity[];
  totalQuantity: number;
  totalPrice: number;
};

type ProductItem = {
  id: string;
  productId: string;
  productName: string;
  isCustomerOwned: boolean;
  colors: ProductColor[];
  printPositions?: PrintPosition[];
  useSeparatePrintPositions: boolean;
  totalQuantity: number;
  totalPrice: number;
};

type InvoiceInfo = {
  companyName: string;
  companyEmail: string;
  taxNumber: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  paymentMethod?: string;
  referenceNumber?: string;
};

type FormState = {
  orderCode: string;
  productItems: ProductItem[];
  globalPrintPositions: PrintPosition[];
  orderNotes: string;
  dstFileFee: number;
  globalQuantitySubtotal: number;
  colorGroupsByProduct: Record<string, OrderItemColorGroup[]>;
  contactName: string;
  email: string;
  phone: string;
  company: string;
  dueDate: string;
  requiresInvoice: boolean;
  invoiceInfo: InvoiceInfo;
  files: File[];
  subtotal: number;
  discount: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  depositAmount: number;
  paymentMethod: string;
  referenceNumber: string;
  total: number;
  referenceNumber: string;
  total: number;
  startDate: string; // New
  status: string; // New
  currentStep: number;
};

const generateOrderCode = (): string => {
  const timestamp = new Date();
  const datePart = timestamp.toISOString().slice(0, 10).replace(/-/g, '');
  const sequencePart = '001';
  const generateRandomLetters = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 3; i++) {
      result += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    return result;
  };
  const randomPart = generateRandomLetters();
  return `OFF-${datePart}-${sequencePart}${randomPart}`;
};

const getProductColor = (productId: string): string => {
  const hash = productId.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 50%)`;
};

const initialFormState: FormState = {
  orderCode: '',
  productItems: [],
  globalPrintPositions: [],
  orderNotes: '',
  dstFileFee: 0,
  globalQuantitySubtotal: 0,
  colorGroupsByProduct: {},
  contactName: '',
  email: '',
  phone: '',
  company: '',
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
    paymentMethod: undefined,
    referenceNumber: undefined,
  },
  files: [],
  subtotal: 0,
  discount: 0,
  discountAmount: 0,
  taxRate: 0.13,
  taxAmount: 0,
  depositAmount: 0,
  paymentMethod: '',
  referenceNumber: '',
  total: 0,
  paymentMethod: '',
  referenceNumber: '',
  total: 0,
  startDate: '', // New
  status: 'ACTIVE', // New
  currentStep: 1,
};

const extensionIsAllowed = (fileName: string) => {
  const lower = fileName.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
};

// Simplified User Menu for Mobile
function MobileUserMenu({ locale }: { locale: OfflineOrdersLocale }) {
  // ... (Simplified version or just a logout button)
  // For now, let's keep it simple
  return null;
}

function OfflineOrdersIntakePageContent() {
  const searchParams = useSearchParams();
  const editId = searchParams?.get('editId');
  return <OfflineOrdersIntakePageInner editId={editId || undefined} />;
}

export default function OfflineOrdersIntakePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading...</div>}>
      <OfflineOrdersIntakePageContent />
    </Suspense>
  );
}

function OfflineOrdersIntakePageInner({ editId }: { editId?: string }) {
  const router = useRouter();
  const [locale, setLocale] = useState<OfflineOrdersLocale>('en');
  const [isClient, setIsClient] = useState(false);
  const [isMobile, setIsMobile] = useState(true); // Default to true for mobile page
  const [isEditMode, setIsEditMode] = useState(!!editId);
  const [editOrderData, setEditOrderData] = useState<SalesOfflineOrderDetail | null>(null);
  const [loadingEditData, setLoadingEditData] = useState(!!editId);

  const [formState, setFormState] = useState<FormState>(initialFormState);
  // ... (rest of the state)
  const [files, setFiles] = useState<File[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(1); // 当前步骤
  // 添加颜色弹窗状态
  const [addColorModal, setAddColorModal] = useState<{
    isOpen: boolean;
    itemId: string;
    colorId: string;
    colorName: string;
  } | null>(null);
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error'; message?: string }>({
    type: 'idle',
  });
  // 字段级别的错误状态，用于在对应输入框下方显示错误
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // 使用 ref 跟踪是否是按钮点击触发的提交
  const submitButtonRef = useRef<HTMLButtonElement | null>(null);
  const isSubmittingFromButtonRef = useRef(false);

  // 加载编辑订单数据（如果editId存在）
  useEffect(() => {
    if (!editId || !isClient) return;

    const loadEditOrder = async () => {
      try {
        setLoadingEditData(true);
        const order = await salesOrdersApi.get(editId);
        setEditOrderData(order);
        setIsEditMode(true);

        // 填充表单数据
        if (order && order.configuration) {
          const config = order.configuration as any;

          // 转换订单数据到表单状态
          const productItems: ProductItem[] = [];
          if (config.productItems && Array.isArray(config.productItems)) {
            productItems.push(...config.productItems);
          }

          const colorGroupsByProduct: Record<string, OrderItemColorGroup[]> = {};
          if (config.colorGroupsByProduct) {
            Object.assign(colorGroupsByProduct, config.colorGroupsByProduct);
          }

          setFormState((prev) => ({
            ...prev,
            orderCode: order.orderCode || prev.orderCode,
            productItems,
            colorGroupsByProduct,
            orderNotes: config.orderNotes || '',
            dstFileFee: config.dstFileFee || 0,
            contactName: order.contact?.name || '',
            email: order.contact?.email || '',
            phone: order.contact?.phone || '',
            company: order.contact?.company || '',
            dueDate: order.deliveryDate || '',
            requiresInvoice: config.requiresInvoice || false,
            invoiceInfo: config.invoiceInfo || prev.invoiceInfo,
            depositAmount: config.depositAmount || 0,
            paymentMethod: config.paymentMethod || config.invoiceInfo?.paymentMethod || '',
            referenceNumber: config.referenceNumber || config.invoiceInfo?.referenceNumber || '',
            // 价格信息
            subtotal: config.pricing?.subtotal || 0,
            discount: config.pricing?.discount || 0,
            discountAmount: config.pricing?.discountAmount || 0,
            taxRate: config.pricing?.taxRate || 0.13,
            taxAmount: config.pricing?.taxAmount || 0,
            total: config.pricing?.total || 0,
          }));
        }
      } catch (err: any) {
        console.error('[Edit Order] Failed to load order:', err);
        setStatus({
          type: 'error',
          message: `加载订单失败：${err.message || '未知错误'}`,
        });
      } finally {
        setLoadingEditData(false);
      }
    };

    loadEditOrder();
  }, [editId, isClient]);

  // 确保客户端渲染后再读取localStorage，避免hydration错误
  // 在客户端生成订单编号，避免 hydration 错误
  // 检测移动设备，用于支持拍照功能
  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
      if (stored === 'en' || stored === 'zh') {
        setLocale(stored);
      }
      // 在客户端生成订单编号（仅在非编辑模式下）
      if (!editId) {
        setFormState((prev) => {
          if (!prev.orderCode) {
            return { ...prev, orderCode: generateOrderCode() };
          }
          return prev;
        });
      }
      // 检测移动设备
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent) ||
        (window.innerWidth <= 768);
      setIsMobile(isMobileDevice);
    }
  }, [editId]);

  // 翻译函数 - 只在客户端渲染时使用localStorage中的语言
  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    // 避免hydration错误，如果还没到客户端，使用默认语言
    const currentLocale = isClient ? locale : 'en';
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

  // 切换语言
  const handleLocaleChange = useCallback((newLocale: OfflineOrdersLocale) => {
    setLocale(newLocale);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    }
  }, []);

  // PRD v2.0: 3步流程（产品选择、客户信息和Invoice、文件上传）
  const STEPS = useMemo(() => [
    { id: 1, title: t('step1Title'), description: t('step1Description') }, // 产品选择
    { id: 2, title: t('step2TitleV2'), description: t('step2DescriptionV2') }, // 客户信息和Invoice
    { id: 3, title: t('step3TitleV2'), description: t('step3DescriptionV2') }, // 文件上传
  ], [t, isClient]);

  // 动态生成印刷位置选项 - 依赖isClient确保hydration一致性
  const PRINT_POSITION_OPTIONS = useMemo(() => [
    { value: 'front', label: t('positionFront') },
    { value: 'back', label: t('positionBack') },
    { value: 'chest', label: t('positionChest') },
    { value: 'left_pocket', label: t('positionLeftPocket') },
    { value: 'left_sleeve', label: t('positionLeftSleeve') },
    { value: 'right_sleeve', label: t('positionRightSleeve') },
    { value: 'other', label: t('positionOther') },
  ], [t, isClient]);

  // 使用简化的产品 API
  const { data: productsData, error: productsError, isLoading: productsLoading } = useSWR(
    'simple-offline-order-products',
    () => simpleOfflineOrderProductApi.list(),
    {
      revalidateOnFocus: false,
    }
  );

  // 获取完整的订单配置（包括颜色、尺码费用、可用性）
  const { data: configData, error: configError, isLoading: configLoading } = useSWR(
    'offline-order-config',
    () => offlineOrderProductApi.getOrderConfig(),
    {
      revalidateOnFocus: false,
    }
  );

  const products: SimpleOfflineOrderProduct[] = productsData?.data || [];
  const fullConfig: OfflineOrderConfig | undefined = configData?.data;

  // 合并产品数据和配置数据
  const orderConfig = {
    products: products.map(p => ({
      id: p.id,
      name: p.name,
      imageUrl: p.imageUrl || undefined,
      isCustomerOwned: p.isCustomerOwned,
    })),
    colors: fullConfig?.colors || [],
    sizeFees: fullConfig?.sizeFees || [],
    availability: fullConfig?.availability || [],
  };

  // [2026-01-06] 从配置读取尺码列表，按类型分组和显示顺序排序
  const { youthSizes, adultSizes, allSizes, largeSizes } = useMemo(() => {
    // 只获取启用的尺码，按显示顺序排序
    const activeSizeFees = (orderConfig.sizeFees || [])
      .filter((sf) => sf.isActive !== false)
      .sort((a, b) => {
        const orderA = a.displayOrder || 0;
        const orderB = b.displayOrder || 0;
        if (orderA !== orderB) return orderA - orderB;
        return a.size.localeCompare(b.size);
      });

    const youth: string[] = [];
    const adult: string[] = [];
    const all: string[] = [];
    const large: string[] = [];

    activeSizeFees.forEach((sf) => {
      all.push(sf.size);
      if (sf.sizeType === 'Youth') {
        youth.push(sf.size);
      } else if (sf.sizeType === 'Adult' || !sf.sizeType) {
        adult.push(sf.size);
      }
      // 如果费用大于0，认为是large size
      if (sf.additionalFee > 0) {
        large.push(sf.size);
      }
    });

    return {
      youthSizes: youth.length > 0 ? youth : ['YS', 'YM', 'YL'], // 后备默认值
      adultSizes: adult.length > 0 ? adult : ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'], // 后备默认值
      allSizes: all.length > 0 ? all : [...youth, ...adult],
      largeSizes: large,
    };
  }, [orderConfig.sizeFees]);

  // PRD v2.0: 构建尺码费用映射表
  const sizeFeeMap = useMemo(() => {
    const map: Record<string, number> = {};
    (orderConfig.sizeFees || []).forEach((sf) => {
      map[sf.size] = sf.additionalFee;
    });
    return map;
  }, [orderConfig.sizeFees]);

  // PRD v2.0: 检查尺码可用性
  const isSizeAvailable = useCallback(
    (productId: string, colorId: string, size: string): boolean => {
      // 如果没有可用性配置，默认所有尺码可用
      if (orderConfig.availability.length === 0) return true;
      const config = orderConfig.availability.find(
        (a) => a.productId === productId && a.colorId === colorId && a.size === size
      );
      return config ? config.available : true; // 默认可用
    },
    [orderConfig.availability]
  );

  // Restore last-saved draft data on mount
  useEffect(() => {
    // 如果正在加载编辑数据，暂停恢复草稿，防止覆盖服务器数据
    if (loadingEditData) return;

    try {
      const rawDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!rawDraft) {
        // 如果没有草稿，确保有订单编号
        setFormState((prev) => {
          if (!prev.orderCode) {
            return { ...prev, orderCode: generateOrderCode() };
          }
          return prev;
        });
        return;
      }

      const draftData = JSON.parse(rawDraft) as {
        formState?: Partial<FormState>;
        currentStep?: number;
        editId?: string;
      };

      // [2026-01-29] User Request: Disable draft loading for new offline orders
      // We return early to prevent loading any draft data from localStorage
      return;

      // 检查草稿是否包含 editId，如果包含且当前 URL 没有 editId，则跳转
      if (draftData.editId && !editId) {
        console.log('[Draft] Redirecting to edit mode:', draftData.editId);
        // 使用 replace 防止用户无法后退
        router.replace(`/offline-orders?editId=${draftData.editId}`);
        return;
      }

      // 如果草稿是针对其他订单的编辑，不恢复
      if (draftData.editId && editId && draftData.editId !== editId) {
        console.log('[Draft] Skipping draft restoration: ID mismatch', { draftId: draftData.editId, currentId: editId });
        return;
      }

      if (draftData.formState) {
        // 恢复草稿时，如果没有订单编号则生成新的
        const restoredState = draftData.formState.orderCode
          ? draftData.formState
          : { ...draftData.formState, orderCode: generateOrderCode() };

        // 合并状态，确保不会弄丢必要的字段
        setFormState((prev) => ({ ...prev, ...restoredState }));
      } else {
        // 如果没有表单数据，确保有订单编号
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
      // 恢复失败时，确保有订单编号
      setFormState((prev) => {
        if (!prev.orderCode) {
          return { ...prev, orderCode: generateOrderCode() };
        }
        return prev;
      });
    }
  }, [loadingEditData, editId, router]);

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  }, []);

  // PRD v2.0: 添加产品（使用可维护的产品列表）
  const addProductItem = useCallback((productId: string, productName: string, isCustomerOwned: boolean = false) => {
    const newItemId = `${Date.now()} - ${Math.random().toString(36).substr(2, 9)}`;
    const newItem: ProductItem = {
      id: newItemId,
      productId,
      productName,
      isCustomerOwned,
      colors: [],
      useSeparatePrintPositions: false,
      totalQuantity: 0,
      totalPrice: 0,
    };
    setFormState((prev) => ({
      ...prev,
      productItems: [...prev.productItems, newItem],
    }));
  }, []);

  // PRD v2.0: 删除产品
  const removeProductItem = useCallback((itemId: string) => {
    setFormState((prev) => ({
      ...prev,
      productItems: prev.productItems.filter((item) => item.id !== itemId),
    }));
  }, []);

  // PRD v2.0: 为产品添加颜色（支持继承选项）
  const addColorToProduct = useCallback((itemId: string, colorId: string, colorName: string, inheritFromPrev: boolean = false) => {
    setFormState((prev) => {
      // 1. 找到目标产品
      const targetItem = prev.productItems.find(i => i.id === itemId);
      if (!targetItem) return prev;

      // 2. 生成唯一 Group ID
      const newGroupId = `${colorId}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

      // 3. 准备新颜色对象
      const newColor: ProductColor = {
        groupId: newGroupId,
        colorId,
        colorName,
        availableSizes: allSizes, // [2026-01-06] 从配置读取尺码列表
        sizes: [],
        totalQuantity: 0,
        totalPrice: 0,
      };

      // 4. 准备新颜色组配置
      let initialPositions: OrderItemColorGroup['positions'] = [];
      let inheritsFromColorId: string | null = null;
      let initialUnitPrice = 0;

      if (inheritFromPrev && targetItem.colors.length > 0) {
        const lastColor = targetItem.colors[targetItem.colors.length - 1];
        const lastColorGroups = prev.colorGroupsByProduct[itemId] || [];
        // 查找上一颜色的配置组（兼容旧数据用 colorId，新数据用 groupId）
        const lastGroup = lastColorGroups.find(g =>
          lastColor.groupId ? g.id === lastColor.groupId : g.colorCode === lastColor.colorId
        );

        if (lastGroup) {
          if (lastGroup.positions.length > 0) {
            initialPositions = lastGroup.positions.map(pos => ({
              ...pos,
              designAssetId: pos.designAssetId || null // 不复制文件引用
            }));
          }
          inheritsFromColorId = lastGroup.id;
          initialUnitPrice = lastGroup.unitPrice || 0;
        }
      }

      const newGroup: OrderItemColorGroup = {
        id: newGroupId,
        colorCode: colorId,
        colorName,
        quantities: {},
        positions: initialPositions,
        unitPrice: initialUnitPrice,
        inheritsFromColorId
      };

      // 5. 更新状态
      return {
        ...prev,
        productItems: prev.productItems.map((item) =>
          item.id === itemId ? { ...item, colors: [...item.colors, newColor] } : item
        ),
        colorGroupsByProduct: {
          ...prev.colorGroupsByProduct,
          [itemId]: [
            ...(prev.colorGroupsByProduct[itemId] || []),
            newGroup
          ]
        }
      };
    });
  }, [allSizes]);

  // PRD v2.0: 删除产品颜色 (Update v2.1: use groupId)
  const removeColorFromProduct = useCallback((itemId: string, groupId: string) => {
    setFormState((prev) => {
      const newItems = prev.productItems.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            colors: item.colors.filter((c) => c.groupId !== groupId),
          };
        }
        return item;
      });
      // 同步删除 colorGroupsByProduct 中的对应组
      const newColorGroups = { ...prev.colorGroupsByProduct };
      if (newColorGroups[itemId]) {
        newColorGroups[itemId] = newColorGroups[itemId].filter(g => g.id !== groupId);
      }
      return { ...prev, productItems: newItems, colorGroupsByProduct: newColorGroups };
    });
  }, []);

  // 更新尺码数量的辅助函数（从颜色组获取单价）
  const updateSizeQuantityInState = (
    prevState: FormState,
    itemId: string,
    groupId: string, // Changed from colorId
    size: string,
    quantity: number
  ): FormState => {
    // 从颜色组中获取单价
    const colorGroups = prevState.colorGroupsByProduct[itemId] || [];
    const colorGroup = colorGroups.find(g => g.id === groupId);
    const unitPrice = colorGroup?.unitPrice || 0;

    const newItems = prevState.productItems.map((item) => {
      if (item.id === itemId) {
        const newColors = item.colors.map((color) => {
          if (color.groupId === groupId) {
            const additionalFee = sizeFeeMap[size] || 0;
            const existingSizeIndex = color.sizes.findIndex((s) => s.size === size);
            const newSizeQuantity: SizeQuantity = {
              size,
              quantity,
              unitPrice,
              additionalFee,
              subtotal: quantity * (unitPrice + additionalFee),
            };

            let newSizes: SizeQuantity[];
            if (existingSizeIndex >= 0) {
              newSizes = [...color.sizes];
              if (quantity > 0) {
                newSizes[existingSizeIndex] = newSizeQuantity;
              } else {
                // 如果数量为0，移除该尺码
                newSizes = newSizes.filter((_, idx) => idx !== existingSizeIndex);
              }
            } else {
              if (quantity > 0) {
                newSizes = [...color.sizes, newSizeQuantity];
              } else {
                newSizes = color.sizes;
              }
            }

            // 计算该颜色的总数量和总价
            const totalQuantity = newSizes.reduce((sum, s) => sum + s.quantity, 0);
            const totalPrice = newSizes.reduce((sum, s) => sum + s.subtotal, 0);

            return {
              ...color,
              sizes: newSizes,
              totalQuantity,
              totalPrice,
            };
          }
          return color;
        });

        // 计算产品的总数量和总价
        const totalQuantity = newColors.reduce((sum, c) => sum + c.totalQuantity, 0);
        const totalPrice = newColors.reduce((sum, c) => sum + c.totalPrice, 0);

        return {
          ...item,
          colors: newColors,
          totalQuantity,
          totalPrice,
        };
      }
      return item;
    });
    // 同步更新 colorGroupsByProduct 中的 quantities
    const newColorGroups = { ...prevState.colorGroupsByProduct };
    const itemGroups = newColorGroups[itemId] || [];
    const groupIndex = itemGroups.findIndex(g => g.id === groupId);

    if (groupIndex >= 0) {
      const group = itemGroups[groupIndex];
      const newQuantities = { ...group.quantities };
      if (quantity > 0) {
        newQuantities[size] = quantity;
      } else {
        delete newQuantities[size];
      }

      const newGroup = { ...group, quantities: newQuantities };
      const newItemGroups = [...itemGroups];
      newItemGroups[groupIndex] = newGroup;
      newColorGroups[itemId] = newItemGroups;
    }

    return {
      ...prevState,
      productItems: newItems,
      colorGroupsByProduct: newColorGroups
    };
  };

  // 更新尺码数量（单价从颜色组获取）
  const updateSizeQuantity = useCallback(
    (itemId: string, groupId: string, size: string, quantity: number) => { // Changed colorId to groupId
      setFormState((prev) => updateSizeQuantityInState(prev, itemId, groupId, size, quantity));
    },
    [sizeFeeMap]
  );

  // PRD v2.0: 价格计算逻辑
  // Calculate total DST file fee from all positions
  const calculateDstFileFee = useMemo(() => {
    let totalfee = 0;
    Object.values(formState.colorGroupsByProduct).forEach((groups) => {
      groups.forEach((group) => {
        group.positions.forEach((pos) => {
          if (pos.enabled && pos.dstFileFee) {
            totalfee += pos.dstFileFee;
          }
        });
      });
    });
    return totalfee;
  }, [formState.colorGroupsByProduct]);

  const calculateSubtotal = useMemo(() => {
    return formState.productItems.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [formState.productItems]);

  const calculateDiscountAmount = useMemo(() => {
    return (calculateSubtotal * formState.discount) / 100;
  }, [calculateSubtotal, formState.discount]);

  // 计算税额（仅当需要Invoice时）
  const calculateTaxAmount = useMemo(() => {
    if (!formState.requiresInvoice) return 0;
    // Tax base includes DST fee
    const taxBase = calculateSubtotal - calculateDiscountAmount + calculateDstFileFee;
    const taxRate = formState.taxRate || 0.13; // 默认13%安省HST
    return taxBase * taxRate;
  }, [calculateSubtotal, calculateDiscountAmount, formState.requiresInvoice, formState.taxRate, calculateDstFileFee]);

  const calculateTotalBeforeTax = useMemo(() => {
    // Total includes DST fee
    return calculateSubtotal - calculateDiscountAmount + calculateDstFileFee;
  }, [calculateSubtotal, calculateDiscountAmount, calculateDstFileFee]);

  const calculateTotalWithTax = useMemo(() => {
    return calculateTotalBeforeTax + calculateTaxAmount;
  }, [calculateTotalBeforeTax, calculateTaxAmount]);

  // PRD v2.0: 计算总数量
  const calculateTotalQuantity = useMemo(() => {
    return formState.productItems.reduce((sum, item) => sum + item.totalQuantity, 0);
  }, [formState.productItems]);

  // 计算每个尺码在所有产品、所有颜色中的总数量
  const calculateSizeTotalQuantity = useMemo(() => {
    const sizeTotals: Record<string, number> = {};
    formState.productItems.forEach((item) => {
      item.colors.forEach((color) => {
        color.sizes.forEach((sizeData) => {
          if (!sizeTotals[sizeData.size]) {
            sizeTotals[sizeData.size] = 0;
          }
          sizeTotals[sizeData.size] += sizeData.quantity;
        });
      });
    });
    return sizeTotals;
  }, [formState.productItems]);

  // PRD v2.0: 生成主要产品描述（用于提交）
  const primaryProductDescription = useMemo(() => {
    if (formState.productItems.length === 0) return '';
    if (formState.productItems.length === 1) {
      return formState.productItems[0].productName;
    }
    // 多个产品时，返回产品列表（去重）
    const names = formState.productItems.map(item => item.productName);
    return Array.from(new Set(names)).join(', ');
  }, [formState.productItems]);

  // 文件列表摘要
  const fileListSummary = useMemo(() => {
    if (files.length === 0) {
      return t('noFilesSelected') || '未选择文件';
    }
    if (files.length === 1) {
      return `${files[0].name}(${(files[0].size / (1024 * 1024)).toFixed(1)} MB)`;
    }
    return `${files.length} 个文件已选择`;
  }, [files, t]);

  // 第二步：印刷位置管理方法
  // updateSideCount和updatePrintPosition已移除，印刷位置现在由颜色卡片管理

  // PRD v2.0: 步骤验证
  const validateStep = useCallback((step: number): boolean => {
    setFieldErrors({});

    if (step === 1) {
      // 第一步验证：至少选择一个产品，每个产品至少选择一个颜色，每个颜色至少填写一个尺码的数量（>0），每个尺码必须填写单价（>0），订单备注
      if (formState.productItems.length === 0) {
        setStatus({ type: 'error', message: t('errorNoProducts') || '请至少添加一个产品' });
        return false;
      }

      for (let i = 0; i < formState.productItems.length; i++) {
        const item = formState.productItems[i];
        if (item.colors.length === 0) {
          setStatus({ type: 'error', message: `产品 ${i + 1} (${item.productName})：请至少选择一个颜色` });
          return false;
        }

        for (let j = 0; j < item.colors.length; j++) {
          const color = item.colors[j];
          const hasValidSize = color.sizes.some((s) => s.quantity > 0 && s.unitPrice > 0);
          if (!hasValidSize) {
            setStatus({ type: 'error', message: `产品 ${i + 1} (${item.productName}) - 颜色 ${color.colorName}：请至少填写一个尺码的数量和单价（大于0）` });
            return false;
          }
        }
      }

      // 订单备注改为非必填，移除验证

      // 印刷位置验证已移至步骤3（颜色组配置验证），此处不再验证globalPrintPositions

      return true;
    }

    // PRD v2.0: 第二步验证（客户信息和Invoice - 全部改为非必填）
    if (step === 2) {
      // 所有字段都改为非必填，只保留格式验证（如果填写了的话）
      // 邮箱格式验证（仅在填写了邮箱时验证）
      if (formState.email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formState.email)) {
          setFieldErrors({ email: t('errorEmailFormat') || '邮箱格式不正确' });
          setStatus({ type: 'error', message: t('errorEmailFormat') || '邮箱格式不正确' });
          return false;
        }
      }

      // 所有Invoice相关字段都改为非必填，不再进行验证
      return true;
    }
    // PRD v2.0: 第三步验证（印刷位配置）
    if (step === 3) {
      // 验证每个产品项的颜色组配置
      const itemsWithColors = formState.productItems.filter(item => item.colors.length > 0);

      if (itemsWithColors.length === 0) {
        setStatus({ type: 'error', message: '请先在步骤1中添加产品并选择颜色' });
        return false;
      }

      // 验证每个产品的颜色组配置
      for (const item of itemsWithColors) {
        const colorGroups = formState.colorGroupsByProduct[item.id] || [];

        // 如果没有颜色组配置，尝试从colors转换
        if (colorGroups.length === 0 && item.colors.length > 0) {
          // 颜色组会在renderStep3中自动初始化，这里只验证已存在的
          continue;
        }

        // 使用定价服务的验证函数
        const validation = validateColorGroups(colorGroups);

        if (!validation.valid) {
          setFieldErrors(prev => ({
            ...prev,
            [`printPositions - ${item.id} `]: validation.errors.join('; ')
          }));
          setStatus({
            type: 'error',
            message: `产品"${item.productName}"的印刷位配置有误：${validation.errors.join('; ')} `
          });
          return false;
        }
      }

      // 文件上传是非必填的，无需验证
      return true;
    }
    return true;
  }, [formState, t]);

  // 步骤导航
  const resetStatus = useCallback(() => setStatus({ type: 'idle' }), []);

  const goToNextStep = useCallback(() => {
    console.log('[OfflineOrder] goToNextStep called', {
      timestamp: new Date().toISOString(),
      currentStep,
      stepsLength: STEPS.length,
      isLastStep: currentStep >= STEPS.length,
    });

    if (!validateStep(currentStep)) {
      console.log('[OfflineOrder] ⚠️ Step validation failed, not moving to next step');
      return;
    }
    resetStatus();
    if (currentStep < STEPS.length) {
      const nextStep = currentStep + 1;
      console.log('[OfflineOrder] ✅ Moving to next step:', nextStep);
      setCurrentStep(nextStep);
    } else {
      console.log('[OfflineOrder] ⚠️ Already at last step, cannot go to next step');
    }
  }, [currentStep, validateStep, resetStatus, STEPS.length]);

  const goToPreviousStep = useCallback(() => {
    resetStatus();
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep, resetStatus]);

  // PRD v2.0: 步骤导航（支持点击跳转，可自由前进后退）
  const goToStep = useCallback((step: number) => {
    // PRD v2.0: 所有步骤可自由前进后退，无强制顺序限制
    resetStatus();
    if (step >= 1 && step <= STEPS.length) {
      setCurrentStep(step);
    }
  }, [resetStatus]);

  // 修复：阻止输入框中Enter键触发表单提交
  // 添加详细调试日志
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      console.log('[OfflineOrder] Enter key pressed in input/textarea', {
        timestamp: new Date().toISOString(),
        targetTag: (event.target as HTMLElement)?.tagName,
        targetType: (event.target as HTMLInputElement)?.type,
        isTextarea: event.target instanceof HTMLTextAreaElement,
        shiftKey: event.shiftKey,
      });

      // 对于textarea，允许Shift+Enter换行，但阻止单独的Enter键
      if (event.target instanceof HTMLTextAreaElement) {
        // textarea中，只有单独的Enter键才阻止（Shift+Enter允许换行）
        if (!event.shiftKey) {
          console.log('[OfflineOrder] ⚠️ Preventing Enter key in textarea (use Shift+Enter for new line)');
          event.preventDefault();
          event.stopPropagation();
        }
      } else {
        // input中，阻止所有Enter键
        console.log('[OfflineOrder] ⚠️ Preventing Enter key in input field');
        event.preventDefault();
        event.stopPropagation();
      }
    }
  }, []);

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value, type } = event.target;
      if (type === 'checkbox') {
        const checked = (event.target as HTMLInputElement).checked;
        setField(name as keyof FormState, checked as any);
        return;
      }
      setField(name as keyof FormState, value as any);
      // 清除对应字段的错误
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
            message: `Unsupported file type: ${file.name}.Allowed: ${ACCEPTED_EXTENSIONS.join(', ')} `,
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
      const draftData = {
        formState,
        currentStep,
        editId: isEditMode ? editId : undefined,
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
      setStatus({ type: 'success', message: 'Draft saved locally. Files are not stored.' });
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to save draft locally.' });
    } finally {
      setIsSavingDraft(false);
    }
  }, [formState, currentStep, isEditMode, editId]);

  const resetForm = useCallback(() => {
    setFormState({ ...initialFormState, orderCode: generateOrderCode() });
    setCurrentStep(1);
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      // 修复：防止在输入框中按Enter键时自动提交
      // 添加详细调试日志
      // 改进：使用多种方法检查是否是提交按钮触发的
      const nativeEvent = event.nativeEvent as any;
      const submitter = nativeEvent.submitter as HTMLElement | null;
      const target = event.target as HTMLElement;
      const form = event.currentTarget;

      console.log('[OfflineOrder] handleSubmit called', {
        timestamp: new Date().toISOString(),
        hasSubmitter: !!submitter,
        submitterTag: submitter?.tagName,
        submitterType: submitter?.getAttribute('type'),
        targetTag: target?.tagName,
        targetType: (target as HTMLInputElement)?.type,
        isInput: target?.tagName === 'INPUT',
        isTextarea: target?.tagName === 'TEXTAREA',
        isSubmittingFromButton: isSubmittingFromButtonRef.current,
        activeElement: document.activeElement?.tagName,
        activeElementType: (document.activeElement as HTMLInputElement)?.type,
      });

      // 方法1：检查 submitter（HTML5标准，但可能不支持）
      const isFromSubmitButtonBySubmitter = submitter && (
        (submitter.tagName === 'BUTTON' && submitter.getAttribute('type') === 'submit') ||
        (submitter.tagName === 'INPUT' && (submitter as HTMLInputElement).type === 'submit')
      );

      // 方法2：检查 ref 标记（按钮点击时设置）
      const isFromSubmitButtonByRef = isSubmittingFromButtonRef.current;

      // 方法3：检查当前焦点元素（如果焦点在输入框，可能是Enter键）
      const activeElement = document.activeElement;
      const isFocusOnInput = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA'
      ) && (activeElement as HTMLInputElement).type !== 'submit';

      // 如果焦点在输入框且不是从提交按钮触发的，则忽略
      if (!isFromSubmitButtonBySubmitter && !isFromSubmitButtonByRef && isFocusOnInput) {
        console.log('[OfflineOrder] ⚠️ Form submit triggered by Enter key in input, ignoring...', {
          submitter: submitter ? { tag: submitter.tagName, type: submitter.getAttribute('type') } : null,
          activeElement: { tag: activeElement?.tagName, type: (activeElement as HTMLInputElement)?.type },
        });
        // 重置 ref 标记
        isSubmittingFromButtonRef.current = false;
        return;
      }

      // 重置 ref 标记
      isSubmittingFromButtonRef.current = false;

      console.log('[OfflineOrder] ✅ Form submit triggered by submit button, proceeding...');
      resetStatus();

      // PRD v2.0: 验证3个步骤
      if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
        return;
      }

      try {
        setIsSubmitting(true);
        const payload = new FormData();
        // PRD v2.0: 移除旧字段 projectName, artworkNotes, requiresMockups, requiresProof, rushOrder
        // 修复：编辑模式下也需要发送这些基本字段，确保后端能够更新
        if (primaryProductDescription) {
          payload.append('primaryProduct', primaryProductDescription);
        }
        if (calculateTotalQuantity > 0) {
          payload.append('quantity', calculateTotalQuantity.toString());
        }
        if (formState.dueDate) {
          payload.append('deliveryDate', formState.dueDate);
        }
        // [2026-01-27] 修复：编辑模式下始终发送这些字段，即使为空，让后端能够将其更新为 null
        if (isEditMode) {
          // 编辑模式：始终发送，允许清空字段
          payload.append('contactName', formState.contactName?.trim() || '');
          payload.append('email', formState.email?.trim() || '');
          payload.append('phone', formState.phone?.trim() || '');
          const companyValue = formState.requiresInvoice && formState.invoiceInfo.companyName
            ? formState.invoiceInfo.companyName.trim()
            : formState.company?.trim() || '';
          payload.append('company', companyValue);
        } else {
          // 新建模式：只发送有值的字段
          if (formState.contactName) {
            payload.append('contactName', formState.contactName.trim());
          }
          if (formState.email) {
            payload.append('email', formState.email.trim());
          }
          if (formState.phone) {
            payload.append('phone', formState.phone.trim());
          }
          const companyValue = formState.requiresInvoice && formState.invoiceInfo.companyName
            ? formState.invoiceInfo.companyName.trim()
            : formState.company || '';
          if (companyValue) {
            payload.append('company', companyValue);
          }
        }

        // PRD v2.0: 聚合印刷位置（全局 + 产品级别）
        // 从colorGroupsByProduct中提取所有印刷位置
        const allPrintPositions: Array<PrintPosition & { productItemId?: string; colorGroupId?: string; index?: number }> = [];

        // 遍历所有产品的颜色组，提取印刷位置
        formState.productItems.forEach((item) => {
          const colorGroups = formState.colorGroupsByProduct[item.id] || [];
          colorGroups.forEach((group) => {
            group.positions.forEach((pos, index) => {
              if (pos.enabled) {
                // 将PositionConfig转换为PrintPosition格式（用于向后兼容）
                allPrintPositions.push({
                  position: pos.positionKey,
                  printingStyle: pos.method,
                  width: pos.widthMm ? (pos.widthMm / 25.4).toFixed(2) : '', // 转换为inch
                  height: pos.heightMm ? (pos.heightMm / 25.4).toFixed(2) : '', // 转换为inch
                  notes: pos.notes || '',
                  productItemId: item.id,
                  colorGroupId: group.id,
                  index,
                });
              }
            });
          });
        });

        // PRD v2.0: 构建配置数据（使用新数据结构）
        payload.append(
          'configuration',
          JSON.stringify({
            source: 'nextjs-offline-intake-v2',
            orderCode: formState.orderCode,
            orderNotes: formState.orderNotes, // 订单备注（PRD v2.0）
            dstFileFee: formState.dstFileFee || null, // DST File Fee
            productItems: formState.productItems, // 新数据结构
            globalPrintPositions: [], // 已废弃，保留字段用于向后兼容
            printPositions: allPrintPositions, // 从colorGroupsByProduct聚合的印刷位置（用于向后兼容）
            colorGroupsByProduct: formState.colorGroupsByProduct, // 按颜色分组的印刷位配置（主要数据源）
            requiresInvoice: formState.requiresInvoice,
            invoiceInfo: formState.requiresInvoice ? formState.invoiceInfo : null,
            paymentMethod: formState.paymentMethod || (formState.requiresInvoice ? formState.invoiceInfo.paymentMethod : null),
            referenceNumber: formState.referenceNumber || (formState.requiresInvoice ? formState.invoiceInfo.referenceNumber : null),
            depositAmount: formState.depositAmount,
            pricing: {
              subtotal: calculateSubtotal,
              discount: formState.discount,
              discountAmount: calculateDiscountAmount,
              dstFileFee: calculateDstFileFee,
              taxRate: formState.taxRate,
              taxAmount: calculateTaxAmount,
              total: calculateTotalWithTax,
              currency: 'CAD',
            },
          }),
        );

        // PRD v2.0: 添加新字段
        payload.append('orderNotes', formState.orderNotes || '');
        if (calculateDstFileFee > 0) {
          payload.append('dstFileFee', calculateDstFileFee.toString());
        }

        // Fix: Always send payment info if available, regardless of invoice requirement
        const finalPaymentMethod = formState.paymentMethod || (formState.requiresInvoice ? formState.invoiceInfo.paymentMethod : '');
        const finalReferenceNumber = formState.referenceNumber || (formState.requiresInvoice ? formState.invoiceInfo.referenceNumber : '');

        if (finalPaymentMethod) {
          payload.append('paymentMethod', finalPaymentMethod);
        }
        if (finalReferenceNumber) {
          payload.append('referenceNumber', finalReferenceNumber);
        }
        if (formState.depositAmount > 0) {
          payload.append('depositAmount', formState.depositAmount.toString());
        }

        if (formState.startDate) {
          payload.append('startDate', formState.startDate);
        }
        if (formState.status) {
          payload.append('status', formState.status);
        }
        if (formState.dueDate) {
          payload.append('dueDate', formState.dueDate);
        }

        // PRD v2.0: 添加文件到 payload（使用 files state，不是 formState.files）
        files.forEach((file) => payload.append('assets', file, file.name));

        // 使用统一的 adminOfflineOrdersApi 进行提交，它会自动处理 Token 和 credentials
        let data;
        if (isEditMode && editId) {
          data = await adminOfflineOrdersApi.update(editId, payload);
        } else {
          data = await adminOfflineOrdersApi.create(payload);
        }
        const finalOrderCode = data?.order?.orderCode || formState.orderCode;
        setStatus({
          type: 'success',
          message: isEditMode
            ? `订单更新成功！订单编号：${finalOrderCode}。`
            : `订单提交成功！订单编号：${finalOrderCode}。订单已进入生产管理系统，我们会尽快处理。`,
        });

        // [2026-01-27] 修复：提交成功后清除草稿，防止跨订单数据污染
        localStorage.removeItem(DRAFT_STORAGE_KEY);

        // 编辑模式下，跳转到订单详情页面
        if (isEditMode && editId) {
          setTimeout(() => {
            router.push(`/offline-orders/sales/orders/${editId}`);
          }, 1500);
        } else {
          resetForm();
        }
      } catch (error: any) {
        console.error('[OfflineOrder] Submission error:', error);
        const errorMessage = error.message || 'Submission failed.';
        setStatus({
          type: 'error',
          message: errorMessage,
        });

        if (error.message?.includes('fetch') || error.message?.includes('network')) {
          setStatus({
            type: 'error',
            message: '网络连接失败，请检查网络连接后重试。',
          });
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      formState,
      resetForm,
      resetStatus,
      validateStep,
      primaryProductDescription,
      calculateTotalQuantity,
      calculateSubtotal,
      calculateDiscountAmount,
      calculateTaxAmount,
      calculateTotalWithTax,
      files,
      API_BASE_URL,
      handleKeyDown, // 添加 handleKeyDown 依赖
      calculateDstFileFee, // Add dependency
    ],
  );

  // PRD v2.0: 渲染第一步：产品选择与配置
  const renderStep1 = () => {
    // 获取已添加的产品ID列表
    const addedProductIds = formState.productItems.map((item) => item.productId);
    // 可添加的产品（未添加的）
    const availableProducts = orderConfig.products.filter((p) => !addedProductIds.includes(p.id));

    return (
      <div className="space-y-6 pb-24">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-1">{t('step1Heading')}</h2>
          <p className="text-sm text-gray-500">{t('step1Intro')}</p>
        </div>

        {/* 添加产品区域 - PRD v2.0: 使用可维护的产品列表 */}
        <div className={`p-5 rounded-xl border transition-all ${orderConfig.products.length === 0 ? 'bg-gray-50 border-gray-200 dashed' : 'bg-white border-blue-100 shadow-sm ring-4 ring-blue-50/50'}`}>
          <label className="block relative">
            <span className="block text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {t('addProduct')}
            </span>
            {(productsLoading || configLoading) ? (
              <div className="animate-pulse h-11 bg-gray-100 rounded-lg w-full"></div>
            ) : (
              <div className="relative">
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      const product = orderConfig.products.find((p) => p.id === e.target.value);
                      if (product) {
                        addProductItem(product.id, product.name, product.isCustomerOwned);
                        e.target.value = '';
                      }
                    }
                  }}
                  className="w-full appearance-none border border-gray-200 rounded-lg pl-4 pr-10 py-3 text-sm bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium disabled:opacity-50"
                  disabled={false}
                >
                  <option value="">
                    {orderConfig.products.length === 0
                      ? 'No products available'
                      : t('selectProductType') || 'Select a product to add...'}
                  </option>
                  {orderConfig.products.map((product) => {
                    const isAdded = addedProductIds.includes(product.id);
                    return (
                      <option key={product.id} value={product.id}>
                        {product.name} {product.isCustomerOwned ? '(Customer Owned)' : ''} {isAdded ? (t('alreadyAdded') || '(Added)') : ''}
                      </option>
                    );
                  })}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            )}
            {availableProducts.length === 0 && orderConfig.products.length > 0 && (
              <p className="mt-2 text-xs text-blue-600 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                All available products added
              </p>
            )}
          </label>
        </div>

        {/* 产品列表 - PRD v2.0: 产品卡片显示 */}
        {
          formState.productItems.length > 0 ? (
            <div className="space-y-6">
              {formState.productItems.map((item, itemIndex) => {
                // 获取该产品的可用颜色（如果是客户自带服装，显示"自带颜色"）
                const availableColors = item.isCustomerOwned
                  ? [{ id: 'customer-owned', name: 'Own Color' }]
                  : orderConfig.colors;

                return (
                  <div key={item.id} className="border border-gray-200 rounded-xl p-0 bg-white shadow-sm overflow-hidden animate-fade-in-up">
                    {/* 产品卡片头部 */}
                    <div className="bg-gray-50/80 p-4 border-b border-gray-100 flex items-center gap-4 relative">
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500"
                      />
                      {(() => {
                        const product = orderConfig.products.find(p => p.id === item.productId);
                        return product?.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.imageUrl}
                            alt={item.productName}
                            className="w-14 h-14 object-cover rounded-lg shadow-sm border border-gray-200 bg-white"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-300">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          </div>
                        );
                      })()}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-gray-900 truncate">
                          {item.productName}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {item.isCustomerOwned ? 'Customer Owned' : 'Standard Product'}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="text-gray-400 hover:text-red-600 bg-white hover:bg-red-50 w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 transition-all shadow-sm"
                        onClick={() => removeProductItem(item.id)}
                        title={t('delete')}
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>

                    {/* 颜色选择区域 */}
                    <div className="p-4 space-y-5">
                      {/* 如果没有颜色，显示颜色下拉菜单 */}
                      {item.colors.length === 0 && (
                        <div className="text-center py-6 bg-gray-50 border border-dashed border-gray-300 rounded-xl">
                          <div className="mx-auto w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-3">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
                          </div>
                          <h4 className="text-sm font-medium text-gray-900 mb-1">Start by adding a color</h4>
                          <p className="text-xs text-gray-500 mb-4">Choose a color to configure sizes</p>

                          <div className="max-w-xs mx-auto relative group">
                            <select
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  const color = availableColors.find(c => c.id === e.target.value);
                                  if (color) {
                                    const isFirstColor = item.colors.length === 0;
                                    if (isFirstColor) {
                                      addColorToProduct(item.id, color.id, color.name, false);
                                    } else {
                                      setAddColorModal({
                                        isOpen: true,
                                        itemId: item.id,
                                        colorId: color.id,
                                        colorName: color.name
                                      });
                                    }
                                    e.target.value = '';
                                  }
                                }
                              }}
                              className="w-full appearance-none bg-white border border-gray-300 text-gray-700 py-2.5 pl-4 pr-10 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium"
                            >
                              <option value="">{t('selectColor') || 'Select Color'}</option>
                              {availableColors.map((color) => (
                                <option key={color.id} value={color.id}>
                                  {color.name}
                                </option>
                              ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 颜色组卡片 */}
                      {item.colors.map((color, colorIndex) => {
                        const effectiveGroupId = color.groupId || color.colorId;
                        const colorGroups = formState.colorGroupsByProduct[item.id] || [];
                        const colorGroup = colorGroups.find(g => g.id === effectiveGroupId);

                        let group: OrderItemColorGroup;
                        if (colorGroup) {
                          group = colorGroup;
                        } else {
                          const quantities: Record<string, number> = {};
                          color.sizes.forEach(sizeQty => {
                            quantities[sizeQty.size] = sizeQty.quantity;
                          });
                          group = {
                            id: effectiveGroupId,
                            colorCode: color.colorId,
                            colorName: color.colorName,
                            quantities,
                            positions: [],
                            unitPrice: 0,
                            inheritsFromColorId: null
                          };
                        }

                        const previousGroup = colorIndex > 0
                          ? colorGroups.find(g => g.id === (item.colors[colorIndex - 1].groupId || item.colors[colorIndex - 1].colorId))
                          : null;

                        const colorData = availableColors.find(c => c.id === color.colorId);
                        const colorHex = (colorData as any)?.hexCode || '#CCCCCC';

                        return (
                          <ColorGroupCardIntegrated
                            key={effectiveGroupId}
                            group={group}
                            productItemId={item.productId}
                            availableSizes={color.availableSizes.length > 0 ? color.availableSizes : allSizes}
                            sizeFeeMap={sizeFeeMap}
                            youthSizes={youthSizes}
                            adultSizes={adultSizes}
                            largeSizes={largeSizes}
                            isSizeAvailable={isSizeAvailable}
                            colorHex={colorHex}
                            locale={locale}
                            onUpdate={(updated) => {
                              setFormState(prev => {
                                const groups = prev.colorGroupsByProduct[item.id] || [];
                                const existingIndex = groups.findIndex(g => g.id === updated.id);
                                let newGroups: OrderItemColorGroup[];
                                if (existingIndex >= 0) {
                                  newGroups = [...groups];
                                  newGroups[existingIndex] = updated;
                                } else {
                                  newGroups = [...groups, updated];
                                }

                                const newItems = prev.productItems.map(productItem => {
                                  if (productItem.id === item.id) {
                                    const newColors = productItem.colors.map(c => {
                                      if (c.groupId === color.groupId) {
                                        const colorGroup = updated;
                                        const unitPrice = colorGroup.unitPrice || 0;
                                        const newSizes = Object.entries(updated.quantities)
                                          .filter(([_, qty]) => qty > 0)
                                          .map(([size, qty]) => ({
                                            size,
                                            quantity: qty,
                                            unitPrice: unitPrice,
                                            additionalFee: sizeFeeMap[size] || 0,
                                            subtotal: qty * (unitPrice + (sizeFeeMap[size] || 0))
                                          }));
                                        const totalQuantity = Object.values(updated.quantities).reduce((sum, qty) => sum + qty, 0);
                                        const totalPrice = newSizes.reduce((sum, s) => sum + s.subtotal, 0);
                                        return { ...c, sizes: newSizes, totalQuantity, totalPrice };
                                      }
                                      return c;
                                    });
                                    const totalQuantity = newColors.reduce((sum, c) => sum + c.totalQuantity, 0);
                                    const totalPrice = newColors.reduce((sum, c) => sum + c.totalPrice, 0);
                                    return { ...productItem, colors: newColors, totalQuantity, totalPrice };
                                  }
                                  return productItem;
                                });

                                return {
                                  ...prev,
                                  productItems: newItems,
                                  colorGroupsByProduct: {
                                    ...prev.colorGroupsByProduct,
                                    [item.id]: newGroups
                                  }
                                };
                              });
                            }}
                            onRemove={() => removeColorFromProduct(item.id, color.groupId)}
                            onCopyToOthers={() => {
                              const otherColors = item.colors.filter(c => c.groupId !== color.groupId);
                              if (otherColors.length === 0) {
                                alert('No other colors to copy to');
                                return;
                              }
                              setFormState(prev => {
                                const groups = prev.colorGroupsByProduct[item.id] || [];
                                const sourceGroup = groups.find(g => g.id === color.groupId);
                                if (!sourceGroup) return prev;
                                const sourcePositions = sourceGroup.positions.map(pos => ({ ...pos, designAssetId: pos.designAssetId || null }));
                                const newGroups = groups.map(g => {
                                  if (otherColors.some(c => c.groupId === g.id)) {
                                    return { ...g, positions: sourcePositions, inheritsFromColorId: sourceGroup.id };
                                  }
                                  return g;
                                });
                                return { ...prev, colorGroupsByProduct: { ...prev.colorGroupsByProduct, [item.id]: newGroups } };
                              });
                            }}
                            previousGroup={previousGroup}
                            onSizeQuantityChange={(size, quantity) => {
                              updateSizeQuantity(item.id, color.groupId, size, quantity);
                            }}
                          />
                        );
                      })}

                      {/* Add another color 按钮 */}
                      {item.colors.length > 0 && (
                        <div className="pt-2">
                          <div className="relative">
                            <select
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  const color = availableColors.find(c => c.id === e.target.value);
                                  if (color) {
                                    // Logic to add color
                                    setAddColorModal({
                                      isOpen: true,
                                      itemId: item.id,
                                      colorId: color.id,
                                      colorName: color.name
                                    });
                                    e.target.value = '';
                                  }
                                }
                              }}
                              className="w-full appearance-none bg-blue-50 border border-blue-200 text-blue-700 font-semibold py-3 pl-4 pr-10 rounded-lg hover:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer text-sm"
                            >
                              <option value="">+ {t('addAnotherColor') || 'Add another color'}</option>
                              {availableColors
                                .filter(c => !item.colors.some(ic => ic.colorId === c.id)) // Optional: allow duplicates or not
                                .map((color) => (
                                  <option key={color.id} value={color.id}>
                                    {color.name}
                                  </option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-blue-700">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 px-4 text-center rounded-xl bg-gray-50 border border-dashed border-gray-200">
              <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 mb-4">
                <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
              </div>
              <h3 className="text-gray-900 font-medium">{t('pleaseAddProducts')}</h3>
              <p className="text-gray-500 text-sm mt-1">Select a product above to start your order</p>
            </div>
          )
        }

        {/* 订单备注 */}
        <div className="bg-white p-5 border border-gray-200 rounded-xl shadow-sm">
          <label className="block">
            <span className="block text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              {t('orderNotes')}
            </span>
            <textarea
              value={formState.orderNotes}
              onChange={(e) => setFormState(prev => ({ ...prev, orderNotes: e.target.value }))}
              onKeyDown={handleKeyDown}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-y placeholder-gray-400"
              placeholder={t('orderNotesPlaceholder')}
            />
          </label>
        </div>

        {/* 计费明细与总金额 - Step 1 */}
        {
          calculateTotalQuantity > 0 && (
            <div className="animate-fade-in-up space-y-4">
              <BillingDetails
                productItems={formState.productItems}
                colorGroupsByProduct={formState.colorGroupsByProduct}
                dstFileFee={calculateDstFileFee}
                locale={locale}
              />

              <div className="p-5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-lg ring-1 ring-blue-500/50">
                <div className="flex justify-between items-center text-blue-100 text-sm mb-1">
                  <span>{t('totalQuantity')}</span>
                  <span className="font-medium bg-white/20 px-2 py-0.5 rounded-full">{calculateTotalQuantity} {t('items')}</span>
                </div>
                <div className="flex justify-between items-end mt-2">
                  <span className="text-lg font-medium opacity-90">{t('totalAmount')}</span>
                  <span className="text-3xl font-bold tracking-tight">${(calculateSubtotal + calculateDstFileFee).toFixed(2)}</span>
                </div>
                {calculateDstFileFee > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/20 text-xs text-blue-100">
                    {t('containingDstFee', { amount: calculateDstFileFee.toFixed(2) })}
                  </div>
                )}
              </div>
            </div>
          )
        }
      </div >
    );
  };

  // PRD v2.0: 渲染第二步 - 客户信息和Invoice
  const renderStep2 = () => {
    // 计算税（13%安省税率，仅当选择Invoice时）
    const taxRate = formState.taxRate || 0.13;
    const taxBase = calculateSubtotal - calculateDiscountAmount + calculateDstFileFee;
    const taxAmount = formState.requiresInvoice ? taxBase * taxRate : 0;
    const totalWithTax = taxBase + taxAmount;

    return (
      <div className="space-y-6 pb-24">
        {/* Header Card */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-1">{t('step2Heading')}</h2>
          <p className="text-sm text-gray-500">{t('step2Intro')}</p>
        </div>

        {/* 客户基本信息 */}
        <section className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-gray-50/50 px-5 py-3 border-b border-gray-100">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              {t('customerInfo') || 'Customer Info'}
            </h3>
          </div>
          <div className="p-5 grid grid-cols-1 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('contactName') || 'Contact Name'}</label>
              <div className="relative">
                <input
                  type="text"
                  name="contactName"
                  value={formState.contactName}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${fieldErrors.contactName ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'}`}
                  placeholder="John Doe"
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>
              {fieldErrors.contactName && <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{fieldErrors.contactName}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('email') || 'Email'}</label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  value={formState.email}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${fieldErrors.email ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'}`}
                  placeholder="john@example.com"
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              {fieldErrors.email && <p className="mt-1.5 text-xs text-red-600 font-medium">{fieldErrors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('phone') || 'Phone'}</label>
              <div className="relative">
                <input
                  type="tel"
                  name="phone"
                  value={formState.phone}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="(555) 123-4567"
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('company') || 'Company'}</label>
              <div className="relative">
                <input
                  type="text"
                  name="company"
                  value={formState.company || ''}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="Company Name (Optional)"
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('dueDate') || 'Due Date'}</label>
              <div className="relative">
                <input
                  type="date"
                  name="dueDate"
                  value={formState.dueDate}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date (Historical)</label>
              <div className="relative">
                <input
                  type="date"
                  name="startDate"
                  value={formState.startDate}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Order Status</label>
              <div className="relative">
                <select
                  value={formState.status}
                  onChange={(e) => setField('status', e.target.value)}
                  className="w-full appearance-none pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="DRAFT">Draft</option>
                </select>
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 支付信息 */}
        <section className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-gray-50/50 px-5 py-3 border-b border-gray-100">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              {t('paymentInfo') || 'Payment Info'}
            </h3>
          </div>
          <div className="p-5 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('paymentMethod') || 'Payment Method'}</label>
              <div className="relative">
                <select
                  value={formState.paymentMethod}
                  onChange={(e) => setField('paymentMethod', e.target.value)}
                  className="w-full appearance-none pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="">{t('selectForPayment') || 'Select payment method...'}</option>
                  <option value="Cash">Cash</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="E-Transfer">E-Transfer</option>
                  <option value="Check">Check</option>
                  <option value="Other">Other</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('referenceNumber') || 'Reference #'}</label>
              <input
                type="text"
                value={formState.referenceNumber}
                onChange={(e) => setField('referenceNumber', e.target.value)}
                placeholder={t('referencePlaceholder') || 'Check # / Transaction ID'}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('depositAmount') || 'Deposit Amount'}</label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-gray-500 font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formState.depositAmount > 0 ? formState.depositAmount : ''}
                  onChange={(e) => setField('depositAmount', parseFloat(e.target.value) || 0)}
                  className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Payment Summary */}
            <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100/50 space-y-2">
              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>{t('totalAmount')}:</span>
                <span className="font-semibold">${calculateTotalWithTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-green-600">
                <span>{t('deposit')}:</span>
                <span className="font-semibold">-${formState.depositAmount.toFixed(2)}</span>
              </div>
              <div className="border-t border-blue-200/50 pt-2 mt-2 flex justify-between items-center">
                <span className="font-bold text-gray-900">{t('balanceDue')}:</span>
                <span className="text-xl font-bold text-blue-600">${Math.max(0, calculateTotalWithTax - formState.depositAmount).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Invoice功能 */}
        <section className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <label className="flex items-center justify-between p-5 cursor-pointer bg-gray-50/50 hover:bg-gray-50 transition-colors">
            <span className="text-base font-bold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              {t('requireInvoice') || 'Require Invoice (Tax)'}
            </span>
            <div className="relative">
              <input
                type="checkbox"
                name="requiresInvoice"
                checked={formState.requiresInvoice}
                onChange={(e) => setField('requiresInvoice', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </div>
          </label>

          {formState.requiresInvoice && (
            <div className="p-5 border-t border-gray-100 bg-white animate-fade-in-down">
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-100 mb-6">
                <h4 className="text-sm font-bold text-purple-900 m-0 mb-1 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Tax Applied
                </h4>
                <p className="text-xs text-purple-700">13% HST will be added to the total amount.</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide text-xs text-gray-400 mt-2">Invoice Details</h4>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">{t('companyName')}</label>
                  <input
                    type="text"
                    value={formState.invoiceInfo.companyName}
                    onChange={(e) => updateInvoiceInfo('companyName', e.target.value)}
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${fieldErrors.invoice_companyName ? 'border-red-500' : 'border-gray-200'}`}
                    placeholder="Legal Company Name"
                  />
                  {fieldErrors.invoice_companyName && <p className="mt-1 text-xs text-red-600">{fieldErrors.invoice_companyName}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">{t('companyEmail')}</label>
                  <input
                    type="email"
                    value={formState.invoiceInfo.companyEmail}
                    onChange={(e) => updateInvoiceInfo('companyEmail', e.target.value)}
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${fieldErrors.invoice_companyEmail ? 'border-red-500' : 'border-gray-200'}`}
                    placeholder="billing@company.com"
                  />
                  {fieldErrors.invoice_companyEmail && <p className="mt-1 text-xs text-red-600">{fieldErrors.invoice_companyEmail}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">{t('taxNumber') || 'Tax ID'}</label>
                  <input
                    type="text"
                    value={formState.invoiceInfo.taxNumber}
                    onChange={(e) => updateInvoiceInfo('taxNumber', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="GST/HST Number"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">{t('city')}</label>
                    <input
                      type="text"
                      value={formState.invoiceInfo.city}
                      onChange={(e) => updateInvoiceInfo('city', e.target.value)}
                      className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${fieldErrors.invoice_city ? 'border-red-500' : 'border-gray-200'}`}
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">{t('province')}</label>
                    <input
                      type="text"
                      value={formState.invoiceInfo.province}
                      onChange={(e) => updateInvoiceInfo('province', e.target.value)}
                      className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${fieldErrors.invoice_province ? 'border-red-500' : 'border-gray-200'}`}
                      placeholder="Province"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-1">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">{t('postalCode')}</label>
                    <input
                      type="text"
                      value={formState.invoiceInfo.postalCode}
                      onChange={(e) => updateInvoiceInfo('postalCode', e.target.value)}
                      className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${fieldErrors.invoice_postalCode ? 'border-red-500' : 'border-gray-200'}`}
                      placeholder="Postal Code"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">{t('address')}</label>
                    <input
                      type="text"
                      value={formState.invoiceInfo.address}
                      onChange={(e) => updateInvoiceInfo('address', e.target.value)}
                      className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${fieldErrors.invoice_address ? 'border-red-500' : 'border-gray-200'}`}
                      placeholder="Street Address"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* PRD v2.0: 税计算显示（仅当选择Invoice时显示税额） */}
        <div className="mt-4 bg-white border border-blue-100 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 bg-blue-50 border-b border-blue-100">
            <h4 className="text-base font-bold text-blue-900 m-0">{t('priceDetails') || 'Price Breakdown'}{formState.requiresInvoice ? ` (${t('withTax') || 'Inc. Tax'})` : ''}</h4>
          </div>
          <div className="p-5 space-y-3">
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>{t('subtotal') || 'Subtotal'}</span>
              <span className="font-medium">${calculateSubtotal.toFixed(2)}</span>
            </div>
            {formState.discount > 0 && (
              <div className="flex justify-between items-center text-sm text-red-600">
                <span>{t('discount')} ({formState.discount}%)</span>
                <span>-${calculateDiscountAmount.toFixed(2)}</span>
              </div>
            )}
            {calculateDstFileFee > 0 && (
              <div className="flex justify-between items-center text-sm text-blue-600">
                <span>DST File Fee</span>
                <span>${calculateDstFileFee.toFixed(2)}</span>
              </div>
            )}
            {formState.requiresInvoice && (
              <>
                <div className="flex justify-between items-center text-sm text-gray-500 pt-2 border-t border-dashed border-gray-200">
                  <span>{t('beforeTax') || 'Pre-tax'}</span>
                  <span>${taxBase.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span>{t('tax')} (13% HST)</span>
                  <span>${taxAmount.toFixed(2)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between items-baseline pt-3 border-t border-gray-100">
              <span className="text-base font-bold text-gray-900">{t('total')}</span>
              <span className="text-2xl font-bold text-blue-700">${totalWithTax.toFixed(2)} <span className="text-sm font-normal text-gray-500">CAD</span></span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 更新发票信息字段
  const updateInvoiceInfo = useCallback((field: keyof InvoiceInfo, value: string) => {
    setFormState((prev) => ({
      ...prev,
      invoiceInfo: {
        ...prev.invoiceInfo,
        [field]: value,
      },
    }));
    // 清除对应字段的错误
    const errorKey = `invoice_${field}`;
    if (fieldErrors[errorKey]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  }, [fieldErrors]);


  // PRD v2.0: 渲染第三步 - 印刷位选择 & 文件上传
  const renderStep3 = () => {
    const itemsWithColors = formState.productItems.filter(item => item.colors.length > 0);

    return (
      <div className="space-y-6 pb-24">
        {/* Header */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-1">{t('step3TitleV2') || 'Files & Review'}</h2>
          <p className="text-sm text-gray-500">{t('step3DescriptionV2') || 'Upload artwork and verify print locations.'}</p>
        </div>

        {/* File Upload Area */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="bg-gray-50/50 px-5 py-3 border-b border-gray-100">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Artwork Upload
            </h3>
          </div>
          <div className="p-5">
            <div
              className={`border-2 border-dashed ${isMobile ? 'border-blue-300 bg-blue-50/30' : 'border-gray-300 bg-gray-50'} rounded-xl p-8 text-center transition-all active:scale-[0.99] cursor-pointer hover:border-blue-400 group`}
              onClick={() => document.getElementById('mobile-file-upload')?.click()}
            >
              <div className="w-16 h-16 bg-white rounded-full shadow-sm border border-blue-100 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <p className="text-base font-bold text-gray-900 mb-1">
                {t('clickToUpload')}
              </p>
              <p className="text-xs text-gray-500">
                {t('maxFiles', { maxFiles: MAX_FILES, maxSize: MAX_FILE_SIZE_MB })}
              </p>
              <input
                id="mobile-file-upload"
                type="file"
                multiple
                className="hidden"
                accept={isMobile ? `${ACCEPTED_EXTENSIONS.join(',')},image/*` : ACCEPTED_EXTENSIONS.join(',')}
                capture={isMobile ? 'environment' : undefined}
                onChange={handleFileInputChange}
              />
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="mt-5 space-y-3">
                {files.map((file, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-white rounded-xl border border-gray-200 shadow-sm animate-fade-in-up">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 text-gray-500">
                        {file.type.startsWith('image/') ? (
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        ) : (
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                      className="text-gray-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Color Print Config */}
        <div className="space-y-4">
          <div className="px-1 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-base">Print Configuration</h3>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{itemsWithColors.length} Items</span>
          </div>

          {itemsWithColors.length === 0 ? (
            <div className="p-6 bg-yellow-50 text-yellow-800 rounded-xl text-center border border-yellow-100">
              <svg className="w-10 h-10 mx-auto text-yellow-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <p className="font-medium">No products configured</p>
              <p className="text-sm mt-1 opacity-80">Please add products and colors in Step 1 first.</p>
            </div>
          ) : (
            itemsWithColors.map((item) => {
              const existingGroups = formState.colorGroupsByProduct[item.id] || [];
              return (
                <div key={item.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <span className="font-bold text-gray-900 text-sm">{item.productName}</span>
                    <span className="text-xs bg-white border border-gray-200 px-2 py-0.5 rounded text-gray-500">
                      {item.isCustomerOwned ? 'Own' : 'Store'}
                    </span>
                  </div>
                  <div className="p-4">
                    <ProductItemColorConfig
                      key={item.id}
                      productItemId={item.id}
                      productName={item.productName}
                      colors={item.colors}
                      existingGroups={existingGroups}
                      onUpdate={(updatedGroups) => {
                        setFormState(prev => ({
                          ...prev,
                          colorGroupsByProduct: {
                            ...prev.colorGroupsByProduct,
                            [item.id]: updatedGroups
                          }
                        }));
                      }}
                      onValidationChange={(isValid, errors) => {
                        if (!isValid) {
                          setFieldErrors(prev => ({ ...prev, [`printPositions-${item.id}`]: errors.join('; ') }));
                        } else {
                          setFieldErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors[`printPositions-${item.id}`];
                            return newErrors;
                          });
                        }
                      }}
                      locale={locale}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Totals Card - Receipt Style */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden relative">
          {/* Top ZigZag Border Pattern (CSS simplified) */}
          <div className="h-2 bg-blue-500 w-full"></div>

          <div className="p-6 space-y-4 relative">
            <div className="text-center pb-4 border-b border-dashed border-gray-200">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <h3 className="font-bold text-gray-900 text-lg">Order Summary</h3>
              <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Ready to Submit</p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>{t('subtotal')}</span>
                <span className="font-medium font-mono">${calculateSubtotal.toFixed(2)}</span>
              </div>
              {calculateDstFileFee > 0 && (
                <div className="flex justify-between text-sm text-blue-600">
                  <span>DST File Fee</span>
                  <span className="font-medium font-mono">${calculateDstFileFee.toFixed(2)}</span>
                </div>
              )}
              {formState.discount > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Discount ({formState.discount}%)</span>
                  <span className="font-medium font-mono">-${calculateDiscountAmount.toFixed(2)}</span>
                </div>
              )}
              {formState.requiresInvoice && (
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Tax ({(formState.taxRate || 0.13) * 100}%)</span>
                  <span className="font-medium font-mono">${calculateTaxAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-gray-200 mt-2">
                <span className="text-base font-bold text-gray-900">Total</span>
                <span className="text-2xl font-bold text-blue-600 font-mono">${calculateTotalWithTax.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-3 text-xs text-center text-gray-400 border-t border-gray-100">
            By submitting, you agree to the order details above.
          </div>
        </div>
      </div>
    );
  };

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  if (!isClient) return null;

  return (
    <div className="mobile-app min-h-screen bg-slate-50 flex flex-col pb-safe font-sans">
      {/* Mobile Top Header - Modern Glassmorphism */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 transition-all duration-300 supports-[backdrop-filter]:bg-white/80">
        <div className="px-4 h-[52px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/mobile/orders')}
              className="p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100/50 rounded-full active:scale-95 transition-all"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>

          <h1 className="text-[17px] font-bold text-slate-900 tracking-tight absolute left-1/2 -translate-x-1/2">
            {isEditMode ? t('editOrder') : t('newOfflineOrder')}
          </h1>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleLocaleChange(locale === 'en' ? 'zh' : 'en')}
              className="text-[11px] font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded-md active:bg-slate-200 transition-colors uppercase tracking-wide"
            >
              {locale === 'en' ? '中文' : 'EN'}
            </button>
          </div>
        </div>

        {/* Continuous Progress Bar */}
        <div className="h-0.5 w-full bg-slate-100 overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(37,99,235,0.3)]"
            style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
          />
        </div>
      </header>

      {/* Improved Step Indicator */}
      <div className="bg-white px-5 py-3 border-b border-gray-100 sticky top-[54px] z-40 shadow-sm/5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-bold text-blue-600 px-2 py-0.5 bg-blue-50 rounded-full">
            Step {currentStep} of {STEPS.length}
          </span>
          <span className="text-xs text-slate-400 font-medium">{STEPS[currentStep - 1].title}</span>
        </div>
        <div className="flex items-center gap-2">
          {STEPS.map((step) => (
            <div
              key={step.id}
              onClick={() => {
                if (step.id < currentStep || validateStep(currentStep)) {
                  goToStep(step.id);
                }
              }}
              className={`h-1.5 flex-1 rounded-full transition-all duration-500 cursor-pointer ${currentStep >= step.id
                ? 'bg-blue-600 shadow-[0_1px_2px_rgba(37,99,235,0.3)]'
                : 'bg-slate-100'
                }`}
            />
          ))}
        </div>
      </div>

      {/* Mobile Content Area - Single Column */}
      <main className="flex-1 px-4 py-5 space-y-6">

        {/* Status Messages */}
        {status.type !== 'idle' && (
          <div className={`p-4 rounded-xl text-sm flex items-start gap-3 shadow-sm ${status.type === 'error' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'
            }`}>
            <div className={`mt-0.5 p-1 rounded-full ${status.type === 'error' ? 'bg-red-100' : 'bg-green-100'}`}>
              {status.type === 'error' ? (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              )}
            </div>
            <span className="flex-1 font-medium">{status.message}</span>
          </div>
        )}

        {/* Render Active Step */}
        <div className="animate-fade-in-up">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </div>

      </main>

      {/* Mobile Bottom Action Bar - Fixed */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-safe z-50 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)]">
        <div className="flex gap-3 max-w-md mx-auto">
          {currentStep > 1 && (
            <button
              onClick={() => goToPreviousStep()}
              className="flex-1 bg-white border border-gray-300 text-gray-700 py-3.5 rounded-xl font-bold text-sm active:bg-gray-50 transition-colors"
            >
              {t('prevStep')}
            </button>
          )}

          {currentStep < 3 ? (
            <button
              onClick={() => goToNextStep()}
              className="flex-[2] bg-blue-600 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-200 active:bg-blue-700 active:scale-[0.98] transition-all"
            >
              {t('nextStep')}
            </button>
          ) : (
            <button
              ref={submitButtonRef}
              onClick={(e) => {
                // Mark as submitted by button
                isSubmittingFromButtonRef.current = true;

                // Create a synthetic event or call logic directly
                const syntheticEvent = {
                  preventDefault: () => { },
                  nativeEvent: { submitter: submitButtonRef.current },
                  currentTarget: document.querySelector('form') || { checkValidity: () => true },
                  target: document.querySelector('form')
                } as unknown as React.FormEvent<HTMLFormElement>;

                handleSubmit(syntheticEvent);
              }}
              disabled={isSubmitting}
              className="flex-[2] bg-green-600 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-green-200 active:bg-green-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
            >
              {isSubmitting && <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
              {isSubmitting ? t('submitting') : t('submitOrder')}
            </button>
          )}
        </div>
      </footer>

      {/* Modals placed at root level */}
      {addColorModal && (
        <AddColorModal
          isOpen={addColorModal.isOpen}
          onCancel={() => setAddColorModal(null)}
          previousColorName={
            (() => {
              const item = formState.productItems.find(i => i.id === addColorModal.itemId);
              if (item && item.colors.length > 0) {
                return item.colors[item.colors.length - 1].colorName;
              }
              return undefined;
            })()
          }
          hasPreviousColor={
            (() => {
              const item = formState.productItems.find(i => i.id === addColorModal.itemId);
              return item ? item.colors.length > 0 : false;
            })()
          }
          onConfirm={(inherit) => {
            if (addColorModal?.itemId) {
              addColorToProduct(addColorModal.itemId, addColorModal.colorId, addColorModal.colorName, inherit);
              setAddColorModal(null);
            }
          }}
          locale={locale}
        />
      )}

    </div>
  );
}
