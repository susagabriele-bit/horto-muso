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

# --- Logo della Mazzola Cup (da Instagram): tengo solo il cerchio bianco, fuori trasparente ---
mazzola = src / "mazzola.png"
if mazzola.exists():
    m = Image.open(mazzola).convert("RGB")
    chiaro = np.asarray(m.convert("L")) > 128
    ys, xs = np.nonzero(chiaro)
    cx, cy = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2
    raggio = min(xs.max() - xs.min(), ys.max() - ys.min()) / 2 - 1
    lato = int(raggio * 2)
    sx = 4  # maschera disegnata più grande e poi ridotta: bordo del cerchio pulito
    gy, gx = np.mgrid[0:lato * sx, 0:lato * sx]
    dentro = ((gx + .5) / sx - raggio) ** 2 + ((gy + .5) / sx - raggio) ** 2 <= raggio ** 2
    alpha = Image.fromarray((dentro * 255).astype(np.uint8)).resize((lato, lato), Image.LANCZOS)
    tondo = m.crop((round(cx - raggio), round(cy - raggio), round(cx - raggio) + lato, round(cy - raggio) + lato))
    tondo.putalpha(alpha)
    tondo.save(out / "mazzola.png", optimize=True)
    tondo.save(out / "mazzola.webp", quality=90, method=6)
    print("mazzola", tondo.size)

# --- Scene delle storie (Gran Premio / Fotofinish): verticali 1080x1920 ---
# Le scene di ChatGPT sono 2:3: le porto alla larghezza piena senza tagliare i lati, con la riga al 25%
# dell'altezza allineata al 25% della storia (dove il prompt fa iniziare il soggetto), e riempio sopra e sotto
# col colore del fondo della scena.
for sorgente in sorted((src / "scene").glob("*.png")) if (src / "scene").exists() else []:
    sc = Image.open(sorgente).convert("RGB")
    k = 1080 / sc.width
    sc = sc.resize((1080, round(sc.height * k)), Image.LANCZOS)
    a = np.asarray(sc)
    fondo = tuple(int(v) for v in np.median(np.concatenate([a[:8].reshape(-1, 3), a[-8:].reshape(-1, 3)]), axis=0))
    tela = Image.new("RGB", (1080, 1920), fondo)
    tela.paste(sc, (0, round(1920 * .25 - sc.height * .25)))
    (out / "scene").mkdir(exist_ok=True)
    tela.save(out / "scene" / f"{sorgente.stem}.webp", quality=86, method=6)
    print("scena", sorgente.stem, sc.size, "fondo", fondo)
