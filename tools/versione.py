"""Da lanciare prima di ogni pubblicazione: aggiorna il numero di versione delle pagine.
- <meta name="versione">: l'app sulla schermata Home lo confronta col server e si ricarica se è cambiato
- ?v= su CSS e JS: costringe i browser a scaricare i file nuovi invece di quelli in memoria
Uso: python3 tools/versione.py"""
import re
import time
from pathlib import Path

radice = Path(__file__).resolve().parent.parent
v = time.strftime("%Y%m%d%H%M%S")
for nome in ("index.html", "storie.html", "distinta.html"):
    p = radice / nome
    s = p.read_text(encoding="utf-8")
    s = re.sub(r'<meta name="versione" content="[^"]*">', f'<meta name="versione" content="{v}">', s)
    s = re.sub(r'((?:href|src)="(?:style\.css|script\.js|storie\.js|distinta\.js|aggiorna\.js))(?:\?v=[^"]*)?"', rf'\1?v={v}"', s)
    p.write_text(s, encoding="utf-8")
print("versione", v)
