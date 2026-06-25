#!/usr/bin/env python3
"""
Gildan 64V00L — 三个问题颜色 × 4 视角，用 Codex CLI imagegen 重新生成。

目标产品：
  ID 6  color 030 (White)  ref: data/originals/000006_030.jpg
  ID 73 color 032 (Navy)   ref: data/originals/000073_032.jpg
  ID 74 color 036 (Black)  ref: data/originals/000074_036.jpg

用法：
  cd shopify/
  python generate_64v00l_codex.py            # 生成所有缺失图片
  python generate_64v00l_codex.py --force    # 强制覆盖已有图片
  python generate_64v00l_codex.py --dry-run  # 只打印 prompt，不生成
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.db import list_products
from app.paths import GENERATED_DIR, resolve_root_path
from app.prompts import build_prompts

ROOT = Path(__file__).resolve().parent
GENERATED = GENERATED_DIR
CODEX_BASE = Path.home() / ".codex" / "generated_images"
GENERATED.mkdir(parents=True, exist_ok=True)

TARGET_IDS = [6, 73, 74]
TARGET_VIEWS = {"front", "back", "left", "right"}


def _snapshot() -> set[Path]:
    if not CODEX_BASE.exists():
        return set()
    return {d for d in CODEX_BASE.glob("*/") if d.is_dir()}


def _find_new_session(before: set[Path], timeout: int = 240) -> Path | None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        time.sleep(2)
        after = {d for d in CODEX_BASE.glob("*/") if d.is_dir()}
        new = after - before
        if new:
            sess = sorted(new, key=lambda p: p.stat().st_ctime)[-1]
            imgs = list(sess.glob("*.png")) + list(sess.glob("*.jpg"))
            if imgs:
                return sess
    return None


def run_codex(prompt_text: str, ref_img: Path | None, out_path: Path, tag: str) -> bool:
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
    if ref_img and ref_img.exists():
        cmd += ["--image", str(ref_img)]
    cmd.append("-")

    body = (
        "Use imagegen to create an image with this request:\n"
        + prompt_text
        + "\n\nRequirements:\n"
          "- Generate the image directly\n"
          "- Do not provide explanation\n"
          "- Return only the image result"
    )

    before = _snapshot()

    try:
        result = subprocess.run(
            cmd, input=body, capture_output=True, text=True, timeout=300
        )
    except subprocess.TimeoutExpired:
        print(f"  ❌ timeout  {tag}")
        return False
    except Exception as e:
        print(f"  ❌ error    {tag}: {e}")
        return False

    sess = _find_new_session(before, timeout=60)
    if not sess:
        print(f"  ❌ no output session found for {tag}")
        if result.stderr:
            print(f"     stderr: {result.stderr[:300]}")
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


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="覆盖已有图片")
    parser.add_argument("--dry-run", action="store_true", help="只打印 prompt，不生成")
    args = parser.parse_args()

    products = list_products()
    by_id = {p["id"]: p for p in products}

    total_ok = 0
    total_fail = 0

    for pid in TARGET_IDS:
        product = by_id.get(pid)
        if product is None:
            print(f"⚠️  产品 #{pid} 不在数据库中，跳过")
            continue

        color = product.get("color") or "default"
        ref_rel = product.get("original_image_path") or ""
        ref_img = resolve_root_path(ref_rel)

        print(f"\n{'═'*60}")
        print(f"  #{pid:06d}  color={color}  ref={ref_img.name if ref_img else 'N/A'}")
        print(f"{'═'*60}")

        view_list = build_prompts(product)

        for view in view_list:
            view_key = view["key"]
            if view_key not in TARGET_VIEWS:
                continue

            out_path = GENERATED / f"{pid:06d}_{color}_{view_key}.jpg"

            if args.force and out_path.exists():
                out_path.unlink()

            if args.dry_run:
                print(f"\n  [{view_key}] → {out_path.name}")
                print("  " + view["prompt"][:300] + "…")
                continue

            ok = run_codex(view["prompt"], ref_img, out_path, f"#{pid} {view_key}")
            if ok:
                total_ok += 1
            else:
                total_fail += 1

    if not args.dry_run:
        print(f"\n{'═'*60}")
        print(f"完成。ok={total_ok}  fail={total_fail}")
        if total_ok > 0:
            print("\n下一步：")
            print("  1. open review.html              # 检查效果")
            print("  2. python app/upload_to_shopify.py   # 上传到 CDN")
            print("  3. 在 printngoplus.com 后台检查产品图片")


if __name__ == "__main__":
    main()
