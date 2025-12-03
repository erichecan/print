#!/usr/bin/env python3
"""
Mobile Home Visual Assets Generator
[2025-01-29 12:00:00] 基于 "Vibrant Minimalism" 设计哲学创建移动端首页视觉元素
"""

from PIL import Image, ImageDraw, ImageFont
import os
import math

# [2025-01-29 12:00:00] 设计哲学：Vibrant Minimalism
# 核心颜色：深蓝色到电青色渐变，温暖橙色到冷紫色
PRIMARY_GRADIENT = [
    (0, 102, 204),    # #0066cc - 深蓝色
    (0, 184, 169),    # #00b8a9 - 电青色
]
ACCENT_COLORS = [
    (255, 140, 0),    # #ff8c00 - 温暖橙色
    (138, 43, 226),   # #8a2be2 - 冷紫色
]

def create_gradient_background(width, height, colors, direction='horizontal'):
    """创建渐变背景"""
    img = Image.new('RGB', (width, height))
    draw = ImageDraw.Draw(img)
    
    if direction == 'horizontal':
        for x in range(width):
            ratio = x / width
            r = int(colors[0][0] * (1 - ratio) + colors[1][0] * ratio)
            g = int(colors[0][1] * (1 - ratio) + colors[1][1] * ratio)
            b = int(colors[0][2] * (1 - ratio) + colors[1][2] * ratio)
            draw.line([(x, 0), (x, height)], fill=(r, g, b))
    elif direction == 'vertical':
        for y in range(height):
            ratio = y / height
            r = int(colors[0][0] * (1 - ratio) + colors[1][0] * ratio)
            g = int(colors[0][1] * (1 - ratio) + colors[1][1] * ratio)
            b = int(colors[0][2] * (1 - ratio) + colors[1][2] * ratio)
            draw.line([(0, y), (width, y)], fill=(r, g, b))
    else:  # diagonal (135deg)
        # 使用垂直渐变 + 旋转效果模拟对角线
        # 为了性能，我们使用垂直渐变，效果类似
        for y in range(height):
            ratio = y / height
            r = int(colors[0][0] * (1 - ratio) + colors[1][0] * ratio)
            g = int(colors[0][1] * (1 - ratio) + colors[1][1] * ratio)
            b = int(colors[0][2] * (1 - ratio) + colors[1][2] * ratio)
            draw.line([(0, y), (width, y)], fill=(r, g, b))
    
    return img

def create_hero_image():
    """创建 Hero 图 - 大横幅促销背景"""
    # 移动端尺寸：375x200 (标准移动端宽度)
    width, height = 750, 400  # 2x for retina
    
    # 创建渐变背景
    img = create_gradient_background(width, height, PRIMARY_GRADIENT, 'diagonal')
    
    # 添加几何装饰元素
    draw = ImageDraw.Draw(img, 'RGBA')
    
    # 添加圆形装饰（右上角）
    circle_radius = 150
    circle_x = width - 100
    circle_y = 50
    draw.ellipse(
        [circle_x - circle_radius, circle_y - circle_radius,
         circle_x + circle_radius, circle_y + circle_radius],
        fill=(255, 255, 255, 30)  # 半透明白色
    )
    
    # 添加三角形装饰（左下角）
    triangle_size = 120
    triangle_points = [
        (50, height - 50),
        (50 + triangle_size, height - 50),
        (50 + triangle_size / 2, height - 50 - triangle_size * 0.866)
    ]
    draw.polygon(triangle_points, fill=(255, 140, 0, 40))  # 半透明橙色
    
    # 添加矩形装饰（中间）
    rect_width = 200
    rect_height = 80
    rect_x = width / 2 - rect_width / 2
    rect_y = height / 2 - rect_height / 2
    draw.rectangle(
        [rect_x, rect_y, rect_x + rect_width, rect_y + rect_height],
        fill=(138, 43, 226, 25)  # 半透明紫色
    )
    
    # 保存
    output_dir = 'apps/web/public/assets/hero'
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, 'hero-mobile-gradient.png')
    img.save(output_path, 'PNG', optimize=True)
    print(f"✅ Created hero image: {output_path}")
    
    return output_path

def create_category_icon(category_name, icon_type='geometric'):
    """创建分类图标 - 使用几何形状"""
    size = 200  # 2x for retina
    
    # 创建透明背景
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # 根据分类名称选择颜色和形状
    category_colors = {
        'tshirt': PRIMARY_GRADIENT[0],
        'sweatshirt': PRIMARY_GRADIENT[1],
        'hat': ACCENT_COLORS[0],
        'bag': ACCENT_COLORS[1],
        'drinkware': PRIMARY_GRADIENT[0],
        'tech': PRIMARY_GRADIENT[1],
        'office': ACCENT_COLORS[0],
        'polo': ACCENT_COLORS[1],
        'workwear': PRIMARY_GRADIENT[0],
        'activewear': PRIMARY_GRADIENT[1],
        'trade-show': ACCENT_COLORS[0],
        'jacket': ACCENT_COLORS[1],
    }
    
    # 选择颜色
    color = category_colors.get(category_name.lower().replace('-', '').replace(' ', ''), PRIMARY_GRADIENT[0])
    
    # 创建几何图标
    center_x, center_y = size / 2, size / 2
    margin = size * 0.2
    
    if icon_type == 'geometric':
        # 圆形图标
        radius = size * 0.3
        draw.ellipse(
            [center_x - radius, center_y - radius,
             center_x + radius, center_y + radius],
            fill=color + (255,),  # 添加 alpha
            outline=(255, 255, 255, 200),
            width=4
        )
        
        # 内部装饰
        inner_radius = radius * 0.6
        draw.ellipse(
            [center_x - inner_radius, center_y - inner_radius,
             center_x + inner_radius, center_y + inner_radius],
            fill=(255, 255, 255, 100)
        )
    
    # 保存
    output_dir = 'apps/web/public/assets/categories'
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f'icon-{category_name.lower().replace(" ", "-")}.png')
    img.save(output_path, 'PNG', optimize=True)
    print(f"✅ Created category icon: {output_path}")
    
    return output_path

def create_all_category_icons():
    """创建所有分类图标"""
    categories = [
        'tshirt',
        'sweatshirt',
        'hat',
        'bag',
        'drinkware',
        'tech',
        'office',
        'polo',
        'workwear',
        'activewear',
        'trade-show',
        'jacket',
    ]
    
    for category in categories:
        create_category_icon(category)

def main():
    """主函数"""
    print("🎨 Generating mobile home visual assets...")
    print("📐 Design Philosophy: Vibrant Minimalism\n")
    
    # 创建 hero 图
    create_hero_image()
    
    # 创建所有分类图标
    create_all_category_icons()
    
    print("\n✨ All assets generated successfully!")
    print("📁 Output directory: apps/web/public/assets/")

if __name__ == '__main__':
    main()

