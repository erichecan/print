#!/usr/bin/env python3
"""
完整的线下订单配置管理功能测试
[2025-01-27 16:15:00] 使用 Playwright 和 Chrome DevTools 进行完整闭环测试
"""
import asyncio
from playwright.async_api import async_playwright
import json
import sys

FRONTEND_URL = "https://print-main-frontend-234065158862.us-central1.run.app"
BACKEND_URL = "https://print-main-backend-234065158862.us-central1.run.app"

async def test_complete_flow():
    """完整测试流程"""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()
        
        print("=" * 60)
        print("完整线下订单配置管理功能测试")
        print("=" * 60)
        
        results = []
        
        try:
            # 1. 测试后端直接API
            print("\n1. 测试后端直接API...")
            try:
                response = await page.request.get(f"{BACKEND_URL}/api/offline-orders/products")
                if response.status == 200:
                    data = await response.json()
                    print(f"✅ 后端API正常，产品数量: {len(data.get('data', []))}")
                    results.append(("后端API", True))
                else:
                    print(f"❌ 后端API返回: {response.status}")
                    text = await response.text()
                    print(f"   响应: {text[:200]}")
                    results.append(("后端API", False))
            except Exception as e:
                print(f"❌ 后端API测试失败: {e}")
                results.append(("后端API", False))
            
            # 2. 测试前端代理API
            print("\n2. 测试前端代理API...")
            try:
                response = await page.request.get(f"{FRONTEND_URL}/api/offline-orders/products")
                if response.status == 200:
                    data = await response.json()
                    print(f"✅ 前端代理API正常，产品数量: {len(data.get('data', []))}")
                    results.append(("前端代理API", True))
                else:
                    print(f"❌ 前端代理API返回: {response.status}")
                    text = await response.text()
                    print(f"   响应: {text[:200]}")
                    results.append(("前端代理API", False))
            except Exception as e:
                print(f"❌ 前端代理API测试失败: {e}")
                results.append(("前端代理API", False))
            
            # 3. 测试销售管理页面
            print("\n3. 测试销售管理页面...")
            try:
                await page.goto(f"{FRONTEND_URL}/offline-orders/sales/orders", wait_until="networkidle", timeout=30000)
                await page.wait_for_timeout(3000)
                
                # 检查页面标题
                title = await page.title()
                print(f"   页面标题: {title}")
                
                # 检查Tab
                tabs = await page.locator('.sales-orders-tab, [class*="tab"]').all()
                print(f"   找到Tab数量: {len(tabs)}")
                
                if len(tabs) >= 2:
                    print("✅ Tab切换功能存在")
                    results.append(("Tab切换", True))
                    
                    # 尝试点击配置管理Tab
                    config_tab_text = await page.locator('text=配置管理').count()
                    if config_tab_text > 0:
                        print("✅ 配置管理Tab存在")
                        await page.locator('text=配置管理').first.click()
                        await page.wait_for_timeout(2000)
                        
                        # 检查配置管理内容
                        sub_tabs = await page.locator('.config-sub-tab, [class*="sub-tab"]').all()
                        if len(sub_tabs) >= 2:
                            print("✅ 配置管理子Tab存在")
                            results.append(("配置管理界面", True))
                        else:
                            print("❌ 配置管理子Tab不存在")
                            results.append(("配置管理界面", False))
                    else:
                        print("⚠️  配置管理Tab不存在（可能需要管理员权限）")
                        results.append(("配置管理Tab", False))
                else:
                    print("❌ Tab切换功能不存在")
                    results.append(("Tab切换", False))
                    
                    # 截图
                    await page.screenshot(path="test-results/sales-orders-page.png", full_page=True)
                    print("   已保存页面截图: test-results/sales-orders-page.png")
                    
            except Exception as e:
                print(f"❌ 销售管理页面测试失败: {e}")
                await page.screenshot(path="test-results/sales-orders-error.png")
                results.append(("销售管理页面", False))
            
            # 4. 测试订单创建页面的产品下拉菜单
            print("\n4. 测试订单创建页面...")
            try:
                await page.goto(f"{FRONTEND_URL}/offline-orders", wait_until="networkidle", timeout=30000)
                await page.wait_for_timeout(3000)
                
                # 检查产品下拉菜单
                product_select = await page.locator('select, [role="combobox"]').filter(has_text='产品').count()
                if product_select > 0:
                    print("✅ 产品下拉菜单存在")
                    results.append(("产品下拉菜单", True))
                else:
                    # 尝试其他选择器
                    selects = await page.locator('select').all()
                    print(f"   找到select元素数量: {len(selects)}")
                    if len(selects) > 0:
                        print("✅ 找到select元素")
                        results.append(("产品下拉菜单", True))
                    else:
                        print("❌ 产品下拉菜单不存在")
                        results.append(("产品下拉菜单", False))
                        
            except Exception as e:
                print(f"❌ 订单创建页面测试失败: {e}")
                results.append(("订单创建页面", False))
            
            # 汇总结果
            print("\n" + "=" * 60)
            print("测试结果汇总")
            print("=" * 60)
            passed = 0
            failed = 0
            for name, result in results:
                status = "✅ 通过" if result else "❌ 失败"
                print(f"{name}: {status}")
                if result:
                    passed += 1
                else:
                    failed += 1
            
            print(f"\n总计: {passed} 通过, {failed} 失败")
            
            if failed == 0:
                print("\n🎉 所有测试通过！")
                return 0
            else:
                print(f"\n⚠️  有 {failed} 个测试失败")
                return 1
                
        except Exception as e:
            print(f"\n❌ 测试过程中出现严重错误: {e}")
            await page.screenshot(path="test-results/test-error.png")
            return 1
        finally:
            await browser.close()

if __name__ == "__main__":
    exit_code = asyncio.run(test_complete_flow())
    sys.exit(exit_code)
