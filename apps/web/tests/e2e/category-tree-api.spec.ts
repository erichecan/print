/**
 * 分类树 API 测试
 * [2025-12-11 22:40:00] 测试 /api/categories/tree 接口，验证分类树结构和产品计数
 */
import { test, expect } from '@playwright/test';

const API_URL = process.env.API_BASE_URL || 'http://localhost:4000';

test.describe('分类树 API', () => {
  test('应该返回分类树结构', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/categories/tree`);
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);
  });

  test('分类树应包含必要的字段', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/categories/tree`);
    const { data } = await response.json();
    
    if (data.length > 0) {
      const category = data[0];
      
      // 验证必需字段
      expect(category).toHaveProperty('id');
      expect(category).toHaveProperty('name');
      expect(category).toHaveProperty('slug');
      expect(category).toHaveProperty('productCount');
      expect(category).toHaveProperty('sortOrder');
      expect(category).toHaveProperty('isActive');
      
      // 验证类型
      expect(typeof category.id).toBe('string');
      expect(typeof category.name).toBe('string');
      expect(typeof category.slug).toBe('string');
      expect(typeof category.productCount).toBe('number');
      expect(typeof category.sortOrder).toBe('number');
      expect(typeof category.isActive).toBe('boolean');
    }
  });

  test('分类树应支持嵌套结构（children）', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/categories/tree`);
    const { data } = await response.json();
    
    // 查找有子分类的分类
    const categoryWithChildren = data.find((cat: any) => cat.children && cat.children.length > 0);
    
    if (categoryWithChildren) {
      expect(Array.isArray(categoryWithChildren.children)).toBe(true);
      
      // 验证子分类也有必要字段
      const child = categoryWithChildren.children[0];
      expect(child).toHaveProperty('id');
      expect(child).toHaveProperty('name');
      expect(child).toHaveProperty('slug');
      expect(child).toHaveProperty('productCount');
    }
  });

  test('产品计数应大于等于 0', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/categories/tree`);
    const { data } = await response.json();
    
    const validateProductCount = (category: any) => {
      expect(category.productCount).toBeGreaterThanOrEqual(0);
      
      if (category.children) {
        category.children.forEach(validateProductCount);
      }
    };
    
    data.forEach(validateProductCount);
  });

  test('只应返回激活的分类（isActive = true）', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/categories/tree`);
    const { data } = await response.json();
    
    const validateActive = (category: any) => {
      expect(category.isActive).toBe(true);
      
      if (category.children) {
        category.children.forEach(validateActive);
      }
    };
    
    data.forEach(validateActive);
  });

  test('分类应按 sortOrder 排序', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/categories/tree`);
    const { data } = await response.json();
    
    if (data.length > 1) {
      for (let i = 0; i < data.length - 1; i++) {
        expect(data[i].sortOrder).toBeLessThanOrEqual(data[i + 1].sortOrder);
      }
    }
  });
});
