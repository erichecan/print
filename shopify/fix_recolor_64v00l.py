"""针对 64V00L 产品的专项 recolor 修复脚本。

问题：Cherry Red (194) anchor hue≈350° 与肤色 hue 5-45° 严重重叠，
导致换色时皮肤被部分脱饱和或色移，出现「磨皮」效果。

修复：
1. 大幅扩展肤色识别范围（包含 hue 340°-55° 的红橙暖调全域）
2. 对肤色 mask 做形态学膨胀（5px），保护衣服边缘
3. 只处理 4 个模特视角（front/back/left/right）
4. 强制覆写，重新生成 IDs: 6 (030 White), 73 (032 Navy), 74 (036 Black)
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import numpy as np
from PIL import Image
from scipy.ndimage import binary_dilation

from app.generate import generated_path
from app.paths import GENERATED_DIR
from app.recolor import (
    rgb_to_hsv,
    hsv_to_rgb,
    garment_mask_weight,
    sample_target_color,
    detect_anchor_hue,
)
from app.db import list_products

# 只处理这三个问题颜色的 4 个模特视角
TARGET_IDS = [6, 73, 74]
MODEL_VIEWS = ["front", "back", "left", "right"]


def improved_skin_mask(h: np.ndarray, s: np.ndarray, v: np.ndarray) -> np.ndarray:
    """比原版宽泛得多的肤色检测，专为红色 anchor 设计。

    原版：hue 5-45°，遗漏了 hue 0-5° 和 45-55° 的暖调肤色，
    以及 hue 340-360° 的偏红高光。
    """
    s_ok = (s > 0.06) & (s < 0.78)
    v_ok = (v > 0.12) & (v < 0.97)

    # 标准暖色肤调 + 延伸范围
    warm = (h > 0.0) & (h < 58.0) & s_ok & v_ok
    # 偏红高光（hue 330-360°，常见于 AI 生成的皮肤）
    near_red = (h > 330.0) & s_ok & v_ok

    return warm | near_red


def recolor_with_better_skin(
    rgb: np.ndarray,
    anchor_hue: float,
    target: dict,
    hue_radius: float = 50.0,       # 比原版 55° 略收窄，减少 anchor 外溢
    sat_threshold: float = 0.32,    # 比原版 0.28 略提高，过滤低饱和边缘
    sat_feather: float = 0.10,
    skin_dilate_px: int = 5,        # 形态学膨胀：保护皮肤与衣物交界处
) -> np.ndarray:
    hsv = rgb_to_hsv(rgb)
    weight = garment_mask_weight(
        hsv, anchor_hue, hue_radius, sat_threshold, sat_feather
    )

    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    skin_bool = improved_skin_mask(h, s, v)

    # 形态学膨胀：皮肤区域向外扩展 skin_dilate_px 个像素，保护皮肤边缘
    if skin_dilate_px > 0:
        struct = np.ones((skin_dilate_px * 2 + 1, skin_dilate_px * 2 + 1), dtype=bool)
        skin_dilated = binary_dilation(skin_bool, structure=struct)
    else:
        skin_dilated = skin_bool

    weight = weight * (~skin_dilated).astype(np.float32)

    inside = weight > 0.5
    if inside.sum() < 50:
        print("    警告：garment mask 内有效像素 < 50，跳过此视角")
        return rgb

    anchor_med_s = max(float(np.median(hsv[..., 1][inside])), 0.05)
    anchor_med_v = max(float(np.median(hsv[..., 2][inside])), 0.05)

    new_hsv = hsv.copy()
    cat = target["category"]

    if cat == "chromatic":
        sat_scale = target["sat"] / anchor_med_s
        val_scale = target["value"] / anchor_med_v
        new_hsv[..., 0] = target["hue"]
        new_hsv[..., 1] = np.clip(hsv[..., 1] * sat_scale, 0.0, 1.0)
        new_hsv[..., 2] = np.clip(hsv[..., 2] * val_scale, 0.0, 1.0)
    elif cat == "white":
        val_shift = target["value"] - anchor_med_v
        new_hsv[..., 1] = 0.0
        new_hsv[..., 2] = np.clip(hsv[..., 2] + val_shift, 0.0, 1.0)
    elif cat == "black":
        val_scale = target["value"] / anchor_med_v
        new_hsv[..., 1] = 0.0
        new_hsv[..., 2] = np.clip(hsv[..., 2] * val_scale, 0.0, 1.0)
    else:  # grey
        val_shift = target["value"] - anchor_med_v
        new_hsv[..., 1] = 0.0
        new_hsv[..., 2] = np.clip(hsv[..., 2] + val_shift, 0.0, 1.0)

    new_rgb = hsv_to_rgb(new_hsv)
    w = weight[..., None]
    return rgb * (1.0 - w) + new_rgb * w


def main() -> None:
    products = list_products()
    by_id = {p["id"]: p for p in products}

    # 找 anchor（Cherry Red 194，ID 75）
    anchor = next((p for p in products if '64v00l' in p.get('supplier_url', '') and p['color'] == '194'), None)
    if anchor is None:
        raise SystemExit("找不到 anchor 产品（color=194）")

    anchor_hue = detect_anchor_hue(anchor)
    print(f"Anchor: #{anchor['id']:06d} color={anchor['color']} hue≈{anchor_hue:.1f}°\n")

    for tid in TARGET_IDS:
        product = by_id.get(tid)
        if product is None:
            print(f"产品 #{tid} 不在数据库中，跳过")
            continue

        ref_path = Path("data/originals") / Path(product["original_image_path"]).name
        if not ref_path.exists():
            print(f"#{tid} 原始图片不存在：{ref_path}，跳过")
            continue

        target = sample_target_color(ref_path)
        cat = target['category']
        if cat == 'chromatic':
            print(f">> #{tid:06d} color={product['color']} target=hue {target['hue']:.0f}° sat={target['sat']:.2f} v={target['value']:.2f}")
        else:
            print(f">> #{tid:06d} color={product['color']} target={cat} v={target['value']:.2f}")

        for view_key in MODEL_VIEWS:
            anchor_path = generated_path(anchor["id"], anchor.get("color") or "", view_key)
            out_path = generated_path(product["id"], product.get("color") or "", view_key)

            if not anchor_path.exists():
                print(f"   missing anchor: {anchor_path}")
                continue

            anchor_arr = np.asarray(
                Image.open(anchor_path).convert("RGB"), dtype=np.float32
            ) / 255.0
            recolored = recolor_with_better_skin(anchor_arr, anchor_hue, target)
            out_img = (recolored * 255.0).clip(0, 255).astype(np.uint8)
            out_path.parent.mkdir(parents=True, exist_ok=True)
            Image.fromarray(out_img).save(out_path, quality=92)
            print(f"   ok   {view_key} → {out_path.relative_to(GENERATED_DIR.parent)}")

    print("\n完成。请打开 review.html 检查效果。")
    print("若效果仍不理想，可考虑对这 3 个颜色使用 API 直接重新生成。")


if __name__ == "__main__":
    main()
