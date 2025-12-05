#!/usr/bin/env python3
"""
详细测试产品主图和颜色悬停切换
[2025-12-04 22:50:00] 使用 Playwright 详细检查主图 URL 和悬停切换
"""

from playwright.sync_api import sync_playwright
import time
import json
import os
from datetime import datetime

FRONTEND_URL = 'https://print-main-frontend-234065158862.us-central1.run.app'
PRODUCTS_URL = f'{FRONTEND_URL}/products'

TEST_RESULTS_DIR = 'test-results'
os.makedirs(TEST_RESULTS_DIR, exist_ok=True)

def test_detailed(page):
    """详细测试"""
    print("\n🔍 详细测试产品主图和颜色悬停切换...")
    
    try:
        page.goto(PRODUCTS_URL, wait_until='networkidle', timeout=30000)
        time.sleep(5)
        
        # 获取第一个产品卡片
        first_card = page.locator('.product-card-new, [class*="product-card"], article[class*="product"]').first
        
        if first_card.count() == 0:
            print("   ❌ 未找到产品卡片")
            return None
        
        # 获取产品名称
        product_name = first_card.locator('h2, h3, [class*="name"], [class*="title"]').first.inner_text()
        print(f"   产品: {product_name}")
        
        # 获取主图 URL（初始状态）
        img_elem = first_card.locator('img').first
        initial_image_src = img_elem.get_attribute('src')
        print(f"   初始主图: {initial_image_src[:80] if initial_image_src else 'N/A'}...")
        
        # 查找颜色点
        color_dots = first_card.locator('.color-dot').all()
        print(f"   颜色点数: {len(color_dots)}")
        
        if len(color_dots) > 0:
            # 获取第一个颜色点的信息
            first_color = color_dots[0]
            color_bg = first_color.get_attribute('style') or ''
            color_title = first_color.get_attribute('title') or ''
            print(f"   第一个颜色: {color_title}, 背景: {color_bg[:50]}")
            
            # 悬停在第一个颜色点上
            print(f"   悬停在第一个颜色点上...")
            first_color.hover()
            time.sleep(2)  # 等待图片切换
            
            # 检查图片是否改变
            hovered_image_src = img_elem.get_attribute('src')
            print(f"   悬停后图片: {hovered_image_src[:80] if hovered_image_src else 'N/A'}...")
            
            image_changed = (hovered_image_src != initial_image_src and hovered_image_src is not None and initial_image_src is not None)
            print(f"   图片是否改变: {'✅ 是' if image_changed else '❌ 否'}")
            
            # 离开悬停
            page.mouse.move(0, 0)
            time.sleep(1)
            
            # 检查是否恢复
            restored_image_src = img_elem.get_attribute('src')
            restored = (restored_image_src == initial_image_src)
            print(f"   恢复后图片: {restored_image_src[:80] if restored_image_src else 'N/A'}...")
            print(f"   是否恢复: {'✅ 是' if restored else '❌ 否'}")
            
            return {
                'product_name': product_name,
                'initial_image': initial_image_src,
                'hovered_image': hovered_image_src,
                'restored_image': restored_image_src,
                'image_changed': image_changed,
                'restored': restored,
                'color_count': len(color_dots),
            }
        else:
            print("   ⚠️  未找到颜色点")
            return {
                'product_name': product_name,
                'initial_image': initial_image_src,
                'color_count': 0,
            }
        
    except Exception as e:
        print(f"   ❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return None

def main():
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    print(f"\n🚀 开始详细测试 [{timestamp}]")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(viewport={'width': 1920, 'height': 1080})
        page = context.new_page()
        
        result = test_detailed(page)
        
        screenshot_path = f'{TEST_RESULTS_DIR}/product-image-detailed-{timestamp}.png'
        page.screenshot(path=screenshot_path, full_page=True)
        print(f"\n📸 截图已保存: {screenshot_path}")
        
        browser.close()
    
    if result:
        print("\n" + "="*60)
        print("📊 测试结果")
        print("="*60)
        print(f"产品: {result.get('product_name', 'N/A')}")
        print(f"颜色数: {result.get('color_count', 0)}")
        print(f"图片切换: {'✅ 正常' if result.get('image_changed') else '❌ 未切换'}")
        print(f"恢复: {'✅ 正常' if result.get('restored', True) else '❌ 未恢复'}")
        print("="*60)
    
    return result

if __name__ == '__main__':
    main()

