#!/usr/bin/env python3
"""
检查生产环境部署版本
[2025-12-04 21:45:00] 使用 Chrome DevTools 读取前端控制台中的构建版本信息
"""

from playwright.sync_api import sync_playwright
import time
import json
import os
from datetime import datetime

# 生产环境配置
FRONTEND_URL = 'https://print-main-frontend-234065158862.us-central1.run.app'
BACKEND_URL = 'https://print-main-backend-234065158862.us-central1.run.app'

# 测试结果目录
TEST_RESULTS_DIR = 'test-results'
os.makedirs(TEST_RESULTS_DIR, exist_ok=True)

def check_frontend_version(page):
    """检查前端构建版本"""
    print("\n🔍 检查前端构建版本...")
    
    console_messages = []
    version_info = None
    
    def handle_console(msg):
        text = msg.text
        console_messages.append({
            'type': msg.type,
            'text': text,
            'timestamp': datetime.now().isoformat()
        })
        
        # 查找构建版本信息
        if '[Frontend Build]' in text:
            parts = text.split('[Frontend Build]')
            if len(parts) > 1:
                version_parts = parts[1].strip().split()
                if len(version_parts) >= 2:
                    version_info = {
                        'sha': version_parts[0],
                        'buildTime': version_parts[1] if len(version_parts) > 1 else None
                    }
                    print(f"   ✅ 找到构建版本信息: SHA={version_parts[0]}, Time={version_parts[1] if len(version_parts) > 1 else 'N/A'}")
    
    page.on('console', handle_console)
    
    try:
        print(f"   访问: {FRONTEND_URL}")
        page.goto(FRONTEND_URL, wait_until='networkidle', timeout=30000)
        time.sleep(3)  # 等待控制台消息
        
        # 检查页面标题
        title = page.title()
        print(f"   ✅ 页面标题: {title}")
        
        # 检查产品列表
        products = page.locator('[data-testid="product"], .product-card, a[href^="/products/"]').count()
        print(f"   ✅ 找到 {products} 个产品元素")
        
        # 检查颜色点数量（如果有很多颜色，说明可能没修复）
        color_swatches = page.locator('.product-color, [class*="color"], .color-swatch').count()
        print(f"   ⚠️  找到 {color_swatches} 个颜色点（如果数量很多，可能颜色修复未生效）")
        
        # 检查 Design Lab 页面
        print("\n🎨 检查 Design Lab 页面...")
        page.goto(f'{FRONTEND_URL}/design-lab', wait_until='networkidle', timeout=30000)
        time.sleep(2)
        
        # 检查是否是简化版本（只有占位文本）
        page_content = page.content()
        is_simplified = 'Design Lab - Coming Soon' in page_content or '简化版本' in page_content
        
        if is_simplified:
            print("   ⚠️  Design Lab 显示为简化版本（可能未部署最新代码）")
        else:
            print("   ✅ Design Lab 显示完整版本")
        
        return {
            'version_info': version_info,
            'console_messages': [m for m in console_messages if '[Frontend Build]' in m['text']],
            'products_count': products,
            'color_swatches_count': color_swatches,
            'design_lab_simplified': is_simplified
        }
        
    except Exception as e:
        print(f"   ❌ 检查失败: {e}")
        import traceback
        traceback.print_exc()
        return None

def check_backend_version(page):
    """检查后端版本"""
    print("\n🔍 检查后端版本...")
    
    try:
        response = page.request.get(f'{BACKEND_URL}/api/version', timeout=10000)
        if response.ok:
            data = response.json()
            print(f"   ✅ 后端版本: SHA={data.get('version', 'unknown')}, Time={data.get('buildTime', 'unknown')}")
            return data
        else:
            print(f"   ⚠️  后端版本端点返回状态码: {response.status}")
            return None
    except Exception as e:
        print(f"   ❌ 检查后端版本失败: {e}")
        return None

def get_latest_git_sha():
    """获取本地最新 Git SHA"""
    import subprocess
    try:
        result = subprocess.run(
            ['git', 'rev-parse', '--short', 'HEAD'],
            capture_output=True,
            text=True,
            cwd='/Users/apony-it/Downloads/print-main'
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except:
        pass
    return None

def main():
    """主测试函数"""
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    print(f"\n🚀 开始检查生产环境部署版本 [{timestamp}]")
    print(f"前端: {FRONTEND_URL}")
    print(f"后端: {BACKEND_URL}")
    
    # 获取本地最新 SHA
    local_sha = get_latest_git_sha()
    print(f"\n📌 本地最新 Git SHA: {local_sha}")
    
    results = {
        'timestamp': timestamp,
        'local_sha': local_sha,
        'frontend_url': FRONTEND_URL,
        'backend_url': BACKEND_URL,
        'frontend_version': None,
        'backend_version': None,
        'issues': []
    }
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # 使用有头模式以便观察
        context = browser.new_context()
        page = context.new_page()
        
        # 检查前端版本
        frontend_result = check_frontend_version(page)
        if frontend_result:
            results['frontend_version'] = frontend_result.get('version_info')
            results['products_count'] = frontend_result.get('products_count', 0)
            results['color_swatches_count'] = frontend_result.get('color_swatches_count', 0)
            results['design_lab_simplified'] = frontend_result.get('design_lab_simplified', False)
            
            # 检查版本是否匹配
            if frontend_result.get('version_info'):
                deployed_sha = frontend_result['version_info'].get('sha')
                if deployed_sha and local_sha:
                    if deployed_sha != local_sha:
                        results['issues'].append(f"前端版本不匹配: 部署={deployed_sha}, 本地={local_sha}")
                        print(f"\n   ⚠️  前端版本不匹配!")
                        print(f"      部署版本: {deployed_sha}")
                        print(f"      本地版本: {local_sha}")
                    else:
                        print(f"\n   ✅ 前端版本匹配: {deployed_sha}")
            else:
                results['issues'].append("未找到前端构建版本信息（可能未部署最新代码）")
                print(f"\n   ⚠️  未找到前端构建版本信息")
        
        # 检查后端版本
        backend_result = check_backend_version(page)
        if backend_result:
            results['backend_version'] = backend_result
        
        # 截图
        screenshot_path = f'{TEST_RESULTS_DIR}/deployment-version-check-{timestamp}.png'
        page.screenshot(path=screenshot_path, full_page=True)
        print(f"\n📸 截图已保存: {screenshot_path}")
        
        browser.close()
    
    # 保存测试结果
    report_path = f'{TEST_RESULTS_DIR}/deployment-version-check-{timestamp}.json'
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print(f"\n📄 测试报告已保存: {report_path}")
    
    # 总结
    print("\n" + "="*60)
    print("📊 部署版本检查总结")
    print("="*60)
    
    if results['frontend_version']:
        sha = results['frontend_version'].get('sha', 'unknown')
        build_time = results['frontend_version'].get('buildTime', 'unknown')
        print(f"前端构建版本: {sha}")
        print(f"前端构建时间: {build_time}")
        
        if local_sha and sha != local_sha:
            print(f"⚠️  版本不匹配！本地: {local_sha}, 部署: {sha}")
        elif sha == local_sha:
            print(f"✅ 版本匹配: {sha}")
    else:
        print("⚠️  未找到前端构建版本信息")
    
    if results['backend_version']:
        print(f"后端版本: {results['backend_version'].get('version', 'unknown')}")
        print(f"后端构建时间: {results['backend_version'].get('buildTime', 'unknown')}")
    
    print(f"\n产品数量: {results.get('products_count', 0)}")
    print(f"颜色点数量: {results.get('color_swatches_count', 0)}")
    
    if results.get('color_swatches_count', 0) > 50:
        print("⚠️  颜色点数量过多，可能颜色修复未生效")
    
    if results.get('design_lab_simplified', False):
        print("⚠️  Design Lab 显示为简化版本，可能未部署最新代码")
    
    if results['issues']:
        print("\n⚠️  发现的问题:")
        for issue in results['issues']:
            print(f"   - {issue}")
    
    print("="*60)
    
    return results

if __name__ == '__main__':
    main()

