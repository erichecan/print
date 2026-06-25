from __future__ import annotations

if __package__ in {None, ""}:
    import sys
    from pathlib import Path

    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import argparse
import csv
import html
import os
from pathlib import Path

from app.db import list_products
from app.generate import generated_path
from app.paths import REVIEW_HTML_PATH, ROOT_DIR, TEMPLATES_DIR, resolve_root_path
from app.prompts import GILDAN_CODE_TO_NAME, build_prompts

# ── Diverse model CDN URLs ─────────────────────────────────────────────────────
_DIVERSE_CDN: dict[str, str] = {
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

_DIVERSE_PRODUCTS: list[tuple[str, str, str, str]] = [
    # (display_title, asian_key, black_key, color_hint)
    ("Gildan® 18000 Adult Crewneck Sweatshirt", "gildan-18000_navy_asian",       "gildan-18000_red_black",        "Navy · Red"),
    ("Gildan® 18500 Adult Hooded Sweatshirt",   "gildan-18500_cherry-red_asian", "gildan-18500_black_black",      "Cherry Red · Black"),
    ("Gildan® 2000 Adult T-Shirt",              "gildan-2000_black_asian",       "gildan-2000_cherry-red_black",  "Black · Cherry Red"),
    ("Gildan® 5000 Adult T-Shirt",              "gildan-5000_red_asian",         "gildan-5000_daisy_black",       "Red · Daisy"),
    ("Gildan® 5400 Adult Long Sleeve T-Shirt",  "gildan-5400_royal-blue_asian",  "gildan-5400_red_black",         "Royal Blue · Red"),
    ("Gildan® 64000 Adult T-Shirt",             "gildan-64000_navy_asian",       "gildan-64000_cherry-red_black", "Navy · Cherry Red"),
    ("Gildan® 64800 Adult Pique Polo",          "gildan-64800_red_asian",        "gildan-64800_navy_black",       "Red · Navy"),
    ("Gildan® 64V00 Adult V-Neck T-Shirt",      "gildan-64v00_cherry-red_asian", "gildan-64v00_royal-blue_black", "Cherry Red · Royal Blue"),
    ("Gildan® 8000 Adult T-Shirt",              "gildan-8000_daisy_asian",       "gildan-8000_navy_black",        "Daisy · Navy"),
    ("Gildan® H000 Adult T-Shirt",              "gildan-h000_white_asian",       "gildan-h000_black_black",       "White · Black"),
]

# Mirrors MODEL_TITLES / PRODUCT_OVERRIDES in make_shopify_csv.py
_MODEL_DISPLAY: dict[str, tuple[str, str]] = {
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
_URL_TO_STYLE: dict[str, str] = {
    "https://www.gildan.com/us/en/2000-adult-t-shirt-en_us/":           "G2000",
    "https://www.gildan.com/us/en/5000-adult-t-shirt-en_us/":           "G5000",
    "https://www.gildan.com/us/en/64000-adult-t-shirt-en_us/":          "G64000",
    "https://www.gildan.com/us/en/64800-adult-pique-polo-en_us/":       "G64800",
    "https://www.gildan.com/us/en/64v00-adult-v-neck-t-shirt-en_us/":   "G64V00",
    "https://www.gildan.com/us/en/64v00l-women-s-v-neck-t-shirt-en_us/": "G64V00L",
    "https://www.gildan.com/us/en/h000-adult-t-shirt-en_us/":           "GH000",
}


def build_diverse_section() -> str:
    head_cols = "".join([
        "<span>Product</span>",
        "<span>Asian model (position 1)</span>",
        "<span>Black model (position 2)</span>",
    ])
    rows_html = ""
    for title, asian_key, black_key, colors in _DIVERSE_PRODUCTS:
        asian_url = html.escape(_DIVERSE_CDN[asian_key], quote=True)
        black_url = html.escape(_DIVERSE_CDN[black_key], quote=True)
        asian_label = html.escape(asian_key.replace("_", " "))
        black_label = html.escape(black_key.replace("_", " "))
        safe_title = html.escape(title)
        safe_colors = html.escape(colors)
        rows_html += f"""
        <div class="diverse-row">
          <div class="diverse-cell product-name">{safe_title}<br><span>{safe_colors}</span></div>
          <div class="diverse-cell">
            <a class="diverse-thumb-link" href="{asian_url}" target="_blank" rel="noopener">
              <img class="diverse-thumb" src="{asian_url}" alt="{asian_label}" loading="lazy">
            </a>
            <div class="diverse-thumb-caption">{asian_label}</div>
          </div>
          <div class="diverse-cell">
            <a class="diverse-thumb-link" href="{black_url}" target="_blank" rel="noopener">
              <img class="diverse-thumb" src="{black_url}" alt="{black_label}" loading="lazy">
            </a>
            <div class="diverse-thumb-caption">{black_label}</div>
          </div>
        </div>"""

    return f"""
    <section class="diverse-section">
      <div class="diverse-section-header">
        <div>
          <h2>Diverse Model Images</h2>
          <p>GPT-Image-2 generated · Position 1 (Asian) &amp; Position 2 (Black) in Shopify import CSV · 10 adult products × 2 models = 20 images</p>
        </div>
      </div>
      <div class="diverse-grid-head">{head_cols}</div>
      <div class="diverse-grid">{rows_html}</div>
    </section>"""


def resolve_display_title(product: dict) -> tuple[str, str]:
    style = (product.get("style_number") or "").strip().upper()
    if not style:
        style = _URL_TO_STYLE.get(product.get("supplier_url") or "", "")
    entry = _MODEL_DISPLAY.get(style)
    if entry:
        return entry
    name = (product.get("product_name") or "Untitled supplier product").strip()
    return name, ""


def build_url_index() -> dict[str, int]:
    """Read urls.csv and return {normalized_url: 1-based position}."""
    urls_csv = ROOT_DIR / "urls.csv"
    index: dict[str, int] = {}
    if not urls_csv.exists():
        return index
    with urls_csv.open(newline="", encoding="utf-8") as f:
        for i, row in enumerate(csv.DictReader(f), start=1):
            url = (row.get("url") or "").strip().rstrip("/")
            if url:
                index[url] = i
    return index


def asset_href(path: Path | None, output_path: Path) -> str:
    if not path or not path.exists():
        return ""
    return Path(os.path.relpath(path, output_path.parent)).as_posix()


def supplier_image_block(label: str, href: str) -> str:
    safe_label = html.escape(label)
    if not href:
        return f'<div class="image-missing">{safe_label}<br>not downloaded</div>'
    safe_href = html.escape(href, quote=True)
    return (
        f'<a class="image-link" href="{safe_href}" target="_blank" rel="noopener">'
        f'<img src="{safe_href}" alt="{safe_label}" loading="lazy">'
        "</a>"
    )


def generated_thumb_block(href: str, label: str) -> str:
    safe_label = html.escape(label)
    if not href:
        return (
            f'<div class="gen-cell empty"><span class="gen-label">{safe_label}</span>'
            "<span class=\"gen-empty\">pending</span></div>"
        )
    safe_href = html.escape(href, quote=True)
    return (
        f'<a class="gen-cell" href="{safe_href}" target="_blank" rel="noopener" download>'
        f'<span class="gen-label">{safe_label}</span>'
        f'<img src="{safe_href}" alt="{safe_label}" loading="lazy">'
        "</a>"
    )


def render_view_block(index: int, view: dict, row_id: str) -> str:
    safe_label = html.escape(view["label"])
    safe_summary = html.escape(view["summary"])
    safe_prompt = html.escape(view["prompt"])
    block_id = f"{row_id}-{view['key']}"
    return f"""
    <details class="view-block" data-view="{html.escape(view['key'])}">
      <summary>
        <span class="view-index">{index + 1}</span>
        <span class="view-label">{safe_label}</span>
        <span class="view-summary">{safe_summary}</span>
        <button class="view-copy" data-copy="{block_id}">Copy prompt</button>
        <span class="copied">Copied ✓</span>
      </summary>
      <pre class="prompt" id="{block_id}">{safe_prompt}</pre>
    </details>
    """


def render_row(product: dict, output_path: Path, seq_num: int = 0) -> str:
    supplier_path = resolve_root_path(product.get("original_image_path", ""))
    supplier_href = asset_href(supplier_path, output_path)
    status = product.get("status") or ""
    color = product.get("color") or ""
    name = product.get("product_name") or "Untitled supplier product"
    brand = product.get("brand") or ""
    style = product.get("style_number") or ""
    supplier_url = product.get("supplier_url") or ""
    error = product.get("error_message") or ""

    color_name = GILDAN_CODE_TO_NAME.get(color.upper(), "")
    color_display = f"{color} · {color_name}" if color and color_name else (color or "(none)")

    display_title, display_subtitle = resolve_display_title(product)

    meta_parts = []
    if brand:
        meta_parts.append(f"<strong>{html.escape(brand)}</strong>")
    if style:
        meta_parts.append(f"Style {html.escape(style)}")
    meta_parts.append(f"Color: <strong>{html.escape(color_display)}</strong>")
    meta_parts.append(f"#{product['id']:06d}")
    if supplier_url:
        meta_parts.append(
            f'<a href="{html.escape(supplier_url, quote=True)}" target="_blank" rel="noopener">supplier page</a>'
        )
    meta_html = " · ".join(meta_parts)

    pill_class = "pill failed" if status == "failed" else "pill"
    error_block = (
        f'<div class="error">⚠ {html.escape(error)}</div>' if error else ""
    )

    subtitle_html = (
        f'<div class="subtitle">{html.escape(display_subtitle)}</div>'
        if display_subtitle else ""
    )

    generated_grid = ""
    view_blocks = ""
    if status != "failed":
        prompts = build_prompts(product, color=color)
        row_id = f"row-{product['id']:06d}"

        # Generated-image grid (6 thumbnails)
        cells = []
        for view in prompts:
            gen_path = generated_path(product["id"], color, view["key"])
            href = asset_href(gen_path, output_path)
            cells.append(generated_thumb_block(href, view["label"]))
        generated_grid = f'<div class="gen-grid">{"".join(cells)}</div>'

        # Collapsible prompt blocks (fallback / inspection)
        view_blocks = "\n".join(
            render_view_block(i, view, row_id) for i, view in enumerate(prompts)
        )

    return f"""
    <article class="row">
      <div>
        <h3 class="ref-title">Supplier reference</h3>
        {supplier_image_block(f"{name} · {color_display}", supplier_href)}
      </div>
      <div class="body">
        <h2 class="title">
          {f'<span class="seq-num">#{seq_num}</span> ' if seq_num else ''}{html.escape(display_title)}
        </h2>
        {subtitle_html}
        <div class="meta">{meta_html} · <span class="{pill_class}">{html.escape(status)}</span></div>
        {error_block}
        {generated_grid}
        <details class="prompts-toggle">
          <summary>Prompts (6 views) — for manual regenerate / inspection</summary>
          <div class="views">{view_blocks}</div>
        </details>
      </div>
    </article>
    """


def make_review_html(output_path: Path = REVIEW_HTML_PATH, status: str | None = None) -> Path:
    template = (TEMPLATES_DIR / "review.html").read_text(encoding="utf-8")
    statuses = [status] if status else None
    products = list_products(statuses=statuses)

    url_index = build_url_index()
    # Assign sequence numbers: urls.csv order first, then extras appended
    extra_counter = [len(url_index)]
    def seq_for(p: dict) -> int:
        key = (p.get("supplier_url") or "").rstrip("/")
        n = url_index.get(key)
        if n is not None:
            return n
        extra_counter[0] += 1
        url_index[key] = extra_counter[0]
        return extra_counter[0]

    rows = "\n".join(render_row(p, output_path, seq_num=seq_for(p)) for p in products)
    if not rows:
        rows = '<p class="empty">No products yet. Edit urls.csv and run <code>python app/batch.py</code>.</p>'

    output = (
        template.replace("{{ diverse_section }}", build_diverse_section())
        .replace("{{ rows }}", rows)
        .replace("{{ count }}", str(len(products)))
        .replace("{{ root }}", html.escape(str(ROOT_DIR)))
    )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(output, encoding="utf-8")
    return output_path


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Build the static review HTML.")
    parser.add_argument("--output", default=str(REVIEW_HTML_PATH), help="Output HTML path")
    parser.add_argument("--status", help="Filter to only this status (scraped or failed)")
    return parser


def main() -> None:
    args = build_parser().parse_args()
    output_path = Path(args.output)
    if not output_path.is_absolute():
        output_path = ROOT_DIR / output_path
    path = make_review_html(output_path=output_path, status=args.status)
    print(f"Review HTML: {path}")


if __name__ == "__main__":
    main()
