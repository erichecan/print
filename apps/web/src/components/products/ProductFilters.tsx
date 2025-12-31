/**
 * Product Filters Component
* 客户端筛选器组件，处理筛选表单提交
 */
'use client';

import { useEffect, useCallback, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface ProductFiltersProps {
  currentCollection?: string;
  currentBrand?: string;
  brands?: Array<{ name: string; slug?: string }>;
}

export function ProductFilters({ currentCollection, currentBrand, brands = [] }: ProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

// 处理筛选表单提交
  const handleFilterSubmit = useCallback((e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const params = new URLSearchParams(searchParams.toString());

    // 保留基本参数（page, limit, sort, search, collection）
    const page = params.get('page');
    const limit = params.get('limit');
    const sort = params.get('sort');
    const search = params.get('search');
    const collection = params.get('collection');

    // 清除所有筛选参数
    params.delete('brand');
    params.delete('minPrice');
    params.delete('maxPrice');
    params.delete('fit');
    params.delete('decoration');
    params.delete('color');
    params.delete('size');
    params.delete('material');
    params.delete('type');
    params.delete('style');
    params.delete('neckline');
    params.delete('feature');
    params.delete('price');
    params.delete('rushDelivery');
    params.delete('multiAddress');
    params.delete('noMinimum');

    // 重置到第一页
    params.delete('page');

    // 添加新的筛选参数
    const checkboxes = formData.getAll('fit') as string[];
    if (checkboxes.length > 0) {
      params.set('fit', checkboxes.join(','));
    }

    const decoration = formData.getAll('decoration') as string[];
    if (decoration.length > 0) {
      params.set('decoration', decoration.join(','));
    }

    const colors = formData.getAll('color') as string[];
    if (colors.length > 0) {
      params.set('color', colors.join(','));
    }

    const sizes = formData.getAll('size') as string[];
    if (sizes.length > 0) {
      params.set('size', sizes.join(','));
    }

    const materials = formData.getAll('material') as string[];
    if (materials.length > 0) {
      params.set('material', materials.join(','));
    }

    const types = formData.getAll('type') as string[];
    if (types.length > 0) {
      params.set('type', types.join(','));
    }

    const styles = formData.getAll('style') as string[];
    if (styles.length > 0) {
      params.set('style', styles.join(','));
    }

    const necklines = formData.getAll('neckline') as string[];
    if (necklines.length > 0) {
      params.set('neckline', necklines.join(','));
    }

    const features = formData.getAll('feature') as string[];
    if (features.length > 0) {
      params.set('feature', features.join(','));
    }

    const prices = formData.getAll('price') as string[];
    if (prices.length > 0) {
      params.set('price', prices.join(','));
    }

    const brand = formData.get('brand') as string;
    if (brand) {
      params.set('brand', brand);
    }

    const minPrice = formData.get('minPrice') as string;
    if (minPrice) {
      params.set('minPrice', minPrice);
    }

    const maxPrice = formData.get('maxPrice') as string;
    if (maxPrice) {
      params.set('maxPrice', maxPrice);
    }

    const rushDelivery = formData.get('rushDelivery') as string;
    if (rushDelivery) {
      params.set('rushDelivery', rushDelivery);
    }

    const multiAddress = formData.get('multiAddress');
    if (multiAddress === 'on') {
      params.set('multiAddress', 'true');
    }

    const noMinimum = formData.get('noMinimum');
    if (noMinimum === 'on') {
      params.set('noMinimum', 'true');
    }

    // 导航到新的URL
    const query = params.toString();
    router.push(`/products${query ? `?${query}` : ''}`);
  }, [router, searchParams]);

// 从URL参数恢复筛选状态
  useEffect(() => {
    const form = document.getElementById('filters-form') as HTMLFormElement;
    if (!form) return;

    // 恢复复选框状态
    const params = new URLSearchParams(searchParams.toString());
    const restoreCheckboxes = (name: string) => {
      const values = params.get(name)?.split(',') || [];
      values.forEach(value => {
        const input = form.querySelector(`input[name="${name}"][value="${value}"]`) as HTMLInputElement;
        if (input) input.checked = true;
      });
    };

    ['fit', 'decoration', 'color', 'size', 'material', 'type', 'style', 'neckline', 'feature', 'price'].forEach(restoreCheckboxes);

    // 恢复品牌选择
    const brand = params.get('brand');
    if (brand) {
      const brandInput = form.querySelector(`input[name="brand"][value="${brand}"]`) as HTMLInputElement;
      if (brandInput) brandInput.checked = true;
    }

    // 恢复价格范围
    const minPrice = params.get('minPrice');
    const maxPrice = params.get('maxPrice');
    if (minPrice) {
      const minInput = form.querySelector('input[name="minPrice"]') as HTMLInputElement;
      if (minInput) minInput.value = minPrice;
    }
    if (maxPrice) {
      const maxInput = form.querySelector('input[name="maxPrice"]') as HTMLInputElement;
      if (maxInput) maxInput.value = maxPrice;
    }

    // 恢复开关状态
    if (params.get('multiAddress') === 'true') {
      const multiInput = form.querySelector('input[name="multiAddress"]') as HTMLInputElement;
      if (multiInput) multiInput.checked = true;
    }
    if (params.get('noMinimum') === 'true') {
      const noMinInput = form.querySelector('input[name="noMinimum"]') as HTMLInputElement;
      if (noMinInput) noMinInput.checked = true;
    }
  }, [searchParams]);

// 将筛选逻辑注入到现有表单
  useEffect(() => {
    const form = document.getElementById('filters-form') as HTMLFormElement;
    if (!form) return;

    const handleFormSubmit = (e: Event) => {
      e.preventDefault();
      const formEvent = e as unknown as FormEvent<HTMLFormElement>;
      handleFilterSubmit(formEvent);
    };

    form.addEventListener('submit', handleFormSubmit);

    return () => {
      form.removeEventListener('submit', handleFormSubmit);
    };
  }, [handleFilterSubmit]);

  return null; // 不渲染任何内容，只注入逻辑
}

