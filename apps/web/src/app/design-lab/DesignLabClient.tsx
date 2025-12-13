'use client';

/**
 * Design Lab Client - Custom Ink 100% 像素级复刻
 * [2025-01-30 14:00:00] 根据 customink.plan.md 和 COMPETITOR-ANALYSIS-DESIGN-LAB.md 重新制作
 * [2025-01-30 16:30:00] 集成 Fabric.js 画布和状态管理
 * 
 * 布局结构（5区域）：
 * 1. Header - 顶部导航栏（Logo + My Designs + Untitled + Talk/Chat/SignIn + Cart）
 * 2. Dark Rail - 左侧深灰色工具栏（#2C2C2C，80px宽）
 * 3. Canvas - 中央画布区域（产品预览 + 引导面板 "What's next for you?"）
 * 4. Sidebar - 右侧视图切换面板（Front/Back/Sleeve/Zoom，120px宽）
 * 5. Bottom Bar - 底部操作栏（产品信息 + Save|Share + Get Price）
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image'; // [2025-12-19 16:30:00] 导入Image组件用于Logo
import { useSearchParams } from 'next/navigation';
// [2025-01-30 21:45:00] 修复 fabric.js 导入：在 Next.js 中使用动态导入
import type { fabric } from 'fabric';
import { useDesignLabStore } from '@/contexts/designLabStore';
import { productsApi } from '@/lib/api';
import type { DesignCanvasSnapshot } from '@/lib/api';
import { saveDesignToLocalStorage, loadDesignFromLocalStorage, clearDesignFromLocalStorage } from './utils/localStorage'; // [2025-12-19 16:30:00] 导入本地存储工具
import { useToast } from '@/hooks/useToast'; // [2025-12-08] 引入Toast
import { canvasEngine, CanvasEventType } from '@/design/canvas/engine'; // [2025-01-30 23:30:00] Design Lab 4.0: 使用画布引擎
import ToolPanel, { type ToolPanelType } from './components/ToolPanel';
import HomePanel from './components/panels/HomePanel';
import TemplateLibraryPanel from './components/panels/TemplateLibraryPanel';
import UploadPanel from './components/panels/UploadPanel';
import EditUploadPanel from './components/panels/EditUploadPanel';
import TextPanel from './components/panels/TextPanel';
import EditTextPanel from './components/panels/EditTextPanel';
import ArtPanel from './components/panels/ArtPanel';
import EditArtPanel from './components/panels/EditArtPanel';
import LayerManagementPanel from './components/panels/LayerManagementPanel';
import DesignCommentSection from './components/DesignCommentSection';
import { CanvasLoadingError } from './components/CanvasLoadingError'; // [2025-12-10 18:40:00] Canvas加载错误组件
import ProductColorsModal from './components/modals/ProductColorsModal';
import NamesNumbersModal from './components/modals/NamesNumbersModal';
import PriceModal from './components/modals/PriceModal';
import UploadRatingModal from './components/modals/UploadRatingModal';
import SaveShareModal from './components/modals/SaveShareModal';
import GetPriceFlowModal from './components/modals/GetPriceFlowModal';
import { designLabApi, cartApi } from '@/lib/api';
import { getDefaultProductBaseImages, getThumbnailImageUrl, getDefaultProductImageUrl, getProductBaseImagesFromAPI } from '@/lib/customink-images';
import { analytics } from '@/lib/analytics';
import { debugLog } from '@/utils/debugLogger'; // [2025-01-30 21:50:00] 调试日志工具
import { calculateImageFit } from '@/design/utils/fit'; // [2025-01-31 18:00:00] 统一使用 calculateImageFit 确保商品主图尺寸和位置一致性
import './design-lab.css';

interface ProductInfo {
  productId: string;
  productName: string;
  variantId: string;
  color: string | null;
  colors: string[];
  baseImages: {
    front: string;
    back: string;
    sleeve: string;
  };
  gallery: string[];
}

interface ProductColor {
  name: string;
  hex: string;
  availableSizes: string[];
  isAvailable: boolean;
}

interface DesignLabClientProps {
  initialProductData?: any; // [2025-01-30 23:30:00] Design Lab 4.0: 服务端预取的产品数据
}

const DesignLabClient: React.FC<DesignLabClientProps> = ({ initialProductData }) => {
  const searchParams = useSearchParams();
  const { error: showErrorToast, warning: showWarningToast, success: showSuccessToast } = useToast(); // [2025-12-08] Toast hooks
  
  // [2025-01-31 00:30:00] 版本号显示 - 在 console 打印 SHA + UTC
  useEffect(() => {
    const getVersion = async () => {
      try {
        // 获取当前 Git SHA（从 API 或环境变量）
        let gitSha = process.env.NEXT_PUBLIC_GIT_SHA || 'dev';
        let utcTime = new Date().toISOString();
        
        try {
          // 从 API 获取版本信息（使用相对路径，避免 CORS 问题）
          const response = await fetch('/api/version', { 
            cache: 'no-store',
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            gitSha = data.sha || gitSha;
            utcTime = data.utcTime || utcTime;
          } else {
            console.warn('Version API returned non-OK status:', response.status);
          }
        } catch (error) {
          // API 调用失败时使用默认值，不阻止页面加载
          console.warn('Failed to fetch version from API, using defaults:', error);
        }
        
        const version = `${gitSha}+${utcTime}`;
        
        // 延迟打印，确保 console 已准备好
        setTimeout(() => {
          console.log('%c═══════════════════════════════════════', 'color: #0066CC; font-size: 12px;');
          console.log('%cDesign Lab Version', 'color: #0066CC; font-size: 16px; font-weight: bold;');
          console.log('%c═══════════════════════════════════════', 'color: #0066CC; font-size: 12px;');
          console.log(`%cVersion: ${version}`, 'color: #333; font-size: 12px;');
          console.log(`%cSHA: ${gitSha}`, 'color: #666; font-size: 11px;');
          console.log(`%cUTC Time: ${utcTime}`, 'color: #666; font-size: 11px;');
          console.log('%c═══════════════════════════════════════', 'color: #0066CC; font-size: 12px;');
        }, 100);
      } catch (error) {
        console.warn('Failed to get version info:', error);
      }
    };
    
    getVersion();
    
    // [2025-12-08] 埋点：Design Lab 打开
    analytics.track('design_lab_opened', {
      productId: searchParams.get('productId'),
      colorId: searchParams.get('colorId'),
    });
  }, []);
  
  // [2025-01-30 14:00:00] 状态管理
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'front' | 'back' | 'sleeve' | 'zoom'>('front');
  const [showGuidePanel, setShowGuidePanel] = useState(false); // [2025-01-30 17:00:00] 默认隐藏，因为工具面板会显示
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false); // [2025-12-06 12:30:00] 模板库面板显示状态
  const [showPriceModal, setShowPriceModal] = useState(false); // [2025-12-06 12:30:00] 价格模态框显示状态（旧版，保留兼容）
  const [showGetPriceFlowModal, setShowGetPriceFlowModal] = useState(false); // [2025-12-08] Get Price流程模态框
  const [priceQuote, setPriceQuote] = useState<any>(null); // [2025-12-06 12:30:00] 价格报价数据
  const [priceLoading, setPriceLoading] = useState(false); // [2025-12-06 12:30:00] 价格加载状态
  const [priceError, setPriceError] = useState<string | null>(null); // [2025-12-06 12:30:00] 价格错误信息
  const [quoteQuantity, setQuoteQuantity] = useState(1); // [2025-12-06 12:30:00] 报价数量
  const [currentDesignId, setCurrentDesignId] = useState<string | null>(null); // [2025-12-06 12:30:00] 当前设计 ID
  const [designName, setDesignName] = useState('Untitled Design');
  // [2025-01-30 17:00:00] 工具面板状态管理
  // [2025-01-30 22:20:00] 同时更新 ref，确保事件处理器能访问最新值
  const [toolPanelType, setToolPanelType] = useState<ToolPanelType>('home');
  
  // [2025-01-30 22:20:00] 同步更新 ref
  useEffect(() => {
    toolPanelTypeRef.current = toolPanelType;
  }, [toolPanelType]);
  
  // [2025-01-30 17:30:00] 选中的图片对象
  const [selectedImage, setSelectedImage] = useState<fabric.Image | null>(null);
  // [2025-01-30 17:50:00] 选中的文本对象
  const [selectedText, setSelectedText] = useState<fabric.IText | null>(null);
  // [2025-01-30 18:10:00] 选中的艺术素材对象
  const [selectedArt, setSelectedArt] = useState<fabric.Image | null>(null);
  // [2025-01-30 19:30:00] 产品信息状态
  // [2025-01-31 13:00:00] 根据 designlab-index.jpeg，在初始化时设置默认产品信息，确保画布始终有产品图片
  // [2025-01-31 13:45:00] 修复：将类型从 ProductInfo | null 改为 ProductInfo，因为初始化时总是返回非 null 对象
  const [productInfo, setProductInfo] = useState<ProductInfo>(() => {
    // 在初始化时设置默认产品信息，确保画布始终有产品图片
    const defaultColor = 'White';
    return {
      productId: 'default',
      productName: 'Gildan Softstyle Jersey T-shirt',
      variantId: 'default',
      color: defaultColor,
      colors: ['White', 'Black', 'Navy', 'Maroon', 'Heather Grey', 'Heather Dark Grey'],
      baseImages: getDefaultProductBaseImages(defaultColor),
      gallery: [],
    };
  });
  const [productColors, setProductColors] = useState<ProductColor[]>([]);
  const [showColorModal, setShowColorModal] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(false);
  // [2025-01-30 20:00:00] Names & Numbers 状态
  const [showNamesNumbersModal, setShowNamesNumbersModal] = useState(false);
  // [2025-12-08] 上传体验评分模态框状态
  const [showUploadRatingModal, setShowUploadRatingModal] = useState(false);
  const [currentUploadId, setCurrentUploadId] = useState<string>('');
  // [2025-12-08] Save & Share 模态框状态
  const [showSaveShareModal, setShowSaveShareModal] = useState(false);
  // [2025-01-30 23:30:00] Recent Uploads 状态
  const [recentUploads, setRecentUploads] = useState<Array<{ id: string; url: string; thumbnail: string }>>([]);
  // [2025-01-31 01:00:00] 防止选择清除事件在添加对象后立即触发
  const isAddingObjectRef = useRef(false);
  // [2025-12-11 23:59:30] 防止快照清理在编辑对象期间误删活动对象
  const isEditingObjectRef = useRef(false);
  // [2025-12-11 23:59:30] 跟踪对象删除的来源，用于区分用户删除和快照清理
  const removalContextRef = useRef<'user-delete' | 'snapshot-cleanup' | 'background-reload' | 'unknown'>('unknown');
  // [2025-01-31 13:00:00] 根据 designlab-index.jpeg，添加画布初始化状态跟踪
  const [canvasInitialized, setCanvasInitialized] = useState(false);
  // [2025-12-10 18:40:00] Canvas初始化错误状态
  const [canvasInitError, setCanvasInitError] = useState<Error | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const backgroundImageRef = useRef<fabric.Image | null>(null);
  // [2025-12-10] 使用 ref 存储 fabric 对象，确保在 loadFallbackImage 和 loadBackgroundImage 中使用时 fabric 已加载
  const fabricRef = useRef<typeof fabric | null>(null);
  // [2025-01-30 22:20:00] 使用 ref 跟踪当前面板类型，避免闭包问题
  const toolPanelTypeRef = useRef<ToolPanelType>('home');
  // [2025-01-31 16:30:00] 使用 ref 跟踪已加载的背景图片，避免重复加载和无限循环
  const backgroundImageLoadedRef = useRef<string>('');
  // [2025-01-30 21:55:00] 修复：添加加载锁，防止并发加载导致重复移除
  const isLoadingBackgroundRef = useRef<boolean>(false);
  // [2025-01-31 16:30:00] 使用 ref 跟踪 productInfo，避免在 loadBackgroundImage 中依赖 productInfo
  // [2025-01-31 16:35:00] 修复：必须在 productInfo 定义之后初始化，使用默认值
  const productInfoRef = useRef<ProductInfo>({
    productId: 'default',
    productName: 'Gildan Softstyle Jersey T-shirt',
    variantId: 'default',
    color: 'White',
    colors: ['White', 'Black', 'Navy', 'Maroon', 'Heather Grey', 'Heather Dark Grey'],
    baseImages: getDefaultProductBaseImages('White'),
    gallery: [],
  });
  
  // [2025-01-31 16:30:00] 同步更新 productInfo ref，避免在 loadBackgroundImage 中依赖 productInfo
  useEffect(() => {
    productInfoRef.current = productInfo;
  }, [productInfo]);
  
  // [2025-01-30 14:00:00] 从 store 获取状态
  const { 
    setView, 
    currentView: storeView, 
    setCanvas, 
    canvas: storeCanvas,
    viewCanvases,
    getCurrentViewCanvas,
    setViewCanvases, // [2025-12-19 16:30:00] 批量更新视图画布
    history,
    future
  } = useDesignLabStore();
  
  // [2025-12-08] 计算 Undo/Redo 可用状态
  const canUndo = history.length > 0;
  const canRedo = future.length > 0;
  
  // [2025-01-30 16:30:00] 画布尺寸常量
  const CANVAS_WIDTH = 1000;
  const CANVAS_HEIGHT = 1200;

  // [2025-01-30 16:30:00] 加载产品背景图片
  // [2025-01-30 19:30:00] 更新为使用实际产品图片
  // [2025-01-30 21:25:00] 移到 loadProductInfo 之前，避免初始化顺序问题
  // [2025-01-30 21:35:00] 支持 zoom 视图（虽然不会加载背景）
  // [2025-01-31 14:00:00] 加载占位图片的辅助函数，确保至少显示一个图片
  // [2025-01-31 16:00:00] 修复：添加错误处理，如果占位图加载失败，创建纯色矩形作为备用方案
  // [2025-12-10] 修复：使用 fabricRef 确保 fabric 对象已加载
  const loadFallbackImage = useCallback((viewKey: 'front' | 'back' | 'sleeve', canvas: fabric.Canvas) => {
    if (!canvas) return;
    
    // [2025-12-10] 检查 fabric 对象是否已加载
    if (!fabricRef.current) {
      console.warn('[DesignLab] Fabric not loaded yet, skipping fallback image');
      return;
    }
    
    const fabric = fabricRef.current;
    
    // [2025-01-31 16:00:00] 创建一个简单的纯色矩形作为备用背景，避免依赖外部图片服务
    const createSolidColorBackground = () => {
      // 移除旧背景
      if (backgroundImageRef.current) {
        const objName = (backgroundImageRef.current as any).name || 'unnamed';
        const objLayerType = (backgroundImageRef.current as any).data?.layerType;
        console.log('[DesignLab] 🗑️ Removing background image (createSolidColorBackground):', {
          objName,
          objLayerType,
          location: 'createSolidColorBackground',
          callStack: new Error().stack?.split('\n').slice(1, 5).join('\n'),
        });
        canvas.remove(backgroundImageRef.current);
        backgroundImageRef.current = null;
      }
      
      // [2025-01-31 18:00:00] 统一使用 calculateImageFit 函数计算占位背景的位置和尺寸
      // 使用一个假设的图片尺寸来计算安全区
      const fit = calculateImageFit({
        canvasWidth: CANVAS_WIDTH,
        canvasHeight: CANVAS_HEIGHT,
        imageWidth: CANVAS_WIDTH * 0.65,
        imageHeight: CANVAS_HEIGHT * 0.75,
        safeAreaWidth: 0.65,
        safeAreaHeight: 0.75,
        fit: 'contain',
      });
      
      // 使用浅灰色矩形作为占位背景
      const rect = new fabric.Rect({
        left: fit.left, // [2025-01-31 18:00:00] 使用画布中心坐标
        top: fit.top,
        width: fit.width,
        height: fit.height,
        fill: '#f0f0f0',
        stroke: '#d0d0d0',
        strokeWidth: 2,
        selectable: false,
        evented: false,
        excludeFromExport: true,
        name: 'background',
        originX: 'center', // [2025-01-31 18:00:00] 统一使用 center 原点以实现真正的居中
        originY: 'center',
      });
      
      canvas.add(rect);
      // [2025-01-30 22:25:00] 修复：Fabric.js v6 使用 sendObjectToBack
      try {
        if (typeof (canvas as any).sendObjectToBack === 'function') {
          (canvas as any).sendObjectToBack(rect);
        } else if (typeof (rect as any).sendObjectToBack === 'function') {
          (rect as any).sendObjectToBack();
        }
      } catch (e) {
        // 降级：手动调整对象顺序
        const objs = canvas.getObjects();
        const idx = objs.indexOf(rect);
        if (idx >= 0) {
          objs.splice(idx, 1);
          objs.unshift(rect);
        }
      }
      backgroundImageRef.current = rect as any; // 类型转换，因为 ref 是 fabric.Image
      canvas.renderAll();
      console.log('[DesignLab] Created solid color background as fallback');
      // [2025-01-30 21:55:00] 释放加载锁
      isLoadingBackgroundRef.current = false;
    };
    
    // [2025-01-31 16:00:00] 尝试使用更可靠的占位图服务，如果失败则使用纯色背景
    // 使用 via.placeholder.com 作为备用，它更可靠
    const fallbackUrl = `https://via.placeholder.com/900x700/f0f0f0/d0d0d0?text=T-Shirt+${viewKey}`;
    console.log('[DesignLab] Loading fallback placeholder image:', fallbackUrl);
    
    // [2025-01-31 16:00:00] 添加超时处理
    let imageLoaded = false;
    const timeoutId = setTimeout(() => {
      if (!imageLoaded) {
        console.warn('[DesignLab] Fallback image load timeout, using solid color background');
        createSolidColorBackground();
      }
    }, 5000);
    
    fabric.Image.fromURL(
      fallbackUrl,
      (fabricImg) => {
        imageLoaded = true;
        clearTimeout(timeoutId);
        
        if (!fabricImg) {
          console.error('[DesignLab] Failed to load fallback image, using solid color background');
          createSolidColorBackground();
          return;
        }
        
        // 移除旧背景（只移除非产品图片的背景）
        if (backgroundImageRef.current) {
          const objName = (backgroundImageRef.current as any).name || '';
          const isProductImage = objName?.startsWith('product-image-');
          
          // [2025-01-30 21:55:00] 修复：如果是产品图片，不应该移除
          if (!isProductImage) {
            const objName = (backgroundImageRef.current as any).name || 'unnamed';
            const objLayerType = (backgroundImageRef.current as any).data?.layerType;
            console.log('[DesignLab] 🗑️ Removing background image (loadFallbackImage):', {
              objName,
              objLayerType,
              isProductImage,
              location: 'loadFallbackImage',
              callStack: new Error().stack?.split('\n').slice(1, 5).join('\n'),
            });
            canvas.remove(backgroundImageRef.current);
            backgroundImageRef.current = null;
          }
        }
        
        // [2025-01-31 18:00:00] 设置图片属性，统一使用 center 原点
        fabricImg.set({
          selectable: false,
          evented: false,
          excludeFromExport: true,
          name: 'background',
          originX: 'center', // [2025-01-31 18:00:00] 统一使用 center 原点以实现真正的居中
          originY: 'center',
        });
        
        // [2025-01-31 18:00:00] 统一使用 calculateImageFit 函数，确保与 productImageLayer 一致的缩放和居中策略
        const fit = calculateImageFit({
          canvasWidth: CANVAS_WIDTH,
          canvasHeight: CANVAS_HEIGHT,
          imageWidth: fabricImg.width || 1,
          imageHeight: fabricImg.height || 1,
          safeAreaWidth: 0.65,
          safeAreaHeight: 0.75,
          fit: 'contain',
        });
        
        // [2025-01-31 18:00:00] 应用 fit 结果（居中 + 缩放）
        fabricImg.scale(fit.scale);
        fabricImg.set({
          left: fit.left,
          top: fit.top,
          originX: 'center', // [2025-01-31 18:00:00] 统一使用 center 原点以实现真正的居中
          originY: 'center',
        });
        fabricImg.setCoords();
        
        canvas.add(fabricImg);
        // [2025-01-30 22:25:00] 修复：Fabric.js v6 使用 sendObjectToBack
        try {
          if (typeof (canvas as any).sendObjectToBack === 'function') {
            (canvas as any).sendObjectToBack(fabricImg);
          } else if (typeof (fabricImg as any).sendObjectToBack === 'function') {
            (fabricImg as any).sendObjectToBack();
          } else {
            // 降级：手动调整对象顺序
            const objs = canvas.getObjects();
            const idx = objs.indexOf(fabricImg);
            if (idx >= 0) {
              objs.splice(idx, 1);
              objs.unshift(fabricImg);
            }
          }
        } catch (e) {
          console.warn('[DesignLab] sendObjectToBack failed, using manual method:', e);
          // 降级：手动调整对象顺序
          const objs = canvas.getObjects();
          const idx = objs.indexOf(fabricImg);
          if (idx >= 0) {
            objs.splice(idx, 1);
            objs.unshift(fabricImg);
          }
        }
        backgroundImageRef.current = fabricImg;
        canvas.renderAll();
        console.log('[DesignLab] Fallback placeholder image loaded successfully');
        // [2025-01-30 21:55:00] 释放加载锁
        isLoadingBackgroundRef.current = false;
      },
      {
        crossOrigin: 'anonymous'
      }
    ).catch((error) => {
      // [2025-01-31 16:00:00] 如果 fromURL 返回 Promise 并失败，使用纯色背景
      imageLoaded = true;
      clearTimeout(timeoutId);
      console.error('[DesignLab] Failed to load fallback image from URL:', fallbackUrl, error);
      createSolidColorBackground();
    });
  }, [CANVAS_WIDTH, CANVAS_HEIGHT]);

  // [2025-01-31 13:00:00] 根据 designlab-index.jpeg，优化背景图片加载逻辑：添加详细日志、错误处理、超时处理
  // [2025-01-31 14:00:00] 修复：使用 Fabric.js 的 fromURL 方法，参考开源项目实现方式
  // [2025-01-31 15:30:00] 确保首页能够有默认的图片展示，所有功能能够在这张底图上进行
  // [2025-01-30 21:55:00] 修复：添加加载锁，防止并发加载导致重复移除
  const loadBackgroundImage = useCallback(async (view: 'front' | 'back' | 'sleeve' | 'zoom') => {
    if (view === 'zoom') {
      console.log('[DesignLab] Zoom view, skipping background image load');
      return; // Zoom 视图不加载背景
    }
    if (!fabricCanvasRef.current) {
      console.warn('[DesignLab] Cannot load background image: canvas not initialized');
      return;
    }
    
    // [2025-12-10] 检查 fabric 对象是否已加载
    if (!fabricRef.current) {
      console.warn('[DesignLab] Fabric not loaded yet, skipping background image load');
      return;
    }

    // [2025-01-30 21:55:00] 检查加载锁，防止并发加载
    if (isLoadingBackgroundRef.current) {
      console.log('[DesignLab] Background image is already loading, skipping duplicate call');
      return;
    }

    const canvas = fabricCanvasRef.current;
    const fabric = fabricRef.current;
    
    // 设置加载锁
    isLoadingBackgroundRef.current = true;
    
    // 生成稳定键用于检查是否已加载
    // [2025-01-30 21:30:00] 修复：使用与 productImageLayer 相同的稳定键生成逻辑
    const viewKey = view as 'front' | 'back' | 'sleeve';
    const currentProductInfo = productInfoRef.current;
    const stableKey = `product-image-${currentProductInfo?.productId || 'default'}-${currentProductInfo?.color || 'White'}-${viewKey}`;
    const imageKey = `${viewKey}-${currentProductInfo?.color || 'White'}-${currentProductInfo?.baseImages?.[viewKey] || ''}`;
    
    // #region agent log
    debugLog({
      location: 'DesignLabClient.tsx:407',
      message: 'loadBackgroundImage called',
      data: { view, imageKey, stableKey, backgroundImageLoaded: backgroundImageLoadedRef.current, hasBackgroundImage: !!backgroundImageRef.current, isLoadingLocked: isLoadingBackgroundRef.current },
      hypothesisId: 'B,E',
    });
    // #endregion
    
    // [2025-01-31 18:45:00] 修复：在加载新图片前，先移除所有旧的产品图片（不同稳定键的）
    const existingObjects = canvas.getObjects();
    const existingProductImage = existingObjects.find((obj: any) => 
      obj.name === stableKey || obj.data?.stableKey === stableKey
    );
    
    // [2025-01-31 18:45:00] 如果存在相同稳定键的图片，检查是否需要移除其他旧图片
    // [2025-01-31 19:30:00] 重要：必须排除上传图片（layerType: 'upload'），避免误删用户上传的内容
    if (existingProductImage && backgroundImageRef.current === existingProductImage) {
      // 即使已存在，也要检查是否有其他旧的产品图片需要移除
      const allObjects = canvas.getObjects();
      console.log('[DesignLab] 🔍 Before cleanup (loadBackgroundImage) - all canvas objects:', allObjects.map((obj, idx) => ({
        index: idx,
        name: (obj as any).name || 'unnamed',
        type: obj.type,
        layerType: (obj as any).data?.layerType || 'unknown',
        stableKey: (obj as any).data?.stableKey || (obj as any).name,
        isProductImage: ((obj as any).name || '').startsWith('product-image-'),
      })));
      
      let hasOtherProductImages = false;
      for (const obj of allObjects) {
        const objName = obj.name || '';
        const objLayerType = (obj as any).data?.layerType;
        const isProductImage = objName.startsWith('product-image-');
        const isCurrentKey = objName === stableKey || (obj as any).data?.stableKey === stableKey;
        const isUploadImage = objLayerType === 'upload';
        
        // [2025-01-31 19:30:00] 安全检查：绝对不移除上传图片
        if (isUploadImage) {
          console.log('[DesignLab] ⚠️ Skipping upload image (protected from removal):', {
            objName,
            objLayerType,
          });
          continue;
        }
        
        if (isProductImage && !isCurrentKey) {
          hasOtherProductImages = true;
          console.log('[DesignLab] 🗑️ Found old product image to remove:', {
            objName,
            objLayerType,
            stableKey: (obj as any).data?.stableKey || objName,
            currentStableKey: stableKey,
          });
          console.log('[DesignLab] 📍 Removal call stack:', new Error().stack?.split('\n').slice(1, 5).join('\n'));
          canvas.remove(obj);
        }
      }
      
      if (hasOtherProductImages) {
        canvas.renderAll();
        const remainingObjects = canvas.getObjects();
        console.log('[DesignLab] ✅ Removed old product images, keeping current:', {
          stableKey,
          remainingObjectsCount: remainingObjects.length,
          remainingObjects: remainingObjects.map((obj) => ({
            name: (obj as any).name || 'unnamed',
            layerType: (obj as any).data?.layerType || 'unknown',
          })),
        });
      }
      
      console.log('[DesignLab] Product image already loaded and matches ref, skipping:', stableKey);
      // #region agent log
      debugLog({
        location: 'DesignLabClient.tsx:418',
        message: 'skipped duplicate load - existing image found',
        data: { stableKey, imageKey },
        hypothesisId: 'B',
      });
      // #endregion
      isLoadingBackgroundRef.current = false;
      return;
    }
    
    // 检查是否已经加载了相同的图片（兼容旧检查）
    if (backgroundImageLoadedRef.current === imageKey && backgroundImageRef.current) {
      console.log('[DesignLab] Product image already loaded for this view/color, skipping:', imageKey);
      // #region agent log
      debugLog({
        location: 'DesignLabClient.tsx:425',
        message: 'skipped duplicate load - ref check',
        data: { imageKey },
        hypothesisId: 'B',
      });
      // #endregion
      isLoadingBackgroundRef.current = false;
      return;
    }
    
    try {
      console.log('[DesignLab] Attempting to load product image using productImageLayer...');
      const { loadProductImageLayer } = await import('@/design/canvas/layers/productImageLayer');
      const gitSha = process.env.NEXT_PUBLIC_GIT_SHA || 'dev';
      
      console.log('[DesignLab] Calling loadProductImageLayer with options:', {
        colorName: currentProductInfo?.color || 'White',
        view: viewKey,
        productId: currentProductInfo?.productId,
        canvasSize: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
      });
      
      const result = await loadProductImageLayer({
        canvas,
        fabric,
        canvasWidth: CANVAS_WIDTH,
        canvasHeight: CANVAS_HEIGHT,
        imageOptions: {
          colorName: currentProductInfo?.color || 'White',
          view: viewKey,
          useAPI: false, // 默认使用静态生成，避免延迟
        },
        gitSha,
        productId: currentProductInfo?.productId,
      });
      
      console.log('[DesignLab] loadProductImageLayer returned:', {
        success: result.success,
        hasImage: !!result.image,
        error: result.error?.message,
        state: result.state,
        stableKey: result.stableKey,
      });
      
      if (result.success && result.image) {
        // #region agent log
        const objectsAfterLoad = canvas.getObjects();
        debugLog({
          location: 'DesignLabClient.tsx:452',
          message: 'loadProductImageLayer success',
          data: { stableKey: result.stableKey, imageKey, imageName: result.image.name, canvasObjectsCount: objectsAfterLoad.length, objectIndex: objectsAfterLoad.indexOf(result.image), isFirst: objectsAfterLoad[0]===result.image, firstObjectName: objectsAfterLoad[0]?.name },
          hypothesisId: 'A,D',
        });
        // #endregion
        
        // 更新引用（不手动移除，由 productImageLayer 管理）
        backgroundImageRef.current = result.image;
        backgroundImageLoadedRef.current = imageKey;
        
        // [2025-01-30 21:30:00] 验证图片是否在最底层
        const finalObjects = canvas.getObjects();
        const productImageIndex = finalObjects.indexOf(result.image);
        if (productImageIndex !== 0) {
          console.warn('[DesignLab] ⚠️ Product image is not at the bottom! Index:', productImageIndex, 'Expected: 0');
          // 强制移到最底层
          try {
            // [2025-01-30 22:25:00] 修复：Fabric.js v6 使用 sendObjectToBack
            try {
              if (typeof (canvas as any).sendObjectToBack === 'function') {
                (canvas as any).sendObjectToBack(result.image);
              } else if (typeof (result.image as any).sendObjectToBack === 'function') {
                (result.image as any).sendObjectToBack();
              } else {
                // 降级：手动调整对象顺序
                const objs = canvas.getObjects();
                const idx = objs.indexOf(result.image);
                if (idx > 0) {
                  objs.splice(idx, 1);
                  objs.unshift(result.image);
                  canvas.renderAll();
                }
              }
            } catch (e) {
              console.warn('[DesignLab] sendObjectToBack failed, using manual method:', e);
              // 降级：手动调整对象顺序
              const objs = canvas.getObjects();
              const idx = objs.indexOf(result.image);
              if (idx > 0) {
                objs.splice(idx, 1);
                objs.unshift(result.image);
              }
            }
            canvas.renderAll();
            
            const finalObjs = canvas.getObjects();
            const finalIdx = finalObjs.indexOf(result.image);
            if (finalIdx === 0) {
              console.log('[DesignLab] ✅ Fixed: Product image moved to bottom');
              // #region agent log
              debugLog({
                location: 'DesignLabClient.tsx:468',
                message: 'fixed product image position',
                data: { stableKey: result.stableKey, oldIndex: productImageIndex, newIndex: 0 },
                hypothesisId: 'D',
              });
              // #endregion
            }
          } catch (e) {
            console.error('[DesignLab] Failed to fix product image position:', e);
          }
        }
        
        // 监听一次性 ready 事件
        const handleReady = (e: any) => {
          if (e.image === result.image) {
            console.log('[DesignLab] ✅ Product image ready (one-time event)');
            // #region agent log
            debugLog({
              location: 'DesignLabClient.tsx:478',
              message: 'product-image:ready event',
              data: { stableKey: result.stableKey },
              hypothesisId: 'B',
            });
            // #endregion
            canvas.off('product-image:ready', handleReady);
          }
        };
        canvas.on('product-image:ready', handleReady);
        
        console.log('[DesignLab] ✅ Product image loaded using new productImageLayer, stableKey:', result.stableKey);
        
        // [2025-01-30 22:35:00] 详细调试：验证图片是否真的在画布上并且可见
        if (result.image && canvas) {
          const img = result.image;
          const isOnCanvas = canvas.getObjects().includes(img);
          const imgBounds = img.getBoundingRect();
          const imgProps = {
            visible: img.visible,
            opacity: img.opacity,
            left: img.left,
            top: img.top,
            width: img.width,
            height: img.height,
            scaleX: img.scaleX,
            scaleY: img.scaleY,
            onCanvas: isOnCanvas,
            index: isOnCanvas ? canvas.getObjects().indexOf(img) : -1,
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
            bounds: imgBounds,
          };
          
          // [2025-01-30 22:35:00] 详细输出所有属性（展开对象）
          console.log('[DesignLab] 🔍 Product image verification:');
          console.log('  visible:', imgProps.visible);
          console.log('  opacity:', imgProps.opacity);
          console.log('  left:', imgProps.left);
          console.log('  top:', imgProps.top);
          console.log('  width:', imgProps.width);
          console.log('  height:', imgProps.height);
          console.log('  scaleX:', imgProps.scaleX);
          console.log('  scaleY:', imgProps.scaleY);
          console.log('  onCanvas:', imgProps.onCanvas);
          console.log('  index:', imgProps.index);
          console.log('  canvasWidth:', imgProps.canvasWidth);
          console.log('  canvasHeight:', imgProps.canvasHeight);
          console.log('  bounds:', imgProps.bounds);
          console.log('  full imgProps:', JSON.stringify(imgProps, null, 2));
          
          // [2025-01-30 22:35:00] 检查所有画布对象
          const allObjs = canvas.getObjects();
          console.log('[DesignLab] 🔍 All canvas objects:', allObjs.length, 'objects');
          allObjs.forEach((obj, idx) => {
            console.log(`  [${idx}] ${(obj as any).name || 'unnamed'}:`, {
              type: obj.type,
              visible: obj.visible,
              opacity: obj.opacity,
              zIndex: (obj as any).data?.zIndex,
              left: obj.left,
              top: obj.top,
              width: obj.width,
              height: obj.height,
              scaleX: obj.scaleX,
              scaleY: obj.scaleY,
              isProductImage: obj === img,
            });
          });
          
          // [2025-01-30 22:35:00] 检查画布元素的样式
          const canvasElement = canvas.getElement();
          if (canvasElement) {
            const canvasStyle = window.getComputedStyle(canvasElement);
            const canvasRect = canvasElement.getBoundingClientRect();
            console.log('[DesignLab] 🔍 Canvas element check:');
            console.log('  canvasElement.width:', canvasElement.width);
            console.log('  canvasElement.height:', canvasElement.height);
            console.log('  canvasElement.offsetWidth:', canvasElement.offsetWidth);
            console.log('  canvasElement.offsetHeight:', canvasElement.offsetHeight);
            console.log('  getBoundingClientRect():', {
              left: canvasRect.left,
              top: canvasRect.top,
              width: canvasRect.width,
              height: canvasRect.height,
            });
            console.log('  display:', canvasStyle.display);
            console.log('  visibility:', canvasStyle.visibility);
            console.log('  opacity:', canvasStyle.opacity);
            console.log('  zIndex:', canvasStyle.zIndex);
            console.log('  position:', canvasStyle.position);
          }
          
          // [2025-01-30 22:35:00] 检查画布容器的样式
          const canvasContainer = canvasElement?.parentElement;
          if (canvasContainer) {
            const containerStyle = window.getComputedStyle(canvasContainer);
            const containerRect = canvasContainer.getBoundingClientRect();
            console.log('[DesignLab] 🔍 Canvas container check:');
            console.log('  container.offsetWidth:', canvasContainer.offsetWidth);
            console.log('  container.offsetHeight:', canvasContainer.offsetHeight);
            console.log('  getBoundingClientRect():', {
              left: containerRect.left,
              top: containerRect.top,
              width: containerRect.width,
              height: containerRect.height,
            });
            console.log('  display:', containerStyle.display);
            console.log('  visibility:', containerStyle.visibility);
            console.log('  opacity:', containerStyle.opacity);
            console.log('  overflow:', containerStyle.overflow);
            console.log('  position:', containerStyle.position);
            console.log('  transform:', containerStyle.transform);
            console.log('  scrollTop:', canvasContainer.scrollTop);
            console.log('  scrollLeft:', canvasContainer.scrollLeft);
            console.log('  marginTop:', containerStyle.marginTop);
            console.log('  marginBottom:', containerStyle.marginBottom);
            console.log('  paddingTop:', containerStyle.paddingTop);
            console.log('  paddingBottom:', containerStyle.paddingBottom);
          }
          
          // [2025-01-30 22:45:00] 检查所有父元素的位置
          let parent = canvasElement?.parentElement;
          let level = 0;
          console.log('[DesignLab] 🔍 Parent elements check:');
          while (parent && level < 6) {
            const parentRect = parent.getBoundingClientRect();
            const parentStyle = window.getComputedStyle(parent);
            console.log(`  Level ${level} (${parent.className || parent.tagName}):`, {
              tagName: parent.tagName,
              className: parent.className,
              id: parent.id,
              offsetWidth: parent.offsetWidth,
              offsetHeight: parent.offsetHeight,
              scrollHeight: parent.scrollHeight,
              clientHeight: parent.clientHeight,
              getBoundingClientRect: {
                left: parentRect.left,
                top: parentRect.top,
                width: parentRect.width,
                height: parentRect.height,
              },
              scrollTop: parent.scrollTop,
              scrollLeft: parent.scrollLeft,
              overflow: parentStyle.overflow,
              overflowY: parentStyle.overflowY,
              overflowX: parentStyle.overflowX,
              position: parentStyle.position,
              transform: parentStyle.transform,
              display: parentStyle.display,
              marginTop: parentStyle.marginTop,
              marginBottom: parentStyle.marginBottom,
              paddingTop: parentStyle.paddingTop,
              paddingBottom: parentStyle.paddingBottom,
              height: parentStyle.height,
              minHeight: parentStyle.minHeight,
              maxHeight: parentStyle.maxHeight,
            });
            parent = parent.parentElement;
            level++;
          }
          
          // [2025-01-30 22:50:00] 检查是否有滚动容器需要滚动
          console.log('[DesignLab] 🔍 Scroll check:');
          let scrollParent = canvasElement?.parentElement;
          while (scrollParent) {
            const style = window.getComputedStyle(scrollParent);
            const hasScroll = (style.overflow === 'auto' || style.overflow === 'scroll' || style.overflowY === 'auto' || style.overflowY === 'scroll') &&
                            (scrollParent.scrollHeight > scrollParent.clientHeight);
            if (hasScroll) {
              console.log(`  Scrollable parent found (${scrollParent.className || scrollParent.tagName}):`, {
                scrollHeight: scrollParent.scrollHeight,
                clientHeight: scrollParent.clientHeight,
                scrollTop: scrollParent.scrollTop,
                overflow: style.overflow,
                overflowY: style.overflowY,
              });
            }
            scrollParent = scrollParent.parentElement;
          }
          
          // [2025-01-30 22:45:00] 检查视口位置
          console.log('[DesignLab] 🔍 Viewport check:');
          console.log('  window.innerHeight:', window.innerHeight);
          console.log('  window.innerWidth:', window.innerWidth);
          console.log('  window.scrollY:', window.scrollY);
          console.log('  window.scrollX:', window.scrollX);
          console.log('  document.documentElement.scrollTop:', document.documentElement.scrollTop);
          console.log('  document.documentElement.scrollHeight:', document.documentElement.scrollHeight);
          
          if (!isOnCanvas) {
            console.error('[DesignLab] ❌ ERROR: Product image is not on canvas!');
          } else if (!img.visible || img.opacity === 0) {
            console.warn('[DesignLab] ⚠️ WARNING: Product image is not visible!', {
              visible: img.visible,
              opacity: img.opacity,
            });
          } else {
            console.log('[DesignLab] ✅ Product image is on canvas and visible');
          }
        }
        
        // [2025-01-30 21:55:00] 释放加载锁（在成功返回前）
        isLoadingBackgroundRef.current = false;
        return; // 成功加载，退出
      } else {
        console.error('[DesignLab] ❌ productImageLayer failed, error:', result.error);
        console.error('[DesignLab] Result details:', result);
        // 继续使用旧方法（锁会在旧方法结束时释放）
      }
    } catch (error) {
      console.error('[DesignLab] ❌ Failed to use productImageLayer, exception:', error);
      if (error instanceof Error) {
        console.error('[DesignLab] Error stack:', error.stack);
      }
      // 继续使用旧方法（锁会在旧方法结束时释放）
    }
    
    // [2025-01-31 16:55:00] 旧方法：检查是否正在加载，避免重复加载（已经在上面检查过，这里作为双重保险）
    const imageKeyOld = `${view}-${productInfoRef.current?.color || 'White'}-${productInfoRef.current?.baseImages?.[view] || ''}`;
    if (backgroundImageLoadedRef.current === imageKeyOld && backgroundImageRef.current) {
      console.log('[DesignLab] Background image already loaded for this view and color (old method check), skipping:', imageKeyOld);
      // [2025-01-30 21:55:00] 释放加载锁
      isLoadingBackgroundRef.current = false;
      return;
    }
    
    // [2025-01-30 16:30:00] 移除旧背景
    // [2025-01-30 21:55:00] 修复：只移除不是产品图片的背景（避免移除 productImageLayer 创建的图片）
    if (backgroundImageRef.current) {
      const objName = (backgroundImageRef.current as any).name || '';
      const isProductImage = objName?.startsWith('product-image-');
      
      // 如果是产品图片，不应该在这里移除（由 productImageLayer 管理）
      if (isProductImage) {
        console.log('[DesignLab] Skipping removal of product image (managed by productImageLayer):', objName);
        // [2025-01-30 21:55:00] 释放加载锁
        isLoadingBackgroundRef.current = false;
        return; // 如果是产品图片，直接返回，不继续使用旧方法
      }
      
      const objLayerType = (backgroundImageRef.current as any).data?.layerType;
      console.log('[DesignLab] 🗑️ Removing old background image (non-product):', {
        objName,
        objLayerType,
        location: 'loadBackgroundImage (fallback path)',
        callStack: new Error().stack?.split('\n').slice(1, 5).join('\n'),
      });
      canvas.remove(backgroundImageRef.current);
      backgroundImageRef.current = null;
    }

    // [2025-01-30 19:30:00] 使用产品图片或占位图片
    // [2025-01-30 23:55:00] 优先使用 Custom Ink 的真实图片 URL
    // [2025-01-30 23:55:00] 支持从 API 动态获取图片 URL
    // [2025-01-31 15:30:00] 确保即使 productInfo 为空也能显示默认图片
    // [2025-01-31 16:30:00] 修复：使用 ref 访问最新的 productInfo，避免依赖导致无限循环
    // [2025-01-30 21:55:00] viewKey 和 currentProductInfo 已在上面定义，这里直接使用
    let imageUrl: string;
    
    if (currentProductInfo?.baseImages?.[viewKey]) {
      // 如果产品信息中有图片 URL，直接使用
      imageUrl = currentProductInfo.baseImages[viewKey];
      console.log('[DesignLab] Using baseImages URL for view:', viewKey, imageUrl);
    } else if (currentProductInfo?.color) {
      // [2025-01-30 23:55:00] 尝试从 API 获取图片 URL（如果可用）
      // 注意：这里是同步调用，所以先使用静态生成，后续可以优化为异步
      imageUrl = getDefaultProductImageUrl(currentProductInfo.color, viewKey);
      console.log('[DesignLab] Using default product image URL for color:', currentProductInfo.color, 'view:', viewKey, imageUrl);
      
      // [2025-01-30 23:55:00] 异步尝试从 API 获取并更新（不阻塞当前加载）
      // [2025-01-31 16:30:00] 修复：使用函数式更新，避免依赖 productInfo 导致无限循环
      if (typeof window !== 'undefined' && currentProductInfo.color) {
        getProductBaseImagesFromAPI(currentProductInfo.color).then((apiImages) => {
          if (apiImages && apiImages[viewKey] && apiImages[viewKey] !== imageUrl) {
            // 如果 API 返回了不同的 URL，更新 productInfo 并重新加载
            console.log('[DesignLab] API returned different image URL, updating productInfo');
            setProductInfo((prev) => {
              // [2025-01-31 16:30:00] 检查是否真的需要更新，避免不必要的更新
              if (prev.baseImages?.[viewKey] === apiImages[viewKey]) {
                return prev;
              }
              return {
                ...prev,
                baseImages: apiImages
              };
            });
          }
        }).catch((error) => {
          // 忽略错误，继续使用静态生成的 URL
          console.warn('[DesignLab] Failed to get image URL from API, using static URL:', error);
        });
      }
    } else {
      // [2025-01-31 15:30:00] 如果没有 productInfo，使用默认白色产品的图片，确保首页始终有底图显示
      const defaultColor = 'White';
      imageUrl = getDefaultProductImageUrl(defaultColor, viewKey);
      console.log('[DesignLab] No productInfo or color, using default White product image:', imageUrl);
    }
    
    // [2025-01-31 14:00:00] 修复：使用 Fabric.js 的 fromURL 方法，参考开源项目实现方式
    // [2025-01-31 16:00:00] 修复：添加完善的错误处理，确保图片加载失败时不会报错
    console.log('[DesignLab] Loading background image:', imageUrl);
    
    let imageLoaded = false;
    let timeoutId: NodeJS.Timeout | null = null;
    
    // [2025-01-31 16:00:00] 图片加载成功回调
    const onImageLoaded = (fabricImg: fabric.Image | null) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      imageLoaded = true;
      
      if (!fabricImg || !canvas) {
        console.error('[DesignLab] Failed to create fabric image or canvas not available');
        loadFallbackImage(viewKey, canvas);
        return;
      }
      
      console.log('[DesignLab] Background image loaded successfully:', imageUrl, 'Dimensions:', fabricImg.width, 'x', fabricImg.height);
      
      try {
        // [2025-01-31 15:30:00] 设置图片属性，确保底图不可选择和不可交互，但始终显示在最底层
        // [2025-01-31 18:00:00] 统一使用 center 原点
        fabricImg.set({
          selectable: false,
          evented: false,
          excludeFromExport: true,
          name: 'background',
          originX: 'center', // [2025-01-31 18:00:00] 统一使用 center 原点以实现真正的居中
          originY: 'center',
        });
        
        // [2025-01-31 18:00:00] 统一使用 calculateImageFit 函数，确保与 productImageLayer 一致的缩放和居中策略
        const fit = calculateImageFit({
          canvasWidth: CANVAS_WIDTH,
          canvasHeight: CANVAS_HEIGHT,
          imageWidth: fabricImg.width || 1,
          imageHeight: fabricImg.height || 1,
          safeAreaWidth: 0.65,
          safeAreaHeight: 0.75,
          fit: 'contain',
        });
        
        // [2025-01-31 18:00:00] 应用 fit 结果（居中 + 缩放）
        fabricImg.scale(fit.scale);
        fabricImg.set({
          left: fit.left,
          top: fit.top,
          originX: 'center', // [2025-01-31 18:00:00] 统一使用 center 原点以实现真正的居中
          originY: 'center',
        });
        fabricImg.setCoords();
        
        // [2025-01-30 16:30:00] 移除旧背景
        if (backgroundImageRef.current) {
          const objName = (backgroundImageRef.current as any).name || 'unnamed';
          const objLayerType = (backgroundImageRef.current as any).data?.layerType;
          console.log('[DesignLab] 🗑️ Removing old background image (onImageLoaded):', {
            objName,
            objLayerType,
            location: 'onImageLoaded',
            callStack: new Error().stack?.split('\n').slice(1, 5).join('\n'),
          });
          canvas.remove(backgroundImageRef.current);
          backgroundImageRef.current = null;
        }
        
        canvas.add(fabricImg);
        
        // [2025-01-30 16:30:00] 移动到最底层，确保所有功能（上传图片、文字、art）都能在底图上操作
        // [2025-01-30 22:25:00] 修复：Fabric.js v6 使用 sendObjectToBack
        try {
          if (typeof (canvas as any).sendObjectToBack === 'function') {
            (canvas as any).sendObjectToBack(fabricImg);
          } else if (typeof (fabricImg as any).sendObjectToBack === 'function') {
            (fabricImg as any).sendObjectToBack();
          } else {
            // 降级：手动调整对象顺序
            const objects = canvas.getObjects();
            const index = objects.indexOf(fabricImg);
            if (index > 0) {
              objects.splice(index, 1);
              objects.unshift(fabricImg);
              canvas.renderAll();
            }
          }
        } catch (e) {
          console.warn('[DesignLab] sendObjectToBack failed, using manual method:', e);
          // 降级：手动调整对象顺序
          const objects = canvas.getObjects();
          const index = objects.indexOf(fabricImg);
          if (index > 0) {
            objects.splice(index, 1);
            objects.unshift(fabricImg);
            canvas.renderAll();
          }
        }
        
        backgroundImageRef.current = fabricImg;
        // [2025-01-31 16:55:00] 标记图片已加载，避免重复加载
        const currentImageKey = `${viewKey}-${productInfoRef.current?.color || 'White'}-${imageUrl}`;
        backgroundImageLoadedRef.current = currentImageKey;
        // [2025-01-30 21:55:00] 释放加载锁（在标记完成之前）
        isLoadingBackgroundRef.current = false;
        console.log('[DesignLab] ✅ Background image added to canvas successfully, marked as loaded:', currentImageKey);
        canvas.renderAll();
        console.log('[DesignLab] ✅ Background image loading completed, all features can work on this base image');
      } catch (error) {
        console.error('[DesignLab] Error adding fabric image to canvas:', error);
        loadFallbackImage(viewKey, canvas);
      }
    };
    
    // [2025-01-31 16:00:00] 图片加载失败回调
    const onImageError = (error: any) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      imageLoaded = false;
      console.error('[DesignLab] Failed to load background image from URL:', imageUrl, error);
      loadFallbackImage(viewKey, canvas);
    };
    
    // [2025-01-31 14:00:00] 设置超时，如果 10 秒内没加载成功，使用占位图
    timeoutId = setTimeout(() => {
      if (!imageLoaded && !backgroundImageRef.current) {
        console.warn('[DesignLab] Image load timeout after 10 seconds, using fallback placeholder');
        loadFallbackImage(viewKey, canvas);
      }
    }, 10000);
    
    // [2025-01-31 16:00:00] 使用 try-catch 包装 fromURL 调用，确保错误被捕获
    // [2025-01-31 16:50:00] 修复：使用原生 Image 对象加载，然后转换为 Fabric Image，更可靠
    console.log('[DesignLab] Loading image using native Image object:', imageUrl);
    
    const imgElement = new Image();
    imgElement.crossOrigin = 'anonymous';
    
    imgElement.onload = () => {
      console.log('[DesignLab] ✅ Native Image loaded successfully, dimensions:', imgElement.width, 'x', imgElement.height);
      try {
        // [2025-12-10] 使用 fabricRef 确保 fabric 对象已加载
        if (!fabricRef.current) {
          console.error('[DesignLab] ❌ Fabric not loaded yet, cannot create Fabric Image');
          onImageError(new Error('Fabric not loaded'));
          return;
        }
        const fabricImg = new fabricRef.current.Image(imgElement);
        console.log('[DesignLab] ✅ Fabric Image created successfully, calling onImageLoaded');
        onImageLoaded(fabricImg);
      } catch (error) {
        console.error('[DesignLab] ❌ Error creating Fabric Image from native Image:', error);
        onImageError(error);
      }
    };
    
    imgElement.onerror = (error) => {
      console.error('[DesignLab] Native Image load error:', error);
      onImageError(error);
    };
    
    // 开始加载图片
    try {
      imgElement.src = imageUrl;
      console.log('[DesignLab] Image src set, loading started');
    } catch (error) {
      console.error('[DesignLab] Error setting image src:', error);
      onImageError(error);
    }
  }, [CANVAS_WIDTH, CANVAS_HEIGHT, loadFallbackImage]); // [2025-01-31 16:30:00] 移除 productInfo 依赖，使用 ref 访问

  // [2025-01-30 19:30:00] 加载产品信息
  // [2025-12-08 23:30:00] 增强：添加variantId验证、错误处理和默认图片展示逻辑
  const loadProductInfo = useCallback(async (variantId?: string) => {
    if (!variantId) {
      // 如果没有 variantId，使用默认值或从 URL 获取
      const urlVariantId = searchParams?.get('variantId');
      if (!urlVariantId) {
        console.log('[DesignLab] No variantId provided, using default product');
        // [2025-12-08 23:30:00] 埋点：缺少variantId
        analytics.track('designer_open_failed_missing_variant', {
          referrer: searchParams?.get('referrer') || 'unknown',
        });
        // 可以设置一个默认产品
        return;
      }
      variantId = urlVariantId;
    }

    // [2025-12-08 23:30:00] 验证variantId格式（UUID格式）
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(variantId)) {
      console.error('[DesignLab] Invalid variantId format:', variantId);
      // [2025-12-08 23:30:00] 埋点：无效variantId
      analytics.track('designer_open_failed_invalid_variant', {
        variantId: variantId,
        referrer: searchParams?.get('referrer') || 'unknown',
      });
      showErrorToast('Invalid product variant ID. Please return to the product page and try again.');
      return;
    }

    setLoadingProduct(true);
    try {
      const data = await productsApi.getByVariant(variantId);
      
      // [2025-12-08 23:30:00] 检查是否有默认图片
      const hasDefaultImage = data.baseImages?.front || data.baseImages?.back || data.baseImages?.sleeve;
      
      setProductInfo(data);
      
      // [2025-01-30 19:30:00] 使用 API 返回的颜色详细信息
      if (data.colorDetails && data.colorDetails.length > 0) {
        // [2025-01-30 19:30:00] API 已返回颜色详细信息，直接使用
        setProductColors(data.colorDetails);
      } else if (data.variants && Array.isArray(data.variants)) {
        // [2025-01-30 19:30:00] 如果 API 没有返回 colorDetails，从变体数据构建
        const colorMap = new Map<string, { hex: string; sizes: Set<string>; isAvailable: boolean }>();
        
        data.variants.forEach((variant: any) => {
          if (variant.color) {
            const colorName = variant.color;
            if (!colorMap.has(colorName)) {
              colorMap.set(colorName, {
                hex: variant.colorHex || '#cccccc',
                sizes: new Set<string>(),
                isAvailable: (variant.stockQuantity || 0) > 0,
              });
            }
            const colorInfo = colorMap.get(colorName)!;
            if (variant.size) {
              colorInfo.sizes.add(variant.size);
            }
            if ((variant.stockQuantity || 0) > 0) {
              colorInfo.isAvailable = true;
            }
          }
        });
        
        const colors: ProductColor[] = data.colors.map((colorName) => {
          const colorInfo = colorMap.get(colorName) || {
            hex: '#cccccc',
            sizes: new Set<string>(),
            isAvailable: true,
          };
          return {
            name: colorName,
            hex: colorInfo.hex,
            availableSizes: Array.from(colorInfo.sizes).sort(),
            isAvailable: colorInfo.isAvailable,
          };
        });
        setProductColors(colors);
      } else {
        // [2025-01-30 19:30:00] 如果都没有，使用简化版本
        const colors: ProductColor[] = data.colors.map((colorName) => ({
          name: colorName,
          hex: '#cccccc',
          availableSizes: [],
          isAvailable: true,
        }));
        setProductColors(colors);
      }
      
      // [2025-12-08 23:30:00] 检查画布是否有用户内容
      const hasUserContent = fabricCanvasRef.current && fabricCanvasRef.current.getObjects().some((obj: fabric.Object) => {
        const objName = (obj as any).name || '';
        return objName && objName !== 'background';
      });
      
      // [2025-12-08 23:30:00] 如果没有用户内容且有默认图片，显示默认图片
      if (!hasUserContent && hasDefaultImage && fabricCanvasRef.current) {
        // [2025-12-08 23:30:00] 埋点：显示默认图片
        analytics.track('designer_default_image_shown', {
          variantId: variantId,
          imageUrl: data.baseImages?.front || data.baseImages?.back || data.baseImages?.sleeve,
          productId: data.productId,
        });
        loadBackgroundImage(currentView);
      } else if (fabricCanvasRef.current) {
        // [2025-01-30 19:30:00] 更新背景图片（即使有用户内容，也要更新背景）
        loadBackgroundImage(currentView);
      }
      
      // [2025-12-08 23:30:00] 埋点：设计器打开成功
      analytics.track('designer_open_success', {
        variantId: variantId,
        productId: data.productId,
        referrer: searchParams?.get('referrer') || 'unknown',
        hasDefaultImage: hasDefaultImage,
      });
    } catch (error: any) {
      console.error('[DesignLab] Error loading product info:', error);
      
      // [2025-12-08 23:30:00] 错误处理：如果获取默认图失败，使用占位图
      const errorMessage = error?.message || 'Unknown error';
      const isNotFound = errorMessage.includes('404') || errorMessage.includes('not found');
      
      if (isNotFound) {
        // [2025-12-08 23:30:00] 埋点：variantId不存在
        analytics.track('designer_open_failed_missing_variant', {
          variantId: variantId,
          referrer: searchParams?.get('referrer') || 'unknown',
        });
        showErrorToast('Product variant not found. Please return to the product page and try again.');
      } else {
        // [2025-12-08 23:30:00] 埋点：获取默认图失败，使用占位图
        analytics.track('designer_default_image_fallback', {
          variantId: variantId,
          error: errorMessage,
        });
        
        // 使用占位图
        const placeholderImage = '/assets/placeholder.png';
        const fallbackProductInfo: ProductInfo = {
          productId: 'fallback',
          productName: 'Product',
          variantId: variantId || 'fallback',
          color: 'White',
          colors: ['White'],
          baseImages: {
            front: placeholderImage,
            back: placeholderImage,
            sleeve: placeholderImage,
          },
          gallery: [],
        };
        setProductInfo(fallbackProductInfo);
        
        if (fabricCanvasRef.current) {
          loadBackgroundImage(currentView);
        }
        
        showWarningToast('Unable to load product image. Using placeholder image.');
      }
    } finally {
      setLoadingProduct(false);
    }
  }, [searchParams, currentView, loadBackgroundImage, showErrorToast, showWarningToast]);

  // [2025-01-30 16:30:00] 将 Fabric 画布状态转换为 DesignCanvasSnapshot
  // [2025-01-30 21:25:00] 移到 handleAddNamesNumbers 之前，避免初始化顺序问题
  const canvasToSnapshot = useCallback((canvas: fabric.Canvas): DesignCanvasSnapshot => {
    const objects = canvas.getObjects()
      .filter((obj: fabric.Object) => obj.name !== 'background') // 排除背景图
      .map((obj: fabric.Object) => obj.toJSON(['name', 'data']));
    
    return {
      size: { width: canvas.width || CANVAS_WIDTH, height: canvas.height || CANVAS_HEIGHT },
      objects
    };
  }, [CANVAS_WIDTH, CANVAS_HEIGHT]);

  // [2025-01-30 16:30:00] 从 DesignCanvasSnapshot 恢复 Fabric 画布
  // [2025-01-30 21:25:00] 移到 handleAddNamesNumbers 之前，避免初始化顺序问题
  // [2025-12-08 23:00:00] 修复：为恢复的对象添加删除控件
  // [2025-12-10] 修复：使用 fabricRef 确保 fabric 对象已加载
  // [2025-12-11 23:59:30] 修复：添加编辑会话保护，防止在编辑期间误删活动对象
  const snapshotToCanvas = useCallback((snapshot: DesignCanvasSnapshot, canvas: fabric.Canvas) => {
    // [2025-12-10] 检查 fabric 对象是否已加载
    if (!fabricRef.current) {
      console.warn('[DesignLab] Fabric not loaded yet, cannot restore canvas snapshot');
      return;
    }
    
    const fabric = fabricRef.current;
    
    // [2025-12-11 23:59:30] 编辑会话保护：如果正在编辑对象，跳过快照清理
    if (isEditingObjectRef.current) {
      console.log('[DesignLab] Skipping snapshotToCanvas while editing object (protect editing object from stale snapshot overwrite)');
      return;
    }
    
    // [2025-12-11 23:59:30] 获取当前活动对象，在编辑会话期间保护它
    const activeObject = canvas.getActiveObject();
    const isActiveText = activeObject && (activeObject.type === 'i-text' || activeObject.type === 'textbox');
    const currentPanel = toolPanelTypeRef.current;
    const isEditTextPanel = currentPanel === 'edit-text';
    
    // [2025-01-30 21:55:00] 修复：清除现有对象（保留背景、产品图片和上传图片）
    // [2025-01-31 19:35:00] 重要：必须排除上传图片（layerType: 'upload'），避免误删用户上传的内容
    // [2025-12-11 23:59:30] 重要：在编辑文本面板期间，保护当前活动的文本对象
    const objectsToRemove = canvas.getObjects().filter((obj: fabric.Object) => {
      const objName = (obj as any).name || '';
      const objLayerType = (obj as any).data?.layerType;
      const isUploadImage = objLayerType === 'upload';
      
      // [2025-12-11 23:59:30] 编辑会话保护：如果对象是当前活动的文本对象，且正在编辑面板，则保护它
      if (isEditTextPanel && isActiveText && obj === activeObject) {
        console.log('[DesignLab] Protecting active text object during edit session:', objName);
        return false;
      }
      
      // [2025-01-31 19:35:00] 保留背景、产品图片和上传图片
      return objName !== 'background' && 
             !objName.startsWith('product-image-') && 
             !isUploadImage; // 重要：不移除上传图片
    });
    
    // [2025-12-11 23:59:30] 标记删除来源为快照清理
    removalContextRef.current = 'snapshot-cleanup';
    
    objectsToRemove.forEach((obj: fabric.Object) => {
      const objName = (obj as any).name || 'unnamed';
      const objLayerType = (obj as any).data?.layerType;
      console.log('[DesignLab] 🗑️ Removing object (snapshotToCanvas):', {
        objName,
        objLayerType,
        location: 'snapshotToCanvas',
        callStack: new Error().stack?.split('\n').slice(1, 5).join('\n'),
      });
      canvas.remove(obj);
    });
    
    // [2025-12-11 23:59:30] 重置删除来源标记
    removalContextRef.current = 'unknown';
    
    // [2025-12-08 23:00:00] 获取删除控件（如果已创建）
    const deleteControl = (canvas as any).deleteControl;
    
    // 恢复对象
    snapshot.objects.forEach((objData: any) => {
      fabric.util.enlivenObjects([objData], (objects: fabric.Object[]) => {
        objects.forEach(obj => {
          // [2025-12-08 23:00:00] 为恢复的对象添加删除控件
          const objName = (obj as any).name || '';
          if (objName !== 'background' && deleteControl) {
            obj.controls = obj.controls || {};
            obj.controls.deleteControl = deleteControl;
          }
          canvas.add(obj);
        });
        canvas.renderAll();
      });
    });
  }, []);

  // [2025-01-30 19:30:00] 初始化时加载产品信息
  // [2025-01-30 23:55:00] 修复：即使没有 variantId，也要加载默认产品图片
  useEffect(() => {
    const variantId = searchParams?.get('variantId');
    if (variantId) {
      loadProductInfo(variantId);
    } else {
      // [2025-01-30 23:55:00] 没有 variantId 时，设置默认产品信息以显示默认图片
      // [2025-01-30 23:55:00] 使用 Custom Ink 的真实图片 URL
      const defaultColor = 'White';
      const defaultProductInfo: ProductInfo = {
        productId: 'default',
        productName: 'Gildan Softstyle Jersey T-shirt',
        variantId: 'default',
        color: defaultColor,
        colors: ['White', 'Black', 'Navy', 'Maroon', 'Heather Grey', 'Heather Dark Grey'],
        baseImages: getDefaultProductBaseImages(defaultColor),
        gallery: [],
      };
      setProductInfo(defaultProductInfo);
    }
  }, [searchParams, loadProductInfo]);

  // [2025-01-31 13:00:00] 根据 designlab-index.jpeg，移除依赖 fabricCanvasRef.current 的 useEffect
  // 因为 ref 不能作为依赖项，会导致问题。改为使用 canvasInitialized 状态标志
  
  // [2025-01-30 23:55:00] 当 productInfo 更新后，重新加载背景图片
  // [2025-01-31 16:30:00] 修复：使用 ref 跟踪，避免无限循环
  // [2025-01-31 16:55:00] 修复：loadBackgroundImage 内部已经检查重复加载，这里只需要检查 productInfo 是否真的变化了
  // [2025-01-30 22:05:00] 修复：检查加载锁，避免在加载过程中重复触发
  useEffect(() => {
    if (fabricCanvasRef.current && canvasInitialized && productInfo && currentView !== 'zoom') {
      // [2025-01-30 22:05:00] 如果正在加载，跳过（避免重复触发）
      if (isLoadingBackgroundRef.current) {
        console.log('[DesignLab] Background image is loading, skipping trigger from useEffect');
        return;
      }
      
      // [2025-01-31 16:55:00] 检查是否已经加载过当前视图的图片，避免重复加载
      const imageKey = `${currentView}-${productInfo.color}-${productInfo.baseImages?.[currentView] || ''}`;
      if (backgroundImageLoadedRef.current === imageKey) {
        console.log('[DesignLab] ProductInfo updated but image already loaded, skipping:', imageKey);
        return;
      }
      
      console.log('[DesignLab] ProductInfo updated, reloading background image');
      // [2025-01-31 16:55:00] loadBackgroundImage 内部会检查并标记已加载
      loadBackgroundImage(currentView);
    }
  }, [productInfo?.color, productInfo?.baseImages?.front, productInfo?.baseImages?.back, productInfo?.baseImages?.sleeve, currentView, canvasInitialized, loadBackgroundImage]); // [2025-01-31 16:55:00] 添加 loadBackgroundImage 到依赖

  // [2025-01-30 14:00:00] 工具点击处理
  // [2025-12-06 12:40:00] 修复：确保点击 Rail 按钮后保持激活状态，而不是切换
  const handleToolClick = (tool: string) => {
    // 如果点击的是当前激活的工具，保持激活状态（不取消）
    // 如果点击的是其他工具，切换到新工具
    if (activeTool !== tool) {
      setActiveTool(tool);
    }
    // 如果已经是激活状态，保持激活（不设置为 null）
    setShowGuidePanel(false);
    
    // [2025-01-30 17:00:00] 根据工具类型切换工具面板
    switch (tool) {
      case 'upload':
        setToolPanelType('upload');
        // [2025-01-30 17:35:00] 不再直接触发文件选择，而是显示 Upload 面板
        break;
      case 'text':
        setToolPanelType('text');
        // [2025-12-08] 埋点：文字添加
        analytics.track('text_added', {});
        break;
      case 'art':
        setToolPanelType('art');
        // [2025-12-08] 埋点：素材添加
        analytics.track('art_added', {});
        break;
      case 'colors':
        // [2025-01-30 19:30:00] 打开颜色选择模态
        setShowColorModal(true);
        break;
      case 'names':
        // [2025-01-30 20:00:00] 打开 Names & Numbers 模态
        setShowNamesNumbersModal(true);
        break;
      default:
        // 其他工具保持当前面板或返回 home
        break;
    }
  };

  // [2025-01-30 20:00:00] 处理 Names & Numbers 添加到画布
  const handleAddNamesNumbers = useCallback(async (items: Array<{ name: string; number: string; size: string }>, config: any) => {
    if (!fabricCanvasRef.current) {
      showErrorToast('Canvas not initialized. Please wait for the design lab to load.');
      return;
    }

    const timestamp = new Date().toISOString();
    const originalView = currentView;

    try {
      // [2025-01-30 20:00:00] 收集需要添加到不同视图的文本对象
      const textsByView: Record<string, Array<{ text: string; fontSize: number; color: string; type: 'name' | 'number'; index: number }>> = {
        front: [],
        back: [],
        sleeve: [],
      };

      items.forEach((item, index) => {
        // [2025-01-30 20:00:00] 添加名字（如果配置了）
        if (config.addNames && item.name.trim()) {
          const fontSize = config.nameHeight * 30;
          const view = config.nameSide || 'front';
          if (!textsByView[view]) textsByView[view] = [];
          textsByView[view].push({
            text: item.name.trim(),
            fontSize,
            color: config.nameColor,
            type: 'name',
            index,
          });
        }

        // [2025-01-30 20:00:00] 添加号码（如果配置了）
        if (config.addNumbers && item.number.trim()) {
          const fontSize = config.numberHeight * 30;
          const view = config.numberSide || 'back';
          if (!textsByView[view]) textsByView[view] = [];
          textsByView[view].push({
            text: item.number.trim(),
            fontSize,
            color: config.numberColor,
            type: 'number',
            index,
          });
        }
      });

      // [2025-01-30 20:00:00] 为每个视图添加文本对象
      for (const [view, texts] of Object.entries(textsByView)) {
        if (texts.length === 0 || view === 'zoom') continue;

        const targetView = view as 'front' | 'back' | 'sleeve';
        
        // [2025-01-30 20:00:00] 切换到目标视图（如果需要）
        if (targetView !== currentView) {
          setView(targetView);
          setCurrentView(targetView);
          // [2025-01-30 20:00:00] 等待视图切换和画布加载完成
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // [2025-01-30 20:00:00] 加载目标视图的画布数据
          const targetViewCanvas = viewCanvases[targetView];
          if (targetViewCanvas && fabricCanvasRef.current) {
            snapshotToCanvas(targetViewCanvas, fabricCanvasRef.current);
            // [2025-01-30 20:00:00] 重新加载背景图片
            loadBackgroundImage(targetView);
          }
        }

        // [2025-01-30 20:00:00] 添加文本对象到当前画布
        if (fabricCanvasRef.current) {
          const canvas = fabricCanvasRef.current;
          
          texts.forEach((textData, textIndex) => {
            // [2025-01-27 20:30:00] 修复：添加交互属性，确保文本对象可以拖动、缩放、旋转
            const textObj = new fabric.IText(textData.text, {
              // [2025-01-27 20:30:00] 交互属性：确保对象可选择、可编辑、有控制点和边框
              selectable: true,
              evented: true,
              hasControls: true,
              hasBorders: true,
              // [2025-01-27 20:30:00] 锁定属性：允许所有变换操作
              lockRotation: false,
              lockScalingX: false,
              lockScalingY: false,
              lockUniScaling: false,
              lockMovementX: false,
              lockMovementY: false,
              // [2025-01-27 20:30:00] 变换中心：使用中心点进行缩放和旋转
              centeredScaling: true,
              centeredRotation: true,
              left: CANVAS_WIDTH / 2,
              top: CANVAS_HEIGHT / 2 + (textIndex * 60),
              fontSize: textData.fontSize,
              fontFamily: 'Arial',
              fill: textData.color,
              fontWeight: 'bold',
              name: `${textData.type}_${timestamp}_${textData.index}_${textIndex}`,
              originX: 'center',
              originY: 'center',
              data: {
                layerType: 'text',
                zIndex: 20, // [2025-01-30 20:55:00] 文字图层 zIndex 为 20（最上层）
              },
            });

            // [2025-12-08 23:00:00] 为Names & Numbers文本对象添加删除控件
            if ((canvas as any).deleteControl) {
              textObj.controls = textObj.controls || {};
              textObj.controls.deleteControl = (canvas as any).deleteControl;
            }

            canvas.add(textObj);
          });

          canvas.renderAll();

          // [2025-01-30 20:00:00] 保存到对应视图的画布
          const snapshot = canvasToSnapshot(canvas);
          setCanvas(snapshot, { pushHistory: true });
        }
      }

      // [2025-01-30 20:00:00] 恢复原始视图
      if (originalView !== currentView) {
        setView(originalView);
        setCurrentView(originalView);
        // [2025-01-30 20:00:00] 加载原始视图的画布数据
        const originalViewCanvas = viewCanvases[originalView];
        if (originalViewCanvas && fabricCanvasRef.current) {
          snapshotToCanvas(originalViewCanvas, fabricCanvasRef.current);
          loadBackgroundImage(originalView);
        }
      }

      console.log('[DesignLab] Added names and numbers to canvas:', items.length, 'items');
    } catch (error) {
      console.error('[DesignLab] Error adding names and numbers:', error);
      alert('Failed to add names and numbers: ' + (error as Error).message);
      
      // [2025-01-30 20:00:00] 出错时恢复原始视图
      if (originalView !== currentView) {
        setView(originalView);
        setCurrentView(originalView);
        const originalViewCanvas = viewCanvases[originalView];
        if (originalViewCanvas && fabricCanvasRef.current) {
          snapshotToCanvas(originalViewCanvas, fabricCanvasRef.current);
          loadBackgroundImage(originalView);
        }
      }
    }
  }, [CANVAS_WIDTH, CANVAS_HEIGHT, currentView, viewCanvases, canvasToSnapshot, snapshotToCanvas, setCanvas, setView, loadBackgroundImage]);

  // [2025-01-30 19:30:00] 处理颜色选择
  // [2025-01-31 12:00:00] 根据 designlab-colors01.jpeg，优化颜色选择后立即更新所有视图的图片
  // [2025-01-31 15:30:00] 确保颜色变化时更新所有视图（front/back/sleeve）的底图
  const handleColorSelect = useCallback(async (colorName: string) => {
    if (!productInfo) return;

    try {
      console.log('[DesignLab] Changing color to:', colorName);
      
      // [2025-01-30 19:30:00] 从当前产品信息中查找对应颜色的变体
      // 如果 productInfo 包含 variants 数据，直接使用
      let targetVariantId: string | null = null;
      
      // [2025-01-30 19:30:00] 尝试从 API 返回的变体数据中查找
      const productData = productInfo as any;
      if (productData.variants && Array.isArray(productData.variants)) {
        // 优先查找 M 尺寸的变体
        const mVariant = productData.variants.find((v: any) => 
          v.color === colorName && v.size === 'M'
        );
        if (mVariant) {
          targetVariantId = mVariant.id;
        } else {
          // 如果没有 M 尺寸，使用第一个匹配的变体
          const firstVariant = productData.variants.find((v: any) => v.color === colorName);
          if (firstVariant) {
            targetVariantId = firstVariant.id;
          }
        }
      }
      
      // [2025-01-30 19:30:00] 如果找不到变体，尝试通过产品 slug 获取完整产品信息
      if (!targetVariantId) {
        try {
          const productSlug = productInfo.productName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          const fullProduct = await productsApi.getBySlug(productSlug);
          
          if (fullProduct.variants && Array.isArray(fullProduct.variants)) {
            const mVariant = fullProduct.variants.find((v: any) => 
              v.color === colorName && v.size === 'M'
            );
            if (mVariant) {
              targetVariantId = mVariant.id;
            } else {
              const firstVariant = fullProduct.variants.find((v: any) => v.color === colorName);
              if (firstVariant) {
                targetVariantId = firstVariant.id;
              }
            }
          }
        } catch (error) {
          console.warn('[DesignLab] Failed to get product by slug:', error);
        }
      }
      
      if (targetVariantId) {
        // [2025-01-30 19:30:00] 重新加载产品信息（使用新颜色的变体）
        await loadProductInfo(targetVariantId);
      } else {
        // [2025-01-30 23:55:00] 修复：如果找不到变体，立即更新颜色和 baseImages
        // [2025-01-31 12:00:00] 确保立即更新所有视图的图片
        // [2025-01-31 15:30:00] 更新：立即更新所有视图的底图，确保颜色变化时所有视图都更新
        const newBaseImages = getDefaultProductBaseImages(colorName);
        setProductInfo({
          ...productInfo,
          color: colorName,
          baseImages: newBaseImages, // [2025-01-30 23:55:00] 立即更新图片 URL，确保颜色切换时图片立即更新
        });
        
        // [2025-01-31 15:30:00] 立即更新所有视图的背景图片（front/back/sleeve），确保颜色变化时所有视图的底图都更新
        if (fabricCanvasRef.current) {
          // 更新当前视图的背景图片
          if (currentView !== 'zoom') {
            loadBackgroundImage(currentView);
          }
          
          // [2025-01-31 15:30:00] 更新其他视图的背景图片（如果它们已经加载过）
          // 注意：这里只更新当前画布，其他视图会在切换时自动加载新图片
          // 但为了确保一致性，我们也可以在这里预加载
          const viewsToUpdate: Array<'front' | 'back' | 'sleeve'> = ['front', 'back', 'sleeve'];
          viewsToUpdate.forEach((view) => {
            if (view !== currentView) {
              // 其他视图会在切换时自动加载，这里只记录日志
              console.log(`[DesignLab] Background image for ${view} view will be updated when switching to that view`);
            }
          });
        }
      }
    } catch (error) {
      console.error('[DesignLab] Error changing color:', error);
      alert('Failed to change color');
    }
  }, [productInfo, currentView, loadBackgroundImage, loadProductInfo]);

  // [2025-01-30 17:00:00] Home 面板操作处理
  const handleHomeAction = (action: 'upload' | 'text' | 'art' | 'products' | 'layers' | 'templates' | 'export') => {
    if (action === 'products') {
      // TODO: 实现产品切换功能
      console.log('[DesignLab] Change products');
      return;
    }
    if (action === 'layers') {
      // [2025-12-06 13:00:00] 打开图层管理面板
      setToolPanelType('layers');
      setActiveTool('layers');
      return;
    }
    if (action === 'templates') {
      // [2025-12-10] 打开模板库面板
      setShowTemplateLibrary(true);
      return;
    }
    if (action === 'export') {
      // [2025-12-10] 显示导出菜单
      handleShowExportMenu();
      return;
    }
    handleToolClick(action);
  };

  // [2025-01-30 17:00:00] 返回 Home 面板
  const handleBackToHome = () => {
    setToolPanelType('home');
    setActiveTool(null);
    setSelectedImage(null);
    setSelectedText(null);
    setSelectedArt(null);
  };

  // [2025-01-30 17:50:00] 添加文本功能
  // [2025-01-30 22:15:00] 修复：确保添加文本后正确切换到 Edit Text 面板，不会被 selection:cleared 事件覆盖
  // [2025-12-10] 修复：使用 fabricRef 确保 fabric 对象已加载
  const handleAddText = useCallback((text: string) => {
    if (!fabricCanvasRef.current) {
      alert('Canvas not initialized');
      return;
    }
    
    // [2025-12-10] 检查 fabric 对象是否已加载
    if (!fabricRef.current) {
      alert('Design Lab is still loading. Please wait...');
      return;
    }

    const fabric = fabricRef.current;
    const canvas = fabricCanvasRef.current;

    try {
      // [2025-01-31 01:00:00] 设置标志，防止选择清除事件在添加对象后立即触发
      isAddingObjectRef.current = true;
      
      // [2025-12-11 23:15:00] 获取画布逻辑尺寸
      // Fabric.js 的坐标系统基于逻辑尺寸（1000x1200），而不是实际像素尺寸
      // 即使画布的实际像素尺寸是 1000 * devicePixelRatio，坐标系统仍然是 1000x1200
      // 所以直接使用常量 CANVAS_WIDTH 和 CANVAS_HEIGHT 是正确的
      // 但为了更健壮，我们从画布获取逻辑尺寸（考虑 viewport transform）
      const vpt = canvas.viewportTransform;
      const scaleX = vpt ? vpt[0] : 1;
      const scaleY = vpt ? vpt[3] : 1;
      
      // [2025-12-11 23:15:00] 获取画布的逻辑尺寸
      // canvas.width 返回的是实际像素尺寸，需要除以缩放因子得到逻辑尺寸
      // 如果 viewport transform 是单位矩阵，scaleX 和 scaleY 都是 1
      const canvasLogicalWidth = (canvas.width || CANVAS_WIDTH) / scaleX;
      const canvasLogicalHeight = (canvas.height || CANVAS_HEIGHT) / scaleY;
      
      // [2025-12-11 23:15:00] 计算画布逻辑中心点
      // 由于 originX 和 originY 设置为 'center'，文本对象的 left/top 应该指向中心点
      const centerX = canvasLogicalWidth / 2;
      const centerY = canvasLogicalHeight / 2;
      
      // [2025-01-30 17:50:00] 创建 Fabric IText 对象
      // [2025-01-30 20:55:00] 修复：设置 zIndex 确保在文字图层（最上层）
      // [2025-01-27 20:30:00] 修复：添加交互属性，确保文本对象可以拖动、缩放、旋转
      const textObj = new fabric.IText(text, {
        // [2025-01-27 20:30:00] 交互属性：确保对象可选择、可编辑、有控制点和边框
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
        // [2025-01-27 20:30:00] 锁定属性：允许所有变换操作
        lockRotation: false,
        lockScalingX: false,
        lockScalingY: false,
        lockUniScaling: false,
        lockMovementX: false,
        lockMovementY: false,
        // [2025-01-27 20:30:00] 变换中心：使用中心点进行缩放和旋转
        centeredScaling: true,
        centeredRotation: true,
        data: {
          layerType: 'text',
          zIndex: 20, // [2025-01-30 20:55:00] 文字图层 zIndex 为 20（最上层，高于上传图层的 10）
        },
        left: centerX,
        top: centerY,
        fontSize: 48,
        fontFamily: 'Arial',
        fill: '#000000',
        name: `text_${Date.now()}`,
        originX: 'center',
        originY: 'center'
      });
      
      // [2025-12-08 23:00:00] 为文本对象添加删除控件
      if (canvas && (canvas as any).deleteControl) {
        textObj.controls = textObj.controls || {};
        textObj.controls.deleteControl = (canvas as any).deleteControl;
      }
      
      // [2025-01-30 22:15:00] 先添加对象到画布
      canvas.add(textObj);
      
      // [2025-12-11 23:15:00] 确保坐标正确更新
      textObj.setCoords();
      
      // [2025-01-30 22:25:00] 设置对象并选中，这会触发 selection:created 事件
      canvas.setActiveObject(textObj);
      canvas.renderAll();
      
      // [2025-12-11 23:15:00] 添加调试日志，记录画布尺寸、文本位置和 viewport transform
      console.log('[DesignLab] Text added at center:', {
        canvasActualWidth: canvas.width,
        canvasActualHeight: canvas.height,
        canvasLogicalWidth,
        canvasLogicalHeight,
        scaleX,
        scaleY,
        centerX,
        centerY,
        textObjLeft: textObj.left,
        textObjTop: textObj.top,
        textObjWidth: textObj.width,
        textObjHeight: textObj.height,
        viewportTransform: vpt,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
      });
      
      // [2025-01-30 22:25:00] 设置状态，handleSelection 会识别文本对象并切换到 Edit Text 面板
      // 但我们也在这里设置，确保即使 handleSelection 没有正确触发，面板也会切换
      setSelectedText(textObj);
      setToolPanelType('edit-text');
      
      console.log('[DesignLab] Text added and selected, panel should be edit-text');

      // [2025-01-30 17:50:00] 同步到 store
      const snapshot = canvasToSnapshot(canvas);
      setCanvas(snapshot, { pushHistory: true });
      
      // [2025-01-31 01:00:00] 延迟重置标志，确保 selection:created 事件先触发
      setTimeout(() => {
        isAddingObjectRef.current = false;
      }, 100);
    } catch (error) {
      console.error('[DesignLab] Error creating text:', error);
      alert('Failed to add text: ' + (error as Error).message);
      isAddingObjectRef.current = false;
    }
  }, [CANVAS_WIDTH, CANVAS_HEIGHT, canvasToSnapshot, setCanvas]);

  // [2025-01-30 18:10:00] 添加艺术素材功能
  // [2025-12-10] 修复：使用 fabricRef 确保 fabric 对象已加载
  const handleAddArt = useCallback((artUrl: string, artName: string) => {
    if (!fabricCanvasRef.current) {
      showErrorToast('Canvas not initialized. Please wait for the design lab to load.');
      return;
    }
    
    // [2025-12-10] 检查 fabric 对象是否已加载
    if (!fabricRef.current) {
      showErrorToast('Design Lab is still loading. Please wait...');
      return;
    }

    const fabric = fabricRef.current;

    // [2025-01-30 18:10:00] 使用原生 Image 对象加载图片
    const imgElement = new Image();
    imgElement.crossOrigin = 'anonymous';
    
    imgElement.onload = () => {
      try {
        // [2025-01-30 18:10:00] 创建 Fabric Image 对象
        // [2025-01-27 20:30:00] 修复：添加完整的交互属性，确保艺术素材对象可以拖动、缩放、旋转
        const fabricImage = new fabric.Image(imgElement, {
          // [2025-01-27 20:30:00] 交互属性：确保对象可选择、可编辑、有控制点和边框
          selectable: true,
          evented: true,
          hasControls: true,
          hasBorders: true,
          // [2025-01-27 20:30:00] 锁定属性：允许所有变换操作
          lockRotation: false,
          lockScalingX: false,
          lockScalingY: false,
          lockUniScaling: false,
          lockMovementX: false,
          lockMovementY: false,
          // [2025-01-27 20:30:00] 变换中心：使用中心点进行缩放和旋转
          centeredScaling: true,
          centeredRotation: true,
        });
        
        // [2025-01-30 18:10:00] 智能缩放：缩放到画布的 30%
        const SCALE_RATIO = 0.3;
        const targetMaxWidth = CANVAS_WIDTH * SCALE_RATIO;
        const targetMaxHeight = CANVAS_HEIGHT * SCALE_RATIO;
        
        const originalWidth = fabricImage.width || 1;
        const originalHeight = fabricImage.height || 1;
        
        const scaleX = targetMaxWidth / originalWidth;
        const scaleY = targetMaxHeight / originalHeight;
        const scale = Math.min(scaleX, scaleY, 1);
        
        fabricImage.scale(scale);
        
        // [2025-01-30 18:10:00] 居中位置
        fabricImage.set({
          left: CANVAS_WIDTH / 2,
          top: CANVAS_HEIGHT / 2,
          originX: 'center',
          originY: 'center',
          name: `art_${Date.now()}`, // [2025-01-30 18:10:00] 使用 art_ 前缀标识艺术素材
          data: {
            layerType: 'art',
            zIndex: 15, // [2025-01-27 20:30:00] 艺术素材图层 zIndex 为 15（介于上传图层的 10 和文字图层的 20 之间）
          },
        });
        
        const canvas = fabricCanvasRef.current;
        if (canvas) {
          // [2025-12-08 23:00:00] 为艺术素材对象添加删除控件
          if ((canvas as any).deleteControl) {
            fabricImage.controls = fabricImage.controls || {};
            fabricImage.controls.deleteControl = (canvas as any).deleteControl;
          }
          
          canvas.add(fabricImage);
          canvas.setActiveObject(fabricImage);
          canvas.renderAll();
          
          // [2025-01-30 18:10:00] 自动切换到 Edit Art 面板
          setSelectedArt(fabricImage);
          setToolPanelType('edit-art');
          
          // [2025-01-30 18:10:00] 同步到 store
          const snapshot = canvasToSnapshot(canvas);
          setCanvas(snapshot, { pushHistory: true });
        }
      } catch (error) {
        console.error('[DesignLab] Error creating art image:', error);
        showErrorToast(`Failed to add art: ${(error as Error).message}`);
      }
    };
    
      imgElement.onerror = (error) => {
        console.error('[DesignLab] ❌ Failed to load art image:', error);
      showErrorToast('Failed to load art image. Please try again.');
    };
    
    imgElement.src = artUrl;
  }, [CANVAS_WIDTH, CANVAS_HEIGHT, canvasToSnapshot, setCanvas]);

  // [2025-01-30 18:10:00] 重新选择 Art（返回到 Art Categories）
  const handleChangeArt = useCallback(() => {
    setToolPanelType('art');
    setSelectedArt(null);
  }, []);

  // [2025-01-30 17:30:00] 文件上传处理
  // [2025-01-30 22:30:00] 添加详细的调试日志和错误处理
  // [2025-12-08] 添加文件验证和Toast错误提示
  const handleFileUpload = useCallback((file: File) => {
    console.log('[DesignLab] handleFileUpload called:', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      canvasInitialized: !!fabricCanvasRef.current
    });

    // [2025-01-30 20:35:00] 文件格式验证（支持 AVIF 和 WebP）
    if (!file.type.startsWith('image/')) {
      showErrorToast('Please upload an image file (JPG, PNG, GIF, WebP, AVIF, etc.)');
      return;
    }

    // [2025-12-08] 文件大小验证（20 MB = 20 * 1024 * 1024 bytes）
    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
    if (file.size > MAX_FILE_SIZE) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      showErrorToast(`File size (${fileSizeMB} MB) exceeds the maximum limit of 20 MB. Please choose a smaller file.`);
      return;
    }

    // [2025-01-30 20:35:00] 文件类型验证（支持 AVIF 和 WebP 格式）
    const allowedTypes = [
      'image/jpeg', 
      'image/jpg', 
      'image/png', 
      'image/gif', 
      'image/webp', 
      'image/avif',  // [2025-01-30 20:35:00] 新增 AVIF 格式支持
      'image/svg+xml'
    ];
    const normalizedFileType = file.type.toLowerCase();
    if (!allowedTypes.includes(normalizedFileType)) {
      showErrorToast(`File type "${file.type}" is not supported. Please upload JPG, PNG, GIF, WebP, AVIF, or SVG files.`);
      return;
    }

    // [2025-12-07 15:30:00] 分辨率检查（警告，不阻止上传）
    const checkImageResolution = (imageUrl: string) => {
      const img = new Image();
      img.onload = () => {
        const MIN_DPI = 300;
        const MIN_WIDTH = 1000; // 假设打印尺寸，可以根据实际需求调整
        const MIN_HEIGHT = 1000;
        
        if (img.width < MIN_WIDTH || img.height < MIN_HEIGHT) {
          showWarningToast(
            `Low resolution detected (${img.width}×${img.height}px). Recommended: 300 DPI or higher for best print quality. You can continue, but we'll remind you again during checkout.`
          );
          // [2025-12-07 15:30:00] 标记为低分辨率，在 Content Check 时再次提醒
          // 这个标记可以存储在对象的数据中
        }
      };
      img.src = imageUrl;
    };

    if (!fabricCanvasRef.current) {
      console.error('[DesignLab] Canvas not initialized');
      showErrorToast('Canvas not initialized. Please wait for the design lab to load.');
      return;
    }

    // [2025-12-08] 显示上传进度提示
    showSuccessToast(`Uploading "${file.name}"...`);

    const reader = new FileReader();
    reader.onerror = (error) => {
      console.error('[DesignLab] ❌ FileReader error:', error);
      showErrorToast('Failed to read the file. Please try again or choose a different file.');
    };
    
    reader.onload = (e) => {
      try {
        const imageUrl = e.target?.result as string;
      console.log('[DesignLab] File read successfully, imageUrl length:', imageUrl?.length || 0);
      
      if (!imageUrl) {
        console.error('[DesignLab] Image URL is empty');
        showErrorToast('Failed to read the file. Please try again or choose a different file.');
        return;
      }
        
        // [2025-12-07 15:30:00] 检查分辨率（异步，不阻塞上传）
        if (file.type !== 'image/svg+xml') {
          checkImageResolution(imageUrl);
        }
      
      // [2025-01-30 17:30:00] 使用原生 Image 对象加载图片
      const imgElement = new Image();
      // [2025-01-30 22:30:00] 对于 data URL，不需要设置 crossOrigin
      if (!imageUrl.startsWith('data:')) {
        imgElement.crossOrigin = 'anonymous';
      }
      
      imgElement.onload = () => {
        console.log('[DesignLab] Image loaded successfully:', {
          naturalWidth: imgElement.naturalWidth,
          naturalHeight: imgElement.naturalHeight,
          width: imgElement.width,
          height: imgElement.height
        });

        try {
          // [2025-12-10] 检查 fabric 对象是否已加载
          if (!fabricRef.current) {
            console.error('[DesignLab] ❌ Fabric not loaded yet, cannot create Fabric Image');
            showErrorToast('Canvas library not loaded. Please refresh the page.');
            return;
          }
          const fabric = fabricRef.current;
          
          // [2025-01-30 22:10:00] 检查画布是否已初始化
          if (!fabricCanvasRef.current) {
            console.error('[DesignLab] ❌ Canvas not initialized, cannot add image');
            showErrorToast('Canvas not initialized. Please wait for the design lab to load.');
            return;
          }
          
          // [2025-01-30 22:20:00] 设置标志，防止 selection:cleared 事件在添加对象后立即触发导致图片被移除
          isAddingObjectRef.current = true;
          
          // [2025-01-30 17:30:00] 创建 Fabric Image 对象
          // [2025-01-30 20:55:00] 修复：设置 zIndex 确保在上传图层（高于产品图片）
          const fabricImage = new fabric.Image(imgElement, {
            // [2025-01-30 22:30:00] 确保图片对象是可选择和可编辑的
            // [2025-01-27 20:30:00] 修复：添加完整的交互属性，确保图片对象可以拖动、缩放、旋转
            selectable: true,
            evented: true,
            hasControls: true,
            hasBorders: true,
            // [2025-01-27 20:30:00] 锁定属性：允许所有变换操作
            lockRotation: false,
            lockScalingX: false,
            lockScalingY: false,
            lockUniScaling: false,
            lockMovementX: false,
            lockMovementY: false,
            // [2025-01-27 20:30:00] 变换中心：使用中心点进行缩放和旋转
            centeredScaling: true,
            centeredRotation: true,
            data: {
              layerType: 'upload',
              zIndex: 10, // [2025-01-30 20:55:00] 上传图层 zIndex 为 10（高于产品图片的 0）
            },
          });
          
          console.log('[DesignLab] Fabric Image created:', {
            width: fabricImage.width,
            height: fabricImage.height,
            scaleX: fabricImage.scaleX,
            scaleY: fabricImage.scaleY
          });
          
          // [2025-01-30 17:30:00] 智能缩放：缩放到画布的 30%
          const SCALE_RATIO = 0.3;
          const targetMaxWidth = CANVAS_WIDTH * SCALE_RATIO;
          const targetMaxHeight = CANVAS_HEIGHT * SCALE_RATIO;
          
          const originalWidth = fabricImage.width || 1;
          const originalHeight = fabricImage.height || 1;
          
          const scaleX = targetMaxWidth / originalWidth;
          const scaleY = targetMaxHeight / originalHeight;
          const scale = Math.min(scaleX, scaleY, 1);
          
          console.log('[DesignLab] Calculating scale:', {
            originalWidth,
            originalHeight,
            targetMaxWidth,
            targetMaxHeight,
            scaleX,
            scaleY,
            finalScale: scale
          });
          
          fabricImage.scale(scale);
          
          // [2025-01-30 17:30:00] 居中位置
          fabricImage.set({
            left: CANVAS_WIDTH / 2,
            top: CANVAS_HEIGHT / 2,
            originX: 'center',
            originY: 'center',
            name: `image_${Date.now()}`
          });
          
          // [2025-01-30 22:30:00] 确保坐标已更新
          fabricImage.setCoords();
          
          const canvas = fabricCanvasRef.current;
          if (canvas) {
            // [2025-12-08 23:00:00] 为上传的图片对象添加删除控件
            if ((canvas as any).deleteControl) {
              fabricImage.controls = fabricImage.controls || {};
              fabricImage.controls.deleteControl = (canvas as any).deleteControl;
            }
            
            console.log('[DesignLab] Adding image to canvas:', {
              canvasWidth: canvas.width,
              canvasHeight: canvas.height,
              imageLeft: fabricImage.left,
              imageTop: fabricImage.top,
              imageScale: scale
            });

            // [2025-01-31 19:15:00] 1. 先添加对象到画布
            canvas.add(fabricImage);
            canvas.renderAll();
            
            // [2025-01-31 19:15:00] 验证图片是否真的在画布上
            const allObjects = canvas.getObjects();
            const addedImage = allObjects.find((obj: any) => obj === fabricImage);
            
            if (!addedImage) {
              console.error('[DesignLab] ❌ Image was not found on canvas after adding!');
              showErrorToast('Failed to add image to canvas. Please try again.');
              isAddingObjectRef.current = false;
              return;
            }
            
            console.log('[DesignLab] ✅ Image added to canvas successfully:', {
              objectCount: allObjects.length,
              imageName: fabricImage.name,
              imagePosition: { left: fabricImage.left, top: fabricImage.top },
              imageScale: scale,
              canvasSize: { width: canvas.width, height: canvas.height },
              imageIndex: allObjects.indexOf(fabricImage),
            });
            
            // [2025-01-31 19:15:00] 2. 使用 requestAnimationFrame 确保渲染完成后再选中对象
            // 这样可以确保 selection:created 事件正确触发
            console.log('[DesignLab] Scheduling setActiveObject in requestAnimationFrame');
            requestAnimationFrame(() => {
              console.log('[DesignLab] Executing setActiveObject for uploaded image');
              // [2025-01-31 19:15:00] 选中对象，这会触发 selection:created 事件
              canvas.setActiveObject(fabricImage);
              canvas.renderAll();
              
              // [2025-01-31 19:15:00] 3. 在下一个帧设置状态和切换面板，确保 selection:created 事件先处理
              requestAnimationFrame(() => {
                console.log('[DesignLab] Setting selectedImage and switching to edit-upload panel');
                // [2025-01-30 17:30:00] 自动切换到 Edit Upload 面板
                setSelectedImage(fabricImage);
                setToolPanelType('edit-upload');
                
                // [2025-01-31 19:15:00] 强制触发图层列表更新
                console.log('[DesignLab] Triggering handleCanvasUpdate to refresh layer list');
                handleCanvasUpdate();
                
                console.log('[DesignLab] ✅ Image selected and panel switched to edit-upload, layer list should update');
              });
            });
            
            // [2025-01-30 23:30:00] 保存到 Recent Uploads
            const uploadId = `upload_${Date.now()}`;
            const thumbnail = imageUrl; // 使用原始图片 URL 作为缩略图
            setRecentUploads(prev => {
              // 限制最多保存 10 个最近上传
              const newUploads = [{ id: uploadId, url: imageUrl, thumbnail }, ...prev];
              return newUploads.slice(0, 10);
            });
            
            // [2025-12-08] 保存 uploadId 以便评分时使用
            setCurrentUploadId(uploadId);
            
            // [2025-01-30 17:30:00] 同步到 store（在上传成功后立即同步，不等待选中）
            const snapshot = canvasToSnapshot(canvas);
            setCanvas(snapshot, { pushHistory: true });
            
            console.log('[DesignLab] Image upload completed successfully');
            
            // [2025-12-08] 埋点：上传成功
            analytics.track('upload_success', {
              uploadId: uploadId,
              fileSize: file.size,
              fileType: file.type,
            });
            
            // [2025-12-08] 上传成功提示
            showSuccessToast(`Image "${file.name}" uploaded successfully!`);
            
            // [2025-01-31 19:15:00] 延长延迟重置标志，确保 selection:created 事件先触发，并且给用户足够的时间与对象交互
            // 从300ms延长到500ms，给更多时间让 selection:created 事件处理完成
            setTimeout(() => {
              isAddingObjectRef.current = false;
              console.log('[DesignLab] isAddingObjectRef reset after image upload');
            }, 500);
          } else {
            console.error('[DesignLab] Canvas is null after image creation');
            showErrorToast('Failed to add image to canvas. Please try again.');
            isAddingObjectRef.current = false;
          }
        } catch (error) {
          console.error('[DesignLab] ❌ Error in image upload handler:', error);
          showErrorToast('Failed to add image to canvas. Please try again.');
          isAddingObjectRef.current = false;
        }
      };
      
      imgElement.onerror = (error) => {
          console.error('[DesignLab] ❌ Image load error:', error);
          console.error('[DesignLab] Image URL (first 100 chars):', imageUrl?.substring(0, 100));
        showErrorToast('Failed to load the image. The file may be corrupted. Please try a different file.');
        
        // [2025-12-08] 埋点：上传失败
        analytics.track('upload_failed', {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          error: 'Image load error',
        });
      };
      
      imgElement.src = imageUrl;
      } catch (error) {
        console.error('[DesignLab] ❌ Error in reader.onload:', error);
        showErrorToast('Failed to process the file. Please try again.');
      }
    };
    
    reader.onerror = (error) => {
      console.error('[DesignLab] FileReader error:', error);
      showErrorToast('Failed to read the file. Please try again or choose a different file.');
    };

    reader.onabort = () => {
      console.warn('[DesignLab] FileReader aborted');
      showWarningToast('File upload was cancelled.');
    };
    
    reader.readAsDataURL(file);
  }, [CANVAS_WIDTH, CANVAS_HEIGHT, canvasToSnapshot, setCanvas]);

  // [2025-01-30 17:30:00] 拖拽上传功能
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const file = files[0];
        // [2025-01-30 20:35:00] 支持 AVIF 和 WebP 格式的拖拽上传
        const allowedTypes = [
          'image/jpeg', 
          'image/jpg', 
          'image/png', 
          'image/gif', 
          'image/webp', 
          'image/avif',  // [2025-01-30 20:35:00] 新增 AVIF 格式支持
          'image/svg+xml'
        ];
        const fileType = file.type.toLowerCase();
        if (file.type.startsWith('image/') && allowedTypes.includes(fileType)) {
          handleFileUpload(file);
        } else if (file.type.startsWith('image/')) {
          showErrorToast(`File type "${file.type}" is not supported. Please upload JPG, PNG, GIF, WebP, AVIF, or SVG files.`);
        } else {
          showErrorToast('Please upload an image file (JPG, PNG, GIF, WebP, AVIF, SVG).');
        }
      }
    };

    // [2025-01-30 17:30:00] 在整个画布区域监听拖拽
    const canvasElement = canvasRef.current;
    if (canvasElement) {
      canvasElement.addEventListener('dragover', handleDragOver);
      canvasElement.addEventListener('drop', handleDrop);
    }

    return () => {
      if (canvasElement) {
        canvasElement.removeEventListener('dragover', handleDragOver);
        canvasElement.removeEventListener('drop', handleDrop);
      }
    };
  }, [handleFileUpload]);

  // [2025-01-30 17:30:00] 画布更新回调
  // [2025-01-30 22:05:00] 添加调试日志，确保回调被正确调用
  const handleCanvasUpdate = useCallback(() => {
    if (fabricCanvasRef.current) {
      console.log('[DesignLab] Canvas updated, saving snapshot');
      const snapshot = canvasToSnapshot(fabricCanvasRef.current);
      setCanvas(snapshot, { pushHistory: true });
    } else {
      console.warn('[DesignLab] handleCanvasUpdate called but canvas is not initialized');
    }
  }, [canvasToSnapshot, setCanvas]);

  // [2025-01-30 23:30:00] Recent Upload Click 处理
  const handleRecentUploadClick = useCallback((upload: { id: string; url: string; thumbnail: string }) => {
    if (!fabricCanvasRef.current) return;
    
    const imgElement = new Image();
    imgElement.crossOrigin = 'anonymous';
    
    imgElement.onload = () => {
      try {
        // [2025-12-10] 检查 fabric 对象是否已加载
        if (!fabricRef.current) {
          console.error('[DesignLab] Fabric not loaded yet, cannot create Fabric Image');
          return;
        }
        const fabric = fabricRef.current;
        
        const fabricImage = new fabric.Image(imgElement, {
          selectable: true,
          evented: true,
          hasControls: true,
          hasBorders: true,
          lockRotation: false,
          lockScalingX: false,
          lockScalingY: false,
          lockUniScaling: false,
          centeredScaling: true,
          centeredRotation: true,
          originX: 'center',
          originY: 'center',
          left: CANVAS_WIDTH / 2,
          top: CANVAS_HEIGHT / 2,
          name: `image_${Date.now()}`
        });
        
        const canvas = fabricCanvasRef.current;
        if (canvas) {
          // [2025-12-08 23:00:00] 为最近上传的图片对象添加删除控件
          if ((canvas as any).deleteControl) {
            fabricImage.controls = fabricImage.controls || {};
            fabricImage.controls.deleteControl = (canvas as any).deleteControl;
          }
          
          canvas.add(fabricImage);
          canvas.setActiveObject(fabricImage);
          canvas.renderAll();
          
          setSelectedImage(fabricImage);
          setToolPanelType('edit-upload');
          
          const snapshot = canvasToSnapshot(canvas);
          setCanvas(snapshot, { pushHistory: true });
        }
      } catch (error) {
        console.error('[DesignLab] Error creating image from recent upload:', error);
        alert('Failed to load recent upload');
      }
    };
    
    imgElement.onerror = () => {
      alert('Failed to load recent upload image');
    };
    
    imgElement.src = upload.url;
  }, [CANVAS_WIDTH, CANVAS_HEIGHT, canvasToSnapshot, setCanvas]);

  // [2025-01-30 23:30:00] Reset To Original 处理
  const handleResetUpload = useCallback(() => {
    // Reset 逻辑在 EditUploadPanel 中处理
    console.log('[DesignLab] Reset upload requested');
  }, []);

  // [2025-01-30 23:30:00] Save Design 处理
  // [2025-12-08] 更新：打开Save & Share模态框
  const handleSaveDesign = useCallback(() => {
    setShowSaveShareModal(true);
  }, []);

  // [2025-12-08] 实际保存设计的处理函数
  const handleSaveDesignConfirm = useCallback(async () => {
    if (!fabricCanvasRef.current) return;

    try {
      const snapshot = canvasToSnapshot(fabricCanvasRef.current);
      setCanvas(snapshot, { pushHistory: true });

      let designId = currentDesignId;
      
      // 如果还没有设计ID，先创建设计
      if (!designId) {
        let productVariantId = productInfo?.variantId;
        if (productVariantId === 'default' && productInfo?.productId && productInfo.productId !== 'default') {
          try {
            const productSlug = productInfo.productName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            const productData = await productsApi.getBySlug(productSlug);
            if (productData.variants && productData.variants.length > 0) {
              productVariantId = productData.variants[0].id;
            }
          } catch (error) {
            console.warn('[DesignLab] Failed to get product variant:', error);
          }
        }

        if (!productVariantId || productVariantId === 'default') {
          // 尝试使用默认variant
          productVariantId = 'default';
        }

        const payload = {
          name: designName,
          canvas: snapshot,
          productVariantId: productVariantId,
        };

        const response = await designLabApi.createDraft(payload);
        if (response.success && response.data) {
          designId = response.data.id;
          setCurrentDesignId(designId);
        } else {
          throw new Error('Failed to save design');
        }
      } else {
        // 更新现有设计
        const payload = {
          name: designName,
          canvas: snapshot,
        };
        await designLabApi.updateDraft(designId, payload);
      }

      // [2025-12-08] 埋点：设计保存
      analytics.track('design_saved', {
        designId: designId,
        designName: designName,
      });

      console.log('[DesignLab] Design saved:', designId);
      return designId; // 返回designId以便后续使用
    } catch (error) {
      console.error('[DesignLab] Error saving design:', error);
      alert('Failed to save design. Please try again.');
      throw error;
    }
  }, [fabricCanvasRef, canvasToSnapshot, setCanvas, currentDesignId, designName, productInfo, setCurrentDesignId]);

  // [2025-12-06 12:30:00] Get Price 处理
  // [2025-12-08] 更新：打开完整的Get Price流程模态框
  const handleGetPrice = useCallback(async () => {
    // [2025-12-08] 埋点：Get Price 点击
    analytics.track('get_price_clicked', {
      designId: currentDesignId,
      productId: productInfo?.productId,
    });
    
    if (!fabricCanvasRef.current || !productInfo) {
      console.warn('[DesignLab] Cannot get price: canvas or productInfo not available');
      alert('Please ensure the canvas is loaded and a product is selected.');
      return;
    }

    // [2025-12-08] 打开Get Price流程模态框
    setShowGetPriceFlowModal(true);
    return;

    // 确保设计已保存
    let designId = currentDesignId;
    if (!designId) {
      // 先保存设计
      try {
        const snapshot = canvasToSnapshot(fabricCanvasRef.current);
        setCanvas(snapshot, { pushHistory: true });

        let productVariantId = productInfo.variantId;
        if (productVariantId === 'default' && productInfo.productId && productInfo.productId !== 'default') {
          try {
            const productSlug = productInfo.productName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            const productData = await productsApi.getBySlug(productSlug);
            if (productData.variants && productData.variants.length > 0) {
              productVariantId = productData.variants[0].id;
            }
          } catch (error) {
            console.warn('[DesignLab] Failed to get product variant:', error);
          }
        }

        if (!productVariantId || productVariantId === 'default') {
          alert('Please select a product before getting price. Use "Change Product" to select a product.');
          return;
        }

        const payload = {
          name: designName,
          canvas: snapshot,
          productVariantId: productVariantId!
        };

        const response = await designLabApi.createDraft(payload);
        if (response.success && response.data) {
          designId = response.data.id;
          setCurrentDesignId(designId);
        } else {
          throw new Error('Failed to save design');
        }
      } catch (error) {
        console.error('[DesignLab] Error saving design before getting price:', error);
        alert('Failed to save design. Please try again.');
        return;
      }
    }

    // 打开价格模态框
    setShowPriceModal(true);
    setPriceLoading(true);
    setPriceError(null);

    try {
      // 计算使用的面和图层数
      const canvas = fabricCanvasRef.current;
      const objects = canvas.getObjects().filter(obj => {
        const fabricObj = obj as fabric.Object;
        return fabricObj.name && fabricObj.name !== 'background';
      });

      // 确定使用的面（基于当前视图和画布对象）
      const sidesUsed: string[] = [];
      if (currentView === 'front' || objects.some(obj => (obj as any).name?.includes('front'))) {
        sidesUsed.push('front');
      }
      if (currentView === 'back' || objects.some(obj => (obj as any).name?.includes('back'))) {
        sidesUsed.push('back');
      }
      if (currentView === 'sleeve' || objects.some(obj => (obj as any).name?.includes('sleeve'))) {
        sidesUsed.push('sleeve');
      }
      // 如果没有对象，至少包含当前视图
      if (sidesUsed.length === 0 && currentView !== 'zoom') {
        sidesUsed.push(currentView);
      }

      const layerCount = objects.length;

      // 调用报价 API
      const response = await designLabApi.requestQuote(designId, {
        quantity: quoteQuantity,
        sidesUsed: sidesUsed,
        layerCount: layerCount
      });

      if (response.success && response.data) {
        setPriceQuote(response.data);
        console.log('[DesignLab] Price quote received:', response.data);
        
        // [2025-12-08] 埋点：Get Price 完成
        analytics.track('get_price_completed', {
          designId: designId,
          quantity: quoteQuantity,
          price: response.data.total,
        });
      } else {
        throw new Error('Failed to get price quote');
      }
    } catch (error) {
      console.error('[DesignLab] Error getting price:', error);
      setPriceError('Failed to get price. Please try again.');
    } finally {
      setPriceLoading(false);
    }
  }, [fabricCanvasRef, productInfo, currentDesignId, currentView, quoteQuantity, canvasToSnapshot, setCanvas, designName, setCurrentDesignId]);

  // [2025-12-06 12:30:00] 处理数量变化并重新获取报价
  const handleQuantityChange = useCallback(async (newQuantity: number) => {
    setQuoteQuantity(newQuantity);
    
    if (currentDesignId && showPriceModal && !priceLoading) {
      // 重新获取报价
      setPriceLoading(true);
      try {
        const canvas = fabricCanvasRef.current;
        const objects = canvas?.getObjects().filter(obj => {
          const fabricObj = obj as fabric.Object;
          return fabricObj.name && fabricObj.name !== 'background';
        }) || [];

        const sidesUsed: string[] = [];
        if (currentView === 'front' || objects.some(obj => (obj as any).name?.includes('front'))) {
          sidesUsed.push('front');
        }
        if (currentView === 'back' || objects.some(obj => (obj as any).name?.includes('back'))) {
          sidesUsed.push('back');
        }
        if (currentView === 'sleeve' || objects.some(obj => (obj as any).name?.includes('sleeve'))) {
          sidesUsed.push('sleeve');
        }
        if (sidesUsed.length === 0 && currentView !== 'zoom') {
          sidesUsed.push(currentView);
        }

        const response = await designLabApi.requestQuote(currentDesignId, {
          quantity: newQuantity,
          sidesUsed: sidesUsed,
          layerCount: objects.length
        });

        if (response.success && response.data) {
          setPriceQuote(response.data);
        }
      } catch (error) {
        console.error('[DesignLab] Error updating price:', error);
      } finally {
        setPriceLoading(false);
      }
    }
  }, [currentDesignId, showPriceModal, priceLoading, currentView]);

  // [2025-12-08 23:30:00] Zoom视图状态
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomPan, setZoomPan] = useState({ x: 0, y: 0 });
  const [isZoomDragging, setIsZoomDragging] = useState(false);
  const [zoomDragStart, setZoomDragStart] = useState({ x: 0, y: 0 });

  // [2025-01-30 14:00:00] 视图切换处理
  // [2025-12-08 23:30:00] 添加Zoom视图处理
  const handleViewChange = (view: 'front' | 'back' | 'sleeve' | 'zoom') => {
    setCurrentView(view);
    if (view !== 'zoom') {
      setView(view);
      // 重置Zoom状态
      setZoomLevel(1);
      setZoomPan({ x: 0, y: 0 });
    } else {
      // 切换到Zoom视图时，保存当前画布状态
      if (fabricCanvasRef.current) {
        const snapshot = canvasToSnapshot(fabricCanvasRef.current);
        setCanvas(snapshot, { pushHistory: false });
      }
    }
  };

  // [2025-12-08 23:30:00] Zoom视图：放大
  const handleZoomIn = () => {
    if (currentView !== 'zoom') return;
    setZoomLevel(prev => Math.min(prev + 0.25, 3)); // 最大3倍
  };

  // [2025-12-08 23:30:00] Zoom视图：缩小
  const handleZoomOut = () => {
    if (currentView !== 'zoom') return;
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5)); // 最小0.5倍
  };

  // [2025-12-08 23:30:00] Zoom视图：重置
  const handleZoomReset = () => {
    if (currentView !== 'zoom') return;
    setZoomLevel(1);
    setZoomPan({ x: 0, y: 0 });
  };

  // [2025-12-08 23:30:00] Zoom视图：拖拽开始
  const handleZoomMouseDown = (e: React.MouseEvent) => {
    if (currentView !== 'zoom') return;
    setIsZoomDragging(true);
    setZoomDragStart({ x: e.clientX - zoomPan.x, y: e.clientY - zoomPan.y });
  };

  // [2025-12-08 23:30:00] Zoom视图：拖拽中
  const handleZoomMouseMove = (e: React.MouseEvent) => {
    if (currentView !== 'zoom' || !isZoomDragging) return;
    setZoomPan({
      x: e.clientX - zoomDragStart.x,
      y: e.clientY - zoomDragStart.y
    });
  };

  // [2025-12-08 23:30:00] Zoom视图：拖拽结束
  const handleZoomMouseUp = () => {
    setIsZoomDragging(false);
  };

  // [2025-12-08 23:30:00] Zoom视图：应用缩放和平移
  useEffect(() => {
    if (currentView === 'zoom' && fabricCanvasRef.current) {
      const canvas = fabricCanvasRef.current;
      const vpt = [zoomLevel, 0, 0, zoomLevel, zoomPan.x, zoomPan.y];
      canvas.setViewportTransform(vpt);
      canvas.renderAll();
    } else if (currentView !== 'zoom' && fabricCanvasRef.current) {
      // 重置viewport
      const canvas = fabricCanvasRef.current;
      canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
      canvas.renderAll();
    }
  }, [currentView, zoomLevel, zoomPan]);

  // [2025-12-08 23:00:00] 快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果焦点在输入框或文本区域，不处理快捷键
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      // Delete/Backspace: 删除选中的对象
      if ((e.key === 'Delete' || e.key === 'Backspace') && !e.ctrlKey && !e.metaKey) {
        const activeObject = canvas.getActiveObject();
        if (activeObject) {
          const objName = (activeObject as any).name || '';
          if (objName !== 'background') {
            // 保存到历史记录以便Undo
            const snapshot = canvasToSnapshot(canvas);
            setCanvas(snapshot, { pushHistory: true });
            
            const objName = (activeObject as any).name || 'unnamed';
            const objLayerType = (activeObject as any).data?.layerType;
            console.log('[DesignLab] 🗑️ Removing active object (Delete key handler):', {
              objName,
              objLayerType,
              location: 'Delete key handler',
              callStack: new Error().stack?.split('\n').slice(1, 5).join('\n'),
            });
            canvas.remove(activeObject);
            canvas.renderAll();
            
            // 更新画布状态
            const newSnapshot = canvasToSnapshot(canvas);
            setCanvas(newSnapshot, { pushHistory: true });
            
            e.preventDefault();
          }
        }
        return;
      }

      // Ctrl/Cmd + A: 全选
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        // [2025-12-10] 检查 fabric 对象是否已加载
        if (!fabricRef.current) {
          console.warn('[DesignLab] Fabric not loaded yet, cannot select all');
          return;
        }
        const fabric = fabricRef.current;
        
        const objects = canvas.getObjects().filter((obj: fabric.Object) => {
          const objName = (obj as any).name || '';
          return objName !== 'background';
        });
        
        if (objects.length > 0) {
          const selection = new fabric.ActiveSelection(objects, {
            canvas: canvas,
          });
          canvas.setActiveObject(selection);
          canvas.renderAll();
        }
        
        e.preventDefault();
        return;
      }

      // Ctrl/Cmd + C: 复制
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        const activeObject = canvas.getActiveObject();
        if (activeObject && activeObject !== canvas.getActiveObjects()[0]) {
          // 将对象序列化为JSON并存储到剪贴板
          const objectData = JSON.stringify(activeObject.toJSON(['name', 'data']));
          (window as any).__fabricClipboard = objectData;
        }
        e.preventDefault();
        return;
      }

      // Ctrl/Cmd + V: 粘贴
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        // [2025-12-10] 检查 fabric 对象是否已加载
        if (!fabricRef.current) {
          console.warn('[DesignLab] Fabric not loaded yet, cannot paste');
          return;
        }
        const fabric = fabricRef.current;
        
        const clipboardData = (window as any).__fabricClipboard;
        if (clipboardData) {
          try {
            const objectData = JSON.parse(clipboardData);
            fabric.util.enlivenObjects([objectData], (objects: fabric.Object[]) => {
              if (objects.length > 0) {
                const obj = objects[0];
                // 偏移粘贴的对象，避免完全重叠
                obj.set({
                  left: (obj.left || 0) + 20,
                  top: (obj.top || 0) + 20,
                });
                
                // 为新对象添加删除控件
                const canvas = fabricCanvasRef.current;
                if (canvas && (canvas as any).deleteControl) {
                  obj.controls = obj.controls || {};
                  obj.controls.deleteControl = (canvas as any).deleteControl;
                }
                
                canvas.add(obj);
                canvas.setActiveObject(obj);
                canvas.renderAll();
                
                // 保存到历史记录
                const snapshot = canvasToSnapshot(canvas);
                setCanvas(snapshot, { pushHistory: true });
              }
            });
          } catch (error) {
            console.error('[DesignLab] Error pasting object:', error);
          }
        }
        e.preventDefault();
        return;
      }

      // ESC: 取消选择
      if (e.key === 'Escape') {
        canvas.discardActiveObject();
        canvas.renderAll();
        e.preventDefault();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [canvasToSnapshot, setCanvas]);

  // [2025-01-30 14:00:00] 引导面板操作处理
  const handleGuideAction = (action: string) => {
    setShowGuidePanel(false);
    handleToolClick(action);
  };

  // [2025-01-30 23:30:00] Design Lab 4.0: 使用 canvasEngine 初始化画布
  useEffect(() => {
    if (!canvasRef.current) {
      console.warn('[DesignLab] Canvas ref not available');
      return;
    }

    const canvasElement = canvasRef.current;
    let isMounted = true;

    // [2025-01-30 23:30:00] Design Lab 4.0: 使用 canvasEngine 初始化
    // [2025-12-10 18:40:00] 修复：正确处理fabric.js的动态导入，fabric包导出结构为 { fabric: ... }
    const initCanvas = async () => {
      try {
        // 动态导入 fabric
        // [2025-12-10 18:40:00] 修复：fabric包导出为 { fabric: ... }，需要访问fabric.fabric
        const fabricModule = await import('fabric');
        if (!isMounted || !canvasRef.current) return;

        // [2025-12-10 18:40:00] 修复：获取实际的fabric对象
        // fabric包可能导出为 { fabric: ... } 或 { default: ... } 或直接导出
        const fabric = fabricModule.fabric || fabricModule.default || fabricModule;
        
        // 验证fabric对象是否有效
        if (!fabric || typeof fabric.Canvas !== 'function') {
          throw new Error('Fabric.js module is not properly loaded. Canvas constructor is missing.');
        }

        // 存储 fabric 对象到 ref
        fabricRef.current = fabric;

        // 使用 canvasEngine 初始化画布
        await canvasEngine.initialize(canvasElement, fabric);
        
        // 获取画布实例
        const fabricCanvas = canvasEngine.getCanvas();
        if (!fabricCanvas) {
          throw new Error('Canvas engine failed to initialize');
        }
        
        console.log('[DesignLab] Fabric canvas initialized successfully via canvasEngine');

        // [2025-01-30 23:30:00] Design Lab 4.0: canvasEngine 已处理高 DPI 适配和对象默认属性
        // [2025-01-30 20:55:00] 修复：添加循环防护监控
        let addCount = 0;
        let removeCount = 0;
        const maxLogCount = 10; // 最多记录 10 次，避免日志过多
        
        canvasEngine.on(CanvasEventType.OBJECT_ADDED, (event) => {
          addCount++;
          const obj = event.payload?.object;
          const objName = obj?.name || 'unnamed';
          const layerType = obj?.data?.layerType || 'unknown';
          
          // [2025-01-30 22:15:00] 修复：使用 fabricCanvas 而不是未定义的 canvas
          const canvas = fabricCanvas;
          
          // #region agent log
          debugLog({
            location: 'DesignLabClient.tsx:2290',
            message: 'OBJECT_ADDED event',
            data: { objName, layerType, zIndex: obj?.data?.zIndex, objectIndex: canvas ? canvas.getObjects().indexOf(obj) : -1, totalObjects: canvas ? canvas.getObjects().length : 0, isProductImage: objName.startsWith('product-image-') },
            hypothesisId: 'A,D',
          });
          // #endregion
          
          if (addCount <= maxLogCount) {
            console.log('[DesignLab] Object added:', { 
              name: objName, 
              layerType,
              zIndex: obj?.data?.zIndex,
              totalAdds: addCount 
            });
          } else if (addCount === maxLogCount + 1) {
            console.warn('[DesignLab] ⚠️ Object added count exceeded limit, suppressing further logs');
          }
          
          // 检测循环：如果同一对象在短时间内被重复添加
          if (obj && objName.startsWith('product-image-')) {
            const removalCheck = objName + '-removal-check';
            const lastRemoval = (window as any)[removalCheck] || 0;
            const now = Date.now();
            if (now - lastRemoval < 1000) {
              console.error('[DesignLab] ⚠️ POTENTIAL LOOP: Product image added within 1s of removal!', {
                objName,
                timeSinceRemoval: now - lastRemoval,
              });
              // #region agent log
              debugLog({
                location: 'DesignLabClient.tsx:2308',
                message: 'POTENTIAL LOOP detected',
                data: { objName, timeSinceRemoval: now - lastRemoval },
                hypothesisId: 'A,B',
              });
              // #endregion
            }
          }
        });

        canvasEngine.on(CanvasEventType.OBJECT_REMOVED, (event) => {
          removeCount++;
          const obj = event.payload?.object;
          const objName = obj?.name || 'unnamed';
          const layerType = obj?.data?.layerType || 'unknown';
          const removalContext = removalContextRef.current;
          
          // #region agent log
          debugLog({
            location: 'DesignLabClient.tsx:2315',
            message: 'OBJECT_REMOVED event',
            data: { objName, layerType, zIndex: obj?.data?.zIndex, isProductImage: objName.startsWith('product-image-'), backgroundImageMatches: obj===backgroundImageRef.current, removalContext },
            hypothesisId: 'A',
          });
          // #endregion
          
          // [2025-12-11 23:59:30] 编辑会话保护：如果删除的是活动文本对象，且来源不是用户删除，则恢复对象
          const currentPanel = toolPanelTypeRef.current;
          const isText = obj && (obj.type === 'i-text' || obj.type === 'textbox');
          const isEditTextPanel = currentPanel === 'edit-text';
          const isActiveText = obj && fabricCanvas.getActiveObject() === null && selectedText === obj;
          
          if (isText && isEditTextPanel && removalContext !== 'user-delete') {
            console.warn('[DesignLab] Prevent unintended removal during edit; restoring object:', {
              objName,
              removalContext,
              currentPanel,
            });
            // 恢复对象到画布
            fabricCanvas.add(obj);
            fabricCanvas.setActiveObject(obj);
            fabricCanvas.renderAll();
            // 不切到 Home，保持编辑面板
            removalContextRef.current = 'unknown';
            return;
          }
          
          if (removeCount <= maxLogCount) {
            console.log('[DesignLab] Object removed:', { 
              name: objName, 
              layerType,
              zIndex: obj?.data?.zIndex,
              totalRemoves: removeCount,
              removalContext,
            });
          } else if (removeCount === maxLogCount + 1) {
            console.warn('[DesignLab] ⚠️ Object removed count exceeded limit, suppressing further logs');
          }
          
          // [2025-12-11 23:59:30] 仅在用户显式删除时才允许面板回退到 Home
          if (removalContext === 'user-delete' && isText && isEditTextPanel) {
            console.log('[DesignLab] User deleted text object, switching to home panel');
            setToolPanelType('home');
            setSelectedText(null);
          }
          
          // 记录移除时间（用于检测循环）
          if (obj && objName.startsWith('product-image-')) {
            const removalCheck = objName + '-removal-check';
            (window as any)[removalCheck] = Date.now();
            
            // 如果移除的是当前背景图片引用，清除引用
            if (obj === backgroundImageRef.current) {
              backgroundImageRef.current = null;
              backgroundImageLoadedRef.current = '';
              // #region agent log
              debugLog({
                location: 'DesignLabClient.tsx:2332',
                message: 'cleared backgroundImageRef after removal',
                data: { objName },
                hypothesisId: 'A',
              });
              // #endregion
            }
          }
          
          // [2025-12-11 23:59:30] 重置删除来源标记
          removalContextRef.current = 'unknown';
        });

        canvasEngine.on(CanvasEventType.OBJECT_MODIFIED, (event) => {
          console.log('[DesignLab] Object modified:', event.payload);
          // 保存到历史记录
              const snapshot = canvasToSnapshot(fabricCanvas);
              setCanvas(snapshot, { pushHistory: true });
        });

        // [2025-01-30 23:30:00] Design Lab 4.0: 设置 fabricCanvasRef
        fabricCanvasRef.current = fabricCanvas;

        // [2025-12-08 23:00:00] 创建右上角删除按钮控件
        // [2025-12-10] 修复：确保 fabric.Control 存在后再创建
        if (!fabric.Control) {
          throw new Error('fabric.Control is not available');
        }
        const deleteControl = new fabric.Control({
          x: 0.5,
          y: -0.5,
          offsetX: 0,
          offsetY: -20,
          actionHandler: (eventData, transformData, x, y) => {
            const target = transformData.target;
            if (target && fabricCanvas) {
              const objName = (target as any).name || 'unnamed';
              const objLayerType = (target as any).data?.layerType;
              console.log('[DesignLab] 🗑️ Removing object (deleteControl actionHandler inline):', {
                objName,
                objLayerType,
                location: 'deleteControl actionHandler (inline)',
                callStack: new Error().stack?.split('\n').slice(1, 5).join('\n'),
              });
              // [2025-12-11 23:59:30] 标记删除来源为用户删除
              removalContextRef.current = 'user-delete';
              // 保存到历史记录以便Undo
              const snapshot = canvasToSnapshot(fabricCanvas);
              setCanvas(snapshot, { pushHistory: true });
              
              // 删除对象
              fabricCanvas.remove(target);
              fabricCanvas.renderAll();
              
              // 更新画布状态
              const newSnapshot = canvasToSnapshot(fabricCanvas);
              setCanvas(newSnapshot, { pushHistory: true });
              
              return true;
            }
            return false;
          },
          cursorStyle: 'pointer',
          render: (ctx, left, top, styleOverride, fabricObject) => {
            const size = 20;
            ctx.save();
            ctx.translate(left, top);
            ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle || 0));
            
            // 绘制圆形背景
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(0, 0, size / 2, 0, 2 * Math.PI);
            ctx.fill();
            
            // 绘制X图标
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            const iconSize = size * 0.4;
            ctx.beginPath();
            ctx.moveTo(-iconSize / 2, -iconSize / 2);
            ctx.lineTo(iconSize / 2, iconSize / 2);
            ctx.moveTo(iconSize / 2, -iconSize / 2);
            ctx.lineTo(-iconSize / 2, iconSize / 2);
            ctx.stroke();
            
            ctx.restore();
          },
          mouseUpHandler: (eventData, transformData) => {
            const target = transformData.target;
            if (target && fabricCanvas) {
              // [2025-12-11 23:59:30] 标记删除来源为用户删除
              removalContextRef.current = 'user-delete';
              // 保存到历史记录以便Undo
              const snapshot = canvasToSnapshot(fabricCanvas);
              setCanvas(snapshot, { pushHistory: true });
              
              // 删除对象
              fabricCanvas.remove(target);
              fabricCanvas.renderAll();
              
              // 更新画布状态
              const newSnapshot = canvasToSnapshot(fabricCanvas);
              setCanvas(newSnapshot, { pushHistory: true });
              
              return true;
            }
            return false;
          }
        });

        // [2025-12-08 23:00:00] 为所有对象添加删除控件（排除背景）
        const addDeleteControlToObject = (obj: fabric.Object) => {
          const objName = (obj as any).name || '';
          if (objName !== 'background' && !obj.controls) {
            obj.controls = {};
          }
          if (objName !== 'background') {
            obj.controls.deleteControl = deleteControl;
          }
        };

        // [2025-01-30 23:30:00] Design Lab 4.0: 继续原有的画布事件绑定逻辑

        const handleSelection = () => {
          const activeObject = fabricCanvas.getActiveObject();
          if (activeObject) {
            // [2025-01-31 19:15:00] 不在 handleSelection 中重置 isAddingObjectRef
            // 让上传/添加流程的 setTimeout 来控制重置时机，避免时序问题
            // 只有在确认对象选择完成且不是正在添加的对象时，才重置标志
            // isAddingObjectRef 的重置由各自的添加流程控制（上传、文本、art）
            
            const objType = activeObject.type;
            const objName = (activeObject as any).name || '';
            let newPanelType: ToolPanelType = 'home';
            
            if (objType === 'image' && objName !== 'background') {
              if (objName.startsWith('art_')) {
                newPanelType = 'edit-art';
                setSelectedArt(activeObject as fabric.Image);
                setSelectedImage(null);
                setSelectedText(null);
              } else {
                newPanelType = 'edit-upload';
                setSelectedImage(activeObject as fabric.Image);
                setSelectedArt(null);
                setSelectedText(null);
              }
            } else if (objType === 'i-text' || objType === 'text' || objType === 'textbox') {
              newPanelType = 'edit-text';
              setSelectedText(activeObject as fabric.IText);
              setSelectedImage(null);
              setSelectedArt(null);
              console.log('[DesignLab] Text object selected:', objType, objName);
            } else {
              newPanelType = 'home';
              setSelectedImage(null);
              setSelectedText(null);
              setSelectedArt(null);
            }
            setToolPanelType(newPanelType);
            console.log('[DesignLab] Object selected:', objType, objName, '→ Panel:', newPanelType);
          }
        };

        const handleSelectionCleared = () => {
          // [2025-01-31 19:15:00] 如果正在添加对象，忽略选择清除事件
          if (isAddingObjectRef.current) {
            console.log('[DesignLab] Selection cleared but object is being added, ignoring');
            return;
          }
          
          const activeObject = fabricCanvas.getActiveObject();
          // [2025-01-31 19:15:00] 如果有活动对象，不应该切换面板
          if (activeObject) {
            console.log('[DesignLab] Selection cleared but active object exists, ignoring');
            return;
          }
          
          const currentPanel = toolPanelTypeRef.current;
          
          // [2025-01-31 19:15:00] 如果当前在编辑面板，且有选中的对象，保持面板不切换
          // [2025-12-11 23:59:30] 增强：检查画布上是否还有文本对象，如果有则保持编辑面板
          if (currentPanel === 'edit-text' || currentPanel === 'edit-upload' || currentPanel === 'edit-art') {
            const hasSelectedText = selectedText !== null;
            const hasSelectedImage = selectedImage !== null;
            const hasSelectedArt = selectedArt !== null;
            
            // [2025-12-11 23:59:30] 检查画布上是否还有文本对象（即使未选中）
            const hasTextObjects = fabricCanvas.getObjects().some((obj: any) => 
              obj.type === 'i-text' || obj.type === 'textbox'
            );
            
            if (hasSelectedText || hasSelectedImage || hasSelectedArt || (currentPanel === 'edit-text' && hasTextObjects)) {
              console.log('[DesignLab] Selection cleared but edit panel has selected object or text objects on canvas, keeping panel');
              return;
            }
          }
          
          // [2025-01-31 19:15:00] 检查画布上是否有上传的图片（layerType: 'upload'），如果有则不应切换面板
          const allObjs = fabricCanvas.getObjects();
          const hasUploadImages = allObjs.some((obj: any) => 
            (obj as any).data?.layerType === 'upload' || (obj as any).name?.startsWith('image_')
          );
          
          // [2025-01-31 19:15:00] 如果画布上有上传的图片，且当前在 edit-upload 面板，保持面板
          if (hasUploadImages && currentPanel === 'edit-upload') {
            console.log('[DesignLab] Selection cleared but canvas has upload images and in edit-upload panel, keeping panel');
            return;
          }
          
          // [2025-01-30 22:40:00] 调试：记录选择清除时的画布状态
          console.log('[DesignLab] 🔍 Selection cleared - canvas state:', {
            objectCount: allObjs.length,
            objects: allObjs.map((obj, idx) => ({
              index: idx,
              name: (obj as any).name,
              type: obj.type,
              visible: obj.visible,
              opacity: obj.opacity,
              zIndex: (obj as any).data?.zIndex,
            })),
            currentPanel,
          });
          
          console.log('[DesignLab] Selection cleared, current panel:', currentPanel, '→ Home panel');
          setToolPanelType('home');
          setSelectedImage(null);
          setSelectedText(null);
          setSelectedArt(null);
        };

        // [2025-12-08 23:30:00] 吸附对齐线功能
        let snapLines: { x?: number; y?: number } = {};
        const SNAP_THRESHOLD = 5; // 吸附阈值（像素）

        const drawSnapLines = () => {
          if (!snapLines.x && !snapLines.y) return;
          
          const ctx = fabricCanvas.getContext();
          const vpt = fabricCanvas.viewportTransform;
          if (!vpt) return;

          ctx.save();
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 5]);

          if (snapLines.x !== undefined) {
            const x = snapLines.x * vpt[0] + vpt[4];
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, fabricCanvas.height);
            ctx.stroke();
          }

          if (snapLines.y !== undefined) {
            const y = snapLines.y * vpt[3] + vpt[5];
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(fabricCanvas.width, y);
            ctx.stroke();
          }

          ctx.restore();
        };

        const findSnapPosition = (movingObject: fabric.Object, allObjects: fabric.Object[]): { x?: number; y?: number } => {
          const snap: { x?: number; y?: number } = {};
          const objBounds = movingObject.getBoundingRect();
          const objCenterX = objBounds.left + objBounds.width / 2;
          const objCenterY = objBounds.top + objBounds.height / 2;
          const objLeft = objBounds.left;
          const objRight = objBounds.right;
          const objTop = objBounds.top;
          const objBottom = objBounds.bottom;

          // 画布中心线
          const canvasCenterX = fabricCanvas.width / 2;
          const canvasCenterY = fabricCanvas.height / 2;

          // 检查是否接近画布中心
          if (Math.abs(objCenterX - canvasCenterX) < SNAP_THRESHOLD) {
            snap.x = canvasCenterX;
          }
          if (Math.abs(objCenterY - canvasCenterY) < SNAP_THRESHOLD) {
            snap.y = canvasCenterY;
          }

          // 检查与其他对象的对齐
          allObjects.forEach((obj) => {
            if (obj === movingObject || (obj as any).name === 'background') return;
            
            const bounds = obj.getBoundingRect();
            const otherCenterX = bounds.left + bounds.width / 2;
            const otherCenterY = bounds.top + bounds.height / 2;
            const otherLeft = bounds.left;
            const otherRight = bounds.right;
            const otherTop = bounds.top;
            const otherBottom = bounds.bottom;

            // 中心对齐
            if (Math.abs(objCenterX - otherCenterX) < SNAP_THRESHOLD) {
              snap.x = otherCenterX;
            }
            if (Math.abs(objCenterY - otherCenterY) < SNAP_THRESHOLD) {
              snap.y = otherCenterY;
            }

            // 边缘对齐
            if (Math.abs(objLeft - otherLeft) < SNAP_THRESHOLD) {
              snap.x = otherLeft;
            }
            if (Math.abs(objRight - otherRight) < SNAP_THRESHOLD) {
              snap.x = otherRight;
            }
            if (Math.abs(objTop - otherTop) < SNAP_THRESHOLD) {
              snap.y = otherTop;
            }
            if (Math.abs(objBottom - otherBottom) < SNAP_THRESHOLD) {
              snap.y = otherBottom;
            }
          });

          return snap;
        };

        const handleObjectMoving = (e: fabric.IEvent) => {
          const obj = e.target;
          if (!obj) return;

          const allObjects = fabricCanvas.getObjects();
          const snap = findSnapPosition(obj, allObjects);

          if (snap.x !== undefined) {
            const objBounds = obj.getBoundingRect();
            const offsetX = snap.x - (objBounds.left + objBounds.width / 2);
            obj.set('left', (obj.left || 0) + offsetX);
          }

          if (snap.y !== undefined) {
            const objBounds = obj.getBoundingRect();
            const offsetY = snap.y - (objBounds.top + objBounds.height / 2);
            obj.set('top', (obj.top || 0) + offsetY);
          }

          snapLines = snap;
          fabricCanvas.renderAll();
        };

        const handleObjectMoved = () => {
          snapLines = {};
          fabricCanvas.renderAll();
        };

        // [2025-12-08 23:30:00] 打印安全区边界显示
        const drawSafeArea = () => {
          const ctx = fabricCanvas.getContext();
          const SAFE_AREA_MARGIN = 0.1; // 10%边距
          const safeLeft = fabricCanvas.width * SAFE_AREA_MARGIN;
          const safeTop = fabricCanvas.height * SAFE_AREA_MARGIN;
          const safeRight = fabricCanvas.width * (1 - SAFE_AREA_MARGIN);
          const safeBottom = fabricCanvas.height * (1 - SAFE_AREA_MARGIN);

          ctx.save();
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2;
          ctx.setLineDash([10, 5]);
          ctx.strokeRect(safeLeft, safeTop, safeRight - safeLeft, safeBottom - safeTop);
          ctx.restore();
        };

        // [2025-12-08 23:30:00] 重写renderAll以包含安全区边界和吸附线
        const originalRenderAll = fabricCanvas.renderAll.bind(fabricCanvas);
        fabricCanvas.renderAll = function() {
          originalRenderAll();
          if (currentView !== 'zoom') {
            drawSafeArea();
          }
          if (snapLines.x !== undefined || snapLines.y !== undefined) {
            drawSnapLines();
          }
        };

        const handleObjectModified = () => {
          const snapshot = canvasToSnapshot(fabricCanvas);
          setCanvas(snapshot, { pushHistory: true });
        };

        const handleObjectAdded = () => {
          const snapshot = canvasToSnapshot(fabricCanvas);
          setCanvas(snapshot, { pushHistory: true });
        };

        const handleObjectRemoved = (e?: any) => {
          const removedObject = e?.target;
          if (removedObject) {
            const objName = (removedObject as any).name || 'unnamed';
            const objType = (removedObject as any).data?.layerType || 'unknown';
            const objStableKey = (removedObject as any).data?.stableKey;
            const timestamp = new Date().toISOString();
            
            // [2025-01-31 19:30:00] 增强日志：记录移除的对象完整信息
            const objectInfo = {
              name: objName,
              type: objType,
              objectType: removedObject.type,
              stableKey: objStableKey,
              visible: removedObject.visible,
              opacity: removedObject.opacity,
              selectable: removedObject.selectable,
              evented: removedObject.evented,
              zIndex: (removedObject as any).data?.zIndex,
              left: removedObject.left,
              top: removedObject.top,
              width: removedObject.width,
              height: removedObject.height,
              scaleX: removedObject.scaleX,
              scaleY: removedObject.scaleY,
              timestamp,
            };
            
            console.log('[DesignLab] 🗑️ Object removed via fabric event:', objectInfo);
            
            // [2025-01-31 19:30:00] 记录完整的调用栈
            const stackTrace = new Error().stack;
            console.log('[DesignLab] 📍 Removal call stack:', stackTrace?.split('\n').slice(1, 10).join('\n'));
            
            // [2025-01-31 19:30:00] 检查移除前的画布状态（如果可能）
            const remainingObjs = fabricCanvas.getObjects();
            const beforeRemovalObjects = [...remainingObjs, removedObject]; // 重建移除前的列表
            
            console.log('[DesignLab] 🔍 Removal context:', {
              beforeRemovalCount: beforeRemovalObjects.length,
              afterRemovalCount: remainingObjs.length,
              removedObjectIndex: beforeRemovalObjects.indexOf(removedObject),
              isAddingObject: isAddingObjectRef.current,
              currentPanel: toolPanelTypeRef.current,
              hasSelectedImage: selectedImage !== null,
              hasSelectedText: selectedText !== null,
              hasSelectedArt: selectedArt !== null,
            });
            
            // [2025-01-30 22:40:00] 检查移除后的画布状态
            console.log('[DesignLab] 🔍 After removal - canvas state:', {
              objectCount: remainingObjs.length,
              objects: remainingObjs.map((obj, idx) => ({
                index: idx,
                name: (obj as any).name || 'unnamed',
                type: obj.type,
                layerType: (obj as any).data?.layerType || 'unknown',
                visible: obj.visible,
                opacity: obj.opacity,
                zIndex: (obj as any).data?.zIndex,
                stableKey: (obj as any).data?.stableKey || (obj as any).name,
              })),
            });
            
            // [2025-01-30 22:40:00] 如果是上传图片被移除，记录详细警告
            if (objType === 'upload') {
              console.error('[DesignLab] ⚠️⚠️⚠️ UPLOAD IMAGE REMOVED! ⚠️⚠️⚠️', {
                objectInfo,
                callStack: stackTrace,
                canvasState: {
                  remainingObjects: remainingObjs.length,
                  isAddingObject: isAddingObjectRef.current,
                  currentPanel: toolPanelTypeRef.current,
                },
              });
              console.error('[DesignLab] ⚠️ Upload image removed! Full stack trace:', stackTrace);
            }
          }
          const snapshot = canvasToSnapshot(fabricCanvas);
          setCanvas(snapshot, { pushHistory: true });
        };

        fabricCanvas.on('selection:created', handleSelection);
        fabricCanvas.on('selection:updated', handleSelection);
        fabricCanvas.on('selection:cleared', handleSelectionCleared);
        fabricCanvas.on('object:modified', handleObjectModified);
        fabricCanvas.on('object:moving', handleObjectMoving); // [2025-12-08 23:30:00] 吸附对齐线
        fabricCanvas.on('object:moved', handleObjectMoved); // [2025-12-08 23:30:00] 清除吸附线
        fabricCanvas.on('object:added', (e) => {
          // [2025-12-08 23:00:00] 为新添加的对象添加删除控件
          if (e.target) {
            addDeleteControlToObject(e.target);
          }
          handleObjectAdded();
        });
        fabricCanvas.on('object:removed', handleObjectRemoved);

        // [2025-12-08 23:00:00] 为现有对象添加删除控件
        fabricCanvas.getObjects().forEach((obj) => {
          addDeleteControlToObject(obj);
        });

        // [2025-12-08 23:00:00] 保存删除控件到canvas，以便后续使用
        (fabricCanvas as any).deleteControl = deleteControl;

        console.log('[DesignLab] Event listeners attached, canvas ready');

        // [2025-01-31 19:40:00] 暴露 canvas 到 window，便于测试和调试
        (window as any).fabricCanvas = fabricCanvas;
        (window as any).DesignLabCanvas = {
          getCanvas: () => fabricCanvas,
        };

        // [2025-12-10] 延迟恢复画布状态，确保所有初始化完成
        setTimeout(() => {
          try {
            const currentViewCanvas = getCurrentViewCanvas();
            if (currentViewCanvas && currentViewCanvas.objects.length > 0 && fabricRef.current) {
              snapshotToCanvas(currentViewCanvas, fabricCanvas);
            }
          } catch (error) {
            console.warn('[DesignLab] Failed to restore canvas snapshot:', error);
          }
        }, 100);

        if (!productInfo) {
          console.log('[DesignLab] Canvas initialized but no productInfo, setting default');
          const defaultColor = 'White';
          const defaultProductInfo: ProductInfo = {
            productId: 'default',
            productName: 'Gildan Softstyle Jersey T-shirt',
            variantId: 'default',
            color: defaultColor,
            colors: ['White', 'Black', 'Navy', 'Maroon', 'Heather Grey', 'Heather Dark Grey'],
            baseImages: getDefaultProductBaseImages(defaultColor),
            gallery: [],
          };
          setProductInfo(defaultProductInfo);
        }

        // [2025-01-30 23:30:00] Design Lab 4.0: 标记画布已初始化
        setCanvasInitialized(true);
        console.log('[DesignLab] Fabric.js canvas initialized successfully via canvasEngine');

      } catch (error) {
        // [2025-12-10 18:40:00] 增强错误处理和日志记录
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        
        console.error('[DesignLab] Error initializing Fabric.js canvas:', {
          error: errorMessage,
          stack: errorStack,
          fabricAvailable: !!fabricRef.current,
          canvasElementAvailable: !!canvasRef.current,
          timestamp: new Date().toISOString(),
        });
        
        // [2025-12-10 18:40:00] 提供更详细的错误信息
        if (errorMessage.includes('Canvas') || errorMessage.includes('fabric')) {
          showErrorToast('Failed to load design canvas library. Please refresh the page or check your internet connection.');
        } else {
          showErrorToast('Failed to initialize design canvas. Please refresh the page.');
        }
        
        setCanvasInitialized(false);
        // [2025-12-10 18:40:00] 保存错误状态用于UI显示
        setCanvasInitError(error instanceof Error ? error : new Error(String(error)));
        
        // [2025-12-10 18:40:00] 上报错误到监控系统（如果有）
        if (typeof window !== 'undefined' && (window as any).Sentry) {
          try {
            (window as any).Sentry.captureException(error, {
              tags: { component: 'DesignLab', action: 'canvas-init' },
              extra: {
                fabricAvailable: !!fabricRef.current,
                canvasElementAvailable: !!canvasRef.current,
              },
            });
          } catch (sentryError) {
            // 忽略Sentry错误
          }
        }
      }
    };

    initCanvas().catch((error) => {
      console.error('[DesignLab] Error loading fabric.js:', error);
      showErrorToast('Failed to load design canvas library. Please refresh the page.');
      setCanvasInitialized(false);
      // [2025-12-10 18:40:00] 保存错误状态用于UI显示
      setCanvasInitError(error instanceof Error ? error : new Error(String(error)));
    });

    return () => {
      isMounted = false;
      // [2025-01-30 23:30:00] Design Lab 4.0: 使用 canvasEngine 清理资源
      try {
        console.log('[DesignLab] Cleaning up canvas engine');
        canvasEngine.dispose();
        } catch (error) {
        console.error('[DesignLab] Error cleaning up canvas engine:', error);
        }
        fabricCanvasRef.current = null;
        fabricRef.current = null;
        setCanvasInitialized(false);
    };
  }, [canvasToSnapshot, setCanvas, getCurrentViewCanvas]); // [2025-01-30 23:30:00] Design Lab 4.0: 添加必要的依赖

  // [2025-01-31 13:00:00] 根据 designlab-index.jpeg，使用 canvasInitialized 状态标志确保在画布和产品信息都准备好后加载背景图片
  // [2025-01-31 13:45:00] 修复：productInfo 现在总是非 null，移除多余的 null 检查
  // [2025-01-31 15:30:00] 确保首页能够有默认的图片展示，所有功能能够在这张底图上进行
  // [2025-01-31 16:30:00] 修复：移除 loadBackgroundImage 和 productInfo 从依赖数组，避免无限循环
  // [2025-01-31 16:55:00] 修复：loadBackgroundImage 内部已经检查重复加载，这里不需要再次检查
  // [2025-01-30 22:05:00] 修复：检查加载锁，避免在加载过程中重复触发
  useEffect(() => {
    if (canvasInitialized && currentView !== 'zoom') {
      // [2025-01-30 22:05:00] 如果正在加载，跳过（避免重复触发）
      if (isLoadingBackgroundRef.current) {
        console.log('[DesignLab] Background image is loading, skipping trigger from canvasInitialized useEffect');
        return;
      }
      
      console.log('[DesignLab] Canvas and productInfo ready, loading background image for view:', currentView);
      // [2025-01-31 15:30:00] 确保立即加载默认底图，不等待异步操作
      // [2025-01-31 16:55:00] loadBackgroundImage 内部会检查是否已加载，避免重复
      loadBackgroundImage(currentView);
    }
  }, [canvasInitialized, currentView, loadBackgroundImage]); // [2025-01-31 16:55:00] 添加 loadBackgroundImage 到依赖，但内部有重复检查

  // [2025-12-19 16:30:00] 页面加载时自动恢复本地草稿
  useEffect(() => {
    if (!canvasInitialized || !fabricCanvasRef.current || !fabricRef.current) {
      return; // 等待canvas初始化完成
    }

    const restoreDraft = async () => {
      try {
        const draft = loadDesignFromLocalStorage();
        if (!draft) {
          console.log('[DesignLab] No local draft found, starting fresh');
          return;
        }

        console.log('[DesignLab] Restoring local draft:', {
          designName: draft.designName,
          currentView: draft.currentView,
          savedAt: draft.savedAt,
        });

        // [2025-12-19 16:30:00] 恢复设计名称
        if (draft.designName) {
          setDesignName(draft.designName);
        }

        // [2025-12-19 16:30:00] 恢复产品信息
        if (draft.productInfo) {
          setProductInfo((prev) => ({
            ...prev,
            productId: draft.productInfo.productId,
            productName: draft.productInfo.productName,
            variantId: draft.productInfo.variantId,
            color: draft.productInfo.color,
          }));
        }

        // [2025-12-19 16:30:00] 恢复视图画布（需要等待fabric加载）
        if (draft.viewCanvases) {
          // [2025-12-19 16:30:00] 批量恢复所有视图的画布到store
          setViewCanvases(draft.viewCanvases);
          
          // [2025-12-19 16:30:00] 切换到保存时的视图
          if (draft.currentView) {
            setView(draft.currentView);
            // 加载当前视图的画布到fabric canvas
            setTimeout(() => {
              if (fabricCanvasRef.current && draft.viewCanvases[draft.currentView]) {
                snapshotToCanvas(draft.viewCanvases[draft.currentView], fabricCanvasRef.current);
                // 加载背景图片
                loadBackgroundImage(draft.currentView);
              }
            }, 200);
          }
        }
      } catch (error) {
        console.error('[DesignLab] Failed to restore local draft:', error);
        // [2025-12-19 16:30:00] 恢复失败不影响使用，只是从空白开始
      }
    };

    // [2025-12-19 16:30:00] 延迟恢复，确保所有初始化完成
    const timeoutId = setTimeout(restoreDraft, 500);
    return () => clearTimeout(timeoutId);
  }, [canvasInitialized, snapshotToCanvas, loadBackgroundImage, setView, setViewCanvases, currentView]);

  // [2025-12-19 16:30:00] 自动保存功能：定期保存到localStorage
  useEffect(() => {
    if (!canvasInitialized) {
      return;
    }

    // [2025-12-19 16:30:00] 自动保存函数
    const autoSave = () => {
      if (!fabricCanvasRef.current) {
        return;
      }

      try {
        // [2025-12-19 16:30:00] 获取当前画布快照（当前视图）
        const currentSnapshot = canvasToSnapshot(fabricCanvasRef.current);
        
        // [2025-12-19 16:30:00] 使用store中的viewCanvases并更新当前视图
        // 直接从store获取最新状态，避免闭包问题
        const storeState = useDesignLabStore.getState();
        const currentStoreView = storeState.currentView;
        const updatedViewCanvases = {
          ...storeState.viewCanvases,
          [currentStoreView]: currentSnapshot, // 更新当前视图的快照
        };

        // [2025-12-19 16:30:00] 保存到localStorage（使用store中的最新状态）
        const result = saveDesignToLocalStorage(
          designName,
          updatedViewCanvases,
          currentStoreView,
          {
            productId: productInfo.productId,
            productName: productInfo.productName,
            variantId: productInfo.variantId,
            color: productInfo.color,
          }
        );

        if (!result.success) {
          console.warn('[DesignLab] Auto-save failed:', result.error);
        } else {
          console.log('[DesignLab] Auto-saved to localStorage');
        }
      } catch (error) {
        console.error('[DesignLab] Auto-save error:', error);
      }
    };

    // [2025-12-19 16:30:00] 定期自动保存（每30秒）
    const autoSaveInterval = setInterval(autoSave, 30000);

    // [2025-12-19 16:30:00] 页面卸载前保存
    const handleBeforeUnload = () => {
      autoSave();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(autoSaveInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // [2025-12-19 16:30:00] 组件卸载时最后一次保存
      autoSave();
    };
  }, [canvasInitialized, designName, currentView, productInfo, canvasToSnapshot]);

  // [2025-12-11 23:59:30] 编辑会话保护：当进入/离开编辑面板时设置/清除编辑保护标志
  useEffect(() => {
    if (toolPanelType === 'edit-text' || toolPanelType === 'edit-upload' || toolPanelType === 'edit-art') {
      isEditingObjectRef.current = true;
      console.log('[DesignLab] Entering edit panel, enabling edit protection:', toolPanelType);
    } else {
      isEditingObjectRef.current = false;
      console.log('[DesignLab] Leaving edit panel, disabling edit protection');
    }
  }, [toolPanelType]);

  // [2025-01-30 16:30:00] 视图切换时更新画布
  // [2025-12-08 23:30:00] 更新Zoom视图处理
  useEffect(() => {
    if (!fabricCanvasRef.current) return;

    // [2025-12-11 23:59:30] 修复：添加对象过程中，禁止从 store 快照回灌当前画布
    // 原因：Add Text 会先 canvas.add(textObj) 再 setCanvas(snapshot)；
    // viewCanvases 更新触发该 effect 时，可能拿到旧快照并调用 snapshotToCanvas，导致刚添加的 text_* 被清理掉
    if (isAddingObjectRef.current) {
      console.log('[DesignLab] Skipping snapshotToCanvas while adding object (protect new object from stale snapshot overwrite)');
      return;
    }
    
    const view = currentView;
    if (view === 'zoom') {
      // Zoom视图：显示当前视图的画布内容，但不加载背景
      const currentViewCanvas = getCurrentViewCanvas();
      if (currentViewCanvas) {
        snapshotToCanvas(currentViewCanvas, fabricCanvasRef.current);
      }
      return;
    }
    
    // [2025-01-30 16:30:00] 加载背景图片
    loadBackgroundImage(view);
    
    // [2025-01-30 16:30:00] 加载画布数据
    const viewCanvas = viewCanvases[view];
    if (viewCanvas) {
      snapshotToCanvas(viewCanvas, fabricCanvasRef.current);
    }
  }, [currentView, viewCanvases, snapshotToCanvas, loadBackgroundImage, getCurrentViewCanvas]);

  return (
    <div className="design-lab-new">
      {/* 1. Header - 顶部导航栏 */}
      <header className="dl-header">
        <div className="dl-header__content">
          <div className="dl-header__left">
            {/* [2025-12-19 16:30:00] 使用主站Logo图片，点击跳转到主站首页 */}
            <Link href="/" className="dl-header__logo" aria-label="Souvenir Plus Inc home" style={{ display: 'flex', alignItems: 'center' }}>
              <Image src="/logo.png" alt="Souvenir Plus Inc" width={200} height={34} priority style={{ height: 'auto', width: 'auto', maxWidth: '200px' }} />
            </Link>
            <nav className="dl-header__breadcrumb" aria-label="Breadcrumb">
              {/* [2025-12-19 16:30:00] 移除My Designs按钮，改用本地存储，无需跳转 */}
              {/* [2025-01-30 23:15:00] 修复：Untitled design 按钮样式对齐 Custom Ink - element-2 */}
              <button 
                className="dl-header__breadcrumb-current dl-header__breadcrumb-current--button"
                onClick={() => {
                  const newName = prompt('Enter design name:', designName);
                  if (newName) setDesignName(newName);
                }}
                type="button"
              >
                {designName}
              </button>
            </nav>
          </div>
          <div className="dl-header__right">
            {/* [2025-12-08] 修复：添加"Talk to a Real Person"文案 */}
            <a href="tel:+1234567890" className="dl-header__link" aria-label="Talk to a Real Person">
              📞 Talk to a Real Person: 1-800-000-0000
            </a>
            {/* [2025-12-08] 修复：添加"Chat Now"文案 */}
            <button className="dl-header__btn" aria-label="Chat Now">Chat Now</button>
            <button className="dl-header__btn" aria-label="Sign In">Sign In</button>
          </div>
        </div>
      </header>

      {/* 2-5. Main Content - Rail + Tool Panel + Canvas + Sidebar */}
      <div className="dl-main">
        {/* 2. Dark Rail - 左侧深灰色工具栏 */}
        <nav className="dl-rail" aria-label="Design tools">
          <button
            className={`dl-rail__btn ${activeTool === 'upload' ? 'is-active' : ''}`}
            onClick={() => handleToolClick('upload')}
            aria-label="Upload image"
            aria-pressed={activeTool === 'upload'}
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
          >
            <span className="dl-rail__btn-icon dl-rail__icon--text">T</span>
            <span className="dl-rail__btn-label">Add Text</span>
          </button>

          <button
            className={`dl-rail__btn ${activeTool === 'art' ? 'is-active' : ''}`}
            onClick={() => handleToolClick('art')}
            aria-label="Add art"
            aria-pressed={activeTool === 'art'}
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

          {/* [2025-12-11 23:00:00] 暂时屏蔽 Product Colors 功能 */}
          {false && (
            <button
              className={`dl-rail__btn ${activeTool === 'colors' ? 'is-active' : ''}`}
              onClick={() => handleToolClick('colors')}
              aria-label="Product colors"
              aria-pressed={activeTool === 'colors'}
            >
              <span className="dl-rail__btn-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
                  <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
                  <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
                  <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c.55 0 1-.45 1-1v-4c0-.55-.45-1-1-1-1.25 0-2.45-.2-3.57-.57-.4-.11-.81-.03-1.1.24l-2.2 2.2c-2.83-1.45-4.6-4.33-4.6-7.59 0-4.42 3.58-8 8-8s8 3.58 8 8v1c0 .55.45 1 1 1h3c.55 0 1 .45 1 1 0 5.52-4.48 10-10 10z" />
                </svg>
              </span>
              <span className="dl-rail__btn-label">Product Colors</span>
            </button>
          )}

          {/* [2025-12-11 23:00:00] 暂时屏蔽 Add Names 功能 */}
          {false && (
            <button
              className={`dl-rail__btn ${activeTool === 'names' ? 'is-active' : ''}`}
              onClick={() => handleToolClick('names')}
              aria-label="Add names"
              aria-pressed={activeTool === 'names'}
            >
              {/* [2025-01-31 00:00:00] 根据截图，Add Names 按钮应该显示 "00" 图标 */}
              <span className="dl-rail__btn-icon dl-rail__icon--names">
                <span className="dl-rail__icon-text">00</span>
              </span>
              <span className="dl-rail__btn-label">Add Names</span>
            </button>
          )}
        </nav>

        {/* 3. Tool Panel - 左侧工具面板（Rail 右侧，430px 宽） */}
        <ToolPanel panelType={toolPanelType} onBack={handleBackToHome}>
          {toolPanelType === 'home' && (
            <HomePanel onAction={handleHomeAction} />
          )}
          {toolPanelType === 'upload' && (
            <UploadPanel
              onFileSelect={handleFileUpload}
              onBrowseClick={() => {}}
              recentUploads={recentUploads}
              onRecentUploadClick={handleRecentUploadClick}
              onClose={handleBackToHome}
            />
          )}
          {toolPanelType === 'text' && (
            <TextPanel onAddText={handleAddText} />
          )}
          {toolPanelType === 'art' && (
            <ArtPanel onSelectArt={handleAddArt} />
          )}
          {toolPanelType === 'edit-upload' && (
            <EditUploadPanel
              selectedImage={selectedImage}
              canvas={fabricCanvasRef.current}
              onUpdate={handleCanvasUpdate}
              onReset={handleResetUpload}
              onSave={handleSaveDesign}
              onClose={handleBackToHome}
              onOpenRatingModal={() => {
                // [2025-12-08] 打开上传体验评分模态框
                const uploadId = `upload_${Date.now()}`;
                setCurrentUploadId(uploadId);
                setShowUploadRatingModal(true);
              }}
            />
          )}
          {toolPanelType === 'edit-text' && (
            <EditTextPanel
              selectedText={selectedText}
              canvas={fabricCanvasRef.current}
              onUpdate={handleCanvasUpdate}
            />
          )}
          {toolPanelType === 'edit-art' && (
            <EditArtPanel
              selectedArt={selectedArt}
              canvas={fabricCanvasRef.current}
              onUpdate={handleCanvasUpdate}
              onChangeArt={handleChangeArt}
            />
          )}
          {toolPanelType === 'layers' && (
            <LayerManagementPanel
              canvas={fabricCanvasRef.current}
              onSelectLayer={(object) => {
                if (fabricCanvasRef.current) {
                  fabricCanvasRef.current.setActiveObject(object);
                  fabricCanvasRef.current.renderAll();
                }
              }}
              onUpdate={handleCanvasUpdate}
            />
          )}
        </ToolPanel>

        {/* [2025-12-10] 模板库面板 - 作为模态框显示 */}
        {showTemplateLibrary && (
          <div className="dl-modal-overlay" onClick={() => setShowTemplateLibrary(false)}>
            <div className="dl-modal-content" onClick={(e) => e.stopPropagation()}>
              <TemplateLibraryPanel
                onApplyTemplate={(template) => {
                  // [2025-12-10] 应用模板到画布
                  if (!fabricCanvasRef.current || !fabricRef.current) {
                    showError('Canvas not initialized');
                    return;
                  }
                  
                  try {
                    // 如果模板有 canvasData，加载到画布
                    if (template.canvasData) {
                      const canvas = fabricCanvasRef.current;
                      canvas.loadFromJSON(template.canvasData, () => {
                        canvas.renderAll();
                        handleCanvasUpdate();
                        setShowTemplateLibrary(false);
                        success('Template applied successfully');
                      });
                    } else {
                      showError('Template data not available');
                    }
                  } catch (error) {
                    console.error('[DesignLab] Error applying template:', error);
                    showError('Failed to apply template');
                  }
                }}
                onClose={() => setShowTemplateLibrary(false)}
              />
            </div>
          </div>
        )}

        {/* 4. Canvas - 中央画布区域 */}
        <section className="dl-canvas" aria-label="Design canvas">
          {/* [2025-12-08] 左上浮层：Undo/Redo按钮 */}
          <div className="dl-canvas__floating-controls">
            <button
              className="dl-canvas__floating-btn"
              onClick={() => {
                undo();
                // [2025-12-08] 从store获取更新后的canvas并应用到fabric canvas
                const updatedSnapshot = getCurrentViewCanvas();
                if (fabricCanvasRef.current) {
                  snapshotToCanvas(updatedSnapshot, fabricCanvasRef.current);
                }
              }}
              aria-label="Undo"
              title="Undo"
              disabled={!canUndo}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 7v6h6" />
                <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
              </svg>
            </button>
            <button
              className="dl-canvas__floating-btn"
              onClick={() => {
                redo();
                // [2025-12-08] 从store获取更新后的canvas并应用到fabric canvas
                const updatedSnapshot = getCurrentViewCanvas();
                if (fabricCanvasRef.current) {
                  snapshotToCanvas(updatedSnapshot, fabricCanvasRef.current);
                }
              }}
              aria-label="Redo"
              title="Redo"
              disabled={!canRedo}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 7v6h-6" />
                <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
              </svg>
            </button>
          </div>
          {/* [2025-12-10 18:40:00] Canvas初始化错误显示 */}
          {canvasInitError && !canvasInitialized && (
            <CanvasLoadingError
              error={canvasInitError}
              onRetry={() => {
                setCanvasInitError(null);
                setCanvasInitialized(false);
                // 触发重新初始化（通过重新挂载或重新执行useEffect）
                window.location.reload();
              }}
              showDetails={process.env.NODE_ENV === 'development'}
            />
          )}
          
          {/* [2025-12-08] Zoom视图控制按钮 */}
          {currentView === 'zoom' && !canvasInitError && (
            <div className="dl-canvas__zoom-controls">
              <button
                className="dl-canvas__zoom-btn"
                onClick={handleZoomIn}
                aria-label="Zoom In"
                title="Zoom In"
                disabled={zoomLevel >= 3}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                  <line x1="11" y1="8" x2="11" y2="14" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
              </button>
              <button
                className="dl-canvas__zoom-btn"
                onClick={handleZoomOut}
                aria-label="Zoom Out"
                title="Zoom Out"
                disabled={zoomLevel <= 0.5}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
              </button>
              <button
                className="dl-canvas__zoom-btn"
                onClick={handleZoomReset}
                aria-label="Reset Zoom"
                title="Reset Zoom"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                  <path d="M3 21v-5h5" />
                </svg>
              </button>
              <span className="dl-canvas__zoom-level">{Math.round(zoomLevel * 100)}%</span>
            </div>
          )}
          {/* 产品预览区域 */}
          <div 
            className="dl-canvas__preview"
            onMouseDown={currentView === 'zoom' ? handleZoomMouseDown : undefined}
            onMouseMove={currentView === 'zoom' ? handleZoomMouseMove : undefined}
            onMouseUp={currentView === 'zoom' ? handleZoomMouseUp : undefined}
            onMouseLeave={currentView === 'zoom' ? handleZoomMouseUp : undefined}
            style={{ cursor: currentView === 'zoom' && isZoomDragging ? 'grabbing' : currentView === 'zoom' ? 'grab' : 'default' }}
          >
            <div className="dl-canvas__product">
              {/* [2025-01-30 22:35:00] Fabric.js 画布 */}
              {/* [2025-01-31 16:20:00] 移除 placeholder，直接显示画布，图片会在加载完成后自动显示 */}
              {/* [2025-12-10 18:40:00] 只在Canvas未初始化错误时显示Canvas元素 */}
              {!canvasInitError && (
                <canvas ref={canvasRef} className="dl-canvas__fabric" />
              )}
            </div>

            {/* 引导面板 - "What's next for you?" */}
            {showGuidePanel && (
              <div className="dl-guide-panel">
                <h3 className="dl-guide-panel__title">What&apos;s next for you?</h3>
                <div className="dl-guide-panel__actions">
                  <button
                    className="dl-guide-panel__action"
                    onClick={() => handleGuideAction('upload')}
                    aria-label="Upload"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span>Upload</span>
                  </button>
                  <button
                    className="dl-guide-panel__action"
                    onClick={() => handleGuideAction('text')}
                    aria-label="Add Text"
                  >
                    <span className="dl-guide-panel__text-icon">abc</span>
                    <span>Add Text</span>
                  </button>
                  <button
                    className="dl-guide-panel__action"
                    onClick={() => handleGuideAction('art')}
                    aria-label="Add Art"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    <span>Add Art</span>
                  </button>
                  <button
                    className="dl-guide-panel__action"
                    onClick={() => handleGuideAction('products')}
                    aria-label="Change Products"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <path d="M16 10a4 4 0 0 1-8 0" />
                    </svg>
                    <span>Change Products</span>
                  </button>
                </div>
                <p className="dl-guide-panel__hint">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  Drag & drop a file anywhere to upload
                </p>
              </div>
            )}
          </div>
        </section>

        {/* 5. Sidebar - 右侧视图切换面板 */}
        <aside className="dl-sidebar" aria-label="View options">
          <button
            className={`dl-sidebar__btn ${currentView === 'front' ? 'is-active' : ''}`}
            onClick={() => handleViewChange('front')}
            aria-label="Front view"
            aria-pressed={currentView === 'front'}
          >
            <div className="dl-sidebar__thumbnail">
              {productInfo?.baseImages?.front ? (
                <img 
                  src={getThumbnailImageUrl(productInfo.color || 'White', 'front')} 
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
              {productInfo?.baseImages?.back ? (
                <img 
                  src={getThumbnailImageUrl(productInfo.color || 'White', 'back')} 
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
            className={`dl-sidebar__btn ${currentView === 'zoom' ? 'is-active' : ''}`}
            onClick={() => handleViewChange('zoom')}
            aria-label="Zoom"
            aria-pressed={currentView === 'zoom'}
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

      {/* 5. Bottom Bar - 底部操作栏 */}
      <footer className="dl-bottom-bar" role="contentinfo">
        <div className="dl-bottom-bar__left">
          <button 
            className="dl-bottom-bar__add-products"
            onClick={() => {
              // [2025-12-07 15:30:00] 打开产品选择器（跳转到产品列表页面，带返回参数）
              if (typeof window !== 'undefined') {
                const currentUrl = new URL(window.location.href);
                const returnUrl = encodeURIComponent(currentUrl.pathname + currentUrl.search);
                window.location.href = `/products?returnToDesignLab=${returnUrl}`;
              }
            }}
          >
            + Add Products
          </button>
          <div className="dl-bottom-bar__product-info">
            <div className="dl-bottom-bar__product-thumb">
              <div className="dl-bottom-bar__product-thumb-placeholder">T</div>
            </div>
            {/* [2025-01-31 12:00:00] 根据 designlab-colors01.jpeg，优化底部 Product pill 的颜色显示 */}
            <div className="dl-bottom-bar__product-details">
              <div className="dl-bottom-bar__product-name">
                {productInfo?.productName || 'Gildan Softstyle Jersey T-shirt'}
              </div>
              <div className="dl-bottom-bar__product-links">
                <button
                  className="dl-bottom-bar__link"
                  onClick={() => {
                    // [2025-12-07 15:30:00] 打开产品选择器（跳转到产品列表页面，带返回参数）
                    if (typeof window !== 'undefined') {
                      const currentUrl = new URL(window.location.href);
                      const returnUrl = encodeURIComponent(currentUrl.pathname + currentUrl.search);
                      window.location.href = `/products?returnToDesignLab=${returnUrl}&replaceProduct=true`;
                    }
                  }}
                  type="button"
                >
                  Change Product
                </button>
                {productInfo?.color && (
                <span className="dl-bottom-bar__color">
                    <input type="checkbox" id="color-selected" checked readOnly />
                    <label htmlFor="color-selected">{productInfo.color}</label>
                </span>
                )}
                <button
                  className="dl-bottom-bar__link"
                  onClick={() => setShowColorModal(true)}
                  type="button"
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
            onClick={handleSaveDesign}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            Save | Share
          </button>
          {/* [2025-12-08] Save & Share 模态框 */}
          <SaveShareModal
            isOpen={showSaveShareModal}
            onClose={() => setShowSaveShareModal(false)}
            designId={currentDesignId}
            designName={designName}
            onSave={async () => {
              try {
                const savedDesignId = await handleSaveDesignConfirm();
                // 保存成功后，如果切换到share tab，自动加载分享链接
                if (savedDesignId) {
                  // 可以在这里自动切换到share tab，或者保持当前tab
                }
                setShowSaveShareModal(false);
              } catch (error) {
                // 错误已在handleSaveDesignConfirm中处理
                // 不关闭模态框，让用户重试
              }
            }}
            onShare={(shareUrl) => {
              console.log('[DesignLab] Design shared:', shareUrl);
              // [2025-12-08] 埋点：设计分享
              analytics.track('design_shared', {
                designId: currentDesignId,
                shareUrl: shareUrl,
              });
            }}
          />
          <button 
            className="dl-bottom-bar__btn dl-bottom-bar__btn--primary"
            onClick={handleGetPrice}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
            Get Price
          </button>
        </div>
      </footer>

      {/* 隐藏的文件输入（用于 Rail 按钮触发） */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/avif,image/svg+xml"  // [2025-01-30 20:35:00] 明确支持 AVIF 和 WebP 格式
        style={{ display: 'none' }}
        onChange={(e) => {
          // [2025-01-30 17:30:00] 文件上传处理逻辑
          const file = e.target.files?.[0];
          if (file) {
            handleFileUpload(file);
          }
          // [2025-01-30 17:30:00] 重置 input，允许重复选择同一文件
          e.target.value = '';
        }}
      />

      {/* [2025-01-30 19:30:00] Product Colors Modal */}
      <ProductColorsModal
        isOpen={showColorModal}
        onClose={() => setShowColorModal(false)}
        colors={productColors}
        selectedColor={productInfo?.color || null}
        onSelectColor={handleColorSelect}
        productName={productInfo?.productName}
      />

      {/* [2025-01-30 20:00:00] Names & Numbers Modal */}
      {/* [2025-01-31 13:50:00] 修复 React Hooks 错误：在父组件中使用条件渲染，确保组件始终挂载且 hooks 数量一致 */}
      {showNamesNumbersModal && (
        <NamesNumbersModal
          isOpen={showNamesNumbersModal}
          onClose={() => setShowNamesNumbersModal(false)}
          onAddToCanvas={handleAddNamesNumbers}
        />
      )}

      {/* [2025-12-06 12:30:00] Price Modal（旧版，保留兼容） */}
      <PriceModal
        isOpen={showPriceModal}
        onClose={() => {
          setShowPriceModal(false);
          setPriceError(null);
        }}
        quoteData={priceQuote}
        loading={priceLoading}
        error={priceError}
        quantity={quoteQuantity}
        onQuantityChange={handleQuantityChange}
      />
      
      {/* [2025-12-08] Get Price流程模态框（新版完整流程） */}
      <GetPriceFlowModal
        isOpen={showGetPriceFlowModal}
        onClose={() => setShowGetPriceFlowModal(false)}
        designId={currentDesignId}
        getQuoteData={async () => {
          // [2025-12-08] 计算报价所需的数据（使用的面和图层数）
          if (!fabricCanvasRef.current) {
            return { sidesUsed: ['front'], layerCount: 0 };
          }

          const canvas = fabricCanvasRef.current;
          const objects = canvas.getObjects().filter(obj => {
            const fabricObj = obj as fabric.Object;
            return fabricObj.name && fabricObj.name !== 'background';
          });

          // 确定使用的面（基于当前视图和画布对象）
          const sidesUsed: string[] = [];
          if (currentView === 'front' || objects.some(obj => (obj as any).name?.includes('front'))) {
            sidesUsed.push('front');
          }
          if (currentView === 'back' || objects.some(obj => (obj as any).name?.includes('back'))) {
            sidesUsed.push('back');
          }
          if (currentView === 'sleeve' || objects.some(obj => (obj as any).name?.includes('sleeve'))) {
            sidesUsed.push('sleeve');
          }
          // 如果没有对象，至少包含当前视图
          if (sidesUsed.length === 0 && currentView !== 'zoom') {
            sidesUsed.push(currentView);
          }

          const layerCount = objects.length;

          return { sidesUsed, layerCount };
        }}
        onAddToCart={async (orderData) => {
          // [2025-12-07 15:30:00] 处理加车逻辑
          try {
            if (!productInfo?.variantId) {
              throw new Error('Product variant not selected');
            }

            // [2025-12-07 15:30:00] 调用加车API
            // 注意：当前API只支持简单的 variantId + quantity + designId
            // 对于复杂的 sizeQuantities，我们需要在后端扩展API或在前端处理
            const response = await cartApi.addItem(
              productInfo.variantId,
              orderData.totalQuantity,
              orderData.designId || null
            );

            if (response.success) {
              // [2025-12-07 15:30:00] 埋点：加车成功
            analytics.track('add_to_cart_success', {
              designId: orderData.designId,
              totalQuantity: orderData.totalQuantity,
                sizeQuantities: orderData.sizeQuantities,
              });

              // [2025-12-07 15:30:00] 触发购物车更新事件
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('cart:updated'));
              }

              console.log('[DesignLab] Added to cart successfully:', response);
            } else {
              throw new Error('Failed to add to cart');
            }
          } catch (error: any) {
            console.error('[DesignLab] Failed to add to cart:', error);
            // [2025-12-07 15:30:00] 显示错误提示（不弹窗，使用toast）
            throw error;
          }
        }}
      />
      
      {/* [2025-12-10] 设计评论区域 */}
      {currentDesignId && (
        <div className="dl-comments-container">
          <DesignCommentSection
            designId={currentDesignId}
            onCommentAdded={() => {
              console.log('[DesignLab] Comment added');
            }}
          />
        </div>
      )}
      
    </div>
  );
};

export default DesignLabClient;
