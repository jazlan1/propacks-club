import json
import re
from pathlib import Path

raw = json.loads(Path('server/data/extracted_products.json').read_text(encoding='utf-8'))

def parse_price(s):
    return float(re.sub(r'[^0-9.]', '', s)) if s else 0.0

def slugify(s):
    return re.sub(r'[^a-zA-Z0-9]+', '-', s.lower()).strip('-')

normalized = []
seen_slugs = set()

for idx, item in enumerate(raw):
    raw_title = item['rawTitle']
    sku_m = re.search(r'(#[A-Z0-9-]+)', raw_title)
    sku = sku_m.group(1) if sku_m else f'#PP{idx+100}'
    title_no_sku = re.sub(r'\s*#[A-Z0-9-]+', '', raw_title).strip()

    tags = [t.lower().strip() for t in re.findall(r'\(([^)]+)\)', title_no_sku)]
    clean_name = re.sub(r'\s*\([^)]+\)', '', title_no_sku).strip() or title_no_sku

    cats = [c for c in item['categories'] if c != 'all']
    if not cats:
        cats = ['moonrocks-snowcaps']
    primary_cat = next((c for c in cats if c not in ('todays-drop', 'specials', 'special-deals')), cats[0])

    variants = []
    for v in item['variants']:
        p = parse_price(v['price'])
        if p > 0:
            variants.append({'label': v['label'], 'price': p})
    if not variants:
        variants = [{'label': 'UNIT', 'price': 25.0}]

    prices = [v['price'] for v in variants]
    min_p, max_p = min(prices), max(prices)

    is_new = 'NEW' in item['badges'] or 'todays-drop' in cats
    is_sale = 'SALE' in item['badges'] or 'specials' in cats or 'special-deals' in cats
    compare_at = round(min_p * 1.18, 2) if is_sale else None

    base_slug = slugify(f"{clean_name}-{sku.lstrip('#')}")
    slug = base_slug
    n = 2
    while slug in seen_slugs:
        slug = f"{base_slug}-{n}"
        n += 1
    seen_slugs.add(slug)

    tag_str = ', '.join(tags) if tags else primary_cat.replace('-', ' ')
    desc = (
        f"{clean_name} ({tag_str}) — Hand-selected by PRO PACKS. "
        f"Hang-dried, jar-cured, and triple vacuum-sealed for peak freshness, aroma, and potency."
    )

    badges = []
    if is_new:
        badges.append('NEW')
    if is_sale:
        badges.append('SALE')

    normalized.append({
        'slug': slug,
        'sku': sku,
        'name': clean_name,
        'subtitle': f"{tag_str.upper()} · {sku}",
        'description': desc,
        'category_slug': primary_cat,
        'categories': cats,
        'tags': tags,
        'badges': badges,
        'variants': variants,
        'images': item['images'],
        'min_price': min_p,
        'max_price': max_p,
        'compare_at_price': compare_at,
        'stock_qty': 12 + (idx * 7) % 35,
        'rating': round(4.5 + ((idx % 5) * 0.1), 1),
        'review_count': 4 + (idx * 3) % 24,
        'is_featured': idx < 12,
        'is_bestseller': (idx % 5 == 0),
        'is_new': is_new,
        'is_sale': is_sale,
    })

Path('server/data/products_catalog.json').write_text(json.dumps(normalized, indent=2), encoding='utf-8')
print('Normalized products:', len(normalized))
