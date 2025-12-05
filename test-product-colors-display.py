#!/usr/bin/env python3
"""
测试产品列表页颜色显示
[2025-12-04 22:10:00] 使用 Playwright 检查生产环境产品列表页实际显示的颜色数量
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

def test_product_colors(page):
    """测试产品列表页的颜色显示"""
    print("\n🔍 测试产品列表页颜色显示...")
    
    console_messages = []
    version_info = None
    
    def handle_console(msg):
        text = msg.text
        console_messages.append({
            'type': msg.type,
            'text': text,
            'timestamp': datetime.now().isoformat()
        })
        
        # 查找构建版本信息
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
        
        # 检查页面标题
        title = page.title()
        print(f"   ✅ 页面标题: {title}")
        
        # 查找所有产品卡片
        product_cards = page.locator('.product-card-new, [class*="product-card"], article[class*="product"]').all()
        print(f"   ✅ 找到 {len(product_cards)} 个产品卡片")
        
        # 检查每个产品的颜色点
        products_with_colors = []
        total_color_swatches = 0
        
        for i, card in enumerate(product_cards[:10]):  # 只检查前10个产品
            try:
                # 查找颜色点（可能是 .color-swatch, .product-color, 或类似的类名）
                color_swatches = card.locator(
                    '[class*="color"], [class*="swatch"], button[style*="background"], '
                    'div[style*="background"][class*="color"], .product-color, .color-swatch'
                ).all()
                
                # 也尝试通过样式查找（圆形、有背景色的元素）
                all_elements = card.locator('*').all()
                color_elements = []
                for elem in all_elements:
                    try:
                        # 检查是否是颜色点（小圆形，有背景色）
                        bounding_box = elem.bounding_box()
                        if bounding_box:
                            width = bounding_box['width']
                            height = bounding_box['height']
                            # 颜色点通常是圆形，宽高相近，且较小（通常 20-40px）
                            if 15 <= width <= 50 and 15 <= height <= 50 and abs(width - height) < 5:
                                style = elem.get_attribute('style') or ''
                                class_name = elem.get_attribute('class') or ''
                                # 检查是否有背景色
                                if 'background' in style.lower() or 'bg-' in class_name.lower():
                                    color_elements.append(elem)
                    except:
                        continue
                
                color_count = len(color_swatches) if color_swatches else len(color_elements)
                
                # 获取产品名称
                product_name_elem = card.locator('h2, h3, [class*="name"], [class*="title"]').first
                product_name = product_name_elem.inner_text() if product_name_elem.count() > 0 else f"Product {i+1}"
                
                # 检查是否有 "+N" 文本（表示更多颜色）
                more_colors_text = card.locator('text=/\\+\\d+/').first
                more_colors = ''
                if more_colors_text.count() > 0:
                    more_colors = more_colors_text.inner_text()
                
                if color_count > 0 or more_colors:
                    products_with_colors.append({
                        'index': i + 1,
                        'name': product_name[:50],  # 限制长度
                        'color_count': color_count,
                        'more_colors': more_colors,
                        'total_displayed': color_count + (int(more_colors.replace('+', '')) if more_colors else 0)
                    })
                    total_color_swatches += color_count
                    
                    print(f"   产品 {i+1}: {product_name[:40]}... - {color_count} 个颜色点" + (f" ({more_colors})" if more_colors else ""))
            except Exception as e:
                print(f"   ⚠️  检查产品 {i+1} 时出错: {e}")
                continue
        
        # 检查是否有 "+N" 文本（表示更多颜色）
        more_colors_elements = page.locator('text=/\\+\\d+/').all()
        more_colors_count = len(more_colors_elements)
        
        print(f"\n   📊 统计:")
        print(f"      - 检查的产品数: {len(products_with_colors)}")
        print(f"      - 总颜色点数: {total_color_swatches}")
        print(f"      - 有 '+N' 提示的产品: {more_colors_count}")
        
        # 检查是否有超过2个颜色的产品
        products_with_many_colors = [p for p in products_with_colors if p['color_count'] > 2 or p['more_colors']]
        if products_with_many_colors:
            print(f"\n   ⚠️  发现 {len(products_with_many_colors)} 个产品显示超过2个颜色:")
            for p in products_with_many_colors:
                print(f"      - {p['name']}: {p['color_count']} 个颜色点" + (f" ({p['more_colors']})" if p['more_colors'] else ""))
        
        return {
            'version_info': version_info,
            'console_messages': [m for m in console_messages if '[Frontend Build]' in m['text']],
            'products_checked': len(products_with_colors),
            'total_color_swatches': total_color_swatches,
            'products_with_colors': products_with_colors,
            'products_with_many_colors': products_with_many_colors,
            'more_colors_count': more_colors_count
        }
        
    except Exception as e:
        print(f"   ❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return None

def main():
    """主测试函数"""
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    print(f"\n🚀 开始测试产品列表页颜色显示 [{timestamp}]")
    print(f"URL: {PRODUCTS_URL}")
    
    results = {
        'timestamp': timestamp,
        'url': PRODUCTS_URL,
        'test_result': None,
        'issues': []
    }
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # 使用有头模式以便观察
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        )
        page = context.new_page()
        
        # 运行测试
        test_result = test_product_colors(page)
        results['test_result'] = test_result
        
        # 截图
        screenshot_path = f'{TEST_RESULTS_DIR}/product-colors-test-{timestamp}.png'
        page.screenshot(path=screenshot_path, full_page=True)
        print(f"\n📸 截图已保存: {screenshot_path}")
        
        # 检查版本信息
        if test_result and test_result.get('version_info'):
            version_sha = test_result['version_info'].get('sha')
            print(f"\n   ✅ 前端构建版本: {version_sha}")
            if version_sha != '0815b5d':
                results['issues'].append(f"前端版本不匹配: 期望 0815b5d, 实际 {version_sha}")
        else:
            results['issues'].append("未找到前端构建版本信息")
        
        # 检查颜色数量
        if test_result:
            products_with_many = test_result.get('products_with_many_colors', [])
            if products_with_many:
                results['issues'].append(f"发现 {len(products_with_many)} 个产品显示超过2个颜色（期望只显示黑白）")
        
        browser.close()
    
    # 保存测试结果
    report_path = f'{TEST_RESULTS_DIR}/product-colors-test-{timestamp}.json'
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print(f"\n📄 测试报告已保存: {report_path}")
    
    # 总结
    print("\n" + "="*60)
    print("📊 测试总结")
    print("="*60)
    
    if test_result:
        print(f"检查的产品数: {test_result.get('products_checked', 0)}")
        print(f"总颜色点数: {test_result.get('total_color_swatches', 0)}")
        print(f"显示超过2个颜色的产品: {len(test_result.get('products_with_many_colors', []))}")
        
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

