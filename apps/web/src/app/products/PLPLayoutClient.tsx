'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import SortSelect from './SortSelect';
import { parseTagsParam, TAG_TAXONOMY } from '@/lib/tag-taxonomy';

const TagNavTree = dynamic(
  () => import('@/components/catalog/TagNavTree').then((mod) => ({ default: mod.TagNavTree })),
  { ssr: false }
);

const TagFilterPanel = dynamic(
  () => import('@/components/catalog/TagFilterPanel').then((mod) => ({ default: mod.TagFilterPanel })),
  { ssr: false }
);

const ProductsClient = dynamic(() => import('./ProductsClient'), { ssr: false });

type Collection = { id: string; name: string; slug: string };

const GARMENT_TYPES = TAG_TAXONOMY.garmentType.tags as unknown as string[];
const AUDIENCES = TAG_TAXONOMY.audience.tags as unknown as string[];

function usePageTitle(collections: Collection[], fallback: string): string {
  const params = useSearchParams();
  const collection = params?.get('collection') || '';
  const category = params?.get('category') || '';
  const tagsParam = params?.get('tags') || '';

  if (collection) {
    return collections.find((c) => c.slug === collection)?.name || fallback;
  }
  if (category) {
    return category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, ' ');
  }

  const activeTags = parseTagsParam(tagsParam);
  const activeGarment = GARMENT_TYPES.find((g) => activeTags.includes(g)) ?? null;
  const activeAudience = AUDIENCES.find((a) => activeTags.includes(a)) ?? null;

  if (activeGarment && activeAudience) return `${activeGarment} > ${activeAudience}`;
  if (activeGarment) return activeGarment;
  return 'All Products';
}

export function PLPLayoutClient({
  collections,
  currentSort,
}: {
  collections: Collection[];
  currentSort: string;
}) {
  const title = usePageTitle(collections, 'All Products');

  return (
    <div className="plp-layout">
      {/* 工具栏：标题 + 排序 */}
      <div className="plp-toolbar hidden md:block">
        <div className="plp-toolbar__row">
          <h1 className="plp-new__title">{title}</h1>
          <div className="plp-toolbar__actions">
            <SortSelect defaultValue={currentSort} />
          </div>
        </div>
      </div>

      {/* 主体：左侧导航树 + 属性筛选 + 商品区 */}
      <div className="plp-new__grid">
        <aside className="plp-new__sidebar">
          <TagNavTree />
          <TagFilterPanel />
        </aside>

        <div className="plp-new__main">
          <ProductsClient
            collections={collections}
            initialCategoryName={title}
          />
        </div>
      </div>
    </div>
  );
}
