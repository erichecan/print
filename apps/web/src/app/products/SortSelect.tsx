'use client';

/**
 * SortSelect
* 客户端组件处理排序下拉菜单的变化
 */
import { useRouter, useSearchParams } from 'next/navigation';

export default function SortSelect({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) {
      params.set('sort', e.target.value);
    } else {
      params.delete('sort');
    }
    router.push(`/products?${params.toString()}`);
  };

  return (
    <div className="plp-new__sort">
      <label>
        Sort By: 
        <select 
          name="sort" 
value={defaultValue} // 使用 value 而不是 defaultValue，确保选中状态正确
          className="sort-select" 
          onChange={handleChange}
        >
          <option value="">Recommended</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="name_asc">Name: A to Z</option>
          <option value="name_desc">Name: Z to A</option>
        </select>
      </label>
    </div>
  );
}

