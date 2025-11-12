// [2025-11-12 02:33:30] Provide shared AdminShell layout for admin routes
import { ReactNode } from 'react';
import AdminShell from '@/components/admin/AdminShell';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
