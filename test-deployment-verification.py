#!/usr/bin/env python3
"""
部署验证测试 - 检查编译后的 JavaScript bundle
[2025-12-03 22:20:00] 通过检查实际加载的 JavaScript 文件来验证功能是否部署
"""
from playwright.sync_api import sync_playwright
import time
import sys
import re

PRODUCTION_URL = 'https://print-main-frontend-hsbqzlnkxa-uc.a.run.app'

def check_javascript_bundles(page, base_url):
    """检查 JavaScript bundle 中是否包含功能代码"""
    print("\n" + "="*60)
    print("检查 JavaScript Bundle")
    print("="*60)
    
    results = {
        'bundles_loaded': False,
        'hoveredColors_found': False,
        'onMouseEnter_found': False,
        'imageUrl_found': False,
        'editArt_found': False,
        'details': []
    }
    
    try:
        # 访问商品列表页
        print("1. 访问商品列表页...")
        page.goto(f'{base_url}/products', wait_until='domcontentloaded', timeout=30000)
        time.sleep(5)  # 等待 JavaScript 加载
        
        # 获取所有加载的 JavaScript 文件
        print("2. 检查加载的 JavaScript 文件...")
        js_files = []
        
        # 通过页面内容查找 JavaScript 文件
        page_content = page.content()
        js_pattern = r'/_next/static/chunks/[^"]+\.js'
        js_matches = re.findall(js_pattern, page_content)
        js_files = list(set(js_matches))[:10]  # 取前10个
        
        print(f"   找到 {len(js_files)} 个 JavaScript 文件")
        results['bundles_loaded'] = True
        
        # 检查每个 JavaScript 文件
        found_in_files = []
        for js_file in js_files:
            try:
                full_url = f'{base_url}{js_file}'
                print(f"   检查: {js_file}")
                
                # 获取文件内容（只检查前100KB以避免太大）
                response = page.request.get(full_url)
                if response.ok:
                    content = response.text()[:100000]  # 只检查前100KB
                    
                    checks = {
                        'hoveredColors': 'hoveredColors' in content or 'hoveredColors' in content,
                        'onMouseEnter': 'onMouseEnter' in content or 'onmouseenter' in content.lower(),
                        'imageUrl': 'imageUrl' in content or 'image-url' in content.lower(),
                        'Edit Art': 'Edit Art' in content or 'edit-art' in content.lower(),
                    }
                    
                    for key, found in checks.items():
                        if found:
                            found_in_files.append(f"{js_file}: {key}")
                            if key == 'hoveredColors':
                                results['hoveredColors_found'] = True
                            elif key == 'onMouseEnter':
                                results['onMouseEnter_found'] = True
                            elif key == 'imageUrl':
                                results['imageUrl_found'] = True
                            elif key == 'Edit Art':
                                results['editArt_found'] = True
            except Exception as e:
                print(f"   ⚠️  检查 {js_file} 失败: {e}")
        
        if found_in_files:
            print("\n   找到功能代码的文件:")
            for item in found_in_files:
                print(f"   ✅ {item}")
            results['details'] = found_in_files
        else:
            print("\n   ⚠️  未在 JavaScript bundle 中找到功能代码")
        
        # 尝试通过执行 JavaScript 检查
        print("\n3. 通过执行 JavaScript 检查...")
        try:
            # 检查是否有 React 组件包含 hoveredColors
            has_hovered = page.evaluate("""
                () => {
                    // 检查 window 对象或全局变量
                    return typeof window !== 'undefined' && 
                           (window.__NEXT_DATA__ || document.querySelector('[data-reactroot]'));
                }
            """)
            
            if has_hovered:
                print("   ✅ 页面已加载 React/Next.js")
                results['details'].append("React/Next.js 已加载")
        except Exception as e:
            print(f"   ⚠️  JavaScript 执行检查失败: {e}")
        
    except Exception as e:
        print(f"   ❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        results['details'].append(f"测试异常: {str(e)}")
    
    return results


def main():
    base_url = sys.argv[1] if len(sys.argv) > 1 else PRODUCTION_URL
    
    print("="*60)
    print("🔍 部署验证 - JavaScript Bundle 检查")
    print("="*60)
    print(f"测试 URL: {base_url}")
    
    results = {}
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        try:
            results = check_javascript_bundles(page, base_url)
        finally:
            browser.close()
    
    # 总结
    print("\n" + "="*60)
    print("📊 检查总结")
    print("="*60)
    print(f"JavaScript bundles 已加载: {'✅' if results['bundles_loaded'] else '❌'}")
    print(f"找到 hoveredColors: {'✅' if results['hoveredColors_found'] else '❌'}")
    print(f"找到 onMouseEnter: {'✅' if results['onMouseEnter_found'] else '❌'}")
    print(f"找到 imageUrl: {'✅' if results['imageUrl_found'] else '❌'}")
    print(f"找到 Edit Art: {'✅' if results['editArt_found'] else '❌'}")
    
    if results['hoveredColors_found']:
        print("\n✅ 功能代码已部署到 JavaScript bundle")
    else:
        print("\n❌ 功能代码未在 JavaScript bundle 中找到")
        print("   可能原因:")
        print("   1. 代码被压缩/混淆，变量名已改变")
        print("   2. 代码被 tree-shaking 移除")
        print("   3. 需要检查实际的运行时行为")
    
    print("="*60)
    
    return 0 if results['hoveredColors_found'] else 1


if __name__ == '__main__':
    sys.exit(main())

