'use client';

import { useCallback, useEffect, useMemo, useState, useRef, ChangeEvent, FormEvent, DragEvent } from 'react'; // [2025-12-19] 添加useRef用于定位下拉菜单
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // [2025-01-31 20:15:00] 添加 Link 用于导航
import { API_BASE_URL } from '@/lib/api-config'; // [2025-11-16 09:50:00] 使用统一 API 基址，避免指向 Next.js 自身路由
import { categoriesApi, Category, offlineOrderProductApi, OfflineOrderConfig, simpleOfflineOrderProductApi, SimpleOfflineOrderProduct } from '@/lib/api'; // [2025-12-07 08:00:00] 简化的产品 API
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

// [2025-12-07 02:30:00] PRD v2.0: 尺码分类
const YOUTH_SIZES = ['YS', 'YM', 'YL'];
const ADULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];
const ALL_SIZES = [...YOUTH_SIZES, ...ADULT_SIZES];
const LARGE_SIZES = ['2XL', '3XL', '4XL', '5XL']; // 需要额外费用的大尺码

// [2025-01-27 18:00:00] 步骤定义（将在组件中根据语言动态生成）

// [2025-01-27 18:00:00] 印刷位置选项（将在组件中根据语言动态生成）

// [2025-12-07 02:30:00] PRD v2.0: 印刷位置数据类型（扩展）
type PrintPosition = {
  position: string; // 位置（包含"其他"）
  printingStyle: string; // 工艺：DTF, Embroidery, UV, Vinyl, 其他
  dstFileFee?: number; // DST File Fee（仅Embroidery，订单级别）
  width?: string; // 宽度（inch），可选
  height?: string; // 高度（inch），可选（width和height至少一个）
  notes: string; // 备注
};

// [2025-11-28 14:20:05] 每个产品的印刷配置（按产品类型分组的印刷位置）
type ProductPrintConfig = {
  sideCount: number; // 为该产品印几个位置
  positions: PrintPosition[]; // 该产品的印刷位置数组
};

// [2025-11-28 14:20:10] 所有产品印刷配置映射表，key 为 ProductItem.id
type ProductPrintConfigMap = Record<string, ProductPrintConfig>;

// [2025-12-07 02:30:00] PRD v2.0: 尺码额外费用配置
type SizeAdditionalFee = {
  size: string; // 2XL, 3XL, 4XL, 5XL
  fee: number; // 额外费用（可配置）
};

// [2025-12-07 02:30:00] PRD v2.0: 尺码数量输入
type SizeQuantity = {
  size: string; // 尺码：YS, YM, YL, XS, S, M, L, XL, 2XL, 3XL, 4XL, 5XL
  quantity: number; // 件数
  unitPrice: number; // 单价
  additionalFee: number; // 额外费用（从配置读取）
  subtotal: number; // 小计：quantity × (unitPrice + additionalFee)
};

// [2025-12-07 02:30:00] PRD v2.0: 产品颜色配置
type ProductColor = {
  colorId: string; // 颜色ID
  colorName: string; // 颜色名称
  availableSizes: string[]; // 可用尺码列表（从配置读取）
  sizes: SizeQuantity[]; // 尺码数量配置
  totalQuantity: number; // 该颜色总数量
  totalPrice: number; // 该颜色总价
};

// [2025-12-07 02:30:00] PRD v2.0: 产品项目类型
type ProductItem = {
  id: string; // 唯一ID
  productId: string; // 产品ID（可维护）
  productName: string; // 产品名称
  isCustomerOwned: boolean; // 是否客户自带服装
  colors: ProductColor[]; // 颜色列表
  printPositions?: PrintPosition[]; // 单独印刷位置配置（可选）
  useSeparatePrintPositions: boolean; // 是否使用单独印刷位置
  totalQuantity: number; // 总数量
  totalPrice: number; // 总价格
};

// [2025-01-27 18:00:00] 发票信息类型（加拿大invoice常规信息）
// [2025-12-06 18:30:00] 添加支付相关字段
type InvoiceInfo = {
  companyName: string;
  companyEmail: string;
  taxNumber: string; // GST/HST Number
  address: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  paymentMethod?: string; // [2025-12-06 18:30:00] 支付方式（card/etrans）
  referenceNumber?: string; // [2025-12-06 18:30:00] Reference Number
};

// [2025-12-07 02:30:00] PRD v2.0: 表单状态（3步流程）
type FormState = {
  orderCode: string; // 订单编号
  
  // 第一步：产品配置
  productItems: ProductItem[]; // 产品列表
  globalPrintPositions: PrintPosition[]; // 总体印刷位置
  orderNotes: string; // 订单备注（非必填）
  dstFileFee: number; // DST File Fee（订单级别，仅当有Embroidery时）
  globalUnitPrice: number; // [2025-12-08 05:25:00] 全局单价
  globalQuantitySubtotal: number; // [2025-12-08 05:25:00] 全局件数小计
  
  // 第二步：客户信息
  contactName: string;
  email: string;
  phone: string;
  company: string;
  dueDate: string;
  requiresInvoice: boolean;
  invoiceInfo: InvoiceInfo;
  
  // 第三步：文件上传（非必填）
  files: File[];
  
  // 价格汇总
  subtotal: number; // 小计
  discount: number; // 折扣百分比
  discountAmount: number; // 折扣金额
  taxRate: number; // 税率（0.13 for 13%）
  taxAmount: number; // 税额
  total: number; // 总计（含税）
  
  // 流程控制
  currentStep: number; // 当前步骤（1-3）
};

// [2025-01-27 19:00:00] 生成订单编号（与后端格式一致）
const generateOrderCode = (): string => {
  const timestamp = new Date();
  const datePart = timestamp.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `OFF-${datePart}-${randomPart}`;
};

// [2025-12-07 02:30:00] PRD v2.0: 初始表单状态
const initialFormState: FormState = {
  orderCode: '',
  productItems: [],
  globalPrintPositions: [],
  orderNotes: '',
  dstFileFee: 0,
  globalUnitPrice: 0, // [2025-12-08 05:25:00] 全局单价
  globalQuantitySubtotal: 0, // [2025-12-08 05:25:00] 全局件数小计
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
  total: 0,
  currentStep: 1,
};

const extensionIsAllowed = (fileName: string) => {
  const lower = fileName.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
};

// [2025-12-07 03:00:00] 用户菜单组件（登录按钮/用户菜单）
function UserMenu() {
  const [isClient, setIsClient] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const router = useRouter();
  const buttonRef = useRef<HTMLButtonElement>(null); // [2025-12-19] 用于获取按钮位置以计算菜单位置
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 }); // [2025-12-19] 菜单位置状态

  // [2025-12-19] 计算菜单位置
  useEffect(() => {
    if (showMenu && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8, // mt-2 = 8px
        right: window.innerWidth - rect.right, // 从右边距计算
      });
    }
  }, [showMenu]);

  useEffect(() => {
    setIsClient(true);
    // 检查登录状态
    const checkAuth = async () => {
      try {
        const { authApi } = await import('@/lib/api');
        const me = await authApi.me();
        setUser(me);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      const { authApi } = await import('@/lib/api');
      await authApi.logout();
      setUser(null);
      setShowMenu(false);
      window.location.reload();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  if (!isClient || loading) {
    return null;
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => router.push('/offline-orders/sales/login')}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm shadow-md"
      >
        登录
      </button>
    );
  }

  const userName = user.firstName && user.lastName 
    ? `${user.firstName} ${user.lastName}`.trim()
    : user.email?.split('@')[0] || '用户';

  return (
    <div className="relative" style={{ zIndex: 10000 }}> {/* [2025-12-19] 确保父容器也有足够高的z-index */}
      <button
        ref={buttonRef} // [2025-12-19] 添加ref用于定位菜单
        type="button"
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-3 py-2 bg-white/90 rounded-lg shadow-md hover:bg-white transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 10C12.7614 10 15 7.76142 15 5C15 2.23858 12.7614 0 10 0C7.23858 0 5 2.23858 5 5C5 7.76142 7.23858 10 10 10Z" fill="currentColor"/>
          <path d="M10 12C5.58172 12 2 14.6863 2 18V20H18V18C18 14.6863 14.4183 12 10 12Z" fill="currentColor"/>
        </svg>
        <span className="text-sm font-medium text-gray-700 hidden sm:inline">{userName}</span>
      </button>
      
      {showMenu && (
        <>
          <div 
            className="fixed inset-0" // [2025-12-19] 遮罩层
            style={{ zIndex: 99998 }} // [2025-12-19] 使用内联样式确保z-index足够高
            onClick={() => setShowMenu(false)}
          />
          <div 
            className="fixed w-48 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden" // [2025-12-19] 使用fixed定位，避免被main区域遮挡
            style={{ 
              top: `${menuPosition.top}px`, 
              right: `${menuPosition.right}px`,
              zIndex: 99999, // [2025-12-19] 使用内联样式设置极高的z-index，确保菜单始终在最上层
              position: 'fixed', // [2025-12-19] 明确指定position，确保创建新的堆叠上下文
              isolation: 'isolate' // [2025-12-19] 创建新的堆叠上下文，避免被其他元素遮挡
            }}
          >
            <div className="px-4 py-2 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-900">{userName}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowMenu(false);
                router.push('/offline-orders/sales/orders');
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              订单管理
            </button>
            <button
              type="button"
              onClick={() => {
                setShowMenu(false);
                router.push('/account/settings');
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              修改密码
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-200"
            >
              退出登录
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function OfflineOrdersIntakePage() {
  // [2025-01-27 20:00:00] 语言切换状态 - 默认值，避免hydration错误
  const [locale, setLocale] = useState<OfflineOrdersLocale>('zh');
  const [isClient, setIsClient] = useState(false); // [2025-01-27 20:35:00] 标记是否在客户端
  // [2025-12-04 00:15:00] 移动设备检测 - 用于支持拍照功能
  const [isMobile, setIsMobile] = useState(false);
  
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
  // [2025-12-04 00:15:00] 检测移动设备，用于支持拍照功能
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
      // [2025-12-04 00:15:00] 检测移动设备
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent) ||
        (window.innerWidth <= 768);
      setIsMobile(isMobileDevice);
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

  // [2025-12-07 02:00:00] PRD v2.0: 3步流程（产品选择、客户信息和Invoice、文件上传）
  const STEPS = useMemo(() => [
    { id: 1, title: t('step1Title'), description: t('step1Description') }, // 产品选择
    { id: 2, title: t('step2TitleV2'), description: t('step2DescriptionV2') }, // 客户信息和Invoice
    { id: 3, title: t('step3TitleV2'), description: t('step3DescriptionV2') }, // 文件上传
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

  // [2025-12-07 08:00:00] 使用简化的产品 API
  const { data: productsData, error: productsError, isLoading: productsLoading } = useSWR(
    'simple-offline-order-products',
    () => simpleOfflineOrderProductApi.list(),
    {
      revalidateOnFocus: false,
    }
  );

  // [2025-12-08 01:10:00] 获取完整的订单配置（包括颜色、尺码费用、可用性）
  const { data: configData, error: configError, isLoading: configLoading } = useSWR(
    'offline-order-config',
    () => offlineOrderProductApi.getOrderConfig(),
    {
      revalidateOnFocus: false,
    }
  );

  const products: SimpleOfflineOrderProduct[] = productsData?.data || [];
  const fullConfig: OfflineOrderConfig | undefined = configData?.data;

  // [2025-12-08 01:10:00] 合并产品数据和配置数据
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

  // [2025-12-07 02:30:00] PRD v2.0: 构建尺码费用映射表
  const sizeFeeMap = useMemo(() => {
    const map: Record<string, number> = {};
    orderConfig.sizeFees.forEach((sf) => {
      map[sf.size] = sf.additionalFee;
    });
    // 默认值（如果API没有返回）
    if (orderConfig.sizeFees.length === 0) {
      LARGE_SIZES.forEach((size) => {
        const defaultFees: Record<string, number> = {
          '2XL': 2.50,
          '3XL': 3.50,
          '4XL': 4.50,
          '5XL': 5.50,
        };
        map[size] = defaultFees[size] || 0;
      });
    }
    return map;
  }, [orderConfig.sizeFees]);

  // [2025-12-07 02:30:00] PRD v2.0: 检查尺码可用性
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

  // [2025-12-07 02:30:00] PRD v2.0: 添加产品（使用可维护的产品列表）
  const addProductItem = useCallback((productId: string, productName: string, isCustomerOwned: boolean = false) => {
    const newItemId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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

  // [2025-12-07 02:30:00] PRD v2.0: 删除产品
  const removeProductItem = useCallback((itemId: string) => {
    setFormState((prev) => ({
      ...prev,
      productItems: prev.productItems.filter((item) => item.id !== itemId),
    }));
  }, []);

  // [2025-12-07 02:30:00] PRD v2.0: 为产品添加颜色
  const addColorToProduct = useCallback((itemId: string, colorId: string, colorName: string) => {
    setFormState((prev) => {
      const newItems = prev.productItems.map((item) => {
        if (item.id === itemId) {
          // 检查颜色是否已存在
          if (item.colors.some((c) => c.colorId === colorId)) {
            return item;
          }
          const newColor: ProductColor = {
            colorId,
            colorName,
            availableSizes: ALL_SIZES, // 默认所有尺码可用，后续从配置读取
            sizes: [],
            totalQuantity: 0,
            totalPrice: 0,
          };
          return {
            ...item,
            colors: [...item.colors, newColor],
          };
        }
        return item;
      });
      return { ...prev, productItems: newItems };
    });
  }, []);

  // [2025-12-07 02:30:00] PRD v2.0: 删除产品颜色
  const removeColorFromProduct = useCallback((itemId: string, colorId: string) => {
    setFormState((prev) => {
      const newItems = prev.productItems.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            colors: item.colors.filter((c) => c.colorId !== colorId),
          };
        }
        return item;
      });
      return { ...prev, productItems: newItems };
    });
  }, []);

  // [2025-12-07 02:30:00] PRD v2.0: 更新尺码数量的辅助函数（纯函数）
  const updateSizeQuantityInState = (
    prevState: FormState,
    itemId: string,
    colorId: string,
    size: string,
    quantity: number,
    unitPrice: number
  ): FormState => {
    const newItems = prevState.productItems.map((item) => {
      if (item.id === itemId) {
        const newColors = item.colors.map((color) => {
          if (color.colorId === colorId) {
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
              newSizes[existingSizeIndex] = newSizeQuantity;
            } else {
              newSizes = [...color.sizes, newSizeQuantity];
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
    return { ...prevState, productItems: newItems };
  };

  // [2025-12-07 02:30:00] PRD v2.0: 更新尺码数量
  const updateSizeQuantity = useCallback(
    (itemId: string, colorId: string, size: string, quantity: number, unitPrice: number) => {
      setFormState((prev) => updateSizeQuantityInState(prev, itemId, colorId, size, quantity, unitPrice));
    },
    [sizeFeeMap]
  );

  // [2025-12-07 02:30:00] PRD v2.0: 价格计算逻辑
  const calculateSubtotal = useMemo(() => {
    return formState.productItems.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [formState.productItems]);

  const calculateDiscountAmount = useMemo(() => {
    return (calculateSubtotal * formState.discount) / 100;
  }, [calculateSubtotal, formState.discount]);

  const calculateTotal = useMemo(() => {
    return calculateSubtotal - calculateDiscountAmount;
  }, [calculateSubtotal, calculateDiscountAmount]);

  // [2025-12-07 02:30:00] PRD v2.0: 计算总数量
  const calculateTotalQuantity = useMemo(() => {
    return formState.productItems.reduce((sum, item) => sum + item.totalQuantity, 0);
  }, [formState.productItems]);

  // [2025-12-08 05:20:00] 计算每个尺码在所有产品、所有颜色中的总数量
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

  // [2025-12-06 18:30:00] 计算税额（仅当需要Invoice时）
  const calculateTaxAmount = useMemo(() => {
    if (!formState.requiresInvoice) return 0;
    const taxBase = calculateSubtotal - calculateDiscountAmount;
    const taxRate = formState.taxRate || 0.13; // 默认13%安省HST
    return taxBase * taxRate;
  }, [calculateSubtotal, calculateDiscountAmount, formState.requiresInvoice, formState.taxRate]);

  // [2025-12-07 02:30:00] PRD v2.0: 生成主要产品描述（用于提交）
  const primaryProductDescription = useMemo(() => {
    if (formState.productItems.length === 0) return '';
    if (formState.productItems.length === 1) {
      return formState.productItems[0].productName;
    }
    // 多个产品时，返回产品列表
    return formState.productItems.map(item => item.productName).join(', ');
  }, [formState.productItems]);

  // [2025-12-06 18:30:00] 文件列表摘要
  const fileListSummary = useMemo(() => {
    if (files.length === 0) {
      return t('noFilesSelected') || '未选择文件';
    }
    if (files.length === 1) {
      return `${files[0].name} (${(files[0].size / (1024 * 1024)).toFixed(1)} MB)`;
    }
    return `${files.length} 个文件已选择`;
  }, [files, t]);

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

  // [2025-12-07 02:30:00] PRD v2.0: 步骤验证
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
      
      // [2025-12-08 05:15:00] 订单备注改为非必填，移除验证
      
      // 验证印刷位置：Height或Width至少一个
      if (formState.globalPrintPositions && formState.globalPrintPositions.length > 0) {
        for (let i = 0; i < formState.globalPrintPositions.length; i++) {
          const pos = formState.globalPrintPositions[i];
          const width = parseFloat(pos.width || '0');
          const height = parseFloat(pos.height || '0');
          if ((!pos.width || width <= 0) && (!pos.height || height <= 0)) {
            setFieldErrors({ [`globalPrintPosition-${i}`]: t('errorPrintPositionSize') || '印刷位置：Height或Width至少填写一个' });
            setStatus({ type: 'error', message: t('errorPrintPositionSize') || '印刷位置：Height或Width至少填写一个' });
            return false;
          }
        }
      }
      
      return true;
    }
    
    // [2025-12-07 02:30:00] PRD v2.0: 第二步验证（客户信息和Invoice）
    if (step === 2) {
      // 客户信息必填：联系人姓名、邮箱
      if (!formState.contactName.trim()) {
        setFieldErrors({ contactName: t('errorContactName') || '联系人姓名是必填项' });
        setStatus({ type: 'error', message: t('errorContactName') || '联系人姓名是必填项' });
        return false;
      }
      if (!formState.email.trim()) {
        setFieldErrors({ email: t('errorEmail') || '邮箱是必填项' });
        setStatus({ type: 'error', message: t('errorEmail') || '邮箱是必填项' });
        return false;
      }
      // 邮箱格式验证
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formState.email)) {
        setFieldErrors({ email: t('errorEmailFormat') || '邮箱格式不正确' });
        setStatus({ type: 'error', message: t('errorEmailFormat') || '邮箱格式不正确' });
        return false;
      }
      
      // 如果选择Invoice，Invoice信息和支付信息必填
      // [2025-12-08 05:15:00] 修改：companyName 改为非必填
      if (formState.requiresInvoice) {
        if (!formState.invoiceInfo.taxNumber.trim()) {
          setFieldErrors({ taxNumber: t('errorTaxNumber') || '税号是必填项' });
          setStatus({ type: 'error', message: t('errorTaxNumber') || '税号是必填项' });
          return false;
        }
        if (!formState.invoiceInfo.address.trim()) {
          setFieldErrors({ address: t('errorAddress') || '发票地址是必填项' });
          setStatus({ type: 'error', message: t('errorAddress') || '发票地址是必填项' });
          return false;
        }
        // 支付信息必填（Invoice时）
        if (!formState.invoiceInfo.paymentMethod) {
          setFieldErrors({ paymentMethod: t('errorPaymentMethod') || '支付方式是必填项' });
          setStatus({ type: 'error', message: t('errorPaymentMethod') || '支付方式是必填项' });
          return false;
        }
        // 如果选择Etransfer，Reference Number必填
        if (formState.invoiceInfo.paymentMethod === 'etrans' && !formState.invoiceInfo.referenceNumber?.trim()) {
          setFieldErrors({ referenceNumber: t('errorReferenceNumber') || 'Reference Number是必填项' });
          setStatus({ type: 'error', message: t('errorReferenceNumber') || 'Reference Number是必填项' });
          return false;
        }
      }
      return true;
    }
    // [2025-12-07 02:00:00] PRD v2.0: 第三步验证（文件上传，非必填，无需验证）
    if (step === 3) {
      // 文件上传是非必填的，可以直接通过
      return true;
    }
    return true;
  }, [formState, t]);

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

  // [2025-12-07 02:30:00] PRD v2.0: 步骤导航（支持点击跳转，可自由前进后退）
  const goToStep = useCallback((step: number) => {
    // PRD v2.0: 所有步骤可自由前进后退，无强制顺序限制
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
    setFormState({ ...initialFormState, orderCode: generateOrderCode() });
    setCurrentStep(1);
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      resetStatus();
      
      // [2025-12-06] PRD v2.0: 验证3个步骤
      if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
        return;
      }

      try {
        setIsSubmitting(true);
        const payload = new FormData();
        // [2025-12-06] PRD v2.0: 移除旧字段 projectName, artworkNotes, requiresMockups, requiresProof, rushOrder
        payload.append('primaryProduct', primaryProductDescription);
        payload.append('quantity', calculateTotalQuantity.toString());
        payload.append('deliveryDate', formState.dueDate);
        payload.append('contactName', formState.contactName.trim());
        payload.append('email', formState.email.trim());
        payload.append('phone', formState.phone.trim());
        payload.append('company', formState.requiresInvoice && formState.invoiceInfo.companyName ? formState.invoiceInfo.companyName.trim() : formState.company || '');
        
        // [2025-12-06] PRD v2.0: 聚合印刷位置（全局 + 产品级别）
        const allPrintPositions: Array<PrintPosition & { productItemId?: string; index?: number }> = [];
        
        // 添加全局印刷位置（如果存在）
        const globalPositions = formState.globalPrintPositions || [];
        globalPositions.forEach((pos, index) => {
          if (pos.position && (pos.width || pos.height)) {
            allPrintPositions.push({
                  ...pos,
                  index,
            });
          }
        });
        
        // [2025-12-07 02:30:00] PRD v2.0: 添加产品级别的印刷位置（从 item.printPositions 获取）
        formState.productItems.forEach((item) => {
          if (item.printPositions && item.printPositions.length > 0) {
            item.printPositions.forEach((pos, index) => {
              if (pos.position && (pos.width || pos.height)) {
                allPrintPositions.push({
                  ...pos,
                  productItemId: item.id,
                  index,
                });
              }
            });
          }
        });

        // [2025-12-06] PRD v2.0: 构建配置数据（使用新数据结构）
        payload.append(
          'configuration',
          JSON.stringify({
            source: 'nextjs-offline-intake-v2',
            orderCode: formState.orderCode,
            orderNotes: formState.orderNotes, // [2025-12-06] 订单备注（PRD v2.0）
            dstFileFee: formState.dstFileFee || null, // [2025-12-06] DST File Fee
            productItems: formState.productItems, // 新数据结构
            globalPrintPositions: formState.globalPrintPositions,
            printPositions: allPrintPositions, // 聚合后的所有印刷位置
            requiresInvoice: formState.requiresInvoice,
            invoiceInfo: formState.requiresInvoice ? formState.invoiceInfo : null,
            paymentMethod: formState.requiresInvoice ? formState.invoiceInfo.paymentMethod : null,
            referenceNumber: formState.requiresInvoice ? formState.invoiceInfo.referenceNumber : null,
            pricing: {
              subtotal: calculateSubtotal,
              discount: formState.discount,
              discountAmount: calculateDiscountAmount,
              taxRate: formState.taxRate,
              taxAmount: calculateTaxAmount,
              total: calculateTotal,
              currency: 'CAD',
            },
          }),
        );
        
        // [2025-12-06] PRD v2.0: 添加新字段
        payload.append('orderNotes', formState.orderNotes || '');
        if (formState.dstFileFee > 0) {
          payload.append('dstFileFee', formState.dstFileFee.toString());
        }
        if (formState.requiresInvoice) {
          if (formState.invoiceInfo.paymentMethod) {
            payload.append('paymentMethod', formState.invoiceInfo.paymentMethod);
          }
          if (formState.invoiceInfo.referenceNumber) {
            payload.append('referenceNumber', formState.invoiceInfo.referenceNumber);
          }
        }
        // [2025-12-06] PRD v2.0: 添加文件到 payload（使用 files state，不是 formState.files）
        files.forEach((file) => payload.append('assets', file, file.name));

        // [2025-11-16 09:50:00] 指向后端 API_BASE_URL，避免 Netlify 返回 HTML 404
        const response = await fetch(`${API_BASE_URL}/offline-orders`, {
          method: 'POST',
          body: payload,
          credentials: 'include',
        });
        // [2025-11-28 16:00:00] 改进错误处理，显示更详细的错误信息
        let data;
        try {
          data = await response.json();
        } catch (parseError) {
          throw new Error(`服务器响应格式错误 (${response.status}): ${response.statusText}`);
        }
        
        if (!response.ok) {
          // 尝试从错误响应中提取详细信息
          const errorMessage = data?.message || data?.error || 'Failed to submit offline order';
          const errorDetails = data?.details || data?.missingFields?.join(', ') || '';
          const fullErrorMessage = errorDetails 
            ? `${errorMessage}${errorDetails ? ` (${errorDetails})` : ''}`
            : errorMessage;
          throw new Error(fullErrorMessage);
        }
        const finalOrderCode = data?.order?.orderCode || formState.orderCode;
        setStatus({
          type: 'success',
          message: `订单提交成功！订单编号：${finalOrderCode}。订单已进入生产管理系统，我们会尽快处理。`,
        });
        resetForm();
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
      calculateTotal,
    ],
  );

  // [2025-12-07 02:30:00] PRD v2.0: 渲染第一步：产品选择与配置
  const renderStep1 = () => {
    // 获取已添加的产品ID列表
    const addedProductIds = formState.productItems.map((item) => item.productId);
    // 可添加的产品（未添加的）
    const availableProducts = orderConfig.products.filter((p) => !addedProductIds.includes(p.id));

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-2 flex-wrap gap-4">
          <h2 className="text-2xl font-bold text-gray-900 m-0">{t('step1Heading')}</h2>
        </div>
        <p className="text-gray-600 mb-6 text-sm">{t('step1Intro')}</p>

        {/* 添加产品区域 - PRD v2.0: 使用可维护的产品列表 */}
        <div className="mb-8 p-4 bg-gray-50 rounded-lg">
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-2">{t('addProduct')}：</span>
            {(productsLoading || configLoading) ? (
              <select
                className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                disabled
              >
                <option>加载中...</option>
              </select>
            ) : (
              <>
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
                  className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white disabled:bg-gray-100 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  disabled={availableProducts.length === 0}
                >
                  <option value="">
                    {availableProducts.length === 0 
                      ? (orderConfig.products.length === 0 
                          ? '暂无产品，请先在管理员后台添加产品' 
                          : '所有产品已添加')
                      : t('selectProductType') || '选择产品'}
                  </option>
                  {availableProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} {product.isCustomerOwned ? '(客户自带服装)' : ''}
                    </option>
                  ))}
                </select>
                {availableProducts.length === 0 && orderConfig.products.length > 0 && (
                  <p className="mt-2 text-xs text-gray-600">
                    所有产品已添加，如需添加更多，请先删除已添加的产品
                  </p>
                )}
              </>
            )}
          </label>
        </div>

        {/* 产品列表 - PRD v2.0: 产品卡片显示 */}
        {formState.productItems.length > 0 ? (
          <div className="space-y-6 mb-8">
            {formState.productItems.map((item, itemIndex) => {
              // 获取该产品的可用颜色（如果是客户自带服装，显示"自带颜色"）
              const availableColors = item.isCustomerOwned 
                ? [{ id: 'customer-owned', name: '自带颜色' }]
                : orderConfig.colors;

              return (
                <div key={item.id} className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm">
                  {/* 产品卡片头部 - PRD v2.0: 产品图片、产品名称、关闭按钮 */}
                  <div className="mb-5 pb-3 border-b border-gray-200 flex items-center gap-4">
                    {(() => {
                      const product = orderConfig.products.find(p => p.id === item.productId);
                      return product?.imageUrl ? (
                        <img 
                          src={product.imageUrl} 
                          alt={item.productName}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      ) : null;
                    })()}
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 m-0">
                        {item.productName}
                        {item.isCustomerOwned && (
                          <span className="ml-2 text-sm text-gray-500">(客户自带服装)</span>
                        )}
                      </h3>
                    </div>
                    <button
                      type="button"
                      className="text-gray-400 hover:text-red-600 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 transition-colors"
                      onClick={() => removeProductItem(item.id)}
                      title={t('delete') || '删除'}
                    >
                      ×
                    </button>
                  </div>

                  {/* 颜色选择区域 - PRD v2.0: 支持"Add another color" */}
                  <div className="mt-4 space-y-4">
                    {/* [2025-12-08 01:15:00] 如果没有颜色，显示颜色下拉菜单 */}
                    {item.colors.length === 0 ? (
                      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('selectColor') || '选择颜色'}
                        </label>
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              const color = availableColors.find(c => c.id === e.target.value);
                              if (color) {
                                addColorToProduct(item.id, color.id, color.name);
                                e.target.value = '';
                              }
                            }
                          }}
                          className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">{t('selectColor') || '选择颜色'}</option>
                          {availableColors.map((color) => (
                            <option key={color.id} value={color.id}>
                              {color.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                    
                    {item.colors.map((color, colorIndex) => {
                      // 获取该颜色的可用尺码（从配置读取）
                      const availableSizesForColor = color.availableSizes.length > 0 
                        ? color.availableSizes 
                        : ALL_SIZES; // 默认所有尺码可用

                      return (
                        <div key={color.colorId} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="text-lg font-medium text-gray-800">
                              {color.colorName}
                            </h4>
                            {item.colors.length > 1 && (
                              <button
                                type="button"
                                className="text-red-600 hover:text-red-700 text-sm font-medium"
                                onClick={() => removeColorFromProduct(item.id, color.colorId)}
                              >
                                {t('remove') || '移除颜色'}
                              </button>
                            )}
                          </div>

                          {/* 尺码输入区域 - PRD v2.0: YOUTH/ADULT分类、可用性控制、额外费用显示 */}
                          {/* [2025-12-08 05:00:00] 修复：改为单行布局，隐藏数字输入框的上下箭头 */}
                          <div className="space-y-3">
                            {/* YOUTH尺码 */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">YOUTH（童装）</label>
                              <div className="flex flex-wrap gap-2">
                                {YOUTH_SIZES.map((size) => {
                                  const isAvailable = isSizeAvailable(item.productId, color.colorId, size);
                                  const sizeData = color.sizes.find(s => s.size === size);
                                  const additionalFee = sizeFeeMap[size] || 0;
                                  
                                  return (
                                    <div key={size} className={`flex-shrink-0 ${!isAvailable ? 'opacity-50' : ''}`}>
                                      <label className="block text-xs text-gray-600 mb-1">{size}</label>
                                      {/* [2025-12-08 05:25:00] 移除单价输入框，只保留数量输入框 */}
                                      <input
                                        type="number"
                                        min="0"
                                        value={sizeData && sizeData.quantity > 0 ? sizeData.quantity : ''}
                                        onChange={(e) => {
                                          // [2025-12-08 05:10:00] 允许输入框为空，空值时 quantity 为 0
                                          const inputValue = e.target.value;
                                          const quantity = inputValue === '' ? 0 : (parseInt(inputValue, 10) || 0);
                                          // [2025-12-08 05:25:00] 使用全局单价
                                          const unitPrice = formState.globalUnitPrice || 0;
                                          updateSizeQuantity(item.id, color.colorId, size, quantity, unitPrice);
                                        }}
                                        disabled={!isAvailable}
                                        className="w-16 border border-gray-300 rounded px-2 py-1 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        placeholder="数量"
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* ADULT尺码 */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">ADULT（成人）</label>
                              <div className="flex flex-wrap gap-2">
                                {ADULT_SIZES.map((size) => {
                                  const isAvailable = isSizeAvailable(item.productId, color.colorId, size);
                                  const sizeData = color.sizes.find(s => s.size === size);
                                  const additionalFee = sizeFeeMap[size] || 0;
                                  
                                  return (
                                    <div key={size} className={`flex-shrink-0 ${!isAvailable ? 'opacity-50' : ''}`}>
                                      <label className="block text-xs text-gray-600 mb-1">
                                        {size}
                                        {LARGE_SIZES.includes(size) && additionalFee > 0 && (
                                          <span className="text-red-600 text-xs ml-1">+${additionalFee.toFixed(2)}</span>
                                        )}
                                      </label>
                                      {/* [2025-12-08 05:25:00] 移除单价输入框，只保留数量输入框 */}
                                      <input
                                        type="number"
                                        min="0"
                                        value={sizeData && sizeData.quantity > 0 ? sizeData.quantity : ''}
                                        onChange={(e) => {
                                          // [2025-12-08 05:10:00] 允许输入框为空，空值时 quantity 为 0
                                          const inputValue = e.target.value;
                                          const quantity = inputValue === '' ? 0 : (parseInt(inputValue, 10) || 0);
                                          // [2025-12-08 05:25:00] 使用全局单价
                                          const unitPrice = formState.globalUnitPrice || 0;
                                          updateSizeQuantity(item.id, color.colorId, size, quantity, unitPrice);
                                        }}
                                        disabled={!isAvailable}
                                        className="w-16 border border-gray-300 rounded px-2 py-1 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        placeholder="数量"
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          {/* [2025-12-08 05:25:00] 移除颜色小计显示 */}
                        </div>
                      );
                    })}

                    {/* Add another color 按钮 */}
                    <div className="mt-4">
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            const color = availableColors.find(c => c.id === e.target.value);
                            if (color && !item.colors.some(c => c.colorId === color.id)) {
                              addColorToProduct(item.id, color.id, color.name);
                              e.target.value = '';
                            }
                          }
                        }}
                        className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">{t('addAnotherColor') || 'Add another color'}</option>
                        {availableColors
                          .filter(c => !item.colors.some(ic => ic.colorId === c.id))
                          .map((color) => (
                            <option key={color.id} value={color.id}>
                              {color.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {/* [2025-12-08 05:25:00] 移除产品小计显示 */}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-600 bg-gray-50 rounded-lg">
            <p>{t('pleaseAddProducts')}</p>
          </div>
        )}

        {/* 印刷位置配置 - PRD v2.0: PrintingStyle、DST File Fee */}
        <div className="mt-8 p-5 bg-white border border-gray-200 rounded-xl">
          <h3 className="text-lg font-semibold text-gray-900 m-0 mb-4">
            {t('printPositions') || '印刷位置配置'}
          </h3>
          
          {/* 总体印刷位置 - [2025-12-08 01:20:00] 直接显示表单，不需要点击按钮 */}
          <div className="space-y-4">
            {/* [2025-12-08 01:20:00] 如果没有印刷位置，初始化一个空表单 */}
            {(!formState.globalPrintPositions || formState.globalPrintPositions.length === 0) && (
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="block text-sm font-medium text-gray-700 mb-2">位置</span>
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          setFormState(prev => ({
                            ...prev,
                            globalPrintPositions: [{ position: e.target.value, printingStyle: '', width: '', height: '', notes: '' }]
                          }));
                        }
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">选择位置</option>
                      {PRINT_POSITION_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            )}
            
            {formState.globalPrintPositions && formState.globalPrintPositions.length > 0 ? (
              formState.globalPrintPositions.map((pos, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="block">
                      <span className="block text-sm font-medium text-gray-700 mb-2">位置</span>
                      <select
                        value={pos.position}
                        onChange={(e) => {
                          const newPositions = [...formState.globalPrintPositions || []];
                          newPositions[index] = { ...newPositions[index], position: e.target.value };
                          setFormState(prev => ({ ...prev, globalPrintPositions: newPositions }));
                        }}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="">选择位置</option>
                        {PRINT_POSITION_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="block text-sm font-medium text-gray-700 mb-2">工艺 (PrintingStyle)</span>
                      <select
                        value={pos.printingStyle || ''}
                        onChange={(e) => {
                          const newPositions = [...formState.globalPrintPositions || []];
                          newPositions[index] = { ...newPositions[index], printingStyle: e.target.value };
                          setFormState(prev => ({ ...prev, globalPrintPositions: newPositions }));
                        }}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="">选择工艺</option>
                        <option value="DTF">DTF</option>
                        <option value="Embroidery">Embroidery</option>
                        <option value="UV">UV</option>
                        <option value="Vinyl">Vinyl</option>
                        <option value="其他">其他</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="block text-sm font-medium text-gray-700 mb-2">宽度 (inch)</span>
                      <input
                        type="text"
                        value={pos.width || ''}
                        onChange={(e) => {
                          const newPositions = [...formState.globalPrintPositions || []];
                          newPositions[index] = { ...newPositions[index], width: e.target.value };
                          setFormState(prev => ({ ...prev, globalPrintPositions: newPositions }));
                        }}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="可选"
                      />
                    </label>
                    <label className="block">
                      <span className="block text-sm font-medium text-gray-700 mb-2">高度 (inch)</span>
                      <input
                        type="text"
                        value={pos.height || ''}
                        onChange={(e) => {
                          const newPositions = [...formState.globalPrintPositions || []];
                          newPositions[index] = { ...newPositions[index], height: e.target.value };
                          setFormState(prev => ({ ...prev, globalPrintPositions: newPositions }));
                        }}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="可选"
                      />
                    </label>
                    <label className="block md:col-span-2">
                      <span className="block text-sm font-medium text-gray-700 mb-2">备注</span>
                      <input
                        type="text"
                        value={pos.notes || ''}
                        onChange={(e) => {
                          const newPositions = [...formState.globalPrintPositions || []];
                          newPositions[index] = { ...newPositions[index], notes: e.target.value };
                          setFormState(prev => ({ ...prev, globalPrintPositions: newPositions }));
                        }}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                  {/* [2025-12-08 01:20:00] 添加删除按钮 */}
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        const newPositions = formState.globalPrintPositions?.filter((_, i) => i !== index) || [];
                        setFormState(prev => ({
                          ...prev,
                          globalPrintPositions: newPositions.length > 0 ? newPositions : []
                        }));
                      }}
                      className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      {t('remove') || '删除'}
                    </button>
                  </div>
                </div>
              ))
            ) : null}
            
            {/* [2025-12-08 01:20:00] 添加更多印刷位置按钮（当已有位置时显示） */}
            {formState.globalPrintPositions && formState.globalPrintPositions.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setFormState(prev => ({
                    ...prev,
                    globalPrintPositions: [...(prev.globalPrintPositions || []), { position: '', printingStyle: '', width: '', height: '', notes: '' }]
                  }));
                }}
                className="px-4 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm"
              >
                {t('addPrintPosition') || '添加更多印刷位置'}
              </button>
            )}
          </div>

          {/* DST File Fee - 仅当选择Embroidery时显示 */}
          {formState.globalPrintPositions?.some(pos => pos.printingStyle === 'Embroidery') && (
            <div className="mt-4">
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-2">DST File Fee (订单级别)</span>
                <input
                  type="text"
                  value={formState.dstFileFee || ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d.]/g, '');
                    setFormState(prev => ({ ...prev, dstFileFee: parseFloat(value) || 0 }));
                  }}
                  className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="0.00"
                />
              </label>
            </div>
          )}
        </div>

        {/* 订单备注 - PRD v2.0: 非必填 */}
        {/* [2025-12-08 05:15:00] 修改：备注改为非必填 */}
        <div className="mt-6 p-5 bg-white border border-gray-200 rounded-xl">
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-2">
              {t('orderNotes') || '订单备注'}
            </span>
            <textarea
              value={formState.orderNotes}
              onChange={(e) => setFormState(prev => ({ ...prev, orderNotes: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder={t('orderNotesPlaceholder') || '请输入订单备注（可选）...'}
            />
          </label>
        </div>

        {/* [2025-12-08 05:25:00] 单价和件数小计输入框 - 在总价计算模块上面 */}
        <div className="mt-6 p-5 bg-white border border-gray-200 rounded-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-2">单价:</span>
              <input
                type="text"
                value={formState.globalUnitPrice > 0 ? formState.globalUnitPrice.toString() : ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d.]/g, '');
                  const unitPrice = parseFloat(value) || 0;
                  // [2025-12-08 05:25:00] 更新全局单价，并更新所有尺码的单价
                  setFormState((prev) => {
                    const newItems = prev.productItems.map((item) => {
                      const newColors = item.colors.map((color) => {
                        const newSizes = color.sizes.map((sizeData) => {
                          return {
                            ...sizeData,
                            unitPrice: unitPrice,
                            subtotal: sizeData.quantity * (unitPrice + sizeData.additionalFee),
                          };
                        });
                        const totalQuantity = newSizes.reduce((sum, s) => sum + s.quantity, 0);
                        const totalPrice = newSizes.reduce((sum, s) => sum + s.subtotal, 0);
                        return {
                          ...color,
                          sizes: newSizes,
                          totalQuantity,
                          totalPrice,
                        };
                      });
                      const totalQuantity = newColors.reduce((sum, c) => sum + c.totalQuantity, 0);
                      const totalPrice = newColors.reduce((sum, c) => sum + c.totalPrice, 0);
                      return {
                        ...item,
                        colors: newColors,
                        totalQuantity,
                        totalPrice,
                      };
                    });
                    return { ...prev, globalUnitPrice: unitPrice, productItems: newItems };
                  });
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="请输入单价"
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-2">件数小计:</span>
              <input
                type="text"
                value={calculateTotalQuantity > 0 ? calculateTotalQuantity.toString() : ''}
                readOnly
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50"
                placeholder="自动计算"
              />
            </label>
          </div>
        </div>

        {/* 总计 - PRD v2.0 */}
        {calculateTotalQuantity > 0 && (
          <div className="p-5 bg-blue-50 border border-blue-200 rounded-lg grid gap-3">
            <div className="flex justify-between items-center text-base">
              <span>{t('totalQuantity') || '总数量'}：</span>
              <strong className="text-lg text-blue-700">{calculateTotalQuantity} {t('items') || '件'}</strong>
            </div>
            <div className="flex justify-between items-center text-base">
              <span>{t('totalAmount') || '总金额'}：</span>
              <strong className="text-xl text-blue-700">${calculateSubtotal.toFixed(2)} CAD</strong>
            </div>
            {formState.dstFileFee > 0 && (
              <div className="flex justify-between items-center text-base">
                <span>DST File Fee：</span>
                <strong className="text-lg text-blue-700">${formState.dstFileFee.toFixed(2)} CAD</strong>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // [2025-12-06] PRD v2.0: 渲染第二步 - 客户信息和Invoice
  const renderStep2 = () => {
    // 计算税（13%安省税率，仅当选择Invoice时）
    const taxRate = 0.13;
    const taxBase = calculateSubtotal - calculateDiscountAmount;
    const taxAmount = formState.requiresInvoice ? taxBase * taxRate : 0;
    const totalWithTax = calculateSubtotal - calculateDiscountAmount + taxAmount;

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 m-0 mb-2">{t('step2Heading') || '客户信息'}</h2>
        <p className="text-gray-600 mb-6 text-sm">{t('step2Intro') || '填写客户信息和Invoice信息'}</p>

        {/* 客户基本信息 */}
      <section className="mb-8 p-5 bg-white border border-gray-200 rounded-xl">
          <h3 className="text-xl font-semibold text-gray-900 m-0 mb-4">{t('customerInfo') || '客户基本信息'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-2">{t('contactName') || '联系人姓名'} *</span>
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
              <span className="block text-sm font-medium text-gray-700 mb-2">{t('email') || '邮箱'} *</span>
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
              <span className="block text-sm font-medium text-gray-700 mb-2">{t('phone') || '电话'}</span>
            <input
              type="tel"
              name="phone"
              value={formState.phone}
              onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </label>
            
          <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-2">{t('company') || '公司'}</span>
              <input
                type="text"
                name="company"
                value={formState.company || ''}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </label>
            
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-2">{t('dueDate') || '交付日期'}</span>
            <input
              type="date"
              name="dueDate"
              value={formState.dueDate}
              onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </label>
        </div>
      </section>

        {/* Invoice功能 */}
      <section className="mb-8 p-5 bg-white border border-gray-200 rounded-xl">
        <label className="inline-flex items-center gap-3 cursor-pointer mb-4">
          <input
            type="checkbox"
            name="requiresInvoice"
            checked={formState.requiresInvoice}
            onChange={(e) => setField('requiresInvoice', e.target.checked)}
            className="w-4.5 h-4.5 cursor-pointer"
          />
            <span className="text-sm font-medium text-gray-700">{t('requireInvoice') || '需要Invoice'}</span>
        </label>

        {formState.requiresInvoice && (
            <div className="mt-4 space-y-4">
              {/* Invoice信息表单 */}
              <div className="p-5 bg-gray-50 rounded-lg">
                <h4 className="text-base font-semibold text-gray-700 m-0 mb-3">{t('invoiceInfo') || 'Invoice信息'}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                    <span className="block text-sm font-medium text-gray-700 mb-2">{t('companyName') || '公司名称'}</span>
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
                    <span className="block text-sm font-medium text-gray-700 mb-2">{t('companyEmail') || '公司邮箱'} *</span>
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
                    <span className="block text-sm font-medium text-gray-700 mb-2">{t('taxNumber') || 'GST/HST Number'} *</span>
                <input
                  type="text"
                  value={formState.invoiceInfo.taxNumber}
                  onChange={(e) => updateInvoiceInfo('taxNumber', e.target.value)}
                      placeholder={t('taxNumberPlaceholder') || 'GST/HST Number'}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </label>
                  
              <label className="block">
                    <span className="block text-sm font-medium text-gray-700 mb-2">{t('city') || '城市'} *</span>
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
                    <span className="block text-sm font-medium text-gray-700 mb-2">{t('province') || '省份'} *</span>
                <input
                  type="text"
                  value={formState.invoiceInfo.province}
                  onChange={(e) => updateInvoiceInfo('province', e.target.value)}
                      placeholder={t('provincePlaceholder') || 'Ontario'}
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                    fieldErrors.invoice_province ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                  }`}
                />
                {fieldErrors.invoice_province && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.invoice_province}</p>
                )}
              </label>
                  
              <label className="block">
                    <span className="block text-sm font-medium text-gray-700 mb-2">{t('postalCode') || '邮编'} *</span>
                <input
                  type="text"
                  value={formState.invoiceInfo.postalCode}
                  onChange={(e) => updateInvoiceInfo('postalCode', e.target.value)}
                      placeholder={t('postalCodePlaceholder') || 'A1B 2C3'}
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
                  <span className="block text-sm font-medium text-gray-700 mb-2">{t('address') || '地址'} *</span>
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
          </div>
        )}

        {/* [2025-12-07 02:30:00] PRD v2.0: 支付信息（Invoice时必填） */}
        {formState.requiresInvoice && (
          <div className="mt-4 p-5 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="text-base font-semibold text-gray-700 m-0 mb-3">{t('paymentInfo') || '支付信息'} *</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-2">{t('paymentMethod') || '支付方式'} *</span>
                <select
                  value={formState.invoiceInfo.paymentMethod || ''}
                  onChange={(e) => {
                    const paymentMethod = e.target.value as 'card' | 'etrans' | '';
                    setFormState((prev) => ({
                      ...prev,
                      invoiceInfo: {
                        ...prev.invoiceInfo,
                        paymentMethod: paymentMethod || undefined,
                      },
                    }));
                  }}
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    fieldErrors.paymentMethod ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                  }`}
                >
                  <option value="">{t('selectPaymentMethod') || '选择支付方式...'}</option>
                  <option value="card">{t('paymentCard') || '刷卡'}</option>
                  <option value="etrans">{t('paymentEtransfer') || 'e-trans'}</option>
                </select>
                {fieldErrors.paymentMethod && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.paymentMethod}</p>
                )}
              </label>
              
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-2">
                  {t('referenceNumber') || 'Reference Number'}
                  {formState.invoiceInfo.paymentMethod === 'etrans' ? ' *' : ''}
                </span>
                <input
                  type="text"
                  value={formState.invoiceInfo.referenceNumber || ''}
                  onChange={(e) => {
                    setFormState((prev) => ({
                      ...prev,
                      invoiceInfo: {
                        ...prev.invoiceInfo,
                        referenceNumber: e.target.value,
                      },
                    }));
                  }}
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    fieldErrors.referenceNumber ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                  }`}
                  placeholder={t('referenceNumberPlaceholder') || 'Reference Number'}
                />
                {fieldErrors.referenceNumber && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.referenceNumber}</p>
                )}
              </label>
            </div>
          </div>
        )}

        {/* [2025-12-07 02:00:00] PRD v2.0: 税计算显示（仅当选择Invoice时显示税额） */}
        <div className="mt-4 p-5 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-base font-semibold text-gray-900 m-0 mb-3">{t('priceDetails') || '价格明细'}{formState.requiresInvoice ? ` (${t('withTax') || '含税'})` : ''}</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span>{t('subtotal') || '小计'}：</span>
              <span>${calculateSubtotal.toFixed(2)} CAD</span>
            </div>
            {formState.discount > 0 && (
              <div className="flex justify-between items-center text-sm text-red-600">
                <span>{t('discount')} ({formState.discount}%)：</span>
                <span>-${calculateDiscountAmount.toFixed(2)} CAD</span>
              </div>
            )}
            {formState.requiresInvoice && (
              <>
                <div className="flex justify-between items-center text-sm">
                  <span>{t('beforeTax') || '税前金额'}：</span>
                  <span>${taxBase.toFixed(2)} CAD</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>{t('tax')} (13% HST)：</span>
                  <span>${taxAmount.toFixed(2)} CAD</span>
                </div>
              </>
            )}
            <div className="flex justify-between items-center text-lg pt-3 border-t border-blue-200">
              <span className="font-semibold">{t('total')}{formState.requiresInvoice ? ` (${t('withTax') || '含税'})` : ''}：</span>
              <strong className="text-xl text-blue-700">${totalWithTax.toFixed(2)} CAD</strong>
            </div>
          </div>
        </div>
      </section>
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

  // [2025-12-06] PRD v2.0: 渲染第三步 - 文件上传（非必填）
  const renderStep3 = () => {
    return (
      <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 m-0 mb-2">{t('step3Heading') || '文件上传'}</h2>
      <p className="text-gray-600 mb-6 text-sm">{t('step3Intro') || '上传设计文件（非必填，可以不传文件直接提交）'}</p>
      
      {/* [2025-12-04 00:15:00] 移动设备提示 */}
      {isMobile && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm font-semibold text-blue-900 mb-1">{t('mobileUploadTip') || '移动设备提示'}</p>
          <p className="text-xs text-blue-700">{t('mobileUploadDescription') || '您可以使用相机拍照上传文件'}</p>
        </div>
      )}
      
      <div
        className="border-2 border-dashed border-gray-300 rounded-xl p-6 bg-gray-50 text-center cursor-pointer relative transition-all hover:border-blue-500 hover:bg-blue-50"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        role="button"
        tabIndex={0}
      >
        <p className="text-sm text-gray-700 mb-2">{fileListSummary}</p>
        <p className="text-xs text-gray-600">
          {isMobile ? (t('mobileUploadOrBrowse') || '点击上传或拍照') : (t('dragDropOrBrowse') || '拖拽文件到此处或点击浏览')} 
          ({t('maxFiles', { maxFiles: MAX_FILES, maxSize: MAX_FILE_SIZE_MB }) || `最多 ${MAX_FILES} 个文件，每个文件最大 ${MAX_FILE_SIZE_MB}MB`})
        </p>
        <input
          type="file"
          accept={isMobile ? `${ACCEPTED_EXTENSIONS.join(',')},image/*` : ACCEPTED_EXTENSIONS.join(',')}
          capture={isMobile ? 'environment' : undefined}
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
                {t('remove') || '删除'}
              </button>
            </li>
          ))}
        </ul>
      )}
      
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          <strong>注意：</strong>文件上传是非必填的，您可以不传文件直接提交订单。
        </p>
      </div>
    </div>
    );
  };

  // [2025-12-06] PRD v2.0: renderStep4和renderStep5已删除（合并到新的3步流程中）

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="relative py-12 px-6 bg-gradient-to-br from-yellow-200 via-yellow-100 to-yellow-50 z-10">
        <div>
          {/* [2025-12-07 03:00:00] 右上角：回到主站 + 登录按钮/用户菜单 + 语言切换 */}
          <div className="absolute top-6 right-6 flex items-center gap-3">
            {/* [2025-01-31 20:15:00] 回到主站按钮 */}
            <Link
              href="/"
              className="px-4 py-2 bg-white/90 hover:bg-white rounded-lg text-sm font-medium text-gray-700 hover:text-gray-900 shadow-md transition-colors"
            >
              回到主站
            </Link>
            {/* 登录按钮/用户菜单 */}
            <UserMenu />
            {/* [2025-01-27 20:45:00] 语言切换按钮 - 使用 Tailwind */}
            <div className="flex gap-2 bg-white/90 rounded-lg p-1 shadow-md">
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

      <main className="max-w-[1400px] mx-auto -mt-8 mb-10 px-6 relative z-10"> {/* [2025-12-19] 降低main区域的z-index，避免遮挡下拉菜单 */}
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

          {/* [2025-12-07 02:30:00] PRD v2.0: 步骤导航栏（支持点击跳转） */}
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
                title={t('clickToJump') || '点击跳转到此步骤'}
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

