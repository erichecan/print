/**
 * Assets Page
 * [2025-01-27 15:25:00] 素材库页面
 */
export default async function AssetsPage() {
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
        素材库
      </h1>
      <div style={{
        padding: '48px',
        textAlign: 'center',
        color: '#666',
      }}>
        <p style={{ marginBottom: '16px' }}>素材库功能正在开发中...</p>
        <p style={{ fontSize: '14px' }}>您可以在这里管理上传的图片和素材。</p>
      </div>
    </section>
  );
}
