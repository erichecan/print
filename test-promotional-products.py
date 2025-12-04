#!/usr/bin/env python3
"""
促销产品页面测试脚本
[2025-12-03 21:15:00] 使用 webapp-testing 和 Playwright 测试促销产品页面功能
"""
from playwright.sync_api import sync_playwright
import time
import sys

def test_promotional_products_page(page, base_url):
    """测试促销产品页面基本功能"""
    print("\n" + "="*60)
    print("测试: 促销产品页面功能")
    print("="*60)
    
    try:
        # 1. 访问促销产品页面
        print("1. 访问促销产品页面...")
        page.goto(f'{base_url}/promotional-products')
        page.wait_for_load_state('networkidle')
        time.sleep(2)
        
        # 2. 检查页面标题
        print("2. 检查页面标题...")
        title = page.locator('h1').first
        if title.is_visible():
            title_text = title.inner_text()
            print(f"   ✅ 页面标题: {title_text}")
            assert 'Promotional' in title_text or 'promotional' in title_text.lower(), "页面标题不正确"
        else:
            print("   ⚠️  未找到页面标题")
        
        # 3. 检查 Hero 区域
        print("3. 检查 Hero 区域...")
        hero_section = page.locator('[class*="hero"], section').first
        if hero_section.is_visible():
            print("   ✅ Hero 区域存在")
        else:
            print("   ⚠️  Hero 区域未找到")
        
        # 4. 检查类别网格
        print("4. 检查类别网格...")
        category_cards = page.locator('[class*="category"], [class*="card"]').all()
        if len(category_cards) > 0:
            print(f"   ✅ 找到 {len(category_cards)} 个类别卡片")
            
            # 检查前几个卡片的图片
            for i, card in enumerate(category_cards[:5]):
                img = card.locator('img').first
                if img.is_visible():
                    img_src = img.get_attribute('src') or ''
                    print(f"   - 类别 {i+1} 图片: {img_src[:50]}...")
        else:
            print("   ⚠️  未找到类别卡片")
        
        # 5. 检查 FAQ 区域
        print("5. 检查 FAQ 区域...")
        faq_section = page.locator('[class*="faq"], section').filter(has_text='FAQ').first
        if faq_section.is_visible():
            print("   ✅ FAQ 区域存在")
        else:
            print("   ⚠️  FAQ 区域未找到")
        
        # 6. 检查图片加载
        print("6. 检查图片加载...")
        images = page.locator('img').all()
        loaded_images = 0
        failed_images = 0
        
        for img in images:
            try:
                src = img.get_attribute('src') or ''
                if src and not src.startswith('data:'):
                    # 检查图片是否加载成功
                    natural_width = img.evaluate('el => el.naturalWidth')
                    if natural_width > 0:
                        loaded_images += 1
                    else:
                        failed_images += 1
            except:
                failed_images += 1
        
        print(f"   ✅ 成功加载: {loaded_images} 张图片")
        if failed_images > 0:
            print(f"   ⚠️  加载失败: {failed_images} 张图片")
        
        # 7. 检查链接
        print("7. 检查链接...")
        links = page.locator('a[href*="/products"], a[href*="/design-lab"]').all()
        if len(links) > 0:
            print(f"   ✅ 找到 {len(links)} 个有效链接")
        else:
            print("   ⚠️  未找到有效链接")
        
        # 8. 截图
        screenshot_path = 'test-results/promotional-products-page.png'
        page.screenshot(path=screenshot_path, full_page=True)
        print(f"   ✅ 截图已保存: {screenshot_path}")
        
        print("\n✅ 促销产品页面测试完成")
        return True
        
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        page.screenshot(path='test-results/promotional-products-error.png', full_page=True)
        return False


def main():
    base_url = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:3000'
    
    print("="*60)
    print("🧪 促销产品页面测试")
    print("="*60)
    print(f"测试 URL: {base_url}")
    
    # 创建测试结果目录
    import os
    os.makedirs('test-results', exist_ok=True)
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        try:
            result = test_promotional_products_page(page, base_url)
        finally:
            browser.close()
    
    print("\n" + "="*60)
    if result:
        print("✅ 测试通过")
    else:
        print("❌ 测试失败")
    print("="*60)
    
    return 0 if result else 1


if __name__ == '__main__':
    sys.exit(main())

