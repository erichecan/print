'use client';

/**
 * Design Lab 5.0 - 极简版本
 * [2025-12-20 02:20:00] 完全参考 Custom Ink，使用最简单的 HTML/CSS 实现
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
import { useSearchParams } from 'next/navigation'; // [2025-12-20 03:05:00] 5.0 版本：功能2 - 从 URL 参数获取 productId/colorId
import { getDefaultProductBaseImages, getThumbnailImageUrl, getProductBaseImagesFromAPI } from '@/lib/customink-images';
import UploadPanel from './components/panels/UploadPanel'; // [2025-12-20 03:15:00] 5.0 版本：步骤1 - 集成 UploadPanel 组件
import EditUploadPanel from './components/panels/EditUploadPanel'; // [2025-12-14 05:50:00] 5.0 版本：上传图片编辑面板
import TextPanel from './components/panels/TextPanel'; // [2025-12-16 07:10:00] 5.0 版本：Add Text - 复用 4.0 TextPanel
import EditTextPanel from './components/panels/EditTextPanel'; // [2025-12-16 07:10:00] 5.0 版本：Add Text - 复用 4.0 EditTextPanel
import ArtPanel from './components/panels/ArtPanel'; // [2025-01-30 12:58:00] 5.0 版本：Add Art - 素材库面板
import ProductColorsPanel from './components/panels/ProductColorsPanel'; // [2025-12-20] 5.0 版本：Product Colors - 颜色选择面板
import EditArtPanel from './components/panels/EditArtPanel'; // [2025-01-30 12:58:00] 5.0 版本：Add Art - 编辑面板
import * as fabric from 'fabric';
import ProductCatalogModal from './components/modals/ProductCatalogModal';
import { PRODUCT_COLORS } from '@/lib/product-data';
// [2025-12-18 21:18:56] 产品模块：导入产品选择器和颜色选择器
import ProductSelectorModal from './modules/product/ProductSelectorModal';
import ColorSelectorModal from './modules/product/ColorSelectorModal';
import { getProducts, getProductByVariant, getProduct, type Product, type ProductDetail } from './api/product';
// [2025-12-18 21:20:48] 保存模块：导入保存相关组件和 hooks
import SaveShareModal from './components/modals/SaveShareModal';
import { useDesign } from './modules/save/useDesign';
// [2025-12-18 21:23:43] 报价模块：导入报价相关组件和 hooks
import GetPriceFlowModal from './components/modals/GetPriceFlowModal';
import { usePricing } from './modules/pricing/usePricing';
import './design-lab.css';

// [2025-12-18 21:18:56] 画布常量
const CANVAS_WIDTH = 4000;
const CANVAS_HEIGHT = 4800;
// [2025-01-31] 打印区域常量 (Custom Ink 风格)
const PRINTABLE_WIDTH = 1400;
const PRINTABLE_HEIGHT = 1800;

// [2025-12-20 03:00:00] 5.0 版本：添加 props 接口（为后续功能准备）
interface DesignLabClient5Props {
  initialProductData?: any; // [2025-12-20 03:00:00] 服务端预取的产品数据（暂时未使用）
}

const DesignLabClient5: React.FC<DesignLabClient5Props> = ({ initialProductData }) => {
  // [2025-12-20 03:05:00] 5.0 版本：功能2 - 从 URL 参数获取 productId/colorId
  const searchParams = useSearchParams();

  // [2025-12-20 02:20:00] 5.0 版本：只保留最基本的 state
  const [currentView, setCurrentView] = useState<'front' | 'back' | 'sleeve'>('front');

  // [2025-12-20 03:05:00] 5.0 版本：功能2 - 改为 useState，支持动态更新
  // [2025-12-20 03:30:00] 修复：初始状态使用默认白色 T 恤图片，确保用户直接从导航进入时也能正常显示
  // [2025-12-18 21:18:56] 产品模块：添加产品名称字段
  const [productInfo, setProductInfo] = useState<{
    color: string;
    baseImages: {
      front: string;
      back: string;
      sleeve: string;
    };
    productId?: string;
    colorId?: string;
    productName?: string; // [2025-12-18 21:18:56] 产品名称
    variants?: Array<{ id: string; color: string | null }>; // [2025-12-20] 添加 variants 用于颜色切换时查找 ID
  }>(() => {
    // [2025-12-20 03:30:00] 使用函数初始化，确保默认图片在组件创建时就设置好
    const defaultImages = getDefaultProductBaseImages('White');
    return {
      color: 'White',
      baseImages: defaultImages,
      // [2025-12-20] Use dynamic fetching instead of hardcoded IDs to prevent 404s
      // We will fetch a valid product in useEffect if no URL params are present
      productId: undefined,
      colorId: undefined,
      productName: 'Loading...',
      variants: [],
    };
  });

  // [2025-12-20 03:05:00] 5.0 版本：功能2 - 从 URL 参数加载商品信息
  // [2025-12-20 03:30:00] 修复：添加默认图片机制，如果用户直接从导航进入，显示默认白色 T 恤
  useEffect(() => {
    const productId = searchParams?.get('productId') || undefined;
    const colorId = searchParams?.get('colorId') || undefined;
    const variantId = searchParams?.get('variantId') || undefined;

    console.log('[DesignLab 5.0] 功能2 - URL 参数:', { productId, colorId, variantId });

    // [2025-12-20 03:30:00] 如果有 variantId，优先从服务端预取的数据中获取
    if (initialProductData && variantId) {
      console.log('[DesignLab 5.0] 功能2 - 使用服务端预取的数据:', initialProductData);
      const color = initialProductData.color || initialProductData.colorName || 'White';
      const baseImages = initialProductData.baseImages || getDefaultProductBaseImages(color);

      setProductInfo({
        color,
        baseImages,
        productId: initialProductData.productId || productId,
        colorId: initialProductData.colorId || colorId,
      });
      return;
    }

    // [2025-12-20 03:30:00] 如果有 productId，尝试从 API 获取完整产品信息（包括 variantId）
    // [2025-12-20] 修复：优先处理 productId，并允许 colorId覆盖默认颜色
    if (productId && !initialProductData) {
      console.log('[DesignLab 5.0] 功能2 - 从 API 获取指定产品信息:', { productId });

      getProduct(productId)
        .then((product: ProductDetail) => {
          if (product) {
            console.log('[DesignLab 5.0] 产品信息获取成功:', product.productName);

            // [2025-12-20] 修复：如果 URL 中有 valid colorId，优先使用
            let resolvedColor = product.color || 'White';
            let resolvedVariantId = product.variantId;

            // [2025-12-20] 改进：根据颜色名称查找对应的 variantId
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
            // [2025-12-21] Fix: If backend returned generic fallback (hero-card-tee.jpg), treat it as "no image" 
            // and use GCS generator instead, even if color matched.
            let shouldUseDefaultImages = resolvedColor !== product.color;
            if (!shouldUseDefaultImages && product.baseImages && product.baseImages.front && product.baseImages.front.includes('hero-card-tee.jpg')) {
              console.warn('[DesignLab 5.0] Generic fallback image detected on initial load, switching to GCS generator');
              shouldUseDefaultImages = true;
            }

            const images = shouldUseDefaultImages
              ? getDefaultProductBaseImages(resolvedColor)
              : (product.baseImages || getDefaultProductBaseImages(resolvedColor));

            // [2025-12-21] 修复：检查 variants 是否为空
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
              baseImages: images,
              variants: product.variants || [], // 保存 variants 列表
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

    // [2025-12-20] 修复：如果 URL 中没有 productId（无论是否有 colorId），都加载默认产品
    // [2025-12-21] 改进：加载特定的 Design Lab 默认产品 (design-lab-default-tee)
    if (!productId && !initialProductData) {
      console.log('[DesignLab 5.0] No product selected, fetching DEFAULT Design Lab product...');
      // 只有在还没有产品ID时才获取
      if (!productInfo.productId) {
        // 使用 slug 查询特定的默认产品
        getProducts({ search: 'design-lab-default-tee', limit: 1 })
          .then((response: any) => {
            if (response.data && response.data.length > 0) {
              const defaultProduct = response.data.find((p: any) => p.slug === 'design-lab-default-tee') || response.data[0];
              console.log('[DesignLab 5.0] Loaded default product:', defaultProduct.name);
              handleProductSelect(defaultProduct.id);
            } else {
              // Fallback to ANY product if the specific default one isn't found
              getProducts({ limit: 1 }).then((res: any) => {
                if (res.data && res.data.length > 0) {
                  handleProductSelect(res.data[0].id);
                }
              });
            }
          })
          .catch((err: any) => console.warn('[DesignLab 5.0] Failed to load default product:', err));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, initialProductData]); // [2025-12-20 03:05:00] 依赖 searchParams 和 initialProductData

  // [2025-12-20 02:50:00] 5.0 版本：添加调试日志，确保元素正确渲染
  const railRef = useRef<HTMLElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); // [2025-12-20 03:20:00] 步骤2 - 改为 HTMLCanvasElement
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null); // [2025-12-20 03:20:00] 步骤2 - Fabric canvas ref
  const fabricRef = useRef<typeof fabric | null>(null); // [2025-12-20 03:20:00] 步骤2 - Fabric 对象 ref
  const [canvasInitialized, setCanvasInitialized] = useState(false); // [2025-12-20 03:50:00] 用于触发图片加载的 state
  const cleanupMouseListenerRef = useRef<(() => void) | null>(null); // [2025-12-14 06:35:00] 保存鼠标监听器清理函数

  // [2025-12-20 03:55:00] 调试：监听 canvasInitialized 变化
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

  // [2025-12-20 03:10:00] 5.0 版本：功能3 - ToolPanel 面板类型 state
  // [2025-12-14 05:50:00] 添加 edit-upload 面板类型
  type ToolPanelType = 'home' | 'upload' | 'text' | 'art' | 'edit-upload' | 'edit-text' | 'edit-art' | 'product-colors' | null; // [2025-01-30 12:58:00] Add Art: 增加 edit-art
  const [toolPanelType, setToolPanelType] = useState<ToolPanelType>('home');
  const [activeTool, setActiveTool] = useState<string | null>(null);

  // [2025-12-14 05:50:00] 当前选中的上传图片对象
  const [selectedImage, setSelectedImage] = useState<fabric.Image | null>(null);
  // [2025-12-16 07:10:00] Add Text: 当前选中的文本对象
  const [selectedText, setSelectedText] = useState<fabric.IText | null>(null);
  const [selectedArt, setSelectedArt] = useState<fabric.Image | null>(null);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false); // [2025-12-20] 5.0 Version: Catalog Modal state

  // [2025-12-14 06:35:00] 鼠标位置调试信息
  const [mouseDebug, setMouseDebug] = useState<{
    x: number;
    y: number;
    canvasX: number;
    canvasY: number;
    onControl: boolean;
    controlType: string | null;
    targetObject: string | null;
  } | null>(null);

  // [2025-12-18 21:18:56] 产品模块：产品选择器和颜色选择器状态
  const [showProductModal, setShowProductModal] = useState(false);
  const [showColorModal, setShowColorModal] = useState(false);

  // [2025-12-18 21:20:48] 保存模块：设计名称状态（独立管理，因为 SaveShareModal 需要可编辑）
  const [designName, setDesignName] = useState<string>('Untitled Design');
  const [designId, setDesignId] = useState<string | null>(null);

  // [2025-12-18 21:20:48] 保存模块：使用 useDesign hook（canvas 可能为 null，需要在保存时检查）
  const {
    saveDesign: saveDesignInternal,
    shareDesignLink,
    isSaving,
    error: designError,
  } = useDesign({
    canvas: fabricCanvasRef.current,
    canvasWidth: CANVAS_WIDTH,
    canvasHeight: CANVAS_HEIGHT,
    productVariantId: productInfo.colorId || productInfo.productId,
    initialDesignId: designId,
    initialDesignName: designName,
  });

  // [2025-12-18 21:20:48] 保存模块：SaveShareModal 状态
  const [showSaveShareModal, setShowSaveShareModal] = useState(false);

  // [2025-12-18 21:23:43] 报价模块：使用 usePricing hook
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
    currentView, // [2025-12-18 21:23:43] 传递当前视图
  });

  // [2025-12-18 21:23:43] 报价模块：GetPriceFlowModal 状态
  const [showGetPriceModal, setShowGetPriceModal] = useState(false);

  // [2025-12-20 03:00:00] 5.0 版本：功能叠加 - 视图切换功能
  const handleViewChange = (view: 'front' | 'back' | 'sleeve') => {
    console.log('[DesignLab 5.0] 视图切换:', { from: currentView, to: view }); // [2025-12-20 03:00:00] 添加调试日志
    setCurrentView(view);
  };

  // [2025-12-20 03:10:00] 5.0 版本：功能3 - Rail 按钮点击处理
  const handleToolClick = (tool: 'upload' | 'text' | 'art' | 'product-colors') => {
    console.log('[DesignLab 5.0] 功能3 - Rail 按钮点击:', { tool, previousTool: activeTool }); // [2025-12-20 03:10:00] 添加调试日志

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

  // [2025-12-20 03:10:00] 5.0 版本：功能3 - 返回 home 面板
  const handleBackToHome = () => {
    console.log('[DesignLab 5.0] 功能3 - 返回 home 面板');
    setActiveTool(null);
    setToolPanelType('home');
    setSelectedImage(null);
    setSelectedText(null); // [2025-12-16 07:10:00] Add Text: 清理文本选中状态
    setSelectedArt(null); // [2025-01-30 12:58:00] Add Art: 清理艺术素材选中状态
    // [2025-12-16 07:10:00] 返回 Home 时清理画布选中，避免 selection:created 立刻把面板切回编辑态
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

  // [2025-12-14 05:50:00] Canvas 更新处理函数（EditUploadPanel 需要）
  const handleCanvasUpdate = () => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.renderAll();
    }
  };

  // [2025-12-20] 5.0 Version: Handle product selection from catalog (Simplified V5)
  const handleProductSelect = async (productId: string) => {
    console.log('[DesignLab 5.0] Selected product ID from catalog:', productId);
    setIsCatalogModalOpen(false);

    try {
      // Fetch product detail 
      const productDetail = await getProductByVariant(productId);

      if (productDetail) {
        const color = productDetail.color || 'White';
        const baseImages = productDetail.baseImages || getDefaultProductBaseImages(color);

        console.log('[DesignLab 5.0] Updating product with real data:', {
          name: productDetail.productName,
          color,
        });

        setProductInfo({
          color,
          baseImages,
          productId: productDetail.productId,
          colorId: productDetail.variantId,
          productName: productDetail.productName,
        });

        // Update URL
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

  // [2025-12-18 21:18:56] 产品模块：产品选择处理 (Modified to handle Product object from other modals)
  const handleProductSelectObject = async (product: Product) => {
    await handleProductSelect(product.id);
  };

  // [2025-12-18 21:18:56] 产品模块：颜色选择处理
  const handleColorSelect = async (colorName: string) => {
    console.log('[DesignLab 5.0] 颜色选择:', colorName);

    try {
      // 1. 在现有变体列表中查找目标颜色的 variantId
      let newVariantId = productInfo.colorId;
      let targetVariant = null;

      if (productInfo.variants && productInfo.variants.length > 0) {
        // [2025-12-21] 改进：不区分大小写查找
        targetVariant = productInfo.variants.find(v => v.color?.toLowerCase() === colorName.toLowerCase());
        if (targetVariant) {
          newVariantId = targetVariant.id;
          console.log('[DesignLab 5.0] Found variant ID for color:', { color: colorName, variantId: newVariantId });
        }
      }

      // 如果没有找到变体ID，我们可以尝试仅更新前端展示（尽管这可能不准确）
      if (!newVariantId) {
        console.warn('[DesignLab 5.0] No variant ID found for color, falling back to legacy image logic');
        const baseImages = getDefaultProductBaseImages(colorName);
        setProductInfo(prev => ({
          ...prev,
          color: colorName,
          baseImages,
          // 保持原有 ID 或设为 null? 设为 null 可能更安全以免误导
        }));
        return;
      }

      // 2. [2025-12-21] 关键修复：使用 API 获取新变体的完整数据
      // 这确保如果是"红色"，我们会得到后端返回的正确红色图片，而不是前端瞎猜的 GCS URL
      try {
        const newProductData = await getProductByVariant(newVariantId);

        if (newProductData) {
          let finalBaseImages = newProductData.baseImages;

          // [2025-12-21] Fallback check: If backend returns generic fallback image (because DB lacks images),
          // force use of GCS generated images.
          if (!finalBaseImages.front || finalBaseImages.front.includes('hero-card-tee.jpg')) {
            console.warn('[DesignLab 5.0] Backend returned generic fallback image, using GCS generator instead.');
            finalBaseImages = getDefaultProductBaseImages(newProductData.color || colorName);
          }

          setProductInfo(prev => ({
            ...prev,
            productId: newProductData.productId,
            productName: newProductData.productName,
            colorId: newVariantId,
            color: newProductData.color || colorName,
            baseImages: finalBaseImages, // 使用 API 返回的正确图片(或 GCS fallback)
            variants: newProductData.variants || prev.variants,
          }));

          // 更新 URL：只使用 variantId，移除容易混淆的 colorId
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.delete('colorId'); // 移除此参数避免混淆
            url.searchParams.set('variantId', newVariantId);
            window.history.replaceState({}, '', url.toString());
          }
          return;
        }
      } catch (fetchErr) {
        console.error('[DesignLab 5.0] Failed to fetch variant details:', fetchErr);
      }

      // 3. 降级方案：如果 API 失败，使用本地逻辑
      const baseImages = getDefaultProductBaseImages(colorName);
      // 如果本地变体数据里有图片（后端新加的），优先使用
      if (targetVariant && (targetVariant as any).imageUrl) {
        baseImages.front = (targetVariant as any).imageUrl;
      }

      setProductInfo(prev => ({
        ...prev,
        color: colorName,
        baseImages,
        colorId: newVariantId,
      }));

      if (typeof window !== 'undefined' && productInfo.productId) {
        const url = new URL(window.location.href);
        // url.searchParams.set('colorId', colorName); // 不再设置 colorId
        if (newVariantId) {
          url.searchParams.set('variantId', newVariantId);
        }
        window.history.replaceState({}, '', url.toString());
      }
    } catch (error) {
      console.error('[DesignLab 5.0] 颜色选择失败:', error);
    }
  };

  // [2025-12-18 21:18:56] 产品模块：+ Add Products 跳转处理
  const handleAddProducts = () => {
    if (typeof window !== 'undefined') {
      const currentUrl = new URL(window.location.href);
      const returnUrl = encodeURIComponent(currentUrl.pathname + currentUrl.search);
      window.location.href = `/products?returnToDesignLab=${returnUrl}`;
    }
  };

  // [2025-12-18 21:20:48] 保存模块：保存设计处理
  const handleSaveDesign = async () => {
    if (!fabricCanvasRef.current) {
      alert('Canvas is not initialized. Please wait a moment and try again.');
      return null;
    }

    try {
      // 传递当前的 canvas 和设计名称
      // 注意：SaveShareModal 中的设计名称是 readOnly，如果需要编辑，需要修改 SaveShareModal
      const savedDesignId = await saveDesignInternal(fabricCanvasRef.current);
      if (savedDesignId) {
        setDesignId(savedDesignId);
        console.log('[DesignLab 5.0] 设计保存成功:', savedDesignId);
        return savedDesignId;
      }
      return null;
    } catch (error) {
      console.error('[DesignLab 5.0] 设计保存失败:', error);
      alert('Failed to save design. Please try again.');
      throw error; // 重新抛出错误，让 SaveShareModal 知道保存失败
    }
  };

  // [2025-12-18 21:20:48] 保存模块：分享设计处理
  const handleShareDesign = async (shareUrl: string) => {
    console.log('[DesignLab 5.0] 设计分享:', shareUrl);
    // 可以添加埋点或其他处理
  };

  // [2025-12-18 21:23:43] 报价模块：获取报价数据（用于 GetPriceFlowModal）
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

  // [2025-12-18 21:23:43] 报价模块：加入购物车处理
  const handleAddToCart = async (orderData: any) => {
    try {
      let currentDesignId = designId;

      // [2025-12-20] 用户要求：Get Price -> Add to Cart 流程不强制通过 Save Modal 保存
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

      // 调用加入购物车 API
      await addToCartInternal({
        designId: currentDesignId as string,
        productId: productInfo.productId,
        variantId: productInfo.colorId,
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

  // [2025-12-20 03:20:00] 5.0 版本：步骤2 - Canvas 尺寸从全局常量获取

  // [2025-12-20 03:20:00] 5.0 版本：步骤2 - 添加商品图片到 canvas 的辅助函数
  // [2025-12-20 03:25:00] 修复：添加更详细的日志和错误处理
  // [2025-12-20 03:20:00] 5.0 版本：步骤2 - 添加商品图片到 canvas 的辅助函数
  // [2025-12-20 10:30:00] 修复：使用 /_next/image 代理加载以解决 CORS 问题，并确保新图片加载成功后再移除旧图片
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

    // [2025-12-20 10:30:00] 构建代理 URL 以解决 CORS 问题
    // 使用 Next.js 图片优化 API 作为代理
    const proxiedUrl = `/_next/image?url=${encodeURIComponent(imageUrl)}&w=1200&q=90`;
    console.log('[DesignLab 5.0] Using proxied URL:', proxiedUrl);

    // [2025-12-14 05:35:00] 使用原生 Image 对象加载，然后转换为 Fabric Image，更可靠
    const imgElement = new window.Image();
    // [2025-12-20 10:30:00] 即使是 same-origin (代理后)，设置 anonymous 也是安全的，且对于导出 canvas 是必需的
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

        // [2025-12-20 10:30:00] 新图片加载成功后，再移除旧图片
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

        // [2025-12-14 05:45:00] 缩放图片以适应 canvas（cover 模式 - 填充 container）
        const scale = Math.max(
          CANVAS_WIDTH / (fabricImg.width || 1),
          CANVAS_HEIGHT / (fabricImg.height || 1)
        );

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

        // [2025-12-21] Apply tinting filter if requested
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

        // [2025-12-14 05:45:00] 使用 sendObjectToBack 方法将图片置于底层
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

        // [2025-12-20 03:40:00] 强制渲染
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

  // [2025-01-31] 添加打印区域参考线
  const addPrintableArea = () => {
    if (!fabricCanvasRef.current || !fabricRef.current) return;
    const fabric = fabricRef.current;
    const canvas = fabricCanvasRef.current;

    // 避免重复添加
    const existing = canvas.getObjects().find((obj: any) => obj.name === 'printable-area');
    if (existing) return;

    console.log('[DesignLab 5.0] Adding printable area guide...');
    const rect = new fabric.Rect({
      left: CANVAS_WIDTH / 2,
      top: CANVAS_HEIGHT / 2,
      width: PRINTABLE_WIDTH,
      height: PRINTABLE_HEIGHT,
      originX: 'center',
      originY: 'center',
      fill: 'transparent',
      stroke: 'rgba(0, 102, 204, 0.6)', // Custom Ink 风格蓝色 #0066CC
      strokeWidth: 3,
      strokeDashArray: [15, 15], // 虚线效果
      selectable: false,
      evented: false, // 不响应鼠标事件
      name: 'printable-area',
      hoverCursor: 'default',
    });

    canvas.add(rect);

    // 确保在产品图片之上，设计元素之下 (Product image is usually sent to back)
    // 这里简单添加到 canvas，因为 product image 是 sendToBack 的，所以这个会在它上面
    canvas.requestRenderAll();
  };

  // [2025-12-20 03:20:00] 5.0 版本：步骤2 - 初始化 Fabric.js Canvas
  useEffect(() => {
    if (!canvasRef.current) {
      console.warn('[DesignLab 5.0] Canvas ref not available');
      return;
    }

    const canvasElement = canvasRef.current;
    let isMounted = true;

    const initCanvas = async () => {
      try {
        // [2025-12-20 03:20:00] 动态导入 fabric
        const fabricModule = await import('fabric');
        if (!isMounted || !canvasRef.current) {
          // [2025-12-14 06:35:00] 如果组件已卸载，返回 undefined
          return undefined;
        }

        // [2025-12-20 03:20:00] 获取 fabric 对象
        const fabric = (fabricModule as any).fabric || (fabricModule as any).default || fabricModule;

        if (!fabric || typeof fabric.Canvas !== 'function') {
          throw new Error('Fabric.js module is not properly loaded.');
        }

        // [2025-12-20 03:20:00] 存储 fabric 对象
        fabricRef.current = fabric;

        // [2025-12-20 03:20:00] 创建 Fabric Canvas
        // [2025-12-20 03:40:00] 修复：Fabric.js 需要正确的容器尺寸来缩放显示
        // [2025-12-14 06:30:00] 添加 preserveObjectStacking 等选项（参考 4.0 版本）
        const fabricCanvas = new fabric.Canvas(canvasElement, {
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          backgroundColor: 'transparent',
          preserveObjectStacking: true, // [2025-12-14 06:30:00] 保持对象堆叠顺序（参考 4.0 版本）
          selection: true, // [2025-12-14 06:30:00] 启用选择功能
          stateful: true, // [2025-12-14 06:30:00] 启用状态管理
        });

        // [2025-12-20 03:40:00] 修复：Fabric.js 会自动创建 .canvas-container，需要确保它使用正确的 CSS 类
        // [2025-12-20 03:45:00] 修复：关键问题 - Fabric.js 的 canvas-container 会设置 inline style width/height 为逻辑尺寸
        // 我们需要覆盖这些 inline style，让容器自适应父元素
        const canvasContainer = canvasElement.parentElement;
        if (canvasContainer && canvasContainer.classList.contains('canvas-container')) {
          // 添加自定义类，确保 CSS 样式生效
          canvasContainer.classList.add('dl-canvas__fabric-container');

          // [2025-12-20 03:45:00] 关键修复：覆盖 Fabric.js 设置的 inline style
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

        // [2025-01-31] 初始化打印区域参考线
        addPrintableArea();

        // [2025-12-16 06:22:10] 暴露 canvas 到 window，便于 Playwright/DevTools 自动化测试读取对象与控件状态
        // 注意：不包含任何敏感信息，仅保障测试可观测性
        (window as any).fabricCanvas = fabricCanvas;
        (window as any).DesignLabCanvas = { getCanvas: () => fabricCanvas };

        // [2025-12-14 07:30:00] 步骤2：设置选中对象的边框样式（灰色，2px）
        // [2025-12-14 07:30:00] 步骤1：确保基本拖拽功能可用（Fabric.js 默认支持，只需确保 selectable 和 evented 为 true）
        if (fabric.Object) {
          fabric.Object.prototype.set({
            borderColor: '#808080', // [2025-12-14 07:30:00] 步骤2：灰色边框
            borderScaleFactor: 2, // [2025-12-14 07:30:00] 步骤2：边框宽度 2px（默认 1px × 2 = 2px）
            // [2025-12-14 07:30:00] 注释掉角点和旋转控件相关设置，简化初始实现
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

        // [2025-12-14 06:20:00] 保存图层顺序的 Map（用于防止拖拽时自动 bringToFront）
        const layerOrderMap = new Map<fabric.Object, number>();

        // [2025-12-14 05:50:00] 添加 canvas 对象选择事件监听
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
            // [2025-12-14 05:50:00] 检查是否是上传的图片（不是商品底图）
            if ((fabricImage as any).name && (fabricImage as any).name.startsWith('image_')) {
              // [2025-12-14 07:35:00] 步骤2：确保选中时边框为灰色 2px
              fabricImage.set({
                hasBorders: true,
                borderColor: '#808080', // 灰色边框
                borderScaleFactor: 2, // 2px 宽度
              });
              fabricImage.setCoords();

              // [2025-12-14 06:20:00] 保存当前图层顺序
              const allObjects = fabricCanvas.getObjects();
              const currentIndex = allObjects.indexOf(fabricImage);
              layerOrderMap.set(fabricImage, currentIndex);
              console.log('[DesignLab 5.0] 上传图片被选中，切换到 edit panel，保存图层顺序:', currentIndex);

              // [2025-12-14 06:20:00] 延迟恢复图层顺序（Fabric.js 可能在 setActiveObject 时自动 bringToFront）
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
              setSelectedText(null); // [2025-12-16 07:10:00] Add Text: 切换到上传编辑时清理文本
              setSelectedArt(null); // [2025-01-30 12:58:00] Add Art: 切换到上传编辑时清理艺术素材
              setToolPanelType('edit-upload');
              return;
            }
          }

          // -------- Art Image (新增) --------
          if (activeObject.type === 'image') {
            const objName = (activeObject as any).name || '';
            const layerType = (activeObject as any).data?.layerType;
            // [2025-01-30 12:58:00] Add Art: 仅对 art_* 或 layerType=art 的对象切换到 Edit Art
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
            // [2025-12-16 07:10:00] Add Text: 仅对 text_* 或 layerType=text 的对象切换到 Edit Text
            if (objName.startsWith('text_') || layerType === 'text') {
              setSelectedText(activeObject as any);
              setSelectedImage(null);
              setSelectedArt(null); // [2025-01-30 12:58:00] Add Art: 切换到文本编辑时清理艺术素材
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
              // [2025-12-14 07:35:00] 步骤2：确保选中时边框为灰色 2px
              fabricImage.set({
                hasBorders: true,
                borderColor: '#808080', // 灰色边框
                borderScaleFactor: 2, // 2px 宽度
              });
              fabricImage.setCoords();

              // [2025-12-14 06:20:00] 保存当前图层顺序
              const allObjects = fabricCanvas.getObjects();
              const currentIndex = allObjects.indexOf(fabricImage);
              layerOrderMap.set(fabricImage, currentIndex);

              // [2025-12-14 06:20:00] 延迟恢复图层顺序
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
              setSelectedArt(null); // [2025-01-30 12:58:00] Add Art: 切换到上传编辑时清理艺术素材
              setToolPanelType('edit-upload');
              return;
            }
          }

          // Art Image
          if (activeObject.type === 'image') {
            const objName = (activeObject as any).name || '';
            const layerType = (activeObject as any).data?.layerType;
            // [2025-01-30 12:58:00] Add Art: 仅对 art_* 或 layerType=art 的对象切换到 Edit Art
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
              setSelectedArt(null); // [2025-01-30 12:58:00] Add Art: 切换到文本编辑时清理艺术素材
              setToolPanelType('edit-text');
            }
          }
        });

        fabricCanvas.on('selection:cleared', (e: any) => {
          console.log('[DesignLab 5.0] 选择已清除');
          // [2025-12-14 05:50:00] 如果当前在 edit panel，清除选中状态但保持面板（用户可以继续编辑其他对象）
          // 或者切换回 home 面板（根据需求决定）
          // setSelectedImage(null);
          // setToolPanelType('home');
        });

        // [2025-12-14 06:15:00] 添加缩放和旋转事件监听，用于调试
        // [2025-12-14 06:25:00] 添加更详细的缩放调试信息
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

        // [2025-12-16 22:18:55] 生产环境修复：禁用“鼠标控件调试光标覆盖”
        // 根因：此调试逻辑会用近似距离计算并强制设置 canvas cursor，导致控件图标的真实 hover/click 命中行为被“错位覆盖”（表现为离图标约 100px 才触发手势变化）
        const ENABLE_MOUSE_DEBUG = process.env.NODE_ENV !== 'production';

        // [2025-12-16 22:50:22] Debug 辅助：仅在显式 query 参数开启时暴露 canvas/fabric，便于生产环境用 DevTools 验证 hover 命中
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
                    name: `debug_${Date.now()}`,
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
                  // [2025-12-16 23:22:02] 修复：oCoords 使用的是 canvas 内部坐标（结合 viewportTransform），但还需要考虑 canvas 在页面上的 CSS 缩放比例
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

        // [2025-12-14 06:25:00] 添加鼠标悬停在对象上的事件监听（仅调试）
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

        // [2025-12-14 06:35:00] 添加鼠标移动监听（仅调试）
        const handleGlobalMouseMove = (e: MouseEvent) => {
          if (!ENABLE_MOUSE_DEBUG) return;
          if (!fabricCanvasRef.current) return;

          const canvas = fabricCanvasRef.current;
          const canvasElement = canvas.getElement();
          if (!canvasElement) return;

          // [2025-12-14 06:35:00] 检查鼠标是否在 canvas 区域内
          const rect = canvasElement.getBoundingClientRect();
          const canvasX = e.clientX - rect.left;
          const canvasY = e.clientY - rect.top;

          // [2025-12-14 06:35:00] 转换为画布逻辑坐标
          const pointer = canvas.getPointer({ clientX: e.clientX, clientY: e.clientY } as any);

          // [2025-12-14 06:35:00] 检测鼠标是否在控件上
          let onControl = false;
          let controlType: string | null = null;
          let targetObject: string | null = null;

          // [2025-12-14 06:35:00] 检查是否有对象被选中
          const activeObj = canvas.getActiveObject();

          // [2025-12-14 06:35:00] 如果有对象被选中，检查鼠标是否在控件的交互区域内
          if (activeObj && activeObj.selectable && activeObj.hasControls) {
            // [2025-12-14 06:35:00] 获取对象的控制点位置
            const cornerSize = (activeObj as any).cornerSize || 28;
            // [2025-12-14 06:35:00] 使用 oCoords（对象坐标缓存）或重新计算
            let coords: any;
            try {
              coords = (activeObj as any).oCoords || activeObj.getCoords();
            } catch (e) {
              // [2025-12-14 06:35:00] 如果获取坐标失败，先设置坐标再获取
              activeObj.setCoords();
              coords = (activeObj as any).oCoords || activeObj.getCoords();
            }

            // [2025-12-14 06:35:00] 检查鼠标是否在任何一个角点上
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

            // [2025-12-14 06:35:00] 检查旋转控件
            const angle = activeObj.angle || 0;
            const rad = (angle * Math.PI) / 180;
            const rotatingPointOffset = (activeObj as any).rotatingPointOffset || 70;
            const centerX = (coords.tl.x + coords.br.x) / 2;
            const centerY = (coords.tl.y + coords.br.y) / 2;
            const rotX = centerX + Math.sin(rad) * rotatingPointOffset;
            const rotY = centerY - Math.cos(rad) * rotatingPointOffset;

            // [2025-12-14 06:35:00] 检查鼠标是否在旋转控件附近
            const distToRot = Math.sqrt(Math.pow(pointer.x - rotX, 2) + Math.pow(pointer.y - rotY, 2));
            if (distToRot < cornerSize * 2) {
              onControl = true;
              controlType = 'rotation';
              targetObject = (activeObj as any).name || 'unknown';
            } else {
              // [2025-12-14 06:35:00] 检查鼠标是否在任何角点附近
              for (const corner of corners) {
                if (!corner.point || typeof corner.point.x !== 'number' || typeof corner.point.y !== 'number') {
                  continue;
                }
                const dist = Math.sqrt(
                  Math.pow(pointer.x - corner.point.x, 2) + Math.pow(pointer.y - corner.point.y, 2)
                );
                if (dist < cornerSize * 1.5) {
                  onControl = true;
                  controlType = `corner-${corner.name}`;
                  targetObject = (activeObj as any).name || 'unknown';
                  break;
                }
              }
            }
          }

          // [2025-12-14 06:35:00] 更新鼠标调试信息
          setMouseDebug({
            x: e.clientX,
            y: e.clientY,
            canvasX: Math.round(pointer.x),
            canvasY: Math.round(pointer.y),
            onControl,
            controlType,
            targetObject,
          });

          // [2025-12-16 22:18:55] 不再强制覆盖 cursor（避免与 Fabric 控件真实命中逻辑冲突）
        };

        // [2025-12-14 06:25:00] 添加鼠标按下事件监听（用于调试缩放控件的交互）
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

        // [2025-12-14 06:20:00] 保存移动前的图层顺序
        fabricCanvas.on('object:moving', (e: any) => {
          const obj = e.target;
          // [2025-12-14 06:20:00] 保存移动前的图层顺序（如果还没有保存）
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

        // [2025-12-14 06:20:00] 对象移动完成后恢复图层顺序
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
            // [2025-12-14 06:20:00] 清除保存的图层顺序（允许下次移动时重新保存）
            layerOrderMap.delete(obj);
          }
        });

        fabricCanvas.on('object:modified', (e: any) => {
          const obj = e.target;
          // [2025-12-16 21:36:31] 修复：任何缩放/旋转/移动完成后强制 setCoords，避免控件命中区域与渲染位置偏离
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

        // [2025-12-14 06:40:00] 创建 Custom Ink 样式的自定义控件（参考 Custom Ink 实现）
        // [2025-12-14 06:40:00] 1. 左上角删除控件
        if (!fabric.Control) {
          console.warn('[DesignLab 5.0] fabric.Control is not available');
        } else {
          // [2025-12-14 07:30:00] 步骤3：创建自定义图标控件（只显示图标，暂不做功能）
          // [2025-12-14 07:30:00] 注释：之前的完整实现代码已注释，现在从简单开始

          /* ========== 旧代码（已注释）开始 ==========
          // [2025-12-14 07:00:00] 修复：添加 sizeX/sizeY 定义可点击区域，增大控件尺寸以匹配 Custom Ink
          const deleteControl = new fabric.Control({
            x: -0.5, // [2025-12-14 06:40:00] 左上角：x=-0.5（左边缘）
            y: -0.5, // [2025-12-14 06:40:00] 左上角：y=-0.5（上边缘）
            offsetX: -16, // [2025-12-14 07:00:00] 向左偏移 16px（根据 32px 控件大小调整）
            offsetY: -16, // [2025-12-14 07:00:00] 向上偏移 16px
            sizeX: 32, // [2025-12-14 07:00:00] 关键：设置可点击区域宽度（像素）
            sizeY: 32, // [2025-12-14 07:00:00] 关键：设置可点击区域高度（像素）
            cursorStyle: 'pointer',
            render: function(ctx, left, top, styleOverride, fabricObject) {
              // [2025-12-14 07:15:00] 使用 this.sizeX 获取控件尺寸（普通函数确保 this 绑定到 Control 实例）
              const size = this.sizeX || this.sizeY || 32;
              ctx.save();
              ctx.translate(left, top);
              ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle || 0));
              
              // [2025-12-14 07:00:00] 绘制圆形背景（红色）
              ctx.fillStyle = '#ef4444';
              ctx.beginPath();
              ctx.arc(0, 0, size / 2, 0, 2 * Math.PI);
              ctx.fill();
              
              // [2025-12-14 07:00:00] 绘制 X 图标（白色），图标大小约为背景的 55%，线宽 3px
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 3; // [2025-12-14 07:00:00] 增大线宽到 3px，更清晰
              ctx.lineCap = 'round';
              const iconSize = size * 0.55; // [2025-12-14 07:00:00] 图标大小为背景的 55%
              ctx.beginPath();
              ctx.moveTo(-iconSize / 2, -iconSize / 2);
              ctx.lineTo(iconSize / 2, iconSize / 2);
              ctx.moveTo(iconSize / 2, -iconSize / 2);
              ctx.lineTo(-iconSize / 2, iconSize / 2);
              ctx.stroke();
              
              ctx.restore();
            },
            mouseDownHandler: function(eventData, transformData) {
              // [2025-12-14 07:20:00] 关键：返回 true 阻止事件冒泡，防止对象被取消选中
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
                // [2025-12-14 07:00:00] 删除对象
                fabricCanvas.remove(target);
                fabricCanvas.renderAll();
                // [2025-12-14 06:40:00] 如果删除的是当前选中的图片，清除选中状态
                if (selectedImage === target) {
                  setSelectedImage(null);
                  setToolPanelType('home');
                }
                // [2025-12-14 07:00:00] 返回 true 表示事件已处理，阻止默认行为
                return true;
              }
              return false;
            }
          });
          
          // [2025-12-14 06:40:00] 添加自定义控件到对象的辅助函数（必须在控件定义之前，以便在控件中使用）
          const addCustomControlsToObject = (obj: fabric.Object) => {
            const objName = (obj as any).name || '';
            // [2025-12-14 06:40:00] 只为上传的图片添加自定义控件（排除商品底图）
            if ((obj as any).name && (obj as any).name.startsWith('image_')) {
              if (!obj.controls) {
                obj.controls = {};
              }
              // [2025-12-14 06:40:00] 添加删除控件（左上角）
              obj.controls.deleteControl = deleteControl;
              // [2025-12-14 06:40:00] 添加复制控件（左下角）
              obj.controls.duplicateControl = duplicateControl;
              // [2025-12-14 06:40:00] 注意：右下角缩放功能使用 Fabric.js 的默认 br 控件
              // Custom Ink 可能只是使用了默认的缩放控件，不需要自定义
              // 如果需要隐藏默认的 br 控件，可以使用：obj.setControlsVisibility({ br: false });
            }
          };
          
          // [2025-12-14 06:40:00] 2. 左下角复制控件
          // [2025-12-14 07:00:00] 修复：添加 sizeX/sizeY 定义可点击区域，增大控件尺寸以匹配 Custom Ink
          const duplicateControl = new fabric.Control({
            x: -0.5, // [2025-12-14 06:40:00] 左下角：x=-0.5（左边缘）
            y: 0.5, // [2025-12-14 06:40:00] 左下角：y=0.5（下边缘）
            offsetX: -16, // [2025-12-14 07:00:00] 向左偏移 16px（根据 32px 控件大小调整）
            offsetY: 16, // [2025-12-14 07:00:00] 向下偏移 16px
            sizeX: 32, // [2025-12-14 07:00:00] 关键：设置可点击区域宽度（像素）
            sizeY: 32, // [2025-12-14 07:00:00] 关键：设置可点击区域高度（像素）
            cursorStyle: 'pointer',
            render: function(ctx, left, top, styleOverride, fabricObject) {
              // [2025-12-14 07:15:00] 使用 this.sizeX 获取控件尺寸（普通函数确保 this 绑定到 Control 实例）
              const size = this.sizeX || this.sizeY || 32;
              ctx.save();
              ctx.translate(left, top);
              ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle || 0));
              
              // [2025-12-14 07:00:00] 绘制圆形背景（蓝色）
              ctx.fillStyle = '#0066CC';
              ctx.beginPath();
              ctx.arc(0, 0, size / 2, 0, 2 * Math.PI);
              ctx.fill();
              
              // [2025-12-14 07:00:00] 绘制复制图标（两个重叠的矩形，白色），优化尺寸比例
              ctx.fillStyle = '#ffffff';
              // 后面的矩形（稍微偏右下）
              ctx.fillRect(-size * 0.25, -size * 0.35, size * 0.35, size * 0.45);
              // 前面的矩形（稍微偏左上）
              ctx.fillRect(-size * 0.15, -size * 0.25, size * 0.35, size * 0.45);
              
              ctx.restore();
            },
            mouseDownHandler: function(eventData, transformData) {
              // [2025-12-14 07:20:00] 关键：返回 true 阻止事件冒泡，防止对象被取消选中
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
                    name: `image_${Date.now()}`,
                    selectable: true,
                    evented: true,
                    hasControls: true,
                    hasBorders: true,
                  });
                  cloned.setCoords();
                  fabricCanvas.add(cloned);
                  
                  // [2025-12-14 06:40:00] 为新复制的对象添加自定义控件
                  addCustomControlsToObject(cloned);
                  
                  fabricCanvas.setActiveObject(cloned);
                  fabricCanvas.renderAll();
                  
                  // [2025-12-14 07:00:00] 返回 true 表示事件已处理，阻止默认行为
                  return true;
                } catch (error) {
                  console.error('[DesignLab 5.0] 复制失败:', error);
                  return false;
                }
              }
              return false;
            }
          });
          
          // [2025-12-14 06:40:00] 3. 右下角缩放控件
          // 注意：Custom Ink 使用 Fabric.js 的默认右下角（br）缩放控件，不需要自定义
          // Fabric.js 的默认 br 控件已经提供了缩放功能
          
          // [2025-12-14 06:40:00] 保存控件到 canvas，以便后续使用
          (fabricCanvas as any).deleteControl = deleteControl;
          (fabricCanvas as any).duplicateControl = duplicateControl;
          (fabricCanvas as any).addCustomControlsToObject = addCustomControlsToObject;
          
          console.log('[DesignLab 5.0] ✅ Custom Ink 样式的自定义控件已创建');
          ========== 旧代码（已注释）结束 ========== */

          // [2025-12-14 07:30:00] 步骤3：创建三个图标控件（只显示，不做功能）

          // 1. 左上角删除图标
          const deleteIconControl = new fabric.Control({
            x: -0.5, // 左上角
            y: -0.5,
            // [2025-12-16 23:39:48] 修复：让三个大图标控件彼此拉开距离（避免在小对象上出现控件命中区域重叠，导致 hover 总是落到 resize）
            // 说明：这里用 offset 将控件中心移到对象外侧（与大尺寸 icon 的视觉一致）
            offsetX: -80,
            offsetY: -80,
            sizeX: 160, // [2025-12-14 07:42:00] 放大 5 倍：从 32 调整为 160
            sizeY: 160, // [2025-12-14 07:42:00] 放大 5 倍：从 32 调整为 160
            cursorStyle: 'pointer',
            // [2025-12-16 23:30:22] 修复：显式提供 cursorStyleHandler，避免 Fabric 在 hover 时错误落到 resize 光标
            cursorStyleHandler: () => 'pointer',
            render: function (ctx: any, left: any, top: any, styleOverride: any, fabricObject: any) {
              // [2025-12-16 23:30:22] 生产环境定位：仅 dlDebug=1 时打印一次控件 render 的 left/top（用于对齐命中区域）
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
              const size = this.sizeX || 160; // [2025-12-14 07:42:00] 放大 5 倍：默认值从 32 调整为 160
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
              ctx.lineWidth = 15; // [2025-12-14 07:42:00] 放大 5 倍：从 3 调整为 15
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
            // [2025-12-14 07:45:00] 功能1：删除图标 - 添加鼠标事件处理
            mouseDownHandler: function (eventData, transformData) {
              // [2022-12-14 07:45:00] 返回 true 阻止事件冒泡，防止对象被取消选中
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

                // [2025-12-14 07:45:00] 功能1：删除对象
                fabricCanvas.remove(target);
                fabricCanvas.renderAll();

                // [2025-12-16 07:10:00] Add Text: 如果删除的是当前选中的对象，清除选中状态并切换回 home 面板
                // [2025-01-30 12:58:00] Add Art: 添加 art 对象的删除处理
                const targetName = (target as any).name || '';
                const layerType = (target as any).data?.layerType;
                if (
                  ((target as any).name && (target as any).name.startsWith('image_')) ||
                  ((target.type === 'i-text' || target.type === 'textbox' || target.type === 'text') && targetName.startsWith('text_')) ||
                  (target.type === 'image' && (targetName.startsWith('art_') || layerType === 'art'))
                ) {
                  setSelectedImage(null);
                  setSelectedText(null);
                  setSelectedArt(null); // [2025-01-30 12:58:00] Add Art: 删除时清理艺术素材选中状态
                  setToolPanelType('home');
                }

                // [2025-12-14 07:45:00] 返回 true 表示事件已处理，阻止默认行为
                return true;
              }
              return false;
            },
          });

          // 2. 左下角 duplicate 图标
          const duplicateIconControl = new fabric.Control({
            x: -0.5, // 左下角
            y: 0.5,
            // [2025-12-16 23:39:48] 同 deleteIcon：下移到对象外侧，避免与 delete/resize 命中区域重叠
            offsetX: -80,
            offsetY: 80,
            sizeX: 160, // [2025-12-14 07:42:00] 放大 5 倍：从 32 调整为 160
            sizeY: 160, // [2025-12-14 07:42:00] 放大 5 倍：从 32 调整为 160
            cursorStyle: 'pointer',
            // [2025-12-16 23:30:22] 修复：显式提供 cursorStyleHandler，确保 hover 时为 pointer
            cursorStyleHandler: () => 'pointer',
            render: function (ctx: any, left: any, top: any, styleOverride: any, fabricObject: any) {
              // [2025-12-16 23:30:22] 生产环境定位：仅 dlDebug=1 时打印一次控件 render 的 left/top
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
              const size = this.sizeX || 160; // [2025-12-14 07:42:00] 放大 5 倍：默认值从 32 调整为 160
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
            // [2025-12-14 07:45:00] 功能2：复制图标 - 添加鼠标事件处理
            mouseDownHandler: function (eventData, transformData) {
              // [2025-12-14 07:45:00] 返回 true 阻止事件冒泡，防止对象被取消选中
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

                  // [2025-12-16 07:10:00] Add Text: 克隆对象（兼容 sync/promise/callback 三种 clone 形态）
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
                  // [2025-01-30 12:58:00] Add Art: 允许复制 art 对象
                  if (
                    targetName === 'product-image-base' ||
                    targetName.startsWith('product-image-') ||
                    targetLayerType === 'product' ||
                    targetLayerType === 'product-image'
                  ) {
                    console.warn('[DesignLab 5.0] Skip duplicate for product base image');
                    return true;
                  }

                  // [2025-12-16 07:10:00] 根据对象类型决定 name 前缀与 layerType
                  // [2025-01-30 12:58:00] Add Art: 添加 art 对象的判断
                  const isText =
                    target.type === 'i-text' || target.type === 'textbox' || target.type === 'text' || targetName.startsWith('text_');
                  const isUploadImage = target.type === 'image' && (targetName.startsWith('image_') || targetLayerType === 'upload');
                  const isArtImage = target.type === 'image' && (targetName.startsWith('art_') || targetLayerType === 'art');
                  const namePrefix = isText ? 'text_' : isArtImage ? 'art_' : isUploadImage ? 'image_' : 'object_';
                  const layerType = isText ? 'text' : isArtImage ? 'art' : isUploadImage ? 'upload' : targetLayerType;

                  cloned.set({
                    left: (target.left || 0) + 20,
                    top: (target.top || 0) + 20,
                    name: `${namePrefix}${Date.now()}`,
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

                  // [2025-12-14 07:45:00] 添加到画布
                  fabricCanvas.add(cloned);

                  // [2025-12-14 07:45:00] 为新复制的对象添加图标控件
                  if ((fabricCanvas as any).addIconControlsToObject) {
                    (fabricCanvas as any).addIconControlsToObject(cloned);
                  }

                  // [2025-12-14 07:45:00] 选中新复制的对象
                  fabricCanvas.setActiveObject(cloned);
                  // [2025-12-16 07:10:00] Add Text: 立即切换编辑面板（selection:created/updated 也会兜底）
                  const clonedName = (cloned as any).name || '';
                  const clonedLayerType = (cloned as any).data?.layerType;
                  // [2025-01-30 12:58:00] Add Art: 复制后切换到对应的编辑面板
                  if (cloned.type === 'image' && (clonedName.startsWith('art_') || clonedLayerType === 'art')) {
                    setSelectedArt(cloned as any);
                    setSelectedImage(null);
                    setSelectedText(null);
                    setToolPanelType('edit-art');
                  } else if (cloned.type === 'image' && clonedName.startsWith('image_')) {
                    setSelectedImage(cloned as any);
                    setSelectedText(null);
                    setSelectedArt(null); // [2025-01-30 12:58:00] Add Art: 切换到上传编辑时清理艺术素材
                    setToolPanelType('edit-upload');
                  } else if (
                    (cloned.type === 'i-text' || cloned.type === 'textbox' || cloned.type === 'text') &&
                    clonedName.startsWith('text_')
                  ) {
                    setSelectedText(cloned as any);
                    setSelectedImage(null);
                    setSelectedArt(null); // [2025-01-30 12:58:00] Add Art: 切换到文本编辑时清理艺术素材
                    setToolPanelType('edit-text');
                  }

                  fabricCanvas.renderAll();

                  // [2025-12-14 07:45:00] 返回 true 表示事件已处理，阻止默认行为
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
            // [2025-12-16 23:39:48] 右下角外侧，避免与左侧控件重叠
            offsetX: 80,
            offsetY: 80,
            sizeX: 160, // [2025-12-14 07:42:00] 放大 5 倍：从 32 调整为 160
            sizeY: 160, // [2025-12-14 07:42:00] 放大 5 倍：从 32 调整为 160
            cursorStyle: 'se-resize',
            render: function (ctx: any, left: any, top: any, styleOverride: any, fabricObject: any) {
              // [2025-12-16 23:30:22] 生产环境定位：仅 dlDebug=1 时打印一次控件 render 的 left/top
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
              const size = this.sizeX || 160; // [2025-12-14 07:42:00] 放大 5 倍：默认值从 32 调整为 160
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
              ctx.lineWidth = 12.5; // [2025-12-14 07:42:00] 放大 5 倍：从 2.5 调整为 12.5
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
            // [2025-12-14 07:45:00] 功能3：resize 图标 - 使用 actionHandler 实现缩放功能
            // 使用 Fabric.js 的 controlsUtils 工具函数（如果可用），否则使用自定义实现
            // [2025-12-16 21:35:41] 修复：缩放后必须 setCoords，否则控件命中区域与图标渲染位置会逐渐偏离（放大后更明显）
            actionHandler: function (eventData: any, transformData: any, x: any, y: any) {
              const target = transformData?.target as any;
              const controlsUtils = (fabric as any).controlsUtils;

              if (controlsUtils && typeof controlsUtils.scalingEqually === 'function') {
                const result = controlsUtils.scalingEqually(eventData, transformData, x, y);
                // [2025-12-16 21:35:41] 关键：实时更新坐标，确保 hover/click 命中区与图标一致
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
                // [2025-12-14 07:45:00] 功能3：自定义缩放实现（当 controlsUtils 不可用时）
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
                // [2025-12-16 21:35:41] 关键：实时更新坐标，确保 hover/click 命中区与图标一致
                try {
                  target2?.setCoords?.();
                  (target2?.canvas as any)?.requestRenderAll?.();
                } catch (e) {
                  // ignore
                }
                return result2;
              })(eventData, transformData, x, y);
            },
            // [2025-12-14 07:45:00] 使用 Fabric.js 的缩放光标样式（如果可用）
            cursorStyleHandler: (fabric.controlsUtils && fabric.controlsUtils.scaleCursorStyleHandler)
              ? fabric.controlsUtils.scaleCursorStyleHandler
              : 'se-resize',
          });

          // [2025-12-16 22:50:22] 生产环境验证日志：打印三角控件配置，确认 offsetX/offsetY/size 是否符合预期（用 JSON 输出，避免线上控制台折叠为 [object Object]）
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

          // [2025-12-14 07:30:00] 添加图标控件到对象的辅助函数
          const addIconControlsToObject = (obj: fabric.Object) => {
            const objName = (obj as any).name || '';
            const layerType = (obj as any).data?.layerType;
            // [2025-12-16 07:10:00] Add Text: 扩展为 upload/text（排除商品底图）
            const isProductBase =
              objName === 'product-image-base' ||
              objName.startsWith('product-image-') ||
              objName === 'background' ||
              layerType === 'product' ||
              layerType === 'product-image';
            if (isProductBase) return;

            const isUpload = objName.startsWith('image_') || layerType === 'upload';
            const isText =
              objName.startsWith('text_') ||
              layerType === 'text' ||
              obj.type === 'i-text' ||
              obj.type === 'textbox' ||
              obj.type === 'text';
            // [2025-01-30 13:30:00] Add Art: 添加 art 对象识别
            const isArt = objName.startsWith('art_') || layerType === 'art';

            if (isUpload || isText || isArt) {
              if (!obj.controls) {
                obj.controls = {};
              }

              // [2025-12-14 07:35:00] 步骤3：添加三个图标控件
              obj.controls.deleteIcon = deleteIconControl;
              obj.controls.duplicateIcon = duplicateIconControl;
              obj.controls.resizeIcon = resizeIconControl;

              // [2025-01-30 21:30:00] 修复：恢复默认的旋转控件（mtr），但隐藏其他不需要的控件
              // 方法：只隐藏不需要的控件，保留 mtr（旋转控件）以支持旋转功能
              const defaultControlsToHide = ['tl', 'tr', 'bl', 'br', 'ml', 'mt', 'mr', 'mb'];
              defaultControlsToHide.forEach(controlKey => {
                if (obj.controls && obj.controls[controlKey]) {
                  const defaultControl = obj.controls[controlKey];
                  // 将默认控件的 sizeX 和 sizeY 设为 0，隐藏它们
                  defaultControl.sizeX = 0;
                  defaultControl.sizeY = 0;
                }
              });

              // [2025-01-30 21:30:00] 修复：确保 mtr（旋转控件）可见且有正确的 cursor 样式
              if (obj.controls && obj.controls.mtr) {
                const mtrControl = obj.controls.mtr;
                // 确保旋转控件有合理的尺寸
                if (mtrControl.sizeX === 0 || mtrControl.sizeY === 0) {
                  mtrControl.sizeX = 28;
                  mtrControl.sizeY = 28;
                }
                // [2025-01-30 21:35:00] 修复：使用 Fabric.js 默认的旋转 cursor 样式（crosshair），确保手势变化触发位置正确
                // 注意：不手动设置 cursorStyle，让 Fabric.js 使用默认的旋转 cursor 样式，这样可以确保 cursor 变化触发位置与控件位置一致
              }

              // [2025-12-14 07:35:00] 步骤2：确保边框颜色和宽度正确
              obj.set({
                hasControls: true, // [2025-12-16 07:10:00] 确保自定义控件可见
                hasBorders: true,
                borderColor: '#808080', // 灰色边框
                borderScaleFactor: 2, // 2px 宽度
              });

              obj.setCoords();
              console.log('[DesignLab 5.0] 图标控件已添加到对象:', {
                objectName: objName,
                customControls: Object.keys(obj.controls).filter(k => k.includes('Icon')),
                hasBorders: obj.hasBorders,
                borderColor: obj.borderColor,
                borderScaleFactor: (obj as any).borderScaleFactor,
              });
            }
          };

          // 保存到 canvas，以便后续使用
          (fabricCanvas as any).addIconControlsToObject = addIconControlsToObject;

          console.log('[DesignLab 5.0] ✅ 图标控件已创建（功能已实现：删除、复制、缩放）');
        }

        // [2025-12-16 22:18:55] 仅在调试模式绑定鼠标移动监听（生产环境禁用，避免影响控件 hover/click）
        const canvasElementForMouse = fabricCanvas.getElement();
        let cleanupMouseListener: (() => void) | undefined;
        if (ENABLE_MOUSE_DEBUG && canvasElementForMouse) {
          canvasElementForMouse.addEventListener('mousemove', handleGlobalMouseMove);
          cleanupMouseListener = () => {
            canvasElementForMouse.removeEventListener('mousemove', handleGlobalMouseMove);
          };
        }

        // [2025-12-14 06:35:00] 返回清理函数（确保在所有情况下都返回一个函数或 undefined）
        return cleanupMouseListener;

      } catch (error) {
        console.error('[DesignLab 5.0] Failed to initialize Fabric canvas:', error);
        // [2025-12-14 06:35:00] 发生错误时返回 undefined
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
      // [2025-12-14 06:35:00] 清理鼠标移动监听器
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
  }, []); // [2025-12-20 03:20:00] 只在组件挂载时初始化一次

  // [2025-12-20 03:20:00] 步骤2 - 当视图切换或产品信息改变时更新商品图片
  // [2025-12-20 03:50:00] 修复：添加 canvasInitialized state 作为依赖，确保 Canvas 初始化完成后触发加载
  useEffect(() => {
    // [2025-12-20] 修复：只要 Fabric Canvas 就绪就尝试加载图片，不强制要求 canvasInitialized state
    // state 变化可能在某些情况下由于异步导致延迟
    const canvas = fabricCanvasRef.current;
    if (!canvas || !fabricRef.current) {
      console.log('[DesignLab 5.0] Canvas not ready for image loading yet');
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

    // [2025-12-21] FIX: Use Tinting logic to solve wrong GCS images
    // We always use the WHITE image as base and apply the HEX from PRODUCT_COLORS
    const isDefaultProduct = productInfo.productName?.includes('Design Lab Default Tee') || productInfo.productName?.includes('Loading');

    let finalImageUrl = imageUrl;
    let tintHex = '#ffffff';

    if (isDefaultProduct) {
      const colorData = PRODUCT_COLORS.find(c => c.name === productInfo.color);
      tintHex = colorData ? colorData.hex : '#ffffff';

      // [2025-12-22] ALWAYS use white base image for default products to ensure consistency
      // was: if (productInfo.color !== 'White') { ... } 
      // reason: for default tee, the white color from backend might still use the red fallback image
      finalImageUrl = getDefaultProductBaseImages('White')[currentView];
    }

    // 小延迟确保 Canvas 容器样式已经稳定
    const timer = setTimeout(() => {
      addProductImageToCanvas(finalImageUrl, tintHex);
    }, 100);

    return () => clearTimeout(timer);
  }, [currentView, productInfo.baseImages, canvasInitialized]); // 保持 canvasInitialized 依赖作为触发源之一

  // [2025-12-20 03:15:00] 5.0 版本：步骤1 - 文件上传处理函数
  // [2025-12-20 03:20:00] 步骤2 - 更新：添加图片到 Fabric canvas
  const handleFileUpload = (file: File) => {
    console.log('[DesignLab 5.0] 步骤2 - 文件上传:', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      canvasReady: !!fabricCanvasRef.current,
    });

    // [2025-12-20 03:15:00] 文件格式验证
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPG, PNG, GIF, WebP, AVIF, etc.)');
      return;
    }

    // [2025-12-20 03:15:00] 文件大小验证（20 MB）
    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
    if (file.size > MAX_FILE_SIZE) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      alert(`File size (${fileSizeMB} MB) exceeds the maximum limit of 20 MB. Please choose a smaller file.`);
      return;
    }

    // [2025-12-20 03:15:00] 文件类型验证
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
      alert(`File type "${file.type}" is not supported. Please upload JPG, PNG, GIF, WebP, AVIF, or SVG files.`);
      return;
    }

    // [2025-12-20 03:20:00] 步骤2 - 检查 Canvas 是否已初始化
    if (!fabricCanvasRef.current || !fabricRef.current) {
      alert('Canvas is not ready. Please wait for the design lab to load.');
      return;
    }

    const fabric = fabricRef.current;
    const canvas = fabricCanvasRef.current;

    // [2025-12-20 03:20:00] 步骤2 - 读取文件并添加到 canvas
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

        // [2025-12-14 05:45:00] 创建 Image 对象并加载（使用 window.Image 避免与 next/image 冲突）
        const imgElement = new window.Image();
        if (!imageUrl.startsWith('data:')) {
          imgElement.crossOrigin = 'anonymous';
        }

        imgElement.onload = () => {
          try {
            // [2025-12-20 03:20:00] 创建 Fabric Image 对象
            // [2025-12-14 07:30:00] 步骤1：确保基本的拖拽功能可用
            // [2025-12-14 07:30:00] 步骤2：设置选中时的灰色边框（2px）
            // [2025-12-14 07:30:00] 步骤3：隐藏默认控件，稍后添加自定义图标
            const fabricImage = new fabric.Image(imgElement, {
              selectable: true, // [2025-12-14 07:30:00] 步骤1：可选择
              evented: true, // [2025-12-14 07:30:00] 步骤1：可交互
              hasControls: true, // [2025-12-14 07:35:00] 必须为 true 才能显示自定义控件（默认控件会在 addIconControlsToObject 中隐藏）
              hasBorders: true, // [2025-12-14 07:30:00] 步骤2：显示边框
              borderColor: '#808080', // [2025-12-14 07:30:00] 步骤2：灰色边框
              borderScaleFactor: 2, // [2025-12-14 07:30:00] 步骤2：边框宽度 2px（默认 1px × 2 = 2px）
              lockMovementX: false, // [2025-12-14 07:30:00] 步骤1：允许拖拽移动
              lockMovementY: false, // [2025-12-14 07:30:00] 步骤1：允许拖拽移动
              data: {
                layerType: 'upload',
                zIndex: 10,
              },
            });

            // [2025-12-20 03:20:00] 智能缩放：缩放到画布的 30%
            const SCALE_RATIO = 0.3;
            const targetMaxWidth = CANVAS_WIDTH * SCALE_RATIO;
            const targetMaxHeight = CANVAS_HEIGHT * SCALE_RATIO;

            const originalWidth = fabricImage.width || 1;
            const originalHeight = fabricImage.height || 1;

            const scaleX = targetMaxWidth / originalWidth;
            const scaleY = targetMaxHeight / originalHeight;
            const scale = Math.min(scaleX, scaleY, 1);

            fabricImage.scale(scale);

            // [2025-12-20 03:20:00] 居中位置（canvas 中心）
            fabricImage.set({
              left: CANVAS_WIDTH / 2,
              top: CANVAS_HEIGHT / 2,
              originX: 'center',
              originY: 'center',
              name: `image_${Date.now()}`,
            });

            // [2025-12-14 06:30:00] 确保坐标已更新（参考 4.0 版本）
            fabricImage.setCoords();

            // [2025-12-20 03:20:00] 步骤1：添加到 canvas，确保基本的拖拽功能可用
            canvas.add(fabricImage);

            // [2025-12-14 07:30:00] 步骤3：为上传的图片添加图标控件
            if ((canvas as any).addIconControlsToObject) {
              (canvas as any).addIconControlsToObject(fabricImage);
            }

            // [2025-12-14 07:30:00] 步骤2：自动选中图片，显示灰色边框
            canvas.setActiveObject(fabricImage);
            // [2025-12-14 07:35:00] 步骤2：确保选中时边框正确显示
            fabricImage.set({
              hasBorders: true,
              borderColor: '#808080', // 灰色边框
              borderScaleFactor: 2, // 2px 宽度
            });
            fabricImage.setCoords();
            canvas.renderAll();

            // [2025-12-14 07:30:00] 记录对象属性用于调试
            console.log('[DesignLab 5.0] ✅ Image added to canvas with properties:', {
              name: fabricImage.name,
              position: { left: fabricImage.left, top: fabricImage.top },
              scale,
              selectable: fabricImage.selectable, // 步骤1：应该为 true
              evented: fabricImage.evented, // 步骤1：应该为 true
              hasControls: fabricImage.hasControls, // 步骤3：应该为 false（隐藏默认控件）
              hasBorders: fabricImage.hasBorders, // 步骤2：应该为 true（显示边框）
              borderColor: fabricImage.borderColor, // 步骤2：应该是 '#808080'
              borderScaleFactor: (fabricImage as any).borderScaleFactor, // 步骤2：应该是 2
            });

            // [2025-12-14 06:30:00] 渲染画布（参考 4.0 版本）
            canvas.renderAll();

            console.log('[DesignLab 5.0] Image added to canvas:', {
              name: fabricImage.name,
              position: { left: fabricImage.left, top: fabricImage.top },
              scale,
            });

            // [2025-12-14 05:50:00] 上传图片后自动切换到 EditUploadPanel
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

  // [2025-12-16 07:10:00] Add Text: 添加文本到 Fabric canvas（与 4.0/PRD 一致：Add Text → 画布生成文本对象 → 自动进入 Edit Text）
  const handleAddText = (text: string) => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) {
      console.warn('[DesignLab 5.0] Add Text: canvas not ready');
      return;
    }

    const normalizedText = (text || '').trim() || 'Your Text';

    try {
      // [2025-12-16 07:10:00] 优先使用 IText，兼容缺失时回退到 Textbox
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
        fontSize: 120,
        textAlign: 'center',
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
        borderColor: '#808080',
        borderScaleFactor: 2,
        name: `text_${Date.now()}`,
        data: {
          layerType: 'text',
          zIndex: 20,
        },
      });

      textObj.setCoords?.();
      canvas.add(textObj);

      // [2025-12-16 07:10:00] 复用 5.0 大尺寸图标控件（delete/duplicate/resize）
      if (typeof (canvas as any).addIconControlsToObject === 'function') {
        (canvas as any).addIconControlsToObject(textObj);
      }

      canvas.setActiveObject(textObj);
      canvas.renderAll();

      // [2025-12-16 07:10:00] 切换面板到 Edit Text（selection:created/updated 也会兜底）
      setSelectedText(textObj);
      setSelectedImage(null);
      setSelectedArt(null); // [2025-01-30 12:58:00] Add Art: 切换到文本编辑时清理艺术素材
      setToolPanelType('edit-text');
      setActiveTool('text');
    } catch (error) {
      console.error('[DesignLab 5.0] Add Text failed:', error);
    }
  };

  // [2025-01-30 12:58:00] Add Art: 添加艺术素材到 Fabric canvas（与 4.0/PRD 一致：Add Art → 画布生成图片对象 → 自动进入 Edit Art）
  // [2025-01-30 19:00:00] 增强：添加降级方案和详细错误处理
  const handleAddArt = (artUrl: string, artName: string) => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) {
      console.warn('[DesignLab 5.0] Add Art: canvas not ready');
      return;
    }

    // [2025-01-30 13:20:00] CORS 修复：如果是 GCS URL，使用图片代理绕过 CORS
    let imageUrl = artUrl;
    let useProxy = false;
    if (artUrl && (artUrl.includes('storage.googleapis.com') || artUrl.includes('.storage.googleapis.com'))) {
      // [2025-01-30 13:20:00] 使用前端图片代理 API 绕过 CORS
      imageUrl = `/api/image-proxy?src=${encodeURIComponent(artUrl)}`;
      useProxy = true;
      console.log('[DesignLab 5.0] Using image proxy for GCS URL:', {
        original: artUrl.substring(0, 60) + '...',
        proxy: imageUrl,
        timestamp: new Date().toISOString()
      });
    }

    // [2025-01-30 12:58:00] 使用原生 Image 对象加载图片
    const imgElement = new window.Image();
    // [2025-01-30 13:20:00] 如果使用代理 URL，不需要 crossOrigin（代理服务器会处理）
    if (!imageUrl.includes('/api/image-proxy')) {
      imgElement.crossOrigin = 'anonymous';
    }

    imgElement.onload = () => {
      try {
        // [2025-01-30 12:58:00] 创建 Fabric Image 对象
        const fabricImage = new fabric.Image(imgElement, {
          selectable: true,
          evented: true,
          hasControls: true,
          hasBorders: true,
          borderColor: '#808080',
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

        // [2025-01-30 12:58:00] 智能缩放：缩放到画布的 30%
        const SCALE_RATIO = 0.3;
        const targetMaxWidth = CANVAS_WIDTH * SCALE_RATIO;
        const targetMaxHeight = CANVAS_HEIGHT * SCALE_RATIO;

        const originalWidth = fabricImage.width || 1;
        const originalHeight = fabricImage.height || 1;

        const scaleX = targetMaxWidth / originalWidth;
        const scaleY = targetMaxHeight / originalHeight;
        const scale = Math.min(scaleX, scaleY, 1);

        fabricImage.scale(scale);

        // [2025-01-30 12:58:00] 居中位置
        fabricImage.set({
          left: CANVAS_WIDTH / 2,
          top: CANVAS_HEIGHT / 2,
          originX: 'center',
          originY: 'center',
          name: `art_${Date.now()}`, // [2025-01-30 12:58:00] 使用 art_ 前缀标识艺术素材
          data: {
            layerType: 'art',
            zIndex: 15, // [2025-01-30 12:58:00] 艺术素材图层 zIndex 为 15（介于上传图层的 10 和文字图层的 20 之间）
          },
        });

        fabricImage.setCoords();
        canvas.add(fabricImage);

        // [2025-01-30 12:58:00] 复用 5.0 大尺寸图标控件（delete/duplicate/resize）
        if (typeof (canvas as any).addIconControlsToObject === 'function') {
          (canvas as any).addIconControlsToObject(fabricImage);
        }

        canvas.setActiveObject(fabricImage);
        canvas.renderAll();

        // [2025-01-30 12:58:00] 自动切换到 Edit Art 面板
        setSelectedArt(fabricImage);
        setSelectedImage(null);
        setSelectedText(null);
        setToolPanelType('edit-art');
        setActiveTool('art');

        console.log('[DesignLab 5.0] ✅ Art added to canvas:', {
          name: (fabricImage as any).name,
          url: artUrl.substring(0, 50) + '...',
        });
      } catch (error) {
        console.error('[DesignLab 5.0] Add Art failed:', error);
      }
    };

    // [2025-01-30 19:00:00] 增强错误处理：添加降级方案和详细日志
    imgElement.onerror = async (error) => {
      const timestamp = new Date().toISOString();
      console.error('[DesignLab 5.0] ❌ Failed to load art image:', {
        error,
        imageUrl,
        originalUrl: artUrl,
        useProxy,
        timestamp
      });

      // [2025-01-30 19:00:00] 如果使用代理失败，尝试直接加载原始 URL（降级方案）
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

        // [2025-01-30 19:00:00] 降级方案：尝试直接加载原始 URL
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
              hasBorders: true,
              borderColor: '#808080',
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
              name: `art_${Date.now()}`,
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
          // [2025-01-30 19:00:00] 可以在这里显示用户友好的错误提示
        };

        fallbackImg.src = artUrl;
      } else {
        // [2025-01-30 19:00:00] 非代理 URL 加载失败，可能是图片不存在或其他问题
        console.error('[DesignLab 5.0] ❌ Direct image load failed, image may not exist:', {
          url: artUrl,
          timestamp
        });
      }
    };

    imgElement.src = imageUrl;
  };

  // [2025-12-20 02:20:00] 5.0 版本：获取当前视图的图片 URL
  // [2025-12-20 02:20:00] 5.0 版本：获取当前视图的图片 URL
  const getCurrentImageUrl = React.useCallback(() => {
    const url = productInfo.baseImages[currentView];
    console.log('[DesignLab 5.0] 获取图片 URL:', { currentView, url }); // [2025-12-20 03:00:00] 添加调试日志
    return url;
  }, [productInfo.baseImages, currentView]);

  // [2025-12-20 03:00:00] 5.0 版本：功能叠加 - 监听视图变化，验证图片切换
  useEffect(() => {
    const imageUrl = getCurrentImageUrl();
    console.log('[DesignLab 5.0] 视图已切换:', {
      currentView,
      imageUrl,
      hasImage: !!imageUrl
    });
  }, [currentView, getCurrentImageUrl]);

  return (
    <div className="design-lab-new">
      {/* 1. Header - 顶部导航栏 */}
      <header className="dl-header" data-testid="header">
        <div className="dl-header__content">
          <div className="dl-header__left">
            <Link href="/" className="dl-header__logo" aria-label="Souvenir Plus Inc home" style={{ display: 'flex', alignItems: 'center' }}>
              <Image src="/logo.png" alt="Souvenir Plus Inc" width={200} height={34} priority style={{ height: 'auto', width: 'auto', maxWidth: '200px' }} />
            </Link>
            <nav className="dl-header__breadcrumb" aria-label="Breadcrumb">
              <Link href="/account/designs" className="dl-header__breadcrumb-link">My Designs</Link>
              <span className="dl-header__breadcrumb-separator">/</span>
              <span className="dl-header__breadcrumb-current">Untitled Design</span>
            </nav>
          </div>
          <div className="dl-header__right">
            <div className="dl-header__contact">
              <span className="dl-header__contact-label">Talk to a Real Person:</span>
              <a href="tel:4169166352" className="dl-header__contact-phone">416 916 6352</a>
            </div>
            {/* [2025-12-18 20:58:40] 修复：Chat Now 在新窗口打开 */}
            <a href="/help#guestbook" className="dl-header__chat-link" target="_blank" rel="noopener noreferrer">Chat Now</a>
            <Link href="/login" className="dl-header__signin-link">Sign In</Link>
          </div>
        </div>
      </header>

      {/* 2-5. Main Content - Rail + Tool Panel + Canvas + Sidebar */}
      {/* [2025-12-20 02:50:00] 5.0 版本：修复布局结构，所有列必须在 .dl-main 容器内 */}
      <div className="dl-main">
        {/* 2. Rail - 左侧深灰色工具栏 */}
        {/* [2025-12-20 02:30:00] 5.0 版本：与 4.0 版本 UI 一致 - Rail 工具栏 */}
        {/* [2025-12-20 02:50:00] 5.0 版本：添加 ref 用于调试 */}
        {/* [2025-12-20 03:10:00] 5.0 版本：功能3 - Rail 按钮点击交互 */}
        <nav ref={railRef} className="dl-rail" aria-label="Design tools" data-testid="rail">
          <button
            className={`dl-rail__btn ${activeTool === 'upload' ? 'is-active' : ''}`}
            onClick={() => handleToolClick('upload')}
            aria-label="Upload image"
            aria-pressed={activeTool === 'upload'}
            title="Upload"
          >
            <span className="dl-rail__btn-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </span>
            <span className="dl-rail__btn-label">Upload</span>
          </button>

          <button
            className={`dl-rail__btn ${activeTool === 'text' ? 'is-active' : ''}`}
            onClick={() => handleToolClick('text')}
            aria-label="Add text"
            aria-pressed={activeTool === 'text'}
            title="Add Text"
          >
            <span className="dl-rail__btn-icon dl-rail__icon--text">T</span>
            <span className="dl-rail__btn-label">Add Text</span>
          </button>

          <button
            className={`dl-rail__btn ${activeTool === 'art' ? 'is-active' : ''}`}
            onClick={() => handleToolClick('art')}
            aria-label="Add art"
            aria-pressed={activeTool === 'art'}
            title="Add Art"
          >
            <span className="dl-rail__btn-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </span>
            <span className="dl-rail__btn-label">Add Art</span>
          </button>
        </nav>

        {/* 3. ToolPanel - 左侧工具面板 */}
        {/* [2025-12-20 03:10:00] 5.0 版本：功能3 - ToolPanel 面板切换 */}
        {toolPanelType && (
          <aside className="dl-tool-panel" aria-label="Tool panel" data-testid="panel">
            <div className="dl-tool-panel__content">
              {/* Home 面板 */}
              {toolPanelType === 'home' && (
                <>
                  <div className="dl-tool-panel__header">
                    <h2 className="dl-tool-panel__title">What&apos;s next for you?</h2>
                  </div>
                  <div className="dl-home-panel">
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

                    <p className="dl-home-panel__hint">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                      Drag & drop a file anywhere to upload
                    </p>
                  </div>
                </>
              )}

              {/* Upload 面板 */}
              {/* [2025-12-20 03:15:00] 5.0 版本：步骤1 - 集成 UploadPanel 组件 */}
              {toolPanelType === 'upload' && (
                <UploadPanel
                  onFileSelect={handleFileUpload}
                  onBrowseClick={() => { }}
                  onClose={handleBackToHome}
                />
              )}

              {/* Edit Upload 面板 */}
              {/* [2025-12-14 05:50:00] 上传图片后显示的编辑面板 */}
              {toolPanelType === 'edit-upload' && (
                <EditUploadPanel
                  selectedImage={selectedImage}
                  canvas={fabricCanvasRef.current}
                  onUpdate={handleCanvasUpdate}
                  onClose={handleBackToHome}
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
                  {/* [2025-12-16 07:10:00] Add Text: 复用 4.0 TextPanel（输入文本并 Add To Design） */}
                  <TextPanel onAddText={handleAddText} />
                </>
              )}

              {/* Edit Text 面板 */}
              {/* [2025-12-16 07:10:00] Add Text: 文本选中后显示编辑面板 */}
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
                  <EditTextPanel selectedText={selectedText} canvas={fabricCanvasRef.current} onUpdate={handleCanvasUpdate} />
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
                  colors={(() => {
                    // [2025-12-21] Fix: Use dynamic colors from DB if available, fallback to static list
                    if (productInfo.variants && productInfo.variants.length > 0) {
                      const uniqueColors = new Map<string, any>();
                      productInfo.variants.forEach((v: any) => {
                        if (!v.color) return;
                        if (!uniqueColors.has(v.color)) {
                          uniqueColors.set(v.color, {
                            name: v.color,
                            hex: v.colorHex || PRODUCT_COLORS.find(c => c.name === v.color)?.hex || '#cccccc',
                            availableSizes: [],
                            isAvailable: true
                          });
                        }
                        if (v.size) uniqueColors.get(v.color).availableSizes.push(v.size);
                      });
                      return Array.from(uniqueColors.values());
                    }
                    return PRODUCT_COLORS;
                  })()}
                  selectedColor={productInfo.color}
                  onSelectColor={(colorName) => {
                    handleColorSelect(colorName);
                  }}
                  onClose={handleBackToHome}
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
                      // [2025-01-30 12:58:00] 返回 Art 选择面板
                      setSelectedArt(null);
                      setToolPanelType('art');
                    }}
                  />
                </>
              )}
            </div>
          </aside>
        )}

        {/* 4. Canvas - 中央画布区域 */}
        {/* [2025-12-20 02:50:00] 5.0 版本：添加 ref 用于调试 */}
        {/* [2025-12-20 03:20:00] 步骤2 - 替换为 Fabric.js canvas */}
        <section className="dl-canvas" aria-label="Design canvas" data-testid="canvas">
          <div className="dl-canvas__preview">
            <canvas
              ref={canvasRef}
              className="dl-canvas__fabric"
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        </section>

        {/* 5. Sidebar - 右侧视图切换面板 */}
        {/* [2025-12-20 02:30:00] 5.0 版本：与 4.0 版本 UI 一致 - Sidebar 完整内容 */}
        {/* [2025-12-20 02:50:00] 5.0 版本：添加 ref 用于调试 */}
        <aside ref={sidebarRef} className="dl-sidebar" aria-label="View options" data-testid="sidebar">
          <button
            className={`dl-sidebar__btn ${currentView === 'front' ? 'is-active' : ''}`}
            onClick={() => handleViewChange('front')}
            aria-label="Front view"
            aria-pressed={currentView === 'front'}
          >
            <div className="dl-sidebar__thumbnail">
              {productInfo.baseImages.front ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={getThumbnailImageUrl(productInfo.color, 'front')}
                  alt="Front view thumbnail"
                  className="dl-sidebar__thumbnail-image"
                />
              ) : (
                <div className="dl-sidebar__thumbnail-placeholder">Front</div>
              )}
            </div>
            <span className="dl-sidebar__label">Front</span>
          </button>

          <button
            className={`dl-sidebar__btn ${currentView === 'back' ? 'is-active' : ''}`}
            onClick={() => handleViewChange('back')}
            aria-label="Back view"
            aria-pressed={currentView === 'back'}
          >
            <div className="dl-sidebar__thumbnail">
              {productInfo.baseImages.back ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={getThumbnailImageUrl(productInfo.color, 'back')}
                  alt="Back view thumbnail"
                  className="dl-sidebar__thumbnail-image"
                />
              ) : (
                <div className="dl-sidebar__thumbnail-placeholder">Back</div>
              )}
            </div>
            <span className="dl-sidebar__label">Back</span>
          </button>

          <button
            className={`dl-sidebar__btn ${currentView === 'sleeve' ? 'is-active' : ''}`}
            onClick={() => handleViewChange('sleeve')}
            aria-label="Sleeve Design"
            aria-pressed={currentView === 'sleeve'}
          >
            <span className="dl-sidebar__label">Sleeve Design</span>
          </button>

          <button
            className="dl-sidebar__btn"
            aria-label="Zoom"
            aria-pressed={false}
          >
            <span className="dl-sidebar__icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </span>
            <span className="dl-sidebar__label">Zoom</span>
          </button>
        </aside>
      </div>

      {/* [2025-12-14 06:35:00] 鼠标位置调试面板 */}
      {mouseDebug && (
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
      )}

      {/* 6. BottomBar - 底部操作栏 */}
      <footer className="dl-bottom-bar" role="contentinfo" data-testid="bottom-bar">
        <div className="dl-bottom-bar__left">
          <button
            className="dl-bottom-bar__add-products"
            onClick={() => setIsCatalogModalOpen(true)}
            type="button"
          >
            + Add Products
          </button>
          <div className="dl-bottom-bar__product-info">
            <div className="dl-bottom-bar__product-thumb">
              <div className="dl-bottom-bar__product-thumb-placeholder">T</div>
            </div>
            <div className="dl-bottom-bar__product-details">
              <div className="dl-bottom-bar__product-name">
                {typeof productInfo.productName === 'object' ? (productInfo.productName as any).name : (productInfo.productName || 'Gildan Softstyle Jersey T-shirt')}
              </div>
              <div className="dl-bottom-bar__product-links">
                <button
                  className="dl-bottom-bar__link"
                  type="button"
                  onClick={() => setIsCatalogModalOpen(true)}
                >
                  Change Product
                </button>
                {productInfo.color && (
                  <span className="dl-bottom-bar__color">
                    <input type="checkbox" id="color-selected" checked readOnly />
                    <label htmlFor="color-selected">{productInfo.color}</label>
                  </span>
                )}
                <button
                  className="dl-bottom-bar__link"
                  type="button"
                  onClick={() => handleToolClick('product-colors')}
                >
                  Change Color
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="dl-bottom-bar__right">
          <button
            className="dl-bottom-bar__btn dl-bottom-bar__btn--secondary"
            onClick={() => setShowSaveShareModal(true)}
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
            onClick={() => {
              if (!designId) {
                const shouldSave = confirm('Please save your design first before getting a price. Would you like to save now?');
                if (shouldSave) {
                  setShowSaveShareModal(true);
                  return;
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
      </footer>

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

      <SaveShareModal
        isOpen={showSaveShareModal}
        onClose={() => setShowSaveShareModal(false)}
        designId={designId || null}
        designName={designName}
        onSave={async () => {
          await handleSaveDesign();
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
      />

      <ColorSelectorModal
        isOpen={showColorModal}
        onClose={() => setShowColorModal(false)}
        productId={productInfo.productId || ''}
        selectedColor={productInfo.color}
        onSelectColor={handleColorSelect}
        productName={productInfo.productName || ''}
      />
    </div>
  );
};

export default DesignLabClient5;
