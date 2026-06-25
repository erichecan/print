"""Build a Shopify-importable products.csv from the local DB + generated
images. Preserves the exact 57-column schema of `product_template.csv` in
the repo root.

Per (product, color) we emit:
- N variant rows (one per size from sizes.json), first carries product fields + first image
- 5 image-only rows (views 2-6)
- 0-2 female image rows (if uploaded, for unisex products)"""

from __future__ import annotations

if __package__ in {None, ""}:
    import sys
    from pathlib import Path

    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import argparse
import csv
import json
import re
from collections import defaultdict
from pathlib import Path
from typing import Any

from app.db import list_products
from app.paths import GENERATED_DIR, ROOT_DIR
from app.prompts import (
    GILDAN_CODE_TO_NAME,
    VIEWS,
    guess_garment,
    is_youth_garment,
    model_phrase_for,
)


VIEWS_ORDERED = ["front", "back", "left", "right", "neckline", "fabric"]
VIEW_LABEL = {
    "front": "front view",
    "back": "back view",
    "left": "left side view",
    "right": "right side view",
    "neckline": "neckline detail",
    "fabric": "fabric detail",
}


# Style-number → (Gildan® MODEL title, subtitle shown on product page).
# Title format matches what Gildan displays in the product name heading.
MODEL_TITLES: dict[str, tuple[str, str]] = {
    "G18000":  ("Gildan® 18000",   "Adult Crewneck Sweatshirt"),
    "G18500":  ("Gildan® 18500",   "Adult Hooded Sweatshirt"),
    "G18500B": ("Gildan® 18500B",  "Youth Hooded Sweatshirt"),
    "G2000":   ("Gildan® 2000",    "Adult T-Shirt"),
    "G5000":   ("Gildan® 5000",    "Adult T-Shirt"),
    "G5000B":  ("Gildan® 5000B",   "Youth T-Shirt"),
    "G5400":   ("Gildan® 5400",    "Adult Long Sleeve T-Shirt"),
    "G64000":  ("Gildan® 64000",   "Adult T-Shirt"),
    "G64000L": ("Gildan® 64000L",  "Women's T-Shirt"),
    "G64800":  ("Gildan® 64800",   "Adult Pique Polo"),
    "G64V00":  ("Gildan® 64V00",   "Adult V-Neck T-Shirt"),
    "G64V00L": ("Gildan® 64V00L",  "Women's V-Neck T-Shirt"),
    "G8000":   ("Gildan® 8000",    "Adult T-Shirt"),
    "GH000":   ("Gildan® H000",    "Adult T-Shirt"),
}

# Manual overrides for style numbers where the scraper can't derive them
# from the page's JSON-LD alone.
PRODUCT_OVERRIDES: dict[str, dict[str, str]] = {
    "https://www.gildan.com/us/en/2000-adult-t-shirt-en_us/":        {"style_number": "G2000"},
    "https://www.gildan.com/us/en/5000-adult-t-shirt-en_us/":        {"style_number": "G5000"},
    "https://www.gildan.com/us/en/64000-adult-t-shirt-en_us/":       {"style_number": "G64000"},
    "https://www.gildan.com/us/en/64800-adult-pique-polo-en_us/":    {"style_number": "G64800"},
    "https://www.gildan.com/us/en/64v00-adult-v-neck-t-shirt-en_us/":  {"style_number": "G64V00"},
    "https://www.gildan.com/us/en/64v00l-women-s-v-neck-t-shirt-en_us/": {"style_number": "G64V00L"},
    "https://www.gildan.com/us/en/h000-adult-t-shirt-en_us/":        {"style_number": "GH000"},
}

# Per-style product features (bullet points displayed in Shopify description).
PRODUCT_FEATURES: dict[str, list[str]] = {
    "G2000": [
        "100% U.S. Cotton (Heather: 90/10 cotton/polyester; Sport Grey: 90/10)",
        "Pre-shrunk for a lasting fit",
        "Classic fit",
        "Double-needle stitching throughout",
        "Taped neck and shoulders",
        "Tearaway label",
    ],
    "G5000": [
        "100% U.S. Cotton (Heather: 90/10 cotton/polyester; Sport Grey: 90/10)",
        "Pre-shrunk for a lasting fit",
        "Classic fit",
        "Double-needle stitching throughout",
        "Taped neck and shoulders",
        "Tearaway label",
    ],
    "G5000B": [
        "100% U.S. Cotton (Sport Grey: 90/10 cotton/polyester)",
        "Pre-shrunk for a lasting fit",
        "Classic fit — great for kids",
        "Double-needle stitching throughout",
        "Taped neck and shoulders",
        "Tearaway label",
    ],
    "G5400": [
        "100% U.S. Cotton (Heather: 90/10 cotton/polyester)",
        "Pre-shrunk for a lasting fit",
        "Classic fit",
        "Double-needle stitching throughout",
        "Taped neck and shoulders",
        "Tearaway label",
        "Long-sleeve design for year-round wear",
    ],
    "G18000": [
        "50% Cotton / 50% Polyester — 8.0 oz/yd²",
        "Air jet yarn — softer feel and reduced pilling",
        "Classic fit",
        "Quarter-turned to eliminate centre crease",
        "Set-in sleeves",
        "1 × 1 athletic rib knit cuffs and waistband with spandex",
        "Double-needle stitching throughout",
    ],
    "G18500": [
        "50% Cotton / 50% Polyester — 8.0 oz/yd²",
        "Air jet yarn — softer feel and reduced pilling",
        "Classic fit",
        "Double-lined hood with matching drawstring",
        "Pouch pocket",
        "1 × 1 athletic rib knit cuffs and waistband with spandex",
        "Double-needle stitching throughout",
    ],
    "G18500B": [
        "50% Cotton / 50% Polyester — 8.0 oz/yd²",
        "Air jet yarn — softer feel and reduced pilling",
        "Double-lined hood with matching drawstring",
        "Pouch pocket",
        "1 × 1 athletic rib knit cuffs and waistband with spandex",
        "Youth sizing — XS to XL",
    ],
    "G64000": [
        "Soft ring-spun cotton — high stitch density fabric",
        "Semi-fitted silhouette with side seams",
        "Narrow rib collar",
        "Taped neck and shoulders",
        "Seamless double-needle collar",
        "Tearaway label",
    ],
    "G64000L": [
        "Soft ring-spun cotton — high stitch density fabric",
        "Feminine semi-fitted silhouette with side seams",
        "Narrow rib collar",
        "Taped neck and shoulders",
        "Seamless double-needle collar",
        "Tearaway label",
    ],
    "G64800": [
        "Soft ring-spun cotton — double piqué fabric",
        "Breathable and ideal for embroidery",
        "Clean finished placket with dyed-to-match buttons",
        "Side seams for a modern fit",
        "Curved hem",
        "Tearaway label",
    ],
    "G64V00": [
        "Soft ring-spun cotton — high stitch density fabric",
        "Semi-fitted silhouette with side seams",
        "Narrow rib V-neck collar",
        "Taped neck and shoulders",
        "Tearaway label",
    ],
    "G64V00L": [
        "Soft ring-spun cotton — high stitch density fabric",
        "Feminine semi-fitted silhouette with side seams",
        "Narrow rib V-neck collar",
        "Taped neck and shoulders",
        "Tearaway label",
    ],
    "G8000": [
        "Soft ring-spun cotton",
        "Pre-shrunk for a lasting fit",
        "Classic fit",
        "Double-needle stitching throughout",
        "Taped neck and shoulders",
        "Tearaway label",
    ],
    "GH000": [
        "100% Ring-spun Cotton — heavier weight for a premium feel",
        "High stitch density for a smooth printing surface",
        "Classic rib collar",
        "Taped neck and shoulders",
        "Double-needle stitching throughout",
        "Tearaway label",
    ],
}

# Size chart measurements (in inches).  Rows: (size, chest_range, body_length).
SIZE_CHARTS: dict[str, list[tuple[str, str, str]]] = {
    "adult-standard": [
        ("S",   "34–36", "28"),
        ("M",   "38–40", "29"),
        ("L",   "42–44", "30"),
        ("XL",  "46–48", "31"),
        ("2XL", "50–52", "32"),
        ("3XL", "54–56", "33"),
        ("4XL", "58–60", "34"),
        ("5XL", "62–64", "35"),
    ],
    "adult-softstyle": [
        ("XS",  "31–33", "27"),
        ("S",   "34–36", "28"),
        ("M",   "38–40", "29"),
        ("L",   "42–44", "30"),
        ("XL",  "46–48", "31"),
        ("2XL", "50–52", "32"),
        ("3XL", "54–56", "33"),
        ("4XL", "58–60", "34"),
        ("5XL", "62–64", "35"),
    ],
    "adult-sweatshirt": [
        ("XS",  "31–33", "25½"),
        ("S",   "34–36", "26½"),
        ("M",   "38–40", "27½"),
        ("L",   "42–44", "28½"),
        ("XL",  "46–48", "29½"),
        ("2XL", "50–52", "30½"),
        ("3XL", "54–56", "31½"),
        ("4XL", "58–60", "32½"),
        ("5XL", "62–64", "33½"),
    ],
    "womens-softstyle": [
        ("S",   "32–34", "26"),
        ("M",   "34–36", "27"),
        ("L",   "36–38", "28"),
        ("XL",  "38–40", "29"),
        ("2XL", "40–42", "30"),
        ("3XL", "44–46", "31"),
    ],
    "adult-polo": [
        ("S",   "34–36", "28"),
        ("M",   "38–40", "29"),
        ("L",   "42–44", "30"),
        ("XL",  "46–48", "31"),
        ("2XL", "50–52", "32"),
        ("3XL", "54–56", "33"),
        ("4XL", "58–60", "34"),
    ],
    "youth": [
        ("XS", "23–24", "17½"),
        ("S",  "25–26", "18½"),
        ("M",  "27–28", "19½"),
        ("L",  "29–30", "21"),
        ("XL", "31–32", "22½"),
    ],
}

STYLE_SIZE_CHART: dict[str, str] = {
    "G2000":   "adult-standard",
    "G5000":   "adult-standard",
    "G5000B":  "youth",
    "G5400":   "adult-standard",
    "G8000":   "adult-standard",
    "GH000":   "adult-standard",
    "G18000":  "adult-sweatshirt",
    "G18500":  "adult-sweatshirt",
    "G18500B": "youth",
    "G64000":  "adult-softstyle",
    "G64000L": "womens-softstyle",
    "G64800":  "adult-polo",
    "G64V00":  "adult-softstyle",
    "G64V00L": "womens-softstyle",
}

# Extra filterable tags per style: neck style, material, fit.
# These power the sidebar filter in shopify/snippets/collection-filters.liquid.
STYLE_EXTRA_TAGS: dict[str, list[str]] = {
    "G2000":   ["Crew Neck", "Cotton", "Classic Fit"],
    "G5000":   ["Crew Neck", "Cotton", "Classic Fit"],
    "G5000B":  ["Crew Neck", "Cotton", "Classic Fit"],
    "G5400":   ["Crew Neck", "Cotton", "Classic Fit"],
    "G8000":   ["Crew Neck", "Cotton"],
    "GH000":   ["Crew Neck", "Cotton"],
    "G18000":  ["Crew Neck", "Poly-Cotton"],
    "G18500":  ["Hooded", "Poly-Cotton"],
    "G18500B": ["Hooded", "Poly-Cotton"],
    "G64000":  ["Crew Neck", "Cotton", "Fitted"],
    "G64000L": ["Crew Neck", "Cotton", "Fitted"],
    "G64800":  ["Polo", "Cotton"],
    "G64V00":  ["V-Neck", "Cotton", "Fitted"],
    "G64V00L": ["V-Neck", "Cotton", "Fitted"],
}


def build_html_description(style_number: str, description_text: str) -> str:
    """Combine description paragraph, feature bullets, and size chart into HTML."""
    parts: list[str] = []

    if description_text:
        parts.append(f"<p>{description_text}</p>")

    features = PRODUCT_FEATURES.get(style_number, [])
    if features:
        items = "".join(f"<li>{f}</li>" for f in features)
        parts.append(f"<ul>{items}</ul>")

    chart_key = STYLE_SIZE_CHART.get(style_number)
    chart_rows = SIZE_CHARTS.get(chart_key, []) if chart_key else []
    if chart_rows:
        rows_html = "".join(
            f"<tr><td>{s}</td><td>{c}</td><td>{l}</td></tr>"
            for s, c, l in chart_rows
        )
        parts.append(
            "<h4>Size Chart (inches)</h4>"
            "<table>"
            "<thead><tr><th>Size</th><th>Chest</th><th>Body Length</th></tr></thead>"
            f"<tbody>{rows_html}</tbody>"
            "</table>"
        )

    return "".join(parts)


# Full descriptions for products whose Gildan.com pages are blocked/truncated.
# Gildan's wholesale product pages cap meta description at 200 chars and
# can't be re-scraped (403 bot-block). Paste the correct text from
# gildan.com manually, then re-run make_shopify_csv.py.
DESCRIPTION_OVERRIDES: dict[str, str] = {
    "G2000": (
        "Innovation you can feel. Made with 100% U.S. cotton and the latest breakthrough "
        "in soft cotton technology, the Gildan® Ultra Cotton™ family has been remastered "
        "for improved printability and a softer feel. Classic fit with double-needle stitching "
        "throughout and taped neck and shoulders."
    ),
    "G5000": (
        "Innovation you can feel. Made with 100% U.S. cotton and the latest breakthrough "
        "in soft cotton technology, the Gildan® Heavy Cotton™ family has been remastered "
        "for improved printability and a softer feel. Classic fit with double-needle stitching "
        "throughout and taped neck and shoulders."
    ),
    "G64000": (
        "Made with soft ring-spun cotton, Softstyle’s high stitch density fabric offers "
        "a smooth printing surface. Features a narrow rib collar, taped neck and shoulders, "
        "and a seamless double-needle collar. Semi-fitted silhouette with side seams."
    ),
    "G64800": (
        "Made with soft ring-spun cotton, Softstyle’s double piqué fabric is breathable "
        "and ideal for embroidery. Features a clean finished placket with dyed-to-match buttons, "
        "side seams for a modern fit, and a curved hem."
    ),
    "G64V00": (
        "Made with soft ring-spun cotton, Softstyle’s high stitch density fabric offers "
        "a smooth printing surface. Features a narrow rib V-neck collar, taped neck and shoulders, "
        "and a semi-fitted silhouette with side seams."
    ),
    "G64V00L": (
        "Made with soft ring-spun cotton, Softstyle’s high stitch density fabric offers "
        "a smooth printing surface. Features a narrow rib V-neck collar, taped neck and shoulders, "
        "and a feminine semi-fitted silhouette with side seams."
    ),
    "GH000": (
        "Made with soft ring-spun cotton, Hammer’s high stitch density fabric provides "
        "a heavier weight and smooth printing surface. Features a classic rib collar, taped neck "
        "and shoulders, and double-needle stitching throughout."
    ),
}


# Per-garment defaults: weight in grams, Shopify product category, type label.
GARMENT_PROFILES: dict[str, dict[str, Any]] = {
    "crew-neck t-shirt": {
        "weight": 150,
        "category": "gid://shopify/TaxonomyCategory/aa-1-13-8",
        "type": "T-Shirt",
    },
    "v-neck t-shirt": {
        "weight": 150,
        "category": "gid://shopify/TaxonomyCategory/aa-1-13-8",
        "type": "V-Neck T-Shirt",
    },
    "long-sleeve t-shirt": {
        "weight": 200,
        "category": "gid://shopify/TaxonomyCategory/aa-1-13-8",
        "type": "Long-Sleeve T-Shirt",
    },
    "pique polo shirt": {
        "weight": 220,
        "category": "gid://shopify/TaxonomyCategory/aa-1-13-6",
        "type": "Polo Shirt",
    },
    "crewneck sweatshirt": {
        "weight": 400,
        "category": "gid://shopify/TaxonomyCategory/aa-1-13-14",
        "type": "Crewneck Sweatshirt",
    },
    "hooded sweatshirt": {
        "weight": 450,
        "category": "gid://shopify/TaxonomyCategory/aa-1-13-13",
        "type": "Hoodie",
    },
}


def clean_description(text: str) -> str:
    """Fix encoding artifacts and structural issues that come from Gildan's
    meta description tag being scraped directly."""
    import html
    text = html.unescape(text)
    # Latin-1 mojibake: ® was stored as ª, ' as Õ
    text = text.replace("ª", "®").replace("Õ", "'")
    # Strip Gildan's "View XXXX Product Name. " navigation prefix
    text = re.sub(r"^View\s+\S+\s+.+?\.\s+", "", text)
    # Concatenated bullet points lack separators — insert a space+period
    # before any uppercase letter that immediately follows a lowercase letter
    # (e.g. "surfaceNarrow" → "surface. Narrow")
    text = re.sub(r"([a-z])([A-Z])", r"\1. \2", text)
    return text.strip()


def normalize_garment_label(label: str) -> str:
    # guess_garment returns "adult X" / "youth X" — strip the age prefix to
    # look up the size/weight profile.
    parts = label.split(maxsplit=1)
    if parts and parts[0] in {"adult", "youth"}:
        return parts[1] if len(parts) > 1 else label
    return label


def to_handle(*parts: str) -> str:
    text = " ".join(p for p in parts if p)
    text = text.lower()
    text = re.sub(r"[®™©]", "", text)
    text = re.sub(r"[^\w\s-]", "", text, flags=re.UNICODE)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text).strip("-")
    return text[:80] or "product"


def derive_gender(product: dict[str, Any]) -> str:
    text = " ".join(
        str(product.get(k) or "")
        for k in ("product_name", "description", "category")
    ).lower()
    if any(w in text for w in ("women", "women's", "ladies", "female")):
        return "Female"
    if any(w in text for w in ("men's", "mens", "male")):
        return "Male"
    return "Unisex"


def get_product_meta(supplier_url: str, group: list[dict[str, Any]]) -> dict[str, Any]:
    first = group[0]
    override = PRODUCT_OVERRIDES.get(supplier_url, {})

    style_number = (
        override.get("style_number")
        or (first.get("style_number") or "").strip()
        or "Gildan"
    ).upper()

    # Use Gildan's official "Gildan® MODEL" title format when available.
    if style_number in MODEL_TITLES:
        title, product_subtitle = MODEL_TITLES[style_number]
    else:
        name = (first.get("product_name") or "").strip()
        title = name if name and name.lower() != "gildan" else "Gildan Apparel"
        product_subtitle = ""

    garment_label = guess_garment(first) or first.get("category") or "t-shirt"
    profile_key = normalize_garment_label(garment_label)
    profile = GARMENT_PROFILES.get(profile_key) or GARMENT_PROFILES["crew-neck t-shirt"]
    youth = is_youth_garment(first)
    weight = int(profile["weight"] * (0.7 if youth else 1.0))

    raw_desc = (first.get("description") or "").strip()
    plain_desc = DESCRIPTION_OVERRIDES.get(style_number) or clean_description(raw_desc)
    description = build_html_description(style_number, plain_desc)

    gender = derive_gender(first)
    age_group = "Kids" if youth else "Adult"

    tags = [profile["type"]]
    if youth:
        tags.append("Youth")
    else:
        tags.append("Adult")
    if gender == "Female":
        tags.append("Women's")
    elif gender == "Unisex" and not youth:
        tags.append("Unisex")
    if style_number:
        tags.append(style_number)
    tags.extend(STYLE_EXTRA_TAGS.get(style_number, []))

    return {
        "title": title,
        "subtitle": product_subtitle,
        "handle": to_handle(title, style_number),
        "description": description,
        "vendor": "Gildan",
        "style_number": style_number,
        "type": profile["type"],
        "weight_g": weight,
        "shopify_category": profile["category"],
        "gender": gender,
        "age_group": age_group,
        "tags": ", ".join(tags),
    }


def load_template_header(template_path: Path) -> list[str]:
    with template_path.open("r", encoding="utf-8", newline="") as fh:
        reader = csv.reader(fh)
        return next(reader)


def col_index(header: list[str], name: str) -> int:
    try:
        return header.index(name)
    except ValueError as exc:
        raise SystemExit(f"Template header missing column: {name}") from exc


def color_label(code: str) -> str:
    code = (code or "").upper()
    return GILDAN_CODE_TO_NAME.get(code, code or "Default")


def color_filename_part(code: str) -> str:
    """Match the file naming used by scrape.py + generate.py + recolor.py."""
    return re.sub(r"[^A-Za-z0-9]+", "-", (code or "")).strip("-") or "default"


def image_filename(product: dict[str, Any], view: str) -> str:
    return f"{product['id']:06d}_{color_filename_part(product.get('color', ''))}_{view}.jpg"


def load_sizes(sizes_path: Path) -> dict[str, list[str]]:
    if sizes_path.exists():
        return json.loads(sizes_path.read_text(encoding="utf-8"))
    return {}


def build_rows(
    groups: dict[str, list[dict[str, Any]]],
    header: list[str],
    image_base_url: str,
    vendor: str,
    upload_manifest: dict[str, str] | None = None,
) -> list[list[str]]:
    rows: list[list[str]] = []
    seen_handles: set[str] = set()

    url_sizes = load_sizes(ROOT_DIR / "sizes.json")

    # Column indices (look up once, reuse across rows).
    C = {name: col_index(header, name) for name in [
        "Title",
        "URL handle",
        "Description",
        "Vendor",
        "Product category",
        "Type",
        "Tags",
        "Published on online store",
        "Status",
        "SKU",
        "Option1 name",
        "Option1 value",
        "Option2 name",
        "Option2 value",
        "Price",
        "Charge tax",
        "Inventory tracker",
        "Inventory quantity",
        "Continue selling when out of stock",
        "Weight value (grams)",
        "Weight unit for display",
        "Requires shipping",
        "Fulfillment service",
        "Product image URL",
        "Image position",
        "Image alt text",
        "Variant image URL",
        "SEO title",
        "SEO description",
        "Color (product.metafields.shopify.color-pattern)",
        "Google Shopping / Google product category",
        "Google Shopping / Gender",
        "Google Shopping / Age group",
        "Google Shopping / Manufacturer part number (MPN)",
        "Google Shopping / Condition",
        "Subtitle (product.metafields.descriptors.subtitle)",
    ]}

    base = image_base_url.rstrip("/")
    manifest = upload_manifest or {}

    def resolve_url(filename: str) -> str:
        return manifest.get(filename) or f"{base}/{filename}"

    for supplier_url, group in groups.items():
        meta = get_product_meta(supplier_url, group)
        if vendor:
            meta["vendor"] = vendor

        handle = meta["handle"]
        original_handle = handle
        suffix = 2
        while handle in seen_handles:
            handle = f"{original_handle}-{suffix}"
            suffix += 1
        seen_handles.add(handle)

        # Sort colors deterministically by code, then rotate so each product
        # leads with a different color in the collection grid.
        sorted_group = sorted(group, key=lambda p: (p.get("color") or "").upper())
        if sorted_group:
            offset = hash(meta["style_number"]) % len(sorted_group)
            sorted_group = sorted_group[offset:] + sorted_group[:offset]

        sizes = url_sizes.get(supplier_url, [])

        position = 1
        for color_idx, product in enumerate(sorted_group):
            code = (product.get("color") or "").upper()
            color_name = color_label(code)
            base_sku = f"{meta['style_number']}-{code}" if code else meta["style_number"]
            variant_image = resolve_url(image_filename(product, "front"))

            # Emit one variant row per size (or one row if no sizes available).
            for size_idx, size in enumerate(sizes or [None]):
                row = ["" for _ in header]
                row[C["URL handle"]] = handle

                if color_idx == 0 and size_idx == 0:
                    # First row of the product carries all product-level data.
                    row[C["Title"]] = meta["title"]
                    row[C["Description"]] = meta["description"]
                    row[C["Vendor"]] = meta["vendor"]
                    row[C["Product category"]] = meta["shopify_category"]
                    row[C["Type"]] = meta["type"]
                    row[C["Tags"]] = meta["tags"]
                    row[C["Published on online store"]] = "TRUE"
                    row[C["Status"]] = "active"
                    row[C["SEO title"]] = meta["title"]
                    row[C["SEO description"]] = (meta["description"] or meta["title"])[:155]
                    row[C["Google Shopping / Google product category"]] = meta["shopify_category"]
                    row[C["Google Shopping / Gender"]] = meta["gender"]
                    row[C["Google Shopping / Age group"]] = meta["age_group"]
                    row[C["Google Shopping / Manufacturer part number (MPN)"]] = meta["style_number"]
                    row[C["Google Shopping / Condition"]] = "new"
                    row[C["Subtitle (product.metafields.descriptors.subtitle)"]] = meta["subtitle"]

                # Variant fields — one row per (color, size) combination.
                sku = f"{base_sku}-{size}" if size else base_sku
                row[C["SKU"]] = sku
                row[C["Option1 name"]] = "Color"
                row[C["Option1 value"]] = color_name
                if size is not None:
                    row[C["Option2 name"]] = "Size"
                    row[C["Option2 value"]] = size
                row[C["Color (product.metafields.shopify.color-pattern)"]] = color_name.lower()
                row[C["Price"]] = ""
                row[C["Charge tax"]] = "TRUE"
                row[C["Inventory tracker"]] = "shopify"
                row[C["Inventory quantity"]] = "300"
                row[C["Continue selling when out of stock"]] = "deny"
                row[C["Weight value (grams)"]] = str(meta["weight_g"])
                row[C["Weight unit for display"]] = "g"
                row[C["Requires shipping"]] = "TRUE"
                row[C["Fulfillment service"]] = "manual"
                row[C["Variant image URL"]] = variant_image

                # Only the first size row per color carries the front image.
                if size_idx == 0:
                    row[C["Product image URL"]] = variant_image
                    row[C["Image position"]] = str(position)
                    row[C["Image alt text"]] = (
                        f"{meta['title']} — {color_name} — {VIEW_LABEL['front']}"
                    )
                    position += 1

                rows.append(row)

            # Image rows for views 2-6 (no variant fields, just images).
            for view in VIEWS_ORDERED[1:]:
                row = ["" for _ in header]
                row[C["URL handle"]] = handle
                row[C["Product image URL"]] = resolve_url(image_filename(product, view))
                row[C["Image position"]] = str(position)
                row[C["Image alt text"]] = (
                    f"{meta['title']} — {color_name} — {VIEW_LABEL[view]}"
                )
                position += 1
                rows.append(row)

            # For unisex products, append female front/back if uploaded to CDN.
            for female_view, label_suffix in (("front_f", "front view (women's fit)"), ("back_f", "back view (women's fit)")):
                fname = image_filename(product, female_view)
                if fname in manifest:
                    row = ["" for _ in header]
                    row[C["URL handle"]] = handle
                    row[C["Product image URL"]] = resolve_url(fname)
                    row[C["Image position"]] = str(position)
                    row[C["Image alt text"]] = f"{meta['title']} — {color_name} — {label_suffix}"
                    position += 1
                    rows.append(row)

    return rows


def write_manifest(rows_meta: list[tuple[int, str]], path: Path) -> None:
    seen: set[str] = set()
    lines: list[str] = []
    for product_id, color in rows_meta:
        code = color_filename_part(color or "")
        for view in VIEWS_ORDERED:
            name = f"{product_id:06d}_{code}_{view}.jpg"
            if name not in seen:
                seen.add(name)
                lines.append(name)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Generate a Shopify products.csv from the scraped DB + generated images."
    )
    parser.add_argument(
        "--template",
        default=str(ROOT_DIR / "product_template.csv"),
        help="Shopify product CSV template (used for column ordering)",
    )
    parser.add_argument(
        "--output",
        default=str(ROOT_DIR / "shopify_import.csv"),
        help="Output CSV path",
    )
    parser.add_argument(
        "--image-base-url",
        default="{IMAGE_BASE_URL}",
        help=(
            "Public URL prefix for hosted images. Defaults to a {IMAGE_BASE_URL} "
            "placeholder you can find-replace later. Use e.g. "
            "--image-base-url https://my-cdn.com/printngo to bake real URLs in."
        ),
    )
    parser.add_argument(
        "--vendor",
        default="Gildan",
        help="Vendor field on Shopify (default: Gildan)",
    )
    parser.add_argument(
        "--manifest",
        default=str(ROOT_DIR / "image_manifest.txt"),
        help="Output text file listing every image filename to upload",
    )
    parser.add_argument(
        "--upload-manifest",
        default=str(ROOT_DIR / "shopify_upload_manifest.json"),
        help=(
            "JSON file mapping filename → public CDN URL. If present, those "
            "URLs are baked into the CSV instead of the {IMAGE_BASE_URL} "
            "placeholder. Produced by app/upload_to_shopify.py."
        ),
    )
    return parser


def main() -> None:
    args = build_parser().parse_args()

    template_path = Path(args.template)
    if not template_path.exists():
        raise SystemExit(f"Template not found: {template_path}")
    header = load_template_header(template_path)
    _subtitle_col = "Subtitle (product.metafields.descriptors.subtitle)"
    if _subtitle_col not in header:
        header.append(_subtitle_col)

    products = list_products(statuses=["scraped"])
    if not products:
        raise SystemExit("No scraped products in DB. Run app/batch.py + app/pipeline.py first.")

    groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for p in products:
        groups[p["supplier_url"]].append(p)

    upload_manifest: dict[str, str] | None = None
    upload_manifest_path = Path(args.upload_manifest)
    if not upload_manifest_path.is_absolute():
        upload_manifest_path = ROOT_DIR / upload_manifest_path
    if upload_manifest_path.exists():
        try:
            upload_manifest = json.loads(upload_manifest_path.read_text(encoding="utf-8"))
            print(f"Using upload manifest: {upload_manifest_path} ({len(upload_manifest)} URLs)")
        except Exception as exc:
            print(f"Warning: failed to read {upload_manifest_path}: {exc}")

    rows = build_rows(groups, header, args.image_base_url, args.vendor, upload_manifest)

    out_path = Path(args.output)
    if not out_path.is_absolute():
        out_path = ROOT_DIR / out_path
    with out_path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.writer(fh, quoting=csv.QUOTE_MINIMAL)
        writer.writerow(header)
        writer.writerows(rows)

    manifest_path = Path(args.manifest)
    if not manifest_path.is_absolute():
        manifest_path = ROOT_DIR / manifest_path
    write_manifest([(p["id"], p.get("color", "")) for p in products], manifest_path)

    print(f"CSV: {out_path}")
    print(f"Manifest: {manifest_path}")
    print(f"Rows written: {len(rows)} ({len(groups)} products, {len(products)} variants)")
    print(f"Image URL prefix: {args.image_base_url}")
    print()
    print("Next steps:")
    print(f"  1. Upload the {sum(1 for _ in manifest_path.read_text().splitlines())} images "
          f"listed in {manifest_path.name} to a public host")
    print(f"  2. Find-replace '{args.image_base_url}' in {out_path.name} with your real URL prefix")
    print(f"  3. Shopify Admin → Products → Import → upload {out_path.name}")


if __name__ == "__main__":
    main()
