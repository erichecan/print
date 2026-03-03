'use client';

import { restoreCanvasFromSnapshot } from './utils/canvasRestore';

/**
 * Design Lab 5.0 - 极简版本
* 完全参考 Custom Ink，使用最简单的 HTML/CSS 实现
 * 
 * 目标：
 * - UI 完全与 4.0 版本一致
 * - 只实现布局（阶段 1）和商品图片显示（阶段 2）
 * - 不包含任何功能代码
 * - 代码极简，使用简单的 HTML <img> 标签
 */
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation'; // 5.0 版本：功能2 - 从 URL 参数获取 productId/colorId
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import { QuickLoginModal } from '@/components/auth/QuickLoginModal'; // Import QuickLoginModal
import { getDefaultProductBaseImages, getThumbnailImageUrl, getProductBaseImagesFromAPI } from '@/lib/customink-images';
import UploadPanel from './components/panels/UploadPanel'; // 5.0 版本：步骤1 - 集成 UploadPanel 组件
import EditUploadPanel from './components/panels/EditUploadPanel'; // 5.0 版本：上传图片编辑面板
import TextPanel from './components/panels/TextPanel'; // 5.0 版本：Add Text - 复用 4.0 TextPanel
import EditTextPanel from './components/panels/EditTextPanel'; // 5.0 版本：Add Text - 复用 4.0 EditTextPanel
import ArtPanel from './components/panels/ArtPanel'; // 5.0 版本：Add Art - 素材库面板
import EditArtPanel from './components/panels/EditArtPanel'; // Import EditArtPanel
import ProductColorsPanel from './components/panels/ProductColorsPanel'; // 5.0 版本：Product Colors - 颜色选择面板
import { registerUniversalCornerControls, applyCornerControls } from '../design-lab5/upload-controls/registerUploadCornerControls';
import { FloatingObjectControls } from './components/FloatingObjectControls';
import { ImageCropper } from './components/ImageCropper';
import * as fabric from 'fabric';
import { useDesignStore } from './store/useDesignStore'; // Import Store
import { serializeCanvas, applyViewState } from './utils/serialization'; // Import Serialization
import { loadFromLocal } from './store/persistence'; // Import Persistence
import ProductCatalogModal from './components/modals/ProductCatalogModal';
import { PRODUCT_COLORS } from '@/lib/product-data';
// 产品模块：导入产品选择器和颜色选择器
import ProductSelectorModal from './modules/product/ProductSelectorModal';
import ColorSelectorModal from './modules/product/ColorSelectorModal';
import { getProducts, getProductByVariant, getProduct, type Product, type ProductDetail } from './api/product';
// 保存模块：导入保存相关组件和 hooks
import SaveShareModal from './components/modals/SaveShareModal';
import { useDesign } from './modules/save/useDesign';
// 报价模块：导入报价相关组件和 hooks
import GetPriceFlowModal, {
  OrderingOptions,
  SizeQuantity,
  GetPriceFlowStep
} from './components/modals/GetPriceFlowModal';
import { usePricing } from './modules/pricing/usePricing';
import './design-lab.css';

// 画布常量 - Optimized to 1200x1440 to match Custom Ink product image resolution (1200px)
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 1440;
// 打印区域常量 (Custom Ink 风格) - Optimized to 1200x1440
// Default values used as fallback if product has no specific printable area config
const DEFAULT_PRINTABLE_WIDTH = 546;
const DEFAULT_PRINTABLE_HEIGHT = 960;
const LEFT_CHEST_WIDTH = 180;
const LEFT_CHEST_HEIGHT = 180;
const LEFT_CHEST_OFFSET_X = 150;
const LEFT_CHEST_OFFSET_Y = -390;
const DEFAULT_SLEEVE_WIDTH = 500;
const DEFAULT_SLEEVE_HEIGHT = 500;

// 5.0 版本：添加 props 接口（为后续功能准备）
interface DesignLabClient5Props {
  initialProductData?: any; // 服务端预取的产品数据（暂时未使用）
}

const DesignLabClient5: React.FC<DesignLabClient5Props> = ({ initialProductData }) => {
  // 5.0 版本：功能2 - 从 URL 参数获取 productId/colorId
  const searchParams = useSearchParams();

  // Use Global Store
  const {
    document: designDoc, // Rename to avoid shadowing global document
    initializeDesign,
    setActiveView: setStoreActiveView,
    setViewLayers,
    updateProductInfo,
    saveDesign: commitToStore
  } = useDesignStore();

  // Local derived state for UI from the store
  const currentView = designDoc?.activeView || 'front';
  const setCurrentView = (view: any) => setStoreActiveView(view);

  // 5.0 版本：只保留最基本的 state
  // const [currentView, setCurrentView] = useState<'front' | 'back' | 'sleeve' | 'left-sleeve' | 'right-sleeve'>('front');
  const [zoomLevel, setZoomLevel] = useState(1); // Zoom state (1=100%, 1.2=120%, 1.5=150%)

  // 5.0 版本：功能2 - 改为 useState，支持动态更新
  // 修复：初始状态使用默认白色 T 恤图片，确保用户直接从导航进入时也能正常显示
  // 5.0 版本：产品模块 - 产品信息状态
  const [productInfo, setProductInfo] = useState<{
    color: string;
    baseImages: {
      front: string;
      back: string;
      sleeve: string;
      'left-sleeve'?: string;
      'right-sleeve'?: string;
    };
    productId: string;
    slug?: string; // Added for Product Details link
    colorId?: string; // CRITICAL: This is the productVariantId
    productName?: string;
    variants?: Array<{ id: string; color: string; }>;
    printableArea?: {
      front: { width: number; height: number; x: number; y: number };
      back: { width: number; height: number; x: number; y: number };
      sleeve: { width: number; height: number; x: number; y: number };
    } | null;
  }>(() => {
    // CRITICAL FIX: Initialize from initialProductData if available
    if (initialProductData) {
      console.log('[DesignLab 5.0] Initializing productInfo from initialProductData:', initialProductData);
      let baseImages = initialProductData.baseImages || getDefaultProductBaseImages(initialProductData.color || initialProductData.colorName || 'White');
      const resolvedColor = initialProductData.color || initialProductData.colorName || 'White';

      // CRITICAL FIX: Force use local high-res assets for White sleeves (Demo Quality)
      if (resolvedColor.toLowerCase() === 'white') {
        const defaults = getDefaultProductBaseImages('White');
        baseImages = {
          ...baseImages,
          'left-sleeve': defaults['left-sleeve'],
          'right-sleeve': defaults['right-sleeve'],
          'sleeve': defaults['sleeve']
        };
      }

      return {
        color: resolvedColor,
        baseImages: baseImages,
        productId: initialProductData.productId || initialProductData.id,
        slug: initialProductData.slug,
        colorId: initialProductData.variantId, // CRITICAL: Set colorId from variantId
        productName: initialProductData.productName || initialProductData.name,

        variants: initialProductData.variants,
        printableArea: initialProductData.printableArea,
      };
    }

    // Default fallback
    const defaultColor = 'White';
    return {
      color: defaultColor,
      baseImages: getDefaultProductBaseImages(defaultColor),
      productId: '',
      colorId: undefined,
      productName: undefined,
      variants: [],
    };
  });

  // Init Store on Mount if product info is available or changes
  useEffect(() => {
    const init = async () => {
      if (productInfo.productId && !designDoc) {
        // Try loading from local storage first?
        // For now, we just initialize a fresh one or we could check IDB
        // Let's assume for this MVP we start fresh unless we implement "Resume Session" feature explicitly
        // Actually, requirements say "Crash-safe autosave". So we SHOULD try to load.
        // But we don't have a stable DocID in URL yet. So we just init.
        // If the user refreshes, we might need a way to know the docId.
        // For now, we initialize a new session.
        initializeDesign(productInfo.productId, productInfo.colorId);
      }
    };
    init();
  }, [productInfo.productId, productInfo.colorId]);

  // 5.0 版本：功能2 - 从 URL 参数加载商品信息
  // 修复：添加默认图片机制，如果用户直接从导航进入，显示默认白色 T 恤
  useEffect(() => {
    const productId = searchParams?.get('productId') || undefined;
    const colorId = searchParams?.get('colorId') || undefined;
    const variantId = searchParams?.get('variantId') || undefined;

    console.log('[DesignLab 5.0] 功能2 - URL 参数:', { productId, colorId, variantId });

    // 如果有 variantId，优先从服务端预取的数据中获取
    if (initialProductData && variantId) {
      // FIX: If we are already showing this variant, don't reset.
      // This prevents the "revert to white" bug when URL updates after color selection.
      if (productInfo.colorId === variantId) {
        console.log('[DesignLab 5.0] URL variantId matches current, skipping reset.');
        return;
      }

      console.log('[DesignLab 5.0] 功能2 - 使用服务端预取的数据:', initialProductData);
      const color = initialProductData.color || initialProductData.colorName || 'White';
      let baseImages = initialProductData.baseImages || getDefaultProductBaseImages(color);

      // CRITICAL FIX: Force use local high-res assets for White sleeves (Demo Quality)
      if (color.toLowerCase() === 'white') {
        const defaults = getDefaultProductBaseImages('White');
        baseImages = {
          ...baseImages,
          'left-sleeve': defaults['left-sleeve'],
          'right-sleeve': defaults['right-sleeve'],
          'sleeve': defaults['sleeve']
        };
      }

      setProductInfo({
        color,
        baseImages,
        productId: initialProductData.productId || initialProductData.id || productId,
        slug: initialProductData.slug,
        colorId: initialProductData.variantId || initialProductData.colorId || variantId,
        productName: initialProductData.productName || initialProductData.name,
        variants: initialProductData.variants || [],
      });
      return;
    }

    // 如果有 productId，尝试从 API 获取完整产品信息（包括 variantId）
    // 修复：优先处理 productId，并允许 colorId覆盖默认颜色
    if (productId && !initialProductData) {
      console.log('[DesignLab 5.0] 功能2 - 从 API 获取指定产品信息:', { productId });

      getProduct(productId)
        .then((product: ProductDetail) => {
          if (product) {
            console.log('[DesignLab 5.0] 产品信息获取成功:', product.productName);

            // 修复：如果 URL 中有 valid colorId，优先使用
            let resolvedColor = product.color || 'White';
            let resolvedVariantId = product.variantId;

            // 改进：根据颜色名称查找对应的 variantId
            if (colorId) {
              const matchedColor = PRODUCT_COLORS.find(c => c.name.toLowerCase() === colorId.toLowerCase());
              if (matchedColor) {
                resolvedColor = matchedColor.name;
                // 尝试从 variants 中找到匹配该颜色的 ID
                if (product.variants && product.variants.length > 0) {
                  // 优先找 exact match
                  const variant = product.variants.find(v => v.color?.toLowerCase() === resolvedColor.toLowerCase());
                  if (variant) {
                    resolvedVariantId = variant.id;
                  }
                }
              }
            }

            // 使用 API 返回的图片，如果颜色被覆盖或图片为空，则回退到 GCS 默认图片
            // 注意：如果 API 返回的 baseImages 是针对特定颜色的，这里可能需要根据 resolvedColor 重新获取
            // 简单起见，如果颜色改变了，我们强制使用 getDefaultProductBaseImages
            // Fix: If backend returned generic fallback (hero-card-tee.jpg), treat it as "no image" 
            // and use GCS generator instead, even if color matched.
            let shouldUseDefaultImages = resolvedColor !== product.color;
            if (!shouldUseDefaultImages && product.baseImages && product.baseImages.front && product.baseImages.front.includes('hero-card-tee.jpg')) {
              console.warn('[DesignLab 5.0] Generic fallback image detected on initial load, switching to GCS generator');
              shouldUseDefaultImages = true;
            }

            let images = shouldUseDefaultImages
              ? getDefaultProductBaseImages(resolvedColor)
              : (product.baseImages || getDefaultProductBaseImages(resolvedColor));

            // CRITICAL FIX: Force use local high-res assets for White sleeves (Demo Quality)
            // The API might return low-res or old assets for White
            if (resolvedColor.toLowerCase() === 'white') {
              const defaults = getDefaultProductBaseImages('White');
              images = {
                ...images,
                'left-sleeve': defaults['left-sleeve'],
                'right-sleeve': defaults['right-sleeve'],
                'sleeve': defaults['sleeve']
              };
              console.log('[DesignLab 5.0] Force-applied high-res local assets for White sleeves');
            }

            // 修复：检查 variants 是否为空
            if (!product.variants || product.variants.length === 0) {
              console.error('[DesignLab 5.0] 严重警告: 该产品没有任何变体 (Variants)数据!', product.productId);
              // 可以考虑在这里显示一个 UI 提示，告知用户该产品无法购买或保存
            } else {
              console.log('[DesignLab 5.0] 产品变体数量:', product.variants.length);
            }

            setProductInfo(prev => ({
              ...prev,
              productId: product.productId,
              colorId: resolvedVariantId, // 使用解析后的 variantId
              productName: product.productName,
              color: resolvedColor,
              baseImages: {
                front: images.front,
                back: images.back,
                sleeve: images.sleeve,
                'left-sleeve': images['left-sleeve'],
                'right-sleeve': images['right-sleeve'],
              },
              variants: (product.variants || []).map(v => ({ ...v, color: v.color || '' })), // 保存 variants 列表
              printableArea: product.printableArea, // Add dynamic printable area
            }));

            // 更新 URL 参数以包含 variantId (可选)
            if (resolvedVariantId && (!variantId || variantId !== resolvedVariantId)) {
              const url = new URL(window.location.href);
              url.searchParams.set('variantId', resolvedVariantId);
              window.history.replaceState({}, '', url.toString());
            }
          }
        })
        .catch((error: any) => {
          console.error('[DesignLab 5.0] 获取产品信息失败:', error);
          // If variant ID is missing or invalid, try to find a valid one or fetch default
          console.warn('[DesignLab 5.0] Failed to get product, falling back to default list');
          getProducts({ limit: 1 })
            .then((res: any) => {
              if (res.data && res.data.length > 0) {
                handleProductSelect(res.data[0].id);
              }
            })
            .catch((e: any) => console.error('Double fallback failed:', e));
        });
      return;
    }

    // 修复：如果 URL 中没有 productId（无论是否有 colorId），都加载默认产品
    // 改进：加载特定的系统内置 Design Lab 默认产品 (design-lab-default-tee)
    // Fix: Do NOT load default product if we are loading a design (designId present)
    const hasDesignId = searchParams.get('designId');
    if (!productId && !initialProductData && !hasDesignId) {
      console.log('[DesignLab 5.0] No product selected and no design loaded, fetching SYSTEM DEFAULT Design Lab product...');

      if (!productInfo.productId) {
        // 直接通过 Slug 获取系统商品，不再通过搜索（搜索已过滤系统商品）
        getProduct('design-lab-default-tee')
          .then((detail: ProductDetail) => {
            if (detail) {
              console.log('[DesignLab 5.0] Loaded system default product:', detail.productName);
              // 由于 detail 格式与 handleProductSelect 预期一致，我们可以直接更新
              // 但为了保持一致，我们调用 handleProductSelect（它现在也能处理 slug/id）
              handleProductSelect('design-lab-default-tee');
            }
          })
          .catch((err: any) => {
            console.warn('[DesignLab 5.0] Failed to load system default product, trying any active product...', err);
            getProducts({ limit: 1 }).then((res: any) => {
              if (res.data && res.data.length > 0) {
                handleProductSelect(res.data[0].id);
              }
            });
          });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, initialProductData]); // 依赖 searchParams 和 initialProductData

  // 5.0 版本：添加调试日志，确保元素正确渲染
  const railRef = useRef<HTMLElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); // 步骤2 - 改为 HTMLCanvasElement
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null); // 步骤2 - Fabric canvas ref
  const fabricRef = useRef<typeof fabric | null>(null); // 步骤2 - Fabric 对象 ref
  const [canvasInitialized, setCanvasInitialized] = useState(false); // 用于触发图片加载的 state
  const [isLoadingDesign, setIsLoadingDesign] = useState(false); // 防止加载设计时重新添加产品图片
  const cleanupMouseListenerRef = useRef<(() => void) | null>(null); // 保存鼠标监听器清理函数
  // viewStates removed in favor of useDesignStore for persistence <!-- id: 360 -->

  // 调试：监听 canvasInitialized 变化
  useEffect(() => {
    console.log('[DesignLab 5.0] canvasInitialized state changed:', canvasInitialized);
  }, [canvasInitialized]);

  useEffect(() => {
    // 检查 Rail（第一列）
    const rail = railRef.current;
    if (rail) {
      const rect = rail.getBoundingClientRect();
      const styles = window.getComputedStyle(rail);
      console.log('[DesignLab 5.0 Debug] Rail (第一列):', {
        exists: true,
        visible: rect.width > 0 && rect.height > 0,
        width: rect.width,
        height: rect.height,
        display: styles.display,
        position: styles.position,
        gridColumn: styles.gridColumn,
        backgroundColor: styles.backgroundColor,
        childrenCount: rail.children.length,
      });
    } else {
      console.error('[DesignLab 5.0 Debug] Rail (第一列) 元素未找到！');
    }

    // 检查 Sidebar（第四列）
    const sidebar = sidebarRef.current;
    if (sidebar) {
      const rect = sidebar.getBoundingClientRect();
      const styles = window.getComputedStyle(sidebar);
      console.log('[DesignLab 5.0 Debug] Sidebar (第四列):', {
        exists: true,
        visible: rect.width > 0 && rect.height > 0,
        width: rect.width,
        height: rect.height,
        display: styles.display,
        position: styles.position,
        gridColumn: styles.gridColumn,
        backgroundColor: styles.backgroundColor,
        childrenCount: sidebar.children.length,
      });
    } else {
      console.error('[DesignLab 5.0 Debug] Sidebar (第四列) 元素未找到！');
    }

    // 检查 Canvas（第三列）
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const styles = window.getComputedStyle(canvas);
      console.log('[DesignLab 5.0 Debug] Canvas (第三列):', {
        exists: true,
        visible: rect.width > 0 && rect.height > 0,
        width: rect.width,
        height: rect.height,
        display: styles.display,
        gridColumn: styles.gridColumn,
        backgroundColor: styles.backgroundColor,
      });
    } else {
      console.error('[DesignLab 5.0 Debug] Canvas (第三列) 元素未找到！');
    }

    // 检查主容器
    const mainContainer = document.querySelector('.design-lab-new');
    if (mainContainer) {
      const rect = mainContainer.getBoundingClientRect();
      const styles = window.getComputedStyle(mainContainer);
      console.log('[DesignLab 5.0 Debug] 主容器 (.design-lab-new):', {
        exists: true,
        display: styles.display,
        gridTemplateColumns: styles.gridTemplateColumns,
        gridTemplateRows: styles.gridTemplateRows,
        width: rect.width,
        height: rect.height,
        childrenCount: mainContainer.children.length,
      });
    } else {
      console.error('[DesignLab 5.0 Debug] 主容器未找到！');
    }
  }, []);

  // 5.0 版本：功能3 - ToolPanel 面板类型 state
  // 添加 edit-upload 面板类型
  type ToolPanelType = 'home' | 'upload' | 'text' | 'art' | 'edit-upload' | 'edit-text' | 'edit-art' | 'product-colors' | null;
  const [toolPanelType, setToolPanelType] = useState<ToolPanelType>('home');
  const [activeTool, setActiveTool] = useState<string | null>(null);

  // 当前选中的上传图片对象
  const [selectedImage, setSelectedImage] = useState<fabric.Image | null>(null);
  // Add Text: 当前选中的文本对象
  const [selectedText, setSelectedText] = useState<fabric.IText | null>(null);
  const [selectedArt, setSelectedArt] = useState<fabric.Image | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [croppingImage, setCroppingImage] = useState<fabric.Image | null>(null);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false); // 5.0 Version: Catalog Modal state
  const [catalogMode, setCatalogMode] = useState<'add' | 'change'>('add'); // 'add' to insert, 'change' to update current

  // 鼠标位置调试信息
  const [mouseDebug, setMouseDebug] = useState<{
    x: number;
    y: number;
    canvasX: number;
    canvasY: number;
    onControl: boolean;
    controlType: string | null;
    targetObject: string | null;
  } | null>(null);

  // 产品模块：产品选择器和颜色选择器状态
  const [showProductModal, setShowProductModal] = useState(false);
  const [showColorModal, setShowColorModal] = useState(false);

  // 5.0 Version: Dynamic Color Mapping State
  const [dynamicColors, setDynamicColors] = useState<any[]>([]);

  // [2026-03-03 14:55:00] 使用 preview-from-settings：直接读取 settings.site.colorMappings，保证 Product & Color 与 admin Color Mapping 一致
  useEffect(() => {
    fetch('/api/proxy/product-color-images/preview-from-settings')
      .then(res => res.json())
      .then(res => {
        const data = res.data || [];
        if (Array.isArray(data)) {
          const mapped = data.map((d: any) => ({
            name: d.name ?? d.colorName,
            hex: d.hex ?? '#cccccc',
            externalColorId: d.externalColorId,
            availableSizes: ["S", "M", "L", "XL", "2XL", "3XL"],
            isAvailable: d.isActive !== false,
            imageUrls: d.imageUrls
          }));
          mapped.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
          console.log('[DesignLab 5.0] Loaded dynamic colors from mapping API:', mapped.length);
          setDynamicColors(mapped);
        }
      })
      .catch(err => console.error('[DesignLab 5.0] Failed to load color mapping:', err));
  }, []);

  // 保存模块：设计名称状态（独立管理，因为 SaveShareModal 需要可编辑）
  const [designName, setDesignName] = useState<string>('Untitled Design');
  const [designId, setDesignId] = useState<string | null>(null);

  // 保存模块：使用 useDesign hook（canvas 可能为 null，需要在保存时检查）
  // CRITICAL FIX: Log productVariantId to debug save issues
  const effectiveProductVariantId = productInfo.colorId || productInfo.variants?.[0]?.id;

  useEffect(() => {
    console.log('[DesignLab 5.0] productInfo state:', {
      colorId: productInfo.colorId,
      firstVariantId: productInfo.variants?.[0]?.id,
      effectiveVariantId: effectiveProductVariantId,
      productId: productInfo.productId,
      productName: productInfo.productName,
    });
  }, [productInfo, effectiveProductVariantId]);

  const {
    saveDesign: saveDesignInternal,
    loadDesign: loadDesignInternal,
    shareDesignLink,
    isSaving,
    error: designError,
  } = useDesign({
    canvas: fabricCanvasRef.current,
    canvasWidth: CANVAS_WIDTH,
    canvasHeight: CANVAS_HEIGHT,
    productVariantId: effectiveProductVariantId,
    initialDesignId: designId,
    designName: designName, // Changed from initialDesignName to designName (reactive)
  });

  // 保存模块：SaveShareModal 状态
  const [showSaveShareModal, setShowSaveShareModal] = useState(false);
  const [showQuickLoginModal, setShowQuickLoginModal] = useState(false); // Quick Login Modal state
  const { user } = useAuth(); // Get user from AuthContext

  // Handle save request with auth check
  const handleSaveRequest = () => {
    if (user) {
      setShowSaveShareModal(true);
    } else {
      setShowQuickLoginModal(true);
    }
  };

  // 报价模块：使用 usePricing hook
  const {
    quote,
    isRequestingQuote,
    quoteError,
    requestQuoteForDesign,
    addToCart: addToCartInternal,
    getQuoteData: getQuoteDataInternal,
  } = usePricing({
    canvas: fabricCanvasRef.current,
    designId,
    productId: productInfo.productId,
    variantId: productInfo.colorId,
    canvasWidth: CANVAS_WIDTH,
    canvasHeight: CANVAS_HEIGHT,
    currentView, // 传递当前视图
  });

  // 报价模块：GetPriceFlowModal 状态
  const [showGetPriceModal, setShowGetPriceModal] = useState(false);
  // Persistent state for GetPriceFlow
  const [getPriceStep, setGetPriceStep] = useState<GetPriceFlowStep>('quantity');
  const [getPriceOrderingOptions, setGetPriceOrderingOptions] = useState<OrderingOptions>({
    orderType: 'buy-ship',
    shipping: 'single-address',
    sizesQuantities: 'i-know-sizes',
    payment: 'i-pay',
  });
  const [getPriceSizeQuantities, setGetPriceSizeQuantities] = useState<SizeQuantity[]>([]);
  const [getPriceEstimatedQuantity, setGetPriceEstimatedQuantity] = useState<number>(1);
  const [getPriceQuoteData, setGetPriceQuoteData] = useState<any>(null);

  // 5.0 版本：功能叠加 - 视图切换功能
  // Updated: Save current view objects before switching
  // 5.0 版本：功能叠加 - 视图切换功能
  // Updated: Save current view objects before switching
  const handleViewChange = async (view: 'front' | 'back' | 'sleeve' | 'left-sleeve' | 'right-sleeve') => {
    console.log('[DesignLab 5.0] 视图切换 (Store-based):', { from: currentView, to: view });

    const canvas = fabricCanvasRef.current;
    if (canvas) {
      // 1. Serialize current view to STORE
      const layers = serializeCanvas(canvas);
      setViewLayers(currentView, layers);

      // Trigger save (debounced)
      commitToStore();

      console.log(`[DesignLab 5.0] Serialized ${layers.length} layers for view: ${currentView}`);

      // 2. Clear canvas (user objects only, handled by Serialization utils if we used applyViewState, 
      // but here we might want to manually clear to be safe before applying new state)
      // Actually applyViewState handles clearing.

      // RESET Tool Panel to Home (Request 2)
      setToolPanelType('home');
      setActiveTool(null);
      setSelectedImage(null);
      setSelectedText(null);
      setSelectedArt(null);

      // 3. Update current view in Store
      // This updates 'document.activeView'
      setStoreActiveView(view);

      // 4. Load background image for NEW view
      const newImageUrl = productInfo.baseImages?.[view];
      const isDefaultProduct = productInfo.productName?.includes('Design Lab Default Tee') || productInfo.productName?.includes('Loading');
      let tintHex = '#ffffff';
      if (isDefaultProduct) {
        const colorData = PRODUCT_COLORS.find(c => c.name === productInfo.color);
        tintHex = colorData ? colorData.hex : '#ffffff';
      }

      if (newImageUrl) {
        // Load the new background image
        // We assume addProductImageToCanvas handles the 'product-image-base' layer
        addProductImageToCanvas(newImageUrl, tintHex);
      } else {
        console.warn(`[DesignLab 5.0] No image found for view: ${view}`);
      }

      // 5. Restore User Objects from Store
      // Wait for store to update? Zustand is synchronous usually for state updates
      // But we need to get the "target view" layers.
      // We can access it directly via useDesignStore.getState() or just trust the hook re-render?
      // Since we are inside an event handler, 'document' variable is stale (from render closure).
      // We should use the store's getter if possible, or just rely on the fact that we just switched.

      // Better: Get fresh state
      const freshDoc = useDesignStore.getState().document;
      const targetViewLayers = freshDoc?.views[view]?.layers || [];

      if (targetViewLayers.length > 0) {
        console.log(`[DesignLab 5.0] Restoring ${targetViewLayers.length} layers for view: ${view}`);
        await applyViewState(canvas, targetViewLayers);
      } else {
        // If no layers, we still need to clear the old layers (if applyViewState wasn't called)
        // applyViewState handles clearing, so we should call it even with empty list?
        await applyViewState(canvas, []);
      }
    } else {
      setStoreActiveView(view);
    }
  };

  // 5.0 版本：功能3 - Rail 按钮点击处理
  const handleToolClick = (tool: 'upload' | 'text' | 'art' | 'product-colors') => {
    console.log('[DesignLab 5.0] 功能3 - Rail 按钮点击:', { tool, previousTool: activeTool }); // 添加调试日志

    // 如果点击的是已激活的工具，切换回 home
    if (activeTool === tool) {
      setActiveTool(null);
      setToolPanelType('home');
      console.log('[DesignLab 5.0] 功能3 - 切换回 home 面板');
    } else {
      setActiveTool(tool);
      setToolPanelType(tool);
      console.log('[DesignLab 5.0] 功能3 - 切换到面板:', tool);
    }
  };

  // 5.0 版本：功能3 - 返回 home 面板
  const handleBackToHome = () => {
    console.log('[DesignLab 5.0] 功能3 - 返回 home 面板');
    setActiveTool(null);
    setToolPanelType('home');
    setSelectedImage(null);
    setSelectedText(null); // Add Text: 清理文本选中状态
    setSelectedArt(null); // Add Art: 清理艺术素材选中状态
    // 返回 Home 时清理画布选中，避免 selection:created 立刻把面板切回编辑态
    try {
      const c = fabricCanvasRef.current;
      if (c) {
        c.discardActiveObject();
        c.renderAll();
      }
    } catch (e) {
      console.warn('[DesignLab 5.0] discardActiveObject failed:', e);
    }
  };

  // Canvas 更新处理函数（EditUploadPanel 需要）
  const handleCanvasUpdate = () => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.renderAll();
    }
  };

  const handleStartCrop = (image: fabric.Image) => {
    console.log('[DesignLab 5.0] handleStartCrop called with:', image);
    if (image && image.type === 'image') {
      // Non-destructive: Save original source if not present
      const imgAny = image as any;
      if (!imgAny.originalSrc) {
        imgAny.originalSrc = image.getSrc();
      }
      setIsCropping(true);
      setCroppingImage(image);
    }
  };

  const handleResetUpload = () => {
    console.log('[DesignLab 5.0] handleResetUpload called');
    if (selectedImage) {
      const imgAny = selectedImage as any;
      if (imgAny.originalSrc) {
        const imgElement = new window.Image();
        imgElement.crossOrigin = "anonymous";
        imgElement.src = imgAny.originalSrc;
        imgElement.onload = () => {
          selectedImage.setElement(imgElement);
          selectedImage.set({
            width: imgElement.width,
            height: imgElement.height,
            dirty: true
          });
          selectedImage.setCoords();
          fabricCanvasRef.current?.renderAll();
          handleCanvasUpdate();
        };
      } else {
        console.warn('[DesignLab 5.0] No originalSrc found for reset');
      }
    }
  };

  // Add debug effect for binding
  useEffect(() => {
    console.log('[DesignLab 5.0] handleStartCrop bound:', !!handleStartCrop);
  }, [handleStartCrop]);

  const handleApplyCrop = (blob: Blob) => {
    if (!croppingImage || !fabricCanvasRef.current) return;

    const newUrl = URL.createObjectURL(blob);
    console.log('[DesignLab 5.0] Apply Crop:', newUrl);

    // Update fabric image
    const imgElement = new window.Image();
    imgElement.src = newUrl;
    imgElement.onload = () => {
      croppingImage.setElement(imgElement);
      // Reset dimensions to match new image
      croppingImage.set({
        width: imgElement.width,
        height: imgElement.height,
        dirty: true
      });

      croppingImage.setCoords();
      fabricCanvasRef.current?.renderAll();
      // Force update to ensure thumbnail updates if needed
      handleCanvasUpdate();
    };

    setIsCropping(false);
    setCroppingImage(null);
  };

  // Product List State for "Add Product" feature
  const [productList, setProductList] = useState<any[]>([]);

  // Sync productList with productInfo changes (for initial load)
  useEffect(() => {
    if (productInfo.productId && productList.length === 0) {
      console.log('[DesignLab 5.0] Initializing productList with first product:', productInfo.productName);
      setProductList([productInfo]);
    }
  }, [productInfo.productId]); // Only run when productId is set for the first time

  // Refinement: Product Carousel State
  const [productScrollIndex, setProductScrollIndex] = useState(0);
  const VISIBLE_PRODUCTS = 2;

  const handleScrollLeft = () => {
    setProductScrollIndex(prev => Math.max(0, prev - 1));
  };

  const handleScrollRight = () => {
    setProductScrollIndex(prev => Math.min(Math.max(0, productList.length - VISIBLE_PRODUCTS), prev + 1));
  };

  // Helper to sync productInfo with productList updates
  useEffect(() => {
    if (productInfo.productId) {
      setProductList(prev => {
        const index = prev.findIndex(p => p.productId === productInfo.productId);
        if (index !== -1) {
          const newList = [...prev];
          // Deep sync of baseImages and color info
          newList[index] = { ...prev[index], ...productInfo };
          return newList;
        }
        return prev;
      });
    }
  }, [productInfo.baseImages, productInfo.color, productInfo.colorId]);

  const updateProductList = (newProduct: any) => {
    setProductList(prev => {
      // Check if we are updating an existing product or adding a new one
      // For this feature, "Add Product" implies adding a NEW item to the bottom bar
      // But if we are just switching colors of current product, we update it in place.
      // However, handleProductSelect is called from Catalog, which implies "Add Product" intent contextually?
      // Let's assume handleProductSelect is ALWAYS "Add/Switch" based on if it's new.
      // Actually, the requirement is "Add Product" button triggers catalog -> Select -> NEW Product added.
      return [...prev, newProduct];
    });
  };

  // 5.0 Version: Handle product selection from catalog (Simplified V5)
  const handleProductSelect = async (productId: string) => {
    console.log('[DesignLab 5.0] Selected product ID from catalog:', productId);
    setIsCatalogModalOpen(false);

    try {
      // Fetch product detail (supports both slug and variantId via getProduct)
      // Fix: Use getProduct which handles slug -> id mapping correctly
      const productDetail = await getProduct(productId);

      if (productDetail) {
        const color = productDetail.color || 'White';
        const baseImages = productDetail.baseImages || getDefaultProductBaseImages(color);

        console.log('[DesignLab 5.0] Adding NEW product:', {
          name: productDetail.productName,
          color,
          variantId: productDetail.variantId,
        });

        const newProductInfo = {
          color,
          baseImages,
          productId: productDetail.productId,
          slug: productDetail.slug, // Capture slug
          colorId: productDetail.variantId, // CRITICAL: Set colorId from variantId
          productName: productDetail.productName,
          variants: (productDetail.variants || []).map(v => ({ ...v, color: v.color || '' })), // Fix type mismatch
          printableArea: productDetail.printableArea,
        };

        // Feature: Add/Change Product with Design Inheritance
        if (catalogMode === 'change') {
          console.log('[DesignLab 5.0] UPDATING current product in place:', productInfo.productName, '->', newProductInfo.productName);
          setProductList(prev => {
            const index = prev.findIndex(p => p.productId === productInfo.productId);
            if (index !== -1) {
              const newList = [...prev];
              newList[index] = newProductInfo;
              return newList;
            }
            return [...prev, newProductInfo]; // Fallback to add if not found
          });
          // Update product identity in existing design store
          updateProductInfo(newProductInfo.productId, newProductInfo.colorId);
        } else {
          console.log('[DesignLab 5.0] Adding NEW product to inventory');
          setProductList(prev => [...prev, newProductInfo]);
        }

        // 2. Set as active
        setProductInfo(newProductInfo);

        // 3. Design Inheritance:
        // By DEFAULT, we do NOT clear the canvas. The current objects (Text/Art) remain.
        // The background image (product) will be updated by the useEffect watching productInfo.
        // So inheritance is automatic for Art/Text.

        // Update URL to reflect the NEW active product
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.set('productId', productDetail.productId);
          if (productDetail.variantId) {
            url.searchParams.set('variantId', productDetail.variantId);
          }
          window.history.replaceState({}, '', url.toString());
        }
      }
    } catch (error) {
      console.error('[DesignLab 5.0] Failed to fetch product details for switching:', error);
    }
  };

  // 产品模块：产品选择处理 (Modified to handle Product object from other modals)
  const handleProductSelectObject = async (product: Product) => {
    await handleProductSelect(product.id);
  };

  // 颜色选择处理 - 简化版：仅依靠后台 Color Mapping 数据
  const handleColorSelect = async (colorName: string) => {
    console.log('[DesignLab 5.0] handleColorSelect (Simplified):', colorName);

    // 从 dynamicColors 中寻找匹配项
    const colorObj = dynamicColors.find(c =>
      c.name.toLowerCase() === colorName.toLowerCase()
    );

    if (colorObj && colorObj.imageUrls) {
      console.log('[DesignLab 5.0] Updating productInfo from color mapping:', colorName);

      let newBaseImages = {
        front: colorObj.imageUrls.front || productInfo.baseImages.front,
        back: colorObj.imageUrls.back || productInfo.baseImages.back,
        sleeve: colorObj.imageUrls.left_sleeve || colorObj.imageUrls.sleeve || productInfo.baseImages.sleeve,
        'left-sleeve': colorObj.imageUrls.left_sleeve || colorObj.imageUrls.sleeve,
        'right-sleeve': colorObj.imageUrls.right_sleeve || colorObj.imageUrls.sleeve,
      };

      // CRITICAL FIX: Force use local high-res assets for White sleeves (Demo Quality)
      if (colorName.toLowerCase() === 'white') {
        const defaults = getDefaultProductBaseImages('White');
        newBaseImages = {
          ...newBaseImages,
          'left-sleeve': defaults['left-sleeve'],
          'right-sleeve': defaults['right-sleeve'],
          'sleeve': defaults['sleeve']
        };
        console.log('[DesignLab 5.0] Force-applied high-res local assets for White sleeves (Color Select)');
      }

      setProductInfo(prev => ({
        ...prev,
        color: colorName,
        colorId: colorObj.externalColorId, // 使用映射表中的 ID
        baseImages: newBaseImages
      }));

      // 更新浏览器 URL
      if (typeof window !== 'undefined' && colorObj.externalColorId) {
        const url = new URL(window.location.href);
        url.searchParams.set('colorId', colorName);
        url.searchParams.set('variantId', colorObj.externalColorId);
        window.history.replaceState({}, '', url.toString());
      }
    } else {
      console.warn('[DesignLab 5.0] Color not found in mapping or missing images:', colorName);
    }
  };

  // 产品模块：+ Add Products 跳转处理
  const handleAddProducts = () => {
    if (typeof window !== 'undefined') {
      const currentUrl = new URL(window.location.href);
      const returnUrl = encodeURIComponent(currentUrl.pathname + currentUrl.search);
      window.location.href = `/products?returnToDesignLab=${returnUrl}`;
    }
  };

  // 保存模块：保存设计处理
  const handleSaveDesign = async (nameOverride?: string): Promise<string | null> => {
    console.log('[DesignLab 5.0] ===== SAVE START =====');
    console.log('[DesignLab 5.0] Current state:', {
      designName,
      designId,
      productInfo: {
        productId: productInfo.productId,
        colorId: productInfo.colorId,
        productName: productInfo.productName,
        firstVariantId: productInfo.variants?.[0]?.id,
      },
      effectiveProductVariantId,
    });

    if (!fabricCanvasRef.current) {
      console.error('[DesignLab 5.0] ❌ Canvas is not initialized');
      alert('Canvas is not initialized. Please wait a moment and try again.');
      return null;
    }

    try {
      console.log('[DesignLab 5.0] Calling saveDesignInternal with name:', nameOverride || designName);
      const savedDesignId = await saveDesignInternal(fabricCanvasRef.current, nameOverride);

      if (savedDesignId) {
        setDesignId(savedDesignId);
        console.log('[DesignLab 5.0] ✅ Design saved successfully:', savedDesignId);
        console.log('[DesignLab 5.0] ===== SAVE COMPLETE =====');
        return savedDesignId;
      } else {
        console.error('[DesignLab 5.0] ❌ Save returned null');
        console.log('[DesignLab 5.0] ===== SAVE FAILED =====');
        return null;
      }
    } catch (error: any) {
      console.error('[DesignLab 5.0] ❌ Design save failed:', error);
      console.error('[DesignLab 5.0] Error details:', {
        message: error.message,
        stack: error.stack,
      });
      alert(`Failed to save design: ${error.message || error} `);
      console.log('[DesignLab 5.0] ===== SAVE ERROR =====');
      throw error;
    }
  };

  // 保存模块：分享设计处理
  const handleShareDesign = async (shareUrl: string) => {
    console.log('[DesignLab 5.0] 设计分享:', shareUrl);
    // 可以添加埋点或其他处理
  };

  // 加载模块：加载已保存的设计
  const handleLoadDesign = async (designIdParam: string, sourceParam: string | null) => {
    try {
      setIsLoadingDesign(true); // 设置加载标志
      console.log('[DesignLab 5.0] ===== LOAD START =====');
      console.log('[DesignLab 5.0] Design ID:', designIdParam, 'Source:', sourceParam);

      // Load design data using useDesign hook
      const loadedDesign = await loadDesignInternal(designIdParam);

      if (!loadedDesign) {
        console.error('[DesignLab 5.0] ❌ Failed to load design');
        alert('Failed to load design. Please try again.');
        return;
      }

      console.log('[DesignLab 5.0] ✅ Design loaded:', loadedDesign.name);
      console.log('[DesignLab 5.0] Full design object:', loadedDesign);

      // Backend returns canvas data in 'canvas' field, not 'canvasSnapshot'
      const canvasData = loadedDesign.canvas || loadedDesign.canvasSnapshot;

      console.log('[DesignLab 5.0] Canvas data check:', {
        hasCanvasData: !!canvasData,
        canvasObjectCount: canvasData?.objects?.length || 0,
        fabricCanvasExists: !!fabricCanvasRef.current,
        canvasInitialized: canvasInitialized,
        canvasDataKeys: canvasData ? Object.keys(canvasData) : []
      });

      // Restore canvas objects - wait for canvas if needed
      if (canvasData) {
        if (!fabricCanvasRef.current) {
          console.log('[DesignLab 5.0] ⏳ Canvas not ready, waiting for initialization...');
          // Wait up to 3 seconds for canvas to initialize
          let retries = 30;
          while (!fabricCanvasRef.current && retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
            retries--;
          }

          if (!fabricCanvasRef.current) {
            console.error('[DesignLab 5.0] ❌ Canvas failed to initialize after waiting');
            alert('Canvas initialization failed. Please refresh and try again.');
            return;
          }
          console.log('[DesignLab 5.0] ✅ Canvas is now ready');
        }

        console.log('[DesignLab 5.0] Restoring canvas from snapshot...');
        const loadedObjects = await restoreCanvasFromSnapshot(fabricCanvasRef.current, canvasData);
        console.log('[DesignLab 5.0] ✅ Canvas restored with', loadedObjects.length, 'objects');

        // Apply custom controls to all loaded objects
        const canvas = fabricCanvasRef.current;
        console.log('[DesignLab 5.0] Applying custom controls to', loadedObjects.length, 'loaded objects');

        // Use the addIconControlsToObject function saved on canvas
        const addIconControls = (canvas as any).addIconControlsToObject;

        if (addIconControls) {
          loadedObjects.forEach((obj: any) => {
            // Skip product image layer
            if (obj.data?.layerType === 'product-image') {
              return;
            }

            // Apply custom controls to user-added objects
            if (obj.type === 'image' || obj.type === 'i-text' || obj.type === 'textbox') {
              addIconControls(obj);
              console.log('[DesignLab 5.0] Applied controls to:', obj.type);
            }
          });

          canvas.renderAll();
          console.log('[DesignLab 5.0] ✅ Custom controls applied to', loadedObjects.length, 'objects');
        } else {
          console.warn('[DesignLab 5.0] ⚠️ addIconControlsToObject not found on canvas');
        }
      } else {
        console.log('[DesignLab 5.0] ⚠️ No canvas data to restore - design may be empty');
      }

      // Update design name in UI
      if (loadedDesign.name) {
        setDesignName(loadedDesign.name);
        console.log('[DesignLab 5.0] ✅ Design name updated to:', loadedDesign.name);
      }

      // Load product info if available
      if (loadedDesign.variant) {
        console.log('[DesignLab 5.0] Updating product info from loaded design');
        setProductInfo(prev => ({
          ...prev,
          productId: loadedDesign.variant!.product.id,
          productName: loadedDesign.variant!.product.name,
          colorId: loadedDesign.variant!.id,
        }));
      }

      // Re-add product image since loadFromJSON cleared it
      // Get the current product image URL
      const imageUrl = productInfo.baseImages?.[currentView];
      if (imageUrl && fabricCanvasRef.current) {
        console.log('[DesignLab 5.0] Re-adding product image after design load');
        const isDefaultProduct = productInfo.productName?.includes('Design Lab Default Tee') || productInfo.productName?.includes('Loading');
        let finalImageUrl = imageUrl;
        let tintHex = '#ffffff';

        if (isDefaultProduct) {
          const colorData = PRODUCT_COLORS.find(c => c.name === productInfo.color);
          tintHex = colorData ? colorData.hex : '#ffffff';
          finalImageUrl = getDefaultProductBaseImages('White')[currentView];
        }

        addProductImageToCanvas(finalImageUrl, tintHex);

        // Re-add printable area guide after product image
        addPrintableArea(currentView);

        // Re-apply custom controls to all loaded objects (excluding product image)
        const allObjects = fabricCanvasRef.current.getObjects();
        const userObjects = allObjects.filter((obj: any) => obj.data?.layerType !== 'product-image' && obj.data?.layerType !== 'printable-area');
        console.log('[DesignLab 5.0] Re-applying custom controls to', userObjects.length, 'user objects');

        const addIconControls = (fabricCanvasRef.current as any).addIconControlsToObject;
        if (addIconControls) {
          userObjects.forEach((obj: any) => {
            addIconControls(obj);
          });
        }

        // Force canvas to render
        fabricCanvasRef.current.renderAll();
      }

      console.log('[DesignLab 5.0] ===== LOAD COMPLETE =====');
    } catch (error: any) {
      console.error('[DesignLab 5.0] ❌ Load error:', error);
      alert(`Failed to load design: ${error.message || error}`);
    } finally {
      setIsLoadingDesign(false); // 清除加载标志
    }
  };

  // 报价模块：获取报价数据（用于 GetPriceFlowModal）
  const getQuoteData = async () => {
    if (!fabricCanvasRef.current) {
      return {
        sidesUsed: [],
        layerCount: 0,
        hasUploadedImages: false,
      };
    }

    // 获取设计使用的面和图层数
    const objects = fabricCanvasRef.current.getObjects().filter((obj: fabric.Object) => {
      const objName = (obj as any).name;
      return (
        objName &&
        objName !== 'background' &&
        objName !== 'product-image-base' &&
        objName !== 'product-image'
      );
    });

    // 确定使用的面
    const sidesUsed: string[] = [];
    if (currentView === 'front' || objects.some((obj: any) => obj.name?.includes('front'))) {
      sidesUsed.push('front');
    }
    if (currentView === 'back' || objects.some((obj: any) => obj.name?.includes('back'))) {
      sidesUsed.push('back');
    }
    if (currentView === 'sleeve' || objects.some((obj: any) => obj.name?.includes('sleeve'))) {
      sidesUsed.push('sleeve');
    }
    if (currentView === 'left-sleeve' || objects.some((obj: any) => obj.name?.includes('left-sleeve'))) {
      sidesUsed.push('left-sleeve');
    }
    if (currentView === 'right-sleeve' || objects.some((obj: any) => obj.name?.includes('right-sleeve'))) {
      sidesUsed.push('right-sleeve');
    }
    // 如果没有对象，至少包含当前视图
    if (sidesUsed.length === 0 && (currentView as string) !== 'zoom') {
      sidesUsed.push(currentView);
    }

    // 检查是否有上传的图片
    const hasUploadedImages = objects.some((obj: any) => {
      const objName = obj.name || '';
      return objName.includes('upload') || objName.includes('image');
    });

    return {
      sidesUsed,
      layerCount: objects.length,
      hasUploadedImages,
    };
  };

  // 报价模块：加入购物车处理
  const handleAddToCart = async (orderData: any) => {
    try {
      let currentDesignId = designId;

      // 用户要求：Get Price -> Add to Cart 流程不强制通过 Save Modal 保存
      // 如果没有 designId，直接尝试加入购物车（后端可能需要支持或生成临时 ID）
      // 或者 handleAddToCart 在 "Get Price" 流程中被调用时，我们跳过保存检查

      /* 
      // 移除强制保存逻辑
      if (!currentDesignId && fabricCanvasRef.current) {
        // 先保存设计
        currentDesignId = await handleSaveDesign();
        if (!currentDesignId) {
          throw new Error('Failed to save design before adding to cart');
        }
      }
      */

      // Ensure we have a valid variant ID
      let finalVariantId = productInfo.colorId;
      if (!finalVariantId && productInfo.variants && productInfo.variants.length > 0) {
        finalVariantId = productInfo.variants[0].id;
        console.log('[handleAddToCart] Using first variant as fallback:', finalVariantId);
      }

      if (!finalVariantId) {
        // Ultimate fallback (e.g. for default tee if not fully loaded)
        finalVariantId = '5ead334f-82b1-4bc0-bb50-957541bb2070';
        console.warn('[handleAddToCart] Using hardcoded fallback variant ID:', finalVariantId);
      }

      // 调用加入购物车 API
      await addToCartInternal({
        designId: currentDesignId as string,
        productId: productInfo.productId,
        variantId: finalVariantId,
        quantity: orderData.totalQuantity || 1,
        sizeQuantities: orderData.sizeQuantities,
        orderingOptions: orderData.orderingOptions,
        quoteData: orderData.quoteData,
      });

      console.log('[DesignLab 5.0] 已加入购物车:', orderData);
    } catch (error) {
      console.error('[DesignLab 5.0] 加入购物车失败:', error);
      throw error;
    }
  };

  // 5.0 版本：步骤2 - Canvas 尺寸从全局常量获取

  // 5.0 版本：步骤2 - 添加商品图片到 canvas 的辅助函数
  // 修复：添加更详细的日志和错误处理
  // 5.0 版本：步骤2 - 添加商品图片到 canvas 的辅助函数
  // 修复：使用 /_next/image 代理加载以解决 CORS 问题，并确保新图片加载成功后再移除旧图片
  const addProductImageToCanvas = (imageUrl: string, tintColor?: string) => {
    if (!fabricCanvasRef.current || !fabricRef.current) {
      console.warn('[DesignLab 5.0] Cannot add product image: Canvas not initialized');
      return;
    }

    if (!imageUrl) {
      console.warn('[DesignLab 5.0] Cannot add product image: Image URL is empty');
      return;
    }

    console.log('[DesignLab 5.0] addProductImageToCanvas called:', { imageUrl });

    const fabric = fabricRef.current;
    const canvas = fabricCanvasRef.current;

    // 构建代理 URL 以解决 CORS 问题
    // 使用 Next.js 图片优化 API 作为代理
    const proxiedUrl = `/_next/image?url=${encodeURIComponent(imageUrl)}&w=1200&q=90`;
    console.log('[DesignLab 5.0] Using proxied URL:', proxiedUrl);

    // 使用原生 Image 对象加载，然后转换为 Fabric Image，更可靠
    const imgElement = new window.Image();
    // 即使是 same-origin (代理后)，设置 anonymous 也是安全的，且对于导出 canvas 是必需的
    imgElement.crossOrigin = 'anonymous';
    imgElement.src = proxiedUrl;

    let imageLoaded = false;
    const timeoutId = setTimeout(() => {
      if (!imageLoaded) {
        console.error('[DesignLab 5.0] ❌ Image load timeout after 15 seconds');
      }
    }, 15000);

    imgElement.onload = () => {
      if (imageLoaded) {
        return;
      }
      imageLoaded = true;
      clearTimeout(timeoutId);

      if (!fabricCanvasRef.current || !fabricRef.current) {
        return;
      }

      console.log('[DesignLab 5.0] ✅ Product image loaded:', {
        src: imgElement.src,
        naturalWidth: imgElement.naturalWidth,
        naturalHeight: imgElement.naturalHeight,
      });

      try {
        if (!fabric.Image || typeof fabric.Image !== 'function') {
          console.error('[DesignLab 5.0] ❌ fabric.Image is not available!');
          return;
        }

        // 新图片加载成功后，再移除旧图片
        const oldProductImage = canvas.getObjects().find((obj: any) => obj.name === 'product-image-base');
        if (oldProductImage) {
          canvas.remove(oldProductImage);
        }

        const fabricImg = new fabric.Image(imgElement);

        if (!fabricCanvasRef.current) {
          return;
        }

        console.log('[DesignLab 5.0] ✅ Fabric image created:', {
          fabricWidth: fabricImg.width,
          fabricHeight: fabricImg.height,
        });

        // 缩放图片以适应 canvas（现在 canvas 也是 1200，比例应该是 1）
        const scale = Math.max(
          CANVAS_WIDTH / (fabricImg.width || 1),
          CANVAS_HEIGHT / (fabricImg.height || 1)
        );

        console.log('[DesignLab 5.0] Image scale factors:', {
          canvasW: CANVAS_WIDTH,
          imgW: fabricImg.width,
          calculatedScale: scale
        });

        fabricImg.set({
          left: CANVAS_WIDTH / 2,
          top: CANVAS_HEIGHT / 2,
          originX: 'center',
          originY: 'center',
          scaleX: scale,
          scaleY: scale,
          selectable: false,
          evented: false,
          data: {
            layerType: 'product-image',
            zIndex: 0,
          },
          name: 'product-image-base',
        });

        // Apply tinting filter if requested
        if (tintColor && tintColor.toLowerCase() !== '#ffffff') {
          console.log('[DesignLab 5.0] Applying tint filter:', tintColor);
          fabricImg.filters.push(new (fabric as any).filters.BlendColor({
            color: tintColor,
            mode: 'multiply',
            alpha: 1.0
          }));
          fabricImg.applyFilters();
        }

        console.log('[DesignLab 5.0] Adding image to canvas...');
        fabricCanvasRef.current.add(fabricImg);

        // 使用 sendObjectToBack 方法将图片置于底层
        if (typeof (fabricCanvasRef.current as any).sendObjectToBack === 'function') {
          (fabricCanvasRef.current as any).sendObjectToBack(fabricImg);
        } else if (typeof (fabricCanvasRef.current as any).sendToBack === 'function') {
          (fabricCanvasRef.current as any).sendToBack(fabricImg);
        } else {
          const objects = fabricCanvasRef.current.getObjects();
          const index = objects.indexOf(fabricImg);
          if (index > 0) {
            fabricCanvasRef.current.moveObjectTo(fabricImg, 0);
          }
        }

        // 强制渲染
        fabricCanvasRef.current.renderAll();

      } catch (err: any) {
        console.error('[DesignLab 5.0] Failed to create fabric image:', err);
      }
    };

    imgElement.onerror = (err) => {
      console.error('[DesignLab 5.0] ❌ Failed to load product image:', err);
      // 如果代理失败，可以尝试直接加载（虽然可能会有 CORS 问题，但作为最后的尝试）
      if (imgElement.src.startsWith('/_next/image')) {
        console.warn('[DesignLab 5.0] Proxy failed, falling back to direct URL (CORS risk)...');
        // 注意：这里可能会无限递归，所以要小心。真正的实现应该在递归调用时传递标志。
        // 为简单起见，这里不再递归，只是记录错误。旧图片会被保留。
      }
    };
  };

  // 添加动态打印区域参考线
  // Updated to match Custom Ink: thin gray lines, view-specific, visible only on interaction
  const addPrintableArea = (view: 'front' | 'back' | 'sleeve' | 'left-sleeve' | 'right-sleeve') => {
    if (!fabricCanvasRef.current || !fabricRef.current) return;
    const fabric = fabricRef.current;
    const canvas = fabricCanvasRef.current;

    // 清除旧的参考线
    const existing = canvas.getObjects().find((obj: any) => obj.name === 'printable-area-group');
    if (existing) {
      canvas.remove(existing);
    }

    // Determine dimensions based on view and product configuration
    const getSafePrintableArea = (v: string) => {
      const config = productInfo.printableArea;
      // Default fallback
      let width = DEFAULT_PRINTABLE_WIDTH;
      let height = DEFAULT_PRINTABLE_HEIGHT;
      let offsetX = 0;
      let offsetY = 0;

      if (v === 'sleeve' || v === 'left-sleeve' || v === 'right-sleeve') {
        width = DEFAULT_SLEEVE_WIDTH;
        height = DEFAULT_SLEEVE_HEIGHT;
      }

      // Override if product has custom configuration
      if (config) {
        if (v === 'front' && config.front) return { ...config.front, offsetX: 0, offsetY: 0 }; // Usually centered by default logic, but let's check config format
        if (v === 'back' && config.back) return { ...config.back, offsetX: 0, offsetY: 0 };
        if ((v === 'sleeve' || v === 'left-sleeve' || v === 'right-sleeve') && config.sleeve) return { ...config.sleeve, offsetX: 0, offsetY: 0 };
      }

      return { width, height, offsetX, offsetY };
    };

    const area = getSafePrintableArea(view);
    console.log('[DesignLab 5.0] Updating printable area guide for view:', view, area);

    const groupObjects: any[] = [];

    // 1. Main Printable Area Box
    const mainRect = new fabric.Rect({
      left: 0,
      top: 0,
      width: area.width,
      height: area.height,
      originX: 'center',
      originY: 'center',
      fill: 'transparent',
      stroke: '#808080', // Dark gray border
      strokeWidth: 2,
      selectable: false,
      evented: false,
    });
    groupObjects.push(mainRect);

    // 2. View Label (Top-Left of Main Box)
    let labelText = 'Front';
    if (view === 'back') labelText = 'Back';
    if (view === 'left-sleeve' || view === 'sleeve') labelText = 'L.Sleeve';
    if (view === 'right-sleeve') labelText = 'R.Sleeve';

    const mainLabel = new fabric.Text(labelText, {
      left: -area.width / 2 + 10,
      top: -area.height / 2 + 10,
      fontSize: 24,
      fontWeight: 'bold',
      fontFamily: 'Arial',
      fill: '#808080',
      originX: 'left',
      originY: 'top',
      selectable: false,
      evented: false,
    });
    groupObjects.push(mainLabel);

    // 3. Left Chest Area (Front View Only)
    if (view === 'front') {
      const leftChestRect = new fabric.Rect({
        left: LEFT_CHEST_OFFSET_X, // Offset from center
        top: LEFT_CHEST_OFFSET_Y,
        width: LEFT_CHEST_WIDTH,
        height: LEFT_CHEST_HEIGHT,
        originX: 'center',
        originY: 'center',
        fill: 'transparent',
        stroke: '#808080', // Dark gray border
        strokeWidth: 2, // 2px width
        selectable: false,
        evented: false,
      });

      const leftChestLabel = new fabric.Text('Left Chest', {
        left: LEFT_CHEST_OFFSET_X - LEFT_CHEST_WIDTH / 2 + 10,
        top: LEFT_CHEST_OFFSET_Y - LEFT_CHEST_HEIGHT / 2 + 10,
        fontSize: 18, // Scaled down (54 * 0.3 = 16.2 -> 18)
        fontWeight: 'bold',
        fontFamily: 'Arial',
        fill: '#808080', // Dark gray text
        originX: 'left',
        originY: 'top',
        selectable: false,
        evented: false,
      });

      groupObjects.push(leftChestRect, leftChestLabel);
    }

    // Offset Logic:
    // Left Sleeve: +100 (Right)
    // Right Sleeve: -100 (Left) -> 200 units left of Left Sleeve
    let offsetX = 0;
    if (view === 'sleeve' || view === 'left-sleeve') offsetX = 100;
    if (view === 'right-sleeve') offsetX = -100;

    const group = new fabric.Group(groupObjects, {
      left: CANVAS_WIDTH / 2 - 6 + offsetX,
      top: CANVAS_HEIGHT / 2, // Centered vertically
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
      visible: false, // Initially hidden, shown only on interaction
      name: 'printable-area-group',
      data: { layerType: 'guide' } // Identify as guide
    });

    canvas.add(group);

    // Ensure it's above product image but below designs
    // We'll rely on sendToBack for product image, so this should naturally be above it. 
    // If needed, we can use moveObjectTo.
    canvas.requestRenderAll();
  };

  // 监听视图变化更新参考线
  useEffect(() => {
    addPrintableArea(currentView);
  }, [currentView, productInfo.printableArea]); // Added printableArea dependency

  // 5.0 版本：步骤2 - 初始化 Fabric.js Canvas
  useEffect(() => {
    if (!canvasRef.current) {
      console.warn('[DesignLab 5.0] Canvas ref not available');
    }

    const canvasElement = canvasRef.current;
    let isMounted = true;

    const initCanvas = async () => {
      try {
        // 动态导入 fabric
        const fabricModule = await import('fabric');
        if (!isMounted || !canvasRef.current) {
          // 如果组件已卸载，返回 undefined
          return undefined;
        }

        // 获取 fabric 对象
        const fabric = (fabricModule as any).fabric || (fabricModule as any).default || fabricModule;

        if (!fabric || typeof fabric.Canvas !== 'function') {
          throw new Error('Fabric.js module is not properly loaded.');
        }

        // 存储 fabric 对象
        fabricRef.current = fabric;

        // 创建 Fabric Canvas
        // 修复：Fabric.js 需要正确的容器尺寸来缩放显示
        // 添加 preserveObjectStacking 等选项（参考 4.0 版本）
        const fabricCanvas = new fabric.Canvas(canvasElement, {
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          backgroundColor: 'transparent',
          preserveObjectStacking: true, // 保持对象堆叠顺序（参考 4.0 版本）
          selection: true, // 启用选择功能
          stateful: true, // 启用状态管理
        });

        // 修复：Fabric.js 会自动创建 .canvas-container，需要确保它使用正确的 CSS 类
        // 修复：关键问题 - Fabric.js 的 canvas-container 会设置 inline style width/height 为逻辑尺寸
        // 我们需要覆盖这些 inline style，让容器自适应父元素
        const canvasContainer = canvasElement.parentElement;
        if (canvasContainer && canvasContainer.classList.contains('canvas-container')) {
          // 添加自定义类，确保 CSS 样式生效
          canvasContainer.classList.add('dl-canvas__fabric-container');

          // 关键修复：覆盖 Fabric.js 设置的 inline style
          // Fabric.js 会设置 width: 4000px, height: 4800px（逻辑尺寸）
          // 但我们需要容器自适应父元素（100%），逻辑尺寸应该只用于 canvas 元素本身
          canvasContainer.style.width = '100%';
          canvasContainer.style.height = '100%';
          canvasContainer.style.maxWidth = '100%';
          canvasContainer.style.maxHeight = '100%';

          console.log('[DesignLab 5.0] Canvas container found and styled:', {
            container: canvasContainer,
            width: canvasContainer.style.width,
            height: canvasContainer.style.height,
            computedWidth: window.getComputedStyle(canvasContainer).width,
            computedHeight: window.getComputedStyle(canvasContainer).height,
          });
        }

        fabricCanvasRef.current = fabricCanvas;

        // 初始化打印区域参考线 (Initial call)
        addPrintableArea(currentView);

        // 暴露 canvas 到 window，便于 Playwright/DevTools 自动化测试读取对象与控件状态
        // 注意：不包含任何敏感信息，仅保障测试可观测性
        (window as any).fabricCanvas = fabricCanvas;
        (window as any).DesignLabCanvas = { getCanvas: () => fabricCanvas };

        // 步骤2：设置选中对象的边框样式（灰色，2px）
        // 步骤1：确保基本拖拽功能可用（Fabric.js 默认支持，只需确保 selectable 和 evented 为 true）
        if (fabric.Object) {
          fabric.Object.prototype.set({
            borderColor: '#808080', // 步骤2：灰色边框
            borderScaleFactor: 2, // 步骤2：边框宽度 2px（默认 1px × 2 = 2px）
            // 注释掉角点和旋转控件相关设置，简化初始实现
            // cornerColor: '#0066CC',
            // cornerSize: 28,
            // transparentCorners: false,
            // cornerStyle: 'circle',
            // rotatingPointOffset: 70,
            // hasRotatingPoint: true,
            // touchCornerSize: 28,
          });
          console.log('[DesignLab 5.0] Fabric.js 基本样式已设置（灰色边框 2px）');
        }

        console.log('[DesignLab 5.0] Fabric canvas initialized:', {
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          isMounted,
        });

        console.log('[DesignLab 5.0] ✅ About to set canvasInitialized to true');
        setCanvasInitialized(true);
        (window as any).canvasInitialized = true;

        // 保存图层顺序的 Map（用于防止拖拽时自动 bringToFront）
        const layerOrderMap = new Map<fabric.Object, number>();

        // Interaction Event Listeners for Guide Visibility
        const showGuides = () => {
          const canvas = fabricCanvasRef.current;
          if (!canvas) return;
          const group = canvas.getObjects().find((obj: any) => obj.name === 'printable-area-group');
          if (group && !group.visible) {
            group.visible = true;
            canvas.requestRenderAll();
          }
        };

        const hideGuides = () => {
          const canvas = fabricCanvasRef.current;
          if (!canvas) return;
          const group = canvas.getObjects().find((obj: any) => obj.name === 'printable-area-group');
          if (group && group.visible) {
            group.visible = false;
            canvas.requestRenderAll();
          }
        };

        // Boundary constraint helper
        const getPrintableAreaBounds = (view: string) => {
          // Correct for asymmetrical center offset (-6)
          const centerX = CANVAS_WIDTH / 2 - 6;
          const centerY = CANVAS_HEIGHT / 2;

          let width = DEFAULT_PRINTABLE_WIDTH;
          let height = DEFAULT_PRINTABLE_HEIGHT;

          if (view === 'left-sleeve' || view === 'right-sleeve' || view === 'sleeve') {
            width = DEFAULT_SLEEVE_WIDTH;
            height = DEFAULT_SLEEVE_HEIGHT;
          }

          // Use dynamic config if available
          const config = productInfo.printableArea;
          if (config) {
            if (view === 'front' && config.front) { width = config.front.width; height = config.front.height; }
            else if (view === 'back' && config.back) { width = config.back.width; height = config.back.height; }
            else if ((view === 'sleeve' || view === 'left-sleeve' || view === 'right-sleeve') && config.sleeve) { width = config.sleeve.width; height = config.sleeve.height; }
          }

          return {
            left: centerX - width / 2,
            top: centerY - height / 2,
            right: centerX + width / 2,
            bottom: centerY + height / 2,
          };
        };

        // Enhanced object:moving with boundary constraints
        fabricCanvas.on('object:moving', (e: any) => {
          showGuides();

          const obj = e.target;
          if (!obj) return;

          // Skip constraint for product image and guides
          const layerType = obj.data?.layerType;
          if (layerType === 'product-image' || layerType === 'guide') return;

          // Get printable area boundaries
          const bounds = getPrintableAreaBounds(currentView);

          // Get object bounding rectangle (accounts for rotation, scale, etc.)
          const objBounds = obj.getBoundingRect(true, true);

          // Calculate how much the object exceeds the boundaries
          const exceedsLeft = bounds.left - objBounds.left;
          const exceedsTop = bounds.top - objBounds.top;
          const exceedsRight = objBounds.left + objBounds.width - bounds.right;
          const exceedsBottom = objBounds.top + objBounds.height - bounds.bottom;

          // Adjust object position to constrain within bounds
          // Use clamping to ensure objects never move outside (Custom Ink style)
          const boundsWidth = bounds.right - bounds.left;
          const boundsHeight = bounds.bottom - bounds.top;

          if (objBounds.width <= boundsWidth) {
            if (objBounds.left < bounds.left) obj.left! += (bounds.left - objBounds.left);
            if (objBounds.right > bounds.right) obj.left! -= (objBounds.right - bounds.right);
          } else {
            // Optimization for oversized images: prioritize keeping them centered within the overflow
            if (objBounds.left > bounds.left) obj.left! -= (objBounds.left - bounds.left);
            if (objBounds.right < bounds.right) obj.left! += (bounds.right - objBounds.right);
          }

          if (objBounds.height <= boundsHeight) {
            if (objBounds.top < bounds.top) obj.top! += (bounds.top - objBounds.top);
            if (objBounds.bottom > bounds.bottom) obj.top! -= (objBounds.bottom - bounds.bottom);
          } else {
            if (objBounds.top > bounds.top) obj.top! -= (objBounds.top - bounds.top);
            if (objBounds.bottom < bounds.bottom) obj.top! += (bounds.bottom - objBounds.bottom);
          }

          obj.setCoords();
        });

        // Snap object back to bounds after drag/scale/rotate completes
        fabricCanvas.on('object:modified', (e: any) => {
          hideGuides();

          const obj = e.target;
          if (!obj) return;

          // Skip constraint for product image and guides
          const layerType = obj.data?.layerType;
          if (layerType === 'product-image' || layerType === 'guide') return;

          // Get printable area boundaries
          const bounds = getPrintableAreaBounds(currentView);

          // Get object bounding rectangle
          const objBounds = obj.getBoundingRect(true, true);

          // Calculate how much the object exceeds the boundaries
          const exceedsLeft = bounds.left - objBounds.left;
          const exceedsTop = bounds.top - objBounds.top;
          const exceedsRight = objBounds.left + objBounds.width - bounds.right;
          const exceedsBottom = objBounds.top + objBounds.height - bounds.bottom;

          // Snap object position to constrain within bounds
          if (exceedsLeft > 0) {
            obj.left = obj.left! + exceedsLeft;
          }
          if (exceedsRight > 0) {
            obj.left = obj.left! - exceedsRight;
          }
          if (exceedsTop > 0) {
            obj.top = obj.top! + exceedsTop;
          }
          if (exceedsBottom > 0) {
            obj.top = obj.top! - exceedsBottom;
          }

          obj.setCoords();
          fabricCanvas.requestRenderAll();
        });

        fabricCanvas.on('object:scaling', showGuides);
        fabricCanvas.on('object:rotating', showGuides);
        fabricCanvas.on('mouse:up', hideGuides); // Ensure it hides on mouse up even if not modified (e.g. just click)
        fabricCanvas.on('selection:cleared', hideGuides);

        fabricCanvas.on('selection:created', (e: any) => {
          const activeObject = e.selected?.[0] || fabricCanvas.getActiveObject();
          if (!activeObject) return;

          const objectName = (activeObject as any).name || '';
          const layerType = (activeObject as any).data?.layerType;

          // -------- Art Image (优先检查) --------
          if (layerType === 'art' || objectName.startsWith('art_')) {
            const artImage = activeObject as fabric.Image;
            console.log('[DesignLab 5.0] Art 对象被选中，切换到 edit panel');
            setSelectedArt(artImage);
            setSelectedImage(null);
            setSelectedText(null);
            setToolPanelType('edit-art');
            setActiveTool('art');
            fabricCanvas.renderAll();
            return;
          }

          // -------- Upload Image (保持原逻辑) --------
          if (activeObject.type === 'image') {
            const fabricImage = activeObject as fabric.Image;
            // 检查是否是上传的图片（不是商品底图）
            if ((fabricImage as any).name && (fabricImage as any).name.startsWith('image_')) {
              // 步骤2：确保选中时边框为灰色 2px
              fabricImage.set({
                hasBorders: true,
                borderColor: '#808080', // 灰色边框
                borderScaleFactor: 2, // 2px 宽度
              });
              fabricImage.setCoords();

              // 保存当前图层顺序
              const allObjects = fabricCanvas.getObjects();
              const currentIndex = allObjects.indexOf(fabricImage);
              layerOrderMap.set(fabricImage, currentIndex);
              console.log('[DesignLab 5.0] 上传图片被选中，切换到 edit panel，保存图层顺序:', currentIndex);

              // 延迟恢复图层顺序（Fabric.js 可能在 setActiveObject 时自动 bringToFront）
              setTimeout(() => {
                const savedIndex = layerOrderMap.get(fabricImage);
                if (savedIndex !== undefined) {
                  const currentIndex = fabricCanvas.getObjects().indexOf(fabricImage);
                  if (currentIndex !== savedIndex) {
                    console.log('[DesignLab 5.0] 恢复图层顺序:', { from: currentIndex, to: savedIndex });
                    fabricCanvas.moveObjectTo(fabricImage, savedIndex);
                    fabricCanvas.renderAll();
                  }
                }
              }, 0);

              fabricCanvas.renderAll();
              setSelectedImage(fabricImage);
              setSelectedText(null); // Add Text: 切换到上传编辑时清理文本
              setSelectedArt(null); // Add Art: 切换到上传编辑时清理艺术素材
              setToolPanelType('edit-upload');
              return;
            }
          }

          // -------- Art Image (新增) --------
          if (activeObject.type === 'image') {
            const objName = (activeObject as any).name || '';
            const layerType = (activeObject as any).data?.layerType;
            // Add Art: 仅对 art_* 或 layerType=art 的对象切换到 Edit Art
            if (objName.startsWith('art_') || layerType === 'art') {
              const artImage = activeObject as fabric.Image;
              artImage.set({
                hasBorders: true,
                borderColor: '#808080',
                borderScaleFactor: 2,
              });
              artImage.setCoords();
              setSelectedArt(artImage);
              setSelectedImage(null);
              setSelectedText(null);
              setToolPanelType('edit-art');
              setActiveTool('art');
              fabricCanvas.renderAll();
              return;
            }
          }

          // -------- Text (新增) --------
          if (activeObject.type === 'i-text' || activeObject.type === 'textbox' || activeObject.type === 'text') {
            const objName = (activeObject as any).name || '';
            const layerType = (activeObject as any).data?.layerType;
            // Add Text: 仅对 text_* 或 layerType=text 的对象切换到 Edit Text
            if (objName.startsWith('text_') || layerType === 'text') {
              setSelectedText(activeObject as any);
              setSelectedImage(null);
              setSelectedArt(null); // Add Art: 切换到文本编辑时清理艺术素材
              setToolPanelType('edit-text');
            }
          }
        });

        fabricCanvas.on('selection:updated', (e: any) => {
          const activeObject = e.selected?.[0] || fabricCanvas.getActiveObject();
          if (!activeObject) return;

          const objectName = (activeObject as any).name || '';
          const layerType = (activeObject as any).data?.layerType;

          // -------- Art Image (优先检查) --------
          if (layerType === 'art' || objectName.startsWith('art_')) {
            const artImage = activeObject as fabric.Image;
            console.log('[DesignLab 5.0] Art 对象选择更新，切换到 edit panel');
            setSelectedArt(artImage);
            setSelectedImage(null);
            setSelectedText(null);
            setToolPanelType('edit-art');
            setActiveTool('art');
            fabricCanvas.renderAll();
            return;
          }

          // Upload Image
          if (activeObject.type === 'image') {
            const fabricImage = activeObject as fabric.Image;
            if ((fabricImage as any).name && (fabricImage as any).name.startsWith('image_')) {
              // 步骤2：确保选中时边框为灰色 2px
              fabricImage.set({
                hasBorders: true,
                borderColor: '#808080', // 灰色边框
                borderScaleFactor: 2, // 2px 宽度
              });
              fabricImage.setCoords();

              // 保存当前图层顺序
              const allObjects = fabricCanvas.getObjects();
              const currentIndex = allObjects.indexOf(fabricImage);
              layerOrderMap.set(fabricImage, currentIndex);

              // 延迟恢复图层顺序
              setTimeout(() => {
                const savedIndex = layerOrderMap.get(fabricImage);
                if (savedIndex !== undefined) {
                  const currentIndex = fabricCanvas.getObjects().indexOf(fabricImage);
                  if (currentIndex !== savedIndex) {
                    fabricCanvas.moveObjectTo(fabricImage, savedIndex);
                    fabricCanvas.renderAll();
                  }
                }
              }, 0);

              fabricCanvas.renderAll();
              console.log('[DesignLab 5.0] 上传图片选择更新，切换到 edit panel');
              setSelectedImage(fabricImage);
              setSelectedText(null);
              setSelectedArt(null); // Add Art: 切换到上传编辑时清理艺术素材
              setToolPanelType('edit-upload');
              return;
            }
          }

          // Art Image
          if (activeObject.type === 'image') {
            const objName = (activeObject as any).name || '';
            const layerType = (activeObject as any).data?.layerType;
            // Add Art: 仅对 art_* 或 layerType=art 的对象切换到 Edit Art
            if (objName.startsWith('art_') || layerType === 'art') {
              const artImage = activeObject as fabric.Image;
              artImage.set({
                hasBorders: true,
                borderColor: '#808080',
                borderScaleFactor: 2,
              });
              artImage.setCoords();
              setSelectedArt(artImage);
              setSelectedImage(null);
              setSelectedText(null);
              setToolPanelType('edit-art');
              setActiveTool('art');
              fabricCanvas.renderAll();
              return;
            }
          }

          // Text
          if (activeObject.type === 'i-text' || activeObject.type === 'textbox' || activeObject.type === 'text') {
            const objName = (activeObject as any).name || '';
            const layerType = (activeObject as any).data?.layerType;
            if (objName.startsWith('text_') || layerType === 'text') {
              setSelectedText(activeObject as any);
              setSelectedImage(null);
              setSelectedArt(null); // Add Art: 切换到文本编辑时清理艺术素材
              setToolPanelType('edit-text');
            }
          }
        });

        fabricCanvas.on('selection:cleared', (e: any) => {
          console.log('[DesignLab 5.0] 选择已清除');
          // 如果当前在 edit panel，清除选中状态但保持面板（用户可以继续编辑其他对象）
          // 或者切换回 home 面板（根据需求决定）
          // setSelectedImage(null);
          // setToolPanelType('home');
        });

        // 添加缩放和旋转事件监听，用于调试
        // 添加更详细的缩放调试信息
        fabricCanvas.on('object:scaling', (e: any) => {
          const obj = e.target;
          console.log('[DesignLab 5.0] 🔍 对象缩放事件:', {
            objectName: (obj as any).name,
            objectType: obj.type,
            scaleX: obj.scaleX,
            scaleY: obj.scaleY,
            width: obj.width,
            height: obj.height,
            hasControls: obj.hasControls,
            hasBorders: obj.hasBorders,
            selectable: obj.selectable,
            evented: obj.evented,
            lockScalingX: obj.lockScalingX,
            lockScalingY: obj.lockScalingY,
            lockUniScaling: obj.lockUniScaling,
            cornerSize: obj.cornerSize,
          });
        });

        // 生产环境修复：禁用“鼠标控件调试光标覆盖”
        // 根因：此调试逻辑会用近似距离计算并强制设置 canvas cursor，导致控件图标的真实 hover/click 命中行为被“错位覆盖”（表现为离图标约 100px 才触发手势变化）
        const ENABLE_MOUSE_DEBUG = process.env.NODE_ENV !== 'production';

        // Debug 辅助：仅在显式 query 参数开启时暴露 canvas/fabric，便于生产环境用 DevTools 验证 hover 命中
        // 使用方式：在 URL 加上 ?dlDebug=1
        try {
          const qs = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
          const enabled = !!qs && qs.get('dlDebug') === '1';
          if (enabled) {
            (window as any).__DL5_CANVAS__ = fabricCanvas;
            (window as any).__DL5_FABRIC__ = fabric;

            // 提供便捷方法：添加一个测试对象并应用控件 + 程序化探测控件 hover 的 cursor
            (window as any).__DL5_DEBUG__ = {
              addTestObject: () => {
                try {
                  const RectCtor: any = (fabric as any).Rect;
                  if (!RectCtor) return { ok: false, reason: 'fabric.Rect not available' };
                  const rect = new RectCtor({
                    left: 2000,
                    top: 2400,
                    width: 600,
                    height: 600,
                    fill: 'rgba(37,99,235,0.25)',
                    stroke: '#2563eb',
                    strokeWidth: 10,
                    originX: 'center',
                    originY: 'center',
                    selectable: true,
                    evented: true,
                    hasControls: true,
                    hasBorders: true,
                    borderColor: '#808080',
                    borderScaleFactor: 2,
                    name: `debug_${Date.now()} `,
                    data: { layerType: 'upload' },
                  });
                  fabricCanvas.add(rect);
                  if (typeof (fabricCanvas as any).addIconControlsToObject === 'function') {
                    (fabricCanvas as any).addIconControlsToObject(rect);
                  }
                  fabricCanvas.setActiveObject(rect);
                  rect.setCoords?.();
                  fabricCanvas.requestRenderAll();
                  return { ok: true, name: (rect as any).name };
                } catch (e: any) {
                  return { ok: false, reason: String(e?.message || e) };
                }
              },
              probeControlCursors: () => {
                const active = fabricCanvas.getActiveObject() as any;
                const upper = (fabricCanvas as any).upperCanvasEl as any;
                if (!active || !upper) return { ok: false, reason: 'no active object / upperCanvasEl' };
                try {
                  active.setCoords?.();
                  const o = active.oCoords;
                  const rect = upper.getBoundingClientRect();
                  // 修复：oCoords 使用的是 canvas 内部坐标（结合 viewportTransform），但还需要考虑 canvas 在页面上的 CSS 缩放比例
                  // 否则会得到远超屏幕范围的 clientX/clientY（导致探测点落在画布外 → cursor 永远 default）
                  const scaleX = rect.width / (upper.width || rect.width || 1);
                  const scaleY = rect.height / (upper.height || rect.height || 1);
                  const toClient = (pt: any) => {
                    return {
                      clientX: rect.left + pt.x * scaleX,
                      clientY: rect.top + pt.y * scaleY,
                    };
                  };

                  const points = [
                    // 优先用自定义控件坐标（如果 Fabric 写入了 oCoords）
                    { name: 'deleteIcon', pt: o?.deleteIcon },
                    { name: 'duplicateIcon', pt: o?.duplicateIcon },
                    { name: 'resizeIcon', pt: o?.resizeIcon },
                    // fallback：对象四角（用于对比）
                    { name: 'tl', pt: o?.tl },
                    { name: 'bl', pt: o?.bl },
                    { name: 'br', pt: o?.br },
                  ].filter((c) => c.pt && typeof c.pt.x === 'number' && typeof c.pt.y === 'number');

                  const fire = (pos: any) => {
                    upper.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: pos.clientX, clientY: pos.clientY }));
                    return upper.style.cursor || 'unset';
                  };

                  const results: any[] = [];
                  for (const c of points) {
                    const center = toClient(c.pt);
                    const near = fire(center);
                    const far = fire({ clientX: center.clientX + 120, clientY: center.clientY });
                    results.push({ point: c.name, center, cursorAtCenter: near, cursorAtCenterPlus120px: far });
                  }
                  return { ok: true, oCoordsKeys: Object.keys(o || {}), results };
                } catch (e: any) {
                  return { ok: false, reason: String(e?.message || e) };
                }
              },
            };

            console.log('[DesignLab 5.0] ✅ dlDebug enabled: window.__DL5_DEBUG__ available');
          }
        } catch (e) {
          // ignore
        }

        // 添加鼠标悬停在对象上的事件监听（仅调试）
        if (ENABLE_MOUSE_DEBUG) {
          fabricCanvas.on('mouse:over', (e: any) => {
            const obj = e.target;
            if (obj) {
              console.log('[DesignLab 5.0] 🖱️ 鼠标悬停在对象上:', {
                objectName: (obj as any).name,
                objectType: obj.type,
                hasControls: obj.hasControls,
              });
            }
          });
        }

        // 添加鼠标移动监听（仅调试）
        const handleGlobalMouseMove = (e: MouseEvent) => {
          if (!ENABLE_MOUSE_DEBUG) return;
          if (!fabricCanvasRef.current) return;

          const canvas = fabricCanvasRef.current;
          const canvasElement = canvas.getElement();
          if (!canvasElement) return;

          // 检查鼠标是否在 canvas 区域内
          const rect = canvasElement.getBoundingClientRect();
          const canvasX = e.clientX - rect.left;
          const canvasY = e.clientY - rect.top;

          // 转换为画布逻辑坐标
          const pointer = canvas.getPointer({ clientX: e.clientX, clientY: e.clientY } as any);

          // 检测鼠标是否在控件上
          let onControl = false;
          let controlType: string | null = null;
          let targetObject: string | null = null;

          // 检查是否有对象被选中
          const activeObj = canvas.getActiveObject();

          // 如果有对象被选中，检查鼠标是否在控件的交互区域内
          if (activeObj && activeObj.selectable && activeObj.hasControls) {
            // 获取对象的控制点位置
            const cornerSize = (activeObj as any).cornerSize || 28;
            // 使用 oCoords（对象坐标缓存）或重新计算
            let coords: any;
            try {
              coords = (activeObj as any).oCoords || activeObj.getCoords();
            } catch (e) {
              // 如果获取坐标失败，先设置坐标再获取
              activeObj.setCoords();
              coords = (activeObj as any).oCoords || activeObj.getCoords();
            }

            // 检查鼠标是否在任何一个角点上
            const corners = [
              { name: 'tl', point: coords.tl }, // top-left
              { name: 'tr', point: coords.tr }, // top-right
              { name: 'bl', point: coords.bl }, // bottom-left
              { name: 'br', point: coords.br }, // bottom-right
              { name: 'ml', point: coords.ml }, // middle-left
              { name: 'mt', point: coords.mt }, // middle-top
              { name: 'mr', point: coords.mr }, // middle-right
              { name: 'mb', point: coords.mb }, // middle-bottom
            ];

            // 检查旋转控件
            const angle = activeObj.angle || 0;
            const rad = (angle * Math.PI) / 180;
            const rotatingPointOffset = (activeObj as any).rotatingPointOffset || 70;
            const centerX = (coords.tl.x + coords.br.x) / 2;
            const centerY = (coords.tl.y + coords.br.y) / 2;
            const rotX = centerX + Math.sin(rad) * rotatingPointOffset;
            const rotY = centerY - Math.cos(rad) * rotatingPointOffset;

            // 检查鼠标是否在旋转控件附近
            const distToRot = Math.sqrt(Math.pow(pointer.x - rotX, 2) + Math.pow(pointer.y - rotY, 2));
            if (distToRot < cornerSize * 2) {
              onControl = true;
              controlType = 'rotation';
              targetObject = (activeObj as any).name || 'unknown';
            } else {
              // 检查鼠标是否在任何角点附近
              for (const corner of corners) {
                if (!corner.point || typeof corner.point.x !== 'number' || typeof corner.point.y !== 'number') {
                  continue;
                }
                const dist = Math.sqrt(
                  Math.pow(pointer.x - corner.point.x, 2) + Math.pow(pointer.y - corner.point.y, 2)
                );
                if (dist < cornerSize * 1.5) {
                  onControl = true;
                  controlType = `corner - ${corner.name} `;
                  targetObject = (activeObj as any).name || 'unknown';
                  break;
                }
              }
            }
          }

          // 更新鼠标调试信息
          setMouseDebug({
            x: e.clientX,
            y: e.clientY,
            canvasX: Math.round(pointer.x),
            canvasY: Math.round(pointer.y),
            onControl,
            controlType,
            targetObject,
          });

          // 不再强制覆盖 cursor（避免与 Fabric 控件真实命中逻辑冲突）
        };

        // 添加鼠标按下事件监听（用于调试缩放控件的交互）
        fabricCanvas.on('mouse:down', (e: any) => {
          const obj = e.target;
          const pointer = fabricCanvas.getPointer(e.e);
          console.log('[DesignLab 5.0] 🖱️ 鼠标按下:', {
            target: obj ? (obj as any).name : 'canvas',
            pointer: { x: pointer.x, y: pointer.y },
            isControl: e.e && (e.e.target as HTMLElement)?.classList?.contains('canvas-container'),
          });
        });

        fabricCanvas.on('object:rotating', (e: any) => {
          const obj = e.target;
          console.log('[DesignLab 5.0] 🔄 对象旋转事件:', {
            objectName: (obj as any).name,
            objectType: obj.type,
            angle: obj.angle,
            hasControls: obj.hasControls,
            hasBorders: obj.hasBorders,
            selectable: obj.selectable,
            evented: obj.evented,
            lockRotation: obj.lockRotation,
          });
        });

        // 保存移动前的图层顺序
        fabricCanvas.on('object:moving', (e: any) => {
          const obj = e.target;
          // 保存移动前的图层顺序（如果还没有保存）
          if (!layerOrderMap.has(obj)) {
            const allObjects = fabricCanvas.getObjects();
            const currentIndex = allObjects.indexOf(obj);
            layerOrderMap.set(obj, currentIndex);
            console.log('[DesignLab 5.0] 📍 对象开始移动，保存图层顺序:', {
              objectName: (obj as any).name,
              savedIndex: currentIndex,
            });
          }
          console.log('[DesignLab 5.0] 📍 对象移动中:', {
            objectName: (obj as any).name,
            objectType: obj.type,
            left: obj.left,
            top: obj.top,
          });
        });

        // 对象移动完成后恢复图层顺序
        fabricCanvas.on('object:moved', (e: any) => {
          const obj = e.target;
          const savedIndex = layerOrderMap.get(obj);
          if (savedIndex !== undefined) {
            const allObjects = fabricCanvas.getObjects();
            const currentIndex = allObjects.indexOf(obj);
            if (currentIndex !== savedIndex) {
              console.log('[DesignLab 5.0] 📍 对象移动完成，恢复图层顺序:', {
                objectName: (obj as any).name,
                from: currentIndex,
                to: savedIndex,
              });
              fabricCanvas.moveObjectTo(obj, savedIndex);
              fabricCanvas.renderAll();
            }
            // 清除保存的图层顺序（允许下次移动时重新保存）
            layerOrderMap.delete(obj);
          }
        });

        fabricCanvas.on('object:modified', (e: any) => {
          const obj = e.target;
          // 修复：任何缩放/旋转/移动完成后强制 setCoords，避免控件命中区域与渲染位置偏离
          try {
            obj?.setCoords?.();
            fabricCanvas.requestRenderAll();
          } catch (err) {
            // ignore
          }
          console.log('[DesignLab 5.0] ✏️ 对象修改完成:', {
            objectName: (obj as any).name,
            objectType: obj.type,
            scaleX: obj.scaleX,
            scaleY: obj.scaleY,
            name: (obj as any).name, // Added this line based on instruction, using 'obj'
            angle: obj.angle,
            left: obj.left,
            top: obj.top,
            width: obj.width, // Added this line based on instruction, using 'obj'
            height: obj.height, // Added this line based on instruction, using 'obj'
          });
        });

        // 创建 Custom Ink 样式的自定义控件（参考 Custom Ink 实现）
        // 1. 左上角删除控件
        if (!fabric.Control) {
          console.warn('[DesignLab 5.0] fabric.Control is not available');
        } else {
          // 步骤3：创建自定义图标控件（只显示图标，暂不做功能）
          // 注释：之前的完整实现代码已注释，现在从简单开始

          /* ========== 旧代码（已注释）开始 ==========
  // 修复：添加 sizeX/sizeY 定义可点击区域，增大控件尺寸以匹配 Custom Ink
          const deleteControl = new fabric.Control({
  x: -0.5, // 左上角：x=-0.5（左边缘）
  y: -0.5, // 左上角：y=-0.5（上边缘）
  offsetX: -16, // 向左偏移 16px（根据 32px 控件大小调整）
  offsetY: -16, // 向上偏移 16px
  sizeX: 32, // 关键：设置可点击区域宽度（像素）
  sizeY: 32, // 关键：设置可点击区域高度（像素）
            cursorStyle: 'pointer',
            render: function(ctx, left, top, styleOverride, fabricObject) {
  // 使用 this.sizeX 获取控件尺寸（普通函数确保 this 绑定到 Control 实例）
              const size = this.sizeX || this.sizeY || 32;
              ctx.save();
              ctx.translate(left, top);
              ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle || 0));
              
  // 绘制圆形背景（红色）
              ctx.fillStyle = '#ef4444';
              ctx.beginPath();
              ctx.arc(0, 0, size / 2, 0, 2 * Math.PI);
              ctx.fill();
              
  // 绘制 X 图标（白色），图标大小约为背景的 55%，线宽 3px
              ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3; // 增大线宽到 3px，更清晰
              ctx.lineCap = 'round';
  const iconSize = size * 0.55; // 图标大小为背景的 55%
              ctx.beginPath();
              ctx.moveTo(-iconSize / 2, -iconSize / 2);
              ctx.lineTo(iconSize / 2, iconSize / 2);
              ctx.moveTo(iconSize / 2, -iconSize / 2);
              ctx.lineTo(-iconSize / 2, iconSize / 2);
              ctx.stroke();
              
              ctx.restore();
            },
            mouseDownHandler: function(eventData, transformData) {
  // 关键：返回 true 阻止事件冒泡，防止对象被取消选中
              return true;
            },
            mouseUpHandler: function (eventData: any, transformData: any) {
              const target = transformData.target;
              if (target && fabricCanvas) {
                console.log('[DesignLab 5.0] 🗑️ 删除控件被点击:', {
                  objectName: (target as any).name,
                  objectType: target.type,
                  timestamp: new Date().toISOString(),
                });
  // 删除对象
                fabricCanvas.remove(target);
                fabricCanvas.renderAll();
  // 如果删除的是当前选中的图片，清除选中状态
                if (selectedImage === target) {
                  setSelectedImage(null);
                  setToolPanelType('home');
                }
  // 返回 true 表示事件已处理，阻止默认行为
                return true;
              }
              return false;
            }
          });
          
  // 添加自定义控件到对象的辅助函数（必须在控件定义之前，以便在控件中使用）
          const addCustomControlsToObject = (obj: fabric.Object) => {
            const objName = (obj as any).name || '';
            // 只为上传的图片、艺术字、文本添加自定义控件（排除商品底图）
            // Updated: Support image_, art_, text_
            const name = (obj as any).name || '';
            if (name && (name.startsWith('image_') || name.startsWith('art_') || name.startsWith('text_'))) {
              if (!obj.controls) {
                obj.controls = {};
              }
  // 添加删除控件（左上角）
              obj.controls.deleteControl = deleteControl;
  // 添加复制控件（左下角）
              obj.controls.duplicateControl = duplicateControl;
  // 注意：右下角缩放功能使用 Fabric.js 的默认 br 控件
              // Custom Ink 可能只是使用了默认的缩放控件，不需要自定义
              // 如果需要隐藏默认的 br 控件，可以使用：obj.setControlsVisibility({ br: false });
            }
          };
          
  // 2. 左下角复制控件
  // 修复：添加 sizeX/sizeY 定义可点击区域，增大控件尺寸以匹配 Custom Ink
          const duplicateControl = new fabric.Control({
  x: -0.5, // 左下角：x=-0.5（左边缘）
  y: 0.5, // 左下角：y=0.5（下边缘）
  offsetX: -16, // 向左偏移 16px（根据 32px 控件大小调整）
  offsetY: 16, // 向下偏移 16px
  sizeX: 32, // 关键：设置可点击区域宽度（像素）
  sizeY: 32, // 关键：设置可点击区域高度（像素）
            cursorStyle: 'pointer',
            render: function(ctx, left, top, styleOverride, fabricObject) {
  // 使用 this.sizeX 获取控件尺寸（普通函数确保 this 绑定到 Control 实例）
              const size = this.sizeX || this.sizeY || 32;
              ctx.save();
              ctx.translate(left, top);
              ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle || 0));
              
  // 绘制圆形背景（蓝色）
              ctx.fillStyle = '#0066CC';
              ctx.beginPath();
              ctx.arc(0, 0, size / 2, 0, 2 * Math.PI);
              ctx.fill();
              
  // 绘制复制图标（两个重叠的矩形，白色），优化尺寸比例
              ctx.fillStyle = '#ffffff';
              // 后面的矩形（稍微偏右下）
              ctx.fillRect(-size * 0.25, -size * 0.35, size * 0.35, size * 0.45);
              // 前面的矩形（稍微偏左上）
              ctx.fillRect(-size * 0.15, -size * 0.25, size * 0.35, size * 0.45);
              
              ctx.restore();
            },
            mouseDownHandler: function(eventData, transformData) {
  // 关键：返回 true 阻止事件冒泡，防止对象被取消选中
              return true;
            },
            mouseUpHandler: async function (eventData: any, transformData: any) {
              const target = transformData.target;
              if (target && fabricCanvas) {
                try {
                  console.log('[DesignLab 5.0] 📋 复制控件被点击:', {
                    objectName: (target as any).name,
                    objectType: target.type,
                    timestamp: new Date().toISOString(),
                  });
                  const cloned = await (target as fabric.Image).clone();
                  cloned.set({
                    left: (target.left || 0) + 20,
                    top: (target.top || 0) + 20,
                    name: `image_${ Date.now() } `,
                    selectable: true,
                    evented: true,
                    hasControls: true,
                    hasBorders: true,
                  });
                  cloned.setCoords();
                  fabricCanvas.add(cloned);
                  
  // 为新复制的对象添加自定义控件
                  addCustomControlsToObject(cloned);
                  
                  fabricCanvas.setActiveObject(cloned);
                  fabricCanvas.renderAll();
                  
  // 返回 true 表示事件已处理，阻止默认行为
                  return true;
                } catch (error) {
                  console.error('[DesignLab 5.0] 复制失败:', error);
                  return false;
                }
              }
              return false;
            }
          });
          
  // 3. 右下角缩放控件
          // 注意：Custom Ink 使用 Fabric.js 的默认右下角（br）缩放控件，不需要自定义
          // Fabric.js 的默认 br 控件已经提供了缩放功能
          
  // 保存控件到 canvas，以便后续使用
          (fabricCanvas as any).deleteControl = deleteControl;
          (fabricCanvas as any).duplicateControl = duplicateControl;
          (fabricCanvas as any).addCustomControlsToObject = addCustomControlsToObject;
          // Alias for consistency if used elsewhere
          (fabricCanvas as any).addIconControlsToObject = addCustomControlsToObject;
          
          console.log('[DesignLab 5.0] ✅ Custom Ink 样式的自定义控件已创建');
          ========== 旧代码（已注释）结束 ========== */

          // Helper to calculate dynamic control position based on canvas CSS scale
          // This ensures controls stay at a fixed visual distance (Gap) from corners even when canvas scales via CSS
          // Formula: LogicalOffset = (VisualGap / Scale) + LogicalRadius
          // This preserves the VisualGap between the corner and the edge of the icon (which scales with CSS)
          const getDynamicControlPosition = (x: number, y: number, visualGapX: number, visualGapY: number) => {
            return (dim: any, finalMatrix: any, fabricObject: any) => {
              const canvas = fabricCanvasRef.current;
              if (!canvas) return { x: 0, y: 0 };

              // Calculate current CSS scale (clientWidth / logicalWidth)
              // Safe fallback to 1 if clientWidth is 0 or missing
              const cssWidth = (canvas.lowerCanvasEl || canvas.getElement()).clientWidth || 0;
              const scale = cssWidth > 0 ? cssWidth / 4000 : 1;
              // Avoid division by very small numbers
              const safeScale = scale < 0.05 ? 0.05 : scale;

              const logicalRadius = 80; // Derived from sizeX/2 (160/2)

              // Calculate logical offset needed to achieve target visual gap
              // logicalOffsetX = (visualGapX / safeScale) + (sign * logicalRadius)
              const dirX = visualGapX >= 0 ? 1 : -1;
              const dirY = visualGapY >= 0 ? 1 : -1;

              const logicalOffsetX = (visualGapX / safeScale) + (dirX * logicalRadius);
              const logicalOffsetY = (visualGapY / safeScale) + (dirY * logicalRadius);

              // Get the point on the object (corner) using transformPoint
              // x, y are -0.5 or 0.5. We map to local coordinates and transform.
              const matrix = fabricObject.calcTransformMatrix();
              const cornerPoint = fabric.util.transformPoint(
                {
                  x: x * fabricObject.width + (fabricObject.pathOffset?.x || 0),
                  y: y * fabricObject.height + (fabricObject.pathOffset?.y || 0)
                },
                matrix
              );

              // Apply the dynamic offset
              return {
                x: cornerPoint.x + logicalOffsetX,
                y: cornerPoint.y + logicalOffsetY
              };
            };
          };

          /*
  // 步骤3：创建三个图标控件（只显示，不做功能）
          
                    // 1. 左上角删除图标
                    const deleteIconControl = new fabric.Control({
                      x: -0.5, // 左上角
                      y: -0.5,
  // 修复：让三个大图标控件彼此拉开距离（避免在小对象上出现控件命中区域重叠，导致 hover 总是落到 resize）
                      // 说明：这里用 offset 将控件中心移到对象外侧（与大尺寸 icon 的视觉一致）
  // Fix: Use positionHandler for dynamic alignment (Gap -12px)
                      positionHandler: getDynamicControlPosition(-0.5, -0.5, -12, -12),
   
                      render: function (ctx: any, left: any, top: any, styleOverride: any, fabricObject: any) {
  // 生产环境定位：仅 dlDebug=1 时打印一次控件 render 的 left/top（用于对齐命中区域）
                        try {
                          const qs = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
                          if (qs && qs.get('dlDebug') === '1') {
                            const w: any = window as any;
                            w.__DL5_RENDER_LOGGED__ = w.__DL5_RENDER_LOGGED__ || {};
                            if (!w.__DL5_RENDER_LOGGED__.deleteIcon) {
                              w.__DL5_RENDER_LOGGED__.deleteIcon = true;
                              console.log('[DesignLab 5.0] 🧭 render(deleteIcon):', {
                                left,
                                top,
                                offsetX: (this as any).offsetX,
                                offsetY: (this as any).offsetY,
                                sizeX: (this as any).sizeX,
                                sizeY: (this as any).sizeY,
                              });
                            }
                          }
                        } catch (e) {
                          // ignore
                        }
  const size = this.sizeX || 160; // 放大 5 倍：默认值从 32 调整为 160
                        ctx.save();
                        ctx.translate(left, top);
                        ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle || 0));
          
                        // 绘制红色圆形背景
                        ctx.fillStyle = '#ef4444';
                        ctx.beginPath();
                        ctx.arc(0, 0, size / 2, 0, 2 * Math.PI);
                        ctx.fill();
          
                        // 绘制白色 X 图标（线宽也相应放大）
                        ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 15; // 放大 5 倍：从 3 调整为 15
                        ctx.lineCap = 'round';
                        const iconSize = size * 0.55;
                        ctx.beginPath();
                        ctx.moveTo(-iconSize / 2, -iconSize / 2);
                        ctx.lineTo(iconSize / 2, iconSize / 2);
                        ctx.moveTo(iconSize / 2, -iconSize / 2);
                        ctx.lineTo(-iconSize / 2, iconSize / 2);
                        ctx.stroke();
          
                        ctx.restore();
                      },
  // 功能1：删除图标 - 添加鼠标事件处理
                      mouseDownHandler: function (eventData, transformData) {
  // 返回 true 阻止事件冒泡，防止对象被取消选中
                        return true;
                      },
                      mouseUpHandler: function (eventData: any, transformData: any) {
                        const target = transformData.target;
                        if (target && fabricCanvas) {
                          console.log('[DesignLab 5.0] 🗑️ 删除图标被点击:', {
                            objectName: (target as any).name,
                            objectType: target.type,
                            timestamp: new Date().toISOString(),
                          });
          
  // 功能1：删除对象
                          fabricCanvas.remove(target);
                          fabricCanvas.renderAll();
          
  // Add Text: 如果删除的是当前选中的对象，清除选中状态并切换回 home 面板
  // Add Art: 添加 art 对象的删除处理
                          const targetName = (target as any).name || '';
                          const layerType = (target as any).data?.layerType;
                          if (
                            ((target as any).name && (target as any).name.startsWith('image_')) ||
                            ((target.type === 'i-text' || target.type === 'textbox' || target.type === 'text') && targetName.startsWith('text_')) ||
                            (target.type === 'image' && (targetName.startsWith('art_') || layerType === 'art'))
                          ) {
                            setSelectedImage(null);
                            setSelectedText(null);
  setSelectedArt(null); // Add Art: 删除时清理艺术素材选中状态
                            setToolPanelType('home');
                          }
          
  // 返回 true 表示事件已处理，阻止默认行为
                          return true;
                        }
                        return false;
                      },
                    });
          
                    // 2. 左下角 duplicate 图标
                    const duplicateIconControl = new fabric.Control({
                      x: -0.5, // 左下角
                      y: 0.5,
  // 同 deleteIcon：下移到对象外侧，避免与 delete/resize 命中区域重叠
  // Fix: Use positionHandler for dynamic alignment (Gap 12px)
                      positionHandler: getDynamicControlPosition(-0.5, 0.5, -12, 12),
   
                      render: function (ctx: any, left: any, top: any, styleOverride: any, fabricObject: any) {
  // 生产环境定位：仅 dlDebug=1 时打印一次控件 render 的 left/top
                        try {
                          const qs = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
                          if (qs && qs.get('dlDebug') === '1') {
                            const w: any = window as any;
                            w.__DL5_RENDER_LOGGED__ = w.__DL5_RENDER_LOGGED__ || {};
                            if (!w.__DL5_RENDER_LOGGED__.duplicateIcon) {
                              w.__DL5_RENDER_LOGGED__.duplicateIcon = true;
                              console.log('[DesignLab 5.0] 🧭 render(duplicateIcon):', {
                                left,
                                top,
                                offsetX: (this as any).offsetX,
                                offsetY: (this as any).offsetY,
                                sizeX: (this as any).sizeX,
                                sizeY: (this as any).sizeY,
                              });
                            }
                          }
                        } catch (e) {
                          // ignore
                        }
  const size = this.sizeX || 160; // 放大 5 倍：默认值从 32 调整为 160
                        ctx.save();
                        ctx.translate(left, top);
                        ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle || 0));
          
                        // 绘制蓝色圆形背景
                        ctx.fillStyle = '#0066CC';
                        ctx.beginPath();
                        ctx.arc(0, 0, size / 2, 0, 2 * Math.PI);
                        ctx.fill();
          
                        // 绘制白色复制图标（两个重叠的矩形）
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(-size * 0.25, -size * 0.35, size * 0.35, size * 0.45);
                        ctx.fillRect(-size * 0.15, -size * 0.25, size * 0.35, size * 0.45);
          
                        ctx.restore();
                      },
  // 功能2：复制图标 - 添加鼠标事件处理
                      mouseDownHandler: function (eventData, transformData) {
  // 返回 true 阻止事件冒泡，防止对象被取消选中
                        return true;
                      },
                      mouseUpHandler: async function (eventData: any, transformData: any) {
                        const target = transformData.target;
                        if (target && fabricCanvas) {
                          try {
                            console.log('[DesignLab 5.0] 📋 复制图标被点击:', {
                              objectName: (target as any).name,
                              objectType: target.type,
                              timestamp: new Date().toISOString(),
                            });
          
  // Add Text: 克隆对象（兼容 sync/promise/callback 三种 clone 形态）
                            const cloneResult = (target as any).clone();
                            const cloned = cloneResult instanceof Promise
                              ? await cloneResult
                              : typeof cloneResult === 'function'
                                ? await new Promise<fabric.Object>((resolve) => {
                                  (target as any).clone(resolve);
                                })
                                : cloneResult;
          
                            if (!cloned) {
                              console.error('[DesignLab 5.0] ❌ clone returned null/undefined');
                              return false;
                            }
          
                            const targetName = (target as any).name || '';
                            const targetLayerType = (target as any).data?.layerType;
                            // 保护商品底图：不允许复制底图
  // Add Art: 允许复制 art 对象
                            if (
                              targetName === 'product-image-base' ||
                              targetName.startsWith('product-image-') ||
                              targetLayerType === 'product' ||
                              targetLayerType === 'product-image'
                            ) {
                              console.warn('[DesignLab 5.0] Skip duplicate for product base image');
                              return true;
                            }
          
  // 根据对象类型决定 name 前缀与 layerType
  // Add Art: 添加 art 对象的判断
                            const isText =
                              target.type === 'i-text' || target.type === 'textbox' || target.type === 'text' || targetName.startsWith('text_');
                            const isUploadImage = target.type === 'image' && (targetName.startsWith('image_') || targetLayerType === 'upload');
                            const isArtImage = target.type === 'image' && (targetName.startsWith('art_') || targetLayerType === 'art');
                            const namePrefix = isText ? 'text_' : isArtImage ? 'art_' : isUploadImage ? 'image_' : 'object_';
                            const layerType = isText ? 'text' : isArtImage ? 'art' : isUploadImage ? 'upload' : targetLayerType;
          
                            cloned.set({
                              left: (target.left || 0) + 20,
                              top: (target.top || 0) + 20,
                              name: `${namePrefix}${Date.now()} `,
                              selectable: true,
                              evented: true,
                              hasControls: true,
                              hasBorders: true,
                              borderColor: '#808080',
                              borderScaleFactor: 2,
                              data: {
                                ...(target as any).data,
                                layerType,
                              },
                            });
                            cloned.setCoords();
          
  // 添加到画布
                            fabricCanvas.add(cloned);
          
  // 为新复制的对象添加图标控件
                            if ((fabricCanvas as any).addIconControlsToObject) {
                              (fabricCanvas as any).addIconControlsToObject(cloned);
                            }
          
  // 选中新复制的对象
                            fabricCanvas.setActiveObject(cloned);
  // Add Text: 立即切换编辑面板（selection:created/updated 也会兜底）
                            const clonedName = (cloned as any).name || '';
                            const clonedLayerType = (cloned as any).data?.layerType;
  // Add Art: 复制后切换到对应的编辑面板
                            if (cloned.type === 'image' && (clonedName.startsWith('art_') || clonedLayerType === 'art')) {
                              setSelectedArt(cloned as any);
                              setSelectedImage(null);
                              setSelectedText(null);
                              setToolPanelType('edit-art');
                            } else if (cloned.type === 'image' && clonedName.startsWith('image_')) {
                              setSelectedImage(cloned as any);
                              setSelectedText(null);
  setSelectedArt(null); // Add Art: 切换到上传编辑时清理艺术素材
                              setToolPanelType('edit-upload');
                            } else if (
                              (cloned.type === 'i-text' || cloned.type === 'textbox' || cloned.type === 'text') &&
                              clonedName.startsWith('text_')
                            ) {
                              setSelectedText(cloned as any);
                              setSelectedImage(null);
  setSelectedArt(null); // Add Art: 切换到文本编辑时清理艺术素材
                              setToolPanelType('edit-text');
                            }
          
                            fabricCanvas.renderAll();
          
  // 返回 true 表示事件已处理，阻止默认行为
                            return true;
                          } catch (error) {
                            console.error('[DesignLab 5.0] ❌ 复制失败:', error);
                            return false;
                          }
                        }
                        return false;
                      },
                    });
          
                    // 3. 右下角 resize 图标
                    const resizeIconControl = new fabric.Control({
                      x: 0.5, // 右下角
                      y: 0.5,
  // 右下角外侧，避免与左侧控件重叠
  // Fix: Use positionHandler for dynamic alignment (Gap 12px)
                      positionHandler: getDynamicControlPosition(0.5, 0.5, 12, 12),
   
                      render: function (ctx: any, left: any, top: any, styleOverride: any, fabricObject: any) {
  // 生产环境定位：仅 dlDebug=1 时打印一次控件 render 的 left/top
                        try {
                          const qs = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
                          if (qs && qs.get('dlDebug') === '1') {
                            const w: any = window as any;
                            w.__DL5_RENDER_LOGGED__ = w.__DL5_RENDER_LOGGED__ || {};
                            if (!w.__DL5_RENDER_LOGGED__.resizeIcon) {
                              w.__DL5_RENDER_LOGGED__.resizeIcon = true;
                              console.log('[DesignLab 5.0] 🧭 render(resizeIcon):', {
                                left,
                                top,
                                offsetX: (this as any).offsetX,
                                offsetY: (this as any).offsetY,
                                sizeX: (this as any).sizeX,
                                sizeY: (this as any).sizeY,
                              });
                            }
                          }
                        } catch (e) {
                          // ignore
                        }
  const size = this.sizeX || 160; // 放大 5 倍：默认值从 32 调整为 160
                        ctx.save();
                        ctx.translate(left, top);
                        ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle || 0));
          
                        // 绘制蓝色圆形背景
                        ctx.fillStyle = '#0066CC';
                        ctx.beginPath();
                        ctx.arc(0, 0, size / 2, 0, 2 * Math.PI);
                        ctx.fill();
          
                        // 绘制白色 resize 图标（对角线箭头，线宽也相应放大）
                        ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 12.5; // 放大 5 倍：从 2.5 调整为 12.5
                        ctx.lineCap = 'round';
                        const arrowSize = size * 0.4;
                        ctx.beginPath();
                        // 绘制对角线
                        ctx.moveTo(-arrowSize / 2, -arrowSize / 2);
                        ctx.lineTo(arrowSize / 2, arrowSize / 2);
                        // 绘制箭头
                        ctx.moveTo(arrowSize / 2 - arrowSize * 0.2, arrowSize / 2 - arrowSize * 0.2);
                        ctx.lineTo(arrowSize / 2, arrowSize / 2);
                        ctx.lineTo(arrowSize / 2 - arrowSize * 0.2, arrowSize / 2 + arrowSize * 0.2);
                        ctx.stroke();
          
                        ctx.restore();
                      },
  // 功能3：resize 图标 - 使用 actionHandler 实现缩放功能
                      // 使用 Fabric.js 的 controlsUtils 工具函数（如果可用），否则使用自定义实现
  // 修复：缩放后必须 setCoords，否则控件命中区域与渲染位置会逐渐偏离（放大后更明显）
                      actionHandler: function (eventData: any, transformData: any, x: any, y: any) {
                        const target = transformData?.target as any;
                        const controlsUtils = (fabric as any).controlsUtils;
          
                        if (controlsUtils && typeof controlsUtils.scalingEqually === 'function') {
                          const result = controlsUtils.scalingEqually(eventData, transformData, x, y);
  // 关键：实时更新坐标，确保 hover/click 命中区与图标一致
                          try {
                            target?.setCoords?.();
                            (target?.canvas as any)?.requestRenderAll?.();
                          } catch (e) {
                            // ignore
                          }
                          return result;
                        }
          
                        // fallback：自定义缩放实现（当 controlsUtils 不可用时）
                        return (function (eventData2, transformData2, x2, y2) {
  // 功能3：自定义缩放实现（当 controlsUtils 不可用时）
                          const target2 = transformData2.target;
                          // 将全局坐标转换为对象的局部坐标
                          const localPoint = target2.toLocalPoint(
                            new fabric.Point(x2, y2),
                            transformData2.originX || 'left',
                            transformData2.originY || 'top'
                          );
          
                          // 获取对象的变换后尺寸
                          const targetDim = target2._getTransformedDimensions();
          
                          // 计算新的缩放比例
                          const scaleX = localPoint.x / (targetDim.x / (target2.scaleX || 1));
                          const scaleY = localPoint.y / (targetDim.y / (target2.scaleY || 1));
          
                          // 返回新的坐标（Fabric.js 会使用这些值来更新对象的 scaleX 和 scaleY）
                          const result2 = {
                            x: Math.max(0.1, scaleX), // 最小缩放比例 0.1
                            y: Math.max(0.1, scaleY),
                          };
  // 关键：实时更新坐标，确保 hover/click 命中区与图标一致
                          try {
                            target2?.setCoords?.();
                            (target2?.canvas as any)?.requestRenderAll?.();
                          } catch (e) {
                            // ignore
                          }
                          return result2;
                        })(eventData, transformData, x, y);
                      },
  // 使用 Fabric.js 的缩放光标样式（如果可用）
                      cursorStyleHandler: (fabric.controlsUtils && fabric.controlsUtils.scaleCursorStyleHandler)
                        ? fabric.controlsUtils.scaleCursorStyleHandler
                        : 'se-resize',
                    });
          
  // 生产环境验证日志：打印三角控件配置，确认 offsetX/offsetY/size 是否符合预期（用 JSON 输出，避免线上控制台折叠为 [object Object]）
                    try {
                      const payload = {
                        env: process.env.NODE_ENV,
                        deleteIcon: { offsetX: (deleteIconControl as any).offsetX, offsetY: (deleteIconControl as any).offsetY, sizeX: (deleteIconControl as any).sizeX, sizeY: (deleteIconControl as any).sizeY },
                        duplicateIcon: { offsetX: (duplicateIconControl as any).offsetX, offsetY: (duplicateIconControl as any).offsetY, sizeX: (duplicateIconControl as any).sizeX, sizeY: (duplicateIconControl as any).sizeY },
                        resizeIcon: { offsetX: (resizeIconControl as any).offsetX, offsetY: (resizeIconControl as any).offsetY, sizeX: (resizeIconControl as any).sizeX, sizeY: (resizeIconControl as any).sizeY },
                      };
                      console.log('[DesignLab 5.0] 🔎 iconControls config (prod verify): ' + JSON.stringify(payload));
                    } catch (e) {
                      // ignore
                    }
          */
          // 添加图标控件到对象的辅助函数
          // 添加图标控件到对象的辅助函数
          const addIconControlsToObject = (obj: fabric.Object) => {
            // Re-enabled: Call the imported applyCornerControls function
            const canvas = fabricCanvasRef.current;
            if (typeof applyCornerControls === 'function' && canvas) {
              applyCornerControls({ canvas, obj });
              // Ensure coordinates are updated for control placement
              obj.setCoords();
              canvas.requestRenderAll();
            } else {
              console.warn('[DesignLab 5.0] applyCornerControls or canvas not found');
            }
          };

          // 保存到 canvas，以便后续使用
          (fabricCanvas as any).addIconControlsToObject = addIconControlsToObject;

          console.log('[DesignLab 5.0] ✅ 图标控件已禁用 (Switching to FloatingObjectControls)');

        }

        // 仅在调试模式绑定鼠标移动监听（生产环境禁用，避免影响控件 hover/click）
        const canvasElementForMouse = fabricCanvas.getElement();
        let cleanupMouseListener: (() => void) | undefined;
        if (ENABLE_MOUSE_DEBUG && canvasElementForMouse) {
          canvasElementForMouse.addEventListener('mousemove', handleGlobalMouseMove);
          cleanupMouseListener = () => {
            canvasElementForMouse.removeEventListener('mousemove', handleGlobalMouseMove);
          };
        }

        // 返回清理函数（确保在所有情况下都返回一个函数或 undefined）
        return cleanupMouseListener;

      } catch (error) {
        console.error('[DesignLab 5.0] Failed to initialize Fabric canvas:', error);
        // 发生错误时返回 undefined
        return undefined;
      }
    };

    initCanvas().then((cleanup) => {
      if (cleanup) {
        cleanupMouseListenerRef.current = cleanup;
      }
    }).catch((error) => {
      console.error('[DesignLab 5.0] Canvas initialization error:', error);
    });

    return () => {
      isMounted = false;
      // 清理鼠标移动监听器
      if (cleanupMouseListenerRef.current && typeof cleanupMouseListenerRef.current === 'function') {
        try {
          cleanupMouseListenerRef.current();
        } catch (error) {
          console.error('[DesignLab 5.0] Error cleaning up mouse listener:', error);
        }
        cleanupMouseListenerRef.current = null;
      }
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, []); // 只在组件挂载时初始化一次

  // 5.0 版本：步骤2 - 当视图切换或产品信息改变时更新商品图片
  // 修复：添加 canvasInitialized state 作为依赖，确保 Canvas 初始化完成后触发加载
  const prevViewRef = useRef(currentView); // Track previous view to distinguish view change vs product change

  useEffect(() => {
    // Skip product image loading if we're currently loading a design
    if (isLoadingDesign) {
      console.log('[DesignLab 5.0] Skipping product image load - design is being loaded');
      return;
    }

    // 修复：只要 Fabric Canvas 就绪就尝试加载图片，不强制要求 canvasInitialized state
    // state 变化可能在某些情况下由于异步导致延迟
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      console.log('[DesignLab 5.0] Canvas not initialized yet');
      return;
    }

    const imageUrl = productInfo.baseImages?.[currentView];
    if (!imageUrl) {
      console.log('[DesignLab 5.0] No image URL for view:', currentView);
      return;
    }

    console.log('[DesignLab 5.0] Loading product image:', {
      currentView,
      url: imageUrl.substring(0, 60) + '...',
      canvasId: (canvas as any).lowerCanvasEl?.id || 'unknown'
    });

    // FIX: Use Tinting logic to solve wrong GCS images
    // We always use the WHITE image as base and apply the HEX from PRODUCT_COLORS
    const isDefaultProduct = productInfo.productName?.includes('Design Lab Default Tee') || productInfo.productName?.includes('Loading');

    let finalImageUrl = imageUrl;
    let tintHex = '#ffffff';

    if (isDefaultProduct) {
      // FIX: If we have mapped images from dynamicColors, don't force white tinting.
      // This allows the actual colored images from the mapping to show up.
      const hasMappedImages = !imageUrl.includes('Loading') && !imageUrl.includes('transparent');

      if (!hasMappedImages) {
        const colorData = PRODUCT_COLORS.find(c => c.name === productInfo.color);
        tintHex = colorData ? colorData.hex : '#ffffff';

        // ALWAYS use white base image for default products to ensure consistency
        finalImageUrl = getDefaultProductBaseImages('White')[currentView];
        console.log('[DesignLab 5.0] Applying tinting fallback for default product:', { color: productInfo.color, tintHex });
      } else {
        console.log('[DesignLab 5.0] Using mapped images for default product, skipping tinting.');
      }
    }

    // CRITICAL FIX: Restoration is now handled in handleViewChange using useDesignStore.
    // The previous restoreViewObjects logic was clearing the canvas and conflicting 
    // with the store-based restoration, which caused Text/Art objects to disappear.
    if (prevViewRef.current !== currentView) {
      console.log('[DesignLab 5.0] View changed (handled by handleViewChange):', { from: prevViewRef.current, to: currentView });
      prevViewRef.current = currentView;
    } else {
      console.log('[DesignLab 5.0] Product change prevented canvas reset (Preserving objects)');
    }

    // 小延迟确保 Canvas 容器样式已经稳定
    const timer = setTimeout(() => {
      addProductImageToCanvas(finalImageUrl, tintHex);
    }, 100);

    return () => clearTimeout(timer);
  }, [currentView, productInfo.baseImages, canvasInitialized]); // 保持 canvasInitialized 依赖作为触发源之一

  // 加载模块：从 URL 参数加载设计
  useEffect(() => {
    if (!searchParams) return;

    const designIdParam = searchParams.get('designId');
    const sourceParam = searchParams.get('source');

    if (designIdParam && canvasInitialized && !designId) {
      console.log('[DesignLab 5.0] Detected designId in URL, loading design...');
      handleLoadDesign(designIdParam, sourceParam);
    }
  }, [searchParams, canvasInitialized, designId]); // Only run when canvas is initialized and we don't already have a design loaded

  // 5.0 版本：步骤1 - 文件上传处理函数
  // 步骤2 - 更新：添加图片到 Fabric canvas
  const handleFileUpload = (file: File) => {
    console.log('[DesignLab 5.0] 步骤2 - 文件上传:', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      canvasReady: !!fabricCanvasRef.current,
    });

    // 文件格式验证
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPG, PNG, GIF, WebP, AVIF, etc.)');
      return;
    }

    // 文件大小验证（20 MB）
    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
    if (file.size > MAX_FILE_SIZE) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      alert(`File size(${fileSizeMB} MB) exceeds the maximum limit of 20 MB.Please choose a smaller file.`);
      return;
    }

    // 文件类型验证
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/avif',
      'image/svg+xml'
    ];
    const normalizedFileType = file.type.toLowerCase();
    if (!allowedTypes.includes(normalizedFileType)) {
      alert(`File type "${file.type}" is not supported.Please upload JPG, PNG, GIF, WebP, AVIF, or SVG files.`);
      return;
    }

    // 步骤2 - 检查 Canvas 是否已初始化
    if (!fabricCanvasRef.current || !fabricRef.current) {
      alert('Canvas is not ready. Please wait for the design lab to load.');
      return;
    }

    const fabric = fabricRef.current;
    const canvas = fabricCanvasRef.current;

    // 步骤2 - 读取文件并添加到 canvas
    const reader = new FileReader();
    reader.onerror = (error) => {
      console.error('[DesignLab 5.0] FileReader error:', error);
      alert('Failed to read the file. Please try again.');
    };

    reader.onload = (e) => {
      try {
        const imageUrl = e.target?.result as string;
        if (!imageUrl) {
          alert('Failed to read the file.');
          return;
        }

        // 创建 Image 对象并加载（使用 window.Image 避免与 next/image 冲突）
        const imgElement = new window.Image();
        if (!imageUrl.startsWith('data:')) {
          imgElement.crossOrigin = 'anonymous';
        }

        imgElement.onload = () => {
          try {
            // 创建 Fabric Image 对象
            // 步骤1：确保基本的拖拽功能可用
            // 步骤2：设置选中时的灰色边框（2px）
            // 步骤3：隐藏默认控件，稍后添加自定义图标
            const fabricImage = new fabric.Image(imgElement, {
              selectable: true, // 步骤1：可选择
              evented: true, // 步骤1：可交互
              hasControls: true, // 必须为 true 才能显示自定义控件（默认控件会在 addIconControlsToObject 中隐藏）
              hasBorders: false, // Ensure borders are off
              borderColor: 'transparent',
              borderScaleFactor: 2,
              lockMovementX: false, // 步骤1：允许拖拽移动
              lockMovementY: false, // 步骤1：允许拖拽移动
              data: {
                layerType: 'upload',
                zIndex: 10,
              },
            });

            // 智能缩放：缩放到画布的 30%
            const SCALE_RATIO = 0.3;
            const targetMaxWidth = CANVAS_WIDTH * SCALE_RATIO;
            const targetMaxHeight = CANVAS_HEIGHT * SCALE_RATIO;

            const originalWidth = fabricImage.width || 1;
            const originalHeight = fabricImage.height || 1;

            const scaleX = targetMaxWidth / originalWidth;
            const scaleY = targetMaxHeight / originalHeight;
            const scale = Math.min(scaleX, scaleY, 1);

            fabricImage.scale(scale);

            // 居中位置（canvas 中心）
            fabricImage.set({
              left: CANVAS_WIDTH / 2,
              top: CANVAS_HEIGHT / 2,
              originX: 'center',
              originY: 'center',
              name: `image_${Date.now()} `,
            });

            // 确保坐标已更新（参考 4.0 版本）
            fabricImage.setCoords();

            // 步骤1：添加到 canvas，确保基本的拖拽功能可用
            canvas.add(fabricImage);

            // 步骤3：为上传的图片添加图标控件
            if ((canvas as any).addIconControlsToObject) {
              (canvas as any).addIconControlsToObject(fabricImage);
            }

            // 步骤2：自动选中图片，显示灰色边框
            canvas.setActiveObject(fabricImage);

            // CRITICAL FIX: Sync to store immediately (Uniform persistence)
            const layers = serializeCanvas(canvas);
            setViewLayers(currentView, layers);
            commitToStore();
            console.log('[DesignLab 5.0] Image added: synced to store');

            // 步骤2：确保选中时边框正确显示
            fabricImage.set({
              hasBorders: false,
              borderColor: 'transparent', // 隐藏选中框
              borderScaleFactor: 2, // 2px 宽度
            });
            fabricImage.setCoords();
            canvas.renderAll();

            // 记录对象属性用于调试
            console.log('[DesignLab 5.0] ✅ Image added to canvas with properties:', {
              name: (fabricImage as any).name,
              position: { left: fabricImage.left, top: fabricImage.top },
              scale,
              selectable: fabricImage.selectable, // 步骤1：应该为 true
              evented: fabricImage.evented, // 步骤1：应该为 true
              hasControls: fabricImage.hasControls, // 步骤3：应该为 false（隐藏默认控件）
              hasBorders: fabricImage.hasBorders, // 步骤2：应该为 true（显示边框）
              borderColor: fabricImage.borderColor, // 步骤2：应该是 '#808080'
              borderScaleFactor: (fabricImage as any).borderScaleFactor, // 步骤2：应该是 2
            });

            // 渲染画布（参考 4.0 版本）
            canvas.renderAll();

            console.log('[DesignLab 5.0] Image added to canvas:', {
              name: (fabricImage as any).name,
              position: { left: fabricImage.left, top: fabricImage.top },
              scale,
            });

            // 上传图片后自动切换到 EditUploadPanel
            setSelectedImage(fabricImage);
            setToolPanelType('edit-upload');
            console.log('[DesignLab 5.0] 切换到 edit-upload 面板');

          } catch (error) {
            console.error('[DesignLab 5.0] Error creating Fabric image:', error);
            alert('Failed to add image to canvas. Please try again.');
          }
        };

        imgElement.onerror = () => {
          alert('Failed to load the image. Please try again.');
        };

        imgElement.src = imageUrl;

      } catch (error) {
        console.error('[DesignLab 5.0] Error processing file:', error);
        alert('Failed to process the file. Please try again.');
      }
    };

    reader.readAsDataURL(file);
  };

  // Add Text: 添加文本到 Fabric canvas（与 4.0/PRD 一致：Add Text → 画布生成文本对象 → 自动进入 Edit Text）
  const handleAddText = (text: string) => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) {
      console.warn('[DesignLab 5.0] Add Text: canvas not ready');
      return;
    }

    const normalizedText = (text || '').trim() || 'Your Text';

    try {
      // 优先使用 IText，兼容缺失时回退到 Textbox
      const TextCtor: any = (fabric as any).IText || (fabric as any).Textbox || (fabric as any).Text;
      if (!TextCtor) {
        console.error('[DesignLab 5.0] Add Text: fabric text constructor not available');
        return;
      }

      const textObj: any = new TextCtor(normalizedText, {
        left: CANVAS_WIDTH / 2,
        top: CANVAS_HEIGHT / 2,
        originX: 'center',
        originY: 'center',
        fill: '#111827',
        fontFamily: 'Arial',
        fontSize: 40, // Scaled down (120 * 0.3 = 36 -> 40)
        textAlign: 'center',
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: false, // Ensure no border
        borderColor: 'transparent',
        borderScaleFactor: 2,
        name: `text_${Date.now()} `,
        data: {
          layerType: 'text',
          zIndex: 20,
        },
      });

      textObj.setCoords?.();
      canvas.add(textObj);

      // 复用 5.0 大尺寸图标控件（delete/duplicate/resize）
      if (typeof (canvas as any).addIconControlsToObject === 'function') {
        (canvas as any).addIconControlsToObject(textObj);
      }

      canvas.setActiveObject(textObj);
      canvas.renderAll();

      // 切换面板到 Edit Text（selection:created/updated 也 会兜底）
      setSelectedText(textObj);
      setSelectedImage(null);
      setSelectedArt(null); // Add Art: 切换到文本编辑时清理艺术素材
      setToolPanelType('edit-text');
      setToolPanelType('edit-text');
      setActiveTool('text');

      // CRITICAL FIX: Sync to store immediately
      const layers = serializeCanvas(canvas);
      setViewLayers(currentView, layers);
      commitToStore();
      console.log('[DesignLab 5.0] Add Text: synced to store');
    } catch (error) {
      console.error('[DesignLab 5.0] Add Text failed:', error);
    }
  };

  // Add Art: 添加艺术素材到 Fabric canvas（与 4.0/PRD 一致：Add Art → 画布生成图片对象 → 自动进入 Edit Art）
  // 增强：添加降级方案和详细错误处理
  const handleAddArt = (artUrl: string, artName: string) => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) {
      console.warn('[DesignLab 5.0] Add Art: canvas not ready');
      return;
    }

    // CORS 修复：如果是 GCS URL，使用图片代理绕过 CORS
    let imageUrl = artUrl;
    let useProxy = false;
    if (artUrl && (artUrl.includes('storage.googleapis.com') || artUrl.includes('.storage.googleapis.com'))) {
      // 使用前端图片代理 API 绕过 CORS
      imageUrl = `/ api / image - proxy ? src = ${encodeURIComponent(artUrl)} `;
      useProxy = true;
      console.log('[DesignLab 5.0] Using image proxy for GCS URL:', {
        original: artUrl.substring(0, 60) + '...',
        proxy: imageUrl,
        timestamp: new Date().toISOString()
      });
    }

    // 使用原生 Image 对象加载图片
    const imgElement = new window.Image();
    // 如果使用代理 URL，不需要 crossOrigin（代理服务器会处理）
    if (!imageUrl.includes('/api/image-proxy')) {
      imgElement.crossOrigin = 'anonymous';
    }

    imgElement.onload = () => {
      try {
        // 创建 Fabric Image 对象
        const fabricImage = new fabric.Image(imgElement, {
          selectable: true,
          evented: true,
          hasControls: true,
          hasBorders: false,
          borderColor: 'transparent',
          borderScaleFactor: 2,
          lockRotation: false,
          lockScalingX: false,
          lockScalingY: false,
          lockUniScaling: false,
          lockMovementX: false,
          lockMovementY: false,
          centeredScaling: true,
          centeredRotation: true,
        });

        // 智能缩放：缩放到画布的 30%
        const SCALE_RATIO = 0.3;
        const targetMaxWidth = CANVAS_WIDTH * SCALE_RATIO;
        const targetMaxHeight = CANVAS_HEIGHT * SCALE_RATIO;

        const originalWidth = fabricImage.width || 1;
        const originalHeight = fabricImage.height || 1;

        const scaleX = targetMaxWidth / originalWidth;
        const scaleY = targetMaxHeight / originalHeight;
        const scale = Math.min(scaleX, scaleY, 1);

        fabricImage.scale(scale);

        // 居中位置
        fabricImage.set({
          left: CANVAS_WIDTH / 2,
          top: CANVAS_HEIGHT / 2,
          originX: 'center',
          originY: 'center',
          name: `art_${Date.now()} `, // 使用 art_ 前缀标识艺术素材
          data: {
            layerType: 'art',
            zIndex: 15, // 艺术素材图层 zIndex 为 15（介于上传图层的 10 和文字图层的 20 之间）
          },
        });

        fabricImage.setCoords();
        canvas.add(fabricImage);

        // 复用 5.0 大尺寸图标控件（delete/duplicate/resize）
        if (typeof (canvas as any).addIconControlsToObject === 'function') {
          (canvas as any).addIconControlsToObject(fabricImage);
        }

        canvas.setActiveObject(fabricImage);
        canvas.renderAll();

        // 自动切换到 Edit Art 面板
        setSelectedArt(fabricImage);
        setSelectedImage(null);
        setSelectedText(null);
        setToolPanelType('edit-art');
        setActiveTool('art');

        // CRITICAL FIX: Sync to store immediately
        const layers = serializeCanvas(canvas);
        setViewLayers(currentView, layers);
        commitToStore();
        console.log('[DesignLab 5.0] Add Art: synced to store');

        console.log('[DesignLab 5.0] ✅ Art added to canvas:', {
          name: (fabricImage as any).name,
          url: artUrl.substring(0, 50) + '...',
        });
      } catch (error) {
        console.error('[DesignLab 5.0] Add Art failed:', error);
      }
    };

    // 增强错误处理：添加降级方案和详细日志
    imgElement.onerror = async (error) => {
      const timestamp = new Date().toISOString();
      console.error('[DesignLab 5.0] ❌ Failed to load art image:', {
        error,
        imageUrl,
        originalUrl: artUrl,
        useProxy,
        timestamp
      });

      // 如果使用代理失败，尝试直接加载原始 URL（降级方案）
      if (useProxy && artUrl) {
        console.warn('[DesignLab 5.0] ⚠️ Proxy failed, trying direct load as fallback:', {
          originalUrl: artUrl.substring(0, 60) + '...',
          timestamp
        });

        // 检查代理 API 的响应，获取详细错误信息
        try {
          const proxyResponse = await fetch(imageUrl);
          if (!proxyResponse.ok) {
            const errorData = await proxyResponse.json().catch(() => ({}));
            console.error('[DesignLab 5.0] Proxy API error details:', {
              status: proxyResponse.status,
              statusText: proxyResponse.statusText,
              error: errorData,
              timestamp
            });
          }
        } catch (fetchError) {
          console.error('[DesignLab 5.0] Failed to check proxy response:', {
            error: fetchError instanceof Error ? fetchError.message : String(fetchError),
            timestamp
          });
        }

        // 降级方案：尝试直接加载原始 URL
        const fallbackImg = new window.Image();
        fallbackImg.crossOrigin = 'anonymous';

        fallbackImg.onload = () => {
          console.log('[DesignLab 5.0] ✅ Fallback direct load succeeded');
          // 重新调用 handleAddArt，但这次不使用代理
          // 为了避免无限循环，我们直接处理这个图片
          try {
            const fabricImage = new fabric.Image(fallbackImg, {
              selectable: true,
              evented: true,
              hasControls: true,
              hasBorders: false,
              borderColor: 'transparent',
              borderScaleFactor: 2,
              lockRotation: false,
              lockScalingX: false,
              lockScalingY: false,
              lockUniScaling: false,
              lockMovementX: false,
              lockMovementY: false,
              centeredScaling: true,
              centeredRotation: true,
            });

            const SCALE_RATIO = 0.3;
            const targetMaxWidth = CANVAS_WIDTH * SCALE_RATIO;
            const targetMaxHeight = CANVAS_HEIGHT * SCALE_RATIO;

            const originalWidth = fabricImage.width || 1;
            const originalHeight = fabricImage.height || 1;

            const scaleX = targetMaxWidth / originalWidth;
            const scaleY = targetMaxHeight / originalHeight;
            const scale = Math.min(scaleX, scaleY, 1);

            fabricImage.scale(scale);
            fabricImage.set({
              left: CANVAS_WIDTH / 2,
              top: CANVAS_HEIGHT / 2,
              originX: 'center',
              originY: 'center',
              name: `art_${Date.now()} `,
              data: {
                layerType: 'art',
                zIndex: 15,
              },
            });

            fabricImage.setCoords();
            canvas.add(fabricImage);

            if (typeof (canvas as any).addIconControlsToObject === 'function') {
              (canvas as any).addIconControlsToObject(fabricImage);
            }

            canvas.setActiveObject(fabricImage);
            canvas.renderAll();

            setSelectedArt(fabricImage);
            setSelectedImage(null);
            setSelectedText(null);
            setToolPanelType('edit-art');
            setActiveTool('art');

            console.log('[DesignLab 5.0] ✅ Art added via fallback:', {
              name: (fabricImage as any).name,
              url: artUrl.substring(0, 50) + '...',
            });
          } catch (fallbackError) {
            console.error('[DesignLab 5.0] ❌ Fallback add art failed:', fallbackError);
          }
        };

        fallbackImg.onerror = (fallbackError) => {
          console.error('[DesignLab 5.0] ❌ Fallback direct load also failed:', {
            error: fallbackError,
            originalUrl: artUrl,
            timestamp
          });
          // 可以在这里显示用户友好的错误提示
        };

        fallbackImg.src = artUrl;
      } else {
        // 非代理 URL 加载失败，可能是图片不存在或其他问题
        console.error('[DesignLab 5.0] ❌ Direct image load failed, image may not exist:', {
          url: artUrl,
          timestamp
        });
      }
    };

    imgElement.src = imageUrl;
  };

  // 5.0 版本：获取当前视图的图片 URL
  // 5.0 版本：获取当前视图的图片 URL
  const getCurrentImageUrl = React.useCallback(() => {
    const url = productInfo.baseImages[currentView];
    console.log('[DesignLab 5.0] 获取图片 URL:', { currentView, url }); // 添加调试日志
    return url;
  }, [productInfo.baseImages, currentView]);

  // 5.0 版本：功能叠加 - 监听视图变化，验证图片切换
  useEffect(() => {
    const imageUrl = getCurrentImageUrl();
    console.log('[DesignLab 5.0] 视图已切换:', {
      currentView,
      imageUrl,
      hasImage: !!imageUrl
    });
  }, [currentView, getCurrentImageUrl]);

  // Zoom Toggle Function - 100% -> 120% -> 150% -> 100%
  const handleZoomToggle = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    let newZoom = 1;
    if (zoomLevel === 1) newZoom = 1.2;
    else if (zoomLevel === 1.2) newZoom = 1.5;
    else newZoom = 1;

    console.log('[DesignLab 5.0] Zooming to:', newZoom);

    // Zoom to center of the canvas
    const center = canvas.getCenter();
    const point = new fabric.Point(center.left, center.top);

    // Smooth zoom (optional, but standard setZoom is immediate)
    canvas.zoomToPoint(point, newZoom);

    setZoomLevel(newZoom);
  };

  return (
    <div className="design-lab-new">
      {/* MOBILE HEADER */}
      {/* MOBILE HEADER - REMOVED (Moved to MobileDesignLab) */}

      {/* 1. Header - 顶部导航栏 (Desktop Only) */}
      <header className="dl-header dl-desktop-only" data-testid="header">
        <div className="dl-header__content">
          <div className="dl-header__left">
            <Link href="/" className="dl-header__logo" aria-label="Souvenir Plus Inc home" style={{ display: 'flex', alignItems: 'center' }}>
              <Image src="/logo.png" alt="Souvenir Plus Inc" width={200} height={34} priority style={{ height: '34px', width: 'auto', objectFit: 'contain' }} />
            </Link>
            <nav className="dl-header__breadcrumb" aria-label="Breadcrumb">
              <Link href="/account/designs" className="dl-header__breadcrumb-link">My Designs</Link>
              <span className="dl-header__breadcrumb-separator">/</span>
              <span className="dl-header__breadcrumb-current">{designName || 'Untitled Design'}</span>
            </nav>
          </div>
          {/* Contact Section: Phone & Chat */}
          <div className="dl-header__right">
            {/* Contact Section: Phone & Chat */}
            <div className="dl-header__contact-group">
              {/* Phone Block */}
              <div className="dl-header__contact-item">
                <span className="dl-header__icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.49-5.15-3.8-6.62-6.63l1.97-1.57c.23-.24.31-.56.25-.87-.38-1.1-.56-2.29-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" />
                  </svg>
                </span>
                <div className="dl-header__text-group">
                  <span className="dl-header__label">Talk to a Real Person</span>
                  <a href="tel:4169166352" className="dl-header__action">416 916 6352</a>
                </div>
              </div>

              {/* Chat Block */}
              <div className="dl-header__contact-item">
                <span className="dl-header__icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                  </svg>
                </span>
                <div className="dl-header__text-group">
                  <span className="dl-header__label">Chat with a Real Person</span>
                  <a href="/help#guestbook" className="dl-header__action" target="_blank" rel="noopener noreferrer">Chat now</a>
                </div>
              </div>
            </div>

            {user ? (
              <Link href="/account" className="dl-header__signin-link">
                {user.firstName || user.email || 'My Account'}
              </Link>
            ) : (
              <Link
                href={`/login?redirect=${encodeURIComponent('/design-lab')}`}
                className="dl-header__signin-link"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header >

      {/* 2-5. Main Content - Rail + Tool Panel + Canvas + Sidebar */}
      {/* 5.0 版本：修复布局结构，所有列必须在 .dl-main 容器内 */}
      <div className="dl-main">
        {/* MOBILE VIEW SWITCHER & FLOATING CONTROLS - REMOVED (Moved to MobileDesignLab) */}

        {/* 2. Rail - 左侧深灰色工具栏 (Desktop Only) */}
        {/* 5.0 版本：与 4.0 版本 UI 一致 - Rail 工具栏 */}
        {/* 5.0 版本：添加 ref 用于调试 */}
        {/* 5.0 版本：功能3 - Rail 按钮点击交互 */}
        <nav ref={railRef} className="dl-rail dl-desktop-only" aria-label="Design tools" data-testid="rail">
          <button
            className={`dl-rail__btn ${activeTool === 'upload' ? 'is-active' : ''} `}
            onClick={() => handleToolClick('upload')}
            aria-label="Upload image"
            aria-pressed={activeTool === 'upload'}
            title="Upload"
          >
            <span className="dl-rail__btn-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
                <polyline points="16 16 12 12 8 16"></polyline>
                <line x1="12" y1="12" x2="12" y2="21"></line>
              </svg>
            </span>
            <span className="dl-rail__btn-label">Upload</span>
          </button>

          <button
            className={`dl-rail__btn ${activeTool === 'text' ? 'is-active' : ''} `}
            onClick={() => handleToolClick('text')}
            aria-label="Add text"
            aria-pressed={activeTool === 'text'}
            title="Add Text"
          >
            <span className="dl-rail__btn-icon dl-rail__icon--text">T</span>
            <span className="dl-rail__btn-label">Add Text</span>
          </button>

          <button
            className={`dl-rail__btn ${activeTool === 'art' ? 'is-active' : ''} `}
            onClick={() => handleToolClick('art')}
            aria-label="Add art"
            aria-pressed={activeTool === 'art'}
            title="Add Art"
          >
            <span className="dl-rail__btn-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </span>
            <span className="dl-rail__btn-label">Add Art</span>
          </button>

          <button
            className={`dl-rail__btn ${activeTool === 'product-colors' ? 'is-active' : ''} `}
            onClick={() => handleToolClick('product-colors')}
            aria-label="Product Details"
            aria-pressed={activeTool === 'product-colors'}
            title="Product Details"
            style={{ height: 'auto', minHeight: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
          >
            <span className="dl-rail__btn-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
              </svg>
            </span>
            <span className="dl-rail__btn-label">Product & Color</span>
          </button>
        </nav>

        {/* 3. ToolPanel - 左侧工具面板 (May show on mobile if active) */}
        {/* 5.0 版本：功能3 - ToolPanel 面板切换 */}
        <div className={`dl-tool-panel-wrapper ${toolPanelType !== 'home' ? 'is-open' : ''}`}> {/* Wrapper for mobile handling if needed */}
          {toolPanelType && (
            <aside className="dl-tool-panel" aria-label="Tool panel" data-testid="panel">
              <div className="dl-tool-panel__content">
                {/* Home 面板 */}
                {toolPanelType === 'home' && (
                  <>
                    <div className="dl-tool-panel__header">
                      {/* [MODIFY] Removed title as per request */}
                    </div>
                    <div className="dl-home-panel dl-desktop-only">
                      <div className="dl-home-panel__actions">
                        <button
                          className="dl-home-panel__action"
                          aria-label="Upload"
                          onClick={() => handleToolClick('upload')}
                        >
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                          </svg>
                          <span>Upload</span>
                        </button>

                        <button
                          className="dl-home-panel__action"
                          aria-label="Add Text"
                          onClick={() => handleToolClick('text')}
                        >
                          <span className="dl-home-panel__text-icon">abc</span>
                          <span>Add Text</span>
                        </button>

                        <button
                          className="dl-home-panel__action"
                          aria-label="Add Art"
                          onClick={() => handleToolClick('art')}
                        >
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                          </svg>
                          <span>Add Art</span>
                        </button>
                      </div>

                      {/* Hint Removed */}
                    </div>
                  </>
                )}

                {/* Upload 面板 */}
                {/* 5.0 版本：步骤1 - 集成 UploadPanel 组件 */}
                {toolPanelType === 'upload' && (
                  <UploadPanel
                    onFileSelect={handleFileUpload}
                    onBrowseClick={() => { }}
                    onClose={handleBackToHome}
                  />
                )}

                {/* Edit Upload 面板 */}
                {/* 上传图片后显示的编辑面板 */}
                {toolPanelType === 'edit-upload' && (
                  <EditUploadPanel
                    selectedImage={selectedImage}
                    canvas={fabricCanvasRef.current}
                    onUpdate={handleCanvasUpdate}
                    onClose={handleBackToHome}
                    onSave={handleSaveRequest} // Use handleSaveRequest
                    onReset={handleResetUpload}
                    onCrop={handleStartCrop}
                  />
                )}

                {/* Crop Overlay */}
                {isCropping && croppingImage && (
                  <ImageCropper
                    imageSrc={(croppingImage as any).originalSrc || croppingImage.getSrc()}
                    onApply={handleApplyCrop}
                    onCancel={() => {
                      setIsCropping(false);
                      setCroppingImage(null);
                    }}
                  />
                )}

                {/* Text 面板 */}
                {toolPanelType === 'text' && (
                  <>
                    <div className="dl-tool-panel__header">
                      <h2 className="dl-tool-panel__title">Add Text</h2>
                      <button
                        className="dl-tool-panel__back-btn"
                        onClick={handleBackToHome}
                        aria-label="Back to home"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        Back
                      </button>
                    </div>
                    {/* Add Text: 复用 4.0 TextPanel（输入文本并 Add To Design） */}
                    <TextPanel onAddText={handleAddText} />
                  </>
                )}

                {/* Edit Text 面板 */}
                {/* Add Text: 文本选中后显示编辑面板 */}
                {toolPanelType === 'edit-text' && (
                  <>
                    <div className="dl-tool-panel__header">
                      <h2 className="dl-tool-panel__title">Edit Text</h2>
                      <button
                        className="dl-tool-panel__back-btn"
                        onClick={handleBackToHome}
                        aria-label="Back to home"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        Back
                      </button>
                    </div>
                    <EditTextPanel selectedText={selectedText} canvas={fabricCanvasRef.current} onUpdate={handleCanvasUpdate} onSave={handleSaveRequest} />
                  </>
                )}

                {/* Art 面板 */}
                {toolPanelType === 'art' && (
                  <ArtPanel onSelectArt={handleAddArt} />
                )}

                {/* Product Colors 面板 */}
                {toolPanelType === 'product-colors' && (
                  <ProductColorsPanel
                    productName={productInfo.productName || 'Gildan Softstyle Jersey T-shirt'}
                    colors={dynamicColors.length > 0 ? dynamicColors : PRODUCT_COLORS}
                    selectedColor={productInfo.color}
                    onSelectColor={handleColorSelect}
                    onClose={handleBackToHome}
                    onChangeProduct={() => {
                      setCatalogMode('change');
                      setIsCatalogModalOpen(true);
                    }}
                  />
                )}

                {/* Edit Art 面板 */}
                {toolPanelType === 'edit-art' && (
                  <>
                    <div className="dl-tool-panel__header">
                      <h2 className="dl-tool-panel__title">Edit Art</h2>
                      <button
                        className="dl-tool-panel__back-btn"
                        onClick={handleBackToHome}
                        aria-label="Back to home"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        Back
                      </button>
                    </div>
                    <EditArtPanel
                      selectedArt={selectedArt}
                      canvas={fabricCanvasRef.current}
                      onUpdate={handleCanvasUpdate}
                      onChangeArt={() => {
                        setSelectedArt(null);
                        setToolPanelType('art');
                      }}
                      onSave={handleSaveRequest}
                    />
                  </>
                )}
              </div>
            </aside>
          )}
        </div>

        {/* 4. Canvas - 中央画布区域 */}
        {/* 5.0 版本：添加 ref 用于调试 */}
        {/* 步骤2 - 替换为 Fabric.js canvas */}
        <section className="dl-canvas" aria-label="Design canvas" data-testid="canvas">
          <div className="dl-canvas__preview">
            <canvas
              ref={canvasRef}
              className="dl-canvas__fabric"
              style={{ width: '100%', height: '100%' }}
            />
            {/* Adding support for Floating Object Controls (HTML-based overlays) */}
            <FloatingObjectControls
              canvas={fabricCanvasRef.current}
              fabricModule={fabricRef.current}
            />
          </div>
        </section>

        {/* 5. Sidebar - 右侧视图切换面板 (Desktop Only) */}
        {/* 5.0 版本：与 4.0 版本 UI 一致 - Sidebar 完整内容 */}
        {/* 5.0 版本：添加 ref 用于调试 */}
        <aside ref={sidebarRef} className="dl-sidebar dl-desktop-only" aria-label="View options" data-testid="sidebar">
          <button
            className={`dl-sidebar__btn ${currentView === 'front' ? 'is-active' : ''} `}
            onClick={() => handleViewChange('front')}
            aria-label="Front view"
            aria-pressed={currentView === 'front'}
          >
            <div className="dl-sidebar__thumbnail">
              {productInfo.baseImages.front ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={productInfo.baseImages.front}
                  alt="Front view thumbnail"
                  className="dl-sidebar__thumbnail-image"
                />
              ) : (
                <div className="dl-sidebar__thumbnail-placeholder">Front</div>
              )}
            </div>
            <span className="dl-sidebar__label">Front</span>
          </button>

          {productInfo.baseImages.back && (
            <button
              className={`dl-sidebar__btn ${currentView === 'back' ? 'is-active' : ''} `}
              onClick={() => handleViewChange('back')}
              aria-label="Back view"
              aria-pressed={currentView === 'back'}
            >
              <div className="dl-sidebar__thumbnail">
                {productInfo.baseImages.back ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={productInfo.baseImages.back}
                    alt="Back view thumbnail"
                    className="dl-sidebar__thumbnail-image"
                  />
                ) : (
                  <div className="dl-sidebar__thumbnail-placeholder">Back</div>
                )}
              </div>
              <span className="dl-sidebar__label">Back</span>
            </button>
          )}

          {productInfo.baseImages['left-sleeve'] && (
            <button
              className={`dl-sidebar__btn ${currentView === 'left-sleeve' ? 'is-active' : ''} `}
              onClick={() => handleViewChange('left-sleeve')}
              aria-label="Left Sleeve"
              aria-pressed={currentView === 'left-sleeve'}
            >
              <div className="dl-sidebar__thumbnail">
                {productInfo.baseImages['left-sleeve'] ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={productInfo.baseImages['left-sleeve']}
                    alt="Left Sleeve"
                    className="dl-sidebar__thumbnail-image"
                  />
                ) : (
                  <div className="dl-sidebar__thumbnail-placeholder">L.Slv</div>
                )}
              </div>
              <span className="dl-sidebar__label">L.Sleeve</span>
            </button>
          )}

          {productInfo.baseImages['right-sleeve'] && (
            <button
              className={`dl-sidebar__btn ${currentView === 'right-sleeve' ? 'is-active' : ''} `}
              onClick={() => handleViewChange('right-sleeve')}
              aria-label="Right Sleeve"
              aria-pressed={currentView === 'right-sleeve'}
            >
              <div className="dl-sidebar__thumbnail">
                {productInfo.baseImages['right-sleeve'] ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={productInfo.baseImages['right-sleeve']}
                    alt="Right Sleeve"
                    className="dl-sidebar__thumbnail-image"
                  />
                ) : (
                  <div className="dl-sidebar__thumbnail-placeholder">R.Slv</div>
                )}
              </div>
              <span className="dl-sidebar__label">R.Sleeve</span>
            </button>
          )}

          <button
            className={`dl-sidebar__btn ${zoomLevel > 1 ? 'is-active' : ''} `}
            onClick={handleZoomToggle}
            aria-label="Zoom"
            aria-pressed={zoomLevel > 1}
          >
            <span className="dl-sidebar__icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
                {zoomLevel > 1 ? (
                  <line x1="8" y1="11" x2="14" y2="11" />
                ) : (
                  <>
                    <line x1="11" y1="8" x2="11" y2="14" />
                    <line x1="8" y1="11" x2="14" y2="11" />
                  </>
                )}
              </svg>
            </span>
            <span className="dl-sidebar__label">Zoom {Math.round(zoomLevel * 100)}%</span>
          </button>
        </aside>
      </div>

      {/* MOBILE BOTTOM NAV - REMOVED (Moved to MobileDesignLab) */}

      {/* 鼠标位置调试面板 */}
      {
        mouseDebug && (
          <div
            style={{
              position: 'fixed',
              top: '10px',
              right: '10px',
              backgroundColor: mouseDebug.onControl ? '#4CAF50' : 'rgba(0, 0, 0, 0.8)',
              color: mouseDebug.onControl ? '#fff' : '#fff',
              padding: '12px 16px',
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '12px',
              zIndex: 10000,
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
              pointerEvents: 'none',
              border: mouseDebug.onControl ? '2px solid #4CAF50' : '1px solid #333',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>
              🖱️ 鼠标位置 {mouseDebug.onControl && '✅ 在控件上'}
            </div>
            <div style={{ lineHeight: '1.6' }}>
              <div>屏幕: ({mouseDebug.x}, {mouseDebug.y})</div>
              <div>画布: ({mouseDebug.canvasX}, {mouseDebug.canvasY})</div>
              {mouseDebug.targetObject && (
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                  <div>对象: {mouseDebug.targetObject}</div>
                  {mouseDebug.controlType && (
                    <div style={{ color: mouseDebug.onControl ? '#FFD700' : '#fff' }}>
                      控件: {mouseDebug.controlType}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      }

      {/* 6. BottomBar - 底部操作栏 */}
      <footer className="dl-bottom-bar dl-desktop-only" role="contentinfo" data-testid="bottom-bar">
        <div className="dl-bottom-bar__left" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="dl-bottom-bar__add-products"
            onClick={() => {
              setCatalogMode('add');
              setIsCatalogModalOpen(true);
            }}
            type="button"
            style={{ flexShrink: 0 }}
          >
            + Add Products
          </button>

          {/* Carousel Left Arrow */}
          {productList.length > VISIBLE_PRODUCTS && (
            <button
              type="button"
              onClick={handleScrollLeft}
              disabled={productScrollIndex === 0}
              style={{
                background: 'none',
                border: 'none',
                color: '#333', // Dark color for visibility
                cursor: productScrollIndex === 0 ? 'default' : 'pointer',
                opacity: productScrollIndex === 0 ? 0.3 : 1,
                fontSize: '20px',
                padding: '0 8px'
              }}
            >
              &lt;
            </button>
          )}

          {/* Product List Viewport */}
          <div style={{
            display: 'flex',
            gap: '8px',
            overflow: 'hidden',
            maxWidth: '500px' // Adjust based on card width approx 2 cards
          }}>
            {productList.slice(productScrollIndex, productScrollIndex + VISIBLE_PRODUCTS).map((prod, index) => {
              // We need the original index to key correctly if we want stability, 
              // but using logic index is cleaner.
              // Actually, map index here is 0..1. Let's use computed index for keys/updates if needed? 
              // unique key is productId-indexInFullList logic...
              // Let's rely on prod.productId for key mostly.
              // Note: productList might have duplicates if user adds same product twice? Assuming unique IDs or okay to duplicate.
              // Let's use `prod.productId-${productScrollIndex + index}` to be safe.

              const realIndex = productScrollIndex + index;
              const isActive = prod.productId === productInfo.productId;

              return (
                <div
                  key={`${prod.productId}-${realIndex}`}
                  className={`dl-bottom-bar__product-info ${isActive ? 'is-active' : ''}`}
                  style={{
                    cursor: 'pointer',
                    opacity: isActive ? 1 : 0.6,
                    border: isActive ? '2px solid #0066cc' : '1px solid #ccc',
                    borderRadius: '8px',
                    padding: '6px',
                    minWidth: '200px', // Fixed width for stability
                    maxWidth: '200px',
                    height: '70px',    // Fixed height
                    boxSizing: 'border-box',
                    display: 'flex',
                    alignItems: 'center',
                    background: isActive ? 'rgba(0,102,204,0.1)' : 'transparent',
                    flexShrink: 0
                  }}
                  onClick={() => {
                    setProductInfo(prod);
                    if (typeof window !== 'undefined') {
                      const url = new URL(window.location.href);
                      url.searchParams.set('productId', prod.productId);
                      if (prod.variantId) {
                        url.searchParams.set('variantId', prod.variantId);
                      }
                      window.history.replaceState({}, '', url.toString());
                    }
                  }}
                >
                  <div className="dl-bottom-bar__product-thumb" style={{ width: '50px', height: '50px', flexShrink: 0 }}>
                    {prod.baseImages.front ? (
                      <img src={prod.baseImages.front} alt="Thumb" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <div className="dl-bottom-bar__product-thumb-placeholder">P</div>
                    )}
                  </div>
                  <div className="dl-bottom-bar__product-details" style={{ marginLeft: '8px', overflow: 'hidden', flex: 1 }}>
                    <div className="dl-bottom-bar__product-name" style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: '#333', // Dark color for visibility
                      marginBottom: '4px'
                    }} title={typeof prod.productName === 'object' ? (prod.productName as any).name : prod.productName}>
                      {typeof prod.productName === 'object' ? (prod.productName as any).name : (prod.productName || 'Product')}
                    </div>

                    <div className="dl-bottom-bar__product-links">
                      {/* Removed Change Product Button */}
                      <button
                        className="dl-bottom-bar__link"
                        type="button"
                        style={{ fontSize: '11px', color: '#0066cc', textDecoration: 'underline' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          // Open product details in new tab
                          // Use slug if available, fallback to ID
                          const targetId = prod.slug || prod.productId;
                          if (targetId) {
                            window.open(`/products/${targetId}`, '_blank');
                          }
                        }}
                      >
                        Details
                      </button>
                      <span style={{ fontSize: '11px', color: '#ccc', margin: '0 4px' }}>|</span>
                      <button
                        className="dl-bottom-bar__link"
                        type="button"
                        style={{ fontSize: '11px', color: '#0066cc', textDecoration: 'underline' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCatalogMode('change');
                          setIsCatalogModalOpen(true);
                        }}
                      >
                        Change
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Carousel Right Arrow */}
          {productList.length > VISIBLE_PRODUCTS && (
            <button
              type="button"
              onClick={handleScrollRight}
              disabled={productScrollIndex >= productList.length - VISIBLE_PRODUCTS}
              style={{
                background: 'none',
                border: 'none',
                color: '#333', // Dark color for visibility
                cursor: productScrollIndex >= productList.length - VISIBLE_PRODUCTS ? 'default' : 'pointer',
                opacity: productScrollIndex >= productList.length - VISIBLE_PRODUCTS ? 0.3 : 1,
                fontSize: '20px',
                padding: '0 8px'
              }}
            >
              &gt;
            </button>
          )}

        </div>

        <div className="dl-bottom-bar__right">
          <button
            className="dl-bottom-bar__btn dl-bottom-bar__btn--secondary"
            onClick={handleSaveRequest} // Use handleSaveRequest
            type="button"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            Save
          </button>
          <button
            className="dl-bottom-bar__btn dl-bottom-bar__btn--primary"
            onClick={async () => {
              // User requested to remove save validation.
              // Auto-save silently if design is not yet saved to ensure we have a designId for the quote API.
              if (!designId) {
                try {
                  const savedId = await handleSaveDesign();
                  if (savedId) {
                    setShowGetPriceModal(true);
                  }
                } catch (e) {
                  console.error("Auto-save failed before Get Price:", e);
                }
              } else {
                setShowGetPriceModal(true);
              }
            }}
            type="button"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
            Get Price
          </button>
        </div>
      </footer >

      <ProductSelectorModal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        onSelectProduct={handleProductSelectObject as any}
        currentProductId={productInfo.productId || ''}
      />

      <ProductCatalogModal
        isOpen={isCatalogModalOpen}
        onClose={() => setIsCatalogModalOpen(false)}
        onSelectProduct={handleProductSelect}
      />

      <QuickLoginModal
        isOpen={showQuickLoginModal}
        onClose={() => setShowQuickLoginModal(false)}
        onLoginSuccess={() => {
          setShowQuickLoginModal(false);
          setShowSaveShareModal(true); // Continue to save after login
        }}
      />

      <SaveShareModal
        isOpen={showSaveShareModal}
        onClose={() => setShowSaveShareModal(false)}
        designId={designId || null}
        designName={designName}
        onSave={async (name) => {
          console.log('[DesignLab 5.0] onSave called with name:', name);
          // FINAL FIX: Pass name directly to save function
          // Don't rely on state updates - pass the name as a parameter
          setDesignName(name); // Still update state for UI
          commitToStore(); // Checkpoint to local store
          await handleSaveDesign(name); // Pass name directly
        }}
        onShare={handleShareDesign}
      />

      <GetPriceFlowModal
        isOpen={showGetPriceModal}
        onClose={() => setShowGetPriceModal(false)}
        designId={designId || null}
        onAddToCart={handleAddToCart}
        getQuoteData={getQuoteDataInternal}
        productName={productInfo.productName}
        variants={productInfo.variants}
        // Pass persistent states
        currentStep={getPriceStep}
        setCurrentStep={setGetPriceStep}
        orderingOptions={getPriceOrderingOptions}
        setOrderingOptions={setGetPriceOrderingOptions}
        sizeQuantities={getPriceSizeQuantities}
        setSizeQuantities={setGetPriceSizeQuantities}
        estimatedQuantity={getPriceEstimatedQuantity}
        setEstimatedQuantity={setGetPriceEstimatedQuantity}
        quoteData={getPriceQuoteData}
        setQuoteData={setGetPriceQuoteData}
      />

      <ColorSelectorModal
        isOpen={showColorModal}
        onClose={() => setShowColorModal(false)}
        productId={productInfo.productId || ''}
        selectedColor={productInfo.color}
        onSelectColor={handleColorSelect}
        productName={productInfo.productName || ''}
      />
    </div >
  );
};

export default DesignLabClient5;
