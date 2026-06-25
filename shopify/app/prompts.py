from __future__ import annotations

from typing import Any


# Best-known Gildan Softstyle / G64000L color code → name map.
# Confident (used in current FIXED_COLOR_CODES):
#   030 White · 032 Navy · 036 Black · 040 Red · 051 Royal Blue
#   026 Sapphire · 098 Daisy · 194 Cherry Red
# Other entries are best-effort; correct in place as you encounter them.
# These names are emitted as labels in the prompt; the image itself is the
# authoritative color source, so a wrong name still produces the right color.
GILDAN_CODE_TO_NAME: dict[str, str] = {
    "000": "White",
    "011": "Black",
    "020": "Natural",
    "022": "Ash",
    "026": "Sapphire",
    "030": "White",
    "031": "Sand",
    "032": "Navy",
    "033": "Forest Green",
    "036": "Black",
    "037": "Tangerine",
    "038": "Graphite Heather",
    "040": "Red",
    "041": "Navy",
    "044": "Old Gold",
    "051": "Royal Blue",
    "066": "Kelly Green",
    "069": "Light Blue",
    "071": "Carolina Blue",
    "081": "Maroon",
    "083": "Sport Scarlet Red",
    "087": "Tan",
    "095": "Sport Grey",
    "098": "Daisy",
    "108": "Antique Irish Green",
    "137": "Cardinal Red",
    "167": "Military Green",
    "168": "Irish Green",
    "176": "Sapphire",
    "183": "Daisy",
    "187": "Antique Heliconia",
    "188": "Military Green",
    "194": "Cherry Red",
    "232": "Tropical Blue",
    "236": "Tropical Blue",
    "254": "Antique Orange",
    "295": "Charcoal",
    "296": "Charcoal",
    "318": "Safety Green",
    "319": "Safety Pink",
    "324": "Safety Orange",
    "446": "Dark Heather",
    "443": "Heather Navy",
    "461": "Heather Military Green",
    "516": "Berry",
    "41G": "Sport Dark Green",
}


# Each view produces one independent prompt → one ChatGPT generation → one
# uploadable Shopify image. Model views (front/back/left/right) REQUIRE a
# real human model. Detail views (neckline/fabric) are garment-only macros.
VIEWS: list[dict[str, str]] = [
    {
        "key": "front",
        "label": "FRONT VIEW",
        "summary": "Human model facing camera, full garment collar-to-hem",
        "needs_model": "yes",
        "directive": (
            "The {model_phrase} stands facing the camera straight on, in a "
            "relaxed natural standing pose with arms slightly away from the "
            "torso so the silhouette of the garment is fully readable. Full "
            "garment visible from collar to hem. Garment occupies roughly 70% "
            "of the frame height. Show the model from mid-thigh up so the "
            "entire t-shirt fit, fall, and hem are visible. Natural expression."
        ),
        "aspect": "portrait, roughly 3:4 aspect ratio",
    },
    {
        "key": "back",
        "label": "BACK VIEW",
        "summary": "Human model facing away, full garment collar-to-hem",
        "needs_model": "yes",
        "directive": (
            "The {model_phrase} stands with their back fully turned to the "
            "camera (180° turn from the front view). Same relaxed standing "
            "pose. Full garment visible from collar to hem. Show the back yoke, "
            "back neckline, sleeve line, and back hem clearly. Show the model "
            "from mid-thigh up so the entire garment back is visible."
        ),
        "aspect": "portrait, roughly 3:4 aspect ratio",
    },
    {
        "key": "left",
        "label": "LEFT SIDE VIEW",
        "summary": "Human model in left profile (90°)",
        "needs_model": "yes",
        "directive": (
            "The {model_phrase} stands in a full left-side profile (90° turn "
            "from the front view), facing screen-right. Full garment visible "
            "from collar to hem. Show the side seam, sleeve drape, and "
            "silhouette clearly. Same relaxed standing pose. Show the model "
            "from mid-thigh up."
        ),
        "aspect": "portrait, roughly 3:4 aspect ratio",
    },
    {
        "key": "right",
        "label": "RIGHT SIDE VIEW",
        "summary": "Human model in right profile (90°)",
        "needs_model": "yes",
        "directive": (
            "The {model_phrase} stands in a full right-side profile (90° turn "
            "from the front view), facing screen-left. Full garment visible "
            "from collar to hem. Show the side seam, sleeve drape, and "
            "silhouette clearly. Same relaxed standing pose. Show the model "
            "from mid-thigh up."
        ),
        "aspect": "portrait, roughly 3:4 aspect ratio",
    },
    {
        "key": "neckline",
        "label": "NECKLINE / COLLAR CLOSE-UP",
        "summary": "Tight macro of neckline and collar area",
        "needs_model": "no",
        "directive": (
            "Tight macro close-up of the neckline and collar area only. "
            "Garment-only composition — no model face, no model hair. Show the "
            "collar shape, neckline stitching, and any rib or banding clearly. "
            "The neckline fills roughly 70% of the frame."
        ),
        "aspect": "square, 1:1 aspect ratio",
    },
    {
        "key": "fabric",
        "label": "FABRIC + STITCHING CLOSE-UP",
        "summary": "Tight macro of fabric weave + hem/sleeve stitching",
        "needs_model": "no",
        "directive": (
            "Tight macro close-up of the fabric weave together with a clearly "
            "visible stitching detail (hem stitch or sleeve cuff stitch). "
            "Garment only — no model, no face. Show the fabric texture, weave, "
            "and stitch quality at high resolution. The fabric and stitch "
            "fill the frame; shallow depth of field is acceptable but keep "
            "the stitching in sharp focus."
        ),
        "aspect": "square, 1:1 aspect ratio",
    },
]


VIEWS_MUG: list[dict[str, str]] = [
    {
        "key": "mug_front",
        "label": "FRONT VIEW",
        "summary": "Mug straight-on, handle at 3 o'clock, full product visible",
        "needs_model": "no",
        "directive": (
            "The mug sits on a clean flat surface facing straight at the camera, "
            "handle at the 3 o'clock position. Full mug visible from base to rim. "
            "The main printable cylindrical surface fills the center of the frame. "
            "Slightly above eye-level angle so the top rim is faintly visible. "
            "Seamless white background, soft even studio lighting with a subtle "
            "shadow under the base."
        ),
        "aspect": "square, 1:1 aspect ratio",
    },
    {
        "key": "mug_angle",
        "label": "45° ANGLE VIEW",
        "summary": "Mug at 45° showing both print zone and handle simultaneously",
        "needs_model": "no",
        "directive": (
            "The mug is shown at a 45° angle so both the main printable body and "
            "the full handle arc are simultaneously visible. The mug interior "
            "opening is faintly visible from this angle. Clean surface with "
            "seamless white background, soft studio lighting, slight shadow under "
            "the base."
        ),
        "aspect": "square, 1:1 aspect ratio",
    },
    {
        "key": "mug_handle",
        "label": "HANDLE SIDE PROFILE",
        "summary": "Pure side-profile clearly showing the full handle arc",
        "needs_model": "no",
        "directive": (
            "Pure side-profile view of the mug so the handle's full arc is "
            "clearly visible from top attachment point to bottom attachment point. "
            "The cylindrical body is in full silhouette. Clean seamless white "
            "background, even soft lighting."
        ),
        "aspect": "square, 1:1 aspect ratio",
    },
    {
        "key": "mug_top",
        "label": "TOP-DOWN VIEW",
        "summary": "Overhead looking directly into the mug opening",
        "needs_model": "no",
        "directive": (
            "Camera pointing straight down into the mug opening. The white "
            "ceramic rim forms a clean ring around the opening. Handle stub "
            "visible to one side. Shot from directly above on a clean seamless "
            "white surface, soft natural shadow under the mug."
        ),
        "aspect": "square, 1:1 aspect ratio",
    },
]

VIEWS_BAG: list[dict[str, str]] = [
    {
        "key": "bag_front",
        "label": "FRONT VIEW",
        "summary": "Model holding bag straight-on, full product visible",
        "needs_model": "yes",
        "directive": (
            "The {model_phrase} stands facing the camera straight on in a relaxed "
            "pose, holding the tote bag by both handles at their side (bag hanging "
            "naturally at hip/thigh level) so the entire front face of the bag is "
            "fully visible. The bag occupies roughly 50% of the frame height. "
            "Show the model from mid-thigh up. Natural expression."
        ),
        "aspect": "portrait, roughly 3:4 aspect ratio",
    },
    {
        "key": "bag_lifestyle",
        "label": "LIFESTYLE / ANGLE VIEW",
        "summary": "Model at 3/4 angle carrying bag over shoulder",
        "needs_model": "yes",
        "directive": (
            "The {model_phrase} is shown at a relaxed 3/4 angle (45° from front), "
            "carrying the tote bag over one shoulder with one handle looped over "
            "the shoulder and the bag resting at hip level. The bag depth and gusset "
            "are visible from this angle. Show the model from mid-thigh up. "
            "Relaxed lifestyle feel, natural expression."
        ),
        "aspect": "portrait, roughly 3:4 aspect ratio",
    },
    {
        "key": "bag_flat",
        "label": "FLAT LAY",
        "summary": "Bag laid flat on clean surface, handles extended above",
        "needs_model": "no",
        "directive": (
            "The tote bag lies flat on a clean seamless white surface, photographed "
            "from directly above (top-down). Both handles are extended straight up "
            "above the bag body. The full front face of the bag is visible. "
            "No model, no props. Studio lighting, minimal shadow."
        ),
        "aspect": "square, 1:1 aspect ratio",
    },
    {
        "key": "bag_detail",
        "label": "HANDLE / STITCHING DETAIL",
        "summary": "Close-up of handle and stitching quality",
        "needs_model": "no",
        "directive": (
            "Tight macro close-up of one handle and the stitching where it attaches "
            "to the bag body. Show the handle thickness, stitching pattern, and fabric "
            "weave in sharp detail. No model. Garment-only composition filling the "
            "frame, shallow depth of field acceptable but keep stitching in focus."
        ),
        "aspect": "square, 1:1 aspect ratio",
    },
]

ALL_VIEWS: list[dict[str, str]] = VIEWS + VIEWS_MUG + VIEWS_BAG


PROMPT_TEMPLATE_MUG = """Generate ONE brand-new e-commerce product photograph of a {mug_type}. This is the {view_label} for a Shopify product gallery.

VIEW DIRECTIVE
{view_directive}

PRODUCT FACTS
- Product: {mug_type}
- Style: {style_number}
- Color: White ceramic (plain, no print)

MUG SHAPE
- Classic slightly-tapered cylinder: rim diameter slightly wider than base diameter.
- A single solid C-shaped loop handle, proportional to the mug body.
- Smooth, uniform glossy white ceramic surface — entirely plain white, no text, print, or logo anywhere.
- Interior also white.
- Clean base with no markings.

STUDIO REQUIREMENTS
- Photo-realistic e-commerce studio product photography.
- Seamless soft white or very light grey studio background.
- Even, soft, balanced studio lighting; subtle soft shadow under the base.
- Sharp focus, high detail on the ceramic surface finish.

WHAT TO AVOID
- No text, labels, watermarks, or decorations anywhere on the mug.
- No props, food, beverages, or background objects.
- No coffee, liquid, or steam.
- No human figures.

OUTPUT: ONE image, {aspect}, ready to upload directly to a Shopify product gallery as the {view_label} photo.
"""


PROMPT_TEMPLATE_MUG_BLACK_ACCENT = """Generate ONE brand-new e-commerce product photograph of a {mug_type}. This is the {view_label} for a Shopify product gallery.

VIEW DIRECTIVE
{view_directive}

PRODUCT FACTS
- Product: {mug_type}
- Style: {style_number}
- Color scheme: White exterior body, matte black interior, matte black C-handle

MUG SHAPE & COLOR — CRITICAL
- Classic slightly-tapered cylinder: rim diameter slightly wider than base diameter.
- EXTERIOR body: smooth, uniform glossy white ceramic — entirely plain white, no text, print, or logo.
- INTERIOR (visible from the rim opening): solid matte black. The inside of the mug is fully coated black with no white showing.
- HANDLE: solid matte black C-shaped loop, same black as the interior. The handle must be visibly black — not grey, not dark grey, BLACK.
- The black interior and black handle must read as exactly the same shade of black.
- Clean white base with no markings.

COLOR ACCURACY — NON-NEGOTIABLE
- White exterior must be clean bright white, not cream or off-white.
- Black interior and black handle must be deep matte black (#111111), not charcoal, not dark grey.
- The contrast between the white exterior and the black accents should be crisp and clear.

STUDIO REQUIREMENTS
- Photo-realistic e-commerce studio product photography.
- Seamless soft white or very light grey studio background.
- Even, soft, balanced studio lighting; subtle soft shadow under the base.
- Sharp focus, high detail on the ceramic surface and the color boundary at the rim.

WHAT TO AVOID
- Do NOT make the handle white or light grey — it must be black.
- Do NOT make the interior white or light grey — it must be black.
- No text, labels, watermarks, or decorations anywhere on the mug.
- No props, food, beverages, or background objects.
- No coffee, liquid, or steam.
- No human figures.

OUTPUT: ONE image, {aspect}, ready to upload directly to a Shopify product gallery as the {view_label} photo.
"""


PROMPT_TEMPLATE_MUG_COLOR_ACCENT = """Generate ONE brand-new e-commerce product photograph of a {mug_type}. This is the {view_label} for a Shopify product gallery.

VIEW DIRECTIVE
{view_directive}

PRODUCT FACTS
- Product: {mug_type}
- Style: {style_number}
- Color scheme: White exterior body, {accent_color} glossy ceramic interior, {accent_color} C-handle

MUG SHAPE & COLOR — CRITICAL
- Classic slightly-tapered cylinder: rim diameter slightly wider than base diameter.
- EXTERIOR body: smooth, uniform glossy white ceramic — entirely plain white, no text, print, or logo.
- INTERIOR (visible from the rim opening): {accent_color} glossy ceramic glaze — fully coated {accent_color} with no white showing. {color_constraint}
- HANDLE: {accent_color} glossy ceramic glaze, same color as the interior. The handle must clearly read as {accent_color} — not white, not grey.
- The interior color and handle color must read as exactly the same shade.
- Clean white base with no markings.

COLOR ACCURACY — NON-NEGOTIABLE
- White exterior must be clean bright white, not cream or off-white.
- {accent_color} interior and handle: {color_constraint}
- The contrast between the white exterior and the {accent_color} accents should be crisp and vivid.

STUDIO REQUIREMENTS
- Photo-realistic e-commerce studio product photography.
- Seamless soft white or very light grey studio background.
- Even, soft, balanced studio lighting; subtle soft shadow under the base.
- Sharp focus, high detail on the ceramic surface and the color boundary at the rim.
- The {accent_color} glossy glaze will show natural specular highlights from the studio lights — this is expected and correct.

WHAT TO AVOID
- Do NOT make the handle white or grey — it must be {accent_color}.
- Do NOT make the interior white or grey — it must be {accent_color}.
- {color_avoid}
- No text, labels, watermarks, or decorations anywhere on the mug.
- No props, food, beverages, or background objects.
- No coffee, liquid, or steam.
- No human figures.

OUTPUT: ONE image, {aspect}, ready to upload directly to a Shopify product gallery as the {view_label} photo.
"""


# Per-color accuracy constraints — add entries as new accent colors are added.
_COLOR_ACCENT_CONFIGS: dict[str, dict[str, str]] = {
    "yellow": {
        "color_constraint": (
            "Must be vivid saturated yellow — classic ceramic mug yellow. "
            "NOT cream, NOT gold, NOT orange, NOT pale pastel yellow."
        ),
        "color_avoid": "Do NOT drift yellow to cream, gold, mustard, or orange.",
    },
    "pink": {
        "color_constraint": (
            "Must be vivid coral-pink or rose-pink ceramic glaze. "
            "NOT lavender, NOT purple, NOT dusty mauve, NOT salmon."
        ),
        "color_avoid": "Do NOT drift pink to lavender, purple, or dusty mauve.",
    },
    "red": {
        "color_constraint": (
            "Must be vivid warm red ceramic glaze — tomato red or signal red. "
            "NOT orange-red, NOT burgundy, NOT dark wine, NOT pink-red."
        ),
        "color_avoid": "Do NOT drift red to orange, burnt sienna, burgundy, or maroon.",
    },
}


PROMPT_TEMPLATE_WITH_MODEL = """Generate ONE brand-new e-commerce fashion photograph of a real human {model_phrase} wearing the {garment} from the attached reference image. This is the {view_label} for a Shopify product gallery.

REQUIRED — non-negotiable
- The image MUST contain a real human {model_phrase} visibly wearing the garment in the frame.
- Do NOT produce a ghost-mannequin shot, invisible-mannequin effect, flat-lay, hanger shot, mannequin cutout, or garment-only image. If you cannot render a human, do not return an image.
- The garment in the new photo must be a faithful re-creation of the supplier reference: same cut, same fit, same neckline, same sleeve length, same hem, same fabric texture, same color.

VIEW DIRECTIVE
{view_directive}

REFERENCE IMAGE
The attached supplier photo is used as the source of truth for the garment's construction (cut, fit, neckline, collar shape, sleeve length and shape, hem, fabric weight and texture, stitching) AND the exact color. Do NOT copy the model, face, hairstyle, body, pose, expression, lighting, background, camera angle, crop, or composition from the reference — invent a new model and new staging while preserving the garment.

PRODUCT FACTS
- Garment: {garment}{product_name_clause}
- Brand: {brand_line}
- Style: {style_number}
- Color: {color_label}

{garment_details_block}MODEL
- A real human {model_phrase}, approximately mid-20s to early 30s, natural realistic features, neutral pleasant expression, natural makeup, simple modern hairstyle.
- Across the 6-image gallery, the same model identity is reused (same face, hair, body, skin tone) so the gallery looks coherent.

COLOR FIDELITY (CRITICAL)
- Sample the garment color directly from the reference image pixels — same hue, same saturation, same brightness, same warmth.
- If the reference is red, the output must be the SAME red — not orange, not pink, not maroon, not crimson, not coral.
- If the reference is royal blue, the output must be the SAME royal blue — not navy, not turquoise, not sky blue, not cobalt.
- If the reference is white, keep it true white — not cream, not off-white, not grey.
- If the reference is black, keep it true black — not charcoal, not faded.
- The garment must be one solid uniform color unless the reference clearly shows a print or pattern.

STUDIO REQUIREMENTS
- Photo-realistic e-commerce studio product photography.
- Seamless soft white or very light grey studio background.
- Even, soft, balanced studio lighting; no harsh shadows; no color cast on the garment.
- Sharp focus on the garment, color-accurate, high resolution.
- Natural fabric drape and folds.

WHAT TO AVOID
- No text, captions, labels, size tags, hangtags, watermarks, signatures, or QR codes anywhere in the image.
- No extra logos, brand marks, or graphics beyond what is visibly on the garment in the reference.
- No props, plants, furniture, or background objects.
- Do not reproduce the exact pose, expression, or composition of the reference photo.

OUTPUT: ONE image, {aspect}, ready to upload directly to a Shopify product gallery as the {view_label} photo.
"""


PROMPT_TEMPLATE_DETAIL = """Generate ONE brand-new e-commerce product close-up of the {garment} from the attached reference image. This is the {view_label} for a Shopify product gallery — a garment-only macro shot, no model required.

DETAIL DIRECTIVE
{view_directive}

REFERENCE IMAGE
The attached supplier photo is used as the source of truth for the garment's construction (cut, neckline, hem, fabric weight and texture, stitching) AND the exact color. Reproduce those details accurately in this close-up.

PRODUCT FACTS
- Garment: {garment}{product_name_clause}
- Brand: {brand_line}
- Style: {style_number}
- Color: {color_label}

{garment_details_block}COLOR FIDELITY (CRITICAL)
- Sample the garment color directly from the reference image pixels — same hue, same saturation, same brightness, same warmth.
- If the reference is red, the output must be the SAME red — not orange, not pink, not maroon, not crimson, not coral.
- If the reference is royal blue, the output must be the SAME royal blue — not navy, not turquoise, not sky blue, not cobalt.
- The garment must be one solid uniform color unless the reference clearly shows a print or pattern.

STUDIO REQUIREMENTS
- Photo-realistic studio macro product photography.
- Seamless soft white or very light grey background.
- Even soft lighting; the fabric texture and stitching are sharp and clearly readable.

WHAT TO AVOID
- No text, captions, labels, tags, watermarks, or signatures.
- No extra logos, prints, or graphics beyond what is on the garment in the reference.
- No props or background objects.

OUTPUT: ONE image, {aspect}, ready to upload directly to a Shopify product gallery as the {view_label} photo.
"""


def color_label(code_or_name: str) -> str:
    value = (code_or_name or "").strip()
    if not value:
        return "match the color shown in the reference image exactly"
    upper = value.upper()
    if 2 <= len(upper) <= 4 and any(c.isdigit() for c in upper):
        name = GILDAN_CODE_TO_NAME.get(upper)
        head = f"Gildan code {upper}" + (f" ({name})" if name else "")
        return f"{head} — match this color EXACTLY against the reference image"
    return f"{value} — match this color EXACTLY against the reference image"


# Ethnicity descriptors rotated across products so the gallery shows diversity.
# Keyed by (product_id % 4) so each product+color pair always maps to the same
# ethnicity — gallery coherence is maintained across the 6 views.
_ETHNICITY_POOL = [
    "East Asian",
    "Black",
    "White",
    "South Asian",
]


def model_phrase_for(product: dict[str, Any], color: str = "") -> str:
    text = " ".join(
        str(product.get(field) or "")
        for field in ("product_name", "category", "description")
    ).lower()

    # Derive a stable ethnicity from product id + color so each listing always
    # shows the same model appearance across regenerations.
    seed = (int(product.get("id") or 0) * 31 + hash(color or "")) & 0xFFFF
    ethnicity = _ETHNICITY_POOL[seed % len(_ETHNICITY_POOL)]

    if any(word in text for word in ("women", "woman", "ladies", "women's", "womens", "female")):
        return f"{ethnicity} female fashion model"
    if any(word in text for word in ("men's", "mens", " men ", "male")):
        return f"{ethnicity} male fashion model"
    if any(word in text for word in ("youth", "kids", "boys", "girls", "children")):
        return f"{ethnicity} youth fashion model"
    return f"{ethnicity} male fashion model"


def _format_for_view(product: dict[str, Any], color: str, view: dict[str, str]) -> str:
    color_value = (color or product.get("color") or "").strip()
    # Prefer our garment guess over the supplier-supplied category, since
    # the guess pulls in age/style distinctions (e.g., "youth hooded
    # sweatshirt") that the simple category field misses.
    garment = (guess_garment(product) or product.get("category") or "garment").strip()
    product_name = (product.get("product_name") or "").strip()
    brand = (product.get("brand") or "").strip()
    style_number = (product.get("style_number") or "").strip() or "n/a"
    model_phrase = model_phrase_for(product, color=color_value)

    product_name_clause = (
        f" ({product_name})"
        if product_name and product_name.lower() != garment.lower()
        else ""
    )
    brand_line = brand if brand else "n/a"

    notes = garment_specific_notes(product)
    garment_details_block = ""
    if notes:
        bullets = "\n".join(f"- {n}" for n in notes)
        garment_details_block = f"GARMENT DETAILS\n{bullets}\n\n"

    needs_model = view.get("needs_model", "yes") == "yes"
    template = PROMPT_TEMPLATE_WITH_MODEL if needs_model else PROMPT_TEMPLATE_DETAIL
    directive = view["directive"].format(model_phrase=model_phrase) if needs_model else view["directive"]

    return template.format(
        garment=garment,
        view_label=view["label"],
        view_directive=directive,
        aspect=view["aspect"],
        color_label=color_label(color_value),
        product_name_clause=product_name_clause,
        brand_line=brand_line,
        style_number=style_number,
        model_phrase=model_phrase,
        garment_details_block=garment_details_block,
    ).strip()


def build_prompts(product: dict[str, Any], color: str = "") -> list[dict[str, str]]:
    """Return one prompt per view, in the order they should be generated."""
    if is_mug_product(product):
        return [
            {
                "key": view["key"],
                "label": view["label"],
                "summary": view["summary"],
                "prompt": _format_for_view_mug(product, color, view),
            }
            for view in VIEWS_MUG
        ]
    if is_bag_product(product):
        return [
            {
                "key": view["key"],
                "label": view["label"],
                "summary": view["summary"],
                "prompt": _format_for_view(product, color, view),
            }
            for view in VIEWS_BAG
        ]
    return [
        {
            "key": view["key"],
            "label": view["label"],
            "summary": view["summary"],
            "prompt": _format_for_view(product, color, view),
        }
        for view in VIEWS
    ]


def build_prompt(product: dict[str, Any], color: str = "", view: str = "front") -> str:
    """Convenience: build a single named view's prompt (defaults to front)."""
    if is_mug_product(product):
        target = next((v for v in VIEWS_MUG if v["key"] == view), VIEWS_MUG[0])
        return _format_for_view_mug(product, color, target)
    if is_bag_product(product):
        target = next((v for v in VIEWS_BAG if v["key"] == view), VIEWS_BAG[0])
        return _format_for_view(product, color, target)
    target = next((v for v in VIEWS if v["key"] == view), VIEWS[0])
    return _format_for_view(product, color, target)


def _full_text(product: dict[str, Any]) -> str:
    return " ".join(
        str(product.get(field) or "")
        for field in ("product_name", "category", "description", "style_number")
    ).lower()


def is_mug_product(product: dict[str, Any]) -> bool:
    return "mug" in _full_text(product)


def is_bag_product(product: dict[str, Any]) -> bool:
    text = _full_text(product)
    return any(w in text for w in ("tote bag", "tote", "canvas bag", "shopping bag", "reusable bag"))


def _is_black_accent_mug(product: dict[str, Any]) -> bool:
    """True for mugs with white exterior + black interior + black handle."""
    text = _full_text(product)
    return "black-accent" in text or "black accent" in text or "blk" in text.lower()


def _get_accent_color(product: dict[str, Any]) -> str | None:
    """Return the accent color key if this is a chromatic-accent mug, else None."""
    color_field = (product.get("color") or "").lower()
    text = _full_text(product)
    for color_name in _COLOR_ACCENT_CONFIGS:
        if (
            color_name in color_field
            or f"{color_name}-accent" in text
            or f"{color_name} accent" in text
        ):
            return color_name
    return None


# Extra directive appended to mug_top prompts where the interior is dark/matte.
# A real camera cannot produce 100% flat black — the ceramic glaze reacts to
# overhead studio light with a subtle gradient. Without this note AI generates
# a CGI-looking filled circle.
_BLACK_INTERIOR_TOP_VIEW_NOTE = (
    " The matte black ceramic interior shows natural light behavior from a real "
    "camera: the inner rim edge catches a subtle overhead highlight, the interior "
    "walls fade gradually darker toward the base — a gentle diffused gradient, "
    "not flat solid black. The glaze has low-sheen quality — not mirror-reflective, "
    "not completely flat matte. Looks like a real studio photo, NOT CGI. "
    "No artificial circular highlight patterns. No seamless digital fill."
)


def _format_for_view_mug(product: dict[str, Any], color: str, view: dict[str, str]) -> str:
    product_name = (product.get("product_name") or "").strip()
    style_number = (product.get("style_number") or "").strip() or "n/a"
    name_lower = product_name.lower()
    oz = "15oz" if "15" in name_lower else "11oz"

    view_directive = view["directive"]

    if _is_black_accent_mug(product):
        mug_type = f"{oz} white-exterior black-interior black-handle ceramic coffee mug"
        if view["key"] == "mug_top":
            view_directive = view_directive + _BLACK_INTERIOR_TOP_VIEW_NOTE
        return PROMPT_TEMPLATE_MUG_BLACK_ACCENT.format(
            mug_type=mug_type,
            view_label=view["label"],
            view_directive=view_directive,
            aspect=view["aspect"],
            style_number=style_number,
        ).strip()

    accent_color = _get_accent_color(product)
    if accent_color:
        mug_type = (
            f"{oz} white-exterior {accent_color}-interior "
            f"{accent_color}-handle ceramic coffee mug"
        )
        config = _COLOR_ACCENT_CONFIGS[accent_color]
        return PROMPT_TEMPLATE_MUG_COLOR_ACCENT.format(
            mug_type=mug_type,
            view_label=view["label"],
            view_directive=view_directive,
            aspect=view["aspect"],
            style_number=style_number,
            accent_color=accent_color,
            color_constraint=config["color_constraint"],
            color_avoid=config["color_avoid"],
        ).strip()

    mug_type = f"{oz} white ceramic coffee mug"
    return PROMPT_TEMPLATE_MUG.format(
        mug_type=mug_type,
        view_label=view["label"],
        view_directive=view_directive,
        aspect=view["aspect"],
        style_number=style_number,
    ).strip()


def is_youth_garment(product: dict[str, Any]) -> bool:
    text = _full_text(product)
    if any(w in text for w in ("youth", "kids", "boys", "girls", "children")):
        return True
    # Gildan style numbers ending in B (e.g., 5000B, 18500B) indicate Youth.
    style = (product.get("style_number") or "").upper().strip()
    if style.endswith("B") and not style.endswith("BB"):
        return True
    return False


def guess_garment(product: dict[str, Any]) -> str:
    """Return a short, distinctive garment label used in the prompt opening
    line. Order matters — most-specific checks first."""
    text = _full_text(product)

    if "mug" in text:
        oz = "15oz" if "15" in text else "11oz"
        if "black-accent" in text or "black accent" in text or "blk" in text.lower():
            return f"{oz} white-exterior black-interior black-handle ceramic coffee mug"
        return f"{oz} white ceramic coffee mug"

    youth = is_youth_garment(product)
    age_prefix = "youth" if youth else "adult"

    if "hooded" in text or "hoodie" in text:
        return f"{age_prefix} hooded sweatshirt"
    if "crewneck sweatshirt" in text or "crew neck sweatshirt" in text:
        return f"{age_prefix} crewneck sweatshirt"
    if "sweatshirt" in text:
        return f"{age_prefix} crewneck sweatshirt"
    if "long sleeve" in text or "long-sleeve" in text:
        return f"{age_prefix} long-sleeve t-shirt"
    if "v-neck" in text or "v neck" in text or "vneck" in text:
        return f"{age_prefix} v-neck t-shirt"
    if "polo" in text or "pique" in text:
        return f"{age_prefix} pique polo shirt"
    if "tank" in text:
        return f"{age_prefix} tank top"
    if "t-shirt" in text or "tshirt" in text or "tee" in text:
        return f"{age_prefix} crew-neck t-shirt"
    if "jacket" in text:
        return f"{age_prefix} jacket"
    if "cap" in text or "hat" in text:
        return f"{age_prefix} cap"
    if "tote bag" in text or "tote" in text:
        return "canvas tote bag"
    if "canvas bag" in text or "shopping bag" in text or "reusable bag" in text:
        return "canvas tote bag"
    return ""


def garment_specific_notes(product: dict[str, Any]) -> list[str]:
    """Return a list of garment-specific clarifications that should appear in
    the GARMENT DETAILS section of the prompt. These are constraints the
    image model often gets wrong without explicit reminders."""
    if is_mug_product(product):
        return []
    text = _full_text(product)
    youth = is_youth_garment(product)
    notes: list[str] = []

    if "hooded" in text or "hoodie" in text:
        if youth:
            notes.append(
                "IMPORTANT: This is a YOUTH hooded sweatshirt. The hood has NO "
                "drawstring (US/EU youth-garment safety standard prohibits "
                "drawstrings on hoods of children's apparel). Render the hood "
                "as a clean plain opening — no laces, no ties, no eyelets, no "
                "drawcords, nothing hanging from the hood at all."
            )
        else:
            notes.append(
                "This is an ADULT hooded sweatshirt. The hood has flat "
                "drawstrings — render TWO flat drawstring tails of equal "
                "length hanging from the hood opening at the front, in the "
                "same color as the garment, threaded through visible eyelets "
                "or grommets at the hood opening."
            )
        notes.append(
            "Render the typical hooded-sweatshirt construction: ribbed cuffs "
            "at the sleeves, a ribbed bottom hem, and a kangaroo-pouch front "
            "pocket if visible in the reference."
        )

    elif "crewneck sweatshirt" in text or "crew neck sweatshirt" in text or "sweatshirt" in text:
        notes.append(
            "This is a crewneck sweatshirt — render a ribbed round crew-neck "
            "collar (NOT a hood, NOT a V-neck), ribbed cuffs at the sleeves, "
            "and a ribbed bottom hem. Heavyweight fleece fabric."
        )

    if "long sleeve" in text or "long-sleeve" in text:
        notes.append(
            "Long-sleeve t-shirt — sleeves extend fully to the wrists with "
            "lightweight knit cuffs. Not a sweatshirt; not heavyweight fabric."
        )

    if "v-neck" in text or "v neck" in text:
        notes.append(
            "The neckline is a V-neck — render a clear V-shaped opening at "
            "the collar with a single seam at the bottom of the V. Not a "
            "crew/round neckline."
        )

    if "polo" in text or "pique" in text:
        notes.append(
            "This is a pique polo shirt — render the placket at the collar "
            "with 2-3 visible buttons, a flat ribbed collar that can fold, "
            "and the textured pique-knit fabric weave visible on the body. "
            "Short sleeves with banded cuffs."
        )

    if youth:
        notes.append(
            "This is a YOUTH-sized garment. Render the appropriate fit and "
            "proportions for a child model, not an adult."
        )

    return notes
