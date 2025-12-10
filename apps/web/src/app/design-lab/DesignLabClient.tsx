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
import { useSearchParams } from 'next/navigation';
// [2025-01-30 21:45:00] 修复 fabric.js 导入：在 Next.js 中使用动态导入
import type { fabric } from 'fabric';
import { useDesignLabStore } from '@/contexts/designLabStore';
import { productsApi } from '@/lib/api';
import type { DesignCanvasSnapshot } from '@/lib/api';
import { useToast } from '@/hooks/useToast'; // [2025-12-08] 引入Toast
import ToolPanel, { type ToolPanelType } from './components/ToolPanel';
import HomePanel from './components/panels/HomePanel';
import UploadPanel from './components/panels/UploadPanel';
import EditUploadPanel from './components/panels/EditUploadPanel';
import TextPanel from './components/panels/TextPanel';
import EditTextPanel from './components/panels/EditTextPanel';
import ArtPanel from './components/panels/ArtPanel';
import EditArtPanel from './components/panels/EditArtPanel';
import LayerManagementPanel from './components/panels/LayerManagementPanel';
import ProductColorsModal from './components/modals/ProductColorsModal';
import NamesNumbersModal from './components/modals/NamesNumbersModal';
import PriceModal from './components/modals/PriceModal';
import UploadRatingModal from './components/modals/UploadRatingModal';
import SaveShareModal from './components/modals/SaveShareModal';
import GetPriceFlowModal from './components/modals/GetPriceFlowModal';
import { designLabApi, cartApi } from '@/lib/api';
import { getDefaultProductBaseImages, getThumbnailImageUrl, getDefaultProductImageUrl, getProductBaseImagesFromAPI } from '@/lib/customink-images';
import { analytics } from '@/lib/analytics';
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

const DesignLabClient: React.FC = () => {
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
  // [2025-01-31 13:00:00] 根据 designlab-index.jpeg，添加画布初始化状态跟踪
  const [canvasInitialized, setCanvasInitialized] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const backgroundImageRef = useRef<fabric.Image | null>(null);
  // [2025-01-30 22:20:00] 使用 ref 跟踪当前面板类型，避免闭包问题
  const toolPanelTypeRef = useRef<ToolPanelType>('home');
  // [2025-01-31 16:30:00] 使用 ref 跟踪已加载的背景图片，避免重复加载和无限循环
  const backgroundImageLoadedRef = useRef<string>('');
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
    getCurrentViewCanvas
  } = useDesignLabStore();
  
  // [2025-01-30 16:30:00] 画布尺寸常量
  const CANVAS_WIDTH = 1000;
  const CANVAS_HEIGHT = 1200;

  // [2025-01-30 16:30:00] 加载产品背景图片
  // [2025-01-30 19:30:00] 更新为使用实际产品图片
  // [2025-01-30 21:25:00] 移到 loadProductInfo 之前，避免初始化顺序问题
  // [2025-01-30 21:35:00] 支持 zoom 视图（虽然不会加载背景）
  // [2025-01-31 14:00:00] 加载占位图片的辅助函数，确保至少显示一个图片
  // [2025-01-31 16:00:00] 修复：添加错误处理，如果占位图加载失败，创建纯色矩形作为备用方案
  const loadFallbackImage = useCallback((viewKey: 'front' | 'back' | 'sleeve', canvas: fabric.Canvas) => {
    if (!canvas) return;
    
    // [2025-01-31 16:00:00] 创建一个简单的纯色矩形作为备用背景，避免依赖外部图片服务
    const createSolidColorBackground = () => {
      // 移除旧背景
      if (backgroundImageRef.current) {
        canvas.remove(backgroundImageRef.current);
        backgroundImageRef.current = null;
      }
      
      // 创建一个简单的矩形作为背景
      const targetWidth = CANVAS_WIDTH * 0.65;
      const targetHeight = CANVAS_HEIGHT * 0.75;
      const left = CANVAS_WIDTH / 2 - targetWidth / 2;
      const top = CANVAS_HEIGHT / 2 - targetHeight / 2;
      
      // 使用浅灰色矩形作为占位背景
      const rect = new fabric.Rect({
        left,
        top,
        width: targetWidth,
        height: targetHeight,
        fill: '#f0f0f0',
        stroke: '#d0d0d0',
        strokeWidth: 2,
        selectable: false,
        evented: false,
        excludeFromExport: true,
        name: 'background',
        originX: 'left',
        originY: 'top'
      });
      
      canvas.add(rect);
      canvas.sendToBack(rect);
      backgroundImageRef.current = rect as any; // 类型转换，因为 ref 是 fabric.Image
      canvas.renderAll();
      console.log('[DesignLab] Created solid color background as fallback');
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
        
        // 移除旧背景
        if (backgroundImageRef.current) {
          canvas.remove(backgroundImageRef.current);
          backgroundImageRef.current = null;
        }
        
        // 设置图片属性
        fabricImg.set({
          selectable: false,
          evented: false,
          excludeFromExport: true,
          name: 'background',
          originX: 'left',
          originY: 'top'
        });
        
        // 缩放以适应画布
        const targetWidth = CANVAS_WIDTH * 0.65;
        const targetHeight = CANVAS_HEIGHT * 0.75;
        const scaleX = targetWidth / (fabricImg.width || 1);
        const scaleY = targetHeight / (fabricImg.height || 1);
        const scale = Math.min(scaleX, scaleY);
        fabricImg.scale(scale);
        
        // 居中
        const scaledWidth = (fabricImg.width || 0) * scale;
        const scaledHeight = (fabricImg.height || 0) * scale;
        const left = CANVAS_WIDTH / 2 - scaledWidth / 2;
        const top = CANVAS_HEIGHT / 2 - scaledHeight / 2;
        
        fabricImg.set({ left, top });
        fabricImg.setCoords();
        
        canvas.add(fabricImg);
        canvas.sendToBack(fabricImg);
        backgroundImageRef.current = fabricImg;
        canvas.renderAll();
        console.log('[DesignLab] Fallback placeholder image loaded successfully');
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
  const loadBackgroundImage = useCallback((view: 'front' | 'back' | 'sleeve' | 'zoom') => {
    if (view === 'zoom') {
      console.log('[DesignLab] Zoom view, skipping background image load');
      return; // Zoom 视图不加载背景
    }
    if (!fabricCanvasRef.current) {
      console.warn('[DesignLab] Cannot load background image: canvas not initialized');
      return;
    }

    const canvas = fabricCanvasRef.current;
    
    // [2025-01-31 16:55:00] 检查是否正在加载，避免重复加载
    const imageKey = `${view}-${productInfoRef.current?.color || 'White'}-${productInfoRef.current?.baseImages?.[view] || ''}`;
    if (backgroundImageLoadedRef.current === imageKey && backgroundImageRef.current) {
      console.log('[DesignLab] Background image already loaded for this view and color, skipping:', imageKey);
      return;
    }
    
    // [2025-01-30 16:30:00] 移除旧背景
    if (backgroundImageRef.current) {
      console.log('[DesignLab] Removing old background image');
      canvas.remove(backgroundImageRef.current);
      backgroundImageRef.current = null;
    }

    // [2025-01-30 19:30:00] 使用产品图片或占位图片
    // [2025-01-30 23:55:00] 优先使用 Custom Ink 的真实图片 URL
    // [2025-01-30 23:55:00] 支持从 API 动态获取图片 URL
    // [2025-01-31 15:30:00] 确保即使 productInfo 为空也能显示默认图片
    // [2025-01-31 16:30:00] 修复：使用 ref 访问最新的 productInfo，避免依赖导致无限循环
    const viewKey = view as 'front' | 'back' | 'sleeve'; // 类型断言，因为已经排除了 zoom
    const currentProductInfo = productInfoRef.current;
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
        fabricImg.set({
          selectable: false,
          evented: false,
          excludeFromExport: true,
          name: 'background',
          originX: 'left',
          originY: 'top'
        });
        
        // [2025-01-30 16:30:00] 产品图片占据画布中间约 65% 宽、75% 高的区域
        const targetWidth = CANVAS_WIDTH * 0.65;
        const targetHeight = CANVAS_HEIGHT * 0.75;
        
        // [2025-01-30 16:30:00] 计算缩放比例，保持宽高比
        const scaleX = targetWidth / (fabricImg.width || 1);
        const scaleY = targetHeight / (fabricImg.height || 1);
        const scale = Math.min(scaleX, scaleY);
        fabricImg.scale(scale);
        
        // [2025-01-30 16:30:00] 居中图片
        const scaledWidth = (fabricImg.width || 0) * scale;
        const scaledHeight = (fabricImg.height || 0) * scale;
        const left = CANVAS_WIDTH / 2 - scaledWidth / 2;
        const top = CANVAS_HEIGHT / 2 - scaledHeight / 2;
        
        fabricImg.set({ left, top });
        fabricImg.setCoords();
        
        // [2025-01-30 16:30:00] 移除旧背景
        if (backgroundImageRef.current) {
          canvas.remove(backgroundImageRef.current);
          backgroundImageRef.current = null;
        }
        
        canvas.add(fabricImg);
        
        // [2025-01-30 16:30:00] 移动到最底层，确保所有功能（上传图片、文字、art）都能在底图上操作
        try {
          canvas.sendToBack(fabricImg);
        } catch (e) {
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
        console.log('[DesignLab] Background image added to canvas successfully, marked as loaded:', currentImageKey);
        canvas.renderAll();
        console.log('[DesignLab] Background image added to canvas successfully, all features can work on this base image');
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
      console.log('[DesignLab] Native Image loaded successfully, creating Fabric Image');
      try {
        const fabricImg = new fabric.Image(imgElement);
        console.log('[DesignLab] Fabric Image created, calling onImageLoaded');
        onImageLoaded(fabricImg);
      } catch (error) {
        console.error('[DesignLab] Error creating Fabric Image from native Image:', error);
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
  const snapshotToCanvas = useCallback((snapshot: DesignCanvasSnapshot, canvas: fabric.Canvas) => {
    // 清除现有对象（保留背景）
    const objectsToRemove = canvas.getObjects().filter((obj: fabric.Object) => obj.name !== 'background');
    objectsToRemove.forEach((obj: fabric.Object) => canvas.remove(obj));
    
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
  useEffect(() => {
    if (fabricCanvasRef.current && canvasInitialized && productInfo && currentView !== 'zoom') {
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
            const textObj = new fabric.IText(textData.text, {
              left: CANVAS_WIDTH / 2,
              top: CANVAS_HEIGHT / 2 + (textIndex * 60),
              fontSize: textData.fontSize,
              fontFamily: 'Arial',
              fill: textData.color,
              fontWeight: 'bold',
              name: `${textData.type}_${timestamp}_${textData.index}_${textIndex}`,
              originX: 'center',
              originY: 'center',
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
  const handleHomeAction = (action: 'upload' | 'text' | 'art' | 'products' | 'layers') => {
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
  const handleAddText = useCallback((text: string) => {
    if (!fabricCanvasRef.current) {
      alert('Canvas not initialized');
      return;
    }

    try {
      // [2025-01-31 01:00:00] 设置标志，防止选择清除事件在添加对象后立即触发
      isAddingObjectRef.current = true;
      
      // [2025-01-30 17:50:00] 创建 Fabric IText 对象
      const textObj = new fabric.IText(text, {
        left: CANVAS_WIDTH / 2,
        top: CANVAS_HEIGHT / 2,
        fontSize: 48,
        fontFamily: 'Arial',
        fill: '#000000',
        name: `text_${Date.now()}`,
        originX: 'center',
        originY: 'center'
      });
      
      const canvas = fabricCanvasRef.current;
      
      // [2025-12-08 23:00:00] 为文本对象添加删除控件
      if (canvas && (canvas as any).deleteControl) {
        textObj.controls = textObj.controls || {};
        textObj.controls.deleteControl = (canvas as any).deleteControl;
      }
      
      // [2025-01-30 22:15:00] 先添加对象到画布
      canvas.add(textObj);
      
      // [2025-01-30 22:25:00] 设置对象并选中，这会触发 selection:created 事件
      canvas.setActiveObject(textObj);
      canvas.renderAll();
      
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
  const handleAddArt = useCallback((artUrl: string, artName: string) => {
    if (!fabricCanvasRef.current) {
      showErrorToast('Canvas not initialized. Please wait for the design lab to load.');
      return;
    }

    // [2025-01-30 18:10:00] 使用原生 Image 对象加载图片
    const imgElement = new Image();
    imgElement.crossOrigin = 'anonymous';
    
    imgElement.onload = () => {
      try {
        // [2025-01-30 18:10:00] 创建 Fabric Image 对象
        const fabricImage = new fabric.Image(imgElement);
        
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
          name: `art_${Date.now()}` // [2025-01-30 18:10:00] 使用 art_ 前缀标识艺术素材
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
    
    imgElement.onerror = () => {
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

    // [2025-12-08] 文件格式验证
    if (!file.type.startsWith('image/')) {
      showErrorToast('Please upload an image file (JPG, PNG, GIF, etc.)');
      return;
    }

    // [2025-12-08] 文件大小验证（20 MB = 20 * 1024 * 1024 bytes）
    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
    if (file.size > MAX_FILE_SIZE) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      showErrorToast(`File size (${fileSizeMB} MB) exceeds the maximum limit of 20 MB. Please choose a smaller file.`);
      return;
    }

    // [2025-12-08] 文件类型验证（只允许常见图片格式）
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      showErrorToast(`File type "${file.type}" is not supported. Please upload JPG, PNG, GIF, WebP, or SVG files.`);
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
    reader.onload = (e) => {
      try {
        const imageUrl = e.target?.result as string;
      console.log('[DesignLab] File read successfully, imageUrl length:', imageUrl?.length || 0);
        
        // [2025-12-07 15:30:00] 检查分辨率（异步，不阻塞上传）
        if (file.type !== 'image/svg+xml') {
          checkImageResolution(imageUrl);
        }
      
      if (!imageUrl) {
        console.error('[DesignLab] Image URL is empty');
        showErrorToast('Failed to read the file. Please try again or choose a different file.');
        return;
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
          // [2025-01-30 17:30:00] 创建 Fabric Image 对象
          const fabricImage = new fabric.Image(imgElement, {
            // [2025-01-30 22:30:00] 确保图片对象是可选择和可编辑的
            selectable: true,
            evented: true,
            hasControls: true,
            hasBorders: true,
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

            canvas.add(fabricImage);
            canvas.setActiveObject(fabricImage);
            canvas.renderAll();
            
            console.log('[DesignLab] Image added to canvas, object count:', canvas.getObjects().length);
            
            // [2025-01-30 17:30:00] 自动切换到 Edit Upload 面板
            setSelectedImage(fabricImage);
            setToolPanelType('edit-upload');
            
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
            
            // [2025-01-30 17:30:00] 同步到 store
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
          } else {
            console.error('[DesignLab] Canvas is null after image creation');
            showErrorToast('Failed to add image to canvas. Please try again.');
          }
        } catch (error) {
          console.error('[DesignLab] Error creating Fabric image:', error);
          console.error('[DesignLab] Error stack:', (error as Error).stack);
          showErrorToast(`Failed to process the image: ${(error as Error).message}. Please try a different file.`);
        }
      };
      
      imgElement.onerror = (error) => {
        console.error('[DesignLab] Image load error:', error);
        console.error('[DesignLab] Image URL (first 100 chars):', imageUrl.substring(0, 100));
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
        console.error('[DesignLab] Error in reader.onload:', error);
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
        if (file.type.startsWith('image/')) {
          handleFileUpload(file);
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

  // [2025-01-30 16:30:00] 初始化 Fabric.js 画布
  useEffect(() => {
    if (!canvasRef.current) {
      console.warn('[DesignLab] Canvas ref not available');
      return;
    }

    const canvasElement = canvasRef.current;
    let isMounted = true;

    // Dynamically import fabric
    import('fabric').then(({ fabric }) => {
      if (!isMounted || !canvasRef.current) return;

      try {
        // [2025-01-30 16:30:00] 初始化 Fabric Canvas
        const fabricCanvas = new fabric.Canvas(canvasElement, {
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          backgroundColor: 'transparent',
          preserveObjectStacking: true,
          selection: true,
          stateful: true,
          // [2025-12-08 23:00:00] 启用等比缩放和从中心缩放
          uniformScaling: false, // 通过Shift键启用
          centeredScaling: false, // 通过Alt键启用
        });
        
        console.log('[DesignLab] Fabric canvas initialized successfully');

        // [2025-01-30 16:30:00] 高 DPI 适配
        const devicePixelRatio = window.devicePixelRatio || 1;
        const scale = devicePixelRatio;
        
        fabricCanvas.setWidth(CANVAS_WIDTH * scale);
        fabricCanvas.setHeight(CANVAS_HEIGHT * scale);
        
        const canvasEl = fabricCanvas.getElement();
        if (canvasEl) {
          canvasEl.style.width = CANVAS_WIDTH + 'px';
          canvasEl.style.height = CANVAS_HEIGHT + 'px';
        }
        
        fabricCanvas.setZoom(1);
        fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);

        // [2025-01-30 16:30:00] 设置对象默认属性
        fabric.Object.prototype.set({
          borderColor: '#3b82f6',
          cornerColor: '#3b82f6',
          cornerSize: 10,
          transparentCorners: false,
          borderScaleFactor: 2,
          cornerStyle: 'circle',
          rotatingPointOffset: 40
        });

        // [2025-12-08 23:00:00] 创建右上角删除按钮控件
        const deleteControl = new fabric.Control({
          x: 0.5,
          y: -0.5,
          offsetX: 0,
          offsetY: -20,
          actionHandler: (eventData, transformData, x, y) => {
            const target = transformData.target;
            if (target && fabricCanvas) {
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

        const handleSelection = () => {
          const activeObject = fabricCanvas.getActiveObject();
          if (activeObject) {
            isAddingObjectRef.current = false;
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
          if (isAddingObjectRef.current) {
            console.log('[DesignLab] Selection cleared but object is being added, ignoring');
            return;
          }
          const activeObject = fabricCanvas.getActiveObject();
          if (activeObject) {
            console.log('[DesignLab] Selection cleared but active object exists, ignoring');
            return;
          }
          const currentPanel = toolPanelTypeRef.current;
          if (currentPanel === 'edit-text' || currentPanel === 'edit-upload' || currentPanel === 'edit-art') {
            const hasSelectedText = selectedText !== null;
            const hasSelectedImage = selectedImage !== null;
            const hasSelectedArt = selectedArt !== null;
            if (hasSelectedText || hasSelectedImage || hasSelectedArt) {
              console.log('[DesignLab] Selection cleared but edit panel has selected object, keeping panel');
              return;
            }
          }
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

        const handleObjectRemoved = () => {
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

        fabricCanvasRef.current = fabricCanvas;
        console.log('[DesignLab] Event listeners attached, canvas ready');

        const currentViewCanvas = getCurrentViewCanvas();
        if (currentViewCanvas && currentViewCanvas.objects.length > 0) {
          snapshotToCanvas(currentViewCanvas, fabricCanvas);
        }

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

        setCanvasInitialized(true);
        console.log('[DesignLab] Fabric.js canvas initialized');

      } catch (error) {
        console.error('[DesignLab] Error initializing Fabric.js canvas:', error);
        alert('Failed to initialize design canvas. Please refresh the page.');
      }
    });

    return () => {
      isMounted = false;
      if (fabricCanvasRef.current) {
        try {
          console.log('[DesignLab] Cleaning up Fabric.js canvas');
          // Remove all event listeners
          fabricCanvasRef.current.off();
          fabricCanvasRef.current.dispose();
        } catch (error) {
          console.error('[DesignLab] Error cleaning up canvas:', error);
        }
        fabricCanvasRef.current = null;
        setCanvasInitialized(false);
      }
    };
  }, [canvasToSnapshot, snapshotToCanvas, setCanvas, getCurrentViewCanvas]);

  // [2025-01-31 13:00:00] 根据 designlab-index.jpeg，使用 canvasInitialized 状态标志确保在画布和产品信息都准备好后加载背景图片
  // [2025-01-31 13:45:00] 修复：productInfo 现在总是非 null，移除多余的 null 检查
  // [2025-01-31 15:30:00] 确保首页能够有默认的图片展示，所有功能能够在这张底图上进行
  // [2025-01-31 16:30:00] 修复：移除 loadBackgroundImage 和 productInfo 从依赖数组，避免无限循环
  // [2025-01-31 16:55:00] 修复：loadBackgroundImage 内部已经检查重复加载，这里不需要再次检查
  useEffect(() => {
    if (canvasInitialized && currentView !== 'zoom') {
      console.log('[DesignLab] Canvas and productInfo ready, loading background image for view:', currentView);
      // [2025-01-31 15:30:00] 确保立即加载默认底图，不等待异步操作
      // [2025-01-31 16:55:00] loadBackgroundImage 内部会检查是否已加载，避免重复
      loadBackgroundImage(currentView);
    }
  }, [canvasInitialized, currentView, loadBackgroundImage]); // [2025-01-31 16:55:00] 添加 loadBackgroundImage 到依赖，但内部有重复检查

  // [2025-01-30 16:30:00] 视图切换时更新画布
  // [2025-12-08 23:30:00] 更新Zoom视图处理
  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    
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
            <Link href="/" className="dl-header__logo">
              Logo
            </Link>
            <nav className="dl-header__breadcrumb" aria-label="Breadcrumb">
              {/* [2025-01-30 23:15:00] 修复：My Designs 按钮样式对齐 Custom Ink - element-1 */}
              <button 
                className="dl-header__breadcrumb-link dl-header__breadcrumb-link--button"
                onClick={() => window.location.href = '/products'}
                type="button"
              >
                My Designs
              </button>
              <span className="dl-header__breadcrumb-separator"> &gt; </span>
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
          {/* [2025-12-08] Zoom视图控制按钮 */}
          {currentView === 'zoom' && (
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
              <canvas ref={canvasRef} className="dl-canvas__fabric" />
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
        accept="image/*"
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
    </div>
  );
};

export default DesignLabClient;
