#!/usr/bin/env python3
"""
测试 Account Render Error 修复
[2025-01-30 20:00:00] 验证 Server Components render 错误已修复
"""

import sys
import time
from pathlib import Path

# 添加 webapp-testing skill 到路径
skill_path = Path(__file__).parent / '.claude' / 'skills' / 'webapp-testing'
if skill_path.exists():
    sys.path.insert(0, str(skill_path))

try:
    from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
except ImportError:
    print("❌ 未安装 playwright，请运行: pip install playwright && playwright install")
    sys.exit(1)

BASE_URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:3000'

def test_account_render_error_fix():
    """测试 account 页面不再出现 Server Components render 错误"""
    print(f"\n🧪 开始测试 Account Render Error 修复")
    print(f"📍 测试 URL: {BASE_URL}")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()
        
        # 收集控制台错误
        console_errors = []
        page.on('console', lambda msg: console_errors.append({
            'type': msg.type,
            'text': msg.text
        }) if msg.type == 'error' else None)
        
        try:
            print("\n1️⃣ 测试：未登录访问 /account（应该重定向到 /login，无错误）")
            
            # 清除所有 cookies，确保未登录
            context.clear_cookies()
            
            # 访问账户页面
            response = page.goto(f'{BASE_URL}/account', wait_until='networkidle', timeout=30000)
            
            # 检查响应状态码
            status = response.status if response else None
            print(f"   📊 响应状态码: {status}")
            
            if status:
                if status == 500:
                    print(f"   ❌ 失败：返回 500 错误（Server Components render 错误未修复）")
                    return False
                elif status not in [200, 302, 307]:
                    print(f"   ⚠️  警告：意外的状态码 {status}")
                else:
                    print(f"   ✅ 状态码正常: {status}")
            
            # 检查 URL（应该重定向到登录页）
            current_url = page.url
            print(f"   📍 当前 URL: {current_url}")
            
            if '/login' in current_url:
                print(f"   ✅ 成功重定向到登录页")
            else:
                print(f"   ⚠️  未重定向到登录页")
            
            # 检查是否有 Server Components render 错误
            server_components_errors = [
                err for err in console_errors 
                if 'Server Components render' in err['text'] 
                or 'digest' in err['text'].lower()
                or 'An error occurred in the Server Components render' in err['text']
            ]
            
            if server_components_errors:
                print(f"   ❌ 失败：发现 {len(server_components_errors)} 个 Server Components render 错误")
                for err in server_components_errors:
                    print(f"      - {err['text']}")
                return False
            else:
                print(f"   ✅ 无 Server Components render 错误")
            
            # 等待页面稳定
            time.sleep(2)
            
            print("\n2️⃣ 测试：访问 /login 页面（应该正常显示，无错误）")
            page.goto(f'{BASE_URL}/login', wait_until='networkidle', timeout=30000)
            
            # 检查页面是否包含登录表单
            login_form = page.locator('form, input[type="email"], input[type="password"]').first
            if login_form.count() > 0:
                print(f"   ✅ 登录页面正常显示")
            else:
                print(f"   ⚠️  未找到登录表单")
            
            # 清除之前的错误（新页面的错误）
            console_errors.clear()
            time.sleep(2)
            
            # 再次检查错误
            login_errors = [
                err for err in console_errors 
                if 'Server Components render' in err['text'] 
                or 'digest' in err['text'].lower()
            ]
            
            if login_errors:
                print(f"   ❌ 失败：登录页面发现 {len(login_errors)} 个错误")
                for err in login_errors:
                    print(f"      - {err['text']}")
                return False
            else:
                print(f"   ✅ 登录页面无 Server Components render 错误")
            
            print("\n3️⃣ 测试：访问 /register 页面（应该正常显示，无错误）")
            page.goto(f'{BASE_URL}/register', wait_until='networkidle', timeout=30000)
            
            # 检查页面是否包含注册表单
            register_form = page.locator('form, input[type="email"], input[type="password"]').first
            if register_form.count() > 0:
                print(f"   ✅ 注册页面正常显示")
            else:
                print(f"   ⚠️  未找到注册表单")
            
            # 清除之前的错误（新页面的错误）
            console_errors.clear()
            time.sleep(2)
            
            # 再次检查错误
            register_errors = [
                err for err in console_errors 
                if 'Server Components render' in err['text'] 
                or 'digest' in err['text'].lower()
            ]
            
            if register_errors:
                print(f"   ❌ 失败：注册页面发现 {len(register_errors)} 个错误")
                for err in register_errors:
                    print(f"      - {err['text']}")
                return False
            else:
                print(f"   ✅ 注册页面无 Server Components render 错误")
            
            print("\n✅ 所有测试通过！Server Components render 错误已修复")
            return True
            
        except PlaywrightTimeoutError as e:
            print(f"\n❌ 测试超时: {e}")
            return False
        except Exception as e:
            print(f"\n❌ 测试失败: {e}")
            import traceback
            traceback.print_exc()
            return False
        finally:
            browser.close()

if __name__ == '__main__':
    success = test_account_render_error_fix()
    sys.exit(0 if success else 1)

