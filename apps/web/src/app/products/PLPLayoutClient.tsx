'use client';

import dynamic from 'next/dynamic';
import SortSelect from './SortSelect';

const TagNavTree = dynamic(
  () => import('@/components/catalog/TagNavTree').then((mod) => ({ default: mod.TagNavTree })),
  { ssr: false }
);

const ProductsClient = dynamic(() => import('./ProductsClient'), { ssr: false });

type Collection = { id: string; name: string; slug: string };
type Brand = { name: string; slug?: string };

export function PLPLayoutClient({
  collections,
  currentSort,
  currentCategoryName,
}: {
  collections: Collection[];
  currentSort: string;
  currentCollection: string;
  currentBrand: string;
  currentCategoryName: string;
  brands: Brand[];
  groupSlug?: string;
  categorySlug?: string;
}) {
  return (
    <div className="plp-layout">
      {/* 工具栏：标题 + 排序 */}
      <div className="plp-toolbar hidden md:block">
        <div className="plp-toolbar__row">
          <h1 className="plp-new__title">{currentCategoryName}</h1>
          <div className="plp-toolbar__actions">
            <SortSelect defaultValue={currentSort} />
          </div>
        </div>
      </div>

      {/* 主体：左侧导航树 + 属性筛选 + 商品区 */}
      <div className="plp-new__grid">
        <aside className="plp-new__sidebar">
          <TagNavTree />
        </aside>

        <div className="plp-new__main">
          <ProductsClient
            collections={collections}
            initialCategoryName={currentCategoryName}
          />
        </div>
      </div>
    </div>
  );
}
