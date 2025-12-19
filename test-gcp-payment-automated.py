#!/usr/bin/env python3
"""
GCP 生产环境 Stripe 支付自动化测试流程
[2025-01-30 17:00:00] 完整的自动化测试，包括测试执行、验证和报告生成
"""
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
import time
import sys
import json
import os
from datetime import datetime
from pathlib import Path

# GCP 生产环境配置
GCP_FRONTEND_URL = 'https://print-main-frontend-234065158862.us-central1.run.app'
GCP_BACKEND_URL = 'https://print-main-backend-234065158862.us-central1.run.app'
GCP_API_URL = f'{GCP_BACKEND_URL}/api'

# Stripe 测试卡号配置
STRIPE_TEST_CARDS = {
    'success': {
        'number': '4242424242424242',
        'expiry': '12/34',
        'cvc': '123',
        'zip': '12345',
        'description': '成功支付 - Visa 测试卡'
    },
    '3d_secure': {
        'number': '4000002500003155',
        'expiry': '12/34',
        'cvc': '123',
        'zip': '12345',
        'description': '需要 3D Secure 验证'
    }
}

# 测试结果目录
TEST_RESULTS_DIR = Path('test-results/gcp-payment-test')
TEST_RESULTS_DIR.mkdir(parents=True, exist_ok=True)

def log(message, level='INFO', file=None):
    """记录日志"""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    log_message = f"[{timestamp}] [{level}] {message}"
    print(log_message)
    if file:
        file.write(log_message + '\n')
        file.flush()

def wait_for_stripe_load(page, timeout=20000):
    """等待 Stripe 加载完成"""
    try:
        page.wait_for_function(
            'typeof window.Stripe !== "undefined" || document.querySelector("iframe[src*=\'stripe\']")',
            timeout=timeout
        )
        return True
    except PlaywrightTimeoutError:
        return False

def fill_stripe_card(page, card_info):
    """填写 Stripe 卡片信息"""
    try:
        card_frame = page.frame_locator('iframe').first()
        
        # 填写卡号
        card_number_input = card_frame.locator('input[name="cardnumber"], input[placeholder*="Card number" i]').first()
        if card_number_input.count > 0:
            card_number_input.fill(card_info['number'])
            time.sleep(1)
        
        # 填写过期日期
        exp_input = card_frame.locator('input[name="exp-date"], input[placeholder*="MM / YY" i]').first()
        if exp_input.count > 0:
            exp_input.fill(card_info['expiry'])
            time.sleep(1)
        
        # 填写 CVC
        cvc_input = card_frame.locator('input[name="cvc"], input[placeholder*="CVC" i]').first()
        if cvc_input.count > 0:
            cvc_input.fill(card_info['cvc'])
            time.sleep(1)
        
        time.sleep(3)
        return True
    except Exception:
        return False

def test_payment_flow(page, card_type, log_file):
    """执行支付流程测试"""
    log(f"开始测试: {card_type}", file=log_file)
    
    card_info = STRIPE_TEST_CARDS[card_type]
    results = {
        'card_type': card_type,
        'card_description': card_info['description'],
        'steps': {},
        'order_number': None,
        'payment_intent_id': None,
        'success': False,
        'errors': [],
        'screenshots': []
    }
    
    try:
        # 步骤1: 添加商品到购物车
        log("步骤1: 添加商品到购物车", file=log_file)
        page.goto(GCP_FRONTEND_URL, wait_until='networkidle', timeout=30000)
        time.sleep(5)  # 增加等待时间
        
        # 尝试多种方式查找商品链接
        product_links = []
        selectors = [
            'a[href*="/products/"]',
            'a[href^="/products/"]',
            '[data-testid="product-link"]',
            '.product-card a',
            'article a',
            'a[href*="product"]'
        ]
        
        for selector in selectors:
            try:
                links = page.locator(selector).all()
                if links:
                    product_links = links
                    log(f"使用选择器找到商品: {selector}", file=log_file)
                    break
            except:
                continue
        
        if not product_links:
            # 尝试直接访问已知的商品页面
            log("未找到商品链接，尝试直接访问商品页面", file=log_file)
            # 先尝试访问商品列表页
            page.goto(f'{GCP_FRONTEND_URL}/products', wait_until='networkidle', timeout=30000)
            time.sleep(5)
            
            # 再次尝试查找
            for selector in selectors:
                try:
                    links = page.locator(selector).all()
                    if links:
                        product_links = links
                        log(f"在商品列表页找到商品: {selector}", file=log_file)
                        break
                except:
                    continue
        
        if not product_links:
            results['errors'].append('未找到商品链接')
            # 保存截图以便调试
            screenshot_path = TEST_RESULTS_DIR / f'error-no-products-{int(time.time())}.png'
            page.screenshot(path=str(screenshot_path), full_page=True)
            results['screenshots'].append(str(screenshot_path))
            return results
        
        product_url = product_links[0].get_attribute('href')
        if not product_url:
            results['errors'].append('商品链接为空')
            return results
        
        if not product_url.startswith('http'):
            product_url = f'{GCP_FRONTEND_URL}{product_url}'
        
        log(f"访问商品详情页: {product_url}", file=log_file)
        
        # 访问商品详情页，确保是详情页而不是列表页
        page.goto(product_url, wait_until='networkidle', timeout=30000)
        time.sleep(3)
        
        # 验证是否在商品详情页（不是列表页）
        current_url = page.url
        if '/products' in current_url and current_url.count('/products') == 1:
            # 可能是列表页，尝试从 URL 中提取商品 slug
            log("检测到可能是商品列表页，尝试访问第一个商品详情", file=log_file)
            # 重新查找商品链接，这次确保是详情页链接
            product_detail_links = page.locator('a[href^="/products/"]:not([href="/products"]):not([href*="?"])').all()
            if product_detail_links:
                detail_url = product_detail_links[0].get_attribute('href')
                if detail_url and not detail_url.startswith('http'):
                    detail_url = f'{GCP_FRONTEND_URL}{detail_url}'
                log(f"访问商品详情页: {detail_url}", file=log_file)
                page.goto(detail_url, wait_until='networkidle', timeout=30000)
                time.sleep(3)
            else:
                results['errors'].append('无法找到商品详情页链接')
                return results
        
        # 等待页面关键元素加载
        log("等待商品页面加载...", file=log_file)
        try:
            # 等待商品详情内容出现
            page.wait_for_selector('button, [class*="product"], [class*="variant"]', timeout=15000)
        except:
            pass
        
        time.sleep(2)
        
        # 选择变体 - 改进逻辑，确保选择成功
        log("选择商品变体...", file=log_file)
        variant_selected = False
        
        # 选择颜色
        try:
            color_selectors = [
                'button[class*="color"]',
                '[class*="color"] button',
                '[data-testid*="color"]',
                '[aria-label*="color" i]',
                'button:has-text("color" i)'
            ]
            for selector in color_selectors:
                try:
                    color_btns = page.locator(selector).all()
                    if color_btns:
                        # 选择第一个可用的颜色按钮
                        for btn in color_btns[:3]:  # 只检查前3个
                            try:
                                if btn.is_visible():
                                    btn.click()
                                    log(f"✅ 已选择颜色: {selector}", file=log_file)
                                    variant_selected = True
                                    time.sleep(1.5)  # 等待状态更新
                                    break
                            except:
                                continue
                        if variant_selected:
                            break
                except:
                    continue
        except Exception as e:
            log(f"选择颜色时出错: {e}", file=log_file)
        
        # 选择尺寸
        try:
            size_selectors = [
                'button[class*="size"]',
                '[class*="size"] button',
                '[data-testid*="size"]',
                '[aria-label*="size" i]',
                'button:has-text("size" i)'
            ]
            for selector in size_selectors:
                try:
                    size_btns = page.locator(selector).all()
                    if size_btns:
                        # 选择第一个可用的尺寸按钮
                        for btn in size_btns[:3]:  # 只检查前3个
                            try:
                                if btn.is_visible():
                                    btn.click()
                                    log(f"✅ 已选择尺寸: {selector}", file=log_file)
                                    variant_selected = True
                                    time.sleep(1.5)  # 等待状态更新
                                    break
                            except:
                                continue
                        if variant_selected:
                            break
                except:
                    continue
        except Exception as e:
            log(f"选择尺寸时出错: {e}", file=log_file)
        
        # 等待页面状态更新
        time.sleep(3)
        
        # 添加到购物车 - 修复选择器大小写问题
        log("查找添加购物车按钮...", file=log_file)
        add_button = None
        add_button_selectors = [
            'button:has-text("Add to cart")',  # 修复：小写 c
            'button:has-text("add to cart")',  # 全小写
            'button:has-text("加入购物车")',
            'button:has-text("添加到购物车")',
            'button[class*="add-to-cart"]',
            'button[class*="addToCart"]',
            '[data-testid="add-to-cart"]',
            'button:has-text("Cart")',
            'button:has-text("Add")'
        ]
        
        # 使用 wait_for_selector 等待按钮出现
        button_found = False
        for selector in add_button_selectors:
            try:
                # 等待按钮出现且可见
                page.wait_for_selector(selector, timeout=5000, state='visible')
                btn = page.locator(selector).first()
                if btn.count > 0:
                    # 检查按钮是否可用（未禁用）
                    try:
                        is_disabled = btn.is_disabled()
                        is_visible = btn.is_visible()
                        if not is_disabled and is_visible:
                            add_button = btn
                            log(f"✅ 找到添加购物车按钮: {selector}", file=log_file)
                            button_found = True
                            break
                        elif is_disabled:
                            log(f"⚠️ 按钮存在但被禁用: {selector}，等待...", file=log_file)
                            # 等待按钮变为可用
                            try:
                                page.wait_for_selector(f'{selector}:not([disabled])', timeout=5000)
                                add_button = page.locator(selector).first()
                                if not add_button.is_disabled():
                                    log(f"✅ 按钮已变为可用: {selector}", file=log_file)
                                    button_found = True
                                    break
                            except:
                                pass
                    except Exception as e:
                        # 如果检查失败，尝试直接使用
                        try:
                            if btn.is_visible():
                                add_button = btn
                                log(f"✅ 找到添加购物车按钮（无法检查禁用状态）: {selector}", file=log_file)
                                button_found = True
                                break
                        except:
                            pass
            except PlaywrightTimeoutError:
                continue
            except Exception as e:
                log(f"查找按钮时出错 ({selector}): {e}", file=log_file)
                continue
        
        if not add_button or not button_found:
            results['errors'].append('未找到添加购物车按钮')
            screenshot_path = TEST_RESULTS_DIR / f'error-no-add-button-{int(time.time())}.png'
            page.screenshot(path=str(screenshot_path), full_page=True)
            results['screenshots'].append(str(screenshot_path))
            log("❌ 未找到添加购物车按钮，已保存截图", file=log_file)
            # 保存页面 HTML 以便调试
            try:
                html_path = TEST_RESULTS_DIR / f'error-page-html-{int(time.time())}.html'
                with open(html_path, 'w', encoding='utf-8') as f:
                    f.write(page.content())
                log(f"已保存页面 HTML: {html_path}", file=log_file)
            except:
                pass
            return results
        
        with page.expect_response(
            lambda response: '/api/cart/items' in response.url and response.request.method == 'POST',
            timeout=15000
        ) as response_info:
            add_button.click()
        
        response = response_info.value
        if response.status not in [200, 201]:
            results['errors'].append(f'添加购物车失败: {response.status}')
            return results
        
        results['steps']['add_to_cart'] = True
        log("✅ 商品已添加到购物车", file=log_file)
        time.sleep(2)
        
        # 步骤2: 访问结账页面
        log("步骤2: 访问结账页面", file=log_file)
        page.goto(f'{GCP_FRONTEND_URL}/checkout', wait_until='networkidle', timeout=30000)
        time.sleep(5)
        
        results['steps']['checkout_page'] = True
        log("✅ 结账页面已加载", file=log_file)
        
        # 步骤3: 填写地址信息
        log("步骤3: 填写地址信息", file=log_file)
        test_email = f'test+{int(time.time())}@example.com'
        
        page.fill('input[name="fullName"], input[id="fullName"]', 'Test User')
        page.fill('input[name="email"], input[id="email"], input[type="email"]', test_email)
        page.fill('input[name="phone"], input[id="phone"]', '4165550100')
        page.fill('input[name="addressLine1"], input[id="addressLine1"]', '123 Test Street')
        page.fill('input[name="city"], input[id="city"]', 'Toronto')
        page.fill('input[name="postalCode"], input[id="postalCode"]', 'M5H 2N2')
        
        province_select = page.locator('select[name="province"], select[name="state"]').first()
        if province_select.count > 0:
            try:
                province_select.select_option(label='Ontario')
            except:
                try:
                    province_select.select_option(value='ON')
                except:
                    pass
        
        country_select = page.locator('select[name="country"]').first()
        if country_select.count > 0:
            try:
                country_select.select_option(label='Canada')
            except:
                try:
                    country_select.select_option(value='CA')
                except:
                    pass
        
        results['steps']['address_filled'] = True
        log("✅ 地址信息已填写", file=log_file)
        time.sleep(2)
        
        # 步骤4: 等待运费计算
        log("步骤4: 等待运费计算", file=log_file)
        try:
            page.wait_for_response(
                lambda response: '/api/checkout/shipping-rates' in response.url,
                timeout=20000
            )
        except PlaywrightTimeoutError:
            pass
        
        time.sleep(2)
        
        shipping_input = page.locator('input[type="radio"][name*="shipping"]').first()
        if shipping_input.count > 0:
            shipping_input.click()
            results['steps']['shipping_selected'] = True
            log("✅ 已选择运费方式", file=log_file)
            time.sleep(2)
        
        # 步骤5: 等待 Stripe 加载
        log("步骤5: 等待 Stripe 加载", file=log_file)
        if wait_for_stripe_load(page):
            results['steps']['stripe_loaded'] = True
            log("✅ Stripe 已加载", file=log_file)
        
        # 步骤6: 填写卡片信息
        log("步骤6: 填写 Stripe 卡片信息", file=log_file)
        if fill_stripe_card(page, card_info):
            results['steps']['card_filled'] = True
            log("✅ 卡片信息已填写", file=log_file)
        else:
            results['errors'].append('填写卡片信息失败')
        
        # 步骤7: 提交支付
        log("步骤7: 提交支付", file=log_file)
        place_order_button = None
        place_order_selectors = [
            'button:has-text("Place Order")',
            'button:has-text("下单")',
            'button:has-text("支付")',
            'button[type="submit"]'
        ]
        for selector in place_order_selectors:
            try:
                btn = page.locator(selector).first()
                if btn.count > 0:
                    place_order_button = btn
                    break
            except:
                continue
        
        if not place_order_button or place_order_button.count == 0:
            results['errors'].append('未找到 Place Order 按钮')
            screenshot_path = TEST_RESULTS_DIR / f'error-no-place-order-{int(time.time())}.png'
            page.screenshot(path=str(screenshot_path), full_page=True)
            results['screenshots'].append(str(screenshot_path))
            return results
        
        if place_order_button.is_disabled():
            time.sleep(5)
            if place_order_button.is_disabled():
                results['errors'].append('Place Order 按钮被禁用')
                screenshot_path = TEST_RESULTS_DIR / f'error-button-disabled-{int(time.time())}.png'
                page.screenshot(path=str(screenshot_path), full_page=True)
                results['screenshots'].append(str(screenshot_path))
                return results
        
        # 监听支付响应
        payment_responses = []
        def handle_response(response):
            url = response.url
            if '/api/checkout/create-payment-intent' in url:
                payment_responses.append(('create_intent', response))
            elif '/api/checkout/confirm' in url:
                payment_responses.append(('confirm', response))
        
        page.on('response', handle_response)
        
        place_order_button.click()
        results['steps']['payment_submitted'] = True
        log("✅ 已提交支付", file=log_file)
        
        # 等待支付处理
        time.sleep(5)
        
        # 检查 3D Secure
        if '3d_secure' in page.url.lower():
            log("检测到 3D Secure，等待处理...", file=log_file)
            time.sleep(5)
        
        # 等待成功页面
        max_wait = 40
        waited = 0
        while waited < max_wait:
            if '/checkout/success' in page.url or '/order/success' in page.url:
                results['steps']['payment_success'] = True
                log("✅ 支付成功！", file=log_file)
                break
            
            time.sleep(1)
            waited += 1
        
        # 提取订单号
        if results['steps'].get('payment_success'):
            if '/checkout/success' in page.url:
                try:
                    url_params = page.url.split('?')[1] if '?' in page.url else ''
                    if 'orderNumber' in url_params:
                        order_number = url_params.split('orderNumber=')[1].split('&')[0]
                        results['order_number'] = order_number
                        log(f"✅ 订单号: {order_number}", file=log_file)
                except:
                    pass
        
        # 保存截图
        screenshot_path = TEST_RESULTS_DIR / f'payment-{card_type}-{int(time.time())}.png'
        page.screenshot(path=str(screenshot_path), full_page=True)
        results['screenshots'].append(str(screenshot_path))
        
        # 提取 PaymentIntent ID
        for resp_type, resp in payment_responses:
            if resp_type == 'create_intent':
                try:
                    body = resp.json()
                    if 'paymentIntentId' in body:
                        results['payment_intent_id'] = body['paymentIntentId']
                except:
                    pass
        
        results['success'] = all([
            results['steps'].get('add_to_cart'),
            results['steps'].get('checkout_page'),
            results['steps'].get('address_filled'),
            results['steps'].get('shipping_selected'),
            results['steps'].get('card_filled'),
            results['steps'].get('payment_submitted'),
            results['steps'].get('payment_success')
        ])
        
    except Exception as e:
        results['errors'].append(f'测试异常: {str(e)}')
        import traceback
        log(f"❌ 测试异常: {traceback.format_exc()}", file=log_file)
    
    return results

def generate_report(all_results):
    """生成测试报告"""
    report_path = TEST_RESULTS_DIR / 'test-report.json'
    html_report_path = TEST_RESULTS_DIR / 'test-report.html'
    
    # 保存 JSON 报告
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(all_results, f, indent=2, ensure_ascii=False)
    
    # 生成 HTML 报告
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>GCP 生产环境 Stripe 支付测试报告</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }}
        .container {{ max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }}
        h1 {{ color: #333; }}
        .test-case {{ margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }}
        .success {{ background: #d4edda; border-color: #c3e6cb; }}
        .failure {{ background: #f8d7da; border-color: #f5c6cb; }}
        .step {{ margin: 5px 0; padding: 5px; }}
        .step-success {{ color: #28a745; }}
        .step-failure {{ color: #dc3545; }}
        .error {{ color: #dc3545; margin: 10px 0; padding: 10px; background: #fff; border-left: 3px solid #dc3545; }}
        .info {{ margin: 10px 0; padding: 10px; background: #e7f3ff; border-left: 3px solid #2196F3; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>GCP 生产环境 Stripe 支付测试报告</h1>
        <div class="info">
            <strong>测试时间:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}<br>
            <strong>前端 URL:</strong> {GCP_FRONTEND_URL}<br>
            <strong>后端 URL:</strong> {GCP_BACKEND_URL}
        </div>
"""
    
    for result in all_results:
        status_class = 'success' if result['success'] else 'failure'
        html_content += f"""
        <div class="test-case {status_class}">
            <h2>测试: {result['card_type']} - {result['card_description']}</h2>
            <p><strong>状态:</strong> {'✅ 通过' if result['success'] else '❌ 失败'}</p>
"""
        
        if result['order_number']:
            html_content += f"<p><strong>订单号:</strong> {result['order_number']}</p>"
        
        if result['payment_intent_id']:
            html_content += f"<p><strong>PaymentIntent ID:</strong> {result['payment_intent_id']}</p>"
        
        html_content += "<h3>测试步骤:</h3><ul>"
        for step, passed in result['steps'].items():
            step_class = 'step-success' if passed else 'step-failure'
            status_icon = '✅' if passed else '❌'
            html_content += f'<li class="step {step_class}">{status_icon} {step}</li>'
        html_content += "</ul>"
        
        if result['errors']:
            html_content += "<h3>错误:</h3>"
            for error in result['errors']:
                html_content += f'<div class="error">{error}</div>'
        
        if result['screenshots']:
            html_content += "<h3>截图:</h3>"
            for screenshot in result['screenshots']:
                html_content += f'<p><a href="{screenshot}" target="_blank">{screenshot}</a></p>'
        
        html_content += "</div>"
    
    html_content += """
    </div>
</body>
</html>
"""
    
    with open(html_report_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    return str(report_path), str(html_report_path)

def main():
    """主测试流程"""
    log_file_path = TEST_RESULTS_DIR / 'test.log'
    log_file = open(log_file_path, 'w', encoding='utf-8')
    
    log("="*80, file=log_file)
    log("GCP 生产环境 Stripe 支付自动化测试", file=log_file)
    log("="*80, file=log_file)
    log(f"前端 URL: {GCP_FRONTEND_URL}", file=log_file)
    log(f"后端 URL: {GCP_BACKEND_URL}", file=log_file)
    log("="*80, file=log_file)
    
    all_results = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=300)
        context = browser.new_context(
            viewport={'width': 1280, 'height': 720}
        )
        page = context.new_page()
        
        try:
            # 测试成功支付
            log("\n开始测试: 成功支付", file=log_file)
            result1 = test_payment_flow(page, 'success', log_file)
            all_results.append(result1)
            
            # 等待一段时间再测试下一个
            time.sleep(5)
            
            # 测试 3D Secure
            log("\n开始测试: 3D Secure", file=log_file)
            result2 = test_payment_flow(page, '3d_secure', log_file)
            all_results.append(result2)
            
        except KeyboardInterrupt:
            log("测试被用户中断", 'WARN', log_file)
        except Exception as e:
            log(f"测试执行异常: {e}", 'ERROR', log_file)
            import traceback
            traceback.print_exc()
        finally:
            browser.close()
            log_file.close()
    
    # 生成报告
    log("\n生成测试报告...", file=None)
    json_report, html_report = generate_report(all_results)
    
    # 打印总结
    print("\n" + "="*80)
    print("📊 测试总结")
    print("="*80)
    for result in all_results:
        status = "✅ 通过" if result['success'] else "❌ 失败"
        print(f"{result['card_type']}: {status}")
        if result['order_number']:
            print(f"  订单号: {result['order_number']}")
    
    print(f"\n📄 详细报告:")
    print(f"  JSON: {json_report}")
    print(f"  HTML: {html_report}")
    print(f"  日志: {log_file_path}")
    print("="*80)
    
    # 返回退出码
    all_passed = all(r['success'] for r in all_results)
    return 0 if all_passed else 1

if __name__ == '__main__':
    sys.exit(main())

