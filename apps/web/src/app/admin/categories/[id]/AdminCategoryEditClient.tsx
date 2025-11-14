'use client';

/**
 * Admin Category Edit Client Component
 * [2025-01-27 14:30:00] 提取客户端逻辑到单独组件
 */
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { CategoryForm } from '@/components/admin/CategoryForm';
import { adminCategoriesApi } from '@/lib/api';

export default function AdminCategoryEditClient({ id }: { id: string }) {
  const router = useRouter();
  const { data, isLoading, error, mutate } = useSWR(
    ['admin-category', id],
    () => adminCategoriesApi.get(id)
  );

  return (
    <div className="admin-section">
      <header className="page-header">
        <div>
          <h1>编辑分类</h1>
          <p>调整分类名称、层级与展示内容。</p>
        </div>
        <button type="button" className="text-button" onClick={() => router.back()}>
          返回
        </button>
      </header>

      {isLoading && <p>正在加载分类数据…</p>}
      {error && <p className="error">分类加载失败，请刷新后重试。</p>}
      {data && (
        <CategoryForm
          mode="edit"
          category={data}
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

