from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from app.paths import ROOT_DIR


def load_env_file(path: Path | None = None) -> None:
    env_path = path or ROOT_DIR / ".env"
    if not env_path.exists():
        return

    try:
        from dotenv import load_dotenv
    except ImportError:
        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))
        return

    load_dotenv(env_path)


@dataclass(frozen=True)
class Settings:
    openai_api_key: str | None
    openai_image_model: str
    openai_image_quality: str
    request_timeout_seconds: int
    scrape_user_agent: str
    shopify_shop_domain: str | None
    shopify_admin_api_token: str | None
    shopify_api_version: str


def get_settings() -> Settings:
    load_env_file()
    shop = os.getenv("SHOPIFY_SHOP_DOMAIN") or None
    if shop:
        shop = shop.strip()
        for prefix in ("https://", "http://"):
            if shop.startswith(prefix):
                shop = shop[len(prefix):]
                break
        shop = shop.rstrip("/")
    return Settings(
        openai_api_key=os.getenv("OPENAI_API_KEY") or None,
        openai_image_model=os.getenv("OPENAI_IMAGE_MODEL", "gpt-image-1"),
        openai_image_quality=os.getenv("OPENAI_IMAGE_QUALITY", "medium"),
        request_timeout_seconds=int(os.getenv("REQUEST_TIMEOUT_SECONDS", "120")),
        scrape_user_agent=os.getenv(
            "SCRAPE_USER_AGENT",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0 Safari/537.36 PrintNGo/0.1",
        ),
        shopify_shop_domain=shop,
        shopify_admin_api_token=os.getenv("SHOPIFY_ADMIN_API_TOKEN") or None,
        shopify_api_version=os.getenv("SHOPIFY_API_VERSION", "2025-01"),
    )
