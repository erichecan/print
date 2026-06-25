"""上传 graduation_2025/ 目录下的 12 张图片到 Shopify CDN，输出 JSON manifest。"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.config import get_settings
from app.upload_to_shopify import upload_one

GRADUATION_DIR = Path(__file__).parent / "graduation_2025"
MANIFEST_PATH = Path(__file__).parent / "graduation_manifest.json"


def main() -> None:
    settings = get_settings()
    endpoint = (
        f"https://{settings.shopify_shop_domain}"
        f"/admin/api/{settings.shopify_api_version}/graphql.json"
    )
    token = settings.shopify_admin_api_token
    timeout = settings.request_timeout_seconds

    manifest: dict[str, str] = {}
    if MANIFEST_PATH.exists():
        manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))

    images = sorted(GRADUATION_DIR.glob("*.png")) + sorted(GRADUATION_DIR.glob("*.jpg"))
    print(f"找到 {len(images)} 张图片，{sum(1 for f in images if f.name in manifest)} 张已上传过。")

    for img in images:
        if img.name in manifest:
            print(f"  skip  {img.name} -> {manifest[img.name]}")
            continue
        print(f"  uploading  {img.name} ...", end=" ", flush=True)
        try:
            url = upload_one(img, endpoint, token, timeout)
            manifest[img.name] = url
            print(f"ok -> {url}")
        except Exception as exc:
            print(f"FAILED: {exc}")

    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2, ensure_ascii=False, sort_keys=True))
    print(f"\nManifest 已保存到 {MANIFEST_PATH}")
    print(f"成功上传: {sum(1 for v in manifest.values() if v)} / {len(images)}")


if __name__ == "__main__":
    main()
