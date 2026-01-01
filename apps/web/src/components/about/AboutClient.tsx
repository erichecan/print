/**
 * About Client Component
* Client component for about page that fetches CMS content
 */
'use client';

import React from 'react';
import useSWR from 'swr';
import { contentApi } from '@/lib/api';

export function AboutClient() {
  // 从 CMS 获取关于页内容
  const { data: contentData } = useSWR('public-content-config', contentApi.get);
  const aboutPage = contentData?.data?.aboutPage;

  // 使用 CMS 数据或默认值（向后兼容）
  const headerTitle = aboutPage?.headerTitle || 'Built by merch makers who care';
  const headerDescription =
    aboutPage?.headerDescription ||
    'Suvernire Plus is a team of designers, production experts, and logistics pros helping brands create meaningful merch. From the first sketch to the final unboxing moment, we obsess over every detail so you do not have to.';
  const milestones = aboutPage?.milestones || [
    { id: 'default-1', year: '2015', detail: 'Launched Suvernire Plus with a single screen-print press in Toronto.' },
    { id: 'default-2', year: '2018', detail: 'Introduced full-service Design Lab with remote creative consultations.' },
    { id: 'default-3', year: '2021', detail: 'Expanded to fulfill North American orders with sustainable materials.' },
    { id: 'default-4', year: '2024', detail: 'Rolled out enterprise swag programs for distributed teams.' },
  ];
  const values = aboutPage?.values || [
    {
      id: 'default-1',
      title: 'People-first support',
      description: 'Our in-house specialists partner with you from mockups to delivery.',
    },
    {
      id: 'default-2',
      title: 'Quality without compromise',
      description: 'We source garments and promo products from trusted, ethical suppliers.',
    },
    {
      id: 'default-3',
      title: 'On-time, every time',
      description: 'Free standard shipping and rush options keep your events on schedule.',
    },
  ];
  const teamTitle = aboutPage?.teamTitle || 'Meet the team';
  const teamDescription =
    aboutPage?.teamDescription ||
    'Designers, project managers, and production leads collaborate under one roof to keep quality high and timelines short. Want to work with us? Reach out at hello@suvernireplus.com.';

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <header className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-6">
              {headerTitle}
            </h1>
            <p className="text-xl text-gray-500 leading-relaxed">
              {headerDescription}
            </p>
          </header>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        <section>
          <div className="flex items-center space-x-2 mb-8">
            <div className="h-1 w-10 bg-red-600 rounded-full"></div>
            <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-wide">What we stand for</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {values.map((value) => (
              <article key={value.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 hover:shadow-md transition-shadow">
                <div className="h-10 w-10 bg-red-50 rounded-lg flex items-center justify-center mb-6 text-red-600">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{value.title}</h3>
                <p className="text-gray-600 leading-relaxed">{value.description}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <section>
            <div className="flex items-center space-x-2 mb-8">
              <div className="h-1 w-10 bg-red-600 rounded-full"></div>
              <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-wide">Milestones</h2>
            </div>
            <div className="border-l-2 border-gray-200 ml-4 space-y-12">
              {milestones.map((milestone) => (
                <div key={milestone.id} className="relative pl-8">
                  <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-white border-4 border-red-600"></div>
                  <strong className="block text-2xl font-bold text-red-600 mb-2">{milestone.year}</strong>
                  <p className="text-lg text-gray-700">{milestone.detail}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center space-x-2 mb-8">
              <div className="h-1 w-10 bg-red-600 rounded-full"></div>
              <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-wide">{teamTitle}</h2>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <div
                className="prose prose-lg text-gray-600"
                dangerouslySetInnerHTML={{ __html: teamDescription.replace(/hello@suvernireplus\.com/g, '<a href="mailto:hello@suvernireplus.com" class="text-red-600 hover:text-red-800 font-semibold no-underline">hello@suvernireplus.com</a>') }}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

