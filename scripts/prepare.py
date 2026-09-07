"""Keep the checked-in static site consistent; no runtime or framework required.

python scripts/prepare.py --sync    Update shared navigation/accessibility markup.
python scripts/prepare.py --images  Generate responsive derivatives (requires Pillow).
python scripts/prepare.py --check   Validate pages and all local references.
"""
from pathlib import Path
from html import escape, unescape
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import argparse
import os
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
PAGES = sorted(ROOT.glob('*.html')) + sorted((ROOT / 'projects').glob('*.html')) + [ROOT / 'citadel/index.html', ROOT / 'go/index.html']
NAV = [('index.html', 'Home', 'home'), ('projects.html', 'Projects', 'projects'), ('citadel/', 'Citadel / Shop', 'shop'), ('blog.html', 'Blog', 'blog'), ('contact.html', 'Contact', 'contact')]
FOOTER = '''<footer>
  <div class="site-footer-links"><a href="/projects.html">Projects</a><a href="/citadel/">Citadel Supply Co.</a><a href="/go/">Socials &amp; links</a><a href="/contact.html">Contact</a></div>
  <p>&copy; 2025-2026 Erik Reiner | <a href="mailto:erik@erikreiner.com">erik@erikreiner.com</a></p>
</footer>'''

def write_if_changed(path, text):
    if path.read_text(encoding='utf-8') != text:
        path.write_text(text, encoding='utf-8', newline='\n')

def sync(text, path):
    page = re.search(r'<body data-page="([^"]+)"', text)
    if page:
        current = page[1]
        nav_items = []
        for target, label, key in NAV:
            selected = current == key or current == 'project' and key == 'projects'
            aria = 'location' if current == 'project' else 'page'
            attrs = f' class="active" aria-current="{aria}"' if selected else ''
            nav_items.append(f'      <li><a href="/{target}"{attrs}>{label}</a></li>')
        navigation = '''<nav aria-label="Main navigation">
  <div class="shell nav-inner">
    <a href="/" class="nav-brand">Erik Reiner</a>
    <button class="nav-toggle" type="button" aria-label="Toggle menu" aria-expanded="false" aria-controls="main-nav">
      <span></span><span></span><span></span>
    </button>
    <ul class="nav-links" id="main-nav">
''' + '\n'.join(nav_items) + '\n    </ul>\n  </div>\n</nav>'
        text = re.sub(r'<nav(?: aria-label="Main navigation")?>[\s\S]*?</nav>', lambda _: navigation, text, count=1)
        text = re.sub(r'<footer>[\s\S]*?</footer>', lambda _: FOOTER, text)
    if '<main' in text:
        main = re.search(r'<main\b[^>]*>', text)[0]
        match = re.search(r' id="([^"]+)"', main)
        ident = match[1] if match else 'main-content'
        if not match:
            text = text.replace(main, main[:-1] + ' id="main-content" tabindex="-1">', 1)
        elif 'tabindex=' not in main:
            text = text.replace(main, main[:-1] + ' tabindex="-1">', 1)
        if 'class="skip-link"' not in text:
            text = re.sub(r'(<body[^>]*>)', rf'\1\n<a class="skip-link" href="#{ident}">Skip to content</a>', text, count=1)
    text = text.replace('?ref=dashboard-header', '').replace('rel="noreferrer"', 'rel="noopener noreferrer"')
    def label_card(match):
        tag, content = match.groups()
        heading = re.search(r'<h3[^>]*>([\s\S]*?)</h3>', content)
        if heading and 'aria-label=' not in tag:
            title = unescape(re.sub(r'<[^>]+>', '', heading[1]))
            tag = tag[:-1] + f' aria-label="{escape(title, quote=True)}">'
        return tag + content + '</a>'
    text = re.sub(r'(<a\b[^>]*class="(?:feature-card|project-card)"[^>]*>)([\s\S]*?)</a>', label_card, text)
    if path.name == '404.html':
        text = re.sub(r'((?:href|src)=")(?!(?:https?:|mailto:|/|#))', r'\1/', text)
    return text

class Page(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.ids, self.duplicates, self.refs, self.images = set(), [], [], []
        self.h1, self.main = 0, 0
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            ident = attrs['id']
            if ident in self.ids: self.duplicates.append(ident)
            self.ids.add(ident)
        self.h1 += tag == 'h1'
        self.main += tag == 'main'
        for key in ('href', 'src', 'data-fullsize', 'data-original'):
            if attrs.get(key): self.refs.append(attrs[key])
        if attrs.get('srcset'):
            self.refs.extend(part.strip().split()[0] for part in attrs['srcset'].split(','))
        if tag == 'img': self.images.append(attrs)

def resolve(path, url):
    parts = urlsplit(unescape(url))
    if parts.scheme or parts.netloc: return None, None
    decoded = unquote(parts.path)
    target = ROOT / decoded.lstrip('/') if decoded.startswith('/') else path.parent / decoded
    if not decoded: target = path
    if target.is_dir(): target /= 'index.html'
    return target.resolve(), unquote(parts.fragment)

def check():
    errors = []
    docs = {path.resolve(): Page(path.read_text(encoding='utf-8')) for path in PAGES}
    for path, doc in docs.items():
        name = path.relative_to(ROOT)
        text = path.read_text(encoding='utf-8')
        if sync(text, path) != text: errors.append(f'{name}: shared markup is out of date; run --sync')
        if doc.h1 != 1 or doc.main != 1: errors.append(f'{name}: expected one h1 and main')
        for ident in doc.duplicates: errors.append(f'{name}: duplicate id {ident}')
        for url in doc.refs:
            target, fragment = resolve(path, url)
            if target is None: continue
            if not target.is_relative_to(ROOT) or not target.is_file(): errors.append(f'{name}: missing local target {url}')
            elif fragment and target in docs and fragment not in docs[target].ids: errors.append(f'{name}: missing fragment {url}')
        for img in doc.images:
            if 'alt' not in img or not img.get('width') or not img.get('height'): errors.append(f'{name}: image needs alt and dimensions: {img.get("src")}')
        if '@utrisworkshop' in text or 'dashboard-header' in text: errors.append(f'{name}: stale link')
        if path.name == 'projects.html':
            for hook in ('data-shuffle', 'id="cards-stage"', 'id="filter-status"'):
                if hook not in text: errors.append(f'{name}: missing interaction hook {hook}')
        if path == ROOT / 'go/index.html' and 'data-motion-toggle' not in text:
            errors.append(f'{name}: missing motion control')
    if errors:
        print('\n'.join(errors))
        return 1
    print(f'PASS: {len(docs)} pages; local links, fragments, images, shared markup, and landmarks.')
    return 0

def images():
    from PIL import Image, ImageOps
    generated = {}
    original_bytes = derivative_bytes = 0

    def optimize(path, original):
        nonlocal original_bytes, derivative_bytes
        key = (original, any(part.endswith('drawings') for part in original.parts))
        if key in generated: return generated[key]
        image = ImageOps.exif_transpose(Image.open(original))
        w, h = image.size
        is_logo = 'assets' in original.parts and original.parent.name == 'assets' and ('logo' in original.stem or 'mark' in original.stem)
        widths = [min(w, 90), min(w, 180)] if is_logo else sorted(set([min(w, 480), min(w, 960), min(w, 1600)]))
        variants = []
        for width in widths:
            output = original.parent / 'web' / f'{original.stem}-{original.suffix[1:]}-{width}.webp'
            output.parent.mkdir(exist_ok=True)
            if not output.exists() or output.stat().st_mtime < original.stat().st_mtime:
                copy = image.resize((width, max(1, round(h * width / w))), Image.Resampling.LANCZOS)
                copy.save(output, 'WEBP', quality=86, method=6)
            variants.append((output, width))
        original_bytes += original.stat().st_size
        derivative_bytes += variants[-1][0].stat().st_size
        generated[key] = (w, h, variants)
        return generated[key]

    for path in PAGES:
        text = path.read_text(encoding='utf-8')
        first = True
        def replace(match):
            nonlocal first
            tag = match[0]
            attrs = {key: unescape(value) for key, value in re.findall(r'([\w-]+)="([^"]*)"', tag)}
            source = attrs.get('data-original', attrs.get('src', ''))
            original, _ = resolve(path, source)
            if original is None or not original.is_file(): return tag
            w, h, variants = optimize(path, original)
            relative = lambda p: os.path.relpath(p, path.parent).replace('\\', '/')
            is_logo = 'logo' in original.stem or 'mark' in original.stem
            is_drawing = any(part.endswith('drawings') for part in original.parts)
            attrs['width'], attrs['height'] = str(w), str(h)
            attrs['data-original'] = source
            if is_drawing: attrs['data-fullsize'] = source
            attrs['src'] = relative(variants[min(1, len(variants) - 1)][0])
            attrs['srcset'] = ', '.join(f'{relative(output)} {width}w' for output, width in variants)
            attrs['sizes'] = '(max-width: 720px) 100vw, 700px' if is_drawing else '(max-width: 720px) 100vw, 50vw'
            if is_logo: attrs['sizes'] = '150px' if 'footer' in text[max(0, match.start()-200):match.start()] else '70px'
            attrs['decoding'] = 'async'
            if first and not is_logo:
                attrs.pop('loading', None)
                attrs['fetchpriority'] = 'high'
                first = False
            return '<img ' + ' '.join(f'{k}="{escape(v, quote=True)}"' for k, v in attrs.items()) + '>'
        text = re.sub(r'<img\b[^>]*>', replace, text)
        write_if_changed(path, text)
    logo = ROOT / 'citadel/assets/citadel-logo.png'
    favicon = ROOT / 'citadel/assets/favicon.png'
    with Image.open(logo) as source:
        source.thumbnail((64, 64), Image.Resampling.LANCZOS)
        source.save(favicon, optimize=True)
    print(f'{len(generated)} source images retained. Largest web variants: {original_bytes:,} -> {derivative_bytes:,} bytes ({100*(1-derivative_bytes/original_bytes):.0f}% smaller).')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--sync', action='store_true')
    parser.add_argument('--images', action='store_true')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    if args.sync:
        for path in PAGES: write_if_changed(path, sync(path.read_text(encoding='utf-8'), path))
    if args.images: images()
    if args.check: sys.exit(check())
