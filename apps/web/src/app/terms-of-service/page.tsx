/**
 * Terms of Service Page
* Scaffold
* Added core service terms and responsibilities
* 补充 SEO 元数据
 */
import React from 'react';
import { generateSEOMetadata } from '@/lib/seo';
import type { Metadata } from 'next';

// 生成服务条款页面 SEO 元数据
export const metadata: Metadata = generateSEOMetadata({
  title: 'Terms of Service - Usage Terms & Conditions',
  description: 'Read Suvernire Plus terms of service including payment, proof approval, shipping, returns, and customer responsibilities.',
  keywords: ['terms of service', 'terms and conditions', 'service terms', 'legal', 'user agreement'],
  url: 'https://suvernireplus.com/terms-of-service',
  image: 'https://suvernireplus.com/assets/og-home.jpg',
});

const terms = [
  {
    title: 'Using our services',
    body:
      'Suvernire Plus provides custom merchandise production and fulfillment. By placing an order you confirm you have rights to all uploaded artwork.',
  },
  {
    title: 'Payment & billing',
    body:
      'Orders are charged when production begins. All prices are listed in CAD unless stated otherwise. Taxes are calculated based on the ship-to address.',
  },
  {
    title: 'Proof approval',
    body:
      'You must review and approve digital proofs before we print. Approved proofs represent the final design—changes after approval may incur additional costs or delays.',
  },
  {
    title: 'Intellectual property',
    body:
      'You retain ownership of your artwork. By uploading files you grant Suvernire Plus the right to produce merchandise for your order.',
  },
  {
    title: 'Limitation of liability',
    body:
      'Our liability is limited to the amount paid for the order. We are not liable for indirect damages such as lost events or profits.',
  },
];

export default function TermsOfServicePage() {
  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
            Terms of Service
          </h1>
          <p className="text-lg text-gray-500">
            These terms outline how Suvernire Plus operates, what you can expect from us, and the responsibilities
            you take on when placing an order.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-8 sm:p-12 space-y-12">
            {terms.map((term) => (
              <section key={term.title}>
                <h2 className="text-xl font-bold text-gray-900 mb-4">{term.title}</h2>
                <p className="text-gray-600 leading-relaxed">{term.body}</p>
              </section>
            ))}

            <section className="bg-red-50 rounded-lg p-6 border border-red-100">
              <h2 className="text-lg font-bold text-gray-900 mb-2">Contact</h2>
              <p className="text-gray-700">
                Questions about these terms? Email <a href="mailto:legal@suvernireplus.com" className="text-red-600 hover:text-red-800 font-medium">legal@suvernireplus.com</a>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
