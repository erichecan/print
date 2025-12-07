#!/usr/bin/env python3
"""
使用 webapp-testing skill 验证 Design Lab 修复效果
[2025-12-06 12:45:00]

测试内容：
1. Rail 按钮颜色验证（rgb(191, 191, 191)）
2. Rail 按钮位置验证（x:16, 垂直排列）
3. Rail 按钮尺寸验证（68px 宽，70px/86px 高）
4. Header 元素位置验证（My Designs x:41, Untitled design x:177）
5. Header 元素颜色验证
6. Rail 按钮激活状态验证
"""

from playwright.sync_api import sync_playwright
import time
import sys
import os

def test_rail_button_colors(page, base_url):
    """测试1: Rail 按钮颜色验证"""
    print("\n" + "="*60)
    print("测试1: Rail 按钮颜色验证")
    print("="*60)
    
    page.goto(f'{base_url}/design-lab')
    page.wait_for_load_state('networkidle')
    time.sleep(3)  # 等待页面完全加载
    
    # 查找 Rail 按钮
    rail_buttons = page.locator('.dl-rail__btn')
    button_count = rail_buttons.count()
    if button_count == 0:
        print("❌ 未找到 Rail 按钮")
        page.screenshot(path='test-results/design-lab-rail-buttons-not-found.png', full_page=True)
        return False
    
    print(f"✅ 找到 {button_count} 个 Rail 按钮")
    
    # 检查第一个按钮的颜色
    first_button = rail_buttons.nth(0)
    color = first_button.evaluate('el => window.getComputedStyle(el).color')
    print(f"   第一个按钮颜色: {color}")
    
    # 检查按钮标签颜色
    labels = page.locator('.dl-rail__btn-label')
    label_count = labels.count()
    if label_count > 0:
        first_label = labels.nth(0)
        label_color = first_label.evaluate('el => window.getComputedStyle(el).color')
        print(f"   按钮标签颜色: {label_color}")
        
        # 验证颜色是否为 rgb(191, 191, 191)
        expected_color = 'rgb(191, 191, 191)'
        if expected_color in color or expected_color in label_color:
            print(f"✅ Rail 按钮颜色正确: {expected_color}")
            return True
        else:
            print(f"❌ Rail 按钮颜色不正确，期望: {expected_color}, 实际: {color}/{label_color}")
            page.screenshot(path='test-results/design-lab-rail-color-fail.png', full_page=True)
            return False
    else:
        print("❌ 未找到按钮标签")
        return False


def test_rail_button_layout(page, base_url):
    """测试2: Rail 按钮位置和布局验证"""
    print("\n" + "="*60)
    print("测试2: Rail 按钮位置和布局验证")
    print("="*60)
    
    page.goto(f'{base_url}/design-lab')
    page.wait_for_load_state('networkidle')
    time.sleep(3)
    
    # 查找 Rail 容器
    rail = page.locator('.dl-rail').first()
    if rail.count() == 0:
        print("❌ 未找到 Rail 容器")
        return False
    
    # 检查 Rail 布局
    flex_direction = rail.evaluate('el => window.getComputedStyle(el).flexDirection')
    print(f"   Rail flex-direction: {flex_direction}")
    
    if flex_direction == 'column':
        print("✅ Rail 垂直排列正确")
    else:
        print(f"❌ Rail 布局不正确，期望: column, 实际: {flex_direction}")
        return False
    
    # 检查第一个按钮的位置
    first_button = page.locator('.dl-rail__btn').nth(0)
    if first_button.count() == 0:
        print("❌ 未找到 Rail 按钮")
        return False
    
    box = first_button.bounding_box()
    if box:
        print(f"   第一个按钮位置: x={box['x']:.1f}, y={box['y']:.1f}")
        print(f"   第一个按钮尺寸: width={box['width']:.1f}, height={box['height']:.1f}")
        
        # 验证 x 位置是否为 16（允许 1px 误差）
        if abs(box['x'] - 16) <= 1:
            print("✅ Rail 按钮 x 位置正确 (x≈16)")
        else:
            print(f"❌ Rail 按钮 x 位置不正确，期望: 16, 实际: {box['x']:.1f}")
            return False
        
        # 验证按钮宽度是否为 68px（允许 1px 误差）
        if abs(box['width'] - 68) <= 1:
            print("✅ Rail 按钮宽度正确 (68px)")
        else:
            print(f"❌ Rail 按钮宽度不正确，期望: 68, 实际: {box['width']:.1f}")
            return False
        
        # 验证按钮高度是否为 70px 或 86px（允许 1px 误差）
        if abs(box['height'] - 70) <= 1 or abs(box['height'] - 86) <= 1:
            print(f"✅ Rail 按钮高度正确 ({box['height']:.1f}px)")
        else:
            print(f"❌ Rail 按钮高度不正确，期望: 70 或 86, 实际: {box['height']:.1f}")
            return False
        
        return True
    else:
        print("❌ 无法获取按钮位置信息")
        return False


def test_header_elements(page, base_url):
    """测试3: Header 元素位置和颜色验证"""
    print("\n" + "="*60)
    print("测试3: Header 元素位置和颜色验证")
    print("="*60)
    
    page.goto(f'{base_url}/design-lab')
    page.wait_for_load_state('networkidle')
    time.sleep(3)
    
    # 查找 My Designs 按钮
    my_designs_btn = page.locator('.dl-header__breadcrumb-link--button').first()
    if my_designs_btn.count() == 0:
        print("❌ 未找到 My Designs 按钮")
        return False
    
    box = my_designs_btn.bounding_box()
    if box:
        print(f"   My Designs 位置: x={box['x']:.1f}, y={box['y']:.1f}")
        print(f"   My Designs 尺寸: width={box['width']:.1f}, height={box['height']:.1f}")
        
        # 验证 x 位置是否为 41（允许 2px 误差）
        if abs(box['x'] - 41) <= 2:
            print("✅ My Designs x 位置正确 (x≈41)")
        else:
            print(f"❌ My Designs x 位置不正确，期望: 41, 实际: {box['x']:.1f}")
            return False
        
        # 检查颜色
        color = my_designs_btn.evaluate('el => window.getComputedStyle(el).color')
        print(f"   My Designs 颜色: {color}")
        if 'rgb(74, 74, 74)' in color:
            print("✅ My Designs 颜色正确")
        else:
            print(f"❌ My Designs 颜色不正确，期望: rgb(74, 74, 74), 实际: {color}")
    
    # 查找 Untitled design 按钮
    untitled_btn = page.locator('.dl-header__breadcrumb-current--button').first()
    if untitled_btn.count() == 0:
        print("❌ 未找到 Untitled design 按钮")
        return False
    
    box = untitled_btn.bounding_box()
    if box:
        print(f"   Untitled design 位置: x={box['x']:.1f}, y={box['y']:.1f}")
        print(f"   Untitled design 尺寸: width={box['width']:.1f}, height={box['height']:.1f}")
        
        # 验证 x 位置是否为 177（允许 2px 误差）
        if abs(box['x'] - 177) <= 2:
            print("✅ Untitled design x 位置正确 (x≈177)")
        else:
            print(f"❌ Untitled design x 位置不正确，期望: 177, 实际: {box['x']:.1f}")
            return False
        
        # 检查颜色
        color = untitled_btn.evaluate('el => window.getComputedStyle(el).color')
        print(f"   Untitled design 颜色: {color}")
        if 'rgba(0, 0, 0, 0.57)' in color or 'rgb(145, 145, 145)' in color:
            print("✅ Untitled design 颜色正确")
        else:
            print(f"⚠️  Untitled design 颜色可能不正确，期望: rgba(0, 0, 0, 0.57), 实际: {color}")
    
    return True


def test_rail_button_active_state(page, base_url):
    """测试4: Rail 按钮激活状态验证"""
    print("\n" + "="*60)
    print("测试4: Rail 按钮激活状态验证")
    print("="*60)
    
    page.goto(f'{base_url}/design-lab')
    page.wait_for_load_state('networkidle')
    time.sleep(3)
    
    # 查找第一个 Rail 按钮（Upload）
    upload_btn = page.locator('.dl-rail__btn').nth(0)
    if upload_btn.count() == 0:
        print("❌ 未找到 Rail 按钮")
        return False
    
    # 检查初始状态（应该没有 is-active 类）
    has_active_before = upload_btn.evaluate('el => el.classList.contains("is-active")')
    print(f"   点击前 is-active 状态: {has_active_before}")
    
    # 点击按钮
    print("   点击 Upload 按钮...")
    upload_btn.click()
    time.sleep(1)  # 等待状态更新
    
    # 检查点击后状态（应该有 is-active 类）
    has_active_after = upload_btn.evaluate('el => el.classList.contains("is-active")')
    print(f"   点击后 is-active 状态: {has_active_after}")
    
    if has_active_after:
        print("✅ Rail 按钮激活状态正确")
        
        # 检查激活状态的样式
        bg_color = upload_btn.evaluate('el => window.getComputedStyle(el).backgroundColor')
        text_color = upload_btn.evaluate('el => window.getComputedStyle(el).color')
        border_left = upload_btn.evaluate('el => window.getComputedStyle(el).borderLeftWidth')
        
        print(f"   激活状态背景色: {bg_color}")
        print(f"   激活状态文本色: {text_color}")
        print(f"   激活状态左边框: {border_left}")
        
        if 'rgb(255, 255, 255)' in text_color or 'rgba(255, 255, 255' in text_color:
            print("✅ 激活状态文本颜色正确（白色）")
        else:
            print(f"⚠️  激活状态文本颜色可能不正确，期望: 白色, 实际: {text_color}")
        
        return True
    else:
        print("❌ Rail 按钮激活状态不正确，点击后应该添加 is-active 类")
        page.screenshot(path='test-results/design-lab-active-state-fail.png', full_page=True)
        return False


def main():
    base_url = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:3000'
    
    print("="*60)
    print("🧪 使用 webapp-testing 验证 Design Lab 修复效果")
    print("="*60)
    print(f"测试 URL: {base_url}")
    
    # 创建测试结果目录
    os.makedirs('test-results', exist_ok=True)
    
    results = {}
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # 使用 headed 模式以便观察
        page = browser.new_page()
        
        try:
            # 测试1: Rail 按钮颜色
            results['rail_colors'] = test_rail_button_colors(page, base_url)
            
            # 测试2: Rail 按钮布局
            results['rail_layout'] = test_rail_button_layout(page, base_url)
            
            # 测试3: Header 元素
            results['header_elements'] = test_header_elements(page, base_url)
            
            # 测试4: Rail 按钮激活状态
            results['rail_active_state'] = test_rail_button_active_state(page, base_url)
            
            # 最终截图
            page.screenshot(path='test-results/design-lab-final-state.png', full_page=True)
            print("\n📸 最终状态截图已保存: test-results/design-lab-final-state.png")
            
        except Exception as e:
            print(f"\n❌ 测试执行失败: {e}")
            import traceback
            traceback.print_exc()
            page.screenshot(path='test-results/design-lab-error.png', full_page=True)
        finally:
            time.sleep(2)  # 等待一下再关闭
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

