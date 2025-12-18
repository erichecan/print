#!/usr/bin/env python3
"""
测试底部导航和购物车修改
[2025-01-30 12:00:00] 验证：
1. 底部导航中移除了 "My Designs" 链接
2. 购物车页面底部移除了联系信息
"""

from playwright.sync_api import sync_playwright
import time
import sys
import os

def test_footer_no_my_designs(page, base_url):
    """测试1: 验证底部导航中没有 My Designs"""
    print("\n" + "="*60)
    print("测试1: 验证底部导航中没有 My Designs")
    print("="*60)
    
    # 访问首页
    print("1. 访问首页...")
    page.goto(base_url)
    page.wait_for_load_state('networkidle')
    time.sleep(2)
    
    # 滚动到底部
    print("2. 滚动到底部查看页脚...")
    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    time.sleep(1)
    
    # 截图
    os.makedirs('test-results', exist_ok=True)
    page.screenshot(path='test-results/footer-check.png', full_page=True)
    
    # 查找页脚中的 "My Designs" 链接
    my_designs_links = page.locator('footer a:has-text("My Designs"), footer a:has-text("my designs")').all()
    
    if len(my_designs_links) > 0:
        print(f"❌ 失败: 在页脚中找到 {len(my_designs_links)} 个 'My Designs' 链接")
        for i, link in enumerate(my_designs_links):
            print(f"   链接 {i+1}: {link.get_attribute('href')}")
        return False
    else:
        print("✅ 通过: 页脚中没有找到 'My Designs' 链接")
        return True

def test_cart_no_contact_info(page, base_url):
    """测试2: 验证购物车页面底部没有联系信息"""
    print("\n" + "="*60)
    print("测试2: 验证购物车页面底部没有联系信息")
    print("="*60)
    
    # 访问购物车页面
    print("1. 访问购物车页面...")
    page.goto(f'{base_url}/cart')
    page.wait_for_load_state('networkidle')
    time.sleep(2)
    
    # 滚动到底部
    print("2. 滚动到底部查看购物车底部...")
    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    time.sleep(1)
    
    # 截图
    page.screenshot(path='test-results/cart-footer-check.png', full_page=True)
    
    # 查找联系信息文本
    contact_texts = [
        "Talk to a Real Person 7 Days a Week",
        "8am–Midnight ET Mon-Fri",
        "10am–6pm ET Saturday",
        "10am–6pm ET Sunday",
        "416 916 6352",
        "Send us an Email"
    ]
    
    found_texts = []
    for text in contact_texts:
        elements = page.locator(f'text={text}').all()
        if len(elements) > 0:
            found_texts.append(text)
    
    if len(found_texts) > 0:
        print(f"❌ 失败: 在购物车页面底部找到以下联系信息:")
        for text in found_texts:
            print(f"   - {text}")
        return False
    else:
        print("✅ 通过: 购物车页面底部没有找到联系信息")
        return True

def main():
    base_url = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:3000'
    
    print("="*60)
    print("🧪 测试底部导航和购物车修改")
    print("="*60)
    print(f"测试 URL: {base_url}")
    
    results = {}
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        try:
            # 测试1: 底部导航
            results['footer_no_my_designs'] = test_footer_no_my_designs(page, base_url)
            
            # 测试2: 购物车底部
            results['cart_no_contact_info'] = test_cart_no_contact_info(page, base_url)
            
        except Exception as e:
            print(f"\n❌ 测试执行失败: {e}")
            import traceback
            traceback.print_exc()
            page.screenshot(path='test-results/test-error.png', full_page=True)
        finally:
            browser.close()
    
    # 总结
    print("\n" + "="*60)
    print("📊 测试总结")
    print("="*60)
    for test_name, result in results.items():
        status = "✅ 通过" if result else "❌ 失败"
        print(f"  - {test_name}: {status}")
    
    all_passed = all(results.values())
    print(f"\n{'✅ 所有测试通过！' if all_passed else '❌ 部分测试失败'}")
    print("="*60)
    
    return 0 if all_passed else 1

if __name__ == '__main__':
    sys.exit(main())

