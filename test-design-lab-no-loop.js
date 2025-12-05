/**
 * Chrome DevTools 测试脚本 - 验证 Design Lab 底图加载无死循环
 * 
 * 使用方法：
 * 1. 打开 Chrome DevTools (F12)
 * 2. 切换到 Console 标签
 * 3. 复制粘贴此脚本并执行
 * 4. 观察输出，确认没有死循环
 */

(function() {
  console.log('🧪 开始测试 Design Lab 底图加载...');
  
  let loadCount = 0;
  let lastLoadTime = Date.now();
  const loadTimes = [];
  
  // 拦截 console.log 来监控 loadBackgroundImage 调用
  const originalLog = console.log;
  console.log = function(...args) {
    const message = args.join(' ');
    
    // 检测 loadBackgroundImage 相关日志
    if (message.includes('Loading background image:') || 
        message.includes('Removing old background image')) {
      loadCount++;
      const now = Date.now();
      const timeSinceLastLoad = now - lastLoadTime;
      lastLoadTime = now;
      loadTimes.push(timeSinceLastLoad);
      
      originalLog.apply(console, [
        `[TEST] 检测到第 ${loadCount} 次加载调用，距离上次 ${timeSinceLastLoad}ms`,
        ...args
      ]);
      
      // 如果短时间内多次加载，可能是死循环
      if (loadTimes.length > 3) {
        const recentTimes = loadTimes.slice(-3);
        const avgTime = recentTimes.reduce((a, b) => a + b, 0) / recentTimes.length;
        if (avgTime < 100) {
          console.warn('⚠️ 警告：检测到可能的死循环！平均间隔:', avgTime, 'ms');
        }
      }
    } else {
      originalLog.apply(console, args);
    }
  };
  
  // 监控 10 秒
  setTimeout(() => {
    console.log = originalLog;
    console.log('\n📊 测试结果：');
    console.log(`总加载次数: ${loadCount}`);
    console.log(`平均间隔: ${loadTimes.length > 0 ? (loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length).toFixed(2) : 0}ms`);
    
    if (loadCount > 10) {
      console.error('❌ 测试失败：加载次数过多，可能存在死循环');
    } else if (loadCount >= 1 && loadCount <= 3) {
      console.log('✅ 测试通过：加载次数正常');
    } else {
      console.warn('⚠️ 测试警告：加载次数异常');
    }
    
    // 检查画布上是否有背景图片
    const canvas = document.querySelector('canvas.dl-canvas__fabric');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        let hasContent = false;
        for (let i = 3; i < pixels.length; i += 4) {
          if (pixels[i] > 0) {
            hasContent = true;
            break;
          }
        }
        console.log(`画布有内容: ${hasContent ? '✅' : '❌'}`);
      }
    }
  }, 10000);
  
  console.log('⏱️ 监控 10 秒，请观察控制台输出...');
})();

