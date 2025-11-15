/**
 * Login Page
 * [2025-11-05 00:40:00]
 * [2025-11-15 12:05:00] 使用 Suspense 包裹客户端组件以支持 useSearchParams
 */
import { Suspense } from 'react';
import LoginClient from './LoginClient';

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
