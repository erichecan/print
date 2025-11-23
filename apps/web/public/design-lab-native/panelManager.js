/**
 * Panel Manager - 面板切换管理器
 * [2025-11-19 12:00:00] 管理左侧固定操作区的面板切换（单一容器 + 面板切换）
 */
(function() {
  'use strict';

  let currentPanel = 'home'; // 当前激活的面板

  // [2025-11-19 12:00:00] 初始化面板管理器
  function init() {
    console.log('[PanelManager] Initializing...');
    // [2025-11-19 12:00:00] 默认显示 home 面板
    openPanel('home');

    // [2025-11-19 12:00:00] 绑定工具栏按钮
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
          openPanel('names');
        // [2025-01-27] 隐藏颜色功能，2期开发
        // } else if (tool === 'colors') {
        //   openPanel('product-colors');
        } else {
          console.warn('[PanelManager] Unknown tool:', tool);
        }
      });
    });

    // [2025-11-19 12:00:00] 绑定 home 面板的启动卡按钮（panel__guide-action）
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
        // [2025-01-27] 隐藏添加产品功能，2期开发
        // } else if (action === 'products') {
        //   if (window.showProductModal) {
        //     window.showProductModal();
        //   } else {
        //     console.log('[PanelManager] open-add-products');
        //   }
        }
      });
    });
    
    // [2025-01-27] 隐藏 Pick another color 功能，2期开发
    // const pickAnotherColorBtn = document.getElementById('btn-pick-another-color');
    // if (pickAnotherColorBtn) {
    //   pickAnotherColorBtn.addEventListener('click', () => {
    //     // [2025-11-19 12:00:00] 可以打开颜色选择器或保持当前面板
    //     console.log('[PanelManager] Pick another color');
    //   });
    // }

    // [2025-11-19 12:00:00] 绑定面板内的返回和关闭按钮
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

    // [2025-11-19 12:00:00] 移动端：点击工具栏按钮打开抽屉
    if (window.innerWidth <= 991) {
      railButtons.forEach(btn => {
        // [2025-01-27] 移动端额外处理：打开侧边栏（不影响桌面端的事件处理）
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

  // [2025-11-19 12:00:00] 打开面板
  function openPanel(panelName) {
    console.log('[PanelManager] Opening panel:', panelName);
    // [2025-11-19 12:00:00] 隐藏所有面板
    const panels = document.querySelectorAll('.panel[data-panel]');
    console.log('[PanelManager] Found panels:', panels.length);
    panels.forEach(panel => {
      deactivatePanel(panel);
    });

    // [2025-11-19 12:00:00] 显示目标面板
    const targetPanel = document.querySelector(`.panel[data-panel="${panelName}"]`);
    if (targetPanel) {
      console.log('[PanelManager] Target panel found:', panelName);
      activatePanel(panelName, targetPanel);
      // [2025-11-19 12:00:00] 更新工具栏按钮状态
      updateRailButtonStates(panelName);
    } else {
      console.error('[PanelManager] Target panel not found:', panelName);
    }
  }

  // [2025-11-19 12:00:00] 关闭面板（返回 home）
  function closePanel() {
    openPanel('home');
  }

  // [2025-11-19 12:00:00] 更新工具栏按钮状态
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
      // [2025-01-27] 隐藏颜色功能，2期开发
      // } else if (tool === 'colors' && activePanel === 'product-colors') {
      //   isActive = true;
      } else if (tool === 'names' && activePanel === 'names') {
        isActive = true;
      }

      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  // [2025-11-19 12:00:00] 获取当前面板
  function getCurrentPanel() {
    return currentPanel;
  }

  // [2025-11-19 12:00:00] 导出全局 API
  window.DesignLabPanel = {
    init,
    openPanel,
    closePanel,
    getCurrentPanel
  };
  
  // [2025-01-27] 添加调试日志，确认面板管理器已加载
  console.log('[PanelManager] Module loaded, window.DesignLabPanel exported');
})();

