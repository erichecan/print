"""Upload every image in data/generated/ to Shopify Files via the GraphQL
Admin API and save a filename → CDN URL manifest. Idempotent: re-running
skips files already in the manifest.

One-time setup:
  Shopify Admin → Settings → Apps and sales channels → Develop apps
  → Create an app → Configuration → Admin API access scopes
  → enable `write_files`, `read_files` → Save
  → Install app → copy the Admin API access token (`shpat_...`)
  Put it in .env as SHOPIFY_SHOP_DOMAIN + SHOPIFY_ADMIN_API_TOKEN."""

from __future__ import annotations

if __package__ in {None, ""}:
    import sys
    from pathlib import Path

    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import argparse
import concurrent.futures
import json
import mimetypes
import time
from pathlib import Path
from typing import Any

import requests

from app.config import get_settings
from app.paths import GENERATED_DIR, ROOT_DIR


STAGED_UPLOADS_CREATE = """
mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
  stagedUploadsCreate(input: $input) {
    stagedTargets {
      url
      resourceUrl
      parameters { name value }
    }
    userErrors { field message }
  }
}
"""

FILE_CREATE = """
mutation fileCreate($files: [FileCreateInput!]!) {
  fileCreate(files: $files) {
    files {
      id
      fileStatus
      ... on MediaImage {
        image { url }
      }
    }
    userErrors { field message }
  }
}
"""

FILE_NODE_QUERY = """
query getFile($id: ID!) {
  node(id: $id) {
    ... on MediaImage {
      id
      fileStatus
      image { url }
    }
  }
}
"""


class ShopifyError(RuntimeError):
    pass


def _graphql(endpoint: str, token: str, query: str, variables: dict[str, Any], timeout: int = 60) -> dict[str, Any]:
    response = requests.post(
        endpoint,
        json={"query": query, "variables": variables},
        headers={
            "X-Shopify-Access-Token": token,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        timeout=timeout,
    )
    response.raise_for_status()
    payload = response.json()
    if "errors" in payload and payload["errors"]:
        raise ShopifyError(f"GraphQL errors: {payload['errors']}")
    return payload["data"]


def _check_user_errors(data: dict[str, Any], mutation_key: str) -> None:
    errors = data.get(mutation_key, {}).get("userErrors") or []
    if errors:
        raise ShopifyError(f"{mutation_key} userErrors: {errors}")


def upload_one(
    path: Path,
    endpoint: str,
    token: str,
    timeout: int,
) -> str:
    """Upload one file via Shopify's two-step flow. Returns the cdn.shopify.com URL."""
    mime = mimetypes.guess_type(path.name)[0] or "image/jpeg"
    size_bytes = path.stat().st_size

    # Step 1: ask Shopify for a presigned staged upload target.
    data = _graphql(
        endpoint,
        token,
        STAGED_UPLOADS_CREATE,
        {
            "input": [
                {
                    "filename": path.name,
                    "mimeType": mime,
                    "resource": "FILE",
                    "fileSize": str(size_bytes),
                    "httpMethod": "POST",
                }
            ]
        },
        timeout=timeout,
    )
    _check_user_errors(data, "stagedUploadsCreate")
    targets = data["stagedUploadsCreate"]["stagedTargets"]
    if not targets:
        raise ShopifyError("stagedUploadsCreate returned no targets")
    target = targets[0]

    # Step 2: POST the file bytes to the staged URL with the supplied form params.
    form = {p["name"]: p["value"] for p in target["parameters"]}
    with path.open("rb") as fh:
        upload_response = requests.post(
            target["url"],
            data=form,
            files={"file": (path.name, fh, mime)},
            timeout=timeout * 4,
        )
    if upload_response.status_code not in (200, 201, 204):
        raise ShopifyError(
            f"Staged upload failed ({upload_response.status_code}): "
            f"{upload_response.text[:300]}"
        )

    # Step 3: register the uploaded file as a Shopify File and wait for the
    # CDN URL to become available.
    data = _graphql(
        endpoint,
        token,
        FILE_CREATE,
        {
            "files": [
                {
                    "alt": path.stem,
                    "contentType": "IMAGE",
                    "originalSource": target["resourceUrl"],
                }
            ]
        },
        timeout=timeout,
    )
    _check_user_errors(data, "fileCreate")
    files = data["fileCreate"]["files"]
    if not files:
        raise ShopifyError("fileCreate returned no files")

    file_id = files[0]["id"]

    # Step 4: poll until the file is READY and the CDN URL is populated.
    for attempt in range(40):
        time.sleep(1 if attempt < 5 else 2)
        node = _graphql(endpoint, token, FILE_NODE_QUERY, {"id": file_id}, timeout=timeout).get("node")
        if not node:
            continue
        url = (node.get("image") or {}).get("url")
        status = node.get("fileStatus")
        if url and status == "READY":
            return url
        if status == "FAILED":
            raise ShopifyError(f"Shopify reported the file as FAILED for {path.name}")

    raise ShopifyError(f"Timed out waiting for Shopify to process {path.name}")


def load_manifest(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def save_manifest(manifest: dict[str, str], path: Path) -> None:
    path.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False, sort_keys=True),
        encoding="utf-8",
    )


def run_upload(
    source_dir: Path,
    manifest_path: Path,
    workers: int = 3,
    force: bool = False,
) -> dict[str, int]:
    settings = get_settings()
    if not settings.shopify_shop_domain or not settings.shopify_admin_api_token:
        raise SystemExit(
            "Shopify credentials missing. Set SHOPIFY_SHOP_DOMAIN and "
            "SHOPIFY_ADMIN_API_TOKEN in .env (see .env.example for the "
            "Custom App setup instructions)."
        )

    endpoint = (
        f"https://{settings.shopify_shop_domain}"
        f"/admin/api/{settings.shopify_api_version}/graphql.json"
    )
    token = settings.shopify_admin_api_token
    timeout = settings.request_timeout_seconds

    manifest = load_manifest(manifest_path)
    files = sorted(source_dir.glob("*.jpg")) + sorted(source_dir.glob("*.png"))
    if not files:
        raise SystemExit(f"No images under {source_dir}")

    todo = [
        f for f in files
        if force or f.name not in manifest
    ]
    counts = {"ok": 0, "fail": 0, "skipped": len(files) - len(todo), "total": len(files)}
    print(
        f"Found {len(files)} image(s); "
        f"{counts['skipped']} already in manifest, {len(todo)} to upload."
    )
    if not todo:
        return counts

    def _do(path: Path) -> tuple[Path, str | None, Exception | None]:
        try:
            url = upload_one(path, endpoint, token, timeout)
            return path, url, None
        except Exception as exc:
            return path, None, exc

    save_every = 5  # checkpoint manifest periodically
    pending = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as pool:
        for path, url, exc in pool.map(_do, todo):
            if exc is None:
                manifest[path.name] = url
                counts["ok"] += 1
                print(f"  ok  {path.name} -> {url}")
            else:
                counts["fail"] += 1
                print(f"  err {path.name}: {exc}")
            pending += 1
            if pending >= save_every:
                save_manifest(manifest, manifest_path)
                pending = 0

    save_manifest(manifest, manifest_path)
    return counts


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Upload data/generated/*.jpg to Shopify Files and write a "
        "filename → CDN URL manifest."
    )
    parser.add_argument(
        "--source",
        default=str(GENERATED_DIR),
        help="Directory of images to upload (default: data/generated/)",
    )
    parser.add_argument(
        "--manifest",
        default=str(ROOT_DIR / "shopify_upload_manifest.json"),
        help="Where to write the filename → CDN URL JSON map",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=3,
        help="Parallel uploads (default: 3). Shopify rate-limits aggressively; "
        "raise carefully.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-upload files even if they're already in the manifest",
    )
    return parser


def main() -> None:
    args = build_parser().parse_args()
    source = Path(args.source)
    if not source.is_absolute():
        source = ROOT_DIR / source
    manifest_path = Path(args.manifest)
    if not manifest_path.is_absolute():
        manifest_path = ROOT_DIR / manifest_path

    counts = run_upload(source, manifest_path, workers=args.workers, force=args.force)
    print(
        f"\nDone. total={counts['total']} uploaded={counts['ok']} "
        f"failed={counts['fail']} already_present={counts['skipped']}"
    )
    print(f"Manifest: {manifest_path}")
    print(
        "\nNext: python app/make_shopify_csv.py "
        f"--upload-manifest {manifest_path.name}"
    )


if __name__ == "__main__":
    main()
