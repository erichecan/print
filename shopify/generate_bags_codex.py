#!/usr/bin/env python3
"""
Tote bag realistic image generator — uses Codex CLI (codex exec) with imagegen.

Generates 4 views × 2 colors = 8 images.
Output → shopify/data/generated/{product_id}_{color_slug}_{view_key}.jpg

Usage:
    cd shopify/
    python generate_bags_codex.py            # generate all 8 images
    python generate_bags_codex.py --force    # overwrite existing images
    python generate_bags_codex.py --dry-run  # print prompts, don't generate
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent
GENERATED = ROOT / "data" / "generated"
ORIGINALS  = ROOT / "data" / "originals"
CODEX_BASE = Path.home() / ".codex" / "generated_images"
GENERATED.mkdir(parents=True, exist_ok=True)

# ── Products (only Black and Natural per user directive) ────────────────────────
PRODUCTS = [
    {
        "product_id": "000121",
        "color": "Black",
        "color_slug": "Black",
        "ref_img": str(ORIGINALS / "customink_2435100_2435100_front.png"),
    },
    {
        "product_id": "000130",
        "color": "Natural",
        "color_slug": "Natural",
        "ref_img": str(ORIGINALS / "customink_2435100_2435103_front.png"),
    },
]

# ── Prompt builder ──────────────────────────────────────────────────────────────
def build_prompts(color: str) -> dict[str, dict]:
    """Return 4 view prompts for one bag color."""

    color_desc = {
        "Black":   "matte black cotton canvas, deep charcoal-black fabric with subtle natural woven texture",
        "Natural": "natural linen-beige cotton canvas, warm off-white/ecru fabric with visible woven texture",
    }[color]

    return {
        # ── bag_front: clean product shot ──────────────────────────────────────
        "bag_front": {
            "type": "professional e-commerce product photography",
            "subject": f"medium cotton canvas tote bag — {color_desc} — blank with no printing, hanging naturally from invisible hook",
            "lighting": "soft diffused studio lighting from upper-left at 45°, gentle realistic shadow cast to the lower-right, natural fabric creases visible",
            "background": "pure clean white seamless backdrop, no gradients",
            "composition": "bag centered, handles at top, slight 3/4 angle to show depth and dimension",
            "camera": "Canon EOS R5, 85mm f/2.8, ISO 200, natural studio strobe",
            "quality": "REAL PHOTOGRAPH, razor-sharp fabric weave detail, authentic cotton canvas wrinkles, natural highlights on fabric — NOT flat illustration, NOT AI mockup",
        },

        # ── bag_lifestyle: white woman model carrying bag ───────────────────────
        "bag_lifestyle": {
            "IMPORTANT": "A REAL WHITE WOMAN must be visibly carrying/wearing the tote bag. This is a LIFESTYLE PERSON photo, NOT a product-only shot.",
            "type": "editorial lifestyle fashion photography",
            "model": "25-32 years old white woman, light skin, natural blonde or brunette hair, minimal natural makeup, genuine relaxed smile",
            "clothing": f"fitted white crew-neck t-shirt (tucked slightly), light beige linen wide-leg trousers — clean simple outfit that lets the {color} bag stand out",
            "bag": f"medium cotton canvas tote bag — {color_desc} — worn over one shoulder or carried in the crook of her arm, natural weight drape",
            "setting": "bright outdoor city sidewalk or sunlit café patio, warm afternoon light, slight bokeh background",
            "pose": "walking naturally mid-stride OR standing relaxed leaning against a wall, bag clearly visible, confident casual body language",
            "camera": "Canon EOS R5, 50mm f/1.8, golden hour natural light, shallow depth of field",
            "skin_detail": "visible natural skin texture, slight sun on skin, NOT retouched, NOT smoothed, real pores, authentic",
            "quality": "REAL PHOTOGRAPH — the kind shot for a premium tote brand's Instagram — NOT AI-generated, NOT mannequin, NOT flat",
        },

        # ── bag_flat: overhead flat lay ─────────────────────────────────────────
        "bag_flat": {
            "type": "overhead flat lay product photography, perfectly vertical 90° top-down camera angle",
            "subject": f"medium cotton canvas tote bag — {color_desc} — laid flat, slightly open at top, handles spread naturally",
            "props": "small linen notebook with kraft-paper cover, thin black pen resting diagonally, a sprig of dried lavender or eucalyptus — minimalist clean props",
            "background": "white marble surface with very subtle grey veining, or clean bleached oak wood",
            "lighting": "soft north window daylight from the left, realistic natural shadows under bag handles, fabric texture visible",
            "camera": "Canon EOS R5 overhead rig, 50mm f/4, daylight balanced",
            "quality": "REAL PHOTOGRAPH, crisp shadow edges, authentic fabric texture, no reflection issues — e-commerce flat lay style like Etsy/Anthropologie",
        },

        # ── bag_detail: close-up texture shot ──────────────────────────────────
        "bag_detail": {
            "type": "macro/close-up product detail photography",
            "subject": f"extreme close-up of the {color_desc} tote bag — focus on the top edge/strap attachment seam and woven canvas surface, showing authentic material quality",
            "lighting": "raking side light to emphasize fabric texture, deep shadow in the canvas weave showing 3D depth",
            "focus": "sharp on woven canvas threads and double-stitched seam, handle naturally blurred in background",
            "camera": "Canon EOS R5, 100mm macro f/4, studio strobe with snoot",
            "quality": "REAL PHOTOGRAPH, individual cotton fibers visible, honest material texture — NOT illustration, shows genuine premium canvas quality",
        },
    }


# ── Codex CLI execution ─────────────────────────────────────────────────────────
def _snapshot() -> set[Path]:
    if not CODEX_BASE.exists():
        return set()
    return {d for d in CODEX_BASE.glob("*/") if d.is_dir()}


def _find_new_session(before: set[Path], timeout: int = 180) -> Path | None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        time.sleep(2)
        after = {d for d in CODEX_BASE.glob("*/") if d.is_dir()}
        new = after - before
        if new:
            # Pick the newest-created
            sess = sorted(new, key=lambda p: p.stat().st_ctime)[-1]
            imgs = list(sess.glob("*.png")) + list(sess.glob("*.jpg"))
            if imgs:
                return sess
    return None


def run_codex(prompt: dict, ref_img: str | None, out_path: Path, tag: str) -> bool:
    if out_path.exists():
        print(f"  ⏭️  skip  {out_path.name}")
        return True

    print(f"  🎨 gen   {tag} …", flush=True)

    cmd = [
        "codex", "exec",
        "--ephemeral",
        "--skip-git-repo-check",
        "--sandbox", "read-only",
        "--color", "never",
    ]
    if ref_img and Path(ref_img).exists():
        cmd += ["--image", ref_img]
    cmd.append("-")

    body = (
        "Use imagegen to create an image with this request:\n"
        + json.dumps(prompt, ensure_ascii=False)
        + "\n\nRequirements:\n"
          "- Generate the image directly\n"
          "- Do not provide explanation\n"
          "- Return only the image result"
    )

    before = _snapshot()

    try:
        result = subprocess.run(
            cmd, input=body, capture_output=True, text=True, timeout=240
        )
    except subprocess.TimeoutExpired:
        print(f"  ❌ timeout  {tag}")
        return False
    except Exception as e:
        print(f"  ❌ error    {tag}: {e}")
        return False

    sess = _find_new_session(before, timeout=30)
    if not sess:
        print(f"  ❌ no output found for {tag}")
        if result.stderr:
            print(f"     stderr: {result.stderr[:200]}")
        return False

    imgs = sorted(sess.glob("*.png")) + sorted(sess.glob("*.jpg"))
    if not imgs:
        print(f"  ❌ session dir empty for {tag}")
        shutil.rmtree(sess, ignore_errors=True)
        return False

    shutil.copy2(imgs[0], out_path)
    shutil.rmtree(sess, ignore_errors=True)
    print(f"  ✅ saved  {out_path.name}")
    return True


# ── Main ────────────────────────────────────────────────────────────────────────
def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="Overwrite existing images")
    parser.add_argument("--dry-run", action="store_true", help="Print prompts without generating")
    args = parser.parse_args()

    if args.force:
        print("⚠️  --force: will overwrite existing images\n")

    total_ok = 0
    total_fail = 0

    for p in PRODUCTS:
        pid       = p["product_id"]
        color     = p["color"]
        slug      = p["color_slug"]
        ref       = p["ref_img"]
        prompts   = build_prompts(color)

        print(f"\n{'═'*60}")
        print(f"  {pid} — {color} tote bag")
        print(f"  ref: {Path(ref).name}")
        print(f"{'═'*60}")

        for view_key, prompt in prompts.items():
            out = GENERATED / f"{pid}_{slug}_{view_key}.jpg"

            if args.force and out.exists():
                out.unlink()

            if args.dry_run:
                print(f"\n  [{view_key}] → {out.name}")
                print("  " + json.dumps(prompt, indent=2, ensure_ascii=False)[:300] + "…")
                continue

            ok = run_codex(prompt, ref, out, f"{pid} {view_key}")
            if ok:
                total_ok += 1
            else:
                total_fail += 1

    if not args.dry_run:
        print(f"\n{'═'*60}")
        print(f"Done.  ok={total_ok}  fail={total_fail}")
        if total_ok > 0:
            print(f"\nNext steps:")
            print(f"  1. python app/upload_to_shopify.py   # re-upload to CDN")
            print(f"  2. node scripts/seed-tote-bags-online.js   # update dev DB")


if __name__ == "__main__":
    main()
