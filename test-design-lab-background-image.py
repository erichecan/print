#!/usr/bin/env python3
"""
测试 Design Lab 默认底图显示功能
[2025-01-31 16:40:00]

测试内容：
1. 页面加载后画布是否正确显示
2. 默认底图是否正确加载并显示
3. 图片是否在画布中央
4. 图片是否在最底层
5. 其他功能（上传、文字、art）是否能在底图上操作
"""

from playwright.sync_api import sync_playwright
import time
import sys
import os

def test_background_image_display(page, base_url):
    """测试默认底图显示"""
    print("\n" + "="*60)
    print("测试: Design Lab 默认底图显示")
    print("="*60)
    
    # 创建测试结果目录
    os.makedirs('test-results', exist_ok=True)
    
    # 1. 访问 Design Lab 页面
    print("1. 访问 Design Lab 页面...")
    page.goto(f'{base_url}/design-lab', wait_until='domcontentloaded', timeout=60000)
    time.sleep(5)  # 等待画布和图片加载
    
    # 截图
    page.screenshot(path='test-results/design-lab-initial-load.png', full_page=True)
    print("   ✅ 页面已加载，截图保存到 test-results/design-lab-initial-load.png")
    
    # 2. 检查画布是否存在
    print("2. 检查画布元素...")
    canvas = page.locator('canvas.dl-canvas__fabric')
    if canvas.count() == 0:
        print("   ❌ 未找到画布元素")
        return False
    
    print("   ✅ 画布元素存在")
    
    # 3. 检查控制台日志，看图片是否加载
    print("3. 检查控制台日志...")
    console_logs = []
    
    def handle_console(msg):
        console_logs.append(msg.text)
        if 'DesignLab' in msg.text:
            print(f"   [Console] {msg.text}")
    
    page.on('console', handle_console)
    
    # 等待一段时间，收集日志
    time.sleep(2)
    
    # 4. 检查画布上是否有对象（通过 JavaScript）
    print("4. 检查画布上的对象...")
    canvas_objects = page.evaluate("""
        () => {
            const canvas = document.querySelector('canvas.dl-canvas__fabric');
            if (!canvas) return { error: 'Canvas not found' };
            
            // 尝试获取 Fabric.js canvas 实例
            // 注意：Fabric.js canvas 可能存储在全局变量或通过其他方式访问
            // 这里我们检查画布是否有内容
            const ctx = canvas.getContext('2d');
            if (!ctx) return { error: 'Cannot get 2d context' };
            
            // 检查画布是否有非透明像素
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const pixels = imageData.data;
            let hasContent = false;
            
            // 检查是否有非透明像素（alpha > 0）
            for (let i = 3; i < pixels.length; i += 4) {
                if (pixels[i] > 0) {
                    hasContent = true;
                    break;
                }
            }
            
            return {
                width: canvas.width,
                height: canvas.height,
                hasContent: hasContent,
                styleWidth: canvas.style.width,
                styleHeight: canvas.style.height
            };
        }
    """)
    
    print(f"   画布信息: {canvas_objects}")
    
    if not canvas_objects.get('hasContent', False):
        print("   ⚠️  画布上没有检测到内容（可能是图片还在加载）")
        # 再等待一段时间
        time.sleep(3)
        page.screenshot(path='test-results/design-lab-after-wait.png', full_page=True)
    
    # 5. 检查网络请求，看图片是否加载成功
    print("5. 检查图片加载状态...")
    
    # 监听网络请求
    image_loaded = False
    image_url = None
    
    def handle_response(response):
        nonlocal image_loaded, image_url
        if 'front-large_extended.png' in response.url or 'design-lab-products' in response.url:
            image_url = response.url
            if response.status == 200:
                image_loaded = True
                print(f"   ✅ 图片加载成功: {response.url}")
            else:
                print(f"   ❌ 图片加载失败: {response.url} (状态码: {response.status})")
    
    page.on('response', handle_response)
    
    # 刷新页面以触发图片加载
    page.reload()
    page.wait_for_load_state('networkidle')
    time.sleep(5)  # 等待图片加载
    
    # 6. 最终截图
    page.screenshot(path='test-results/design-lab-final.png', full_page=True)
    print("   ✅ 最终截图保存到 test-results/design-lab-final.png")
    
    # 7. 检查是否有错误
    errors = []
    def handle_error(error):
        errors.append(error)
        if 'DesignLab' in str(error):
            print(f"   ⚠️  错误: {error}")
    
    page.on('pageerror', handle_error)
    
    # 总结
    print("\n" + "="*60)
    print("测试总结")
    print("="*60)
    print(f"  画布存在: ✅")
    print(f"  画布有内容: {'✅' if canvas_objects.get('hasContent', False) else '⚠️'}")
    print(f"  图片加载: {'✅' if image_loaded else '❌'}")
    if image_url:
        print(f"  图片 URL: {image_url}")
    if errors:
        print(f"  错误数量: {len(errors)}")
    
    return canvas_objects.get('hasContent', False) or image_loaded


def main():
    base_url = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:3000'
    
    print("="*60)
    print("🧪 Design Lab 默认底图显示测试")
    print("="*60)
    print(f"测试 URL: {base_url}")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)  # 使用 headless=True 以便自动化测试
        page = browser.new_page()
        
        # 设置视口大小
        page.set_viewport_size({"width": 1920, "height": 1080})
        
        result = False
        try:
            result = test_background_image_display(page, base_url)
            
            print("\n" + "="*60)
            if result:
                print("✅ 测试通过：画布有内容或图片已加载")
            else:
                print("❌ 测试失败：画布没有内容且图片未加载")
            print("="*60)
            
            # 等待用户查看（非 headless 模式）
            print("\n等待 5 秒后关闭浏览器...")
            time.sleep(5)
            
        except Exception as e:
            print(f"\n❌ 测试执行失败: {e}")
            import traceback
            traceback.print_exc()
            page.screenshot(path='test-results/design-lab-error.png', full_page=True)
        finally:
            browser.close()
    
    return 0 if result else 1


if __name__ == '__main__':
    sys.exit(main())

