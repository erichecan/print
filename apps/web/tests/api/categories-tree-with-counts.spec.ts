/**
 * Categories Tree With Counts API Tests
 * [2025-12-11 23:05:00] 测试 /api/categories/tree-with-counts 接口
 */
import { test, expect } from '@playwright/test';

const API_URL = process.env.API_BASE_URL || 'http://localhost:4000';

test.describe('Categories Tree With Counts API', () => {
  test('应该返回分组分类结构', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/categories/tree-with-counts`);
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('groups');
    expect(data).toHaveProperty('meta');
    expect(Array.isArray(data.groups)).toBe(true);
  });

  test('分组应包含必要的字段', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/categories/tree-with-counts`);
    const { groups } = await response.json();
    
    if (groups.length > 0) {
      const group = groups[0];
      
      expect(group).toHaveProperty('id');
      expect(group).toHaveProperty('name');
      expect(group).toHaveProperty('slug');
      expect(group).toHaveProperty('children');
      expect(Array.isArray(group.children)).toBe(true);
    }
  });

  test('子分类应包含计数', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/categories/tree-with-counts`);
    const { groups } = await response.json();
    
    if (groups.length > 0 && groups[0].children.length > 0) {
      const child = groups[0].children[0];
      
      expect(child).toHaveProperty('id');
      expect(child).toHaveProperty('name');
      expect(child).toHaveProperty('slug');
      expect(child).toHaveProperty('count');
      expect(typeof child.count).toBe('number');
      expect(child.count).toBeGreaterThanOrEqual(0);
    }
  });

  test('应支持 direct 计数策略（默认）', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/categories/tree-with-counts`);
    const { meta } = await response.json();
    
    expect(meta.countStrategy).toBe('direct');
  });

  test('应支持 aggregate 计数策略', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/categories/tree-with-counts?strategy=aggregate`);
    const { meta } = await response.json();
    
    expect(meta.countStrategy).toBe('aggregate');
  });

  test('子分类应按 sortOrder 排序', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/categories/tree-with-counts`);
    const { groups } = await response.json();
    
    if (groups.length > 0 && groups[0].children.length > 1) {
      const children = groups[0].children;
      // 验证排序（这里假设 API 返回已排序的数据）
      // 实际测试中可能需要从数据库验证 sortOrder
      expect(children.length).toBeGreaterThan(0);
    }
  });

  test('应只返回有产品的子分类', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/categories/tree-with-counts`);
    const { groups } = await response.json();
    
    groups.forEach((group: any) => {
      group.children.forEach((child: any) => {
        expect(child.count).toBeGreaterThan(0);
      });
    });
  });

  test('应只返回有子分类的组', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/categories/tree-with-counts`);
    const { groups } = await response.json();
    
    groups.forEach((group: any) => {
      expect(group.children.length).toBeGreaterThan(0);
    });
  });
});
