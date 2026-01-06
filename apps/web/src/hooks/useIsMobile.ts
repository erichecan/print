/**
 * Hook to detect mobile device
* 检测是否为移动设备
 */
'use client';

import { useState, useEffect } from 'react';

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
// 检测移动设备
    const checkMobile = () => {
      // 检查窗口宽度
      const isMobileWidth = window.innerWidth <= 768;
      
      // 检查 User Agent
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      // 修复：iPad 在横屏时宽度通常 > 768px，应该显示桌面版
      // 排除 iPad，因为 iPad 的屏幕足够大，应该显示桌面版布局
      const isMobileUA = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
      // 特殊处理：iPad 如果宽度 > 768px，应该视为桌面设备
      const isIPad = /ipad/i.test(userAgent.toLowerCase());
      const isIPadTablet = isIPad && window.innerWidth > 768;
      
      // iPad 横屏（宽度 > 768px）显示桌面版，其他情况按原逻辑
      setIsMobile((isMobileWidth || isMobileUA) && !isIPadTablet);
    };

    // 初始检查
    checkMobile();

    // 监听窗口大小变化
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  return isMobile;
}

