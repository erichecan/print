#!/usr/bin/env python3
"""
测试产品主图和颜色悬停切换功能
[2025-12-04 22:40:00] 使用 Playwright 验证主图显示和颜色悬停切换是否正常工作
"""

from playwright.sync_api import sync_playwright
import time
import json
import os
from datetime import datetime

# 生产环境配置
FRONTEND_URL = 'https://print-main-frontend-234065158862.us-central1.run.app'
PRODUCTS_URL = f'{FRONTEND_URL}/products'

# 测试结果目录
TEST_RESULTS_DIR = 'test-results'
os.makedirs(TEST_RESULTS_DIR, exist_ok=True)

def test_product_images_and_hover(page):
    """测试产品主图和颜色悬停切换"""
    print("\n🔍 测试产品主图和颜色悬停切换...")
    
    console_messages = []
    version_info = None
    
    def handle_console(msg):
        text = msg.text
        console_messages.append({
            'type': msg.type,
            'text': text,
            'timestamp': datetime.now().isoformat()
        })
        
        if '[Frontend Build]' in text:
            parts = text.split('[Frontend Build]')
            if len(parts) > 1:
                version_parts = parts[1].strip().split()
                if len(version_parts) >= 2:
                    version_info = {
                        'sha': version_parts[0],
                        'buildTime': version_parts[1] if len(version_parts) > 1 else None
                    }
                    print(f"   ✅ 找到构建版本: SHA={version_parts[0]}, Time={version_parts[1] if len(version_parts) > 1 else 'N/A'}")
    
    page.on('console', handle_console)
    
    try:
        print(f"   访问: {PRODUCTS_URL}")
        page.goto(PRODUCTS_URL, wait_until='networkidle', timeout=30000)
        time.sleep(5)  # 等待页面完全加载
        
        # 查找产品卡片
        product_cards = page.locator('.product-card-new, [class*="product-card"], article[class*="product"]').all()
        print(f"   ✅ 找到 {len(product_cards)} 个产品卡片")
        
        test_results = []
        
        # 测试前3个产品
        for i, card in enumerate(product_cards[:3]):
            try:
                # 获取产品名称
                product_name_elem = card.locator('h2, h3, [class*="name"], [class*="title"]').first
                product_name = product_name_elem.inner_text() if product_name_elem.count() > 0 else f"Product {i+1}"
                
                # 获取主图 URL
                img_elem = card.locator('img').first
                main_image_url = img_elem.get_attribute('src') if img_elem.count() > 0 else None
                
                # 查找颜色点
                color_dots = card.locator(
                    '[class*="color"], [class*="swatch"], button[style*="background"], '
                    'div[style*="background"][class*="color"], .product-color, .color-swatch, .color-dot'
                ).all()
                
                color_count = len(color_dots)
                
                # 测试颜色悬停切换
                hover_switched = False
                if color_count > 0:
                    # 悬停在第一个颜色点上
                    first_color = color_dots[0]
                    initial_image = img_elem.get_attribute('src') if img_elem.count() > 0 else None
                    
                    # 悬停
                    first_color.hover()
                    time.sleep(1)  # 等待图片切换
                    
                    # 检查图片是否改变
                    new_image = img_elem.get_attribute('src') if img_elem.count() > 0 else None
                    hover_switched = (new_image != initial_image and new_image is not None and initial_image is not None)
                    
                    # 离开悬停
                    page.mouse.move(0, 0)
                    time.sleep(0.5)
                
                test_results.append({
                    'index': i + 1,
                    'name': product_name[:50],
                    'main_image_url': main_image_url[:80] if main_image_url else None,
                    'color_count': color_count,
                    'hover_switched': hover_switched,
                })
                
                print(f"   产品 {i+1}: {product_name[:40]}...")
                print(f"      - 主图: {'✅' if main_image_url else '❌'}")
                print(f"      - 颜色数: {color_count}")
                print(f"      - 悬停切换: {'✅' if hover_switched else '❌'}")
                
            except Exception as e:
                print(f"   ⚠️  测试产品 {i+1} 时出错: {e}")
                continue
        
        return {
            'version_info': version_info,
            'console_messages': [m for m in console_messages if '[Frontend Build]' in m['text']],
            'test_results': test_results,
        }
        
    except Exception as e:
        print(f"   ❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return None

def main():
    """主测试函数"""
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    print(f"\n🚀 开始测试产品主图和颜色悬停切换 [{timestamp}]")
    print(f"URL: {PRODUCTS_URL}")
    
    results = {
        'timestamp': timestamp,
        'url': PRODUCTS_URL,
        'test_result': None,
        'issues': []
    }
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        )
        page = context.new_page()
        
        # 运行测试
        test_result = test_product_images_and_hover(page)
        results['test_result'] = test_result
        
        # 截图
        screenshot_path = f'{TEST_RESULTS_DIR}/product-image-hover-test-{timestamp}.png'
        page.screenshot(path=screenshot_path, full_page=True)
        print(f"\n📸 截图已保存: {screenshot_path}")
        
        browser.close()
    
    # 保存测试结果
    report_path = f'{TEST_RESULTS_DIR}/product-image-hover-test-{timestamp}.json'
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print(f"\n📄 测试报告已保存: {report_path}")
    
    # 总结
    print("\n" + "="*60)
    print("📊 测试总结")
    print("="*60)
    
    if test_result:
        test_results = test_result.get('test_results', [])
        print(f"测试的产品数: {len(test_results)}")
        
        products_with_main_image = sum(1 for r in test_results if r.get('main_image_url'))
        products_with_hover = sum(1 for r in test_results if r.get('hover_switched'))
        
        print(f"有主图的产品: {products_with_main_image}/{len(test_results)}")
        print(f"悬停切换正常: {products_with_hover}/{len(test_results)}")
        
        if test_result.get('version_info'):
            print(f"前端版本: {test_result['version_info'].get('sha', 'unknown')}")
    
    if results['issues']:
        print("\n⚠️  发现的问题:")
        for issue in results['issues']:
            print(f"   - {issue}")
    else:
        print("\n✅ 未发现问题")
    
    print("="*60)
    
    return results

if __name__ == '__main__':
    main()

