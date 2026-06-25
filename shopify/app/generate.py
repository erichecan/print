from __future__ import annotations

if __package__ in {None, ""}:
    import sys
    from pathlib import Path

    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import argparse
import base64
import concurrent.futures
import re
from pathlib import Path
from typing import Any

from app.config import get_settings
from app.db import list_products
from app.paths import GENERATED_DIR, resolve_root_path
from app.prompts import ALL_VIEWS, VIEWS, build_prompts


# Each view goes to one OpenAI image-edit call. Portrait for model shots,
# square for macro detail shots — matches what Shopify gallery uses.
VIEW_SIZE = {
    "front": "1024x1536",
    "back": "1024x1536",
    "left": "1024x1536",
    "right": "1024x1536",
    "neckline": "1024x1024",
    "fabric": "1024x1024",
    "mug_front": "1024x1024",
    "mug_angle": "1024x1024",
    "mug_handle": "1024x1024",
    "mug_top": "1024x1024",
    "bag_front": "1024x1536",
    "bag_lifestyle": "1024x1536",
    "bag_flat": "1024x1024",
    "bag_detail": "1024x1024",
}


class BillingLimitError(RuntimeError):
    """Raised when OpenAI returns a billing_hard_limit_reached error."""


def generated_path(product_id: int, color: str, view_key: str) -> Path:
    safe_color = re.sub(r"[^A-Za-z0-9]+", "-", color).strip("-") or "default"
    return GENERATED_DIR / f"{product_id:06d}_{safe_color}_{view_key}.jpg"


def _ensure_client():
    settings = get_settings()
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is missing — set it in .env")
    try:
        from openai import OpenAI
    except ImportError as exc:
        raise RuntimeError(
            "openai is not installed. Run `pip install -r requirements.txt`."
        ) from exc
    return OpenAI(api_key=settings.openai_api_key), settings


def _is_billing_limit(exc: Exception) -> bool:
    text = str(exc).lower()
    return (
        "billing_hard_limit_reached" in text
        or "billing hard limit" in text
        or "you exceeded your current quota" in text
    )


def generate_view(
    product: dict[str, Any],
    color: str,
    view_key: str,
    prompt: str,
    quality: str | None = None,
) -> Path:
    image_rel = product.get("original_image_path") or ""
    image_path = resolve_root_path(image_rel)
    use_edit = image_path is not None and image_path.exists()

    out_path = generated_path(product["id"], color, view_key)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    client, settings = _ensure_client()

    try:
        if use_edit:
            with image_path.open("rb") as fh:
                result = client.images.edit(
                    model=settings.openai_image_model,
                    image=fh,
                    prompt=prompt,
                    n=1,
                    size=VIEW_SIZE.get(view_key, "1024x1024"),
                    quality=quality or settings.openai_image_quality,
                )
        else:
            # No supplier reference image (e.g. mug products) — use text-to-image.
            result = client.images.generate(
                model=settings.openai_image_model,
                prompt=prompt,
                n=1,
                size=VIEW_SIZE.get(view_key, "1024x1024"),
                quality=quality or settings.openai_image_quality,
            )
    except Exception as exc:
        if _is_billing_limit(exc):
            raise BillingLimitError(
                "OpenAI billing hard limit reached. Top up the account or "
                "raise the limit at platform.openai.com/account/billing, "
                "then re-run."
            ) from exc
        raise

    data = result.data[0]
    image_b64 = getattr(data, "b64_json", None)
    if not image_b64:
        raise RuntimeError(f"OpenAI returned no image bytes for view {view_key}")
    out_path.write_bytes(base64.b64decode(image_b64))
    return out_path


def iter_jobs(
    products: list[dict[str, Any]],
    views: list[str],
    force: bool,
) -> list[dict[str, Any]]:
    all_view_keys = {v["key"] for v in ALL_VIEWS}
    jobs: list[dict[str, Any]] = []

    for product in products:
        if product.get("status") != "scraped":
            continue
        color = product.get("color") or ""
        prompts = {p["key"]: p for p in build_prompts(product, color=color)}
        for view_key in views:
            if view_key not in all_view_keys:  # completely unknown view key
                continue
            if view_key not in prompts:  # this product type doesn't use this view
                continue
            out_path = generated_path(product["id"], color, view_key)
            if out_path.exists() and not force:
                continue
            jobs.append(
                {
                    "product": product,
                    "color": color,
                    "view": view_key,
                    "prompt": prompts[view_key]["prompt"],
                    "out_path": out_path,
                }
            )
    return jobs


def run_jobs(
    jobs: list[dict[str, Any]],
    quality: str | None = None,
    max_workers: int = 3,
) -> dict[str, int]:
    counts = {"ok": 0, "fail": 0, "total": len(jobs)}
    if not jobs:
        return counts

    def _do(job):
        product = job["product"]
        try:
            out = generate_view(product, job["color"], job["view"], job["prompt"], quality=quality)
            return job, out, None
        except Exception as exc:
            return job, None, exc

    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as pool:
        for job, out, exc in pool.map(_do, jobs):
            pid = job["product"]["id"]
            color = job["color"]
            view = job["view"]
            if exc is None:
                rel = out.relative_to(GENERATED_DIR.parent)
                print(f"  ok   #{pid:06d} [{color}/{view}] -> {rel}")
                counts["ok"] += 1
            else:
                print(f"  err  #{pid:06d} [{color}/{view}]: {exc}")
                counts["fail"] += 1
                if isinstance(exc, BillingLimitError):
                    print("\n!!! Stopping the rest of the queue — billing limit blocks every call. !!!")
                    pool.shutdown(wait=False, cancel_futures=True)
                    break
    return counts


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Generate ChatGPT product images (6 views per row by default) via the OpenAI API."
    )
    parser.add_argument(
        "--ids",
        help="Comma-separated product IDs to process. Default: all scraped rows.",
    )
    parser.add_argument(
        "--views",
        help="Comma-separated view keys (front,back,left,right,neckline,fabric). Default: all six.",
    )
    parser.add_argument(
        "--quality",
        choices=["low", "medium", "high", "auto"],
        help="Override OPENAI_IMAGE_QUALITY (default: medium → ~$0.04-0.06 per image)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-generate files that already exist on disk",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=3,
        help="Parallel API calls (default: 3). OpenAI image-edit allows modest concurrency.",
    )
    return parser


def main() -> None:
    args = build_parser().parse_args()

    products = list_products(statuses=["scraped"])
    if args.ids:
        wanted = {int(x) for x in re.split(r"[,\s]+", args.ids) if x.strip()}
        products = [p for p in products if p["id"] in wanted]
    if not products:
        raise SystemExit("No scraped products to generate from. Run app/batch.py first.")

    views = (
        [v.strip() for v in re.split(r"[,\s]+", args.views) if v.strip()]
        if args.views
        else [v["key"] for v in ALL_VIEWS]
    )

    jobs = iter_jobs(products, views, force=args.force)
    print(
        f"Planned: {len(jobs)} image(s) across {len(products)} product row(s), "
        f"{len(views)} view(s). Skipping files already on disk unless --force."
    )
    if not jobs:
        print("Nothing to do — every requested view already has a file.")
        return

    counts = run_jobs(jobs, quality=args.quality, max_workers=args.workers)
    print(
        f"\nDone. generated={counts['ok']} failed={counts['fail']} total={counts['total']}\n"
        "Next: python app/make_review_html.py && open review.html"
    )


if __name__ == "__main__":
    main()
