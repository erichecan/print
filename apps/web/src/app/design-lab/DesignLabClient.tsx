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
import * as fabric from 'fabric';
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
import { getDefaultProductBaseImages, getThumbnailImageUrl } from '@/lib/customink-images';
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
  
  // [2025-01-30 14:00:00] 状态管理
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'front' | 'back' | 'sleeve' | 'zoom'>('front');
  const [showGuidePanel, setShowGuidePanel] = useState(false); // [2025-01-30 17:00:00] 默认隐藏，因为工具面板会显示
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
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
  const [productColors, setProductColors] = useState<ProductColor[]>([]);
  const [showColorModal, setShowColorModal] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(false);
  // [2025-01-30 20:00:00] Names & Numbers 状态
  const [showNamesNumbersModal, setShowNamesNumbersModal] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const backgroundImageRef = useRef<fabric.Image | null>(null);
  // [2025-01-30 22:20:00] 使用 ref 跟踪当前面板类型，避免闭包问题
  const toolPanelTypeRef = useRef<ToolPanelType>('home');
  
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
  const loadBackgroundImage = useCallback((view: 'front' | 'back' | 'sleeve' | 'zoom') => {
    if (view === 'zoom') return; // Zoom 视图不加载背景
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    
    // [2025-01-30 16:30:00] 移除旧背景
    if (backgroundImageRef.current) {
      canvas.remove(backgroundImageRef.current);
      backgroundImageRef.current = null;
    }

    // [2025-01-30 19:30:00] 使用产品图片或占位图片
    // [2025-01-30 23:55:00] 优先使用 Custom Ink 的真实图片 URL
    const viewKey = view as 'front' | 'back' | 'sleeve'; // 类型断言，因为已经排除了 zoom
    let imageUrl: string;
    
    if (productInfo?.baseImages?.[viewKey]) {
      // 如果产品信息中有图片 URL，直接使用
      imageUrl = productInfo.baseImages[viewKey];
    } else if (productInfo?.color) {
      // 如果只有颜色信息，生成 Custom Ink 图片 URL
      const { getDefaultProductImageUrl } = require('@/lib/customink-images');
      imageUrl = getDefaultProductImageUrl(productInfo.color, viewKey);
    } else {
      // 最后使用占位图片
      imageUrl = `https://picsum.photos/seed/tshirt-${viewKey}/900/700`;
    }
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    const timeoutId = setTimeout(() => {
      console.error('[DesignLab] Image load timeout after 15 seconds');
      img.onload = null;
      img.onerror = null;
    }, 15000);
    
    img.onload = () => {
      clearTimeout(timeoutId);
      
      const fabricImg = new fabric.Image(img, {
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
      const scaleX = targetWidth / fabricImg.width!;
      const scaleY = targetHeight / fabricImg.height!;
      const scale = Math.min(scaleX, scaleY);
      fabricImg.scale(scale);
      
      // [2025-01-30 16:30:00] 居中图片
      const scaledWidth = fabricImg.width! * scale;
      const scaledHeight = fabricImg.height! * scale;
      const left = CANVAS_WIDTH / 2 - scaledWidth / 2;
      const top = CANVAS_HEIGHT / 2 - scaledHeight / 2;
      
      fabricImg.set({ left, top });
      fabricImg.setCoords();
      
      canvas.add(fabricImg);
      
      // [2025-01-30 16:30:00] 移动到最底层
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
      canvas.renderAll();
    };
    
    img.onerror = () => {
      clearTimeout(timeoutId);
      console.error('[DesignLab] Failed to load background image:', imageUrl);
    };
    
    img.src = imageUrl;
  }, [CANVAS_WIDTH, CANVAS_HEIGHT, productInfo]);

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
      // [2025-01-30 23:55:00] 加载默认背景图片
      if (fabricCanvasRef.current) {
        loadBackgroundImage(currentView);
      }
    }
  }, [searchParams, loadProductInfo, currentView]);

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
        // [2025-01-30 19:30:00] 如果找不到变体，只更新颜色名称
        setProductInfo({
          ...productInfo,
          color: colorName,
        });
        
        // [2025-01-30 19:30:00] 重新加载背景图片
        if (fabricCanvasRef.current) {
          loadBackgroundImage(currentView);
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
    } catch (error) {
      console.error('[DesignLab] Error creating text:', error);
      alert('Failed to add text: ' + (error as Error).message);
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
    
    // [2025-01-30 21:30:00] 添加错误处理
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

    // [2025-01-30 16:30:00] 画布选择事件监听（用于自动切换工具面板）
    // [2025-01-30 22:15:00] 修复：确保正确识别文本对象并切换到 Edit Text 面板
    const handleSelection = () => {
      const activeObject = fabricCanvas.getActiveObject();
      if (activeObject) {
        // [2025-01-30 17:00:00] 根据对象类型自动切换工具面板
        const objType = activeObject.type;
        const objName = (activeObject as any).name || '';
        
        let newPanelType: ToolPanelType = 'home';
        
        if (objType === 'image' && objName !== 'background') {
          // [2025-01-30 18:10:00] 判断是上传的图片还是艺术素材
          if (objName.startsWith('art_')) {
            // 选中 Art/Emoji → Edit Art 面板
            newPanelType = 'edit-art';
            setSelectedArt(activeObject as fabric.Image);
            setSelectedImage(null);
            setSelectedText(null);
          } else {
            // 选中图片 → Edit Upload 面板
            newPanelType = 'edit-upload';
            setSelectedImage(activeObject as fabric.Image);
            setSelectedArt(null);
            setSelectedText(null);
          }
        } else if (objType === 'i-text' || objType === 'text' || objType === 'textbox') {
          // [2025-01-30 22:15:00] 选中文字 → Edit Text 面板
          newPanelType = 'edit-text';
          setSelectedText(activeObject as fabric.IText);
          setSelectedImage(null);
          setSelectedArt(null);
          console.log('[DesignLab] Text object selected:', objType, objName);
        } else {
          // [2025-01-30 22:20:00] 其他类型对象，返回 Home
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
      // [2025-01-30 17:00:00] 清除选择时返回 Home 面板
      // [2025-01-30 22:25:00] 修复：检查是否有活动对象，避免在添加对象时错误清除选择
      const activeObject = fabricCanvas.getActiveObject();
      if (activeObject) {
        // [2025-01-30 22:25:00] 如果有活动对象，不应该清除选择（可能是 selection:created 事件还没触发）
        console.log('[DesignLab] Selection cleared but active object exists, ignoring');
        return;
      }
      
      // [2025-01-30 22:20:00] 使用 ref 获取最新的面板状态，避免闭包问题
      const currentPanel = toolPanelTypeRef.current;
      console.log('[DesignLab] Selection cleared, current panel:', currentPanel, '→ Home panel');
      setToolPanelType('home');
      setSelectedImage(null);
      setSelectedText(null);
      setSelectedArt(null);
    };

    // [2025-01-30 16:30:00] 对象变更事件 - 同步到 store
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

    // [2025-01-30 16:30:00] 绑定事件
    fabricCanvas.on('selection:created', handleSelection);
    fabricCanvas.on('selection:updated', handleSelection);
    fabricCanvas.on('selection:cleared', handleSelectionCleared);
    fabricCanvas.on('object:modified', handleObjectModified);
    fabricCanvas.on('object:added', handleObjectAdded);
    fabricCanvas.on('object:removed', handleObjectRemoved);

    fabricCanvasRef.current = fabricCanvas;
    
    console.log('[DesignLab] Event listeners attached, canvas ready');

    // [2025-01-30 16:30:00] 加载当前视图的画布数据
    const currentViewCanvas = getCurrentViewCanvas();
    if (currentViewCanvas && currentViewCanvas.objects.length > 0) {
      snapshotToCanvas(currentViewCanvas, fabricCanvas);
    }

      console.log('[DesignLab] Fabric.js canvas initialized');
      
      // [2025-01-30 16:30:00] 清理函数
      return () => {
        if (fabricCanvasRef.current) {
          try {
            const canvas = fabricCanvasRef.current;
            canvas.off('selection:created', handleSelection);
            canvas.off('selection:updated', handleSelection);
            canvas.off('selection:cleared', handleSelectionCleared);
            canvas.off('object:modified', handleObjectModified);
            canvas.off('object:added', handleObjectAdded);
            canvas.off('object:removed', handleObjectRemoved);
            canvas.dispose();
          } catch (error) {
            console.error('[DesignLab] Error cleaning up canvas:', error);
          }
          fabricCanvasRef.current = null;
        }
      };
    } catch (error) {
      console.error('[DesignLab] Error initializing Fabric.js canvas:', error);
      alert('Failed to initialize design canvas. Please refresh the page.');
      return;
    }
  }, [canvasToSnapshot, snapshotToCanvas, setCanvas, getCurrentViewCanvas]);

  // [2025-01-30 16:30:00] 初始化时加载背景图片
  // [2025-01-30 23:55:00] 修复：当 productInfo 或 fabricCanvasRef 变化时也加载背景图片
  useEffect(() => {
    if (fabricCanvasRef.current && currentView !== 'zoom' && productInfo) {
      loadBackgroundImage(currentView);
    }
  }, [currentView, productInfo, loadBackgroundImage]);

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
            <span className="dl-rail__btn-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
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
              <canvas ref={canvasRef} className="dl-canvas__fabric" />
              {/* [2025-01-30 22:35:00] Placeholder 只在画布未初始化时显示 */}
              {!fabricCanvasRef.current && (
                <div className="dl-canvas__placeholder">
                  <p>Product Preview</p>
                </div>
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
          <button className="dl-bottom-bar__add-products">+ Add Products</button>
          <div className="dl-bottom-bar__product-info">
            <div className="dl-bottom-bar__product-thumb">
              <div className="dl-bottom-bar__product-thumb-placeholder">T</div>
            </div>
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
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline', color: 'inherit' }}
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
          <button className="dl-bottom-bar__btn dl-bottom-bar__btn--primary">
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
      <NamesNumbersModal
        isOpen={showNamesNumbersModal}
        onClose={() => setShowNamesNumbersModal(false)}
        onAddToCanvas={handleAddNamesNumbers}
      />
    </div>
  );
};

export default DesignLabClient;
