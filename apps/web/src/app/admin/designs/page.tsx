'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { adminDesignsApi, AdminDesignSummary } from '@/lib/api';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

export default function AdminDesignsPage() {
  const [searchDraft, setSearchDraft] = useState('');
  const [filters, setFilters] = useState<{ search: string; status: StatusFilter; page: number }>({
    search: '',
    status: 'pending',
    page: 1,
  });

  const { data, isLoading, error, mutate } = useSWR(['admin-designs', filters], ([, params]) =>
    adminDesignsApi.list({
      page: params.page,
      search: params.search ? params.search.trim() : undefined,
      status: params.status !== 'all' ? params.status : undefined,
    })
  );

const designs = useMemo(() => data?.data ?? [], [data]);
const pagination = data?.pagination;
const totalPages = pagination?.totalPages ?? 1;
const canPrev = filters.page > 1;
const canNext = filters.page < totalPages;
const displayedDesigns = designs;

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFilters((prev) => ({ ...prev, page: 1, search: searchDraft }));
  };

  const handleStatusChange = (status: StatusFilter) => {
    setFilters((prev) => ({ ...prev, status, page: 1 }));
  };

  const goToPage = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const statusClassName = (design: AdminDesignSummary) => {
    if (design.reviewStatus === 'Approved') {
      return 'badge badge-success';
    }
    if (design.reviewStatus === 'Rejected') {
      return 'badge badge-error';
    }
    return 'badge badge-pending';
  };

  const handleRefresh = () => mutate();

  return (
    <div style={{ marginTop: 24 }}>
      <div className="admin-page-header">
        <div>
          <h1 data-i18n="designReview">Design Reviews</h1>
          <p className="text-muted">Review custom artwork before production</p>
        </div>
        <button type="button" className="btn btn--outline" onClick={handleRefresh} disabled={isLoading}>
          Refresh
        </button>
      </div>

      <div className="admin-filters admin-filters--wrap">
        <form className="admin-search admin-search-form" onSubmit={handleSearchSubmit}>
          <input
            type="text"
            placeholder="Search designs..."
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
          />
          <button type="submit" className="btn btn--outline btn--xs">
            Search
          </button>
        </form>
        <select value={filters.status} onChange={(event) => handleStatusChange(event.target.value as StatusFilter)}>
          <option value="all">All Status</option>
          <option value="pending">Pending Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="admin-table-wrapper">
        {isLoading ? (
          <div className="admin-table-placeholder">Loading designs…</div>
        ) : error ? (
          <div className="admin-table-placeholder error">Failed to load designs.</div>
        ) : displayedDesigns.length === 0 ? (
          <div className="admin-table-placeholder">No designs match current filters.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Thumbnail</th>
                <th>Design Name</th>
                <th>User</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedDesigns.map((design) => (
                <tr key={design.id}>
                  <td>
                    <div className="product-thumbnail" style={{ width: 60, height: 60 }}>
                      {design.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={design.thumbnailUrl} alt={design.name} />
                      ) : (
                        <div className="placeholder" />
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{design.name}</div>
                    <div className="product-slug">
                      {design.productVariant?.product?.name ?? 'Custom Product'}
                    </div>
                  </td>
                  <td>
                    {design.user?.email ? (
                      <>
                        <div style={{ fontWeight: 500 }}>{design.user.email}</div>
                        <div className="product-slug">
                          {[design.user.firstName, design.user.lastName].filter(Boolean).join(' ') || '—'}
                        </div>
                      </>
                    ) : (
                      'Guest session'
                    )}
                  </td>
                  <td>{new Date(design.createdAt).toLocaleDateString()}</td>
                  <td>
                    <span className={statusClassName(design)}>{design.reviewStatus}</span>
                  </td>
                  <td>
                    <Link href={`/admin/designs/${design.id}`} className="btn-icon btn--outline" style={{ fontSize: 12 }}>
                      {design.reviewStatus === 'Pending' ? 'Review' : 'View'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pagination && (
        <div className="admin-pagination">
          <button type="button" disabled={!canPrev} onClick={() => canPrev && goToPage(filters.page - 1)}>
            Previous
          </button>
          {Array.from({ length: totalPages }).map((_, index) => {
            const pageNumber = index + 1;
            return (
              <button
                key={pageNumber}
                type="button"
                className={pageNumber === filters.page ? 'active' : undefined}
                onClick={() => goToPage(pageNumber)}
              >
                {pageNumber}
              </button>
            );
          })}
          <button type="button" disabled={!canNext} onClick={() => canNext && goToPage(filters.page + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
