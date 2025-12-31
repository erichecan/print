/**
 * Rewards Page
* 折扣与积分页面
 */
export default async function RewardsPage() {
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
        折扣与积分
      </h1>
      <div style={{
        padding: '48px',
        textAlign: 'center',
        color: '#666',
      }}>
        <p style={{ marginBottom: '16px' }}>折扣与积分功能正在开发中...</p>
        <p style={{ fontSize: '14px' }}>您可以在这里查看可用折扣码、积分余额和奖励历史。</p>
      </div>
    </section>
  );
}
