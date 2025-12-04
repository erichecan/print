#!/usr/bin/env python3
"""
Custom Ink 资源爬取脚本
[2025-12-04] 爬取 Custom Ink Design Lab 所需的所有资源：
- 图标（Rail 工具图标、操作按钮图标等）
- 产品图片（不同颜色的 T恤图片）
- 模特图片（中央 Canvas 区域的模特展示图）
- 艺术品资源（Art 分类中的图片）
"""

import os
import requests
from pathlib import Path
from urllib.parse import urljoin, urlparse
import json
import time
from typing import List, Dict, Optional

# 基础配置
BASE_URL = "https://www.customink.com"
OUTPUT_DIR = Path(__file__).parent.parent / "customink-images"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# 目录结构
ICONS_DIR = OUTPUT_DIR / "icons"
PRODUCTS_DIR = OUTPUT_DIR / "products"
MODELS_DIR = OUTPUT_DIR / "models"
ART_DIR = OUTPUT_DIR / "art"

for dir_path in [ICONS_DIR, PRODUCTS_DIR, MODELS_DIR, ART_DIR]:
    dir_path.mkdir(parents=True, exist_ok=True)

# User-Agent 头
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.customink.com/",
}

def download_file(url: str, filepath: Path, retries: int = 3) -> bool:
    """下载文件"""
    try:
        response = requests.get(url, headers=HEADERS, timeout=30, stream=True)
        response.raise_for_status()
        
        filepath.parent.mkdir(parents=True, exist_ok=True)
        with open(filepath, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        print(f"✓ 下载成功: {filepath.name}")
        return True
    except Exception as e:
        if retries > 0:
            print(f"✗ 下载失败，重试中... ({retries}): {e}")
            time.sleep(2)
            return download_file(url, filepath, retries - 1)
        print(f"✗ 下载失败: {url} - {e}")
        return False

def scrape_icons():
    """爬取图标"""
    print("\n=== 开始爬取图标 ===")
    
    # Rail 工具图标
    rail_icons = {
        "upload": "https://www.customink.com/ndx/assets/icons/upload.svg",
        "add-text": "https://www.customink.com/ndx/assets/icons/add-text.svg",
        "add-art": "https://www.customink.com/ndx/assets/icons/add-art.svg",
        "product-colors": "https://www.customink.com/ndx/assets/icons/product-colors.svg",
        "add-names": "https://www.customink.com/ndx/assets/icons/add-names.svg",
    }
    
    # 操作按钮图标
    action_icons = {
        "center": "https://www.customink.com/ndx/assets/icons/center.svg",
        "layering": "https://www.customink.com/ndx/assets/icons/layering.svg",
        "flip": "https://www.customink.com/ndx/assets/icons/flip.svg",
        "duplicate": "https://www.customink.com/ndx/assets/icons/duplicate.svg",
        "crop": "https://www.customink.com/ndx/assets/icons/crop.svg",
        "undo": "https://www.customink.com/ndx/assets/icons/undo.svg",
        "redo": "https://www.customink.com/ndx/assets/icons/redo.svg",
    }
    
    all_icons = {**rail_icons, **action_icons}
    
    for icon_name, icon_url in all_icons.items():
        filepath = ICONS_DIR / f"{icon_name}.svg"
        if not filepath.exists():
            download_file(icon_url, filepath)
            time.sleep(0.5)
        else:
            print(f"○ 已存在: {icon_name}.svg")

def scrape_product_images():
    """爬取产品图片（不同颜色）"""
    print("\n=== 开始爬取产品图片 ===")
    
    # 产品 ID 和颜色映射（根据 Custom Ink 分析报告）
    # URL 模式: https://mms-images-prod.imgix.net/mms/images/catalog/{product-id}/colors/{color-id}/views/alt/{view}_{size}.png
    products = {
        "gildan-softstyle-tshirt": {
            "product_id": "6a62c76ef0978853a20391b6c32da4fe",
            "colors": {
                "white": "176100",
                "navy": "176101", 
                "maroon": "176102",
                "black": "176103",
                "heather-grey": "176104",
                "heather-dark-grey": "176105",
            }
        }
    }
    
    # 视图和尺寸组合
    views = ["front", "back"]
    sizes = ["large_extended", "medium_extended"]
    
    for product_name, product_info in products.items():
        product_dir = PRODUCTS_DIR / product_name
        product_dir.mkdir(parents=True, exist_ok=True)
        
        for color_name, color_id in product_info["colors"].items():
            color_dir = product_dir / color_name
            color_dir.mkdir(parents=True, exist_ok=True)
            
            # 生成所有视图和尺寸的 URL
            for view in views:
                for size in sizes:
                    # 使用正确的 URL 模式
                    view_url = f"https://mms-images-prod.imgix.net/mms/images/catalog/{product_info['product_id']}/colors/{color_id}/views/alt/{view}_{size}.png"
                    filepath = color_dir / f"{view}_{size}.png"
                    
                    if not filepath.exists():
                        if download_file(view_url, filepath):
                            time.sleep(0.3)
                    else:
                        print(f"○ 已存在: {product_name}/{color_name}/{view}_{size}.png")

def scrape_model_images():
    """爬取模特图片（中央 Canvas 区域）"""
    print("\n=== 开始爬取模特图片 ===")
    
    # 模特图片可能使用与产品图片相同的 URL 模式，或者有单独的路径
    # 先尝试使用产品图片的 front_large_extended 作为模特图片
    product_id = "6a62c76ef0978853a20391b6c32da4fe"
    colors = {
        "white": "176100",
        "navy": "176101",
        "maroon": "176102",
        "black": "176103",
        "heather-grey": "176104",
    }
    
    for color_name, color_id in colors.items():
        # 使用 front_large_extended 作为模特展示图
        model_url = f"https://mms-images-prod.imgix.net/mms/images/catalog/{product_id}/colors/{color_id}/views/alt/front_large_extended.png?w=2000&q=100"
        filepath = MODELS_DIR / f"model-{color_name}.png"
        
        if not filepath.exists():
            if download_file(model_url, filepath):
                time.sleep(0.3)
        else:
            print(f"○ 已存在: model-{color_name}.png")

def scrape_art_assets():
    """爬取艺术品资源"""
    print("\n=== 开始爬取艺术品资源 ===")
    
    # Art 分类
    art_categories = {
        "animals": [
            "lion", "panda", "frog", "unicorn", "bat", "monkey",
            "cobra", "pegasus", "snake", "dolphin", "hedgehog",
            "spider", "rabbit", "horse", "fox", "fish"
        ],
        "emojis": [
            "smile", "star", "heart", "fire", "thumbs-up"
        ]
    }
    
    for category, items in art_categories.items():
        category_dir = ART_DIR / category
        category_dir.mkdir(parents=True, exist_ok=True)
        
        for item in items:
            # 尝试不同的 URL 格式
            possible_urls = [
                f"https://www.customink.com/ndx/assets/art/{category}/{item}.png",
                f"https://www.customink.com/ndx/assets/art/{category}/{item}.svg",
                f"https://www.customink.com/ndx/assets/artwork/{category}/{item}.png",
            ]
            
            filepath = category_dir / f"{item}.png"
            if filepath.exists():
                print(f"○ 已存在: {category}/{item}.png")
                continue
            
            downloaded = False
            for url in possible_urls:
                if download_file(url, filepath):
                    downloaded = True
                    time.sleep(0.5)
                    break
            
            if not downloaded:
                print(f"✗ 无法下载: {category}/{item}")

def main():
    """主函数"""
    print("=" * 60)
    print("Custom Ink 资源爬取脚本")
    print("=" * 60)
    
    try:
        scrape_icons()
        scrape_product_images()
        scrape_model_images()
        scrape_art_assets()
        
        print("\n" + "=" * 60)
        print("✓ 爬取完成！")
        print(f"资源保存在: {OUTPUT_DIR}")
        print("=" * 60)
        
    except KeyboardInterrupt:
        print("\n\n✗ 用户中断")
    except Exception as e:
        print(f"\n\n✗ 发生错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()

