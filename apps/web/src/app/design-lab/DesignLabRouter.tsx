'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const LoadingView = () => (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading Design Lab...
    </div>
);

const DesignLabClient = dynamic(() => import('./DesignLabClient5.0'), {
    ssr: false,
    loading: LoadingView,
});

const MobileDesignLabClient = dynamic(() => import('./MobileDesignLabClient'), {
    ssr: false,
    loading: LoadingView,
});

interface DesignLabRouterProps {
    initialProductData?: any;
}

export default function DesignLabRouter({ initialProductData }: DesignLabRouterProps) {
    const [isMobile, setIsMobile] = useState<boolean | null>(null);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    if (isMobile === null) {
        return <LoadingView />;
    }

    return isMobile
        ? <MobileDesignLabClient initialProductData={initialProductData} />
        : <DesignLabClient initialProductData={initialProductData} />;
}
