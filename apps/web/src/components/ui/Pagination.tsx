/**
 * Pagination Component
 * [2025-01-27 16:40:00] 通用分页组件，用于商品列表等页面
 */
'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl?: string;
  preserveParams?: boolean;
}

export function Pagination({ currentPage, totalPages, baseUrl = '/products', preserveParams = true }: PaginationProps) {
  const searchParams = useSearchParams();

  if (totalPages <= 1) {
    return null;
  }

  const buildUrl = (page: number) => {
    const params = new URLSearchParams(preserveParams ? searchParams.toString() : '');
    if (page === 1) {
      params.delete('page');
    } else {
      params.set('page', page.toString());
    }
    const query = params.toString();
    return query ? `${baseUrl}?${query}` : baseUrl;
  };

  const getVisiblePages = () => {
    const delta = 2; // 显示当前页前后2页
    const pages: (number | string)[] = [];
    const start = Math.max(2, currentPage - delta);
    const end = Math.min(totalPages - 1, currentPage + delta);

    if (currentPage > delta + 2) {
      pages.push(1, '...');
    } else {
      for (let i = 1; i < start; i++) {
        pages.push(i);
      }
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - delta - 1) {
      pages.push('...', totalPages);
    } else {
      for (let i = end + 1; i <= totalPages; i++) {
        pages.push(i);
      }
    }

    return pages;
  };

  return (
    <nav className="pagination" aria-label="Pagination">
      <div className="pagination__controls">
        {/* 上一页 */}
        {currentPage > 1 ? (
          <Link href={buildUrl(currentPage - 1)} className="pagination__btn pagination__btn--prev" aria-label="Previous page">
            ← Previous
          </Link>
        ) : (
          <span className="pagination__btn pagination__btn--prev is-disabled" aria-disabled="true">
            ← Previous
          </span>
        )}

        {/* 页码 */}
        <div className="pagination__pages">
          {getVisiblePages().map((page, index) => {
            if (page === '...') {
              return (
                <span key={`ellipsis-${index}`} className="pagination__ellipsis">
                  ...
                </span>
              );
            }
            const pageNum = page as number;
            const isCurrent = pageNum === currentPage;
            return (
              <Link
                key={pageNum}
                href={buildUrl(pageNum)}
                className={`pagination__page ${isCurrent ? 'is-active' : ''}`}
                aria-label={`Go to page ${pageNum}`}
                aria-current={isCurrent ? 'page' : undefined}
              >
                {pageNum}
              </Link>
            );
          })}
        </div>

        {/* 下一页 */}
        {currentPage < totalPages ? (
          <Link href={buildUrl(currentPage + 1)} className="pagination__btn pagination__btn--next" aria-label="Next page">
            Next →
          </Link>
        ) : (
          <span className="pagination__btn pagination__btn--next is-disabled" aria-disabled="true">
            Next →
          </span>
        )}
      </div>

      {/* 分页信息 */}
      <div className="pagination__info">
        Page {currentPage} of {totalPages}
      </div>
    </nav>
  );
}

