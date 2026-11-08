"""Prepara le immagini web: logo trasparente + foto di squadra ottimizzata.
Uso: python prep_images.py <cartella_sorgenti> <cartella_output>"""
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

src, out = Path(sys.argv[1]), Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)

# --- Logo: flood fill del verde esterno partendo dai bordi ---
img = Image.open(src / "logo.jpeg").convert("RGB")
a = np.asarray(img).astype(np.int32)
h, w, _ = a.shape
edge = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
bg = np.median(edge, axis=0)
print("verde di sfondo:", bg.astype(int), "#%02x%02x%02x" % tuple(bg.astype(int)))
dist = np.sqrt(((a - bg) ** 2).sum(axis=2))
TOL = 70
cand = dist < TOL
mask = np.zeros((h, w), bool)
q = deque()
for x in range(w):
    for y in (0, h - 1):
        if cand[y, x] and not mask[y, x]:
            mask[y, x] = True; q.append((y, x))
for y in range(h):
    for x in (0, w - 1):
        if cand[y, x] and not mask[y, x]:
            mask[y, x] = True; q.append((y, x))
while q:
    y, x = q.popleft()
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        ny, nx = y + dy, x + dx
        if 0 <= ny < h and 0 <= nx < w and cand[ny, nx] and not mask[ny, nx]:
            mask[ny, nx] = True; q.append((ny, nx))
print("quota pixel dello scudo:", (~mask).sum() / mask.size)

alpha = Image.fromarray(np.where(mask, 0, 255).astype(np.uint8))
# bordo morbido: erodi di 1px e sfuma, così non resta un alone verde
alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
rgba = img.copy(); rgba.putalpha(alpha)
bbox = alpha.point(lambda v: 255 if v > 8 else 0).getbbox()
rgba = rgba.crop(bbox)
side = max(rgba.size)
sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
sq.paste(rgba, ((side - rgba.width) // 2, (side - rgba.height) // 2))
for size, name in ((800, "logo"), (192, "logo-192")):
    r = sq.resize((size, size), Image.LANCZOS)
    r.save(out / f"{name}.webp", quality=88, method=6)
    # PNG di riserva a 256 colori: molto più leggero, differenza invisibile
    r.quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.FLOYDSTEINBERG).save(out / f"{name}.png", optimize=True)

# --- Foto di squadra ---
ph = Image.open(src / "squadra.tiff").convert("RGB")
for width in (1536, 960):
    r = ph.resize((width, round(ph.height * width / ph.width)), Image.LANCZOS)
    r.save(out / f"squadra-{width}.jpg", quality=80, optimize=True, progressive=True)
    r.save(out / f"squadra-{width}.webp", quality=78, method=6)
print("foto", ph.size)

# --- Foto al campo: ritagliate stringendo sulla squadra (box = sinistra, alto, destra, basso) ---
RITAGLI = {
    "squadra-campo-1": (185, 195, 835, 628),
    "squadra-campo-2": (160, 135, 850, 595),
}
for name, box in RITAGLI.items():
    sorgente = src / f"{name}.jpg"
    if not sorgente.exists():
        continue
    r = Image.open(sorgente).convert("RGB").crop(box)
    r.save(out / f"{name}.jpg", quality=84, optimize=True, progressive=True)
    r.save(out / f"{name}.webp", quality=82, method=6)
    print(name, r.size)

# --- Icona per la schermata Home dell'iPhone: quadrata, sfondo pieno, gli angoli li arrotonda iOS ---
icona = src / "icona.png"
if icona.exists():
    ic = Image.open(icona).convert("RGB")
    ic.resize((180, 180), Image.LANCZOS).save(out / "apple-touch-icon.png", optimize=True)
    print("icona", ic.size)
