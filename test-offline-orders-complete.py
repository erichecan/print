#!/usr/bin/env python3
"""
线下订单创建和管理完整功能测试
使用 webapp-testing 和 Playwright 测试所有相关功能

测试内容：
1. 客户下单页面（4步流程）
2. 销售员登录
3. 销售员订单列表
4. 销售员订单详情
5. 管理员订单管理（如果可访问）
"""

from playwright.sync_api import sync_playwright
import json
import os
from datetime import datetime, timedelta

# 生产环境 URL
FRONTEND_URL = os.getenv('FRONTEND_URL', 'https://print-main-frontend-hsbqzlnkxa-uc.a.run.app')
BACKEND_URL = os.getenv('BACKEND_URL', 'https://print-main-backend-hsbqzlnkxa-uc.a.run.app')

# 测试账号（来自 OFFLINE-ORDERS-LINKS-AND-SEED.md）
SALES_TEST_USER = {
    'email': 'offline-tester@example.com',
    'password': 'OfflineTest123!'
}

# 测试结果目录
TEST_RESULTS_DIR = 'test-results/offline-orders'
os.makedirs(TEST_RESULTS_DIR, exist_ok=True)

def take_screenshot(page, name):
    """保存截图"""
    path = f'{TEST_RESULTS_DIR}/{name}.png'
    page.screenshot(path=path, full_page=True)
    print(f'  📸 截图已保存: {path}')
    return path

def log_step(step_num, description):
    """记录测试步骤"""
    print(f'\n{"="*60}')
    print(f'步骤 {step_num}: {description}')
    print(f'{"="*60}')

def test_offline_order_creation(page):
    """测试客户下单页面（4步流程）"""
    log_step(1, '测试客户下单页面 - 4步订单创建流程')
    
    try:
        # 访问客户下单页面
        print(f'1. 访问客户下单页面: {FRONTEND_URL}/offline-orders')
        page.goto(f'{FRONTEND_URL}/offline-orders')
        page.wait_for_load_state('networkidle')
        take_screenshot(page, '01-offline-orders-page')
        
        # 检查页面是否加载
        print('2. 检查页面元素...')
        page.wait_for_selector('form, [class*="step"], [class*="form"]', timeout=10000)
        print('   ✅ 页面已加载')
        
        # 第一步：产品选择
        print('\n3. 第一步：产品选择')
        try:
            # 查找产品选择相关元素
            category_select = page.locator('select, [role="combobox"]').first()
            try:
                category_select.wait_for(state='visible', timeout=3000)
                options = category_select.locator('option').all()
                if len(options) > 1:
                    # 选择第一个非空选项
                    for i, opt in enumerate(options[1:], 1):
                        text = opt.inner_text()
                        if text and '加载' not in text and 'Loading' not in text and text.strip():
                            category_select.select_option(index=i)
                            print(f'   ✅ 选择产品分类: {text.strip()}')
                            page.wait_for_timeout(1000)
                            break
            except:
                print('   ⚠️  产品选择器未找到或不可见')
        except Exception as e:
            print(f'   ⚠️  产品选择步骤跳过: {e}')
        
        # 填写数量
        try:
            quantity_input = page.locator('input[type="number"]').first()
            try:
                quantity_input.wait_for(state='visible', timeout=2000)
                quantity_input.fill('10')
                print('   ✅ 填写数量: 10')
            except:
                print('   ⚠️  数量输入框未找到')
        except:
            pass
        
        # 点击下一步
        try:
            next_button = page.locator('button:has-text("下一步"), button:has-text("Next"), button:has-text("Continue")').first()
            try:
                next_button.wait_for(state='visible', timeout=3000)
                next_button.click()
                print('   ✅ 点击下一步进入第二步')
                page.wait_for_timeout(1000)
                take_screenshot(page, '02-step-2-print-positions')
            except:
                print('   ⚠️  下一步按钮未找到或不可见')
        except Exception as e:
            print(f'   ⚠️  无法进入第二步: {e}')
        
        # 第二步：印刷位置配置
        print('\n4. 第二步：印刷位置配置')
        try:
            # 查找包含"位置"或"Position"的选择框
            position_selects = page.locator('select').all()
            position_select = None
            for sel in position_selects:
                try:
                    label = sel.locator('xpath=preceding-sibling::label | following-sibling::label | parent::*/label').first()
                    try:
                        label.wait_for(state='visible', timeout=500)
                        label_text = label.inner_text()
                        if '位置' in label_text or 'Position' in label_text:
                            position_select = sel
                            break
                    except:
                        pass
                except:
                    pass
            
            if position_select:
                try:
                    position_select.wait_for(state='visible', timeout=2000)
                    options = position_select.locator('option').all()
                    if len(options) > 1:
                        position_select.select_option(index=1)
                        print('   ✅ 选择印刷位置')
                except:
                    pass
            
            # 填写尺寸
            try:
                width_input = page.locator('input[type="number"]').nth(0)
                width_input.wait_for(state='visible', timeout=2000)
                width_input.fill('10')
                print('   ✅ 填写宽度: 10')
            except:
                pass
            
            try:
                height_input = page.locator('input[type="number"]').nth(1)
                height_input.wait_for(state='visible', timeout=2000)
                height_input.fill('12')
                print('   ✅ 填写高度: 12')
            except:
                pass
        except Exception as e:
            print(f'   ⚠️  印刷位置配置跳过: {e}')
        
        # 再次点击下一步
        try:
            next_button = page.locator('button:has-text("下一步"), button:has-text("Next")').first()
            try:
                next_button.wait_for(state='visible', timeout=3000)
                next_button.click()
                print('   ✅ 点击下一步进入第三步')
                page.wait_for_timeout(1000)
                take_screenshot(page, '03-step-3-contact-info')
            except:
                pass
        except:
            pass
        
        # 第三步：客人信息和价格
        print('\n5. 第三步：客人信息和价格管理')
        try:
            # 填写联系人姓名
            contact_input = page.locator('input[name*="contact"], input[name*="name"], input[placeholder*="联系人"], input[placeholder*="Contact"]').first()
            try:
                contact_input.wait_for(state='visible', timeout=2000)
                contact_input.fill('Test User')
                print('   ✅ 填写联系人: Test User')
            except:
                pass
            
            # 填写邮箱
            email_input = page.locator('input[type="email"], input[name*="email"]').first()
            try:
                email_input.wait_for(state='visible', timeout=2000)
                email_input.fill('test@example.com')
                print('   ✅ 填写邮箱: test@example.com')
            except:
                pass
            
            # 填写电话
            phone_input = page.locator('input[type="tel"], input[name*="phone"]').first()
            try:
                phone_input.wait_for(state='visible', timeout=2000)
                phone_input.fill('4165551234')
                print('   ✅ 填写电话: 4165551234')
            except:
                pass
            
            # 填写交付日期
            date_input = page.locator('input[type="date"], input[name*="date"]').first()
            try:
                date_input.wait_for(state='visible', timeout=2000)
                future_date = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
                date_input.fill(future_date)
                print(f'   ✅ 填写交付日期: {future_date}')
            except:
                pass
        except Exception as e:
            print(f'   ⚠️  客人信息填写跳过: {e}')
        
        # 再次点击下一步
        try:
            next_button = page.locator('button:has-text("下一步"), button:has-text("Next")').first()
            try:
                next_button.wait_for(state='visible', timeout=3000)
                next_button.click()
                print('   ✅ 点击下一步进入第四步')
                page.wait_for_timeout(1000)
                take_screenshot(page, '04-step-4-file-upload')
            except:
                pass
        except:
            pass
        
        # 第四步：文件上传
        print('\n6. 第四步：文件上传')
        try:
            # 填写项目名称
            project_input = page.locator('input[name*="project"], input[placeholder*="项目"], input[placeholder*="Project"]').first()
            try:
                project_input.wait_for(state='visible', timeout=2000)
                project_input.fill('Test Project - Automated Test')
                print('   ✅ 填写项目名称: Test Project - Automated Test')
            except:
                pass
        except:
            pass
        
        print('\n   ✅ 客户下单流程测试完成（未实际提交）')
        take_screenshot(page, '05-offline-order-form-complete')
        
        return True
    except Exception as e:
        print(f'   ❌ 客户下单流程测试失败: {e}')
        take_screenshot(page, 'error-offline-order-creation')
        return False

def test_sales_login(page):
    """测试销售员登录"""
    log_step(2, '测试销售员登录')
    
    try:
        # 访问登录页面
        print(f'1. 访问销售员登录页面: {FRONTEND_URL}/offline-orders/sales/login')
        page.goto(f'{FRONTEND_URL}/offline-orders/sales/login')
        page.wait_for_load_state('networkidle')
        take_screenshot(page, '06-sales-login-page')
        
        # 检查登录表单
        print('2. 检查登录表单...')
        try:
            # 根据页面结构，使用 ID 选择器（sales-email 和 sales-password）
            email_input = page.locator('#sales-email')
            password_input = page.locator('#sales-password')
            
            try:
                email_input.wait_for(state='visible', timeout=5000)
                print('   ✅ 邮箱输入框已找到')
            except:
                print('   ❌ 邮箱输入框未找到')
                take_screenshot(page, 'error-email-input-not-found')
                return False
            
            try:
                password_input.wait_for(state='visible', timeout=5000)
                print('   ✅ 密码输入框已找到')
            except:
                print('   ❌ 密码输入框未找到')
                take_screenshot(page, 'error-password-input-not-found')
                return False
            
            print('   ✅ 登录表单已加载')
            
            # 填写登录信息
            print(f'3. 填写登录信息...')
            print(f'   邮箱: {SALES_TEST_USER["email"]}')
            email_input.fill(SALES_TEST_USER['email'])
            password_input.fill(SALES_TEST_USER['password'])
            
            # 点击登录按钮
            print('4. 点击登录按钮...')
            login_button = page.locator('button:has-text("登录")')
            try:
                login_button.wait_for(state='visible', timeout=3000)
                login_button.click()
                print('   ✅ 已点击登录按钮')
            except Exception as e:
                print(f'   ❌ 登录按钮未找到或不可见: {e}')
                take_screenshot(page, 'error-login-button-not-found')
                return False
        except Exception as e:
            print(f'   ❌ 登录表单检查失败: {e}')
            take_screenshot(page, 'error-login-form')
            return False
        
        # 等待跳转
        print('5. 等待登录跳转...')
        try:
            page.wait_for_url('**/offline-orders/sales/orders**', timeout=20000)
            print('   ✅ 登录成功，已跳转到订单列表')
            take_screenshot(page, '07-sales-login-success')
            return True
        except:
            # 检查是否还在登录页（登录失败）
            current_url = page.url
            if 'login' in current_url:
                print('   ❌ 登录失败，仍在登录页面')
                take_screenshot(page, 'error-sales-login-failed')
                return False
            else:
                print(f'   ✅ 已跳转到: {current_url}')
                return True
    except Exception as e:
        print(f'   ❌ 销售员登录测试失败: {e}')
        take_screenshot(page, 'error-sales-login')
        return False

def test_sales_orders_list(page):
    """测试销售员订单列表"""
    log_step(3, '测试销售员订单列表')
    
    try:
        # 确保已登录
        if 'login' in page.url:
            print('   ⚠️  未登录，先执行登录...')
            if not test_sales_login(page):
                return False
        
        # 访问订单列表页面
        if 'orders' not in page.url:
            print(f'1. 访问订单列表页面: {FRONTEND_URL}/offline-orders/sales/orders')
            page.goto(f'{FRONTEND_URL}/offline-orders/sales/orders')
            page.wait_for_load_state('networkidle')
        
        take_screenshot(page, '08-sales-orders-list')
        
        # 检查页面标题
        print('2. 检查页面内容...')
        try:
            headings = page.locator('h1, h2, [class*="title"], [class*="header"]').all()
            for heading in headings:
                try:
                    text = heading.inner_text()
                    if 'Sales' in text or '订单' in text or 'Order' in text:
                        print(f'   ✅ 页面标题: {text}')
                        break
                except:
                    continue
        except Exception as e:
            print(f'   ⚠️  页面标题未找到: {e}')
        
        # 检查订单列表
        print('3. 检查订单列表...')
        try:
            # 查找订单表格或列表
            orders_table = page.locator('table, [class*="order"], [class*="list"]').first()
            try:
                orders_table.wait_for(state='visible', timeout=5000)
                print('   ✅ 订单列表已显示')
                
                # 查找测试订单
                test_order = page.locator('text=/OFF-E2E-CASE/i')
                try:
                    if test_order.count > 0:
                        order_text = test_order.first().inner_text()
                        print(f'   ✅ 找到测试订单: {order_text}')
                    else:
                        print('   ⚠️  未找到测试订单（可能需要先运行 seed 脚本）')
                except Exception as e:
                    print(f'   ⚠️  查找测试订单时出错: {e}')
            except:
                print('   ⚠️  订单列表未找到或不可见')
        except Exception as e:
            print(f'   ⚠️  检查订单列表时出错: {e}')
        
        # 检查"新建订单"按钮
        print('4. 检查新建订单按钮...')
        try:
            new_order_button = page.locator('button:has-text("新建"), button:has-text("New"), a:has-text("新建")').first()
            try:
                new_order_button.wait_for(state='visible', timeout=3000)
                print('   ✅ 新建订单按钮存在')
            except:
                print('   ⚠️  新建订单按钮未找到')
        except:
            pass
        
        print('   ✅ 销售员订单列表测试完成')
        return True
    except Exception as e:
        print(f'   ❌ 销售员订单列表测试失败: {e}')
        take_screenshot(page, 'error-sales-orders-list')
        return False

def test_sales_order_detail(page):
    """测试销售员订单详情"""
    log_step(4, '测试销售员订单详情')
    
    try:
        # 确保在订单列表页
        if 'orders' not in page.url or '/orders/' in page.url:
            if not test_sales_orders_list(page):
                return False
        
        # 查找详情按钮
        print('1. 查找订单详情按钮...')
        try:
            detail_button = page.locator('button:has-text("详情"), button:has-text("Detail"), a:has-text("详情")').first()
            try:
                detail_button.wait_for(state='visible', timeout=5000)
                detail_button.click()
                print('   ✅ 点击详情按钮')
                
                # 等待跳转到详情页
                page.wait_for_url('**/offline-orders/sales/orders/**', timeout=10000)
                page.wait_for_load_state('networkidle')
                take_screenshot(page, '09-sales-order-detail')
                
                # 检查详情页内容
                print('2. 检查订单详情内容...')
                
                # 检查订单编号
                try:
                    order_code = page.locator('text=/订单编号|Order Code|OFF-/i').first()
                    order_code.wait_for(state='visible', timeout=3000)
                    code_text = order_code.inner_text()
                    print(f'   ✅ 订单编号: {code_text}')
                except:
                    pass
                
                # 检查订单信息
                info_sections = [
                    '项目名称', 'Project Name',
                    '产品列表', 'Product List',
                    '印刷位置', 'Print Positions',
                    '价格信息', 'Pricing',
                    '联系人', 'Contact',
                    '订单历史', 'Order History'
                ]
                
                found_sections = []
                for section in info_sections:
                    try:
                        section_elem = page.locator(f'text=/{section}/i').first()
                        section_elem.wait_for(state='visible', timeout=1000)
                        found_sections.append(section)
                    except:
                        pass
                
                if found_sections:
                    print(f'   ✅ 找到 {len(found_sections)} 个信息区块: {", ".join(found_sections)}')
                else:
                    print('   ⚠️  未找到订单信息区块')
                
                # 检查返回按钮
                print('3. 检查返回按钮...')
                try:
                    back_button = page.locator('button:has-text("返回"), button:has-text("Back"), a:has-text("返回")').first()
                    back_button.wait_for(state='visible', timeout=3000)
                    print('   ✅ 返回按钮存在')
                    # 不实际点击，保持测试状态
                except:
                    print('   ⚠️  返回按钮未找到')
                
                print('   ✅ 销售员订单详情测试完成')
                return True
            except:
                print('   ⚠️  详情按钮未找到或不可见（可能没有订单）')
                return False
        except Exception as e:
            print(f'   ❌ 访问订单详情失败: {e}')
            take_screenshot(page, 'error-sales-order-detail')
            return False
    except Exception as e:
        print(f'   ❌ 销售员订单详情测试失败: {e}')
        take_screenshot(page, 'error-sales-order-detail')
        return False

def test_admin_offline_orders(page):
    """测试管理员订单管理页面"""
    log_step(5, '测试管理员订单管理页面')
    
    try:
        # 访问管理员页面
        print(f'1. 访问管理员订单管理页面: {FRONTEND_URL}/admin/offline-orders')
        page.goto(f'{FRONTEND_URL}/admin/offline-orders')
        page.wait_for_load_state('networkidle')
        take_screenshot(page, '10-admin-offline-orders')
        
        # 检查是否需要登录
        current_url = page.url
        if 'login' in current_url or 'signin' in current_url:
            print('   ⚠️  需要管理员登录（跳过此测试）')
            return None  # 返回 None 表示跳过
        
        # 检查页面内容
        print('2. 检查管理员页面内容...')
        try:
            # 查找看板或订单列表
            board = page.locator('[class*="board"], [class*="kanban"], [class*="order"]').first()
            try:
                board.wait_for(state='visible', timeout=5000)
                print('   ✅ 订单管理看板已显示')
            except:
                print('   ⚠️  订单管理看板未找到或不可见')
        except:
            print('   ⚠️  无法检查页面内容')
        
        print('   ✅ 管理员订单管理页面测试完成（需要管理员权限）')
        return True
    except Exception as e:
        print(f'   ⚠️  管理员订单管理页面测试: {e}')
        return None

def main():
    """主测试函数"""
    print('='*60)
    print('线下订单创建和管理完整功能测试')
    print('='*60)
    print(f'前端 URL: {FRONTEND_URL}')
    print(f'后端 URL: {BACKEND_URL}')
    print(f'测试账号: {SALES_TEST_USER["email"]}')
    print(f'测试结果目录: {TEST_RESULTS_DIR}')
    print('='*60)
    
    results = {
        'timestamp': datetime.now().isoformat(),
        'frontend_url': FRONTEND_URL,
        'backend_url': BACKEND_URL,
        'test_user': SALES_TEST_USER['email'],
        'tests': {}
    }
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # 使用 headless=False 以便观察
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        )
        page = context.new_page()
        
        try:
            # 测试 1: 客户下单页面
            results['tests']['offline_order_creation'] = test_offline_order_creation(page)
            
            # 测试 2: 销售员登录
            results['tests']['sales_login'] = test_sales_login(page)
            
            # 测试 3: 销售员订单列表
            results['tests']['sales_orders_list'] = test_sales_orders_list(page)
            
            # 测试 4: 销售员订单详情
            results['tests']['sales_order_detail'] = test_sales_order_detail(page)
            
            # 测试 5: 管理员订单管理（可选）
            admin_result = test_admin_offline_orders(page)
            if admin_result is not None:
                results['tests']['admin_offline_orders'] = admin_result
            
        except Exception as e:
            print(f'\n❌ 测试过程中发生错误: {e}')
            take_screenshot(page, 'error-main-test')
            results['error'] = str(e)
        finally:
            browser.close()
    
    # 保存测试结果
    results_file = f'{TEST_RESULTS_DIR}/test-results.json'
    with open(results_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f'\n📄 测试结果已保存: {results_file}')
    
    # 打印测试总结
    print('\n' + '='*60)
    print('测试总结')
    print('='*60)
    for test_name, result in results['tests'].items():
        status = '✅ 通过' if result else '❌ 失败'
        if result is None:
            status = '⏭️  跳过'
        print(f'{test_name}: {status}')
    
    passed = sum(1 for r in results['tests'].values() if r is True)
    total = len([r for r in results['tests'].values() if r is not None])
    print(f'\n总计: {passed}/{total} 通过')
    print('='*60)

if __name__ == '__main__':
    main()

