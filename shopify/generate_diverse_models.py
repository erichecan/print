"""
用 GPT-Image-2 (gpt-image-1) 把 Gildan 产品图里的白人模特换成亚裔 / 黑人模特。
运行前：pip3 install openai pillow
OPENAI_API_KEY 从项目 .env 文件或环境变量读取。
"""

import os, time, base64, io
from pathlib import Path
from urllib.parse import urlparse
from openai import OpenAI
from PIL import Image

# ── 配置 ──────────────────────────────────────────────────────────────────────
_PROJECT_ROOT = Path(__file__).parent

def _load_dotenv(path: Path) -> dict:
    env = {}
    if path.exists():
        for line in path.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    return env

_env        = _load_dotenv(_PROJECT_ROOT / ".env")
API_KEY     = os.environ.get("OPENAI_API_KEY") or _env.get("OPENAI_API_KEY", "")
LOCAL_IMG_DIR = _PROJECT_ROOT / "data" / "generated"
OUT_DIR     = _PROJECT_ROOT / "diverse_models"
SLEEP_SEC   = 3

# ── 产品描述 ──────────────────────────────────────────────────────────────────
PRODUCT_DESC = {
    "gildan-18000-g18000": "crewneck sweatshirt",
    "gildan-18500-g18500": "pullover hooded sweatshirt",
    "gildan-2000-g2000":   "classic fit t-shirt",
    "gildan-5000-g5000":   "heavy cotton t-shirt",
    "gildan-5400-g5400":   "fitted t-shirt",
    "gildan-64000-g64000": "softstyle t-shirt",
    "gildan-64800-g64800": "long sleeve t-shirt",
    "gildan-64v00-g64v00": "v-neck t-shirt",
    "gildan-8000-g8000":   "dryblend t-shirt",
    "gildan-h000-gh000":   "hammer t-shirt",
}

# ── 生成计划：(产品handle, 颜色, 模特类型, 源图URL) ──────────────────────────────
# src_url 仅用于推导本地文件名（取 000xxx_yyy_front 前缀），不发起网络请求
PLAN = [
    ("gildan-18000-g18000", "Navy",       "asian", "https://cdn.shopify.com/s/files/1/0746/6817/9644/files/000009_032_front_5135190e-ab94-473d-b3da-cfa4c5881fd4.jpg?v=1779391261"),
    ("gildan-18000-g18000", "Red",        "black", "https://cdn.shopify.com/s/files/1/0746/6817/9644/files/000011_040_front_031dc539-7890-4c61-b11a-5404b499ea35.jpg?v=1779391277"),
    ("gildan-18500-g18500", "Cherry Red", "asian", "https://cdn.shopify.com/s/files/1/0746/6817/9644/files/000020_194_front_1d0d8008-ce7f-4703-8616-a6648b159b5b.jpg?v=1779391348"),
    ("gildan-18500-g18500", "Black",      "black", "https://cdn.shopify.com/s/files/1/0746/6817/9644/files/000017_036_front_7ae10a46-a93d-4d0c-83ec-49dfb220410d.jpg?v=1779391324"),
    ("gildan-2000-g2000",   "Black",      "asian", "https://cdn.shopify.com/s/files/1/0746/6817/9644/files/000023_036_front_c5f51ebc-bceb-4126-b557-caa13d50f010.jpg?v=1779391370"),
    ("gildan-2000-g2000",   "Cherry Red", "black", "https://cdn.shopify.com/s/files/1/0746/6817/9644/files/000028_194_front_4870bbd4-24cd-4fc0-bf83-87cf8131a9aa.jpg?v=1779391411"),
    ("gildan-5000-g5000",   "Red",        "asian", "https://cdn.shopify.com/s/files/1/0746/6817/9644/files/000032_040_front_33037984-0e40-41e0-93c1-0e71faa1c874.jpg?v=1779391443"),
    ("gildan-5000-g5000",   "Daisy",      "black", "https://cdn.shopify.com/s/files/1/0746/6817/9644/files/000035_098_front_08b3764b-f49e-4654-99a3-5f156c3c25b1.jpg?v=1779391468"),
    ("gildan-5400-g5400",   "Royal Blue", "asian", "https://cdn.shopify.com/s/files/1/0746/6817/9644/files/000040_051_front_37bacf4d-7411-40e3-872f-49d0008008c1.png?v=1779391512"),
    ("gildan-5400-g5400",   "Red",        "black", "https://cdn.shopify.com/s/files/1/0746/6817/9644/files/000039_040_front_c313f06f-ba9b-4667-8544-e37c3f365e49.jpg?v=1779391502"),
    ("gildan-64000-g64000", "Navy",       "asian", "https://cdn.shopify.com/s/files/1/0746/6817/9644/files/000051_032_front_5895f9f3-ffc5-4128-94eb-bb902cb3272f.jpg?v=1779391597"),
    ("gildan-64000-g64000", "Cherry Red", "black", "https://cdn.shopify.com/s/files/1/0746/6817/9644/files/000057_194_front_8dd0de77-e9d9-45a7-bd2b-6223470924ff.jpg?v=1779391644"),
    ("gildan-64800-g64800", "Red",        "asian", "https://cdn.shopify.com/s/files/1/0746/6817/9644/files/000061_040_front_95a8da82-7194-4f49-89c4-317a4789a406.jpg?v=1779391674"),
    ("gildan-64800-g64800", "Navy",       "black", "https://cdn.shopify.com/s/files/1/0746/6817/9644/files/000059_032_front_b760bfcb-5ab3-4313-9533-1a308cc54360.jpg?v=1779391659"),
    ("gildan-64v00-g64v00", "Cherry Red", "asian", "https://cdn.shopify.com/s/files/1/0746/6817/9644/files/000087_194_front_46c3be7a-a511-4810-b530-7ba0d6a0fc2b.jpg?v=1779391750"),
    ("gildan-64v00-g64v00", "Royal Blue", "black", "https://cdn.shopify.com/s/files/1/0746/6817/9644/files/000086_051_front_19014362-cca3-401f-b0d6-1c4f5d0cc3bc.png?v=1779391742"),
    ("gildan-8000-g8000",   "Daisy",      "asian", "https://cdn.shopify.com/s/files/1/0746/6817/9644/files/000048_098_front_a77063b6-4e6a-4f79-850c-d08e78cf1ea6.jpg?v=1779391574"),
    ("gildan-8000-g8000",   "Navy",       "black", "https://cdn.shopify.com/s/files/1/0746/6817/9644/files/000043_032_front_26d9be4b-afc4-45b4-9a82-5bc8c81fd0b7.jpg?v=1779391533"),
    ("gildan-h000-gh000",   "White",      "asian", "https://cdn.shopify.com/s/files/1/0746/6817/9644/files/000049_030_front_4d5150b0-1668-4186-89bb-0a37c805e57f.png?v=1779391582"),
    ("gildan-h000-gh000",   "Black",      "black", "https://cdn.shopify.com/s/files/1/0746/6817/9644/files/000089_036_front_cdf66a4b-9cc8-4825-b86b-e366509237a1.png?v=1779391759"),
]

# ── Prompt 模板 ───────────────────────────────────────────────────────────────
PROMPTS = {
    "asian": (
        "E-commerce product photography. Replace the model with a young East Asian male model "
        "in his mid-20s. He is wearing the {color} {product}. "
        "Keep the garment color, style, fit, and plain white background exactly the same. "
        "Front view, arms relaxed at sides, same pose as original. "
        "Canon EOS R5, 50mm, soft studio lighting, natural skin texture, "
        "professional commercial apparel photography."
    ),
    "black": (
        "E-commerce product photography. Replace the model with a young Black male model "
        "in his mid-20s. He is wearing the {color} {product}. "
        "Keep the garment color, style, fit, and plain white background exactly the same. "
        "Front view, arms relaxed at sides, same pose as original. "
        "Canon EOS R5, 50mm, soft studio lighting, natural skin texture, "
        "professional commercial apparel photography."
    ),
}

# ── 工具函数 ──────────────────────────────────────────────────────────────────
def local_src_path(url: str) -> Path:
    filename = Path(urlparse(url).path).name   # e.g. 000009_032_front_uuid.jpg
    parts    = filename.split("_")
    prefix   = "_".join(parts[:3])             # e.g. 000009_032_front
    for ext in (".jpg", ".png"):
        p = LOCAL_IMG_DIR / f"{prefix}{ext}"
        if p.exists():
            return p
    raise FileNotFoundError(f"本地文件不存在: {LOCAL_IMG_DIR / prefix}(.jpg|.png)")

def output_path(handle: str, color: str, model_type: str) -> Path:
    slug       = handle.split("-g")[0]
    color_slug = color.lower().replace(" ", "-")
    return OUT_DIR / f"{slug}_{color_slug}_{model_type}.png"

def build_prompt(handle: str, color: str, model_type: str) -> str:
    product = PRODUCT_DESC[handle]
    return PROMPTS[model_type].format(color=color, product=product)

# ── 主流程 ────────────────────────────────────────────────────────────────────
def main(test: bool = False):
    if not API_KEY:
        raise ValueError("请设置环境变量 OPENAI_API_KEY，或在项目 .env 文件中配置")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    client = OpenAI(api_key=API_KEY)
    manifest_lines = ["handle,color,model_type,local_file,shopify_url"]

    plan  = PLAN[:2] if test else PLAN
    total = len(plan)
    for i, (handle, color, model_type, src_url) in enumerate(plan, 1):
        out_path = output_path(handle, color, model_type)

        if out_path.exists():
            print(f"[{i}/{total}] 跳过（已存在）: {out_path.name}")
            manifest_lines.append(f"{handle},{color},{model_type},{out_path},")
            continue

        print(f"[{i}/{total}] 生成中: {handle.split('-g')[0]} / {color} / {model_type} ...", flush=True)

        try:
            src   = local_src_path(src_url)
            # OpenAI 要求 PNG 格式；本地文件可能是 JPEG，统一转换
            with Image.open(src) as im:
                buf = io.BytesIO()
                im.convert("RGBA").save(buf, format="PNG")
                img_bytes = buf.getvalue()
            prompt    = build_prompt(handle, color, model_type)

            response = client.images.edit(
                model="gpt-image-1",
                image=(src.stem + ".png", img_bytes, "image/png"),
                prompt=prompt,
                size="1024x1536",
            )

            image_data = base64.b64decode(response.data[0].b64_json)
            out_path.write_bytes(image_data)
            print(f"    ✅ 已保存: {out_path.name}")
            manifest_lines.append(f"{handle},{color},{model_type},{out_path},")

        except Exception as e:
            print(f"    ❌ 失败: {e}")
            manifest_lines.append(f"{handle},{color},{model_type},ERROR,")

        if i < total:
            time.sleep(SLEEP_SEC)

    manifest_path = OUT_DIR / "manifest.csv"
    manifest_path.write_text("\n".join(manifest_lines) + "\n", encoding="utf-8")
    print(f"\n📄 Manifest 已保存: {manifest_path}")
    print("下一步：把 diverse_models/ 里的图片上传到 Shopify，填入 manifest.csv 的 shopify_url 列")

if __name__ == "__main__":
    import sys
    main(test="--test" in sys.argv)
