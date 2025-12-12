/**
 * Team Page
 * [2025-01-27 15:20:00] 团队管理页面
 */
export default async function TeamPage() {
  return (
    <section style={{
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      border: '1px solid #e0e0e0',
      padding: '24px',
    }}>
      <h1 style={{
        fontSize: '24px',
        fontWeight: 600,
        marginBottom: '24px',
        color: '#1f2937',
      }}>
        团队
      </h1>
      <div style={{
        padding: '48px',
        textAlign: 'center',
        color: '#666',
      }}>
        <p style={{ marginBottom: '16px' }}>团队管理功能正在开发中...</p>
        <p style={{ fontSize: '14px' }}>您可以在这里管理团队成员和权限。</p>
      </div>
    </section>
  );
}
