/**
 * Admin Login Page
* Admin-only login page, separate from customer login
* Added I18n Provider for language switching
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

