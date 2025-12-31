/**
 * Panel Manager - 面板切换管理器
* 管理左侧固定操作区的面板切换（单一容器 + 面板切换）
 */
(function() {
  'use strict';

  let currentPanel = 'home'; // 当前激活的面板
  
// 监听 toolbar:ready 事件，确保 toolbar.js 已加载
  let toolbarReady = false;
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('toolbar:ready', () => {
      toolbarReady = true;
      console.log('[PanelManager] ===== toolbar:ready event received =====', {
        hasDesignLabToolbar: !!window.DesignLabToolbar,
        methods: window.DesignLabToolbar ? Object.keys(window.DesignLabToolbar) : []
      });
    });
    
// 如果 toolbar.js 已经加载完成，立即检查
    if (window.DesignLabToolbar) {
      toolbarReady = true;
      console.log('[PanelManager] ===== DesignLabToolbar already available on init =====');
    }
  }

// 初始化面板管理器
  function init() {
    console.log('[PanelManager] Initializing...');
// 默认显示 home 面板
    openPanel('home');

// 绑定工具栏按钮
    const railButtons = document.querySelectorAll('.dl-rail__btn[data-tool]');
    console.log('[PanelManager] Found rail buttons:', railButtons.length);
    railButtons.forEach(btn => {
      const tool = btn.getAttribute('data-tool');
      console.log('[PanelManager] Binding button:', tool);
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const tool = btn.getAttribute('data-tool');
        console.log('[PanelManager] Button clicked:', tool);
        if (tool === 'upload') {
          openPanel('upload');
        } else if (tool === 'text') {
          openPanel('text');
        } else if (tool === 'art') {
          openPanel('art');
        } else if (tool === 'names') {
// 直接打开 Names and Numbers 输入模态框，跳过 Step 1
          console.log('[PanelManager] Processing names tool click...');
          
// 如果 DesignLabToolbar 还没加载，等待并重试
          const tryShowModal = (retryCount = 0) => {
            if (window.DesignLabToolbar && typeof window.DesignLabToolbar.showNamesNumbersModal === 'function') {
              console.log('[PanelManager] ✅ DesignLabToolbar.showNamesNumbersModal available, calling...', {
                retryCount,
                allMethods: Object.keys(window.DesignLabToolbar)
              });
              try {
                window.DesignLabToolbar.showNamesNumbersModal();
                console.log('[PanelManager] ✅ showNamesNumbersModal called successfully');
              } catch (error) {
                console.error('[PanelManager] ❌ Error calling showNamesNumbersModal:', error);
                openPanel('names');
              }
            } else if (retryCount < 20) {
// 最多重试 20 次，每次等待 50ms（总共最多等待 1 秒）
              console.log('[PanelManager] ⏳ Waiting for DesignLabToolbar...', {
                retryCount,
                hasDesignLabToolbar: !!window.DesignLabToolbar,
                availableMethods: window.DesignLabToolbar ? Object.keys(window.DesignLabToolbar) : [],
                windowKeys: Object.keys(window).filter(k => k.includes('Design'))
              });
              setTimeout(() => tryShowModal(retryCount + 1), 50);
            } else {
              console.error('[PanelManager] ❌ DesignLabToolbar.showNamesNumbersModal not available after 20 retries', {
                hasDesignLabToolbar: !!window.DesignLabToolbar,
                availableMethods: window.DesignLabToolbar ? Object.keys(window.DesignLabToolbar) : [],
                windowKeys: Object.keys(window).filter(k => k.includes('Design')),
                fallingBack: true
              });
              openPanel('names');
            }
          };
          tryShowModal();
// 隐藏颜色功能，2期开发
        // } else if (tool === 'colors') {
        //   openPanel('product-colors');
        } else {
          console.warn('[PanelManager] Unknown tool:', tool);
        }
      });
    });

// 绑定 home 面板的启动卡按钮（panel__guide-action）
    const homeActions = document.querySelectorAll('.panel__guide-action[data-action]');
    homeActions.forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        if (action === 'upload') {
          openPanel('upload');
        } else if (action === 'text') {
          openPanel('text');
          setTimeout(() => {
            const textInput = document.getElementById('text-input');
            if (textInput) textInput.focus();
          }, 100);
        } else if (action === 'art') {
          openPanel('art');
// 隐藏添加产品功能，2期开发
        // } else if (action === 'products') {
        //   if (window.showProductModal) {
        //     window.showProductModal();
        //   } else {
        //     console.log('[PanelManager] open-add-products');
        //   }
        }
      });
    });
    
// 隐藏 Pick another color 功能，2期开发
    // const pickAnotherColorBtn = document.getElementById('btn-pick-another-color');
    // if (pickAnotherColorBtn) {
    //   pickAnotherColorBtn.addEventListener('click', () => {
//   // 可以打开颜色选择器或保持当前面板
    //     console.log('[PanelManager] Pick another color');
    //   });
    // }

// 绑定面板内的返回和关闭按钮
    const backButtons = document.querySelectorAll('.side-panel__back');
    backButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        openPanel('home');
      });
    });

    const closeButtons = document.querySelectorAll('.side-panel__close');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        closePanel();
      });
    });

// 移动端：点击工具栏按钮打开抽屉
    if (window.innerWidth <= 991) {
      railButtons.forEach(btn => {
// 移动端额外处理：打开侧边栏（不影响桌面端的事件处理）
        btn.addEventListener('click', (e) => {
          // 不阻止事件传播，让上面的处理函数也能执行
          const sidePanel = document.querySelector('.side-panel');
          if (sidePanel) {
            sidePanel.classList.add('is-open');
          }
        });
      });
    }
    
    console.log('[PanelManager] Initialization completed');
  }

  const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

  function transferFocus(panelName, targetPanel) {
    if (panelName === 'home') {
      const firstGuideBtn = targetPanel.querySelector('.panel__guide-action');
      if (firstGuideBtn) {
        firstGuideBtn.focus();
        return;
      }
    }
    if (panelName === 'text') {
      const textInput = document.getElementById('text-input');
      if (textInput) {
        textInput.focus();
        return;
      }
    }

    const focusable = targetPanel.querySelector(FOCUSABLE_SELECTOR);
    if (focusable) {
      focusable.focus();
      return;
    }

    const firstToolbarBtn = document.querySelector('.dl-rail__btn');
    if (firstToolbarBtn) {
      firstToolbarBtn.focus();
    }
  }

  function deactivatePanel(panel) {
    if (!panel) return;
    if (panel.contains(document.activeElement)) {
      document.activeElement.blur();
    }
    panel.classList.remove('panel--active');
    panel.setAttribute('aria-selected', 'false');
    panel.setAttribute('aria-hidden', 'true');
    panel.setAttribute('inert', '');
  }

  function activatePanel(panelName, panel) {
    panel.classList.add('panel--active');
    panel.setAttribute('aria-selected', 'true');
    panel.setAttribute('aria-hidden', 'false');
    panel.removeAttribute('inert');
    currentPanel = panelName;
    transferFocus(panelName, panel);
  }

// 打开面板
  function openPanel(panelName) {
    console.log('[PanelManager] Opening panel:', panelName);
// 隐藏所有面板
    const panels = document.querySelectorAll('.panel[data-panel]');
    console.log('[PanelManager] Found panels:', panels.length);
    panels.forEach(panel => {
      deactivatePanel(panel);
    });

// 显示目标面板
    const targetPanel = document.querySelector(`.panel[data-panel="${panelName}"]`);
    if (targetPanel) {
      console.log('[PanelManager] Target panel found:', panelName);
      activatePanel(panelName, targetPanel);
// 更新工具栏按钮状态
      updateRailButtonStates(panelName);
      
// 如果打开 names 面板，初始化表单
      if (panelName === 'names' && window.DesignLabToolbar && typeof window.DesignLabToolbar.initNamesNumbersForm === 'function') {
        setTimeout(() => {
          window.DesignLabToolbar.initNamesNumbersForm();
        }, 100);
      }
    } else {
      console.error('[PanelManager] Target panel not found:', panelName);
    }
  }

// 关闭面板（返回 home）
  function closePanel() {
    openPanel('home');
  }

// 更新工具栏按钮状态
  function updateRailButtonStates(activePanel) {
    const railButtons = document.querySelectorAll('.dl-rail__btn[data-tool]');
    railButtons.forEach(btn => {
      const tool = btn.getAttribute('data-tool');
      let isActive = false;

      if (tool === 'upload' && activePanel === 'upload') {
        isActive = true;
      } else if (tool === 'text' && activePanel === 'text') {
        isActive = true;
      } else if (tool === 'art' && activePanel === 'art') {
        isActive = true;
// 隐藏颜色功能，2期开发
      // } else if (tool === 'colors' && activePanel === 'product-colors') {
      //   isActive = true;
      } else if (tool === 'names' && activePanel === 'names') {
        isActive = true;
      }

      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

// 获取当前面板
  function getCurrentPanel() {
    return currentPanel;
  }

// 导出全局 API
  window.DesignLabPanel = {
    init,
    openPanel,
    closePanel,
    getCurrentPanel
  };
  
// 添加调试日志，确认面板管理器已加载
  console.log('[PanelManager] Module loaded, window.DesignLabPanel exported');
})();

