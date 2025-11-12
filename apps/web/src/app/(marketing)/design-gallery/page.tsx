/**
 * Design Gallery Page
 * [2025-11-12 00:04:20] Migrated inspirational design grid from legacy static page
 */

const sampleDesigns = [
  {
    title: 'Campus Hoodie',
    description: 'Two-color screen print with varsity lettering.',
  },
  {
    title: 'Startup Swag Kit',
    description: 'Bottle, tee, and notebook set for new hires.',
  },
  {
    title: 'Event Tee',
    description: 'Bold typography with matte ink finish.',
  },
  {
    title: 'Fundraiser Tote',
    description: 'Eco-friendly cotton tote with full-color print.',
  },
];

export default function DesignGalleryPage() {
  return (
    <section className="container" style={{ padding: '72px 0', display: 'grid', gap: '24px' }}>
      <h1>Design Gallery</h1>
      <p>
        Explore recent customer projects for inspiration. Every design can be customized in our Design Lab
        or with help from the Suvernire Plus creative team.
      </p>
      <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {sampleDesigns.map((design) => (
          <article
            key={design.title}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '20px',
              background: '#fff',
            }}
          >
            <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>{design.title}</h2>
            <p style={{ color: '#6b7280' }}>{design.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

