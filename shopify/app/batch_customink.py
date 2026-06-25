"""
CustomInk product scraper: downloads front-view reference images for all
available colors of a CustomInk product and inserts scraped rows into the
shared SQLite DB so that `python app/pipeline.py` can pick them up.

Usage:
    python app/batch_customink.py                       # reads customink_urls.csv
    python app/batch_customink.py --csv my_urls.csv     # custom file
    python app/batch_customink.py --url <url>           # single URL
    python app/batch_customink.py --url <url> --force   # re-download even if file exists
"""
from __future__ import annotations

if __package__ in {None, ""}:
    import sys
    from pathlib import Path

    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import argparse
import re
import time
from pathlib import Path

import requests

from app.db import mark_failed, upsert_scraped_product
from app.paths import ORIGINALS_DIR, ROOT_DIR, relative_to_root


# CDN front-view template — colorId is a 6+ digit integer assigned by CustomInk.
_CDN_FRONT = (
    "https://mms-images-prod.imgix.net/mms/images/catalog/colors"
    "/{color_id}/views/alt/front_large_extended.png"
)

# MMS styles API — returns product + color data as loaded by the browser.
_MMS_STYLES_API = "https://www.customink.com/mms/api/out/v2/styles.json"

# Shared browser-like headers to avoid being blocked.
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.customink.com/",
}


def read_urls(path: Path) -> list[str]:
    """Accept either a CSV with a `url` column or a plain one-URL-per-line file."""
    import csv

    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        sample = handle.read(2048)
        handle.seek(0)
        urls: list[str] = []
        if "," in sample or sample.lstrip().lower().startswith("url"):
            reader = csv.DictReader(handle)
            for raw in reader:
                value = (raw.get("url") or "").strip()
                if value:
                    urls.append(value)
        else:
            for line in handle:
                value = line.strip()
                if value and not value.startswith("#"):
                    urls.append(value)
    return urls


def parse_product_id(url: str) -> str:
    """Extract the numeric product/style ID from a CustomInk product URL.

    Handles forms like:
      .../medium-cotton-canvas-tote-bag/2435100?PK=2435103
      .../gildan-ultra-cotton-t-shirt/2000
    """
    # Try path: last numeric segment before the query string
    path = url.split("?")[0].rstrip("/")
    m = re.search(r"/(\d{4,})\s*$", path)
    if m:
        return m.group(1)
    raise ValueError(f"Cannot parse product ID from URL: {url}")


def clean_url(url: str) -> str:
    """Strip query string — used as the grouping key for all colors of one product."""
    return url.split("?")[0]


def parse_category(url: str) -> str:
    """Infer a product category from the CustomInk URL path.

    /products/bags/tote-bags/...        → "tote bags"
    /products/shirts/t-shirts/...       → "t shirts"
    /products/sweatshirts/hoodies/...   → "hoodies"
    /products/accessories/mugs/...      → "mugs"
    """
    path = url.split("?")[0].rstrip("/")
    parts = [p for p in path.split("/") if p and not p.isdigit()]
    try:
        idx = parts.index("products")
        # Second segment after /products/ is the sub-category (most specific)
        if idx + 2 < len(parts):
            return parts[idx + 2].replace("-", " ")
        if idx + 1 < len(parts):
            return parts[idx + 1].replace("-", " ")
    except ValueError:
        pass
    return ""


def fetch_colors_via_api(product_id: str, referer: str) -> list[dict]:
    """Call the CustomInk MMS styles API and return a list of dicts with
    'id' (colorId) and 'name' (color name) keys.

    Returns an empty list on any failure so the caller can fall back to Playwright.
    """
    try:
        resp = requests.get(
            _MMS_STYLES_API,
            params={"ids": product_id},
            headers={**_HEADERS, "Referer": referer},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        print(f"   MMS API request failed: {exc}")
        return []

    # The API can return a list or a dict keyed by product ID.
    styles: list[dict] = []
    if isinstance(data, list):
        styles = data
    elif isinstance(data, dict):
        # Could be {"styles": [...]} or {productId: {...}}
        if "styles" in data:
            styles = data["styles"]
        else:
            # keyed by product ID
            for v in data.values():
                if isinstance(v, dict):
                    styles.append(v)
                elif isinstance(v, list):
                    styles.extend(v)

    colors: list[dict] = []
    for style in styles:
        raw_colors = style.get("colors") or style.get("color_groups") or []
        for c in raw_colors:
            color_id = str(c.get("id") or c.get("color_id") or "").strip()
            color_name = str(c.get("name") or c.get("color_name") or color_id).strip()
            if color_id:
                colors.append({"id": color_id, "name": color_name})

    return colors


def fetch_colors_via_playwright(product_url: str) -> list[dict]:
    """Load the product page with Playwright, intercept CDN image requests to
    discover all colorIds, and extract color names from the DOM.

    Returns list of dicts with 'id' and 'name' keys.
    """
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        raise RuntimeError(
            "playwright is not installed. Run `pip install -r requirements.txt` "
            "and `python -m playwright install chromium`."
        )

    color_ids: list[str] = []
    mms_api_colors: list[dict] = []

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent=_HEADERS["User-Agent"],
            extra_http_headers={"Accept-Language": "en-US,en;q=0.9"},
        )
        page = context.new_page()

        def on_response(response):
            url = response.url
            # Capture colorIds from CDN image requests
            m = re.search(r"/catalog/colors/(\d+)/views/", url)
            if m:
                cid = m.group(1)
                if cid not in color_ids:
                    color_ids.append(cid)
                return
            # Capture full color list from MMS API
            if "styles.json" in url or "colors.json" in url:
                try:
                    body = response.json()
                    # Recursively search for color arrays
                    _extract_colors_from_json(body, mms_api_colors)
                except Exception:
                    pass

        page.on("response", on_response)

        print(f"   Playwright: loading {product_url} ...")
        try:
            page.goto(product_url, wait_until="networkidle", timeout=30_000)
        except Exception:
            # networkidle may time-out on some pages — just proceed with what we have
            pass

        # Give JS a moment to finish rendering color swatches
        time.sleep(2)

        # Try to click through color swatches to trigger CDN image loads
        try:
            swatches = page.query_selector_all(
                "[data-color-id], [data-colorid], "
                ".color-swatch, .color-picker button, "
                "[aria-label*='color'], [aria-label*='Color']"
            )
            print(f"   Found {len(swatches)} color swatch element(s)")
            for swatch in swatches[:30]:  # cap at 30 to avoid infinite loops
                try:
                    swatch.click(timeout=1000)
                    time.sleep(0.3)
                except Exception:
                    pass
        except Exception:
            pass

        # Harvest color names from DOM swatch elements
        dom_colors: list[dict] = []
        try:
            swatch_handles = page.query_selector_all(
                "[data-color-id], [data-colorid]"
            )
            for el in swatch_handles:
                cid = el.get_attribute("data-color-id") or el.get_attribute("data-colorid") or ""
                cname = (
                    el.get_attribute("aria-label")
                    or el.get_attribute("title")
                    or el.get_attribute("data-color-name")
                    or cid
                ).strip()
                if cid:
                    dom_colors.append({"id": cid.strip(), "name": cname})
        except Exception:
            pass

        browser.close()

    # Merge: prefer MMS API colors (have names), supplement with CDN-discovered IDs
    merged: dict[str, dict] = {}
    for c in mms_api_colors:
        merged[c["id"]] = c
    for c in dom_colors:
        if c["id"] not in merged:
            merged[c["id"]] = c
    for cid in color_ids:
        if cid not in merged:
            merged[cid] = {"id": cid, "name": cid}

    return list(merged.values())


def _extract_colors_from_json(data, out: list[dict]) -> None:
    """Recursively hunt for color arrays inside an arbitrary JSON structure."""
    if isinstance(data, list):
        for item in data:
            _extract_colors_from_json(item, out)
    elif isinstance(data, dict):
        raw = data.get("colors") or data.get("color_groups") or []
        if raw and isinstance(raw, list):
            for c in raw:
                if isinstance(c, dict):
                    color_id = str(c.get("id") or c.get("color_id") or "").strip()
                    color_name = str(
                        c.get("name") or c.get("color_name") or color_id
                    ).strip()
                    if color_id and not any(x["id"] == color_id for x in out):
                        out.append({"id": color_id, "name": color_name})
        else:
            for v in data.values():
                _extract_colors_from_json(v, out)


def download_image(color_id: str, dest: Path) -> None:
    """Download the front-view reference image from the CustomInk CDN."""
    url = _CDN_FRONT.format(color_id=color_id)
    resp = requests.get(url, headers=_HEADERS, timeout=30)
    resp.raise_for_status()
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(resp.content)


def scrape_product(url: str, force: bool = False) -> dict[str, int]:
    """Scrape all colors for one CustomInk product URL.

    Returns counts: {ok, skip, fail}.
    """
    counts = {"ok": 0, "skip": 0, "fail": 0}
    supplier_url = clean_url(url)
    product_id = parse_product_id(url)

    # Step 1 — discover colors
    print(f"   Fetching colors via MMS API (product {product_id}) ...")
    colors = fetch_colors_via_api(product_id, referer=url)
    if colors:
        print(f"   API returned {len(colors)} color(s)")
    else:
        print("   API returned no colors — falling back to Playwright page scan")
        colors = fetch_colors_via_playwright(url)
        print(f"   Playwright discovered {len(colors)} color(s)")

    if not colors:
        print("   No colors found — recording failure")
        try:
            pid = upsert_scraped_product(
                {
                    "supplier_url": supplier_url,
                    "color": "",
                    "status": "failed",
                    "error_message": "No colors discovered from API or page scan",
                }
            )
            mark_failed(pid, "No colors discovered")
        except Exception:
            pass
        counts["fail"] += 1
        return counts

    # Extract product name + category from URL slug
    slug = supplier_url.rstrip("/").split("/")[-1]
    product_name = slug.replace("-", " ").title()
    category = parse_category(url)

    # Step 2 — download + upsert each color
    for color in colors:
        color_id = color["id"]
        color_name = color["name"]
        safe_name = re.sub(r"[^A-Za-z0-9]+", "-", color_name).strip("-") or color_id

        dest = ORIGINALS_DIR / f"customink_{product_id}_{color_id}_front.png"
        rel_path = str(relative_to_root(dest))

        if dest.exists() and not force:
            print(f"   skip [{color_name}] (already downloaded)")
            # Still upsert so it's in the DB if it isn't already
            upsert_scraped_product(
                {
                    "supplier_url": supplier_url,
                    "color": color_name,
                    "product_name": product_name,
                    "brand": "CustomInk",
                    "style_number": product_id,
                    "category": category,
                    "original_image_url": _CDN_FRONT.format(color_id=color_id),
                    "original_image_path": rel_path,
                    "status": "scraped",
                }
            )
            counts["skip"] += 1
            continue

        try:
            print(f"   downloading [{color_name}] (colorId={color_id}) ...")
            download_image(color_id, dest)
            upsert_scraped_product(
                {
                    "supplier_url": supplier_url,
                    "color": color_name,
                    "product_name": product_name,
                    "brand": "CustomInk",
                    "style_number": product_id,
                    "category": category,
                    "original_image_url": _CDN_FRONT.format(color_id=color_id),
                    "original_image_path": rel_path,
                    "status": "scraped",
                }
            )
            print(f"   ok  [{color_name}] -> {rel_path}")
            counts["ok"] += 1
        except Exception as exc:
            print(f"   err [{color_name}]: {exc}")
            try:
                pid = upsert_scraped_product(
                    {
                        "supplier_url": supplier_url,
                        "color": color_name,
                        "product_name": product_name,
                        "brand": "CustomInk",
                        "style_number": product_id,
                        "category": "tote bag",
                        "status": "failed",
                        "error_message": str(exc)[:2000],
                    }
                )
                mark_failed(pid, str(exc))
            except Exception:
                pass
            counts["fail"] += 1

    return counts


def run_batch(csv_path: Path, force: bool = False) -> dict[str, int]:
    urls = read_urls(csv_path)
    total = {"ok": 0, "skip": 0, "fail": 0, "urls": len(urls)}

    for url in urls:
        print(f"\n>> {url}")
        try:
            c = scrape_product(url, force=force)
            for key in ("ok", "skip", "fail"):
                total[key] += c[key]
        except Exception as exc:
            print(f"   fatal: {exc}")
            total["fail"] += 1

    return total


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Scrape CustomInk products: download front-view reference images "
            "for every color and insert scraped rows into the SQLite DB. "
            "After running, use `python app/pipeline.py` to generate AI images."
        )
    )
    group = parser.add_mutually_exclusive_group()
    group.add_argument(
        "--csv",
        default=str(ROOT_DIR / "customink_urls.csv"),
        help="CSV/txt file of CustomInk product URLs (default: customink_urls.csv)",
    )
    group.add_argument(
        "--url",
        help="Scrape a single CustomInk product URL instead of reading a file",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-download images that already exist on disk",
    )
    return parser


def main() -> None:
    args = build_parser().parse_args()

    if args.url:
        print(f"\n>> {args.url}")
        counts = scrape_product(args.url, force=args.force)
        print(
            f"\nDone. downloaded={counts['ok']} skipped={counts['skip']} "
            f"failed={counts['fail']}\n"
            "Next: python app/pipeline.py"
        )
        return

    csv_path = Path(args.csv)
    if not csv_path.is_absolute():
        csv_path = ROOT_DIR / csv_path
    if not csv_path.exists():
        raise SystemExit(f"URL list not found: {csv_path}\nCreate it or pass --url <url>")

    counts = run_batch(csv_path, force=args.force)
    print(
        f"\nDone. urls={counts['urls']} downloaded={counts['ok']} "
        f"skipped={counts['skip']} failed={counts['fail']}\n"
        "Next: python app/pipeline.py"
    )


if __name__ == "__main__":
    main()
