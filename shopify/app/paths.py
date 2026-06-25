from __future__ import annotations

from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
APP_DIR = ROOT_DIR / "app"
DATA_DIR = ROOT_DIR / "data"
ORIGINALS_DIR = DATA_DIR / "originals"
GENERATED_DIR = DATA_DIR / "generated"
APPROVED_DIR = DATA_DIR / "approved"
TEMPLATES_DIR = ROOT_DIR / "templates"
DOCS_DIR = ROOT_DIR / "docs"
DB_PATH = ROOT_DIR / "products.db"
REVIEW_HTML_PATH = ROOT_DIR / "review.html"


def ensure_project_dirs() -> None:
    for path in (DATA_DIR, ORIGINALS_DIR, GENERATED_DIR, APPROVED_DIR, TEMPLATES_DIR):
        path.mkdir(parents=True, exist_ok=True)


def relative_to_root(path: str | Path) -> str:
    path = Path(path)
    if not path.is_absolute():
        return path.as_posix()
    return path.relative_to(ROOT_DIR).as_posix()


def resolve_root_path(path: str | Path | None) -> Path | None:
    if not path:
        return None
    path = Path(path)
    if path.is_absolute():
        return path
    return ROOT_DIR / path

