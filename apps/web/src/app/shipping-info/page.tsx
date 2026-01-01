/**
 * Shipping Information Page
* Scaffold
* Added delivery timelines and rate overview
* 补充 SEO 元数据
* 对齐原型化运费文案与分区
 */
import React from 'react';
import Link from 'next/link';
import { generateSEOMetadata } from '@/lib/seo';
import type { Metadata } from 'next';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Shipping Information - Delivery Options & Rates',
  description:
    'Shipping options and delivery timelines for Canada and United States. Standard and rush shipping rates. Free shipping available.',
  keywords: ['shipping', 'delivery', 'shipping rates', 'shipping options', 'rush shipping', 'free shipping'],
  url: 'https://suvernireplus.com/shipping-info',
  image: 'https://suvernireplus.com/assets/og-home.jpg',
});

const shippingOptions = [
  {
    title: 'Standard Shipping',
    timeline: '10–14 business days',
    cost: 'FREE over $75 or $9.99',
    blurb: 'Most economical option for non-urgent orders.',
  },
  {
    title: 'Rush Shipping',
    timeline: '3–5 business days',
    cost: '$24.99–$34.99 based on order size',
    blurb: 'Ideal for time-sensitive deliveries across Canada and the U.S.',
  },
  {
    title: 'Express Shipping',
    timeline: '1–2 business days',
    cost: '$44.99–$64.99',
    blurb: 'Fastest option available (limited to U.S. addresses).',
  },
];

const processingTimes = [
  { label: 'Standard items', value: '3–5 business days' },
  { label: 'Complex designs', value: '5–7 business days' },
  { label: 'Bulk orders (25+)', value: '7–10 business days' },
];

const internationalMarkets = ['Canada', 'United Kingdom', 'Australia', 'Germany', 'France'];

export default function ShippingInfoPage() {
  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
          <nav className="flex justify-center mb-6" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2 text-sm text-gray-500">
              <li><Link href="/" className="hover:text-red-600 transition-colors">Home</Link></li>
              <li>
                <svg className="h-4 w-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </li>
              <li className="font-semibold text-gray-900" aria-current="page">Shipping Information</li>
            </ol>
          </nav>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold uppercase tracking-wider mb-4">
            Logistics
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
            Shipping Information
          </h1>
          <p className="max-w-2xl mx-auto text-xl text-gray-500">
            Fast, reliable delivery for your custom orders.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {shippingOptions.map((option) => (
            <article key={option.title} className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 flex flex-col h-full hover:shadow-md transition-shadow">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{option.title}</h2>
              <div className="mb-6 space-y-4 flex-grow">
                <div className="flex items-start">
                  <svg className="h-6 w-6 text-gray-400 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wide">Delivery Time</p>
                    <p className="text-lg font-semibold text-gray-900">{option.timeline}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <svg className="h-6 w-6 text-gray-400 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wide">Cost</p>
                    <p className="text-lg font-semibold text-gray-900">{option.cost}</p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-500 border-t border-gray-100 pt-4 leading-relaxed mt-auto">
                {option.blurb}
              </p>
            </article>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Processing times</h2>
              <div className="space-y-4">
                {processingTimes.map((item) => (
                  <div key={item.label} className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 border-b border-gray-100 last:border-0 last:pb-0">
                    <strong className="text-gray-900 mb-1 sm:mb-0">{item.label}</strong>
                    <span className="text-gray-600 bg-gray-50 px-3 py-1 rounded-full text-sm font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t border-gray-100 flex items-start">
                <svg className="h-5 w-5 text-gray-400 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-gray-500">Processing begins after design approval and payment confirmation.</p>
              </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <article className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Domestic (United States)</h2>
                <p className="text-gray-600 leading-relaxed text-sm">
                  We ship to all U.S. states via UPS, FedEx, or USPS with tracking at every milestone.
                </p>
              </article>
              <article className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                <h2 className="text-lg font-bold text-gray-900 mb-4">International</h2>
                <p className="text-gray-600 text-sm mb-4">We currently ship to:</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {internationalMarkets.map((market) => (
                    <span key={market} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-800">
                      {market}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-400 italic">International orders may incur customs duties and taxes.</p>
              </article>
            </div>

            <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 flex flex-col sm:flex-row items-center justify-between">
              <div className="mb-6 sm:mb-0 sm:mr-8">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Tracking your order</h2>
                <p className="text-gray-600">Every shipment includes a tracking link. Monitor progress from fulfillment to delivery.</p>
              </div>
              <Link href="/order-tracking" className="whitespace-nowrap inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 transition-colors">
                Track your order
              </Link>
            </section>
          </div>

          <div className="space-y-8">
            <section className="bg-red-600 rounded-xl shadow-sm p-8 text-white relative overflow-hidden">
              <div className="relative z-10">
                <h2 className="text-xl font-bold mb-4">Free shipping threshold</h2>
                <p className="text-3xl font-extrabold mb-2">Free Shipping</p>
                <p className="text-red-100 mb-6 font-medium">on orders over $75</p>
                <p className="text-sm text-red-200">Combine multiple items to qualify automatically.</p>
              </div>
              <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4">
                <svg className="h-48 w-48 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                  <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                </svg>
              </div>
            </section>

            <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Shipping updates</h2>
              <p className="text-sm text-gray-500 mb-4">We&apos;ll notify you when:</p>
              <ul className="space-y-3">
                {[
                  'Your order is received',
                  'Production begins',
                  'Your order ships',
                  'Your order is delivered'
                ].map((step, idx) => (
                  <li key={step} className="flex items-center text-sm text-gray-700">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold mr-3">
                      {idx + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ul>
            </section>

            <section className="bg-gray-50 rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Questions?</h2>
              <p className="text-sm text-gray-600 mb-6">Need help with shipping? Our customer team is here for you.</p>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Phone</span>
                  <strong className="text-gray-900">800-293-4232</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Email</span>
                  <strong className="text-gray-900">shipping@suvernireplus.com</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Hours</span>
                  <strong className="text-gray-900">Mon–Fri 9am–6pm EST</strong>
                </div>
              </div>
            </section>

            <div className="bg-red-50 rounded-xl p-6 border border-red-100">
              <h3 className="font-bold text-red-900 text-sm mb-2 flex items-center">
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Delivery Issue?
              </h3>
              <p className="text-xs text-red-700 mb-3">
                If your order arrives damaged or incorrect, contact us within 48 hours. We&apos;ll replace or refund immediately.
              </p>
              <Link href="/returns" className="text-xs font-bold text-red-800 hover:text-red-900 underline">Review return policy</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
