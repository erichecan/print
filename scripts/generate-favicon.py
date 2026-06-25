#!/usr/bin/env python3
"""
Favicon Generator - Precision Craft
[2025-12-03 03:40:00] 基于 canvas-design 设计哲学创建 favicon
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_favicon():
    """创建符合 Precision Craft 设计哲学的 favicon"""
    
    # 创建多个尺寸的 favicon
    sizes = [16, 32, 48, 64, 180, 512]
    
    for size in sizes:
        # 创建画布 - 使用深色背景以突出设计
        img = Image.new('RGBA', (size, size), (0, 0, 0, 0))  # 透明背景
        draw = ImageDraw.Draw(img)
        
        # 设计理念：几何精度 + 打印/设计主题
        # 创建一个抽象的"P"字母，代表 Print/Precision，使用几何形状
        
        # 计算比例
        margin = size * 0.15
        center_x = size / 2
        center_y = size / 2
        radius = size * 0.35
        
        # 主色调：深蓝色 (#1a4d7a) 和金色 (#d4af37) 的对比
        primary_color = (26, 77, 122, 255)  # 深蓝色
        accent_color = (212, 175, 55, 255)   # 金色
        
        # 设计 1: 几何 P 字母（使用矩形和圆形组合）
        if size >= 32:
            # 大尺寸：绘制完整的几何 P
            # 垂直矩形（P 的左边）
            bar_width = size * 0.12
            bar_height = size * 0.7
            bar_x = margin
            bar_y = (size - bar_height) / 2
            
            # 绘制垂直条
            draw.rectangle(
                [bar_x, bar_y, bar_x + bar_width, bar_y + bar_height],
                fill=primary_color
            )
            
            # 绘制上半圆（P 的顶部）
            circle_center_x = bar_x + bar_width + radius * 0.6
            circle_center_y = bar_y + radius
            circle_radius = radius * 0.9
            
            # 绘制半圆（通过绘制完整圆然后覆盖下半部分）
            bbox = [
                circle_center_x - circle_radius,
                circle_center_y - circle_radius,
                circle_center_x + circle_radius,
                circle_center_y + circle_radius
            ]
            draw.pieslice(bbox, 0, 180, fill=primary_color)
            
            # 用背景色覆盖下半部分，创建半圆效果
            draw.rectangle(
                [bbox[0], circle_center_y, bbox[2], bbox[3]],
                fill=(0, 0, 0, 0)
            )
            
            # 添加金色装饰点（代表精度/质量）
            dot_size = size * 0.08
            dot_x = circle_center_x + circle_radius * 0.3
            dot_y = circle_center_y
            draw.ellipse(
                [dot_x - dot_size/2, dot_y - dot_size/2,
                 dot_x + dot_size/2, dot_y + dot_size/2],
                fill=accent_color
            )
            
        else:
            # 小尺寸（16x16）：简化设计，只保留核心元素
            # 绘制简单的几何形状组合
            bar_width = size * 0.15
            bar_height = size * 0.7
            bar_x = margin
            bar_y = (size - bar_height) / 2
            
            # 垂直条
            draw.rectangle(
                [bar_x, bar_y, bar_x + bar_width, bar_y + bar_height],
                fill=primary_color
            )
            
            # 顶部横条（简化版 P）
            top_bar_width = size * 0.4
            top_bar_height = bar_width
            top_bar_x = bar_x + bar_width
            top_bar_y = bar_y
            
            draw.rectangle(
                [top_bar_x, top_bar_y, top_bar_x + top_bar_width, top_bar_y + top_bar_height],
                fill=primary_color
            )
            
            # 小装饰点
            dot_size = size * 0.12
            dot_x = top_bar_x + top_bar_width * 0.6
            dot_y = top_bar_y + top_bar_height / 2
            draw.ellipse(
                [dot_x - dot_size/2, dot_y - dot_size/2,
                 dot_x + dot_size/2, dot_y + dot_size/2],
                fill=accent_color
            )
        
        # 保存文件
        output_path = f'favicon-{size}x{size}.png'
        img.save(output_path, 'PNG', optimize=True)
        print(f"✅ Created {output_path}")
    
    # 创建标准 favicon.ico（包含多个尺寸）
    # 使用 16x16 和 32x32 作为主要尺寸
    ico_sizes = [16, 32]
    ico_images = []
    
    for ico_size in ico_sizes:
        img = Image.new('RGBA', (ico_size, ico_size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        
        # 使用简化设计
        margin = ico_size * 0.15
        bar_width = ico_size * 0.15
        bar_height = ico_size * 0.7
        bar_x = margin
        bar_y = (ico_size - bar_height) / 2
        
        # 垂直条
        draw.rectangle(
            [bar_x, bar_y, bar_x + bar_width, bar_y + bar_height],
            fill=primary_color
        )
        
        # 顶部横条
        top_bar_width = ico_size * 0.4
        top_bar_height = bar_width
        top_bar_x = bar_x + bar_width
        top_bar_y = bar_y
        
        draw.rectangle(
            [top_bar_x, top_bar_y, top_bar_x + top_bar_width, top_bar_y + top_bar_height],
            fill=primary_color
        )
        
        # 装饰点
        dot_size = ico_size * 0.12
        dot_x = top_bar_x + top_bar_width * 0.6
        dot_y = top_bar_y + top_bar_height / 2
        draw.ellipse(
            [dot_x - dot_size/2, dot_y - dot_size/2,
             dot_x + dot_size/2, dot_y + dot_size/2],
            fill=accent_color
        )
        
        ico_images.append(img)
    
    # 保存为 ICO 格式
    ico_images[0].save(
        'favicon.ico',
        format='ICO',
        sizes=[(16, 16), (32, 32)],
        append_images=ico_images[1:] if len(ico_images) > 1 else []
    )
    print("✅ Created favicon.ico")
    
    print("\n🎨 Favicon generation complete!")
    print("📁 Files created:")
    print("   - favicon.ico (multi-size ICO file)")
    for size in sizes:
        print(f"   - favicon-{size}x{size}.png")

if __name__ == '__main__':
    create_favicon()

