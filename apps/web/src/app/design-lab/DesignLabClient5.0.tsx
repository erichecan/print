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
import type { fabric } from 'fabric'; // [2025-12-20 03:20:00] 5.0 版本：步骤2 - 导入 Fabric.js 类型
import './design-lab.css';

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
  const [productInfo, setProductInfo] = useState<{
    color: string;
    baseImages: {
      front: string;
      back: string;
      sleeve: string;
    };
    productId?: string;
    colorId?: string;
  }>(() => {
    // [2025-12-20 03:30:00] 使用函数初始化，确保默认图片在组件创建时就设置好
    const defaultImages = getDefaultProductBaseImages('White');
    console.log('[DesignLab 5.0] 初始化默认商品信息（白色 T 恤）:', defaultImages);
    return {
      color: 'White',
      baseImages: defaultImages,
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

    // [2025-12-20 03:30:00] 如果只有 colorId，根据 colorId 更新颜色
    if (colorId && !initialProductData) {
      // 简单实现：假设 colorId 对应的颜色名称（后续可以从 API 获取映射）
      const colorName = 'White'; // 默认值，TODO: 从 API 获取 colorId 到 colorName 的映射
      
      console.log('[DesignLab 5.0] 功能2 - 根据 colorId 更新颜色:', { colorId, colorName });
      const baseImages = getDefaultProductBaseImages(colorName);
      
      setProductInfo(prev => ({
        ...prev,
        color: colorName,
        baseImages,
        colorId,
      }));
      return;
    }

    // [2025-12-20 03:30:00] 如果有 productId，尝试从 API 获取图片
    if (productId && !initialProductData) {
      const colorName = productInfo.color || 'White';
      
      console.log('[DesignLab 5.0] 功能2 - 尝试从 API 获取商品图片:', { productId, colorName });
      
      getProductBaseImagesFromAPI(colorName, productId)
        .then(apiImages => {
          if (apiImages) {
            console.log('[DesignLab 5.0] 功能2 - API 返回图片:', apiImages);
            setProductInfo(prev => ({
              ...prev,
              baseImages: apiImages,
              productId,
            }));
          } else {
            console.log('[DesignLab 5.0] 功能2 - API 未返回图片，使用默认白色 T 恤图片');
            // [2025-12-20 03:30:00] API 失败时回退到默认图片
            const defaultImages = getDefaultProductBaseImages('White');
            setProductInfo(prev => ({
              ...prev,
              baseImages: defaultImages,
              productId,
            }));
          }
        })
        .catch(error => {
          console.warn('[DesignLab 5.0] 功能2 - API 获取失败，使用默认白色 T 恤图片:', error);
          // [2025-12-20 03:30:00] API 错误时回退到默认图片
          const defaultImages = getDefaultProductBaseImages('White');
          setProductInfo(prev => ({
            ...prev,
            baseImages: defaultImages,
            productId,
          }));
        });
      return;
    }

    // [2025-12-20 03:30:00] 如果没有 URL 参数（用户直接从导航进入），使用默认白色 T 恤
    if (!productId && !colorId && !variantId && !initialProductData) {
      console.log('[DesignLab 5.0] 功能2 - 没有 URL 参数，使用默认白色 T 恤图片');
      const defaultImages = getDefaultProductBaseImages('White');
      
      // [2025-12-20 03:30:00] 只在 productInfo 还没有设置过默认图片时才更新
      if (!productInfo.baseImages || Object.keys(productInfo.baseImages).length === 0) {
        setProductInfo(prev => ({
          ...prev,
          color: 'White',
          baseImages: defaultImages,
        }));
      }
    }
  }, [searchParams, initialProductData]); // [2025-12-20 03:05:00] 依赖 searchParams 和 initialProductData

  // [2025-12-20 02:50:00] 5.0 版本：添加调试日志，确保元素正确渲染
  const railRef = useRef<HTMLElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); // [2025-12-20 03:20:00] 步骤2 - 改为 HTMLCanvasElement
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null); // [2025-12-20 03:20:00] 步骤2 - Fabric canvas ref
  const fabricRef = useRef<typeof fabric | null>(null); // [2025-12-20 03:20:00] 步骤2 - Fabric 对象 ref
  const [canvasInitialized, setCanvasInitialized] = useState(false); // [2025-12-20 03:50:00] 用于触发图片加载的 state

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
  type ToolPanelType = 'home' | 'upload' | 'text' | 'art' | null;
  const [toolPanelType, setToolPanelType] = useState<ToolPanelType>('home');
  const [activeTool, setActiveTool] = useState<string | null>(null);

  // [2025-12-20 03:00:00] 5.0 版本：功能叠加 - 视图切换功能
  const handleViewChange = (view: 'front' | 'back' | 'sleeve') => {
    console.log('[DesignLab 5.0] 视图切换:', { from: currentView, to: view }); // [2025-12-20 03:00:00] 添加调试日志
    setCurrentView(view);
  };

  // [2025-12-20 03:10:00] 5.0 版本：功能3 - Rail 按钮点击处理
  const handleToolClick = (tool: 'upload' | 'text' | 'art') => {
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
  };

  // [2025-12-20 03:20:00] 5.0 版本：步骤2 - Canvas 尺寸常量
  const CANVAS_WIDTH = 4000;
  const CANVAS_HEIGHT = 4800;

  // [2025-12-20 03:20:00] 5.0 版本：步骤2 - 添加商品图片到 canvas 的辅助函数
  // [2025-12-20 03:25:00] 修复：添加更详细的日志和错误处理
  const addProductImageToCanvas = (imageUrl: string) => {
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
    
    // [2025-12-20 03:20:00] 移除旧的商品图片
    const oldProductImage = canvas.getObjects().find((obj: any) => obj.name === 'product-image-base');
    if (oldProductImage) {
      canvas.remove(oldProductImage);
    }
    
    if (fabric.Image) {
      console.log('[DesignLab 5.0] Loading image from URL...');
      fabric.Image.fromURL(imageUrl, (img) => {
        if (!fabricCanvasRef.current) {
          console.warn('[DesignLab 5.0] Fabric image loaded but canvas is not available');
          return;
        }
        
        console.log('[DesignLab 5.0] Fabric image loaded:', {
          naturalWidth: img.width,
          naturalHeight: img.height,
          canvasWidth: fabricCanvasRef.current.width,
          canvasHeight: fabricCanvasRef.current.height,
        });
        
        // [2025-12-20 03:40:00] 缩放图片以适应 canvas（contain 模式）
        const scale = Math.min(
          CANVAS_WIDTH / (img.width || 1),
          CANVAS_HEIGHT / (img.height || 1),
          1 // 不超过原始尺寸
        );
        
        console.log('[DesignLab 5.0] Calculating scale:', {
          canvasSize: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
          imageSize: { width: img.width, height: img.height },
          calculatedScale: scale,
        });
        
        img.set({
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

        console.log('[DesignLab 5.0] Adding image to canvas...');
        fabricCanvasRef.current.add(img);
        fabricCanvasRef.current.sendToBack(img); // 确保在底层
        
        // [2025-12-20 03:40:00] 强制渲染，确保图片显示
        fabricCanvasRef.current.renderAll();
        
        // [2025-12-20 03:40:00] 验证图片是否真的被添加到 canvas
        const allObjects = fabricCanvasRef.current.getObjects();
        const addedImage = allObjects.find((obj: any) => obj.name === 'product-image-base');
        
        console.log('[DesignLab 5.0] Product image added to canvas:', {
          imageUrl: imageUrl.substring(0, 50) + '...',
          position: { left: img.left, top: img.top },
          scale: { scaleX: img.scaleX, scaleY: img.scaleY },
          size: { width: img.width, height: img.height },
          addedToCanvas: !!addedImage,
          totalObjects: allObjects.length,
        });
        
        if (!addedImage) {
          console.error('[DesignLab 5.0] ❌ Image was not found on canvas after adding!');
        }
      }, {
        crossOrigin: 'anonymous',
      });
    } else {
      console.error('[DesignLab 5.0] fabric.Image is not available!');
    }
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
        if (!isMounted || !canvasRef.current) return;

        // [2025-12-20 03:20:00] 获取 fabric 对象
        const fabric = fabricModule.fabric || fabricModule.default || fabricModule;
        
        if (!fabric || typeof fabric.Canvas !== 'function') {
          throw new Error('Fabric.js module is not properly loaded.');
        }

        // [2025-12-20 03:20:00] 存储 fabric 对象
        fabricRef.current = fabric;

        // [2025-12-20 03:20:00] 创建 Fabric Canvas
        // [2025-12-20 03:40:00] 修复：Fabric.js 需要正确的容器尺寸来缩放显示
        const fabricCanvas = new fabric.Canvas(canvasElement, {
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          backgroundColor: 'transparent',
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

        console.log('[DesignLab 5.0] Fabric canvas initialized:', {
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
        });

        // [2025-12-20 03:50:00] 修复：标记 Canvas 已初始化，触发图片加载 useEffect
        // [2025-12-20 03:55:00] 修复：在异步函数中，需要确保 isMounted 为 true 时才设置 state
        if (isMounted) {
          console.log('[DesignLab 5.0] Setting canvasInitialized to true');
          setCanvasInitialized(true);
        } else {
          console.warn('[DesignLab 5.0] Component unmounted, skipping setCanvasInitialized');
        }

      } catch (error) {
        console.error('[DesignLab 5.0] Failed to initialize Fabric canvas:', error);
      }
    };

    initCanvas();

    return () => {
      isMounted = false;
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, []); // [2025-12-20 03:20:00] 只在组件挂载时初始化一次

  // [2025-12-20 03:20:00] 步骤2 - 当视图切换或产品信息改变时更新商品图片
  // [2025-12-20 03:50:00] 修复：添加 canvasInitialized state 作为依赖，确保 Canvas 初始化完成后触发加载
  useEffect(() => {
    // [2025-12-20 03:50:00] 检查 Canvas 是否已初始化（包括 canvasInitialized state）
    // [2025-12-20 03:55:00] 修复：如果 canvasInitialized 为 false，但 Canvas 实际上已经初始化，也尝试加载
    const canvasReady = !!fabricCanvasRef.current && !!fabricRef.current;
    if (!canvasReady || !canvasInitialized) {
      console.log('[DesignLab 5.0] Canvas not ready, waiting...', {
        fabricCanvas: !!fabricCanvasRef.current,
        fabric: !!fabricRef.current,
        canvasInitialized,
        canvasReady,
      });
      return;
    }
    
    // [2025-12-20 03:25:00] 检查 productInfo 是否有有效的图片 URL
    const imageUrl = productInfo.baseImages?.[currentView];
    if (!imageUrl) {
      console.log('[DesignLab 5.0] Product image URL not available:', {
        currentView,
        baseImages: productInfo.baseImages,
        hasBaseImages: !!productInfo.baseImages,
      });
      return;
    }
    
    console.log('[DesignLab 5.0] Loading product image:', {
      currentView,
      imageUrl: imageUrl.substring(0, 100) + '...',
      canvasReady: !!fabricCanvasRef.current,
      fabricReady: !!fabricRef.current,
      canvasInitialized,
    });
    
    // [2025-12-20 03:40:00] 添加小延迟，确保 Canvas DOM 结构完全就绪（包括 container 样式修复）
    const timer = setTimeout(() => {
      addProductImageToCanvas(imageUrl);
    }, 150);
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView, JSON.stringify(productInfo.baseImages), canvasInitialized]); // [2025-12-20 03:50:00] 添加 canvasInitialized 作为依赖，确保 Canvas 初始化完成后触发

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

        // [2025-12-20 03:20:00] 创建 Image 对象并加载
        const imgElement = new Image();
        if (!imageUrl.startsWith('data:')) {
          imgElement.crossOrigin = 'anonymous';
        }
        
        imgElement.onload = () => {
          try {
            // [2025-12-20 03:20:00] 创建 Fabric Image 对象
            const fabricImage = new fabric.Image(imgElement, {
              selectable: true,
              evented: true,
              hasControls: true,
              hasBorders: true,
              lockRotation: false,
              lockScalingX: false,
              lockScalingY: false,
              lockMovementX: false,
              lockMovementY: false,
              centeredScaling: true,
              centeredRotation: true,
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
            
            fabricImage.setCoords();

            // [2025-12-20 03:20:00] 添加到 canvas
            canvas.add(fabricImage);
            canvas.setActiveObject(fabricImage); // 自动选中
            canvas.renderAll();

            console.log('[DesignLab 5.0] Image added to canvas:', {
              name: fabricImage.name,
              position: { left: fabricImage.left, top: fabricImage.top },
              scale,
            });

            // [2025-12-20 03:20:00] 切换到 EditUploadPanel（将在步骤3实现）
            // TODO: setToolPanelType('edit-upload');

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

  // [2025-12-20 02:20:00] 5.0 版本：获取当前视图的图片 URL
  const getCurrentImageUrl = () => {
    const url = productInfo.baseImages[currentView];
    console.log('[DesignLab 5.0] 获取图片 URL:', { currentView, url }); // [2025-12-20 03:00:00] 添加调试日志
    return url;
  };

  // [2025-12-20 03:00:00] 5.0 版本：功能叠加 - 监听视图变化，验证图片切换
  useEffect(() => {
    const imageUrl = getCurrentImageUrl();
    console.log('[DesignLab 5.0] 视图已切换:', { 
      currentView, 
      imageUrl,
      hasImage: !!imageUrl 
    });
  }, [currentView]);

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
              <Link href="/designs" className="dl-header__breadcrumb-link">My Designs</Link>
              <span className="dl-header__breadcrumb-separator">/</span>
              <span className="dl-header__breadcrumb-current">Untitled Design</span>
            </nav>
          </div>
          <div className="dl-header__right">
            <div className="dl-header__contact">
              <span className="dl-header__contact-label">Talk to a Real Person:</span>
              <a href="tel:1-800-000-0000" className="dl-header__contact-phone">1-800-000-0000</a>
            </div>
            <a href="#" className="dl-header__chat-link">Chat Now</a>
            <Link href="/signin" className="dl-header__signin-link">Sign In</Link>
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
                  onBrowseClick={() => {}}
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
                  <div className="dl-tool-panel__placeholder">
                    <p>5.0 版本：Add Text 功能待实现</p>
                  </div>
                </>
              )}

              {/* Art 面板 */}
              {toolPanelType === 'art' && (
                <>
                  <div className="dl-tool-panel__header">
                    <h2 className="dl-tool-panel__title">Add Art</h2>
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
                  <div className="dl-tool-panel__placeholder">
                    <p>5.0 版本：Add Art 功能待实现</p>
                  </div>
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

      {/* 6. BottomBar - 底部操作栏 */}
      {/* [2025-12-20 02:30:00] 5.0 版本：与 4.0 版本 UI 一致 - BottomBar 完整内容 */}
      <footer className="dl-bottom-bar" role="contentinfo" data-testid="bottom-bar">
        <div className="dl-bottom-bar__left">
          <button className="dl-bottom-bar__add-products">
            + Add Products
          </button>
          <div className="dl-bottom-bar__product-info">
            <div className="dl-bottom-bar__product-thumb">
              <div className="dl-bottom-bar__product-thumb-placeholder">T</div>
            </div>
            <div className="dl-bottom-bar__product-details">
              <div className="dl-bottom-bar__product-name">
                Gildan Softstyle Jersey T-shirt
              </div>
              <div className="dl-bottom-bar__product-links">
                <button className="dl-bottom-bar__link" type="button">
                  Change Product
                </button>
                {productInfo.color && (
                  <span className="dl-bottom-bar__color">
                    <input type="checkbox" id="color-selected" checked readOnly />
                    <label htmlFor="color-selected">{productInfo.color}</label>
                  </span>
                )}
                <button className="dl-bottom-bar__link" type="button">
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
          <button className="dl-bottom-bar__btn dl-bottom-bar__btn--primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
            Get Price
          </button>
        </div>
      </footer>
    </div>
  );
};

export default DesignLabClient5;
