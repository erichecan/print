"""
把 diverse model CDN URL 插入 shopify_import_recolored.csv 的 position 1/2，
原有图片 position 全部 +2。
"""
import csv
from pathlib import Path
from copy import deepcopy

ROOT = Path(__file__).parent
CSV_IN  = ROOT / "shopify_import_recolored.csv"
CSV_OUT = ROOT / "shopify_import_recolored.csv"

# ── 20 张 CDN URL（从 Shopify Files 复制）─────────────────────────────────────
CDN = {
    "gildan-18000_navy_asian":       "https://cdn.shopify.com/s/files/1/0746/6817/9644/files/gildan-18000_navy_asian.png?v=1779475060",
    "gildan-18000_red_black":        "https://cdn.shopify.com/s/files/1/0746/6817/9644/files/gildan-18000_red_black.png?v=1779475060",
    "gildan-18500_cherry-red_asian": "https://cdn.shopify.com/s/files/1/0746/6817/9644/files/gildan-18500_cherry-red_asian.png?v=1779475060",
    "gildan-18500_black_black":      "https://cdn.shopify.com/s/files/1/0746/6817/9644/files/gildan-18500_black_black.png?v=1779475060",
    "gildan-2000_black_asian":       "https://cdn.shopify.com/s/files/1/0746/6817/9644/files/gildan-2000_black_asian.png?v=1779475060",
    "gildan-2000_cherry-red_black":  "https://cdn.shopify.com/s/files/1/0746/6817/9644/files/gildan-2000_cherry-red_black.png?v=1779475060",
    "gildan-5000_red_asian":         "https://cdn.shopify.com/s/files/1/0746/6817/9644/files/gildan-5000_red_asian.png?v=1779475060",
    "gildan-5000_daisy_black":       "https://cdn.shopify.com/s/files/1/0746/6817/9644/files/gildan-5000_daisy_black.png?v=1779475060",
    "gildan-5400_royal-blue_asian":  "https://cdn.shopify.com/s/files/1/0746/6817/9644/files/gildan-5400_royal-blue_asian.png?v=1779475060",
    "gildan-5400_red_black":         "https://cdn.shopify.com/s/files/1/0746/6817/9644/files/gildan-5400_red_black.png?v=1779475060",
    "gildan-64000_navy_asian":       "https://cdn.shopify.com/s/files/1/0746/6817/9644/files/gildan-64000_navy_asian.png?v=1779475060",
    "gildan-64000_cherry-red_black": "https://cdn.shopify.com/s/files/1/0746/6817/9644/files/gildan-64000_cherry-red_black.png?v=1779475060",
    "gildan-64800_red_asian":        "https://cdn.shopify.com/s/files/1/0746/6817/9644/files/gildan-64800_red_asian.png?v=1779475060",
    "gildan-64800_navy_black":       "https://cdn.shopify.com/s/files/1/0746/6817/9644/files/gildan-64800_navy_black.png?v=1779475060",
    "gildan-64v00_cherry-red_asian": "https://cdn.shopify.com/s/files/1/0746/6817/9644/files/gildan-64v00_cherry-red_asian.png?v=1779475060",
    "gildan-64v00_royal-blue_black": "https://cdn.shopify.com/s/files/1/0746/6817/9644/files/gildan-64v00_royal-blue_black.png?v=1779475060",
    "gildan-8000_daisy_asian":       "https://cdn.shopify.com/s/files/1/0746/6817/9644/files/gildan-8000_daisy_asian.png?v=1779475060",
    "gildan-8000_navy_black":        "https://cdn.shopify.com/s/files/1/0746/6817/9644/files/gildan-8000_navy_black.png?v=1779475060",
    "gildan-h000_white_asian":       "https://cdn.shopify.com/s/files/1/0746/6817/9644/files/gildan-h000_white_asian.png?v=1779475060",
    "gildan-h000_black_black":       "https://cdn.shopify.com/s/files/1/0746/6817/9644/files/gildan-h000_black_black.png?v=1779475060",
}

# ── 10 个成人产品：handle → (asian_key, black_key) ───────────────────────────
PRODUCTS = {
    "gildan-18000-g18000": ("gildan-18000_navy_asian",       "gildan-18000_red_black"),
    "gildan-18500-g18500": ("gildan-18500_cherry-red_asian", "gildan-18500_black_black"),
    "gildan-2000-g2000":   ("gildan-2000_black_asian",       "gildan-2000_cherry-red_black"),
    "gildan-5000-g5000":   ("gildan-5000_red_asian",         "gildan-5000_daisy_black"),
    "gildan-5400-g5400":   ("gildan-5400_royal-blue_asian",  "gildan-5400_red_black"),
    "gildan-64000-g64000": ("gildan-64000_navy_asian",       "gildan-64000_cherry-red_black"),
    "gildan-64800-g64800": ("gildan-64800_red_asian",        "gildan-64800_navy_black"),
    "gildan-64v00-g64v00": ("gildan-64v00_cherry-red_asian", "gildan-64v00_royal-blue_black"),
    "gildan-8000-g8000":   ("gildan-8000_daisy_asian",       "gildan-8000_navy_black"),
    "gildan-h000-gh000":   ("gildan-h000_white_asian",       "gildan-h000_black_black"),
}

def make_image_row(fieldnames, handle, url, position, alt):
    row = {f: "" for f in fieldnames}
    row["URL handle"]       = handle
    row["Product image URL"] = url
    row["Image position"]   = str(position)
    row["Image alt text"]   = alt
    return row

def main():
    with open(CSV_IN, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        rows = list(reader)

    # 提取每个产品的标题（用于 alt text）
    product_title = {}
    for r in rows:
        h = r["URL handle"]
        if h in PRODUCTS and r.get("Title", "").strip() and h not in product_title:
            product_title[h] = r["Title"].strip()

    # Step 1：对 10 个成人产品的所有图片行，position + 2
    for r in rows:
        h = r["URL handle"]
        if h in PRODUCTS and r.get("Image position", "").strip():
            r["Image position"] = str(int(r["Image position"]) + 2)

    # Step 2：为每个产品构建 2 条新行，找到插入位置（该产品第一条含标题的行之后）
    # 策略：找到每个产品第一行的下标，在其后插入 2 条新行
    handled = set()
    insert_map = {}  # index → list of rows to insert after this index
    for i, r in enumerate(rows):
        h = r["URL handle"]
        if h in PRODUCTS and h not in handled:
            handled.add(h)
            title = product_title.get(h, h)
            asian_key, black_key = PRODUCTS[h]
            asian_url = CDN[asian_key]
            black_url = CDN[black_key]
            new_rows = [
                make_image_row(fieldnames, h, asian_url, 1, f"{title} — Asian model — front view"),
                make_image_row(fieldnames, h, black_url, 2, f"{title} — Black model — front view"),
            ]
            insert_map[i] = new_rows

    # Step 3：重建行列表，插入新行
    out_rows = []
    for i, r in enumerate(rows):
        out_rows.append(r)
        if i in insert_map:
            out_rows.extend(insert_map[i])

    # Step 4：写回 CSV
    with open(CSV_OUT, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(out_rows)

    print(f"写入 {CSV_OUT}")
    print(f"原 {len(rows)} 行 → 新 {len(out_rows)} 行（新增 {len(out_rows)-len(rows)} 行）")

    # 验证
    for h, (ak, bk) in PRODUCTS.items():
        with open(CSV_OUT, newline="", encoding="utf-8") as f:
            rdr = csv.DictReader(f)
            img_rows = [(r["Image position"], r["Product image URL"]) for r in rdr
                        if r["URL handle"] == h and r.get("Product image URL","").strip()]
        pos1 = next((url for pos, url in img_rows if pos == "1"), None)
        pos2 = next((url for pos, url in img_rows if pos == "2"), None)
        ok1 = "✅" if pos1 and "diverse" not in pos1 and CDN[ak] in pos1 or (pos1 == CDN[ak]) else "❌"
        ok2 = "✅" if pos2 and (pos2 == CDN[bk]) else "❌"
        p1_display = (pos1 or "")[-50:]
        p2_display = (pos2 or "")[-50:]
        print(f"  {h}: pos1={ok1} {p1_display}  pos2={ok2}")

if __name__ == "__main__":
    main()
