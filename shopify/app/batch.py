from __future__ import annotations

if __package__ in {None, ""}:
    import sys
    from pathlib import Path

    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import argparse
import csv
import re
from pathlib import Path

from app.db import mark_failed, upsert_scraped_product
from app.paths import ROOT_DIR
from app.scrape import (
    fetch_html,
    is_gildan_url,
    list_gildan_color_codes,
    scrape_url,
)


# The user's fixed shopping list of Gildan color codes. Every URL gets polled
# against this list — codes that aren't carried by the style are skipped.
FIXED_COLOR_CODES = [
    "030",  # White
    "032",  # Navy
    "036",  # Black
    "040",  # Red
    "051",  # Royal Blue
    "026",  # Sapphire
    "098",  # Daisy
    "194",  # Cherry Red
]


def read_urls(path: Path) -> list[str]:
    """Accept either a CSV with a `url` column or a plain one-URL-per-line file."""
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


def available_codes_for(url: str) -> list[str]:
    """Render the URL once and report which Gildan color codes the style carries."""
    html = fetch_html(
        url,
        use_playwright=True,
        wait_ms=6000,
        wait_for_marker="cdn11.bigcommerce.com" if is_gildan_url(url) else None,
        marker_timeout_ms=20000,
    )
    return list_gildan_color_codes(html, "")


def run_batch(csv_path: Path, codes: list[str] | None = None) -> dict[str, int]:
    desired = [c.upper() for c in (codes or FIXED_COLOR_CODES)]
    urls = read_urls(csv_path)
    counts = {"ok": 0, "skip": 0, "fail": 0, "urls": len(urls)}

    for url in urls:
        print(f"\n>> {url}")
        if not is_gildan_url(url):
            print("   (not a gildan.com URL — running single-shot scrape without color polling)")
            try:
                product = scrape_url(url)
                print(f"   ok #{product['id']:06d}: {product['original_image_path'] or '(no image)'}")
                counts["ok"] += 1
            except Exception as exc:
                print(f"   err: {exc}")
                counts["fail"] += 1
            continue

        try:
            page_codes = available_codes_for(url)
        except Exception as exc:
            print(f"   err probing page: {exc}")
            counts["fail"] += 1
            continue

        if not page_codes:
            print("   (no Gildan color codes found on the page — skipping)")
            counts["fail"] += 1
            continue

        page_codes_upper = [c.upper() for c in page_codes]
        wanted = [c for c in desired if c in page_codes_upper]
        skipped = [c for c in desired if c not in page_codes_upper]
        print(f"   page offers: {', '.join(page_codes)}")
        print(f"   downloading: {', '.join(wanted) or '(none)'}")
        if skipped:
            print(f"   skipped (not offered): {', '.join(skipped)}")

        for code in wanted:
            try:
                product = scrape_url(url, color=code, use_playwright=True)
                print(f"   ok  [{code}] -> {product['original_image_path']}")
                counts["ok"] += 1
            except Exception as exc:
                print(f"   err [{code}]: {exc}")
                try:
                    product_id = upsert_scraped_product(
                        {
                            "supplier_url": url,
                            "color": code,
                            "status": "failed",
                            "error_message": str(exc)[:2000],
                        }
                    )
                    mark_failed(product_id, str(exc))
                except Exception:
                    pass
                counts["fail"] += 1

        counts["skip"] += len(skipped)

    return counts


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="For each URL in urls.csv, poll the fixed Gildan color list and download "
        "every color the style carries."
    )
    parser.add_argument(
        "--csv",
        default=str(ROOT_DIR / "urls.csv"),
        help="CSV with a `url` column, or plain one-URL-per-line file (default: ./urls.csv)",
    )
    parser.add_argument(
        "--codes",
        help="Comma-separated color codes to override FIXED_COLOR_CODES "
        "(e.g. --codes 030,051,194)",
    )
    return parser


def main() -> None:
    args = build_parser().parse_args()
    csv_path = Path(args.csv)
    if not csv_path.is_absolute():
        csv_path = ROOT_DIR / csv_path
    if not csv_path.exists():
        raise SystemExit(f"URL list not found: {csv_path}")

    codes = None
    if args.codes:
        codes = [c.strip() for c in re.split(r"[,\s]+", args.codes) if c.strip()]

    counts = run_batch(csv_path, codes=codes)
    print(
        f"\nDone. urls={counts['urls']} downloaded={counts['ok']} "
        f"skipped={counts['skip']} failed={counts['fail']}\n"
        "Next: python app/make_review_html.py && open review.html"
    )


if __name__ == "__main__":
    main()
