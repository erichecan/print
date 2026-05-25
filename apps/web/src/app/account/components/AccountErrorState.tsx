/**
 * Account Error State Component
* 账户页面错误状态组件，用于显示数据获取失败时的降级内容
 */
'use client';

interface AccountErrorStateProps {
  code?: string;
  message?: string;
  onRetry?: () => void;
}

export function AccountErrorState({ code, message, onRetry }: AccountErrorStateProps) {
  return (
    <div style={{
      padding: '48px',
      textAlign: 'center',
      backgroundColor: '#ffffff',
      borderRadius: '0',
      border: '1px solid #e0e0e0',
      maxWidth: '600px',
      margin: '0 auto',
    }}>
      <h2 style={{
        fontSize: '24px',
        fontWeight: 600,
        marginBottom: '16px',
        color: '#1f2937',
      }}>
        无法加载账户信息
      </h2>
      <p style={{
        fontSize: '16px',
        color: '#666',
        marginBottom: '24px',
      }}>
        {message || '请稍后重试。如果问题持续，请联系支持团队。'}
      </p>
      {code && (
        <p style={{
          fontSize: '14px',
          color: '#999',
          marginBottom: '24px',
          fontFamily: 'monospace',
        }}>
          错误代码: {code}
        </p>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: '12px 24px',
            backgroundColor: '#000000',
            color: '#ffffff',
            border: 'none',
            borderRadius: '0',
            fontSize: '16px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#333333';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#000000';
          }}
        >
          重试
        </button>
      )}
    </div>
  );
}
