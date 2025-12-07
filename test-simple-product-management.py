#!/usr/bin/env python3
"""
测试简化的产品管理功能
[2025-12-07 08:15:00]
"""
import requests
import json
import sys

FRONTEND_URL = "https://print-main-frontend-234065158862.us-central1.run.app"
BACKEND_URL = "https://print-main-backend-234065158862.us-central1.run.app"

def test_public_api():
    """测试公开的产品列表 API"""
    print("=" * 60)
    print("测试 1: 公开产品列表 API")
    print("=" * 60)
    
    url = f"{FRONTEND_URL}/api/offline-orders/products"
    print(f"请求 URL: {url}")
    
    try:
        response = requests.get(url, timeout=10)
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"响应: {json.dumps(data, indent=2, ensure_ascii=False)}")
            print("✅ 公开 API 测试通过")
            return True
        else:
            print(f"❌ 公开 API 测试失败: {response.text}")
            return False
    except Exception as e:
        print(f"❌ 公开 API 测试异常: {e}")
        return False

def test_backend_direct():
    """测试后端直接访问"""
    print("\n" + "=" * 60)
    print("测试 2: 后端直接访问")
    print("=" * 60)
    
    url = f"{BACKEND_URL}/api/offline-orders/products"
    print(f"请求 URL: {url}")
    
    try:
        response = requests.get(url, timeout=10)
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"响应: {json.dumps(data, indent=2, ensure_ascii=False)}")
            print("✅ 后端直接访问测试通过")
            return True
        else:
            print(f"❌ 后端直接访问测试失败: {response.text}")
            return False
    except Exception as e:
        print(f"❌ 后端直接访问测试异常: {e}")
        return False

def main():
    print("开始测试简化的产品管理功能...\n")
    
    results = []
    results.append(("公开产品列表 API", test_public_api()))
    results.append(("后端直接访问", test_backend_direct()))
    
    print("\n" + "=" * 60)
    print("测试结果汇总")
    print("=" * 60)
    for name, result in results:
        status = "✅ 通过" if result else "❌ 失败"
        print(f"{name}: {status}")
    
    all_passed = all(result for _, result in results)
    if all_passed:
        print("\n🎉 所有测试通过！")
        sys.exit(0)
    else:
        print("\n⚠️  部分测试失败，请检查")
        sys.exit(1)

if __name__ == "__main__":
    main()

