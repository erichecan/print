/**
 * Billing Page
 * [2025-01-27 15:10:00] 账单与发票页面
 */
export default async function BillingPage() {
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
        账单与发票
      </h1>
      <div style={{
        padding: '48px',
        textAlign: 'center',
        color: '#666',
      }}>
        <p style={{ marginBottom: '16px' }}>账单与发票功能正在开发中...</p>
        <p style={{ fontSize: '14px' }}>您可以在这里查看历史发票和账单记录。</p>
      </div>
    </section>
  );
}
