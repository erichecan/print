'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import Image from 'next/image';
import { adminReviewsApi } from '@/lib/api';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'HIDDEN', label: 'Hidden' },
];

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  HIDDEN: 'bg-gray-100 text-gray-500',
};

export default function AdminReviewsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');

  const [replyId, setReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data, isLoading, mutate } = useSWR(
    ['admin-reviews', page, statusFilter, search, sort],
    () => adminReviewsApi.list({ page, limit: 20, status: statusFilter, search, sort })
  );

  const reviews: any[] = data?.data || [];
  const pagination = data?.pagination;

  const handleStatusAction = useCallback(async (id: string, action: 'approve' | 'reject' | 'hide' | 'restore') => {
    setActionLoading(id + action);
    try {
      await adminReviewsApi.updateStatus(id, action);
      mutate();
    } finally {
      setActionLoading(null);
    }
  }, [mutate]);

  const handleDelete = useCallback(async (id: string) => {
    setActionLoading(id + 'delete');
    try {
      await adminReviewsApi.delete(id);
      setDeleteConfirmId(null);
      mutate();
    } finally {
      setActionLoading(null);
    }
  }, [mutate]);

  const handleReplySubmit = useCallback(async (id: string) => {
    if (!replyText.trim()) return;
    setActionLoading(id + 'reply');
    try {
      await adminReviewsApi.reply(id, replyText.trim());
      setReplyId(null);
      setReplyText('');
      mutate();
    } finally {
      setActionLoading(null);
    }
  }, [replyText, mutate]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Review Management</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => { setSort(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="rating_high">Rating: High to Low</option>
          <option value="rating_low">Rating: Low to High</option>
        </select>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search by product name..."
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setSearch(searchDraft); setPage(1); } }}
            className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black w-56"
          />
          <button
            onClick={() => { setSearch(searchDraft); setPage(1); }}
            className="border border-gray-300 rounded px-3 py-2 text-sm hover:bg-gray-50"
          >
            Search
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-gray-100 rounded animate-pulse" />)}
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-gray-500 text-sm">No reviews found.</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="border border-gray-100 rounded-lg p-5 bg-white shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[review.status] || 'bg-gray-100 text-gray-500'}`}>
                      {review.status}
                    </span>
                    <span className="text-yellow-400 text-sm">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                    {review.isVerifiedPurchase && (
                      <span className="text-xs text-green-600">✓ Verified Purchase</span>
                    )}
                    <span className="text-xs text-gray-400">
                      {new Date(review.createdAt).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <p className="text-sm font-medium text-gray-500 mb-1">
                    {review.product?.name || review.productId}
                  </p>

                  <h4 className="font-semibold text-gray-900">{review.title}</h4>
                  <p className="text-sm text-gray-700 mt-1 leading-relaxed">{review.comment}</p>

                  {review.images?.length > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {review.images.map((url: string, idx: number) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setLightbox(url)}
                          className="relative w-14 h-14 rounded overflow-hidden border border-gray-200 hover:opacity-80"
                        >
                          <Image src={url} alt={`Review image ${idx + 1}`} fill className="object-cover" />
                        </button>
                      ))}
                    </div>
                  )}

                  {review.adminReply && (
                    <div className="mt-3 bg-blue-50 border border-blue-100 rounded p-3 text-sm">
                      <span className="font-semibold text-blue-700 text-xs uppercase tracking-wide">Your Reply</span>
                      <p className="text-gray-700 mt-1">{review.adminReply}</p>
                    </div>
                  )}

                  {replyId === review.id && (
                    <div className="mt-3">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows={3}
                        placeholder="Write an official response..."
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleReplySubmit(review.id)}
                          disabled={actionLoading === review.id + 'reply'}
                          className="bg-black text-white px-4 py-1.5 rounded text-sm hover:bg-gray-800 disabled:opacity-50"
                        >
                          {actionLoading === review.id + 'reply' ? 'Saving...' : 'Save Reply'}
                        </button>
                        <button
                          onClick={() => { setReplyId(null); setReplyText(''); }}
                          className="border border-gray-300 px-4 py-1.5 rounded text-sm hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  {review.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => handleStatusAction(review.id, 'approve')}
                        disabled={!!actionLoading}
                        className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleStatusAction(review.id, 'reject')}
                        disabled={!!actionLoading}
                        className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {review.status === 'APPROVED' && (
                    <button
                      onClick={() => handleStatusAction(review.id, 'hide')}
                      disabled={!!actionLoading}
                      className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
                    >
                      Hide
                    </button>
                  )}
                  {(review.status === 'REJECTED' || review.status === 'HIDDEN') && (
                    <button
                      onClick={() => handleStatusAction(review.id, 'restore')}
                      disabled={!!actionLoading}
                      className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                    >
                      Restore
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setReplyId(review.id);
                      setReplyText(review.adminReply || '');
                    }}
                    className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                  >
                    {review.adminReply ? 'Edit Reply' : 'Reply'}
                  </button>

                  {deleteConfirmId === review.id ? (
                    <div className="flex flex-col gap-1 mt-1">
                      <span className="text-xs text-red-600 text-center">Sure?</span>
                      <button
                        onClick={() => handleDelete(review.id)}
                        disabled={actionLoading === review.id + 'delete'}
                        className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        {actionLoading === review.id + 'delete' ? '...' : 'Yes, Delete'}
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(review.id)}
                      className="px-3 py-1 text-xs border border-red-200 text-red-500 rounded hover:bg-red-50"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">Page {pagination.page} of {pagination.totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page === pagination.totalPages}
            className="px-4 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] w-full mx-4">
            <img src={lightbox} alt="Review image" className="w-full h-full object-contain rounded-lg" />
            <button
              className="absolute top-2 right-2 text-white bg-black/50 rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70"
              onClick={() => setLightbox(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
