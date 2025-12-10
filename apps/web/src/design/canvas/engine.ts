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
   */
  async initialize(
    canvasElement: HTMLCanvasElement,
    fabricModule: typeof fabric
  ): Promise<void> {
    if (this.isInitialized) {
      console.warn('[Canvas Engine] 画布已初始化，跳过重复初始化');
      return;
    }

    try {
      // 1. 创建 Fabric Canvas 实例
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
      
      this.canvas.setWidth(1000 * scale);
      this.canvas.setHeight(1200 * scale);
      
      const canvasEl = this.canvas.getElement();
      if (canvasEl) {
        canvasEl.style.width = '1000px';
        canvasEl.style.height = '1200px';
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

      // 5. 标记为已初始化
      this.isInitialized = true;

      // 6. 触发 READY 事件
      this.emit(CanvasEventType.READY, { canvas: this.canvas });
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

