#!/usr/bin/env python3
"""
生产环境商品详情页测试脚本
[2025-01-30 13:00:00] 使用 webapp-testing 和 Playwright 深度分析商品详情页问题

测试内容：
1. 网络请求分析 - 检查 API 请求和响应
2. 控制台错误分析 - 捕获 JavaScript 错误
3. 页面渲染验证 - 检查页面元素和状态
4. API 响应验证 - 直接调用后端 API 验证数据格式
"""

from playwright.sync_api import sync_playwright
import time
import sys
import json
import os
from datetime import datetime
from typing import Dict, List, Any, Optional

# 生产环境配置
PRODUCTION_FRONTEND_URL = 'https://print-main-frontend-234065158862.us-central1.run.app'
PRODUCTION_BACKEND_URL = 'https://print-main-backend-234065158862.us-central1.run.app'
PRODUCTION_API_URL = f'{PRODUCTION_BACKEND_URL}/api'

# 测试结果目录
TEST_RESULTS_DIR = 'test-results'
os.makedirs(TEST_RESULTS_DIR, exist_ok=True)


def get_product_slugs_from_list(page, base_url: str, limit: int = 5) -> List[str]:
    """从商品列表页获取商品 slug"""
    print(f"\n📋 从商品列表页获取商品 slug (限制: {limit})...")
    
    slugs = []
    try:
        # 访问商品列表页
        products_url = f'{base_url}/products'
        print(f"   访问: {products_url}")
        page.goto(products_url, wait_until='networkidle', timeout=30000)
        time.sleep(2)
        
        # 等待商品列表加载
        page.wait_for_selector('a[href^="/products/"]', timeout=10000)
        
        # 获取所有商品链接
        product_links = page.locator('a[href^="/products/"]').all()
        print(f"   找到 {len(product_links)} 个商品链接")
        
        for link in product_links[:limit]:
            href = link.get_attribute('href')
            if href and href.startswith('/products/'):
                slug = href.replace('/products/', '').split('?')[0].split('#')[0]
                if slug and slug not in slugs:
                    slugs.append(slug)
                    print(f"   ✅ 找到商品: {slug}")
        
        if not slugs:
            # 如果没找到，尝试从 API 获取
            print("   ⚠️  未从页面找到商品，尝试从 API 获取...")
            try:
                api_response = page.request.get(f'{PRODUCTION_API_URL}/products?limit={limit}')
                if api_response.ok:
                    data = api_response.json()
                    if isinstance(data, dict) and 'data' in data:
                        for product in data['data'][:limit]:
                            if 'slug' in product:
                                slugs.append(product['slug'])
                                print(f"   ✅ 从 API 找到商品: {product['slug']}")
            except Exception as e:
                print(f"   ❌ API 获取失败: {e}")
        
    except Exception as e:
        print(f"   ❌ 获取商品列表失败: {e}")
        import traceback
        traceback.print_exc()
    
    return slugs


def analyze_network_requests(page, slug: str) -> Dict[str, Any]:
    """分析网络请求"""
    print(f"\n🌐 分析网络请求 (商品: {slug})...")
    
    network_data = {
        'api_requests': [],
        'api_responses': [],
        'failed_requests': [],
        'cors_errors': [],
    }
    
    # 监听所有响应
    def handle_response(response):
        url = response.url
        status = response.status
        
        # 检查商品 API 请求
        if f'/api/products/{slug}' in url or f'/products/{slug}' in url:
            request_data = {
                'url': url,
                'status': status,
                'status_text': response.status_text,
                'headers': dict(response.headers),
                'timestamp': datetime.now().isoformat(),
            }
            
            if status >= 200 and status < 300:
                try:
                    body = response.json()
                    request_data['response_body'] = body
                    request_data['response_size'] = len(json.dumps(body))
                    network_data['api_responses'].append(request_data)
                    print(f"   ✅ API 请求成功: {url} (状态: {status})")
                except:
                    text = response.text()
                    request_data['response_text'] = text[:500]  # 限制长度
                    network_data['api_responses'].append(request_data)
                    print(f"   ⚠️  API 响应不是 JSON: {url} (状态: {status})")
            else:
                network_data['failed_requests'].append(request_data)
                print(f"   ❌ API 请求失败: {url} (状态: {status})")
        
        # 检查 CORS 错误
        if status == 0 or 'CORS' in response.status_text:
            network_data['cors_errors'].append({
                'url': url,
                'status': status,
                'status_text': response.status_text,
            })
    
    page.on('response', handle_response)
    
    return network_data


def analyze_console_errors(page) -> List[Dict[str, Any]]:
    """分析控制台错误"""
    console_errors = []
    
    def handle_console(msg):
        if msg.type == 'error':
            error_data = {
                'type': 'console_error',
                'text': msg.text,
                'timestamp': datetime.now().isoformat(),
            }
            console_errors.append(error_data)
            print(f"   ⚠️  控制台错误: {msg.text}")
    
    page.on('console', handle_console)
    
    return console_errors


def analyze_page_errors(page) -> List[Dict[str, Any]]:
    """分析页面错误（JavaScript 错误）"""
    page_errors = []
    
    def handle_page_error(error):
        error_data = {
            'type': 'page_error',
            'message': str(error),
            'timestamp': datetime.now().isoformat(),
        }
        page_errors.append(error_data)
        print(f"   ❌ 页面错误: {error}")
    
    page.on('pageerror', handle_page_error)
    
    return page_errors


def verify_page_elements(page, slug: str) -> Dict[str, Any]:
    """验证页面元素"""
    print(f"\n🔍 验证页面元素 (商品: {slug})...")
    
    elements = {
        'page_loaded': False,
        'loading_state': False,
        'error_state': False,
        'product_title': False,
        'product_price': False,
        'product_images': False,
        'product_variants': False,
        'add_to_cart_button': False,
    }
    
    try:
        # 检查页面是否加载
        page.wait_for_load_state('networkidle', timeout=15000)
        elements['page_loaded'] = True
        print("   ✅ 页面已加载")
        
        # 检查加载状态
        loading_selectors = [
            'text=Loading product',
            'text=Loading...',
            '[data-testid="loading"]',
        ]
        for selector in loading_selectors:
            if page.locator(selector).count() > 0:
                elements['loading_state'] = True
                print("   ⚠️  页面仍在加载中")
                break
        
        # 检查错误状态
        error_selectors = [
            'text=Product not found',
            'text=Failed to load',
            'text=Error',
            '[data-testid="error"]',
        ]
        for selector in error_selectors:
            if page.locator(selector).count() > 0:
                elements['error_state'] = True
                error_text = page.locator(selector).first.text_content()
                print(f"   ❌ 页面显示错误: {error_text}")
                break
        
        # 检查商品标题
        title_selectors = [
            'h1',
            '[data-testid="product-title"]',
            '.product-title',
        ]
        for selector in title_selectors:
            if page.locator(selector).count() > 0:
                elements['product_title'] = True
                title = page.locator(selector).first.text_content()
                print(f"   ✅ 找到商品标题: {title[:50]}")
                break
        
        # 检查商品价格
        price_selectors = [
            'text=/\\$[0-9]/',
            '[data-testid="product-price"]',
            '.product-price',
        ]
        for selector in price_selectors:
            if page.locator(selector).count() > 0:
                elements['product_price'] = True
                print("   ✅ 找到商品价格")
                break
        
        # 检查商品图片
        image_selectors = [
            'img[src*="product"]',
            '[data-testid="product-image"]',
            '.product-image img',
        ]
        for selector in image_selectors:
            if page.locator(selector).count() > 0:
                elements['product_images'] = True
                print("   ✅ 找到商品图片")
                break
        
        # 检查商品变体（颜色/尺寸选择）
        variant_selectors = [
            'button[data-color]',
            'button[data-size]',
            '[data-testid="variant-selector"]',
        ]
        for selector in variant_selectors:
            if page.locator(selector).count() > 0:
                elements['product_variants'] = True
                print("   ✅ 找到商品变体选择器")
                break
        
        # 检查添加到购物车按钮
        cart_selectors = [
            'button:has-text("Add to Cart")',
            'button:has-text("Add")',
            '[data-testid="add-to-cart"]',
        ]
        for selector in cart_selectors:
            if page.locator(selector).count() > 0:
                elements['add_to_cart_button'] = True
                print("   ✅ 找到添加到购物车按钮")
                break
        
    except Exception as e:
        print(f"   ❌ 验证页面元素时出错: {e}")
        import traceback
        traceback.print_exc()
    
    return elements


def verify_api_directly(slug: str) -> Dict[str, Any]:
    """直接调用后端 API 验证数据格式"""
    print(f"\n🔌 直接调用后端 API 验证 (商品: {slug})...")
    
    api_result = {
        'success': False,
        'status_code': None,
        'response_data': None,
        'error': None,
        'data_structure': {},
    }
    
    try:
        import requests
        
        api_url = f'{PRODUCTION_API_URL}/products/{slug}'
        print(f"   请求 URL: {api_url}")
        
        response = requests.get(api_url, timeout=10)
        api_result['status_code'] = response.status_code
        
        if response.ok:
            data = response.json()
            api_result['success'] = True
            api_result['response_data'] = data
            
            # 验证数据结构
            required_fields = ['id', 'name', 'slug', 'basePrice']
            optional_fields = ['variants', 'images', 'price', 'description']
            
            for field in required_fields:
                api_result['data_structure'][field] = field in data
            
            for field in optional_fields:
                api_result['data_structure'][f'{field}_exists'] = field in data
                if field in data:
                    if field == 'variants':
                        api_result['data_structure']['variants_count'] = len(data[field]) if isinstance(data[field], list) else 0
                    elif field == 'images':
                        api_result['data_structure']['images_count'] = len(data[field]) if isinstance(data[field], list) else 0
            
            print(f"   ✅ API 调用成功 (状态: {response.status_code})")
            print(f"   商品名称: {data.get('name', 'N/A')}")
            print(f"   变体数量: {api_result['data_structure'].get('variants_count', 0)}")
            print(f"   图片数量: {api_result['data_structure'].get('images_count', 0)}")
        else:
            api_result['error'] = response.text[:500]
            print(f"   ❌ API 调用失败 (状态: {response.status_code})")
            print(f"   错误信息: {api_result['error']}")
    
    except ImportError:
        print("   ⚠️  requests 库未安装，跳过直接 API 调用")
        api_result['error'] = 'requests library not available'
    except Exception as e:
        api_result['error'] = str(e)
        print(f"   ❌ API 调用异常: {e}")
        import traceback
        traceback.print_exc()
    
    return api_result


def test_product_detail_page(page, base_url: str, slug: str) -> Dict[str, Any]:
    """测试单个商品详情页"""
    print("\n" + "="*60)
    print(f"🧪 测试商品详情页: {slug}")
    print("="*60)
    
    result = {
        'slug': slug,
        'url': f'{base_url}/products/{slug}',
        'timestamp': datetime.now().isoformat(),
        'network': {},
        'console_errors': [],
        'page_errors': [],
        'elements': {},
        'api_verification': {},
        'screenshot_path': None,
    }
    
    try:
        # 设置网络请求监听
        network_data = analyze_network_requests(page, slug)
        
        # 设置控制台错误监听
        console_errors = analyze_console_errors(page)
        
        # 设置页面错误监听
        page_errors = analyze_page_errors(page)
        
        # 访问商品详情页
        print(f"\n📄 访问商品详情页: {result['url']}")
        page.goto(result['url'], wait_until='domcontentloaded', timeout=30000)
        
        # 等待页面加载
        print("   等待页面加载...")
        time.sleep(3)  # 给 React 组件时间渲染
        
        # 验证页面元素
        elements = verify_page_elements(page, slug)
        result['elements'] = elements
        
        # 收集网络数据
        result['network'] = network_data
        
        # 收集控制台错误
        result['console_errors'] = console_errors
        
        # 收集页面错误
        result['page_errors'] = page_errors
        
        # 直接验证 API
        api_verification = verify_api_directly(slug)
        result['api_verification'] = api_verification
        
        # 截图
        screenshot_path = f'{TEST_RESULTS_DIR}/product-detail-{slug}-{int(time.time())}.png'
        page.screenshot(path=screenshot_path, full_page=True)
        result['screenshot_path'] = screenshot_path
        print(f"\n   📸 截图已保存: {screenshot_path}")
        
    except Exception as e:
        print(f"\n❌ 测试商品详情页时出错: {e}")
        import traceback
        traceback.print_exc()
        result['error'] = str(e)
        
        # 即使出错也截图
        try:
            screenshot_path = f'{TEST_RESULTS_DIR}/product-detail-{slug}-error-{int(time.time())}.png'
            page.screenshot(path=screenshot_path, full_page=True)
            result['screenshot_path'] = screenshot_path
        except:
            pass
    
    return result


def generate_report(all_results: List[Dict[str, Any]]) -> str:
    """生成测试报告"""
    report_path = f'{TEST_RESULTS_DIR}/product-detail-test-report-{int(time.time())}.json'
    
    report = {
        'timestamp': datetime.now().isoformat(),
        'frontend_url': PRODUCTION_FRONTEND_URL,
        'backend_url': PRODUCTION_BACKEND_URL,
        'results': all_results,
        'summary': {
            'total_tested': len(all_results),
            'successful': 0,
            'failed': 0,
            'api_errors': 0,
            'render_errors': 0,
        },
    }
    
    for result in all_results:
        elements = result.get('elements', {})
        api_verification = result.get('api_verification', {})
        
        # 判断是否成功
        is_successful = (
            elements.get('page_loaded', False) and
            not elements.get('error_state', False) and
            elements.get('product_title', False) and
            api_verification.get('success', False)
        )
        
        if is_successful:
            report['summary']['successful'] += 1
        else:
            report['summary']['failed'] += 1
        
        # 统计 API 错误
        if not api_verification.get('success', False):
            report['summary']['api_errors'] += 1
        
        # 统计渲染错误
        if elements.get('error_state', False) or len(result.get('page_errors', [])) > 0:
            report['summary']['render_errors'] += 1
    
    # 保存报告
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    print("\n" + "="*60)
    print("📊 测试报告摘要")
    print("="*60)
    print(f"总测试数: {report['summary']['total_tested']}")
    print(f"✅ 成功: {report['summary']['successful']}")
    print(f"❌ 失败: {report['summary']['failed']}")
    print(f"🔌 API 错误: {report['summary']['api_errors']}")
    print(f"🎨 渲染错误: {report['summary']['render_errors']}")
    print(f"\n📄 完整报告已保存: {report_path}")
    
    return report_path


def main():
    base_url = sys.argv[1] if len(sys.argv) > 1 else PRODUCTION_FRONTEND_URL
    
    print("="*60)
    print("🧪 生产环境商品详情页测试")
    print("="*60)
    print(f"前端 URL: {base_url}")
    print(f"后端 API: {PRODUCTION_API_URL}")
    
    all_results = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # 使用 headless=False 以便观察
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        )
        page = context.new_page()
        
        try:
            # 获取商品 slug 列表
            slugs = get_product_slugs_from_list(page, base_url, limit=5)
            
            if not slugs:
                print("\n⚠️  未从页面找到商品，尝试从 API 获取...")
                try:
                    import requests
                    api_response = requests.get(f'{PRODUCTION_API_URL}/products?limit=5', timeout=10)
                    if api_response.ok:
                        data = api_response.json()
                        if isinstance(data, dict) and 'data' in data:
                            slugs = [p['slug'] for p in data['data'] if 'slug' in p]
                            print(f"   ✅ 从 API 获取到 {len(slugs)} 个商品 slug")
                            for slug in slugs:
                                print(f"      - {slug}")
                except ImportError:
                    print("   ⚠️  requests 库未安装，使用默认测试商品...")
                    slugs = ['2435100']  # 使用已知的商品 slug
                except Exception as e:
                    print(f"   ⚠️  API 获取失败: {e}，使用默认测试商品...")
                    slugs = ['2435100']  # 使用已知的商品 slug
            
            # 测试每个商品详情页
            for slug in slugs:
                result = test_product_detail_page(page, base_url, slug)
                all_results.append(result)
                time.sleep(2)  # 间隔时间
        
        except Exception as e:
            print(f"\n❌ 测试执行失败: {e}")
            import traceback
            traceback.print_exc()
            page.screenshot(path=f'{TEST_RESULTS_DIR}/test-error.png', full_page=True)
        finally:
            browser.close()
    
    # 生成报告
    if all_results:
        report_path = generate_report(all_results)
        return 0 if all_results[0].get('elements', {}).get('page_loaded', False) else 1
    else:
        print("\n❌ 没有测试结果")
        return 1


if __name__ == '__main__':
    exit(main())

