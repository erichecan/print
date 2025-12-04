#!/usr/bin/env python3
"""
线上环境与 GitHub 代码一致性测试
[2025-12-03 22:00:00] 使用 webapp-testing 和 Playwright 测试线上环境，验证商品列表页和 Design Lab 的功能是否与 GitHub 最新代码一致
"""
from playwright.sync_api import sync_playwright
import time
import sys
import json
from datetime import datetime

PRODUCTION_URL = 'https://print-main-frontend-hsbqzlnkxa-uc.a.run.app'

def test_products_page_color_hover(page, base_url):
    """测试商品列表页颜色悬停切换功能"""
    print("\n" + "="*60)
    print("测试 1: 商品列表页颜色悬停切换功能")
    print("="*60)
    
    results = {
        'page_accessible': False,
        'products_found': False,
        'color_swatches_found': False,
        'hover_functionality': False,
        'image_switching': False,
        'details': []
    }
    
    try:
        # 1. 访问商品列表页
        print("1. 访问商品列表页...")
        page.goto(f'{base_url}/products', wait_until='networkidle', timeout=30000)
        time.sleep(3)
        results['page_accessible'] = True
        print("   ✅ 页面可访问")
        
        # 2. 检查是否有商品卡片
        print("2. 检查商品卡片...")
        product_cards = page.locator('[class*="product-card"], [class*="product-item"], a[href*="/products/"]').all()
        if len(product_cards) > 0:
            results['products_found'] = True
            print(f"   ✅ 找到 {len(product_cards)} 个商品卡片")
        else:
            print("   ❌ 未找到商品卡片")
            return results
        
        # 3. 检查颜色选择器/色块
        print("3. 检查颜色选择器...")
        # 查找颜色相关的元素（可能是色块、圆圈、按钮等）
        color_elements = page.locator('[class*="color"], [class*="swatch"], [class*="color-swatch"], button[class*="color"]').all()
        
        if len(color_elements) > 0:
            results['color_swatches_found'] = True
            print(f"   ✅ 找到 {len(color_elements)} 个颜色元素")
            results['details'].append(f"找到 {len(color_elements)} 个颜色元素")
        else:
            print("   ⚠️  未找到颜色选择器元素")
            results['details'].append("未找到颜色选择器元素")
        
        # 4. 尝试悬停颜色并检查图片切换
        print("4. 测试颜色悬停功能...")
        if len(color_elements) > 0:
            # 获取第一个商品卡片的初始图片
            first_card = product_cards[0]
            initial_img = first_card.locator('img').first
            
            if initial_img.is_visible():
                initial_src = initial_img.get_attribute('src') or ''
                print(f"   📷 初始图片: {initial_src[:80]}...")
                
                # 尝试悬停第一个颜色元素
                try:
                    color_elements[0].hover()
                    time.sleep(1)  # 等待图片切换
                    
                    # 检查图片是否改变
                    new_img = first_card.locator('img').first
                    new_src = new_img.get_attribute('src') or ''
                    
                    if new_src != initial_src:
                        results['hover_functionality'] = True
                        results['image_switching'] = True
                        print("   ✅ 颜色悬停功能正常，图片已切换")
                        results['details'].append(f"图片从 {initial_src[:50]} 切换到 {new_src[:50]}")
                    else:
                        print("   ⚠️  颜色悬停后图片未切换")
                        results['details'].append("颜色悬停后图片未切换")
                except Exception as e:
                    print(f"   ⚠️  悬停测试失败: {e}")
                    results['details'].append(f"悬停测试失败: {str(e)}")
            else:
                print("   ⚠️  未找到商品图片")
                results['details'].append("未找到商品图片")
        else:
            print("   ⚠️  无法测试悬停功能（无颜色元素）")
            results['details'].append("无法测试悬停功能（无颜色元素）")
        
        # 5. 检查页面源代码中是否包含 hoveredColors 相关代码
        print("5. 检查页面源代码...")
        page_content = page.content()
        
        # 检查关键代码特征
        checks = {
            'hoveredColors': 'hoveredColors' in page_content or 'hovered-color' in page_content.lower(),
            'colorHover': 'color-hover' in page_content.lower() or 'onMouseEnter' in page_content,
            'imageUrl': 'imageUrl' in page_content or 'image-url' in page_content.lower(),
        }
        
        for key, found in checks.items():
            if found:
                print(f"   ✅ 找到 {key} 相关代码")
                results['details'].append(f"找到 {key} 相关代码")
            else:
                print(f"   ⚠️  未找到 {key} 相关代码")
        
        # 6. 截图
        screenshot_path = 'test-results/products-page-color-hover.png'
        page.screenshot(path=screenshot_path, full_page=True)
        print(f"   📸 截图已保存: {screenshot_path}")
        
    except Exception as e:
        print(f"   ❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        results['details'].append(f"测试异常: {str(e)}")
        page.screenshot(path='test-results/products-page-error.png', full_page=True)
    
    return results


def test_design_lab_edit_art(page, base_url):
    """测试 Design Lab Edit Art 面板功能"""
    print("\n" + "="*60)
    print("测试 2: Design Lab Edit Art 面板功能")
    print("="*60)
    
    results = {
        'page_accessible': False,
        'design_lab_loaded': False,
        'art_tool_found': False,
        'edit_art_panel_found': False,
        'art_size_control': False,
        'names_numbers_found': False,
        'details': []
    }
    
    try:
        # 1. 访问 Design Lab 页面
        print("1. 访问 Design Lab 页面...")
        page.goto(f'{base_url}/design-lab', wait_until='networkidle', timeout=30000)
        time.sleep(5)  # Design Lab 需要更多加载时间
        results['page_accessible'] = True
        print("   ✅ 页面可访问")
        
        # 2. 检查 Design Lab 是否加载
        print("2. 检查 Design Lab 是否加载...")
        canvas = page.locator('canvas, [class*="canvas"], [class*="fabric-canvas"]').first
        if canvas.is_visible(timeout=10000):
            results['design_lab_loaded'] = True
            print("   ✅ Design Lab Canvas 已加载")
        else:
            print("   ⚠️  Design Lab Canvas 未找到")
            results['details'].append("Design Lab Canvas 未找到")
        
        # 3. 查找 Art 工具按钮
        print("3. 查找 Art 工具...")
        art_buttons = page.locator('button:has-text("Art"), [class*="art"], button[aria-label*="art" i]').all()
        
        if len(art_buttons) > 0:
            results['art_tool_found'] = True
            print(f"   ✅ 找到 {len(art_buttons)} 个 Art 相关按钮")
            results['details'].append(f"找到 {len(art_buttons)} 个 Art 相关按钮")
        else:
            print("   ⚠️  未找到 Art 工具按钮")
            results['details'].append("未找到 Art 工具按钮")
        
        # 4. 尝试点击 Art 工具并检查 Edit Art 面板
        print("4. 测试 Edit Art 面板...")
        if len(art_buttons) > 0:
            try:
                # 点击第一个 Art 按钮
                art_buttons[0].click()
                time.sleep(2)
                
                # 检查是否显示 Art 选择面板
                art_panel = page.locator('[class*="art-panel"], [class*="art-select"], [class*="art-gallery"]').first
                if art_panel.is_visible(timeout=3000):
                    print("   ✅ Art 选择面板已显示")
                    results['details'].append("Art 选择面板已显示")
                    
                    # 尝试选择一个 Art 元素（如果有）
                    art_items = page.locator('[class*="art-item"], [class*="art-card"], button[class*="art"]').all()
                    if len(art_items) > 0:
                        art_items[0].click()
                        time.sleep(2)
                        
                        # 检查是否显示 Edit Art 面板
                        edit_art_panel = page.locator('text="Edit Art", [class*="edit-art"], [class*="dl-edit-panel"]:has-text("Edit Art")').first
                        if edit_art_panel.is_visible(timeout=3000):
                            results['edit_art_panel_found'] = True
                            print("   ✅ Edit Art 面板已显示")
                            results['details'].append("Edit Art 面板已显示")
                            
                            # 检查 Art Size 控件
                            art_size = page.locator('text="Art Size", label:has-text("Art Size"), [class*="art-size"]').first
                            if art_size.is_visible(timeout=2000):
                                results['art_size_control'] = True
                                print("   ✅ Art Size 控件已找到")
                                results['details'].append("Art Size 控件已找到")
                            else:
                                print("   ⚠️  Art Size 控件未找到")
                        else:
                            print("   ⚠️  Edit Art 面板未显示")
                            results['details'].append("Edit Art 面板未显示")
                    else:
                        print("   ⚠️  未找到 Art 元素可选择")
                        results['details'].append("未找到 Art 元素可选择")
                else:
                    print("   ⚠️  Art 选择面板未显示")
                    results['details'].append("Art 选择面板未显示")
            except Exception as e:
                print(f"   ⚠️  测试 Art 功能失败: {e}")
                results['details'].append(f"测试 Art 功能失败: {str(e)}")
        
        # 5. 检查 Names & Numbers 功能
        print("5. 检查 Names & Numbers 功能...")
        names_buttons = page.locator('button:has-text("Names"), button:has-text("Numbers"), [class*="names-numbers"]').all()
        if len(names_buttons) > 0:
            results['names_numbers_found'] = True
            print(f"   ✅ 找到 {len(names_buttons)} 个 Names & Numbers 相关按钮")
            results['details'].append(f"找到 {len(names_buttons)} 个 Names & Numbers 相关按钮")
        else:
            print("   ⚠️  未找到 Names & Numbers 按钮")
            results['details'].append("未找到 Names & Numbers 按钮")
        
        # 6. 检查页面源代码中是否包含 Edit Art 相关代码
        print("6. 检查页面源代码...")
        page_content = page.content()
        
        checks = {
            'Edit Art': 'Edit Art' in page_content or 'edit-art' in page_content.lower(),
            'isArt': 'isArt' in page_content or 'is-art' in page_content.lower(),
            'NamesNumbers': 'Names' in page_content and 'Numbers' in page_content,
        }
        
        for key, found in checks.items():
            if found:
                print(f"   ✅ 找到 {key} 相关代码")
                results['details'].append(f"找到 {key} 相关代码")
            else:
                print(f"   ⚠️  未找到 {key} 相关代码")
        
        # 7. 截图
        screenshot_path = 'test-results/design-lab-edit-art.png'
        page.screenshot(path=screenshot_path, full_page=True)
        print(f"   📸 截图已保存: {screenshot_path}")
        
    except Exception as e:
        print(f"   ❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        results['details'].append(f"测试异常: {str(e)}")
        page.screenshot(path='test-results/design-lab-error.png', full_page=True)
    
    return results


def main():
    base_url = sys.argv[1] if len(sys.argv) > 1 else PRODUCTION_URL
    
    print("="*60)
    print("🧪 线上环境与 GitHub 代码一致性测试")
    print("="*60)
    print(f"测试 URL: {base_url}")
    print(f"测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 创建测试结果目录
    import os
    os.makedirs('test-results', exist_ok=True)
    
    all_results = {}
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        try:
            # 测试 1: 商品列表页
            all_results['products_page'] = test_products_page_color_hover(page, base_url)
            
            # 测试 2: Design Lab
            all_results['design_lab'] = test_design_lab_edit_art(page, base_url)
            
        finally:
            browser.close()
    
    # 生成测试报告
    print("\n" + "="*60)
    print("📊 测试总结")
    print("="*60)
    
    # 商品列表页结果
    products = all_results['products_page']
    print("\n商品列表页测试:")
    print(f"  页面可访问: {'✅' if products['page_accessible'] else '❌'}")
    print(f"  找到商品: {'✅' if products['products_found'] else '❌'}")
    print(f"  找到颜色选择器: {'✅' if products['color_swatches_found'] else '❌'}")
    print(f"  悬停功能: {'✅' if products['hover_functionality'] else '❌'}")
    print(f"  图片切换: {'✅' if products['image_switching'] else '❌'}")
    
    # Design Lab 结果
    design_lab = all_results['design_lab']
    print("\nDesign Lab 测试:")
    print(f"  页面可访问: {'✅' if design_lab['page_accessible'] else '❌'}")
    print(f"  Design Lab 加载: {'✅' if design_lab['design_lab_loaded'] else '❌'}")
    print(f"  找到 Art 工具: {'✅' if design_lab['art_tool_found'] else '❌'}")
    print(f"  Edit Art 面板: {'✅' if design_lab['edit_art_panel_found'] else '❌'}")
    print(f"  Art Size 控件: {'✅' if design_lab['art_size_control'] else '❌'}")
    print(f"  Names & Numbers: {'✅' if design_lab['names_numbers_found'] else '❌'}")
    
    # 保存详细结果
    report_path = 'test-results/code-consistency-report.json'
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump({
            'test_time': datetime.now().isoformat(),
            'base_url': base_url,
            'results': all_results
        }, f, indent=2, ensure_ascii=False)
    print(f"\n📄 详细报告已保存: {report_path}")
    
    # 判断是否需要重新部署
    print("\n" + "="*60)
    print("🔍 部署建议")
    print("="*60)
    
    needs_deployment = False
    issues = []
    
    if not products['image_switching']:
        needs_deployment = True
        issues.append("商品列表页颜色悬停切换功能未生效")
    
    if not design_lab['edit_art_panel_found']:
        needs_deployment = True
        issues.append("Design Lab Edit Art 面板未找到")
    
    if needs_deployment:
        print("❌ 建议重新部署")
        print("\n发现的问题:")
        for issue in issues:
            print(f"  - {issue}")
    else:
        print("✅ 功能测试通过，线上环境已更新")
    
    print("="*60)
    
    return 0 if not needs_deployment else 1


if __name__ == '__main__':
    sys.exit(main())

