/**
 * Returns & Exchanges Page
* Scaffold
* Documented return windows and support flow
* 补充 SEO 元数据
* 对齐原型化排版与内容分区
 */
import React from 'react';
import Link from 'next/link';
import { generateSEOMetadata } from '@/lib/seo';
import type { Metadata } from 'next';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Returns & Exchanges Policy',
  description: 'Learn about Suvernire Plus return and exchange policy. Custom products return process, timelines, and how to start a return.',
  keywords: ['returns', 'exchanges', 'return policy', 'refund policy', 'custom product returns'],
  url: 'https://suvernireplus.com/returns',
  image: 'https://suvernireplus.com/assets/og-home.jpg',
});

const eligibleItems = ['Standard products with manufacturing defects', 'Incorrect items received', 'Damaged items'];
const ineligibleItems = ['Custom-designed items (unless defective or incorrect)', 'Items worn or used', 'Personalized products', 'Items returned after 30 days'];
const returnProcess = [
  'Contact us at returns@suvernireplus.com or 800-293-4232',
  'Receive a Return Merchandise Authorization (RMA)',
  'Pack items using the original packaging when possible',
  'Ship the package within 7 days using the provided label',
  'Refunds process within 5–10 business days after inspection',
];
const refundTimeline = [
  'Return received: 3–5 business days to log and inspect',
  'Credit/debit refunds: 5–10 business days after approval',
  'PayPal refunds: 3–5 business days after approval',
];
const conditions = ['Be unworn and unused', 'Include original tags', 'Return in original packaging', 'Display the RMA number on the label'];
const exchangeNotes = ['Same item, different size or color', 'Price differences are refunded or invoiced', 'Customer covers outbound exchange shipping'];
const cancellationRules = ['Full refund if production has not started', '50% refund once production begins', 'Standard return policy applies after shipment'];
const contactChannels = [
  { label: 'Phone', value: '800-293-4232' },
  { label: 'Email', value: 'returns@suvernireplus.com' },
  { label: 'Hours', value: 'Mon–Fri 9am–6pm EST' },
];

export default function ReturnsPage() {
  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* Hero Section */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
          <nav className="flex justify-center mb-8" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2 text-sm text-gray-500">
              <li>
                <Link href="/" className="hover:text-gray-900 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </li>
              <li className="font-medium text-gray-900" aria-current="page">
                Returns & Exchanges
              </li>
            </ol>
          </nav>
          <p className="text-base font-semibold text-red-600 tracking-wide uppercase mb-2">Support</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
            Returns & Refunds
          </h1>
          <p className="max-w-2xl mx-auto text-xl text-gray-500">
            Your satisfaction is our priority. Here&apos;s how we make returns easy.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
        {/* Core Value Props */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">100% Satisfaction Guarantee</h2>
            <p className="text-gray-600 leading-relaxed">
              We stand behind every product. If you&apos;re not completely satisfied, we&apos;ll make it right.
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Free Return Shipping</h2>
            <p className="text-gray-600 leading-relaxed">
              Defective, damaged, or incorrect items qualify for prepaid return labels.
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Fast Reprints</h2>
            <p className="text-gray-600 leading-relaxed">
              Most reprints leave our facility within 48 hours after approval.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Eligibility Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Eligibility</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      Items we accept
                    </h3>
                    <ul className="space-y-3">
                      {eligibleItems.map((item) => (
                        <li key={item} className="flex items-start text-gray-600">
                          <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center">
                      <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                      Items we can&apos;t accept
                    </h3>
                    <ul className="space-y-3">
                      {ineligibleItems.map((item) => (
                        <li key={item} className="flex items-start text-gray-600">
                          <svg className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Return Process */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Return Process</h2>
              <ol className="relative border-l border-gray-200 ml-3 space-y-8">
                {returnProcess.map((step, index) => (
                  <li key={step} className="ml-6">
                    <span className="absolute flex items-center justify-center w-8 h-8 bg-red-100 rounded-full -left-4 ring-4 ring-white">
                      <span className="text-red-600 font-bold text-sm">{index + 1}</span>
                    </span>
                    <p className="text-lg text-gray-700 font-medium">{step}</p>
                  </li>
                ))}
              </ol>
            </div>

            {/* Timeline & Conditions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Refund Timeline
                </h2>
                <ul className="space-y-3">
                  {refundTimeline.map((entry) => (
                    <li key={entry} className="text-gray-600 flex items-start">
                      <span className="w-1.5 h-1.5 bg-gray-300 rounded-full mr-2 mt-2 flex-shrink-0"></span>
                      <span>{entry}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Return Conditions
                </h2>
                <ul className="space-y-3">
                  {conditions.map((condition) => (
                    <li key={condition} className="text-gray-600 flex items-start">
                      <span className="w-1.5 h-1.5 bg-gray-300 rounded-full mr-2 mt-2 flex-shrink-0"></span>
                      <span>{condition}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {/* Sidebar: Need Help */}
            <div className="bg-red-50 rounded-xl p-8 border border-red-100 sticky top-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Need Help?</h2>
              <p className="text-gray-600 mb-6">
                Our customer success team is on standby to assist with returns and exchanges.
              </p>
              <div className="space-y-4">
                {contactChannels.map((channel) => (
                  <div key={channel.label} className="flex items-start">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-16 mt-0.5">
                      {channel.label}
                    </span>
                    <span className="text-gray-900 font-medium">{channel.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-6 border-t border-red-100">
                <a
                  href="mailto:returns@suvernireplus.com"
                  className="block w-full text-center bg-red-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                >
                  Contact Support
                </a>
              </div>
            </div>

            {/* Sidebar: Shipping Costs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Shipping Costs</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-green-600 mb-1">Free Returns</h3>
                  <p className="text-sm text-gray-600">We cover shipping for defective, damaged, or incorrect items.</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">Customer Responsibility</h3>
                  <p className="text-sm text-gray-600">Size exchanges or change-of-mind returns use your carrier of choice.</p>
                </div>
              </div>
            </div>

            {/* Sidebar: Exchanges */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Exchanges</h2>
              <ul className="space-y-3">
                {exchangeNotes.map((note) => (
                  <li key={note} className="text-sm text-gray-600 flex items-start">
                    <svg className="w-4 h-4 text-gray-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Additional Sections */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-red-50 rounded-xl p-8 border border-red-100">
            <div className="flex items-start mb-4">
              <div className="p-2 bg-red-100 rounded-lg mr-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Damaged or defective items</h2>
                <p className="text-gray-700 mb-4">
                  Received a damaged item? Contact us immediately and we&apos;ll send a replacement at no cost.
                </p>
                <p className="text-sm font-medium text-gray-900 bg-white inline-block px-3 py-1 rounded border border-red-100">
                  <span className="text-red-600 font-bold">Email:</span> quality@suvernireplus.com
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-8 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Order Cancellations</h2>
            <ul className="space-y-3">
              {cancellationRules.map((rule) => (
                <li key={rule} className="flex items-start text-gray-700">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2 mt-2 flex-shrink-0"></span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
