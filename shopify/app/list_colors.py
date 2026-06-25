from __future__ import annotations

if __package__ in {None, ""}:
    import sys
    from pathlib import Path

    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import argparse
import html as html_module
import re
from pathlib import Path

from app.paths import ROOT_DIR
from app.scrape import (
    _GILDAN_IMAGE_PATTERN,
    _normalize_style_token,
    fetch_html,
    is_gildan_url,
    list_gildan_color_codes,
)


def find_swatch_thumbnail(html: str, style_token: str, code: str) -> str:
    # Prefer the small 44x58 swatch (every color has one), fall back to any
    # image carrying this code.
    pattern = re.compile(
        rf"""https://cdn11\.bigcommerce\.com/[^"'<> )]*?{re.escape(style_token)}-{re.escape(code)}-alt\d[^"'<> )]+?\.(?:jpg|jpeg|png|webp)(?:\?[^"'<> )]*)?""",
        flags=re.IGNORECASE,
    )
    candidates = sorted(set(pattern.findall(html)))
    if not candidates:
        return ""
    # Prefer the largest (alt1 / 1280) if multiple sizes exist
    for needle in (".1280.1280.", ".640w.", ".320w."):
        for url in candidates:
            if needle in url:
                return url
    return candidates[0]


def guess_style_from_html(html: str, url: str) -> str:
    # Look at the BigCommerce URLs — they all share the same style prefix.
    for asset in _GILDAN_IMAGE_PATTERN.findall(html):
        m = re.search(r"/(\d{4,6}L?)-[A-Za-z0-9]{2,4}-alt", asset)
        if m:
            return m.group(1).upper()
    # Fall back to slug in URL
    m = re.search(r"/(\d{4,6}L?)-", url)
    return m.group(1).upper() if m else ""


def render_html(url: str, style_token: str, rows: list[dict]) -> str:
    cells = "\n".join(
        f"""
        <article class="swatch">
          <a href="{html_module.escape(row['thumb'], quote=True)}" target="_blank" rel="noopener">
            <img src="{html_module.escape(row['thumb'], quote=True)}" alt="{html_module.escape(row['code'])}">
          </a>
          <div class="code">{html_module.escape(row['code'])}</div>
        </article>
        """.strip()
        for row in rows
    )
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Color codes · {html_module.escape(style_token)}</title>
<style>
body {{ margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif; background: #f5f7fa; color: #18212b; }}
header {{ padding: 20px 28px; background: #102027; color: #fff; }}
header h1 {{ margin: 0; font-size: 22px; }}
header p {{ margin: 6px 0 0; color: #d6e2ea; font-size: 13px; }}
main {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 14px; padding: 24px 28px; }}
.swatch {{ background: #fff; border: 1px solid #d7dee7; border-radius: 8px; padding: 12px; text-align: center; }}
.swatch img {{ width: 100%; max-width: 100px; height: auto; display: block; margin: 0 auto 8px; border-radius: 4px; background: #f0f3f6; }}
.swatch .code {{ font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 14px; font-weight: 700; color: #087f5b; }}
a {{ color: inherit; text-decoration: none; display: block; }}
</style>
</head>
<body>
<header>
  <h1>Color codes for {html_module.escape(style_token)}</h1>
  <p>{html_module.escape(url)} · {len(rows)} colors · Use the 3-digit code in urls.csv</p>
</header>
<main>
{cells}
</main>
</body></html>
"""


def list_colors(url: str, output: Path | None = None) -> Path:
    if not is_gildan_url(url):
        raise SystemExit("This helper currently only supports gildan.com URLs.")

    html = fetch_html(url, use_playwright=True, wait_ms=6000)
    style_token = guess_style_from_html(html, url)
    codes = list_gildan_color_codes(html, style_token)
    if not codes:
        raise SystemExit(
            "No color codes found on the page. Try again, or check that the URL "
            "is a Gildan product page."
        )

    rows = []
    for code in codes:
        thumb = find_swatch_thumbnail(html, style_token, code)
        if thumb:
            rows.append({"code": code, "thumb": thumb})

    output = output or (ROOT_DIR / "colors.html")
    output.write_text(render_html(url, style_token, rows), encoding="utf-8")
    return output


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="List all Gildan color codes for a product page with swatch thumbnails."
    )
    parser.add_argument("url", help="Gildan product page URL")
    parser.add_argument("--output", default=str(ROOT_DIR / "colors.html"))
    return parser


def main() -> None:
    args = build_parser().parse_args()
    output = Path(args.output)
    if not output.is_absolute():
        output = ROOT_DIR / output
    path = list_colors(args.url, output=output)
    print(f"Color palette: {path}")


if __name__ == "__main__":
    main()
