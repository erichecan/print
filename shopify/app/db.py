from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from typing import Any, Iterable

from app.paths import DB_PATH, ensure_project_dirs


STATUSES = {"scraped", "failed"}

PRODUCT_COLUMNS = {
    "supplier_url",
    "color",
    "product_name",
    "brand",
    "style_number",
    "category",
    "description",
    "original_image_url",
    "original_image_path",
    "status",
    "error_message",
}


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def connect() -> sqlite3.Connection:
    ensure_project_dirs()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    with connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                supplier_url TEXT NOT NULL,
                color TEXT NOT NULL DEFAULT '',
                product_name TEXT NOT NULL DEFAULT '',
                brand TEXT NOT NULL DEFAULT '',
                style_number TEXT NOT NULL DEFAULT '',
                category TEXT NOT NULL DEFAULT '',
                description TEXT NOT NULL DEFAULT '',
                original_image_url TEXT NOT NULL DEFAULT '',
                original_image_path TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL DEFAULT 'scraped',
                error_message TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE (supplier_url, color)
            )
            """
        )
        conn.commit()


def validate_status(status: str) -> None:
    if status not in STATUSES:
        raise ValueError(f"Unknown product status: {status}")


def upsert_scraped_product(product: dict[str, Any]) -> int:
    init_db()
    now = utc_now()
    supplier_url = product.get("supplier_url")
    if not supplier_url:
        raise ValueError("supplier_url is required")

    fields = {
        "supplier_url": supplier_url,
        "color": product.get("color") or "",
        "product_name": product.get("product_name") or "",
        "brand": product.get("brand") or "",
        "style_number": product.get("style_number") or "",
        "category": product.get("category") or "",
        "description": product.get("description") or "",
        "original_image_url": product.get("original_image_url") or "",
        "original_image_path": product.get("original_image_path") or "",
        "status": product.get("status") or "scraped",
        "error_message": product.get("error_message") or "",
    }
    validate_status(fields["status"])

    insert_columns = [*fields.keys(), "created_at", "updated_at"]
    insert_values = [*fields.values(), now, now]
    placeholders = ", ".join("?" for _ in insert_columns)
    updates = ", ".join(
        f"{column}=excluded.{column}"
        for column in fields
        if column not in {"supplier_url", "color"}
    )

    with connect() as conn:
        conn.execute(
            f"""
            INSERT INTO products ({", ".join(insert_columns)})
            VALUES ({placeholders})
            ON CONFLICT(supplier_url, color) DO UPDATE SET
                {updates},
                updated_at=excluded.updated_at
            """,
            insert_values,
        )
        row = conn.execute(
            "SELECT id FROM products WHERE supplier_url = ? AND color = ?",
            (supplier_url, fields["color"]),
        ).fetchone()
        conn.commit()
        return int(row["id"])


def update_product(product_id: int, **fields: Any) -> None:
    init_db()
    if not fields:
        return

    unknown = set(fields) - PRODUCT_COLUMNS
    if unknown:
        raise ValueError(f"Unknown product columns: {', '.join(sorted(unknown))}")
    if "status" in fields:
        validate_status(str(fields["status"]))

    fields["updated_at"] = utc_now()
    assignments = ", ".join(f"{key}=?" for key in fields)
    values = [*fields.values(), product_id]

    with connect() as conn:
        conn.execute(f"UPDATE products SET {assignments} WHERE id=?", values)
        conn.commit()


def get_product(product_id: int) -> dict[str, Any]:
    init_db()
    with connect() as conn:
        row = conn.execute("SELECT * FROM products WHERE id = ?", (product_id,)).fetchone()
    if row is None:
        raise ValueError(f"Product not found: {product_id}")
    return dict(row)


def list_products(statuses: Iterable[str] | None = None) -> list[dict[str, Any]]:
    init_db()
    params: list[Any] = []
    where = ""
    if statuses:
        status_list = list(statuses)
        for status in status_list:
            validate_status(status)
        placeholders = ", ".join("?" for _ in status_list)
        where = f"WHERE status IN ({placeholders})"
        params.extend(status_list)

    with connect() as conn:
        rows = conn.execute(
            f"SELECT * FROM products {where} ORDER BY supplier_url, color, id",
            params,
        ).fetchall()
    return [dict(row) for row in rows]


def mark_failed(product_id: int, message: str) -> None:
    update_product(product_id, status="failed", error_message=message[:2000])
