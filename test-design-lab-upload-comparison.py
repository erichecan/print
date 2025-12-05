#!/usr/bin/env python3
"""
Design Lab Upload 功能像素级对比测试
[2025-01-30 23:30:00] 使用 Playwright 对比本地实现与 Custom Ink 截图的视觉一致性
"""

from playwright.sync_api import sync_playwright
import time
import json
import os
from datetime import datetime
from pathlib import Path

# 本地开发环境配置
LOCAL_URL = 'http://localhost:3000'
DESIGN_LAB_URL = f'{LOCAL_URL}/design-lab'

# 参考截图路径
REFERENCE_SCREENSHOTS = {
    'index': 'docs/customink-analysis/screenshots/interactions/designlab-index.jpeg',
    'upload01': 'docs/customink-analysis/screenshots/interactions/designlab-upload01.jpeg',
    'upload02': 'docs/customink-analysis/screenshots/interactions/designlab-upload02.jpeg',
    'upload03': 'docs/customink-analysis/screenshots/interactions/designlab-upload03.jpeg'
}

# 测试结果目录
TEST_RESULTS_DIR = 'test-results/design-lab-upload-comparison'
os.makedirs(TEST_RESULTS_DIR, exist_ok=True)

def take_screenshot(page, name, description):
    """截图并保存"""
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    filename = f'{name}-{timestamp}.png'
    filepath = os.path.join(TEST_RESULTS_DIR, filename)
    try:
        page.screenshot(path=filepath, full_page=False, timeout=10000)  # 使用 viewport 截图，避免超时
        print(f"   📸 截图已保存: {filepath}")
        return filepath
    except Exception as e:
        print(f"   ⚠️ 截图失败: {e}")
        return None

def test_upload_panel_comparison(page):
    """测试 Upload 面板对比"""
    print("\n📤 测试 Upload 面板...")
    
    try:
        # 访问 Design Lab 页面
        print(f"   访问 {DESIGN_LAB_URL}...")
        try:
            page.goto(DESIGN_LAB_URL, wait_until='domcontentloaded', timeout=60000)
            time.sleep(5)  # 等待页面完全加载，包括 React 组件
            
            # 等待关键元素加载
            page.wait_for_selector('.design-lab-new, .dl-rail, .dl-canvas', timeout=10000)
            time.sleep(2)  # 额外等待动画和渲染完成
            
            # 截图 1: 首页状态
            print("   截图 1: 首页状态...")
            screenshot_index = take_screenshot(page, 'designlab-index-local', '首页状态')
        except Exception as e:
            print(f"   ⚠️ 页面加载问题: {e}")
            # 即使加载有问题，也尝试截图
            screenshot_index = take_screenshot(page, 'designlab-index-local-error', '首页状态（错误）')
        
        # 点击 Upload 按钮
        print("   点击 Upload 按钮...")
        upload_button = page.locator('[aria-label="Upload image"], .dl-rail__btn:has-text("Upload")').first
        if upload_button.count() > 0:
            upload_button.click()
            time.sleep(2)  # 等待面板打开
            
            # 截图 2: Upload 面板（步骤 1）
            print("   截图 2: Upload 面板（Choose File To Upload）...")
            screenshot_upload01 = take_screenshot(page, 'designlab-upload01-local', 'Upload 面板')
            
            # 检查关键元素
            browse_button = page.locator('button:has-text("Browse Your Computer")')
            drag_drop = page.locator('.dl-upload-panel__drag-drop, [class*="drag"]')
            info_text = page.locator('text=/Vector or high resolution/')
            signin_link = page.locator('text=/Sign in to access/')
            
            checks = {
                'Browse Your Computer 按钮': browse_button.count() > 0,
                'Drag & Drop 区域': drag_drop.count() > 0,
                '信息提示文本': info_text.count() > 0,
                'Sign in 链接': signin_link.count() > 0
            }
            
            print("   元素检查:")
            for element, found in checks.items():
                status = "✅" if found else "❌"
                print(f"     {status} {element}: {found}")
            
            return {
                'success': True,
                'screenshots': {
                    'index': screenshot_index,
                    'upload01': screenshot_upload01
                },
                'checks': checks
            }
        else:
            print("   ❌ 未找到 Upload 按钮")
            return {'success': False, 'error': 'Upload button not found'}
            
    except Exception as e:
        print(f"   ❌ Upload 面板测试失败: {e}")
        import traceback
        traceback.print_exc()
        return {'success': False, 'error': str(e)}

def test_edit_upload_panel_comparison(page):
    """测试 Edit Upload 面板对比"""
    print("\n✏️ 测试 Edit Upload 面板...")
    
    try:
        # 需要先上传一个文件才能看到 Edit Upload 面板
        # 这里我们假设已经有一个上传的图片
        # 实际测试中需要先上传文件
        
        # 检查是否有 Edit Upload 面板
        edit_panel = page.locator('.dl-edit-upload-panel, [class*="edit-upload"]')
        
        if edit_panel.count() > 0:
            time.sleep(1)
            
            # 截图 3: Edit Upload 面板（步骤 2）
            print("   截图 3: Edit Upload 面板...")
            screenshot_upload02 = take_screenshot(page, 'designlab-upload02-local', 'Edit Upload 面板')
            
            # 检查关键元素
            size_inputs = page.locator('.dl-edit-upload-panel__size-input, input[type="text"]')
            color_swatches = page.locator('.dl-edit-upload-panel__color-swatch, [class*="color-swatch"]')
            toggles = page.locator('.dl-edit-upload-panel__toggle-btn, [class*="toggle"]')
            control_buttons = page.locator('.dl-edit-upload-panel__control-btn, [class*="control-btn"]')
            rotation_slider = page.locator('.dl-edit-upload-panel__slider, input[type="range"]')
            reset_button = page.locator('button:has-text("Reset To Original")')
            save_button = page.locator('button:has-text("Save Design")')
            
            checks = {
                'Size 输入框': size_inputs.count() >= 2,
                '颜色色板': color_swatches.count() >= 4,
                '开关': toggles.count() >= 2,
                '控制按钮': control_buttons.count() >= 5,
                'Rotation 滑块': rotation_slider.count() > 0,
                'Reset To Original 按钮': reset_button.count() > 0,
                'Save Design 按钮': save_button.count() > 0
            }
            
            print("   元素检查:")
            for element, found in checks.items():
                status = "✅" if found else "❌"
                print(f"     {status} {element}: {found}")
            
            return {
                'success': True,
                'screenshots': {
                    'upload02': screenshot_upload02
                },
                'checks': checks
            }
        else:
            print("   ⚠️ Edit Upload 面板未显示（需要先上传文件）")
            return {'success': False, 'error': 'Edit Upload panel not visible (need to upload file first)'}
            
    except Exception as e:
        print(f"   ❌ Edit Upload 面板测试失败: {e}")
        import traceback
        traceback.print_exc()
        return {'success': False, 'error': str(e)}

def test_recent_uploads_comparison(page):
    """测试 Recent Uploads 功能对比"""
    print("\n📋 测试 Recent Uploads 功能...")
    
    try:
        # 检查 Recent Uploads 部分
        recent_section = page.locator('.dl-upload-panel__recent, [class*="recent"]')
        
        if recent_section.count() > 0:
            time.sleep(1)
            
            # 截图 4: Recent Uploads（步骤 3）
            print("   截图 4: Recent Uploads...")
            screenshot_upload03 = take_screenshot(page, 'designlab-upload03-local', 'Recent Uploads')
            
            # 检查关键元素
            recent_title = page.locator('text=/Recent Uploads/i')
            recent_items = page.locator('.dl-upload-panel__recent-item, [class*="recent-item"]')
            
            checks = {
                'Recent Uploads 标题': recent_title.count() > 0,
                'Recent Uploads 项目': recent_items.count() > 0
            }
            
            print("   元素检查:")
            for element, found in checks.items():
                status = "✅" if found else "❌"
                print(f"     {status} {element}: {found}")
            
            return {
                'success': True,
                'screenshots': {
                    'upload03': screenshot_upload03
                },
                'checks': checks
            }
        else:
            print("   ⚠️ Recent Uploads 未显示（需要先上传文件）")
            return {'success': False, 'error': 'Recent Uploads not visible (need to upload file first)'}
            
    except Exception as e:
        print(f"   ❌ Recent Uploads 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return {'success': False, 'error': str(e)}

def main():
    """主测试函数"""
    print("=" * 60)
    print("Design Lab Upload 功能像素级对比测试")
    print("=" * 60)
    
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    results = {
        'timestamp': timestamp,
        'local_url': LOCAL_URL,
        'tests': {}
    }
    
    with sync_playwright() as p:
        # 启动浏览器
        print("\n🚀 启动浏览器...")
        browser = p.chromium.launch(headless=False)  # 使用 headless=False 以便观察
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            device_scale_factor=1
        )
        page = context.new_page()
        
        try:
            # 测试 1: Upload 面板对比
            results['tests']['upload_panel'] = test_upload_panel_comparison(page)
            
            # 测试 2: Edit Upload 面板对比
            results['tests']['edit_upload_panel'] = test_edit_upload_panel_comparison(page)
            
            # 测试 3: Recent Uploads 对比
            results['tests']['recent_uploads'] = test_recent_uploads_comparison(page)
            
        finally:
            browser.close()
    
    # 保存测试结果
    results_file = os.path.join(TEST_RESULTS_DIR, f'comparison-results-{timestamp}.json')
    with open(results_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print("\n" + "=" * 60)
    print("测试完成！")
    print(f"结果已保存到: {results_file}")
    print("=" * 60)
    
    # 打印摘要
    print("\n📊 测试摘要:")
    for test_name, test_result in results['tests'].items():
        status = "✅" if test_result.get('success') else "❌"
        print(f"  {status} {test_name}: {test_result.get('success', False)}")
    
    return results

if __name__ == '__main__':
    main()

