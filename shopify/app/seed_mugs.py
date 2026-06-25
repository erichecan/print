"""Insert mug records into products.db.

Variants:
  - 11oz / 15oz white ceramic (all-white exterior + interior + handle)
  - 11oz / 15oz black-accent ceramic (white exterior, black interior + handle)

These products have no supplier URL — they are generated directly via
gpt-image-2 text-to-image (no reference image). We use synthetic
local:// URLs to satisfy the unique (supplier_url, color) constraint.

Run once before `python app/pipeline.py`:
    python app/seed_mugs.py
"""

from __future__ import annotations

if __package__ in {None, ""}:
    import sys
    from pathlib import Path

    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db import upsert_scraped_product

MUG_PRODUCTS = [
    {
        "supplier_url": "local://mug-11oz-white",
        "product_name": "11oz White Ceramic Coffee Mug",
        "brand": "Generic",
        "style_number": "MUG-11OZ",
        "category": "mug",
        "color": "white",
        "description": "11oz white ceramic coffee mug, classic shape, C-handle, dishwasher safe.",
        "original_image_url": "",
        "original_image_path": "",
        "status": "scraped",
    },
    {
        "supplier_url": "local://mug-15oz-white",
        "product_name": "15oz White Ceramic Coffee Mug",
        "brand": "Generic",
        "style_number": "MUG-15OZ",
        "category": "mug",
        "color": "white",
        "description": "15oz white ceramic coffee mug, classic shape, C-handle, dishwasher safe.",
        "original_image_url": "",
        "original_image_path": "",
        "status": "scraped",
    },
    {
        "supplier_url": "local://mug-11oz-black-accent",
        "product_name": "11oz Black-Accent Ceramic Coffee Mug",
        "brand": "Generic",
        "style_number": "MUG-11OZ-BLK",
        "category": "mug",
        "color": "black-accent",
        "description": "11oz ceramic coffee mug, white exterior, black interior and black C-handle, classic shape, dishwasher safe.",
        "original_image_url": "",
        "original_image_path": "",
        "status": "scraped",
    },
    {
        "supplier_url": "local://mug-15oz-black-accent",
        "product_name": "15oz Black-Accent Ceramic Coffee Mug",
        "brand": "Generic",
        "style_number": "MUG-15OZ-BLK",
        "category": "mug",
        "color": "black-accent",
        "description": "15oz ceramic coffee mug, white exterior, black interior and black C-handle, classic shape, dishwasher safe.",
        "original_image_url": "",
        "original_image_path": "",
        "status": "scraped",
    },
]


def main() -> None:
    for product in MUG_PRODUCTS:
        pid = upsert_scraped_product(product)
        print(f"  upserted #{pid:06d}  {product['product_name']}")
    print("\nDone. Run `python app/pipeline.py` to generate mug images.")


if __name__ == "__main__":
    main()
