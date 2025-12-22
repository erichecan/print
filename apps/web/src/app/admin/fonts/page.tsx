/**
 * Admin Fonts Page
 * [2025-01-30 19:00:00] 字体管理页面
 */
'use client';

import { useState } from 'react';
import useSWR from 'swr';

import AdminFontsClient from './AdminFontsClient';
import { adminFontsApi } from '@/lib/api';

export default function AdminFontsPage() {
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(undefined);
  const [sourceFilter, setSourceFilter] = useState('');

  const swrKey = ['admin-fonts', page, categoryFilter, isActiveFilter, sourceFilter];

  const fetcher = async () => {
    try {
      const result = await adminFontsApi.list({
        page,
        limit: 50,
        category: categoryFilter || undefined,
        isActive: isActiveFilter,
        source: sourceFilter || undefined,
      });
      return result;
    } catch (err: any) {
      console.error('[AdminFontsPage] API error:', err);
      throw err;
    }
  };

  const { data, isLoading, error, mutate } = useSWR(swrKey, fetcher);

  return (
    <>
      <AdminFontsClient
        data={data}
        isLoading={isLoading}
        error={error}
        page={page}
        setPage={setPage}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        isActiveFilter={isActiveFilter}
        setIsActiveFilter={setIsActiveFilter}
        sourceFilter={sourceFilter}
        setSourceFilter={setSourceFilter}
        mutate={mutate}
      />
    </>
  );
}

