// [2025-01-31 20:40:00] 测试销售订单管理页面导航按钮和状态选择器样式

const { chromium } = require('playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SALES_EMAIL = 'salesmanager@suvernireplus.com';
const SALES_PASSWORD = 'manager123456';

(async () => {
  console.log('🚀 开始测试销售订单管理页面...\n');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // 1. 访问登录页面
    console.log('1️⃣ 访问登录页面...');
    await page.goto(`${BASE_URL}/offline-orders/sales/login`);
    await page.waitForLoadState('networkidle');
    
    // 2. 登录
    console.log('2️⃣ 登录销售主管账号...');
    await page.fill('input[type="email"]', SALES_EMAIL);
    await page.fill('input[type="password"]', SALES_PASSWORD);
    await page.click('button[type="submit"]');
    
    // 等待跳转到订单列表
    await page.waitForURL(/\/offline-orders\/sales\/orders/, { timeout: 10000 });
    console.log('✅ 登录成功\n');
    
    // 3. 等待页面加载
    console.log('3️⃣ 等待页面加载...');
    await page.waitForSelector('.sales-orders-header', { timeout: 10000 });
    await page.waitForTimeout(2000); // 等待所有内容渲染
    
    // 4. 检查导航按钮
    console.log('4️⃣ 检查导航按钮...');
    await page.waitForTimeout(3000); // 等待页面完全渲染
    
    const navButtons = await page.evaluate(() => {
      const actions = document.querySelector('.sales-orders-header-actions');
      if (!actions) {
        // 检查 header 是否存在
        const header = document.querySelector('.sales-orders-header');
        return { 
          found: false, 
          headerExists: !!header,
          actionsHTML: header ? header.innerHTML.substring(0, 200) : null
        };
      }
      
      const buttons = Array.from(actions.querySelectorAll('button'));
      const navBtnSecondary = actions.querySelector('.sales-orders-nav-btn-secondary');
      const navBtnPrimary = actions.querySelector('.sales-orders-nav-btn-primary');
      const newBtn = actions.querySelector('.sales-orders-new');
      
      return {
        found: true,
        totalButtons: buttons.length,
        navBtnSecondaryExists: !!navBtnSecondary,
        navBtnPrimaryExists: !!navBtnPrimary,
        newBtnExists: !!newBtn,
        buttons: buttons.map(btn => ({
          text: btn.textContent?.trim(),
          className: btn.className,
          classList: Array.from(btn.classList),
          visible: window.getComputedStyle(btn).display !== 'none',
          rect: btn.getBoundingClientRect(),
          innerHTML: btn.innerHTML.substring(0, 50)
        })),
        actionsHTML: actions.innerHTML.substring(0, 1000)
      };
    });
    
    console.log('导航按钮检查结果:', JSON.stringify(navButtons, null, 2));
    
    if (navButtons.found && navButtons.buttons.length > 0) {
      console.log(`✅ 找到 ${navButtons.buttons.length} 个按钮`);
      navButtons.buttons.forEach((btn, i) => {
        console.log(`  按钮 ${i + 1}: "${btn.text}" - 可见: ${btn.visible} - 类: ${btn.className}`);
      });
      
      if (navButtons.buttons.length < 3) {
        console.warn(`⚠️ 警告：应该有三个按钮，但只找到了 ${navButtons.buttons.length} 个`);
      }
    } else {
      console.error('❌ 未找到导航按钮');
      if (navButtons.actionsHTML) {
        console.log('Actions HTML:', navButtons.actionsHTML);
      }
    }
    
    // 5. 检查状态选择器样式
    console.log('\n5️⃣ 检查状态选择器样式...');
    const statusSelectorStyles = await page.evaluate(() => {
      const selector = document.querySelector('button[aria-haspopup="listbox"]');
      if (!selector) return { found: false };
      
      const styles = window.getComputedStyle(selector);
      const span = selector.querySelector('span');
      const spanStyles = span ? window.getComputedStyle(span) : null;
      
      return {
        found: true,
        button: {
          borderRadius: styles.borderRadius,
          border: styles.border,
          hasRoundedXL: selector.className.includes('rounded-xl'),
          classes: selector.className.split(' ').filter(c => c.includes('rounded'))
        },
        innerSpan: spanStyles ? {
          borderRadius: spanStyles.borderRadius,
          hasRoundedFull: span.className.includes('rounded-full'),
          classes: span.className.split(' ').filter(c => c.includes('rounded'))
        } : null
      };
    });
    
    console.log('状态选择器样式检查结果:', JSON.stringify(statusSelectorStyles, null, 2));
    
    if (statusSelectorStyles.found) {
      console.log('✅ 找到状态选择器');
      console.log(`  按钮圆角: ${statusSelectorStyles.button.borderRadius}`);
      console.log(`  内部标签圆角: ${statusSelectorStyles.innerSpan?.borderRadius || 'N/A'}`);
    } else {
      console.warn('⚠️ 未找到状态选择器（可能没有订单数据）');
    }
    
    // 6. 截图
    console.log('\n6️⃣ 截图保存...');
    await page.screenshot({ 
      path: 'test-results/sales-orders-navigation-test.png', 
      fullPage: true 
    });
    console.log('✅ 截图已保存: test-results/sales-orders-navigation-test.png\n');
    
    // 7. 测试点击下拉菜单
    console.log('7️⃣ 测试状态选择器下拉菜单...');
    const firstSelector = await page.$('button[aria-haspopup="listbox"]');
    if (firstSelector) {
      await firstSelector.click();
      await page.waitForTimeout(500);
      
      const dropdownStyles = await page.evaluate(() => {
        const dropdown = document.querySelector('ul[role="listbox"]');
        if (!dropdown) return { found: false };
        
        const styles = window.getComputedStyle(dropdown);
        return {
          found: true,
          borderRadius: styles.borderRadius,
          hasRoundedXL: dropdown.className.includes('rounded-xl'),
          classes: dropdown.className.split(' ').filter(c => c.includes('rounded'))
        };
      });
      
      console.log('下拉菜单样式检查结果:', JSON.stringify(dropdownStyles, null, 2));
      
      if (dropdownStyles.found) {
        console.log('✅ 下拉菜单圆角: ' + dropdownStyles.borderRadius);
      }
    }
    
    console.log('\n✅✅✅ 测试完成！✅✅✅');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
    await page.screenshot({ 
      path: 'test-results/sales-orders-navigation-error.png', 
      fullPage: true 
    });
  } finally {
    await browser.close();
  }
})();
