/**
 * Store - 状态管理与数据持久化
 * [2025-11-19 10:15:00] 管理设计稿状态、三面画布数据、产品信息
 */
(function() {
  'use strict';

  // [2025-11-19 10:15:00] 数据 store 结构
  const PRODUCT_PAYLOAD_KEY = 'designLab:productPayload';

  const store = {
    currentSide: 'front', // 'front' | 'back' | 'sleeve'
    sides: {
      front: { canvasJSON: null, thumbDataURL: null },
      back: { canvasJSON: null, thumbDataURL: null },
      sleeve: { canvasJSON: null, thumbDataURL: null }
    },
    product: {
      id: 'prod-001',
      name: 'Gildan Softstyle Jersey T-shirt',
      color: 'Heather Dark Grey',
      colors: ['Red', 'Heather Dark Grey', 'Navy', 'Black', 'White'],
      baseImages: {
        front: 'https://picsum.photos/seed/tshirt-front/900/700',
        back: 'https://picsum.photos/seed/tshirt-back/900/700',
        sleeve: 'https://picsum.photos/seed/tshirt-sleeve/900/700'
      },
      gallery: [],
      variantId: null // [2025-11-19 11:00:00] 从 URL 参数获取的 variantId
    },
    version: '1.0.0',
    timestamp: null
  };
  
  // [2025-11-19 11:00:00] 从 URL 参数初始化 variantId
  function initFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const variantId = urlParams.get('variantId');
    if (variantId) {
      store.product.variantId = variantId;
      console.log('[Store] variantId from URL:', variantId);
    }
  }

  // [2025-11-19 10:15:00] 从 localStorage 恢复状态
  function loadFromStorage() {
    try {
      const saved = localStorage.getItem('designLabStore');
      if (saved) {
        const parsed = JSON.parse(saved);
        Object.assign(store, parsed);
        console.log('[Store] Loaded from localStorage');
      }
    } catch (e) {
      console.warn('[Store] Failed to load from localStorage:', e);
    }
  }

  // [2025-11-19 10:15:00] 保存状态到 localStorage
  function saveToStorage() {
    try {
      store.timestamp = new Date().toISOString();
      localStorage.setItem('designLabStore', JSON.stringify(store));
      console.log('[Store] Saved to localStorage');
    } catch (e) {
      console.warn('[Store] Failed to save to localStorage:', e);
    }
  }

  // [2025-11-20 12:30:00] 从商品详情写入的 payload 中恢复产品信息
  function requestVisualRefresh() {
    if (window.DesignLabCanvas && window.DesignLabCanvas.loadBackgroundForCurrentSide) {
      window.DesignLabCanvas.loadBackgroundForCurrentSide();
      window.__DesignLabNeedsBackgroundRefresh = false;
    } else {
      window.__DesignLabNeedsBackgroundRefresh = true;
    }
    if (typeof window.updateProductInfo === 'function') {
      window.updateProductInfo();
    }
  }

  function hydrateProductFromPayload() {
    try {
      const payloadRaw = localStorage.getItem(PRODUCT_PAYLOAD_KEY);
      if (!payloadRaw) return;
      const payload = JSON.parse(payloadRaw);
      if (!payload || typeof payload !== 'object') return;

      const nextBaseImages = {
        front: payload.baseImages?.front || store.product.baseImages.front,
        back: payload.baseImages?.back || payload.baseImages?.front || store.product.baseImages.back,
        sleeve: payload.baseImages?.sleeve || payload.baseImages?.front || store.product.baseImages.sleeve,
      };

      store.product = {
        ...store.product,
        id: payload.productId || store.product.id,
        name: payload.productName || store.product.name,
        color: payload.color || store.product.color,
        colors: Array.isArray(payload.colors) && payload.colors.length ? payload.colors : store.product.colors,
        baseImages: nextBaseImages,
        variantId: payload.variantId || store.product.variantId,
        gallery: Array.isArray(payload.gallery) ? payload.gallery : store.product.gallery
      };

      saveToStorage();
      requestVisualRefresh();
      localStorage.removeItem(PRODUCT_PAYLOAD_KEY);
      console.log('[Store] Hydrated product from payload');
    } catch (e) {
      console.warn('[Store] Failed to hydrate product payload:', e);
    }
  }

  function needsVariantHydration() {
    const base = store.product.baseImages || {};
    const isPlaceholder =
      !base.front ||
      base.front.includes('picsum.photos') ||
      base.front.includes('hero-card-tee') ||
      base.front.includes('cat-tshirt.png');
    const needs = !!store.product.variantId && isPlaceholder;
    console.log('[Store] needsVariantHydration check:', {
      hasVariantId: !!store.product.variantId,
      isPlaceholder: isPlaceholder,
      baseFront: base.front,
      needs: needs
    });
    return needs;
  }

  // [2025-01-27 21:55:00] 增强日志记录，用于调试图片尺寸和 API 调用
  async function hydrateProductFromVariantId() {
    const timestamp = new Date().toISOString();
    console.log('[Store] ===== hydrateProductFromVariantId START =====', { timestamp });
    
    if (!needsVariantHydration()) {
      console.log('[Store] Skipping hydration - not needed', { timestamp });
      return;
    }
    
    const variantId = store.product.variantId;
    if (!variantId) {
      console.warn('[Store] No variantId available for hydration', { 
        currentProduct: store.product,
        timestamp 
      });
      return;
    }

    console.log('[Store] Fetching product data for variantId:', {
      variantId,
      currentProduct: {
        id: store.product.id,
        name: store.product.name,
        color: store.product.color
      },
      timestamp
    });
    
    try {
      const apiUrl = `/api/products/variant/${variantId}`;
      console.log('[Store] API Request:', {
        url: apiUrl,
        method: 'GET',
        timestamp
      });
      
      const startTime = performance.now();
      const response = await fetch(apiUrl);
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      console.log('[Store] API Response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        duration: `${duration}ms`,
        headers: {
          contentType: response.headers.get('content-type'),
          contentLength: response.headers.get('content-length')
        },
        timestamp
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = errorText;
        }
        
        console.error('[Store] API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          url: apiUrl,
          timestamp
        });
        return;
      }
      
      const data = await response.json();
      console.log('[Store] API Success - Response Data:', {
        productId: data.productId,
        productName: data.productName,
        variantId: data.variantId,
        color: data.color,
        colors: data.colors,
        baseImages: data.baseImages,
        galleryCount: data.gallery?.length || 0,
        timestamp
      });
      
      if (!data) {
        console.warn('[Store] API returned empty data', { timestamp });
        return;
      }

      const previousProduct = { ...store.product };
      store.product = {
        ...store.product,
        id: data.productId || store.product.id,
        name: data.productName || store.product.name,
        color: data.color || store.product.color,
        colors: Array.isArray(data.colors) && data.colors.length ? data.colors : store.product.colors,
        baseImages: data.baseImages || store.product.baseImages,
        gallery: Array.isArray(data.gallery) ? data.gallery : store.product.gallery,
      };

      console.log('[Store] Product Data Updated:', {
        previous: {
          id: previousProduct.id,
          name: previousProduct.name,
          baseImages: previousProduct.baseImages
        },
        current: {
          id: store.product.id,
          name: store.product.name,
          color: store.product.color,
          baseImages: store.product.baseImages,
          galleryCount: store.product.gallery?.length || 0
        },
        timestamp
      });

      saveToStorage();
      requestVisualRefresh();
      console.log('[Store] ===== hydrateProductFromVariantId SUCCESS =====', { timestamp });
    } catch (e) {
      console.error('[Store] Failed to hydrate product via API:', e);
      console.error('[Store] Error details:', e.message, e.stack);
    }
  }

  // [2025-11-19 10:15:00] 获取当前面的画布数据
  function getCurrentSideData() {
    return store.sides[store.currentSide];
  }

  // [2025-11-19 10:15:00] 设置当前面的画布数据
  function setCurrentSideData(canvasJSON, thumbDataURL) {
    store.sides[store.currentSide] = {
      canvasJSON: canvasJSON,
      thumbDataURL: thumbDataURL
    };
    saveToStorage();
  }

  // [2025-11-19 10:15:00] 切换画布面
  function setActiveSide(side) {
    if (store.currentSide !== side && ['front', 'back', 'sleeve'].includes(side)) {
      console.log('[Store] side:', side);
      store.currentSide = side;
      saveToStorage();
      return true;
    }
    return false;
  }

  // [2025-11-19 10:15:00] 设置产品颜色
  function setColor(color) {
    if (store.product.colors.includes(color)) {
      store.product.color = color;
      saveToStorage();
      console.log('[Store] Color changed to:', color);
      return true;
    }
    return false;
  }

  // [2025-11-19 10:15:00] 导出完整设计数据
  function exportDesign() {
    return {
      version: store.version,
      timestamp: new Date().toISOString(),
      product: store.product,
      sides: store.sides
    };
  }

  // [2025-11-19 10:15:00] 导入设计数据
  function importDesign(data) {
    if (data && data.sides && data.product) {
      store.sides = data.sides;
      store.product = data.product;
      if (data.currentSide) {
        store.currentSide = data.currentSide;
      }
      saveToStorage();
      console.log('[Store] Design imported');
      return true;
    }
    return false;
  }

  // [2025-11-19 10:15:00] 清空所有数据
  function clearStore() {
    store.sides = {
      front: { canvasJSON: null, thumbDataURL: null },
      back: { canvasJSON: null, thumbDataURL: null },
      sleeve: { canvasJSON: null, thumbDataURL: null }
    };
    saveToStorage();
  }

  // [2025-11-19 10:15:00] 初始化：从 localStorage 加载
  loadFromStorage();
  hydrateProductFromPayload();
  initFromURL();
  // [2025-11-21 11:20:00] 异步加载产品数据，确保在初始化完成后执行
  setTimeout(() => {
    hydrateProductFromVariantId();
  }, 100);

  // [2025-11-19 10:15:00] 页面卸载前保存
  window.addEventListener('beforeunload', saveToStorage);

  // [2025-11-19 10:15:00] 导出全局 API
  window.DesignLabStore = {
    getStore: () => ({ ...store }),
    getCurrentSide: () => store.currentSide,
    getCurrentSideData,
    setCurrentSideData,
    setActiveSide,
    setColor,
    getProduct: () => ({ ...store.product }),
    exportDesign,
    importDesign,
    clearStore,
    saveToStorage
  };
})();

