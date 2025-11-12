/**
 * Contact Page
 * [2025-11-11 22:30:35] Scaffold
 * [2025-11-12 00:05:40] Added support channels and response time details
 */

export default function ContactPage() {
  return (
    <section className="container" style={{ padding: '72px 0', display: 'grid', gap: '32px', maxWidth: '720px' }}>
      <header style={{ display: 'grid', gap: '12px' }}>
        <h1>Contact Suvernire Plus</h1>
        <p>
          Need help with an order, artwork, or shipping update? Our merch specialists are ready to jump in.
          Reach us by phone, email, or live chat seven days a week.
        </p>
      </header>

      <section style={{ display: 'grid', gap: '16px' }}>
        <h2>Support channels</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '12px' }}>
          <li>
            <strong>Phone:</strong> <a href="tel:8552712660">855-271-2660</a> (Mon–Fri, 8am–8pm ET)
          </li>
          <li>
            <strong>Email:</strong> <a href="mailto:support@suvernireplus.com">support@suvernireplus.com</a> (responses within 24 hours)
          </li>
          <li>
            <strong>Live chat:</strong> Available in the Design Lab and Help Center for real-time collaboration.
          </li>
        </ul>
      </section>

      <section style={{ display: 'grid', gap: '12px' }}>
        <h2>Mailing address</h2>
        <address style={{ fontStyle: 'normal', lineHeight: 1.6, color: '#374151' }}>
          Suvernire Plus<br />
          250 Front Street W, Suite 1200<br />
          Toronto, ON M5V 3G5<br />
          Canada
        </address>
      </section>

      <section style={{ display: 'grid', gap: '12px' }}>
        <h2>Project consultations</h2>
        <p>
          Planning a large order? Book a 30-minute session with our creative team to review materials,
          pricing tiers, and fulfillment timelines tailored to your organization.
        </p>
      </section>
    </section>
  );
}
