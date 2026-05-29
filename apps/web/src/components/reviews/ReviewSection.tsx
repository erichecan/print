'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { API_BASE_URL } from '@/lib/api-config';
import { useAuth } from '@/contexts/AuthContext';
import { ReviewSummary } from './ReviewSummary';
import { ReviewCard } from './ReviewCard';
import { ReviewForm } from './ReviewForm';

interface ReviewSectionProps {
  productId: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function ReviewSection({ productId }: ReviewSectionProps) {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('newest');
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data, mutate, isLoading } = useSWR(
    `${API_BASE_URL}/products/${productId}/reviews?page=${page}&limit=10&sort=${sort}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const handleSuccess = useCallback(() => {
    setSubmitted(true);
    setShowForm(false);
    mutate();
  }, [mutate]);

  if (isLoading) {
    return (
      <div className="mt-12 border-t pt-8">
        <div className="h-6 bg-gray-100 rounded w-32 animate-pulse mb-4" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.reviewsEnabled === false) return null;

  const { data: reviews = [], pagination, stats } = data;
  const canReview = !!user && !submitted;

  return (
    <section className="mt-12 border-t pt-8" aria-label="Product reviews">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Customer Reviews</h2>
        {canReview && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-sm border border-black px-4 py-2 rounded-md hover:bg-black hover:text-white transition-colors"
          >
            Write a Review
          </button>
        )}
      </div>

      {stats && stats.count > 0 && (
        <ReviewSummary
          average={stats.average}
          count={stats.count}
          distribution={stats.distribution}
        />
      )}

      {submitted && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
          Your review has been submitted and is pending approval. Thank you!
        </div>
      )}

      {showForm && <ReviewForm productId={productId} onSuccess={handleSuccess} />}

      {reviews.length > 0 ? (
        <>
          <div className="flex items-center justify-between mt-6 mb-2">
            <span className="text-sm text-gray-500">{pagination?.total || 0} review{pagination?.total !== 1 ? 's' : ''}</span>
            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1); }}
              className="text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="helpful">Most Helpful</option>
            </select>
          </div>

          <div>
            {reviews.map((review: any) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <p className="text-gray-500 text-sm mt-6">
          No reviews yet.{' '}
          {canReview && !showForm && (
            <button onClick={() => setShowForm(true)} className="text-black underline">
              Be the first to review this product.
            </button>
          )}
        </p>
      )}
    </section>
  );
}
