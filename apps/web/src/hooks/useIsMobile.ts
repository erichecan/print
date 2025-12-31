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
      const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
      
      setIsMobile(isMobileWidth || isMobileUA);
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

