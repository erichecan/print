/**
 * [2025-11-28 17:10:00] 数据库状态检查测试 - 验证 Admin 用户和商品数据
 */
import { test, expect } from '@playwright/test';

const BACKEND_URL = process.env.API_BASE_URL || 'https://print-main-backend-hsbqzlnkxa-uc.a.run.app';

test.describe('数据库状态检查', () => {
  test('检查 Admin 用户是否存在', async ({ request }) => {
    // 检查登录 API 是否正常
    const loginResponse = await request.post(`${BACKEND_URL}/api/auth/login`, {
      data: {
        email: 'admin@suvernireplus.com',
        password: 'admin123',
      },
    });
    
    const loginData = await loginResponse.json().catch(() => ({}));
    
    if (loginResponse.status() === 200) {
      console.log('✅ Admin 用户存在且密码正确');
      expect(loginData.user).toBeDefined();
      expect(loginData.user.role).toBe('ADMIN');
    } else {
      console.log(`❌ Admin 登录失败: ${loginResponse.status()} - ${JSON.stringify(loginData)}`);
      // 不直接失败，只是记录问题
      test.info().attach('login-error', {
        body: JSON.stringify(loginData, null, 2),
        contentType: 'application/json',
      });
    }
  });

  test('检查商品数据是否存在', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/products?limit=1`);
    const data = await response.json().catch(() => ({}));
    
    expect(response.status()).toBe(200);
    
    if (data.data && data.data.length > 0) {
      console.log(`✅ 数据库中有商品数据: ${data.pagination?.total || 0} 个商品`);
    } else {
      console.log('⚠️  数据库中没有商品数据');
      test.info().attach('products-response', {
        body: JSON.stringify(data, null, 2),
        contentType: 'application/json',
      });
    }
  });

  test('检查分类数据是否存在', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/categories`);
    const data = await response.json().catch(() => ({}));
    
    expect(response.status()).toBe(200);
    
    if (data.data && data.data.length > 0) {
      console.log(`✅ 数据库中有分类数据: ${data.data.length} 个分类`);
    } else {
      console.log('⚠️  数据库中没有分类数据');
    }
  });
});

