const DESIGN_DETAIL = {
  name: 'Conference Backpack',
  user: 'alex.brown',
  submitted: 'October 31, 2025',
  status: 'Pending Review',
};

export default function AdminDesignReviewPage({ params }: { params: { id: string } }) {
  const title = DESIGN_DETAIL.name + (params.id ? ` (${params.id})` : '');

  return (
    <div style={{ marginTop: 24 }}>
      <div className="admin-page-header">
        <div>
          <h1>Design Review</h1>
          <p className="text-muted">Approve or request changes before production</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        <div>
          <div className="admin-form">
            <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Design Preview</h3>
            <div className="placeholder" style={{ width: '100%', aspectRatio: '3 / 4', borderRadius: 12, marginBottom: 16 }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="placeholder" style={{ aspectRatio: '1 / 1', borderRadius: 8 }} />
              ))}
            </div>
          </div>

          <div className="admin-form" style={{ marginTop: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Copyright Risk Check</h3>
            <div style={{ display: 'grid', gap: 12 }}>
              <div
                style={{
                  padding: 16,
                  background: 'rgba(255,31,61,0.1)',
                  border: '1px solid var(--color-primary)',
                  borderRadius: 8,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 8 }}>⚠️ Potential Copyright Concerns</div>
                <div style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>
                  Detected potential trademark match: "Nike Swoosh" pattern detected in uploaded artwork.
                  Recommend checking with design team or requesting additional documentation.
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Rejection Reason (if applicable)</label>
                <textarea
                  rows={3}
                  placeholder="Explain why this design was rejected..."
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 8 }}
                  readOnly
                />
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="admin-form">
            <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Design Information</h3>
            <div style={{ display: 'grid', gap: 16 }}>
              <DetailPair label="Design Name" value={title} />
              <DetailPair label="User" value={DESIGN_DETAIL.user} />
              <DetailPair label="Submitted" value={DESIGN_DETAIL.submitted} />
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Status</div>
                <span className="badge badge-pending">{DESIGN_DETAIL.status}</span>
              </div>
            </div>
          </div>

          <div className="admin-form" style={{ marginTop: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Review Actions</h3>
            <div style={{ display: 'grid', gap: 12 }}>
              <button className="btn" style={{ width: '100%' }} disabled>
                ✓ Approve Design
              </button>
              <button className="btn" type="button" style={{ width: '100%', background: '#EF4444', borderColor: '#EF4444' }} disabled>
                ✕ Reject Design
              </button>
              <button className="btn btn--outline" style={{ width: '100%' }} disabled>
                Request Changes
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <a href="/admin/designs" className="btn btn--outline">
          Back to Designs
        </a>
      </div>
    </div>
  );
}

function DetailPair({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ color: 'var(--color-text-muted)' }}>{value}</div>
    </div>
  );
}
