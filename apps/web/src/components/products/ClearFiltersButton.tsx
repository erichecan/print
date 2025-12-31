/**
 * Clear Filters Button
* 客户端组件，用于清除所有筛选条件
 */
'use client';

import { useRouter } from 'next/navigation';

export function ClearFiltersButton() {
  const router = useRouter();

  return (
    <button 
      type="button" 
      className="filter-clear-btn"
      onClick={() => {
        router.push('/products');
      }}
    >
      Clear All
    </button>
  );
}

