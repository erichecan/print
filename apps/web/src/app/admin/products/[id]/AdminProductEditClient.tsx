'use client';

/**
 * Admin Product Edit Client Component
 * 使用新的向导模板进行编辑
 * Created: 2025-01-06
 */
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { ProductWizard } from '@/components/admin/products/ProductWizard/ProductWizard';
import { adminProductsApi, AdminProductDetail } from '@/lib/api';

export default function AdminProductEditClient({ id }: { id: string }) {
  const router = useRouter();
  const { data: product, isLoading, error, mutate } = useSWR<AdminProductDetail>(
    ['admin-product', id],
    () => adminProductsApi.get(id)
  );

  if (isLoading) {
    return (
      <div className="admin-section">
        <p>正在加载商品信息…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-section">
        <p className="error">商品加载失败，请刷新重试。</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="admin-section">
        <p className="error">商品不存在。</p>
      </div>
    );
  }

  return (
    <ProductWizard
      initialProduct={product}
      onComplete={async (updatedProduct) => {
        await mutate();
        router.push(`/admin/products/${updatedProduct.id}`);
      }}
    />
  );
}

