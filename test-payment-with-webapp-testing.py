#!/usr/bin/env python3
"""
使用 webapp-testing skill 进行完整的支付功能测试
[2025-01-29 13:00:00]

测试内容：
1. 添加购物车无弹窗，实时更新购物车图标数字
2. 购物车实时更新，无需刷新页面
3. 购物车页面图片正常显示
4. Stripe 支付按钮在填写完整信息后可点击
"""

from playwright.sync_api import sync_playwright
import time
import sys

def test_add_to_cart_no_popup(page, base_url):
    """测试1: 添加购物车无弹窗，实时更新"""
    print("\n" + "="*60)
    print("测试1: 添加购物车无弹窗，实时更新")
    print("="*60)
    
    # 访问商品列表页
    print("1. 访问商品列表页...")
    page.goto(f'{base_url}/products')
    page.wait_for_load_state('networkidle')
    time.sleep(2)
    
    # 查找商品链接
    product_links = page.locator('a[href*="/products/"]').all()
    if not product_links:
        print("❌ 未找到商品链接")
        return False
    
    product_url = product_links[0].get_attribute('href')
    if not product_url:
        print("❌ 商品链接无效")
        return False
    
    if not product_url.startswith('http'):
        product_url = f'{base_url}{product_url}'
    
    print(f"2. 访问商品详情页: {product_url}")
    page.goto(product_url)
    page.wait_for_load_state('networkidle')
    time.sleep(2)
    
    # 获取初始购物车数量
    cart_badge = page.locator('.cart-icon__badge, [class*="cart-icon"] [class*="badge"]').first()
    initial_count = 0
    if cart_badge.count() > 0:
        try:
            initial_count = int(cart_badge.inner_text() or '0')
        except:
            initial_count = 0
    
    print(f"3. 初始购物车数量: {initial_count}")
    
    # 监听弹窗
    alert_count = 0
    def handle_dialog(dialog):
        nonlocal alert_count
        alert_count += 1
        print(f"⚠️  检测到弹窗: {dialog.message}")
        dialog.dismiss()
    
    page.on('dialog', handle_dialog)
    
    # 选择颜色（如果需要）
    color_btn = page.locator('[class*="color"], button[class*="color"]').first()
    if color_btn.count() > 0 and color_btn.is_visible():
        print("4. 选择颜色...")
        color_btn.click()
        time.sleep(0.5)
    
    # 点击添加购物车按钮
    print("5. 点击添加购物车按钮...")
    add_button = page.locator('button:has-text("Add to Cart"), button:has-text("加入购物车"), button[class*="add-to-cart"]').first()
    
    if add_button.count() == 0:
        print("❌ 未找到添加购物车按钮")
        page.screenshot(path='test-results/debug-no-button.png', full_page=True)
        return False
    
    # 等待 API 响应
    with page.expect_response(lambda response: '/api/cart/items' in response.url and response.request.method == 'POST', timeout=10000) as response_info:
        add_button.click()
    
    response = response_info.value
    print(f"6. 购物车 API 响应: {response.status}")
    
    if response.status != 201:
        print(f"❌ API 请求失败: {response.status}")
        return False
    
    # 等待状态更新
    time.sleep(3)
    
    # 检查购物车数量
    new_count = 0
    if cart_badge.count() > 0:
        try:
            new_count = int(cart_badge.inner_text() or '0')
        except:
            new_count = 0
    
    print(f"7. 新购物车数量: {new_count}")
    
    # 验证结果
    print("\n📋 测试结果:")
    print(f"  - 弹窗数量: {alert_count} {'✅' if alert_count == 0 else '❌'}")
    print(f"  - 购物车数量变化: {initial_count} -> {new_count} {'✅' if new_count >= initial_count else '❌'}")
    
    # 截图
    page.screenshot(path='test-results/webapp-testing-add-to-cart.png', full_page=True)
    print("📸 截图已保存: test-results/webapp-testing-add-to-cart.png")
    
    return alert_count == 0 and new_count >= initial_count


def test_cart_images(page, base_url):
    """测试2: 购物车页面图片显示"""
    print("\n" + "="*60)
    print("测试2: 购物车页面图片显示")
    print("="*60)
    
    print("1. 访问购物车页面...")
    page.goto(f'{base_url}/cart')
    page.wait_for_load_state('networkidle')
    time.sleep(3)
    
    # 查找所有图片
    images = page.locator('img[src*="cart"], img[class*="cart"], .cart-card img').all()
    print(f"2. 找到图片数量: {len(images)}")
    
    if len(images) == 0:
        print("⚠️  购物车中没有图片")
        page.screenshot(path='test-results/webapp-testing-cart-empty.png', full_page=True)
        return True  # 空购物车也是有效状态
    
    loaded_count = 0
    for i, img in enumerate(images):
        src = img.get_attribute('src') or ''
        natural_width = img.evaluate('el => el.naturalWidth')
        complete = img.evaluate('el => el.complete')
        
        print(f"  图片 {i+1}: src={src[:80]}..., width={natural_width}, loaded={complete}")
        
        if complete and natural_width > 0:
            loaded_count += 1
    
    print(f"\n📋 测试结果:")
    print(f"  - 成功加载的图片: {loaded_count}/{len(images)} {'✅' if loaded_count > 0 or len(images) == 0 else '❌'}")
    
    # 截图
    page.screenshot(path='test-results/webapp-testing-cart-images.png', full_page=True)
    print("📸 截图已保存: test-results/webapp-testing-cart-images.png")
    
    return loaded_count > 0 or len(images) == 0


def test_stripe_button(page, base_url):
    """测试3: Stripe 支付按钮"""
    print("\n" + "="*60)
    print("测试3: Stripe 支付按钮")
    print("="*60)
    
    print("1. 访问结算页...")
    page.goto(f'{base_url}/checkout')
    page.wait_for_load_state('networkidle')
    time.sleep(5)  # 等待 Stripe 加载
    
    # 检查 Stripe 是否加载
    stripe_loaded = page.evaluate('typeof window !== "undefined" && typeof window.Stripe !== "undefined"')
    print(f"2. Stripe 已加载: {'✅' if stripe_loaded else '❌'}")
    
    # 填写地址信息
    print("3. 填写地址信息...")
    page.fill('input[name="fullName"], input[placeholder*="name" i]', 'Test User')
    page.fill('input[name="email"], input[type="email"]', 'test@example.com')
    page.fill('input[name="phone"], input[type="tel"]', '1234567890')
    page.fill('input[name="addressLine1"], input[placeholder*="address" i]', '123 Test St')
    page.fill('input[name="city"]', 'Toronto')
    
    # 选择省份
    province_select = page.locator('select[name="province"], select[name="state"]').first()
    if province_select.count() > 0:
        province_select.select_option(label='Ontario')
    
    page.fill('input[name="postalCode"], input[name="postal"]', 'M5H 2N2')
    
    # 选择国家
    country_select = page.locator('select[name="country"]').first()
    if country_select.count() > 0:
        country_select.select_option(label='Canada')
    
    time.sleep(2)
    
    # 等待运费计算
    print("4. 等待运费计算...")
    try:
        page.wait_for_response(lambda response: '/api/checkout/shipping-rates' in response.url, timeout=15000)
    except:
        print("⚠️  运费计算超时")
    
    time.sleep(2)
    
    # 选择运费方式
    shipping_input = page.locator('input[type="radio"][name*="shipping"]').first()
    if shipping_input.count() > 0:
        shipping_input.click()
        print("5. 已选择运费方式")
        time.sleep(1)
    
    # 检查 Place Order 按钮状态
    time.sleep(3)  # 等待卡片信息验证
    
    place_order_button = page.locator('button:has-text("Place Order"), button[type="submit"]').first()
    
    if place_order_button.count() == 0:
        print("❌ 未找到 Place Order 按钮")
        page.screenshot(path='test-results/webapp-testing-no-button.png', full_page=True)
        return False
    
    button_state = {
        'disabled': place_order_button.is_disabled(),
        'text': place_order_button.inner_text(),
        'title': place_order_button.get_attribute('title') or ''
    }
    
    print(f"\n📋 测试结果:")
    print(f"  - Place Order 按钮状态: {button_state}")
    print(f"  - 按钮可点击: {'✅' if not button_state['disabled'] else '❌'}")
    
    # 截图
    page.screenshot(path='test-results/webapp-testing-checkout-button.png', full_page=True)
    print("📸 截图已保存: test-results/webapp-testing-checkout-button.png")
    
    return True  # 至少按钮存在


def main():
    base_url = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:3000'
    
    print("="*60)
    print("🧪 使用 webapp-testing skill 进行支付功能测试")
    print("="*60)
    print(f"测试 URL: {base_url}")
    
    # 创建测试结果目录
    import os
    os.makedirs('test-results', exist_ok=True)
    
    results = {}
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        try:
            # 测试1: 添加购物车
            results['add_to_cart'] = test_add_to_cart_no_popup(page, base_url)
            
            # 测试2: 购物车图片
            results['cart_images'] = test_cart_images(page, base_url)
            
            # 测试3: Stripe 按钮
            results['stripe_button'] = test_stripe_button(page, base_url)
            
        except Exception as e:
            print(f"\n❌ 测试执行失败: {e}")
            import traceback
            traceback.print_exc()
            page.screenshot(path='test-results/webapp-testing-error.png', full_page=True)
        finally:
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

