// [2025-11-12 02:33:30] Provide shared AdminShell layout for admin routes
// [2025-11-15 12:35:00] Admin 布局完全独立，使用侧边栏布局
import { ReactNode } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import { AdminI18nProvider } from '@/contexts/adminI18nContext';
import './admin.css';

export default function AdminLayout({ children }: { children: ReactNode }) {
  // Admin 布局完全独立，不显示前端页面的 header 和 footer
  // LayoutWrapper 会检测到 /admin 路径并跳过 header/footer
  // [2025-11-16 14:27:00] 包裹 I18n Provider，支持后台语言切换
  return (
    <AdminI18nProvider>
      <div className="admin-body">
        <AdminShell>{children}</AdminShell>
      </div>
    </AdminI18nProvider>
  );
}
