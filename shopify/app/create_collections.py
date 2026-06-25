"""Create Shopify Smart Collections based on product tags.
Run once after importing shopify_import.csv.
Idempotent — skips collections that already exist by title."""

from __future__ import annotations

import os
import sys
from pathlib import Path

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import requests
from dotenv import load_dotenv

load_dotenv()

SHOP = os.environ["SHOPIFY_SHOP_DOMAIN"]
TOKEN = os.environ["SHOPIFY_ADMIN_API_TOKEN"]
VERSION = os.environ.get("SHOPIFY_API_VERSION", "2026-04")
BASE = f"https://{SHOP}/admin/api/{VERSION}"
HEADERS = {"X-Shopify-Access-Token": TOKEN, "Content-Type": "application/json"}

# Each entry: (title, tag_value, sort_order)
COLLECTIONS = [
    # 服装类型
    ("T-Shirts",            "T-Shirt",              "best-selling"),
    ("Hoodies",             "Hoodie",               "best-selling"),
    ("Sweatshirts",         "Crewneck Sweatshirt",  "best-selling"),
    ("Long Sleeve",         "Long-Sleeve T-Shirt",  "best-selling"),
    ("Polo Shirts",         "Polo Shirt",           "best-selling"),
    ("V-Neck T-Shirts",     "V-Neck T-Shirt",       "best-selling"),
    # 适用人群
    ("Women's",             "Women's",              "best-selling"),
    ("Unisex",              "Unisex",               "best-selling"),
    ("Youth",               "Youth",                "best-selling"),
    # 领型/款式
    ("Crew Neck",           "Crew Neck",            "best-selling"),
    ("V-Neck",              "V-Neck",               "best-selling"),
    ("Hooded",              "Hooded",               "best-selling"),
    ("Polo",                "Polo",                 "best-selling"),
    # 材质
    ("Cotton",              "Cotton",               "best-selling"),
    ("Poly-Cotton Blend",   "Poly-Cotton",          "best-selling"),
    # 版型
    ("Classic Fit",         "Classic Fit",          "best-selling"),
    ("Fitted",              "Fitted",               "best-selling"),
]


def existing_titles() -> set[str]:
    titles: set[str] = set()
    url = f"{BASE}/smart_collections.json?limit=250&fields=title"
    while url:
        r = requests.get(url, headers=HEADERS)
        r.raise_for_status()
        data = r.json()
        for c in data.get("smart_collections", []):
            titles.add(c["title"])
        link = r.headers.get("Link", "")
        url = None
        for part in link.split(","):
            if 'rel="next"' in part:
                url = part.split(";")[0].strip().strip("<>")
    return titles


def create_collection(title: str, tag: str, sort_order: str) -> dict:
    payload = {
        "smart_collection": {
            "title": title,
            "sort_order": sort_order,
            "rules": [
                {"column": "tag", "relation": "equals", "condition": tag}
            ],
            "published": True,
        }
    }
    r = requests.post(f"{BASE}/smart_collections.json", headers=HEADERS, json=payload)
    r.raise_for_status()
    return r.json()["smart_collection"]


def main() -> None:
    print("Fetching existing collections…")
    existing = existing_titles()
    print(f"  Found {len(existing)} existing smart collections")

    for title, tag, sort_order in COLLECTIONS:
        if title in existing:
            print(f"  skip  {title!r} (already exists)")
            continue
        c = create_collection(title, tag, sort_order)
        count = c.get("products_count", "?")
        print(f"  ok    {title!r} → id={c['id']}  products={count}")

    print("\nDone. Collections are now live in your Shopify Admin.")


if __name__ == "__main__":
    main()
