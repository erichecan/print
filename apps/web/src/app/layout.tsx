/**
 * Root Layout
 * [2025-01-27 00:00:00]
 * [2025-11-05 00:35:00] Added CartProvider
 */
import type { Metadata } from 'next'
import { CartProvider } from '@/contexts/CartContext'
import './globals.css'

export const metadata: Metadata = {
  title: 'Print E-commerce',
  description: 'Custom print merchandise e-commerce platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  )
}
