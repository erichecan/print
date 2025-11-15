'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

interface DesignRow {
  id: string;
  name: string;
  user: string;
  submitted: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

const DESIGN_ROWS: DesignRow[] = [
  { id: 'design-001', name: 'Conference Backpack', user: 'alex.brown', submitted: 'Oct 31, 2025', status: 'Pending' },
  { id: 'design-002', name: 'Team Jerseys', user: 'sports.club', submitted: 'Oct 31, 2025', status: 'Pending' },
  { id: 'design-003', name: 'Holiday Swag Box', user: 'marketing.dept', submitted: 'Oct 30, 2025', status: 'Pending' },
  { id: 'design-004', name: 'Welcome Kit', user: 'hr.team', submitted: 'Oct 30, 2025', status: 'Approved' },
  { id: 'design-005', name: 'Logo T-Shirt', user: 'john.doe', submitted: 'Oct 29, 2025', status: 'Rejected' },
];

export default function AdminDesignsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredDesigns = useMemo(() => {
    return DESIGN_ROWS.filter((design) => {
      const matchesSearch = search
        ? design.name.toLowerCase().includes(search.toLowerCase()) ||
          design.user.toLowerCase().includes(search.toLowerCase())
        : true;
      const matchesStatus = statusFilter === 'all' ? true : design.status.toLowerCase() === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

  return (
    <div style={{ marginTop: 24 }}>
      <div className="admin-page-header">
        <div>
          <h1 data-i18n="designReview">Design Reviews</h1>
          <p className="text-muted">Review custom artwork before production</p>
        </div>
      </div>

      <div className="admin-filters">
        <div className="admin-search">
          <input
            type="text"
            placeholder="Search designs..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">All Status</option>
          <option value="pending">Pending Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="admin-table-wrapper">
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
            {filteredDesigns.map((design) => (
              <tr key={design.id}>
                <td>
                  <div className="placeholder" style={{ width: 60, height: 60, borderRadius: 8 }} />
                </td>
                <td style={{ fontWeight: 600 }}>{design.name}</td>
                <td>{design.user}</td>
                <td>{design.submitted}</td>
                <td>
                  <span
                    className={
                      design.status === 'Approved'
                        ? 'badge badge-success'
                        : design.status === 'Rejected'
                        ? 'badge badge-error'
                        : 'badge badge-pending'
                    }
                  >
                    {design.status}
                  </span>
                </td>
                <td>
                  <Link href={`/admin/designs/${design.id}`} className="btn-icon btn--outline" style={{ fontSize: 12 }}>
                    {design.status === 'Pending' ? 'Review' : 'View'}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-pagination">
        <button type="button">Previous</button>
        <button type="button" className="active">
          1
        </button>
        <button type="button">2</button>
        <button type="button">Next</button>
      </div>
    </div>
  );
}
