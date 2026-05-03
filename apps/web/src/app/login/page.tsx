/**
 * Login Page
* 使用 Suspense 包裹客户端组件以支持 useSearchParams
 */
import type { Metadata } from 'next';
import { Suspense } from 'react';
import LoginClient from './LoginClient';

export const metadata: Metadata = {
  title: 'Sign In',
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
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
      <LoginClient />
    </Suspense>
  );
}
