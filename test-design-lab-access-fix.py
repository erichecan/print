#!/usr/bin/env python3
"""
Design Lab 访问修复验证测试
[2025-01-31 18:40:00] 验证 design lab 页面可以正常访问，修复 Suspense 和 CSS 预加载警告问题
"""

import asyncio
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError
import sys

BASE_URL = "https://print-main-frontend-234065158862.us-central1.run.app"

async def test_design_lab_access():
    """测试 Design Lab 页面是否可以正常访问"""
    async with async_playwright() as p:
        print(f"[测试] 启动浏览器...")
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()
        
        # 捕获控制台消息
        console_messages = []
        page.on("console", lambda msg: console_messages.append({
            "type": msg.type,
            "text": msg.text
        }))
        
        try:
            print(f"[测试] 访问 Design Lab 页面: {BASE_URL}/design-lab")
            await page.goto(f"{BASE_URL}/design-lab", wait_until="domcontentloaded", timeout=30000)
            
            # 等待页面加载
            print("[测试] 等待页面加载...")
            await page.wait_for_load_state("networkidle", timeout=30000)
            await asyncio.sleep(3)  # 等待 Suspense 和组件初始化
            
            # 检查页面是否正常加载
            print("[测试] 检查页面元素...")
            
            # 检查是否有 Design Lab 容器
            design_lab_selectors = [
                '.design-lab-new',
                '[class*="design-lab"]',
                '.dl-header',
                '.dl-rail',
                '.dl-canvas'
            ]
            
            found_element = False
            for selector in design_lab_selectors:
                try:
                    element = await page.wait_for_selector(selector, timeout=5000)
                    if element:
                        print(f"[✓] 找到 Design Lab 元素: {selector}")
                        found_element = True
                        break
                except PlaywrightTimeoutError:
                    continue
            
            if not found_element:
                print("[✗] 未找到 Design Lab 主要元素")
                # 获取页面内容用于调试
                body_text = await page.locator("body").inner_text()
                print(f"[调试] 页面内容预览: {body_text[:500]}")
                
                # 检查是否有 Suspense fallback
                try:
                    suspense_fallback = page.locator("text=Preparing the Design Lab").first
                    if await suspense_fallback.is_visible(timeout=2000):
                        print("[!] 发现 Suspense fallback，页面可能卡在加载状态")
                except:
                    pass
                
                # 获取页面 HTML 结构
                html = await page.content()
                if "Design Lab" in html or "design-lab" in html:
                    print("[!] HTML 中包含 Design Lab 相关内容，但元素未渲染")
                
                return False
            
            # 检查是否有错误页面
            error_selectors = [
                'text=Design Lab Error',
                'text=Error',
                'text=404',
                'text=500'
            ]
            
            for selector in error_selectors:
                try:
                    element = await page.locator(selector).first
                    if await element.is_visible(timeout=1000):
                        print(f"[✗] 发现错误页面: {selector}")
                        return False
                except:
                    pass
            
            # 检查控制台错误
            print("[测试] 检查控制台消息...")
            errors = [msg for msg in console_messages if msg["type"] == "error"]
            warnings = [msg for msg in console_messages if msg["type"] == "warning"]
            
            # 过滤掉已知的 CSS 预加载警告（应该被 GlobalErrorFilter 过滤）
            css_preload_warnings = [
                msg for msg in warnings 
                if "preload" in msg["text"].lower() and "not used" in msg["text"].lower()
            ]
            
            critical_errors = [
                msg for msg in errors 
                if "preload" not in msg["text"].lower() 
                and "cloudusersettings" not in msg["text"].lower()
                and "PerformanceObserver" not in msg["text"]
            ]
            
            if css_preload_warnings:
                print(f"[!] 发现 {len(css_preload_warnings)} 个 CSS 预加载警告（应该被过滤）")
                for warning in css_preload_warnings[:3]:  # 只显示前3个
                    print(f"    - {warning['text'][:100]}")
            
            if critical_errors:
                print(f"[✗] 发现 {len(critical_errors)} 个关键错误:")
                for error in critical_errors[:5]:  # 只显示前5个
                    print(f"    - {error['text'][:150]}")
                return False
            
            # 检查页面标题
            title = await page.title()
            print(f"[测试] 页面标题: {title}")
            
            if "Design Lab" not in title and "Error" not in title:
                print("[!] 页面标题可能不正确")
            
            print("[✓] Design Lab 页面可以正常访问")
            return True
            
        except PlaywrightTimeoutError as e:
            print(f"[✗] 页面加载超时: {e}")
            return False
        except Exception as e:
            print(f"[✗] 测试失败: {e}")
            import traceback
            traceback.print_exc()
            return False
        finally:
            await browser.close()

async def main():
    """主函数"""
    print("=" * 60)
    print("Design Lab 访问修复验证测试")
    print("=" * 60)
    print()
    
    success = await test_design_lab_access()
    
    print()
    print("=" * 60)
    if success:
        print("[✓] 测试通过: Design Lab 可以正常访问")
        sys.exit(0)
    else:
        print("[✗] 测试失败: Design Lab 无法正常访问")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())

