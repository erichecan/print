// [2025-11-11 06:04:29] 自定义 Pages Router 错误页面以避免 Next 默认实现触发 useContext 异常

interface ErrorProps {
  statusCode?: number;
}

function ErrorPage({ statusCode }: ErrorProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '2rem',
        background: '#111827',
        color: '#f9fafb',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 480 }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>{statusCode || 500}</h1>
        <p style={{ fontSize: '1.125rem', lineHeight: 1.8 }}>
          系统发生错误，我们已经记录。请稍后再试或联系技术团队协助排查。
        </p>
      </div>
    </div>
  );
}

ErrorPage.getInitialProps = ({ res, err }: any) => {
  const statusCode = res?.statusCode ?? err?.statusCode ?? 500;
  return { statusCode };
};

export default ErrorPage;




