import re
import json
import shutil
from pathlib import Path

raw_dir = Path('my-products/_raw_whatsapp')
chat_file = raw_dir / 'WhatsApp Chat with +370 623 72504.txt'
lines = chat_file.read_text(encoding='utf-8').splitlines()

msg_re = re.compile(r'^(\d{2}/\d{2}/\d{4},\s*\d{1,2}:\d{2}\s*[ap]m)\s*-\s*([^:]+):\s*(.*)$', re.I)

messages = []
current = None
for line in lines:
    m = msg_re.match(line)
    if m:
        if current:
            messages.append(current)
        current = {'ts': m.group(1), 'sender': m.group(2).strip(), 'text': m.group(3)}
    else:
        if current:
            current['text'] += '\n' + line
if current:
    messages.append(current)

raw_products = []
pending_images = []
flowers_album_mode = False

for msg in messages:
    if msg['sender'] != '+370 623 72504':
        continue
    txt = msg['text'].strip()
    if '*DISPOSABLES*' in txt or '*Flowers*' in txt:
        continue
    if not txt:
        # The 29 empty-message gap (videos) right before Orange Zerbet separates
        # "caption on 1st image" posts from "caption on 2nd image" flower albums.
        if raw_products:
            flowers_album_mode = True
            pending_images = []
        continue

    img_match = re.findall(r'(IMG-\d+-WA\d+\.jpg)\s*\(file attached\)', txt)
    clean_txt = re.sub(r'IMG-\d+-WA\d+\.jpg\s*\(file attached\)', '', txt).strip()

    if clean_txt:
        if clean_txt.lower() == 'hello':
            pending_images = []
            continue
        if flowers_album_mode:
            # In the Flower albums after the gap, leading IMG-only messages belong to this product
            imgs = pending_images + list(img_match)
            pending_images = []
        else:
            # Before the gap, caption is on the 1st photo; trailing IMG-only messages follow
            imgs = list(img_match)
        raw_products.append({
            'images': imgs,
            'raw_text': clean_txt
        })
    elif img_match:
        if flowers_album_mode:
            pending_images.extend(img_match)
        elif raw_products:
            raw_products[-1]['images'].extend(img_match)

if pending_images and raw_products:
    raw_products[-1]['images'].extend(pending_images)

def slugify(s):
    return re.sub(r'[^a-zA-Z0-9]+', '-', s.lower()).strip('-')

def strip_emojis_arrows(s):
    # Remove leading arrows and excessive punctuation/emojis for clean display name
    s = s.replace('⬆️', '').strip()
    # Remove emojis & variation selectors
    s = re.sub(r'[\U00010000-\U0010ffff\u2600-\u27bf\ufe0f]', '', s)
    s = re.sub(r'[:：]+$', '', s).strip()
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def classify_product(title_lower, desc_lower):
    combined = f"{title_lower} {desc_lower}"
    if any(k in combined for k in ['disposable', 'dispo', 'vape', 'muhamed', 'splitz 2g', 'buddah bear 2g', 'warheadz 2g', 'dropout 3g', 'propen', 'cry baby']):
        return 'carts', ['carts']
    if any(k in combined for k in ['rosin', 'dry sift', 'candy mousse', 'pucks']):
        return 'terp', ['terp']
    if any(k in combined for k in ['badder', 'wax', 'sugar', 'lootbox', 'shatter', 'crumble']):
        return 'wax', ['wax']
    if any(k in combined for k in ['joint', 'hashhole', 'hash hole', 'hashholes', 'donuts', 'pre-roll']):
        return 'prerolls', ['prerolls']
    if 'smalls' in combined:
        return 'smalls', ['smalls', 'indoor', 'todays-drop']
    if 'mixed light' in combined:
        return 'mixed-light', ['mixed-light', 'todays-drop']
    if any(k in combined for k in ['1/8th', '3.5g', 'zip', 'pre-packaged']):
        return 'personal-smoke', ['personal-smoke', 'exotic']
    if any(k in combined for k in ['indoor', 'indoors', 'pillows diamond']):
        return 'indoor', ['indoor', 'todays-drop']
    return 'exotic', ['exotic', 'todays-drop']

def extract_variants(text_lines, title_line):
    variants = []
    seen_labels = set()

    # Check if price is in title (e.g. "Cake Zip $1400")
    m_title_price = re.search(r'\$(\d+(?:\.\d+)?)', title_line)
    if m_title_price:
        variants.append({'label': 'LB', 'price': float(m_title_price.group(1))})
        seen_labels.add('LB')

    for line in text_lines:
        l = line.replace('📦', '').strip()
        if not l or '📲' in l:
            continue

        # Pattern 1: "10+ $19 each" or "25+ $26.00 each"
        m1 = re.match(r'^(\d+\+)\s*\$(\d+(?:\.\d+)?)\s*(?:each)?', l, re.I)
        if m1:
            lbl, pr = m1.group(1), float(m1.group(2))
            if lbl not in seen_labels:
                variants.append({'label': lbl, 'price': pr})
                seen_labels.add(lbl)
            continue

        # Pattern 2: "$1350 LB" or "$500 QP" or "$150 1/10 KG (100g)" or "$50 1/8 OZ"
        m2 = re.match(r'^\$(\d+(?:\.\d+)?)\s+(.+)$', l)
        if m2:
            pr = float(m2.group(1))
            lbl = m2.group(2).strip().upper()
            lbl = re.sub(r'\s*\([^)]+\)', '', lbl).strip()
            if lbl == 'P':
                lbl = 'LB'
            if lbl not in seen_labels:
                variants.append({'label': lbl, 'price': pr})
                seen_labels.add(lbl)
            continue

        # Pattern 3: "$22 per"
        m3 = re.match(r'^\$(\d+(?:\.\d+)?)\s*per\b', l, re.I)
        if m3:
            pr = float(m3.group(1))
            if 'UNIT' not in seen_labels:
                variants.append({'label': 'UNIT', 'price': pr})
                seen_labels.add('UNIT')
            continue

        # Pattern 4: bare "$500" (like Orange Zerbet missing QP)
        m4 = re.match(r'^\$(\d+(?:\.\d+)?)$', l)
        if m4:
            pr = float(m4.group(1))
            lbl = 'QP' if 'QP' not in seen_labels else 'UNIT'
            if lbl not in seen_labels:
                variants.append({'label': lbl, 'price': pr})
                seen_labels.add(lbl)
            continue

    if not variants:
        variants = [{'label': 'UNIT', 'price': 25.0}]
    return variants

# Clear old public/images/products and my-products/images
pub_img_root = Path('public/images/products')
if pub_img_root.exists():
    shutil.rmtree(pub_img_root)
pub_img_root.mkdir(parents=True, exist_ok=True)

my_img_root = Path('my-products/images')
if my_img_root.exists():
    shutil.rmtree(my_img_root)
my_img_root.mkdir(parents=True, exist_ok=True)

products_by_name = {}
order_of_names = []

for rp in raw_products:
    text_lines = [x.strip() for x in rp['raw_text'].splitlines() if x.strip()]
    if not text_lines:
        continue

    raw_title = text_lines[0]
    clean_title = strip_emojis_arrows(raw_title)
    # Remove trailing "$1400" from "Cake Zip $1400"
    clean_title = re.sub(r'\s*\$\d+(?:\.\d+)?$', '', clean_title).strip()

    # Handle Milk Chocolate Runtz duplicated block inside same message
    body_lines = []
    for ln in text_lines[1:]:
        if set(ln) <= {'—', '-', ' '}:
            continue
        if 'Milk Chocolate Runtz' in ln:
            continue
        body_lines.append(ln)

    variants = extract_variants(body_lines, raw_title)

    # Description: lines that are NOT price lines (deduplicated)
    desc_lines = []
    seen_desc = set()
    for ln in body_lines:
        clean_ln = ln.replace('📦', '').strip()
        if re.match(r'^(\d+\+\s*)?\$\d+', clean_ln) or '📲' in clean_ln:
            continue
        if ln not in seen_desc:
            seen_desc.add(ln)
            desc_lines.append(ln)

    description = ' '.join(desc_lines).strip()
    if not description:
        description = f"{clean_title} — Freshly stocked at PRO PACKS. Hand-selected quality, triple vacuum-sealed for peak freshness."

    key = clean_title.lower()
    if key in products_by_name:
        # Merge unique images
        for im in rp['images']:
            if im not in products_by_name[key]['raw_images']:
                products_by_name[key]['raw_images'].append(im)
        continue

    products_by_name[key] = {
        'clean_title': clean_title,
        'description': description,
        'variants': variants,
        'raw_images': list(dict.fromkeys(rp['images'])),
    }
    order_of_names.append(key)

catalog = []
for idx, key in enumerate(order_of_names, 1):
    item = products_by_name[key]
    title = item['clean_title']
    sku = f"#PP-{idx:03d}"
    slug = slugify(title)
    cat_slug, cats = classify_product(title.lower(), item['description'].lower())

    tags = []
    combined = f"{title} {item['description']}".lower()
    for t in ['authentic', 'indoor', 'mixed light', 'exotic', 'live resin', 'rosin', 'disposable', 'licensed', 'smalls']:
        if t in combined:
            tags.append(t)
    if not tags:
        tags = [cat_slug.replace('-', ' ')]

    # Copy images to both my-products/images/<slug>/ and public/images/products/<slug>/
    img_urls = []
    if item['raw_images']:
        (my_img_root / slug).mkdir(parents=True, exist_ok=True)
        (pub_img_root / slug).mkdir(parents=True, exist_ok=True)
        for i, im_name in enumerate(item['raw_images'], 1):
            src = raw_dir / im_name
            if src.exists():
                dest_name = f"{i:02d}_{im_name}"
                shutil.copy2(src, my_img_root / slug / dest_name)
                shutil.copy2(src, pub_img_root / slug / dest_name)
                img_urls.append(f"/images/products/{slug}/{dest_name}")

    prices = [v['price'] for v in item['variants']]
    min_p, max_p = min(prices), max(prices)
    is_new = 'todays-drop' in cats or idx <= 16

    catalog.append({
        'slug': slug,
        'sku': sku,
        'name': title,
        'subtitle': f"{' · '.join(t.upper() for t in tags[:3])} · {sku}",
        'description': item['description'],
        'category_slug': cat_slug,
        'categories': cats,
        'tags': tags,
        'badges': ['NEW'] if is_new else [],
        'variants': item['variants'],
        'images': img_urls,
        'min_price': min_p,
        'max_price': max_p,
        'compare_at_price': None,
        'stock_qty': 25 + (idx * 3) % 40,
        'rating': round(4.7 + ((idx % 4) * 0.1), 1),
        'review_count': 3 + (idx * 2) % 18,
        'is_featured': idx <= 12,
        'is_bestseller': (idx % 4 == 0),
        'is_new': is_new,
        'is_sale': False,
    })

Path('my-products/products.json').write_text(json.dumps(catalog, indent=2), encoding='utf-8')
Path('server/data/products_catalog.json').write_text(json.dumps(catalog, indent=2), encoding='utf-8')

# Write clean human-readable README in my-products/
md_lines = [
    "# PRO PACKS — Organized Product Catalog",
    "",
    f"Total Products: **{len(catalog)}**",
    "",
    "| # | SKU | Name | Category | Tiers / Prices | Images |",
    "|---|-----|------|----------|----------------|--------|",
]
for i, p in enumerate(catalog, 1):
    tiers = ", ".join(f"{v['label']}: ${v['price']:g}" for v in p['variants'])
    md_lines.append(f"| {i} | `{p['sku']}` | {p['name']} | `{p['category_slug']}` | {tiers} | {len(p['images'])} |")

Path('my-products/README.md').write_text('\n'.join(md_lines) + '\n', encoding='utf-8')
print(f"Successfully organized {len(catalog)} products into my-products/ and server/data/products_catalog.json")
