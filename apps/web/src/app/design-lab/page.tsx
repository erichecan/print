/**
 * Design Lab Page
 * [2025-11-11 15:47:58] 服务端入口，挂载 Fabric.js 客户端编辑器
 */
import dynamic from 'next/dynamic';

const DesignLabClient = dynamic(() => import('./DesignLabClient'), { ssr: false });

export default function DesignLabPage() {
  return <DesignLabClient />;
}

