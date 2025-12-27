'use client';

import { useCallback, useEffect, useMemo, useState, useRef, ChangeEvent, FormEvent, DragEvent } from 'react'; // [2025-12-19] 添加useRef用于定位下拉菜单，useMemo用于颜色组初始化
import { createPortal } from 'react-dom'; // [2025-12-19] 使用Portal将下拉菜单渲染到body，彻底解决遮挡问题
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // [2025-01-31 20:15:00] 添加 Link 用于导航
import { API_BASE_URL } from '@/lib/api-config'; // [2025-11-16 09:50:00] 使用统一 API 基址，避免指向 Next.js 自身路由
import { categoriesApi, Category, offlineOrderProductApi, OfflineOrderConfig, simpleOfflineOrderProductApi, SimpleOfflineOrderProduct } from '@/lib/api'; // [2025-12-07 08:00:00] 简化的产品 API
import useSWR from 'swr'; // [2025-01-27 18:00:00] 使用 SWR 获取分类数据
import { OFFLINE_ORDERS_TRANSLATIONS, OfflineOrdersLocale } from '@/translations/offlineOrders'; // [2025-01-27 20:00:00] 引入翻译
import { OrderItemColorGroup } from '@/types/order'; // [2025-12-19] 导入颜色组类型
import { ProductItemColorConfig } from './components/ProductItemColorConfig'; // [2025-12-19] 导入产品项颜色配置组件
import { validateColorGroups } from '@/lib/services/orderItemPricing'; // [2025-12-19] 导入验证函数
import { ColorGroupCardIntegrated } from './components/ColorGroupCardIntegrated'; // [2025-12-19] 导入整合的颜色组卡片组件
import { AddColorModal } from './components/AddColorModal'; // [2025-12-19] 导入添加颜色弹窗组件
import { convertProductColorsToColorGroups, convertColorGroupToProductColor } from './components/utils/colorGroupConverter'; // [2025-12-19] 导入转换函数
import { BillingDetails } from './components/BillingDetails'; // [2025-12-19 02:30:00] 导入计费明细组件

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
  globalPrintPositions: PrintPosition[]; // 总体印刷位置（保留用于向后兼容）
  orderNotes: string; // 订单备注（非必填）
  dstFileFee: number; // DST File Fee（订单级别，仅当有Embroidery时）
  // [2025-12-19 02:30:00] 移除全局单价，改为颜色级别单价
  globalQuantitySubtotal: number; // [2025-12-08 05:25:00] 全局件数小计
  // [2025-12-19] 按颜色分组的印刷位配置（新功能）
  colorGroupsByProduct: Record<string, import('@/types/order').OrderItemColorGroup[]>; // 产品ID -> 颜色组列表

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
// [2025-12-18 22:03:15] 更新规则：最后6位 = 前3位流水号（001开始递增）+ 后3位随机字母
// 注意：前端只是用于预览，实际编号由后端生成
const generateOrderCode = (): string => {
  const timestamp = new Date();
  const datePart = timestamp.toISOString().slice(0, 10).replace(/-/g, '');
  // 前端预览使用临时流水号（001）和随机字母
  const sequencePart = '001'; // 预览时使用固定值
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

// [2025-12-19 02:30:00] 根据产品ID生成固定颜色（用于视觉区隔）
const getProductColor = (productId: string): string => {
  const hash = productId.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 50%)`;
};



// [2025-12-07 02:30:00] PRD v2.0: 初始表单状态
const initialFormState: FormState = {
  orderCode: '',
  productItems: [],
  globalPrintPositions: [],
  orderNotes: '',
  dstFileFee: 0,
  // [2025-12-19 02:30:00] 移除全局单价，改为颜色级别单价
  globalQuantitySubtotal: 0, // [2025-12-08 05:25:00] 全局件数小计
  colorGroupsByProduct: {}, // [2025-12-19] 按颜色分组的印刷位配置
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
  const [mounted, setMounted] = useState(false); // [2025-12-19] Portal挂载状态

  // [2025-12-19] 客户端挂载后启用Portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // [2025-12-19] 计算菜单位置
  useEffect(() => {
    if (showMenu && buttonRef.current) {
      const updatePosition = () => {
        if (buttonRef.current) {
          const rect = buttonRef.current.getBoundingClientRect();
          setMenuPosition({
            top: rect.bottom + 8, // mt-2 = 8px
            right: window.innerWidth - rect.right, // 从右边距计算
          });
        }
      };

      updatePosition();
      // [2025-12-19] 监听滚动和窗口大小变化，实时更新位置
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);

      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
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

  // [2025-12-19] 下拉菜单内容（使用Portal渲染到body）
  const menuContent = showMenu && mounted ? (
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
  ) : null;

  return (
    <div className="relative">
      <button
        ref={buttonRef} // [2025-12-19] 添加ref用于定位菜单
        type="button"
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-3 py-2 bg-white/90 rounded-lg shadow-md hover:bg-white transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 10C12.7614 10 15 7.76142 15 5C15 2.23858 12.7614 0 10 0C7.23858 0 5 2.23858 5 5C5 7.76142 7.23858 10 10 10Z" fill="currentColor" />
          <path d="M10 12C5.58172 12 2 14.6863 2 18V20H18V18C18 14.6863 14.4183 12 10 12Z" fill="currentColor" />
        </svg>
        <span className="text-sm font-medium text-gray-700 hidden sm:inline">{userName}</span>
      </button>

      {/* [2025-12-19] 使用Portal将下拉菜单渲染到document.body，完全脱离DOM层级，彻底解决遮挡问题 */}
      {mounted && typeof document !== 'undefined' && createPortal(menuContent, document.body)}
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
  // [2025-12-19] 添加颜色弹窗状态
  const [addColorModal, setAddColorModal] = useState<{
    isOpen: boolean;
    itemId: string;
    colorId: string;
    colorName: string;
  } | null>(null);
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error'; message?: string }>({
    type: 'idle',
  });
  // [2025-01-28 09:35:00] 字段级别的错误状态，用于在对应输入框下方显示错误
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // [2025-12-18 17:05:00] 使用 ref 跟踪是否是按钮点击触发的提交
  const submitButtonRef = useRef<HTMLButtonElement | null>(null);
  const isSubmittingFromButtonRef = useRef(false);

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

  // [2025-12-19] PRD v2.0: 为产品添加颜色（支持继承选项）
  const addColorToProduct = useCallback((itemId: string, colorId: string, colorName: string, inheritFromPrev: boolean = false) => {
    setFormState((prev) => {
      const newItems = prev.productItems.map((item) => {
        if (item.id === itemId) {
          // 检查颜色是否已存在
          if (item.colors.some((c) => c.colorId === colorId)) {
            return item;
          }

          // [2025-12-19] 获取上一颜色的positions（如果选择继承）
          let initialPositions: OrderItemColorGroup['positions'] = [];
          let inheritsFromColorId: string | null = null;

          if (inheritFromPrev && item.colors.length > 0) {
            const lastColor = item.colors[item.colors.length - 1];
            const lastColorGroups = prev.colorGroupsByProduct[itemId] || [];
            const lastGroup = lastColorGroups.find(g => g.colorCode === lastColor.colorId);
            if (lastGroup && lastGroup.positions.length > 0) {
              initialPositions = lastGroup.positions.map(pos => ({
                ...pos,
                designAssetId: pos.designAssetId || null // 保留引用，不复制文件
              }));
              inheritsFromColorId = lastGroup.id;
            }
          }

          const newColor: ProductColor = {
            colorId,
            colorName,
            availableSizes: ALL_SIZES, // 默认所有尺码可用，后续从配置读取
            sizes: [],
            totalQuantity: 0,
            totalPrice: 0,
          };

          // [2025-12-19] 同时创建颜色组配置
          const newColorGroup: OrderItemColorGroup = {
            id: `${colorId}-${Date.now()}`,
            colorCode: colorId,
            colorName,
            quantities: {},
            positions: initialPositions,
            unitPrice: 0, // [2025-12-19 02:30:00] 颜色级别的单价
            inheritsFromColorId
          };

          return {
            ...item,
            colors: [...item.colors, newColor],
          };
        }
        return item;
      });

      // [2025-12-19] 更新colorGroupsByProduct
      const item = newItems.find(i => i.id === itemId);
      if (item) {
        const lastColor = item.colors[item.colors.length - 1];
        const newColorGroup: OrderItemColorGroup = {
          id: `${colorId}-${Date.now()}`,
          colorCode: colorId,
          colorName,
          quantities: {},
          positions: inheritFromPrev && item.colors.length > 1
            ? (() => {
              const prevColorGroups = prev.colorGroupsByProduct[itemId] || [];
              const prevColor = item.colors[item.colors.length - 2];
              const prevGroup = prevColorGroups.find(g => g.colorCode === prevColor.colorId);
              if (prevGroup && prevGroup.positions.length > 0) {
                return prevGroup.positions.map(pos => ({
                  ...pos,
                  designAssetId: pos.designAssetId || null
                }));
              }
              return [];
            })()
            : [],
          unitPrice: inheritFromPrev && item.colors.length > 1
            ? (() => {
              const prevColorGroups = prev.colorGroupsByProduct[itemId] || [];
              const prevColor = item.colors[item.colors.length - 2];
              const prevGroup = prevColorGroups.find(g => g.colorCode === prevColor.colorId);
              return prevGroup?.unitPrice || 0; // [2025-12-19 02:30:00] 继承上一颜色的单价
            })()
            : 0, // [2025-12-19 02:30:00] 颜色级别的单价
          inheritsFromColorId: inheritFromPrev && item.colors.length > 1
            ? (() => {
              const prevColorGroups = prev.colorGroupsByProduct[itemId] || [];
              const prevColor = item.colors[item.colors.length - 2];
              const prevGroup = prevColorGroups.find(g => g.colorCode === prevColor.colorId);
              return prevGroup?.id || null;
            })()
            : null
        };

        return {
          ...prev,
          productItems: newItems,
          colorGroupsByProduct: {
            ...prev.colorGroupsByProduct,
            [itemId]: [
              ...(prev.colorGroupsByProduct[itemId] || []),
              newColorGroup
            ]
          }
        };
      }

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

  // [2025-12-19 02:30:00] 更新尺码数量的辅助函数（从颜色组获取单价）
  const updateSizeQuantityInState = (
    prevState: FormState,
    itemId: string,
    colorId: string,
    size: string,
    quantity: number
  ): FormState => {
    // [2025-12-19 02:30:00] 从颜色组中获取单价
    const colorGroups = prevState.colorGroupsByProduct[itemId] || [];
    const colorGroup = colorGroups.find(g => g.colorCode === colorId);
    const unitPrice = colorGroup?.unitPrice || 0;

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

  // [2025-12-19 02:30:00] 更新尺码数量（单价从颜色组获取）
  const updateSizeQuantity = useCallback(
    (itemId: string, colorId: string, size: string, quantity: number) => {
      setFormState((prev) => updateSizeQuantityInState(prev, itemId, colorId, size, quantity));
    },
    [sizeFeeMap]
  );

  // [2025-12-07 02:30:00] PRD v2.0: 价格计算逻辑
  // [2025-01-28] Calculate total DST file fee from all positions
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

  // [2025-12-06 18:30:00] 计算税额（仅当需要Invoice时）
  const calculateTaxAmount = useMemo(() => {
    if (!formState.requiresInvoice) return 0;
    // [2025-01-28] Tax base includes DST fee
    const taxBase = calculateSubtotal - calculateDiscountAmount + calculateDstFileFee;
    const taxRate = formState.taxRate || 0.13; // 默认13%安省HST
    return taxBase * taxRate;
  }, [calculateSubtotal, calculateDiscountAmount, formState.requiresInvoice, formState.taxRate, calculateDstFileFee]);

  const calculateTotal = useMemo(() => {
    // [2025-01-28] Total includes DST fee
    return calculateSubtotal - calculateDiscountAmount + calculateDstFileFee;
  }, [calculateSubtotal, calculateDiscountAmount, calculateDstFileFee]);

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
  // [2025-12-19] updateSideCount和updatePrintPosition已移除，印刷位置现在由颜色卡片管理

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

      // [2025-12-19] 印刷位置验证已移至步骤3（颜色组配置验证），此处不再验证globalPrintPositions

      return true;
    }

    // [2025-12-19] PRD v2.0: 第二步验证（客户信息和Invoice - 全部改为非必填）
    if (step === 2) {
      // [2025-12-19] 所有字段都改为非必填，只保留格式验证（如果填写了的话）
      // 邮箱格式验证（仅在填写了邮箱时验证）
      if (formState.email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formState.email)) {
          setFieldErrors({ email: t('errorEmailFormat') || '邮箱格式不正确' });
          setStatus({ type: 'error', message: t('errorEmailFormat') || '邮箱格式不正确' });
          return false;
        }
      }

      // [2025-12-19] 所有Invoice相关字段都改为非必填，不再进行验证
      return true;
    }
    // [2025-12-19] PRD v2.0: 第三步验证（印刷位配置）
    if (step === 3) {
      // [2025-12-19] 验证每个产品项的颜色组配置
      const itemsWithColors = formState.productItems.filter(item => item.colors.length > 0);

      if (itemsWithColors.length === 0) {
        setStatus({ type: 'error', message: '请先在步骤1中添加产品并选择颜色' });
        return false;
      }

      // [2025-12-19] 验证每个产品的颜色组配置
      for (const item of itemsWithColors) {
        const colorGroups = formState.colorGroupsByProduct[item.id] || [];

        // [2025-12-19] 如果没有颜色组配置，尝试从colors转换
        if (colorGroups.length === 0 && item.colors.length > 0) {
          // [2025-12-19] 颜色组会在renderStep3中自动初始化，这里只验证已存在的
          continue;
        }

        // [2025-12-19] 使用定价服务的验证函数
        const validation = validateColorGroups(colorGroups);

        if (!validation.valid) {
          setFieldErrors(prev => ({
            ...prev,
            [`printPositions-${item.id}`]: validation.errors.join('; ')
          }));
          setStatus({
            type: 'error',
            message: `产品"${item.productName}"的印刷位配置有误：${validation.errors.join('; ')}`
          });
          return false;
        }
      }

      // [2025-12-19] 文件上传是非必填的，无需验证
      return true;
    }
    return true;
  }, [formState, t]);

  // [2025-01-27 18:00:00] 步骤导航
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

  // [2025-12-07 02:30:00] PRD v2.0: 步骤导航（支持点击跳转，可自由前进后退）
  const goToStep = useCallback((step: number) => {
    // PRD v2.0: 所有步骤可自由前进后退，无强制顺序限制
    resetStatus();
    if (step >= 1 && step <= STEPS.length) {
      setCurrentStep(step);
    }
  }, [resetStatus]);

  // [2025-12-18 16:45:00] 修复：阻止输入框中Enter键触发表单提交
  // [2025-12-18 17:00:00] 添加详细调试日志
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

      // [2025-12-18 16:45:00] 修复：防止在输入框中按Enter键时自动提交
      // [2025-12-18 17:00:00] 添加详细调试日志
      // [2025-12-18 17:05:00] 改进：使用多种方法检查是否是提交按钮触发的
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

      // [2025-12-18 17:05:00] 方法1：检查 submitter（HTML5标准，但可能不支持）
      const isFromSubmitButtonBySubmitter = submitter && (
        (submitter.tagName === 'BUTTON' && submitter.getAttribute('type') === 'submit') ||
        (submitter.tagName === 'INPUT' && (submitter as HTMLInputElement).type === 'submit')
      );

      // [2025-12-18 17:05:00] 方法2：检查 ref 标记（按钮点击时设置）
      const isFromSubmitButtonByRef = isSubmittingFromButtonRef.current;

      // [2025-12-18 17:05:00] 方法3：检查当前焦点元素（如果焦点在输入框，可能是Enter键）
      const activeElement = document.activeElement;
      const isFocusOnInput = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA'
      ) && (activeElement as HTMLInputElement).type !== 'submit';

      // [2025-12-18 17:05:00] 如果焦点在输入框且不是从提交按钮触发的，则忽略
      if (!isFromSubmitButtonBySubmitter && !isFromSubmitButtonByRef && isFocusOnInput) {
        console.log('[OfflineOrder] ⚠️ Form submit triggered by Enter key in input, ignoring...', {
          submitter: submitter ? { tag: submitter.tagName, type: submitter.getAttribute('type') } : null,
          activeElement: { tag: activeElement?.tagName, type: (activeElement as HTMLInputElement)?.type },
        });
        // 重置 ref 标记
        isSubmittingFromButtonRef.current = false;
        return;
      }

      // [2025-12-18 17:05:00] 重置 ref 标记
      isSubmittingFromButtonRef.current = false;

      console.log('[OfflineOrder] ✅ Form submit triggered by submit button, proceeding...');
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
        // [2025-12-19] 从colorGroupsByProduct中提取所有印刷位置
        const allPrintPositions: Array<PrintPosition & { productItemId?: string; colorGroupId?: string; index?: number }> = [];

        // [2025-12-19] 遍历所有产品的颜色组，提取印刷位置
        formState.productItems.forEach((item) => {
          const colorGroups = formState.colorGroupsByProduct[item.id] || [];
          colorGroups.forEach((group) => {
            group.positions.forEach((pos, index) => {
              if (pos.enabled) {
                // [2025-12-19] 将PositionConfig转换为PrintPosition格式（用于向后兼容）
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

        // [2025-12-06] PRD v2.0: 构建配置数据（使用新数据结构）
        payload.append(
          'configuration',
          JSON.stringify({
            source: 'nextjs-offline-intake-v2',
            orderCode: formState.orderCode,
            orderNotes: formState.orderNotes, // [2025-12-06] 订单备注（PRD v2.0）
            dstFileFee: formState.dstFileFee || null, // [2025-12-06] DST File Fee
            productItems: formState.productItems, // 新数据结构
            globalPrintPositions: [], // [2025-12-19] 已废弃，保留字段用于向后兼容
            printPositions: allPrintPositions, // [2025-12-19] 从colorGroupsByProduct聚合的印刷位置（用于向后兼容）
            colorGroupsByProduct: formState.colorGroupsByProduct, // [2025-12-19] 按颜色分组的印刷位配置（主要数据源）
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
        if (calculateDstFileFee > 0) {
          payload.append('dstFileFee', calculateDstFileFee.toString());
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
      calculateTotal,
      files,
      API_BASE_URL,
      handleKeyDown, // [2025-12-18 16:45:00] 添加 handleKeyDown 依赖
      calculateDstFileFee, // [2025-01-28] Add dependency
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
                <div key={item.id} className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm relative">
                  {/* [2025-12-19 02:30:00] 产品色块（1号位置）- 左侧8px宽色块 */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-2 rounded-l-xl"
                    style={{ backgroundColor: getProductColor(item.id) }}
                  />

                  {/* 产品卡片头部 - PRD v2.0: 产品图片、产品名称、关闭按钮 */}
                  <div className="mb-5 pb-3 border-b border-gray-200 flex items-center gap-4 ml-2">
                    {(() => {
                      const product = orderConfig.products.find(p => p.id === item.productId);
                      return product?.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
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
                                // [2025-12-19] 如果是第一个颜色，直接添加，不显示弹窗
                                // [2025-12-18 22:31:42] 去掉第一个颜色的提示弹窗
                                const isFirstColor = item.colors.length === 0;
                                if (isFirstColor) {
                                  // 直接添加颜色，不显示弹窗
                                  addColorToProduct(item.id, color.id, color.name, false);
                                } else {
                                  // 有上一个颜色时，显示弹窗让用户选择是否继承
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

                    {/* [2025-12-19] 使用整合的颜色组卡片组件 */}
                    {item.colors.map((color, colorIndex) => {
                      // [2025-12-19] 获取或创建颜色组配置
                      const colorGroups = formState.colorGroupsByProduct[item.id] || [];
                      const colorGroup = colorGroups.find(g => g.colorCode === color.colorId);

                      // [2025-12-19] 如果颜色组不存在，从ProductColor转换
                      let group: OrderItemColorGroup;
                      if (colorGroup) {
                        group = colorGroup;
                      } else {
                        // [2025-12-19] 从sizes数组转换为quantities对象
                        const quantities: Record<string, number> = {};
                        color.sizes.forEach(sizeQty => {
                          quantities[sizeQty.size] = sizeQty.quantity;
                        });

                        group = {
                          id: `${color.colorId}-${Date.now()}`,
                          colorCode: color.colorId,
                          colorName: color.colorName,
                          quantities,
                          positions: [],
                          unitPrice: 0, // [2025-12-19 02:30:00] 颜色级别的单价
                          inheritsFromColorId: null
                        };

                        // [2025-12-19] 初始化颜色组到state
                        setFormState(prev => ({
                          ...prev,
                          colorGroupsByProduct: {
                            ...prev.colorGroupsByProduct,
                            [item.id]: [
                              ...(prev.colorGroupsByProduct[item.id] || []),
                              group
                            ]
                          }
                        }));
                      }

                      // [2025-12-19] 获取上一颜色组（用于继承）
                      const previousGroup = colorIndex > 0
                        ? colorGroups.find(g => g.colorCode === item.colors[colorIndex - 1].colorId)
                        : null;

                      // [2025-12-19 02:30:00] 获取颜色的hex值
                      const colorData = availableColors.find(c => c.id === color.colorId);
                      const colorHex = (colorData as any)?.hexCode || '#CCCCCC';

                      return (
                        <ColorGroupCardIntegrated
                          key={color.colorId}
                          group={group}
                          productItemId={item.productId}
                          availableSizes={color.availableSizes.length > 0 ? color.availableSizes : ALL_SIZES}
                          sizeFeeMap={sizeFeeMap}
                          isSizeAvailable={isSizeAvailable}
                          colorHex={colorHex}
                          onUpdate={(updated) => {
                            // [2025-12-19] 更新颜色组配置
                            setFormState(prev => {
                              const groups = prev.colorGroupsByProduct[item.id] || [];
                              const newGroups = groups.map(g =>
                                g.id === updated.id ? updated : g
                              );

                              // [2025-12-19] 同步更新ProductColor的sizes
                              const newItems = prev.productItems.map(productItem => {
                                if (productItem.id === item.id) {
                                  const newColors = productItem.colors.map(c => {
                                    if (c.colorId === color.colorId) {
                                      // [2025-12-19] 从quantities更新sizes
                                      // [2025-12-19 02:30:00] 从颜色组获取单价
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

                                      // [2025-12-19 02:30:00] 计算该颜色的总数量和总价
                                      const totalQuantity = Object.values(updated.quantities).reduce((sum, qty) => sum + qty, 0);
                                      const totalPrice = newSizes.reduce((sum, s) => sum + s.subtotal, 0);

                                      return {
                                        ...c,
                                        sizes: newSizes,
                                        totalQuantity,
                                        totalPrice
                                      };
                                    }
                                    return c;
                                  });

                                  // [2025-12-19 02:30:00] 计算产品的总数量和总价
                                  const totalQuantity = newColors.reduce((sum, c) => sum + c.totalQuantity, 0);
                                  const totalPrice = newColors.reduce((sum, c) => sum + c.totalPrice, 0);

                                  return {
                                    ...productItem,
                                    colors: newColors,
                                    totalQuantity,
                                    totalPrice
                                  };
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
                          onRemove={() => removeColorFromProduct(item.id, color.colorId)}
                          onCopyToOthers={() => {
                            // [2025-12-19] 复制到其他颜色的逻辑
                            const otherColors = item.colors.filter(c => c.colorId !== color.colorId);
                            if (otherColors.length === 0) {
                              alert('没有其他颜色可以复制到');
                              return;
                            }

                            if (confirm(`确定要将"${color.colorName}"的配置复制到其他 ${otherColors.length} 个颜色吗？`)) {
                              setFormState(prev => {
                                const groups = prev.colorGroupsByProduct[item.id] || [];
                                const sourceGroup = groups.find(g => g.colorCode === color.colorId);
                                if (!sourceGroup) return prev;

                                const sourcePositions = sourceGroup.positions.map(pos => ({
                                  ...pos,
                                  designAssetId: pos.designAssetId || null
                                }));

                                const newGroups = groups.map(g => {
                                  if (otherColors.some(c => c.colorId === g.colorCode)) {
                                    return {
                                      ...g,
                                      positions: sourcePositions,
                                      inheritsFromColorId: sourceGroup.id
                                    };
                                  }
                                  return g;
                                });

                                return {
                                  ...prev,
                                  colorGroupsByProduct: {
                                    ...prev.colorGroupsByProduct,
                                    [item.id]: newGroups
                                  }
                                };
                              });
                            }
                          }}
                          previousGroup={previousGroup}
                          onSizeQuantityChange={(size, quantity) => {
                            updateSizeQuantity(item.id, color.colorId, size, quantity);
                          }}
                        />
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
                              // [2025-12-19] 如果是第一个颜色，直接添加，不显示弹窗
                              // [2025-12-18 22:31:42] 去掉第一个颜色的提示弹窗
                              const isFirstColor = item.colors.length === 0;
                              if (isFirstColor) {
                                // 直接添加颜色，不显示弹窗
                                addColorToProduct(item.id, color.id, color.name, false);
                              } else {
                                // 有上一个颜色时，显示弹窗让用户选择是否继承
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

        {/* [2025-12-19] 印刷位置配置已整合到颜色卡片内部，独立的printPositions组件已移除 */}

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
              onKeyDown={handleKeyDown}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder={t('orderNotesPlaceholder') || '请输入订单备注（可选）...'}
            />
          </label>
        </div>

        {/* [2025-12-19 02:30:00] 移除全局单价输入框，改为颜色级别单价 */}

        {/* [2025-12-18 23:45:31] 计费明细 - 在总计上面 */}
        {calculateTotalQuantity > 0 && (
          <div className="p-5 bg-white border border-gray-200 rounded-lg mb-4">
            <h4 className="text-base font-semibold text-gray-900 mb-4">计费明细</h4>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">产品</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">颜色</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">尺码</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-700">数量</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">位置</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-700">单价</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-700">小计</th>
                  </tr>
                </thead>
                <tbody>
                  {formState.productItems.flatMap((item) => {
                    const colorGroups = formState.colorGroupsByProduct[item.id] || [];
                    return item.colors.flatMap((color) => {
                      const colorGroup = colorGroups.find(g => g.colorCode === color.colorId);
                      return color.sizes
                        .filter(sizeData => sizeData.quantity > 0)
                        .map((sizeData) => {
                          // [2025-12-19 02:30:00] 获取印刷位置名称
                          const positions = colorGroup?.positions
                            .filter(p => p.enabled)
                            .map(p => {
                              const positionNames: Record<string, string> = {
                                'front': '正面',
                                'back': '背面',
                                'left_sleeve': '左袖',
                                'right_sleeve': '右袖',
                                'pocket': '口袋',
                                'tag_inside': '内标',
                                'tag_outside': '外标',
                                'custom': '其他位置'
                              };
                              return positionNames[p.positionKey] || p.positionKey;
                            })
                            .join(', ') || '无位置';

                          return (
                            <tr key={`${item.id}-${color.colorId}-${sizeData.size}`} className="border-b border-gray-200 hover:bg-gray-50">
                              <td className="py-2 px-3 text-gray-900">{item.productName}</td>
                              <td className="py-2 px-3 text-gray-700">{color.colorName}</td>
                              <td className="py-2 px-3 text-gray-700">{sizeData.size}</td>
                              <td className="py-2 px-3 text-right text-gray-700">{sizeData.quantity}</td>
                              <td className="py-2 px-3 text-gray-600 text-xs">{positions}</td>
                              <td className="py-2 px-3 text-right text-gray-700">${sizeData.unitPrice.toFixed(2)}</td>
                              <td className="py-2 px-3 text-right font-medium text-gray-900">${sizeData.subtotal.toFixed(2)}</td>
                            </tr>
                          );
                        });
                    });
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}



        {/* 总计 - PRD v2.0 */}
        {calculateTotalQuantity > 0 && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg grid gap-3">
            <div className="flex justify-between items-center text-base">
              <span>{t('totalQuantity') || '总数量'}：</span>
              <strong className="text-lg text-blue-700">{calculateTotalQuantity} {t('items') || '件'}</strong>
            </div>
            <div className="flex justify-between items-center text-base">
              <span>{t('totalAmount') || '总金额'}：</span>
              <strong className="text-xl text-blue-700">${calculateSubtotal.toFixed(2)} CAD</strong>
            </div>
            {calculateDstFileFee > 0 && (
              <div className="flex justify-between items-center text-base">
                <span>DST File Fee：</span>
                <strong className="text-lg text-blue-700">${calculateDstFileFee.toFixed(2)} CAD</strong>
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
        <p className="text-gray-600 mb-6 text-sm">{t('step2Intro') || '填写客户信息和Invoice信息（所有字段均为可选）'}</p>

        {/* 客户基本信息 */}
        <section className="mb-8 p-5 bg-white border border-gray-200 rounded-xl">
          <h3 className="text-xl font-semibold text-gray-900 m-0 mb-4">{t('customerInfo') || '客户基本信息'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-2">{t('contactName') || '联系人姓名'}</span>
              <input
                type="text"
                name="contactName"
                value={formState.contactName}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${fieldErrors.contactName ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                  }`}
              />
              {fieldErrors.contactName && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.contactName}</p>
              )}
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-2">{t('email') || '邮箱'}</span>
              <input
                type="email"
                name="email"
                value={formState.email}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${fieldErrors.email ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
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
                onKeyDown={handleKeyDown}
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
                onKeyDown={handleKeyDown}
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
                      onKeyDown={handleKeyDown}
                      className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${fieldErrors.invoice_companyName ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                        }`}
                    />
                    {fieldErrors.invoice_companyName && (
                      <p className="mt-1 text-sm text-red-600">{fieldErrors.invoice_companyName}</p>
                    )}
                  </label>

                  <label className="block">
                    <span className="block text-sm font-medium text-gray-700 mb-2">{t('companyEmail') || '公司邮箱'}</span>
                    <input
                      type="email"
                      value={formState.invoiceInfo.companyEmail}
                      onChange={(e) => updateInvoiceInfo('companyEmail', e.target.value)}
                      onKeyDown={handleKeyDown}
                      className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${fieldErrors.invoice_companyEmail ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                        }`}
                    />
                    {fieldErrors.invoice_companyEmail && (
                      <p className="mt-1 text-sm text-red-600">{fieldErrors.invoice_companyEmail}</p>
                    )}
                  </label>

                  <label className="block">
                    <span className="block text-sm font-medium text-gray-700 mb-2">{t('taxNumber') || 'GST/HST Number'}</span>
                    <input
                      type="text"
                      value={formState.invoiceInfo.taxNumber}
                      onChange={(e) => updateInvoiceInfo('taxNumber', e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={t('taxNumberPlaceholder') || 'GST/HST Number'}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </label>

                  <label className="block">
                    <span className="block text-sm font-medium text-gray-700 mb-2">{t('city') || '城市'}</span>
                    <input
                      type="text"
                      value={formState.invoiceInfo.city}
                      onChange={(e) => updateInvoiceInfo('city', e.target.value)}
                      onKeyDown={handleKeyDown}
                      className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${fieldErrors.invoice_city ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                        }`}
                    />
                    {fieldErrors.invoice_city && (
                      <p className="mt-1 text-sm text-red-600">{fieldErrors.invoice_city}</p>
                    )}
                  </label>

                  <label className="block">
                    <span className="block text-sm font-medium text-gray-700 mb-2">{t('province') || '省份'}</span>
                    <input
                      type="text"
                      value={formState.invoiceInfo.province}
                      onChange={(e) => updateInvoiceInfo('province', e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={t('provincePlaceholder') || 'Ontario'}
                      className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${fieldErrors.invoice_province ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                        }`}
                    />
                    {fieldErrors.invoice_province && (
                      <p className="mt-1 text-sm text-red-600">{fieldErrors.invoice_province}</p>
                    )}
                  </label>

                  <label className="block">
                    <span className="block text-sm font-medium text-gray-700 mb-2">{t('postalCode') || '邮编'}</span>
                    <input
                      type="text"
                      value={formState.invoiceInfo.postalCode}
                      onChange={(e) => updateInvoiceInfo('postalCode', e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={t('postalCodePlaceholder') || 'A1B 2C3'}
                      className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${fieldErrors.invoice_postalCode ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                        }`}
                    />
                    {fieldErrors.invoice_postalCode && (
                      <p className="mt-1 text-sm text-red-600">{fieldErrors.invoice_postalCode}</p>
                    )}
                  </label>
                </div>

                <label className="block mt-4">
                  <span className="block text-sm font-medium text-gray-700 mb-2">{t('address') || '地址'}</span>
                  <input
                    type="text"
                    value={formState.invoiceInfo.address}
                    onChange={(e) => updateInvoiceInfo('address', e.target.value)}
                    onKeyDown={handleKeyDown}
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${fieldErrors.invoice_address ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                      }`}
                  />
                  {fieldErrors.invoice_address && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.invoice_address}</p>
                  )}
                </label>
              </div>
            </div>
          )}

          {/* [2025-12-19] PRD v2.0: 支付信息（Invoice时，全部改为非必填） */}
          {formState.requiresInvoice && (
            <div className="mt-4 p-5 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="text-base font-semibold text-gray-700 m-0 mb-3">{t('paymentInfo') || '支付信息'}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="block text-sm font-medium text-gray-700 mb-2">{t('paymentMethod') || '支付方式'}</span>
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
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${fieldErrors.paymentMethod ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
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
                    onKeyDown={handleKeyDown}
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${fieldErrors.referenceNumber ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
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

          {/* [2025-12-19 02:30:00] 计费明细 */}
          <BillingDetails
            productItems={formState.productItems}
            colorGroupsByProduct={formState.colorGroupsByProduct}
          />
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

  // [2025-12-19] PRD v2.0: 渲染第三步 - 印刷位选择（按颜色分组）
  const renderStep3 = () => {
    // [2025-12-19] 获取所有有颜色的产品项
    const itemsWithColors = formState.productItems.filter(item => item.colors.length > 0);

    if (itemsWithColors.length === 0) {
      return (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 m-0 mb-2">选择印刷位</h2>
          <p className="text-gray-600 mb-6 text-sm">请先在步骤1中添加产品并选择颜色</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 m-0 mb-2">选择印刷位</h2>
        <p className="text-gray-600 mb-6 text-sm">为每个颜色配置印刷位置。您可以继承上一颜色的配置，或为特定尺码设置不同的印刷位。</p>

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

        {/* [2025-12-19] 为每个产品项显示颜色组配置器 */}
        {itemsWithColors.map((item) => {
          const existingGroups = formState.colorGroupsByProduct[item.id] || [];

          return (
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
                  setFieldErrors(prev => ({
                    ...prev,
                    [`printPositions-${item.id}`]: errors.join('; ')
                  }));
                } else {
                  setFieldErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors[`printPositions-${item.id}`];
                    return newErrors;
                  });
                }
              }}
            />
          );
        })}

        {/* [2025-12-19] 文件上传（可选，移到步骤3下方） */}
        <div className="mt-8 p-5 bg-gray-50 border border-gray-200 rounded-xl">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">文件上传（可选）</h3>
          <p className="text-sm text-gray-600 mb-4">您可以上传设计文件，也可以不传文件直接提交订单。</p>

          {isMobile && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm font-semibold text-blue-900 mb-1">{t('mobileUploadTip') || '移动设备提示'}</p>
              <p className="text-xs text-blue-700">{t('mobileUploadDescription') || '您可以使用相机拍照上传文件'}</p>
            </div>
          )}

          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-6 bg-white text-center cursor-pointer relative transition-all hover:border-blue-500 hover:bg-blue-50"
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
                  className="bg-white border border-gray-200 rounded-lg p-3 flex justify-between items-center"
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
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${locale === 'en'
                  ? 'bg-blue-600 text-white'
                  : 'bg-transparent text-gray-700 hover:bg-blue-50'
                  }`}
                onClick={() => handleLocaleChange('en')}
              >
                EN
              </button>
              <button
                type="button"
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${locale === 'zh'
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
              className={`rounded-lg px-4 py-3 ${status.type === 'success'
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
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all flex-1 min-w-0 ${currentStep === step.id
                    ? 'bg-blue-50 border-2 border-blue-600'
                    : currentStep > step.id
                      ? 'bg-gray-50 hover:bg-gray-100'
                      : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  onClick={() => goToStep(step.id)}
                  title={t('clickToJump') || '点击跳转到此步骤'}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold flex-shrink-0 ${currentStep === step.id
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

          {/* [2025-12-19] 添加颜色弹窗 */}
          {addColorModal && (
            <AddColorModal
              isOpen={addColorModal.isOpen}
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
              onConfirm={(inheritFromPrev) => {
                addColorToProduct(
                  addColorModal.itemId,
                  addColorModal.colorId,
                  addColorModal.colorName,
                  inheritFromPrev
                );
                setAddColorModal(null);
              }}
              onCancel={() => setAddColorModal(null)}
            />
          )}

          {/* [2025-01-27 18:00:00] 步骤导航按钮 - 使用 Tailwind */}
          {/* [2025-01-28 09:10:00] 使用 isClient 条件渲染避免 hydration 错误 */}
          {/* [2025-12-18 17:15:00] 修复：将提交按钮移到中间，避免与下一步按钮位置重叠导致误触 */}
          {/* [2025-12-18 17:20:00] 使用 grid 布局确保提交按钮真正居中 */}
          {/* [2025-12-18 17:25:00] 修复：使用绝对定位确保提交按钮真正居中 */}
          {isClient && (
            <div className={`pt-6 border-t border-gray-200 relative ${currentStep === STEPS.length
              ? 'grid grid-cols-3 items-center gap-3'
              : 'flex justify-between items-center gap-3'
              }`}>
              {/* 左侧：保存草稿按钮 */}
              <div className={currentStep === STEPS.length ? 'flex justify-start' : ''}>
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={saveDraft}
                  disabled={isSubmitting || isSavingDraft}
                >
                  {isSavingDraft ? t('saving') : t('saveDraft')}
                </button>
              </div>

              {/* 中间：提交订单按钮（仅在第3步显示，使用绝对定位居中） */}
              {currentStep === STEPS.length && (
                <div className="absolute left-1/2 transform -translate-x-1/2">
                  <button
                    ref={submitButtonRef}
                    type="submit"
                    onClick={() => {
                      // [2025-12-18 17:05:00] 标记这是按钮点击触发的提交
                      isSubmittingFromButtonRef.current = true;
                      console.log('[OfflineOrder] Submit button clicked, setting flag');
                    }}
                    className="px-8 py-2 rounded-full font-semibold bg-primary text-white hover:bg-primary-dark transition-colors shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? t('submitting') : t('submitOrder')}
                  </button>
                </div>
              )}

              {/* 右侧：上一步和下一步按钮（仅在前两步显示） */}
              {currentStep < STEPS.length && (
                <div className="flex gap-3 justify-end">
                  {currentStep > 1 && (
                    <button
                      type="button"
                      className="px-6 py-2 rounded-lg font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                      onClick={goToPreviousStep}
                    >
                      {t('previousStep')}
                    </button>
                  )}
                  <button
                    type="button"
                    className="px-6 py-2 rounded-full font-semibold bg-primary text-white hover:bg-primary-dark transition-colors shadow-md"
                    onClick={goToNextStep}
                  >
                    {t('nextStep')}
                  </button>
                </div>
              )}

              {/* 右侧：上一步按钮（仅在第3步显示，与提交按钮配合） */}
              {currentStep === STEPS.length && currentStep > 1 && (
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    className="px-6 py-2 rounded-lg font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                    onClick={goToPreviousStep}
                  >
                    {t('previousStep')}
                  </button>
                </div>
              )}
            </div>
          )}
        </form>
      </main>
    </div>
  );
}

