# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m playwright install chromium    # required: Gildan pages are JS-rendered
```

Copy `.env.example` → `.env` and fill in `OPENAI_API_KEY`. The Shopify keys are only needed if running the export step.

## Daily commands

```bash
python app/batch.py            # scrape urls.csv → data/originals/ + products.db
python app/pipeline.py         # gpt-image-2 on anchor + recolor variants → data/generated/ + review.html
open review.html               # gallery for human selection
```

Shopify export (only after `data/generated/` is populated):

```bash
python app/upload_to_shopify.py    # push to Files API, write shopify_upload_manifest.json
python app/make_shopify_csv.py     # emit shopify_import.csv (then Admin → Products → Import)
```

One-offs:

```bash
python app/list_colors.py <gildan-url>          # writes colors.html for picking codes
python app/scrape.py <url> --color 051          # single URL + single color
python app/batch.py --codes 030,051,036         # override FIXED_COLOR_CODES for this run
python app/pipeline.py --force                  # re-generate even if files exist
python app/pipeline.py --quality high           # override OPENAI_IMAGE_QUALITY
```

No tests, no linter configured. Each module under `app/` is runnable as a script (`python app/<file>.py`) thanks to a `sys.path` shim — there is no `setup.py`/`pyproject.toml`.

CustomInk pipeline (scrape → generate → printngoplus.com):

```bash
# 在 customink_urls.csv 里填好商品 URL，然后顺序执行：
python app/batch_customink.py          # 拉取所有颜色图片 → data/originals/ + products.db
python app/pipeline.py                 # AI 生成 → data/generated/ + review.html
open review.html                       # 看生成效果
python app/upload_to_shopify.py        # 上传图片到 Shopify CDN → 生成 shopify_upload_manifest.json
# 然后运行对应的 Node.js seed 脚本，把 manifest 里的 CDN URL 写入 PostgreSQL：
node scripts/seed-mugs-online.js       # 杯子
# 其他产品类型（如 tote bag）需要写对应的 seed 脚本，参考 scripts/seed-mugs-online.js
```

**注意**：最终目标是 printngoplus.com（PostgreSQL 数据库），不是 Shopify 商店。
`make_shopify_csv.py` 是早期遗留脚本，已不使用。
`upload_to_shopify.py` 只是借用 Shopify CDN 托管图片，最终用 seed 脚本入库。

**seed 脚本模式**（参考 `scripts/seed-mugs-online.js`）：
1. 读取 `shopify/shopify_upload_manifest.json`（filename → CDN URL）
2. 通过 Prisma 在 PostgreSQL 里 upsert `Product` + `Variant` + `ProductImage`
3. 图片 URL 格式：manifest key = `{product_id:06d}_{color_slug}_{view_key}.jpg`

One-offs for CustomInk:

```bash
python app/batch_customink.py --url <url>         # 单 URL，不读 CSV
python app/batch_customink.py --force              # 强制重新下载已存在的图片
```

## Architecture

### Product type routing

`build_prompts()` in `app/prompts.py` dispatches to a different view list per product type.
Detection is based on `_full_text(product)` which joins `product_name + category + description + style_number`.

| Product type | Detector | View list | Views |
|---|---|---|---|
| Mug (all variants) | `is_mug_product()` — "mug" in text | `VIEWS_MUG` | 4 square |
| Tote / canvas bag | `is_bag_product()` — "tote", "tote bag", "canvas bag" in text | `VIEWS_BAG` | 2 portrait + 2 square |
| Everything else (tee, hoodie, polo, tank…) | fallback | `VIEWS` | 4 portrait + 2 square |

`guess_garment()` further refines the label used inside the prompt (e.g. "adult hooded sweatshirt", "canvas tote bag").

**Adding a new product type — checklist (2 files only):**

1. **`app/prompts.py`** — add 4 things:
   - `VIEWS_NEWTYPE` list (each item: `key`, `label`, `summary`, `needs_model`, `directive`, `aspect`)
   - `is_newtype_product(product)` → check `_full_text(product)` for keywords
   - Route in `build_prompts()` and `build_prompt()`: `if is_newtype_product(product): ...`
   - Entry in `guess_garment()`: `if "keyword" in text: return "product label"`
   - Append to `ALL_VIEWS`: `ALL_VIEWS = VIEWS + VIEWS_MUG + VIEWS_BAG + VIEWS_NEWTYPE`

2. **`app/generate.py`** — add view keys to `VIEW_SIZE`:
   - Portrait model shots → `"1024x1536"`
   - Flat/detail/product-only shots → `"1024x1024"`

`batch_customink.py`, `pipeline.py`, `upload_to_shopify.py`, `make_shopify_csv.py` need **no changes** — they consume whatever views `build_prompts()` returns.

**For standard garments (t-shirts, hoodies, polos, tanks, jackets, caps) scraped from CustomInk:**
No code change needed. The URL slug becomes `product_name`; `guess_garment()` parses it and routes to `VIEWS` automatically.

### Two flows share this repo

The README's headline ("Manual ChatGPT-web flow") describes a deprecated path where the human pastes prompts into ChatGPT-web and downloads results. The **actually-wired pipeline** is `app/pipeline.py`, which calls the OpenAI image API directly. Both paths produce files in `data/generated/`; the Shopify export step doesn't care which produced them.

### Three-phase pipeline (`app/pipeline.py`)

For each `supplier_url` group in the DB:

1. **Pick an anchor color**, preference list in `ANCHOR_PREFERENCE`: chromatic colors maximally distant from skin tones *and* from denim (models wear jeans). `051 Royal Blue` and `040 Red` are the validated defaults; `036 Black` / `030 White` cannot anchor (they're achromatic — no hue to mask against in `recolor.sample_target_color`). When a group's only colors are achromatic, every color is generated via the API instead of recolored.
2. **API generation** (`app/generate.py`): six views per anchor (`front/back/left/right` portrait 1024×1536, `neckline/fabric` square 1024×1024) using `gpt-image-2` image-edit with the supplier photo as reference. Cost ≈ $0.36 per anchor at medium quality.
3. **Python recolor** (`app/recolor.py`): vectorized HSV shift in numpy that masks the garment hue from the anchor and rotates it to each target color sampled from the supplier image. Free; produces variants for every non-anchor color in the group.

Phase 3 then regenerates `review.html` from `templates/review.html`.

### State model

- SQLite at `products.db`, one table `products`, **uniquely keyed by `(supplier_url, color)`** with `ON CONFLICT … DO UPDATE`. Re-running `batch.py` is idempotent.
- Status is only `scraped` or `failed` — there is **no `generated` or `approved` status in the DB**. Generation state is inferred from filesystem presence via `generate.generated_path()`, which is the contract between `generate.py`, `recolor.py`, and `make_shopify_csv.py`.
- Filename convention: `data/generated/{product_id:06d}_{color_code}_{view_key}.jpg`. Don't change this without updating all three consumers.

### Gildan scraping (`app/scrape.py`, `app/batch.py`)

- `FIXED_COLOR_CODES` in `app/batch.py` is the user's shopping list; overridable per-run with `--codes`. Codes not carried by a given style are silently skipped.
- Gildan pages are JS-rendered — `fetch_html(..., use_playwright=True, wait_for_marker="cdn11.bigcommerce.com")` is required, plain `requests` won't get images.
- `is_gildan_url()` gates the color-polling path; other domains get a single-shot scrape with no color expansion.
- `GILDAN_COLOR_CODES` (name → code, in `scrape.py`) and `GILDAN_CODE_TO_NAME` (code → name, in `prompts.py`) are independent lookup tables — keep them in sync if adding codes. The user knows the codes better than the code does; treat their corrections as authoritative.

### Shopify export

Two **independent** Shopify integrations live in this repo — do not confuse them:

- **`app/upload_to_shopify.py`** uses the Admin GraphQL API with a **store-level Custom App token** (`shpat_…`), set in `.env` as `SHOPIFY_SHOP_DOMAIN` + `SHOPIFY_ADMIN_API_TOKEN`. Requires `write_files` + `read_files` scopes. Writes `shopify_upload_manifest.json` (filename → `cdn.shopify.com` URL); idempotent — re-runs skip already-uploaded files.
- **`app/make_shopify_csv.py`** reads the manifest + DB + the 57-column `product_template.csv` schema in the repo root and emits `shopify_import.csv`. Per `(product, color)` it emits **6 rows** — the first carries variant info + first image URL, the rest carry only additional image URLs (Shopify groups by handle). The final upload is **manual via Admin → Products → Import**, not API-driven.

### Prompt construction (`app/prompts.py`)

`VIEWS` defines the six camera angles. `build_prompts()` composes English prompts using `GILDAN_CODE_TO_NAME` for color labels — but the supplier image is the authoritative color source, so a wrong name still produces the right color. Garment-type heuristics (`guess_garment`, `is_youth_garment`, `model_phrase_for`) infer "women's tee" / "youth hoodie" / etc. from the scraped product name.

### Paths

All paths are resolved relative to `ROOT_DIR` via `app/paths.py`. DB stores paths relative to root (`relative_to_root()`); read-back uses `resolve_root_path()`. Don't store absolute paths in the DB.
