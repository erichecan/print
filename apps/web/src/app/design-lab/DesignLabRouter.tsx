'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import to ensure code splitting
const DesignLabClient = dynamic(() => import('./DesignLabClient5.0'), {
    ssr: false,
    loading: () => (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Loading Desktop Design Lab...
        </div>
    )
});

const MobileDesignLabClient = dynamic(() => import('./MobileDesignLabClient'), {
    ssr: false,
    loading: () => (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Loading Mobile Design Lab...
        </div>
    )
});

interface DesignLabRouterProps {
    initialProductData?: any;
}

export default function DesignLabRouter({ initialProductData }: DesignLabRouterProps) {
    const [isMobile, setIsMobile] = useState(false);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Prevent hydration mismatch by only rendering after client mount
    if (!isClient) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Initializing Design Lab...
            </div>
        );
    }

    return isMobile
        ? <MobileDesignLabClient initialProductData={initialProductData} />
        : <DesignLabClient initialProductData={initialProductData} />;
}
