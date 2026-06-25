"""Local color-swap: take one set of fully-generated views (the anchor) and
shift the garment hue/lightness to produce variants for every other color of
the same style. Costs nothing per image — pure numpy + PIL."""

from __future__ import annotations

if __package__ in {None, ""}:
    import sys
    from pathlib import Path

    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import argparse
import re
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image

from app.db import list_products
from app.generate import generated_path
from app.paths import GENERATED_DIR, resolve_root_path
from app.prompts import VIEWS, VIEWS_BAG, VIEWS_MUG, is_bag_product, is_mug_product


def views_for_product(product: dict[str, Any]) -> list[dict[str, str]]:
    if is_mug_product(product):
        return VIEWS_MUG
    if is_bag_product(product):
        return VIEWS_BAG
    return VIEWS


# ---------------------------------------------------------------------------
# HSV conversion (numpy, vectorized)
# ---------------------------------------------------------------------------

def rgb_to_hsv(rgb: np.ndarray) -> np.ndarray:
    """rgb (H,W,3) float in [0,1]. Returns (H,W,3) with H ∈ [0,360), S,V ∈ [0,1]."""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx = np.maximum.reduce([r, g, b])
    mn = np.minimum.reduce([r, g, b])
    d = mx - mn

    v = mx
    s = np.where(mx > 0, d / np.where(mx > 0, mx, 1.0), 0.0)

    h = np.zeros_like(mx)
    has_d = d > 1e-9
    is_r = has_d & (mx == r)
    is_g = has_d & (mx == g) & ~is_r
    is_b = has_d & (mx == b) & ~is_r & ~is_g
    with np.errstate(divide="ignore", invalid="ignore"):
        h = np.where(is_r, ((g - b) / np.where(has_d, d, 1.0)) % 6, h)
        h = np.where(is_g, ((b - r) / np.where(has_d, d, 1.0)) + 2, h)
        h = np.where(is_b, ((r - g) / np.where(has_d, d, 1.0)) + 4, h)
    h = (h * 60.0) % 360.0
    return np.stack([h, s, v], axis=-1)


def hsv_to_rgb(hsv: np.ndarray) -> np.ndarray:
    """Inverse. H ∈ [0,360), S,V ∈ [0,1] → RGB in [0,1]."""
    h = (hsv[..., 0] / 60.0) % 6.0
    s = hsv[..., 1]
    v = hsv[..., 2]
    i = np.floor(h).astype(np.int32) % 6
    f = h - np.floor(h)
    p = v * (1 - s)
    q = v * (1 - f * s)
    t = v * (1 - (1 - f) * s)
    r = np.choose(i, [v, q, p, p, t, v])
    g = np.choose(i, [t, v, v, q, p, p])
    b = np.choose(i, [p, p, t, v, v, q])
    return np.stack([r, g, b], axis=-1)


# ---------------------------------------------------------------------------
# Sampling target color from supplier reference
# ---------------------------------------------------------------------------

def _center_crop(arr: np.ndarray, h_lo=0.32, h_hi=0.52, w_lo=0.40, w_hi=0.60) -> np.ndarray:
    """Crop to the chest/torso patch of a typical full-body model shot — tight
    enough to avoid face, arms, and the jeans waistband."""
    H, W = arr.shape[:2]
    return arr[int(H * h_lo) : int(H * h_hi), int(W * w_lo) : int(W * w_hi)]


# Approximate skin-tone hue range (warm tones) — used to exclude skin pixels
# when sampling chromatic garment colors.
_SKIN_HUE_LO = 5.0
_SKIN_HUE_HI = 45.0


def _looks_like_skin(h: np.ndarray, s: np.ndarray, v: np.ndarray) -> np.ndarray:
    return (h > _SKIN_HUE_LO) & (h < _SKIN_HUE_HI) & (s > 0.15) & (s < 0.70) & (v > 0.30) & (v < 0.90)


def sample_target_color(reference_path: Path) -> dict[str, Any]:
    img = np.asarray(Image.open(reference_path).convert("RGB"), dtype=np.float32) / 255.0
    crop = _center_crop(img)
    hsv = rgb_to_hsv(crop)
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]

    median_s = float(np.median(s))
    median_v = float(np.median(v))

    # Decide achromatic vs chromatic primarily by lightness — dark fabric can
    # carry surprising saturation from ambient color cast, and bright fabric
    # near-white reads as low-S high-V regardless of tint.
    if median_v <= 0.25 and median_s < 0.55:
        return {"category": "black", "value": median_v}
    if median_v >= 0.78 and median_s < 0.25:
        return {"category": "white", "value": median_v}
    if 0.30 <= median_v <= 0.75 and median_s < 0.18:
        return {"category": "grey", "value": median_v}

    # Chromatic — sample saturated, non-skin pixels.
    not_skin = ~_looks_like_skin(h, s, v)
    sat_mask = (s > 0.30) & (v > 0.15) & (v < 0.95) & not_skin
    if sat_mask.sum() < 200:
        sat_mask = (s > 0.30) & (v > 0.15) & (v < 0.95)
    if sat_mask.sum() < 50:
        return {"category": "grey", "value": median_v}

    return {
        "category": "chromatic",
        "hue": float(np.median(h[sat_mask])),
        "sat": float(np.median(s[sat_mask])),
        "value": float(np.median(v[sat_mask])),
    }


# ---------------------------------------------------------------------------
# Recolor
# ---------------------------------------------------------------------------

def garment_mask_weight(
    hsv: np.ndarray,
    anchor_hue: float,
    hue_radius: float,
    sat_threshold: float,
    sat_feather: float,
    hue_plateau_frac: float = 0.75,
) -> np.ndarray:
    """Soft mask weight in [0,1]. Plateau at 1.0 inside the garment, smooth
    falloff only at the boundary. A plateau interior prevents residual anchor
    color from showing through after RGB blending (pale-blue tint problem)."""
    h, s = hsv[..., 0], hsv[..., 1]

    hue_dist = np.minimum(np.abs(h - anchor_hue), 360.0 - np.abs(h - anchor_hue))
    hue_falloff = hue_radius * (1.0 - hue_plateau_frac)
    hue_weight = np.clip((hue_radius - hue_dist) / max(hue_falloff, 1e-6), 0.0, 1.0)

    sat_weight = np.clip((s - sat_threshold) / max(sat_feather, 1e-6), 0.0, 1.0)

    return hue_weight * sat_weight


def recolor_image(
    rgb: np.ndarray,
    anchor_hue: float,
    target: dict[str, Any],
    hue_radius: float = 55.0,
    sat_threshold: float = 0.28,
    sat_feather: float = 0.12,
) -> np.ndarray:
    hsv = rgb_to_hsv(rgb)
    weight = garment_mask_weight(hsv, anchor_hue, hue_radius, sat_threshold, sat_feather)

    # Protect skin tones: pixels that look like skin should never be recolored,
    # even when the anchor hue overlaps with warm/pink skin-adjacent colors.
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    skin = _looks_like_skin(h, s, v)
    weight = weight * (~skin).astype(np.float32)

    # Median anchor values inside the mask — use for proportional remapping.
    inside = weight > 0.5
    if inside.sum() < 50:
        return rgb  # nothing to recolor

    anchor_med_s = float(np.median(hsv[..., 1][inside]))
    anchor_med_v = float(np.median(hsv[..., 2][inside]))
    anchor_med_s = max(anchor_med_s, 0.05)
    anchor_med_v = max(anchor_med_v, 0.05)

    new_hsv = hsv.copy()

    if target["category"] == "chromatic":
        sat_scale = target["sat"] / anchor_med_s
        val_scale = target["value"] / anchor_med_v
        new_hsv[..., 0] = target["hue"]
        new_hsv[..., 1] = np.clip(hsv[..., 1] * sat_scale, 0.0, 1.0)
        new_hsv[..., 2] = np.clip(hsv[..., 2] * val_scale, 0.0, 1.0)
    elif target["category"] == "white":
        val_shift = target["value"] - anchor_med_v
        new_hsv[..., 1] = 0.0
        new_hsv[..., 2] = np.clip(hsv[..., 2] + val_shift, 0.0, 1.0)
    elif target["category"] == "black":
        val_scale = target["value"] / anchor_med_v
        new_hsv[..., 1] = 0.0
        new_hsv[..., 2] = np.clip(hsv[..., 2] * val_scale, 0.0, 1.0)
    else:  # grey
        val_shift = target["value"] - anchor_med_v
        new_hsv[..., 1] = 0.0
        new_hsv[..., 2] = np.clip(hsv[..., 2] + val_shift, 0.0, 1.0)

    new_rgb = hsv_to_rgb(new_hsv)
    w = weight[..., None]
    return rgb * (1.0 - w) + new_rgb * w


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------

def anchor_views_present(product: dict[str, Any]) -> bool:
    color = product.get("color") or ""
    for view in views_for_product(product):
        if not generated_path(product["id"], color, view["key"]).exists():
            return False
    return True


def find_anchor(products: list[dict[str, Any]]) -> dict[str, Any] | None:
    for p in products:
        if anchor_views_present(p):
            return p
    return None


def detect_anchor_hue(anchor: dict[str, Any]) -> float:
    ref = resolve_root_path(anchor.get("original_image_path"))
    if ref and ref.exists():
        sample = sample_target_color(ref)
        if sample["category"] == "chromatic":
            return float(sample["hue"])
    # Fall back: sample from one of the generated views directly
    first_view_key = views_for_product(anchor)[0]["key"]
    sample_path = generated_path(anchor["id"], anchor.get("color") or "", first_view_key)
    img = np.asarray(Image.open(sample_path).convert("RGB"), dtype=np.float32) / 255.0
    sample = sample_target_color(sample_path)
    return float(sample.get("hue", 210.0))


def run_recolor(
    anchor_id: int | None = None,
    target_ids: list[int] | None = None,
    force: bool = False,
) -> dict[str, int]:
    products = list_products(statuses=["scraped"])
    if anchor_id is not None:
        anchor = next((p for p in products if p["id"] == anchor_id), None)
        if anchor is None:
            raise SystemExit(f"Product #{anchor_id} not found.")
        if not anchor_views_present(anchor):
            raise SystemExit(
                f"Anchor product #{anchor_id} doesn't have all 6 generated views yet. "
                f"Run `python app/generate.py --ids {anchor_id}` first."
            )
    else:
        anchor = find_anchor(products)
        if anchor is None:
            raise SystemExit(
                "No anchor product found. Run `python app/generate.py --ids <id>` "
                "to create one full set of 6 generated views first."
            )

    anchor_hue = detect_anchor_hue(anchor)
    print(f"Anchor: #{anchor['id']:06d} color={anchor['color']} hue≈{anchor_hue:.0f}°")

    counts = {"ok": 0, "skip": 0, "fail": 0}
    for product in products:
        if product["id"] == anchor["id"]:
            continue
        if target_ids and product["id"] not in target_ids:
            continue

        ref = resolve_root_path(product.get("original_image_path"))
        if not ref or not ref.exists():
            print(f"  skip #{product['id']:06d} {product['color']}: no supplier reference")
            counts["skip"] += 1
            continue

        target = sample_target_color(ref)
        cat = target["category"]
        if cat == "chromatic":
            print(
                f"\n>> #{product['id']:06d} {product['color']} -> "
                f"hue={target['hue']:.0f}° sat={target['sat']:.2f} v={target['value']:.2f}"
            )
        else:
            print(
                f"\n>> #{product['id']:06d} {product['color']} -> "
                f"{cat} v={target['value']:.2f}"
            )

        for view in views_for_product(anchor):
            anchor_path = generated_path(anchor["id"], anchor.get("color") or "", view["key"])
            out_path = generated_path(product["id"], product.get("color") or "", view["key"])

            if out_path.exists() and not force:
                print(f"   skip {view['key']} (exists)")
                counts["skip"] += 1
                continue

            try:
                anchor_arr = np.asarray(Image.open(anchor_path).convert("RGB"), dtype=np.float32) / 255.0
                recolored = recolor_image(anchor_arr, anchor_hue, target)
                out_img = (recolored * 255.0).clip(0, 255).astype(np.uint8)
                out_path.parent.mkdir(parents=True, exist_ok=True)
                Image.fromarray(out_img).save(out_path, quality=92)
                print(f"   ok   {view['key']} -> {out_path.relative_to(GENERATED_DIR.parent)}")
                counts["ok"] += 1
            except Exception as exc:
                print(f"   err  {view['key']}: {exc}")
                counts["fail"] += 1

    return counts


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Color-swap an anchor product's generated views into every other "
        "color the URL offers. No API calls — pure numpy/PIL hue remapping."
    )
    parser.add_argument(
        "--anchor",
        type=int,
        help="Product ID to use as anchor (must have all 6 generated views). "
        "Default: auto-detect the first product that has them.",
    )
    parser.add_argument(
        "--ids",
        help="Comma-separated target product IDs. Default: every product except the anchor.",
    )
    parser.add_argument("--force", action="store_true", help="Overwrite existing recolored files")
    return parser


def main() -> None:
    args = build_parser().parse_args()
    target_ids = None
    if args.ids:
        target_ids = [int(x) for x in re.split(r"[,\s]+", args.ids) if x.strip()]
    counts = run_recolor(anchor_id=args.anchor, target_ids=target_ids, force=args.force)
    print(
        f"\nDone. recolored={counts['ok']} skipped={counts['skip']} failed={counts['fail']}\n"
        "Next: python app/make_review_html.py && open review.html"
    )


if __name__ == "__main__":
    main()
