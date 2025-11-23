/**
 * Admin Login Page
 * [2025-01-28 07:30:00] Admin-only login page, separate from customer login
 * [2025-01-28 08:15:00] Added I18n Provider for language switching
 */
import { Suspense } from 'react';
import { AdminI18nProvider } from '@/contexts/adminI18nContext';
import AdminLoginClient from './AdminLoginClient';

export default function AdminLoginPage() {
  return (
    <AdminI18nProvider>
      <Suspense fallback={
        <div style={{ 
          maxWidth: '400px', 
          margin: '4rem auto', 
          padding: '0 1rem',
          textAlign: 'center' 
        }}>
          <p>Loading...</p>
        </div>
      }>
        <AdminLoginClient />
      </Suspense>
    </AdminI18nProvider>
  );
}

