/**
 * Size Guide Page
* Scaffold
* Added measurement instructions and core size charts
* 补充 SEO 元数据
* 使用统一 policy 布局展示尺码信息
 */
import React from 'react';
import { generateSEOMetadata } from '@/lib/seo';
import type { Metadata } from 'next';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Size Guide - Clothing Size Charts & Measurements',
  description: 'Find the perfect fit with our size guide. Measurement instructions and size charts for t-shirts, hoodies, and apparel.',
  keywords: ['size guide', 'size chart', 'measurements', 'clothing sizes', 'fit guide', 'sizing'],
  url: 'https://suvernireplus.com/size-guide',
  image: 'https://suvernireplus.com/assets/og-home.jpg',
});

const sizeRows = [
  { size: 'XS', chest: '32-34"', length: '26"' },
  { size: 'S', chest: '35-37"', length: '27"' },
  { size: 'M', chest: '38-40"', length: '28"' },
  { size: 'L', chest: '41-43"', length: '29"' },
  { size: 'XL', chest: '44-46"', length: '30"' },
  { size: '2XL', chest: '47-49"', length: '31"' },
];

const measurementSteps = [
  'Lay a similar garment flat on a table.',
  'Measure 1" below the armhole from edge to edge for chest width, then double the number.',
  'Measure from the highest point on the shoulder to the hem for body length.',
];

const fitTips = [
  'For a relaxed fit, choose one size up from your normal size.',
  'Women often prefer one size down in unisex garments.',
  'Ordering a sizing kit ensures best results for bulk programs.',
];

export default function SizeGuidePage() {
  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
            Size Guide
          </h1>
          <p className="max-w-2xl mx-auto text-xl text-gray-500">
            Use these measurements to pick the best fit for your team.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 bg-gray-50">
                <h2 className="text-xl font-bold text-gray-900">Unisex Tees</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chest (inches)</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Body Length (inches)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sizeRows.map((row) => (
                      <tr key={row.size} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{row.size}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.chest}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <div className="flex items-center space-x-2 mb-6">
                <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold">?</div>
                <h2 className="text-xl font-bold text-gray-900">How to measure</h2>
              </div>
              <ol className="list-decimal list-inside space-y-4 text-gray-600 ml-2">
                {measurementSteps.map((step) => (
                  <li key={step} className="pl-2 marker:text-red-500 marker:font-bold">{step}</li>
                ))}
              </ol>
            </section>
          </div>

          <div className="space-y-8">
            <section className="bg-red-600 rounded-xl shadow-sm p-8 text-white">
              <h2 className="text-xl font-bold mb-6 flex items-center">
                <svg className="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Fit Tips
              </h2>
              <ul className="space-y-4">
                {fitTips.map((tip) => (
                  <li key={tip} className="flex items-start">
                    <svg className="h-5 w-5 text-red-200 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-red-50">{tip}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="bg-gray-50 rounded-xl border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-2">Need a sizing kit?</h3>
              <p className="text-gray-600 text-sm mb-4">
                For large team orders, we recommend ordering a sample kit to ensure everyone gets the perfect fit.
              </p>
              <a href="/contact" className="text-red-600 hover:text-red-800 font-semibold text-sm">Contact sales &rarr;</a>
            </section>
          </div>

        </div>
      </div>
    </div>
  );
}
