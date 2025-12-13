/**
 * Product Image Layer
 * [2025-01-30 20:05:00] 产品主图图层管理
 * [2025-01-30 20:50:00] 修复：引入有限状态机（FSM）和幂等保护，防止重复加载-移除循环
 * 
 * 职责：
 * - 加载产品主图
 * - 应用 fit 算法（等比缩放 + 居中）
 * - 确保主图在最底层（zIndex 最小）
 * - 防止重复加载和移除循环
 */

import type { fabric } from 'fabric';
import { calculateImageFit, type FitResult } from '@/design/utils/fit';
import { getProductImageUrl, type ProductImageLoadOptions } from '@/design/services/productImage';
import { debugLog } from '@/utils/debugLogger';

/**
 * ProductImageLayer 状态枚举
 * [2025-01-30 20:50:00] 引入有限状态机防止重复加载
 */
export enum ProductImageLayerState {
  IDLE = 'idle',
  LOADING = 'loading',
  LOADED = 'loaded',
  ATTACHED = 'attached',
  ERROR = 'error',
}

/**
 * 稳定的对象键生成器
 * [2025-01-30 20:50:00] 基于商品 SKU + view + colorId，避免因 URL query 变动触发重建
 */
function generateStableKey(
  colorName: string | null | undefined,
  view: 'front' | 'back' | 'sleeve',
  productId?: string
): string {
  const colorId = colorName || 'White';
  const pid = productId || 'default';
  return `product-image-${pid}-${colorId}-${view}`;
}

export interface ProductImageLayerOptions {
  /** Fabric Canvas 实例 */
  canvas: fabric.Canvas;
  /** Fabric 模块 */
  fabric: typeof fabric;
  /** 画布宽度 */
  canvasWidth: number;
  /** 画布高度 */
  canvasHeight: number;
  /** 产品图片加载选项 */
  imageOptions: ProductImageLoadOptions;
  /** 安全区宽度（相对于画布的百分比，默认 0.65） */
  safeAreaWidth?: number;
  /** 安全区高度（相对于画布的百分比，默认 0.75） */
  safeAreaHeight?: number;
  /** Git SHA（用于版本戳） */
  gitSha?: string;
  /** 产品 ID（用于生成稳定键） */
  productId?: string;
}

export interface ProductImageLayerResult {
  /** Fabric Image 对象 */
  image: fabric.Image | null;
  /** Fit 计算结果 */
  fit: FitResult;
  /** 是否成功加载 */
  success: boolean;
  /** 错误信息（如果有） */
  error?: Error;
  /** 状态 */
  state: ProductImageLayerState;
  /** 稳定键 */
  stableKey?: string;
}

/**
 * ProductImageLayer 管理器（单例模式）
 * [2025-01-30 20:50:00] 管理状态，防止重复加载
 */
class ProductImageLayerManager {
  private state: ProductImageLayerState = ProductImageLayerState.IDLE;
  private loadedOnce: boolean = false;
  private currentImage: fabric.Image | null = null;
  private currentStableKey: string | null = null;
  private removalCount: number = 0;
  private readonly maxRemovalAttempts = 1; // 最多允许移除一次

  /**
   * 检查是否可以加载
   */
  canLoad(stableKey: string): boolean {
    // 如果已经有相同键的图片且已加载，不再重新加载
    if (this.loadedOnce && this.currentStableKey === stableKey && this.currentImage) {
      console.log('[ProductImageLayer] Already loaded with key:', stableKey);
      return false;
    }
    
    // 如果正在加载，不允许重复加载
    if (this.state === ProductImageLayerState.LOADING) {
      console.warn('[ProductImageLayer] Already loading, skip duplicate load');
      return false;
    }
    
    return true;
  }

  /**
   * 标记开始加载
   */
  startLoading(stableKey: string): void {
    if (this.state === ProductImageLayerState.LOADING) {
      console.warn('[ProductImageLayer] Prevent duplicate loading');
      return;
    }
    this.state = ProductImageLayerState.LOADING;
    this.currentStableKey = stableKey;
  }

  /**
   * 标记加载完成
   */
  markLoaded(image: fabric.Image, stableKey: string): void {
    this.state = ProductImageLayerState.LOADED;
    this.currentImage = image;
    this.currentStableKey = stableKey;
    this.loadedOnce = true;
    this.removalCount = 0; // 重置移除计数
  }

  /**
   * 标记已附加到画布
   */
  markAttached(): void {
    if (this.state === ProductImageLayerState.LOADED || this.state === ProductImageLayerState.ATTACHED) {
      this.state = ProductImageLayerState.ATTACHED;
    }
  }

  /**
   * 检查是否可以移除（幂等保护）
   */
  canRemove(image: fabric.Image | null): boolean {
    // 如果已经移除过，且移除计数超过阈值，阻止再次移除
    if (this.removalCount >= this.maxRemovalAttempts) {
      console.warn('[ProductImageLayer] Prevent repeated removal (count:', this.removalCount, ')');
      return false;
    }
    
    // 如果图片不是当前管理的图片，允许移除（可能是其他对象）
    if (image !== this.currentImage) {
      return true;
    }
    
    // 如果当前状态不是已附加，不允许移除
    if (this.state !== ProductImageLayerState.ATTACHED) {
      return false;
    }
    
    return true;
  }

  /**
   * 标记移除
   */
  markRemoved(image: fabric.Image | null): void {
    if (image === this.currentImage) {
      this.removalCount++;
      if (this.removalCount > this.maxRemovalAttempts) {
        console.error('[ProductImageLayer] ⚠️ Repeated removal detected! Count:', this.removalCount);
      }
      // 重置状态，允许重新加载
      if (this.removalCount <= this.maxRemovalAttempts) {
        this.state = ProductImageLayerState.IDLE;
        this.currentImage = null;
      }
    }
  }

  /**
   * 标记错误
   */
  markError(): void {
    this.state = ProductImageLayerState.ERROR;
  }

  /**
   * 获取当前状态
   */
  getState(): ProductImageLayerState {
    return this.state;
  }

  /**
   * 获取当前图片
   */
  getCurrentImage(): fabric.Image | null {
    return this.currentImage;
  }

  /**
   * 获取当前稳定键
   */
  getCurrentStableKey(): string | null {
    return this.currentStableKey;
  }

  /**
   * [2025-01-31 19:00:00] 清除旧图片的管理状态（当 stableKey 改变时调用）
   * 这允许旧图片被移除，即使它当前被 manager 管理
   */
  clearOldImageState(): void {
    if (this.currentImage) {
      const oldStableKey = this.currentStableKey;
      const oldState = this.state;
      console.log('[ProductImageLayer] Clearing old image state to allow removal:', {
        oldStableKey,
        oldState,
        oldRemovalCount: this.removalCount,
      });
      // 重置移除计数，允许移除旧图片
      this.removalCount = 0;
      // [2025-01-31 19:00:00] 清除 currentImage，这样在移除时不会被识别为当前管理的图片
      // 移除逻辑会正常工作，因为 image !== this.currentImage 会返回 true
      this.currentImage = null;
      // 注意：保留 currentStableKey，这样 startLoading 可以正确设置新的 stableKey
    }
  }

  /**
   * 重置（用于测试或清理）
   */
  reset(): void {
    this.state = ProductImageLayerState.IDLE;
    this.loadedOnce = false;
    this.currentImage = null;
    this.currentStableKey = null;
    this.removalCount = 0;
  }
}

// 单例管理器
const manager = new ProductImageLayerManager();

/**
 * 查找画布中已存在的产品图片对象
 * [2025-01-30 20:50:00] 通过稳定键查找，避免重复创建
 */
function findExistingProductImage(
  canvas: fabric.Canvas,
  stableKey: string
): fabric.Image | null {
  const objects = canvas.getObjects();
  for (const obj of objects) {
    if (obj.name === stableKey || (obj as any).data?.stableKey === stableKey) {
      if (obj instanceof (canvas.fabric?.Image || Object)) {
        return obj as fabric.Image;
      }
    }
  }
  return null;
}

/**
 * 移除旧的产品图片（幂等保护）
 * [2025-01-30 20:50:00] 确保不会重复移除导致循环
 */
function removeExistingProductImage(
  canvas: fabric.Canvas,
  stableKey: string,
  excludeImage?: fabric.Image | null
): void {
  const objects = canvas.getObjects();
  let removed = false;
  
  // #region agent log
  const currentStableKey = manager.getCurrentStableKey();
  debugLog({
    location: 'productImageLayer.ts:241',
    message: 'removeExistingProductImage called',
    data: { 
      stableKey, 
      currentStableKey,
      excludeImage: !!excludeImage, 
      objectsCount: objects.length, 
      objects: objects.map((o:any)=>({name:o.name,stableKey:o.data?.stableKey,isProduct:o.name?.startsWith('product-image-')||o.name==='background'})), 
      managerState: manager.getState(), 
      managerCurrentImage: !!manager.getCurrentImage(),
      managerCurrentStableKey: currentStableKey,
    },
    hypothesisId: 'A',
  });
  // #endregion
  
  // [2025-01-30 21:55:00] 修复：只移除匹配稳定键的图片（严格匹配）
  // 不按名称前缀移除，避免误移除正在加载的图片
  for (const obj of objects) {
    const objName = obj.name || '';
    const objDataStableKey = (obj as any).data?.stableKey;
    const objStableKeyMatch = objName === stableKey || objDataStableKey === stableKey;
    
    // [2025-01-31 19:00:00] 只移除匹配稳定键的图片，且不是要排除的图片
    if (objStableKeyMatch && obj !== excludeImage) {
      const isCurrentImage = obj === manager.getCurrentImage();
      const managerState = manager.getState();
      
      // [2025-01-31 19:00:00] 详细日志记录移除决策过程
      console.log('[ProductImageLayer] Evaluating removal for object:', {
        objName,
        objStableKey: objDataStableKey || objName,
        targetStableKey: stableKey,
        isCurrentImage,
        managerState,
        currentStableKey,
        isExcluded: obj === excludeImage,
      });
      
      // [2025-01-30 21:55:00] 额外检查：如果对象是当前正在管理的图片，且状态是 LOADING 或 LOADED，不移除
      if (isCurrentImage && 
          (managerState === ProductImageLayerState.LOADING || 
           managerState === ProductImageLayerState.LOADED)) {
        console.warn('[ProductImageLayer] Prevented removal of image currently being loaded:', {
          objName: objName || 'unnamed',
          reason: 'Object is currentImage and state is LOADING/LOADED',
          managerState,
        });
        continue;
      }
      
      const canRemove = manager.canRemove(obj as fabric.Image);
      console.log('[ProductImageLayer] canRemove check result:', {
        objName,
        canRemove,
        managerState,
        isCurrentImage,
        currentStableKey,
        targetStableKey: stableKey,
      });
      
      if (canRemove) {
        // #region agent log
        debugLog({
          location: 'productImageLayer.ts:265',
          message: 'removing object',
          data: { 
            objName, 
            objStableKey: objDataStableKey || objName, 
            targetStableKey: stableKey, 
            canRemove, 
            managerState,
            currentStableKey,
          },
          hypothesisId: 'A',
        });
        // #endregion
        
        console.log('[ProductImageLayer] 🗑️ Executing canvas.remove() for product image:', {
          objName,
          location: 'removeExistingProductImage',
          callStack: new Error().stack?.split('\n').slice(1, 5).join('\n'),
        });
        canvas.remove(obj);
        manager.markRemoved(obj as fabric.Image);
        removed = true;
        console.log('[ProductImageLayer] ✅ Removed existing product image:', objName || 'unnamed');
      } else {
        console.warn('[ProductImageLayer] ❌ Prevented removal of product image:', {
          objName: objName || 'unnamed',
          reason: 'canRemove returned false',
          managerState,
          isCurrentImage,
          currentStableKey,
        });
      }
    }
  }
  
  if (removed) {
    canvas.renderAll();
  }
}

/**
 * 加载产品主图并添加到画布
 * [2025-01-30 20:05:00] 实现分阶段初始化：skeleton→主图加载→fit+center
 * [2025-01-30 20:50:00] 修复：引入 FSM 和幂等保护，防止重复加载-移除循环
 */
export async function loadProductImageLayer(
  options: ProductImageLayerOptions
): Promise<ProductImageLayerResult> {
  const {
    canvas,
    fabric: fabricModule,
    canvasWidth,
    canvasHeight,
    imageOptions,
    safeAreaWidth = 0.8, // [2025-12-19 21:15:00] 修复：增大底图尺寸占比，从65%改为80%（占据画布主要区域，更接近CustomInk效果）
    safeAreaHeight = 0.9, // [2025-12-19 21:15:00] 修复：增大底图尺寸占比，从75%改为90%（占据画布主要区域，更接近CustomInk效果）
    gitSha,
    productId,
  } = options;
  
  // 1. 生成稳定键
  const stableKey = generateStableKey(imageOptions.colorName, imageOptions.view, productId);
  
  // #region agent log
  debugLog({
    location: 'productImageLayer.ts:292',
    message: 'loadProductImageLayer called',
    data: { stableKey, colorName: imageOptions.colorName, view: imageOptions.view, productId, managerState: manager.getState(), currentImage: !!manager.getCurrentImage() },
    hypothesisId: 'A,B,C',
  });
  // #endregion
  
  // 2. [2025-01-31 19:00:00] 如果 stableKey 改变，先清除旧图片的管理状态，允许移除旧图片
  const currentStableKey = manager.getCurrentStableKey();
  if (currentStableKey && currentStableKey !== stableKey) {
    console.log('[ProductImageLayer] Stable key changed, clearing old image state to allow removal:', {
      oldKey: currentStableKey,
      newKey: stableKey,
    });
    // 清除旧图片的管理状态，重置移除计数，允许移除旧图片
    manager.clearOldImageState();
  }

  // 3. 检查是否可以加载（幂等保护）
  if (!manager.canLoad(stableKey)) {
    const existingImage = findExistingProductImage(canvas, stableKey);
    if (existingImage) {
      console.log('[ProductImageLayer] Using existing product image:', stableKey);
      return {
        image: existingImage,
        fit: {
          width: existingImage.width || 0,
          height: existingImage.height || 0,
          left: existingImage.left || 0,
          top: existingImage.top || 0,
          scale: existingImage.scaleX || 1,
          safeAreaWidth: canvasWidth * safeAreaWidth,
          safeAreaHeight: canvasHeight * safeAreaHeight,
        },
        success: true,
        state: ProductImageLayerState.ATTACHED,
        stableKey,
      };
    }
  }
  
  // 4. 标记开始加载
  manager.startLoading(stableKey);
  
  // #region agent log
  debugLog({
    location: 'productImageLayer.ts:318',
    message: 'startLoading called',
    data: { stableKey, managerState: manager.getState() },
    hypothesisId: 'B',
  });
  // #endregion
  
  try {
    // 4. 获取图片 URL（规范化，移除不稳定的版本戳）
    const imageUrlResult = await getProductImageUrl({
      ...imageOptions,
      addVersionStamp: !!gitSha, // 版本戳只用于缓存控制，不影响 identity
      gitSha,
    });
    
    if (imageUrlResult.error) {
      manager.markError();
      throw imageUrlResult.error;
    }
    
    const imageUrl = imageUrlResult.url;
    console.log('[ProductImageLayer] Loading product image from URL:', imageUrl);
    
    // #region agent log
    debugLog({
      location: 'productImageLayer.ts:330',
      message: 'before removeExistingProductImage',
      data: { stableKey, canvasObjectsCount: canvas.getObjects().length, existingObjects: canvas.getObjects().map((o:any)=>({name:o.name,stableKey:o.data?.stableKey})) },
      hypothesisId: 'A',
    });
    // #endregion
    
    // 5. [2025-01-31 19:00:00] 移除所有旧的产品图片（匹配稳定键的，以及所有其他 product-image- 开头的图片）
    // 先移除匹配稳定键的图片
    removeExistingProductImage(canvas, stableKey, null);
    
    // [2025-01-31 19:30:00] 然后移除所有其他以 product-image- 开头的图片（切换产品/颜色时）
    // [2025-01-31 19:30:00] 重要：必须排除上传图片（layerType: 'upload'），避免误删用户上传的内容
    const allObjects = canvas.getObjects();
    console.log('[ProductImageLayer] 🔍 Before cleanup - all canvas objects:', allObjects.map((obj, idx) => ({
      index: idx,
      name: (obj as any).name || 'unnamed',
      type: obj.type,
      layerType: (obj as any).data?.layerType || 'unknown',
      stableKey: (obj as any).data?.stableKey || (obj as any).name,
      isProductImage: ((obj as any).name || '').startsWith('product-image-'),
    })));
    
    for (const obj of allObjects) {
      const objName = obj.name || '';
      const objStableKey = (obj as any).data?.stableKey || objName;
      const objLayerType = (obj as any).data?.layerType;
      const isProductImage = objName.startsWith('product-image-');
      const isCurrentKey = objName === stableKey || objStableKey === stableKey;
      const isUploadImage = objLayerType === 'upload';
      
      // [2025-01-31 19:30:00] 安全检查：绝对不移除上传图片
      if (isUploadImage) {
        console.log('[ProductImageLayer] ⚠️ Skipping upload image (protected from removal):', {
          objName,
          objLayerType,
          objStableKey,
        });
        continue;
      }
      
      // [2025-01-31 19:30:00] 移除所有产品图片，除了当前要加载的这个
      // 如果 stableKey 不匹配，强制移除，不经过 canRemove 状态检查
      if (isProductImage && !isCurrentKey) {
        // [2025-01-31 19:30:00] stableKey 不匹配，强制移除（绕过 canRemove 状态检查）
        // 因为已经在 startLoading 之前通过 clearOldImageState 清除了旧图片的管理状态
        console.log('[ProductImageLayer] 🗑️ Force removing old product image (different stableKey):', {
          objName,
          objStableKey,
          newStableKey: stableKey,
          layerType: objLayerType,
          managerState: manager.getState(),
          isCurrentImage: obj === manager.getCurrentImage(),
          managerCurrentStableKey: manager.getCurrentStableKey(),
        });
        console.log('[ProductImageLayer] 📍 Removal call stack:', new Error().stack?.split('\n').slice(1, 5).join('\n'));
        console.log('[ProductImageLayer] 🗑️ Executing canvas.remove() for old product image:', {
          objName,
          location: 'loadProductImageLayer cleanup loop',
          callStack: new Error().stack?.split('\n').slice(1, 5).join('\n'),
        });
        canvas.remove(obj);
        manager.markRemoved(obj as fabric.Image);
      }
    }
    
    const remainingObjects = canvas.getObjects();
    console.log('[ProductImageLayer] ✅ After cleanup - remaining objects:', remainingObjects.map((obj, idx) => ({
      index: idx,
      name: (obj as any).name || 'unnamed',
      type: obj.type,
      layerType: (obj as any).data?.layerType || 'unknown',
    })));
    canvas.renderAll();
    
    // 6. 加载图片（使用原生 Image 对象，然后转换为 Fabric Image）
    return new Promise((resolve, reject) => {
      const imgElement = new Image();
      imgElement.crossOrigin = 'anonymous';
      
      const timeoutId = setTimeout(() => {
        imgElement.onload = null;
        imgElement.onerror = null;
        manager.markError();
        reject(new Error('Image load timeout after 10 seconds'));
      }, 10000);
      
      // 一次性事件处理（避免重复触发）
      let loadHandlerExecuted = false;
      
      imgElement.onload = async () => {
        if (loadHandlerExecuted) {
          console.warn('[ProductImageLayer] Load handler already executed, ignoring duplicate call');
          return;
        }
        loadHandlerExecuted = true;
        clearTimeout(timeoutId);
        
        try {
          // 7. 转换为 Fabric Image
          const fabricImg = new fabricModule.Image(imgElement, {
            selectable: false,
            evented: false,
            excludeFromExport: false, // 允许导出
            name: stableKey, // 使用稳定键作为名称
            originX: 'left',
            originY: 'top',
            data: {
              stableKey,
              layerType: 'product-image',
              zIndex: 0, // 底层
            },
          });
          
          // 8. 计算 fit（等比缩放 + 居中）- 必须在 image.onload 之后
          const fit = calculateImageFit({
            canvasWidth,
            canvasHeight,
            imageWidth: imgElement.naturalWidth || imgElement.width,
            imageHeight: imgElement.naturalHeight || imgElement.height,
            safeAreaWidth,
            safeAreaHeight,
            fit: 'cover', // [2025-12-19 21:15:00] 修复：改为cover模式（填充安全区，可能裁剪边缘，但视觉更大更突出）
          });
          
          // 9. 应用 fit 结果（居中 + 缩放）
          fabricImg.scale(fit.scale);
          fabricImg.set({
            left: fit.left,
            top: fit.top,
            originX: 'center', // 改为 center 以实现真正的居中
            originY: 'center',
          });
          
          // 重新计算居中位置（基于 center 原点）
          const centerLeft = canvasWidth / 2;
          const centerTop = canvasHeight / 2;
          fabricImg.set({
            left: centerLeft,
            top: centerTop,
          });
          
          fabricImg.setCoords();
          
          // 10. 添加到画布
          canvas.add(fabricImg);
          
          // #region agent log
          debugLog({
            location: 'productImageLayer.ts:410',
            message: 'image added to canvas',
            data: { stableKey, objectIndex: canvas.getObjects().indexOf(fabricImg), totalObjects: canvas.getObjects().length },
            hypothesisId: 'D',
          });
          // #endregion
          
          // 11. 移动到最底层（确保 zIndex 最小）
          try {
            // 强制移动到最底层
            // [2025-01-30 22:25:00] 修复：Fabric.js v6 使用 sendObjectToBack 而不是 sendToBack
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
                  canvas.renderAll();
                }
              }
            } catch (e) {
              console.warn('[ProductImageLayer] sendObjectToBack failed, using manual method:', e);
              // 降级：手动调整对象顺序
              const objs = canvas.getObjects();
              const idx = objs.indexOf(fabricImg);
              if (idx >= 0) {
                objs.splice(idx, 1);
                objs.unshift(fabricImg);
                canvas.renderAll();
              }
            }
            
            // #region agent log
            debugLog({
              location: 'productImageLayer.ts:416',
              message: 'sendObjectToBack called',
              data: { stableKey, objectIndex: canvas.getObjects().indexOf(fabricImg) },
              hypothesisId: 'D',
            });
            // #endregion
            
            // 验证是否在最底层
            const objectsAfterSendToBack = canvas.getObjects();
            const indexAfterSendToBack = objectsAfterSendToBack.indexOf(fabricImg);
            
            // 如果不在第一个位置，手动移到第一个位置
            if (indexAfterSendToBack !== 0 && indexAfterSendToBack >= 0) {
              objectsAfterSendToBack.splice(indexAfterSendToBack, 1);
              objectsAfterSendToBack.unshift(fabricImg);
              console.warn('[ProductImageLayer] sendToBack did not work, manually moved to front of array');
            }
            
            // [2025-01-30 22:25:00] 确保 zIndex 为 0，并禁用 bringToFront
            (fabricImg as any).zIndex = 0;
            fabricImg.bringToFront = function() {
              // 重写 bringToFront 以防止被移到前面
              console.warn('[ProductImageLayer] Prevented bringToFront on product image');
              // 立即将其移回底层
              try {
                // [2025-01-30 22:25:00] 修复：使用 sendObjectToBack
                if (typeof (canvas as any).sendObjectToBack === 'function') {
                  (canvas as any).sendObjectToBack(fabricImg);
                } else if (typeof (fabricImg as any).sendObjectToBack === 'function') {
                  (fabricImg as any).sendObjectToBack();
                } else {
                  // 降级：手动调整对象顺序
                  const objs = canvas.getObjects();
                  const idx = objs.indexOf(fabricImg);
                  if (idx > 0) {
                    objs.splice(idx, 1);
                    objs.unshift(fabricImg);
                    canvas.renderAll();
                  }
                }
              } catch (e) {
                console.error('[ProductImageLayer] Failed to restore product image to back:', e);
              }
            };
          } catch (e) {
            console.error('[ProductImageLayer] Error moving image to back:', e);
            // 如果 sendToBack 失败，手动调整对象顺序
            const objects = canvas.getObjects();
            const index = objects.indexOf(fabricImg);
            if (index > 0) {
              objects.splice(index, 1);
              objects.unshift(fabricImg);
            }
          }
          
          canvas.renderAll();
          
          // #region agent log
          const finalObjects = canvas.getObjects();
          debugLog({
            location: 'productImageLayer.ts:450',
            message: 'after sendToBack and renderAll',
            data: { stableKey, objectIndex: finalObjects.indexOf(fabricImg), totalObjects: finalObjects.length, firstObjectName: finalObjects[0]?.name, firstObjectIsProductImage: finalObjects[0]?.name?.startsWith('product-image-')||finalObjects[0]?.name==='background', isFirst: finalObjects[0]===fabricImg },
            hypothesisId: 'D',
          });
          // #endregion
          
          // 12. 标记加载完成和已附加
          manager.markLoaded(fabricImg, stableKey);
          manager.markAttached();
          
          // [2025-01-30 22:30:00] 详细调试：检查图片是否真的可见
          const imgProps = {
            visible: fabricImg.visible,
            opacity: fabricImg.opacity,
            left: fabricImg.left,
            top: fabricImg.top,
            width: fabricImg.width,
            height: fabricImg.height,
            scaleX: fabricImg.scaleX,
            scaleY: fabricImg.scaleY,
            angle: fabricImg.angle,
            hasControls: fabricImg.hasControls,
            selectable: fabricImg.selectable,
            evented: fabricImg.evented,
            excludeFromExport: (fabricImg as any).excludeFromExport,
            onCanvas: canvas.getObjects().includes(fabricImg),
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
          };
          
          console.log('[ProductImageLayer] ✅ Product image loaded and positioned:', {
            stableKey,
            url: imageUrl,
            dimensions: { width: fit.width, height: fit.height },
            position: { left: centerLeft, top: centerTop },
            scale: fit.scale,
            state: manager.getState(),
          });
          
          // [2025-01-30 22:30:00] 详细输出所有属性（展开对象）
          console.log('[ProductImageLayer] 🔍 Image properties check:');
          console.log('  visible:', imgProps.visible);
          console.log('  opacity:', imgProps.opacity);
          console.log('  left:', imgProps.left);
          console.log('  top:', imgProps.top);
          console.log('  width:', imgProps.width);
          console.log('  height:', imgProps.height);
          console.log('  scaleX:', imgProps.scaleX);
          console.log('  scaleY:', imgProps.scaleY);
          console.log('  angle:', imgProps.angle);
          console.log('  onCanvas:', imgProps.onCanvas);
          console.log('  canvasWidth:', imgProps.canvasWidth);
          console.log('  canvasHeight:', imgProps.canvasHeight);
          console.log('  full imgProps:', JSON.stringify(imgProps, null, 2));
          
          // [2025-01-30 22:30:00] 检查图片是否在画布范围内
          const imgBounds = fabricImg.getBoundingRect();
          const isInCanvas = imgBounds.left >= 0 && 
                            imgBounds.top >= 0 && 
                            imgBounds.left + imgBounds.width <= canvas.width && 
                            imgBounds.top + imgBounds.height <= canvas.height;
          
          console.log('[ProductImageLayer] 🔍 Image bounds check:');
          console.log('  bounds.left:', imgBounds.left);
          console.log('  bounds.top:', imgBounds.top);
          console.log('  bounds.width:', imgBounds.width);
          console.log('  bounds.height:', imgBounds.height);
          console.log('  isInCanvas:', isInCanvas);
          console.log('  canvasSize:', { width: canvas.width, height: canvas.height });
          console.log('  full bounds:', JSON.stringify(imgBounds, null, 2));
          
          // [2025-01-30 22:30:00] 检查画布上所有对象
          const allObjects = canvas.getObjects();
          console.log('[ProductImageLayer] 🔍 Canvas objects:', allObjects.length, 'objects');
          allObjects.forEach((obj, idx) => {
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
              isProductImage: obj === fabricImg,
            });
          });
          
          // [2025-01-30 22:30:00] 检查画布元素本身
          const canvasElement = canvas.getElement();
          if (canvasElement) {
            const canvasStyle = window.getComputedStyle(canvasElement);
            console.log('[ProductImageLayer] 🔍 Canvas element check:');
            console.log('  canvasElement.width:', canvasElement.width);
            console.log('  canvasElement.height:', canvasElement.height);
            console.log('  canvasElement.offsetWidth:', canvasElement.offsetWidth);
            console.log('  canvasElement.offsetHeight:', canvasElement.offsetHeight);
            console.log('  display:', canvasStyle.display);
            console.log('  visibility:', canvasStyle.visibility);
            console.log('  opacity:', canvasStyle.opacity);
            console.log('  zIndex:', canvasStyle.zIndex);
          }
          
          // [2025-01-30 22:30:00] 检查图片是否真的渲染
          if (!fabricImg.visible || fabricImg.opacity === 0) {
            console.warn('[ProductImageLayer] ⚠️ WARNING: Image is not visible!', {
              visible: fabricImg.visible,
              opacity: fabricImg.opacity,
            });
          }
          
          if (!canvas.getObjects().includes(fabricImg)) {
            console.error('[ProductImageLayer] ❌ ERROR: Image is not on canvas!');
          }
          
          // 13. 触发一次性 ready 事件（通过 canvas 事件）
          canvas.fire('product-image:ready', { image: fabricImg, stableKey });
          
          resolve({
            image: fabricImg,
            fit: {
              ...fit,
              left: centerLeft,
              top: centerTop,
            },
            success: true,
            state: ProductImageLayerState.ATTACHED,
            stableKey,
          });
        } catch (error) {
          manager.markError();
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      };
      
      imgElement.onerror = (error) => {
        if (loadHandlerExecuted) {
          return; // 避免重复处理
        }
        clearTimeout(timeoutId);
        manager.markError();
        console.error('[ProductImageLayer] ❌ Image load error:', {
          imageUrl,
          error,
          errorType: error?.type,
          errorTarget: error?.target,
        });
        const err = new Error(`Failed to load product image from ${imageUrl}: ${error?.type || 'unknown error'}`);
        reject(err);
      };
      
      console.log('[ProductImageLayer] Setting image src:', imageUrl);
      imgElement.src = imageUrl;
    });
  } catch (error) {
    manager.markError();
    console.error('[ProductImageLayer] Failed to load product image layer:', error);
    return {
      image: null,
      fit: {
        width: 0,
        height: 0,
        left: 0,
        top: 0,
        scale: 1,
        safeAreaWidth: canvasWidth * safeAreaWidth,
        safeAreaHeight: canvasHeight * safeAreaHeight,
      },
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
      state: ProductImageLayerState.ERROR,
      stableKey,
    };
  }
}

/**
 * 导出管理器（用于测试和调试）
 */
export { manager as productImageLayerManager };
