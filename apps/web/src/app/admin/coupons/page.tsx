const COUPONS = [
  { code: 'WELCOME10', type: 'Percentage', discount: '10%', usage: '156 / Unlimited', valid: 'Nov 30, 2025', status: 'Active' },
  { code: 'SAVE20', type: 'Percentage', discount: '20%', usage: '89 / 100', valid: 'Dec 15, 2025', status: 'Active' },
  { code: 'FREESHIP', type: 'Free Shipping', discount: '100%', usage: '234 / Unlimited', valid: 'Nov 20, 2025', status: 'Active' },
  { code: 'STUDENT15', type: 'Percentage', discount: '15%', usage: '45 / 500', valid: 'Jan 1, 2026', status: 'Active' },
  { code: 'BLACKFRIDAY', type: 'Percentage', discount: '30%', usage: '1240 / 5000', valid: 'Nov 29, 2025', status: 'Expired' },
];

export default function AdminCouponsPage() {
  return (
    <div style={{ marginTop: 24 }}>
      <div className="admin-page-header">
        <div>
          <h1 data-i18n="coupons">Coupons</h1>
          <p className="text-muted">Create and track promotional coupon codes</p>
        </div>
        <button type="button" className="btn" disabled>
          + New Coupon
        </button>
      </div>

      <div className="admin-filters">
        <div className="admin-search">
          <input type="text" placeholder="Search coupons..." readOnly />
        </div>
      </div>

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Type</th>
              <th>Discount</th>
              <th>Usage</th>
              <th>Valid Until</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {COUPONS.map((coupon) => (
              <tr key={coupon.code}>
                <td>
                  <strong>{coupon.code}</strong>
                </td>
                <td>
                  <span className={coupon.type === 'Free Shipping' ? 'badge badge-warning' : 'badge badge-info'}>
                    {coupon.type}
                  </span>
                </td>
                <td>{coupon.discount}</td>
                <td>{coupon.usage}</td>
                <td>{coupon.valid}</td>
                <td>
                  <span className={coupon.status === 'Active' ? 'badge badge-success' : 'badge badge-pending'}>
                    {coupon.status}
                  </span>
                </td>
                <td>
                  <div className="actions-dropdown">
                    <button className="actions-dropdown-btn" type="button">
                      ⋯
                    </button>
                    <div className="actions-dropdown-menu">
                      <a href="#">Edit</a>
                      <a href="#">View Usage</a>
                      <a href="#">{coupon.status === 'Active' ? 'Deactivate' : 'Archive'}</a>
                    </div>
                  </div>
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
        <button type="button">Next</button>
      </div>
    </div>
  );
}
