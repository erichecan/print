import { Suspense } from 'react';
import GalleryClient from './GalleryClient';

export const metadata = {
  title: 'Art Gallery | Souvenir Plus',
  description: 'Browse our curated collection of artwork for custom printing',
};

export default function GalleryPage() {
  return (
    <main id="main" className="container" style={{ paddingTop: '32px', paddingBottom: '64px' }}>
      <Suspense fallback={<div style={{ padding: '48px', textAlign: 'center', color: '#737373' }}>Loading gallery...</div>}>
        <GalleryClient />
      </Suspense>
    </main>
  );
}
