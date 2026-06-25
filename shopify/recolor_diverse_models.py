"""
把 diverse_models/ 里的 20 张 model 锚图换色，
生成对应产品所有颜色的 model 前视图。

彩色锚图 → 换色到其余所有颜色 (16/20)
无彩色锚图 (黑/白) → 跳过换色，仅保留原图记录 (4/20)

输出: diverse_models/recolored/{slug}_{color_code}_{model_type}.png
      diverse_models/recolored/manifest.csv   (待填入 shopify_url)

运行: python3 recolor_diverse_models.py
      python3 recolor_diverse_models.py --force   # 覆盖已存在文件
"""
import argparse
import csv
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))

from app.db import list_products
from app.paths import resolve_root_path
from app.recolor import recolor_image, sample_target_color

DIVERSE_DIR = Path(__file__).parent / "diverse_models"
OUT_DIR = DIVERSE_DIR / "recolored"

# (handle, model_type, anchor_color_code, anchor_filename)
ANCHORS = [
    ("gildan-18000-g18000", "asian", "032", "gildan-18000_navy_asian.png"),
    ("gildan-18000-g18000", "black", "040", "gildan-18000_red_black.png"),
    ("gildan-18500-g18500", "asian", "194", "gildan-18500_cherry-red_asian.png"),
    ("gildan-18500-g18500", "black", "036", "gildan-18500_black_black.png"),
    ("gildan-2000-g2000",   "asian", "036", "gildan-2000_black_asian.png"),
    ("gildan-2000-g2000",   "black", "194", "gildan-2000_cherry-red_black.png"),
    ("gildan-5000-g5000",   "asian", "040", "gildan-5000_red_asian.png"),
    ("gildan-5000-g5000",   "black", "098", "gildan-5000_daisy_black.png"),
    ("gildan-5400-g5400",   "asian", "051", "gildan-5400_royal-blue_asian.png"),
    ("gildan-5400-g5400",   "black", "040", "gildan-5400_red_black.png"),
    ("gildan-64000-g64000", "asian", "032", "gildan-64000_navy_asian.png"),
    ("gildan-64000-g64000", "black", "194", "gildan-64000_cherry-red_black.png"),
    ("gildan-64800-g64800", "asian", "040", "gildan-64800_red_asian.png"),
    ("gildan-64800-g64800", "black", "032", "gildan-64800_navy_black.png"),
    ("gildan-64v00-g64v00", "asian", "194", "gildan-64v00_cherry-red_asian.png"),
    ("gildan-64v00-g64v00", "black", "051", "gildan-64v00_royal-blue_black.png"),
    ("gildan-8000-g8000",   "asian", "098", "gildan-8000_daisy_asian.png"),
    ("gildan-8000-g8000",   "black", "032", "gildan-8000_navy_black.png"),
    ("gildan-h000-gh000",   "asian", "030", "gildan-h000_white_asian.png"),
    ("gildan-h000-gh000",   "black", "036", "gildan-h000_black_black.png"),
]

# handle → URL 片段，用于从 products.db 匹配该产品的所有颜色行
# 匹配规则：片段在 supplier_url 中出现，且不是 youth/women 款
HANDLE_URL_FRAG = {
    "gildan-18000-g18000": "/18000-",
    "gildan-18500-g18500": "/18500-",
    "gildan-2000-g2000":   "/2000-",
    "gildan-5000-g5000":   "/5000-",
    "gildan-5400-g5400":   "/5400-",
    "gildan-64000-g64000": "/64000-",
    "gildan-64800-g64800": "/64800-",
    "gildan-64v00-g64v00": "/64v00-",
    "gildan-8000-g8000":   "/8000-",
    "gildan-h000-gh000":   "/h000-",
}


def load_product_map() -> dict[str, list[dict]]:
    """Returns {handle: [db_product_rows]} for each of the 10 adult products."""
    all_prods = list_products(statuses=["scraped"])
    result: dict[str, list[dict]] = {}
    for handle, frag in HANDLE_URL_FRAG.items():
        result[handle] = [
            p for p in all_prods
            if frag in (p.get("supplier_url") or "")
            and "youth" not in (p.get("supplier_url") or "")
            and "women" not in (p.get("supplier_url") or "")
        ]
    return result


def main(force: bool = False) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    product_map = load_product_map()

    manifest_rows: list[list[str]] = [
        ["handle", "model_type", "color_code", "local_file", "shopify_url"]
    ]
    total_ok = total_skip = total_fail = 0

    for handle, model_type, anchor_code, anchor_filename in ANCHORS:
        anchor_path = DIVERSE_DIR / anchor_filename
        if not anchor_path.exists():
            print(f"⚠️  anchor missing: {anchor_path.name}")
            continue

        # Record the anchor image itself (original, no recolor needed)
        manifest_rows.append([handle, model_type, anchor_code, str(anchor_path), ""])

        # Detect anchor hue
        anchor_sample = sample_target_color(anchor_path)
        if anchor_sample["category"] != "chromatic":
            print(
                f"\n[{anchor_filename}]  {anchor_sample['category']} anchor "
                f"— skip recolor (HSV 换色对无彩色无效)"
            )
            total_skip += 1
            continue

        anchor_hue = float(anchor_sample["hue"])
        anchor_arr = np.asarray(
            Image.open(anchor_path).convert("RGB"), dtype=np.float32
        ) / 255.0

        db_rows = product_map.get(handle, [])
        print(
            f"\n[{anchor_filename}]  hue≈{anchor_hue:.0f}°  "
            f"→  {len(db_rows)} DB 颜色"
        )

        for p in db_rows:
            color_code = p["color"]
            if color_code == anchor_code:
                continue  # 已有原图

            slug = handle.split("-g")[0]
            out_path = OUT_DIR / f"{slug}_{color_code}_{model_type}.png"

            if out_path.exists() and not force:
                print(f"  skip  {out_path.name}  (exists)")
                manifest_rows.append([handle, model_type, color_code, str(out_path), ""])
                total_skip += 1
                continue

            ref_path = resolve_root_path(p.get("original_image_path"))
            if not ref_path or not ref_path.exists():
                print(f"  skip  {color_code}: no supplier reference")
                total_skip += 1
                continue

            target = sample_target_color(ref_path)
            cat = target["category"]
            info = (
                f"hue={target['hue']:.0f}° sat={target['sat']:.2f}"
                if cat == "chromatic"
                else f"{cat} v={target['value']:.2f}"
            )

            try:
                recolored = recolor_image(anchor_arr, anchor_hue, target)
                out_img = (recolored * 255.0).clip(0, 255).astype(np.uint8)
                Image.fromarray(out_img).save(out_path, optimize=True)
                print(f"  ✅  {out_path.name}  [{info}]")
                manifest_rows.append([handle, model_type, color_code, str(out_path), ""])
                total_ok += 1
            except Exception as exc:
                print(f"  ❌  {color_code}  {exc}")
                total_fail += 1

    manifest_path = OUT_DIR / "manifest.csv"
    with open(manifest_path, "w", newline="", encoding="utf-8") as f:
        csv.writer(f).writerows(manifest_rows)

    generated = total_ok
    print(f"\n{'─'*60}")
    print(f"生成: {generated}  跳过: {total_skip}  失败: {total_fail}")
    print(f"Manifest: {manifest_path}  ({len(manifest_rows)-1} 条)")
    print(
        "\n下一步:\n"
        "  1. 预览 diverse_models/recolored/ 里的图片确认换色效果\n"
        "  2. 把这批图片上传到 Shopify Files\n"
        "  3. 填入 manifest.csv 的 shopify_url 列\n"
        "  4. 运行 update_csv_per_color.py 更新 shopify_import_recolored.csv"
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="覆盖已存在文件")
    args = parser.parse_args()
    main(force=args.force)
