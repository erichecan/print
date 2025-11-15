const PROMOTIONS = [
  {
    id: 'promo-001',
    title: 'Buy More, Save More',
    description: 'Bulk discount promotion',
    status: 'Active',
    tiers: ['25+ items: 10% off', '40+ items: 15% off', '50+ items: 20% off'],
  },
  {
    id: 'promo-002',
    title: 'Free Shipping Promo',
    description: 'Free standard shipping on orders $25+',
    status: 'Active',
    tiers: ['All orders over $25 get free standard shipping'],
  },
  {
    id: 'promo-003',
    title: 'Student Discount',
    description: '15% off for verified students',
    status: 'Paused',
    tiers: ['Edu email verification + minimum $100 order'],
  },
];

export default function AdminPromotionsPage() {
  return (
    <div style={{ marginTop: 24 }}>
      <div className="admin-page-header">
        <div>
          <h1 data-i18n="promotions">Promotions</h1>
          <p className="text-muted">Plan and monitor marketing promotions</p>
        </div>
        <button type="button" className="btn" disabled>
          + New Promotion
        </button>
      </div>

      <div style={{ display: 'grid', gap: 20 }}>
        {PROMOTIONS.map((promotion) => (
          <article key={promotion.id} style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 14, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>{promotion.title}</h3>
                <p className="text-muted" style={{ margin: 0 }}>
                  {promotion.description}
                </p>
              </div>
              <span className={promotion.status === 'Active' ? 'badge badge-success' : 'badge badge-pending'}>
                {promotion.status}
              </span>
            </div>
            <div style={{ padding: 16, background: 'var(--color-bg-subtle)', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>Promotion Details</div>
              <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--color-text)' }}>
                {promotion.tiers.map((tier) => (
                  <li key={tier}>{tier}</li>
                ))}
              </ul>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn btn--outline" disabled>
                Edit
              </button>
              <button type="button" className="btn btn--outline" disabled>
                {promotion.status === 'Active' ? 'View Stats' : 'Activate'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
