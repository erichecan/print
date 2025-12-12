/**
 * Notifications Page
 * [2025-01-27 15:30:00] 通知设置页面
 */
export default async function NotificationsPage() {
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
        通知设置
      </h1>
      <div style={{
        padding: '48px',
        textAlign: 'center',
        color: '#666',
      }}>
        <p style={{ marginBottom: '16px' }}>通知设置功能正在开发中...</p>
        <p style={{ fontSize: '14px' }}>您可以在这里管理邮件、短信和推送通知偏好。</p>
      </div>
    </section>
  );
}
