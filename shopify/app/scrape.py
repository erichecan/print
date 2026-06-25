from __future__ import annotations

if __package__ in {None, ""}:
    import sys
    from pathlib import Path

    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import argparse
import mimetypes
import re
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlencode, urljoin, urlparse, urlunparse

from app.config import get_settings
from app.db import get_product, update_product, upsert_scraped_product
from app.paths import ORIGINALS_DIR, relative_to_root


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}

GILDAN_COLOR_CODES = {
    "white": "000",
    "black": "011",
    "navy": "032",
    "royal": "051",
    "royal blue": "051",
    "light blue": "069",
    "red": "040",
    "cardinal red": "137",
    "sport scarlet red": "083",
    "maroon": "081",
    "forest green": "033",
    "kelly green": "066",
    "irish green": "168",
    "purple": "081",
    "sport grey": "095",
    "dark heather": "446",
    "charcoal": "296",
    "heather navy": "443",
    "heather military green": "461",
    "old gold": "044",
    "daisy": "183",
    "yellow haze": "025",
    "carolina blue": "071",
    "sapphire": "176",
    "tropical blue": "236",
    "pink": "010",
    "azalea": "194",
    "safety pink": "319",
    "safety green": "318",
    "safety orange": "324",
    "tangerine": "037",
    "tan": "087",
    "sand": "031",
    "ash": "022",
    "natural": "020",
    "military green": "188",
}


def clean_text(value: Any) -> str:
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()


def color_slug(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "default"


def resolve_gildan_color_code(color: str) -> str | None:
    value = clean_text(color)
    if not value:
        return None
    upper = value.upper()
    # Codes from Gildan look like 051 / 030 / 41G — 2-4 chars with at least one digit.
    if re.fullmatch(r"[A-Z0-9]{2,4}", upper) and any(c.isdigit() for c in upper):
        return upper
    return GILDAN_COLOR_CODES.get(value.lower())


def is_gildan_url(url: str) -> bool:
    host = urlparse(url).netloc.lower()
    return host.endswith("gildan.com")


def is_gildan_brand_url(url: str) -> bool:
    host = urlparse(url).netloc.lower()
    return host in {"gildan.com", "www.gildan.com"}


def is_gildan_retail_url(url: str) -> bool:
    return urlparse(url).netloc.lower() == "retail.gildan.com"


def looks_like_placeholder_image(url: str) -> bool:
    lowered = (url or "").lower()
    return any(token in lowered for token in ("/favicon.", "logo.svg", "placeholder", "missing"))


def gildan_url_with_color(url: str, color_code: str | None) -> str:
    if not color_code:
        return url
    parsed = urlparse(url)
    query = parse_qs(parsed.query)
    query["color"] = [color_code]
    return urlunparse(parsed._replace(query=urlencode(query, doseq=True)))


def fetch_html(
    url: str,
    use_playwright: bool = False,
    wait_ms: int = 3000,
    wait_for_marker: str | None = None,
    marker_timeout_ms: int = 18000,
) -> str:
    """If wait_for_marker is set, keep polling the page content until that
    substring appears (or the timeout elapses). Useful for sites behind a
    Cloudflare bot challenge that swap real content in only after JS settles."""
    settings = get_settings()
    if use_playwright:
        try:
            from playwright.sync_api import sync_playwright
        except ImportError as exc:
            raise RuntimeError(
                "Playwright is not installed. Run `pip install -r requirements.txt` "
                "and `python -m playwright install chromium`."
            ) from exc

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(user_agent=settings.scrape_user_agent)
            page.goto(
                url,
                wait_until="domcontentloaded",
                timeout=settings.request_timeout_seconds * 1000,
            )
            # Wait for the network to settle (Cloudflare challenge resolves here).
            try:
                page.wait_for_load_state("networkidle", timeout=15000)
            except Exception:
                pass
            page.wait_for_timeout(wait_ms)

            html = page.content()
            if wait_for_marker:
                elapsed = 0
                step = 1500
                while wait_for_marker not in html and elapsed < marker_timeout_ms:
                    page.wait_for_timeout(step)
                    elapsed += step
                    html = page.content()

            browser.close()
            return html

    try:
        import requests
    except ImportError as exc:
        raise RuntimeError("requests is not installed. Run `pip install -r requirements.txt`.") from exc

    response = requests.get(
        url,
        timeout=settings.request_timeout_seconds,
        headers={"User-Agent": settings.scrape_user_agent},
    )
    response.raise_for_status()
    return response.text


def parse_product_page(url: str, html: str, color_hint: str = "") -> dict[str, Any]:
    try:
        from bs4 import BeautifulSoup
    except ImportError as exc:
        raise RuntimeError(
            "beautifulsoup4 is not installed. Run `pip install -r requirements.txt`."
        ) from exc

    import json

    soup = BeautifulSoup(html, "html.parser")
    jsonld_products = list(extract_jsonld_products(soup))
    jsonld = jsonld_products[0] if jsonld_products else {}

    name = (
        clean_text(jsonld.get("name"))
        or meta_content(soup, "og:title")
        or meta_content(soup, "twitter:title")
        or clean_text(first_text(soup, ["h1", "[data-product-title]", ".product-title"]))
        or clean_text(soup.title.string if soup.title else "")
    )
    description = (
        clean_text(jsonld.get("description"))
        or meta_content(soup, "description")
        or meta_content(soup, "og:description")
        or meta_content(soup, "twitter:description")
    )

    image_url = extract_image_from_jsonld(jsonld) or meta_content(soup, "og:image")
    if not image_url:
        image_url = meta_content(soup, "twitter:image") or meta_content(soup, "image")
    if not image_url:
        image_url = first_image_url(soup)
    image_url = urljoin(url, image_url) if image_url else ""

    brand = extract_brand(jsonld)
    style_number = clean_text(jsonld.get("sku") or jsonld.get("mpn") or jsonld.get("productID"))
    if not style_number:
        style_number = guess_style_number(name)

    product = {
        "supplier_url": url,
        "product_name": name or "Untitled supplier product",
        "brand": brand,
        "style_number": style_number,
        "category": clean_text(jsonld.get("category")) or guess_category(name, description),
        "color": color_hint or clean_text(jsonld.get("color")) or guess_color(soup.get_text(" ", strip=True)),
        "description": description,
        "original_image_url": image_url,
        "status": "scraped",
    }
    product = enrich_gildan_product(url, product)
    return product


def enrich_gildan_product(url: str, product: dict[str, Any]) -> dict[str, Any]:
    parsed = urlparse(url)
    if not parsed.netloc.endswith("gildan.com"):
        return product

    match = re.search(r"/us/en/([^/?#]+)/?", parsed.path)
    if not match:
        return product

    needs_fallback = (
        product.get("product_name") == "Gildan"
        or product.get("original_image_url", "").endswith("/favicon.png")
        or not product.get("original_image_url")
    )
    if not needs_fallback:
        return product

    retail_url = f"https://retail.gildan.com/{match.group(1)}/"
    try:
        html = fetch_html(retail_url, use_playwright=False)
    except Exception:
        return product

    try:
        from bs4 import BeautifulSoup
    except ImportError:
        return product

    soup = BeautifulSoup(html, "html.parser")
    color_code = first_query_value(parsed.query, "color")
    text = clean_text(soup.get_text(" ", strip=True))

    product["product_name"] = first_text(soup, ["h1"]) or product["product_name"]
    product["brand"] = product.get("brand") or "Gildan"
    product["style_number"] = (
        product.get("style_number") or extract_style_number(text) or guess_style_number(product["product_name"])
    )
    product["category"] = product.get("category") or guess_category(product["product_name"], text)
    product["description"] = extract_gildan_description(text) or product.get("description", "")

    image_url = select_gildan_image_url(html, product["style_number"], color_code)
    if image_url:
        product["original_image_url"] = image_url

    return product


def first_query_value(query: str, key: str) -> str:
    values = parse_qs(query).get(key) or []
    return values[0] if values else ""


_STYLE_TOKEN_RE = r"[A-Za-z0-9]*\d{3,6}[A-Za-z0-9]*"


def extract_style_number(text: str) -> str:
    match = re.search(
        rf"\bStyle(?:\s*#|\s*:)?\s*({_STYLE_TOKEN_RE})\b",
        text,
        re.IGNORECASE,
    )
    return match.group(1).upper() if match else ""


def extract_gildan_description(text: str) -> str:
    summary = ""
    summary_match = re.search(r"\bSummary:\s*(.*?)\s*\bMaterial:", text, re.IGNORECASE)
    if summary_match:
        summary = clean_text(summary_match.group(1))

    details_match = re.search(r"\bStyle #:\s*[A-Z0-9]+\s*(.*?)\s*Image: size chart", text, re.IGNORECASE)
    details = clean_text(details_match.group(1)) if details_match else ""
    return clean_text(" ".join(part for part in [summary, details] if part))


_GILDAN_IMAGE_PATTERN = re.compile(
    r"""https://cdn11\.bigcommerce\.com/[^"'<> )]+?\.(?:jpg|jpeg|png|webp)(?:\?[^"'<> )]*)?""",
    flags=re.IGNORECASE,
)
_GILDAN_DIM_PATTERN = re.compile(
    r"\.(\d{2,4})\.(\d{2,4})\.(?:jpg|jpeg|png|webp)(?:\?|$)", re.IGNORECASE
)


def _gildan_image_is_large(url: str, min_dim: int = 400) -> bool:
    m = _GILDAN_DIM_PATTERN.search(url)
    if m:
        return int(m.group(1)) >= min_dim and int(m.group(2)) >= min_dim
    return True


# Style codes come in many shapes: 18500 / 18500B / 64000L / 64V00L / H000 /
# 2000 / G500. The asset filename is always `{style}-{color}-alt{n}__...`.
_GILDAN_ASSET_NAME_PATTERN = re.compile(
    r"/([A-Za-z0-9]+)-([A-Za-z0-9]{2,4})-alt\d", flags=re.IGNORECASE
)


def list_gildan_color_codes(html: str, style_number: str = "") -> list[str]:
    """Pull the set of color codes that THIS style actually offers on the page.

    When `style_number` is empty, auto-detect the style by picking the one that
    appears most often in the BigCommerce asset filenames (the page usually
    contains a handful of cross-promo thumbnails for related styles, which we
    want to ignore)."""
    pairs = [
        (s.upper(), c.upper())
        for s, c in _GILDAN_ASSET_NAME_PATTERN.findall(html)
    ]
    if not pairs:
        return []

    style_token = _normalize_style_token(style_number) or ""
    if style_token:
        target = style_token.upper()
    else:
        from collections import Counter

        target = Counter(s for s, _ in pairs).most_common(1)[0][0]

    return sorted({c for s, c in pairs if s == target})


def _normalize_style_token(style_number: str) -> str:
    token = (style_number or "").strip().upper()
    # Image URLs use "64000L" while metadata often says "G64000L".
    return token.lstrip("G") if token else ""


def select_gildan_image_url(
    html: str, style_number: str, color_code: str
) -> str:
    urls = sorted(set(_GILDAN_IMAGE_PATTERN.findall(html)))
    if not urls:
        return ""

    candidates = [u for u in urls if _gildan_image_is_large(u)] or urls

    style_token = _normalize_style_token(style_number)
    if style_token:
        # STRICT match on the canonical asset filename `{style}-{color}-alt{n}`.
        # Substring matching would let "5000" match "5000B" assets (Youth slipped
        # into Adult) or let cross-promo stencil thumbnails of unrelated styles
        # pass through. The boundary regex below pins the style token between
        # path separators / leading boundary and the literal "-COLOR-alt..."
        # filename, so "5000" only ever matches files literally named "5000-".
        style_re = re.compile(
            rf"(?:^|[/_-]){re.escape(style_token)}-[A-Za-z0-9]{{2,4}}-alt\d",
            flags=re.IGNORECASE,
        )
        styled = [u for u in candidates if style_re.search(u)]
        if not styled:
            return ""
        candidates = styled

    if color_code:
        color_re = re.compile(
            rf"(?:^|[/_-]){re.escape(style_token)}-{re.escape(color_code)}-alt\d"
            if style_token
            else rf"-{re.escape(color_code)}-alt\d",
            flags=re.IGNORECASE,
        )
        colored = [u for u in candidates if color_re.search(u)]
        if not colored:
            return ""
        candidates = colored

    # Prefer the per-product full asset path `/products/N/images/M/...?c=1`
    # over the page-decoration stencil path `/images/stencil/SIZE/products/...`
    # — the former is always the actual variant photo, the latter is often a
    # promotional thumbnail for an unrelated style.
    def _is_canonical(u: str) -> bool:
        return "/images/stencil/" not in u and "?c=1" in u

    canonical = [u for u in candidates if _is_canonical(u)]
    pool = canonical or candidates

    # Prefer the hero front-of-model shot (alt1), then 3/4 angle (alt2),
    # then detail/back (alt3).
    for alt in ("alt1", "alt2", "alt3"):
        for url in pool:
            if alt in url.lower():
                return normalize_bigcommerce_image_size(url)
    return normalize_bigcommerce_image_size(pool[0])


def normalize_bigcommerce_image_size(url: str, size: str = "1280x1280") -> str:
    return re.sub(r"/images/stencil/[^/]+/", f"/images/stencil/{size}/", url)


def extract_jsonld_products(soup: Any) -> list[dict[str, Any]]:
    import json

    products: list[dict[str, Any]] = []
    for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
        raw = script.string or script.get_text()
        if not raw:
            continue
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            continue
        products.extend(find_product_objects(data))
    return products


def find_product_objects(value: Any) -> list[dict[str, Any]]:
    if isinstance(value, list):
        found: list[dict[str, Any]] = []
        for item in value:
            found.extend(find_product_objects(item))
        return found

    if not isinstance(value, dict):
        return []

    graph = value.get("@graph")
    if graph:
        return find_product_objects(graph)

    item_type = value.get("@type")
    types = item_type if isinstance(item_type, list) else [item_type]
    if any(str(item).lower() == "product" for item in types):
        return [value]

    found = []
    for child in value.values():
        if isinstance(child, (dict, list)):
            found.extend(find_product_objects(child))
    return found


def extract_brand(product: dict[str, Any]) -> str:
    brand = product.get("brand")
    if isinstance(brand, dict):
        return clean_text(brand.get("name"))
    return clean_text(brand)


def extract_image_from_jsonld(product: dict[str, Any]) -> str:
    image = product.get("image")
    if isinstance(image, str):
        return image
    if isinstance(image, list) and image:
        first = image[0]
        if isinstance(first, str):
            return first
        if isinstance(first, dict):
            return clean_text(first.get("url") or first.get("contentUrl"))
    if isinstance(image, dict):
        return clean_text(image.get("url") or image.get("contentUrl"))
    return ""


def meta_content(soup: Any, key: str) -> str:
    selectors = [
        {"property": key},
        {"name": key},
        {"property": f"product:{key}"},
        {"name": f"twitter:{key}"},
    ]
    for attrs in selectors:
        tag = soup.find("meta", attrs=attrs)
        if tag and tag.get("content"):
            return clean_text(tag["content"])
    return ""


def first_text(soup: Any, selectors: list[str]) -> str:
    for selector in selectors:
        node = soup.select_one(selector)
        if node:
            return clean_text(node.get_text(" ", strip=True))
    return ""


def first_image_url(soup: Any) -> str:
    for selector in [
        "img[data-src]",
        "img[data-original]",
        "img[srcset]",
        "img[src]",
    ]:
        for image in soup.select(selector):
            src = (
                image.get("data-src")
                or image.get("data-original")
                or first_srcset_url(image.get("srcset", ""))
                or image.get("src")
            )
            if src and not src.startswith("data:"):
                return clean_text(src)
    return ""


def first_srcset_url(srcset: str) -> str:
    if not srcset:
        return ""
    return clean_text(srcset.split(",")[0].strip().split(" ")[0])


def guess_style_number(name: str) -> str:
    if not name:
        return ""
    # Gildan product titles open with the style code (e.g. "18500B | Youth ...")
    first = name.strip().split(maxsplit=1)[0]
    if re.fullmatch(rf"{_STYLE_TOKEN_RE}", first) and any(c.isdigit() for c in first):
        return first.upper()
    match = re.search(rf"\b{_STYLE_TOKEN_RE}\b", name)
    if match and any(c.isdigit() for c in match.group(0)):
        return match.group(0).upper()
    return ""


def guess_category(name: str, description: str) -> str:
    text = f"{name} {description}".lower()
    categories = [
        "mug",
        "t-shirt",
        "tee",
        "polo",
        "hoodie",
        "sweatshirt",
        "tank",
        "jacket",
        "cap",
        "hat",
        "long sleeve",
    ]
    for category in categories:
        if category in text:
            return category
    return ""


def guess_color(text: str) -> str:
    colors = [
        "black",
        "white",
        "navy",
        "royal blue",
        "blue",
        "red",
        "green",
        "gray",
        "grey",
        "charcoal",
        "pink",
        "purple",
        "yellow",
        "orange",
        "brown",
        "beige",
    ]
    lower = text.lower()
    for color in colors:
        if re.search(rf"\b{re.escape(color)}\b", lower):
            return color
    return ""


def download_image(url: str, product_id: int, color: str) -> str:
    if not url:
        return ""
    try:
        import requests
    except ImportError as exc:
        raise RuntimeError("requests is not installed. Run `pip install -r requirements.txt`.") from exc

    settings = get_settings()
    response = requests.get(
        url,
        timeout=settings.request_timeout_seconds,
        headers={"User-Agent": settings.scrape_user_agent},
    )
    response.raise_for_status()

    extension = image_extension(url, response.headers.get("content-type", ""))
    filename = f"{product_id:06d}_{color_slug(color)}{extension}"
    path = ORIGINALS_DIR / filename
    path.write_bytes(response.content)
    return relative_to_root(path)


def image_extension(url: str, content_type: str) -> str:
    parsed_ext = Path(urlparse(url).path).suffix.lower()
    if parsed_ext in IMAGE_EXTENSIONS:
        return ".jpg" if parsed_ext == ".jpeg" else parsed_ext
    guessed = mimetypes.guess_extension(content_type.split(";")[0].strip())
    if guessed and guessed.lower() in IMAGE_EXTENSIONS:
        return ".jpg" if guessed.lower() == ".jpeg" else guessed.lower()
    return ".jpg"


def scrape_url(
    url: str,
    color: str = "",
    use_playwright: bool = False,
    download: bool = True,
    wait_ms: int = 3000,
) -> dict[str, Any]:
    user_color = clean_text(color)
    color_code = resolve_gildan_color_code(user_color) if is_gildan_url(url) else None

    fetch_target = url
    if color_code and is_gildan_brand_url(url):
        fetch_target = gildan_url_with_color(url, color_code)
    elif is_gildan_url(url) and user_color and not color_code:
        print(
            f"  ! Gildan color '{user_color}' not in lookup map. Color-specific "
            "image selection will be skipped. Add the 3-digit code to "
            "GILDAN_COLOR_CODES in app/scrape.py, or put the code in urls.csv."
        )

    # Gildan product pages are JS-rendered and gated by a Cloudflare bot
    # challenge. Force Playwright regardless of the caller, and only consider
    # the page settled once a BigCommerce CDN URL has appeared.
    if is_gildan_url(url) and not use_playwright:
        use_playwright = True
    gildan_marker = "cdn11.bigcommerce.com" if is_gildan_url(url) else None

    html = fetch_html(
        fetch_target,
        use_playwright=use_playwright,
        wait_ms=wait_ms,
        wait_for_marker=gildan_marker,
    )
    product = parse_product_page(fetch_target, html, color_hint=user_color)
    # Persist using the canonical (user-supplied) URL so the same product
    # listed for multiple colors stays grouped under one supplier_url.
    product["supplier_url"] = url

    # Color-specific image override for any Gildan host that embeds the
    # BigCommerce CDN gallery in the HTML (works for retail.gildan.com too).
    if color_code and is_gildan_url(url):
        better = select_gildan_image_url(html, product.get("style_number", ""), color_code)
        if better:
            product["original_image_url"] = better
        else:
            available = list_gildan_color_codes(html, product.get("style_number", ""))
            raise RuntimeError(
                f"Color code '{color_code}' (mapped from '{user_color}') is not "
                f"available for style {product.get('style_number') or '(unknown)'} on "
                f"this page. Available codes: {', '.join(available) or '(none found)'}. "
                "Put the correct 3-digit code in urls.csv, or add the mapping to "
                "GILDAN_COLOR_CODES in app/scrape.py."
            )

    if looks_like_placeholder_image(product.get("original_image_url", "")):
        raise RuntimeError(
            f"Only got a placeholder image ({product.get('original_image_url')}). "
            "The supplier page likely redirected or wasn't fully rendered — "
            "try --playwright or check the URL."
        )

    product_id = upsert_scraped_product(product)

    if download and product.get("original_image_url"):
        image_path = download_image(
            product["original_image_url"],
            product_id,
            product.get("color") or user_color,
        )
        update_product(product_id, original_image_path=image_path)

    return get_product(product_id)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Scrape one supplier product URL.")
    parser.add_argument("url", help="Supplier product page URL")
    parser.add_argument("--color", default="", help="Color name or 3-digit Gildan code")
    parser.add_argument(
        "--playwright",
        action="store_true",
        help="Render the page with Playwright before parsing",
    )
    parser.add_argument(
        "--no-download",
        action="store_true",
        help="Save metadata without downloading the supplier image",
    )
    parser.add_argument(
        "--wait-ms",
        type=int,
        default=3000,
        help="Extra Playwright wait after DOM load, in milliseconds",
    )
    return parser


def main() -> None:
    args = build_parser().parse_args()
    product = scrape_url(
        args.url,
        color=args.color,
        use_playwright=args.playwright,
        download=not args.no_download,
        wait_ms=args.wait_ms,
    )
    print(f"Saved product #{product['id']} ({product['color'] or 'no color'}): {product['product_name']}")
    if product.get("original_image_path"):
        print(f"Original image: {product['original_image_path']}")


if __name__ == "__main__":
    main()
