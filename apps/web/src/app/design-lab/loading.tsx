/**
 * Design Lab Loading Component
 * [2025-01-30 21:20:00] Next.js 加载状态组件（Server Component）
 */
export default function DesignLabLoading() {
  return (
    <section style={{ 
      minHeight: '60vh', 
      display: 'grid', 
      placeItems: 'center',
      background: '#F5F5F5',
      padding: '2rem'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #E5E5E5',
          borderTop: '4px solid #0066CC',
          borderRadius: '50%',
          margin: '0 auto 1rem',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ 
          fontSize: '1rem', 
          color: '#666666',
          margin: 0
        }}>
          Preparing the Design Lab…
        </p>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        ` }} />
      </div>
    </section>
  );
}

