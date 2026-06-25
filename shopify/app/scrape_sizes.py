"""Scrape available size options from all supplier URLs and write sizes.json."""

from __future__ import annotations

if __package__ in {None, ""}:
    import sys
    from pathlib import Path

    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import json
import sqlite3
from pathlib import Path

from app.scrape import fetch_html
from app.paths import ROOT_DIR


SIZES_JSON = ROOT_DIR / "sizes.json"
DB_PATH = ROOT_DIR / "products.db"


def scrape_sizes(url: str) -> list[str]:
    from bs4 import BeautifulSoup

    html = fetch_html(
        url,
        use_playwright=True,
        wait_for_marker="cdn11.bigcommerce.com",
        marker_timeout_ms=30000,
    )
    soup = BeautifulSoup(html, "html.parser")
    labels = soup.select("label.silk-radio-button-wrapper span.label2")
    return [lbl.get_text(strip=True) for lbl in labels]


def main() -> None:
    conn = sqlite3.connect(DB_PATH)
    urls = [
        r[0]
        for r in conn.execute(
            "SELECT DISTINCT supplier_url FROM products ORDER BY supplier_url"
        ).fetchall()
    ]
    conn.close()

    result: dict[str, list[str]] = {}
    for url in urls:
        print(f"Scraping {url} …", end=" ", flush=True)
        try:
            sizes = scrape_sizes(url)
            result[url] = sizes
            print(sizes)
        except Exception as exc:
            print(f"ERROR: {exc}")
            result[url] = []

    SIZES_JSON.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nWrote {SIZES_JSON}")


if __name__ == "__main__":
    main()
