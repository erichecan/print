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
import ToolPanel, { type ToolPanelType } from './components/ToolPanel';
import HomePanel from './components/panels/HomePanel';
import UploadPanel from './components/panels/UploadPanel';
import EditUploadPanel from './components/panels/EditUploadPanel';
import TextPanel from './components/panels/TextPanel';
import EditTextPanel from './components/panels/EditTextPanel';
import ArtPanel from './components/panels/ArtPanel';
import EditArtPanel from './components/panels/EditArtPanel';
import ProductColorsModal from './components/modals/ProductColorsModal';
import NamesNumbersModal from './components/modals/NamesNumbersModal';
import PriceModal from './components/modals/PriceModal';
import { designLabApi } from '@/lib/api';
import { getDefaultProductBaseImages, getThumbnailImageUrl, getDefaultProductImageUrl, getProductBaseImagesFromAPI } from '@/lib/customink-images';
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
  }, []);
  
  // [2025-01-30 14:00:00] 状态管理
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'front' | 'back' | 'sleeve' | 'zoom'>('front');
  const [showGuidePanel, setShowGuidePanel] = useState(false); // [2025-01-30 17:00:00] 默认隐藏，因为工具面板会显示
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false); // [2025-12-06 12:30:00] 模板库面板显示状态
  const [showPriceModal, setShowPriceModal] = useState(false); // [2025-12-06 12:30:00] 价格模态框显示状态
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
  const loadProductInfo = useCallback(async (variantId?: string) => {
    if (!variantId) {
      // 如果没有 variantId，使用默认值或从 URL 获取
      const urlVariantId = searchParams?.get('variantId');
      if (!urlVariantId) {
        console.log('[DesignLab] No variantId provided, using default product');
        // 可以设置一个默认产品
        return;
      }
      variantId = urlVariantId;
    }

    setLoadingProduct(true);
    try {
      const data = await productsApi.getByVariant(variantId);
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
      
      // [2025-01-30 19:30:00] 更新背景图片
      if (fabricCanvasRef.current) {
        loadBackgroundImage(currentView);
      }
    } catch (error) {
      console.error('[DesignLab] Error loading product info:', error);
    } finally {
      setLoadingProduct(false);
    }
  }, [searchParams, currentView, loadBackgroundImage]);

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
  const snapshotToCanvas = useCallback((snapshot: DesignCanvasSnapshot, canvas: fabric.Canvas) => {
    // 清除现有对象（保留背景）
    const objectsToRemove = canvas.getObjects().filter((obj: fabric.Object) => obj.name !== 'background');
    objectsToRemove.forEach((obj: fabric.Object) => canvas.remove(obj));
    
    // 恢复对象
    snapshot.objects.forEach((objData: any) => {
      fabric.util.enlivenObjects([objData], (objects: fabric.Object[]) => {
        objects.forEach(obj => {
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
  const handleToolClick = (tool: string) => {
    setActiveTool(activeTool === tool ? null : tool);
    setShowGuidePanel(false);
    
    // [2025-01-30 17:00:00] 根据工具类型切换工具面板
    switch (tool) {
      case 'upload':
        setToolPanelType('upload');
        // [2025-01-30 17:35:00] 不再直接触发文件选择，而是显示 Upload 面板
        break;
      case 'text':
        setToolPanelType('text');
        break;
      case 'art':
        setToolPanelType('art');
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
      alert('Canvas not initialized');
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
  const handleHomeAction = (action: 'upload' | 'text' | 'art' | 'products') => {
    if (action === 'products') {
      // TODO: 实现产品切换功能
      console.log('[DesignLab] Change products');
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
      alert('Canvas not initialized');
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
        alert('Failed to add art: ' + (error as Error).message);
      }
    };
    
    imgElement.onerror = () => {
      alert('Failed to load art image');
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
  const handleFileUpload = useCallback((file: File) => {
    console.log('[DesignLab] handleFileUpload called:', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      canvasInitialized: !!fabricCanvasRef.current
    });

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    if (!fabricCanvasRef.current) {
      console.error('[DesignLab] Canvas not initialized');
      alert('Canvas not initialized');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      console.log('[DesignLab] File read successfully, imageUrl length:', imageUrl?.length || 0);
      
      if (!imageUrl) {
        console.error('[DesignLab] Image URL is empty');
        alert('Failed to read file');
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
            
            // [2025-01-30 17:30:00] 同步到 store
            const snapshot = canvasToSnapshot(canvas);
            setCanvas(snapshot, { pushHistory: true });
            
            console.log('[DesignLab] Image upload completed successfully');
          } else {
            console.error('[DesignLab] Canvas is null after image creation');
          }
        } catch (error) {
          console.error('[DesignLab] Error creating Fabric image:', error);
          console.error('[DesignLab] Error stack:', (error as Error).stack);
          alert('Failed to add image: ' + (error as Error).message);
        }
      };
      
      imgElement.onerror = (error) => {
        console.error('[DesignLab] Image load error:', error);
        console.error('[DesignLab] Image URL (first 100 chars):', imageUrl.substring(0, 100));
        alert('Failed to load image. Please check the file format.');
      };
      
      imgElement.src = imageUrl;
    };
    
    reader.onerror = (error) => {
      console.error('[DesignLab] FileReader error:', error);
      alert('Failed to read file');
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
  const handleSaveDesign = useCallback(() => {
    if (fabricCanvasRef.current) {
      const snapshot = canvasToSnapshot(fabricCanvasRef.current);
      setCanvas(snapshot, { pushHistory: true });
      // TODO: 调用保存 API
      console.log('[DesignLab] Design saved');
    }
  }, [canvasToSnapshot, setCanvas]);

  // [2025-12-06 12:30:00] Get Price 处理
  const handleGetPrice = useCallback(async () => {
    if (!fabricCanvasRef.current || !productInfo) {
      console.warn('[DesignLab] Cannot get price: canvas or productInfo not available');
      alert('Please ensure the canvas is loaded and a product is selected.');
      return;
    }

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

  // [2025-01-30 14:00:00] 视图切换处理
  const handleViewChange = (view: 'front' | 'back' | 'sleeve' | 'zoom') => {
    setCurrentView(view);
    if (view !== 'zoom') {
      setView(view);
    }
  };

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
          stateful: true
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
        fabricCanvas.on('object:added', handleObjectAdded);
        fabricCanvas.on('object:removed', handleObjectRemoved);

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
  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    
    const view = currentView;
    if (view === 'zoom') return; // Zoom 视图不加载画布数据
    
    // [2025-01-30 16:30:00] 加载背景图片
    loadBackgroundImage(view);
    
    // [2025-01-30 16:30:00] 加载画布数据
    const viewCanvas = viewCanvases[view];
    if (viewCanvas) {
      snapshotToCanvas(viewCanvas, fabricCanvasRef.current);
    }
  }, [currentView, viewCanvases, snapshotToCanvas, loadBackgroundImage]);

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
            <a href="tel:+1234567890" className="dl-header__link" aria-label="Phone">
              📞 1-800-000-0000
            </a>
            <button className="dl-header__btn" aria-label="Chat">Chat</button>
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
        </ToolPanel>

        {/* 4. Canvas - 中央画布区域 */}
        <section className="dl-canvas" aria-label="Design canvas">
          {/* 产品预览区域 */}
          <div className="dl-canvas__preview">
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
          <button className="dl-bottom-bar__add-products">+ Add Products</button>
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
                <a href="#" className="dl-bottom-bar__link">Change Product</a>
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
          <button className="dl-bottom-bar__btn dl-bottom-bar__btn--secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            Save | Share
          </button>
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

      {/* [2025-12-06 12:30:00] Price Modal */}
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
    </div>
  );
};

export default DesignLabClient;
