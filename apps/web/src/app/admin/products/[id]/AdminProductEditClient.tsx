'use client';

/**
 * Admin Product Edit Client Component
* 提取客户端逻辑到单独组件
 */
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { ProductForm } from '@/components/admin/ProductForm';
import { adminProductsApi } from '@/lib/api';

export default function AdminProductEditClient({ id }: { id: string }) {
  const router = useRouter();
  const { data, isLoading, error, mutate } = useSWR(
    ['admin-product', id],
    () => adminProductsApi.get(id)
  );

  return (
    <div className="admin-section">
      <header className="page-header">
        <div>
          <h1>编辑商品</h1>
          <p>更新商品信息、库存、定价与变体。</p>
        </div>
        <button type="button" className="text-button" onClick={() => router.back()}>
          返回上一页
        </button>
      </header>

      {isLoading && <p>正在加载商品信息…</p>}
      {error && <p className="error">商品加载失败，请刷新重试。</p>}
      {data && (
        <ProductForm
          mode="edit"
          product={data}
          onSuccess={async () => {
            await mutate();
            router.refresh();
          }}
        />
      )}

      <style jsx>{`
        .admin-section {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }
        .page-header h1 {
          margin: 0;
          font-size: 26px;
        }
        .page-header p {
          margin: 4px 0 0;
          color: #64748b;
        }
        .text-button {
          background: none;
          border: none;
          color: #2563eb;
          cursor: pointer;
          font-weight: 600;
        }
        .error {
          color: #ef4444;
        }
      `}</style>
    </div>
  );
}

