'use client';

/**
 * Admin Product Create Page
* 新建商品页
 */
import { useRouter } from 'next/navigation';
import { ProductForm } from '@/components/admin/ProductForm';

export default function AdminProductCreatePage() {
  const router = useRouter();

  return (
    <div className="admin-section">
      <header className="page-header">
        <h1>创建新商品</h1>
        <p>完善商品基础信息与定价，稍后可补充更多内容。</p>
      </header>
      <ProductForm
        mode="create"
        onSuccess={(product) => {
          router.push(`/admin/products/${product.id}`);
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


