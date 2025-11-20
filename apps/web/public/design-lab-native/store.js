/**
 * Store - 状态管理与数据持久化
 * [2025-11-19 10:15:00] 管理设计稿状态、三面画布数据、产品信息
 */
(function() {
  'use strict';

  // [2025-11-19 10:15:00] 数据 store 结构
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

  // [2025-11-19 11:00:00] 初始化时从 URL 读取
  initFromURL();

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
  
  // [2025-11-19 11:00:00] 如果 URL 中有 variantId，优先使用 URL 参数
  initFromURL();

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

