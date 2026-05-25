/**
 * Account Loading Skeleton
* 账户页面加载骨架
* 修复：移除 styled-jsx，使用纯内联样式（Server Component 兼容）
 */
export default function AccountLoading() {
  return (
    <div style={{ 
      padding: '24px',
      backgroundColor: '#ffffff',
      borderRadius: '0',
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
          opacity: 0.7,
        }} />
        <div style={{ flex: 1 }}>
          <div style={{
            height: '20px',
            width: '200px',
            backgroundColor: '#e5e7eb',
            borderRadius: '0',
            marginBottom: '8px',
            opacity: 0.7,
          }} />
          <div style={{
            height: '16px',
            width: '150px',
            backgroundColor: '#e5e7eb',
            borderRadius: '0',
            opacity: 0.7,
          }} />
        </div>
      </div>
      <div style={{
        height: '200px',
        backgroundColor: '#e5e7eb',
        borderRadius: '0',
        opacity: 0.7,
      }} />
    </div>
  );
}
