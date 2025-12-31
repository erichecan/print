// Provide shared AdminShell layout for admin routes
// Admin 布局完全独立，使用侧边栏布局
// 修复登录页面重定向循环：登录页面不使用 AdminShell
import { ReactNode } from 'react';
import { AdminI18nProvider } from '@/contexts/adminI18nContext';
import AdminLayoutClient from './AdminLayoutClient';
import './admin.css';

export default function AdminLayout({ children }: { children: ReactNode }) {
  // Admin 布局完全独立，不显示前端页面的 header 和 footer
  // LayoutWrapper 会检测到 /admin 路径并跳过 header/footer
// 包裹 I18n Provider，支持后台语言切换
// 使用客户端组件检查路径，排除登录页面
  return (
    <AdminI18nProvider>
      <AdminLayoutClient>
        {children}
      </AdminLayoutClient>
    </AdminI18nProvider>
  );
}
