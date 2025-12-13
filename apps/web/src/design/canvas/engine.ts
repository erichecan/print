/**
 * Design Lab Canvas Engine
 * [2025-01-30 23:00:00] Design Lab 4.0: 初始化顺序与事件总线
 */

import type { fabric } from 'fabric';

export enum CanvasEventType {
  READY = 'canvas:ready',
  OBJECT_ADDED = 'canvas:object-added',
  OBJECT_REMOVED = 'canvas:object-removed',
  OBJECT_MODIFIED = 'canvas:object-modified',
  ERROR = 'canvas:error',
}

export interface CanvasEvent {
  type: CanvasEventType;
  payload?: any;
}

type CanvasEventListener = (event: CanvasEvent) => void;

export class CanvasEngine {
  private canvas: fabric.Canvas | null = null;
  private eventListeners: Map<CanvasEventType, Set<CanvasEventListener>> = new Map();
  private isInitialized = false;

  /**
   * 初始化画布
   * [2025-01-30 23:00:00] Design Lab 4.0: 初始化顺序与事件总线
   * [2025-01-30 20:10:00] 修复：分阶段初始化（skeleton→主图加载→fit+center）
   */
  async initialize(
    canvasElement: HTMLCanvasElement,
    fabricModule: typeof fabric,
    options?: {
      /** 是否加载产品主图 */
      loadProductImage?: boolean;
      /** 产品图片加载选项 */
      productImageOptions?: {
        colorName?: string | null;
        view: 'front' | 'back' | 'sleeve';
        useAPI?: boolean;
      };
      /** Git SHA（用于版本戳） */
      gitSha?: string;
    }
  ): Promise<void> {
    if (this.isInitialized) {
      console.warn('[Canvas Engine] 画布已初始化，跳过重复初始化');
      return;
    }

    try {
      // 阶段 1: 创建 Fabric Canvas 实例（Skeleton）
      this.canvas = new fabricModule.Canvas(canvasElement, {
        width: 1000,
        height: 1200,
        backgroundColor: 'transparent',
        preserveObjectStacking: true,
        selection: true,
        stateful: true,
      });

      // 2. 配置画布属性
      const devicePixelRatio = window.devicePixelRatio || 1;
      const scale = devicePixelRatio;
      
      // [2025-12-19 22:40:00] 设置画布实际像素尺寸（考虑devicePixelRatio）
      this.canvas.setWidth(1000 * scale);
      this.canvas.setHeight(1200 * scale);
      
      // [2025-12-19 22:40:00] 确保所有canvas元素（lower-canvas和upper-canvas）的CSS尺寸正确
      const container = (this.canvas as any).containerEl || (this.canvas as any).wrapperEl;
      if (container) {
        container.style.width = '1000px';
        container.style.height = '1200px';
        container.style.position = 'relative';
        container.style.margin = '0 auto';
      }
      
      const canvasEl = this.canvas.getElement();
      const upperCanvasEl = (this.canvas as any).upperCanvasEl;
      
      if (canvasEl) {
        // lower-canvas的CSS尺寸
        canvasEl.style.width = '1000px';
        canvasEl.style.height = '1200px';
      }
      
      if (upperCanvasEl) {
        // upper-canvas的CSS尺寸
        upperCanvasEl.style.width = '1000px';
        upperCanvasEl.style.height = '1200px';
      }
      
      this.canvas.setZoom(1);
      this.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);

      // 3. 设置对象默认属性
      fabricModule.Object.prototype.set({
        borderColor: '#3b82f6',
        cornerColor: '#3b82f6',
        cornerSize: 10,
        transparentCorners: false,
        borderScaleFactor: 2,
        cornerStyle: 'circle',
        rotatingPointOffset: 40,
      });

      // 4. 绑定画布事件
      this.setupEventListeners();

      // 5. 阶段 2: 加载产品主图（如果启用）
      // [2025-01-30 20:55:00] 修复：使用一次性 ready 事件，防止重复触发
      if (options?.loadProductImage && options?.productImageOptions) {
        try {
          const { loadProductImageLayer } = await import('./layers/productImageLayer');
          
          // 监听一次性 ready 事件
          let readyHandlerFired = false;
          const readyHandler = (e: any) => {
            if (readyHandlerFired) {
              return; // 防止重复触发
            }
            readyHandlerFired = true;
            console.log('[Canvas Engine] ✅ Product image ready (one-time event)');
            this.canvas?.off('product-image:ready', readyHandler);
            // 触发 canvas:ready 事件
            this.emit(CanvasEventType.READY, { 
              canvas: this.canvas,
              productImageReady: true,
            });
          };
          this.canvas.on('product-image:ready', readyHandler);
          
          const productImageResult = await loadProductImageLayer({
            canvas: this.canvas,
            fabric: fabricModule,
            canvasWidth: 1000,
            canvasHeight: 1200,
            imageOptions: options.productImageOptions,
            gitSha: options.gitSha,
          });
          
          if (!productImageResult.success) {
            this.canvas?.off('product-image:ready', readyHandler);
            console.warn('[Canvas Engine] Failed to load product image:', productImageResult.error);
            // 触发错误事件，但不阻止初始化
            this.emit(CanvasEventType.ERROR, {
              error: productImageResult.error || new Error('Failed to load product image'),
              type: 'product-image-load-failed',
            });
            // 即使失败也触发 ready 事件
            this.emit(CanvasEventType.READY, { canvas: this.canvas });
          } else {
            // 成功加载，ready 事件将由 product-image:ready 触发
            console.log('[Canvas Engine] Product image loading initiated, waiting for ready event');
          }
        } catch (error) {
          console.error('[Canvas Engine] Error loading product image:', error);
          this.emit(CanvasEventType.ERROR, {
            error: error instanceof Error ? error : new Error(String(error)),
            type: 'product-image-load-error',
          });
          // 即使出错也触发 ready 事件
          this.emit(CanvasEventType.READY, { canvas: this.canvas });
        }
      } else {
        // 没有加载产品图片，直接触发 ready 事件
        this.emit(CanvasEventType.READY, { canvas: this.canvas });
      }

      // 6. 标记为已初始化
      this.isInitialized = true;

      // 7. READY 事件由产品图片加载完成后触发（或立即触发如果没有加载产品图片）
      // 见上面的阶段 2 处理
    } catch (error) {
      this.emit(CanvasEventType.ERROR, { error });
      throw error;
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    if (!this.canvas) return;

    this.canvas.on('object:added', (e) => {
      this.emit(CanvasEventType.OBJECT_ADDED, { object: e.target });
    });

    this.canvas.on('object:removed', (e) => {
      this.emit(CanvasEventType.OBJECT_REMOVED, { object: e.target });
    });

    this.canvas.on('object:modified', (e) => {
      this.emit(CanvasEventType.OBJECT_MODIFIED, { object: e.target });
    });
  }

  /**
   * 触发事件
   */
  private emit(type: CanvasEventType, payload?: any): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener({ type, payload });
        } catch (error) {
          console.error(`[Canvas Engine] 事件监听器错误 (${type}):`, error);
        }
      });
    }
  }

  /**
   * 添加事件监听器
   */
  on(type: CanvasEventType, listener: CanvasEventListener): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    this.eventListeners.get(type)!.add(listener);
  }

  /**
   * 移除事件监听器
   */
  off(type: CanvasEventType, listener: CanvasEventListener): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * 获取画布实例
   */
  getCanvas(): fabric.Canvas | null {
    return this.canvas;
  }

  /**
   * 清理资源
   */
  dispose(): void {
    if (this.canvas) {
      this.canvas.off();
      this.canvas.dispose();
      this.canvas = null;
    }
    this.eventListeners.clear();
    this.isInitialized = false;
  }
}

// 单例实例
export const canvasEngine = new CanvasEngine();

