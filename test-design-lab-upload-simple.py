#!/usr/bin/env python3
"""
Design Lab Upload 功能简单验证测试
[2025-01-30 23:30:00] 快速验证 Upload 功能的关键元素是否存在
"""

from playwright.sync_api import sync_playwright
import time
import json
import os
from datetime import datetime

LOCAL_URL = 'http://localhost:3000'
DESIGN_LAB_URL = f'{LOCAL_URL}/design-lab'
TEST_RESULTS_DIR = 'test-results/design-lab-upload-comparison'
os.makedirs(TEST_RESULTS_DIR, exist_ok=True)

def main():
    print("=" * 60)
    print("Design Lab Upload 功能验证测试")
    print("=" * 60)
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080}
        )
        page = context.new_page()
        
        try:
            print(f"\n访问 {DESIGN_LAB_URL}...")
            page.goto(DESIGN_LAB_URL, wait_until='domcontentloaded', timeout=60000)
            time.sleep(8)  # 等待 React 组件加载
            
            # 检查页面标题
            title = page.title()
            print(f"页面标题: {title}")
            
            # 截图（禁用字体等待）
            timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
            screenshot_path = f'{TEST_RESULTS_DIR}/design-lab-{timestamp}.png'
            try:
                page.screenshot(path=screenshot_path, full_page=False, timeout=5000, animations='disabled')
                print(f"截图已保存: {screenshot_path}")
            except Exception as e:
                print(f"截图失败（继续测试）: {e}")
            
            # 检查关键元素
            print("\n检查关键元素:")
            
            # Rail 按钮
            rail_buttons = page.locator('.dl-rail__btn, button[aria-label*="Upload"]')
            print(f"  Rail 按钮数量: {rail_buttons.count()}")
            
            # Upload 按钮
            upload_btn = page.locator('text=Upload').first
            if upload_btn.count() > 0:
                print("  ✅ 找到 Upload 按钮")
                upload_btn.click()
                time.sleep(2)
                
                # 截图 Upload 面板
                screenshot_upload = f'{TEST_RESULTS_DIR}/upload-panel-{timestamp}.png'
                try:
                    page.screenshot(path=screenshot_upload, full_page=False, timeout=5000, animations='disabled')
                    print(f"  Upload 面板截图: {screenshot_upload}")
                except Exception as e:
                    print(f"  Upload 面板截图失败: {e}")
                
                # 等待面板渲染
                time.sleep(3)
                
                # 检查 Upload 面板元素 - 使用多种选择器
                browse_btn = page.locator('button:has-text("Browse Your Computer"), .dl-upload-panel__browse-btn')
                drag_drop = page.locator('text=/Drag.*Drop.*Anywhere/i, .dl-upload-panel__drag-drop')
                info_text = page.locator('text=/300 DPI|Vector or high resolution/i, .dl-upload-panel__info')
                signin_link = page.locator('text=/Sign in to access/i, .dl-upload-panel__signin-link')
                help_section = page.locator('text=/Need help with your upload/i, .dl-upload-panel__help')
                
                print(f"    Browse Your Computer 按钮: {'✅' if browse_btn.count() > 0 else '❌'} (找到 {browse_btn.count()} 个)")
                print(f"    Drag & Drop Anywhere 区域: {'✅' if drag_drop.count() > 0 else '❌'} (找到 {drag_drop.count()} 个)")
                print(f"    信息提示文本: {'✅' if info_text.count() > 0 else '❌'} (找到 {info_text.count()} 个)")
                print(f"    Sign in 链接: {'✅' if signin_link.count() > 0 else '❌'} (找到 {signin_link.count()} 个)")
                print(f"    帮助部分: {'✅' if help_section.count() > 0 else '❌'} (找到 {help_section.count()} 个)")
                
                # 检查面板标题
                panel_title = page.locator('text=Choose File To Upload, .dl-upload-panel__title')
                print(f"    面板标题: {'✅' if panel_title.count() > 0 else '❌'} (找到 {panel_title.count()} 个)")
                
                # 获取页面 HTML 片段用于调试
                upload_panel = page.locator('.dl-upload-panel').first
                if upload_panel.count() > 0:
                    html_snippet = upload_panel.inner_html()[:500]  # 前500个字符
                    print(f"\n    面板 HTML 片段: {html_snippet[:200]}...")
            else:
                print("  ❌ 未找到 Upload 按钮")
            
            # 等待用户观察
            print("\n浏览器将保持打开 10 秒，请观察页面...")
            time.sleep(10)
            
        except Exception as e:
            print(f"\n❌ 错误: {e}")
            import traceback
            traceback.print_exc()
            
            # 即使出错也截图
            try:
                error_screenshot = f'{TEST_RESULTS_DIR}/error-{datetime.now().strftime("%Y%m%d%H%M%S")}.png'
                page.screenshot(path=error_screenshot, full_page=False)
                print(f"错误截图已保存: {error_screenshot}")
            except:
                pass
        finally:
            browser.close()
    
    print("\n测试完成！")

if __name__ == '__main__':
    main()

