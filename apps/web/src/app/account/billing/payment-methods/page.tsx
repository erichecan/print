/**
 * Payment Methods Page (under billing)
 * [2025-01-27 15:15:00] 支付方式页面（位于账单下）
 */
export default async function PaymentMethodsPage() {
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
        支付方式
      </h1>
      <div style={{
        padding: '48px',
        textAlign: 'center',
        color: '#666',
      }}>
        <p style={{ marginBottom: '16px' }}>支付方式管理功能正在开发中...</p>
        <p style={{ fontSize: '14px' }}>您可以在这里添加、编辑和删除支付方式。</p>
      </div>
    </section>
  );
}
