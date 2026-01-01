/**
 * Privacy Policy Page
* Scaffold
* Added data collection, usage, and rights overview
* 补充 SEO 元数据
 */
import React from 'react';
import { generateSEOMetadata } from '@/lib/seo';
import type { Metadata } from 'next';

// 生成隐私政策页面 SEO 元数据
export const metadata: Metadata = generateSEOMetadata({
  title: 'Privacy Policy - Data Protection & Privacy',
  description: 'Learn how Suvernire Plus collects, uses, and protects your personal information. Our commitment to data privacy and your rights.',
  keywords: ['privacy policy', 'data protection', 'privacy', 'data security', 'personal information'],
  url: 'https://suvernireplus.com/privacy-policy',
  image: 'https://suvernireplus.com/assets/og-home.jpg',
});

const sections = [
  {
    title: 'Information we collect',
    body:
      'We collect the information you provide when creating an account, placing an order, or contacting support. This includes contact details, shipping addresses, and artwork files you upload.',
  },
  {
    title: 'How we use your data',
    body:
      'Data is used to process orders, provide support, personalize product recommendations, and improve our services. We do not sell customer information to third parties.',
  },
  {
    title: 'Sharing with partners',
    body:
      'We share necessary data with production facilities, shipping carriers, and payment providers to fulfill orders. Each partner is bound by confidentiality agreements.',
  },
  {
    title: 'Your choices',
    body:
      'You can update account information at any time, request deletion of stored artwork, or opt out of marketing emails. Contact privacy@suvernireplus.com for data access requests.',
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
            Privacy Policy
          </h1>
          <p className="text-lg text-gray-500">
            Your trust matters. This policy explains what data we collect, how it is used, and the controls you have
            over your information when working with Suvernire Plus.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-8 sm:p-12 space-y-12">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-xl font-bold text-gray-900 mb-4">{section.title}</h2>
                <p className="text-gray-600 leading-relaxed">{section.body}</p>
              </section>
            ))}

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Security</h2>
              <p className="text-gray-600 leading-relaxed">
                We encrypt data in transit, restrict system access to authorized employees, and routinely audit our
                infrastructure. If a security event occurs, we will notify affected users promptly.
              </p>
            </section>

            <section className="bg-red-50 rounded-lg p-6 border border-red-100">
              <h2 className="text-lg font-bold text-gray-900 mb-2">Contact</h2>
              <p className="text-gray-700">
                Questions? Email <a href="mailto:privacy@suvernireplus.com" className="text-red-600 hover:text-red-800 font-medium">privacy@suvernireplus.com</a> or write to
                Suvernire Plus, 250 Front Street W, Suite 1200, Toronto, ON M5V 3G5, Canada.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
