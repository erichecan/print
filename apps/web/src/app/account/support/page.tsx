/**
 * Support Page
 * [2025-01-27 15:35:00] 支持与工单页面
 */
export default async function SupportPage() {
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
        支持与工单
      </h1>
      <div style={{
        padding: '48px',
        textAlign: 'center',
        color: '#666',
      }}>
        <p style={{ marginBottom: '16px' }}>支持与工单功能正在开发中...</p>
        <p style={{ fontSize: '14px' }}>您可以在这里提交工单、查看支持历史或联系客服。</p>
      </div>
    </section>
  );
}
