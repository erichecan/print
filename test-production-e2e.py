#!/usr/bin/env python3
"""
生产环境端到端测试脚本
[2025-12-04 21:25:00] 使用 Playwright 测试生产环境前后端功能
"""

from playwright.sync_api import sync_playwright
import time
import json
import os
from datetime import datetime

# 生产环境配置
FRONTEND_URL = 'https://print-main-frontend-234065158862.us-central1.run.app'
BACKEND_URL = 'https://print-main-backend-234065158862.us-central1.run.app'
API_URL = f'{BACKEND_URL}/api'

# 测试结果目录
TEST_RESULTS_DIR = 'test-results'
os.makedirs(TEST_RESULTS_DIR, exist_ok=True)

def test_homepage(page):
    """测试首页加载"""
    print("\n🏠 测试首页...")
    try:
        page.goto(FRONTEND_URL, wait_until='networkidle', timeout=30000)
        time.sleep(2)
        
        # 检查页面标题
        title = page.title()
        print(f"   ✅ 页面标题: {title}")
        
        # 检查是否有产品列表
        products = page.locator('[data-testid="product"], .product-card, a[href^="/products/"]').count()
        print(f"   ✅ 找到 {products} 个产品元素")
        
        return True
    except Exception as e:
        print(f"   ❌ 首页测试失败: {e}")
        return False

def test_products_page(page):
    """测试产品列表页"""
    print("\n📦 测试产品列表页...")
    try:
        page.goto(f'{FRONTEND_URL}/products', wait_until='networkidle', timeout=30000)
        time.sleep(2)
        
        # 检查产品列表
        products = page.locator('[data-testid="product"], .product-card, a[href^="/products/"]').count()
        print(f"   ✅ 找到 {products} 个产品")
        
        return True
    except Exception as e:
        print(f"   ❌ 产品列表页测试失败: {e}")
        return False

def test_api_endpoints(page):
    """测试后端 API 端点"""
    print("\n🔌 测试后端 API...")
    results = {}
    
    endpoints = [
        ('/products', '产品列表'),
        ('/products/filters/options', '产品筛选选项'),
    ]
    
    for endpoint, name in endpoints:
        try:
            response = page.request.get(f'{API_URL}{endpoint}', timeout=10000)
            if response.ok:
                data = response.json()
                print(f"   ✅ {name}: 状态码 {response.status}")
                results[endpoint] = 'success'
            else:
                print(f"   ⚠️  {name}: 状态码 {response.status}")
                results[endpoint] = f'error_{response.status}'
        except Exception as e:
            print(f"   ❌ {name}: {e}")
            results[endpoint] = 'failed'
    
    return results

def main():
    """主测试函数"""
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    print(f"\n🚀 开始生产环境端到端测试 [{timestamp}]")
    print(f"前端: {FRONTEND_URL}")
    print(f"后端: {BACKEND_URL}")
    
    results = {
        'timestamp': timestamp,
        'frontend_url': FRONTEND_URL,
        'backend_url': BACKEND_URL,
        'tests': {}
    }
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        
        # 捕获控制台错误
        console_errors = []
        page.on('console', lambda msg: console_errors.append({
            'type': msg.type,
            'text': msg.text,
            'timestamp': datetime.now().isoformat()
        }) if msg.type == 'error' else None)
        
        # 运行测试
        results['tests']['homepage'] = test_homepage(page)
        results['tests']['products_page'] = test_products_page(page)
        results['tests']['api'] = test_api_endpoints(page)
        results['console_errors'] = console_errors
        
        # 截图
        screenshot_path = f'{TEST_RESULTS_DIR}/production-e2e-{timestamp}.png'
        page.screenshot(path=screenshot_path, full_page=True)
        print(f"\n📸 截图已保存: {screenshot_path}")
        
        browser.close()
    
    # 保存测试结果
    report_path = f'{TEST_RESULTS_DIR}/production-e2e-report-{timestamp}.json'
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print(f"\n📄 测试报告已保存: {report_path}")
    
    # 总结
    print("\n" + "="*60)
    print("📊 测试总结")
    print("="*60)
    print(f"首页: {'✅ 通过' if results['tests']['homepage'] else '❌ 失败'}")
    print(f"产品列表页: {'✅ 通过' if results['tests']['products_page'] else '❌ 失败'}")
    print(f"API 测试: {len([k for k, v in results['tests']['api'].items() if v == 'success'])}/{len(results['tests']['api'])} 通过")
    print(f"控制台错误: {len(console_errors)} 个")
    
    if console_errors:
        print("\n⚠️  控制台错误:")
        for error in console_errors[:5]:  # 只显示前5个
            print(f"   - {error['text']}")
    
    print("="*60)
    
    return results

if __name__ == '__main__':
    main()

