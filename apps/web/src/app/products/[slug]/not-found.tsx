export default function NotFound() {
  return (
    <div className="container" style={{ padding: '40px 0' }}>
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Product not found</h1>
      <p style={{ color: '#666' }}>We couldn&apos;t find that product. It may have been moved or removed.</p>
      <a href="/products" style={{ color: '#ff1f3d', fontWeight: 600 }}>Back to products</a>
    </div>
  );
}


