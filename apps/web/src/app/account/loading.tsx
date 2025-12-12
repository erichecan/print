/**
 * Account Loading Skeleton
 * [2025-01-27 14:55:00] 账户页面加载骨架
 */
export default function AccountLoading() {
  return (
    <div style={{ 
      padding: '24px',
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      border: '1px solid #e0e0e0',
    }}>
      <div style={{
        display: 'flex',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: '#e5e7eb',
          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        }} />
        <div style={{ flex: 1 }}>
          <div style={{
            height: '20px',
            width: '200px',
            backgroundColor: '#e5e7eb',
            borderRadius: '4px',
            marginBottom: '8px',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }} />
          <div style={{
            height: '16px',
            width: '150px',
            backgroundColor: '#e5e7eb',
            borderRadius: '4px',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }} />
        </div>
      </div>
      <div style={{
        height: '200px',
        backgroundColor: '#e5e7eb',
        borderRadius: '8px',
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }} />
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}
