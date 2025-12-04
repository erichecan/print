#!/usr/bin/env python3
"""
运行时行为测试 - 测试颜色悬停功能是否实际工作
[2025-12-03 22:25:00] 通过实际交互测试功能是否生效
"""
from playwright.sync_api import sync_playwright
import time
import sys

PRODUCTION_URL = 'https://print-main-frontend-hsbqzlnkxa-uc.a.run.app'

def test_color_hover_runtime(page, base_url):
    """测试颜色悬停的实际运行时行为"""
    print("\n" + "="*60)
    print("测试颜色悬停运行时行为")
    print("="*60)
    
    results = {
        'page_loaded': False,
        'products_found': False,
        'color_elements_found': False,
        'hover_triggered': False,
        'image_changed': False,
        'details': []
    }
    
    try:
        # 访问商品列表页
        print("1. 访问商品列表页...")
        page.goto(f'{base_url}/products', wait_until='domcontentloaded', timeout=30000)
        time.sleep(5)  # 等待页面完全加载
        results['page_loaded'] = True
        print("   ✅ 页面已加载")
        
        # 查找商品卡片
        print("2. 查找商品卡片...")
        product_cards = page.locator('article[class*="product-card"], [class*="product-card-new"]').all()
        if len(product_cards) > 0:
            results['products_found'] = True
            print(f"   ✅ 找到 {len(product_cards)} 个商品卡片")
            first_card = product_cards[0]
        else:
            print("   ❌ 未找到商品卡片")
            return results
        
        # 获取第一个商品的初始图片
        print("3. 获取初始图片...")
        initial_img = first_card.locator('img').first
        if initial_img.is_visible():
            initial_src = initial_img.get_attribute('src') or ''
            print(f"   📷 初始图片: {initial_src[:80]}...")
            results['details'].append(f"初始图片: {initial_src[:50]}")
        else:
            print("   ❌ 未找到商品图片")
            return results
        
        # 查找颜色元素
        print("4. 查找颜色选择器...")
        # 在商品卡片内查找颜色元素
        color_elements = first_card.locator('[class*="color"], [class*="swatch"], [class*="color-dot"], button[class*="color"]').all()
        
        if len(color_elements) > 0:
            results['color_elements_found'] = True
            print(f"   ✅ 找到 {len(color_elements)} 个颜色元素")
            results['details'].append(f"找到 {len(color_elements)} 个颜色元素")
            
            # 尝试悬停第一个颜色元素
            print("5. 测试颜色悬停...")
            try:
                color_element = color_elements[0]
                color_name = color_element.get_attribute('title') or color_element.get_attribute('aria-label') or '未知颜色'
                print(f"   悬停颜色: {color_name}")
                
                # 悬停
                color_element.hover()
                results['hover_triggered'] = True
                time.sleep(2)  # 等待图片切换
                
                # 检查图片是否改变
                new_img = first_card.locator('img').first
                new_src = new_img.get_attribute('src') or ''
                
                print(f"   📷 悬停后图片: {new_src[:80]}...")
                results['details'].append(f"悬停后图片: {new_src[:50]}")
                
                if new_src != initial_src:
                    results['image_changed'] = True
                    print("   ✅ 图片已切换！功能正常工作")
                    results['details'].append("图片切换成功")
                else:
                    print("   ⚠️  图片未切换")
                    results['details'].append("图片未切换")
                    
                    # 检查是否有其他变化（比如 opacity, transform 等）
                    img_style = new_img.evaluate('el => window.getComputedStyle(el).opacity')
                    print(f"   图片透明度: {img_style}")
                    
            except Exception as e:
                print(f"   ⚠️  悬停测试失败: {e}")
                results['details'].append(f"悬停测试失败: {str(e)}")
        else:
            print("   ⚠️  未找到颜色元素")
            results['details'].append("未找到颜色元素")
        
        # 截图
        screenshot_path = 'test-results/runtime-color-hover-test.png'
        page.screenshot(path=screenshot_path, full_page=True)
        print(f"\n   📸 截图已保存: {screenshot_path}")
        
    except Exception as e:
        print(f"   ❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        results['details'].append(f"测试异常: {str(e)}")
        page.screenshot(path='test-results/runtime-test-error.png', full_page=True)
    
    return results


def main():
    base_url = sys.argv[1] if len(sys.argv) > 1 else PRODUCTION_URL
    
    print("="*60)
    print("🧪 运行时行为测试")
    print("="*60)
    print(f"测试 URL: {base_url}")
    
    results = {}
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # 使用有头模式以便观察
        page = browser.new_page()
        
        try:
            results = test_color_hover_runtime(page, base_url)
        finally:
            browser.close()
    
    # 总结
    print("\n" + "="*60)
    print("📊 测试总结")
    print("="*60)
    print(f"页面加载: {'✅' if results['page_loaded'] else '❌'}")
    print(f"找到商品: {'✅' if results['products_found'] else '❌'}")
    print(f"找到颜色元素: {'✅' if results['color_elements_found'] else '❌'}")
    print(f"悬停触发: {'✅' if results['hover_triggered'] else '❌'}")
    print(f"图片切换: {'✅' if results['image_changed'] else '❌'}")
    
    if results['image_changed']:
        print("\n✅ 颜色悬停功能正常工作！")
    elif results['hover_triggered']:
        print("\n⚠️  悬停已触发，但图片未切换（可能是数据问题）")
    else:
        print("\n❌ 功能未正常工作")
    
    print("="*60)
    
    return 0 if results['image_changed'] else 1


if __name__ == '__main__':
    sys.exit(main())

