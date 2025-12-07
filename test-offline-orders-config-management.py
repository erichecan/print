#!/usr/bin/env python3
"""
测试线下订单配置管理功能
[2025-01-27 15:00:00] 使用 Playwright 和 Chrome DevTools 进行完整闭环测试
"""
import asyncio
from playwright.async_api import async_playwright
import json
import sys

FRONTEND_URL = "https://print-main-frontend-234065158862.us-central1.run.app"
BACKEND_URL = "https://print-main-backend-234065158862.us-central1.run.app"

async def test_config_management():
    """测试配置管理功能"""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()
        
        print("=" * 60)
        print("测试线下订单配置管理功能")
        print("=" * 60)
        
        try:
            # 1. 访问销售管理页面
            print("\n1. 访问销售管理页面...")
            await page.goto(f"{FRONTEND_URL}/offline-orders/sales/orders", wait_until="networkidle")
            await page.wait_for_timeout(2000)
            
            # 检查是否有Tab切换
            tabs = await page.locator('.sales-orders-tab').all()
            if len(tabs) >= 2:
                print("✅ Tab切换功能存在")
                
                # 点击配置管理Tab
                config_tab = page.locator('.sales-orders-tab').filter(has_text='配置管理')
                if await config_tab.count() > 0:
                    await config_tab.click()
                    await page.wait_for_timeout(1000)
                    print("✅ 成功切换到配置管理Tab")
                    
                    # 检查是否有颜色管理和产品管理子Tab
                    sub_tabs = await page.locator('.config-sub-tab').all()
                    if len(sub_tabs) >= 2:
                        print("✅ 配置管理子Tab存在")
                        
                        # 测试颜色管理
                        print("\n2. 测试颜色管理...")
                        color_tab = page.locator('.config-sub-tab').filter(has_text='颜色管理')
                        if await color_tab.count() > 0:
                            await color_tab.click()
                            await page.wait_for_timeout(1000)
                            
                            # 检查是否有添加颜色的表单
                            color_input = page.locator('input[placeholder*="颜色名称"]')
                            if await color_input.count() > 0:
                                print("✅ 颜色管理界面加载成功")
                            else:
                                print("❌ 颜色管理界面未找到输入框")
                        
                        # 测试产品管理
                        print("\n3. 测试产品管理...")
                        product_tab = page.locator('.config-sub-tab').filter(has_text='产品管理')
                        if await product_tab.count() > 0:
                            await product_tab.click()
                            await page.wait_for_timeout(1000)
                            
                            # 检查是否有添加产品的表单
                            product_input = page.locator('input[placeholder*="产品名称"]')
                            if await product_input.count() > 0:
                                print("✅ 产品管理界面加载成功")
                            else:
                                print("❌ 产品管理界面未找到输入框")
                    else:
                        print("❌ 配置管理子Tab不存在")
                else:
                    print("❌ 配置管理Tab不存在（可能需要管理员权限）")
            else:
                print("❌ Tab切换功能不存在")
            
            # 2. 测试公开API（产品列表）
            print("\n4. 测试公开产品列表API...")
            response = await page.request.get(f"{FRONTEND_URL}/api/offline-orders/products")
            if response.status == 200:
                data = await response.json()
                print(f"✅ 公开API返回成功，产品数量: {len(data.get('data', []))}")
            else:
                print(f"❌ 公开API返回失败: {response.status}")
            
            print("\n" + "=" * 60)
            print("测试完成")
            print("=" * 60)
            
        except Exception as e:
            print(f"\n❌ 测试过程中出现错误: {e}")
            await page.screenshot(path="test-results/config-management-error.png")
            raise
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(test_config_management())

