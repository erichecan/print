#!/usr/bin/env python3
"""
线下订单管理功能 v2.0 完整流程测试（生产环境）
[2025-12-07 01:40:00] 完整测试3步流程并对比 PRD v2.0 需求
"""
import asyncio
import json
from datetime import datetime
from pathlib import Path
from playwright.async_api import async_playwright

PRODUCTION_URL = "https://print-main-frontend-234065158862.us-central1.run.app"
TEST_RESULTS_DIR = Path("test-results/offline-orders-v2-complete")
TEST_RESULTS_DIR.mkdir(parents=True, exist_ok=True)

async def test_complete_flow():
    """完整测试线下订单创建流程"""
    results = {
        "test_time": datetime.now().isoformat(),
        "production_url": PRODUCTION_URL,
        "steps_tested": {},
        "requirements_met": {},
        "gaps": []
    }
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 720},
            locale="zh-CN"
        )
        page = await context.new_page()
        
        try:
            print("🚀 开始完整流程测试...\n")
            
            # 访问页面
            print("📋 访问线下订单页面...")
            await page.goto(f"{PRODUCTION_URL}/offline-orders", wait_until="networkidle")
            await page.wait_for_timeout(3000)
            await page.screenshot(path=TEST_RESULTS_DIR / "00-initial-page.png")
            
            # 检查基本功能
            order_code = page.locator('text=/OFF-[0-9]{8}-[A-Z0-9]{4}/').first
            has_order_code = await order_code.is_visible()
            if has_order_code:
                code_text = await order_code.text_content()
                print(f"   ✅ 订单编号: {code_text}")
                results["requirements_met"]["订单编号自动生成"] = "✅"
            else:
                results["gaps"].append("订单编号未显示")
            
            # 检查步骤导航栏
            print("\n📋 检查步骤导航...")
            step_nav = page.locator('[class*="step"], [class*="Step"]')
            step_count = await step_nav.count()
            
            # 查找步骤标题
            step_titles = []
            for i in range(min(step_count, 10)):
                try:
                    step = step_nav.nth(i)
                    if await step.is_visible():
                        text = await step.text_content()
                        if text:
                            step_titles.append(text.strip()[:50])
                except:
                    break
            
            print(f"   检测到 {len(step_titles)} 个步骤元素")
            print(f"   步骤标题: {step_titles}")
            
            # 检查步骤数量（应该是3步或5步，取决于实现）
            step_indicators = page.locator('[class*="step"]:has-text("1"), [class*="step"]:has-text("2"), [class*="step"]:has-text("3")')
            step_indicator_count = await step_indicators.count()
            print(f"   步骤指示器数量: {step_indicator_count}")
            
            # 测试第一步：产品选择
            print("\n📋 测试第一步：产品选择...")
            await page.screenshot(path=TEST_RESULTS_DIR / "01-step1.png")
            
            # 检查产品分类下拉框
            category_select = page.locator('select').first
            if await category_select.is_visible():
                print("   ✅ 产品分类选择器可见")
                results["steps_tested"]["第一步-产品分类选择器"] = "✅"
                
                # 检查选项
                options = category_select.locator('option')
                option_count = await options.count()
                print(f"   选项数量: {option_count}")
                
                if option_count > 1:
                    # 尝试选择第一个可用选项
                    for i in range(1, min(option_count, 5)):
                        try:
                            opt = options.nth(i)
                            text = await opt.text_content()
                            if text and "暂无" not in text and "Loading" not in text:
                                await category_select.select_option(index=i)
                                await page.wait_for_timeout(1000)
                                print(f"   ✅ 选择了产品分类: {text.strip()}")
                                results["steps_tested"]["第一步-选择产品分类"] = f"✅ ({text.strip()})"
                                break
                        except:
                            continue
            else:
                print("   ❌ 产品分类选择器不可见")
                results["steps_tested"]["第一步-产品分类选择器"] = "❌"
            
            # 检查产品变体表格
            variant_table = page.locator('table').first
            if await variant_table.is_visible():
                print("   ✅ 产品变体表格可见")
                results["steps_tested"]["第一步-产品变体表格"] = "✅"
                
                # 尝试填写变体信息
                quantity_inputs = page.locator('input[type="number"]')
                quantity_count = await quantity_inputs.count()
                if quantity_count > 0:
                    first_quantity = quantity_inputs.first
                    await first_quantity.fill('10')
                    print("   ✅ 填写了数量: 10")
                    results["steps_tested"]["第一步-填写数量"] = "✅"
            else:
                print("   ⚠️  产品变体表格不可见（可能需要先添加产品）")
            
            # 检查价格显示
            price_display = page.locator('text=/总计|Total|CAD|小计/')
            if await price_display.is_visible():
                print("   ✅ 价格显示可见")
                results["steps_tested"]["第一步-价格显示"] = "✅"
            
            # 点击下一步
            print("\n📋 尝试进入第二步...")
            next_button = page.locator('button:has-text("下一步"), button:has-text("Next")').first
            if await next_button.is_visible():
                try:
                    await next_button.click()
                    await page.wait_for_timeout(2000)
                    await page.screenshot(path=TEST_RESULTS_DIR / "02-step2.png")
                    print("   ✅ 成功进入第二步")
                    results["steps_tested"]["导航-进入第二步"] = "✅"
                except Exception as e:
                    print(f"   ⚠️  无法点击下一步: {str(e)[:50]}")
            
            # 测试第二步：客户信息和Invoice
            print("\n📋 测试第二步：客户信息和Invoice...")
            
            # 检查客户信息字段
            contact_name = page.locator('input[name*="contactName"], input[name*="contact"]').first
            email = page.locator('input[type="email"]').first
            phone = page.locator('input[type="tel"]').first
            date = page.locator('input[type="date"]').first
            
            has_contact = await contact_name.is_visible()
            has_email = await email.is_visible()
            has_phone = await phone.is_visible()
            has_date = await date.is_visible()
            
            if has_contact and has_email:
                print("   ✅ 客户信息字段可见")
                results["steps_tested"]["第二步-客户信息字段"] = "✅"
                
                # 填写测试数据
                await contact_name.fill('测试用户')
                await email.fill('test@example.com')
                if has_phone:
                    await phone.fill('4165551234')
                if has_date:
                    future_date = (datetime.now().replace(day=1) if datetime.now().day > 25 else datetime.now()).strftime('%Y-%m-%d')
                    await date.fill(future_date)
                print("   ✅ 填写了客户信息")
                results["steps_tested"]["第二步-填写客户信息"] = "✅"
            else:
                print("   ❌ 客户信息字段不可见")
                results["steps_tested"]["第二步-客户信息字段"] = "❌"
                results["gaps"].append("第二步客户信息字段不可见")
            
            # 检查Invoice功能
            invoice_checkbox = page.locator('input[type="checkbox"][name*="invoice"]').first
            if await invoice_checkbox.is_visible():
                print("   ✅ Invoice复选框可见")
                results["steps_tested"]["第二步-Invoice复选框"] = "✅"
                
                # 勾选Invoice
                await invoice_checkbox.check()
                await page.wait_for_timeout(1000)
                await page.screenshot(path=TEST_RESULTS_DIR / "03-invoice-expanded.png")
                
                # 检查Invoice字段
                company_name = page.locator('input[name*="companyName"]').first
                tax_number = page.locator('input[name*="taxNumber"]').first
                payment_method = page.locator('select[name*="paymentMethod"]').first
                
                has_company = await company_name.is_visible()
                has_tax = await tax_number.is_visible()
                has_payment = await payment_method.is_visible()
                
                if has_company and has_tax:
                    print("   ✅ Invoice字段可见")
                    results["steps_tested"]["第二步-Invoice字段"] = "✅"
                    
                    # 填写Invoice信息
                    await company_name.fill('测试公司')
                    await tax_number.fill('123456789RT0001')
                    if has_payment:
                        await payment_method.select_option(index=1)
                    print("   ✅ 填写了Invoice信息")
                    results["steps_tested"]["第二步-填写Invoice信息"] = "✅"
                else:
                    print("   ❌ Invoice字段不完整")
                    results["gaps"].append("Invoice字段不完整")
                
                # 检查税计算
                tax_display = page.locator('text=/税|Tax|HST|13%/').first
                if await tax_display.is_visible():
                    tax_text = await tax_display.text_content()
                    print(f"   ✅ 税计算显示: {tax_text[:50]}")
                    results["steps_tested"]["第二步-税计算显示"] = "✅"
                else:
                    print("   ⚠️  税计算显示不可见")
            else:
                print("   ❌ Invoice复选框不可见")
                results["gaps"].append("Invoice复选框不可见")
            
            # 点击下一步进入第三步
            print("\n📋 尝试进入第三步...")
            if await next_button.is_visible():
                try:
                    await next_button.click()
                    await page.wait_for_timeout(2000)
                    await page.screenshot(path=TEST_RESULTS_DIR / "04-step3.png")
                    print("   ✅ 成功进入第三步")
                    results["steps_tested"]["导航-进入第三步"] = "✅"
                except Exception as e:
                    print(f"   ⚠️  无法点击下一步: {str(e)[:50]}")
            
            # 测试第三步：文件上传
            print("\n📋 测试第三步：文件上传...")
            
            file_input = page.locator('input[type="file"]').first
            if await file_input.is_visible():
                print("   ✅ 文件上传输入可见")
                results["steps_tested"]["第三步-文件上传"] = "✅"
                
                # 检查非必填提示
                optional_note = page.locator('text=/非必填|optional|可以不传/i').first
                if await optional_note.is_visible():
                    print("   ✅ 非必填提示可见")
                    results["steps_tested"]["第三步-非必填提示"] = "✅"
                else:
                    print("   ⚠️  非必填提示不可见")
            else:
                print("   ❌ 文件上传输入不可见")
                results["gaps"].append("文件上传功能不可见")
            
            # 检查提交按钮
            submit_button = page.locator('button[type="submit"], button:has-text("提交"), button:has-text("Submit")').first
            if await submit_button.is_visible():
                print("   ✅ 提交按钮可见")
                results["steps_tested"]["第三步-提交按钮"] = "✅"
            else:
                print("   ❌ 提交按钮不可见")
            
            # 检查草稿保存
            save_draft = page.locator('button:has-text("保存草稿"), button:has-text("Save Draft")').first
            if await save_draft.is_visible():
                print("   ✅ 草稿保存按钮可见")
                results["requirements_met"]["草稿保存功能"] = "✅"
            
            # 检查语言切换
            en_btn = page.locator('button:has-text("EN")').first
            zh_btn = page.locator('button:has-text("中文")').first
            if await en_btn.is_visible() and await zh_btn.is_visible():
                print("   ✅ 语言切换按钮可见")
                results["requirements_met"]["中英文双语"] = "✅"
            
            # 最终截图
            await page.screenshot(path=TEST_RESULTS_DIR / "05-final-state.png")
            
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"\n❌ 测试错误: {str(e)}")
            results["error"] = str(e)
            results["error_trace"] = error_trace
            await page.screenshot(path=TEST_RESULTS_DIR / "error.png")
        
        finally:
            await browser.close()
    
    # 生成报告
    generate_gap_analysis(results)
    
    # 保存结果
    results_file = TEST_RESULTS_DIR / f"complete-test-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
    with open(results_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    generate_markdown_report(results, results_file)
    
    return results

def generate_gap_analysis(results):
    """生成差距分析"""
    prd_v2_requirements = {
        "3步流程": "产品选择 → 客户信息和Invoice → 文件上传",
        "第一步功能": ["多产品定制", "产品变体配置", "价格计算"],
        "第二步功能": ["客户信息", "Invoice功能", "税计算(13% HST)", "支付信息"],
        "第三步功能": ["文件上传", "非必填提示"],
        "其他功能": ["订单编号", "草稿保存", "语言切换"]
    }
    
    gaps = []
    
    # 检查步骤流程
    steps_tested = list(results["steps_tested"].keys())
    if "导航-进入第二步" not in steps_tested:
        gaps.append({
            "功能": "3步流程",
            "问题": "无法从第一步进入第二步",
            "优先级": "高"
        })
    if "导航-进入第三步" not in steps_tested:
        gaps.append({
            "功能": "3步流程",
            "问题": "无法从第二步进入第三步",
            "优先级": "高"
        })
    
    # 检查Invoice功能
    if "第二步-Invoice字段" not in results["steps_tested"]:
        gaps.append({
            "功能": "Invoice功能",
            "问题": "Invoice字段不可见或不完整",
            "优先级": "中"
        })
    
    # 检查支付信息
    if "第二步-填写Invoice信息" not in results["steps_tested"]:
        gaps.append({
            "功能": "支付信息",
            "问题": "支付方式字段可能缺失",
            "优先级": "中"
        })
    
    results["gap_analysis"] = gaps
    results["prd_requirements"] = prd_v2_requirements

def generate_markdown_report(results, results_file):
    """生成Markdown报告"""
    report_file = TEST_RESULTS_DIR / "complete-test-report.md"
    
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write("# 线下订单管理功能 v2.0 完整流程测试报告\n\n")
        f.write(f"**测试时间**: {results['test_time']}\n")
        f.write(f"**生产环境**: {results['production_url']}\n\n")
        
        f.write("## 📊 测试结果概览\n\n")
        f.write("### ✅ 已实现功能\n\n")
        for key, value in results.get("requirements_met", {}).items():
            if "✅" in str(value):
                f.write(f"- **{key}**: {value}\n")
        
        f.write("\n### 📋 步骤测试结果\n\n")
        for key, value in results.get("steps_tested", {}).items():
            f.write(f"- **{key}**: {value}\n")
        
        f.write("\n## 🔍 功能差距分析\n\n")
        if results.get("gap_analysis"):
            for gap in results["gap_analysis"]:
                f.write(f"### {gap['功能']}\n")
                f.write(f"- **问题**: {gap['问题']}\n")
                f.write(f"- **优先级**: {gap['优先级']}\n\n")
        else:
            f.write("✅ 未发现明显功能差距\n\n")
        
        f.write("\n## 📝 PRD v2.0 需求对比\n\n")
        if "prd_requirements" in results:
            for category, reqs in results["prd_requirements"].items():
                f.write(f"### {category}\n")
                if isinstance(reqs, list):
                    for req in reqs:
                        f.write(f"- {req}\n")
                else:
                    f.write(f"- {reqs}\n")
                f.write("\n")
        
        f.write(f"\n## 📄 详细数据\n\n")
        f.write(f"完整测试数据: `{results_file.name}`\n")
    
    print(f"\n✅ 完整测试报告已生成: {report_file}")

if __name__ == "__main__":
    print("🚀 开始完整流程测试...\n")
    results = asyncio.run(test_complete_flow())
    print("\n✅ 测试完成！")
    print(f"📊 查看报告: test-results/offline-orders-v2-complete/complete-test-report.md")

