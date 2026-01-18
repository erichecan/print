import './mobile.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
    title: 'Offline Orders (Mobile)',
    description: 'Mobile Offline Order Intake',
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false, // Prevent zooming on mobile inputs
};

export default function MobileLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="mobile-root antialiased text-gray-900 bg-gray-50 min-h-screen">
            {children}
        </div>
    );
}
