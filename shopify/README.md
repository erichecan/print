# PrintNGo · Supplier Image + ChatGPT Prompt Workflow

Manual flow:

1. Put one supplier URL per row in `urls.csv` (Gildan URLs).
2. Run the batch scraper — for each URL it polls the fixed color list
   (`FIXED_COLOR_CODES` in `app/batch.py`), downloads every color the style
   actually carries, and silently skips ones it doesn't.
3. Open `review.html` — every (product, color) row shows the downloaded
   image plus a paste-ready English prompt.
4. For each row: click **Copy prompt** → ChatGPT web → paste → attach the
   image → generate → download.

No API keys required. All generation happens in the ChatGPT web UI.

## Fixed color list

Hardcoded in `app/batch.py`:

```python
FIXED_COLOR_CODES = ["030", "032", "036", "040", "051", "026", "098", "194"]
# 030 White · 032 Navy · 036 Black · 040 Red · 051 Royal Blue
# 026 Sapphire · 098 Daisy · 194 Cherry Red
```

Change this list if you want a different palette across all URLs.
Override per-run with `--codes 030,051,036`.

## Setup

```bash
cd ~/Desktop/printngo
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m playwright install chromium    # Gildan pages need Playwright
```

## Daily commands

```bash
# 1. Edit urls.csv — one URL per row, just the `url` column

# 2. Scrape supplier pages, download original images for the available
#    intersection of FIXED_COLOR_CODES.
python app/batch.py

# 3. One-shot: pick an anchor color per product → generate 6 views via
#    gpt-image-2 → Python-recolor that anchor to every other color in the
#    group → build review.html.
python app/pipeline.py

# 4. Open the gallery
open review.html
```

Cost: one anchor per product = ~$0.36 (6 mixed-size gpt-image-2 calls at
medium quality). Every additional color is free (Python hue shift).

## Export to Shopify

Once `data/generated/` is populated, push everything to Shopify in three commands:

```bash
# 1. One-time: create a Custom App in Shopify Admin → Settings → Apps and
#    sales channels → Develop apps → enable write_files + read_files scopes →
#    install → copy the Admin API access token into .env (SHOPIFY_SHOP_DOMAIN
#    + SHOPIFY_ADMIN_API_TOKEN). See .env.example for full instructions.

# 2. Upload every image in data/generated/ to Shopify Files.
#    Writes shopify_upload_manifest.json (filename → cdn.shopify.com URL).
#    Idempotent — re-runs skip files already uploaded.
python app/upload_to_shopify.py

# 3. Generate the Shopify import CSV with real CDN URLs baked in.
python app/make_shopify_csv.py

# 4. In Shopify Admin → Products → Import → upload shopify_import.csv.
```

Useful one-offs:

```bash
# See which color codes are available on a single Gildan product page
python app/list_colors.py "https://www.gildan.com/us/en/64000l-..."
open colors.html

# Scrape a single URL + single color
python app/scrape.py "https://www.gildan.com/us/en/64000l-..." --color 051

# Run batch with a different color list this once
python app/batch.py --codes 030,051,036
```

## urls.csv format

```csv
url
https://www.gildan.com/us/en/64000l-women-s-t-shirt-en_us/
https://www.gildan.com/us/en/some-other-style/
```

Just the `url` column. The fixed color list is applied to every row.

## Files

- `urls.csv` — your input (one URL per row)
- `app/batch.py` — `FIXED_COLOR_CODES` constant lives here
- `app/prompts.py` — prompt template + `GILDAN_CODE_TO_NAME` lookup; edit
  to add names for new codes or tune the wording
- `app/scrape.py` — Gildan scraping; `GILDAN_COLOR_CODES` (name → code)
  is used by `--color` lookups in `scrape.py`
- `data/originals/{id:06d}_{code}.jpg` — downloaded supplier images
- `products.db` — SQLite cache; re-running `batch.py` upserts by (url, code)
- `review.html` — generated review page (regenerated each `make_review_html` run)
- `colors.html` — generated palette page from `list_colors.py` for picking codes

## ChatGPT tips

- Use a model that supports image generation (GPT-4o / GPT Image / DALL·E 3 in ChatGPT web).
- Paste the prompt first, then attach the supplier image as a reference.
- If the output looks too similar to the supplier photo, append: "Use a
  completely different model, pose, and background. The reference is for
  garment construction and color only."
- If color drifts, append: "The garment color must be a precise sample of
  the reference image — no oversaturation, no hue shift."
