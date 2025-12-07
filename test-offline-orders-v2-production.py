#!/usr/bin/env python3
"""
线下订单管理功能 v2.0 生产环境测试
[2025-12-07 01:35:00] 使用 Playwright 测试生产环境并对比 PRD v2.0 需求
"""
import asyncio
import json
from datetime import datetime
from pathlib import Path
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError

# 生产环境配置
PRODUCTION_URL = "https://print-main-frontend-234065158862.us-central1.run.app"
TEST_RESULTS_DIR = Path("test-results/offline-orders-v2")
TEST_RESULTS_DIR.mkdir(parents=True, exist_ok=True)

# PRD v2.0 需求清单
PRD_V2_REQUIREMENTS = {
    "流程步骤": {
        "要求": "3步流程（产品选择、客户信息和Invoice、文件上传）",
        "状态": "待验证"
    },
    "第一步：产品选择": {
        "多产品定制": "支持添加多个产品分类",
        "产品变体": "支持尺码、颜色、数量、单价配置",
        "价格计算": "自动计算小计和总计",
        "状态": "待验证"
    },
    "第二步：客户信息和Invoice": {
        "客户信息": "联系人姓名、邮箱、电话、公司、交付日期",
        "Invoice功能": "可选，包含公司信息、税号、地址等",
        "税计算": "13% HST（仅当选择Invoice时）",
        "支付信息": "支付方式（card/etrans）和Reference Number",
        "状态": "待验证"
    },
    "第三步：文件上传": {
        "文件上传": "支持拖拽上传",
        "移动端拍照": "支持移动设备拍照上传",
        "非必填": "可以不传文件直接提交",
        "状态": "待验证"
    },
    "其他功能": {
        "订单编号": "自动生成订单编号（OFF-YYYYMMDD-XXXX）",
        "草稿保存": "支持保存草稿到localStorage",
        "中英文双语": "支持语言切换",
        "状态": "待验证"
    }
}

async def test_offline_orders_v2():
    """测试线下订单管理功能 v2.0"""
    results = {
        "test_time": datetime.now().isoformat(),
        "production_url": PRODUCTION_URL,
        "requirements": PRD_V2_REQUIREMENTS,
        "test_results": {},
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
            # 1. 访问线下订单页面
            print("📋 步骤 1: 访问线下订单页面...")
            await page.goto(f"{PRODUCTION_URL}/offline-orders", wait_until="networkidle")
            await page.wait_for_timeout(2000)
            await page.screenshot(path=TEST_RESULTS_DIR / "01-page-loaded.png")
            
            # 检查页面标题和基本元素
            page_title = await page.title()
            print(f"   页面标题: {page_title}")
            
            # 检查语言切换按钮
            en_button = page.locator('button:has-text("EN")')
            zh_button = page.locator('button:has-text("中文")')
            has_lang_switch = await en_button.is_visible() and await zh_button.is_visible()
            results["test_results"]["语言切换"] = "✅ 通过" if has_lang_switch else "❌ 失败"
            print(f"   语言切换: {'✅' if has_lang_switch else '❌'}")
            
            # 检查订单编号显示
            order_code_element = page.locator('text=/OFF-[0-9]{8}-[A-Z0-9]{4}/')
            has_order_code = await order_code_element.is_visible()
            results["test_results"]["订单编号生成"] = "✅ 通过" if has_order_code else "❌ 失败"
            if has_order_code:
                order_code = await order_code_element.text_content()
                print(f"   订单编号: {order_code}")
            
            # 2. 验证步骤导航（应该是3步）
            print("\n📋 步骤 2: 验证步骤导航...")
            step_elements = page.locator('[class*="step"], [data-step]')
            step_count = await step_elements.count()
            
            # 尝试通过步骤标题数量来判断
            step_headings = page.locator('h2, [class*="step"]')
            step_headings_count = await step_headings.count()
            step_headings_text = []
            for i in range(min(step_headings_count, 10)):
                try:
                    heading = step_headings.nth(i)
                    text = await heading.text_content()
                    if text and ("步骤" in text or "Step" in text or "产品" in text or "客户" in text or "文件" in text):
                        step_headings_text.append(text.strip())
                except:
                    break
            
            print(f"   检测到的步骤数: {len(step_headings_text)}")
            print(f"   步骤标题: {step_headings_text[:3]}")
            
            is_3_steps = len(step_headings_text) >= 3
            results["test_results"]["3步流程"] = "✅ 通过" if is_3_steps else "❌ 失败"
            if not is_3_steps:
                results["gaps"].append("步骤数量不符合PRD v2.0要求（应为3步）")
            
            # 3. 测试第一步：产品选择
            print("\n📋 步骤 3: 测试第一步 - 产品选择...")
            await page.screenshot(path=TEST_RESULTS_DIR / "02-step1-product-selection.png")
            
            # 检查产品分类选择器
            category_select = page.locator('select').first
            has_category_select = await category_select.is_visible()
            results["test_results"]["产品分类选择"] = "✅ 通过" if has_category_select else "❌ 失败"
            
            if has_category_select:
                # 检查是否有可用的产品分类
                options_locator = category_select.locator('option')
                options_count = await options_locator.count()
                available_options = []
                for i in range(options_count):
                    try:
                        opt = options_locator.nth(i)
                        text = await opt.text_content()
                        if text and "暂无" not in text and "Loading" not in text and text.strip():
                            available_options.append(text.strip())
                    except:
                        break
                
                print(f"   可用产品分类: {len(available_options)}")
                if len(available_options) > 0:
                    print(f"   分类列表: {available_options[:3]}")
                    results["test_results"]["产品分类可用"] = f"✅ 通过 ({len(available_options)}个分类)"
                else:
                    results["test_results"]["产品分类可用"] = "⚠️ 警告（无可用分类）"
                    results["gaps"].append("没有可用的产品分类，无法测试完整流程")
            
            # 检查产品变体表格（可能还没有添加产品，所以表格可能不存在）
            try:
                variant_table = page.locator('table').first
                has_variant_table = await variant_table.is_visible()
                results["test_results"]["产品变体表格"] = "✅ 通过" if has_variant_table else "⚠️ 未添加产品时不可见（正常）"
            except Exception as e:
                results["test_results"]["产品变体表格"] = f"⚠️ 检查失败: {str(e)[:50]}"
            
            # 检查价格计算显示
            total_element = page.locator('text=/总计|Total|CAD/').first
            has_total = await total_element.is_visible()
            results["test_results"]["价格计算显示"] = "✅ 通过" if has_total else "❌ 失败"
            
            # 4. 测试第二步：客户信息和Invoice
            print("\n📋 步骤 4: 测试第二步 - 客户信息和Invoice...")
            
            # 尝试点击下一步（如果第一步有内容）
            next_button = page.locator('button:has-text("下一步"), button:has-text("Next")').first
            if await next_button.is_visible():
                try:
                    await next_button.click()
                    await page.wait_for_timeout(1000)
                    await page.screenshot(path=TEST_RESULTS_DIR / "03-step2-customer-info.png")
                except:
                    print("   无法点击下一步（可能需要先添加产品）")
            
            # 检查客户信息字段
            contact_name = page.locator('input[name*="contactName"], input[name*="contact"]').first
            email_input = page.locator('input[type="email"]').first
            phone_input = page.locator('input[type="tel"]').first
            due_date = page.locator('input[type="date"]').first
            
            has_contact_fields = (
                await contact_name.is_visible() and
                await email_input.is_visible() and
                await phone_input.is_visible() and
                await due_date.is_visible()
            )
            results["test_results"]["客户信息字段"] = "✅ 通过" if has_contact_fields else "❌ 失败"
            
            # 检查Invoice功能
            invoice_checkbox = page.locator('input[type="checkbox"][name*="invoice"]').first
            has_invoice_checkbox = await invoice_checkbox.is_visible()
            results["test_results"]["Invoice复选框"] = "✅ 通过" if has_invoice_checkbox else "❌ 失败"
            
            if has_invoice_checkbox:
                # 勾选Invoice复选框
                await invoice_checkbox.check()
                await page.wait_for_timeout(500)
                await page.screenshot(path=TEST_RESULTS_DIR / "04-invoice-expanded.png")
                
                # 检查Invoice字段
                company_name = page.locator('input[name*="companyName"]').first
                tax_number = page.locator('input[name*="taxNumber"], input[name*="tax"]').first
                payment_method = page.locator('select[name*="paymentMethod"]').first
                
                has_invoice_fields = (
                    await company_name.is_visible() and
                    await tax_number.is_visible()
                )
                results["test_results"]["Invoice字段"] = "✅ 通过" if has_invoice_fields else "❌ 失败"
                
                has_payment_info = await payment_method.is_visible()
                results["test_results"]["支付信息字段"] = "✅ 通过" if has_payment_info else "❌ 失败"
                
                # 检查税计算显示
                tax_display = page.locator('text=/税|Tax|HST|13%/').first
                has_tax_display = await tax_display.is_visible()
                results["test_results"]["税计算显示"] = "✅ 通过" if has_tax_display else "❌ 失败"
            
            # 5. 测试第三步：文件上传
            print("\n📋 步骤 5: 测试第三步 - 文件上传...")
            
            # 尝试点击下一步到第三步
            if await next_button.is_visible():
                try:
                    await next_button.click()
                    await page.wait_for_timeout(1000)
                    await page.screenshot(path=TEST_RESULTS_DIR / "05-step3-file-upload.png")
                except:
                    print("   无法点击下一步到第三步")
            
            # 检查文件上传区域
            file_upload = page.locator('input[type="file"]').first
            has_file_upload = await file_upload.is_visible()
            results["test_results"]["文件上传"] = "✅ 通过" if has_file_upload else "❌ 失败"
            
            # 检查非必填提示
            optional_note = page.locator('text=/非必填|optional|可以不传/i').first
            has_optional_note = await optional_note.is_visible()
            results["test_results"]["非必填提示"] = "✅ 通过" if has_optional_note else "❌ 失败"
            
            # 6. 测试草稿保存功能
            print("\n📋 步骤 6: 测试草稿保存功能...")
            save_draft_button = page.locator('button:has-text("保存草稿"), button:has-text("Save Draft")').first
            has_save_draft = await save_draft_button.is_visible()
            results["test_results"]["草稿保存按钮"] = "✅ 通过" if has_save_draft else "❌ 失败"
            
            # 7. 检查控制台错误
            print("\n📋 步骤 7: 检查控制台错误...")
            console_errors = []
            
            def handle_console(msg):
                if msg.type == "error":
                    console_errors.append({
                        "type": msg.type,
                        "text": msg.text
                    })
            
            page.on("console", handle_console)
            
            await page.wait_for_timeout(2000)
            error_count = len(console_errors)
            results["test_results"]["控制台错误"] = f"✅ 通过 ({error_count}个错误)" if error_count == 0 else f"⚠️ 警告 ({error_count}个错误)"
            if error_count > 0:
                print(f"   发现 {error_count} 个控制台错误:")
                for err in console_errors[:5]:
                    print(f"     - {err['text'][:100]}")
            
            # 8. 生成差距分析
            print("\n📊 生成差距分析...")
            gaps_analysis = analyze_gaps(results)
            results["gaps_analysis"] = gaps_analysis
            
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"\n❌ 测试过程中发生错误: {str(e)}")
            print(f"错误详情:\n{error_trace}")
            results["error"] = str(e)
            results["error_trace"] = error_trace
            await page.screenshot(path=TEST_RESULTS_DIR / "error.png")
        
        finally:
            await browser.close()
    
    # 保存测试结果
    results_file = TEST_RESULTS_DIR / f"test-results-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
    with open(results_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    # 生成报告
    generate_report(results, results_file)
    
    return results

def analyze_gaps(results):
    """分析功能差距"""
    gaps = []
    
    # 检查步骤数量
    if "3步流程" in results["test_results"]:
        if "❌" in results["test_results"]["3步流程"]:
            gaps.append({
                "功能": "流程步骤",
                "要求": "3步流程（产品选择、客户信息和Invoice、文件上传）",
                "实际": "步骤数量不符合要求",
                "优先级": "高"
            })
    
    # 检查Invoice功能
    if "Invoice字段" in results["test_results"]:
        if "❌" in results["test_results"]["Invoice字段"]:
            gaps.append({
                "功能": "Invoice功能",
                "要求": "包含公司信息、税号、地址、支付方式等完整字段",
                "实际": "Invoice字段不完整",
                "优先级": "中"
            })
    
    # 检查支付信息
    if "支付信息字段" in results["test_results"]:
        if "❌" in results["test_results"]["支付信息字段"]:
            gaps.append({
                "功能": "支付信息",
                "要求": "支付方式（card/etrans）和Reference Number",
                "实际": "支付信息字段缺失",
                "优先级": "中"
            })
    
    return gaps

def generate_report(results, results_file):
    """生成测试报告"""
    report_file = TEST_RESULTS_DIR / "test-report.md"
    
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write("# 线下订单管理功能 v2.0 生产环境测试报告\n\n")
        f.write(f"**测试时间**: {results['test_time']}\n")
        f.write(f"**生产环境**: {results['production_url']}\n\n")
        
        f.write("## 测试结果概览\n\n")
        for key, value in results['test_results'].items():
            f.write(f"- **{key}**: {value}\n")
        
        f.write("\n## 功能差距分析\n\n")
        if results.get('gaps_analysis'):
            for gap in results['gaps_analysis']:
                f.write(f"### {gap['功能']}\n")
                f.write(f"- **要求**: {gap['要求']}\n")
                f.write(f"- **实际**: {gap['实际']}\n")
                f.write(f"- **优先级**: {gap['优先级']}\n\n")
        else:
            f.write("✅ 未发现明显功能差距\n\n")
        
        f.write("\n## PRD v2.0 需求对比\n\n")
        for category, req in results['requirements'].items():
            f.write(f"### {category}\n")
            if isinstance(req, dict):
                for key, value in req.items():
                    if key != "状态":
                        f.write(f"- **{key}**: {value}\n")
            f.write("\n")
        
        f.write(f"\n## 详细测试数据\n\n")
        f.write(f"完整测试数据请查看: `{results_file.name}`\n")
    
    print(f"\n✅ 测试报告已生成: {report_file}")
    print(f"✅ 测试数据已保存: {results_file}")

if __name__ == "__main__":
    print("🚀 开始测试线下订单管理功能 v2.0（生产环境）...\n")
    results = asyncio.run(test_offline_orders_v2())
    print("\n✅ 测试完成！")
    print(f"📊 查看报告: test-results/offline-orders-v2/test-report.md")

