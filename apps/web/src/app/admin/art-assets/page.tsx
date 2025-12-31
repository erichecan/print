'use client';

/**
 * Admin Art Assets Page
* CMS for managing Design Lab art assets
 */
import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { adminArtAssetsApi, ArtAsset } from '@/lib/api';
import AdminArtAssetsClient from './AdminArtAssetsClient';

export default function AdminArtAssetsPage() {
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(undefined);

  const swrKey = ['admin-art-assets', page, categoryFilter, isActiveFilter];
  
// 添加 API 调用日志
  const fetcher = async () => {
    console.log('[AdminArtAssetsPage] 📡 Fetching art assets...', { page, categoryFilter, isActiveFilter });
    try {
      const result = await adminArtAssetsApi.list({
        page,
        limit: 50,
        category: categoryFilter || undefined,
        isActive: isActiveFilter,
      });
      console.log('[AdminArtAssetsPage] ✅ API response:', result);
      return result;
    } catch (err: any) {
      console.error('[AdminArtAssetsPage] ❌ API error:', err);
      console.error('[AdminArtAssetsPage] ❌ Error details:', {
        message: err?.message,
        status: err?.status,
        details: err?.details,
        stack: err?.stack
      });
      throw err;
    }
  };
  
  const { data, isLoading, error, mutate } = useSWR(swrKey, fetcher);
  
// 添加状态变化日志
  console.log('[AdminArtAssetsPage] State:', { isLoading, hasError: !!error, hasData: !!data });

  return (
    <AdminArtAssetsClient
      data={data}
      isLoading={isLoading}
      error={error}
      page={page}
      setPage={setPage}
      categoryFilter={categoryFilter}
      setCategoryFilter={setCategoryFilter}
      isActiveFilter={isActiveFilter}
      setIsActiveFilter={setIsActiveFilter}
      mutate={mutate}
    />
  );
}

