'use client';

/**
 * Admin Category Create Page
* 新建分类页
 */
import { useRouter } from 'next/navigation';
import { CategoryForm } from '@/components/admin/CategoryForm';

export default function AdminCategoryCreatePage() {
  const router = useRouter();

  return (
    <div className="admin-section">
      <header className="page-header">
        <h1>创建新分类</h1>
        <p>设置分类名称、Slug 与展示层级。</p>
      </header>
      <CategoryForm
        mode="create"
        onSuccess={(category) => {
          router.push(`/admin/categories/${category.id}`);
        }}
      />
      <style jsx>{`
        .admin-section {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .page-header h1 {
          margin: 0;
          font-size: 26px;
        }
        .page-header p {
          margin: 4px 0 0;
          color: #64748b;
        }
      `}</style>
    </div>
  );
}


